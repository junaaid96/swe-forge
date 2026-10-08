# Coding Interview Playbook

Knowing algorithms is half the job; the other half is recognising which one applies, communicating while you work, and testing your own code. This playbook turns the prep map's meta-skills into a repeatable routine.

---

## 1. The 45-minute routine

| Minutes | Do this |
|---|---|
| 0–5 | Restate the problem. Ask about input size, value ranges, duplicates, empty input, sortedness, expected output format |
| 5–10 | Work a small example by hand. Propose brute force with its complexity, then improve. Agree on the approach **before** coding |
| 10–35 | Code in small, named helpers. Talk while you write: why this structure, what the invariant is |
| 35–45 | Dry-run on your example, then edge cases. Fix bugs calmly. State final time and space complexity |

> **Asked as:** "Walk me through how you approach a new problem." · "What would you do if you got stuck?"

---

## 2. Keyword → pattern map

| The problem says… | Reach for |
|---|---|
| sorted array, pair/triplet with target | two pointers, binary search |
| contiguous subarray/substring, longest/shortest with condition | sliding window |
| subarray sum equals K, range sums | prefix sums + hash map |
| linked list cycle, middle, k-th from end | fast & slow pointers |
| overlapping intervals, meeting rooms | sort by start + merge / min-heap of end times |
| numbers 1..n, find missing/duplicate | cyclic sort or XOR |
| reverse part of a list | in-place reversal |
| level by level, shortest steps, minimum moves | BFS |
| all paths, path sum, diameter | DFS (tree recursion) |
| running median, k-th largest in a stream | two heaps / one heap |
| all combinations / permutations / subsets | backtracking |
| rotated array, search in matrix, minimise the maximum | modified binary search / search on answer |
| top K, K closest, K most frequent | heap or quickselect |
| merge K sorted lists/arrays | K-way merge with a heap |
| dependencies, ordering, course schedule | topological sort (Kahn's BFS) |
| connected components, redundant edge, grouping | union-find or DFS |
| maximise/minimise with choices, count the ways | dynamic programming (or greedy if you can prove it) |
| next greater/smaller element | monotonic stack |
| prefix matching, autocomplete | trie |

---

## 3. Communicating well

- **Think out loud:** "I'm considering a hash map because I need O(1) lookups of complements."
- **State assumptions:** "I'll assume the input fits in memory and values are 32-bit integers."
- **Discuss trade-offs:** "This is O(n) time and O(n) space; sorting first would make it O(1) extra space but O(n log n) time."
- **Check in:** "Does this approach make sense before I code it?"
- **When stuck:** say so, go back to a concrete example, try a simpler version of the problem, and ask for a hint if a few minutes pass without progress. Interviewers grade recovery too.

---

## 4. Edge-case checklist

Empty input · single element · two elements · all equal · already sorted / reverse sorted · negative numbers and zero · duplicates · very large values (overflow) · null / missing fields · off-by-one at the window or array bounds · cycles in graphs · disconnected graphs · unicode in strings.

## 5. Dry-run technique

Write a table with one column per variable and one row per loop iteration. Run your code against a 4–6 element input, line by line. Add **assertions** for invariants you rely on ("left ≤ right", "stack is monotonic") while practising; they catch bugs before the interviewer does.

---

## 6. After you solve it

- Give exact complexity and justify it (amortised arguments count).
- Offer the optimisation path: "Can we do better? A heap gives O(n log k) instead of O(n log n)."
- Handle follow-ups: streaming input, input too large for memory (external sort, chunking), concurrency, distributed version.

## 7. Practice plan

1. Learn the patterns above with 3–5 canonical problems each (LeetCode, NeetCode lists, company-tagged sets).
2. Time-box: 25 minutes to solve, then study the solution and re-solve from scratch the next day.
3. Do mock interviews with peers or on Pramp / interviewing.io, and use Forgeline's **Mock interview** mode to drill explanations.
4. Review fundamentals regularly. Many hard questions are basics asked deeply.
5. Keep an error log: the pattern you missed and the bug you wrote. Turn each into a flashcard.

## 8. Writing clean interview code

Meaningful names over single letters (except loop indices), small helper functions, early returns for edge cases, no clever one-liners you can't explain, and a short comment for any non-obvious invariant.
