async function initCamera() {
  const urlParams = new URLSearchParams(window.location.search);
  const audioDeviceId = urlParams.get('deviceId');

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      audio: false, // audio is handled by the offscreen document
    });

    const videoEl = document.getElementById('camera-feed') as HTMLVideoElement;
    if (videoEl) {
      videoEl.srcObject = stream;
    }
  } catch (err) {
    console.error('[ClipIQ Camera Iframe] Failed to start camera:', err);
    // Notify parent frame so it can hide the iframe if needed
    window.parent.postMessage({ type: 'CLIPIQ_CAMERA_FAILED' }, '*');
  }
}

initCamera();
