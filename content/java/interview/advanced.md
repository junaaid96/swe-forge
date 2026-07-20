---
id: java-interview-advanced
level: advanced
---

# Java — Interview (Advanced)

# Java Core — Miscellaneous (Q109–Q133)

Topics: arrays, enums, varargs, assertions, garbage collection, initialization blocks, tokenizing, and serialization.

---

## Q109. What are the default values of array elements in Java?

**Answer**

When you declare an array without explicitly initializing each element, Java fills every slot with the **default value** for that component type:

| Type | Default |
|------|---------|
| `byte`, `short`, `int`, `long` | `0` |
| `float`, `double` | `0.0` |
| `char` | `'\u0000'` (null character) |
| `boolean` | `false` |
| Object reference types | `null` |

This applies to both local arrays (if you use `new`) and instance/static arrays. A **declared but uninitialized** local array variable (e.g., `int[] arr;`) has no array object yet — you cannot read `arr[0]` until `arr` is assigned.

**Example**

```java
public class ArrayDefaults {
    static int[] staticInts;          // all 0
    String[] staticRefs;                // all null

    public static void main(String[] args) {
        int[] nums = new int[3];        // [0, 0, 0]
        boolean[] flags = new boolean[2]; // [false, false]
        String[] names = new String[2]; // [null, null]

        System.out.println(Arrays.toString(nums));   // [0, 0, 0]
        System.out.println(Arrays.toString(flags));  // [false, false]
        System.out.println(Arrays.toString(staticInts)); // [0, 0, 0]
    }
}
```

**Key takeaway:** Arrays are always zero-initialized at creation time; reference slots are `null`, not empty strings or zero-length objects.

---

## Q110. What is the enhanced for-loop (for-each) and when should you use it?

**Answer**

The **enhanced for-loop** (`for (Type item : collection)`) iterates over any **Iterable** or array without manual index management. It is syntactic sugar over an iterator internally.

Use it when you need to **read every element** in order and do not need the index, to remove elements mid-iteration, or to modify the collection structure. For indexed access, parallel updates, or reverse traversal, use a classic `for` loop or `ListIterator`.

**Example**

```java
List<String> cities = List.of("Dhaka", "Chittagong", "Sylhet");

// Enhanced for — clean read-only iteration
for (String city : cities) {
    System.out.println(city);
}

// Works on arrays too
int[] scores = {90, 85, 92};
for (int score : scores) {
    System.out.println(score);
}

// Cannot modify underlying list size during for-each
// cities.remove(city); // ConcurrentModificationException if list is modifiable
```

**Key takeaway:** Enhanced for is ideal for simple, read-only traversal; it hides the iterator but does not give you an index or safe removal on most collections.

---

## Q111. How do you print an array's contents in Java?

**Answer**

Calling `array.toString()` on a primitive or object array prints the **object identity** (e.g., `[I@1b6d3586`), not the elements. Use **`Arrays.toString()`** for one-dimensional arrays and **`Arrays.deepToString()`** for nested (multi-dimensional) arrays.

For collections, prefer the collection's own `toString()` (e.g., `list.toString()`).

**Example**

```java
int[] nums = {1, 2, 3};
System.out.println(nums);                    // [I@...
System.out.println(Arrays.toString(nums));   // [1, 2, 3]

String[] names = {"Alice", "Bob"};
System.out.println(Arrays.toString(names));  // [Alice, Bob]

int[][] matrix = {{1, 2}, {3, 4}};
System.out.println(Arrays.toString(matrix));      // [[I@..., [I@...]
System.out.println(Arrays.deepToString(matrix));  // [[1, 2], [3, 4]]
```

**Key takeaway:** Always use `Arrays.toString` / `deepToString` for debugging arrays; never rely on the array's inherited `Object.toString()`.

---

## Q112. How do you compare arrays — `Arrays.equals` vs `==`?

**Answer**

| Operator / Method | What it compares |
|-------------------|------------------|
| `==` | **Reference equality** — same array object in memory |
| `Arrays.equals(a, b)` | **Element-by-element** equality (uses `equals` for objects) |
| `Arrays.deepEquals(a, b)` | Deep equality for nested arrays |

Two arrays with identical content but created separately are **not** `==` equal.

**Example**

```java
int[] a = {1, 2, 3};
int[] b = {1, 2, 3};
int[] c = a;

System.out.println(a == b);              // false — different objects
System.out.println(a == c);              // true  — same reference
System.out.println(Arrays.equals(a, b)); // true  — same elements

String[] s1 = {"x", "y"};
String[] s2 = {"x", "y"};
System.out.println(Arrays.equals(s1, s2)); // true
```

**Key takeaway:** Use `==` only when you care whether two variables point to the **same** array; use `Arrays.equals` (or `deepEquals`) for **content** comparison.

---

## Q113. What are enums in Java and why use them instead of constants?

**Answer**

An **enum** defines a fixed set of named constants that are **type-safe singleton instances** of the enum class. Enums can have fields, constructors, methods, and even implement interfaces.

Advantages over `public static final int` constants:
- Compile-time type checking (cannot pass arbitrary int)
- Built-in `values()`, `valueOf()`, `ordinal()`, `name()`
- Safe switch targets
- Singleton semantics per constant

**Example**

```java
public enum OrderStatus {
    PENDING("Waiting for payment"),
    PAID("Payment confirmed"),
    SHIPPED("On the way");

    private final String description;

    OrderStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}

// Usage
OrderStatus status = OrderStatus.PAID;
System.out.println(status.name());         // PAID
System.out.println(status.getDescription()); // Payment confirmed
```

**Key takeaway:** Enums model closed sets of domain values with type safety; they are full classes, not mere integer codes.

---

## Q114. How does `switch` work with enums?

**Answer**

Since Java 5, `switch` accepts **enum constants**. The compiler verifies that cases are valid enum values. With Java 12+ **switch expressions**, you can assign a result directly.

Best practice: cover all enum constants or include a `default` only when handling unknown/external input (e.g., after `valueOf`).

**Example**

```java
public enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }

public String typeOfDay(Day day) {
    return switch (day) {
        case SAT, SUN -> "Weekend";
        case MON, TUE, WED, THU, FRI -> "Weekday";
    }; // exhaustive — no default needed
}

// Classic switch
switch (day) {
    case MON -> System.out.println("Start of week");
    case FRI -> System.out.println("Almost weekend");
    default  -> System.out.println("Midweek");
}
```

**Key takeaway:** Enum switches are compile-time checked; prefer exhaustive switch expressions when every constant has defined behavior.

---

## Q115. What are varargs (variable-length arguments)?

**Answer**

Varargs let a method accept **zero or more** arguments of a specified type using `Type... name`. Inside the method, the parameter is treated as an **array**.

Rules:
- Only **one** varargs parameter per method
- It must be the **last** parameter
- You can pass an array or individual arguments

Overloading with varargs and arrays can cause ambiguity — prefer clear method names.

**Example**

```java
public static int sum(int... numbers) {
    int total = 0;
    for (int n : numbers) {
        total += n;
    }
    return total;
}

System.out.println(sum());           // 0
System.out.println(sum(1, 2, 3));    // 6
System.out.println(sum(new int[]{4, 5})); // 9

// With other parameters — varargs last
public static void log(String level, String... messages) {
    for (String msg : messages) {
        System.out.println(level + ": " + msg);
    }
}
```

**Key takeaway:** Varargs simplify APIs that accept variable argument counts; they compile to arrays and must be the final parameter.

---

## Q116. When and how should you use assertions in Java?

**Answer**

**Assertions** (`assert condition : message`) verify **invariants** during development — conditions that should never fail if the code is correct. They are **not** a substitute for validating public API input (use exceptions for that).

| Aspect | Detail |
|--------|--------|
| When to use | Internal sanity checks, post-conditions, unreachable-code detection |
| When NOT to use | User input validation, production business logic control flow |
| Enable | `-ea` or `-enableassertions` JVM flag; disabled by default |
| Disable | `-da` |

Assertions must not have side effects you rely on in production, because they may be stripped out when disabled.

**Example**

```java
public class Account {
    private double balance;

    public void withdraw(double amount) {
        assert amount > 0 : "amount must be positive"; // dev-time check
        balance -= amount;
        assert balance >= 0 : "balance invariant violated";
    }
}

// Run with: java -ea Account
```

**Key takeaway:** Assertions are a development aid for catching programmer errors early; enable with `-ea` and never depend on them for production correctness.

---

## Q117. How does Garbage Collection work in Java? Show a basic example.

**Answer**

Java GC **automatically reclaims memory** occupied by objects that are no longer **reachable** from GC roots (stack frames, static fields, JNI references, etc.). Programmers do not call `delete`; they null out references or let variables go out of scope.

Typical generational model (HotSpot):
- **Young generation** (Eden + Survivors): short-lived objects; minor GC
- **Old generation**: long-lived objects; major/full GC
- Collectors: G1 (default Java 9+), ZGC, Shenandoah (low-latency options)

**Example**

```java
public class GcExample {
    public static void main(String[] args) {
        for (int i = 0; i < 1_000_000; i++) {
            byte[] chunk = new byte[1024]; // short-lived
            // chunk becomes unreachable each iteration
        }
        // Minor GC reclaims young-gen objects automatically

        Runtime rt = Runtime.getRuntime();
        System.out.println("Free memory: " + rt.freeMemory());
        System.gc(); // merely a HINT — not guaranteed to run GC immediately
    }
}
```

**Key takeaway:** GC tracks reachability, not reference counts; you influence GC by dropping references and avoiding unnecessary object retention.

---

## Q118. When does Garbage Collection run?

**Answer**

There is **no deterministic schedule**. The JVM decides based on:

1. **Heap pressure** — allocation failure in Eden triggers minor GC
2. **Generational promotion** — surviving objects move to old gen; old gen full triggers major GC
3. **Explicit hint** — `System.gc()` (ignored in production best practice)
4. **JVM-specific triggers** — metaspace pressure, humongous objects (G1), etc.

You cannot force a full GC reliably from application code. Tuning flags (`-Xms`, `-Xmx`, collector choice) affect frequency and pause times.

**Example**

```java
List<byte[]> hoard = new ArrayList<>();
try {
    while (true) {
        hoard.add(new byte[10_000_000]); // fills heap → eventual OutOfMemoryError
    }
} catch (OutOfMemoryError oom) {
    hoard = null;           // drop strong references
    System.gc();            // hint only — JVM may GC later
}
```

**Key takeaway:** GC is demand-driven by heap usage and collector heuristics; treat `System.gc()` as a suggestion, not a command.

---

## Q119. What are GC best practices for production Java applications?

**Answer**

| Practice | Why |
|----------|-----|
| Avoid unnecessary object creation in hot loops | Reduces allocation rate and GC churn |
| Reuse objects carefully ( pools, buffers) | Lowers pressure — but don't pool everything |
| Clear references when done (`null` fields, remove from collections) | Prevents memory leaks of unreachable-but-referenced objects |
| Use try-with-resources / close streams | Native buffers and sockets need explicit cleanup |
| Watch for **memory leaks** (static maps, ThreadLocal, listeners) | Leaks are "reachable forever," GC cannot help |
| Choose appropriate collector and heap size | G1/ZGC for latency-sensitive services |
| Do NOT call `System.gc()` in production | Causes stop-the-world pauses unpredictably |
| Profile with VisualVM, JFR, async-profiler | Measure before tuning |

**Example — leak vs healthy pattern**

```java
// LEAK: static cache grows forever
static Map<String, byte[]> cache = new HashMap<>();

// BETTER: bounded cache with eviction (Caffeine, Guava)
// or WeakReference when appropriate

// GOOD: scoped reference
public void process() {
    byte[] buffer = new byte[8192];
    // use buffer — eligible for GC when method returns
}
```

**Key takeaway:** Write GC-friendly code by minimizing allocations, releasing references, and fixing logical leaks — tuning the JVM comes after measurement.

---

## Q120. What are initialization blocks in Java?

**Answer**

Initialization blocks run **every time an object is created** (instance blocks) or **once when the class is loaded** (static blocks). They fill the gap between field declarations and constructors for shared setup logic.

**Order of execution** when creating an instance:
1. Static fields and **static initializer blocks** (once per class load)
2. Instance fields and **instance initializer blocks** (in source order)
3. Constructor body

**Example**

```java
public class Demo {
    static { System.out.println("1: static block"); }
    { System.out.println("2: instance block"); }

    public Demo() {
        System.out.println("3: constructor");
    }

    public static void main(String[] args) {
        new Demo(); // prints 1 (first time only), then 2, 3
        new Demo(); // prints 2, 3
    }
}
```

**Key takeaway:** Init blocks factor common setup out of constructors; know the static → instance → constructor order for interview questions and debugging.

---

## Q121. What is a static initializer block?

**Answer**

A **static initializer** (`static { ... }`) runs **once** when the class is first loaded by the JVM (before any instance of that class is created). Use it for expensive one-time setup: loading config, registering drivers, initializing static maps.

If a static field has a complex initializer, the static block is an alternative when statements are needed (loops, try/catch).

**Example**

```java
public class ConfigLoader {
    private static final Map<String, String> CONFIG;

    static {
        CONFIG = new HashMap<>();
        try (InputStream in = ConfigLoader.class.getResourceAsStream("/app.properties")) {
            Properties props = new Properties();
            props.load(in);
            props.forEach((k, v) -> CONFIG.put(k.toString(), v.toString()));
        } catch (IOException e) {
            throw new ExceptionInInitializerError(e);
        }
    }
}
```

**Key takeaway:** Static blocks execute exactly once at class initialization; failure throws `ExceptionInInitializerError` and the class remains unusable.

---

## Q122. What is an instance initializer block?

**Answer**

An **instance initializer** (`{ ... }` at class body level) runs **before every constructor** in the same class, in declaration order among other instance fields/blocks. Useful when multiple constructors share setup code.

Anonymous classes can only use instance initializers (no named constructors).

**Example**

```java
public class Employee {
    private final String id;
    private final LocalDate created;

    {
        created = LocalDate.now(); // shared by all constructors
    }

    public Employee(String id) {
        this.id = id;
    }

    public Employee(String id, boolean dummy) {
        this(id); // instance block already ran before this constructor chain
    }
}
```

**Key takeaway:** Instance blocks deduplicate constructor preamble; they run afresh for each `new`, immediately before the matching constructor.

---

## Q123. How do you tokenize strings — `StringTokenizer` vs `String.split`?

**Answer**

| Approach | Notes |
|----------|-------|
| `String.split(regex)` | Modern default; splits on regex; trailing empty strings may be dropped unless limit used |
| `StringTokenizer` | Legacy class; splits on delimiter **characters** (not full regex); not recommended for new code |
| `Scanner` | Flexible for streaming parse of mixed types |
| `Pattern.splitAsStream` | Lazy stream-based splitting |

`split` treats metacharacters as regex (escape with `\\.` for literal dot). Use `split(",", -1)` to preserve trailing empty tokens.

**Example**

```java
String csv = "apple,banana,,orange";

// String.split — preferred
String[] parts = csv.split(",", -1);
System.out.println(Arrays.toString(parts));
// [apple, banana, , orange]

// StringTokenizer — legacy
StringTokenizer st = new StringTokenizer(csv, ",");
List<String> tokens = new ArrayList<>();
while (st.hasMoreTokens()) {
    tokens.add(st.nextToken());
}
// Does not produce empty token for consecutive commas the same way

// Regex-aware
"a.b.c".split("\\."); // [a, b, c]
```

**Key takeaway:** Prefer `String.split` with careful regex escaping; treat `StringTokenizer` as historical API knowledge for interviews.

---

## Q124. How does Java serialization work (`Serializable`, `ObjectOutputStream` / `ObjectInputStream`)?

**Answer**

**Serialization** converts an object graph into a byte stream for storage or transmission. **Deserialization** rebuilds objects from bytes.

Requirements:
- Class must implement **`java.io.Serializable`** (marker interface, no methods)
- Use **`ObjectOutputStream.writeObject()`** and **`ObjectInputStream.readObject()`**
- All non-transient fields must be serializable or null
- Declare **`serialVersionUID`** for version compatibility

**Example**

```java
public class User implements Serializable {
    private static final long serialVersionUID = 1L;
    private String username;
    private transient String sessionToken; // see Q126

    public User(String username) { this.username = username; }
}

// Write
try (ObjectOutputStream out = new ObjectOutputStream(
        new FileOutputStream("user.ser"))) {
    out.writeObject(new User("alice"));
}

// Read
try (ObjectInputStream in = new ObjectInputStream(
        new FileInputStream("user.ser"))) {
    User restored = (User) in.readObject();
}
```

**Key takeaway:** Serialization is built into Java IO via marker interface + object streams; always define `serialVersionUID` and consider security implications of deserializing untrusted data.

---

## Q125. What is partial serialization using `transient`?

**Answer**

Fields marked **`transient`** are **skipped** during default serialization. After deserialization they receive default values (`null`, `0`, `false`) unless you restore them in custom `readObject`, a constructor, or initializer logic.

Use `transient` for:
- Derived/cache data recomputable after load
- Sensitive data (passwords, tokens) — but prefer not serializing secrets at all
- Non-serializable resources (sockets, threads)

**Example**

```java
public class Session implements Serializable {
    private static final long serialVersionUID = 1L;
    private String userId;
    private transient Instant loginTime = Instant.now();

    private void readObject(ObjectInputStream in)
            throws IOException, ClassNotFoundException {
        in.defaultReadObject();
        loginTime = Instant.now(); // reinitialize transient field
    }
}
```

**Key takeaway:** `transient` excludes fields from the default byte stream; you must explicitly rehydrate them if needed after deserialization.

---

## Q126. How does serialization behave with class hierarchies (inheritance)?

**Answer**

When a subclass implements `Serializable`:
- **Serializable parent**: subclass fields + inherited serializable fields are written
- **Non-serizable parent**: parent fields are **not** saved; parent's no-arg constructor runs during deserialization before subclass state is restored

If the parent has no accessible no-arg constructor, deserialization throws `InvalidClassException`.

Polymorphic fields serialize with **runtime type metadata**; upon read, the stored class is instantiated (respecting inheritance chain rules).

**Example**

```java
public class Animal implements Serializable {
    protected String species = "unknown";
}

public class Dog extends Animal implements Serializable {
    private String name;
    public Dog(String name) { this.name = name; species = "canine"; }
}

// Serialized Dog includes species + name
// If Animal were NOT Serializable, only Dog fields persist;
// Animal() would run on deserialize to init non-serialized superclass part
```

**Key takeaway:** Serialization walks the object graph from the instance's runtime class upward; non-serializable superclasses still participate via their no-arg constructors on read.

---

## Q127. Are constructors called during deserialization?

**Answer**

**No regular constructor** is invoked for the object being deserialized. The JVM:
1. Allocates memory without running constructors
2. Restores field values from the stream
3. Runs **default initialization** for transient fields
4. Calls the **no-arg constructor of the first non-serializable superclass** (if any)
5. Optionally calls **`readObject`** if customized

Use **`readObject`** to validate invariants after bytes are applied.

**Example**

```java
public class Product implements Serializable {
    private static final long serialVersionUID = 1L;
    private final String sku; // final fields CAN be deserialized via reflection

    public Product(String sku) {
        System.out.println("Constructor called: " + sku);
        this.sku = sku;
    }

    private void readObject(ObjectInputStream in)
            throws IOException, ClassNotFoundException {
        in.defaultReadObject();
        System.out.println("readObject — constructor was NOT called");
    }
}
```

**Key takeaway:** Deserialization bypasses constructors for the serializable class itself; invariants must be enforced in `readObject` or factory methods like `readResolve`.

---

## Q128. How are static variables handled during serialization?

**Answer**

**Static fields are NOT serialized.** They belong to the **class**, not the instance. When you deserialize, static fields retain whatever value the class currently holds in memory (from class initialization), not the value at serialization time.

Instance serialization writes **instance state only**.

**Example**

```java
public class Counter implements Serializable {
    private static int globalCount = 0;
    private int instanceCount;

    public Counter() {
        globalCount++;
        instanceCount = globalCount;
    }
}

Counter a = new Counter(); // globalCount=1, instanceCount=1
// serialize a
Counter b = new Counter(); // globalCount=2
// deserialize to a2 → a2.instanceCount==1, but globalCount still 2 (current static)
```

**Key takeaway:** Never expect static fields to round-trip through serialization; persist class-level state via databases, config, or explicit API — not object streams.

---

## Q129. What is `serialVersionUID` and why define it explicitly?

**Answer**

`serialVersionUID` is a **version fingerprint** for a serializable class. During deserialization, the JVM compares the stream's UID with the class's UID. Mismatch → **`InvalidClassException`**.

If you omit it, the compiler generates one from class structure — **any field change** can break compatibility unexpectedly. Explicit UID documents intentional compatibility.

**Example**

```java
public class Order implements Serializable {
    private static final long serialVersionUID = 2L;

    private long id;
    private String status;
    // Added in v2 — compatible if UID unchanged and new fields have defaults
    private Instant updatedAt;
}
```

**Key takeaway:** Always declare `serialVersionUID` when using serialization; bump it only when you intentionally break wire format compatibility.

---

## Q130. How do custom `writeObject` and `readObject` work?

**Answer**

These **private** methods hook default serialization:

- `writeObject(ObjectOutputStream out)` — customize what gets written (encrypt, compress, omit computed fields)
- `readObject(ObjectInputStream in)` — customize restoration; call `defaultReadObject()` first unless fully custom

Also useful: `writeReplace` / `readResolve` for singletons and defensive copies.

**Example**

```java
public class SecureNote implements Serializable {
    private static final long serialVersionUID = 1L;
    private String content;

    private void writeObject(ObjectOutputStream out) throws IOException {
        out.defaultWriteObject();
        // could add checksum or encryption layer here
    }

    private void readObject(ObjectInputStream in)
            throws IOException, ClassNotFoundException {
        in.defaultReadObject();
        if (content == null || content.isBlank()) {
            throw new InvalidObjectException("content required");
        }
    }
}
```

**Key takeaway:** Custom serialization hooks let you validate, transform, or protect data while staying compatible with the standard stream protocol.

---

## Q131. What is the `Externalizable` interface?

**Answer**

`Externalizable` extends `Serializable` but replaces default mechanism with explicit **`writeExternal`** / **`readExternal`** methods. You must write **every field** yourself (including superclass data unless you delegate).

Benefits: smaller payloads, full control, no reflection for default serialization. Drawback: more boilerplate, must keep read/write in sync.

Unlike default serialization, **`Externalizable` objects call the public no-arg constructor** on read.

**Example**

```java
public class Point implements Externalizable {
    private int x, y;

    public Point() {} // required for Externalizable

    public Point(int x, int y) { this.x = x; this.y = y; }

    @Override
    public void writeExternal(ObjectOutput out) throws IOException {
        out.writeInt(x);
        out.writeInt(y);
    }

    @Override
    public void readExternal(ObjectInput in) throws IOException {
        x = in.readInt();
        y = in.readInt();
    }
}
```

**Key takeaway:** Use `Externalizable` when you need deterministic, compact binary format; default `Serializable` is simpler for most POJO persistence.

---

## Q132. What are common `Arrays` utility methods beyond `toString` and `equals`?

**Answer**

`java.util.Arrays` provides static helpers used daily in interviews and production:

| Method | Purpose |
|--------|---------|
| `sort(array)` | In-place sort (natural order or Comparator) |
| `binarySearch` | Search sorted array |
| `copyOf` / `copyOfRange` | Resize or slice arrays |
| `fill` | Replace all elements with a value |
| `stream(array)` | Convert to Stream (Java 8+) |
| `parallelSort` | Parallel sort for large arrays |
| `compare` / `compareUnsigned` | Lexicographic compare (Java 9+) |

**Example**

```java
int[] nums = {5, 1, 4, 2};
Arrays.sort(nums);                          // [1, 2, 4, 5]
int idx = Arrays.binarySearch(nums, 4);     // 2

int[] bigger = Arrays.copyOf(nums, 8);      // [1,2,4,5,0,0,0,0]
Arrays.fill(bigger, 4, 8, -1);

String[] words = {"banana", "apple", "cherry"};
Arrays.sort(words, Comparator.comparing(String::length));
```

**Key takeaway:** Prefer `Arrays` utilities over manual loops for sorting, searching, and copying — they are optimized and battle-tested.

---

## Q133. How do multi-dimensional arrays work in Java?

**Answer**

Java multi-dimensional arrays are **arrays of arrays** (jagged arrays allowed — rows can differ in length). Memory is not a strict matrix unless you enforce equal row lengths.

Default values apply per component. Use **`Arrays.deepToString`**, **`Arrays.deepEquals`**, and nested loops or enhanced for for traversal.

**Example**

```java
// Rectangular 3x3
int[][] matrix = new int[3][3];

// Jagged
int[][] jagged = new int[3][];
jagged[0] = new int[]{1, 2};
jagged[1] = new int[]{3, 4, 5};
jagged[2] = new int[]{6};

System.out.println(Arrays.deepToString(jagged));
// [[1, 2], [3, 4, 5], [6]]

for (int[] row : jagged) {
    for (int val : row) {
        System.out.print(val + " ");
    }
    System.out.println();
}
```

**Key takeaway:** Java does not have true 2D matrix types — `int[][]` is an array of row arrays; use `deep*` methods for print/compare operations.

---

# Collections Framework — Advanced (Q167–Q177)

Topics: concurrent collections, CAS, locks, capacity tuning, fail-fast behavior, atomic operations, and producer-consumer patterns.

---

## Q167. Synchronized collections vs concurrent collections — what is the difference?

**Answer**

| Aspect | Synchronized wrappers (`Collections.synchronizedXxx`, `Vector`, `Hashtable`) | Concurrent collections (`ConcurrentHashMap`, `CopyOnWriteArrayList`, etc.) |
|--------|-------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| Locking | **Single lock** on entire structure | **Fine-grained** or lock-free |
| Iteration | Must manually sync during iteration | Weakly consistent / safe iterators |
| Scalability | Poor under high contention | Designed for multi-thread throughput |
| Compound ops | Not atomic (`if (!map.containsKey(k)) map.put(k,v)` races) | Atomic methods (`putIfAbsent`, `compute`) |
| Null keys/values | Legacy maps allow null (Hashtable: no null) | Generally **no nulls** in concurrent maps |

**Example**

```java
// Legacy — entire map locked per operation
Map<String, Integer> syncMap =
    Collections.synchronizedMap(new HashMap<>());

// Modern — preferred for concurrent reads/writes
ConcurrentMap<String, Integer> concurrent = new ConcurrentHashMap<>();

concurrent.putIfAbsent("visits", 0);
concurrent.merge("visits", 1, Integer::sum);
```

**Key takeaway:** Prefer `java.util.concurrent` collections over synchronized wrappers for scalable multi-threaded code.

---

## Q168. What are the main concurrent collection classes?

**Answer**

| Class | Replaces / role |
|-------|-----------------|
| **`ConcurrentHashMap`** | Thread-safe `HashMap` with segment/bucket-level locking or CAS |
| **`ConcurrentSkipListMap`** | Concurrent sorted map |
| **`CopyOnWriteArrayList`** | Thread-safe list — copy-on-write for iteration-heavy reads |
| **`CopyOnWriteArraySet`** | Set backed by COW list |
| **`ConcurrentLinkedQueue`** | Lock-free FIFO queue |
| **`ConcurrentLinkedDeque`** | Lock-free deque |
| **`LinkedBlockingQueue`** | Optional bounded blocking queue |
| **`ArrayBlockingQueue`** | Bounded blocking array queue |
| **`PriorityBlockingQueue`** | Blocking priority queue |
| **`SynchronousQueue`** | Zero-capacity handoff |

**Example**

```java
ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>();

List.of("api", "web", "api").parallelStream().forEach svc ->
    counters.computeIfAbsent(svc, k -> new AtomicInteger())
            .incrementAndGet()
);

CopyOnWriteArrayList<String> listeners = new CopyOnWriteArrayList<>();
listeners.add("AuditListener");
listeners.forEach(System.out::println); // snapshot iteration, no CME
```

**Key takeaway:** Know `ConcurrentHashMap`, `CopyOnWriteArrayList`, and `ConcurrentLinkedQueue` — they cover most concurrent collection interview scenarios.

---

## Q169. What is the Copy-On-Write (COW) approach?

**Answer**

**Copy-on-write** collections (e.g., `CopyOnWriteArrayList`) mutate by:
1. Taking a **lock**
2. Copying the entire backing array
3. Applying the change on the copy
4. Swapping the reference atomically

**Reads** iterate a **snapshot** without locking — never see partial updates.

| Pros | Cons |
|------|------|
| Excellent read scalability | Expensive writes (O(n) copy) |
| No `ConcurrentModificationException` on iterate | Stale reads possible briefly |
| Simple listener/event registries | Not for write-heavy workloads |

**Example**

```java
CopyOnWriteArrayList<EventHandler> handlers = new CopyOnWriteArrayList<>();

// Frequent reads / broadcasts
void fireEvent(Event e) {
    for (EventHandler h : handlers) { // snapshot at iteration start
        h.onEvent(e);
    }
}

// Rare writes
void register(EventHandler h) {
    handlers.add(h); // copies entire array
}
```

**Key takeaway:** COW optimizes **read-heavy, write-rare** scenarios — event listeners, configuration snapshots, read-mostly caches.

---

## Q170. What is CAS (Compare-And-Swap) and how does it relate to concurrent collections?

**Answer**

**CAS** is a CPU-level atomic instruction: "If memory location equals expected, update to new value; else fail." Forms the basis of **lock-free** algorithms.

Java exposes CAS via:
- `sun.misc.Unsafe` (internal)
- **`AtomicInteger`**, `AtomicReference`, etc.
- **`VarHandle`** (Java 9+)
- Internal `ConcurrentHashMap` bin updates

CAS loops retry on contention — no mutex, but can spin under heavy write conflicts.

**Example**

```java
AtomicInteger counter = new AtomicInteger(0);

// Thread-safe increment without synchronized
counter.incrementAndGet(); // uses CAS internally

// Manual CAS loop pattern
AtomicReference<String> ref = new AtomicReference<>("initial");
boolean updated = ref.compareAndSet("initial", "updated");
System.out.println(ref.get()); // updated if CAS succeeded
```

**Key takeaway:** CAS enables lock-free atomic updates — foundational to modern concurrent collections and `java.util.concurrent.atomic`.

---

## Q171. `Lock` vs `synchronized` — when do you use each with collections?

**Answer**

| Feature | `synchronized` | `java.util.concurrent.locks.Lock` |
|---------|----------------|-------------------------------------|
| Syntax | Built-in keyword / block | Explicit `lock()` / `unlock()` |
| Try/fail | No | `tryLock()`, timed try |
| Interruptible | No | `lockInterruptibly()` |
| Fairness | Not guaranteed | Optional fair lock |
| Multiple conditions | Single wait set | `Condition` objects |
| Release | Automatic on block exit | **Must** unlock in `finally` |

Use **`Lock`** when you need try-lock, fairness, or separate read/write locks (`ReentrantReadWriteLock`). Use **`synchronized`** for simple mutual exclusion.

Collections themselves hide locking — you choose concurrent vs manual sync.

**Example**

```java
Lock lock = new ReentrantLock();
List<String> shared = new ArrayList<>(); // not thread-safe alone

lock.lock();
try {
    shared.add("item");
} finally {
    lock.unlock();
}

// Better: avoid manual lock + ArrayList
Queue<String> safe = new ConcurrentLinkedQueue<>();
safe.offer("item");
```

**Key takeaway:** Prefer concurrent collections over hand-rolled `Lock` + non-thread-safe collection unless you need complex lock semantics.

---

## Q172. What is initial capacity for hash-based collections?

**Answer**

`HashMap`, `HashSet`, `HashTable`, etc. use a **bucket array** that grows as load increases. **Initial capacity** is the starting bucket count (default **16** for `HashMap`).

Setting appropriate initial capacity avoids **rehashing** (resize + re-distribute entries) when you know approximate size.

Rule of thumb for `HashMap`:
```
initialCapacity = expectedElements / loadFactor + 1
```
(e.g., 100 elements / 0.75 ≈ 134 → use constructor `new HashMap<>(134)`)

**Example**

```java
int expectedUsers = 10_000;
Map<String, User> users = new HashMap<>((int) (expectedUsers / 0.75) + 1);

Set<String> tags = new HashSet<>(512); // reduce resize cycles
```

**Key takeaway:** Pre-size hash collections when expected size is known — cuts allocation and rehash cost at startup.

---

## Q173. What is load factor in hash-based collections?

**Answer**

**Load factor** (default **0.75** in `HashMap`) = threshold ratio of occupied buckets before **resize** (double capacity + rehash).

| Load factor | Effect |
|-------------|--------|
| Lower (e.g., 0.5) | More buckets, fewer collisions, more memory |
| Higher (e.g., 0.9) | Less memory, more collisions, slower lookups |

Resize happens when `size > capacity * loadFactor`.

**Example**

```java
// capacity 16, load 0.75 → resize after 12th entry
Map<Integer, String> map = new HashMap<>(16, 0.75f);

// Custom load — rarely needed
Map<Integer, String> tight = new HashMap<>(16, 0.5f);
```

**Key takeaway:** Default 0.75 balances time vs space; tune only with profiling data, not prematurely.

---

## Q174. What causes `UnsupportedOperationException` in collections?

**Answer**

Thrown when an **optional operation** is not supported by a collection **view** or **wrapper**:

| Source | Example |
|--------|---------|
| Unmodifiable wrapper | `Collections.unmodifiableList(list).add(x)` |
| Immutable factories | `List.of(1,2).clear()` |
| Fixed-size | `Arrays.asList(arr).add(x)` — fixed to array |
| SubList / keySet views | Some operations on backed views |
| `Iterator.remove()` | When not implemented |

**Example**

```java
List<String> mutable = new ArrayList<>(List.of("a", "b"));
List<String> frozen = Collections.unmodifiableList(mutable);

System.out.println(frozen.get(0)); // OK — read
// frozen.add("c"); // UnsupportedOperationException

mutable.add("c"); // OK — backing list still modifiable
System.out.println(frozen); // [a, b, c] — view reflects changes
```

**Key takeaway:** Distinguish **unmodifiable view** (backed, no structural changes via view) from **immutable collection** (independent, no changes ever).

---

## Q175. Fail-fast vs fail-safe iterators — explain with examples.

**Answer**

| Type | Behavior | Examples |
|------|----------|----------|
| **Fail-fast** | Detect concurrent structural modification → throw `ConcurrentModificationException` immediately | `ArrayList`, `HashMap`, `HashSet` iterators |
| **Fail-safe (weakly consistent)** | Iterate snapshot or weakly consistent view — no CME, may skip/add elements | `ConcurrentHashMap`, `CopyOnWriteArrayList`, `ConcurrentLinkedQueue` |

Fail-fast uses a **modCount** check — best-effort, not guaranteed in all concurrent scenarios.

**Example**

```java
// Fail-fast
List<String> list = new ArrayList<>(List.of("A", "B", "C"));
for (String s : list) {
    if ("B".equals(s)) {
        list.remove(s); // ConcurrentModificationException
    }
}

// Fail-safe
List<String> cow = new CopyOnWriteArrayList<>(List.of("A", "B", "C"));
for (String s : cow) {
    cow.remove(s); // no CME — working on snapshot; removal may not affect current iteration
}
```

**Key takeaway:** Fail-fast protects you from silent corruption during iteration; fail-safe trades consistency for availability in concurrent code.

---

## Q176. What atomic operations do concurrent collections provide?

**Answer**

Beyond single-element `put`/`get`, concurrent collections offer **compound atomicity**:

**ConcurrentHashMap**
- `putIfAbsent`, `replace`, `remove(key, value)`
- `compute`, `computeIfAbsent`, `computeIfPresent`, `merge`

**BlockingQueue**
- `put`/`take` atomically block

**ConcurrentLinkedQueue**
- Lock-free `offer`/`poll`

**CopyOnWriteArrayList**
- `addIfAbsent`, snapshot iterators

**Example — thread-safe cache without external sync**

```java
ConcurrentHashMap<String, ExpensiveObject> cache = new ConcurrentHashMap<>();

ExpensiveObject obj = cache.computeIfAbsent("key", k -> {
    System.out.println("Loading for " + k);
    return loadExpensive(k); // only one thread computes per key (Java 8+)
});

cache.merge("counter", 1, Integer::sum); // not for Integer values — use AtomicInteger values instead
ConcurrentHashMap<String, AtomicInteger> hits = new ConcurrentHashMap<>();
hits.computeIfAbsent("page-home", k -> new AtomicInteger()).incrementAndGet();
```

**Key takeaway:** Use built-in atomic map operations instead of check-then-act patterns around synchronized maps.

---

## Q177. Demonstrate `BlockingQueue` with a producer-consumer example.

**Answer**

A classic pattern: **producers** `put` tasks into a bounded queue; **consumers** `take` and process. Backpressure occurs naturally when the queue is full — producers block instead of overwhelming memory.

Use **`ExecutorService`** in production; raw threads illustrate the mechanism.

**Example**

```java
public class ProducerConsumerDemo {

    private static final BlockingQueue<String> queue =
        new ArrayBlockingQueue<>(5); // bounded — backpressure at 5 items

    public static void main(String[] args) throws InterruptedException {
        Thread producer = Thread.ofPlatform().name("producer").start(() -> {
            try {
                for (int i = 1; i <= 10; i++) {
                    String task = "task-" + i;
                    queue.put(task); // blocks when full
                    System.out.println("Produced: " + task);
                    Thread.sleep(100);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        Thread consumer = Thread.ofPlatform().name("consumer").start(() -> {
            try {
                while (true) {
                    String task = queue.take(); // blocks when empty
                    System.out.println("  Consumed: " + task);
                    Thread.sleep(300); // slower consumer → queue fills → producer blocks
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        producer.join();
        Thread.sleep(2000);
        consumer.interrupt();
    }
}
```

**Production-style with thread pool**

```java
BlockingQueue<Runnable> workQueue = new LinkedBlockingQueue<>(100);

ExecutorService pool = new ThreadPoolExecutor(
    2, 4,
    60, TimeUnit.SECONDS,
    workQueue,
    new ThreadPoolExecutor.CallerRunsPolicy() // backpressure to caller when full
);

for (int i = 0; i < 50; i++) {
    pool.submit(() -> processJob());
}
pool.shutdown();
```

**Key takeaway:** Bounded `BlockingQueue` + blocking `put`/`take` decouple producer and consumer speeds and prevent unbounded memory growth under load.

---

# Generics (Q178–Q184)

> Type-safe, reusable code without casting. Core Java interview topic.

---

## Q178

**Answer**

Generics let you parameterize types with type variables (`<T>`, `<E>`, `<K,V>`). The compiler checks type compatibility at compile time, so you get **compile-time type safety** and **eliminate explicit casts**. At runtime, due to **type erasure**, generic type information is removed and replaced with bounds or `Object`.

**Example**

```java
// Without generics — unsafe, requires casting
List list = new ArrayList();
list.add("hello");
list.add(42);                          // no compile error
String s = (String) list.get(1);       // ClassCastException at runtime

// With generics — safe
List<String> names = new ArrayList<>();
names.add("Alice");
// names.add(42);                      // compile error
String name = names.get(0);            // no cast needed
```

**Key takeaway**

Generics shift type errors from runtime (`ClassCastException`) to compile time. Remember: **generics are a compile-time feature**; JVM sees raw types after erasure.

---

## Q179

**Answer**

Generics are needed because collections and APIs often work with **multiple types** but should remain **type-safe**. Without generics you either:
1. Use `Object` everywhere → constant casting, runtime failures.
2. Duplicate classes for each type → unmaintainable.

Generics give one implementation that works for any reference type while preserving type safety.

**Example**

```java
public class Box<T> {
    private T value;

    public Box(T value) { this.value = value; }

    public T get() { return value; }

    public void set(T value) { this.value = value; }
}

public class GenericsDemo {
    public static void main(String[] args) {
        Box<String> stringBox = new Box<>("Java");
        Box<Integer> intBox = new Box<>(42);

        String text = stringBox.get();   // no cast
        int num = intBox.get();          // autoboxing works

        // Box<String> cannot hold Integer — compile error:
        // stringBox.set(100);
    }
}
```

**Key takeaway**

Generics solve the "one container, many types" problem without sacrificing safety or duplicating code.

---

## Q180

**Answer**

Declare a generic class by placing a **type parameter** in angle brackets after the class name. You can use multiple type parameters and bound them.

Common conventions:
| Letter | Meaning |
|--------|---------|
| `T` | Type |
| `E` | Element (collections) |
| `K` | Key |
| `V` | Value |
| `N` | Number |

**Example**

```java
// Single type parameter
public class Stack<T> {
    private final List<T> items = new ArrayList<>();

    public void push(T item) { items.add(item); }

    public T pop() {
        if (items.isEmpty()) throw new EmptyStackException();
        return items.remove(items.size() - 1);
    }
}

// Multiple type parameters — like Map.Entry
public class Pair<K, V> {
    private final K key;
    private final V value;

    public Pair(K key, V value) {
        this.key = key;
        this.value = value;
    }

    public K getKey()   { return key; }
    public V getValue() { return value; }
}

// Usage
Stack<String> stack = new Stack<>();
stack.push("A");
stack.push("B");
String top = stack.pop(); // "B"

Pair<String, Integer> age = new Pair<>("Alice", 30);
```

**Key takeaway**

Type parameters go on the **class declaration** and propagate to fields, methods, and constructors. Instantiate with concrete types: `new Stack<String>()`.

---

## Q181

**Answer**

Java generics have important **restrictions** due to type erasure:

1. **No primitives** — use wrapper classes (`int` → `Integer`).
2. **Cannot instantiate type parameters** — `new T()` is illegal.
3. **Cannot create arrays of parameterized types** — `new List<String>[10]` is illegal (use `List<String>[]` only with warnings, or `ArrayList` directly).
4. **Cannot use `instanceof` with parameterized types** — `obj instanceof List<String>` is illegal (use `instanceof List<?>`).
5. **Cannot have static fields of type T** — static belongs to class, T is per-instance conceptually.
6. **Cannot catch generic exceptions** — `catch (T e)` is illegal.
7. **Cannot overload methods differing only by type erasure** — `void foo(List<String>)` and `void foo(List<Integer>)` clash after erasure.

**Example**

```java
public class GenericRestrictions<T extends Number> {

    // ILLEGAL examples (commented):
    // private T[] array = new T[10];           // cannot create T array
    // public void check(T obj) {
    //     if (obj instanceof T) { }            // cannot use instanceof T
    // }
    // private static T staticField;            // static field of type T

    // LEGAL workaround — factory or reflection
    @SuppressWarnings("unchecked")
    public T[] createArray(Class<T> clazz, int size) {
        return (T[]) java.lang.reflect.Array.newInstance(clazz, size);
    }

    // Bounded type allows Number operations
    public double sum(T a, T b) {
        return a.doubleValue() + b.doubleValue();
    }
}
```

**Key takeaway**

Restrictions exist because **the JVM doesn't know `T` at runtime**. Interviewers love asking *why* — always tie answers back to **type erasure**.

---

## Q182

**Answer**

An **upper bound** (`<T extends SomeType>`) restricts the type parameter to `SomeType` or its subtypes. This lets you call methods defined on `SomeType` inside the generic code.

- `extends` here means "is-a or subtype of" (classes **and** interfaces).
- Multiple bounds: `<T extends A & B & C>` (class first, then interfaces).

**Example**

```java
public class NumberUtils {

    // T must be Number or a subclass (Integer, Double, etc.)
    public static <T extends Number & Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    // Useful with collections
    public static double sum(List<? extends Number> numbers) {
        double total = 0;
        for (Number n : numbers) {
            total += n.doubleValue();  // guaranteed Number methods
        }
        return total;
    }
}

// Usage
Integer bigger = NumberUtils.max(10, 20);           // 20
Double sum = NumberUtils.sum(List.of(1, 2.5, 3));  // 6.5
```

**Key takeaway**

`extends` = **upper bound** = "at most this type." Use when you need to **read** from a structure or call methods on the bound type.

---

## Q183

**Answer**

A **lower bound** (`<? super SomeType>`) restricts a wildcard to `SomeType` or its **supertypes**. Combined with upper bounds, this gives the **PECS** rule:

| Rule | Wildcard | Use when |
|------|----------|----------|
| **P**roducer **E**xtends | `? extends T` | You **get/read** items (produces `T`) |
| **C**onsumer **S**uper | `? super T` | You **put/write** items (consumes `T`) |

**Example**

```java
public class CopyUtils {

    // src produces T → extends
    // dest consumes T → super
    public static <T> void copy(List<? extends T> src, List<? super T> dest) {
        for (T item : src) {
            dest.add(item);
        }
    }

    // Add integers to any list that can hold Number or Object
    public static void addNumbers(List<? super Integer> list) {
        list.add(1);
        list.add(2);
        list.add(3);
    }

    // Read numbers from any list of Number subtypes
    public static void printDoubles(List<? extends Number> list) {
        for (Number n : list) {
            System.out.println(n.doubleValue());
        }
    }
}

// Usage
List<Integer> ints = new ArrayList<>(List.of(1, 2, 3));
List<Number> numbers = new ArrayList<>();
CopyUtils.copy(ints, numbers);   // OK: Integer extends Number, Number super Integer

List<Object> objects = new ArrayList<>();
CopyUtils.copy(ints, objects);   // OK: Object super Integer
```

**Key takeaway**

Memorize **PECS**: `extends` for producers (read), `super` for consumers (write). This is the most common generics interview trap.

---

## Q184

**Answer**

A **generic method** declares its own type parameter(s) on the **method**, independent of the class. The compiler infers types from arguments (diamond / inference), or you can specify them explicitly.

Syntax: `<T> returnType methodName(T param)`

**Example**

```java
public class GenericMethods {

    // Generic method — type parameter <T> belongs to this method
    public static <T> void swap(T[] arr, int i, int j) {
        T temp = arr[i];
        arr[i] = arr[j];
        arr[j] = temp;
    }

    // Multiple bounds + return type inference
    public static <T extends Comparable<T>> T findMax(T[] arr) {
        if (arr == null || arr.length == 0) {
            throw new IllegalArgumentException("Empty array");
        }
        T max = arr[0];
        for (int i = 1; i < arr.length; i++) {
            if (arr[i].compareTo(max) > 0) {
                max = arr[i];
            }
        }
        return max;
    }

    // Generic method in a NON-generic class
    public static <T> List<T> listOf(T... elements) {
        List<T> list = new ArrayList<>();
        Collections.addAll(list, elements);
        return list;
    }

    public static void main(String[] args) {
        String[] words = {"java", "generics", "interview"};
        swap(words, 0, 2);
        // words = ["interview", "generics", "java"]

        Integer max = findMax(new Integer[]{3, 7, 1, 9});  // 9
        // Explicit type argument (rarely needed):
        String maxWord = GenericMethods.<String>findMax(words);
    }
}
```

**Key takeaway**

Generic methods can live in **any** class (generic or not). Place `<T>` **before the return type**. The compiler infers `T` from arguments in most cases.

---

# Multithreading (Q185–Q207)

> Concurrency fundamentals for Java interviews — threads, synchronization, and the java.util.concurrent toolkit.

---

## Q185. What is the need for threads in Java?

**Answer**

Threads let a program do **multiple things concurrently** within one process, sharing the same memory heap. You need threads when:

1. **Responsiveness** — keep UI responsive while doing I/O or heavy work.
2. **Throughput** — utilize multiple CPU cores (parallelism).
3. **Efficiency** — overlap I/O wait with computation.
4. **Background tasks** — logging, notifications, scheduled jobs.

**Example**

```java
public class WhyThreads {
    public static void main(String[] args) throws InterruptedException {
        long start = System.currentTimeMillis();

        // Sequential — ~2 seconds
        fetchData("users");      // 1 sec
        fetchData("orders");     // 1 sec

        // Concurrent — ~1 second total
        Thread t1 = new Thread(() -> fetchData("users"));
        Thread t2 = new Thread(() -> fetchData("orders"));
        t1.start();
        t2.start();
        t1.join();
        t2.join();

        System.out.println("Done in " + (System.currentTimeMillis() - start) + "ms");
    }

    static void fetchData(String resource) {
        try {
            Thread.sleep(1000); // simulate I/O
            System.out.println("Fetched " + resource + " on " + Thread.currentThread().getName());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

**Key takeaway**

Threads share memory (easy communication, hard synchronization). Processes are isolated (safer, heavier). Choose threads for **I/O overlap** and **multi-core CPU work**.

---

## Q186. How do you create a thread?

**Answer**

Two primary ways to define work for a thread:

| Approach | How | Prefer? |
|----------|-----|---------|
| **Extend `Thread`** | Override `run()` | Rarely — single inheritance wasted |
| **Implement `Runnable`** | Implement `run()`, pass to `Thread` | **Yes** — separates task from thread |

Java 8+ also use **lambda**: `new Thread(() -> { ... })`.

**Example**

```java
// Way 1: Extend Thread (not recommended)
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println("Running in " + getName());
    }
}

// Way 2: Implement Runnable (recommended)
class MyTask implements Runnable {
    @Override
    public void run() {
        System.out.println("Task on " + Thread.currentThread().getName());
    }
}

public class CreateThreadDemo {
    public static void main(String[] args) {
        // Extend Thread
        Thread t1 = new MyThread();
        t1.setName("Worker-1");

        // Implement Runnable
        Thread t2 = new Thread(new MyTask(), "Worker-2");

        // Lambda Runnable
        Thread t3 = new Thread(() ->
            System.out.println("Lambda on " + Thread.currentThread().getName()),
            "Worker-3"
        );

        t1.start();
        t2.start();
        t3.start();
    }
}
```

**Key takeaway**

Always prefer **`Runnable`** (or `Callable` for results). Extending `Thread` couples task logic to threading infrastructure.

---

## Q187. How do you create a thread by extending Thread class?

**Answer:** Create a subclass of `Thread`, override `run()` with your work, instantiate it, and call `start()`. This works, but wastes Java’s single inheritance — prefer `Runnable` unless you truly need to customize `Thread` itself.

**Example:**

```java
class DownloadThread extends Thread {
    private final String url;

    DownloadThread(String url) {
        this.url = url;
        setName("download-" + url);
    }

    @Override
    public void run() {
        System.out.println(getName() + " downloading " + url);
        // download logic...
    }
}

public class ExtendThreadDemo {
    public static void main(String[] args) {
        DownloadThread t = new DownloadThread("https://example.com");
        t.start();  // not run()
    }
}
```

**Key takeaway:** Extending `Thread` works, but couples business logic to the thread type — interviewers usually prefer `Runnable`.

---

## Q188. How do you create a thread by implementing Runnable interface?

**Answer:** Implement `Runnable` (or use a lambda), pass it to a `Thread` constructor, then call `start()`. This separates “what to run” from “how it is scheduled,” so your class can still extend something else.

**Example:**

```java
class EmailTask implements Runnable {
    private final String to;

    EmailTask(String to) { this.to = to; }

    @Override
    public void run() {
        System.out.println("Sending email to " + to
            + " on " + Thread.currentThread().getName());
    }
}

public class RunnableDemo {
    public static void main(String[] args) {
        Thread t1 = new Thread(new EmailTask("a@x.com"), "mailer-1");
        Thread t2 = new Thread(() -> System.out.println("lambda task"), "mailer-2");
        t1.start();
        t2.start();
    }
}
```

**Key takeaway:** Prefer `Runnable` (or `Callable` for results). Same task can later be submitted to an `ExecutorService`.

---

## Q189. How do you run a thread in Java?

**Answer:**

1. Create a `Thread` (with a `Runnable` target or subclass).
2. Call **`start()`** — JVM creates a new OS/native thread and eventually invokes `run()`.
3. **Never call `run()` yourself** for concurrency — that runs on the current thread.

**Example:**

```java
public class RunThreadDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread worker = new Thread(() -> {
            System.out.println("Worker started: " + Thread.currentThread().getName());
            try { Thread.sleep(500); } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            System.out.println("Worker finished");
        }, "worker");

        System.out.println("Main before start");
        worker.start();                    // async — new thread
        // worker.run();                   // WRONG — runs on main thread
        System.out.println("Main after start (worker may still be running)");

        worker.join();                     // wait for worker to finish
        System.out.println("Main after join");
    }
}
```

**Key takeaway:** `start()` → new thread (once only). `run()` → ordinary method call on the current thread.

---

## Q190. What are the different states of a thread?

**Answer:** A thread is in exactly one of these **states** (`Thread.State` enum):

| State | Meaning |
|-------|---------|
| **NEW** | Created, not yet started |
| **RUNNABLE** | Executing or ready to run (OS scheduling) |
| **BLOCKED** | Waiting to acquire a monitor lock |
| **WAITING** | Waiting indefinitely (`wait()`, `join()`, `LockSupport.park()`) |
| **TIMED_WAITING** | Waiting with timeout (`sleep()`, timed `wait()`, timed `join()`) |
| **TERMINATED** | `run()` completed or uncaught exception |

**Example:**

```java
public class ThreadStatesDemo {
    public static void main(String[] args) throws InterruptedException {
        Object lock = new Object();

        Thread t = new Thread(() -> {
            synchronized (lock) {
                try {
                    System.out.println("Before wait: " + Thread.currentThread().getState());
                    lock.wait();  // → WAITING
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        });

        System.out.println(t.getState());  // NEW
        t.start();
        Thread.sleep(100);
        System.out.println(t.getState());  // WAITING (or RUNNABLE briefly)

        synchronized (lock) {
            lock.notify();  // wake t
        }
        t.join();
        System.out.println(t.getState());  // TERMINATED
    }
}
```

**Key takeaway:** `RUNNABLE` means eligible to run, not necessarily on CPU. **BLOCKED** waits for a lock; **WAITING** waits for another thread’s signal.

---

## Q191. What is priority of a thread? How do you change the priority of a thread?

**Answer:** Thread **priority** is a scheduler hint (`Thread.MIN_PRIORITY=1`, `NORM_PRIORITY=5`, `MAX_PRIORITY=10`). Change it with `setPriority(int)`. Higher priority *may* get more CPU time, but behavior is **platform-dependent** and **not a correctness guarantee**.

**Example:**

```java
public class PriorityDemo {
    public static void main(String[] args) throws InterruptedException {
        Runnable counter = () -> {
            long count = 0;
            for (int i = 0; i < 1_000_000_000; i++) count++;
            System.out.println(Thread.currentThread().getName()
                + " priority=" + Thread.currentThread().getPriority()
                + " done");
        };

        Thread low  = new Thread(counter, "low");
        Thread high = new Thread(counter, "high");

        low.setPriority(Thread.MIN_PRIORITY);
        high.setPriority(Thread.MAX_PRIORITY);

        high.start();
        low.start();
        low.join();
        high.join();
        // Finish order is NOT guaranteed despite priority
    }
}
```

**Key takeaway:** Priorities are hints, not contracts — do not depend on them for correctness.

---


## Q192. What is ExecutorService?

**Answer:** `ExecutorService` is a higher-level abstraction over raw `Thread` creation. It manages a **pool of worker threads** and a **task queue**, letting you submit `Runnable` or `Callable` tasks without manually creating and starting threads for each unit of work. Benefits include thread reuse (lower overhead), bounded concurrency, lifecycle control (`shutdown()`, `awaitTermination()`), and built-in support for asynchronous results via `Future`.

**Example:**

```java
import java.util.concurrent.*;

public class WhatIsExecutorService {
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(3);

        for (int i = 1; i <= 5; i++) {
            final int taskId = i;
            pool.submit(() -> {
                System.out.println("Task " + taskId + " on " + Thread.currentThread().getName());
                try { Thread.sleep(500); } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }

        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("All tasks done");
    }
}
```

**Key takeaway:** Prefer `ExecutorService` over raw threads in production. Always call **`shutdown()`** (or `shutdownNow()`) when the pool is no longer needed.

---

## Q193. Can you give an example for ExecutorService?

**Answer:** A typical use case is submitting multiple independent jobs to a fixed pool and waiting for them all to finish — for example, fetching data from several sources in parallel.

**Example:**

```java
import java.util.concurrent.*;

public class ExecutorServiceExample {
    public static void main(String[] args) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(3);

        pool.submit(() -> fetchData("users"));
        pool.submit(() -> fetchData("orders"));
        pool.submit(() -> fetchData("products"));

        pool.shutdown();
        pool.awaitTermination(10, TimeUnit.SECONDS);
        System.out.println("All fetches complete");
    }

    static void fetchData(String resource) {
        try {
            Thread.sleep(1000);
            System.out.println("Fetched " + resource + " on " + Thread.currentThread().getName());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

**Key takeaway:** The pool reuses threads across tasks — you submit work, not create threads yourself.

---

## Q194. Explain different ways of creating executor services.

**Answer:** Java provides factory methods on `Executors` plus a fully configurable `ThreadPoolExecutor`:

| Factory method | Behavior |
|----------------|----------|
| `newFixedThreadPool(n)` | Fixed n threads, unbounded queue |
| `newCachedThreadPool()` | Creates threads as needed, reuses idle threads |
| `newSingleThreadExecutor()` | One worker thread, tasks run sequentially |
| `newScheduledThreadPool(n)` | Supports delayed & periodic tasks |
| `newWorkStealingPool()` | ForkJoin-based, work-stealing (Java 8+) |
| `ThreadPoolExecutor(...)` | Fully custom — core/max pool, queue, rejection policy |

**Example:**

```java
import java.util.concurrent.*;

public class ExecutorFactories {
    public static void main(String[] args) {
        ExecutorService fixed    = Executors.newFixedThreadPool(4);
        ExecutorService cached   = Executors.newCachedThreadPool();
        ExecutorService single   = Executors.newSingleThreadExecutor();
        ScheduledExecutorService scheduled = Executors.newScheduledThreadPool(2);

        ThreadPoolExecutor custom = new ThreadPoolExecutor(
            2, 4, 60L, TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(100),
            new ThreadPoolExecutor.CallerRunsPolicy()
        );

        scheduled.schedule(() -> System.out.println("Delayed"), 2, TimeUnit.SECONDS);
        scheduled.scheduleAtFixedRate(() -> System.out.println("Tick"), 0, 1, TimeUnit.SECONDS);

        fixed.shutdown();
        cached.shutdown();
        single.shutdown();
        scheduled.shutdown();
        custom.shutdown();
    }
}
```

**Key takeaway:** `newCachedThreadPool()` can create unlimited threads under load — risky in production. Prefer **bounded** pools with explicit queue and rejection policies.

---

## Q195. How do you check whether an ExecutorService task executed successfully?

**Answer:** Submit tasks via `submit()` to get a **`Future<T>`** — a handle representing the eventual result. Use it to:

- **`get()`** — block until result (or exception)
- **`get(timeout, unit)`** — block with timeout
- **`isDone()`** — check completion without blocking
- **`cancel(mayInterrupt)`** — attempt cancellation

**Example:**

```java
import java.util.concurrent.*;

public class FutureDemo {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Future<Integer> future = pool.submit(() -> {
            Thread.sleep(1000);
            if (Thread.currentThread().isInterrupted()) {
                throw new InterruptedException("Cancelled");
            }
            return 42;
        });

        System.out.println("Done? " + future.isDone());  // false
        System.out.println("Result: " + future.get()); // blocks until 42

        Future<String> slow = pool.submit(() -> {
            Thread.sleep(5000);
            return "late";
        });
        try {
            slow.get(1, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            System.out.println("Timed out — cancelling");
            slow.cancel(true);
        }

        pool.shutdown();
    }
}
```

**Key takeaway:** `Future.get()` wraps task failures in **`ExecutionException`** — unwrap with `getCause()`. Use `isDone()` for non-blocking checks; always handle `TimeoutException` and cancellation in production code.

---

## Q196. What is Callable? How do you execute a Callable from ExecutorService?

**Answer:** `Callable<V>` is like `Runnable` but **returns a value** and **can throw checked exceptions**. Execute it by passing it to `ExecutorService.submit(Callable)` which returns a `Future<V>` for retrieving the result.

```java
@FunctionalInterface
public interface Callable<V> {
    V call() throws Exception;
}
```

**Example:**

```java
import java.util.concurrent.*;

public class CallableDemo {
    public static void main(String[] args) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(2);

        Callable<String> task = () -> {
            Thread.sleep(500);
            if (Math.random() > 0.5) {
                throw new IllegalStateException("Random failure");
            }
            return "Success";
        };

        Future<String> f1 = pool.submit(task);
        Future<String> f2 = pool.submit(task);

        try {
            System.out.println(f1.get());
            System.out.println(f2.get());
        } catch (ExecutionException e) {
            System.out.println("Task failed: " + e.getCause().getMessage());
        }

        var futures = pool.invokeAll(java.util.List.of(
            () -> "A", () -> "B", () -> "C"
        ));
        for (Future<String> f : futures) {
            System.out.println(f.get());
        }

        pool.shutdown();
    }
}
```

**Key takeaway:** `Runnable` = no return, no checked exceptions. `Callable` = return value + throws. Submit via `pool.submit(callable)` and read results with `future.get()`.

---

## Q197. What is synchronization of threads?

**Answer:** **Synchronization** coordinates access to **shared mutable state** so threads don't corrupt data (race conditions). Java provides:

1. **`synchronized`** keyword (methods/blocks) — intrinsic lock (monitor)
2. **`volatile`** — visibility guarantee (not atomicity for compound ops)
3. **`java.util.concurrent.locks`** — `ReentrantLock`, `ReadWriteLock`
4. **Atomic classes** — lock-free CAS operations
5. **Concurrent collections** — thread-safe data structures

The **happens-before** rule: unlock on a monitor → subsequent lock on the same monitor sees prior writes.

**Example:**

```java
public class Counter {
    private int count = 0;

    public void unsafeIncrement() {
        count++;  // read-modify-write — NOT atomic
    }

    public synchronized void safeIncrement() {
        count++;
    }

    public synchronized int getCount() {
        return count;
    }
}
```

**Key takeaway:** Synchronization trades **performance** for **correctness**. Minimize lock scope and duration; prefer higher-level concurrent utilities when possible.

---

## Q198. Can you give an example of a synchronized block?

**Answer:** A **`synchronized` block** locks on a specific **monitor object**, allowing finer-grained locking than synchronizing an entire method. Only one thread can hold the lock on that object at a time. Syntax: `synchronized (lockObject) { ... }`

**Example:**

```java
import java.util.HashMap;
import java.util.Map;

public class BankAccount {
    private final Object balanceLock = new Object();
    private final Map<String, Integer> balances = new HashMap<>();

    public void deposit(String account, int amount) {
        if (amount <= 0) throw new IllegalArgumentException("amount");

        synchronized (balanceLock) {
            balances.merge(account, amount, Integer::sum);
        }
    }

    public int getBalance(String account) {
        synchronized (balanceLock) {
            return balances.getOrDefault(account, 0);
        }
    }

    private final Object logLock = new Object();

    public void log(String message) {
        synchronized (logLock) {
            System.out.println(Thread.currentThread().getName() + ": " + message);
        }
    }
}
```

**Key takeaway:** Use synchronized blocks to **reduce lock contention** — lock only what you must, for as short as possible. Always lock on a **private final** object.

---

## Q199. Can a static method be synchronized?

**Answer:** Yes. A **`static synchronized`** method locks on the **Class object** (`ClassName.class`), not the instance. All static synchronized methods of the same class share one lock — even across different instances. Instance `synchronized` locks on **`this`**.

**Example:**

```java
public class IdGenerator {
    private static int nextId = 1;

    public static synchronized int nextId() {
        return nextId++;
    }

    public static int nextIdExplicit() {
        synchronized (IdGenerator.class) {
            return nextId++;
        }
    }
}

public class StaticSyncDemo {
    private int instanceCount = 0;

    public synchronized void incrementInstance() {
        instanceCount++;
    }

    public static void main(String[] args) throws InterruptedException {
        Thread[] threads = new Thread[10];
        for (int i = 0; i < 10; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) {
                    IdGenerator.nextId();
                }
            });
            threads[i].start();
        }
        for (Thread t : threads) t.join();
        System.out.println("IDs generated: " + IdGenerator.nextId());
    }
}
```

**Key takeaway:** Static sync = **class-level lock**. Instance sync = **per-object lock**. Mixing them does **not** mutually exclude each other.

---

## Q200. What is the use of join method in threads?

**Answer:** `thread.join()` makes the **calling thread wait** until the target thread completes. Overloads: `join()` (wait indefinitely), `join(millis)` / `join(millis, nanos)` (timed wait). Used to coordinate thread completion before proceeding.

**Example:**

```java
public class JoinDemo {
    public static void main(String[] args) throws InterruptedException {
        StringBuilder result = new StringBuilder();

        Thread worker = new Thread(() -> {
            try {
                Thread.sleep(1000);
                result.append("data-loaded");
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });

        worker.start();
        System.out.println("Main waiting...");
        worker.join();
        System.out.println("Result: " + result);

        Thread slow = new Thread(() -> {
            try { Thread.sleep(5000); } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        slow.start();
        slow.join(1000);
        System.out.println("Slow alive? " + slow.isAlive());
    }
}
```

**Key takeaway:** `join()` is for **thread lifecycle coordination**. For task results, prefer **`Future.get()`** or **`CompletableFuture`**.

---

## Q201. Describe a few other important methods in threads?

**Answer:** Important `Thread` control methods:

| Method | Effect |
|--------|--------|
| **`sleep(ms)`** | Current thread pauses (TIMED_WAITING); **does not release locks** |
| **`yield()`** | Hint scheduler to run other threads; unreliable |
| **`interrupt()`** | Sets interrupt flag; wakes sleeping/waiting threads |
| **`isInterrupted()`** | Checks flag without clearing |
| **`interrupted()`** | Static — checks **and clears** current thread's flag |

**Best practice:** respond to interruption by restoring flag and exiting: `Thread.currentThread().interrupt()`.

**Example:**

```java
public class ThreadControlDemo {
    public static void main(String[] args) throws InterruptedException {
        Thread sleeper = new Thread(() -> {
            try {
                System.out.println("Sleeping...");
                Thread.sleep(10_000);
            } catch (InterruptedException e) {
                System.out.println("Sleep interrupted!");
                Thread.currentThread().interrupt();
            }
        });

        sleeper.start();
        Thread.sleep(500);
        sleeper.interrupt();
        sleeper.join();

        Thread t = new Thread(() -> {
            for (int i = 0; i < 3; i++) {
                System.out.println("Working " + i);
                Thread.yield();
            }
        });
        t.start();
        t.join();
    }
}
```

**Key takeaway:** Never ignore `InterruptedException` silently. **`sleep` ≠ `wait`**: sleep doesn't release monitors; wait does (must be inside synchronized block).

---

## Q202. What is a deadlock?

**Answer:** **Deadlock** occurs when two or more threads each hold a lock the other needs, and none can proceed — circular wait. Classic Coffman conditions: mutual exclusion, hold and wait, no preemption, circular wait. Prevention: **consistent lock ordering**, timeouts (`tryLock`), avoid nested locks, use higher-level abstractions.

**Example:**

```java
public class DeadlockDemo {
    private static final Object lockA = new Object();
    private static final Object lockB = new Object();

    public static void main(String[] args) {
        Thread t1 = new Thread(() -> {
            synchronized (lockA) {
                sleep(100);
                synchronized (lockB) { System.out.println("T1 got both"); }
            }
        });

        Thread t2 = new Thread(() -> {
            synchronized (lockB) {
                sleep(100);
                synchronized (lockA) { System.out.println("T2 got both"); }
            }
        });

        t1.start();
        t2.start();
    }

    static void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

**Key takeaway:** Detect in production with thread dumps (`jstack`). Prevent by **global lock order** and **tryLock with timeout** from `ReentrantLock`.

---

## Q203. What are the important methods in Java for inter-thread communication?

**Answer:** The primary inter-thread communication methods are on **`Object`** and must be called inside a **`synchronized` block** on the same monitor:

| Method | Purpose |
|--------|---------|
| **`wait()`** | Release lock, enter WAITING until another thread notifies |
| **`notify()`** | Wake **one** waiting thread (arbitrary choice) |
| **`notifyAll()`** | Wake **all** waiting threads |

Always use a **`while` loop** (not `if`) to re-check the condition after waking (spurious wakeups, multiple waiters). Modern alternatives in `java.util.concurrent` (`BlockingQueue`, `Condition`, `CountDownLatch`) are often safer.

**Example:**

```java
public class InterThreadCommOverview {
    private final Object lock = new Object();
    private boolean ready = false;

    public void awaitReady() throws InterruptedException {
        synchronized (lock) {
            while (!ready) {
                lock.wait();   // releases lock, waits for notify/notifyAll
            }
        }
    }

    public void signalReady() {
        synchronized (lock) {
            ready = true;
            lock.notifyAll();
        }
    }
}
```

**Key takeaway:** `wait/notify/notifyAll` operate on the **intrinsic lock** of an object. All three require holding that object's monitor.

---

## Q204. What is the use of wait method?

**Answer:** **`wait()`** causes the current thread to **release the monitor lock** and enter the **WAITING** state until another thread calls `notify()` or `notifyAll()` on the same object. The thread re-acquires the lock before returning from `wait()`. Must be called inside `synchronized (lock) { ... }` on that same lock object. Overloads: `wait()`, `wait(long timeout)`, `wait(long timeout, int nanos)`.

**Example:**

```java
public class WaitDemo {
    private final Object lock = new Object();
    private boolean dataReady = false;

    public void consume() throws InterruptedException {
        synchronized (lock) {
            while (!dataReady) {
                System.out.println("Consumer waiting for data...");
                lock.wait();  // release lock, pause until notified
            }
            System.out.println("Consumer got data");
        }
    }

    public void produce() {
        synchronized (lock) {
            dataReady = true;
            lock.notifyAll();
        }
    }
}
```

**Key takeaway:** Use **`while (!condition) { lock.wait(); }`** — never `if` — because spurious wakeups and multiple waiters require re-checking the condition after waking.

---

## Q205. What is the use of notify method?

**Answer:** **`notify()`** wakes **one** thread that is waiting on the same object's monitor (via `wait()`). The choice of which thread is undefined. Must be called inside `synchronized (lock) { ... }` while holding that lock. Use when exactly one waiter should proceed and you are confident the condition is satisfied for that thread.

**Example:**

```java
import java.util.LinkedList;
import java.util.Queue;

public class NotifyDemo {
    private final Object lock = new Object();
    private final Queue<String> queue = new LinkedList<>();

    public void produce(String item) {
        synchronized (lock) {
            queue.offer(item);
            System.out.println("Produced: " + item);
            lock.notify();  // wake one waiting consumer
        }
    }

    public void consume() throws InterruptedException {
        synchronized (lock) {
            while (queue.isEmpty()) {
                lock.wait();
            }
            String item = queue.poll();
            System.out.println("Consumed: " + item);
        }
    }
}
```

**Key takeaway:** `notify()` wakes only **one** thread — risky when multiple threads wait on different conditions. Prefer **`notifyAll()`** unless you can prove only one waiter exists.

---

## Q206. What is the use of notifyAll method?

**Answer:** **`notifyAll()`** wakes **every** thread waiting on the same object's monitor. Each awakened thread must re-acquire the lock before proceeding; most will re-check their condition and call `wait()` again if not satisfied. Safer than `notify()` when multiple threads wait on the same lock for different (or shared) conditions.

**Example:**

```java
public class NotifyAllDemo {
    private final Object lock = new Object();
    private boolean open = false;

    public void awaitOpen() throws InterruptedException {
        synchronized (lock) {
            while (!open) {
                lock.wait();
            }
        }
        System.out.println(Thread.currentThread().getName() + " proceeding");
    }

    public void openGate() {
        synchronized (lock) {
            open = true;
            lock.notifyAll();  // wake all waiters — each re-checks while (!open)
        }
    }
}
```

**Key takeaway:** Use **`notifyAll()`** as the default — it avoids lost-signal bugs when multiple threads wait on the same monitor. Paired with a **`while` loop**, only threads whose condition is true proceed.

---

## Q207. Can you write a synchronized program with wait and notify methods?

**Answer:** The **producer-consumer** pattern is the classic example: producers add items to a shared buffer; consumers remove items. Use a **bounded buffer**, synchronize on a shared lock, call **`wait()`** when the buffer is full (producer) or empty (consumer), and **`notifyAll()`** after changing state.

**Example:**

```java
import java.util.LinkedList;
import java.util.Queue;

public class ProducerConsumer {
    private static final int CAPACITY = 5;
    private final Queue<Integer> buffer = new LinkedList<>();
    private final Object lock = new Object();

    public void produce(int item) throws InterruptedException {
        synchronized (lock) {
            while (buffer.size() == CAPACITY) {
                System.out.println("Producer waiting — buffer full");
                lock.wait();
            }
            buffer.offer(item);
            System.out.println("Produced: " + item + " | size=" + buffer.size());
            lock.notifyAll();
        }
    }

    public int consume() throws InterruptedException {
        synchronized (lock) {
            while (buffer.isEmpty()) {
                System.out.println("Consumer waiting — buffer empty");
                lock.wait();
            }
            int item = buffer.poll();
            System.out.println("Consumed: " + item + " | size=" + buffer.size());
            lock.notifyAll();
            return item;
        }
    }

    public static void main(String[] args) throws InterruptedException {
        ProducerConsumer pc = new ProducerConsumer();

        Thread producer = new Thread(() -> {
            try {
                for (int i = 1; i <= 10; i++) {
                    pc.produce(i);
                    Thread.sleep(100);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "producer");

        Thread consumer = new Thread(() -> {
            try {
                for (int i = 0; i < 10; i++) {
                    pc.consume();
                    Thread.sleep(200);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }, "consumer");

        producer.start();
        consumer.start();
        producer.join();
        consumer.join();
    }
}
```

**Key takeaway:** Classic pattern: **`while` + `wait` + `notifyAll`**. In production, use **`BlockingQueue`** — it implements this correctly for you.

---

## Bonus: Advanced Concurrency Topics

### volatile

**Answer:** The **`volatile`** keyword guarantees **visibility** — a write by one thread is immediately visible to all threads reading the variable. It does **not** make compound operations atomic (`count++` still races). Use for flags, status fields, and one-writer / many-readers scenarios.

**Example:**

```java
public class VolatileDemo {
    private volatile boolean running = true;

    public void stop() { running = false; }

    public void workerLoop() {
        while (running) { doWork(); }
        System.out.println("Worker stopped");
    }

    private void doWork() { /* ... */ }
}
```

**Key takeaway:** `volatile` = visibility, not atomicity. For `i++`, use **`synchronized`**, **`AtomicInteger`**, or locks.

---

### ThreadLocal

**Answer:** **`ThreadLocal<T>`** gives each thread its own independent copy of a variable. Useful for non-thread-safe per-request objects (e.g., `SimpleDateFormat`), user context, or request IDs. Always **`remove()`** in thread pools to prevent memory leaks.

**Example:**

```java
public class ThreadLocalDemo {
    private static final ThreadLocal<String> userContext =
        ThreadLocal.withInitial(() -> "anonymous");

    public static void setUser(String user) { userContext.set(user); }
    public static String getUser() { return userContext.get(); }
    public static void clear() { userContext.remove(); }
}
```

**Key takeaway:** ThreadLocal = **per-thread isolation**. In thread pools, always clean up with **`remove()`**.

---

### Atomic classes

**Answer:** **Atomic classes** (`AtomicInteger`, `AtomicLong`, `AtomicReference`, etc.) use **CAS (Compare-And-Swap)** for lock-free thread-safe updates. Key methods: `get`, `set`, `compareAndSet`, `incrementAndGet`, `getAndIncrement`.

**Example:**

```java
import java.util.concurrent.atomic.AtomicInteger;

public class AtomicDemo {
    private final AtomicInteger count = new AtomicInteger(0);

    public void increment() { count.incrementAndGet(); }

    public static void main(String[] args) throws InterruptedException {
        AtomicDemo demo = new AtomicDemo();
        Thread[] threads = new Thread[10];
        for (int i = 0; i < 10; i++) {
            threads[i] = new Thread(() -> {
                for (int j = 0; j < 1000; j++) demo.increment();
            });
            threads[i].start();
        }
        for (Thread t : threads) t.join();
        System.out.println("Count: " + demo.count.get());  // 10000
    }
}
```

**Key takeaway:** Atomics excel at **single-variable** updates. Complex invariants spanning multiple fields still need **locks**.

---

### ReentrantLock

**Answer:** **`ReentrantLock`** is an explicit alternative to `synchronized` with extras: `tryLock()`, timeouts, optional fair ordering, multiple `Condition` objects, and `lockInterruptibly()`. Always unlock in **`finally`**.

**Example:**

```java
import java.util.concurrent.locks.*;

public class ReentrantLockDemo {
    private final ReentrantLock lock = new ReentrantLock(true);
    private int balance = 0;

    public void deposit(int amount) {
        lock.lock();
        try {
            balance += amount;
        } finally {
            lock.unlock();
        }
    }

    public boolean tryDeposit(int amount, long timeoutMs) throws InterruptedException {
        if (lock.tryLock(timeoutMs, TimeUnit.MILLISECONDS)) {
            try {
                balance += amount;
                return true;
            } finally {
                lock.unlock();
            }
        }
        return false;
    }
}
```

**Key takeaway:** Use `ReentrantLock` when you need **tryLock**, **timeouts**, **fairness**, or **multiple condition variables**.

---

# Functional Programming & Streams (Q208–Q220)

> Java 8+ functional style — lambdas, streams, and the core functional interfaces.

---

## Q208

**Answer**

**Functional programming (FP)** treats computation as the evaluation of **pure functions** — functions that:

1. Return a value based only on inputs (no hidden state)
2. Cause **no side effects** (don't mutate external state, no I/O)
3. Are **referentially transparent** — same inputs always produce same outputs

Java is primarily OOP but adopted FP features in Java 8: lambdas, method references, streams, and functional interfaces.

**Example**

```java
// Imperative — mutates external state (not pure)
int sum = 0;
for (int n : numbers) {
    sum += n;  // side effect on external variable
}

// Functional style — no mutation, expression-based
int sum = numbers.stream()
    .filter(n -> n > 0)
    .mapToInt(Integer::intValue)
    .sum();
```

**Key takeaway**

Java supports **hybrid FP** — use immutability, pure functions where possible, and streams for declarative data processing. Full purity isn't required, but side effects should be **controlled and explicit**.

---

## Q209

**Answer**

A practical FP example in Java: transform data using **composition of functions** without loops or mutation.

Core ideas demonstrated:
- Pass behavior as data (functions as first-class citizens)
- Immutable transformations
- Declarative "what" not "how"

**Example**

```java
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

public class FunctionalExample {
    record Employee(String name, String dept, double salary) {}

    public static void main(String[] args) {
        List<Employee> employees = List.of(
            new Employee("Alice", "Eng", 120_000),
            new Employee("Bob",   "Eng", 95_000),
            new Employee("Carol", "HR",  80_000),
            new Employee("Dave",  "Eng", 110_000)
        );

        // Average Eng salary — declarative pipeline
        double avgEngSalary = employees.stream()
            .filter(e -> e.dept().equals("Eng"))
            .mapToDouble(Employee::salary)
            .average()
            .orElse(0);

        // Group by dept, collect names — no mutation
        Map<String, List<String>> byDept = employees.stream()
            .collect(Collectors.groupingBy(
                Employee::dept,
                Collectors.mapping(Employee::name, Collectors.toList())
            ));

        // Function composition
        Function<String, String> trim = String::trim;
        Function<String, String> upper = String::toUpperCase;
        Function<String, String> trimThenUpper = trim.andThen(upper);

        System.out.println(avgEngSalary);  // 108333.33...
        System.out.println(byDept);        // {Eng=[Alice, Bob, Dave], HR=[Carol]}
        System.out.println(trimThenUpper.apply("  hello  "));  // HELLO
    }
}
```

**Key takeaway**

FP in Java means **immutable data + function composition + declarative pipelines**. Records (`record`) and streams make this natural.

---

## Q210

**Answer**

A **Stream** is a sequence of elements supporting **functional-style operations** (filter, map, reduce). Key properties:

1. **Not a data structure** — it doesn't store elements; it pipelines operations over a source.
2. **Lazy** — intermediate operations deferred until a terminal operation runs.
3. **Consumable** — once terminated, cannot be reused.
4. **Possibly parallel** — `.parallelStream()` for multi-core processing.

Stream types: `Stream<T>`, `IntStream`, `LongStream`, `DoubleStream` (avoid boxing overhead).

**Example**

```java
import java.util.stream.*;

// Stream from various sources
Stream<String> fromList   = List.of("a", "b").stream();
Stream<String> fromArray  = Stream.of("x", "y");
Stream<Integer> infinite  = Stream.iterate(0, n -> n + 1);  // 0,1,2,...
Stream<Double> randoms    = Stream.generate(Math::random).limit(5);
IntStream range           = IntStream.rangeClosed(1, 10);  // 1..10
```

**Key takeaway**

Streams = **pipeline of operations** on a data source. They enable declarative processing but are **not** replacements for collections.

---

## Q211

**Answer**

A **stream pipeline** has three parts:

1. **Source** — collection, array, generator, I/O
2. **Intermediate operations** — lazy transforms (return new stream)
3. **Terminal operation** — triggers execution, produces result or side effect

**Example**

```java
import java.util.*;
import java.util.stream.*;

public class StreamExample {
    record Product(String name, String category, double price) {}

    public static void main(String[] args) {
        List<Product> products = List.of(
            new Product("Laptop",  "Electronics", 999.99),
            new Product("Mouse",   "Electronics", 29.99),
            new Product("Desk",    "Furniture",   349.00),
            new Product("Chair",   "Furniture",   199.00),
            new Product("Monitor", "Electronics", 449.00)
        );

        // Pipeline: source → intermediate → terminal
        List<String> expensiveElectronics = products.stream()       // source
            .filter(p -> p.category().equals("Electronics"))          // intermediate
            .filter(p -> p.price() > 100)                             // intermediate
            .sorted(Comparator.comparingDouble(Product::price)        // intermediate
                .reversed())
            .map(Product::name)                                       // intermediate
            .collect(Collectors.toList());                            // terminal

        System.out.println(expensiveElectronics);
        // [Laptop, Monitor]

        // Statistics terminal
        DoubleSummaryStatistics stats = products.stream()
            .mapToDouble(Product::price)
            .summaryStatistics();
        System.out.printf("Avg price: %.2f%n", stats.getAverage());
    }
}
```

**Key takeaway**

Nothing runs until a **terminal operation** is invoked. Intermediate ops build a lazy pipeline.

---

### Intermediate Operations (between Q211–Q212)

**Answer**

**Intermediate operations** are lazy, return a new stream, and can be chained. Common ones:

| Operation | Purpose |
|-----------|---------|
| `filter(Predicate)` | Keep elements matching condition |
| `map(Function)` | Transform each element |
| `flatMap(Function)` | Flatten nested streams (1-to-many) |
| `distinct()` | Remove duplicates (uses `equals`) |
| `sorted()` / `sorted(Comparator)` | Sort elements |
| `peek(Consumer)` | Debug/observe without modifying |
| `limit(n)` | Truncate to first n |
| `skip(n)` | Drop first n |
| `takeWhile(Predicate)` | Java 9+ — take while true |
| `dropWhile(Predicate)` | Java 9+ — drop while true |

**Example**

```java
import java.util.*;
import java.util.stream.*;

public class IntermediateOpsDemo {
    public static void main(String[] args) {
        List<String> words = List.of("apple", "banana", "apricot", "blueberry", "avocado");

        List<String> result = words.stream()
            .filter(w -> w.startsWith("a"))           // filter
            .map(String::toUpperCase)                  // map
            .distinct()                                // distinct
            .sorted()                                  // sorted
            .limit(2)                                  // limit
            .toList();                                 // terminal (Java 16+)

        System.out.println(result);  // [APPLE, APRICOT]

        // flatMap — split sentences into words
        List<String> sentences = List.of("Hello world", "Java streams");
        List<String> allWords = sentences.stream()
            .flatMap(s -> Arrays.stream(s.split(" ")))  // Stream<String> → flat
            .map(String::toLowerCase)
            .toList();
        System.out.println(allWords);  // [hello, world, java, streams]
    }
}
```

**Key takeaway**

Intermediate ops are **lazy** and **stateless** (mostly). Order matters: `filter` before `map` avoids unnecessary transformations.

---

## Q212

**Answer**

**Terminal operations** consume the stream and produce a result, side effect, or nothing. They trigger pipeline execution.

| Operation | Result |
|-----------|--------|
| `collect(Collector)` | Mutable container (List, Map, Set) |
| `toList()` | Immutable list (Java 16+) |
| `forEach(Consumer)` | Side effect per element |
| `count()` | `long` count |
| `min()` / `max(Comparator)` | Optional element |
| `reduce(identity, op)` | Combined result |
| `anyMatch` / `allMatch` / `noneMatch` | `boolean` |
| `findFirst()` / `findAny()` | `Optional<T>` |
| `toArray()` | Array |

**Example**

```java
import java.util.*;
import java.util.stream.*;

public class TerminalOpsDemo {
    public static void main(String[] args) {
        List<Integer> nums = List.of(3, 7, 2, 9, 5, 7, 1);

        // collect
        Set<Integer> unique = nums.stream().collect(Collectors.toSet());

        // reduce
        int sum = nums.stream().reduce(0, Integer::sum);
        Optional<Integer> max = nums.stream().reduce(Integer::max);

        // match
        boolean hasEven = nums.stream().anyMatch(n -> n % 2 == 0);
        boolean allPositive = nums.stream().allMatch(n -> n > 0);

        // find
        Optional<Integer> first = nums.stream().filter(n -> n > 5).findFirst();

        // grouping
        Map<Boolean, List<Integer>> partitioned = nums.stream()
            .collect(Collectors.partitioningBy(n -> n % 2 == 0));

        System.out.println("Sum: " + sum);           // 34
        System.out.println("Max: " + max.orElse(-1)); // 9
        System.out.println("First > 5: " + first);   // Optional[7]
        System.out.println(partitioned);
    }
}
```

**Key takeaway**

One terminal op per pipeline. After terminal, the stream is **spent** — create a new one from the source to reuse.

---

## Q213

**Answer**

**Method references** are shorthand for lambdas that only call an existing method. Syntax: `ClassName::methodName`.

Four types:
1. **Static method** — `Integer::parseInt`
2. **Instance method on specific object** — `System.out::println`
3. **Instance method on arbitrary object** — `String::toLowerCase` (first arg becomes receiver)
4. **Constructor reference** — `ArrayList::new`

**Example**

```java
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class MethodReferenceDemo {
    public static void main(String[] args) {
        List<String> names = List.of("alice", "bob", "charlie");

        // Lambda → method reference equivalents
        names.forEach(s -> System.out.println(s));     // lambda
        names.forEach(System.out::println);             // instance on object

        List<String> upper = names.stream()
            .map(s -> s.toUpperCase())                   // lambda
            .map(String::toUpperCase)                    // instance on arbitrary
            .toList();

        List<Integer> lengths = names.stream()
            .map(String::length)                         // instance: String::length
            .toList();

        // Constructor reference
        Supplier<ArrayList<String>> listFactory = ArrayList::new;
        Function<String, StringBuilder> sbFactory = StringBuilder::new;

        // Static method reference
        Function<String, Integer> parser = Integer::parseInt;

        System.out.println(upper);   // [ALICE, BOB, CHARLIE]
        System.out.println(lengths); // [5, 3, 7]
    }
}
```

**Key takeaway**

Use method references when the lambda **only delegates** to one method — cleaner and more readable. If you transform arguments, stick with a lambda.

---

## Q214

**Answer**

A **lambda expression** is an anonymous function — a concise way to implement a **functional interface** (single abstract method). Syntax:

```java
(parameters) -> expression
(parameters) -> { statements; return value; }
```

Type inference: compiler deduces parameter types from context. Effectively final variables from enclosing scope can be captured.

**Example**

```java
import java.util.*;
import java.util.function.*;

public class LambdaBasics {
    public static void main(String[] args) {
        // Full form
        Comparator<String> byLength = (String a, String b) -> {
            return Integer.compare(a.length(), b.length());
        };

        // Concise form — type inference + expression body
        Comparator<String> byLength2 = (a, b) -> Integer.compare(a.length(), b.length());

        // Zero parameters
        Runnable r = () -> System.out.println("Running");

        // Single parameter — parens optional (not when typed)
        Consumer<String> printer = s -> System.out.println(s);

        // Capturing effectively final variable
        String prefix = "User: ";
        Function<String, String> greet = name -> prefix + name;  // prefix effectively final

        List<String> names = List.of("Alice", "Bob", "Charlie");
        names.sort(byLength2);
        System.out.println(names);  // [Bob, Alice, Charlie]
    }
}
```

**Key takeaway**

Lambdas are **syntactic sugar** for anonymous classes implementing functional interfaces. They enable passing **behavior as data**.

---

## Q215

**Answer**

A practical lambda example: event handling, sorting, and filtering without anonymous inner classes.

**Example**

```java
import java.util.*;
import java.util.function.*;
import java.time.LocalDate;

public class LambdaExample {
    record Task(String title, int priority, LocalDate due) {}

    public static void main(String[] args) {
        List<Task> tasks = new ArrayList<>(List.of(
            new Task("Write tests",  2, LocalDate.of(2026, 7, 25)),
            new Task("Fix bug",      1, LocalDate.of(2026, 7, 22)),
            new Task("Deploy",       3, LocalDate.of(2026, 7, 30)),
            new Task("Code review",  2, LocalDate.of(2026, 7, 21))
        ));

        // Sort by priority, then due date — lambda as Comparator
        tasks.sort(
            Comparator.comparingInt(Task::priority)
                .thenComparing(Task::due)
        );

        // Filter high-priority tasks due soon
        Predicate<Task> urgent = t ->
            t.priority() <= 2 && t.due().isBefore(LocalDate.of(2026, 7, 26));

        tasks.stream()
            .filter(urgent)
            .map(Task::title)
            .forEach(System.out::println);
        // Fix bug
        // Code review
        // Write tests

        // Custom functional interface usage
        BiFunction<String, Integer, String> repeat = (s, n) -> s.repeat(n);
        System.out.println(repeat.apply("Ha", 3));  // HaHaHa
    }
}
```

**Key takeaway**

Lambdas replace verbose anonymous classes and make **inline behavior** readable. Combine with streams for powerful data processing.

---

## Q216

**Answer**

**Lambdas and functional interfaces** are two sides of the same coin:

- A **functional interface** has exactly **one abstract method** (SAM).
- A **lambda** provides the implementation of that SAM.
- Annotate with `@FunctionalInterface` (optional but recommended) — compiler enforces SAM rule.

Common built-in functional interfaces live in `java.util.function`.

**Example**

```java
@FunctionalInterface
interface Validator<T> {
    boolean validate(T input);

    // default and static methods OK — don't count against SAM
    default Validator<T> and(Validator<T> other) {
        return input -> this.validate(input) && other.validate(input);
    }

    static <T> Validator<T> notNull() {
        return input -> input != null;
    }
}

public class LambdaFunctionalInterfaceDemo {
    public static void main(String[] args) {
        // Lambda implements the SAM of Validator
        Validator<String> notEmpty = s -> s != null && !s.isBlank();
        Validator<String> maxLen10 = s -> s != null && s.length() <= 10;

        // Compose via default method
        Validator<String> combined = Validator.<String>notNull().and(notEmpty).and(maxLen10);

        System.out.println(combined.validate("hello"));  // true
        System.out.println(combined.validate(""));       // false
        System.out.println(combined.validate(null));   // false

        // Standard functional interfaces
        Runnable task = () -> System.out.println("task");
        task.run();
    }
}
```

**Key takeaway**

Every lambda's type is a **functional interface**. If you need a custom shape, define your own `@FunctionalInterface`.

---

## Q217

**Answer**

**`Predicate<T>`** — takes one argument, returns `boolean`. Used for filtering and conditional logic.

SAM: `boolean test(T t)`

Key default methods: `and`, `or`, `negate`, `isEqual`.

**Example**

```java
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class PredicateDemo {
    public static void main(String[] args) {
        List<Integer> nums = List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10);

        Predicate<Integer> isEven = n -> n % 2 == 0;
        Predicate<Integer> greaterThan5 = n -> n > 5;

        // Composition
        Predicate<Integer> evenAndBig = isEven.and(greaterThan5);
        Predicate<Integer> oddOrSmall = isEven.negate().or(n -> n < 3);

        List<Integer> filtered = nums.stream()
            .filter(evenAndBig)
            .toList();
        System.out.println(filtered);  // [6, 8, 10]

        // Predicate in method
        List<String> valid = validate(List.of("a", "", "hello", "  "),
            s -> s != null && !s.isBlank());
        System.out.println(valid);  // [a, hello]
    }

    static <T> List<T> validate(List<T> items, Predicate<T> rule) {
        return items.stream().filter(rule).toList();
    }
}
```

**Key takeaway**

`Predicate` = **test/filter**. Compose with `and`/`or`/`negate` for readable validation logic.

---

## Q218

**Answer**

**`Function<T, R>`** — takes one argument of type `T`, returns `R`. Used for mapping/transforming data.

SAM: `R apply(T t)`

Key default methods: `andThen`, `compose`, `identity`.

**Example**

```java
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class FunctionDemo {
    public static void main(String[] args) {
        Function<String, Integer> length = String::length;
        Function<Integer, String> label  = n -> "len=" + n;

        // Compose: apply length, then label
        Function<String, String> describe = length.andThen(label);
        System.out.println(describe.apply("Java"));  // len=4

        // Compose reverse order
        Function<Integer, Integer> doubleIt = n -> n * 2;
        Function<Integer, Integer> addOne   = n -> n + 1;
        Function<Integer, Integer> doubleThenAdd = doubleIt.andThen(addOne);
        Function<Integer, Integer> addThenDouble = doubleIt.compose(addOne);
        System.out.println(doubleThenAdd.apply(5));  // 11
        System.out.println(addThenDouble.apply(5));  // 12

        // Stream map
        List<String> names = List.of("alice", "bob");
        List<Integer> lengths = names.stream()
            .map(length)
            .toList();
        System.out.println(lengths);  // [5, 3]
    }
}
```

**Key takeaway**

`Function` = **transform T → R**. Use in `map()`, composition chains, and dependency injection of behavior.

---

## Q219

**Answer**

**`Consumer<T>`** — takes one argument, returns **void**. Used for side effects: printing, logging, adding to collections.

SAM: `void accept(T t)`

Key default methods: `andThen`.

**Example**

```java
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class ConsumerDemo {
    public static void main(String[] args) {
        Consumer<String> print = System.out::println;
        Consumer<String> log   = s -> System.out.println("[LOG] " + s);

        // Chain consumers
        Consumer<String> printAndLog = print.andThen(log);
        printAndLog.accept("Hello");
        // Hello
        // [LOG] Hello

        // forEach terminal op uses Consumer
        List.of("a", "b", "c").forEach(print);

        // Collect with Consumer via mutable reduction
        List<String> result = new ArrayList<>();
        Consumer<String> accumulator = result::add;
        Stream.of("x", "y", "z").forEach(accumulator);
        System.out.println(result);  // [x, y, z]

        // peek is a stream intermediate op taking Consumer (debug)
        List.of(1, 2, 3).stream()
            .peek(n -> System.out.println("Before: " + n))
            .map(n -> n * 2)
            .forEach(n -> System.out.println("After: " + n));
    }
}
```

**Key takeaway**

`Consumer` = **act on T, no return**. Use for side effects in `forEach`, `peek`, and event handlers.

---

## Q220

**Answer**

**Multi-argument functional interfaces** extend the pattern for two parameters:

| Interface | Method | Use |
|-----------|--------|-----|
| **`BiFunction<T,U,R>`** | `R apply(T t, U u)` | Transform two inputs → result |
| **`BiConsumer<T,U>`** | `void accept(T t, U u)` | Side effect with two args |
| **`BiPredicate<T,U>`** | `boolean test(T t, U u)` | Test pair of values |

Also: `BinaryOperator<T>` extends `BiFunction<T,T,T>` — used in `reduce`.

**Example**

```java
import java.util.*;
import java.util.function.*;
import java.util.stream.*;

public class MultiArgFunctionalDemo {
    public static void main(String[] args) {
        // BiFunction — merge two maps
        BiFunction<Map<String, Integer>, Map<String, Integer>, Map<String, Integer>> merge =
            (m1, m2) -> {
                Map<String, Integer> result = new HashMap<>(m1);
                m2.forEach((k, v) -> result.merge(k, v, Integer::sum));
                return result;
            };

        Map<String, Integer> a = Map.of("x", 1, "y", 2);
        Map<String, Integer> b = Map.of("y", 3, "z", 4);
        System.out.println(merge.apply(a, b));  // {x=1, y=5, z=4}

        // BiConsumer — iterate map entries
        BiConsumer<String, Integer> printEntry = (k, v) ->
            System.out.println(k + " = " + v);
        a.forEach(printEntry);

        // BiPredicate — validation
        BiPredicate<String, String> sameLength = (s1, s2) ->
            s1.length() == s2.length();
        System.out.println(sameLength.test("abc", "xyz"));  // true
        System.out.println(samePredicate("abc", "abcd"));     // false

        // BinaryOperator in reduce
        List<Integer> nums = List.of(1, 2, 3, 4);
        int product = nums.stream().reduce(1, (a1, a2) -> a1 * a2);  // BinaryOperator
        System.out.println("Product: " + product);  // 24
    }

    static boolean samePredicate(String s1, String s2) {
        BiPredicate<String, String> sameLength = (a, b) -> a.length() == b.length();
        return sameLength.test(s1, s2);
    }
}
```

**Key takeaway**

`Bi*` interfaces cover **two-argument** operations. For 3+ arguments, create a custom `@FunctionalInterface` or use currying with nested functions.

---

# Java New Features by Version (Q221–Q224)

> Major language and library additions from Java 5 through Java 8 — the versions most commonly asked in interviews.

---

## Q221

**Answer**

**Java 5 (2004)** — "Tiger" — the biggest release before Java 8. Major features:

| Feature | Purpose |
|---------|---------|
| **Generics** | Type-safe collections |
| **Enhanced for-loop (for-each)** | Iterate collections/arrays cleanly |
| **Autoboxing / Unboxing** | Automatic `int` ↔ `Integer` conversion |
| **Enums** | Type-safe constants |
| **Varargs** | Variable argument lists |
| **Annotations** | Metadata (`@Override`, `@Deprecated`) |
| **java.util.concurrent** | Thread pools, locks, concurrent collections |
| **Scanner** | Parse primitive types from input streams |
| **StringBuilder** | Mutable string builder (prefer over `StringBuffer` for single-thread) |

**Example**

```java
import java.util.*;
import java.util.concurrent.*;

// Generics + enhanced for-loop + autoboxing
public class Java5Features {
    enum Day { MON, TUE, WED, THU, FRI }

    // Varargs
    static int sum(int... numbers) {
        int total = 0;
        for (int n : numbers) {   // enhanced for-loop
            total += n;
        }
        return total;
    }

    public static void main(String[] args) throws Exception {
        // Generics
        List<String> names = new ArrayList<>();
        names.add("Alice");

        // Autoboxing
        Integer boxed = 42;
        int unboxed = boxed;

        // Enum
        Day today = Day.MON;
        System.out.println(today);

        // Varargs
        System.out.println(sum(1, 2, 3, 4));  // 10

        // java.util.concurrent — ExecutorService (Java 5)
        ExecutorService pool = Executors.newFixedThreadPool(2);
        Future<Integer> future = pool.submit(() -> 42);
        System.out.println(future.get());
        pool.shutdown();

        // Scanner
        Scanner sc = new Scanner("123 45.6 true");
        System.out.println(sc.nextInt());    // 123
        System.out.println(sc.nextDouble()); // 45.6
        System.out.println(sc.nextBoolean()); // true
    }
}
```

**Key takeaway**

Java 5 introduced **generics**, **enums**, **annotations**, and the **concurrent utilities** package — foundational for modern Java.

---

## Q222

**Answer**

**Java 6 (2006)** — mostly library and platform improvements; **no major language syntax changes**. Notable additions:

| Feature | Purpose |
|---------|---------|
| **Scripting API (JSR 223)** | Embed scripting languages (Groovy, JavaScript) |
| **JDBC 4.0** | `DriverManager` auto-loading, `@SQL*` annotations |
| **Java Compiler API** | Programmatic access to `javac` |
| **Pluggable annotations processing** | Annotation processors in `javax.annotation.processing` |
| **Web Services (@WebService)** | JAX-WS annotations for SOAP services |
| **`Console` class** | Read passwords without echo |
| **Performance improvements** | JVM, collections, concurrency tuning |

**Example**

```java
import javax.script.*;
import java.sql.*;
import java.util.*;

public class Java6Features {
    public static void main(String[] args) throws Exception {
        // Scripting API — evaluate JavaScript (requires JS engine on classpath)
        ScriptEngineManager manager = new ScriptEngineManager();
        ScriptEngine engine = manager.getEngineByName("javascript");
        if (engine != null) {
            Object result = engine.eval("1 + 2 * 3");
            System.out.println("Script result: " + result);  // 7
        }

        // JDBC 4.0 — drivers auto-loaded from classpath (no Class.forName needed)
        // Connection conn = DriverManager.getConnection(url, user, pass);

        // Console — password input (no echo)
        // Console console = System.console();
        // if (console != null) {
        //     char[] pwd = console.readPassword("Password: ");
        // }

        // Collections improvements (Java 6)
        Set<String> set = new HashSet<>();
        set.add("a");
        // Deque added in Java 6
        Deque<String> deque = new ArrayDeque<>();
        deque.addFirst("front");
        deque.addLast("back");
        System.out.println(deque);  // [front, back]
    }
}
```

**Key takeaway**

Java 6 is often called a **"library release"** — fewer syntax changes, more APIs (scripting, JDBC 4, compiler API). Know it exists but focus interview prep on Java 5, 7, and 8.

---

## Q223

**Answer**

**Java 7 (2011)** — "Project Coin" — small language changes plus significant library updates:

| Feature | Purpose |
|---------|---------|
| **Diamond operator `<>`** | Type inference in constructor |
| **Strings in switch** | `switch` on `String` values |
| **Try-with-resources** | Auto-close `AutoCloseable` resources |
| **Multi-catch** | `catch (IOException \| SQLException e)` |
| **Binary literals** | `0b1010` |
| **Underscores in numerics** | `1_000_000` |
| **`Objects` utility class** | `equals`, `hashCode`, `requireNonNull` |
| **NIO.2 (`java.nio.file`)** | Modern file I/O (`Files`, `Path`) |
| **`ForkJoinPool`** | Divide-and-conquer parallelism |
| **WatchService** | File system change notifications |

**Example**

```java
import java.io.*;
import java.nio.file.*;
import java.util.*;

public class Java7Features {
    static class Resource implements AutoCloseable {
        @Override public void close() { System.out.println("Resource closed"); }
    }

    public static void main(String[] args) throws Exception {
        // Diamond operator
        Map<String, List<Integer>> map = new HashMap<>();

        // String switch
        String cmd = "start";
        switch (cmd) {
            case "start" -> System.out.println("Starting");
            case "stop"  -> System.out.println("Stopping");
            default      -> System.out.println("Unknown");
        }

        // Try-with-resources — auto-close even on exception
        try (Resource r = new Resource();
             BufferedReader reader = new BufferedReader(new StringReader("line1\nline2"))) {
            System.out.println(reader.readLine());
        } // close() called automatically

        // Multi-catch
        try {
            throw new IOException("io fail");
        } catch (IOException | UncheckedIOException e) {
            System.out.println("Caught: " + e.getClass().getSimpleName());
        }

        // Numeric literals
        int binary = 0b1010;       // 10
        long million = 1_000_000L; // 1000000

        // Objects utility
        String name = Objects.requireNonNull("Alice", "name must not be null");
        System.out.println(Objects.equals(name, "Alice"));  // true

        // NIO.2
        Path temp = Files.createTempFile("demo", ".txt");
        Files.writeString(temp, "Hello Java 7+");
        System.out.println(Files.readString(temp));
        Files.deleteIfExists(temp);
    }
}
```

**Key takeaway**

Java 7's **try-with-resources**, **diamond operator**, and **NIO.2** are still everyday tools. Multi-catch and numeric literals are nice but less frequently discussed.

---

## Q224

**Answer**

**Java 8 (2014)** — the **largest modern release**. Transformed Java with functional programming and streams:

| Feature | Purpose |
|---------|---------|
| **Lambda expressions** | Pass behavior as data |
| **Functional interfaces** | `Predicate`, `Function`, `Consumer`, etc. |
| **Stream API** | Declarative data processing |
| **Method references** | `String::toUpperCase` |
| **Default methods in interfaces** | Add methods without breaking implementers |
| **Static methods in interfaces** | Utility methods on interfaces |
| **Optional** | Explicit null handling |
| **`java.time` (JSR-310)** | Modern date/time API |
| **CompletableFuture** | Async composition |
| **Parallel streams** | Multi-core data processing |
| **Nashorn JavaScript engine** | JS on JVM (removed in Java 15+) |

**Example**

```java
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;

// Default method in interface
interface Greeter {
    String greet(String name);

    default String greetLoudly(String name) {
        return greet(name).toUpperCase() + "!";
    }

    static Greeter formal() {
        return name -> "Good day, " + name;
    }
}

public class Java8Features {
    record Person(String name, int age) {}

    public static void main(String[] args) throws Exception {
        // Lambda + Stream
        List<Person> people = List.of(
            new Person("Alice", 30),
            new Person("Bob", 25),
            new Person("Charlie", 35)
        );

        List<String> adults = people.stream()
            .filter(p -> p.age() >= 30)
            .map(Person::name)
            .sorted()
            .toList();
        System.out.println(adults);  // [Alice, Charlie]

        // Optional — avoid NullPointerException
        Optional<String> maybe = Optional.ofNullable(getNickname("Alice"));
        System.out.println(maybe.orElse("Anonymous"));

        // java.time — immutable, thread-safe
        LocalDate today = LocalDate.now();
        LocalDateTime meeting = today.atTime(14, 30);
        Duration until = Duration.between(LocalDateTime.now(), meeting);
        System.out.println("Meeting at: " + meeting);

        // CompletableFuture — async pipeline
        CompletableFuture<String> future = CompletableFuture
            .supplyAsync(() -> fetchUser("123"))
            .thenApply(user -> "Hello, " + user)
            .exceptionally(ex -> "Guest");

        System.out.println(future.get());

        // Interface default + static methods
        Greeter greeter = Greeter.formal();
        System.out.println(greeter.greetLoudly("Alice"));  // GOOD DAY, ALICE!

        // Parallel stream (use carefully — not always faster)
        long count = IntStream.range(1, 1_000_000)
            .parallel()
            .filter(n -> n % 2 == 0)
            .count();
        System.out.println("Evens: " + count);
    }

    static String getNickname(String name) { return null; }
    static String fetchUser(String id) { return "Alice"; }
}
```

**Key takeaway**

Java 8 is the **must-know release** for interviews: lambdas, streams, Optional, and `java.time`. Most "modern Java" codebases target Java 8+ because of these features.

---

### Brief Context: Java 9+ (Optional)

Java did not stop at 8. For modern context in interviews:

| Version | Highlights |
|---------|------------|
| **Java 9** | Modules (JPMS), `List.of()`, private interface methods, JShell |
| **Java 10** | `var` local type inference |
| **Java 11 (LTS)** | HTTP Client, `String` methods (`isBlank`, `lines`), removed Java EE modules |
| **Java 14** | Records (preview), switch expressions |
| **Java 17 (LTS)** | Sealed classes, records final, pattern matching for `instanceof` |
| **Java 21 (LTS)** | Virtual threads (Project Loom), sequenced collections, pattern matching for switch |

If asked "what's new in Java?", lead with **Java 8** depth, then mention your project's LTS version (11, 17, or 21) with 2–3 concrete features.

**Key takeaway**

Master **Java 8** thoroughly; name your project's LTS version for anything newer. Interviewers asking Q221–Q224 expect **5, 6, 7, 8** answered completely.
