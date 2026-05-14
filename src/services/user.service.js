'use strict';

/**
 * src/services/user.service.js
 * MIGRADO: Mongoose → Prisma (PostgreSQL).
 */

const path   = require('path');
const fs     = require('fs');
const prisma = require('../config/prisma');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

async function getDashboard(userId) {
    /* Prisma permite traer usuario + relaciones en una sola query */
    const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: {
            id: true, name: true, email: true, profile_image: true,
            notifications: {
                orderBy: { created_at: 'desc' },
                take:     20,
                select:   { id: true, message: true, read: true, created_at: true },
            },
            invoices: {
                orderBy: { created_at: 'desc' },
                select:  { id: true, description: true, total: true, created_at: true },
            },
        },
    });

    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.status = 404;
        throw err;
    }

    return {
        user: {
            id:           user.id,
            name:         user.name,
            email:        user.email,
            profileImage: user.profile_image ?? null,
        },
        notifications: user.notifications.map(n => ({
            id: n.id, message: n.message, read: n.read, created_at: n.created_at,
        })),
        invoices: user.invoices.map(i => ({
            id: i.id, description: i.description,
            total: Number(i.total), created_at: i.created_at,
        })),
    };
}

async function updateProfilePhoto(userId, file) {
    const user = await prisma.user.findUnique({
        where:  { id: userId },
        select: { id: true, profile_image: true },
    });

    if (!user) {
        const err = new Error('Usuario no encontrado.');
        err.status = 404;
        throw err;
    }

    /* Eliminar foto anterior */
    if (user.profile_image) {
        const oldPath = path.join(UPLOADS_DIR, path.basename(user.profile_image));
        if (fs.existsSync(oldPath)) {
            try { fs.unlinkSync(oldPath); } catch { /* ignorar */ }
        }
    }

    const relativePath = `/uploads/${file.filename}`;

    await prisma.$transaction(async (tx) => {
        await tx.user.update({ where: { id: userId }, data: { profile_image: relativePath } });
        await tx.notification.create({ data: { user_id: userId, message: 'Se actualizó tu foto de perfil.' } });
        await tx.userEvent.create({ data: { user_id: userId, action: 'profile_photo_changed', detail: 'Cambió foto' } });
    });

    return relativePath;
}

async function trackEvent(userId, action, detail, ip = null) {
    if (!userId || !action) return;
    try {
        await prisma.userEvent.create({
            data: { user_id: userId, action, detail: detail ?? null, ip },
        });
    } catch (err) {
        console.warn('[trackEvent]', err.message);
    }
}

module.exports = { getDashboard, updateProfilePhoto, trackEvent };
