---
id: java-interview-basics
level: basics
---

# Java — Interview (Basics)

# Java Core — Platform, Wrapper Classes & Strings

Interview study guide with detailed answers and practical code examples.

---

## Q1. Why is Java so popular?

**Answer:** Java remains widely used because it balances productivity, portability, performance, and ecosystem maturity. Key reasons include:

- **Write Once, Run Anywhere (WORA):** Compiled bytecode runs on any JVM, reducing platform lock-in.
- **Strong ecosystem:** Massive libraries (Spring, Hibernate, Apache projects), tooling (Maven, Gradle, IntelliJ), and community support.
- **Enterprise adoption:** Banks, telecom, and large SaaS platforms rely on Java for long-lived, maintainable systems.
- **Automatic memory management:** Garbage collection removes manual memory management (unlike C/C++).
- **Security model:** Bytecode verification, classloader isolation, and security manager (legacy) support safer deployment.
- **Performance:** Modern JVMs (G1, ZGC, Shenandoah) deliver near-native speed via JIT compilation and optimizations.
- **Backward compatibility:** Code written for older Java versions often runs on newer JDKs with minimal changes.

**Example:**

```java
// Same JAR runs on macOS, Linux, Windows — only a compatible JVM is required
public class HelloJava {
    public static void main(String[] args) {
        System.out.println("Running on: " + System.getProperty("os.name"));
    }
}
```

**Key takeaway:** Java's popularity comes from portability, a mature ecosystem, and JVM performance — not from being the newest language.

**Interview tip:** Mention both historical reasons (enterprise, WORA) and modern reasons (Spring Boot, cloud-native, GraalVM native image).

---

## Q2. What is platform independence?

**Answer:** Platform independence means Java source code compiles to **platform-neutral bytecode** (`.class` files), which the **JVM** interprets or JIT-compiles for the underlying OS and CPU. You do not recompile for each platform; you ship bytecode plus a JVM for the target environment.

Flow: `Source (.java)` → `javac` → `Bytecode (.class)` → `JVM (platform-specific)` → native machine code.

**Example:**

```bash
# Compile once on any machine with JDK
javac HelloJava.java   # produces HelloJava.class (bytecode)

# Run on any machine with a JVM
java HelloJava
```

```java
public class HelloJava {
    public static void main(String[] args) {
        System.out.println("Platform: " + System.getProperty("os.arch"));
    }
}
```

**Key takeaway:** Java is platform-independent at the **bytecode** level; the JVM is platform-dependent.

**Interview tip:** Clarify that "platform independent" does not mean "no JVM needed" — the JVM is the abstraction layer.

---

## Q3. What is bytecode?

**Answer:** Bytecode is the intermediate, stack-based instruction set produced by `javac`. It is neither human-readable source nor native machine code. The JVM loads bytecode, verifies it for safety, then executes it via the interpreter and/or JIT compiler.

Properties:
- Stored in `.class` files (one primary public class per file, name matches class name).
- Compact and portable across JVM implementations.
- Subject to **bytecode verification** before execution (type safety, stack integrity).

**Example:**

```java
// Source: Add.java
public class Add {
    public static int sum(int a, int b) {
        return a + b;
    }
}
```

```bash
javac Add.java
javap -c Add    # disassemble to bytecode instructions
```

Sample `javap` output (abbreviated):

```
public static int sum(int, int);
  Code:
     0: iload_0      // load first int arg
     1: iload_1      // load second int arg
     2: iadd         // add
     3: ireturn      // return int
```

**Key takeaway:** Bytecode is the portable contract between Java compiler and JVM.

**Interview tip:** If asked "is bytecode interpreted or compiled?" — answer **both**: interpreted first, then hot methods are JIT-compiled to native code.

---

## Q4. Compare JDK vs JVM vs JRE (table + examples)

**Answer:**

| Component | Full Name | Purpose | Contains / Provides | Who Needs It |
|-----------|-----------|---------|---------------------|--------------|
| **JDK** | Java Development Kit | Develop, compile, debug, and run Java | `javac`, `jar`, `javadoc`, `jshell`, JVM, standard libraries | Developers |
| **JRE** | Java Runtime Environment | Run Java applications (legacy term) | JVM + core libraries | End users (pre-JDK 11) |
| **JVM** | Java Virtual Machine | Execute bytecode on a specific OS/CPU | Class loading, memory areas, GC, JIT, bytecode verification | Everyone running Java |

**Modern note (JDK 9+):** Oracle stopped shipping a separate JRE; the JDK includes everything needed to run Java. Interviewers may still use "JRE" colloquially to mean "runtime only."

**Example:**

```bash
# JDK tools (development)
javac App.java          # compile
java App                # run via embedded JVM
javadoc App.java        # generate docs

# JVM is what actually executes App.class
java -version           # shows JVM + JDK version
```

```java
// App.java — needs JDK to compile, needs JVM (included in JDK) to run
public class App {
    public static void main(String[] args) {
        Runtime rt = Runtime.getRuntime();
        System.out.println("Max memory (MB): " + rt.maxMemory() / (1024 * 1024));
    }
}
```

**Key takeaway:** JDK = develop + run; JVM = execute bytecode; JRE = historical "run-only" bundle.

**Interview tip:** Draw the diagram: Developer → `javac` → `.class` → JVM → OS/Hardware.

---

## Q5. Important differences between C++ and Java

**Answer:**

| Feature | C++ | Java |
|---------|-----|------|
| Memory management | Manual (`new`/`delete`, RAII) | Automatic garbage collection |
| Pointers | Explicit pointers and pointer arithmetic | No raw pointers (references only) |
| Multiple inheritance | Supported (classes) | Classes: single inheritance; interfaces: multiple |
| Platform | Compiled to native binary per platform | Bytecode + JVM |
| Operator overloading | Supported | Not supported |
| Preprocessor (`#define`) | Yes | No (constants via `final`, annotations) |
| Templates / generics | Compile-time templates | Type erasure at runtime |
| Struct vs class | `struct` and `class` differ | Only `class` (everything is a reference type unless primitive) |
| Destructors | Explicit destructors | Finalizers deprecated; use `try-with-resources` |
| Performance control | Fine-grained, low-level | JIT + GC trade-offs |

**Example — memory:**

```cpp
// C++ — manual cleanup required
int* arr = new int[100];
delete[] arr;
```

```java
// Java — GC reclaims when no longer reachable
int[] arr = new int[100];
// no delete needed
```

**Example — no pointer arithmetic:**

```java
int[] nums = {1, 2, 3};
// nums++;  // COMPILE ERROR — references are not pointer arithmetic
```

**Key takeaway:** Java trades low-level control for safety, portability, and simpler memory management.

**Interview tip:** Mention that Java was influenced by C++ syntax but designed for networked, portable, safer applications.

---

## Q6. Role of classloader in Java

**Answer:** Classloaders are responsible for **loading class bytecode into the JVM**, linking it (verification, preparation, resolution), and initializing static fields. They implement the **delegation model**: before loading a class, a classloader asks its parent first — ensuring core JDK classes (`java.lang.*`) are loaded by the bootstrap/platform classloader, not a rogue user-defined one.

Types (conceptual hierarchy):
1. **Bootstrap ClassLoader** — loads `rt.jar` / modules from `java.base` (native, represented as `null` in Java code).
2. **Platform (Extension) ClassLoader** — platform modules.
3. **Application (System) ClassLoader** — loads classes from application classpath.

Custom classloaders enable plugin architectures, hot deployment, and OSGi-style modularity.

**Example:**

```java
public class ClassLoaderDemo {
    public static void main(String[] args) {
        ClassLoader appCl = ClassLoaderDemo.class.getClassLoader();
        ClassLoader platformCl = appCl.getParent();
        ClassLoader bootstrapCl = platformCl.getParent(); // usually null

        System.out.println("App:       " + appCl);
        System.out.println("Platform:  " + platformCl);
        System.out.println("Bootstrap: " + bootstrapCl);

        // Who loaded String?
        System.out.println(String.class.getClassLoader()); // null → bootstrap
    }
}
```

**Example — custom classloader (simplified concept):**

```java
public class CustomClassLoader extends ClassLoader {
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        byte[] bytes = loadClassBytesFromDisk(name);
        return defineClass(name, bytes, 0, bytes.length);
    }

    private byte[] loadClassBytesFromDisk(String name) {
        throw new UnsupportedOperationException("Load .class bytes here");
    }
}
```

**Key takeaway:** Classloaders load, link, and initialize classes using parent-first delegation for security and consistency.

**Interview tip:** Connect to `ClassNotFoundException` vs `NoClassDefFoundError`: the former at load time when explicitly requested; the latter when a class was available at compile time but missing at runtime.

---

## Q7. What are Wrapper classes?

**Answer:** Wrapper classes are object representations of Java's eight **primitive types**. They belong to `java.lang` and allow primitives to be used wherever objects are required (collections, generics, nullability).

| Primitive | Wrapper Class |
|-----------|---------------|
| `byte` | `Byte` |
| `short` | `Short` |
| `int` | `Integer` |
| `long` | `Long` |
| `float` | `Float` |
| `double` | `Double` |
| `char` | `Character` |
| `boolean` | `Boolean` |

**Example:**

```java
import java.util.List;

List<Integer> scores = List.of(95, 87, 100); // generics need objects, not int

Integer boxed = Integer.valueOf(42);
int unboxed = boxed.intValue();
```

**Key takeaway:** Wrapper classes bridge primitives and the object-oriented APIs of Java.

---

## Q8. Why do we need Wrapper classes?

**Answer:**

1. **Collections and generics** — `List<int>` is illegal; use `List<Integer>`.
2. **Null representation** — primitives cannot be `null`; wrappers can (e.g., optional DB column).
3. **Utility methods** — parsing, conversion, bit manipulation (`Integer.parseInt`, `Integer.toHexString`).
4. **Reflection and APIs** — many libraries expect objects.
5. **Synchronized with object semantics** — use as keys in `Map<Object, V>` when needed.

**Example:**

```java
Map<Integer, String> idToName = Map.of(1, "Alice", 2, "Bob");

// Nullable Integer — useful for "value not set"
Integer optionalAge = null;

// Parsing user input
String input = "42";
int value = Integer.parseInt(input);
```

**Key takeaway:** Wrappers let primitives participate in object-only APIs and express absence via `null`.

**Interview tip:** Also mention performance cost (heap allocation) vs convenience — reason autoboxing exists but should be used mindfully in hot loops.

---

## Q9. Different ways of creating Wrapper class instances

**Answer:** For most numeric wrappers, there are two primary approaches:

1. **Constructor (deprecated since Java 9, removed/discouraged):** `new Integer(5)` — always creates new object (wasteful).
2. **`valueOf()` static factory (preferred):** `Integer.valueOf(5)` — may return cached instance for common values.
3. **Autoboxing (syntactic sugar):** `Integer x = 5;` — compiler converts to `Integer.valueOf(5)`.

For `Boolean`, use `Boolean.valueOf(true)` or autoboxing; avoid `new Boolean(...)`.

**Example:**

```java
// Preferred
Integer a = Integer.valueOf(127);
Integer b = Integer.valueOf(127);

// Autoboxing (same as valueOf)
Integer c = 127;
Integer d = 127;

// Deprecated — do not use in modern code
@Deprecated(since = "9")
@SuppressWarnings("removal")
Integer oldStyle = new Integer(5); // removed in later Java versions
```

**Key takeaway:** Use `valueOf()` or autoboxing; never use deprecated constructors.

---

## Q10. Differences between the two ways

**Answer:**

| Aspect | `new Integer(127)` (deprecated) | `Integer.valueOf(127)` |
|--------|----------------------------------|-------------------------|
| Object creation | Always new heap object | May reuse cached instance |
| Memory | More allocations | Fewer for cached range |
| API status | Deprecated / removed | Recommended |
| `==` comparison | Reference identity | May be `true` for cached values |
| Autoboxing | N/A | Compiler uses `valueOf` |

**Caching:** `Integer.valueOf` caches **-128 to 127** by default (configurable via `-XX:AutoBoxCacheMax` for upper bound). Same idea for `Byte`, `Short`, `Long` (Long caches -128..127), `Character` (0..127).

**Example:**

```java
Integer x = Integer.valueOf(127);
Integer y = Integer.valueOf(127);
System.out.println(x == y);        // true (same cached instance)

Integer p = Integer.valueOf(128);
Integer q = Integer.valueOf(128);
System.out.println(p == q);        // false (different objects)

System.out.println(p.equals(q));   // true (value comparison — always use this)
```

**Key takeaway:** Always compare wrapper values with `.equals()`, not `==`, unless you intentionally test reference identity.

**Interview tip:** This `-128 to 127` cache question is a classic trap — explain it confidently.

---

## Q11. What is autoboxing?

**Answer:** Autoboxing is automatic conversion from a **primitive to its wrapper** by the compiler. Unboxing is the reverse. The compiler inserts calls like `Integer.valueOf()` and `intValue()`.

**Example:**

```java
// Autoboxing: int → Integer
Integer count = 10;  // compiler: Integer count = Integer.valueOf(10);

// Unboxing: Integer → int
int primitive = count;  // compiler: int primitive = count.intValue();

// In expressions
Integer total = count + 5;  // unbox count, add, autobox result
```

**Example — collections:**

```java
List<Integer> list = new ArrayList<>();
list.add(42);           // autoboxing
int first = list.get(0); // unboxing
```

**Key takeaway:** Autoboxing hides wrapper conversion but still has runtime cost and NPE risk on unboxing `null`.

---

## Q12. Advantages of autoboxing

**Answer:**

1. **Cleaner syntax** — no manual `valueOf` / `xxxValue()` in everyday code.
2. **Generics interoperability** — seamlessly use primitives with collections.
3. **Operator support** — arithmetic on `Integer` works via unboxing.
4. **Varargs and APIs** — pass primitives where objects expected.

**Example:**

```java
Map<String, Integer> wordCount = new HashMap<>();
wordCount.put("java", wordCount.getOrDefault("java", 0) + 1);
// getOrDefault returns Integer 0, unboxes for +, autoboxes result
```

**Caution (not an advantage, but interviewers expect it):**

```java
Integer n = null;
// int x = n;  // NullPointerException on unboxing
```

**Key takeaway:** Autoboxing improves readability but requires awareness of null and performance in tight loops.

---

## Q13. What is casting?

**Answer:** Casting converts a value from one numeric type to another (primitives or compatible references). For primitives, casting may require widening or narrowing. For references, casting adjusts the declared type for polymorphic access (with runtime checks).

Two categories:
- **Primitive casting:** changing `int` to `long`, `double` to `int`, etc.
- **Reference casting:** `(Dog) animal` when you know the runtime type.

**Example — primitive:**

```java
int i = 100;
long L = i;       // widening — no cast needed
byte b = (byte) i; // narrowing — explicit cast required
```

**Example — reference:**

```java
Animal a = new Dog();
Dog d = (Dog) a;  // downcast — ClassCastException if wrong type
```

**Key takeaway:** Casting tells the compiler to treat a value as another type; reference downcasts are validated at runtime.

---

## Q14. Implicit casting

**Answer:** Implicit casting (widening conversion) happens automatically when converting to a **larger** or more precise type without data loss risk (with some caveats for `char`). The compiler inserts the conversion silently.

Widening order (examples): `byte` → `short` → `int` → `long` → `float` → `double`; `char` → `int`.

**Example:**

```java
byte b = 10;
int i = b;        // implicit widening
long L = i;       // implicit
double d = L;     // implicit

char c = 'A';
int code = c;     // implicit — char to int
```

**Example — expressions:**

```java
byte x = 1, y = 2;
// byte z = x + y;  // COMPILE ERROR — x+y promotes to int
int sum = x + y;   // OK — implicit int assignment
```

**Key takeaway:** Implicit casting is safe widening performed automatically by the compiler.

**Interview tip:** Remember **binary numeric promotion**: `byte`, `short`, and `char` promote to `int` in arithmetic.

---

## Q15. Explicit casting

**Answer:** Explicit casting (narrowing conversion) is required when converting to a **smaller** type or when precision may be lost. You must write the target type in parentheses. Reference downcasting also requires explicit syntax.

**Example — primitive narrowing:**

```java
int i = 130;
byte b = (byte) i;   // b becomes -126 (overflow/truncation)
double d = 9.99;
int n = (int) d;     // n becomes 9 (fraction truncated)
```

**Example — reference downcast:**

```java
Animal animal = new Cat();
Cat cat = (Cat) animal;

Animal wrong = new Dog();
// Cat fail = (Cat) wrong;  // ClassCastException at runtime
```

**Example — safe downcast with `instanceof` (Java 16+ pattern matching):**

```java
if (animal instanceof Cat c) {
    c.meow();
}
```

**Key takeaway:** Explicit casts are mandatory for narrowing primitives and reference downcasts; they may lose data or fail at runtime.

---

## Q16. Are all Strings immutable?

**Answer:** Yes. **`String` objects are immutable** — their character sequence cannot change after creation. Any operation that appears to modify a string (`concat`, `replace`, `toUpperCase`) returns a **new** `String` instance.

Benefits:
- **String pool reuse** — safe sharing of literals.
- **Thread safety** — immutable objects need no synchronization.
- **Security** — passwords and file paths cannot be altered after creation.
- **Stable hash code** — safe for `HashMap` keys.

**Example:**

```java
String s1 = "hello";
String s2 = s1.concat(" world");  // s1 still "hello"
System.out.println(s1);           // hello
System.out.println(s2);           // hello world

// "Modification" via reflection is possible but breaks immutability contract — never do this in production
```

**Note:** `StringBuilder` and `StringBuffer` are **mutable** — not the same class as `String`.

**Key takeaway:** `String` never changes in place; methods return new strings.

**Interview tip:** Distinguish immutability of `String` from mutability of `char[]` used internally (since Java 9+, a `byte[]` + coder for compact strings).

---

## Q17. Where are String values stored in memory?

**Answer:** This evolved across Java versions — know both classic and modern answers:

**Classic (Java 7 and earlier interview answer):**
- **String literals** → **String Pool (PermGen)**, a special area inside the heap's permanent generation.
- **`new String("...")`** → object on heap; `"..."` literal may still be interned in pool separately.

**Modern (Java 8+):**
- **String Pool** lives in the **heap** (PermGen removed; pool is part of regular heap).
- **String object** stores characters (Java 9+: often compact `byte[]` + `coder` for Latin-1 vs UTF-16).

**Interning:** `String.intern()` returns the canonical pool instance for equal content.

**Example:**

```java
String literal = "java";              // may come from string pool
String heap = new String("java");     // new object on heap (unless optimized away)
String interned = heap.intern();      // pool reference

System.out.println(literal == "java");     // true (same pool entry)
System.out.println(literal == heap);       // false (usually)
System.out.println(literal == interned);   // true
System.out.println(literal.equals(heap));  // true
```

**Key takeaway:** Literals and interned strings share the pool; `new String()` creates a distinct heap object — compare with `.equals()`.

**Interview tip:** Say "String pool is in the heap since Java 7" to show updated knowledge.

---

## Q18. Why careful about String concatenation (+) in loops?

**Answer:** The `+` operator on strings creates **new `String` objects** repeatedly because `String` is immutable. In a loop, each iteration allocates and copies prior content — **O(n²) time and memory** for building length-n result.

**Example — problematic:**

```java
String result = "";
for (int i = 0; i < 10_000; i++) {
    result += i;  // creates new String every iteration
}
// Very slow and memory-heavy for large loops
```

**What happens internally (conceptually):**

```java
// Iteration 1: new String("")
// Iteration 2: new String("0")
// Iteration 3: new String("01")
// ... thousands of throwaway objects → GC pressure
```

**Key takeaway:** `+` in loops repeatedly copies strings; avoid for large or hot-path concatenation.

**Interview tip:** Mention that the compiler optimizes **compile-time constant** concatenation (`"a" + "b"`) but not loop accumulation.

---

## Q19. How to solve above problem?

**Answer:** Use **`StringBuilder`** (single-threaded, faster) or **`StringBuffer`** (thread-safe) to mutate a buffer, then call `toString()` once. For Java 8+, **`String.join`**, **`String.format`**, or streams may also fit.

**Example — StringBuilder (preferred in loops):**

```java
StringBuilder sb = new StringBuilder();
for (int i = 0; i < 10_000; i++) {
    sb.append(i);
}
String result = sb.toString();  // one final String allocation
```

**Example — String.join:**

```java
List<String> parts = List.of("Java", "Spring", "Interview");
String joined = String.join(", ", parts);  // "Java, Spring, Interview"
```

**Example — formatted:**

```java
String msg = String.format("User %s scored %d", "Alice", 95);
```

**Key takeaway:** Accumulate with `StringBuilder` in loops; convert to `String` only when done.

---

## Q20. Differences String vs StringBuffer

**Answer:**

| Feature | `String` | `StringBuffer` |
|---------|----------|----------------|
| Mutability | Immutable | Mutable |
| Thread safety | Inherently thread-safe (immutable) | Synchronized methods — thread-safe |
| Performance | Fine for few operations | Slower than StringBuilder due to locking |
| Introduced | Java 1.0 | Java 1.0 |
| When to use | Constants, keys, short concat | Legacy shared mutable buffer across threads |

**Example:**

```java
String s = "hello";
// s.append("!");  // COMPILE ERROR — no append on String

StringBuffer sb = new StringBuffer("hello");
sb.append(" world");           // modifies same object
System.out.println(sb);        // hello world
```

**Key takeaway:** `String` is immutable; `StringBuffer` is mutable and synchronized.

**Interview tip:** In modern code, prefer `StringBuilder` over `StringBuffer` unless multiple threads mutate the same buffer.

---

## Q21. Differences StringBuilder vs StringBuffer

**Answer:**

| Feature | `StringBuilder` | `StringBuffer` |
|---------|-----------------|----------------|
| Thread safety | Not synchronized | Synchronized |
| Performance | Faster (no lock overhead) | Slower under contention |
| Introduced | Java 5 | Java 1.0 |
| API | Same append/insert/delete methods | Same API |
| Use case | Single-threaded string building | Multi-threaded shared builder (rare) |

**Example:**

```java
StringBuilder fast = new StringBuilder();
fast.append("Java ").append(17);

StringBuffer safe = new StringBuffer();
safe.append("thread-safe ");
// Both produce mutable buffers; only StringBuffer synchronizes each method
```

**Key takeaway:** Use `StringBuilder` by default; `StringBuffer` only when thread-safe mutation of the same instance is required.

---

## Q22. Examples of utility methods in String class

**Answer:** `String` provides rich text manipulation and inspection methods. Common categories: length/empty checks, searching, substring, case conversion, trimming, splitting, joining, formatting, comparison.

**Example:**

```java
String text = "  Hello, Java World  ";

// Inspection
System.out.println(text.length());              // 22
System.out.println(text.isBlank());             // false (Java 11+)
System.out.println(text.isEmpty());             // false

// Trimming
System.out.println(text.strip());               // "Hello, Java World" (Java 11+)
System.out.println(text.trim());                // legacy trim

// Search
System.out.println(text.contains("Java"));      // true
System.out.println(text.indexOf("Java"));       // 9
System.out.println(text.startsWith("  Hello")); // true

// Substring and replace
System.out.println(text.substring(9, 13));        // "Java"
System.out.println(text.replace("Java", "Spring"));

// Case
System.out.println("abc".equalsIgnoreCase("ABC")); // true
System.out.println("hello".toUpperCase());

// Split and join
String[] words = "apple,banana,cherry".split(",");
String csv = String.join("-", "a", "b", "c");   // a-b-c

// Comparison (lexicographic)
System.out.println("apple".compareTo("banana")); // negative

// Static helpers
System.out.println(String.valueOf(42));         // "42"
System.out.println(String.format("%.2f", 3.14159));
```

**Key takeaway:** Prefer `strip()`, `isBlank()`, `lines()`, and `repeat()` (Java 11+) for modern string handling.

**Interview tip:** Always mention `equals()` vs `==` for strings — content equality vs reference identity (pool vs heap).

---

# Java Core — OOP Basics

Interview study guide with detailed answers and practical code examples.

---

## Q23. What is a class?

**Answer:** A **class** is a blueprint or template that defines the structure and behavior of objects. It declares **fields** (state), **methods** (behavior), **constructors**, and optionally nested types. A class exists at compile time; objects are created from it at runtime.

**Example:**

```java
public class BankAccount {
    // fields — state
    private String accountNumber;
    private double balance;

    // constructor — object creation
    public BankAccount(String accountNumber, double initialDeposit) {
        this.accountNumber = accountNumber;
        this.balance = initialDeposit;
    }

    // methods — behavior
    public void deposit(double amount) {
        if (amount > 0) balance += amount;
    }

    public double getBalance() {
        return balance;
    }
}
```

**Key takeaway:** A class defines what objects of that type know (fields) and do (methods).

---

## Q24. What is an object?

**Answer:** An **object** is a runtime instance of a class — a concrete entity with its own state (field values) and access to the class's behavior (methods). Objects are created with `new` and referenced by variables on the stack pointing to heap memory.

**Example:**

```java
public class ObjectDemo {
    public static void main(String[] args) {
        BankAccount alice = new BankAccount("ACC-001", 1000.0);
        BankAccount bob   = new BankAccount("ACC-002", 500.0);

        alice.deposit(200);
        System.out.println(alice.getBalance()); // 1200.0
        System.out.println(bob.getBalance());   // 500.0 — separate object, separate state
    }
}
```

**Key takeaway:** Objects are instances; each has independent state but shares the class's method definitions.

**Interview tip:** Distinguish **reference variable** (stack) from **object** (heap): `BankAccount a = new BankAccount(...)` — `a` is the reference, the object lives on the heap.

---

## Q25. What is state of an object?

**Answer:** **State** is the current values of an object's instance fields at a given moment. State changes through methods that assign new values to fields. Encapsulation protects state via access modifiers and controlled mutators.

**Example:**

```java
public class User {
    private String name;
    private boolean active;

    public User(String name) {
        this.name = name;
        this.active = true;  // initial state
    }

    public void deactivate() {
        this.active = false; // state change
    }

    public String getName() { return name; }
    public boolean isActive() { return active; }
}
```

```java
User u = new User("Alice");
// State: name="Alice", active=true
u.deactivate();
// State: name="Alice", active=false
```

**Key takeaway:** State = snapshot of all instance field values; behavior methods transition between states.

---

## Q26. What is behavior of an object?

**Answer:** **Behavior** is what an object can do — defined by instance and static methods. Methods operate on the object's state (and sometimes on arguments or external resources). Polymorphism allows the same method call to exhibit different behavior based on runtime type.

**Example:**

```java
public interface Notifier {
    void send(String message);  // contract for behavior
}

public class EmailNotifier implements Notifier {
    @Override
    public void send(String message) {
        System.out.println("Email: " + message);
    }
}

public class SmsNotifier implements Notifier {
    @Override
    public void send(String message) {
        System.out.println("SMS: " + message);
    }
}
```

```java
Notifier n = new EmailNotifier();
n.send("Hello");  // behavior: email delivery
n = new SmsNotifier();
n.send("Hello");  // behavior: SMS delivery
```

**Key takeaway:** Behavior is expressed through methods; polymorphism lets subclasses provide specialized implementations.

---

## Q27. What is the Object class?

**Answer:** `java.lang.Object` is the **root superclass** of every class in Java (directly or indirectly). If a class extends nothing explicitly, it extends `Object`. Core methods: `toString()`, `equals(Object)`, `hashCode()`, `getClass()`, `clone()`, `finalize()` (deprecated), and `wait/notify/notifyAll`.

**Example:**

```java
public class Product {
    private final String sku;

    public Product(String sku) {
        this.sku = sku;
    }

    // Implicitly extends Object — inherits default methods unless overridden
}

Product p = new Product("SKU-1");
System.out.println(p instanceof Object);  // true
System.out.println(p.getClass().getName()); // Product
```

**Key takeaway:** Every class inherits from `Object`; override `equals`, `hashCode`, and `toString` when instances represent domain values.

---

## Q28. Explain the toString() method

**Answer:** `toString()` returns a human-readable string representation of an object. The default implementation from `Object` returns `className@hashCodeHex`, which is rarely useful. Override it for logging, debugging, and UI display.

**Example — default vs overridden:**

```java
public class Order {
    private final long id;
    private final double total;

    public Order(long id, double total) {
        this.id = id;
        this.total = total;
    }

    @Override
    public String toString() {
        return "Order{id=" + id + ", total=" + total + "}";
    }
}
```

```java
Order order = new Order(42L, 99.50);
System.out.println(order);           // uses toString() implicitly
System.out.println(order.toString()); // Order{id=42, total=99.5}
```

**Key takeaway:** Override `toString()` to return meaningful diagnostic output, not the default identity string.

**Interview tip:** `System.out.println(obj)` calls `String.valueOf(obj)` which calls `obj.toString()`.

---

## Q29. Explain the equals() method

**Answer:** `equals(Object obj)` determines **logical equality** — whether two objects represent the same value. The default in `Object` uses `==` (reference equality). Override `equals` when two distinct instances can be considered equal based on field values.

Contract (must satisfy with `hashCode`):
- **Reflexive:** `x.equals(x)` is true.
- **Symmetric:** `x.equals(y)` iff `y.equals(x)`.
- **Transitive:** if `x.equals(y)` and `y.equals(z)`, then `x.equals(z)`.
- **Consistent:** repeated calls same result if state unchanged.
- **Null:** `x.equals(null)` is false.

**Example:**

```java
import java.util.Objects;

public final class Point {
    private final int x;
    private final int y;

    public Point(int x, int y) {
        this.x = x;
        this.y = y;
    }

    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (!(obj instanceof Point other)) return false;
        return x == other.x && y == other.y;
    }

    @Override
    public int hashCode() {
        return Objects.hash(x, y);
    }
}
```

```java
Point a = new Point(1, 2);
Point b = new Point(1, 2);
System.out.println(a == b);       // false — different references
System.out.println(a.equals(b));   // true — same values
```

**Key takeaway:** Use `equals()` for value comparison; always override `hashCode()` when overriding `equals()`.

---

## Q30. Explain the hashCode() method

**Answer:** `hashCode()` returns an integer hash value used by hash-based collections (`HashMap`, `HashSet`, `Hashtable`). Objects that are equal per `equals()` **must** have the same `hashCode()`. Unequal objects may share a hash (collision) but good implementations minimize collisions.

**Example:**

```java
import java.util.HashSet;
import java.util.Set;

public class HashCodeDemo {
    public static void main(String[] args) {
        Point p1 = new Point(3, 4);
        Point p2 = new Point(3, 4);

        Set<Point> set = new HashSet<>();
        set.add(p1);
        System.out.println(set.contains(p2)); // true — equals + hashCode work together
    }
}
```

**Broken example (missing hashCode override):**

```java
// If equals is overridden but hashCode is not:
// set.add(p1); set.contains(p2) → may return FALSE even when p1.equals(p2)
```

**Key takeaway:** `hashCode` enables efficient bucket lookup; breaking the equals/hashCode contract breaks collections.

**Interview tip:** Use `Objects.hash(...)` or IDE generation; for immutable keys, compute hash from all significant fields.

---

## Q31. How do equals() and hashCode() work together?

**Answer:** Hash collections first use `hashCode()` to pick a bucket, then `equals()` to find an exact match among candidates in that bucket. Rule: **equal objects → same hashCode**. The converse is not required (different objects may collide).

Workflow in `HashMap.get(key)`:
1. Compute `key.hashCode()`.
2. Locate bucket.
3. Compare with entries using `equals()`.

**Example:**

```java
import java.util.HashMap;
import java.util.Map;

Map<Point, String> locationLabels = new HashMap<>();
Point home = new Point(10, 20);
locationLabels.put(home, "Home");

Point lookup = new Point(10, 20);
System.out.println(locationLabels.get(lookup)); // "Home" — if equals/hashCode correct
```

**Key takeaway:** `hashCode` narrows search; `equals` confirms match — both must be consistent for map/set correctness.

---

## Q32. What is inheritance? Give an example.

**Answer:** **Inheritance** allows a subclass (`extends`) to acquire fields and methods of a superclass, enabling code reuse and polymorphism. Java supports **single inheritance** for classes (one direct parent). Subclasses can override methods and add new members.

**Example:**

```java
public class Vehicle {
    protected String brand;

    public Vehicle(String brand) {
        this.brand = brand;
    }

    public void start() {
        System.out.println(brand + " starting...");
    }
}

public class ElectricCar extends Vehicle {
    private int batteryKwh;

    public ElectricCar(String brand, int batteryKwh) {
        super(brand);  // call superclass constructor
        this.batteryKwh = batteryKwh;
    }

    @Override
    public void start() {
        System.out.println(brand + " starting silently (" + batteryKwh + " kWh)");
    }

    public void charge() {
        System.out.println("Charging " + brand);
    }
}
```

```java
Vehicle v = new ElectricCar("Tesla", 75);
v.start();  // polymorphism — ElectricCar.start() runs
```

**Key takeaway:** Inheritance models "is-a" relationships and enables method overriding and polymorphism.

---

## Q33. What is method overloading?

**Answer:** **Overloading** defines multiple methods in the **same class** with the **same name** but different **parameter lists** (type, count, or order). Return type alone does not distinguish overloads. Resolved at **compile time** (static binding).

**Example:**

```java
public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public double add(double a, double b) {
        return a + b;
    }

    public int add(int a, int b, int c) {
        return a + b + c;
    }
}
```

```java
Calculator calc = new Calculator();
System.out.println(calc.add(2, 3));       // 5 — int version
System.out.println(calc.add(2.5, 3.1));   // 5.6 — double version
```

**Key takeaway:** Overloading = same method name, different parameters, same class, compile-time resolution.

---

## Q34. What is method overriding?

**Answer:** **Overriding** occurs when a subclass provides a specific implementation of an instance method already defined in a parent class or interface. Requires compatible signature, same or covariant return type, and not weaker access. Resolved at **runtime** (dynamic dispatch) for instance methods.

Rules:
- Use `@Override` annotation.
- Static methods are **hidden**, not overridden.
- Private methods cannot be overridden (not inherited).

**Example:**

```java
public class Animal {
    public void speak() {
        System.out.println("Some sound");
    }
}

public class Dog extends Animal {
    @Override
    public void speak() {
        System.out.println("Woof!");
    }
}
```

```java
Animal a = new Dog();
a.speak();  // Woof! — runtime type Dog
```

**Key takeaway:** Overriding replaces superclass behavior in subclasses; JVM picks the implementation based on actual object type.

**Interview tip:** Contrast overloading (compile-time, same class) vs overriding (runtime, inheritance hierarchy).

---

## Q35. Can a superclass reference hold a subclass object?

**Answer:** Yes — this is fundamental to **polymorphism**. A variable declared as a superclass type can reference a subclass instance because of the **is-a** relationship. However, the reference can invoke only methods declared in the superclass (unless cast).

**Example:**

```java
Animal animal = new Dog();   // upcasting — implicit
animal.speak();              // Dog's overridden speak()

// animal.fetch();           // COMPILE ERROR — fetch() not in Animal

if (animal instanceof Dog dog) {
    dog.fetch();             // OK after downcast
}
```

```java
public class Dog extends Animal {
    public void fetch() {
        System.out.println("Fetching ball");
    }
}
```

**Key takeaway:** Superclass references can point to subclass objects; method calls use the object's runtime type for overridden methods.

---

## Q36. Does Java support multiple inheritance?

**Answer:** Java does **not** support **multiple inheritance of classes** (a class cannot `extends` two classes). This avoids the **diamond problem** (ambiguous method inheritance).

Java supports:
- **Single class inheritance:** one superclass.
- **Multiple interface implementation:** a class can `implements` many interfaces.
- **Default methods (Java 8+):** interfaces can have default implementations; compiler resolves conflicts explicitly.

**Example — multiple interfaces:**

```java
interface Flyable {
    void fly();
}

interface Swimmable {
    void swim();
}

class Duck implements Flyable, Swimmable {
    @Override public void fly()  { System.out.println("Flying"); }
    @Override public void swim() { System.out.println("Swimming"); }
}
```

**Example — diamond conflict with default methods:**

```java
interface A { default void hello() { System.out.println("A"); } }
interface B { default void hello() { System.out.println("B"); } }

// class C implements A, B { }  // COMPILE ERROR — must override hello()

class C implements A, B {
    @Override
    public void hello() {
        A.super.hello();  // explicit choice
    }
}
```

**Key takeaway:** Multiple class inheritance is forbidden; multiple interface inheritance is allowed with explicit conflict resolution.

---

## Q37. What is an interface?

**Answer:** An **interface** is a contract specifying **abstract behavior** (method signatures) that implementing classes must provide. Interfaces support multiple inheritance of type. Since Java 8, they may include `default` and `static` methods; Java 9+ allows `private` methods.

**Example:**

```java
public interface PaymentGateway {
    boolean charge(double amount);

    default void log(String msg) {
        System.out.println("[Payment] " + msg);
    }

    static PaymentGateway noop() {
        return amount -> true;
    }
}
```

```java
public class StripeGateway implements PaymentGateway {
    @Override
    public boolean charge(double amount) {
        log("Charging " + amount);
        return true;
    }
}
```

**Key takeaway:** Interfaces define capabilities; classes `implement` one or many interfaces.

---

## Q38. Can you declare variables in an interface?

**Answer:** Yes, but interface fields are implicitly **`public static final`** (constants). They must be initialized at declaration. Interfaces are not for mutable state.

**Example:**

```java
public interface AppConfig {
    int MAX_RETRIES = 3;                    // public static final
    String DEFAULT_LOCALE = "en-US";
    // int count;                           // COMPILE ERROR — must initialize
}
```

```java
System.out.println(AppConfig.MAX_RETRIES); // accessed via interface name
```

**Key takeaway:** Interface variables are constants only — public, static, and final.

---

## Q39. Can an interface extend another interface?

**Answer:** Yes. Interfaces use **`extends`** (not `implements`) to inherit other interfaces. A class implementing a sub-interface must implement all abstract methods from the entire hierarchy.

**Example:**

```java
interface Readable {
    String read();
}

interface Writable {
    void write(String data);
}

interface ReadWrite extends Readable, Writable {
    void flush();
}

class FileStore implements ReadWrite {
    @Override public String read() { return "data"; }
    @Override public void write(String data) { }
    @Override public void flush() { }
}
```

**Key takeaway:** Interfaces can extend multiple interfaces; classes implement the combined contract.

---

## Q40. Can a class implement multiple interfaces?

**Answer:** Yes. A class can `implements InterfaceA, InterfaceB, ...` and must provide implementations for all abstract methods (unless the class is abstract).

**Example:**

```java
interface Auditable {
    void audit();
}

interface SerializableMarker {
    // marker interface — no methods
}

class Invoice implements Auditable, SerializableMarker {
    @Override
    public void audit() {
        System.out.println("Invoice audited");
    }
}
```

**Key takeaway:** Multiple interface implementation gives Java flexible polymorphism without multiple class inheritance.

---

## Q41. What is a marker interface?

**Answer:** A **marker interface** has **no methods** — it tags classes for JVM or framework processing. Examples: `Serializable`, `Cloneable` (legacy pattern). Modern Java often prefers **annotations** (`@FunctionalInterface`, `@Entity`) over marker interfaces.

**Example:**

```java
import java.io.Serializable;

public class UserDto implements Serializable {
    private static final long serialVersionUID = 1L;
    private String username;
}
```

```java
// JVM checks instanceof Serializable during object serialization
if (obj instanceof Serializable) {
    // eligible for default Java serialization
}
```

**Key takeaway:** Marker interfaces convey metadata through type alone; annotations often replace them today.

**Interview tip:** Mention `Serializable` enables default serialization; `Cloneable` indicates `Object.clone()` may work (both have design caveats).

---

## Q42. What is a functional interface?

**Answer:** A **functional interface** has exactly **one abstract method** (SAM — Single Abstract Method). Annotated with `@FunctionalInterface` (optional but recommended). Used heavily for **lambda expressions** and **method references**.

**Example:**

```java
@FunctionalInterface
public interface Transformer<T, R> {
    R apply(T input);

    // default/static methods don't count toward SAM
    default void describe() {
        System.out.println("Functional interface");
    }
}
```

```java
Transformer<String, Integer> length = s -> s.length();
System.out.println(length.apply("Java")); // 4

// Method reference
Transformer<String, Integer> lenRef = String::length;
```

**Built-in examples:** `Runnable`, `Callable`, `Comparator`, `java.util.function.Predicate`, `Function`, `Consumer`, `Supplier`.

**Key takeaway:** Functional interfaces enable lambda syntax; one abstract method is the rule.

---

## Q43. What is an abstract class?

**Answer:** An **abstract class** cannot be instantiated directly. It may contain abstract methods (no body) and concrete methods. Used when related subclasses share common state and partial implementation. Declared with `abstract` keyword.

**Example:**

```java
public abstract class Shape {
    protected String color;

    protected Shape(String color) {
        this.color = color;
    }

    public abstract double area();  // subclass must implement

    public void describe() {
        System.out.println(color + " shape, area=" + area());
    }
}

public class Circle extends Shape {
    private final double radius;

    public Circle(String color, double radius) {
        super(color);
        this.radius = radius;
    }

    @Override
    public double area() {
        return Math.PI * radius * radius;
    }
}
```

**Key takeaway:** Abstract classes provide shared code + enforced specialization via abstract methods.

---

## Q44. When to use abstract class vs interface?

**Answer:**

| Use abstract class when | Use interface when |
|-------------------------|-------------------|
| Subclasses share significant **state** (fields) | You need a **pure contract** |
| You want **partial implementation** | Multiple unrelated types need same capability |
| You change base behavior rarely | You want **multiple inheritance of type** |
| Template method pattern fits | API evolution via default methods |

**Example — abstract class for shared template:**

```java
public abstract class HttpClientBase {
    public final String get(String url) {  // template method
        connect();
        String response = doGet(url);
        disconnect();
        return response;
    }
    protected abstract String doGet(String url);
    protected void connect() { /* ... */ }
    protected void disconnect() { /* ... */ }
}
```

**Example — interface for capability:**

```java
public interface Exportable {
    byte[] export();
}
```

**Key takeaway:** Abstract class = "is-a" with shared code; interface = "can-do" contract.

---

## Q45. Can an abstract class have a constructor?

**Answer:** Yes. Abstract classes **often have constructors** to initialize shared state in subclasses. Subclasses call them via `super(...)`. You cannot `new AbstractClass()` directly, but constructor runs when subclass is instantiated.

**Example:**

```java
public abstract class Employee {
    private final String id;

    public Employee(String id) {  // constructor in abstract class
        this.id = id;
    }

    public abstract double calculatePay();
}

public class SalariedEmployee extends Employee {
    private final double salary;

    public SalariedEmployee(String id, double salary) {
        super(id);  // invokes abstract class constructor
        this.salary = salary;
    }

    @Override
    public double calculatePay() {
        return salary / 12;
    }
}
```

**Key takeaway:** Abstract class constructors initialize inherited state for concrete subclasses.

---

## Q46. Can an abstract class have concrete methods?

**Answer:** Yes. Abstract classes commonly mix **abstract methods** (must override) and **concrete methods** (inherited as-is or optionally overridden). This is a major difference from interfaces before Java 8.

**Example:**

```java
public abstract class Repository<T> {
    public void save(T entity) {
        validate(entity);
        doSave(entity);
    }

    protected void validate(T entity) {
        if (entity == null) throw new IllegalArgumentException("null entity");
    }

    protected abstract void doSave(T entity);
}
```

**Key takeaway:** Abstract classes provide both enforced hooks and reusable default behavior.

---

## Q47. What is a constructor?

**Answer:** A **constructor** is a special block invoked when an object is created with `new`. It initializes state, validates input, and calls `super()` or `this()` for chaining. Name matches class name exactly; no return type (not even `void`).

**Example:**

```java
public class Book {
    private final String title;
    private final String author;

    public Book(String title, String author) {
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException("title required");
        }
        this.title = title;
        this.author = author;
    }
}
```

```java
Book book = new Book("Effective Java", "Joshua Bloch");
```

**Key takeaway:** Constructors run at object creation to establish valid initial state.

---

## Q48. What is a default constructor?

**Answer:** A **default constructor** is a no-argument constructor. If you declare **no constructors**, the compiler generates a **public default constructor** automatically. If you declare **any** constructor, the compiler does **not** generate one — you must supply no-arg explicitly if needed.

**Example:**

```java
public class EmptyDefaults {
    // compiler adds: public EmptyDefaults() { super(); }
}

public class WithArgs {
    private final int id;

    public WithArgs(int id) {
        this.id = id;
    }
    // No default constructor generated!
}

// WithArgs w = new WithArgs();  // COMPILE ERROR
WithArgs ok = new WithArgs(1);
```

**Key takeaway:** Default no-arg constructor exists only when you don't define any constructor yourself.

**Interview tip:** Frameworks (JPA, Jackson) often require a public or protected no-arg constructor.

---

## Q49. Will this code compile?

**Answer:** **No, it will not compile** (and would fail at runtime even if forced). Classic scenario: parent defines only a parameterized constructor, so the **default constructor is not generated**. The subclass constructor implicitly calls `super()` with no args, which does not exist.

**Example — classic interview snippet:**

```java
class Parent {
    public Parent(String name) {
        System.out.println("Parent: " + name);
    }
    // no no-arg constructor
}

class Child extends Parent {
    public Child() {
        // implicit super();  // COMPILE ERROR: no suitable constructor in Parent
        System.out.println("Child created");
    }
}
```

**Fix:**

```java
class Parent {
    public Parent() { }  // add no-arg, OR
    public Parent(String name) { }
}

class Child extends Parent {
    public Child() {
        super("default");  // explicitly call existing parent constructor
    }
}
```

**Key takeaway:** Subclass constructors must call a valid superclass constructor via explicit `super(...)` or inherited default `super()`.

**Interview tip:** Read constructor chains from bottom up: Child → Parent → Object.

---

## Q50. What is this()?

**Answer:** **`this()`** calls another constructor in the **same class** — constructor overloading/chaining. Must be the **first statement** in the constructor. Used to avoid duplicating initialization logic.

**Example:**

```java
public class User {
    private final String email;
    private final String role;

    public User(String email) {
        this(email, "USER");  // delegate to two-arg constructor
    }

    public User(String email, String role) {
        this.email = email;
        this.role = role;
    }
}
```

```java
User u = new User("alice@example.com"); // role defaults to USER
```

**Key takeaway:** `this()` chains to another constructor in the same class and must come first.

---

## Q51. Will this code compile?

**Answer:** **No.** A constructor cannot contain **both `this()` and `super()`** — each constructor must begin with exactly one of: implicit/default `super()`, explicit `super(...)`, or `this(...)`. Also, recursive constructor chains must terminate.

**Example — this() and super() together:**

```java
class Base {
    public Base(int x) { }
}

class Derived extends Base {
    public Derived() {
        super(1);
        // this(2);  // COMPILE ERROR — this() must be first statement; can't mix with super()
    }

    public Derived(int value) {
        this();  // if this() called other ctor that calls super differently — still must be first line only
    }
}
```

**Example — recursive constructor (infinite chain):**

```java
class Recurse {
    public Recurse() {
        this(1);  // calls Recurse(int)
    }

    public Recurse(int n) {
        this();   // COMPILE ERROR — recursive constructor invocation
    }
}
```

**Key takeaway:** First statement in a constructor is either `this(...)` OR `super(...)`, never both; avoid circular `this()` chains.

**Interview tip:** If neither `this()` nor `super()` is written, compiler inserts `super()` — which fails if parent lacks no-arg constructor (see Q49).

---

## Q52. What is super()?

**Answer:** **`super()`** (or `super(args...)`) invokes a **superclass constructor**. If omitted, compiler inserts **`super()`** as the first line. Required to initialize inherited fields before subclass-specific initialization.

**Example:**

```java
class Person {
    private final String name;

    public Person(String name) {
        this.name = name;
    }
}

class Student extends Person {
    private final int grade;

    public Student(String name, int grade) {
        super(name);  // must run before using subclass fields
        this.grade = grade;
    }
}
```

**Key takeaway:** `super(...)` initializes the parent part of the object; it must be the first statement unless replaced by `this(...)`.

---

## Q53. When are constructors called?

**Answer:** Constructors run during **object instantiation**, in this order:

1. **Static initializers** of the class (and superclasses, once per class load) — when class is first loaded.
2. **Instance field initializers** and **instance initializer blocks** (top to bottom, superclass first).
3. **Constructor body** — `super(...)` or `this(...)` chain completes first, then remaining statements.

Order for `new Child()`:
1. `Object` static init (if not yet loaded)
2. `Parent` static init
3. `Child` static init
4. `Parent` instance init blocks / field init
5. `Parent` constructor
6. `Child` instance init blocks / field init
7. `Child` constructor

**Example:**

```java
class Parent {
    { System.out.println("Parent instance block"); }

    public Parent() {
        System.out.println("Parent constructor");
    }
}

class Child extends Parent {
    { System.out.println("Child instance block"); }

    public Child() {
        System.out.println("Child constructor");
    }
}
```

```java
new Child();
// Output:
// Parent instance block
// Parent constructor
// Child instance block
// Child constructor
```

**Key takeaway:** Construction flows from superclass to subclass; static init runs once at class loading.

---

## Q54. Explain constructor chaining

**Answer:** **Constructor chaining** links constructors so one constructor delegates to another using **`this(...)`** (same class) or **`super(...)`** (parent class). Ensures all required initialization happens in one place and reduces duplication.

Rules:
- `this()` or `super()` must be **first statement**.
- Chain must eventually call a **superclass constructor** (every path ends at `Object()`).
- Cannot loop infinitely.

**Example — full chain:**

```java
class Employee {
    private final String name;
    private final int years;

    public Employee() {
        this("Unknown", 0);
    }

    public Employee(String name, int years) {
        this.name = name;
        this.years = years;
    }
}

class Manager extends Employee {
    private final int teamSize;

    public Manager(String name, int years, int teamSize) {
        super(name, years);       // chain to Employee
        this.teamSize = teamSize;
    }

    public Manager() {
        this("TBD", 0, 0);          // chain to three-arg in same class
    }
}
```

```java
Manager m = new Manager();
// Calls Manager() → Manager(String,int,int) → Employee(String,int)
```

**Key takeaway:** Chaining centralizes initialization; `this()` for same-class overloads, `super()` for parent constructors.

**Interview tip:** Draw the chain for complex hierarchies — interviewers love tracing output order (Q53) plus chaining (Q54) together.
