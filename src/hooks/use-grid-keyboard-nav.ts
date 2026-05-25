'use client';

import * as React from 'react';

interface GridNavOptions {
  /** Total cell count. Active index is clamped to [0, count). */
  count: number;
  /** Approximate columns per row (used by ArrowUp/Down). */
  cols: number;
  /** CSS selector that identifies a grid cell (must have data-grid-item={index}). */
  cellSelector: string;
  /** Fires when the user presses Enter on the active cell. */
  onEnter?: (index: number) => void;
  /** Whether nav is enabled. Disable while modals/sheets are open. */
  enabled?: boolean;
}

/**
 * Roving-tabindex grid nav. The host renders N cells; each carries
 *   data-grid-item={i}  tabIndex={activeIndex === i ? 0 : -1}
 * and the hook handles Arrow/j/k/Home/End/Enter from anywhere in the
 * grid container.
 *
 * "j" / "k" are deliberately included for keyboard-power-users.
 */
export function useGridKeyboardNav({
  count,
  cols,
  cellSelector,
  onEnter,
  enabled = true,
}: GridNavOptions) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Clamp active index whenever count shrinks.
  React.useEffect(() => {
    if (count === 0) return;
    if (activeIndex >= count) setActiveIndex(count - 1);
  }, [count, activeIndex]);

  const focusCell = React.useCallback(
    (i: number) => {
      const root = containerRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(`${cellSelector}[data-grid-item="${i}"]`);
      if (el) el.focus();
    },
    [cellSelector],
  );

  React.useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      // Don't hijack typing in inputs/textareas/contenteditable.
      const tgt = e.target as HTMLElement | null;
      if (tgt) {
        const tag = tgt.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (tgt.isContentEditable) return;
      }
      const root = containerRef.current;
      // Only handle when focus is inside our container OR on body (nothing else).
      const inside =
        root &&
        (root.contains(document.activeElement) || document.activeElement === document.body);
      if (!inside) return;

      let next: number | null = null;
      switch (e.key) {
        case 'ArrowRight':
        case 'l':
          next = Math.min(count - 1, activeIndex + 1);
          break;
        case 'ArrowLeft':
        case 'h':
          next = Math.max(0, activeIndex - 1);
          break;
        case 'ArrowDown':
        case 'j':
          next = Math.min(count - 1, activeIndex + cols);
          break;
        case 'ArrowUp':
        case 'k':
          next = Math.max(0, activeIndex - cols);
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = count - 1;
          break;
        case 'Enter':
          if (onEnter) {
            e.preventDefault();
            onEnter(activeIndex);
          }
          return;
        default:
          return;
      }
      if (next === null || next === activeIndex) return;
      e.preventDefault();
      setActiveIndex(next);
      // Defer focus so React has applied tabIndex updates first.
      requestAnimationFrame(() => focusCell(next!));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, count, cols, activeIndex, focusCell, onEnter]);

  return {
    activeIndex,
    setActiveIndex,
    containerRef,
    /** Spread on each cell. */
    getCellProps: (i: number) => ({
      'data-grid-item': i,
      tabIndex: activeIndex === i ? 0 : -1,
    }),
  };
}
