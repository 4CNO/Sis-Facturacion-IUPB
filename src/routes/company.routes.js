'use strict';

/* ── src/routes/company.routes.js ─────────────────────────────── */
const router          = require('express').Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const companySvc      = require('../services/company.service');
const { validateCompany } = require('../validators');

/* ── LIST ──────────────────────────────────────────────────────── */
async function list(_req, res, next) {
    try {
        const result = await companySvc.list();
        res.json(result.data);
    } catch (err) { next(err); }
}

/* ── SEARCH ────────────────────────────────────────────────────── */
async function search(req, res, next) {
    try {
        const nit = req.query.nit?.trim();
        if (!nit) return res.status(400).json({ error: 'El parámetro "nit" es requerido.' });
        const result = await companySvc.findByNit(nit);
        if (!result.found) return res.json({ found: false });
        res.json({ found: true, empresa: result.data });
    } catch (err) { next(err); }
}

/* ── SAVE / UPSERT ─────────────────────────────────────────────── */
async function save(req, res, next) {
    try {
        validateCompany(req.body);
        const { nombre, nit, telefono, direccion } = req.body;
        const row = await companySvc.upsert({
            name:    nombre.trim(),
            nit:     nit.trim(),
            phone:   telefono.trim(),
            address: direccion.trim(),
        });
        res.status(201).json({ ok: true, company: row });
    } catch (err) { next(err); }
}

router.get ('/',       requireAuth, list);
router.get ('/buscar', requireAuth, search);
router.post('/',       requireAuth, save);

module.exports = router;
