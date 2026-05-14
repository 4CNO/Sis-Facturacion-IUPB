'use strict';

/**
 * src/services/company.service.js — MIGRADO a Prisma
 */

const { createCrudService } = require('./crud.service');

const mapper = c => ({
    id:      c.id,
    name:    c.name,
    nit:     c.nit,
    phone:   c.phone,
    address: c.address,
});

const { list, findByKey, upsert } = createCrudService('company', 'nit', mapper);

module.exports = { list, findByNit: findByKey, upsert };
