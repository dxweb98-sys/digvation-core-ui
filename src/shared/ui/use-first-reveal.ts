import { useEffect, useState } from 'react';

// Long enough for the last staggered row (delay plus duration) to finish.
const REVEAL_WINDOW_MS = 800;

/** True only during the first reveal, so later table updates never animate. */
export function useFirstReveal(isContentReady: boolean) {
  const [isRevealing, setIsRevealing] = useState(true);

  useEffect(() => {
    if (!isContentReady) return undefined;
    const timer = window.setTimeout(() => setIsRevealing(false), REVEAL_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [isContentReady]);

  return isRevealing;
}
