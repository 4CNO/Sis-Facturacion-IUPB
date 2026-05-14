'use strict';

/**
 * src/utils/mailer.util.js — MIGRADO a Prisma
 * Antes importaba User desde Mongoose models.
 * Ahora usa Prisma para obtener el email del usuario.
 */

const nodemailer = require('nodemailer');
const prisma     = require('../config/prisma');

const { SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

let transporter = null;

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    transporter = nodemailer.createTransport({
        host: SMTP_HOST, port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    console.log('📧  SMTP configurado:', SMTP_HOST);
} else {
    console.log('ℹ️   SMTP no configurado — correos deshabilitados.');
}

async function sendOrderEmail(userId, orderId, lines, total) {
    if (!transporter) return false;
    try {
        const user = await prisma.user.findUnique({
            where:  { id: userId },
            select: { name: true, email: true },
        });
        if (!user?.email) return false;

        const itemList = lines.map(l =>
            `  - ${l.product_name} x${l.quantity}` +
            (l.pct_desc > 0 ? ` (${(l.pct_desc * 100).toFixed(1)}% desc.)` : '') +
            ` | $${Number(l.price).toFixed(2)} c/u | Sub: $${Number(l.subtotal).toFixed(2)}`
        ).join('\n');

        await transporter.sendMail({
            from:    SMTP_FROM || SMTP_USER,
            to:      user.email,
            subject: `Factura pedido #${orderId} — FactuLogin`,
            text:    `Hola ${user.name},\n\nDetalle:\n\n${itemList}\n\nTotal: $${total.toFixed(2)}\n\nGracias.`,
        });
        return true;
    } catch (err) {
        console.warn('[mailer]', err.message);
        return false;
    }
}

module.exports = { sendOrderEmail };
