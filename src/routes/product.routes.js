'use strict';
/* src/routes/product.routes.js */
const router        = require('express').Router();
const { requireAuth } = require('../middlewares/auth.middleware');
const productSvc    = require('../services/product.service');
const { validateProduct } = require('../validators');

/* Búsqueda por ID (diferente al patrón de clientes/empresas) */
async function search(req, res, next) {
    try {
        const { productId } = req.query;
        if (!productId?.trim()) {
            return res.status(400).json({ error: 'productId es requerido.' });
        }
        const result = await productSvc.findById(productId.trim());
        if (!result.found) return res.json({ found: false });
        res.json({ found: true, producto: result.data });
    } catch (err) { next(err); }
}

async function list(req, res, next) {
    try {
        const page  = Math.max(1, parseInt(req.query.page)  || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 50);
        const result = await productSvc.list({ page, limit });
        res.json(result.data);
    } catch (err) { next(err); }
}

async function save(req, res, next) {
    try {
        validateProduct(req.body);
        const { nombre, marca, precio, cantidad, productId } = req.body;
        const result = await productSvc.upsert({
            id:    productId || null,
            name:  nombre,
            brand: marca,
            price: Number(precio),
            stock: Number(cantidad),
        });
        res.status(201).json({ ok: true, product: result });
    } catch (err) { next(err); }
}

router.get ('/',       requireAuth, list);
router.get ('/buscar', requireAuth, search);
router.post('/',       requireAuth, save);

module.exports = router;
