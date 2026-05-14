/**
 * public/js/modules/utils.js  — FactuLogin v3.0
 * Utilidades compartidas del frontend.
 *
 * ✅ authFetch() con Bearer JWT automático
 * ✅ SESSION basado en token + userId
 * ✅ requireSession() para proteger páginas
 * ✅ sanitize() para prevenir XSS
 */

'use strict';

/* ── Constantes globales ─────────────────────────────────────────── */
const API_URL     = window.location.origin;
const currentUser = JSON.parse(localStorage.getItem('factulogin_user')  || 'null');
const authToken   = localStorage.getItem('factulogin_token') || null;
const userId      = currentUser?.id  || null;
const SESSION     = Boolean(userId && authToken);

/* ── Fetch autenticado ───────────────────────────────────────────── */
async function authFetch(url, options = {}) {
    const { headers: extraHeaders = {}, ...rest } = options;

    const headers = {
        'Content-Type': 'application/json',
        ...extraHeaders,
    };

    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(url, { ...rest, headers });

    /* Token expirado → limpiar sesión y redirigir al login */
    if (res.status === 401) {
        const data = await res.clone().json().catch(() => ({}));
        if (data.error?.toLowerCase().includes('token')) {
            clearSession();
            window.location.href = '/login.html';
            return res;
        }
    }

    return res;
}

/* ── Gestión de sesión ───────────────────────────────────────────── */
function saveSession(user, token) {
    localStorage.setItem('factulogin_user',  JSON.stringify(user));
    localStorage.setItem('factulogin_token', token);
}

function clearSession() {
    localStorage.removeItem('factulogin_user');
    localStorage.removeItem('factulogin_token');
}

function requireSession() {
    if (!SESSION) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

/* ── Toast ───────────────────────────────────────────────────────── */
function toast(msg, ms = 3200) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className   = 'toast';
    t.textContent = String(msg);
    container.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastOut 0.28s ease forwards';
        setTimeout(() => t.remove(), 300);
    }, ms);
}

/* ── Mensajes de formulario ──────────────────────────────────────── */
function showMsg(errorId, okId, type, msg) {
    const errorEl = document.getElementById(errorId);
    const okEl    = document.getElementById(okId);

    if (errorEl) { errorEl.style.display = 'none'; errorEl.textContent = ''; }
    if (okEl)    { okEl.style.display    = 'none'; okEl.textContent    = ''; }

    if (type === 'error' && errorEl) {
        errorEl.textContent   = String(msg);
        errorEl.style.display = 'block';
    }
    if (type === 'ok' && okEl) {
        okEl.textContent   = String(msg);
        okEl.style.display = 'block';
    }
}

/* ── Avatar ──────────────────────────────────────────────────────── */
function photoSrc(imgPath, name) {
    return imgPath
        ? `${API_URL}${imgPath}`
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=e0e7ff&color=4f46e5&size=80`;
}

/* ── XSS protection ─────────────────────────────────────────────── */
function sanitize(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
}

/* ── Transición suave ────────────────────────────────────────────── */
function initPageTransitions() {
    document.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', e => {
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('javascript')) return;
            e.preventDefault();
            document.body.style.opacity    = '0';
            document.body.style.transition = 'opacity 0.22s ease';
            setTimeout(() => { window.location.href = href; }, 220);
        });
    });
}

/* ── Track evento ────────────────────────────────────────────────── */
async function track(action, detail) {
    if (!SESSION) return;
    try {
        await authFetch(`${API_URL}/api/users/${userId}/events`, {
            method: 'POST',
            body:   JSON.stringify({ action, detail }),
        });
    } catch { /* silencioso */ }
}
