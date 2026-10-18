---
id: cx
title: Join class names
difficulty: easy
tags: [strings, arrays, objects, frontend]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 10
learnLinks:
  - javascript/notes/01-javascript
  - frontend/notes/04-modern-css-layout-and-architecture
---

Build a tiny `cx()` helper like the popular classnames packages: it takes any number of arguments and joins the class names with single spaces.

Rules:

- Non-empty strings are included as-is.
- Numbers are always included, even `0`.
- Arrays are flattened recursively (to any depth).
- Plain objects contribute the keys whose value is truthy.
- Everything else (`null`, `undefined`, booleans, functions) is ignored.

## Examples

```js
cx('btn', 'btn-primary'); // 'btn btn-primary'
cx('btn', null, undefined, false, '', 'active'); // 'btn active'
cx({ active: true, disabled: false, hidden: 0 }); // 'active'
cx('a', ['b', ['c']], { d: 1 }); // 'a b c d'
```

## Learn

Rendering `class={...}` in React (or `class="..."` anywhere) usually means combining a base class with conditional ones. Ternaries get noisy fast (`'btn' + (active ? ' active' : '')`), so most codebases use a joiner: pass anything — strings, arrays, `{ className: condition }` maps — and get one clean string. The implementation is a small recursive walk: handle one value, recurse into arrays, and read truthy keys out of objects.

## Hints

- Handle one value at a time in a helper: string/number, then array, then object, then ignore.
- Arrays can nest, so the array branch should call the same helper again.
- `0` is falsy but must be kept — check for it before the falsy early-return.

## Solution

Walk every argument with a recursive helper. Push strings and stringified numbers into an output array, recurse into array items, and push object keys with truthy values. Join with a single space at the end.

## Complexity

Time `O(n)` in the total number of values visited (including nested ones), space `O(n)` for the output.

## Common mistakes

- Dropping `0` with a blanket falsy check.
- Only flattening one array level instead of recursing.
- Forgetting that `Object.keys` on the object branch must test each value for truthiness.

```starter:javascript
function cx(...args) {
  // TODO: join class names, skipping falsy values
  return '';
}
```

```starter:typescript
type CxValue = string | number | boolean | null | undefined | CxValue[] | { [key: string]: unknown };

function cx(...args: CxValue[]): string {
  // TODO: join class names, skipping falsy values
  return '';
}
```

```visible-tests
{
  "kind": "fn",
  "function": "cx",
  "cases": [
    { "name": "strings", "args": ["btn", "btn-primary"], "expected": "btn btn-primary" },
    { "name": "falsy skipped", "args": ["a", null, null, false, "", "b"], "expected": "a b" },
    { "name": "object map", "args": [{ "active": true, "disabled": false, "hidden": 0, "shown": 1 }], "expected": "active shown" }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "cx",
  "cases": [
    { "name": "nested arrays", "args": [["a", ["b", ["c"]]]], "expected": "a b c" },
    { "name": "mixed", "args": ["a", ["b", { "c": true, "d": 0 }], { "e": "yes", "f": "" }], "expected": "a b c e" },
    { "name": "numbers", "args": ["a", 1, 0], "expected": "a 1 0" },
    { "name": "no args", "args": [], "expected": "" },
    { "name": "all ignored", "args": [null, false, true], "expected": "" }
  ]
}
```

```solution:javascript
function cx(...args) {
  const out = [];
  const walk = (value) => {
    if (!value && value !== 0) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (value[key]) out.push(key);
      }
    }
  };
  for (const arg of args) walk(arg);
  return out.join(' ');
}
```

```solution:typescript
type CxValue = string | number | boolean | null | undefined | CxValue[] | { [key: string]: unknown };

function cx(...args: CxValue[]): string {
  const out: string[] = [];
  const walk = (value: CxValue): void => {
    if (!value && value !== 0) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const key of Object.keys(value)) {
        if ((value as Record<string, unknown>)[key]) out.push(key);
      }
    }
  };
  for (const arg of args) walk(arg);
  return out.join(' ');
}
```
