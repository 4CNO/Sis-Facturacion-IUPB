'use strict';

/**
 * src/controllers/auth.controller.js
 * Controlador de autenticación. Delgado: valida → llama servicio → responde.
 */

const authService = require('../services/auth.service');
const { validateRegister, validateLogin } = require('../validators');

async function register(req, res, next) {
    try {
        validateRegister(req.body);
        const result = await authService.register(req.body);
        res.status(201).json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {
    try {
        validateLogin(req.body);
        const result = await authService.login(req.body);
        res.json({ ok: true, ...result });
    } catch (err) {
        next(err);
    }
}

module.exports = { register, login };
