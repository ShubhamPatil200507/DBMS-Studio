import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateJwtSecret, signAuthToken, verifyAuthToken, MIN_JWT_SECRET_LENGTH } from '../../src/auth/authService';

describe('JWT Secret Configuration & Security Validation Unit Tests', () => {
    const originalSecret = process.env.JWT_SECRET;

    it('throws fatal error when JWT_SECRET is completely missing from environment', () => {
        delete process.env.JWT_SECRET;
        assert.throws(
            () => validateJwtSecret(),
            /FATAL SECURITY CONFIGURATION: JWT_SECRET environment variable is missing or empty/
        );
        // Restore
        process.env.JWT_SECRET = originalSecret;
    });

    it('throws fatal error when JWT_SECRET is an empty string', () => {
        process.env.JWT_SECRET = '   ';
        assert.throws(
            () => validateJwtSecret(),
            /FATAL SECURITY CONFIGURATION: JWT_SECRET does not meet the minimum length requirement/
        );
        process.env.JWT_SECRET = originalSecret;
    });

    it('rejects short secrets that fail the 32-character (256-bit) minimum requirement', () => {
        const shortSecrets = ['short_secret', '12345678901234567890', 'less_than_32_chars_secret!'];
        for (const secret of shortSecrets) {
            process.env.JWT_SECRET = secret;
            assert.ok(secret.length < MIN_JWT_SECRET_LENGTH);
            assert.throws(
                () => validateJwtSecret(),
                new RegExp(`at least ${MIN_JWT_SECRET_LENGTH} characters are required`)
            );
        }
        process.env.JWT_SECRET = originalSecret;
    });

    it('never prints the secret value in fatal configuration error messages', () => {
        const candidateSecret = 'leaky_attempt_short_123';
        process.env.JWT_SECRET = candidateSecret;
        try {
            validateJwtSecret();
            assert.fail('Should have thrown');
        } catch (err: any) {
            assert.ok(!err.message.includes(candidateSecret), 'Error message must NOT leak the secret string');
            assert.ok(err.message.includes(`${candidateSecret.length} characters long`));
        } finally {
            process.env.JWT_SECRET = originalSecret;
        }
    });

    it('successfully validates and signs/verifies tokens when secret meets 32+ character requirement', () => {
        const validSecret = 'a_very_strong_and_secure_jwt_secret_that_is_at_least_32_chars_long!';
        process.env.JWT_SECRET = validSecret;

        const validated = validateJwtSecret();
        assert.equal(validated, validSecret);

        const payload = { id: 999, email: 'test.jwt@example.com', name: 'JWT Tester', role: 'user' as const };
        const token = signAuthToken(payload);
        assert.ok(token && token.split('.').length === 3);

        const decoded = verifyAuthToken(token);
        assert.equal(decoded.userId, payload.id);
        assert.equal(decoded.email, payload.email);
        assert.equal(decoded.role, 'user');

        process.env.JWT_SECRET = originalSecret;
    });
});
