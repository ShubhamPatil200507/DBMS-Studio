import { Request, Response } from 'express';
import { scanSourceDirectory, scanCodeSnippet, scanGithubRepository } from '../security/sourceAuditor';
import { auditDatabaseSecurity, isAllowedAuditHost, isAllowedAuditPort } from '../security/databaseAuditor';
import path from 'path';

export const scanSourceCode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { githubUrl } = req.query;

        if (githubUrl && typeof githubUrl === 'string') {
            const report = await scanGithubRepository(githubUrl);
            res.json(report);
            return;
        }

        const rootDir = path.resolve(__dirname, '../../..'); // Project root
        const report = scanSourceDirectory(rootDir, 'Intelligent DBMS Studio (Local Repo)');
        res.json(report);
    } catch (e: any) {
        console.error('Source Code Scan Error:', e);
        res.status(500).json({ error: e.message || 'Failed to scan source code repository' });
    }
};

export const scanSnippet = async (req: Request, res: Response): Promise<void> => {
    try {
        const { code } = req.body;
        if (!code || typeof code !== 'string') {
            res.status(400).json({ error: 'Code string is required' });
            return;
        }
        const findings = scanCodeSnippet(code);
        res.json({
            safe: findings.length === 0,
            findings
        });
    } catch (e: any) {
        console.error('Snippet Scan Error:', e);
        res.status(500).json({ error: 'Failed to scan code snippet' });
    }
};

export const auditDatabase = async (req: Request, res: Response): Promise<void> => {
    try {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method Not Allowed. Database audits must use POST.' });
            return;
        }

        const config = req.body || {};

        if (config.host && !isAllowedAuditHost(config.host)) {
            res.status(403).json({
                error: `Connection to host '${config.host}' is not permitted by database auditing security policy.`
            });
            return;
        }

        if (config.port && !isAllowedAuditPort(Number(config.port))) {
            res.status(403).json({
                error: `Port ${config.port} is not permitted for database auditing.`
            });
            return;
        }

        const result = await auditDatabaseSecurity(config);
        res.json(result);
    } catch (e: any) {
        console.error('Database Audit Error:', e);
        res.status(500).json({ error: e.message || 'Failed to audit database configuration' });
    }
};
