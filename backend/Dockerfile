FROM node:22-alpine AS deps

RUN npm install -g bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-alpine

RUN npm install -g bun

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY src ./src

EXPOSE 3001
CMD ["bun", "run", "start"]
