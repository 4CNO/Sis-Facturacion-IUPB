/**
 * public/js/modules/login.js  — FactuLogin v3.0
 * FIX BUG 5: usa saveSession() de utils.js en lugar de localStorage directo.
 * utils.js debe cargarse ANTES que este script.
 */

'use strict';

/* ── DOM refs ────────────────────────────────────────────────────── */
const tabLogin     = document.getElementById('tab-login');
const tabRegister  = document.getElementById('tab-register');
const formLogin    = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');
const goRegister   = document.getElementById('go-register');
const goLogin      = document.getElementById('go-login');

/* ── Navegación entre tabs ───────────────────────────────────────── */
function showLogin() {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('form-active');
    formRegister.classList.remove('form-active');
    clearMessages();
}

function showRegister() {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('form-active');
    formLogin.classList.remove('form-active');
    clearMessages();
}

/* ── Mensajes ────────────────────────────────────────────────────── */
function clearMessages() {
    ['login-error', 'register-error', 'register-ok'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
}

function showError(id, msg, withRegisterBtn = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(msg);
    if (withRegisterBtn) {
        el.textContent += ' ';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'link-button';
        btn.style.cssText = 'color:#b91c1c;font-weight:600;';
        btn.textContent = 'Crear cuenta';
        btn.addEventListener('click', showRegister);
        el.appendChild(btn);
    }
    el.style.display = 'block';
}

function showOk(id, msg) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(msg);
    el.style.display = 'block';
}

/* ── Validación local ────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Inicio de sesión: usa saveSession() de utils.js ────────────── */
function iniciarSesion(user, token) {
    /* FIX BUG 5: saveSession está definida en utils.js */
    saveSession(user, token);
    window.location.href = 'menu.html';
}

/* ── LOGIN ───────────────────────────────────────────────────────── */
formLogin.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessages();

    const correo   = document.getElementById('login-correo').value.trim();
    const password = document.getElementById('login-password').value;
    const btn      = document.getElementById('login-btn');

    if (!correo)                return showError('login-error', 'El correo es requerido.');
    if (!EMAIL_RE.test(correo)) return showError('login-error', 'Ingresa un correo válido.');
    if (!password)              return showError('login-error', 'La contraseña es requerida.');

    btn.disabled = true;
    btn.textContent = 'Ingresando…';

    try {
        const res  = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ correo, password }),
        });
        const data = await res.json();

        if (res.status === 401) {
            document.getElementById('login-password').value = '';
            showError('login-error', data.error || 'Correo o contraseña incorrectos.', true);
            return;
        }
        if (!res.ok || !data.ok) {
            showError('login-error', data.error || 'Error al iniciar sesión.');
            return;
        }

        iniciarSesion(data.user, data.token);

    } catch {
        showError('login-error', 'No se pudo conectar con el servidor.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Ingresar';
    }
});

/* ── REGISTRO ────────────────────────────────────────────────────── */
formRegister.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessages();

    const nombre    = document.getElementById('reg-nombre').value.trim();
    const correo    = document.getElementById('reg-correo').value.trim();
    const password  = document.getElementById('reg-password').value;
    const confirmar = document.getElementById('reg-confirmar').value;
    const btn       = document.getElementById('register-btn');

    if (!nombre)                return showError('register-error', 'El nombre es requerido.');
    if (nombre.length < 3)      return showError('register-error', 'El nombre debe tener al menos 3 caracteres.');
    if (!EMAIL_RE.test(correo)) return showError('register-error', 'El correo no tiene formato válido.');
    if (!password)              return showError('register-error', 'La contraseña es requerida.');
    if (password.length < 6)    return showError('register-error', 'La contraseña debe tener al menos 6 caracteres.');
    if (password !== confirmar) return showError('register-error', 'Las contraseñas no coinciden.');

    btn.disabled = true;
    btn.textContent = 'Creando cuenta…';

    try {
        const res  = await fetch(`${API_URL}/api/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ nombre, correo, password }),
        });
        const data = await res.json();

        if (!res.ok) {
            showError('register-error', data.error || 'No se pudo crear la cuenta.');
            return;
        }

        showOk('register-ok', 'Cuenta creada. Iniciando sesión…');

        /* Registro devuelve token directamente → sin segundo request */
        if (data.token && data.user) {
            iniciarSesion(data.user, data.token);
            return;
        }

        /* Fallback: login manual */
        btn.textContent = 'Iniciando sesión…';
        const resL  = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ correo, password }),
        });
        const dataL = await resL.json();

        if (!resL.ok || !dataL.ok) {
            showOk('register-ok', '¡Cuenta creada! Inicia sesión con tu correo.');
            formRegister.reset();
            setTimeout(showLogin, 2000);
            return;
        }

        iniciarSesion(dataL.user, dataL.token);

    } catch {
        showError('register-error', 'No se pudo conectar con el servidor.');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Registrarse';
    }
});

/* ── Eventos de tabs ─────────────────────────────────────────────── */
tabLogin.addEventListener('click',    showLogin);
tabRegister.addEventListener('click', showRegister);
goRegister.addEventListener('click',  showRegister);
goLogin.addEventListener('click',     showLogin);
