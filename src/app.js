'use strict';

/**
 * src/app.js — FactuLogin v4.0 (PostgreSQL + Prisma)
 * Eliminado: require de db.config.js (Mongoose dual-cluster)
 * La conexión Prisma se inicializa en src/config/prisma.js
 */

const express       = require('express');
const path          = require('path');
const cors          = require('cors');
const corsOptions   = require('./config/cors.config');
const securityMw    = require('./middlewares/security.middleware');
const rateLimitMw   = require('./middlewares/rateLimit.middleware');
const sanitizeMw    = require('./middlewares/sanitize.middleware');
const errorHandler  = require('./middlewares/errorHandler.middleware');
const authRoutes    = require('./routes/auth.routes');
const userRoutes    = require('./routes/user.routes');
const clientRoutes  = require('./routes/client.routes');
const companyRoutes = require('./routes/company.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes   = require('./routes/order.routes');

const app         = express();
const PUBLIC_DIR  = path.join(__dirname, '..', 'public');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

/* ── Middleware global ──────────────────────────────────────────── */
app.use(cors(corsOptions));
app.use(securityMw);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(sanitizeMw);

/* ── Estáticos ──────────────────────────────────────────────────── */
app.use(express.static(PUBLIC_DIR));
app.use('/uploads', express.static(UPLOADS_DIR));
app.get('/', (_req, res) => res.redirect('/login.html'));

/* ── Health check ───────────────────────────────────────────────── */
app.get('/api/health', (_req, res) =>
    res.json({ ok: true, version: '4.0.0', db: 'postgresql+prisma', timestamp: new Date().toISOString() })
);

/* ── Rutas ──────────────────────────────────────────────────────── */
app.use('/api/auth',      rateLimitMw.auth, authRoutes);
app.use('/api/users',     userRoutes);
app.use('/api/clientes',  clientRoutes);
app.use('/api/empresas',  companyRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/pedidos',   orderRoutes);

/* ── 404 API ────────────────────────────────────────────────────── */
app.use('/api/*', (_req, res) =>
    res.status(404).json({ error: 'Endpoint no encontrado.' })
);

/* ── Error handler ──────────────────────────────────────────────── */
app.use(errorHandler);

module.exports = app;
