# yjs-server/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Устанавливаем только нужные пакеты
RUN npm install yjs y-websocket

# HOST=0.0.0.0 обязателен, чтобы порт был виден снаружи контейнера
ENV HOST=0.0.0.0
ENV PORT=1234

EXPOSE 1234

# Запускаем готовый бинарник из пакета
CMD ["node", "node_modules/y-websocket/bin/server.js"]
