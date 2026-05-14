/**
 * public/js/modules/empresas.js  — FactuLogin v3.0
 * Usa el factory createCrudModule.
 */

'use strict';

/* utils.js + crud-module.js deben cargarse antes */

const mod = createCrudModule({
    entityName:    'empresa',
    searchEndpoint:'/api/empresas/buscar?nit=',
    saveEndpoint:  '/api/empresas',
    listEndpoint:  '/api/empresas',
    errorMsgId:    'empresa-error',
    okMsgId:       'empresa-ok',
    fieldIds:      ['nombreEmpresa', 'nitEmpresa', 'telefonoEmpresa', 'direccionEmpresa'],
    uniqueFieldId: 'nitEmpresa',
    searchInputId: 'buscarNit',
    tbodyId:       'empresasBody',
    emptyId:       'empresasEmpty',

    buildBody: (fields) => ({
        nombre:   fields.nombreEmpresa,
        nit:      fields.nitEmpresa,
        telefono: fields.telefonoEmpresa,
        direccion:fields.direccionEmpresa,
    }),

    fillForm: (data) => {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('nombreEmpresa',    data.name    || data.nombreEmpresa    || '');
        set('nitEmpresa',       data.nit     || data.nitEmpresa       || '');
        set('telefonoEmpresa',  data.phone   || data.telefonoEmpresa  || '');
        set('direccionEmpresa', data.address || data.direccionEmpresa || '');
        const si = document.getElementById('buscarNit');
        if (si) si.value = data.nit || data.nitEmpresa || '';
    },

    renderRow: (r, i) => {
        const name    = sanitize(r.name);
        const nit     = sanitize(r.nit);
        const phone   = sanitize(r.phone);
        const address = sanitize(r.address);
        return `<tr>
            <td>${i + 1}</td>
            <td>${name}</td>
            <td>
                <button class="link-table-btn"
                    data-nombreEmpresa="${name}"
                    data-nitEmpresa="${nit}"
                    data-telefonoEmpresa="${phone}"
                    data-direccionEmpresa="${address}">
                    ${nit}
                </button>
            </td>
            <td>${phone}</td>
        </tr>`;
    },
});

mod.init();
