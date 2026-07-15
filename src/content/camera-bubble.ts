import { RecordingMode } from '../shared/types/recording';

let bubbleRoot: HTMLElement | null = null;
let iframeEl: HTMLIFrameElement | null = null;

export async function showCameraBubble(mode?: RecordingMode, audioDeviceId?: string): Promise<void> {
  // Only show if mode requires camera + screen/tab
  if (mode !== RecordingMode.CAMERA_AND_SCREEN && mode !== RecordingMode.CAMERA_AND_TAB) {
    return;
  }

  // Guard: check actual DOM, not just in-memory state.
  // When a content script is dynamically re-injected into a tab, bubbleRoot is null
  // even if a stale element exists in the DOM from a previous injection.
  if (bubbleRoot || document.getElementById('clipiq-camera-bubble')) return;

  bubbleRoot = document.createElement('div');
  bubbleRoot.className = 'clipiq-camera-bubble';
  bubbleRoot.id = 'clipiq-camera-bubble';
  
  // Start positioned bottom-left by default, offset from controls
  bubbleRoot.style.left = '24px';
  bubbleRoot.style.bottom = '24px';

  iframeEl = document.createElement('iframe');
  const queryParam = audioDeviceId ? `?deviceId=${encodeURIComponent(audioDeviceId)}` : '';
  iframeEl.src = chrome.runtime.getURL(`src/pages/camera/camera.html${queryParam}`);
  iframeEl.allow = 'camera';
  iframeEl.style.width = '100%';
  iframeEl.style.height = '100%';
  iframeEl.style.border = 'none';
  iframeEl.style.borderRadius = '50%';
  iframeEl.style.overflow = 'hidden';

  bubbleRoot.appendChild(iframeEl);
  document.body.appendChild(bubbleRoot);

  makeDraggable(bubbleRoot);
  
  // Listen for failure from iframe
  const messageListener = (event: MessageEvent) => {
    if (event.data?.type === 'CLIPIQ_CAMERA_FAILED') {
      removeCameraBubble();
      window.removeEventListener('message', messageListener);
    }
  };
  window.addEventListener('message', messageListener);
}

export function removeCameraBubble(): void {
  if (bubbleRoot) {
    bubbleRoot.remove();
    bubbleRoot = null;
    iframeEl = null;
  }
}

// ─── Draggable ────────────────────────────────────────────────────────────────

function makeDraggable(el: HTMLElement): void {
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  el.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    const rect = el.getBoundingClientRect();
    offsetX = rect.left;
    offsetY = rect.top;
    el.style.transition = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    el.style.left = `${offsetX + dx}px`;
    el.style.top = `${offsetY + dy}px`;
    el.style.bottom = 'unset';
    el.style.right = 'unset';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    el.style.transition = '';
  });
}
