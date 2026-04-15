import http from 'http'
import WebSocket from 'ws'
import setupWSConnection from 'y-websocket/bin/utils.js'

const port = process.env.PORT || 1234

const server = http.createServer()
const wss = new WebSocket.Server({ server })

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req)
})

server.listen(port, () => {
  console.log(`Yjs WebSocket server running on ws://localhost:${port}`)
})