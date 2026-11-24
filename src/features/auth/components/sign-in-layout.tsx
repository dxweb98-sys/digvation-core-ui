import type { ReactNode } from 'react';
import { setDisplayLocale, useDisplayLocale } from '../../../shared/format/locale';
import { setAppearance, useAppearance, type Appearance } from '../../../shared/theme/appearance';
import { DigvationMark } from '../../../shared/ui/digvation-mark';
import { useSignInCopy, type AlertKey } from '../sign-in-copy';
import '../sign-in.css';

const ICONS: Record<Appearance, ReactNode> = {
  dark: <path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z" />,
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  system: <path d="M3 4h18v12H3zM8 20h8M12 16v4" />,
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="signin-icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export const BackIcon = () => (
  <Icon>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
);

function Toolbar() {
  const copy = useSignInCopy();
  const locale = useDisplayLocale();
  const appearance = useAppearance();
  const labels: Record<Appearance, string> = {
    dark: copy.appearanceDark,
    light: copy.appearanceLight,
    system: copy.appearanceSystem,
  };
  return (
    <div className="signin-tools">
      <div className="signin-toggle" role="group" aria-label={copy.languageGroup}>
        {(['id-ID', 'en-US'] as const).map((value) => (
          <button key={value} type="button" aria-pressed={locale === value} onClick={() => setDisplayLocale(value)}>
            {value === 'id-ID' ? 'ID' : 'EN'}
          </button>
        ))}
      </div>
      <div className="signin-toggle" role="group" aria-label={copy.appearanceGroup}>
        {(['dark', 'light', 'system'] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={appearance === value}
            aria-label={labels[value]}
            title={labels[value]}
            onClick={() => setAppearance(value)}
          >
            <Icon>{ICONS[value]}</Icon>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Danger alerts interrupt (role=alert); info and success are polite (role=status). */
export function SignInAlert({ alert }: { alert: { key: AlertKey; tone: 'bad' | 'good' | 'info' } | null }) {
  const copy = useSignInCopy();
  if (!alert) return null;
  const [title, body] = copy.alerts[alert.key];
  return (
    <div className={`signin-alert signin-alert-${alert.tone}`} role={alert.tone === 'bad' ? 'alert' : 'status'}>
      <Icon>{alert.tone === 'good' ? <path d="m5 12 5 5 9-10" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>}</Icon>
      <div>
        <b>{title}</b>
        <span>{body}</span>
      </div>
    </div>
  );
}

export function SignInLayout({
  title,
  lead,
  back,
  children,
}: {
  title: string;
  lead: ReactNode;
  /** The back link between the logo and the title. */
  back?: ReactNode;
  children: ReactNode;
}) {
  const copy = useSignInCopy();
  return (
    <div className="signin">
      <header className="signin-top">
        <span />
        <Toolbar />
      </header>
      <main className="signin-main">
        <div className="signin-column">
          <DigvationMark className="signin-mark" />
          {back}
          <div>
            <h1 className="signin-title">{title}</h1>
            <p className="signin-lead">{lead}</p>
          </div>
          {children}
        </div>
      </main>
      <footer className="signin-bottom">
        <span>© {new Date().getFullYear()} Digvation</span>
        <span>{copy.footerApp}</span>
      </footer>
    </div>
  );
}
