import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

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

const EXTENSIONS = new Set(['.ts', '.js', '.tsx', '.jsx', '.py', '.php', '.java', '.sql']);
const EXCLUDED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.system_generated', 'coverage', '.cache', 'frontend']);

export function scanSourceDirectory(rootDir: string, sourceName: string = 'Local Repository'): SecurityAuditReport {
    const findings: SecurityFinding[] = [];
    let totalFilesScanned = 0;

    function walk(dir: string) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            if (EXCLUDED_DIRS.has(entry.name)) continue;
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name);
                if (EXTENSIONS.has(ext)) {
                    totalFilesScanned++;
                    analyzeFile(fullPath, findings, rootDir);
                }
            }
        }
    }

    walk(rootDir);

    return {
        timestamp: new Date().toISOString(),
        repoSource: sourceName,
        totalFilesScanned,
        findingsCount: findings.length,
        findings,
        summary: findings.length === 0 
            ? `Security audit for ${sourceName} completed: No vulnerabilities detected in scanned repository files.`
            : `Detected ${findings.length} security vulnerability and SQL injection pattern(s) in ${sourceName}.`
    };
}

export function scanGithubRepository(repoUrl: string): SecurityAuditReport {
    // Validate repository URL
    const sanitizedUrl = repoUrl.trim();
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/i.test(sanitizedUrl)) {
        throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/owner/repository');
    }

    // Create unique temporary clone directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dbms-git-'));
    try {
        // Shallow clone 1 commit to optimize speed and bandwidth
        execSync(`git clone --depth 1 "${sanitizedUrl}" "${tempDir}"`, {
            stdio: 'pipe',
            timeout: 60000 // 60s timeout
        });

        // Scan cloned files
        const report = scanSourceDirectory(tempDir, sanitizedUrl);
        return report;
    } finally {
        // Cleanup temp directory
        try {
            fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
            console.warn('Failed to clean temp clone directory:', cleanupErr);
        }
    }
}

export function scanCodeSnippet(code: string, fileName: string = 'snippet.ts'): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    const lines = code.split('\n');
    scanLines(lines, fileName, findings);
    return findings;
}

function analyzeFile(filePath: string, findings: SecurityFinding[], rootDir: string) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        // Relative path for clean UI reporting
        const displayPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
        scanLines(lines, displayPath, findings);
    } catch (e) {
        console.error(`Error reading ${filePath}:`, e);
    }
}

function scanLines(lines: string[], filePath: string, findings: SecurityFinding[]) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const lower = line.toLowerCase();

        // 1. Direct SQL Injection Sink: User input concatenated or interpolated into query
        const hasUserInput = /req\.(body|query|params)|request\.(GET|POST|args)|input|payload|params\.|body\./i.test(line);
        const hasSqlKeywords = /(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|FROM|WHERE)\b/i.test(line);

        if (hasUserInput && hasSqlKeywords && (line.includes('+') || line.includes('`') || line.includes('${') || line.includes('%s') || line.includes('.format('))) {
            findings.push({
                ruleId: 'SEC-SQLI-001',
                severity: 'CRITICAL',
                file: filePath,
                line: lineNum,
                codeSnippet: line.trim(),
                message: 'SQL Injection Sink: Untrusted user request parameter concatenated/interpolated directly into SQL string.',
                source: 'User HTTP Request Object (req.body / req.query / params)',
                sink: 'Raw SQL Execution Buffer',
                recommendation: 'Use parameterized queries with placeholder binding (e.g., `db.query("... WHERE id = ?", [id])`).',
                confidence: 'HIGH'
            });
        }

        // 2. Unsafe template string in query execution call
        if (/(?:query|execute|raw)\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/i.test(line)) {
            findings.push({
                ruleId: 'SEC-SQLI-002',
                severity: 'HIGH',
                file: filePath,
                line: lineNum,
                codeSnippet: line.trim(),
                message: 'Unsafe Template Literal in DB Query call: Raw variable interpolation bypasses prepared statement escaping.',
                source: 'Template Variable Interpolation (${...})',
                sink: 'db.query(...) execution call',
                recommendation: 'Use query parameter binding placeholders (? or $1) instead of template strings.',
                confidence: 'HIGH'
            });
        }

        // 3. Destructive queries without WHERE clause
        if (/['"`]\s*(?:DELETE\s+FROM|UPDATE)\s+`?\w+`?\s*(?:SET\s+[^'"`]+)?['"`]/i.test(line) && !/\bWHERE\b/i.test(line)) {
            const nextLine = lines[i + 1] || '';
            if (!/\bWHERE\b/i.test(nextLine)) {
                findings.push({
                    ruleId: 'SEC-DATA-003',
                    severity: 'CRITICAL',
                    file: filePath,
                    line: lineNum,
                    codeSnippet: line.trim(),
                    message: 'Unbounded destructive operation: DELETE/UPDATE statement without a WHERE filter.',
                    source: 'Unbounded SQL Statement',
                    sink: 'Database Modification',
                    recommendation: 'Ensure all destructive operations are bound to specific identifier conditions.',
                    confidence: 'HIGH'
                });
            }
        }

        // 4. Hardcoded database credentials / secrets
        if (/(password|secret|api_key|token|db_pass)\s*[:=]\s*['"][a-zA-Z0-9_\-!@#$%^&*]{8,}['"]/i.test(line) && 
            !line.includes('process.env') && 
            !line.includes('your_') &&
            !line.includes('example') &&
            !filePath.includes('.env.example')) {
            findings.push({
                ruleId: 'SEC-CRED-004',
                severity: 'HIGH',
                file: filePath,
                line: lineNum,
                codeSnippet: line.trim().replace(/(['"])[^'"]{4,}(['"])/, '$1****$2'),
                message: 'Hardcoded secret or database credential literal detected in source code.',
                source: 'Static Source File String Literal',
                sink: 'Source Code Repository',
                recommendation: 'Store credentials in environment variables (.env) or external secret managers.',
                confidence: 'MEDIUM'
            });
        }

        // 5. Plaintext password query without hashing in DB query statements
        if (!filePath.includes('sourceAuditor') && 
            !filePath.includes('Security.tsx') &&
            lower.includes('password') && 
            /(?:SELECT|INSERT\s+INTO|UPDATE)\b/i.test(line) && 
            !lower.includes('hash') && !lower.includes('bcrypt') && !lower.includes('argon')) {
            findings.push({
                ruleId: 'SEC-AUTH-005',
                severity: 'MEDIUM',
                file: filePath,
                line: lineNum,
                codeSnippet: line.trim(),
                message: 'Plaintext Password Pattern: Query references password attribute without cryptographic hashing evidence.',
                source: 'User Credential Storage/Lookup',
                sink: 'Database Query',
                recommendation: 'Always salt and hash passwords using bcrypt/argon2 before storing or comparing.',
                confidence: 'MEDIUM'
            });
        }
    }
}
