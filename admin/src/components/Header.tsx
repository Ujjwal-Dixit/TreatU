import { LogoMark } from './icons';

const ENV_LABEL: string = import.meta.env.VITE_ENV_LABEL ?? 'Demo data';

export function Header({ onSignOut }: { onSignOut?: () => void }) {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="brand">
          <LogoMark className="brand-mark" />
          <span className="brand-name">TreatU</span>
          <span className="brand-divider" />
          <span className="brand-sub">Admin dashboard</span>
        </div>
        <div className="header-actions">
          {ENV_LABEL && (
            <span className="env-pill">
              <span className="env-dot" />
              {ENV_LABEL}
            </span>
          )}
          {onSignOut && (
            <button className="link-button" onClick={onSignOut}>
              Log out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
