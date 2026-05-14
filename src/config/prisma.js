'use strict';

/**
 * src/config/prisma.js
 * Singleton del cliente Prisma.
 *
 * Reemplaza completamente:
 *   - src/config/db.config.js  (authDB + storeDB mongoose connections)
 *   - src/models/index.js      (todos los schemas Mongoose)
 *
 * Prisma genera el cliente tipado desde prisma/schema.prisma en build-time.
 * En desarrollo se reutiliza la instancia para no agotar conexiones.
 */

const { PrismaClient } = require('@prisma/client');

const LOG_LEVELS = process.env.NODE_ENV === 'production'
    ? ['error', 'warn']
    : ['error', 'warn', 'info'];

const prisma = global.__prisma ?? new PrismaClient({
    log: LOG_LEVELS,
    errorFormat: 'minimal',
});

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

/* Graceful shutdown */
const shutdown = async () => {
    await prisma.$disconnect();
    console.log('🔌  Prisma desconectado.');
    process.exit(0);
};
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

/* Verificar conexión al arrancar */
prisma.$connect()
    .then(() => console.log('✅  [DB] PostgreSQL conectado via Prisma'))
    .catch(err => {
        console.error('❌  [DB] Error conectando a PostgreSQL:', err.message);
        process.exit(1);
    });

module.exports = prisma;
