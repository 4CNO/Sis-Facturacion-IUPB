'use strict';

/**
 * src/validators/index.js
 * Validaciones de entrada centralizadas.
 * Reutilizable en controllers sin duplicar lógica.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lanza un error con status HTTP si la condición es falsa.
 */
function assert(condition, message, status = 400) {
    if (!condition) {
        const err = new Error(message);
        err.status = status;
        throw err;
    }
}

function validateRegister({ nombre, correo, password, confirmar }) {
    assert(nombre?.trim(),                    'El nombre es requerido.');
    assert(nombre.trim().length >= 3,         'El nombre debe tener al menos 3 caracteres.');
    assert(correo?.trim(),                    'El correo es requerido.');
    assert(EMAIL_RE.test(correo),             'El correo no tiene formato válido.');
    assert(password,                          'La contraseña es requerida.');
    assert(password.length >= 6,              'La contraseña debe tener al menos 6 caracteres.');
    if (confirmar !== undefined) {
        assert(password === confirmar,        'Las contraseñas no coinciden.');
    }
}

function validateLogin({ correo, password }) {
    assert(correo?.trim(),     'El correo es requerido.');
    assert(EMAIL_RE.test(correo), 'El correo no tiene formato válido.');
    assert(password,           'La contraseña es requerida.');
}

function validateClient({ nombre, documento, telefono }) {
    assert(nombre?.trim(),    'El nombre es requerido.');
    assert(documento?.trim(), 'El documento es requerido.');
    assert(telefono?.trim(),  'El teléfono es requerido.');
}

function validateCompany({ nombre, nit, telefono, direccion }) {
    assert(nombre?.trim(),   'El nombre es requerido.');
    assert(nit?.trim(),      'El NIT es requerido.');
    assert(telefono?.trim(), 'El teléfono es requerido.');
    assert(direccion?.trim(),'La dirección es requerida.');
}

function validateProduct({ nombre, marca, precio, cantidad }) {
    assert(nombre?.trim(),              'El nombre es requerido.');
    assert(marca?.trim(),               'La marca es requerida.');
    const p = Number(precio);
    const c = Number(cantidad);
    assert(!isNaN(p) && p >= 0,         'El precio debe ser un número ≥ 0.');
    assert(!isNaN(c) && c >= 0,         'La cantidad debe ser un número ≥ 0.');
}

function validateOrder({ clienteId, empresaId, items }) {
    assert(clienteId,                           'El cliente es requerido.');
    assert(empresaId,                           'La empresa es requerida.');
    assert(Array.isArray(items) && items.length,'Se requiere al menos un producto.');

    for (const item of items) {
        const qty = Number(item.cantidad);
        assert(item.productoId,         'Cada ítem debe tener productoId.');
        assert(!isNaN(qty) && qty >= 1, 'La cantidad de cada ítem debe ser ≥ 1.');
    }
}

module.exports = {
    validateRegister,
    validateLogin,
    validateClient,
    validateCompany,
    validateProduct,
    validateOrder,
};
