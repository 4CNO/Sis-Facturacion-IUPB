'use strict';

/**
 * src/config/cors.config.js — sin cambios respecto a v3.
 */

const ALLOWED = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',').map(s => s.trim()).filter(Boolean);

module.exports = {
    origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (ALLOWED.includes(origin)) return cb(null, true);
        return cb(Object.assign(new Error(`CORS bloqueado: ${origin}`), { status: 403 }));
    },
    methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials:    true,
};
