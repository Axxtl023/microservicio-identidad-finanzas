# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

# python3 / make / g++ para compilar bcrypt (módulo nativo con bindings de C++)
# openssl para el motor de consultas de Prisma en Alpine (libc musl)
RUN apk add --no-cache python3 make g++ openssl

WORKDIR /app

# Manifiestos y schema primero para maximizar la caché de capas
COPY package*.json ./
COPY prisma ./prisma/

# Instalación completa (dev + prod): compila bcrypt y descarga la CLI de prisma
RUN npm ci

# Generar el cliente Prisma estándar mientras la CLI de dev está disponible
RUN npx prisma generate

# Copiar fuentes y compilar TypeScript → dist/
# nest-cli.json (con deleteOutDir: true) copia src/protos/** → dist/protos/
COPY . .
RUN npm run build

# Podar devDependencies en el árbol actual:
# elimina CLI de prisma, @types/*, herramientas de build, etc.
# El binario nativo de bcrypt (.node) y node_modules/.prisma/client sobreviven
RUN npm prune --production

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:24-alpine AS runner

# openssl en runtime: requerido por el query engine de Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# node_modules podadas: incluye binario bcrypt compilado para linux-musl
# + node_modules/.prisma/client generado + @prisma/client
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

# Compilado final: dist/main.js + dist/protos/finance.proto
COPY --chown=node:node --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Canal REST — API HTTP del microservicio Identidad & Finanzas
EXPOSE 3001

# Canal gRPC — FinanceService (package: booking.finance.v1)
# Consumido por microservicio-reservas-booking en la SAGA
EXPOSE 5002

USER node

CMD ["node", "dist/main"]
