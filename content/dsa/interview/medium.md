---
id: dsa-interview-medium
level: medium
---

# DSA — Interview (Medium)

> The most-asked coding patterns: what they're for, a template to reach for, and the classic problems. Pair with the DSA notes and Deep tracks.

## Q1. When do you reach for a hash map, and what are the classic problems?

**Answer:** Whenever you need O(1) average lookups of something you've already seen: a value → index map, a frequency count, or a set of visited states. It usually turns an O(n²) "check every pair" into one O(n) pass at the cost of O(n) extra space.

- **Two Sum:** store `value → index`; for each `x`, check whether `target − x` is already in the map.
- **Group Anagrams:** key each word by its sorted letters (or a 26-count tuple).
- **Subarray Sum Equals K:** keep a map of prefix-sum frequencies; for each prefix `p`, add `count[p − k]`.

**Key takeaway:** State the time/space trade-off out loud: O(n) time, O(n) space, average case (hash collisions make the worst case worse).

---

## Q2. How does the two-pointer technique work?

**Answer:** Keep two indices and move them based on a rule, so each element is visited at most a constant number of times — usually O(n) instead of O(n²).

- **Opposite ends on sorted input:** sorted Two Sum (sum too small → move left up; too big → move right down), Container With Most Water (always move the shorter wall), Valid Palindrome.
- **Same direction (fast/slow):** remove duplicates in place, cycle detection in a linked list (Floyd), finding the middle node.

**Key takeaway:** Two pointers work when you can prove that moving one pointer never skips a better answer — say that invariant out loud.

---

## Q3. Explain the sliding-window pattern.

**Answer:** For problems about a **contiguous** subarray or substring, maintain a window `[left, right]`: expand `right` to include new elements, and shrink `left` while the window breaks a constraint, updating the answer as you go. Each index enters and leaves the window once, so it's O(n).

- **Variable window:** Longest Substring Without Repeating Characters (shrink while a character repeats), Minimum Window Substring (shrink while all required characters are still covered).
- **Fixed window:** maximum sum of any `k` consecutive elements.

**Key takeaway:** If the problem says "contiguous" and "longest/shortest/at most", think sliding window before nested loops.

---

## Q4. BFS vs DFS — when do you use which?

**Answer:**
- **BFS** (queue) explores level by level, so the first time it reaches a node is via the fewest edges: shortest path in an **unweighted** graph, level-order traversal, multi-source spreading (Rotting Oranges).
- **DFS** (recursion or a stack) goes deep first: connected components and Number of Islands, cycle detection, topological sort, and backtracking (permutations, subsets).

Both are O(V + E) time and need a `visited` set on graphs with cycles. For weighted shortest paths use Dijkstra (non-negative weights) instead.

**Key takeaway:** Shortest path by edge count → BFS; explore everything or build/undo choices → DFS.

---

## Q5. How do you approach a 1D/2D dynamic programming problem?

**Answer:** DP fits when a problem has **overlapping subproblems** and **optimal substructure**. Work it in four steps:

1. **State:** what does `dp[i]` (or `dp[i][j]`) mean? e.g., "max money robbing houses `0..i`".
2. **Transition:** how does it follow from smaller states? House Robber: `dp[i] = max(dp[i−1], dp[i−2] + nums[i])`.
3. **Base cases:** `dp[0]`, `dp[1]`, or the first row/column of a grid.
4. **Order and answer:** fill in dependency order and return the right cell.

Start with recursion + memoization if it's easier to see, then convert to a bottom-up table, and often compress space (House Robber only needs two variables). Classics: Climbing Stairs, House Robber, Unique Paths, Coin Change (`dp[a] = min(dp[a − coin] + 1)`), Longest Common Subsequence.

**Key takeaway:** Define the state in words before writing code; most DP bugs are a fuzzy state definition.
