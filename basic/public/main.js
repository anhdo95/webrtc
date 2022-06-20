'use strict'

const selfview = document.querySelector('video.selfview')
const remoteview = document.querySelector('video.remoteview')

const startButton = document.querySelector('button.start')
const callButton = document.querySelector('button.call')
const hangUpButton = document.querySelector('button.hangup')

callButton.disabled = true
hangUpButton.disabled = true

const mediaConstraints = {
  video: {
    // HD resolution
    width: { exact: 1280 },
    height: { exact: 720 },
  },
  audio: true,
}

let localStream, remoteStream, peerConnection, signaler

startButton.onclick = start
callButton.onclick = call
hangUpButton.onclick = hangUp

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    createSignalingChannel()
    createPeerConnection()
    addTrack()
    selfview.srcObject = localStream

    startButton.disabled = true
    callButton.disabled = false
  } catch (error) {
    console.error(error)
  }
}

function createSignalingChannel() {
  signaler = new SignalingChannel()
  
  signaler.onmessage = handleMessage
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

async function createPeerConnection() {
  peerConnection = new RTCPeerConnection()

  peerConnection.ontrack = handleTrack
  peerConnection.onicecandidate = handleIceCandidate
  peerConnection.oniceconnectionstatechange = handleIceConnectionStateChange
}

function handleTrack({ track, streams }) {
  console.log('handleTrack')
  track.onunmute = () => {
    if (remoteview.srcObject) return
    remoteStream = streams[0]
    remoteview.srcObject = remoteStream
    
    callButton.disabled = true
    hangUpButton.disabled = false
  }
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

function addTrack() {
  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream))
}

async function call() {
  await peerConnection.setLocalDescription()
  signaler.send({
    offer: peerConnection.localDescription,
  })
}

function hangUp() {
  peerConnection.close()

  localStream.getTracks().forEach(track => {
    track.stop()
  })

  remoteStream.getTracks().forEach(track => {
    track.stop()
  })

  peerConnection = null
  localStream = null
  remoteStream = null

  startButton.disabled = false
  callButton.disabled = true
  hangUpButton.disabled = true
}
