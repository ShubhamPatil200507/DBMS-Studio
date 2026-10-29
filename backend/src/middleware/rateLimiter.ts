import rateLimit from 'express-rate-limit';

/**
 * Strict rate limiter for sensitive authentication endpoints (registration & login).
 * Limits each IP to 20 attempts per 15-minute window to prevent brute force attacks.
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts from this IP address. Please try again after 15 minutes.' }
});

/**
 * Standard rate limiter applied globally to prevent general request flooding.
 * Limits each IP to 300 requests per 15-minute window.
 */
export const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'API rate limit exceeded. Please throttle your request rate.' }
});

/**
 * Rate limiter for computationally expensive operations (LLM generation, autonomous optimization, SQL sandbox execution).
 * Limits each IP to 40 requests per 15-minute window.
 */
export const expensiveOperationRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Resource consumption limit reached for expensive operations. Please retry shortly.' }
});
