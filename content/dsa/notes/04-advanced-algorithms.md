# Advanced Algorithms & Patterns

The core DSA guides cover complexity, the standard structures and the dozen common patterns. This guide collects the "next level" material from the prep map: binary-search-on-answer, monotonic structures, advanced tree and graph algorithms, DP state design and optimisations, bit tricks and number theory. Code is Python for brevity.

---

## 1. Array patterns, advanced

### 1.1 Sliding window (variable size)

Expand the right edge until the window is valid or invalid, then shrink from the left. Track state in a hash map.

```python
def longest_k_distinct(s: str, k: int) -> int:
    count, left, best = {}, 0, 0
    for right, ch in enumerate(s):
        count[ch] = count.get(ch, 0) + 1
        while len(count) > k:                 # shrink until valid again
            count[s[left]] -= 1
            if count[s[left]] == 0:
                del count[s[left]]
            left += 1
        best = max(best, right - left + 1)
    return best
```

Fixed windows (size *k*) just add the new element and drop the one that left. **Minimum window substring** is the same template with a "missing characters" counter.

### 1.2 Two and three pointers

- **Opposite ends:** container with most water, valid palindrome, two-sum on a sorted array.
- **Same direction (fast/slow):** remove duplicates in place, partition arrays, Floyd's cycle detection.
- **3-sum:** sort, fix `i`, two-pointer on the rest, skip duplicates. O(n²).
- **Dutch national flag:** three regions (`low`, `mid`, `high`) to sort 0/1/2 in one pass; the same partition idea powers **quickselect** (k-th largest in average O(n)).

### 1.3 Binary search variants

```python
def lower_bound(a, x):            # first index with a[i] >= x
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < x: lo = mid + 1
        else: hi = mid
    return lo

def min_capacity(weights, days):  # binary search on the ANSWER
    def feasible(cap):
        need, cur = 1, 0
        for w in weights:
            if cur + w > cap: need, cur = need + 1, 0
            cur += w
        return need <= days
    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid): hi = mid
        else: lo = mid + 1
    return lo
```

Use **search on answer** whenever you can check "is X achievable?" monotonically: ship packages within D days, split array largest sum, aggressive cows, painter's partition, Koko eating bananas. For a **rotated sorted array**, one half around `mid` is always sorted; decide which half can contain the target.

### 1.4 Monotonic stack and deque

```python
def next_greater(nums):
    res, stack = [-1] * len(nums), []          # stack holds indices, values decreasing
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            res[stack.pop()] = x
        stack.append(i)
    return res
```

- **Sliding window maximum:** a deque of indices with decreasing values; pop from the front when out of the window, pop from the back when smaller than the new value. O(n).
- **Largest rectangle in histogram:** increasing stack of indices; when a shorter bar arrives, pop and compute `height * (i - stack[-1] - 1)`.

> **Asked as:** "How would you solve sliding window maximum in O(n)?" · "Recognise a binary-search-on-answer problem."

---

## 2. Trees, advanced

| Problem | Key idea |
|---|---|
| **Morris traversal** | O(1) extra space inorder: temporarily link each node's inorder predecessor's right pointer back to it, then undo |
| **Serialize / deserialize** | preorder with null markers (`1,2,#,#,3,#,#`) or level order; rebuild with an iterator |
| **Vertical order** | BFS carrying (column, row); sort by column, then row, then value |
| **Boundary traversal** | left boundary (no leaves) + all leaves left→right + right boundary bottom-up (no leaves) |
| **Validate BST** | pass a (min, max) range down; checking only parent-child is the classic bug |
| **BST from preorder** | recursion with an upper bound, O(n) |
| **Kth smallest** | inorder with a counter; augment nodes with subtree sizes for O(h) queries |
| **BST iterator** | controlled inorder with a stack: `next()` amortised O(1), O(h) memory |
| **Distance between nodes** | `depth(a) + depth(b) - 2 * depth(LCA)` |
| **Flatten to linked list** | reverse postorder (right, left, root) keeping a `prev` pointer |
| **Max path sum** | post-order returns the best downward path; update a global with `left + right + node` |
| **Count complete tree nodes** | compare leftmost and rightmost heights; if equal it's perfect (`2^h - 1`), else recurse: O(log² n) |

```python
def max_path_sum(root):
    best = float('-inf')
    def down(node):
        nonlocal best
        if not node: return 0
        l, r = max(down(node.left), 0), max(down(node.right), 0)
        best = max(best, node.val + l + r)       # path bending through node
        return node.val + max(l, r)              # path continuing upward
    down(root)
    return best
```

---

## 3. Graphs, advanced

### 3.1 Shortest paths

| Algorithm | Graph | Complexity | Notes |
|---|---|---|---|
| BFS | unweighted | O(V+E) | 0-1 BFS with a deque for weights 0/1 |
| Dijkstra | non-negative weights | O((V+E) log V) | priority queue; skip stale entries |
| **Bellman-Ford** | negative weights allowed | O(V·E) | relax all edges V−1 times; one more pass that still relaxes means a **negative cycle** |
| **Floyd-Warshall** | all pairs | O(V³) | `d[i][j] = min(d[i][j], d[i][k] + d[k][j])` over intermediates k |
| **A\*** | with heuristic | ≤ Dijkstra | `f = g + h`; with an admissible h (never overestimates) it stays optimal |
| **Bidirectional BFS** | unweighted, known target | ~O(b^(d/2)) | search from both ends and meet in the middle |

```python
def bellman_ford(n, edges, src):
    dist = [float('inf')] * n; dist[src] = 0
    for _ in range(n - 1):
        for u, v, w in edges:
            if dist[u] + w < dist[v]: dist[v] = dist[u] + w
    if any(dist[u] + w < dist[v] for u, v, w in edges):
        raise ValueError('negative cycle')
    return dist
```

### 3.2 Structure algorithms

- **Strongly connected components:** *Kosaraju* (DFS for finish order, then DFS on the reversed graph in reverse finish order) or *Tarjan* (single DFS with discovery times and low-link values, nodes on a stack).
- **Articulation points and bridges:** DFS with `disc[u]` and `low[u]`. Edge (u,v) is a bridge if `low[v] > disc[u]`; u is an articulation point if `low[v] >= disc[u]` for some child (root: ≥ 2 children).
- **Minimum spanning tree:** *Kruskal* sorts edges and uses union-find (good for sparse graphs); *Prim* grows from a vertex with a heap (good for dense graphs). Both are greedy and correct by the cut property.
- **Max flow:** *Ford-Fulkerson* augments along residual paths; *Edmonds-Karp* uses BFS for O(V·E²). **Max-flow = min-cut.** Bipartite matching is a max-flow problem.
- **Representations:** adjacency matrix (O(1) edge test, O(V²) space, dense graphs, Floyd-Warshall), adjacency list (O(V+E), sparse graphs, most algorithms), edge list (Kruskal). **Implicit graphs** (grids, word ladders, puzzle states) are generated on the fly.

> **Asked as:** "When does Dijkstra fail and what do you use instead?" · "Find critical connections in a network." · "Kruskal vs Prim?"

---

## 4. Dynamic programming, advanced

### 4.1 Pattern catalogue

| Family | State and transition |
|---|---|
| 0/1 knapsack | `dp[w] = max(dp[w], dp[w - wt] + val)` iterating **w downward** |
| Unbounded knapsack / coin change | same but iterate **w upward** |
| Fractional knapsack | greedy by value/weight, not DP |
| Edit distance | `dp[i][j] = min(del, ins, replace)` on prefixes |
| LCS / distinct subsequences | 2D over prefixes of both strings |
| Palindromes | expand around centre O(n²); **Manacher** O(n) for longest palindromic substring; subsequence via `dp[i][j]` on intervals |
| Stock problems | state machine: hold / not hold (+ cooldown, + k transactions, + fee) |
| Game theory | `dp[i][j]` = best score difference the current player can force (stone game, predict the winner) |

### 4.2 Designing state

A good state is **sufficient** (you can make the next decision from it) and **minimal** (no redundant dimension). Add a dimension when a constraint matters (transactions left, last colour used); remove one when the transition only looks one step back (Fibonacci needs only the last two values).

### 4.3 Optimisations

- **Space:** 2D → 1D rolling arrays when row *i* depends only on row *i−1*.
- **Bitmask DP:** `dp[mask][i]` over subsets, e.g. travelling salesman in O(2ⁿ·n²) for n ≤ 20.
- **Digit DP:** count numbers in [L, R] with a property; state = (position, tight flag, accumulated property); answer `f(R) − f(L−1)`.
- **Divide-and-conquer DP / convex hull trick:** speed up transitions with monotonic optimal split points or linear functions (competitive-programming territory; mention, don't implement, in most interviews).

```python
def tsp(dist):
    n = len(dist); FULL = 1 << n
    dp = [[float('inf')] * n for _ in range(FULL)]; dp[1][0] = 0
    for mask in range(FULL):
        for u in range(n):
            if dp[mask][u] == float('inf') or not mask & (1 << u): continue
            for v in range(n):
                if mask & (1 << v): continue
                nm = mask | (1 << v)
                dp[nm][v] = min(dp[nm][v], dp[mask][u] + dist[u][v])
    return min(dp[FULL - 1][v] + dist[v][0] for v in range(n))
```

---

## 5. Bits and maths

| Trick | Code |
|---|---|
| Clear lowest set bit (Brian Kernighan) | `n &= n - 1` → popcount in O(set bits) |
| Power of two | `n > 0 and n & (n - 1) == 0` |
| Lowest set bit | `n & -n` |
| Single number | XOR everything: `a ^ a = 0`, `a ^ 0 = a` |
| Iterate subsets of a mask | `sub = mask; while sub: ...; sub = (sub - 1) & mask` |

```python
def sieve(n):                                   # primes ≤ n in O(n log log n)
    is_p = [True] * (n + 1); is_p[0:2] = [False, False]
    for i in range(2, int(n ** 0.5) + 1):
        if is_p[i]:
            is_p[i*i::i] = [False] * len(is_p[i*i::i])
    return [i for i, p in enumerate(is_p) if p]

def power_mod(a, b, m):                         # fast exponentiation O(log b)
    r = 1; a %= m
    while b:
        if b & 1: r = r * a % m
        a = a * a % m; b >>= 1
    return r

def ext_gcd(a, b):                              # returns g, x, y with ax + by = g
    if b == 0: return a, 1, 0
    g, x, y = ext_gcd(b, a % b)
    return g, y, x - (a // b) * y
```

Trial division up to √n factorises small numbers; Pollard's rho handles large ones. `lcm(a, b) = a // gcd(a, b) * b`. A segmented sieve handles ranges when n is too large for memory.

**Kadane's algorithm** (maximum subarray) is the simplest DP to remember: `cur = max(x, cur + x); best = max(best, cur)`.

---

## 6. Complexity analysis, deeper

- **Master theorem** for `T(n) = a·T(n/b) + f(n)`: compare f(n) with n^(log_b a). Merge sort: a=2, b=2, f=n → Θ(n log n). Binary search: a=1, b=2, f=1 → Θ(log n).
- **Amortised analysis:** dynamic array append is O(1) amortised because doubling makes the total copy cost O(n); union-find with path compression + union by rank is O(α(n)) per operation.
- **Space:** count auxiliary space separately from input; recursion depth is stack space (DFS on a skewed tree is O(n)).
