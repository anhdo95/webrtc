'use strict'

const selfview = document.querySelector('video.selfview')
const remoteview = document.querySelector('video.remoteview')

const mediaConstraints = {
  video: {
    // HD resolution
    width: { exact: 1280 },
    height: { exact: 720 },
  },
  audio: true,
}

let localStream, remoteStream

start()

async function start() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    selfview.srcObject = localStream
  } catch (error) {
    console.error(error)
  }
}
