'use strict';

/**
 * src/services/auth.service.js
 * MIGRADO: Mongoose → Prisma (PostgreSQL).
 * API pública idéntica — controllers no cambian.
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { JWT_EXPIRES_IN } = require('../config/constants');

const { JWT_SECRET } = process.env;

function signToken(userId) {
    return jwt.sign({ sub: String(userId) }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

async function register({ nombre, correo, password }) {
    const email = correo.toLowerCase().trim();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        const err = new Error('Ya existe una cuenta con ese correo.');
        err.status = 409;
        throw err;
    }

    const password_hash = await bcrypt.hash(password, 12);

    /* Transacción: crea usuario + notificación + factura de bienvenida atómicamente */
    const user = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
            data: { name: nombre.trim(), email, password_hash },
        });
        await tx.notification.create({
            data: { user_id: u.id, message: '¡Bienvenido a FactuLogin! Tu cuenta fue creada.' },
        });
        await tx.invoice.create({
            data: { user_id: u.id, description: 'Factura demo de bienvenida', total: 0 },
        });
        return u;
    });

    return {
        token: signToken(user.id),
        user:  { id: user.id, name: user.name, email: user.email },
    };
}

async function login({ correo, password }) {
    const email = correo.toLowerCase().trim();
    const user  = await prisma.user.findUnique({ where: { email } });

    /* Dummy hash válido — previene timing attack revelando si el email existe */
    const DUMMY_HASH = '$2a$12$KIXMhbMBhSFhFmRbpfwB0OqNFByJBhWn5v7lCQZWGSXJUNE.Ynrmy';
    const valid = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !valid) {
        const err = new Error('Correo o contraseña incorrectos.');
        err.status = 401;
        throw err;
    }

    /* Registrar evento de login de forma no-bloqueante */
    prisma.userEvent.create({
        data: { user_id: user.id, action: 'login', detail: 'Inicio de sesión' },
    }).catch(e => console.warn('[auth] trackEvent:', e.message));

    return {
        token: signToken(user.id),
        user: {
            id:           user.id,
            name:         user.name,
            email:        user.email,
            profileImage: user.profile_image ?? null,
        },
    };
}

module.exports = { register, login };
