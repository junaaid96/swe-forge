---
id: search-insert
title: Binary search insert position
difficulty: medium
tags: [arrays, binary-search]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 15
learnLinks:
  - dsa/notes/02-patterns-and-problem-solving
---

Given a sorted array of distinct numbers and a target, return the index where the target is — or where it would be inserted to keep the array sorted. The array may be empty. Aim for `O(log n)` time.

## Examples

```js
searchInsert([1, 3, 5, 6], 5); // 2
searchInsert([1, 3, 5, 6], 2); // 1
searchInsert([1, 3, 5, 6], 7); // 4
searchInsert([1, 3, 5, 6], 0); // 0
```

## Learn

Binary search keeps a half-open window `[lo, hi)` and halves it every step: compare the middle, discard the half that cannot contain the answer. The loop invariant to keep in mind is "the answer is always inside `[lo, hi)`". When the window collapses (`lo === hi`), `lo` is the lower bound — the first index whose value is not less than the target — which doubles as the insert position.

## Hints

- Keep a window `[lo, hi)` that always contains the answer, and halve it each step.
- If the middle value is less than the target, the answer is right of middle; otherwise it is at or left of middle.
- When `lo === hi` the window holds one spot: that index is the answer.

## Solution

Classic lower-bound binary search over `[lo, hi)`. While `lo < hi`, take the middle: move `lo` past it when `nums[mid] < target`, else shrink `hi` to it. Return `lo`.

## Complexity

Time `O(log n)`, space `O(1)`.

## Common mistakes

- Off-by-one on the window: mixing inclusive `hi` with the `lo < hi` loop.
- `(lo + hi) / 2` without flooring (fine in theory, a float index in JS).
- Returning `-1` for missing targets instead of the insert position.

```starter:javascript
function searchInsert(nums, target) {
  // TODO: binary search for the target or its insert position
  return 0;
}
```

```starter:typescript
function searchInsert(nums: number[], target: number): number {
  // TODO: binary search for the target or its insert position
  return 0;
}
```

```visible-tests
{
  "kind": "fn",
  "function": "searchInsert",
  "cases": [
    { "name": "found", "args": [[1, 3, 5, 6], 5], "expected": 2 },
    { "name": "insert middle", "args": [[1, 3, 5, 6], 2], "expected": 1 },
    { "name": "insert end", "args": [[1, 3, 5, 6], 7], "expected": 4 }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "searchInsert",
  "cases": [
    { "name": "insert start", "args": [[1, 3, 5, 6], 0], "expected": 0 },
    { "name": "empty", "args": [[], 1], "expected": 0 },
    { "name": "single hit", "args": [[1], 1], "expected": 0 },
    { "name": "single miss", "args": [[1], 2], "expected": 1 }
  ]
}
```

```solution:javascript
function searchInsert(nums, target) {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
```

```solution:typescript
function searchInsert(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
```
