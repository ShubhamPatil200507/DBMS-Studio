"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditDatabase = exports.scanSnippet = exports.scanSourceCode = void 0;
const express_1 = require("express");
const sourceAuditor_1 = require("../security/sourceAuditor");
const databaseAuditor_1 = require("../security/databaseAuditor");
const path_1 = __importDefault(require("path"));
const scanSourceCode = async (req, res) => {
    try {
        const { githubUrl } = req.query;
        if (githubUrl && typeof githubUrl === 'string') {
            const report = (0, sourceAuditor_1.scanGithubRepository)(githubUrl);
            res.json(report);
            return;
        }
        const rootDir = path_1.default.resolve(__dirname, '../../..'); // Project root
        const report = (0, sourceAuditor_1.scanSourceDirectory)(rootDir, 'Intelligent DBMS Studio (Local Repo)');
        res.json(report);
    }
    catch (e) {
        console.error('Source Code Scan Error:', e);
        res.status(500).json({ error: e.message || 'Failed to scan source code repository' });
    }
};
exports.scanSourceCode = scanSourceCode;
const scanSnippet = async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            res.status(400).json({ error: 'Code is required' });
            return;
        }
        const findings = (0, sourceAuditor_1.scanCodeSnippet)(code);
        res.json({
            safe: findings.length === 0,
            findings
        });
    }
    catch (e) {
        console.error('Snippet Scan Error:', e);
        res.status(500).json({ error: 'Failed to scan code snippet' });
    }
};
exports.scanSnippet = scanSnippet;
const auditDatabase = async (req, res) => {
    try {
        const config = req.method === 'POST' ? req.body : req.query;
        const result = await (0, databaseAuditor_1.auditDatabaseSecurity)(config);
        res.json(result);
    }
    catch (e) {
        console.error('Database Audit Error:', e);
        res.status(500).json({ error: e.message || 'Failed to audit database configuration' });
    }
};
exports.auditDatabase = auditDatabase;
//# sourceMappingURL=securityController.js.map