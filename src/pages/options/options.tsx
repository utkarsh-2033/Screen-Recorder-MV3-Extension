import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../shared/utils/storage';
import { VideoQuality } from '../../shared/types/recording';

export function Options() {
  const [quality, setQuality] = useState<VideoQuality>(VideoQuality.HD_1080P);
  const [includeMic, setIncludeMic] = useState(true);
  const [commands, setCommands] = useState<chrome.commands.Command[]>([]);

  useEffect(() => {
    getSettings().then((settings) => {
      setQuality(settings.quality as VideoQuality);
      setIncludeMic(settings.includeMic);
    });

    if (chrome.commands) {
      chrome.commands.getAll().then((cmds) => setCommands(cmds));
    }

    // Auto-prompt if routed here from popup
    const params = new URLSearchParams(window.location.search);
    if (params.get('requestPermissions') === 'true') {
      requestPermissions();
    }
  }, []);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      stream.getTracks().forEach(t => t.stop());
      alert('Permissions granted successfully! You can now close this tab and record.');
    } catch (err: any) {
      alert('Permission request failed: ' + err.message);
    }
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as VideoQuality;
    setQuality(val);
    saveSettings({ quality: val });
  };

  const handleMicToggle = () => {
    const next = !includeMic;
    setIncludeMic(next);
    saveSettings({ includeMic: next });
  };

  return (
    <div className="options-page">
      <header className="options-header">
        <div className="brand">
          <svg width="28" height="28" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="6" fill="#7c3aed" />
            <path d="M7 6v10l4.5-2.5 4.5 2.5V6" fill="white" opacity="0.9" />
          </svg>
          <h1>ClipIQ Settings</h1>
        </div>
      </header>

      <main className="options-content">
        <section className="settings-section">
          <h2>Default Recording Preferences</h2>
          
          <div className="setting-row">
            <div className="setting-info">
              <label>Video Quality</label>
              <p>Default quality for new recordings</p>
            </div>
            <select className="select-input" value={quality} onChange={handleQualityChange}>
              <option value={VideoQuality.QHD_1440P}>1440p QHD</option>
              <option value={VideoQuality.HD_1080P}>1080p HD</option>
              <option value={VideoQuality.SD_720P}>720p SD</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Record Microphone</label>
              <p>Include microphone audio by default</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={includeMic} onChange={handleMicToggle} />
              <span className="slider"></span>
            </label>
          </div>
        </section>

        <section className="settings-section">
          <h2>Permissions</h2>
          <p className="section-desc">
            If you are having trouble granting camera or microphone permissions from the extension popup, you can grant them here.
          </p>
          <button 
            className="link-btn"
            style={{ padding: '8px 16px', background: 'var(--purple)', color: 'white', borderRadius: '4px', textDecoration: 'none' }}
            onClick={requestPermissions}
          >
            Grant Camera & Microphone Access
          </button>
        </section>

        <section className="settings-section">
          <h2>Keyboard Shortcuts</h2>
          <p className="section-desc">
            To change these shortcuts, click the button below to open Chrome's extension shortcuts page.
          </p>

          <div className="shortcuts-list">
            {commands.map((cmd) => (
              <div className="shortcut-row" key={cmd.name}>
                <span className="shortcut-desc">{cmd.description}</span>
                <span className="shortcut-key">{cmd.shortcut || 'Not set'}</span>
              </div>
            ))}
          </div>

          <button 
            className="link-btn"
            onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
          >
            Manage Shortcuts in Chrome
          </button>
        </section>
      </main>

      <style>{`
        .options-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
        }

        .options-header {
          margin-bottom: 40px;
          border-bottom: 1px solid var(--border);
          padding-bottom: 20px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brand h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }

        .settings-section {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          margin-bottom: 24px;
        }

        .settings-section h2 {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 600;
        }

        .section-desc {
          color: var(--text-muted);
          font-size: 14px;
          margin: 0 0 20px;
        }

        .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
        }

        .setting-row:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .setting-info label {
          font-weight: 500;
          font-size: 14px;
          display: block;
          margin-bottom: 4px;
        }

        .setting-info p {
          color: var(--text-muted);
          font-size: 13px;
          margin: 0;
        }

        .select-input {
          background: var(--bg-hover);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }

        .select-input:focus {
          border-color: var(--purple);
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: var(--border);
          transition: .3s;
          border-radius: 20px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 2px;
          bottom: 2px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--purple); }
        input:checked + .slider:before { transform: translateX(16px); }

        .shortcuts-list {
          margin-bottom: 20px;
        }

        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: var(--bg-hover);
          border-radius: var(--radius-md);
          margin-bottom: 8px;
        }

        .shortcut-key {
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          font-family: var(--font-mono);
          font-size: 12px;
          letter-spacing: 0.5px;
        }

        .link-btn {
          background: none;
          border: none;
          color: var(--purple-light);
          font-family: inherit;
          font-size: 14px;
          cursor: pointer;
          padding: 0;
        }
        .link-btn:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
