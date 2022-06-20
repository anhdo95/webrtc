class SignalingChannel {
  constructor() {
    this.socket = io()

    this.socket.on('connect', () => {
      this.onconnect()
    })

    this.socket.on('init', (data) => {
      this.oninit(data)
    })

    this.socket.on('message', (data) => {
      this.onmessage(JSON.parse(data))
    })
  }

  send(data) {
    this.socket.emit('message', JSON.stringify(data))
  }

  onconnect() {}

  oninit() {}

  onmessage() {}
}
