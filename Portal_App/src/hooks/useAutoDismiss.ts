import { useEffect, useRef } from 'react';

/**
 * Auto-clears a message after `delay` ms whenever the message changes to a non-empty string.
 * @param setter  The state setter for the message (e.g. setSuccessMessage)
 * @param message The current message value
 * @param delay   Milliseconds before clearing (default 3000)
 */
export function useAutoDismiss(
  setter: (value: string) => void,
  message: string,
  delay = 3000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (message) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setter(''), delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message]);
}
