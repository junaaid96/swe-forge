---
id: pick
title: Pick object keys
difficulty: easy
tags: [objects]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 10
learnLinks:
  - javascript/notes/01-javascript
---

Implement `pick(obj, keys)`: return a new object containing only the listed keys that exist directly on `obj`. Missing keys are skipped silently, and the input object must not be modified.

## Examples

```js
pick({ a: 1, b: 2, c: 3 }, ['a', 'c']); // { a: 1, c: 3 }
pick({ a: 1 }, ['a', 'zzz']); // { a: 1 }
pick({ a: 1, b: 2 }, []); // {}
```

## Learn

APIs and UI components often need a subset of a bigger object: whitelisting fields before sending them over the wire, or selecting props to pass down. The safe pattern is a fresh object filled from an explicit key list, checking ownership with `Object.hasOwn()` so prototype properties never leak in.

## Hints

- Build a new object — never delete keys from the input.
- Loop over `keys`, not over the object.
- `Object.hasOwn(obj, key)` tells own properties apart from inherited ones.

## Solution

Iterate the requested keys and copy each one that is an own property of the input into a fresh object. Values are copied by reference, which is what callers expect from a shallow pick.

## Complexity

Time `O(k)` for `k` keys, space `O(k)` for the result.

## Common mistakes

- Mutating the input with `delete` instead of building a new object.
- Using `key in obj` or truthiness checks, which admit inherited or miss falsy-valued keys.
- Forgetting numeric-like keys (`obj[1]` reads key `'1'`).

```starter:javascript
function pick(obj, keys) {
  // TODO: return a new object with only the listed own keys
  return {};
}
```

```starter:typescript
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  // TODO: return a new object with only the listed own keys
  return {} as Pick<T, K>;
}
```

```visible-tests
{
  "kind": "fn",
  "function": "pick",
  "cases": [
    { "name": "subset", "args": [{ "a": 1, "b": 2, "c": 3 }, ["a", "c"]], "expected": { "a": 1, "c": 3 } },
    { "name": "missing ignored", "args": [{ "a": 1 }, ["a", "zzz"]], "expected": { "a": 1 } },
    { "name": "no keys", "args": [{ "a": 1, "b": 2 }, []], "expected": {} }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "pick",
  "cases": [
    { "name": "empty object", "args": [{}, ["a"]], "expected": {} },
    { "name": "nested by reference", "args": [{ "a": { "x": 1 }, "b": 2 }, ["a"]], "expected": { "a": { "x": 1 } } },
    { "name": "numeric-like keys", "args": [{ "0": "a", "1": "b" }, [1]], "expected": { "1": "b" } }
  ]
}
```

```solution:javascript
function pick(obj, keys) {
  const out = {};
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) out[key] = obj[key];
  }
  return out;
}
```

```solution:typescript
function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) out[key] = obj[key];
  }
  return out;
}
```
