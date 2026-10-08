import { useEffect } from 'react';
import { createPortal } from 'react-dom';

const KEYS: Array<[string, string]> = [
  ['⌘ K  or  /', 'Search everything'],
  ['T', 'Toggle light / dark theme'],
  ['M', 'Mark current page read / unread'],
  ['B', 'Bookmark current page'],
  ['J / K', 'Next / previous page'],
  ['Space', 'Flashcards: show answer'],
  ['1 – 4', 'Flashcards: Again / Hard / Good / Easy'],
  ['G then H', 'Go home'],
  ['?', 'Show this help'],
  ['Esc', 'Close dialogs'],
];

export function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="kbd-title">
        <h2 id="kbd-title">Keyboard shortcuts</h2>
        <table className="kbd-table">
          <tbody>
            {KEYS.map(([k, v]) => (
              <tr key={k}>
                <td>
                  <kbd>{k}</kbd>
                </td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
