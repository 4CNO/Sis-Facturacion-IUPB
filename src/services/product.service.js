'use strict';

/**
 * src/services/product.service.js — MIGRADO a Prisma
 */

const prisma = require('../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../config/constants');

const mapper = p => ({
    id:    p.id,
    name:  p.name,
    brand: p.brand ?? '',
    price: Number(p.price),
    stock: p.stock,
});

async function list({ page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
        prisma.product.findMany({ orderBy: { created_at: 'desc' }, skip, take: limit }),
        prisma.product.count(),
    ]);
    return { data: rows.map(mapper), total, page, pages: Math.ceil(total / limit) };
}

async function findById(id) {
    try {
        const p = await prisma.product.findUnique({ where: { id } });
        if (!p) return { found: false };
        return { found: true, data: { ...mapper(p), productId: p.id } };
    } catch {
        return { found: false };
    }
}

async function upsert({ id, name, brand, price, stock }) {
    if (id) {
        try {
            const p = await prisma.product.update({
                where: { id },
                data:  { name, brand: brand ?? '', price, stock },
            });
            return mapper(p);
        } catch { /* ID no existe → crear nuevo */ }
    }
    const p = await prisma.product.create({
        data: { name, brand: brand ?? '', price, stock: stock ?? 0 },
    });
    return mapper(p);
}

module.exports = { list, findById, upsert };
