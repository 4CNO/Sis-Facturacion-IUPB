'use strict';

/**
 * src/middlewares/security.middleware.js
 * Headers de seguridad HTTP para todas las respuestas.
 */

const isDev = process.env.NODE_ENV !== 'production';

module.exports = function securityMiddleware(_req, res, next) {
    const scriptSrc = isDev
        ? "'self' 'unsafe-inline'"
        : "'self'";
    const styleSrc = isDev
        ? "'self' 'unsafe-inline' https://cdnjs.cloudflare.com"
        : "'self' https://cdnjs.cloudflare.com";

    res.setHeader('Content-Security-Policy', [
        `default-src 'self'`,
        `script-src ${scriptSrc}`,
        `style-src ${styleSrc}`,
        `font-src 'self' https://cdnjs.cloudflare.com`,
        `img-src 'self' data: blob: https://ui-avatars.com`,
        `connect-src 'self'`,
        `frame-ancestors 'none'`,
    ].join('; '));

    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options',           'DENY');
    res.setHeader('X-Content-Type-Options',    'nosniff');
    res.setHeader('Referrer-Policy',           'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',        'camera=(), microphone=(), geolocation=()');
    res.removeHeader('X-Powered-By');

    next();
};
