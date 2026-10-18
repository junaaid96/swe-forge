---
id: chunk
title: Chunk a list
difficulty: easy
tags: [lists, batching]
languages: [python]
runner: python
estimatedMinutes: 10
learnLinks:
  - python/notes/01-python
---

Implement `chunk(items, n)`: split a list into consecutive sublists of at most `n` items. The last chunk may be shorter. Raise `ValueError` when `n` is not positive.

## Examples

```python
chunk([1, 2, 3, 4, 5], 2)  # [[1, 2], [3, 4], [5]]
chunk([], 3)               # []
chunk([1, 2], 5)           # [[1, 2]]
chunk([1, 2], 0)           # ValueError
```

## Learn

Batching shows up everywhere: sending API requests 100 at a time, inserting rows in bulk, paginating results. Python's slice-and-step idiom — `items[i:i + n]` for `i` in `range(0, len(items), n)` — chunks any sequence in one line, and slicing past the end safely returns a shorter list instead of raising.

## Hints

- `range(0, len(items), n)` gives you each chunk's start index.
- Slicing past the end is safe: `[1, 2][0:5]` is just `[1, 2]`.
- Validate `n` first — otherwise `range` with step `0` raises its own confusing error.

## Solution

Guard `n <= 0` with `ValueError`, then build `[items[i:i + n] for i in range(0, len(items), n)]`. An empty input yields an empty range, hence `[]`.

## Complexity

Time `O(n)` to copy the items, space `O(n)` for the chunks.

## Common mistakes

- Forgetting to validate `n` (step `0` crashes `range`).
- An off-by-one that drops the final partial chunk.
- Returning tuples or a generator when the contract says lists.

```starter:python
def chunk(items, n):
    # TODO: split items into lists of at most n
    return []
```

```visible-tests
{
  "kind": "fn",
  "function": "chunk",
  "cases": [
    { "name": "partial tail", "args": [[1, 2, 3, 4, 5], 2], "expected": [[1, 2], [3, 4], [5]] },
    { "name": "empty", "args": [[], 3], "expected": [] },
    { "name": "bigger than list", "args": [[1, 2], 5], "expected": [[1, 2]] }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "chunk",
  "cases": [
    { "name": "ones", "args": [[1, 2, 3], 1], "expected": [[1], [2], [3]] },
    { "name": "even split", "args": [[1, 2, 3, 4], 2], "expected": [[1, 2], [3, 4]] },
    { "name": "zero raises", "args": [[1, 2], 0], "throws": "ValueError" },
    { "name": "negative raises", "args": [[1, 2], -1], "throws": "ValueError" }
  ]
}
```

```solution:python
def chunk(items, n):
    if n <= 0:
        raise ValueError("n must be positive")
    return [items[i:i + n] for i in range(0, len(items), n)]
```
