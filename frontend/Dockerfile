FROM node:22-alpine AS build

RUN npm install -g bun

WORKDIR /app

ARG VITE_API_URL
ARG VITE_OAUTH_AUTHORITY
ARG VITE_OAUTH_CLIENT_ID
ARG VITE_OAUTH_REDIRECT_URI
ARG VITE_OAUTH_ADMIN_GROUP

ENV VITE_API_URL=http://localhost:80
ENV VITE_OAUTH_AUTHORITY=https://sso.matheo.si/application/o/park-flow
ENV VITE_OAUTH_CLIENT_ID=V9RNWkqNeQq8FhnTCxnPr3hhlQLoBXHkp0k8k95j
ENV VITE_OAUTH_REDIRECT_URI=http://parkflow.matheo.si/callback
ENV VITE_OAUTH_ADMIN_GROUP=parkflow-admins

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
