---
id: longest-substring
title: Longest substring without repeats
difficulty: hard
tags: [strings, sliding-window, hash-table]
languages: [python]
runner: python
estimatedMinutes: 25
learnLinks:
  - dsa/notes/02-patterns-and-problem-solving
---

Implement `length_of_longest_substring(s)`: return the length of the longest substring with no repeating characters.

## Examples

```python
length_of_longest_substring("abcabcbb")  # 3 ("abc")
length_of_longest_substring("bbbbb")     # 1 ("b")
length_of_longest_substring("pwwkew")    # 3 ("wke")
```

## Learn

This is the canonical sliding window: a `[start, i]` window that always holds distinct characters. Extend the right edge one step at a time; when the new character already sits inside the window, jump `start` just past its previous occurrence. A dict of last-seen indices makes both operations `O(1)`, and tracking the best width as you go avoids a second pass.

## Hints

- Keep a window of distinct characters and grow it from the right.
- When a repeat arrives, move the left edge past the previous copy — but never backwards.
- A dict of last-seen positions answers "where was this char?" in `O(1)`.

## Solution

Scan with index `i`, keeping `start` and a last-seen map. On repeat inside the window (`seen[ch] >= start`), set `start = seen[ch] + 1`. Update the map and the best width `i - start + 1` each step.

## Complexity

Time `O(n)` single pass, space `O(k)` for the character map (`k` = alphabet size).

## Common mistakes

- Moving `start` backwards on stale repeats (`"abba"` needs the `>= start` guard).
- Forgetting to update the last-seen index after moving the window.
- Returning the substring instead of its length.

```starter:python
def length_of_longest_substring(s):
    # TODO: return the longest repeat-free length
    return 0
```

```visible-tests
{
  "kind": "fn",
  "function": "length_of_longest_substring",
  "cases": [
    { "name": "classic", "args": ["abcabcbb"], "expected": 3 },
    { "name": "all same", "args": ["bbbbb"], "expected": 1 },
    { "name": "overlap", "args": ["pwwkew"], "expected": 3 }
  ]
}
```

```hidden-tests
{
  "kind": "fn",
  "function": "length_of_longest_substring",
  "cases": [
    { "name": "empty", "args": [""], "expected": 0 },
    { "name": "all distinct", "args": ["abcdef"], "expected": 6 },
    { "name": "stale repeat", "args": ["abba"], "expected": 2 },
    { "name": "repeat after jump", "args": ["dvdf"], "expected": 3 }
  ]
}
```

```solution:python
def length_of_longest_substring(s):
    seen = {}
    best = 0
    start = 0
    for i, ch in enumerate(s):
        if ch in seen and seen[ch] >= start:
            start = seen[ch] + 1
        seen[ch] = i
        best = max(best, i - start + 1)
    return best
```
