'use strict';

/**
 * src/controllers/order.controller.js
 */

const orderService = require('../services/order.service');
const { validateOrder } = require('../validators');

async function list(_req, res, next) {
    try {
        const orders = await orderService.list();
        res.json(orders);
    } catch (err) { next(err); }
}

async function getOptions(_req, res, next) {
    try {
        const options = await orderService.getOptions();
        res.json(options);
    } catch (err) { next(err); }
}

async function create(req, res, next) {
    try {
        validateOrder(req.body);
        /* userId puede venir del token JWT o del body (compatibilidad) */
        const userId = req.userId || req.body.userId || null;
        const result = await orderService.create({ ...req.body, userId });
        res.status(201).json({ ok: true, ...result });
    } catch (err) { next(err); }
}

module.exports = { list, getOptions, create };
