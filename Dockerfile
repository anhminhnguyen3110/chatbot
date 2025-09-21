# Use official Node.js image as the base image
FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache bash && \
npm install -g pnpm node-prune

# Build dependencies
FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile && \
    pnpm cache clean

# Build Image
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm run build 
RUN rm -rf node_modules 
RUN pnpm install --prod --frozen-lockfile --ignore-scripts 
RUN npx node-prune

FROM node:20-alpine AS runner
WORKDIR /app

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile

# Copy built application from build stage
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# COPY --from=build /app/component.json ./
COPY --from=build /app/next-env.d.ts ./
COPY --from=build /app/next.config.ts ./

# For db migration
COPY --from=build /app/lib/db ./lib/db
EXPOSE 3000

# Run migrations and start the application
CMD ["sh", "-c", "pnpm run db:migrate && pnpm run start"]
