---
id: flatten-list
title: Flatten nested lists
difficulty: medium
tags: [lists, recursion]
languages: [python]
runner: python
estimatedMinutes: 15
learnLinks:
  - python/notes/01-python
---

Implement `flatten(nested)`: take a (possibly deeply nested) list and return a flat list of its leaf values in order. Lists and tuples recurse; strings and bytes are atoms and must not be split into characters.

## Examples

```python
flatten([1, [2, [3]], 4])  # [1, 2, 3, 4]
flatten([])                # []
flatten(["a", ["b"]])      # ["a", "b"]
```

## Learn

Nested JSON, comment threads and file trees all flatten the same way: walk depth-first, recursing into containers and emitting leaves. The classic Python gotcha is that strings are sequences too — `isinstance(x, (list, tuple))` as the recursion test (rather than "is it iterable?") keeps `"ab"` as one atom instead of `["a", "b"]`.

## Hints

- Recurse into lists and tuples; append everything else.
- Strings are iterable — exclude them explicitly or `"ab"` becomes `["a", "b"]`.
- An accumulator list passed down (or extended from) keeps the order stable.

## Solution

Depth-first recursion: for each item, extend with the recursive result when it is a list or tuple, else append it. Empty containers contribute nothing, so `[[],[[]]]` flattens to `[]`.

## Complexity

Time `O(n)` in total nodes, space `O(n)` for the output plus `O(d)` stack for depth `d`.

## Common mistakes

- Recursing into strings and exploding them into characters.
- Forgetting tuples (or recursing into dicts, which iterates keys).
- Building with `+` in a loop for an accidental `O(n²)`.

```starter:python
def flatten(nested):
    # TODO: return the leaves in order
    return []
```

```visible-tests
{
  "kind": "fn",
  "function": "flatten",
  "cases": [
    { "name": "nested", "args": [[[1, [2, [3]], 4]]], "expected": [1, 2, 3, 4] },
    { "name": "empty", "args": [[]], "expected": [] },
    { "name": "strings atomic", "args": [[["a", ["b", "c"]]]], "expected": ["a", "b", "c"] }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "flatten",
  "cases": [
    { "name": "empty nests", "args": [[[[], [[]]]]], "expected": [] },
    { "name": "mixed nesting", "args": [[[[1, 2], [3, [4]]]]], "expected": [1, 2, 3, 4] },
    { "name": "deep", "args": [[[[[[1]]]]]], "expected": [1] }
  ]
}
```

```solution:python
def flatten(nested):
    out = []
    for item in nested:
        if isinstance(item, (list, tuple)):
            out.extend(flatten(item))
        else:
            out.append(item)
    return out
```
