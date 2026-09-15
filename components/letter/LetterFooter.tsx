import type { ReactNode } from 'react';
import './letter-footer.css';

type FooterAction = {
  label: string;
  accessibleLabel?: string;
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
  onClick?: () => void;
};

export function LetterFooter({
  left,
  right,
  page,
  error,
  hint,
}: {
  left: FooterAction;
  right?: FooterAction;
  page: {
    index: number;
    count: number;
    disabled: boolean;
    onChange: (index: number) => void;
  };
  error?: string | null;
  hint?: string;
}) {
  const action = (item: FooterAction) => (
    <button
      type={item.type ?? 'button'}
      disabled={item.disabled}
      aria-label={item.accessibleLabel}
      onClick={item.onClick}
    >
      {item.icon}
      {item.label}
    </button>
  );
  return (
    <footer
      className="stationery-footer letter-menu"
      aria-label="Letter actions"
    >
      {error && (
        <p className="letter-menu-error" role="alert">
          {error}
        </p>
      )}
      {page.count > 1 && (
        <nav className="letter-menu-pages" aria-label="Letter pages">
          <button
            type="button"
            aria-label="Previous letter page"
            disabled={page.disabled || page.index === 0}
            onClick={() => page.onChange(page.index - 1)}
          >
            ←
          </button>
          <span>
            Page {page.index + 1} of {page.count}
          </span>
          <button
            type="button"
            aria-label="Next letter page"
            disabled={page.disabled || page.index >= page.count - 1}
            onClick={() => page.onChange(page.index + 1)}
          >
            →
          </button>
        </nav>
      )}
      <div className="letter-menu-actions">
        {action(left)}
        {right && action(right)}
      </div>
      {hint && <p className="letter-menu-hint">{hint}</p>}
    </footer>
  );
}
