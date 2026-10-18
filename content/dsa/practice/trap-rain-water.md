---
id: trap-rain-water
title: Trapping rain water
difficulty: hard
tags: [arrays, two-pointers]
languages: [javascript, typescript]
runner: js
estimatedMinutes: 30
learnLinks:
  - dsa/notes/02-patterns-and-problem-solving
  - dsa/notes/05-coding-interview-playbook
---

Given an elevation map as an array of non-negative bar heights, compute how much water it traps after rain. Water sits on a bar up to the lower of the tallest bar to its left and the tallest to its right.

## Examples

```js
trap([0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]); // 6
trap([4, 2, 0, 3, 2, 5]); // 9
trap([1, 2, 3]); // 0 — nowhere to pool
```

## Learn

For each position, trapped water is `max(0, min(leftMax, rightMax) - height)`. Precomputing both maxima arrays is the straightforward `O(n)`-space version. The two-pointer refinement keeps the same formula with `O(1)` space: move the pointer on the lower side, because the lower side's max is the binding constraint — whatever stands on the far side can only be taller.

## Hints

- Water on one bar = `min(tallest left, tallest right) - bar`, floored at zero.
- Precomputing left/right maxima arrays first is a fine stepping stone.
- For `O(1)` space: always advance the lower side — its max decides the level.

## Solution

Two pointers with running maxima. While they haven't met, process the lower side: if its bar reaches a new max, record it; otherwise the gap between the max and the bar is trapped water. Then move that pointer inward.

## Complexity

Time `O(n)` single pass, space `O(1)`.

## Common mistakes

- Forgetting the `max(0, …)` floor and subtracting into negatives.
- Moving the wrong pointer (always the lower side, never both).
- Recomputing maxima per index for an accidental `O(n²)`.

```starter:javascript
function trap(height) {
  // TODO: return trapped water units
  return 0;
}
```

```starter:typescript
function trap(height: number[]): number {
  // TODO: return trapped water units
  return 0;
}
```

```visible-tests
{
  "kind": "fn",
  "function": "trap",
  "cases": [
    { "name": "classic", "args": [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], "expected": 6 },
    { "name": "valley", "args": [[4, 2, 0, 3, 2, 5]], "expected": 9 },
    { "name": "ascending", "args": [[1, 2, 3]], "expected": 0 }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "trap",
  "cases": [
    { "name": "empty", "args": [[]], "expected": 0 },
    { "name": "single", "args": [[5]], "expected": 0 },
    { "name": "bowl", "args": [[3, 0, 3]], "expected": 3 },
    { "name": "descending", "args": [[5, 4, 3, 2, 1]], "expected": 0 },
    { "name": "simple dip", "args": [[2, 0, 2]], "expected": 2 }
  ]
}
```

```solution:javascript
function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let lMax = 0;
  let rMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= lMax) lMax = height[left];
      else water += lMax - height[left];
      left++;
    } else {
      if (height[right] >= rMax) rMax = height[right];
      else water += rMax - height[right];
      right--;
    }
  }
  return water;
}
```

```solution:typescript
function trap(height: number[]): number {
  let left = 0;
  let right = height.length - 1;
  let lMax = 0;
  let rMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= lMax) lMax = height[left];
      else water += lMax - height[left];
      left++;
    } else {
      if (height[right] >= rMax) rMax = height[right];
      else water += rMax - height[right];
      right--;
    }
  }
  return water;
}
```
