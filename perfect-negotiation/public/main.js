const constraints = { audio: true, video: true }
const selfVideo = document.querySelector('video.selfview')
const remoteVideo = document.querySelector('video.remoteview')

const config = {
  iceServers: [],
}

const signaler = new SignalingChannel()
const pc = new RTCPeerConnection(config)

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream)
    })

    selfVideo.srcObject = stream
  } catch (error) {
    console.error(error)
  }
}
