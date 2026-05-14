'use strict';

/**
 * src/middlewares/errorHandler.middleware.js
 * Manejador global de errores.
 * Centraliza el formato de respuesta de error y el logging.
 */

module.exports = function errorHandler(err, req, res, _next) {
    /* Errores CORS */
    if (err.message?.startsWith('CORS bloqueado')) {
        return res.status(403).json({ error: err.message });
    }

    /* Errores de validación de Mongoose */
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ error: messages.join(', ') });
    }

    /* Clave duplicada en MongoDB (unique) */
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'campo';
        return res.status(409).json({ error: `Ya existe un registro con ese ${field}.` });
    }

    /* Error genérico */
    const status  = err.status || err.statusCode || 500;
    const message = err.expose ? err.message : 'Error interno del servidor.';

    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${status}`, err.message);

    res.status(status).json({ error: message });
};
