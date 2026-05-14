'use strict';

/* ── src/routes/client.routes.js ──────────────────────────────── */
const router          = require('express').Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const clientSvc       = require('../services/client.service');
const { validateClient } = require('../validators');

/* ── LIST ──────────────────────────────────────────────────────── */
async function list(_req, res, next) {
    try {
        const result = await clientSvc.list();
        res.json(result.data);
    } catch (err) { next(err); }
}

/* ── SEARCH ────────────────────────────────────────────────────── */
async function search(req, res, next) {
    try {
        const documento = req.query.documento?.trim();
        if (!documento) return res.status(400).json({ error: 'El parámetro "documento" es requerido.' });
        const result = await clientSvc.findByDocument(documento);
        if (!result.found) return res.json({ found: false });
        res.json({ found: true, cliente: result.data });
    } catch (err) { next(err); }
}

/* ── SAVE / UPSERT ─────────────────────────────────────────────── */
async function save(req, res, next) {
    try {
        validateClient(req.body);
        const { nombre, documento, telefono } = req.body;
        const row = await clientSvc.upsert({
            name:     nombre.trim(),
            document: documento.trim(),
            phone:    telefono.trim(),
        });
        res.status(201).json({ ok: true, client: row });
    } catch (err) { next(err); }
}

router.get ('/',       requireAuth, list);
router.get ('/buscar', requireAuth, search);
router.post('/',       requireAuth, save);

module.exports = router;
