FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm

FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=builder /app/node_modules ./node_modules
COPY . .
COPY .env.prod .env
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/lib/db ./lib/db
COPY .env.db .env.db
COPY .env.prod .env

EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm run db:migrate && pnpm run start"]
