/**
 * public/js/modules/clientes.js  — FactuLogin v3.0
 * Usa el factory createCrudModule para eliminar código duplicado.
 */

'use strict';

/* utils.js + crud-module.js deben cargarse antes */

const mod = createCrudModule({
    entityName:    'cliente',
    searchEndpoint:'/api/clientes/buscar?documento=',
    saveEndpoint:  '/api/clientes',
    listEndpoint:  '/api/clientes',
    errorMsgId:    'cliente-error',
    okMsgId:       'cliente-ok',
    fieldIds:      ['nombreCliente', 'documentoCliente', 'telefonoCliente'],
    uniqueFieldId: 'documentoCliente',
    searchInputId: 'buscarDoc',
    tbodyId:       'clientesBody',
    emptyId:       'clientesEmpty',

    buildBody: (fields) => ({
        nombre:    fields.nombreCliente,
        documento: fields.documentoCliente,
        telefono:  fields.telefonoCliente,
    }),

    fillForm: (data) => {
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('nombreCliente',    data.name     || data.nombreCliente    || '');
        set('documentoCliente', data.document || data.documentoCliente || '');
        set('telefonoCliente',  data.phone    || data.telefonoCliente  || '');
        const si = document.getElementById('buscarDoc');
        if (si) si.value = data.document || data.documentoCliente || '';
    },

    renderRow: (r, i) => {
        const doc  = sanitize(r.document);
        const name = sanitize(r.name);
        const ph   = sanitize(r.phone);
        return `<tr>
            <td>${i + 1}</td>
            <td>${name}</td>
            <td>
                <button class="link-table-btn"
                    data-name="${name}"
                    data-document="${doc}"
                    data-phone="${ph}"
                    data-nombreCliente="${name}"
                    data-documentoCliente="${doc}"
                    data-telefonoCliente="${ph}">
                    ${doc}
                </button>
            </td>
            <td>${ph}</td>
        </tr>`;
    },
});

mod.init();
