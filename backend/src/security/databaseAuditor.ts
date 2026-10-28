import mysql from 'mysql2/promise';
import { query as defaultQuery } from '../database/connection';

export interface DatabasePrivilege {
    user: string;
    host: string;
    grant: string;
    riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL';
    reason: string;
}

export interface SecurityAuditResult {
    connectionHost: string;
    currentUser: string;
    version: string;
    sslActive: boolean;
    privileges: DatabasePrivilege[];
    issues: string[];
    hardeningRecommendations: string[];
}

export interface ConnectionConfig {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}

/**
 * Validates whether a target host is permissible under the safe database auditing policy.
 * Disallows arbitrary internal network probing, loopback port traversal, and cloud metadata access.
 */
export function isAllowedAuditHost(host: string): boolean {
    if (!host || typeof host !== 'string') return false;
    const normalized = host.trim().toLowerCase();

    // Block cloud metadata and link-local addresses
    if (
        normalized === '169.254.169.254' ||
        normalized.startsWith('169.254.') ||
        normalized === 'metadata.google.internal' ||
        normalized === '0.0.0.0'
    ) {
        return false;
    }

    const defaultAllowed = new Set([
        'localhost',
        '127.0.0.1',
        '::1',
        (process.env.DB_HOST || 'localhost').toLowerCase()
    ]);

    if (defaultAllowed.has(normalized)) {
        return true;
    }

    // Check optional explicitly configured allowed hosts
    if (process.env.ALLOWED_AUDIT_HOSTS) {
        const customAllowed = process.env.ALLOWED_AUDIT_HOSTS.split(',')
            .map(h => h.trim().toLowerCase())
            .filter(Boolean);
        if (customAllowed.includes(normalized)) {
            return true;
        }
    }

    return false;
}

export function isAllowedAuditPort(port: number): boolean {
    if (!Number.isInteger(port) || port < 1 || port > 65535) return false;
    // Block common non-MySQL service ports to prevent cross-protocol SSRF scanning
    const blockedPorts = new Set([21, 22, 23, 25, 53, 80, 443, 6379, 11211, 27017, 8080]);
    return !blockedPorts.has(port);
}

export async function auditDatabaseSecurity(customConfig?: ConnectionConfig): Promise<SecurityAuditResult> {
    const issues: string[] = [];
    const hardeningRecommendations: string[] = [];
    const privileges: DatabasePrivilege[] = [];

    let currentUser = 'unknown';
    let version = 'unknown';
    let sslActive = false;
    let targetHost = customConfig?.host ? customConfig.host.trim() : (process.env.DB_HOST || 'localhost');

    let connection: mysql.Connection | null = null;

    try {
        if (customConfig && customConfig.host && customConfig.user) {
            const requestedHost = customConfig.host.trim();
            const requestedPort = Number(customConfig.port) || 3306;

            if (!isAllowedAuditHost(requestedHost)) {
                throw new Error(`Connection to host '${requestedHost}' is restricted by database auditing security policy. Permitted hosts: localhost, 127.0.0.1, or ALLOWED_AUDIT_HOSTS.`);
            }

            if (!isAllowedAuditPort(requestedPort)) {
                throw new Error(`Port ${requestedPort} is not permitted for database auditing.`);
            }

            // Connect to validated target database with a bounded timeout
            connection = await mysql.createConnection({
                host: requestedHost,
                port: requestedPort,
                user: customConfig.user,
                password: customConfig.password || '',
                database: customConfig.database || undefined,
                connectTimeout: 5000
            });
        }

        const runQuery = async (sql: string): Promise<any> => {
            if (connection) {
                const [rows] = await connection.query(sql);
                return rows;
            } else {
                return await defaultQuery(sql);
            }
        };

        // 1. Audit Current User & Version
        const userRes: any = await runQuery('SELECT CURRENT_USER() as cur_user, VERSION() as ver');
        if (userRes && userRes[0]) {
            currentUser = userRes[0].cur_user;
            version = userRes[0].ver;
        }

        // 2. Check SSL Transport Status
        const sslRes: any = await runQuery("SHOW STATUS LIKE 'Ssl_cipher'");
        if (sslRes && sslRes[0] && sslRes[0].Value) {
            sslActive = Boolean(sslRes[0].Value);
        }
        if (!sslActive) {
            issues.push('Database connection does not enforce TLS/SSL transport encryption.');
            hardeningRecommendations.push('Enable require_secure_transport in database server configuration.');
        }

        // 3. Inspect Granted Privileges
        const grantsRes: any = await runQuery('SHOW GRANTS FOR CURRENT_USER()');
        if (Array.isArray(grantsRes)) {
            for (const row of grantsRes) {
                const grantText = Object.values(row)[0] as string;
                let riskLevel: 'SAFE' | 'WARNING' | 'CRITICAL' = 'SAFE';
                let reason = 'Standard database access privileges.';

                if (/ON \*\.\*/i.test(grantText) && /(ALL PRIVILEGES|SUPER|SHUTDOWN|CREATE USER|GRANT OPTION)/i.test(grantText)) {
                    riskLevel = 'CRITICAL';
                    reason = 'Global Superuser/Administrative privileges granted on all databases (*.*).';
                    issues.push(`Current user holds high-risk administrative privileges on *.* with GRANT OPTION.`);
                    hardeningRecommendations.push('Enforce principle of least privilege: Revoke global *.* grants and grant permissions strictly on the specific application database.');
                } else if (/ALL PRIVILEGES/i.test(grantText) || /ON \*\.\*/i.test(grantText)) {
                    riskLevel = 'WARNING';
                    reason = 'Elevated privileges across schemas or unrestricted schema access.';
                }

                privileges.push({
                    user: currentUser,
                    host: currentUser.split('@')[1] || targetHost,
                    grant: grantText,
                    riskLevel,
                    reason
                });
            }
        }
    } catch (e: any) {
        issues.push(`Audit privilege inspection note: ${e.message}`);
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (err) {
                // Ignore close error
            }
        }
    }

    if (currentUser.startsWith('root@')) {
        issues.push('Application or connection is directly utilizing administrative root account.');
        hardeningRecommendations.push('Create a dedicated non-root application user with DML-only permissions (SELECT, INSERT, UPDATE, DELETE).');
    }

    return {
        connectionHost: targetHost,
        currentUser,
        version,
        sslActive,
        privileges,
        issues,
        hardeningRecommendations
    };
}
