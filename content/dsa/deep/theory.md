---
id: dsa-deep-theory
track: theory
---

# DSA — Deep: Theory

> Depth-first lessons with practical examples (migrated from SWE Forge deep track).

## Data Structures

*Why this matters:* production failure modes and trade-offs — not slogans. Read sections in order, then try the quiz/problems on the topic hub.

### Arrays & Lists

Array (int[]): fixed size, O(1) random access, O(n) insert/delete (shifting). Use when size is known.
ArrayList: dynamic array, O(1) amortized add to end, O(n) insert/delete in middle. Default choice for lists.
LinkedList: doubly-linked nodes. O(1) add/remove at head/tail, O(n) search/random access. Use as Deque for queue/stack, not as general list.

Rule: default to ArrayList. Use LinkedList only when you need frequent O(1) head/tail operations with no random access.

### Stack, Queue & PriorityQueue

Stack (LIFO): use ArrayDeque, NOT the Stack class (legacy, synchronized overhead).
Use cases: undo/redo, call stack simulation, DFS, expression evaluation, balanced parentheses.

Queue (FIFO): use ArrayDeque or LinkedList as Queue.
Use cases: BFS, task scheduling, producer-consumer, breadth-first traversal.

PriorityQueue: min-heap by default. O(log n) offer/poll, O(1) peek.
Max-heap: new PriorityQueue<>((a, b) -> b - a)
Use cases: Dijkstra's algorithm, Top-K problems, priority task queues.

### HashMap — Internals

HashMap: array of buckets. key.hashCode() → bucket index. O(1) avg get/put.
Collision: multiple keys in same bucket → LinkedList (Java 7) → Red-Black Tree when bucket > 8 entries (Java 8+).
Load factor 0.75: rehash (double capacity) when 75% full. O(n) operation — expensive.

Critical: always override BOTH hashCode() AND equals() for custom keys.
Rule: if equals() returns true → hashCode() MUST return the same value.

TreeMap: Red-Black Tree. Sorted keys. O(log n) all operations. Use for range queries.
LinkedHashMap: insertion-order or access-order. Use for LRU cache implementation.
ConcurrentHashMap: thread-safe, segment locking. Use in multi-threaded Spring services.

### Trees & Graphs

BST: left < root < right. O(log n) avg, O(n) worst (degenerate/skewed tree).
Traversals: In-order = sorted output. Pre-order = copy tree. Post-order = delete tree.
Heap: complete binary tree in array. Min-heap: parent ≤ children. Java's PriorityQueue.
Trie: prefix tree, O(L) operations (L = word length). Autocomplete, IP routing, spell check.

Graphs:
Adjacency List: Map<Node, List<Node>>. Sparse graphs. O(V+E) space.
Adjacency Matrix: boolean[][]. Dense graphs. O(V²) space, O(1) edge lookup.
BFS: Queue-based, level-by-level, finds shortest path in unweighted graphs.
DFS: Stack/recursion, finds connected components, detects cycles.

### Practical code

```
// Key Java collection idioms

// 1. computeIfAbsent — group items by key cleanly
Map<String, List<Order>> byStatus = new HashMap<>();
orders.forEach(o ->
    byStatus.computeIfAbsent(o.getStatus().name(), k -> new ArrayList<>())
            .add(o));

// 2. TreeMap — sorted keys + range queries
TreeMap<LocalDate, BigDecimal> dailySales = new TreeMap<>();
// All entries in a date range (inclusive both ends)
NavigableMap<LocalDate, BigDecimal> week =
    dailySales.subMap(monday, true, sunday, true);
// Nearest entry before a given date
Map.Entry<LocalDate, BigDecimal> prev = dailySales.lowerEntry(today);

// 3. LinkedHashMap as LRU Cache (access-order mode)
Map<Long, UserDTO> lru = new LinkedHashMap<>(128, 0.75f, true) {
    @Override
    protected boolean removeEldestEntry(Map.Entry<Long, UserDTO> e) {
        return size() > 100; // auto-evict least-recently-accessed entry
    }
};

// 4. PriorityQueue — always pop minimum-cost node (Dijkstra)
// int[] = {nodeId, distanceFromSource}
PriorityQueue<int[]> pq =
    new PriorityQueue<>(Comparator.comparingInt(a -> a[1]));
pq.offer(new int[]{startNode, 0});
while (!pq.isEmpty()) {
    int[] cur = pq.poll(); // minimum-distance unvisited node
    int node = cur[0], dist = cur[1];
    // process neighbors...
}

// 5. ArrayDeque as Stack AND Queue (preferred over Stack/LinkedList)
Deque<String> stack = new ArrayDeque<>();
stack.push("a"); stack.push("b");
String top = stack.pop();    // "b" — LIFO

Deque<String> queue = new ArrayDeque<>();
queue.offer("a"); queue.offer("b");
String front = queue.poll(); // "a" — FIFO
```

### Tips

- Always state time AND space complexity — interviewers want both. Big O alone is incomplete.
- HashMap collision: two different keys can map to the same bucket. Java 8+ converts bucket to Red-Black Tree when it has >8 entries.
- Never use Stack class — use ArrayDeque. Never use Vector — use ArrayList. Both are legacy synchronized classes.
- ConcurrentHashMap for thread-safe maps in Spring services, NOT Collections.synchronizedMap() (full lock vs segment lock)
