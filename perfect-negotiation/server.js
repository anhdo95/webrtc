const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const PORT = process.env.PORT || 3000

app.use(express.static('public'))

const peers = new Set()

io.on('connection', (socket) => {
  peers.add(socket.id)

  socket.on('pre-offer', (data) => {})

  socket.on('disconnect', () => {
    peers.delete(socket.id)
  })
})

app.get('/', (req, res) => {
  res.sendFile('index.html')
})

server.listen(PORT, () => console.log(`Listening on ${PORT} port`))
