FROM oven/bun:1 as builder
WORKDIR /app
COPY package.json ./
RUN bun install --production
# Copy rest of the source
COPY . .
RUN bun run build

FROM oven/bun:1 as production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
RUN bun install --production
# Optionally copy migrations or other runtime assets
# COPY --from=builder /app/migrations ./migrations
EXPOSE 3000
CMD ["bun", "dist/index.js"]
