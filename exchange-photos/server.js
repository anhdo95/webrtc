const express = require('express')
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)
const PORT = process.env.PORT || 3000

app.use(express.static('public'))

const peers = new Set()

io.on('connection', (socket) => {
  peers.add(socket.id)

  if (peers.size === 1) {
    socket.emit('created')
  } else if (peers.size === 2) {
    socket.emit('joined')
    socket.broadcast.emit('ready')
  } else { // max 2 clients
    socket.emit('full')
  }
  
  socket.on('message', (data) => {
    socket.broadcast.emit('message', data)
  })

  socket.on('disconnect', () => {
    peers.delete(socket.id)
  })
})

app.get('/', (req, res) => {
  res.sendFile('index.html')
})

server.listen(PORT, () => console.log(`Listening on ${PORT} port`))
