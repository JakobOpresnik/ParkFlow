FROM oven/bun:1 AS builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile
# Copy rest of the source
COPY . .
RUN bunx tsc -p tsconfig.prod.json

FROM oven/bun:1 as production
WORKDIR /app
COPY --from=builder /app/dist ./dist
# COPY --from=builder /app/package.json ./package.json
# COPY --from=builder /app/bun.lock ./bun.lock
# RUN bun install --production
# Optionally copy migrations or other runtime assets
COPY --from=builder /app/migrations ./migrations
EXPOSE 3001
CMD ["bun", "dist/index.js"]
