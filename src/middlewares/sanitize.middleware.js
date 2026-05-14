'use strict';

/**
 * src/middlewares/sanitize.middleware.js
 * MIGRADO: Se elimina express-mongo-sanitize (era específico de MongoDB).
 * Reemplazado por sanitización XSS general usando la librería 'xss'.
 *
 * Protege contra:
 *   - XSS en campos de texto del body/query
 *   - Caracteres de control peligrosos
 */

const xss = require('xss');

const XSS_OPTIONS = {
    whiteList: {},          // Sin etiquetas HTML permitidas
    stripIgnoreTag: true,   // Eliminar etiquetas no permitidas
    stripIgnoreTagBody: ['script', 'style'],
};

/**
 * Sanitiza recursivamente strings en objetos anidados.
 */
function sanitizeValue(value) {
    if (typeof value === 'string') return xss(value.trim(), XSS_OPTIONS);
    if (Array.isArray(value))      return value.map(sanitizeValue);
    if (value && typeof value === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = sanitizeValue(v);
        }
        return result;
    }
    return value;
}

module.exports = function sanitizeMiddleware(req, _res, next) {
    if (req.body  && typeof req.body  === 'object') req.body  = sanitizeValue(req.body);
    if (req.query && typeof req.query === 'object') req.query = sanitizeValue(req.query);
    next();
};
