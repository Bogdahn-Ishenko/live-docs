# yjs-server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Копируем файлы манифеста
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код (server.js)
COPY server.js ./

# Запускаем сервер
CMD ["node", "server.js"]
