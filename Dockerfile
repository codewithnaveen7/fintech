FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS migrate
RUN npm ci
COPY . .
CMD ["npx", "sequelize-cli", "db:migrate"]

FROM base AS production
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
