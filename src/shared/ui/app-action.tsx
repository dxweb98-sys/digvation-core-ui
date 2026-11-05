import { DButton, DTooltip, type ButtonProps } from '@digvation/ui';
import type { LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';
import './app-action.css';

/**
 * primary: the one main action of a view region.
 * secondary: visible, quieter actions. tertiary: low-emphasis text actions.
 * danger: confirms something destructive. danger-subtle: opens that confirmation.
 */
export type ActionTone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'danger'
  | 'danger-subtle';

export type ActionSize = 'sm' | 'md';

const DS_VARIANT: Record<ActionTone, ButtonProps['variant']> = {
  primary: 'primary',
  secondary: 'outline',
  tertiary: 'ghost',
  danger: 'danger',
  'danger-subtle': 'outline',
};

const ICON_SIZE = 16;

type BaseProps = Omit<ButtonProps, 'variant' | 'size' | 'leftIcon' | 'rightIcon'>;

/** Text, or icon and text. Labels never wrap. */
export const AppAction = forwardRef<
  HTMLButtonElement,
  BaseProps & {
    tone?: ActionTone;
    size?: ActionSize;
    icon?: LucideIcon;
    trailingIcon?: LucideIcon;
  }
>(function AppAction(
  {
    tone = 'primary',
    size = 'md',
    icon: Icon,
    trailingIcon: TrailingIcon,
    className,
    ...props
  },
  ref,
) {
  return (
    <DButton
      {...props}
      className={['app-action', `app-action-${tone}`, className].filter(Boolean).join(' ')}
      leftIcon={Icon ? <Icon aria-hidden="true" size={ICON_SIZE} /> : undefined}
      ref={ref}
      rightIcon={
        TrailingIcon ? <TrailingIcon aria-hidden="true" size={ICON_SIZE} /> : undefined
      }
      size={size}
      variant={DS_VARIANT[tone]}
    />
  );
});

/** Compact row action. The label is its accessible name and its tooltip. */
export const AppIconAction = forwardRef<
  HTMLButtonElement,
  Omit<BaseProps, 'children' | 'aria-label'> & {
    icon: LucideIcon;
    label: string;
    tone?: 'secondary' | 'tertiary' | 'danger-subtle';
  }
>(function AppIconAction(
  { icon: Icon, label, tone = 'tertiary', className, ...props },
  ref,
) {
  return (
    <DTooltip content={label}>
      <DButton
        {...props}
        aria-label={label}
        className={['app-action', 'app-icon-action', `app-action-${tone}`, className]
          .filter(Boolean)
          .join(' ')}
        leftIcon={<Icon aria-hidden="true" size={ICON_SIZE} />}
        ref={ref}
        size="sm"
        variant={DS_VARIANT[tone]}
      />
    </DTooltip>
  );
});

/** Holds a section's actions, aligned the same way everywhere. */
export function ActionGroup({ children }: { children: React.ReactNode }) {
  return <div className="app-action-group">{children}</div>;
}
