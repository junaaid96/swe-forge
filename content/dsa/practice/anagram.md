---
id: anagram
title: Check an anagram
difficulty: easy
tags: [strings, sorting]
languages: [python]
runner: python
estimatedMinutes: 10
learnLinks:
  - dsa/notes/01-complexity-and-core-structures
---

Implement `is_anagram(a, b)`: return `True` when the two strings contain exactly the same characters with the same multiplicities. Comparison is exact and case-sensitive.

## Examples

```python
is_anagram("listen", "silent")  # True
is_anagram("hello", "world")    # False
is_anagram("", "")              # True
```

## Learn

Anagrams are equal as multisets of characters, and sorting is a canonical form for multisets: two strings are anagrams exactly when their sorted characters match. That is an `O(n log n)` one-liner. The `O(n)` alternative counts characters (a `Counter` comparison); both are worth knowing, sorting for clarity and counting for scale.

## Hints

- Anagrams use the same letters the same number of times — what canonical form captures that?
- Sorting both strings reduces the problem to one `==`.
- Case matters here: don't normalize unless the contract says so.

## Solution

Return `sorted(a) == sorted(b)`. Sorted character lists are equal exactly for anagrams; empty strings sort to `[] == []`, hence `True`.

## Complexity

Time `O(n log n)` for the sorts, space `O(n)`. Counting with `Counter` would be `O(n)` time.

## Common mistakes

- Lowercasing first, which wrongly accepts `"Listen"` vs `"silent"`.
- Comparing sets instead of multisets (`"a"` vs `"aa"`).
- Ignoring length (sorting handles it, manual loops often don't).

```starter:python
def is_anagram(a, b):
    # TODO: return True when a and b are anagrams
    return False
```

```visible-tests
{
  "kind": "fn",
  "function": "is_anagram",
  "cases": [
    { "name": "classic", "args": ["listen", "silent"], "expected": true },
    { "name": "different", "args": ["hello", "world"], "expected": false },
    { "name": "both empty", "args": ["", ""], "expected": true }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "is_anagram",
  "cases": [
    { "name": "repeated letters", "args": ["aab", "aba"], "expected": true },
    { "name": "case sensitive", "args": ["Listen", "silent"], "expected": false },
    { "name": "length differs", "args": ["a", "aa"], "expected": false }
  ]
}
```

```solution:python
def is_anagram(a, b):
    return sorted(a) == sorted(b)
```
