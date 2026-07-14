import type { RecentRecording } from '../../shared/types/recording';
import { RecordingMode } from '../../shared/types/recording';

interface RecentRecordingsProps {
  recordings: RecentRecording[];
  onOpenDashboard: () => void;
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDurationShort(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
}

const MODE_ICONS: Record<RecordingMode, string> = {
  [RecordingMode.TAB]: '🌐',
  [RecordingMode.SCREEN]: '🖥️',
  [RecordingMode.WINDOW]: '⬜',
  [RecordingMode.CAMERA]: '📷',
  [RecordingMode.MICROPHONE]: '🎙️',
  [RecordingMode.CAMERA_AND_SCREEN]: '📽️',
  [RecordingMode.CAMERA_AND_TAB]: '📽️',
};

export function RecentRecordings({ recordings, onOpenDashboard }: RecentRecordingsProps) {
  if (recordings.length === 0) {
    return (
      <div className="recent-empty">
        <span className="recent-empty__icon">🎬</span>
        <p className="recent-empty__text text-muted text-xs">
          No recordings yet. Hit record to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="recent">
      <div className="recent__header">
        <h3 className="recent__title">Recent</h3>
        <button className="recent__view-all" onClick={onOpenDashboard}>
          View all →
        </button>
      </div>

      <div className="recent__list">
        {recordings.slice(0, 3).map((rec) => (
          <div key={rec.id} className="recent-item">
            <div className="recent-item__icon">{MODE_ICONS[rec.mode] ?? '🎬'}</div>
            <div className="recent-item__info">
              <p className="recent-item__name">{rec.filename}</p>
              <p className="recent-item__meta text-muted text-xs">
                {formatDurationShort(rec.duration)} · {formatRelativeTime(rec.completedAt)}
              </p>
            </div>
            {rec.videoUrl && (
              <a
                href={rec.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="recent-item__open"
                title="Open video"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1h10v10H8m0-10L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </a>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .recent {
          padding: 0 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .recent__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .recent__title {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .recent__view-all {
          background: none;
          border: none;
          color: var(--purple-light);
          font-family: var(--font-sans);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          transition: opacity var(--transition-fast);
        }
        .recent__view-all:hover { opacity: 0.7; }
        .recent__list { display: flex; flex-direction: column; gap: 4px; }
        .recent-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--bg-subtle);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          transition: background var(--transition-fast);
        }
        .recent-item:hover { background: var(--bg-card); }
        .recent-item__icon {
          width: 32px;
          height: 32px;
          background: var(--bg-card);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          border: 1px solid var(--border);
        }
        .recent-item__info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .recent-item__name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .recent-item__meta { display: block; }
        .recent-item__open {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          transition: color var(--transition-fast);
          flex-shrink: 0;
        }
        .recent-item__open:hover { color: var(--purple-light); }

        .recent-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px;
          text-align: center;
        }
        .recent-empty__icon { font-size: 28px; opacity: 0.4; }
        .recent-empty__text { opacity: 0.7; }
      `}</style>
    </div>
  );
}
