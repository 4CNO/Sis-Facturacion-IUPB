'use strict';
require('dotenv').config();

// Fail fast on missing critical env vars
['MONGO_URI_AUTH', 'MONGO_URI_STORE'].forEach(v => {
    if (!process.env[v]) {
        console.error(`FATAL: env var ${v} is not set`);
        process.exit(1);
    }
});

const fs         = require('fs');
const path       = require('path');
const express    = require('express');
const cors       = require('cors');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const nodemailer = require('nodemailer');
const rateLimit  = require('express-rate-limit');

const {
    createUser, getUserByEmail, getAllUsers, getUserById, updateUserProfileImage,
    addNotification, getNotificationsByUser,
    addInvoice, getInvoicesByUser,
    addUserEvent,
    createClient, getClients, getClientByDocument,
    createCompany, getCompanies, getCompanyByNit,
    createProduct, getProducts, getProductById,
    createOrder, getOrders,
} = require('./db');

const app = express();

const PORT         = process.env.PORT || 3000;
const UPLOADS_DIR  = path.join(__dirname, 'uploads');
const PROJECT_ROOT = path.join(__dirname, '..');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

// ── Multer ─────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.png';
        cb(null, `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (!file.mimetype.startsWith('image/') || !ALLOWED_IMG_EXTS.has(ext))
            return cb(new Error('Formato de imagen no permitido'));
        cb(null, true);
    },
});

// ── Mailer ─────────────────────────────────────────────────────────────────────
const mailer = SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
          host: SMTP_HOST, port: SMTP_PORT,
          secure: SMTP_PORT === 465,
          auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

// ── Rate limiters ──────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
});

// ── CORS ───────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // 'https://MIDOMINIO.com',
];

app.use(cors({
    origin: (origin, cb) => {
        // Allow same-origin and server-to-server (no origin header)
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS bloqueado: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
    credentials: true,
}));

// ── Security headers ───────────────────────────────────────────────────────────
app.use((_req, res, next) => {
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
        "font-src 'self' https://cdnjs.cloudflare.com",
        "img-src 'self' data: blob: https://ui-avatars.com",
        "connect-src 'self'",
    ].join('; '));
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    res.setHeader('X-Frame-Options',       'DENY');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy',       'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy',    'camera=(), microphone=(), geolocation=()');
    next();
});

// ── RLS middleware ─────────────────────────────────────────────────────────────
// Rejects if X-User-Id header is absent or mismatches URL :id param
function requireSameUser(req, res, next) {
    const claimedId  = req.headers['x-user-id'];
    const resourceId = req.params.id;
    if (!claimedId || !resourceId)
        return res.status(401).json({ error: 'Autenticación requerida.' });
    if (String(claimedId) !== String(resourceId))
        return res.status(403).json({ error: 'Acceso denegado.' });
    next();
}

// ── Body parsers + statics ─────────────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.static(PROJECT_ROOT));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/', (_req, res) => res.redirect('/Login.html'));

// ════════════════════════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════════════════════════

app.get('/api/health', (_req, res) =>
    res.json({ ok: true, timestamp: new Date().toISOString() })
);

// ── Register ───────────────────────────────────────────────────────────────────
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;
        if (!nombre || !correo || !password)
            return res.status(400).json({ error: 'Faltan campos requeridos.' });
        if (typeof nombre !== 'string' || nombre.trim().length > 100)
            return res.status(400).json({ error: 'Nombre inválido.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254)
            return res.status(400).json({ error: 'El correo no tiene formato válido.' });
        if (password.length < 8 || password.length > 128)
            return res.status(400).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres.' });

        const existing = await getUserByEmail(correo);
        if (existing)
            return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });

        const passwordHash = await bcrypt.hash(password, 12);
        const user = await createUser({ name: nombre.trim(), email: correo.toLowerCase().trim(), passwordHash });

        await addNotification(user.id, '¡Bienvenido a FactuLogin! Tu cuenta fue creada.');
        await addInvoice(user.id, 'Factura demo de bienvenida', 0);

        res.status(201).json({ ok: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
        console.error('[POST /api/auth/register]', err);
        res.status(500).json({ error: 'Error interno al registrar usuario.' });
    }
});

// ── Login ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { correo, password } = req.body;
        if (!correo || !password)
            return res.status(400).json({ ok: false, error: 'Faltan campos requeridos.' });

        const user = await getUserByEmail(correo);
        if (!user) {
            // Constant-time hash prevents user enumeration via timing
            await bcrypt.hash('dummy_constant_time', 12);
            return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid)
            return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' });

        await addUserEvent(user._id, 'login', 'Inicio de sesión');
        res.json({ ok: true, user: { id: user._id, name: user.name, email: user.email, profileImage: user.profile_image || null } });
    } catch (err) {
        console.error('[POST /api/auth/login]', err);
        res.status(500).json({ ok: false, error: 'Error interno al iniciar sesión.' });
    }
});

// ── Dashboard (RLS) ────────────────────────────────────────────────────────────
app.get('/api/users/:id/dashboard', requireSameUser, async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const [notifications, invoices] = await Promise.all([
            getNotificationsByUser(req.params.id),
            getInvoicesByUser(req.params.id),
        ]);
        res.json({ ok: true, user: { ...user, profileImage: user.profile_image || null }, notifications, invoices });
    } catch (err) {
        console.error('[GET /dashboard]', err);
        res.status(500).json({ error: 'Error al cargar dashboard.' });
    }
});

// ── Events (RLS) ──────────────────────────────────────────────────────────────
app.post('/api/users/:id/events', requireSameUser, async (req, res) => {
    try {
        const { action, detail } = req.body;
        if (!action || typeof action !== 'string' || action.length > 64)
            return res.status(400).json({ error: 'Acción inválida.' });
        await addUserEvent(req.params.id, action.trim(), detail ? String(detail).slice(0, 255) : null);
        res.status(201).json({ ok: true });
    } catch (err) {
        console.error('[POST /events]', err);
        res.status(500).json({ error: 'Error al guardar evento.' });
    }
});

// ── Profile photo (RLS) ───────────────────────────────────────────────────────
app.post('/api/users/:id/profile-photo', requireSameUser, upload.single('profileImage'), async (req, res) => {
    try {
        const user = await getUserById(req.params.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
        if (!req.file) return res.status(400).json({ error: 'No se recibió imagen.' });

        if (user.profile_image) {
            const old = path.join(UPLOADS_DIR, path.basename(user.profile_image));
            if (fs.existsSync(old)) fs.unlinkSync(old);
        }
        const relativePath = `/uploads/${req.file.filename}`;
        await updateUserProfileImage(req.params.id, relativePath);
        await addNotification(req.params.id, 'Se actualizó tu foto de perfil.');
        await addUserEvent(req.params.id, 'profile_photo_changed', 'Cambió foto');
        res.json({ ok: true, profileImage: relativePath });
    } catch (err) {
        console.error('[POST /profile-photo]', err);
        res.status(500).json({ error: 'Error al actualizar foto.' });
    }
});

// Returns only id+name — no email exposure on unauthenticated list
app.get('/api/users', async (_req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users.map(({ id, name, created_at }) => ({ id, name, created_at })));
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios.' });
    }
});

// ── Clientes ───────────────────────────────────────────────────────────────────
app.get('/api/clientes/buscar', async (req, res) => {
    const doc = String(req.query.documento || '').trim().slice(0, 50);
    if (!doc) return res.status(400).json({ error: 'Documento requerido.' });
    try {
        const cliente = await getClientByDocument(doc);
        res.json(cliente ? { found: true, cliente } : { found: false });
    } catch (err) {
        console.error('[GET /clientes/buscar]', err);
        res.status(500).json({ error: 'Error al buscar cliente.' });
    }
});
app.get('/api/clientes', async (_req, res) => {
    try { res.json(await getClients()); }
    catch { res.status(500).json({ error: 'Error al obtener clientes.' }); }
});
app.post('/api/clientes', async (req, res) => {
    try {
        const { nombre, documento, telefono } = req.body;
        if (!nombre || !documento || !telefono)
            return res.status(400).json({ error: 'Nombre, documento y teléfono son requeridos.' });
        if (String(nombre).length > 100 || String(documento).length > 50 || String(telefono).length > 20)
            return res.status(400).json({ error: 'Campo demasiado largo.' });
        const row = await createClient({ name: nombre.trim(), document: documento.trim(), phone: telefono.trim() });
        res.status(201).json({ ok: true, client: row });
    } catch (err) {
        console.error('[POST /clientes]', err);
        res.status(500).json({ error: 'Error al guardar cliente.' });
    }
});

// ── Empresas ───────────────────────────────────────────────────────────────────
app.get('/api/empresas/buscar', async (req, res) => {
    const nit = String(req.query.nit || '').trim().slice(0, 30);
    if (!nit) return res.status(400).json({ error: 'NIT requerido.' });
    try {
        const empresa = await getCompanyByNit(nit);
        res.json(empresa ? { found: true, empresa } : { found: false });
    } catch (err) {
        console.error('[GET /empresas/buscar]', err);
        res.status(500).json({ error: 'Error al buscar empresa.' });
    }
});
app.get('/api/empresas', async (_req, res) => {
    try { res.json(await getCompanies()); }
    catch { res.status(500).json({ error: 'Error al obtener empresas.' }); }
});
app.post('/api/empresas', async (req, res) => {
    try {
        const { nombre, nit, telefono, direccion } = req.body;
        if (!nombre || !nit || !telefono || !direccion)
            return res.status(400).json({ error: 'Todos los campos son requeridos.' });
        if (String(nombre).length > 100 || String(nit).length > 30 ||
            String(telefono).length > 20 || String(direccion).length > 200)
            return res.status(400).json({ error: 'Campo demasiado largo.' });
        const row = await createCompany({ name: nombre.trim(), nit: nit.trim(), phone: telefono.trim(), address: direccion.trim() });
        res.status(201).json({ ok: true, company: row });
    } catch (err) {
        console.error('[POST /empresas]', err);
        res.status(500).json({ error: 'Error al guardar empresa.' });
    }
});

// ── Productos ──────────────────────────────────────────────────────────────────
app.get('/api/productos/buscar', async (req, res) => {
    const productId = String(req.query.productId || '').trim().slice(0, 50);
    if (!productId) return res.status(400).json({ error: 'productId requerido.' });
    try {
        const producto = await getProductById(productId);
        res.json(producto
            ? { found: true, producto: { ...producto, productId: String(producto.id) } }
            : { found: false });
    } catch (err) {
        console.error('[GET /productos/buscar]', err);
        res.status(500).json({ error: 'Error al buscar producto.' });
    }
});
app.get('/api/productos', async (_req, res) => {
    try { res.json(await getProducts()); }
    catch { res.status(500).json({ error: 'Error al obtener productos.' }); }
});
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, marca, precio, cantidad } = req.body;
        if (!nombre)  return res.status(400).json({ error: 'El nombre es requerido.' });
        if (!marca)   return res.status(400).json({ error: 'La marca es requerida.' });
        if (String(nombre).length > 100 || String(marca).length > 100)
            return res.status(400).json({ error: 'Campo demasiado largo.' });
        const precioNum   = Number(precio);
        const cantidadNum = Number(cantidad);
        if (isNaN(precioNum)   || precioNum   < 0) return res.status(400).json({ error: 'Precio inválido (debe ser ≥ 0).' });
        if (isNaN(cantidadNum) || cantidadNum < 0) return res.status(400).json({ error: 'Cantidad inválida (debe ser ≥ 0).' });
        const row = await createProduct({ name: nombre.trim(), brand: marca.trim(), price: precioNum, stock: cantidadNum });
        res.status(201).json({ ok: true, product: row });
    } catch (err) {
        console.error('[POST /productos]', err);
        res.status(500).json({ error: 'Error al guardar producto.' });
    }
});

// ── Pedidos ────────────────────────────────────────────────────────────────────
app.get('/api/pedidos/options', async (_req, res) => {
    try {
        const [clientes, empresas, productos] = await Promise.all([getClients(), getCompanies(), getProducts()]);
        res.json({ clientes, empresas, productos });
    } catch { res.status(500).json({ error: 'Error al cargar opciones.' }); }
});
app.get('/api/pedidos', async (_req, res) => {
    try { res.json(await getOrders()); }
    catch { res.status(500).json({ error: 'Error al listar pedidos.' }); }
});

app.post('/api/pedidos', async (req, res) => {
    try {
        const { userId, clienteId, empresaId, items } = req.body;
        if (!clienteId || !empresaId || !Array.isArray(items) || !items.length)
            return res.status(400).json({ error: 'Faltan datos para generar el pedido.' });
        if (items.length > 100)
            return res.status(400).json({ error: 'Demasiados ítems en el pedido.' });

        const invoiceLines = [];
        let total = 0;

        for (const raw of items) {
            const productId = String(raw.productoId || '').trim();
            const quantity  = Number(raw.cantidad);
            if (!productId || !quantity || quantity <= 0 || quantity > 100000)
                return res.status(400).json({ error: 'Items inválidos.' });

            const product = await getProductById(productId);
            if (!product) return res.status(404).json({ error: `Producto ${productId} no encontrado.` });

            // 2.5% discount per every 10-unit block
            const bloques     = Math.floor(quantity / 10);
            const pctDesc     = bloques * 0.025;
            const precioBase  = Number(product.price);
            const precioFinal = precioBase * (1 - pctDesc);
            const subtotal    = precioFinal * quantity;
            total += subtotal;

            invoiceLines.push({ productId, productName: product.name, quantity, price: precioFinal, pctDesc, subtotal });
        }

        const order = await createOrder({
            userId:    userId || null,
            clientId:  clienteId,
            companyId: empresaId,
            items: invoiceLines.map(l => ({
                product_id: l.productId, quantity: l.quantity,
                price: l.price, pct_desc: l.pctDesc, subtotal: l.subtotal,
            })),
            total,
        });

        if (userId) {
            await addInvoice(userId, `Factura pedido #${order.id}`, total);
            await addNotification(userId, `Pedido #${order.id} generado por $${total.toFixed(2)}.`);
            await addUserEvent(userId, 'order_created', `Pedido #${order.id}`);
        }

        let mailSent = false;
        if (userId && mailer) {
            try {
                const user = await getUserById(userId);
                if (user?.email) {
                    const txt = invoiceLines.map(l =>
                        `  - ${l.productName} x${l.quantity}` +
                        `${l.pctDesc > 0 ? ` (${(l.pctDesc * 100).toFixed(1)}% desc.)` : ''}` +
                        ` | $${l.price.toFixed(2)} c/u | Sub: $${l.subtotal.toFixed(2)}`
                    ).join('\n');
                    await mailer.sendMail({
                        from: SMTP_FROM, to: user.email,
                        subject: `Factura pedido #${order.id} — FactuLogin`,
                        text: `Hola ${user.name},\n\nDetalle:\n${txt}\n\nTotal: $${total.toFixed(2)}\n\nGracias.`,
                    });
                    mailSent = true;
                }
            } catch (e) { console.warn('[Correo]', e.message); }
        }

        res.status(201).json({ ok: true, orderId: order.id, total, invoiceLines, mailSent });
    } catch (err) {
        console.error('[POST /pedidos]', err);
        res.status(500).json({ error: 'Error al crear pedido.' });
    }
});

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use('/api/*', (_req, res) => res.status(404).json({ error: 'Endpoint no encontrado.' }));

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[Error global]', err);
    res.status(500).json({ error: err.message || 'Error interno.' });
});

app.listen(PORT, () => {
    console.log(`\n✅  FactuLogin en http://localhost:${PORT}`);
    console.log(`📄  Login:  http://localhost:${PORT}/Login.html`);
    console.log(`🔧  Health: http://localhost:${PORT}/api/health\n`);
});
