---
id: word-counts
title: Count words
difficulty: easy
tags: [strings, dicts]
languages: [python]
runner: python
estimatedMinutes: 10
learnLinks:
  - python/notes/01-python
---

Implement `word_counts(text)`: return a dict mapping each word to its frequency. Lowercase everything, split on whitespace, strip punctuation from the ends of each word, and skip tokens that are then empty.

## Examples

```python
word_counts("hello world hello")  # {"hello": 2, "world": 1}
word_counts("Hello, HELLO!")      # {"hello": 2}
word_counts("")                   # {}
```

## Learn

Text pipelines almost always start with normalize → tokenize → count. `str.lower()` plus `str.split()` handles the first two steps; `str.strip(string.punctuation)` trims quote and sentence marks without touching inner characters (`don't` stays intact). A plain dict with `.get(word, 0) + 1` is the counting pattern — `collections.Counter` is the same idea prebuilt.

## Hints

- Normalize first: lowercase the whole text before splitting.
- `word.strip(string.punctuation)` trims the ends only — inner apostrophes survive.
- Skip tokens that strip down to nothing, then count with `dict.get`.

## Solution

Lowercase, split on whitespace, strip surrounding punctuation per token, skip empties, and tally into a dict. Empty input short-circuits to `{}`.

## Complexity

Time `O(n)` in the text length, space `O(w)` for `w` distinct words.

## Common mistakes

- Stripping punctuation before lowercasing (harmless) or forgetting either step.
- Using `replace` on punctuation, which mangles inner characters like apostrophes.
- Counting empty strings from whitespace-only input.

```starter:python
def word_counts(text):
    # TODO: return {word: count} normalized as described
    return {}
```

```visible-tests
{
  "kind": "fn",
  "function": "word_counts",
  "cases": [
    { "name": "basic", "args": ["hello world hello"], "expected": { "hello": 2, "world": 1 } },
    { "name": "case and punctuation", "args": ["Hello, HELLO!"], "expected": { "hello": 2 } },
    { "name": "empty", "args": [""], "expected": {} }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "word_counts",
  "cases": [
    { "name": "mixed whitespace", "args": ["a  b\tc\na"], "expected": { "a": 2, "b": 1, "c": 1 } },
    { "name": "inner apostrophe kept", "args": ["don't stop"], "expected": { "don't": 1, "stop": 1 } },
    { "name": "punctuation only", "args": ["!!! ???"], "expected": {} }
  ]
}
```

```solution:python
import string


def word_counts(text):
    counts = {}
    for word in text.lower().split():
        word = word.strip(string.punctuation)
        if not word:
            continue
        counts[word] = counts.get(word, 0) + 1
    return counts
```
