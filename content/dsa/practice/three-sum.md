---
id: three-sum
title: '3Sum: triplets to zero'
difficulty: hard
tags: [arrays, two-pointers, sorting]
languages: [python]
runner: python
estimatedMinutes: 30
learnLinks:
  - dsa/notes/02-patterns-and-problem-solving
  - dsa/notes/05-coding-interview-playbook
---

Implement `three_sum(nums)`: return every unique triplet `[a, b, c]` with `a + b + c == 0`. Sort each triplet ascending and sort the triplet list, so the output is deterministic.

## Examples

```python
three_sum([-1, 0, 1, 2, -1, -4])  # [[-1, -1, 2], [-1, 0, 1]]
three_sum([0, 0, 0])              # [[0, 0, 0]]
three_sum([1, 2, 3])              # []
```

## Learn

3Sum is two-sum with one index pinned: sort once, then for each first element solve "two numbers summing to `-first`" on the remainder with the two-pointer scan. Sorting also makes dedup mechanical — skip equal neighbours for the pinned index and for the left pointer after each hit — turning an exponential-feeling problem into `O(n²)`.

## Hints

- Sort first: it enables two pointers and makes duplicates adjacent.
- Pin each index once as the first element; two-pointer-scan the rest for the complement.
- Skip equal neighbours (pinned index and left pointer) to avoid repeat triplets.

## Solution

Sort, then for each `i` run the lo/hi two-pointer scan for `-nums[i]`. On a hit, record and advance both pointers past duplicates; otherwise move the pointer that improves the sum. Skipping equal `nums[i]` values prevents duplicate triplets.

## Complexity

Time `O(n²)` (sort plus a linear scan per pin), space `O(1)` besides the output.

## Common mistakes

- Emitting duplicate triplets by not skipping equal neighbours.
- Re-sorting each triplet instead of relying on scan order (works, but hides bugs).
- The `O(n³)` triple loop, or a set-of-tuples dedup that masks the ordering.

```starter:python
def three_sum(nums):
    # TODO: return sorted unique triplets summing to 0
    return []
```

```visible-tests
{
  "kind": "fn",
  "function": "three_sum",
  "cases": [
    { "name": "classic", "args": [[-1, 0, 1, 2, -1, -4]], "expected": [[-1, -1, 2], [-1, 0, 1]] },
    { "name": "all zeros", "args": [[0, 0, 0]], "expected": [[0, 0, 0]] },
    { "name": "none", "args": [[1, 2, 3]], "expected": [] }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "three_sum",
  "cases": [
    { "name": "empty", "args": [[]], "expected": [] },
    { "name": "many zeros", "args": [[0, 0, 0, 0]], "expected": [[0, 0, 0]] },
    { "name": "two triplets", "args": [[-2, 0, 1, 1, 2]], "expected": [[-2, 0, 2], [-2, 1, 1]] }
  ]
}
```

```solution:python
def three_sum(nums):
    nums = sorted(nums)
    out = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            total = nums[i] + nums[lo] + nums[hi]
            if total == 0:
                out.append([nums[i], nums[lo], nums[hi]])
                lo += 1
                hi -= 1
                while lo < hi and nums[lo] == nums[lo - 1]:
                    lo += 1
            elif total < 0:
                lo += 1
            else:
                hi -= 1
    return out
```
