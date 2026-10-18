---
id: group-anagrams
title: Group anagrams
difficulty: medium
tags: [strings, hash-table, sorting]
languages: [python]
runner: python
estimatedMinutes: 20
learnLinks:
  - dsa/notes/02-patterns-and-problem-solving
---

Implement `group_anagrams(words)`: cluster words that are anagrams of each other. Sort each group alphabetically, and sort the groups by their first word, so the output is deterministic.

## Examples

```python
group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
# [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]
group_anagrams([""])   # [[""]]
group_anagrams([])     # []
```

## Learn

Grouping by a canonical key is the hash-map pattern behind anagrams, file deduplication and histogram bucketing: compute a signature per item (here, the sorted letters), file each item under its signature, then emit the buckets. Sorting the signature costs `O(k log k)` per word; a 26-count tuple key would be `O(k)` but harder to read.

## Hints

- Anagrams share one signature — what single string represents a whole group?
- A dict from signature to word-list does the clustering in one pass.
- Sort groups and their contents at the end for a stable answer.

## Solution

Map each word to `''.join(sorted(word))` and append it to that signature's bucket via `setdefault`. Return the buckets with each group sorted and the groups ordered by first word.

## Complexity

Time `O(n · k log k)` for `n` words of length `k`, space `O(n · k)`.

## Common mistakes

- Returning groups in hash order (nondeterministic across runs).
- Forgetting to sort inside groups, or sorting groups by length.
- Using the raw word as the key instead of its signature.

```starter:python
def group_anagrams(words):
    # TODO: cluster anagrams, sorted deterministically
    return []
```

```visible-tests
{
  "kind": "fn",
  "function": "group_anagrams",
  "cases": [
    { "name": "classic", "args": [["eat", "tea", "tan", "ate", "nat", "bat"]], "expected": [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]] },
    { "name": "single empty", "args": [[""]], "expected": [[""]] },
    { "name": "no words", "args": [[]], "expected": [] }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "group_anagrams",
  "cases": [
    { "name": "one word", "args": [["a"]], "expected": [["a"]] },
    { "name": "two groups", "args": [["abc", "bca", "cab", "xyz"]], "expected": [["abc", "bca", "cab"], ["xyz"]] },
    { "name": "duplicates", "args": [["eat", "eat", "tea"]], "expected": [["eat", "eat", "tea"]] }
  ]
}
```

```solution:python
def group_anagrams(words):
    groups = {}
    for word in words:
        groups.setdefault("".join(sorted(word)), []).append(word)
    return sorted([sorted(group) for group in groups.values()])
```
