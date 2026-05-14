// prisma/seed.js
// Seed inicial — solo para desarrollo/testing
'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🌱  Seed completado (sin datos iniciales — la app crea datos al registrarse).');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
