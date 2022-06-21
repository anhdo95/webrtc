'use strict'

const selfview = document.querySelector('video.selfView')

const snapButton = document.querySelector('button.snap')
const sendButton = document.querySelector('button.send')
const selfPhoto = document.querySelector('canvas.selfPhoto')
const remotePhoto = document.querySelector('canvas.remotePhoto')

/** @type {CanvasRenderingContext2D} */
const photoContext = selfPhoto.getContext('2d')
const photoChunkLength = 64 * 1024 // 64KB

snapButton.disabled = true
sendButton.disabled = true

const mediaConstraints = {
  video: {
    // HD resolution
    width: { exact: 1280 },
    height: { exact: 720 },
  },
}

let initiator, localStream, remoteStream, peerConnection, photoChannel, signaler
/**
 * @type {Uint8ClampedArray}
 */
let buffer
let count

snapButton.onclick = snapPhoto
sendButton.onclick = sendPhoto

createSignalingChannel()

function createSignalingChannel() {
  signaler = new SignalingChannel()

  signaler.oncreated = handleCreated
  signaler.onjoined = handleJoined
  signaler.onready = handleReady
  signaler.onmessage = handleMessage
}

async function getUserMedia() {
  try {
    createPeerConnection()
    createPhotoChannel()
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    addTrack()
    selfview.srcObject = localStream
  } catch (error) {
    console.error(error)
  }
}

function handleCreated() {
  initiator = true
  getUserMedia()
}

async function handleJoined() {
  getUserMedia()
}

async function handleReady() {
  if (initiator) {
    await peerConnection.setLocalDescription()
    signaler.send({
      offer: peerConnection.localDescription,
    })
  }
}

async function handleMessage({ offer, answer, candidate }) {
  if (offer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    await peerConnection.setLocalDescription()
    signaler.send({
      answer: peerConnection.localDescription,
    })
  } else if (answer) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
  } else if (candidate) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302',
      },
    ],
  })

  peerConnection.onicecandidate = handleIceCandidate
  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange
}

function handleIceCandidate({ candidate }) {
  console.log('handleIceCandidate', candidate)

  if (candidate) {
    signaler.send({
      candidate,
    })
  }
}

function handleIceConnectionStateChange({ target: { connectionState } }) {
  console.log('handleIceConnectionStateChange', connectionState)
}

function handleDataChannel({ channel }) {
  console.log('handleDataChannel', channel)
  photoChannel = channel
  channel.onopen = handlePhotoChannelOpen
  channel.onclose = handlePhotoChannelClose
  channel.onmessage = handlePhotoChannelMessage
}

function createPhotoChannel() {
  if (initiator) {
    photoChannel = peerConnection.createDataChannel('photo')
    photoChannel.onopen = handlePhotoChannelOpen
    photoChannel.onclose = handlePhotoChannelClose
    photoChannel.onmessage = handlePhotoChannelMessage
  } else {
    peerConnection.ondatachannel = handleDataChannel
  }
}

function handlePhotoChannelOpen({ target: { readyState } }) {
  console.log('handlePhotoChannelOpen :>> ', readyState)
  if (readyState === 'open') {
    snapButton.disabled = false
  }
}

function handlePhotoChannelClose() {
  console.log('handlePhotoChannelClose')
}

function handlePhotoChannelMessage({ data }) {
  console.log('handlePhotoChannelMessage :>> ', data)

  if (typeof data === 'string') {
    buffer = new Uint8ClampedArray(Number(data))
    count = 0
    console.log(`Expecting a total of ${buffer.byteLength} byte(s)`)
    return
  }

  const bufferData = new Uint8ClampedArray(data)
  buffer.set(bufferData, count)
  count += bufferData.byteLength
  console.log(`Count: ${count}`)

  if (count === buffer.byteLength) {
    console.log('Rendering a photo')
    renderPhoto()
  }
}

function renderPhoto() {
  /** @type {CanvasRenderingContext2D} */
  const context = remotePhoto.getContext('2d')
  const img = context.createImageData(remotePhoto.width, remotePhoto.height)
  img.data.set(buffer)
  context.putImageData(img, 0, 0)
}

function addTrack() {
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream))
}

function hangUp() {
  peerConnection.close()

  localStream.getTracks().forEach((track) => track.stop())

  peerConnection = null
  localStream = null
}

function snapPhoto() {
  photoContext.drawImage(selfview, 0, 0, selfPhoto.width, selfPhoto.height)
  sendButton.disabled = false
}

function sendPhoto() {
  const img = photoContext.getImageData(0, 0, selfPhoto.width, selfPhoto.height)
  const length = img.data.byteLength
  const numberOfChunks = (length / photoChunkLength) | 0

  console.log(`Sending a total of ${length} bytes`)
  photoChannel.send(length)

  for (let i = 0; i < numberOfChunks; i++) {
    const begin = i * photoChunkLength
    const end = (i + 1) * photoChunkLength
    console.log(`${begin} - ${end - 1}`)
    photoChannel.send(img.data.subarray(begin, end))
  }

  if (length % photoChunkLength) {
    console.log(`Last ${length % photoChunkLength} byte(s)`)
    photoChannel.send(img.data.subarray(numberOfChunks * photoChunkLength))
  }
}
