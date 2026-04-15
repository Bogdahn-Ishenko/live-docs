import http from 'http'
import { WebSocketServer } from 'ws'
import setupWSConnection from 'y-websocket/bin/utils.js'

const PORT = process.env.PORT || 1234

const server = http.createServer()

const wss = new WebSocketServer({
  server
})

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req)
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Yjs server running on ws://0.0.0.0:${PORT}`)
})