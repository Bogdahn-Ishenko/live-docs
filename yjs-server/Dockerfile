FROM node:20-alpine

WORKDIR /app

RUN npm install yjs y-websocket@1.4.5

ENV HOST=0.0.0.0
ENV PORT=1234

EXPOSE 1234

CMD ["node", "node_modules/y-websocket/bin/server.js"]