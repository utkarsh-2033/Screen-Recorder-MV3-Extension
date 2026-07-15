// ─── ClipIQ Content Script ────────────────────────────────────────────────────
//
// Injected into every page. Responsibilities:
//   • Show/hide floating recording controls
//   • Display live recording timer
//   • Forward stop/pause/resume actions to background SW
//   • Make controls draggable
//
// Keeps footprint minimal — no framework, pure DOM manipulation.
//

import { MSG, type ExtensionMessage } from '../shared/types/messages';
import { RecordingState, RecordingMode } from '../shared/types/recording';
import { formatDuration } from '../shared/utils/validation';
import { showCameraBubble, removeCameraBubble } from './camera-bubble';
import { DrawingTools } from './drawing-tools';

let drawingTools: DrawingTools | null = null;

// ─── DOM State ────────────────────────────────────────────────────────────────

let controlsRoot: HTMLElement | null = null;
let timerEl: HTMLElement | null = null;
let recDotEl: HTMLElement | null = null;
let elapsedMs = 0;
let currentState: RecordingState = RecordingState.IDLE;

// ─── Create Floating Controls ─────────────────────────────────────────────────

function createControls(state: RecordingState): void {
  // Guard: check both in-memory state and DOM in case of dynamic re-injection
  if (controlsRoot || document.getElementById('clipiq-floating-controls')) return;

  controlsRoot = document.createElement('div');
  controlsRoot.className = 'clipiq-controls';
  controlsRoot.id = 'clipiq-floating-controls';

  const isPaused = state === RecordingState.PAUSED;
  const isUploading = state === RecordingState.UPLOADING;

  controlsRoot.innerHTML = `
    <svg class="clipiq-logo" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="22" height="22" rx="6" fill="#7c3aed"/>
      <path d="M7 6v10l4.5-2.5 4.5 2.5V6" fill="white" opacity="0.9"/>
    </svg>

    <div class="clipiq-rec-dot" id="clipiq-rec-dot"></div>

    <div class="clipiq-timer" id="clipiq-timer">00:00:00</div>

    <div class="clipiq-sep"></div>

    <button class="clipiq-btn" id="clipiq-btn-pause" title="${isPaused ? 'Resume' : 'Pause'}">
      ${
        isPaused
          ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
               <path d="M3 2l9 5-9 5V2z" fill="currentColor"/>
             </svg>`
          : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
               <rect x="2" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
               <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
             </svg>`
      }
    </button>

    <button class="clipiq-btn" id="clipiq-btn-draw" title="Draw on screen">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M10.5 2.5a1.4 1.4 0 012 2L4.5 12.5l-3 1 1-3L10.5 2.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
      </svg>
    </button>

    <button class="clipiq-btn clipiq-btn-stop" id="clipiq-btn-stop" title="Stop recording">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <rect x="2" y="2" width="10" height="10" rx="2" fill="currentColor"/>
      </svg>
    </button>
  `;

  // Apply state classes
  if (isPaused) controlsRoot.classList.add('clipiq-paused');
  if (isUploading) controlsRoot.classList.add('clipiq-uploading');

  // Cache element refs
  timerEl = controlsRoot.querySelector('#clipiq-timer');
  recDotEl = controlsRoot.querySelector('#clipiq-rec-dot');

  // Button event listeners
  const pauseBtn = controlsRoot.querySelector('#clipiq-btn-pause');
  const stopBtn = controlsRoot.querySelector('#clipiq-btn-stop');

  pauseBtn?.addEventListener('click', () => {
    if (currentState === RecordingState.PAUSED) {
      chrome.runtime.sendMessage({ type: MSG.RESUME_RECORDING } as ExtensionMessage);
    } else {
      chrome.runtime.sendMessage({ type: MSG.PAUSE_RECORDING } as ExtensionMessage);
    }
  });

  const drawBtn = controlsRoot.querySelector('#clipiq-btn-draw');
  drawBtn?.addEventListener('click', () => {
    if (!drawingTools) drawingTools = new DrawingTools();
    drawingTools.toggle();
    drawBtn.classList.toggle('clipiq-active', drawingTools.isEnabled());
  });

  stopBtn?.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MSG.STOP_RECORDING } as ExtensionMessage);
  });

  // Make controls draggable
  makeDraggable(controlsRoot);

  document.body.appendChild(controlsRoot);
}

// ─── Update Controls ──────────────────────────────────────────────────────────

function updateControlsState(state: RecordingState): void {
  if (!controlsRoot) return;
  currentState = state;

  const isPaused = state === RecordingState.PAUSED;
  const isUploading = state === RecordingState.UPLOADING;

  controlsRoot.classList.toggle('clipiq-paused', isPaused);
  controlsRoot.classList.toggle('clipiq-uploading', isUploading);

  // Update pause button icon
  const pauseBtn = controlsRoot.querySelector('#clipiq-btn-pause');
  if (pauseBtn) {
    pauseBtn.setAttribute('title', isPaused ? 'Resume' : 'Pause');
    pauseBtn.innerHTML = isPaused
      ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 2l9 5-9 5V2z" fill="currentColor"/></svg>`
      : `<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
           <rect x="2" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
           <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="currentColor"/>
         </svg>`;
  }

  if (isUploading && timerEl) {
    timerEl.textContent = 'Uploading…';
    timerEl.style.fontSize = '12px';
    timerEl.style.letterSpacing = '0';
  }
}

function removeControls(): void {
  if (controlsRoot) {
    controlsRoot.classList.add('clipiq-hide');
    setTimeout(() => {
      controlsRoot?.remove();
      controlsRoot = null;
      timerEl = null;
      recDotEl = null;
      elapsedMs = 0;
    }, 250);
    removeCameraBubble();
    if (drawingTools) {
      if (drawingTools.isEnabled()) drawingTools.toggle();
      drawingTools = null;
    }
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
    // Don't drag when clicking buttons
    if ((e.target as HTMLElement).closest('button')) return;
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
    el.style.transform = 'none';
    el.style.bottom = 'unset';
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    el.style.transition = '';
  });
}

// ─── Message Listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((rawMessage: unknown) => {
  const msg = rawMessage as ExtensionMessage;
  if (!msg?.type) return;

  switch (msg.type) {
    case MSG.SHOW_CONTROLS: {
      currentState = msg.payload.state;
      if (!controlsRoot) {
        createControls(msg.payload.state);
      } else {
        updateControlsState(msg.payload.state);
      }
      // Always ensure the camera bubble is visible if mode requires it.
      // This handles switching back to an already-open tab mid-recording.
      if (msg.payload.mode) {
        showCameraBubble(msg.payload.mode, msg.payload.audioDeviceId);
      }
      break;
    }

    case MSG.HIDE_CONTROLS: {
      removeControls();
      break;
    }

    case MSG.UPDATE_TIMER: {
      elapsedMs = msg.payload.elapsedMs;
      if (timerEl) {
        timerEl.textContent = formatDuration(elapsedMs);
      }
      break;
    }

    case MSG.RECORDING_COMPLETE_NOTIFY: {
      removeControls();
      break;
    }

    default:
      break;
  }
});

// ─── Cleanup on page unload ───────────────────────────────────────────────────

window.addEventListener('beforeunload', () => {
  if (
    currentState === RecordingState.RECORDING ||
    currentState === RecordingState.PAUSED
  ) {
    // Warn user: recording will continue in background if they navigate away
    // The offscreen document and background SW will keep running
    chrome.runtime.sendMessage({ type: MSG.GET_STATE }).catch(() => {});
  }
});
