---
id: deep-get
title: Deep lookup with default
difficulty: medium
tags: [dicts, lists]
languages: [python]
runner: python
estimatedMinutes: 15
learnLinks:
  - python/notes/01-python
---

Implement `deep_get(obj, path, default=None)`: walk a dotted path (`"a.b.0.c"`) through nested dicts and lists and return the value found, or `default` when anything along the way is missing. Numeric segments index into lists (non-negative only); an empty path returns the object itself.

## Examples

```python
deep_get({"a": {"b": 1}}, "a.b")          # 1
deep_get({"a": {"b": 1}}, "a.x")          # None
deep_get({"a": [10, 20]}, "a.1")          # 20
deep_get({"a": 1}, "b", "dflt")            # "dflt"
```

## Learn

API responses and config trees are nested dicts full of optional branches, and `data["a"]["b"]["c"]` explodes on the first missing key. The defensive pattern is a small walker: split the path, descend one segment at a time, and bail to a default the moment the current value isn't the container you need. Dicts check membership; lists check digit-ness and bounds.

## Hints

- Split the path and walk one segment at a time, carrying the current value.
- Dicts need a membership test; lists need a digit check plus a bounds check.
- Any failed step returns the default immediately — never index blindly.

## Solution

Iterate over `path.split('.')`, descending through dict keys and valid list indices and returning `default` on the first failure (missing key, out-of-range index, or a leaf that isn't a container). Empty path skips the loop and returns the object.

## Complexity

Time `O(d)` for path depth `d`, space `O(1)` beyond the split segments.

## Common mistakes

- Indexing lists with negative or non-numeric segments (`"-1".isdigit()` is `False` — good).
- Catching all exceptions instead of checking, which hides real bugs.
- Forgetting that an empty path should return the object itself.

```starter:python
def deep_get(obj, path, default=None):
    # TODO: walk the dotted path, return default when missing
    return default
```

```visible-tests
{
  "kind": "fn",
  "function": "deep_get",
  "cases": [
    { "name": "nested dict", "args": [{ "a": { "b": 1 } }, "a.b"], "expected": 1 },
    { "name": "missing key", "args": [{ "a": { "b": 1 } }, "a.x"], "expected": null },
    { "name": "list index", "args": [{ "a": [10, 20] }, "a.1"], "expected": 20 }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "deep_get",
  "cases": [
    { "name": "empty path", "args": [{ "a": 1 }, ""], "expected": { "a": 1 } },
    { "name": "deep miss", "args": [{}, "a.b.c"], "expected": null },
    { "name": "custom default", "args": [{ "a": 1 }, "b", "dflt"], "expected": "dflt" },
    { "name": "through a leaf", "args": [{ "a": 1 }, "a.b"], "expected": null },
    { "name": "index out of range", "args": [{ "a": [1] }, "a.5"], "expected": null }
  ]
}
```

```solution:python
def deep_get(obj, path, default=None):
    current = obj
    if not path:
        return current
    for part in path.split("."):
        if isinstance(current, dict):
            if part not in current:
                return default
            current = current[part]
        elif isinstance(current, (list, tuple)) and part.isdigit():
            index = int(part)
            if index >= len(current):
                return default
            current = current[index]
        else:
            return default
    return current
```
