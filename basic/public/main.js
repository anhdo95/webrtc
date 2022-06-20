'use strict'

const selfview = document.querySelector('video.selfview')
const remoteview = document.querySelector('video.remoteview')

const startButton = document.querySelector('button.start')
const callButton = document.querySelector('button.call')
const hangUpButton = document.querySelector('button.hangup')

const messages = document.querySelector('ul.messages')
const message = document.querySelector('input.message')

callButton.disabled = true
hangUpButton.disabled = true
message.disabled = true

const mediaConstraints = {
  video: {
    // HD resolution
    width: { exact: 1280 },
    height: { exact: 720 },
  },
  audio: true,
}

let localStream, remoteStream, peerConnection, dataChannel, signaler

startButton.onclick = start
callButton.onclick = call
hangUpButton.onclick = hangUp

message.onkeyup = sendMessage

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    createSignalingChannel()
    createPeerConnection()
    createDataChannel()
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
  peerConnection.ondatachannel = handleDataChannel
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

function handleDataChannel({ channel }) {
  console.log('handleDataChannel', channel)
  channel.onopen = handleChannelOpen
  channel.onclose = handleChannelClose
  channel.onmessage = handleChannelMessage
}

function createDataChannel() {
  dataChannel = peerConnection.createDataChannel('chat')

  dataChannel.onopen = handleChannelOpen
  dataChannel.onclose = handleChannelClose
  dataChannel.onmessage = handleChannelMessage
}

function handleChannelOpen({ target: { readyState } }) {
  console.log('handleChannelOpen')
  if (readyState === 'open') {
    message.disabled = false
  }
}

function handleChannelClose() {
  console.log('handleChannelClose')
  message.disabled = true
}

function handleChannelMessage({ data }) {
  console.log('handleChannelMessage :>> ', data)
  appendMessage(data)
}

function appendMessage(text) {
  const message = document.createElement('li')
  message.textContent = text
  messages.appendChild(message)
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

  localStream.getTracks().forEach((track) => track.stop())
  remoteStream.getTracks().forEach((track) => track.stop())

  peerConnection = null
  localStream = null
  remoteStream = null

  startButton.disabled = false
  callButton.disabled = true
  hangUpButton.disabled = true
}

function sendMessage({ keyCode }) {
  if (keyCode === 13 && message.value) {
    // Pressed an enter and has entered a message
    appendMessage(message.value)
    dataChannel.send(message.value)
    message.value = '' // clear the message
  }
}
