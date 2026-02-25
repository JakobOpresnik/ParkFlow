FROM node:22-alpine

RUN npm install -g bun

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3001
CMD ["bun", "run", "start"]
