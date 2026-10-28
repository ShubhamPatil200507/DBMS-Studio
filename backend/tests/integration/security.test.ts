import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedAuditHost, isAllowedAuditPort } from '../../src/security/databaseAuditor';
import { scanCodeSnippet } from '../../src/security/sourceAuditor';

describe('Security & Database Hardening Integration Tests', () => {
    describe('SSRF & Database Connection Restrictions', () => {
        it('allows standard loopback and configured local hostnames', () => {
            assert.equal(isAllowedAuditHost('localhost'), true);
            assert.equal(isAllowedAuditHost('127.0.0.1'), true);
            assert.equal(isAllowedAuditHost('::1'), true);
        });

        it('strictly blocks AWS/GCP/Azure cloud metadata addresses', () => {
            assert.equal(isAllowedAuditHost('169.254.169.254'), false);
            assert.equal(isAllowedAuditHost('169.254.1.1'), false);
            assert.equal(isAllowedAuditHost('metadata.google.internal'), false);
            assert.equal(isAllowedAuditHost('0.0.0.0'), false);
        });

        it('rejects arbitrary external internet domains not in allowlist', () => {
            assert.equal(isAllowedAuditHost('evil-attacker.com'), false);
            assert.equal(isAllowedAuditHost('192.168.1.100'), false);
            assert.equal(isAllowedAuditHost('10.0.0.5'), false);
        });

        it('allows legitimate database ports and blocks well-known non-database services', () => {
            assert.equal(isAllowedAuditPort(3306), true);
            assert.equal(isAllowedAuditPort(3307), true);
            assert.equal(isAllowedAuditPort(5432), true);

            // Blocked sensitive service ports
            assert.equal(isAllowedAuditPort(22), false);   // SSH
            assert.equal(isAllowedAuditPort(80), false);   // HTTP
            assert.equal(isAllowedAuditPort(443), false);  // HTTPS
            assert.equal(isAllowedAuditPort(6379), false); // Redis
            assert.equal(isAllowedAuditPort(11211), false);// Memcached
            assert.equal(isAllowedAuditPort(0), false);
            assert.equal(isAllowedAuditPort(-1), false);
            assert.equal(isAllowedAuditPort(70000), false);
        });
    });

    describe('Source Code Lexical Security Scanner', () => {
        it('detects direct SQL injection vulnerability from req.body concatenation', () => {
            const vulnerableSnippet = "const query = 'SELECT * FROM users WHERE email = \\'' + req.body.email + '\\'';";
            const findings = scanCodeSnippet(vulnerableSnippet);

            assert.ok(findings.length > 0);
            assert.equal(findings[0].ruleId, 'SEC-SQLI-001');
            assert.equal(findings[0].severity, 'CRITICAL');
        });

        it('detects unsafe template string interpolation in DB queries', () => {
            const vulnerableSnippet = "db.query(`SELECT * FROM products WHERE id = ${req.params.id}`);";
            const findings = scanCodeSnippet(vulnerableSnippet);

            assert.ok(findings.some(f => f.ruleId === 'SEC-SQLI-002'));
        });

        it('detects unconstrained DELETE operations without WHERE clause', () => {
            const vulnerableSnippet = "db.query('DELETE FROM accounts');";
            const findings = scanCodeSnippet(vulnerableSnippet);

            assert.ok(findings.some(f => f.ruleId === 'SEC-DATA-003'));
        });

        it('detects hardcoded database credentials', () => {
            const vulnerableSnippet = "const db_pass = 'SuperSecretDbP@ssw0rd!';";
            const findings = scanCodeSnippet(vulnerableSnippet);

            assert.ok(findings.some(f => f.ruleId === 'SEC-CRED-004'));
        });

        it('passes cleanly for parameterized prepared statements', () => {
            const secureSnippet = "db.query('SELECT * FROM users WHERE id = ?', [userId]);";
            const findings = scanCodeSnippet(secureSnippet);

            assert.equal(findings.length, 0);
        });
    });
});
