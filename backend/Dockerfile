# Multi-stage production Dockerfile for the NestJS backend
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
# Production dependencies plus the Prisma CLI, which applies migrations at startup.
RUN npm ci --omit=dev && npm install --no-save prisma@$(node -p "require('./package.json').devDependencies.prisma") && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p uploads/mri && chown -R node:node uploads
USER node

EXPOSE 4000

# Applies pending migrations (baselining legacy `db push` databases, never resetting data),
# then starts the API. Demo accounts are NOT seeded in containers.
# Set RUN_MIGRATIONS=false to manage migrations as a separate deployment step.
CMD ["sh", "-c", "if [ \"${RUN_MIGRATIONS:-true}\" = \"true\" ]; then sh ./scripts/migrate.sh; fi && exec node dist/main.js"]
