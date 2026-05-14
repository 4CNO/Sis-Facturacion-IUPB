# FactuLogin v4.0 — PostgreSQL + Prisma

> Migrado desde MongoDB + Mongoose (dos clusters) a PostgreSQL + Prisma ORM.

---

## ¿Por qué PostgreSQL + Prisma?

| Criterio | MongoDB + Mongoose (v3) | PostgreSQL + Prisma (v4) |
|---|---|---|
| **Integridad de datos** | Sin FK nativas | FK + constraints del motor |
| **Transacciones** | Requiere replica set | ACID nativo en cualquier instancia |
| **Clusters** | 2 clusters separados | 1 única base de datos |
| **Costos** | 2 conexiones Atlas | 1 proveedor (Neon/Supabase gratis) |
| **Migraciones** | Manual / scripts | Versionadas con `prisma migrate` |
| **Rendimiento** | JS runtime | Query engine Rust compilado |
| **Tipo de datos** | Esquema flexible | Esquema estricto (más seguro) |
| **Relaciones** | Referencias manuales | JOINs nativos con include |

---

## Estructura del proyecto

```
factulogin/
│
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-entrypoint.sh
├── docker-compose.yml          ← incluye PostgreSQL local
│
├── prisma/
│   ├── schema.prisma           ← NUEVO: define todo el esquema de datos
│   └── seed.js
│
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── prisma.js           ← NUEVO: reemplaza db.config.js + models/index.js
│   │   ├── constants.js
│   │   └── cors.config.js
│   ├── controllers/            ← Sin cambios
│   ├── middlewares/
│   │   ├── sanitize.middleware.js  ← MIGRADO: xss en vez de mongo-sanitize
│   │   └── ...resto sin cambios
│   ├── routes/                 ← Sin cambios
│   ├── services/
│   │   ├── auth.service.js     ← MIGRADO: Prisma
│   │   ├── crud.service.js     ← MIGRADO: Prisma upsert nativo
│   │   ├── user.service.js     ← MIGRADO: Prisma + include
│   │   ├── order.service.js    ← MIGRADO: transacción SQL atómica
│   │   ├── client.service.js   ← MIGRADO (1 línea cambia)
│   │   ├── company.service.js  ← MIGRADO (1 línea cambia)
│   │   └── product.service.js  ← MIGRADO: Prisma
│   ├── utils/
│   │   └── mailer.util.js      ← MIGRADO: usa Prisma
│   └── validators/             ← Sin cambios
│
└── public/                     ← Sin cambios (frontend vanilla)
```

---

## Instalación rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar .env con tu DATABASE_URL y JWT_SECRET

# 3. Crear tablas en la BD
npm run db:migrate

# 4. Arrancar
npm run dev
```

## Con Docker (incluye PostgreSQL local)

```bash
cp .env.example .env
# Editar .env con JWT_SECRET

docker-compose up -d
# La app corre en http://localhost:3000
```

---

## Proveedores PostgreSQL gratuitos recomendados

| Proveedor | URL | Free tier |
|---|---|---|
| **Neon** | https://neon.tech | 0.5 GB, serverless |
| **Supabase** | https://supabase.com | 500 MB, incluye Auth/Storage |
| **Railway** | https://railway.app | $5 crédito/mes |
| **Local Docker** | `docker-compose up db` | Sin límite |

---

## Comandos Prisma útiles

```bash
npm run db:dev      # Crear migración en desarrollo
npm run db:migrate  # Aplicar migraciones en producción
npm run db:studio   # GUI visual de la base de datos
npm run db:reset    # Borrar y recrear la BD (solo dev)
```

---

## Archivos eliminados (MongoDB/Mongoose)

| Archivo eliminado | Reemplazado por |
|---|---|
| `src/config/db.config.js` | `src/config/prisma.js` |
| `src/models/index.js` | `prisma/schema.prisma` |
| Dependencia `mongoose` | `@prisma/client` + `prisma` |
| Dependencia `express-mongo-sanitize` | librería `xss` |
| Variables `MONGO_URI_AUTH`, `MONGO_URI_STORE` | `DATABASE_URL` única |

---

## Resumen cavernícola

**Mongo fuera. Prisma entrar. Un cluster. Datos seguros. Bugs morir. Transacciones buenas. App fuerte.**
