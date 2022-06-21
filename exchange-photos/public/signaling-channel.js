class SignalingChannel {
  constructor() {
    this.socket = io()

    this.socket.on('connect', () => {
      this.onconnect()
    })

    this.socket.on('created', () => {
      this.oncreated()
    })

    this.socket.on('joined', () => {
      this.onjoined()
    })

    this.socket.on('ready', () => {
      this.onready()
    })

    this.socket.on('message', (data) => {
      this.onmessage(JSON.parse(data))
    })
  }

  send(data) {
    this.socket.emit('message', JSON.stringify(data))
  }

  onconnect() {}

  oncreated() {}
  
  onjoined() {}

  onready() {}

  onmessage() {}
}
