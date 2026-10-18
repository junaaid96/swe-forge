---
id: two-sum
title: Two sum
difficulty: easy
tags: [arrays, hash-table]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 10
learnLinks:
  - dsa/notes/01-complexity-and-core-structures
  - dsa/notes/02-patterns-and-problem-solving
---

Given an array of numbers and a target, return the indices of the two numbers that add up to the target. Each input has exactly one solution, and you may not use the same element twice.

## Examples

```js
twoSum([2, 7, 11, 15], 9); // [0, 1]
twoSum([3, 2, 4], 6); // [1, 2]
twoSum([3, 3], 6); // [0, 1]
```

## Learn

The brute force checks every pair (`O(n²)`). The standard speedup trades space for time: scan once while remembering each value's index in a hash map. For the current value `x`, the partner must be `target - x` — if it is already in the map, you are done. Checking before inserting guarantees the two indices differ.

## Hints

- The brute force compares every pair — what does that cost on 10,000 numbers?
- While scanning, remember what you have already seen and where.
- For each `x`, look up `target - x` before inserting `x` itself.

## Solution

Single pass with a `Map` from value to index. For each element, check for the complement first (so an element never pairs with itself), then store the current value's index.

## Complexity

Time `O(n)`, space `O(n)` for the map.

## Common mistakes

- Inserting before checking, which lets `[3, 3]`-style inputs pair an element with itself.
- Returning the values instead of the indices.
- Sorting first, which destroys the original indices.

```starter:javascript
function twoSum(nums, target) {
  // TODO: return [i, j] such that nums[i] + nums[j] === target
  return [];
}
```

```starter:typescript
function twoSum(nums: number[], target: number): number[] {
  // TODO: return [i, j] such that nums[i] + nums[j] === target
  return [];
}
```

```visible-tests
{
  "kind": "fn",
  "function": "twoSum",
  "cases": [
    { "name": "basic", "args": [[2, 7, 11, 15], 9], "expected": [0, 1] },
    { "name": "unordered", "args": [[3, 2, 4], 6], "expected": [1, 2] },
    { "name": "same value twice", "args": [[3, 3], 6], "expected": [0, 1] }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "twoSum",
  "cases": [
    { "name": "negatives", "args": [[-1, -2, -3, -4], -7], "expected": [2, 3] },
    { "name": "zeros", "args": [[0, 4, 3, 0], 0], "expected": [0, 3] },
    { "name": "at the end", "args": [[2, 7, 11, 15], 26], "expected": [2, 3] }
  ]
}
```

```solution:javascript
function twoSum(nums, target) {
  const seen = new Map();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}
```

```solution:typescript
function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need) as number, i];
    seen.set(nums[i], i);
  }
  return [];
}
```
