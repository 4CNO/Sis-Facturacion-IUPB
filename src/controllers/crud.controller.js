'use strict';

/**
 * src/controllers/crud.controller.js
 * Factory de controllers CRUD genéricos.
 * Elimina la triplicación de código entre clientes, empresas y productos.
 */

/**
 * @param {Object} service         - Servicio con { list, findByKey, upsert }
 * @param {string} searchParamName - Nombre del query param para búsqueda (ej: 'documento', 'nit')
 * @param {Function} validateFn    - Función de validación del body
 * @param {string} entityName      - Nombre legible para mensajes de error (ej: 'cliente')
 */
function createCrudController(service, searchParamName, validateFn, entityName) {

    async function list(req, res, next) {
        try {
            const page  = Math.max(1, parseInt(req.query.page)  || 1);
            const limit = Math.min(100, parseInt(req.query.limit) || 50);
            const result = await service.list({ page, limit });
            res.json(result.data);   /* Retorna array para compatibilidad con frontend actual */
        } catch (err) { next(err); }
    }

    async function search(req, res, next) {
        try {
            const value = req.query[searchParamName]?.trim();
            if (!value) {
                return res.status(400).json({ error: `El campo "${searchParamName}" es requerido.` });
            }
            const findFn = service.findByKey || service.findByDocument || service.findByNit;
            const result = await findFn(value);
            /* Normaliza la clave de respuesta según el tipo */
            const key = entityName === 'cliente' ? 'cliente'
                      : entityName === 'empresa'  ? 'empresa'
                      : 'producto';
            if (!result.found) return res.json({ found: false });
            res.json({ found: true, [key]: result.data });
        } catch (err) { next(err); }
    }

    async function save(req, res, next) {
        try {
            validateFn(req.body);
            const result = await service.upsert(req.body);
            res.status(201).json({ ok: true, data: result });
        } catch (err) { next(err); }
    }

    return { list, search, save };
}

module.exports = { createCrudController };
