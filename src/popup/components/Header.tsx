import type { ExtensionUser } from '../../shared/types/user';

interface HeaderProps {
  user: ExtensionUser;
  onLogout: () => void;
  onOpenDashboard: () => void;
}

export function Header({ user, onLogout, onOpenDashboard }: HeaderProps) {
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="header">
      {/* Logo + Brand */}
      <button className="header__brand" onClick={onOpenDashboard} title="Open ClipIQ Dashboard">
        <div className="header__logo">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="#7c3aed" />
            <path
              d="M6 5v10l4-2.5 4 2.5V5"
              fill="white"
              opacity="0.9"
            />
          </svg>
        </div>
        <span className="header__brand-name">ClipIQ</span>
      </button>

      {/* User + Actions */}
      <div className="header__actions">
        {user.plan === 'PRO' && (
          <span className="badge badge-purple" style={{ fontSize: '10px' }}>PRO</span>
        )}
        <div className="header__user-menu" title={user.email}>
          {user.image ? (
            <img
              src={user.image}
              alt={displayName}
              className="header__avatar"
            />
          ) : (
            <div className="header__avatar header__avatar--initials">
              {initials}
            </div>
          )}
        </div>
        <button
          className="btn-icon"
          onClick={onLogout}
          title="Sign out"
          id="btn-logout"
          style={{ width: '28px', height: '28px', borderRadius: '6px' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <style>{`
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px 12px;
          border-bottom: 1px solid var(--border);
        }
        .header__brand {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          color: inherit;
        }
        .header__brand:hover .header__brand-name {
          color: var(--purple-light);
        }
        .header__logo {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .header__brand-name {
          font-size: 15px;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.3px;
          transition: color var(--transition-fast);
        }
        .header__actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header__user-menu { position: relative; }
        .header__avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid var(--border);
        }
        .header__avatar--initials {
          background: var(--purple-dim);
          color: var(--purple-light);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </header>
  );
}
