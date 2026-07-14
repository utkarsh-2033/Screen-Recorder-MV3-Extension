import { useState, useEffect, useCallback } from 'react';
import { MSG } from '../shared/types/messages';
import {
  RecordingMode,
  RecordingState,
  VideoQuality,
  type RecentRecording,
} from '../shared/types/recording';
import { useAuth } from './hooks/useAuth';
import { useRecordingState } from './hooks/useRecordingState';
import { Header } from './components/Header';
import { AuthGate } from './components/AuthGate';
import { RecordingModes } from './components/RecordingModes';
import { Settings } from './components/Settings';
import { QuickRecord } from './components/QuickRecord';
import { RecordingStatus } from './components/RecordingStatus';
import { RecentRecordings } from './components/RecentRecordings';

type View = 'idle' | 'recording' | 'settings';

export function App() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const { authenticated, user, isLoading: authLoading, openAuthPage, logout } = useAuth();

  // ── Recording State ───────────────────────────────────────────────────────
  const {
    snapshot,
    isLoading: stateLoading,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useRecordingState();

  // ── Local UI State ────────────────────────────────────────────────────────
  const [selectedMode, setSelectedMode] = useState<RecordingMode>(RecordingMode.TAB);
  const [quality, setQuality] = useState<VideoQuality>(VideoQuality.HD_1080P);
  const [includeMic, setIncludeMic] = useState(true);
  const [audioDeviceId, setAudioDeviceId] = useState<string | undefined>();
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [recentRecordings, setRecentRecordings] = useState<RecentRecording[]>([]);
  const [startError, setStartError] = useState<string | null>(null);

  // ── Load Settings & Audio Devices ─────────────────────────────────────────
  useEffect(() => {
    if (!authenticated) return;

    // Load recent recordings
    chrome.runtime
      .sendMessage({ type: MSG.GET_RECENT_RECORDINGS })
      .then((result) => {
        if (Array.isArray(result)) {
          setRecentRecordings(result as RecentRecording[]);
        }
      })
      .catch(() => {});

    // Enumerate audio devices (requires getUserMedia first for labels)
    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        setAudioDevices(devices.filter((d) => d.kind === 'audioinput'));
      })
      .catch(() => {});
  }, [authenticated]);

  // ── Derived State ─────────────────────────────────────────────────────────
  const activeStates = [
    RecordingState.RECORDING,
    RecordingState.PAUSED,
    RecordingState.UPLOADING,
    RecordingState.UPLOADED,
    RecordingState.PREPARING,
  ];
  const isRecordingActive = activeStates.includes(snapshot.state);
  const canStartNew =
    !isRecordingActive || snapshot.state === RecordingState.UPLOADED;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    setStartError(null);
    const result = await startRecording(selectedMode, quality, audioDeviceId, includeMic);
    if (!result?.success && result?.error) {
      setStartError(result.error);
    }
  }, [startRecording, selectedMode, quality, audioDeviceId, includeMic]);

  const handleOpenDashboard = useCallback(() => {
    chrome.runtime.sendMessage({ type: MSG.OPEN_DASHBOARD }).catch(() => {});
  }, []);

  // ── Loading State ─────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="app-loading">
        <div className="spinner" />
        <style>{`
          .app-loading {
            width: 380px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .spinner {
            width: 28px;
            height: 28px;
            border: 3px solid var(--border);
            border-top-color: var(--purple);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
        `}</style>
      </div>
    );
  }

  // ── Unauthenticated ───────────────────────────────────────────────────────
  if (!authenticated || !user) {
    return (
      <div className="popup">
        <div className="popup__auth-header">
          <div className="popup__brand">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect width="22" height="22" rx="6" fill="#7c3aed" />
              <path d="M7 6v10l4.5-2.5 4.5 2.5V6" fill="white" opacity="0.9" />
            </svg>
            <span style={{ fontWeight: 800, fontSize: 15 }}>ClipIQ</span>
          </div>
        </div>
        <AuthGate onSignIn={openAuthPage} />
      </div>
    );
  }

  // ── Main App ──────────────────────────────────────────────────────────────
  return (
    <div className="popup">
      {/* Header */}
      <Header
        user={user}
        onLogout={logout}
        onOpenDashboard={handleOpenDashboard}
      />

      {/* Active Recording Status */}
      {isRecordingActive && (
        <RecordingStatus
          state={snapshot.state}
          elapsedMs={snapshot.elapsedMs}
          uploadProgress={snapshot.session?.uploadProgress ?? 0}
          onStop={stopRecording}
          onPause={pauseRecording}
          onResume={resumeRecording}
          onCancel={cancelRecording}
        />
      )}

      {/* Idle / Start Recording UI */}
      {canStartNew && (
        <>
          {/* Mode Selector */}
          <RecordingModes
            selectedMode={selectedMode}
            onSelect={setSelectedMode}
          />

          {/* Settings Toggle */}
          <div className="popup__settings-toggle">
            <button
              className="settings-toggle-btn"
              onClick={() => setShowSettings((v) => !v)}
              id="btn-toggle-settings"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                <path
                  d="M6.5 1v1.2M6.5 10.8V12M1 6.5h1.2M10.8 6.5H12M2.76 2.76l.85.85M9.39 9.39l.85.85M9.39 3.61l-.85.85M3.61 9.39l-.85.85"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              Settings
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                style={{
                  transform: showSettings ? 'rotate(180deg)' : 'none',
                  transition: 'transform 200ms ease',
                }}
              >
                <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <Settings
              quality={quality}
              includeMic={includeMic}
              audioDeviceId={audioDeviceId}
              onQualityChange={setQuality}
              onMicToggle={setIncludeMic}
              onAudioDeviceChange={setAudioDeviceId}
              audioDevices={audioDevices}
            />
          )}

          {/* Error */}
          {startError && (
            <div className="popup__error animate-fade-in">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="var(--red)" strokeWidth="1.3" />
                <path d="M7 4v3.5M7 9.5v.5" stroke="var(--red)" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              {startError}
            </div>
          )}

          {/* Record Button */}
          <QuickRecord
            mode={selectedMode}
            isDisabled={stateLoading || snapshot.state === RecordingState.PREPARING}
            onStartRecording={handleStartRecording}
          />
        </>
      )}

      {/* Recent Recordings */}
      {!isRecordingActive && (
        <>
          <div className="divider" style={{ margin: '0 16px' }} />
          <RecentRecordings
            recordings={recentRecordings}
            onOpenDashboard={handleOpenDashboard}
          />
        </>
      )}

      {/* Footer */}
      <footer className="popup__footer">
        <span className="text-muted text-xs">ClipIQ Recorder v{chrome.runtime.getManifest().version}</span>
        {user.plan === 'FREE' && (
          <button
            className="upgrade-btn"
            onClick={() => chrome.tabs.create({ url: 'https://clipiq.vercel.app/pricing' })}
          >
            ⚡ Upgrade to Pro
          </button>
        )}
      </footer>

      <style>{`
        .popup {
          width: 380px;
          background: var(--bg-base);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 300px;
        }

        .popup__auth-header {
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border);
        }

        .popup__brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
        }

        .popup__settings-toggle {
          padding: 4px 16px 0;
          display: flex;
        }

        .settings-toggle-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-family: var(--font-sans);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 4px 0;
          transition: color var(--transition-fast);
        }

        .settings-toggle-btn:hover { color: var(--text-secondary); }

        .popup__error {
          margin: 0 16px;
          padding: 10px 12px;
          background: var(--red-dim);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: var(--red);
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          line-height: 1.4;
        }

        .popup__footer {
          padding: 10px 16px;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
        }

        .upgrade-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border: none;
          border-radius: var(--radius-full);
          color: white;
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          cursor: pointer;
          transition: opacity var(--transition-fast);
        }

        .upgrade-btn:hover { opacity: 0.85; }
      `}</style>
    </div>
  );
}
