'use strict';

/**
 * server.js — FactuLogin v4.0
 * Eliminado: require('./src/config/db.config') de Mongoose
 * Prisma se conecta automáticamente al importar src/config/prisma.js desde los servicios.
 */

require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error('❌  FATAL: DATABASE_URL no definida en .env');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('❌  FATAL: JWT_SECRET no definida en .env');
    process.exit(1);
}

const app  = require('./src/app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`\n✅  FactuLogin v4.0 — PostgreSQL + Prisma`);
    console.log(`🌐  http://localhost:${PORT}`);
    console.log(`📄  Login:  http://localhost:${PORT}/login.html`);
    console.log(`🔧  Health: http://localhost:${PORT}/api/health\n`);
});
