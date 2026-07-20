---
id: dsa-deep-best-practices
track: best-practices
---

# DSA — Deep: Best Practices

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Algorithms

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Big O Complexity

Describes how runtime/space GROWS with input size n.

O(1):        constant    — HashMap.get(), array[i]
O(log n):    logarithmic — binary search, balanced BST operations
O(n):        linear      — single loop, array scan
O(n log n):  efficient   — merge sort, heap sort (optimal for comparison-based sort)
O(n²):       quadratic   — nested loops, bubble/selection sort (avoid for n > 10,000)
O(2ⁿ):       exponential — naive recursion without memoization

Rules: drop constants (O(2n) → O(n)), drop lower terms (O(n² + n) → O(n²)).
Always analyze BOTH time AND space. Recursion depth = O(depth) stack space.

### Sorting Algorithms

Merge Sort: O(n log n) always. Stable. O(n) extra space. Divide → sort halves → merge. Good for linked lists.
Quick Sort: O(n log n) avg, O(n²) worst (sorted input + bad pivot). In-place. Cache-friendly. Java Arrays.sort() uses dual-pivot Quicksort.
Heap Sort: O(n log n) always, O(1) extra space. Not cache-friendly.
Timsort (Java Collections.sort()): hybrid merge + insertion. Stable. O(n) best case when nearly sorted.
Counting/Radix Sort: O(n+k) non-comparison sort for integer keys in small range. O(nk) for Radix.

### Binary Search Variants

Classic: find element in sorted array. O(log n).
Always use: mid = left + (right - left) / 2 — avoids integer overflow.

Variants (all O(log n)):
• First occurrence: when arr[mid] == target, save mid and go LEFT (right = mid - 1)
• Last occurrence: when arr[mid] == target, save mid and go RIGHT (left = mid + 1)
• Rotated sorted array: identify which half is sorted, choose correct half

Binary search on ANSWER SPACE (advanced):
When you can express "is X a valid answer? true/false" for a monotonic condition → binary search on X.
Example: "minimum days to ship all packages" — binary search days (1 → max). Check if feasible.

### Dynamic Programming

When to use: overlapping subproblems + optimal substructure.

Memoization (top-down): recursive + HashMap/array cache. Natural recursion structure. Only solves needed subproblems.
Tabulation (bottom-up): iterative DP table. No recursion overhead. Often space-optimizable with rolling array.

Standard approach: solve recursively → identify overlapping calls → add memoization → convert to tabulation.

Classic patterns: Fibonacci, Coin Change, 0/1 Knapsack, Longest Common Subsequence, Longest Increasing Subsequence, Edit Distance, Matrix Chain Multiplication.

### Practical code

```
// Core algorithm implementations

// 1. Binary Search — FIRST occurrence
public int firstOccurrence(int[] arr, int target) {
    int left = 0, right = arr.length - 1, result = -1;
    while (left <= right) {
        int mid = left + (right - left) / 2; // overflow-safe
        if (arr[mid] == target) {
            result = mid;
            right = mid - 1; // keep looking LEFT for first occurrence
        } else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return result; // -1 if not found
}

// 2. Merge Sort — O(n log n) stable sort
public void mergeSort(int[] arr, int l, int r) {
    if (l >= r) return;
    int mid = l + (r - l) / 2;
    mergeSort(arr, l, mid);
    mergeSort(arr, mid + 1, r);
    merge(arr, l, mid, r); // merge two sorted halves
}

// 3. DP — Coin Change (minimum coins to make amount)
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];
    Arrays.fill(dp, amount + 1);  // initialize with "infinity"
    dp[0] = 0;
    for (int i = 1; i <= amount; i++)
        for (int coin : coins)
            if (coin <= i) dp[i] = Math.min(dp[i], dp[i - coin] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}

// 4. BFS — shortest path, level-by-level
public int bfsShortestPath(Map<Integer, List<Integer>> graph, int src, int dst) {
    Queue<Integer> q = new LinkedList<>();
    Set<Integer> visited = new HashSet<>();
    q.offer(src); visited.add(src);
    int steps = 0;
    while (!q.isEmpty()) {
        int size = q.size(); // freeze current level
        for (int i = 0; i < size; i++) {
            int node = q.poll();
            if (node == dst) return steps;
            for (int nb : graph.getOrDefault(node, List.of()))
                if (visited.add(nb)) q.offer(nb); // add() returns false if already present
        }
        steps++;
    }
    return -1;
}
```

### Tips

- State Big O BEFORE coding in interviews — it shows you think about efficiency first, not as an afterthought
- Binary search applies to ANY monotonic predicate, not just sorted arrays. 'Minimize maximum' and 'maximize minimum' problems → binary search on the answer space.
- DP process: recursive brute force → identify overlapping calls → add memoization → convert to tabulation. Show this progression.
- BFS = shortest path in unweighted graphs. Dijkstra = shortest path in weighted. Know when each applies.

## Problem Solving

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Structured Framework

1. Understand (2 min): read twice. Identify inputs, outputs, constraints, edge cases. Ask: "Is input always sorted?", "Can values be negative?", "What if no solution exists?", "Are values unique?"

2. Examples (2 min): trace 2-3 cases manually. Include: normal case, edge case (empty/single element/zero), tricky case (duplicates, max values, negatives).

3. Plan (3 min): brute force first, then optimize.
Say: "Brute force: O(n²). I can improve with a HashMap — O(n) time, O(n) space. Let me go with the optimized approach."

4. Code (10-15 min): clean code, meaningful variable names. Narrate as you write.

5. Test (3 min): dry-run your examples. Fix bugs explicitly.

6. Analyze: "Time O(n), space O(n). Can we reduce space? Tradeoff would be higher time complexity."

### Must-Know Patterns

Sliding Window: variable/fixed window over array/string.
When: max sum of k elements, longest substring with constraint, minimum subarray with sum ≥ target.

Two Pointers: from both ends or same direction.
When: sorted array pair sum, palindrome check, remove duplicates.

Fast & Slow Pointers: two speeds.
When: detect cycle in linked list, find middle node.

Merge Intervals: sort by start, merge overlapping.
When: calendar free slots, meeting rooms, insert interval.

Binary Search on Answer: search the answer space, not the array.
When: "minimum X such that condition Y holds" (monotonic property).

BFS: level-by-level. When: shortest path/hops, minimum steps, word ladder.
DFS: depth-first. When: all paths, connected components, cycle detection, topological sort.

DP: overlapping subproblems. When: "how many ways", "min cost", "max value" with choices.
Backtracking: try all, undo on dead end. When: permutations, combinations, N-Queens.

### Interview Communication

Think out loud — interviewers evaluate your PROCESS, not just the final answer.
"I'm thinking HashMap here because we need O(1) lookup for the complement value..."

State complexity BEFORE coding: "My approach is O(n) time and O(n) space."

When stuck: "Let me start with the brute force approach and see if a pattern emerges that helps me optimize." Never go silent for 5+ minutes.

On edge cases: "Let me also consider the case where the array is empty..." Shows thoroughness.

After coding: "Let me trace through my example: i=0, complement=7, seen={}... i=1, complement=2, seen has key 2 → return [0,1]. Correct."

STAR Method for behavioral questions:
S: Situation — brief context (1-2 sentences)
T: Task — what you needed to achieve
A: Action — what YOU specifically did (use "I", not "we")
R: Result — quantify if possible ("response time: 8s → 340ms, 97% improvement")

### Building Intuition

Practice deliberately: after solving, ask WHY this approach works. What's the key insight that makes it efficient?

Pattern triggers to memorize:
"Find pair summing to X" → HashMap or Two Pointers (if sorted)
"Minimum hops/steps from A to B" → BFS
"All valid combinations or subsets" → Backtracking
"Maximum/minimum of subarray" → Sliding Window
"Optimal value with limited capacity" → DP 0/1 Knapsack
"Sort + merge overlapping ranges" → Intervals pattern
"Dependency ordering" → Topological Sort

From your Codeforces experience: this transfers directly. 80+ problems = strong intuition foundation. Interview difference: communicate your thought process, write cleaner code, handle edge cases explicitly.

Real-world problem solving is the same skill:
Debugging production issue = reproduce → isolate → hypothesize → test → fix.
Designing a feature = decompose → edge cases → prototype → test → iterate.

### Practical code

```
// Two Sum — full interview thought process documented

// Understand: int[] nums, int target → return indices of two numbers summing to target.
// Exactly one solution. Cannot reuse the same element.
// Examples: [2,7,11,15] target=9 → [0,1].  [3,2,4] target=6 → [1,2]

// Plan 1 — Brute force O(n²): check every pair
public int[] twoSumBrute(int[] nums, int target) {
    for (int i = 0; i < nums.length; i++)
        for (int j = i + 1; j < nums.length; j++)
            if (nums[i] + nums[j] == target) return new int[]{i, j};
    return new int[]{};
}

// Plan 2 — Optimize with HashMap: O(n) time, O(n) space
// Insight: for each nums[i], I need (target - nums[i]).
//          Store what I've seen in a HashMap → O(1) lookup.

public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>(); // value → index

    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];

        if (seen.containsKey(complement)) {
            return new int[]{seen.get(complement), i}; // found!
        }
        seen.put(nums[i], i); // store for future lookups
    }
    return new int[]{};
}

// Trace: [2,7,11,15], target=9
// i=0: complement=7, seen={}, put {2→0}
// i=1: complement=2, seen has 2 at index 0 → return [0,1] ✓

// ── STAR method — real story from eGeneration ─────────────
/*
Q: "Tell me about a complex technical problem you solved."

S: At eGeneration, our Popular Diagnostic Center patient
   report API was responding in 8+ seconds for patients
   with long test histories.

T: Reduce response time to under 1 second without changing
   the API contract or breaking existing integrations.

A: I enabled spring.jpa.show-sql=true and discovered N+1
   queries — one query per test result (up to 400 queries
   per request). I fixed it with JOIN FETCH in JPQL, added
   a composite index on (patient_id, created_at DESC), and
   added Redis caching with a 15-minute TTL for frequently
   accessed reports.

R: Response time dropped from 8.3s to 280ms — a 97%
   improvement. DB load reduced by 85%. Zero API changes.
*/
```

### Tips

- A correct O(n²) solution with clear narration beats an incomplete O(n) solution. Correctness + communication comes before optimization.
- Pattern matching is trainable: after 50+ problems you start recognizing patterns in the first 30 seconds. Deliberate practice is the path.
- Your 80+ Codeforces problems are a genuine asset — mention it. It shows sustained, structured algorithmic thinking over time.
- Build real STAR stories from your eGeneration work: the N+1 fix, bKash integration, or eG-Health microservices give you concrete, quantified examples
