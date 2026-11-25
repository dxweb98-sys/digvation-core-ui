import type { ReactNode } from 'react';
import './state-block.css';

/** A list's empty, no-match or load-failed state: icon, title, body, one action (docs/design/02-users.html). */
export function StateBlock({
  icon,
  title,
  body,
  action,
  danger = false,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action: ReactNode;
  danger?: boolean;
}) {
  return (
    <div className={`app-state${danger ? ' app-state-danger' : ''}`} role={danger ? 'alert' : undefined}>
      <span className="app-state-icon">{icon}</span>
      <b>{title}</b>
      <p>{body}</p>
      {action}
    </div>
  );
}
