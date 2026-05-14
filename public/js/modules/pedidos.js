/**
 * public/js/modules/pedidos.js  — FactuLogin v3.0
 * ✅ Comparación de IDs como string (fix ObjectId vs Number)
 * ✅ Constantes de descuento centralizadas
 * ✅ Usa authFetch con JWT
 * ✅ catch(err) con log real
 */

'use strict';

/* utils.js debe cargarse antes */

/* ── Constantes de descuento (deben coincidir con el backend) ─────── */
const DISCOUNT_BLOCK_SIZE = 10;
const DISCOUNT_PER_BLOCK  = 0.025;

/* ── DOM refs ─────────────────────────────────────────────────────── */
const clienteSelect  = document.getElementById('clientePedido');
const empresaSelect  = document.getElementById('empresaPedido');
const productoSelect = document.getElementById('productoPedido');
const cantidadInput  = document.getElementById('cantidadItem');
const agregarBtn     = document.getElementById('agregarBtn');
const generarBtn     = document.getElementById('generarBtn');
const detalleBody    = document.getElementById('detalleBody');
const detalleEmpty   = document.getElementById('detalleEmpty');
const totalLabel     = document.getElementById('totalLabel');
const descuentoBadge = document.getElementById('descuentoBadge');
const descuentoTexto = document.getElementById('descuentoTexto');

/* ── Estado ───────────────────────────────────────────────────────── */
let productosCache = [];
let items          = [];

/* ── Helpers ──────────────────────────────────────────────────────── */
const _showMsg = (type, msg) => showMsg('pedido-error', 'pedido-ok', type, msg);

function calcDescuento(precioBase, cantidad) {
    const bloques     = Math.floor(cantidad / DISCOUNT_BLOCK_SIZE);
    const pct         = bloques * DISCOUNT_PER_BLOCK;
    const precioFinal = precioBase * (1 - pct);
    const subtotal    = precioFinal * cantidad;
    return { pct, precioFinal, subtotal };
}

/* ── Badge de descuento en tiempo real ───────────────────────────── */
function actualizarBadge() {
    const productoId = productoSelect?.value;
    const cantidad   = Number(cantidadInput?.value);

    /* ✅ Comparación como string — ObjectId no se convierte a Number */
    const producto = productosCache.find(p => String(p.id) === String(productoId));

    if (!producto || !cantidad || cantidad < DISCOUNT_BLOCK_SIZE) {
        if (descuentoBadge) descuentoBadge.style.display = 'none';
        return;
    }

    const { pct } = calcDescuento(Number(producto.price), cantidad);
    if (pct > 0 && descuentoTexto && descuentoBadge) {
        descuentoTexto.textContent   = `${(pct * 100).toFixed(1)}% de descuento aplicado`;
        descuentoBadge.style.display = 'inline-flex';
    } else if (descuentoBadge) {
        descuentoBadge.style.display = 'none';
    }
}

productoSelect?.addEventListener('change', actualizarBadge);
cantidadInput?.addEventListener('input',   actualizarBadge);

/* ── Tabla de detalle ────────────────────────────────────────────── */
function renderDetalle() {
    if (!detalleBody || !detalleEmpty || !totalLabel) return;

    if (!items.length) {
        detalleEmpty.style.display = 'block';
        detalleBody.innerHTML      = '';
        totalLabel.textContent     = 'Total: $0.00';
        return;
    }

    detalleEmpty.style.display = 'none';
    detalleBody.innerHTML = items.map((item, i) => `
        <tr>
            <td>${sanitize(item.nombre)}</td>
            <td>${item.cantidad}</td>
            <td>$${Number(item.precioBase).toFixed(2)}</td>
            <td>${item.pct > 0
                ? `<span class="descuento-badge" style="font-size:.72rem;">−${(item.pct * 100).toFixed(1)}%</span>`
                : '—'}</td>
            <td>$${item.subtotal.toFixed(2)}</td>
            <td>
                <button class="quitar-item-btn" data-idx="${i}"
                    aria-label="Quitar ${sanitize(item.nombre)}"
                    style="width:auto;padding:2px 8px;font-size:.75rem;background:#ef4444;box-shadow:none;">✕</button>
            </td>
        </tr>`).join('');

    detalleBody.querySelectorAll('.quitar-item-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            items.splice(Number(btn.dataset.idx), 1);
            renderDetalle();
        });
    });

    const total = items.reduce((acc, it) => acc + it.subtotal, 0);
    totalLabel.textContent = `Total: $${total.toFixed(2)}`;
}

/* ── Cargar opciones (clientes, empresas, productos) ─────────────── */
async function loadOptions() {
    try {
        const res  = await authFetch(`${API_URL}/api/pedidos/options`);
        const data = await res.json();

        productosCache = data.productos || [];

        if (clienteSelect) {
            clienteSelect.innerHTML = '<option value="">Seleccionar cliente</option>' +
                (data.clientes || []).map(c =>
                    `<option value="${sanitize(String(c.id))}">${sanitize(c.name)}</option>`
                ).join('');
        }

        if (empresaSelect) {
            empresaSelect.innerHTML = '<option value="">Seleccionar empresa</option>' +
                (data.empresas || []).map(e =>
                    `<option value="${sanitize(String(e.id))}">${sanitize(e.name)}</option>`
                ).join('');
        }

        if (productoSelect) {
            productoSelect.innerHTML = '<option value="">Seleccionar producto</option>' +
                productosCache.map(p =>
                    `<option value="${sanitize(String(p.id))}">${sanitize(p.name)} — $${Number(p.price).toFixed(2)}</option>`
                ).join('');
        }

    } catch (err) {
        console.error('[loadOptions]', err);
        _showMsg('error', 'No se pudieron cargar las opciones del pedido.');
    }
}

/* ── Agregar ítem al pedido ──────────────────────────────────────── */
agregarBtn?.addEventListener('click', () => {
    _showMsg(null);

    const productoId = productoSelect?.value;       // ✅ string, no Number()
    const cantidad   = Number(cantidadInput?.value);

    if (!productoId)               return _showMsg('error', 'Selecciona un producto.');
    if (!cantidad || cantidad < 1) return _showMsg('error', 'Ingresa una cantidad válida (≥ 1).');

    /* ✅ Comparación como string */
    const producto = productosCache.find(p => String(p.id) === String(productoId));
    if (!producto)                 return _showMsg('error', 'Producto no encontrado en el catálogo.');

    const precioBase = Number(producto.price);
    const { pct, precioFinal, subtotal } = calcDescuento(precioBase, cantidad);

    items.push({ productoId, nombre: producto.name, cantidad, precioBase, pct, precioFinal, subtotal });

    if (cantidadInput)  cantidadInput.value  = '';
    if (productoSelect) productoSelect.value = '';
    if (descuentoBadge) descuentoBadge.style.display = 'none';

    renderDetalle();

    const msg = pct > 0
        ? `✅ "${sanitize(producto.name)}" agregado con ${(pct * 100).toFixed(1)}% de descuento.`
        : `✅ "${sanitize(producto.name)}" agregado al pedido.`;
    _showMsg('ok', msg);
});

/* ── Generar pedido ──────────────────────────────────────────────── */
generarBtn?.addEventListener('click', async () => {
    _showMsg(null);

    const clienteId = clienteSelect?.value;     // ✅ string ObjectId
    const empresaId = empresaSelect?.value;

    if (!clienteId)    return _showMsg('error', 'Selecciona un cliente.');
    if (!empresaId)    return _showMsg('error', 'Selecciona una empresa.');
    if (!items.length) return _showMsg('error', 'Agrega al menos un producto al pedido.');

    if (generarBtn) { generarBtn.disabled = true; generarBtn.textContent = 'Generando…'; }

    try {
        const payload = {
            userId:    userId || null,
            clienteId,
            empresaId,
            items: items.map(i => ({ productoId: i.productoId, cantidad: i.cantidad })),
        };

        const res  = await authFetch(`${API_URL}/api/pedidos`, {
            method: 'POST',
            body:   JSON.stringify(payload),
        });
        const data = await res.json();

        if (!res.ok) { _showMsg('error', data.error || 'No se pudo generar el pedido.'); return; }

        const mailTxt = data.mailSent ? ' · Factura enviada al correo.' : '';
        _showMsg('ok', `✅ Pedido generado. Total: $${Number(data.total).toFixed(2)}${mailTxt}`);
        toast(`🧾 Pedido generado por $${Number(data.total).toFixed(2)}`);

        items = [];
        renderDetalle();
        if (clienteSelect) clienteSelect.value = '';
        if (empresaSelect) empresaSelect.value = '';
        if (productoSelect)productoSelect.value = '';

    } catch (err) {
        console.error('[generarPedido]', err);
        _showMsg('error', 'Error de conexión con el servidor.');
    } finally {
        if (generarBtn) {
            generarBtn.disabled    = false;
            generarBtn.innerHTML   = '<i class="fa-solid fa-receipt" style="margin-right:6px;"></i>Generar pedido';
        }
    }
});

/* ── Init ────────────────────────────────────────────────────────── */
renderDetalle();

if (!SESSION) {
    [clienteSelect, empresaSelect, productoSelect, cantidadInput, agregarBtn, generarBtn]
        .forEach(el => { if (el) el.disabled = true; });
    if (detalleEmpty) { detalleEmpty.textContent = 'Inicia sesión para habilitar pedidos'; detalleEmpty.style.display = 'block'; }
} else {
    loadOptions();
}

initPageTransitions();
