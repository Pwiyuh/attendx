import React from 'react';
import styles from './Extras.module.scss';
import classNames from 'classnames';

// ── Badge ─────────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children }) => (
  <span className={classNames(styles.badge, styles[variant])}>{children}</span>
);

// ── Progress Bar ─────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;       // 0-100
  label?: string;
  showValue?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, showValue = true }) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const colorClass = clampedValue >= 75 ? 'green' : clampedValue >= 60 ? 'yellow' : 'red';

  return (
    <div className={styles.progressWrapper}>
      {(label || showValue) && (
        <div className={styles.progressLabel}>
          {label && <span className={styles.progressTitle}>{label}</span>}
          {showValue && <span className={styles.progressValue}>{clampedValue.toFixed(1)}%</span>}
        </div>
      )}
      <div className={styles.progressTrack}>
        <div
          className={classNames(styles.progressFill, styles[colorClass])}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
};

// ── Toggle ───────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, disabled }) => (
  <div
    className={styles.toggle}
    onClick={() => !disabled && onChange(!checked)}
    role="switch"
    aria-checked={checked}
  >
    <div className={classNames(styles.toggleTrack, checked ? styles.active : styles.inactive)}>
      <div className={styles.toggleThumb} />
    </div>
  </div>
);
