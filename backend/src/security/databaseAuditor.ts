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

export async function auditDatabaseSecurity(customConfig?: ConnectionConfig): Promise<SecurityAuditResult> {
    const issues: string[] = [];
    const hardeningRecommendations: string[] = [];
    const privileges: DatabasePrivilege[] = [];

    let currentUser = 'unknown';
    let version = 'unknown';
    let sslActive = false;
    let targetHost = customConfig?.host || process.env.DB_HOST || 'localhost';

    let connection: mysql.Connection | null = null;

    try {
        if (customConfig && customConfig.host && customConfig.user) {
            // Connect to user-specified target database
            connection = await mysql.createConnection({
                host: customConfig.host,
                port: Number(customConfig.port) || 3306,
                user: customConfig.user,
                password: customConfig.password || '',
                database: customConfig.database || undefined,
                connectTimeout: 8000
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
