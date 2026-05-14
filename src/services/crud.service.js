'use strict';

/**
 * src/services/crud.service.js
 * MIGRADO: Factory CRUD genérico para Prisma.
 *
 * Reemplaza la versión Mongoose que usaba Model.findOne / findOneAndUpdate.
 * Ahora usa prisma[modelName].upsert() — equivalente directo y más limpio.
 *
 * @param {string}   modelName    - Nombre del modelo Prisma en camelCase (ej: 'client', 'company')
 * @param {string}   uniqueField  - Campo único para búsqueda/upsert (ej: 'document', 'nit')
 * @param {Function} mapper       - Transforma el registro a objeto de respuesta
 */
const prisma = require('../config/prisma');
const { DEFAULT_PAGE_SIZE } = require('../config/constants');

function createCrudService(modelName, uniqueField, mapper) {

    const model = prisma[modelName];

    async function list({ page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
        const skip = (page - 1) * limit;
        const [rows, total] = await Promise.all([
            model.findMany({ orderBy: { created_at: 'desc' }, skip, take: limit }),
            model.count(),
        ]);
        return { data: rows.map(mapper), total, page, pages: Math.ceil(total / limit) };
    }

    async function findByKey(value) {
        const row = await model.findUnique({ where: { [uniqueField]: value } });
        return row ? { found: true, data: mapper(row) } : { found: false };
    }

    /**
     * upsert: crea si no existe, actualiza si ya existe (por campo único).
     * Prisma tiene un método nativo upsert() que hace exactamente esto.
     */
    async function upsert(payload) {
        const keyValue = payload[uniqueField];
        const { [uniqueField]: _key, id: _id, created_at: _ca, ...updateData } = payload;

        const row = await model.upsert({
            where:  { [uniqueField]: keyValue },
            update: updateData,
            create: payload,
        });
        return mapper(row);
    }

    return { list, findByKey, upsert };
}

module.exports = { createCrudService };
