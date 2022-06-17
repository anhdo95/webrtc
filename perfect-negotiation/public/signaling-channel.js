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
      this.onmessage(data)
    })
  }

  send(data) {
    this.socket.emit('message', data)
  }

  onconnect() {}

  oninit() {}

  onmessage() {}
}

export default SignalingChannel
