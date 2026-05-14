'use strict';

/**
 * src/middlewares/rateLimit.middleware.js
 * Rate limiting para prevenir fuerza bruta y abuso de API.
 *
 * Requiere: npm install express-rate-limit
 */

let rateLimit;
try {
    rateLimit = require('express-rate-limit');
} catch {
    console.warn('⚠️  express-rate-limit no instalado. Ejecuta: npm install express-rate-limit');
    /* Fallback: middleware vacío (no limita, pero no rompe la app) */
    const noop = (_req, _res, next) => next();
    module.exports = { auth: noop, api: noop };
    return;
}

const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants');

/* Límite estricto para rutas de autenticación */
const auth = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max:      RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.' },
});

/* Límite general para la API */
const api = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max:      200,
    standardHeaders: true,
    legacyHeaders:   false,
    message: { error: 'Límite de solicitudes alcanzado.' },
});

module.exports = { auth, api };
