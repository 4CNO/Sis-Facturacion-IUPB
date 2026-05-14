FROM node:20-alpine AS production

LABEL maintainer="FactuLogin"
LABEL version="4.0.0"

WORKDIR /app

# Copiar manifiestos primero (cache de capas npm)
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias + generar cliente Prisma
RUN npm ci --omit=dev && \
    npx prisma generate && \
    npm cache clean --force

# Copiar código fuente
COPY . .

# Crear directorio de uploads
RUN mkdir -p uploads

# Ejecutar migraciones al arrancar (script de inicio)
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health',r=>r.statusCode===200?process.exit(0):process.exit(1)).on('error',()=>process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
