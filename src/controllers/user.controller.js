'use strict';

/**
 * src/controllers/user.controller.js
 */

const userService = require('../services/user.service');

async function dashboard(req, res, next) {
    try {
        const data = await userService.getDashboard(req.params.id);
        res.json({ ok: true, ...data });
    } catch (err) {
        next(err);
    }
}

async function uploadPhoto(req, res, next) {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió imagen.' });
        }
        const profileImage = await userService.updateProfilePhoto(req.params.id, req.file);
        res.json({ ok: true, profileImage });
    } catch (err) {
        next(err);
    }
}

async function trackEvent(req, res, next) {
    try {
        const { action, detail } = req.body;
        if (!action?.trim()) {
            return res.status(400).json({ error: 'La acción es requerida.' });
        }
        await userService.trackEvent(req.params.id, action, detail, req.ip);
        res.status(201).json({ ok: true });
    } catch (err) {
        next(err);
    }
}

module.exports = { dashboard, uploadPhoto, trackEvent };
