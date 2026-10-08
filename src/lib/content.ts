import { useEffect, useState } from 'react';
import type { Card, Catalog, Page, SearchEntry, Topic, TopicExtras } from './types';

const cache = new Map<string, Promise<unknown>>();
const resolved = new Map<string, unknown>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const type = res.headers.get('content-type') ?? '';
  if (!res.ok || !type.includes('json')) throw new Error(`Not found: ${url}`);
  return (await res.json()) as T;
}

function load<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = getJson<T>(url).then((data) => {
      resolved.set(url, data);
      return data;
    });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p;
}

export const urls = {
  catalog: '/data/catalog.json',
  page: (slug: string, kind: string, id: string) => `/data/pages/${slug}/${kind}/${id}.json`,
  prepMap: '/data/pages/prep-map.json',
  topic: (slug: string) => `/data/topics/${slug}.json`,
  search: '/data/search.json',
  cards: '/data/cards.json',
};

export const getCatalog = () => load<Catalog>(urls.catalog);
export const getPage = (url: string) => load<Page>(url);
export const getTopicExtras = (slug: string) => load<TopicExtras>(urls.topic(slug));
export const getSearchIndex = () => load<SearchEntry[]>(urls.search);
export const getCards = () => load<Card[]>(urls.cards);

export interface Resource<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/** Tiny data hook: cached fetch of a static JSON file. */
export function useResource<T>(url: string | null): Resource<T> {
  const [state, setState] = useState<Resource<T>>(() => {
    const hit = url ? (resolved.get(url) as T | undefined) : undefined;
    return { data: hit, error: null, loading: Boolean(url) && hit === undefined };
  });
  useEffect(() => {
    if (!url) return;
    const hit = resolved.get(url) as T | undefined;
    if (hit !== undefined) {
      setState({ data: hit, error: null, loading: false });
      return;
    }
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    load<T>(url)
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((e: unknown) => live && setState({ data: undefined, error: e instanceof Error ? e.message : 'Failed to load', loading: false }));
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

export const useCatalog = () => useResource<Catalog>(urls.catalog);
export const useCards = (enabled = true) => useResource<Card[]>(enabled ? urls.cards : null);

export function topicMap(catalog: Catalog | undefined): Map<string, Topic> {
  return new Map((catalog?.topics ?? []).map((t) => [t.slug, t]));
}

/** Flat reading order across the whole curriculum (prep map, then topics by group). */
export function readingOrder(catalog: Catalog) {
  const byslug = topicMap(catalog);
  const out: Array<{ key: string; url: string; title: string; topic?: Topic }> = [];
  for (const g of catalog.groups) for (const s of g.topics) {
    const t = byslug.get(s);
    if (t) for (const p of t.pages) out.push({ key: p.key, url: p.url, title: p.title, topic: t });
  }
  return out;
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
