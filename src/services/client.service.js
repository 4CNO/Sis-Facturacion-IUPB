'use strict';

/**
 * src/services/client.service.js — MIGRADO a Prisma
 */

const { createCrudService } = require('./crud.service');

const mapper = c => ({
    id:       c.id,
    name:     c.name,
    document: c.document,
    phone:    c.phone,
});

const { list, findByKey, upsert } = createCrudService('client', 'document', mapper);

module.exports = { list, findByDocument: findByKey, upsert };
