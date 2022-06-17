import SignalingChannel from './signaling-channel.js'

const constraints = { audio: true, video: true }
const selfVideo = document.querySelector('video.selfview')
const remoteVideo = document.querySelector('video.remoteview')

const config = {
  iceServers: [],
}

const signaler = new SignalingChannel()
const pc = new RTCPeerConnection(config)

let makingOffer = false
let ignoreOffer = false
let polite = false
let offerCollision = false

pc.ontrack = (event) => {
  console.log('ontrack :>> ', event)
  event.track.onunmute = () => {
    if (remoteVideo.srcObject) {
      return
    }

    remoteVideo.srcObject = event.streams[0]
  }
}

pc.onnegotiationneeded = async () => {
  console.log('onnegotiationneeded')
  try {
    makingOffer = true
    await pc.setLocalDescription()
    signaler.send({ description: pc.localDescription })
  } catch (error) {
    console.error(error)
  } finally {
    makingOffer = false
  }
}

pc.onicecandidate = ({ candidate }) => {
  console.log('onicecandidate')
  signaler.send({ candidate })
}

signaler.oninit = () => {
  polite = !polite
}

signaler.onmessage = async ({ description, candidate }) => {
  console.log('description :>> ', description)
  console.log('candidate :>> ', candidate)
  console.log('pc :>> ', pc);
  console.log('makingOffer :>> ', makingOffer);
  try {
    if (description) {
      offerCollision =
        description.type === 'offer' &&
        (makingOffer || pc.signalingState !== 'stable')
  
      ignoreOffer = !polite && offerCollision
      if (ignoreOffer) return
  
      await pc.setRemoteDescription(description)
      if (description.type === 'offer') {
        await pc.setLocalDescription()
        signaler.send({ description: pc.localDescription })
      }
    } else if (candidate) {
      try {
        await pc.addIceCandidate(candidate)
      } catch (error) {
        if (!ignoreOffer) {
          throw error
        }
      }
    }
  } catch (error) {
    console.error(error)
  }
}

async function start() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints)

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    selfVideo.srcObject = stream
  } catch (error) {
    console.error(error)
  }
}

start()
