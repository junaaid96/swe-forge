---
id: valid-parentheses
title: Valid parentheses
difficulty: medium
tags: [stack, strings]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 15
learnLinks:
  - dsa/notes/01-complexity-and-core-structures
---

Given a string containing brackets, decide whether they are correctly balanced: every opener (`(`, `[`, `{`) must be closed by the matching closer in the correct nesting order. Any other characters are ignored, and the empty string is valid.

## Examples

```js
isValid('()[]{}'); // true
isValid('(]'); // false
isValid('([)]'); // false — interleaved, not nested
isValid('{[()]}'); // true
```

## Learn

Nesting is a last-in-first-out shape, which is exactly what a stack models. Push openers; on a closer, the top of the stack must be its match. A counter is not enough (`[)` has balanced counts but wrong order), and neither is checking pairs in isolation — only the stack sees the nesting.

## Hints

- Which opener does each closer have to match — the first one, or the most recent unmatched one?
- Push openers onto a stack; pop when you meet a closer.
- A closer with an empty stack, or a non-empty stack at the end, both mean invalid.

## Solution

Scan once, pushing openers onto a stack. On a closer, pop and require the matching opener; fail fast on mismatch or an empty stack. Other characters are skipped. Valid only if the stack ends empty.

## Complexity

Time `O(n)`, space `O(n)` in the worst case (all openers).

## Common mistakes

- Counting brackets instead of tracking order (`[)` and `([)]` slip through).
- Forgetting the empty-stack check when the string starts with a closer.
- Returning `true` without checking that the stack is empty at the end.

```starter:javascript
function isValid(s) {
  // TODO: return true when the brackets nest correctly
  return false;
}
```

```starter:typescript
function isValid(s: string): boolean {
  // TODO: return true when the brackets nest correctly
  return false;
}
```

```visible-tests
{
  "kind": "fn",
  "function": "isValid",
  "cases": [
    { "name": "simple pair", "args": ["()"], "expected": true },
    { "name": "all kinds", "args": ["()[]{}"], "expected": true },
    { "name": "wrong closer", "args": ["(]"], "expected": false }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "isValid",
  "cases": [
    { "name": "nested", "args": ["{[()]}"], "expected": true },
    { "name": "interleaved", "args": ["([)]"], "expected": false },
    { "name": "empty", "args": [""], "expected": true },
    { "name": "unclosed", "args": ["(("], "expected": false },
    { "name": "other chars ignored", "args": ["a(b)c"], "expected": true }
  ]
}
```

```solution:javascript
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
```

```solution:typescript
function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: string[] = [];
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (stack.pop() !== pairs[ch]) return false;
    }
  }
  return stack.length === 0;
}
```
