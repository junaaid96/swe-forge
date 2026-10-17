/** Favorites + recent tools, stored in localStorage. */
import { useCallback, useEffect, useState } from 'react';

const FAV_KEY = 'forgeline:tools:fav:v1';
const RECENT_KEY = 'forgeline:tools:recent:v1';
const MAX_RECENT = 6;

function read(key: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(key: string, v: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage blocked */
  }
}

export function useToolPrefs() {
  const [favs, setFavs] = useState<string[]>(() => read(FAV_KEY));
  const [recent, setRecent] = useState<string[]>(() => read(RECENT_KEY));

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === FAV_KEY) setFavs(read(FAV_KEY));
      if (e.key === RECENT_KEY) setRecent(read(RECENT_KEY));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggleFav = useCallback((slug: string) => {
    setFavs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      write(FAV_KEY, next);
      return next;
    });
  }, []);

  const touchRecent = useCallback((slug: string) => {
    setRecent((prev) => {
      const next = [slug, ...prev.filter((s) => s !== slug)].slice(0, MAX_RECENT);
      write(RECENT_KEY, next);
      return next;
    });
  }, []);

  return { favs, recent, toggleFav, touchRecent };
}
