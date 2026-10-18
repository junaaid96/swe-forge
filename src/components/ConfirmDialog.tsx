import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../lib/focus';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger, onConfirm, onCancel }: Props) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  useDialogFocus(open, onCancel, dialogRef);
  useEffect(() => {
    if (!open) return;
    // Destructive actions focus Cancel so an accidental Enter can't confirm.
    const t = window.setTimeout(() => (danger ? cancelRef.current : confirmRef.current)?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open, danger]);
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descId} ref={dialogRef}>
        <h2 id={titleId}>{title}</h2>
        <p id={descId} className="muted">
          {message}
        </p>
        <div className="modal-actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button ref={confirmRef} type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
