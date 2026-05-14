'use strict';

/**
 * src/services/order.service.js — MIGRADO a Prisma
 *
 * Mejora clave vs Mongoose:
 *   - La creación del pedido + invoice + notification se hace en una TRANSACCIÓN SQL.
 *   - Si cualquier operación falla, todo el bloque hace rollback automático.
 *   - Esto era imposible de garantizar con MongoDB sin transacciones multi-documento
 *     (que requieren replica set).
 */

const prisma  = require('../config/prisma');
const { DISCOUNT_BLOCK_SIZE, DISCOUNT_PER_BLOCK } = require('../config/constants');
const clientSvc  = require('./client.service');
const companySvc = require('./company.service');
const productSvc = require('./product.service');
const mailer     = require('../utils/mailer.util');

function calcDiscount(precioBase, quantity) {
    const bloques     = Math.floor(quantity / DISCOUNT_BLOCK_SIZE);
    const pct         = bloques * DISCOUNT_PER_BLOCK;
    const precioFinal = precioBase * (1 - pct);
    return { pct, precioFinal, subtotal: precioFinal * quantity };
}

async function list() {
    /* Prisma: JOIN automático via include — equivale a populate() de Mongoose */
    const rows = await prisma.order.findMany({
        orderBy: { created_at: 'desc' },
        include: {
            client:  { select: { name: true } },
            company: { select: { name: true } },
            items:   true,
        },
    });

    return rows.map(o => ({
        id:           o.id,
        total:        Number(o.total),
        created_at:   o.created_at,
        client_name:  o.client.name,
        company_name: o.company.name,
        items:        o.items.map(i => ({ ...i, price: Number(i.price), subtotal: Number(i.subtotal), pct_desc: Number(i.pct_desc) })),
    }));
}

async function getOptions() {
    const [{ data: clientes }, { data: empresas }, { data: productos }] = await Promise.all([
        clientSvc.list(),
        companySvc.list(),
        productSvc.list(),
    ]);
    return { clientes, empresas, productos };
}

async function create({ userId, clienteId, empresaId, items }) {
    if (!Array.isArray(items) || !items.length) {
        const err = new Error('Se requiere al menos un producto.'); err.status = 400; throw err;
    }

    /* Validar y calcular items ANTES de abrir la transacción */
    const invoiceLines = [];
    let total = 0;

    for (const raw of items) {
        const quantity = Number(raw.cantidad);
        if (!raw.productoId || !quantity || quantity < 1) {
            const err = new Error('Item inválido.'); err.status = 400; throw err;
        }

        const product = await prisma.product.findUnique({ where: { id: raw.productoId } });
        if (!product) {
            const err = new Error(`Producto ${raw.productoId} no encontrado.`); err.status = 404; throw err;
        }

        const { pct, precioFinal, subtotal } = calcDiscount(Number(product.price), quantity);
        total += subtotal;

        invoiceLines.push({
            product_id:   product.id,
            product_name: product.name,
            quantity,
            price:        precioFinal,
            pct_desc:     pct,
            subtotal,
        });
    }

    /* Transacción SQL atómica: pedido + items + invoice + notificación */
    const order = await prisma.$transaction(async (tx) => {
        const o = await tx.order.create({
            data: {
                user_id:    userId ?? null,
                client_id:  clienteId,
                company_id: empresaId,
                total,
                items: { create: invoiceLines },
            },
            include: { items: true },
        });

        if (userId) {
            await tx.invoice.create({
                data: { user_id: userId, description: `Factura pedido #${o.id}`, total },
            });
            await tx.notification.create({
                data: { user_id: userId, message: `Pedido #${o.id} generado por $${total.toFixed(2)}.` },
            });
            await tx.userEvent.create({
                data: { user_id: userId, action: 'order_created', detail: `Pedido #${o.id}` },
            });
        }
        return o;
    });

    /* Email asíncrono — no bloquea la respuesta */
    if (userId && mailer) {
        mailer.sendOrderEmail(userId, order.id, invoiceLines, total)
            .catch(e => console.warn('[mail]', e.message));
    }

    return {
        orderId: order.id,
        total,
        mailSent: false,
        invoiceLines: invoiceLines.map(l => ({
            productId:   l.product_id,
            productName: l.product_name,
            quantity:    l.quantity,
            price:       l.price,
            pctDesc:     l.pct_desc,
            subtotal:    l.subtotal,
        })),
    };
}

module.exports = { list, getOptions, create };
