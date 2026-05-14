/**
 * public/js/modules/menu.js  — FactuLogin v3.0
 * ✅ logoutBtn es async (fix bug anterior)
 * ✅ Usa authFetch con JWT
 * ✅ Limpia token al cerrar sesión
 * ✅ Redirige si token expirado
 */

'use strict';

/* utils.js debe cargarse antes */

/* ── DOM refs ────────────────────────────────────────────────────── */
const notifBtn        = document.getElementById('notifBtn');
const notifPanel      = document.getElementById('notifPanel');
const notifList       = document.getElementById('notifList');
const notifCount      = document.getElementById('notifCount');
const userBtn         = document.getElementById('userBtn');
const userDropdown    = document.getElementById('userDropdown');
const logoutBtn       = document.getElementById('logoutBtn');
const viewInvoicesBtn = document.getElementById('viewInvoicesBtn');
const invoicePanel    = document.getElementById('invoicePanel');
const invoiceList     = document.getElementById('invoiceList');
const profileInput    = document.getElementById('profileInput');
const profilePreview  = document.getElementById('profilePreview');
const userNameLabel   = document.getElementById('userNameLabel');
const dropdownName    = document.getElementById('dropdownUserName');
const dropdownEmail   = document.getElementById('dropdownUserEmail');
const profileModal    = document.getElementById('profileModal');
const profileModalImg = document.getElementById('profileModalImg');

/* ── Dashboard ───────────────────────────────────────────────────── */
async function loadDashboard() {
    if (!userId) {
        userNameLabel.textContent  = 'Invitado';
        dropdownName.textContent   = 'Invitado';
        dropdownEmail.textContent  = 'Sin sesión activa';
        notifCount.textContent     = '0';
        notifList.innerHTML        = '<li>Inicia sesión para ver notificaciones</li>';
        invoiceList.innerHTML      = '<li>Sin facturas</li>';
        [notifBtn, viewInvoicesBtn, profileInput].forEach(el => { if (el) el.disabled = true; });
        return;
    }

    try {
        const res = await authFetch(`${API_URL}/api/users/${userId}/dashboard`);
        if (!res.ok) return;

        const data = await res.json();

        userNameLabel.textContent  = sanitize(data.user.name);
        dropdownName.textContent   = sanitize(data.user.name);
        dropdownEmail.textContent  = sanitize(data.user.email);

        const src = photoSrc(data.user.profileImage, data.user.name);
        profilePreview.src  = src;
        if (profileModalImg) profileModalImg.src = src;

        notifCount.textContent = data.notifications.length;
        notifList.innerHTML = data.notifications.length
            ? data.notifications.map(n => `<li>${sanitize(n.message)}</li>`).join('')
            : '<li>Sin notificaciones</li>';

        invoiceList.innerHTML = data.invoices.length
            ? data.invoices.map(f =>
                `<li>#${sanitize(String(f.id))} — ${sanitize(f.description)} — $${Number(f.total).toFixed(2)}</li>`
              ).join('')
            : '<li>Sin facturas aún</li>';

    } catch (err) { console.error('[loadDashboard]', err); }
}

/* ── Modal foto ──────────────────────────────────────────────────── */
if (profilePreview && profileModal && profileModalImg) {
    profilePreview.addEventListener('click', () => {
        profileModalImg.src = profilePreview.src;
        profileModal.classList.add('open');
    });
    profileModal.addEventListener('click', () => profileModal.classList.remove('open'));
}

/* ── Dropdown ────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
    if (userBtn && !userBtn.contains(e.target) && userDropdown && !userDropdown.contains(e.target))
        userDropdown.classList.add('hidden');
});
if (userBtn) {
    userBtn.addEventListener('click', e => {
        e.stopPropagation();
        userDropdown?.classList.toggle('hidden');
    });
}

/* ── Notificaciones / Facturas ───────────────────────────────────── */
notifBtn?.addEventListener('click', () => {
    notifPanel?.classList.toggle('hidden');
    invoicePanel?.classList.add('hidden');
    userDropdown?.classList.add('hidden');
    if (SESSION) track('open_notifications', '');
});

viewInvoicesBtn?.addEventListener('click', () => {
    invoicePanel?.classList.toggle('hidden');
    notifPanel?.classList.add('hidden');
    userDropdown?.classList.add('hidden');
});

/* ✅ CORREGIDO: es async para que await funcione */
logoutBtn?.addEventListener('click', async () => {
    await track('logout', 'Cerró sesión');
    clearSession();
    window.location.href = 'login.html';
});

/* ── Cambiar foto ────────────────────────────────────────────────── */
profileInput?.addEventListener('change', async () => {
    const file = profileInput.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast('❌ Solo se permiten imágenes.');
        profileInput.value = '';
        return;
    }

    const fd = new FormData();
    fd.append('profileImage', file);

    try {
        const res = await fetch(`${API_URL}/api/users/${userId}/profile-photo`, {
            method:  'POST',
            body:    fd,
            headers: { 'Authorization': `Bearer ${authToken}` },
        });
        const data = await res.json();

        if (!res.ok) { toast('❌ ' + (data.error || 'Error al subir')); return; }

        const src = photoSrc(data.profileImage, currentUser?.name);
        if (profilePreview)  profilePreview.src  = src;
        if (profileModalImg) profileModalImg.src = src;
        toast('✅ Foto actualizada');
        track('profile_photo_changed', 'Actualizó foto');

    } catch (err) {
        console.error('[uploadPhoto]', err);
        toast('❌ Error de conexión');
    }
});

/* ── Init ────────────────────────────────────────────────────────── */
loadDashboard();
initPageTransitions();
if (SESSION) track('open_menu', 'Entró al menú');
