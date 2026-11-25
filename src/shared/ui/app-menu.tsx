import { DDropdown } from '@digvation/ui';
import { Check } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import './app-menu.css';

const ITEMS = '[role^="menuitem"]:not(:disabled)';

/**
 * DDropdown with the keyboard behaviour of a menu: focus moves to the first
 * item on open, arrow keys move between items, Esc closes and returns focus
 * to the trigger.
 */
export function AppMenu({
  label,
  trigger,
  placement = 'bottom-end',
  className,
  children,
}: {
  label: string;
  trigger: (props: { open: boolean; ref: (node: HTMLButtonElement | null) => void }) => ReactNode;
  placement?: 'bottom-end' | 'top-start' | 'bottom-start' | 'top-end';
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(ITEMS)?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const items = [...(listRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])];
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'Home' ? 0
      : event.key === 'End' ? items.length - 1
      : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  }

  return (
    <DDropdown
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      closeOnItemClick
      scrollBehavior="close"
      contentPadding={false}
      contentRole="menu"
      className={className}
      trigger={({ open: isOpen }) => trigger({ open: isOpen, ref: (node) => (triggerRef.current = node) })}
    >
      <div ref={listRef} className="app-menu" role="group" aria-label={label} onKeyDown={onKeyDown}>
        {children}
      </div>
    </DDropdown>
  );
}

export function AppMenuItem({
  children,
  icon,
  onSelect,
  danger = false,
  disabled = false,
  hint,
  checked,
}: {
  children: ReactNode;
  icon?: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Why the item is unavailable, shown under its label. */
  hint?: string;
  /** Set for one choice of a group: rendered as a radio item with a check mark. */
  checked?: boolean;
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      tabIndex={-1}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      className={`app-menu-item${danger ? ' app-menu-item-danger' : ''}`}
      onClick={onSelect}
    >
      {icon}
      <span className="app-menu-item-text">
        <span>{children}</span>
        {hint ? <span className="app-menu-item-hint">{hint}</span> : null}
      </span>
      {checked !== undefined ? <Check className="app-menu-check" size={16} aria-hidden="true" /> : null}
    </button>
  );
}

export const AppMenuSeparator = () => <div className="app-menu-separator" role="separator" />;

export const AppMenuLabel = ({ children }: { children: ReactNode }) => (
  <div className="app-menu-label" role="presentation">
    {children}
  </div>
);
