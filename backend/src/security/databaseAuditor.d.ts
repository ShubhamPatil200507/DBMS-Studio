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
export declare function auditDatabaseSecurity(customConfig?: ConnectionConfig): Promise<SecurityAuditResult>;
//# sourceMappingURL=databaseAuditor.d.ts.map