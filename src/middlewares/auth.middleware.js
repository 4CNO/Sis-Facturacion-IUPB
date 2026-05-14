'use strict';

/**
 * src/middlewares/auth.middleware.js
 * Verificación JWT. Reemplaza el antiguo sistema de userId en headers.
 *
 * - requireAuth: verifica token y adjunta req.userId
 * - requireSameUser: verifica que el usuario solo accede a sus propios recursos
 */

const jwt = require('jsonwebtoken');

const { JWT_SECRET } = process.env;

function requireAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: 'Token de autenticación requerido.' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.sub;
        next();
    } catch (err) {
        const msg = err.name === 'TokenExpiredError'
            ? 'Token expirado. Inicia sesión de nuevo.'
            : 'Token inválido.';
        return res.status(401).json({ error: msg });
    }
}

function requireSameUser(req, res, next) {
    if (!req.userId) {
        return res.status(401).json({ error: 'Autenticación requerida.' });
    }
    if (String(req.userId) !== String(req.params.id)) {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }
    next();
}

module.exports = { requireAuth, requireSameUser };
