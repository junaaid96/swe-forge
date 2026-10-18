---
id: flatten-object
title: Flatten a nested object
difficulty: medium
tags: [objects, recursion]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 20
learnLinks:
  - javascript/notes/01-javascript
---

Implement `flatten(obj)`: turn a nested object into a single-level object whose keys are dot-separated paths. Arrays flatten with numeric segments. Primitives, `null`, and empty objects/arrays are leaf values kept as-is.

## Examples

```js
flatten({ a: { b: 1 }, c: 2 }); // { 'a.b': 1, c: 2 }
flatten({ a: [{ b: 1 }, 2] }); // { 'a.0.b': 1, 'a.1': 2 }
flatten({ a: {} }); // { a: {} }
flatten({}); // {}
```

## Learn

Nested config, API payloads and form state are often easier to process flat — think `t('errors.email.required')` in i18n, or diffing two objects path by path. The shape to reach for is a depth-first walk carrying the current path: recurse into non-empty objects and arrays, and write every leaf (primitives, `null`, empties) at its full path.

## Hints

- Walk the tree carrying the current dotted path as you go.
- Arrays are objects too — `Object.entries` gives you `['0', first], …` for free.
- Decide the leaf rule first: only non-empty objects/arrays recurse; everything else is written out.

## Solution

Depth-first recursion with an accumulator. For each value, if it is a non-empty object or array, recurse into its entries with the extended path; otherwise store it under the current path. The top-level empty object yields no paths, hence `{}`.

## Complexity

Time `O(n)` in the number of nodes visited, space `O(n)` for the output plus `O(d)` stack for depth `d`.

## Common mistakes

- Dropping empty objects/arrays instead of keeping them as leaves.
- Special-casing arrays with index math instead of reusing `Object.entries`.
- Joining paths wrong at the root (`'.a'` instead of `'a'`).

```starter:javascript
function flatten(obj) {
  // TODO: return { 'a.b': 1 } style paths for every leaf
  return {};
}
```

```starter:typescript
function flatten(obj: Record<string, unknown>): Record<string, unknown> {
  // TODO: return { 'a.b': 1 } style paths for every leaf
  return {};
}
```

```visible-tests
{
  "kind": "fn",
  "function": "flatten",
  "cases": [
    { "name": "nested", "args": [{ "a": { "b": 1 }, "c": 2 }], "expected": { "a.b": 1, "c": 2 } },
    { "name": "arrays", "args": [{ "a": [{ "b": 1 }, 2] }], "expected": { "a.0.b": 1, "a.1": 2 } },
    { "name": "empty", "args": [{}], "expected": {} }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "flatten",
  "cases": [
    { "name": "empty nested kept", "args": [{ "a": {} }], "expected": { "a": {} } },
    { "name": "null leaf", "args": [{ "a": null }], "expected": { "a": null } },
    { "name": "deep", "args": [{ "a": { "b": { "c": { "d": 1 } } } }], "expected": { "a.b.c.d": 1 } },
    { "name": "dotted key as-is", "args": [{ "a.b": 1 }], "expected": { "a.b": 1 } }
  ]
}
```

```solution:javascript
function flatten(obj) {
  const out = {};
  const walk = (value, path) => {
    const isObj = typeof value === 'object' && value !== null;
    const entries = isObj ? Object.entries(value) : [];
    if (!isObj || entries.length === 0) {
      if (path) out[path] = value;
      return;
    }
    for (const [key, child] of entries) {
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(obj, '');
  return out;
}
```

```solution:typescript
function flatten(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const walk = (value: unknown, path: string): void => {
    const isObj = typeof value === 'object' && value !== null;
    const entries = isObj ? Object.entries(value as Record<string, unknown>) : [];
    if (!isObj || entries.length === 0) {
      if (path) out[path] = value;
      return;
    }
    for (const [key, child] of entries) {
      walk(child, path ? `${path}.${key}` : key);
    }
  };
  walk(obj, '');
  return out;
}
```
