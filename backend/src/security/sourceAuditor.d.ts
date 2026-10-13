export interface SecurityFinding {
    ruleId: string;
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    file: string;
    line: number;
    codeSnippet: string;
    message: string;
    source: string;
    sink: string;
    recommendation: string;
    confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}
export interface SecurityAuditReport {
    timestamp: string;
    repoSource: string;
    totalFilesScanned: number;
    findingsCount: number;
    findings: SecurityFinding[];
    summary: string;
}
export declare function scanSourceDirectory(rootDir: string, sourceName?: string): SecurityAuditReport;
export declare function scanGithubRepository(repoUrl: string): SecurityAuditReport;
export declare function scanCodeSnippet(code: string, fileName?: string): SecurityFinding[];
//# sourceMappingURL=sourceAuditor.d.ts.map