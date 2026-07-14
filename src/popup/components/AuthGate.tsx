import type { ExtensionUser } from '../../shared/types/user';

interface AuthGateProps {
  onSignIn: () => void;
}

export function AuthGate({ onSignIn }: AuthGateProps) {
  return (
    <div className="auth-gate animate-fade-in">
      <div className="auth-gate__icon">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="14" fill="rgba(124,58,237,0.15)" />
          <path
            d="M24 12C17.373 12 12 17.373 12 24s5.373 12 12 12 12-5.373 12-12S30.627 12 24 12z"
            fill="none"
            stroke="#8b5cf6"
            strokeWidth="2"
          />
          <path
            d="M20 24l3 3 6-6"
            stroke="#8b5cf6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="auth-gate__copy">
        <h2 className="auth-gate__title">Sign in to ClipIQ</h2>
        <p className="auth-gate__subtitle">
          Record, share, and analyze videos with AI-powered transcription and insights.
        </p>
      </div>

      <button className="btn btn-primary btn-lg w-full" onClick={onSignIn} id="btn-sign-in">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 2v12M2 8h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Sign in to ClipIQ
      </button>

      <p className="auth-gate__terms text-muted text-xs">
        By signing in, you agree to ClipIQ's Terms of Service and Privacy Policy.
      </p>

      <style>{`
        .auth-gate {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          padding: 32px 24px;
          text-align: center;
        }
        .auth-gate__icon {
          width: 72px;
          height: 72px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .auth-gate__copy { display: flex; flex-direction: column; gap: 8px; }
        .auth-gate__title { font-size: 18px; font-weight: 700; color: var(--text-primary); }
        .auth-gate__subtitle { font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
        .auth-gate__terms { opacity: 0.5; line-height: 1.5; }
      `}</style>
    </div>
  );
}
