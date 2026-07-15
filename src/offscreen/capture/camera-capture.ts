// Camera-only capture using getUserMedia
import { createLogger } from '../../shared/utils/logger';

const logger = createLogger('CameraCapture');

/**
 * Acquire webcam stream (video + audio from microphone).
 */
export async function captureCamera(audioDeviceId?: string): Promise<MediaStream> {
  logger.info('Capturing camera stream', { audioDeviceId });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    },
    audio: audioDeviceId
      ? { deviceId: { exact: audioDeviceId } }
      : true,
  });
  logger.info('Camera stream acquired', {
    videoTracks: stream.getVideoTracks().length,
    audioTracks: stream.getAudioTracks().length,
  });
  return stream;
}

/**
 * Acquire microphone-only stream.
 */
export async function captureMicrophone(audioDeviceId?: string): Promise<MediaStream> {
  logger.info('Capturing microphone stream', { audioDeviceId });
  const stream = await navigator.mediaDevices.getUserMedia({
    video: false,
    audio: audioDeviceId
      ? { deviceId: { exact: audioDeviceId } }
      : true,
  });
  logger.info('Microphone stream acquired');
  return stream;
}

/**
 * Enumerate available audio input devices.
 */
export async function getAudioDevices(): Promise<MediaDeviceInfo[]> {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices.filter((d) => d.kind === 'audioinput');
}
