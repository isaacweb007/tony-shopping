/**
 * Tiny haptic helper. The Vibration API is widely supported on Android
 * Chrome / Samsung Internet; iOS Safari ignores it (no-ops silently). PWA
 * users on Android get a small physical confirmation for the key gestures.
 *
 * Patterns are intentionally short. The OS clamps long vibrations anyway.
 */
type HapticIntent = 'tap' | 'success' | 'warn';

const PATTERNS: Record<HapticIntent, number | number[]> = {
  tap: 12,             // shortlist toggle, share copy
  success: [10, 30, 18], // checkout proceed, watch acknowledge
  warn: [20, 40, 20],  // delete / dismiss
};

export function haptic(intent: HapticIntent = 'tap'): void {
  if (typeof navigator === 'undefined') return;
  // 'vibrate' is widely typed by lib.dom; guard via in-operator anyway.
  if (!('vibrate' in navigator)) return;
  try {
    navigator.vibrate(PATTERNS[intent]);
  } catch {
    /* silent — no UI affordance depends on this firing */
  }
}
