import { useEffect, useState } from 'react';

export function useTypingSubtitle(text: string, speed = 100, delay = 1200) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [delay]);

  useEffect(() => {
    if (!started || displayed.length >= text.length) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);

    return () => window.clearTimeout(timeoutId);
  }, [displayed, speed, started, text]);

  return { displayed, done: displayed.length >= text.length };
}
