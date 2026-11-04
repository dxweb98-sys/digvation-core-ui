import { DDialog } from '@digvation/ui';
import type { ComponentProps, ReactNode } from 'react';
import './app-dialog.css';

const WIDTHS = {
  confirm: 'md',
  form: 'lg',
  wide: 'xl',
  detail: 'xl',
} as const;

export type AppDialogKind = keyof typeof WIDTHS;

type DDialogProps = ComponentProps<typeof DDialog>;

/**
 * The one dialog layout in core-ui. Header: title, status, identifier and meta.
 * Width comes from the kind of content. The body scrolls between a fixed header
 * and footer, which DDialog provides.
 */
export function AppDialog({
  kind,
  title,
  status,
  identifier,
  meta,
  description,
  footer,
  children,
  ...dialogProps
}: Omit<DDialogProps, 'size' | 'title' | 'description' | 'children'> & {
  kind: AppDialogKind;
  title: string;
  status?: ReactNode;
  identifier?: ReactNode;
  meta?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  const hasSubheading = identifier || meta || description;

  return (
    <DDialog
      {...dialogProps}
      ariaLabel={title}
      size={WIDTHS[kind]}
      title={
        <span className="app-dialog-title">
          <span>{title}</span>
          {status}
        </span>
      }
      description={
        hasSubheading ? (
          <span className="app-dialog-subheading">
            {identifier ? <code className="app-dialog-identifier">{identifier}</code> : null}
            {meta ? <span>{meta}</span> : null}
            {description ? <span className="app-dialog-description">{description}</span> : null}
          </span>
        ) : undefined
      }
      footer={footer ? <div className="app-dialog-footer">{footer}</div> : undefined}
    >
      {children ?? null}
    </DDialog>
  );
}

/** Destructive or lifecycle actions sit apart on the left; primary is rightmost. */
export function DialogActions({
  destructive,
  secondary,
  primary,
}: {
  destructive?: ReactNode;
  secondary?: ReactNode;
  primary?: ReactNode;
}) {
  return (
    <div className="app-dialog-actions">
      {destructive ? <div className="app-dialog-actions-destructive">{destructive}</div> : null}
      {secondary}
      {primary}
    </div>
  );
}

export function DialogSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="app-dialog-section">
      <div className="app-dialog-section-heading">
        <h4>{title}</h4>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DetailList({ children }: { children: ReactNode }) {
  return <dl className="app-detail-list">{children}</dl>;
}

export const EMPTY_VALUE = '—';

/** Empty values read as one consistent mark; long values wrap inside the column. */
export function DetailItem({
  label,
  children,
  wide = false,
}: {
  label: string;
  children?: ReactNode;
  wide?: boolean;
}) {
  const isEmpty = children === null || children === undefined || children === '';

  return (
    <div className={wide ? 'app-detail-item app-detail-item-wide' : 'app-detail-item'}>
      <dt>{label}</dt>
      <dd>{isEmpty ? EMPTY_VALUE : children}</dd>
    </div>
  );
}
