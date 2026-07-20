---
id: java-interview-medium
level: medium
---

# Java — Interview (Medium)

# Java Core — Advanced OOP & Modifiers (Q55–Q78)

---

## Q55. What is polymorphism in Java?

**Answer:** Polymorphism ("many forms") allows a reference variable of a parent type to point to objects of child types, and method calls are resolved at runtime based on the **actual object type** (dynamic dispatch). Java supports polymorphism through **inheritance**, **interface implementation**, and **method overriding**. Compile-time polymorphism (overloading) is a separate concept based on method signatures.

There are two forms:
1. **Compile-time (static) polymorphism** — method overloading; the compiler picks the method at compile time.
2. **Runtime (dynamic) polymorphism** — method overriding; the JVM picks the method at runtime via virtual method table (vtable) lookup.

**Example:**

```java
class Animal {
    void speak() { System.out.println("Animal sound"); }
}

class Dog extends Animal {
    @Override
    void speak() { System.out.println("Woof"); }
}

class Cat extends Animal {
    @Override
    void speak() { System.out.println("Meow"); }
}

public class PolymorphismDemo {
    public static void main(String[] args) {
        Animal a1 = new Dog();   // upcasting
        Animal a2 = new Cat();

        a1.speak(); // Woof  — runtime type is Dog
        a2.speak(); // Meow — runtime type is Cat

        // Polymorphic array
        Animal[] zoo = { new Dog(), new Cat(), new Animal() };
        for (Animal a : zoo) {
            a.speak(); // each object's overridden method runs
        }
    }
}
```

**Key takeaway:** Polymorphism lets you write code against abstractions (`Animal`) while behavior adapts to the actual object (`Dog`, `Cat`) at runtime — the foundation of flexible, extensible design.

---

## Q56. What is `instanceof` and when should you use it?

**Answer:** `instanceof` is a binary operator that tests whether an object is an instance of a given type (class, interface, or array type). Since Java 16, it can also be used in **pattern matching** form: `if (obj instanceof String s)`, which both tests and casts in one step.

Use it when you genuinely need type-specific behavior that cannot be expressed through polymorphism. Prefer overriding/virtual dispatch over `instanceof` chains when possible — they violate the Open/Closed Principle.

**Example:**

```java
public class InstanceOfDemo {
    public static void describe(Object obj) {
        // Classic instanceof + cast (pre-Java 16 style)
        if (obj instanceof String) {
            String s = (String) obj;
            System.out.println("String length: " + s.length());
        } else if (obj instanceof Integer) {
            System.out.println("Integer value: " + obj);
        }

        // Pattern matching instanceof (Java 16+)
        if (obj instanceof String s && s.length() > 5) {
            System.out.println("Long string: " + s.toUpperCase());
        }
    }

    public static void main(String[] args) {
        describe("Hello World"); // String length: 11, Long string: HELLO WORLD
        describe(42);            // Integer value: 42
        describe(null);          // prints nothing — instanceof null is always false
    }
}
```

**Key takeaway:** `instanceof` checks runtime type safely (no `ClassCastException`), but overuse signals missing polymorphism — refactor to interfaces or visitor patterns when chains grow.

---

## Q57. What is coupling in software design?

**Answer:** Coupling measures how much one class/module **depends on** another. **Tight coupling** means changes in one class force changes in others (hard to test, hard to swap implementations). **Loose coupling** means classes interact through stable abstractions (interfaces) with minimal knowledge of each other's internals.

In Java, coupling increases when you:
- Use concrete classes instead of interfaces
- Access another class's fields directly
- Create objects with `new` inside methods (hard-coded dependencies)

**Example:**

```java
// TIGHT COUPLING — OrderService directly depends on MySqlOrderRepository
class MySqlOrderRepository {
    void save(String orderId) { /* JDBC code */ }
}

class TightOrderService {
    private MySqlOrderRepository repo = new MySqlOrderRepository(); // hard-coded

    void placeOrder(String id) {
        repo.save(id);
    }
}

// LOOSE COUPLING — depends on abstraction, implementation injected
interface OrderRepository {
    void save(String orderId);
}

class LooseOrderService {
    private final OrderRepository repo;

    LooseOrderService(OrderRepository repo) { // constructor injection
        this.repo = repo;
    }

    void placeOrder(String id) {
        repo.save(id);
    }
}
```

**Key takeaway:** Reduce coupling by programming to interfaces, using dependency injection, and hiding implementation details — this is central to maintainable Java applications.

---

## Q58. What is cohesion in software design?

**Answer:** Cohesion measures how closely related and focused the responsibilities within a single class/module are. **High cohesion** means a class does one thing well (e.g., `EmailValidator` only validates emails). **Low cohesion** means a class mixes unrelated responsibilities (e.g., a `UserUtils` class that sends emails, parses JSON, and calculates tax).

High cohesion improves readability, testability, and reusability. It often pairs with the **Single Responsibility Principle (SRP)**.

**Example:**

```java
// LOW COHESION — one class does too many unrelated things
class UserManager {
    void saveUser(User u) { /* DB logic */ }
    void sendWelcomeEmail(User u) { /* SMTP logic */ }
    String toJson(User u) { /* serialization */ }
    double calculateDiscount(User u) { /* pricing logic */ }
}

// HIGH COHESION — each class has a single, focused responsibility
class UserRepository {
    void save(User u) { /* DB logic only */ }
}

class WelcomeEmailService {
    void send(User u) { /* email logic only */ }
}

class UserJsonMapper {
    String toJson(User u) { /* serialization only */ }
}
```

**Key takeaway:** Aim for classes where every method supports the same purpose — high cohesion makes code easier to understand, test, and change independently.

---

## Q59. What is encapsulation in Java?

**Answer:** Encapsulation is the OOP principle of **bundling data and behavior together** while **restricting direct access** to internal state. In Java, this is achieved with **private fields**, **public/protected getters and setters**, and exposing behavior through methods rather than raw data.

Benefits: validation in setters, freedom to change internal representation, and controlled invariants (e.g., balance never negative).

**Example:**

```java
public class BankAccount {
    private final String accountNumber;
    private double balance; // hidden from outside

    public BankAccount(String accountNumber, double initialBalance) {
        this.accountNumber = accountNumber;
        setBalance(initialBalance); // validation in one place
    }

    public double getBalance() {
        return balance;
    }

    private void setBalance(double amount) {
        if (amount < 0) {
            throw new IllegalArgumentException("Balance cannot be negative");
        }
        this.balance = amount;
    }

    public void deposit(double amount) {
        if (amount <= 0) throw new IllegalArgumentException("Invalid deposit");
        balance += amount;
    }

    public void withdraw(double amount) {
        if (amount <= 0 || amount > balance) {
            throw new IllegalArgumentException("Invalid withdrawal");
        }
        balance -= amount;
    }
}
```

**Key takeaway:** Never expose mutable fields as `public` — encapsulation protects invariants and lets you refactor internals without breaking callers.

---

## Q60. What is an inner class (non-static nested class)?

**Answer:** An inner class is a class defined **inside another class** without the `static` modifier. It holds an **implicit reference** to the enclosing instance and can access its private members. You must have an outer class instance to create an inner class object (except in the outer class itself).

Use inner classes when the nested class is logically part of the outer object and needs access to its state.

**Example:**

```java
public class Outer {
    private int outerValue = 10;

    class Inner {
        void display() {
            System.out.println("Outer value: " + outerValue); // direct access
        }
    }

    void createInner() {
        Inner inner = new Inner(); // OK — inside outer class
        inner.display();
    }

    public static void main(String[] args) {
        Outer outer = new Outer();
        Outer.Inner inner = outer.new Inner(); // requires outer instance
        inner.display(); // Outer value: 10
    }
}
```

**Key takeaway:** Inner classes are tied to the outer instance — use them when the nested type is meaningless without its enclosing object.

---

## Q61. What is a static nested class (static inner class)?

**Answer:** A static nested class is declared with the `static` modifier inside another class. It does **not** hold a reference to the outer instance and behaves like a normal top-level class for access purposes (except it can access the outer class's private static members). Create it with `Outer.StaticNested obj = new Outer.StaticNested();` — no outer instance needed.

Prefer static nested classes when the nested class does not need access to outer instance fields.

**Example:**

```java
public class Outer {
    private static int staticCount = 0;
    private int instanceId;

    public Outer() {
        instanceId = ++staticCount;
    }

    static class StaticNested {
        void showCount() {
            System.out.println("Static count: " + staticCount); // OK — static member
            // System.out.println(instanceId); // COMPILE ERROR — no outer instance
        }
    }

    public static void main(String[] args) {
        Outer.StaticNested nested = new Outer.StaticNested(); // no Outer instance needed
        nested.showCount(); // Static count: 0
    }
}
```

**Key takeaway:** Use `static` nested classes by default — they avoid memory leaks from holding outer references and are simpler to instantiate.

---

## Q62. What is a local inner class defined inside a method?

**Answer:** A local class is a class defined **inside a method or block**. It is visible only within that block and can access **effectively final** local variables and parameters of the enclosing method, plus all members of the enclosing class. It cannot have access modifiers (`public`, `private`, etc.) except `final` or `@Deprecated` (implicitly final if not abstract).

**Example:**

```java
public class LocalClassDemo {
    private String prefix = "Result: ";

    void process(final String input) {
        int multiplier = 2; // must be effectively final to use in local class

        class LocalProcessor {
            String transform() {
                return prefix + input.repeat(multiplier);
            }
        }

        LocalProcessor processor = new LocalProcessor();
        System.out.println(processor.transform());
    }

    public static void main(String[] args) {
        new LocalClassDemo().process("Hi"); // Result: HiHi
    }
}
```

**Key takeaway:** Local classes are scoped to a single method — useful for one-off helper types, but often replaced by lambdas or anonymous classes for simpler cases.

---

## Q63. What is an anonymous class?

**Answer:** An anonymous class is a class **without a name**, defined and instantiated in a single expression, typically when implementing an interface or extending a class for a one-time use. It can access effectively final local variables. Since Java 8, **lambdas** replace most anonymous classes for functional interfaces.

Syntax: `new SuperType() { /* override methods */ }`

**Example:**

```java
import java.util.*;

public class AnonymousClassDemo {
    public static void main(String[] args) {
        // Anonymous class implementing Runnable
        Runnable r = new Runnable() {
            @Override
            public void run() {
                System.out.println("Running anonymously");
            }
        };
        r.run(); // Running anonymously

        // Anonymous class implementing Comparator
        List<String> names = new ArrayList<>(List.of("Charlie", "Alice", "Bob"));
        names.sort(new Comparator<String>() {
            @Override
            public int compare(String a, String b) {
                return a.compareTo(b);
            }
        });
        System.out.println(names); // [Alice, Bob, Charlie]

        // Modern equivalent with lambda
        names.sort((a, b) -> a.compareTo(b));
    }
}
```

**Key takeaway:** Anonymous classes are useful for one-off implementations, but prefer lambdas for single-method interfaces — they are shorter and more readable.

---

## Q64. What is the default (package-private) access modifier for a top-level class?

**Answer:** A top-level class with **no access modifier** has **package-private** (default) access. It is visible only to classes in the **same package**. Only one public top-level class is allowed per `.java` file, and the filename must match the public class name.

**Example:**

```java
// file: com/example/util/Helper.java
package com.example.util;

class Helper { // package-private — not visible outside com.example.util
    void help() { System.out.println("Helping"); }
}
```

**Key takeaway:** Omitting an access modifier on a top-level class restricts it to the same package — use this for package-internal implementation classes.

---

## Q65. What does the `private` access modifier mean?

**Answer:** `private` members are accessible **only within the declaring class**. They are not visible to subclasses, other classes in the same package, or other packages. Use `private` for fields and helper methods that should never be accessed directly from outside.

**Example:**

```java
public class Account {
    private double balance; // only Account can access directly

    public void deposit(double amount) {
        balance += amount; // OK — same class
    }
}

class AccountTest {
    void test() {
        Account a = new Account();
        // a.balance = 1000; // COMPILE ERROR — private
        a.deposit(1000);     // OK — public method
    }
}
```

**Key takeaway:** Make fields `private` by default — expose behavior through public methods to preserve encapsulation.

---

## Q66. What does package-private (default) access mean for members?

**Answer:** A member with no modifier has **package-private** access: visible to all classes in the **same package**, but not to subclasses in different packages or any class in another package.

**Example:**

```java
// file: com/example/model/User.java
package com.example.model;

public class User {
    String name; // package-private field
}

// file: com/example/model/UserService.java
package com.example.model;

class UserService {
    void rename(User u) {
        u.name = "Alice"; // OK — same package
    }
}

// file: com/example/web/UserController.java
package com.example.web;

import com.example.model.User;

class UserController {
    void demo(User u) {
        // u.name = "Bob"; // COMPILE ERROR — different package
    }
}
```

**Key takeaway:** Package-private is useful for API surface within a module/package while hiding details from external consumers.

---

## Q67. What does the `protected` access modifier mean?

**Answer:** `protected` members are accessible within the **same package** AND by **subclasses in any package**. They are not accessible to unrelated classes in other packages.

**Example:**

```java
// file: com/example/base/Animal.java
package com.example.base;

public class Animal {
    protected void breathe() {
        System.out.println("Breathing");
    }
}

// file: com/example/sub/Dog.java — different package, subclass
package com.example.sub;

import com.example.base.Animal;

public class Dog extends Animal {
    void pant() {
        breathe(); // OK — subclass, any package
    }
}

// file: com/other/Zoo.java — different package, NOT a subclass
package com.other;

import com.example.base.Animal;

class Zoo {
    void demo(Animal a) {
        // a.breathe(); // COMPILE ERROR — not subclass, different package
    }
}
```

**Key takeaway:** `protected` is designed for inheritance — subclasses can use or override members, but unrelated classes in other packages cannot.

---

## Q68. What does the `public` access modifier mean?

**Answer:** `public` members and classes are accessible **from anywhere** — same class, same package, subclasses in other packages, and unrelated classes in other packages. This is the widest visibility level.

**Example:**

```java
// file: com/example/api/PublicService.java
package com.example.api;

public class PublicService {
    public void execute() {
        System.out.println("Public API");
    }
}

// file: com/other/client/App.java — different package
package com.other.client;

import com.example.api.PublicService;

public class App {
    public static void main(String[] args) {
        new PublicService().execute(); // OK — public everywhere
    }
}
```

**Key takeaway:** Use `public` only for intentional API surface — over-exposing members increases coupling and reduces flexibility to refactor.

---

## Q69–Q72. Access Modifier Visibility Table

**Answer:** The table below summarizes member access from different contexts. Top-level classes can only be `public` or package-private (not `private` or `protected`).

### Member Access Table

| Modifier | Same Class | Same Package | Subclass (diff package) | Different Package (non-subclass) |
|----------|:----------:|:------------:|:-----------------------:|:--------------------------------:|
| `private` | ✅ | ❌ | ❌ | ❌ |
| *(default / package-private)* | ✅ | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

### Q69. Can a subclass in a different package access `protected` members?

**Answer:** Yes. `protected` allows access from subclasses regardless of package.

### Q70. Can a class in the same package access package-private members?

**Answer:** Yes. Default (package-private) access allows any class in the same package to access the member.

### Q71. Can `private` members be accessed by subclasses?

**Answer:** No. `private` is strictly limited to the declaring class. Subclasses inherit the member but cannot access it directly — they use inherited public/protected methods instead.

### Q72. What access modifiers can a top-level class have?

**Answer:** Only `public` or package-private (default). Inner classes can have all four modifiers.

**Example demonstrating the table:**

```java
// file: com/demo/access/Base.java
package com.demo.access;

public class Base {
    private   int priv   = 1;
    int           pkg    = 2; // package-private
    protected int prot   = 3;
    public    int pub    = 4;
}

// file: com/demo/access/SamePackage.java
package com.demo.access;

class SamePackage {
    void test(Base b) {
        // b.priv; // ERROR
        b.pkg;    // OK
        b.prot;   // OK
        b.pub;    // OK
    }
}

// file: com/demo/sub/SubClass.java
package com.demo.sub;

import com.demo.access.Base;

public class SubClass extends Base {
    void test() {
        // priv; // ERROR — private not inherited for access
        // pkg;  // ERROR — different package
        prot;    // OK — protected + subclass
        pub;     // OK — public
    }
}

// file: com/other/Other.java
package com.other;

import com.demo.access.Base;

class Other {
    void test(Base b) {
        // b.priv; // ERROR
        // b.pkg;  // ERROR
        // b.prot; // ERROR — not a subclass
        b.pub;    // OK
    }
}
```

**Key takeaway:** Memorize the access table — it is one of the most frequently tested topics in Java interviews. When in doubt, restrict access and widen only when needed.

---

## Q73. What does `final` on a class mean?

**Answer:** A `final` class **cannot be extended (subclassed)**. Java uses this for security and immutability guarantees — e.g., `String`, `Integer`, and wrapper classes are final.

**Example:**

```java
final class ImmutableConfig {
    private final String env;

    ImmutableConfig(String env) {
        this.env = env;
    }
}

// class DevConfig extends ImmutableConfig { } // COMPILE ERROR — cannot extend final class
```

**Key takeaway:** Declare a class `final` when subclassing would break invariants or is never intended — common for utility classes and immutable types.

---

## Q74. What does `final` on a method mean?

**Answer:** A `final` method **cannot be overridden** by subclasses. Used when the behavior must remain fixed (e.g., `Object.getClass()` is final). Note: `private` methods are implicitly final since they are not visible to subclasses anyway.

**Example:**

```java
class Parent {
    final void criticalLogic() {
        System.out.println("Must not be overridden");
    }
}

class Child extends Parent {
    // void criticalLogic() { } // COMPILE ERROR — cannot override final method
}
```

**Key takeaway:** Use `final` on methods that must not change in subclasses — but prefer composition over inheritance when behavior must stay fixed.

---

## Q75. What does `final` on a variable mean?

**Answer:** A `final` variable must be **assigned exactly once** — at declaration or in the constructor (for instance fields) or static block (for static fields). After assignment, it cannot be reassigned. For reference types, the **reference** is final, but the **object's contents** may still be mutable unless the object itself is immutable.

**Example:**

```java
import java.util.*;

public class FinalVariableDemo {
    final int x = 10;
    final List<String> names;

    FinalVariableDemo() {
        names = new ArrayList<>(); // assignment in constructor — OK
    }

    void demo() {
        // x = 20;        // COMPILE ERROR — cannot reassign
        names.add("A");   // OK — mutating object contents
        // names = new ArrayList<>(); // COMPILE ERROR — cannot reassign reference
    }
}
```

**Key takeaway:** `final` on variables enables immutability of the reference and helps the compiler optimize; combine with immutable objects for true immutability.

---

## Q76. What does `final` on a method argument mean?

**Answer:** A `final` parameter cannot be **reassigned** within the method body. It does not affect the caller's variable. It is a documentation aid and prevents accidental reassignment — commonly used in constructors and short methods.

**Example:**

```java
public class FinalParamDemo {
    void greet(final String name) {
        // name = "Guest"; // COMPILE ERROR
        System.out.println("Hello, " + name);
    }

    void swap(final int a, final int b) {
        // Cannot reassign a and b — but this doesn't swap caller's variables anyway
        // (Java passes primitives by value)
        System.out.println(a + ", " + b);
    }
}
```

**Key takeaway:** `final` parameters are a style/convention choice — they signal intent that the parameter won't be reassigned, but don't affect pass-by-value semantics.

---

## Q77. What is the `volatile` keyword in Java?

**Answer:** `volatile` guarantees **visibility** — when one thread writes to a `volatile` field, the new value is immediately visible to all other threads. It also prevents certain instruction reordering around volatile reads/writes. It does **not** guarantee atomicity for compound operations (e.g., `count++`).

Use `volatile` for flags or simple state where only one thread writes, or combine with `synchronized`/`Atomic*` classes for compound operations.

**Example:**

```java
public class VolatileDemo {
    private volatile boolean running = true;

    void stop() {
        running = false; // visible to worker thread immediately
    }

    void worker() {
        while (running) {
            // do work
        }
        System.out.println("Worker stopped");
    }

    public static void main(String[] args) throws InterruptedException {
        VolatileDemo demo = new VolatileDemo();
        Thread t = new Thread(demo::worker);
        t.start();
        Thread.sleep(100);
        demo.stop();
        t.join();
    }
}

// WITHOUT volatile, the worker might cache running=true forever in CPU cache
```

**Key takeaway:** `volatile` solves visibility, not atomicity — for `i++` or check-then-act patterns, use `AtomicInteger`, `synchronized`, or locks.

---

## Q78. What is a static variable in Java?

**Answer:** A static variable (class variable) belongs to the **class**, not to any instance. There is **one copy** shared by all instances and accessible via `ClassName.variable` or `instance.variable`. Static variables are initialized when the class is loaded. Common uses: counters, constants (`static final`), shared configuration.

**Example:**

```java
public class Employee {
    static int companyEmployeeCount = 0; // shared across all employees
    static final String COMPANY_NAME = "Acme Corp";

    private final int id;

    Employee() {
        id = ++companyEmployeeCount;
    }

    static void showCount() {
        System.out.println("Total employees: " + companyEmployeeCount);
    }

    public static void main(String[] args) {
        new Employee();
        new Employee();
        new Employee();
        Employee.showCount(); // Total employees: 3
        System.out.println(Employee.COMPANY_NAME); // Acme Corp
    }
}
```

**Key takeaway:** Static variables are shared global state — use sparingly; prefer instance fields for object-specific data and `static final` constants for true constants.

---

# Java Core — Conditions & Loops (Q79–Q90)

---

## Q79. Why should you always use blocks `{}` around `if` statements?

**Answer:** Without braces, only the **single statement immediately following** `if` (or `else`) is conditional. Any additional statements execute **unconditionally**, which is a common source of bugs — especially during maintenance when someone adds a second line assuming it is inside the block.

Always use braces, even for one-line bodies. Many style guides (Google Java Style, SonarQube) enforce this.

**Example:**

```java
public class MissingBracesDemo {
    public static void main(String[] args) {
        int score = 85;

        // DANGEROUS — only the println is inside the if
        if (score >= 60)
            System.out.println("Pass");
            System.out.println("Certificate issued"); // ALWAYS runs!

        // SAFE — both statements are conditional
        if (score >= 60) {
            System.out.println("Pass");
            System.out.println("Certificate issued");
        }
    }
}
```

**Output (without fix):**
```
Pass
Certificate issued
```

Even when `score` is 40, "Certificate issued" still prints because it is not part of the `if`.

**Key takeaway:** Always use `{}` — it prevents dangling-statement bugs and makes diffs safer during code review.

---

## Q80. Guess the output — dangling `else` / missing braces

**Answer:** This classic trap combines missing braces with the **dangling else** problem: an `else` binds to the **nearest unmatched `if`**, not necessarily the one the programmer intended.

**Example:**

```java
public class DanglingElseDemo {
    public static void main(String[] args) {
        int x = 10;
        int y = 5;

        if (x > 0)
            if (y > 0)
                System.out.println("A");
        else
            System.out.println("B");

        System.out.println("Done");
    }
}
```

**Output:**
```
A
Done
```

**Explanation:** The `else` attaches to `if (y > 0)`, not `if (x > 0)`. Since `y > 0` is true, "A" prints. "B" never prints. If `y` were `-1`, "B" would print even though `x > 0` is still true.

**Key takeaway:** Use braces to make `if/else` structure explicit — dangling else is a parsing rule, not a design feature.

---

## Q81. Guess the output — another if/else trap

**Answer:** This demonstrates how **else-if chains** interact with standalone statements and how a misplaced semicolon creates an empty `if` body.

**Example:**

```java
public class IfElseTrapDemo {
    public static void main(String[] args) {
        int n = 15;

        if (n > 20);
            System.out.println("Greater than 20");

        if (n > 10)
            System.out.println("Greater than 10");
        else
            System.out.println("Not greater than 10");

        System.out.println("End");
    }
}
```

**Output:**
```
Greater than 20
Greater than 10
End
```

**Explanation:**
1. `if (n > 20);` — the semicolon makes the `if` body **empty**. "Greater than 20" is **not** inside the `if`; it always runs.
2. `n > 10` is true, so "Greater than 10" prints.
3. The `else` belongs to `if (n > 10)`, not the first `if`.

**Key takeaway:** Never put a semicolon after `if (condition)` — it silently creates a no-op body and is one of Java's most insidious bugs.

---

## Q82. Guess the output — `switch` with fall-through

**Answer:** In Java, `switch` cases **fall through** by default unless you `break`, `return`, `throw`, or use `yield` (in switch expressions). Execution continues into subsequent cases until a break is hit.

**Example:**

```java
public class SwitchFallThroughDemo {
    public static void main(String[] args) {
        int day = 2;

        switch (day) {
            case 1:
                System.out.println("Monday");
            case 2:
                System.out.println("Tuesday");
            case 3:
                System.out.println("Wednesday");
                break;
            default:
                System.out.println("Other");
        }
    }
}
```

**Output:**
```
Tuesday
Wednesday
```

**Explanation:** `day` is 2. Execution enters `case 2`, prints "Tuesday", falls through to `case 3`, prints "Wednesday", then hits `break`.

**Key takeaway:** Always add `break` (or use arrow syntax `case 2 ->`) unless fall-through is intentional and documented.

---

## Q83. Guess the output — `switch` with `break` and `default`

**Answer:** This shows proper `break` usage and that `default` can match when no case label fits — but only if execution reaches it (no prior case matched without falling through).

**Example:**

```java
public class SwitchBreakDemo {
    public static void main(String[] args) {
        int grade = 4;

        switch (grade) {
            case 1:
                System.out.println("Poor");
                break;
            case 2:
                System.out.println("Fair");
                break;
            case 3:
                System.out.println("Good");
                break;
            default:
                System.out.println("Excellent or Unknown");
                break;
        }

        System.out.println("Finished");
    }
}
```

**Output:**
```
Excellent or Unknown
Finished
```

**Explanation:** No case matches `4`, so `default` executes. Each case has `break`, so no fall-through occurs.

**Key takeaway:** `default` is optional but handles unexpected values — always include it for robustness unless all cases are exhaustively covered (e.g., enums with no future values).

---

## Q84. Should the `default` case always be the last case in a `switch`?

**Answer:** **No — `default` can appear anywhere** among the case labels. It is not required to be last. However, if `default` is not last and lacks a `break`, execution falls through into subsequent cases just like any other case.

**Convention:** Place `default` last for readability, but the compiler does not require it.

**Example:**

```java
public class DefaultPositionDemo {
    public static void main(String[] args) {
        int x = 99;

        switch (x) {
            default:
                System.out.println("Default first");
                break;
            case 1:
                System.out.println("One");
                break;
            case 2:
                System.out.println("Two");
                break;
        }
    }
}
```

**Output:**
```
Default first
```

**Key takeaway:** `default` position is flexible — prioritize readability by placing it last, and always use `break` unless fall-through is intentional.

---

## Q85. Can `switch` use `String`? Since which Java version?

**Answer:** **Yes.** Since **Java 7**, `switch` supports `String`. The comparison uses `String.equals()` under the hood (null throws `NullPointerException`). Java 14+ also adds switch expressions with `->` syntax.

**Example:**

```java
public class SwitchStringDemo {
    public static void main(String[] args) {
        String command = "start";

        switch (command) {
            case "start":
                System.out.println("Starting...");
                break;
            case "stop":
                System.out.println("Stopping...");
                break;
            case "pause":
                System.out.println("Pausing...");
                break;
            default:
                System.out.println("Unknown command: " + command);
        }

        // Java 14+ switch expression
        String result = switch (command) {
            case "start" -> "Engine on";
            case "stop"  -> "Engine off";
            default      -> "Idle";
        };
        System.out.println(result);
    }
}
```

**Output:**
```
Starting...
Engine on
```

**Key takeaway:** String switch (Java 7+) is case-sensitive — use `equalsIgnoreCase` logic manually if you need case-insensitive matching, or normalize input first.

---

## Q86. Guess the output — classic `for` loop with `i <= 9`

**Answer:** This is the standard counting loop printing 0 through 9.

**Example:**

```java
public class ClassicForDemo {
    public static void main(String[] args) {
        for (int i = 0; i <= 9; i++) {
            System.out.print(i + " ");
        }
        System.out.println();
    }
}
```

**Output:**
```
0 1 2 3 4 5 6 7 8 9 
```

**Explanation:** `i` starts at 0, increments each iteration, loop continues while `i <= 9`. Ten iterations total (0–9).

**Key takeaway:** `for (int i = 0; i <= 9; i++)` and `for (int i = 0; i < 10; i++)` are equivalent — know both forms for interviews.

---

## Q87. What is the enhanced for loop (for-each) and what are its limitations?

**Answer:** The enhanced for loop (`for (Type item : collection)`) iterates over arrays or any object implementing `Iterable`. It is read-only in the sense that reassigning `item` does not affect the collection, and you **cannot remove elements** during iteration (throws `ConcurrentModificationException` on ArrayList). You also cannot get the index directly.

**Example:**

```java
import java.util.*;

public class EnhancedForDemo {
    public static void main(String[] args) {
        int[] nums = { 10, 20, 30 };
        for (int n : nums) {
            System.out.print(n + " ");
        }
        System.out.println();

        List<String> names = List.of("Alice", "Bob", "Charlie");
        for (String name : names) {
            System.out.print(name + " ");
        }
        System.out.println();

        // Cannot modify collection during for-each
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        // for (int val : list) {
        //     list.remove(Integer.valueOf(val)); // ConcurrentModificationException
        // }
    }
}
```

**Output:**
```
10 20 30 
Alice Bob Charlie 
```

**Key takeaway:** Use for-each for simple read-only iteration; use indexed `for` or `Iterator.remove()` when you need index or removal.

---

## Q88. Guess the output — off-by-one / infinite loop classic

**Answer:** This demonstrates an **off-by-one error** where the loop condition never becomes false, causing an infinite loop — or if corrected, shows boundary confusion.

**Example (infinite loop — do NOT run in production without limit):**

```java
public class OffByOneDemo {
    public static void main(String[] args) {
        // TRAP: i starts at 0, increments, but condition i != 10 is always true
        // because i goes 0,1,2,...9,10,11,... — when i==10, 10!=10 is false, so it stops
        // Actually let's use a clearer off-by-one:

        for (int i = 1; i < 10; i += 2) {
            System.out.print(i + " ");
        }
        System.out.println();

        // Classic off-by-one: prints one extra or one fewer
        int[] arr = { 5, 10, 15, 20 };
        for (int i = 0; i <= arr.length; i++) { // BUG: should be i < arr.length
            // System.out.print(arr[i] + " "); // ArrayIndexOutOfBoundsException when i==4
        }

        // Safer version
        for (int i = 0; i < arr.length; i++) {
            System.out.print(arr[i] + " ");
        }
        System.out.println();
    }
}
```

**Output:**
```
1 3 5 7 9 
5 10 15 20 
```

**Explanation:** First loop: `i` takes values 1, 3, 5, 7, 9 (stops when `i` would become 11). Second loop commented out would throw `ArrayIndexOutOfBoundsException` at `i == 4` because valid indices are 0–3.

**Key takeaway:** Use `i < array.length` (not `<=`) and be careful with loop boundary conditions — off-by-one errors are among the most common Java bugs.

---

## Q89. Guess the output — `break`, `continue`, and labeled `break`

**Answer:** `break` exits the innermost loop (or a labeled loop). `continue` skips to the next iteration. Labeled `break` exits the outer labeled loop.

**Example:**

```java
public class BreakContinueDemo {
    public static void main(String[] args) {
        System.out.println("--- break ---");
        for (int i = 0; i < 5; i++) {
            if (i == 3) break;
            System.out.print(i + " ");
        }
        System.out.println();

        System.out.println("--- continue ---");
        for (int i = 0; i < 5; i++) {
            if (i == 2) continue;
            System.out.print(i + " ");
        }
        System.out.println();

        System.out.println("--- labeled break ---");
        outer:
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                if (i == 1 && j == 1) break outer;
                System.out.print(i + "" + j + " ");
            }
        }
        System.out.println();
    }
}
```

**Output:**
```
--- break ---
0 1 2 
--- continue ---
0 1 3 4 
--- labeled break ---
00 01 10 
```

**Explanation:**
- `break` at `i==3`: prints 0, 1, 2 then exits.
- `continue` at `i==2`: skips printing 2, prints 0, 1, 3, 4.
- Labeled `break outer` at i=1,j=1: prints 00, 01, 10 then exits both loops.

**Key takeaway:** Unlabeled `break`/`continue` affect only the innermost loop — use labels sparingly for clarity when breaking out of nested loops.

---

## Q90. Guess the output — nested loops

**Answer:** Nested loops multiply iteration counts. Inner loop completes fully for each outer iteration. Watch for variable shadowing and which loop controls which output.

**Example:**

```java
public class NestedLoopDemo {
    public static void main(String[] args) {
        for (int i = 1; i <= 3; i++) {
            for (int j = 1; j <= i; j++) {
                System.out.print("*");
            }
            System.out.println();
        }

        System.out.println("---");

        int count = 0;
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                count++;
            }
        }
        System.out.println("count = " + count);
    }
}
```

**Output:**
```
*
**
***
---
count = 9
```

**Explanation:**
1. Triangle pattern: row `i` prints `i` asterisks (j runs 1 to i).
2. Nested 3×3 loops: 3 × 3 = 9 iterations, so `count = 9`.

**Key takeaway:** Nested loop total iterations = product of each loop's iteration count — common interview math question.

---

# Java Core — Exception Handling (Q91–Q108)

---

## Q91. Why is exception handling important in Java?

**Answer:** Exception handling lets programs **recover gracefully** from unexpected conditions instead of crashing silently or with raw stack traces exposed to users. It separates normal control flow from error handling, enforces contracts (checked exceptions), and enables centralized logging and resource cleanup.

Without it, every method would need error codes, callers would ignore them, and resources (files, connections) would leak.

**Example:**

```java
import java.io.*;
import java.nio.file.*;

public class ExceptionImportanceDemo {
    public static void readConfig(String path) {
        try {
            String content = Files.readString(Path.of(path));
            System.out.println("Config loaded: " + content.length() + " chars");
        } catch (IOException e) {
            System.err.println("Cannot read config, using defaults: " + e.getMessage());
            // application continues with fallback behavior
        }
    }

    public static void main(String[] args) {
        readConfig("missing-file.properties"); // graceful fallback, no crash
    }
}
```

**Key takeaway:** Exceptions signal abnormal conditions — handle them at the right level (where you can recover or meaningfully respond), not everywhere.

---

## Q92. What is the Chain of Responsibility pattern in exception handling?

**Answer:** In Java's exception model, when an exception is thrown, the runtime searches up the **call stack** for a matching `catch` block. Each method on the stack can catch and handle the exception, or let it propagate to its caller. This is the **Chain of Responsibility** — each frame decides: handle, wrap/rethrow, or pass up.

You can also chain exceptions explicitly with `initCause()` or the constructor `new Exception("msg", cause)` to preserve the full failure history.

**Example:**

```java
public class ChainOfResponsibilityDemo {

    static void lowLevel() throws Exception {
        throw new IllegalStateException("Database connection failed");
    }

    static void serviceLayer() throws Exception {
        try {
            lowLevel();
        } catch (IllegalStateException e) {
            throw new Exception("Service operation failed", e); // wrap and rethrow
        }
    }

    static void controllerLayer() {
        try {
            serviceLayer();
        } catch (Exception e) {
            System.err.println("User-facing error: " + e.getMessage());
            System.err.println("Root cause: " + e.getCause().getMessage());
        }
    }

    public static void main(String[] args) {
        controllerLayer();
    }
}
```

**Output:**
```
User-facing error: Service operation failed
Root cause: Database connection failed
```

**Key takeaway:** Exceptions propagate up the stack until caught — design layers to catch at boundaries (controller, main) and wrap low-level exceptions with context.

---

## Q93. Why do we need the `finally` block?

**Answer:** `finally` executes **whether or not** an exception occurs — it is the guaranteed cleanup block. Use it to release resources: close streams, release locks, rollback transactions. Since Java 7, **try-with-resources** is preferred for `AutoCloseable` resources, but `finally` remains essential for non-closeable cleanup.

**Example:**

```java
import java.util.concurrent.locks.*;

public class FinallyNeedDemo {
    private static final Lock lock = new ReentrantLock();

    static void transfer() {
        lock.lock();
        try {
            // business logic that may throw
            if (Math.random() > 0.5) {
                throw new RuntimeException("Transfer failed");
            }
            System.out.println("Transfer succeeded");
        } finally {
            lock.unlock(); // ALWAYS runs — prevents deadlock
            System.out.println("Lock released");
        }
    }

    public static void main(String[] args) {
        transfer();
    }
}
```

**Key takeaway:** Use `finally` for cleanup that must run regardless of success or failure — especially locks, native handles, and temporary state restoration.

---

## Q94. When is the `finally` block NOT executed?

**Answer:** `finally` almost always runs, but there are rare exceptions:

1. **`System.exit()`** is called (JVM terminates immediately).
2. The **JVM crashes** (e.g., `OutOfMemoryError` during shutdown, native crash).
3. The **thread is killed** abruptly (e.g., `Thread.stop()` — deprecated).
4. **Infinite loop** or **deadlock** in `try` or `catch` — `finally` never reached because execution never leaves `try`/`catch`.
5. **Power failure / hardware kill** — process dies externally.

Normal exceptions, returns, and breaks **do** execute `finally`.

**Example:**

```java
public class FinallyNotExecutedDemo {
    static int withReturn() {
        try {
            return 1;
        } finally {
            System.out.println("Finally runs even with return");
        }
    }

    static void infiniteLoop() {
        try {
            while (true) { /* never exits */ }
        } finally {
            // NEVER reached
            System.out.println("Unreachable");
        }
    }

    public static void main(String[] args) {
        System.out.println(withReturn()); // Finally runs, returns 1
    }
}
```

**Key takeaway:** `finally` runs on normal exit paths from `try`/`catch`, including `return` — but not if the JVM or thread is killed externally.

---

## Q95. Will `finally` execute if `System.exit()` is called?

**Answer:** **No.** `System.exit(int status)` terminates the JVM immediately. No further Java code runs — including `finally` blocks, other threads ( abruptly ), and shutdown hooks run in a separate phase but `finally` in the calling thread does not execute after `System.exit()`.

**Example:**

```java
public class SystemExitFinallyDemo {
    public static void main(String[] args) {
        try {
            System.out.println("In try");
            System.exit(0);
            System.out.println("Never printed");
        } finally {
            System.out.println("Finally — NOT printed");
        }
    }
}
```

**Output:**
```
In try
```

**Key takeaway:** Never call `System.exit()` inside `try` if you rely on `finally` cleanup — use return or throw instead in application code.

---

## Q96. Can you have `try` without `catch`?

**Answer:** **Yes**, in two cases:
1. **`try` with `finally`** (no catch) — exceptions propagate after `finally` runs.
2. **`try`-with-resources`** — can have catch, finally, both, or neither.

You cannot have a standalone `try` with no catch and no finally.

**Example:**

```java
public class TryWithoutCatchDemo {
    static void read() throws Exception {
        try {
            if (true) throw new Exception("Error");
        } finally {
            System.out.println("Cleanup in finally");
        }
        // Exception propagates to caller after finally
    }

    public static void main(String[] args) {
        try {
            read();
        } catch (Exception e) {
            System.out.println("Caught: " + e.getMessage());
        }
    }
}
```

**Output:**
```
Cleanup in finally
Caught: Error
```

**Key takeaway:** `try-finally` without catch is valid when callers should handle exceptions — `finally` still runs before propagation.

---

## Q97. Can you have `try` without `catch` and without `finally`?

**Answer:** **No** for traditional try blocks — the compiler requires at least one `catch` or one `finally`. However, **`try`-with-resources** alone is valid:

```java
try (AutoCloseable r = ...) {
    // use resource
} // auto-close, no catch or finally required
```

A bare `try { }` alone is a **compile error**.

**Example:**

```java
import java.io.*;

public class TryAloneDemo {
    public static void main(String[] args) throws IOException {
        // Valid — try-with-resources, no catch/finally
        try (BufferedReader reader = new BufferedReader(new StringReader("hello"))) {
            System.out.println(reader.readLine());
        }
    }
}
```

**Key takeaway:** Plain `try` must have `catch` or `finally`; try-with-resources is the exception and is self-contained.

---

## Q98. Explain the Java exception hierarchy

**Answer:** All exceptions and errors extend `Throwable`.

```
Throwable
├── Error (unchecked — do not catch)
│   ├── OutOfMemoryError
│   ├── StackOverflowError
│   └── VirtualMachineError ...
│
└── Exception
    ├── RuntimeException (unchecked)
    │   ├── NullPointerException
    │   ├── IllegalArgumentException
    │   ├── IndexOutOfBoundsException
    │   └── ArithmeticException ...
    │
    └── Checked Exceptions (must handle or declare)
        ├── IOException
        ├── SQLException
        └── ClassNotFoundException ...
```

**Example:**

```java
public class HierarchyDemo {
    static void check(Throwable t) {
        if (t instanceof Error) {
            System.out.println("Error: " + t.getClass().getSimpleName());
        } else if (t instanceof RuntimeException) {
            System.out.println("Unchecked: " + t.getClass().getSimpleName());
        } else if (t instanceof Exception) {
            System.out.println("Checked: " + t.getClass().getSimpleName());
        }
    }

    public static void main(String[] args) {
        check(new NullPointerException());  // Unchecked
        check(new IOException());           // Checked type (instantiating is fine; throwing would require handling)
        check(new OutOfMemoryError());      // Error
    }
}
```

**Key takeaway:** Know the hierarchy — `Throwable` → `Error` | `Exception` → `RuntimeException` (unchecked) vs other `Exception` (checked).

---

## Q99. What is the difference between `Error` and `Exception`?

**Answer:**

| Aspect | `Error` | `Exception` |
|--------|---------|---------------|
| Meaning | Serious JVM/system problems | Application-level problems |
| Examples | `OutOfMemoryError`, `StackOverflowError` | `IOException`, `NullPointerException` |
| Should catch? | Generally **no** — unrecoverable | Yes — especially checked ones |
| Checked? | Unchecked (extends `Throwable`, not `Exception`) | Mix — checked and unchecked |

**Example:**

```java
public class ErrorVsExceptionDemo {
    static void causeStackOverflow() {
        causeStackOverflow(); // StackOverflowError — Error, not Exception
    }

    static void causeNPE() {
        String s = null;
        s.length(); // NullPointerException — unchecked Exception
    }

    public static void main(String[] args) {
        try {
            causeNPE();
        } catch (Exception e) {
            System.out.println("Caught exception: " + e);
        }
        // Do NOT catch Error in normal application code
    }
}
```

**Key takeaway:** Catch `Exception` for recoverable application errors; let `Error` propagate — catching `OutOfMemoryError` rarely helps and may mask critical failures.

---

## Q100. What is the difference between checked and unchecked exceptions?

**Answer:**

| | Checked | Unchecked |
|---|---------|-----------|
| **Extends** | `Exception` (not `RuntimeException`) | `RuntimeException` or `Error` |
| **Compile-time** | Must catch or declare `throws` | No requirement |
| **Examples** | `IOException`, `SQLException` | `NullPointerException`, `IllegalArgumentException` |
| **Purpose** | Recoverable external failures | Programming bugs, precondition violations |

**Example:**

```java
import java.io.*;

public class CheckedUncheckedDemo {
    // Checked — compiler forces handling
    static void readFile(String path) throws IOException {
        new FileReader(path); // throws IOException
    }

    // Unchecked — no throws declaration required
    static int divide(int a, int b) {
        return a / b; // may throw ArithmeticException
    }

    public static void main(String[] args) {
        try {
            readFile("test.txt");
        } catch (IOException e) {
            System.out.println("File not found");
        }

        divide(10, 0); // compiles fine — unchecked
    }
}
```

**Key takeaway:** Checked = compiler-enforced handling for expected external failures; unchecked = bugs or bad input that usually shouldn't be in method signatures.

---

## Q101. What does the `throw` keyword do?

**Answer:** `throw` **explicitly throws** a `Throwable` instance, interrupting normal flow and starting exception propagation up the stack. You can throw any subclass of `Throwable` (but throw `Exception`/`RuntimeException` in practice, not `Error`).

**Example:**

```java
public class ThrowDemo {
    static void validateAge(int age) {
        if (age < 0) {
            throw new IllegalArgumentException("Age cannot be negative: " + age);
        }
        if (age < 18) {
            throw new IllegalStateException("Must be 18 or older");
        }
        System.out.println("Access granted");
    }

    public static void main(String[] args) {
        try {
            validateAge(-5);
        } catch (IllegalArgumentException e) {
            System.out.println("Validation failed: " + e.getMessage());
        }
    }
}
```

**Output:**
```
Validation failed: Age cannot be negative: -5
```

**Key takeaway:** Use `throw` to signal failure early (fail-fast) with meaningful exception types and messages.

---

## Q102. How do you declare checked exceptions from a method?

**Answer:** Add a **`throws` clause** to the method signature listing checked exception types. This tells callers they must handle or declare those exceptions. Unchecked exceptions do not require `throws` (but you may include them for documentation).

**Example:**

```java
import java.io.*;

public class ThrowsDemo {
    static void processFile(String path) throws IOException {
        try (BufferedReader br = new BufferedReader(new FileReader(path))) {
            System.out.println(br.readLine());
        }
    }

    public static void main(String[] args) {
        try {
            processFile("data.txt");
        } catch (IOException e) {
            System.out.println("Handled: " + e.getMessage());
        }
    }
}
```

**Key takeaway:** `throws` transfers responsibility to the caller — use it for checked exceptions you cannot handle at the current layer.

---

## Q103. What are your options when calling a method that throws a checked exception?

**Answer:** Exactly three options:

1. **Wrap in `try-catch`** and handle it locally.
2. **Declare `throws`** on your method and propagate to your caller.
3. **Wrap in an unchecked exception** (`new RuntimeException(e)`) — use sparingly, typically at framework boundaries.

You cannot ignore a checked exception without one of these — the code will not compile.

**Example:**

```java
import java.io.*;

public class CheckedOptionsDemo {
    // Option 1: catch
    static void optionCatch() {
        try {
            new FileReader("x.txt");
        } catch (FileNotFoundException e) {
            System.out.println("Option 1: caught locally");
        }
    }

    // Option 2: declare throws
    static void optionThrows() throws FileNotFoundException {
        new FileReader("x.txt");
    }

    // Option 3: wrap in unchecked
    static void optionWrap() {
        try {
            new FileReader("x.txt");
        } catch (FileNotFoundException e) {
            throw new RuntimeException("Option 3: wrapped", e);
        }
    }
}
```

**Key takeaway:** Pick catch (can recover), throws (caller should handle), or wrap (framework/API layer) — never swallow checked exceptions with empty catch blocks.

---

## Q104. How do you create a custom exception?

**Answer:** Extend `Exception` (checked) or `RuntimeException` (unchecked). Provide constructors delegating to `super(message)` and `super(message, cause)`. Use checked custom exceptions for business rules callers must handle; unchecked for programming violations.

**Example:**

```java
// Checked custom exception
class InsufficientFundsException extends Exception {
    private final double balance;
    private final double amount;

    InsufficientFundsException(double balance, double amount) {
        super("Insufficient funds: balance=" + balance + ", requested=" + amount);
        this.balance = balance;
        this.amount = amount;
    }

    double getBalance() { return balance; }
    double getAmount() { return amount; }
}

// Unchecked custom exception
class InvalidAccountException extends RuntimeException {
    InvalidAccountException(String accountId) {
        super("Invalid account: " + accountId);
    }
}

class BankService {
    void withdraw(double balance, double amount) throws InsufficientFundsException {
        if (amount <= 0) throw new InvalidAccountException("amount");
        if (amount > balance) throw new InsufficientFundsException(balance, amount);
        System.out.println("Withdrawn: " + amount);
    }
}
```

**Key takeaway:** Custom exceptions make error handling domain-specific — include context fields and always provide message + cause constructors.

---

## Q105. What is multi-catch and when is it useful?

**Answer:** Java 7 **multi-catch** lets one `catch` block handle multiple exception types: `catch (IOException | SQLException e)`. The caught variable is **implicitly final** — you cannot reassign it. Types must be disjoint (no subclass relationship between them).

Useful when several exceptions share the same recovery logic.

**Example:**

```java
import java.io.*;

public class MultiCatchDemo {
    static void load(String path) {
        try {
            if (path == null) throw new NullPointerException();
            new FileReader(path);
        } catch (FileNotFoundException | NullPointerException e) {
            System.out.println("Load failed: " + e.getClass().getSimpleName() + " — " + e.getMessage());
        } catch (IOException e) {
            System.out.println("IO error: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        load("missing.txt");
        load(null);
    }
}
```

**Key takeaway:** Multi-catch reduces duplication — but split catches when recovery logic differs per exception type.

---

## Q106. What is try-with-resources and how does it work?

**Answer:** Java 7 **try-with-resources** automatically closes resources that implement `AutoCloseable` when the `try` block exits (normally or exceptionally). Close happens in reverse order of declaration. Resources must be declared in the try header.

Replaces boilerplate `finally { resource.close(); }` and suppresses secondary exceptions from close if the try block also threw.

**Example:**

```java
import java.io.*;

public class TryWithResourcesDemo {
    static void readOldWay(String path) throws IOException {
        BufferedReader reader = null;
        try {
            reader = new BufferedReader(new FileReader(path));
            System.out.println(reader.readLine());
        } finally {
            if (reader != null) reader.close();
        }
    }

    static void readNewWay(String path) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(path))) {
            System.out.println(reader.readLine());
        } // reader.close() called automatically
    }
}
```

**Key takeaway:** Always prefer try-with-resources for `AutoCloseable` — it is shorter, safer, and handles suppressed exceptions correctly.

---

## Q107. How do suppressed exceptions work in try-with-resources?

**Answer:** If both the `try` block and the `close()` method throw exceptions, the **primary exception** (from try) is thrown, and the exception from `close()` is **added as suppressed** via `Throwable.addSuppressed()`. Access them with `getSuppressed()`.

**Example:**

```java
import java.io.*;

class FaultyResource implements AutoCloseable {
    @Override
    public void close() throws IOException {
        throw new IOException("Close failed");
    }
}

public class SuppressedExceptionDemo {
    public static void main(String[] args) {
        try (FaultyResource r = new FaultyResource()) {
            throw new RuntimeException("Try block failed");
        } catch (Exception e) {
            System.out.println("Primary: " + e.getMessage());
            for (Throwable suppressed : e.getSuppressed()) {
                System.out.println("Suppressed: " + suppressed.getMessage());
            }
        }
    }
}
```

**Output:**
```
Primary: Try block failed
Suppressed: Close failed
```

**Key takeaway:** Suppressed exceptions preserve full failure context — inspect them when debugging resource cleanup issues.

---

## Q108. What are exception handling best practices?

**Answer:**

1. **Catch specific exceptions**, not broad `Exception` or `Throwable` (unless rethrowing at top level).
2. **Never swallow exceptions** — empty `catch` blocks hide bugs.
3. **Use try-with-resources** for all `AutoCloseable` resources.
4. **Throw early, catch late** — validate at boundaries, handle at layer that can respond.
5. **Include context** in messages; use exception chaining (`cause`) when wrapping.
6. **Prefer unchecked exceptions** for unrecoverable programming errors (`IllegalArgumentException`).
7. **Use checked exceptions** for recoverable, expected failures (I/O, external services).
8. **Log at the catch site** that handles the error, not at every rethrow.
9. **Fail fast** — don't return null instead of throwing when the error is exceptional.
10. **Don't use exceptions for control flow** — they are expensive compared to normal branching.

**Example:**

```java
import java.util.*;
import java.util.logging.*;

public class BestPracticesDemo {
    private static final Logger LOG = Logger.getLogger(BestPracticesDemo.class.getName());

    static int parsePositiveInt(String input) {
        if (input == null || input.isBlank()) {
            throw new IllegalArgumentException("Input must not be blank");
        }
        try {
            int value = Integer.parseInt(input.trim());
            if (value <= 0) throw new IllegalArgumentException("Must be positive: " + value);
            return value;
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("Not a valid integer: " + input, e);
        }
    }

    static void processInput(String input) {
        try {
            int n = parsePositiveInt(input);
            System.out.println("Processing: " + n);
        } catch (IllegalArgumentException e) {
            LOG.warning("Invalid input: " + e.getMessage());
            // user-friendly response, not silent swallow
        }
    }

    public static void main(String[] args) {
        processInput("42");
        processInput("abc");
        processInput("-5");
    }
}
```

**Key takeaway:** Good exception handling is about clarity and recoverability — specific types, meaningful messages, proper resource cleanup, and handling at the right architectural layer.

---

# Collections Framework — Basics (Q134–Q166)

Topics: collection hierarchy, List/Set/Map/Queue interfaces, implementations, sorting, and utility methods.

---

## Q134. Why do we need the Java Collections Framework instead of plain arrays?

**Answer**

Arrays are fixed-size, typed containers with limited operations. The **Collections Framework** (`java.util`) provides:

| Need | Array limitation | Collection solution |
|------|------------------|---------------------|
| Dynamic size | Fixed length | Grow/shrink automatically |
| Rich API | Manual copy/shift | `add`, `remove`, `contains`, iterators |
| Polymorphism | Covariance quirks | Program to `List`, `Map`, `Set` interfaces |
| Algorithms | Manual sort/search | `Collections.sort`, binary search helpers |
| Thread-safe variants | Manual locking | `Concurrent*` collections |
| Object-only storage | Primitives need wrappers | Autoboxing + specialized streams |

**Example**

```java
// Array — fixed size, awkward insert
String[] arr = new String[3];
// arr[3] = "x"; // ArrayIndexOutOfBoundsException

// ArrayList — dynamic
List<String> list = new ArrayList<>();
list.add("Java");
list.add("Spring");
list.remove("Java");
System.out.println(list.size()); // 1
```

**Key takeaway:** Collections add dynamic sizing, standard interfaces, and reusable algorithms — essential for application development beyond trivial fixed data.

---

## Q135. What is the Java Collections hierarchy?

**Answer**

```
Iterable
 └── Collection
      ├── List      (ordered, allows duplicates)
      ├── Set       (no duplicates)
      └── Queue     (FIFO processing)
           └── Deque (double-ended queue)

Map (separate hierarchy — not a Collection)
 ├── SortedMap
 └── NavigableMap
```

| Interface | Key contract |
|-----------|--------------|
| `Iterable` | `iterator()` for enhanced for-loop |
| `Collection` | add/remove/contains/size |
| `List` | Positional access, duplicates OK |
| `Set` | Unique elements |
| `Queue` | Head/tail operations |
| `Map` | Key-value pairs, unique keys |

**Example**

```java
Collection<String> col = new ArrayList<>();
List<String> list = new LinkedList<>();
Set<String> set = new HashSet<>();
Queue<String> queue = new ArrayDeque<>();
Map<String, Integer> map = new HashMap<>();
```

**Key takeaway:** `Map` is **not** a subinterface of `Collection`; know both trees for interviews and API design.

---

## Q136. What are the core methods of the `Collection` interface?

**Answer**

| Category | Methods |
|----------|---------|
| Size / empty | `size()`, `isEmpty()` |
| Add / remove | `add(E)`, `remove(Object)`, `addAll`, `removeAll`, `retainAll`, `clear` |
| Query | `contains(Object)`, `containsAll` |
| Iteration | `iterator()`, `forEach` (default, Java 8+) |
| Array conversion | `toArray()`, `toArray(T[])` |
| Stream | `stream()`, `parallelStream()` (default) |

Optional operations (e.g., `add` on unmodifiable views) throw **`UnsupportedOperationException`**.

**Example**

```java
Collection<Integer> nums = new ArrayList<>(List.of(1, 2, 3));
nums.add(4);
nums.remove(2);
System.out.println(nums.contains(3)); // true
System.out.println(nums.size());    // 3

Integer[] arr = nums.toArray(Integer[]::new);
```

**Key takeaway:** `Collection` defines the universal CRUD + iteration contract implemented by List, Set, and Queue.

---

## Q137. What is the `List` interface and when do you use it?

**Answer**

`List` is an **ordered** collection with **positional access** (`get`, `set`, `add(index, e)`), **duplicates allowed**, and **null** allowed (in most implementations).

Use `List` when:
- Order matters (display sequence, timeline)
- Index-based access is needed
- Duplicates are valid (shopping cart items, log entries)

**Example**

```java
List<String> tasks = new ArrayList<>();
tasks.add("Write tests");
tasks.add("Deploy");
tasks.add(1, "Code review"); // insert at index 1

System.out.println(tasks.get(0));  // Write tests
System.out.println(tasks.indexOf("Deploy")); // 2
```

**Key takeaway:** `List` = ordered + indexed + duplicates; choose implementation (`ArrayList` vs `LinkedList`) based on access patterns.

---

## Q138. Show a practical `ArrayList` example.

**Answer**

`ArrayList` is a **resizable array** — O(1) random access, O(n) insert/delete in the middle. Default choice for most `List` use cases.

**Example**

```java
List<Product> catalog = new ArrayList<>();

catalog.add(new Product("P001", "Laptop", 1200));
catalog.add(new Product("P002", "Mouse", 25));
catalog.add(new Product("P003", "Keyboard", 75));

// Filter in place with removeIf (Java 8+)
catalog.removeIf(p -> p.getPrice() < 50);

// Sort with Comparator
catalog.sort(Comparator.comparing(Product::getName));

for (Product p : catalog) {
    System.out.println(p.getName() + " — $" + p.getPrice());
}
```

**Key takeaway:** `ArrayList` excels at read-heavy, index-based workloads; prefer it unless you frequently insert/remove at the head/middle of large lists.

---

## Q139. Do Lists allow duplicate elements?

**Answer**

**Yes.** `List` permits duplicate elements and duplicate `null` values (implementation permitting). **Set** forbids duplicates; **Map** forbids duplicate keys.

If uniqueness is required, use `Set` or enforce checks manually.

**Example**

```java
List<String> tags = new ArrayList<>();
tags.add("java");
tags.add("spring");
tags.add("java"); // duplicate allowed

System.out.println(tags); // [java, spring, java]
System.out.println(tags.size()); // 3

Set<String> uniqueTags = new HashSet<>(tags);
System.out.println(uniqueTags); // [java, spring] — order not guaranteed
```

**Key takeaway:** Duplicates are a `List` feature, not a bug — use `Set` when uniqueness is the requirement.

---

## Q140. How does the `Iterator` interface work?

**Answer**

`Iterator<E>` traverses a collection with:
- `hasNext()` — more elements?
- `next()` — return next (throws `NoSuchElementException` if exhausted)
- `remove()` — delete last returned element (optional)

**Fail-fast** iterators throw `ConcurrentModificationException` if the collection is structurally modified outside the iterator (except via `Iterator.remove()`).

Enhanced for-loop uses iterator under the hood.

**Example**

```java
List<String> items = new ArrayList<>(List.of("A", "B", "C"));
Iterator<String> it = items.iterator();

while (it.hasNext()) {
    String item = it.next();
    if ("B".equals(item)) {
        it.remove(); // safe removal during iteration
    }
}
System.out.println(items); // [A, C]
```

**Key takeaway:** Use `Iterator.remove()` for safe in-loop deletion; never modify a fail-fast collection directly while iterating.

---

## Q141. How do you sort a collection with `Collections.sort`?

**Answer**

`Collections.sort(list)` sorts a **`List`** in place using natural ordering (`Comparable`) or an explicit **`Comparator`**. It is a legacy wrapper — prefer **`list.sort(comparator)`** (Java 8+).

Requires **stable, modifiable** list. Cannot sort arbitrary `Set`/`Map` directly — copy keys/entries to a `List` first.

**Example**

```java
List<String> names = new ArrayList<>(List.of("Charlie", "Alice", "Bob"));

Collections.sort(names); // natural order
System.out.println(names); // [Alice, Bob, Charlie]

Collections.sort(names, Comparator.reverseOrder());
System.out.println(names); // [Charlie, Bob, Alice]

// Modern style
names.sort(String.CASE_INSENSITIVE_ORDER);
```

**Key takeaway:** Sorting applies to lists; use `Comparable` for default order and `Comparator` for custom/multiple sort keys.

---

## Q142. What is the `Comparable` interface?

**Answer**

`Comparable<T>` defines **natural ordering** via `int compareTo(T other)`:
- Negative if `this < other`
- Zero if equal (for sort purposes)
- Positive if `this > other`

Implement on the class itself. Used by `Collections.sort`, `TreeSet`, `TreeMap`, etc.

**Example**

```java
public class Employee implements Comparable<Employee> {
    private String name;
    private int id;

    @Override
    public int compareTo(Employee other) {
        return Integer.compare(this.id, other.id); // ascending by id
    }
}

List<Employee> staff = new ArrayList<>(...);
Collections.sort(staff); // uses compareTo
```

**Key takeaway:** `Comparable` = "how this object sorts by default"; keep `compareTo` consistent with `equals` when possible.

---

## Q143. What is the `Comparator` interface?

**Answer**

`Comparator<T>` defines **external ordering** via `int compare(T a, T b)` without modifying the class. Supports:
- Multiple sort orders per class
- Sorting third-party classes you cannot modify
- Method references and lambdas (Java 8+)

Static helpers: `Comparator.comparing`, `thenComparing`, `reversed`, `nullsFirst`.

**Example**

```java
List<Employee> staff = ...;

staff.sort(Comparator
    .comparing(Employee::getDepartment)
    .thenComparing(Employee::getName));

// vs Comparable — different order without changing Employee
staff.sort(Comparator.comparingInt(Employee::getSalary).reversed());
```

**Key takeaway:** `Comparator` separates sorting logic from domain classes — flexible and composable.

---

## Q144. `Vector` vs `ArrayList` — what is the difference?

**Answer**

| Feature | `Vector` | `ArrayList` |
|---------|----------|-------------|
| Introduced | Java 1.0 | Java 1.2 |
| Thread safety | **Synchronized** methods | **Not synchronized** |
| Performance | Slower under contention | Faster single-threaded |
| Growth | Doubles capacity (legacy) | 50% growth |
| Legacy | Yes — prefer alternatives | Default `List` impl |

For thread-safe lists today, use **`CopyOnWriteArrayList`** (read-heavy) or synchronize externally / use concurrent collections.

**Example**

```java
List<String> arrayList = new ArrayList<>(); // preferred
List<String> vector = new Vector<>();       // legacy synchronized

// Thread-safe without Vector:
List<String> safe = Collections.synchronizedList(new ArrayList<>());
```

**Key takeaway:** Do not choose `Vector` for new code; use `ArrayList` + proper concurrency tools when needed.

---

## Q145. What is `LinkedList` and when should you use it?

**Answer**

`LinkedList` is a **doubly-linked list** implementing `List` and `Deque`. O(1) insert/delete at known node (with iterator), O(n) random access via index.

Use when:
- Frequent insert/remove at **both ends** or with iterator position
- Implementing queue/deque on same structure

Avoid when:
- Mostly random `get(i)` access — `ArrayList` wins

**Example**

```java
Deque<Task> queue = new LinkedList<>();
queue.addLast(new Task("Email"));
queue.addLast(new Task("Report"));
Task next = queue.removeFirst(); // FIFO

LinkedList<String> list = new LinkedList<>();
list.add("middle");
list.addFirst("head");
list.addLast("tail");
```

**Key takeaway:** `LinkedList` shines as a deque or when insertion points are iterator-driven — not as a general-purpose replacement for `ArrayList`.

---

## Q146. What is the `Set` interface?

**Answer**

`Set` extends `Collection` with **no duplicate elements** (at most one `null` in most implementations). Models mathematical set abstraction.

Core implementations: `HashSet`, `LinkedHashSet`, `TreeSet`.

`Set` makes no guarantee about order except `LinkedHashSet` (insertion) and `TreeSet` (sorted).

**Example**

```java
Set<String> emails = new HashSet<>();
emails.add("user@example.com");
emails.add("admin@example.com");
emails.add("user@example.com"); // ignored — duplicate

System.out.println(emails.size()); // 2
System.out.println(emails.contains("admin@example.com")); // true
```

**Key takeaway:** Use `Set` whenever uniqueness matters — keys, tags, deduplication.

---

## Q147. What is `SortedSet`?

**Answer**

`SortedSet<E>` extends `Set` and maintains elements in **ascending sort order** (natural or `Comparator`). Head/tail views: `subSet`, `headSet`, `tailSet`.

Primary implementation: **`TreeSet`**.

Elements must be **mutually comparable** (otherwise `ClassCastException` at runtime).

**Example**

```java
SortedSet<Integer> scores = new TreeSet<>();
scores.addAll(List.of(88, 92, 75, 92));
System.out.println(scores); // [75, 88, 92] — duplicate 92 ignored

SortedSet<Integer> topHalf = scores.tailSet(88);
System.out.println(topHalf); // [88, 92]
```

**Key takeaway:** `SortedSet` = unique + ordered; backed by red-black tree in `TreeSet` (O(log n) ops).

---

## Q148. Compare `HashSet`, `LinkedHashSet`, and `TreeSet`.

**Answer**

| Implementation | Order | Null | Performance | Backing |
|----------------|-------|------|-------------|---------|
| **HashSet** | None guaranteed | 1 null OK | O(1) avg add/contains | Hash table |
| **LinkedHashSet** | Insertion order | 1 null OK | Slightly slower than HashSet | Hash table + linked list |
| **TreeSet** | Sorted (natural/Comparator) | No null (usually NPE) | O(log n) | Red-black tree |

**Example**

```java
Set<String> hash = new HashSet<>(List.of("banana", "apple", "cherry"));
Set<String> linked = new LinkedHashSet<>(List.of("banana", "apple", "cherry"));
Set<String> tree = new TreeSet<>(List.of("banana", "apple", "cherry"));

System.out.println(hash);   // unpredictable order
System.out.println(linked); // [banana, apple, cherry]
System.out.println(tree);   // [apple, banana, cherry]
```

**Key takeaway:** Default to `HashSet`; use `LinkedHashSet` for stable iteration order; use `TreeSet` for sorted uniqueness.

---

## Q149. What is `NavigableSet`?

**Answer**

`NavigableSet<E>` extends `SortedSet` with navigation methods:
- `lower(e)`, `floor(e)`, `ceiling(e)`, `higher(e)` — nearest neighbors
- `pollFirst()`, `pollLast()` — retrieve and remove ends
- `descendingSet()` — reverse-order view

Implemented by **`TreeSet`**.

**Example**

```java
NavigableSet<Integer> set = new TreeSet<>(List.of(10, 20, 30, 40));

System.out.println(set.floor(25));   // 20
System.out.println(set.ceiling(25)); // 30
System.out.println(set.lower(20));   // 10

NavigableSet<Integer> desc = set.descendingSet();
System.out.println(desc.pollFirst()); // 40
```

**Key takeaway:** `NavigableSet` adds binary-search-tree navigation — useful for range queries and ordered polling.

---

## Q150. What is the `Queue` interface?

**Answer**

`Queue` models a **FIFO** (First-In-First-Out) queue with two sets of methods:

| Operation | Throws exception | Returns special value |
|-----------|------------------|----------------------|
| Insert | `add(e)` | `offer(e)` → false if full |
| Remove | `remove()` | `poll()` → null if empty |
| Examine | `element()` | `peek()` → null if empty |

**Example**

```java
Queue<String> queue = new LinkedList<>();
queue.offer("job-1");
queue.offer("job-2");

while (!queue.isEmpty()) {
    String job = queue.poll();
    System.out.println("Processing: " + job);
}
```

**Key takeaway:** Prefer `offer`/`poll`/`peek` in production — they fail gracefully instead of throwing on bounded/full queues.

---

## Q151. What is `Deque` (double-ended queue)?

**Answer**

`Deque` extends `Queue` with operations at **both ends**:
- `addFirst` / `addLast`, `offerFirst` / `offerLast`
- `removeFirst` / `removeLast`, `pollFirst` / `pollLast`
- `peekFirst` / `peekLast`

Can be used as **stack** (LIFO: `push`/`pop`) or **queue** (FIFO).

Implementations: `ArrayDeque` (preferred), `LinkedList`.

**Example**

```java
Deque<String> stack = new ArrayDeque<>();
stack.push("first");
stack.push("second");
System.out.println(stack.pop()); // second — LIFO

Deque<String> fifo = new ArrayDeque<>();
fifo.offerLast("A");
fifo.offerLast("B");
System.out.println(fifo.pollFirst()); // A
```

**Key takeaway:** Use `ArrayDeque` as your default stack/queue — faster and lighter than `Stack` or `LinkedList` for most cases.

---

## Q152. What is `BlockingQueue`?

**Answer**

`BlockingQueue` extends `Queue` for **producer-consumer** threading:
- **`put(e)`** — blocks if queue is full (bounded)
- **`take()`** — blocks until element available
- Timed variants: `offer(e, timeout)`, `poll(timeout)`

Thread-safe; designed for coordinating work across threads.

**Example**

```java
BlockingQueue<String> queue = new ArrayBlockingQueue<>(10);

// Producer thread
queue.put("task"); // blocks if full

// Consumer thread
String task = queue.take(); // blocks if empty
```

**Key takeaway:** `BlockingQueue` is the standard bridge between producers and consumers in concurrent pipelines.

---

## Q153. What is `PriorityQueue`?

**Answer**

`PriorityQueue` is an **unbounded** queue ordered by **priority** (natural `Comparable` or `Comparator`) — **not FIFO**. Head is least element (min-heap by default).

**Not thread-safe.** O(log n) insert/remove.

Null not allowed. Iteration order ≠ priority order.

**Example**

```java
Queue<Integer> pq = new PriorityQueue<>();
pq.offer(30);
pq.offer(10);
pq.offer(20);

System.out.println(pq.poll()); // 10 — smallest first
System.out.println(pq.poll()); // 20

// Max-heap style
Queue<Integer> maxPq = new PriorityQueue<>(Comparator.reverseOrder());
```

**Key takeaway:** `PriorityQueue` schedules by priority, not arrival time — ideal for task scheduling and Dijkstra's algorithm.

---

## Q154. What are common `BlockingQueue` implementations?

**Answer**

| Class | Bounded | Notes |
|-------|---------|-------|
| `ArrayBlockingQueue` | Yes (fixed array) | Single lock — simple, predictable |
| `LinkedBlockingQueue` | Optional (default Integer.MAX_VALUE) | Separate locks for head/tail |
| `PriorityBlockingQueue` | Unbounded | Priority ordering |
| `DelayQueue` | Unbounded | Elements available after delay |
| `SynchronousQueue` | Zero capacity | Handoff — `put` waits for `take` |
| `LinkedTransferQueue` | Unbounded | `transfer()` waits for consumer |

**Example**

```java
BlockingQueue<Runnable> pool = new LinkedBlockingQueue<>(100);
BlockingQueue<Runnable> handoff = new SynchronousQueue<>();

ExecutorService exec = new ThreadPoolExecutor(
    4, 8, 60, TimeUnit.SECONDS, pool);
```

**Key takeaway:** Choose bounded vs unbounded and handoff semantics based on backpressure and latency requirements.

---

## Q155. What is the `Map` interface?

**Answer**

`Map<K,V>` stores **key-value pairs** with **unique keys**. Not a `Collection`, but provides **`keySet()`**, **`values()`**, **`entrySet()`** views.

Core operations: `put`, `get`, `remove`, `containsKey`, `containsValue`, `getOrDefault`, `putIfAbsent`, `compute`, `merge` (Java 8+).

**Example**

```java
Map<String, Integer> wordCount = new HashMap<>();
for (String word : List.of("java", "java", "spring")) {
    wordCount.merge(word, 1, Integer::sum);
}
System.out.println(wordCount); // {java=2, spring=1}
```

**Key takeaway:** `Map` models dictionaries/associations; never assume iteration order unless using `LinkedHashMap` or `TreeMap`.

---

## Q156. What is `SortedMap`?

**Answer**

`SortedMap<K,V>` maintains keys in **ascending order** (natural or `Comparator`). Provides `firstKey`, `lastKey`, `subMap`, `headMap`, `tailMap`.

Implementation: **`TreeMap`**.

**Example**

```java
SortedMap<String, String> capitals = new TreeMap<>();
capitals.put("Germany", "Berlin");
capitals.put("France", "Paris");
capitals.put("Italy", "Rome");

System.out.println(capitals.firstKey()); // France
System.out.println(capitals.tailMap("Germany")); // {Germany=Berlin, Italy=Rome}
```

**Key takeaway:** `SortedMap` = sorted keys + map semantics; useful for range scans and ordered configs.

---

## Q157. What are important `HashMap` methods?

**Answer**

| Method | Purpose |
|--------|---------|
| `put(k, v)` | Insert/replace value for key |
| `get(k)` | Lookup value (null if absent) |
| `getOrDefault(k, default)` | Safe lookup with fallback |
| `putIfAbsent(k, v)` | Atomic-ish insert if missing |
| `computeIfAbsent(k, fn)` | Lazy compute value |
| `merge(k, v, remappingFn)` | Combine values (e.g., counting) |
| `remove(k)` / `remove(k, v)` | Delete entry |
| `containsKey` / `containsValue` | Membership tests |
| `keySet`, `values`, `entrySet` | Views (backed by map) |

**Not thread-safe** — use `ConcurrentHashMap` concurrently.

**Example**

```java
Map<String, List<String>> index = new HashMap<>();

index.computeIfAbsent("java", k -> new ArrayList<>()).add("collections");
index.computeIfAbsent("java", k -> new ArrayList<>()).add("streams");

System.out.println(index.get("java")); // [collections, streams]
```

**Key takeaway:** Master `getOrDefault`, `computeIfAbsent`, and `merge` — they replace verbose get-put-null-check patterns.

---

## Q158. What is `TreeMap`?

**Answer**

`TreeMap` implements `NavigableMap` / `SortedMap` using a **red-black tree**. Keys sorted; O(log n) operations.

- No null keys (generally `NullPointerException`)
- Null values allowed (unless comparator rejects)

**Example**

```java
Map<String, Integer> scores = new TreeMap<>();
scores.put("Charlie", 85);
scores.put("Alice", 92);
scores.put("Bob", 78);

scores.forEach((name, score) ->
    System.out.println(name + ": " + score));
// Alice, Bob, Charlie — key order
```

**Key takeaway:** `TreeMap` when you need sorted keys or range views; `HashMap` when you only need fast unstructured lookup.

---

## Q159. What is `NavigableMap`?

**Answer**

`NavigableMap<K,V>` extends `SortedMap` with:
- `lowerKey`, `floorKey`, `ceilingKey`, `higherKey`
- `pollFirstEntry`, `pollLastEntry`
- `descendingMap`, `subMap` with inclusive/exclusive bounds

Implemented by **`TreeMap`**.

**Example**

```java
NavigableMap<Integer, String> map = new TreeMap<>();
map.put(1, "one");
map.put(3, "three");
map.put(5, "five");

System.out.println(map.floorEntry(4));  // 3=three
System.out.println(map.ceilingEntry(4)); // 5=five
System.out.println(map.descendingMap().firstKey()); // 5
```

**Key takeaway:** `NavigableMap` is to maps what `NavigableSet` is to sets — neighbor lookup and bidirectional traversal.

---

## Q160. What are essential static methods in `Collections`?

**Answer**

| Method | Purpose |
|--------|---------|
| `sort(list)` / `sort(list, c)` | Sort list in place |
| `binarySearch(list, key)` | Search sorted list |
| `reverse`, `shuffle`, `fill`, `copy` | Mutate list |
| `min`, `max`, `frequency` | Aggregate queries |
| `unmodifiableList/Set/Map` | Read-only wrapper |
| `synchronizedList/Set/Map` | Thread-safe wrapper |
| `emptyList`, `singletonList`, `nCopies` | Immutable/special lists |
| `disjoint`, `indexOfSubList` | Comparisons |

**Example**

```java
List<Integer> nums = new ArrayList<>(List.of(3, 1, 4, 1, 5));
Collections.sort(nums);
System.out.println(Collections.binarySearch(nums, 4)); // 2
System.out.println(Collections.frequency(nums, 1));    // 2

List<Integer> readOnly = Collections.unmodifiableList(nums);
// readOnly.add(9); // UnsupportedOperationException
```

**Key takeaway:** `Collections` is a utility class of algorithms and wrappers — not instantiable, all static.

---

## Q161. How do `HashMap`, `LinkedHashMap`, and `TreeMap` compare?

**Answer**

| Map | Key order | Null key | Performance |
|-----|-----------|----------|-------------|
| **HashMap** | None | 1 null OK | O(1) avg |
| **LinkedHashMap** | Insertion or access order | 1 null OK | Slightly slower |
| **TreeMap** | Sorted | No null key | O(log n) |
| **Hashtable** (legacy) | None | No null | Synchronized — avoid |

**Example**

```java
Map<String, Integer> hash = new HashMap<>();
Map<String, Integer> linked = new LinkedHashMap<>();
Map<String, Integer> tree = new TreeMap<>();

List.of("c", "a", "b").forEach(k -> {
    hash.put(k, k.length());
    linked.put(k, k.length());
    tree.put(k, k.length());
});
// tree iteration: a, b, c
// linked: c, a, b (insertion order)
```

**Key takeaway:** Same pattern as sets — pick based on ordering needs and null-key policy.

---

## Q162. What is the difference between `Collection` and `Collections`?

**Answer**

| Name | What it is |
|------|------------|
| **`Collection`** | Core **interface** for groups of objects |
| **`Collections`** | **Utility class** with static helper methods (sort, sync wrappers, unmodifiable views) |

Easy interview trap — names differ by one letter, roles completely different.

**Example**

```java
Collection<String> col = new ArrayList<>(); // interface type
Collections.sort((List<String>) col);       // utility — requires List
```

**Key takeaway:** `Collection` = contract; `Collections` = helper toolbox.

---

## Q163. How do you safely iterate and remove from a `Map`?

**Answer**

Use **`entrySet()` iterator** or **`Iterator.remove()`**. Do not call `map.remove(key)` while iterating a fail-fast collection unless using iterator removal or `ConcurrentHashMap` iterator.

Java 8+ alternative: **`removeIf`** on entry set (for `ConcurrentHashMap` and modifiable maps).

**Example**

```java
Map<String, Integer> scores = new HashMap<>(Map.of(
    "Alice", 90, "Bob", 55, "Charlie", 72));

Iterator<Map.Entry<String, Integer>> it = scores.entrySet().iterator();
while (it.hasNext()) {
    Map.Entry<String, Integer> entry = it.next();
    if (entry.getValue() < 60) {
        it.remove(); // safe
    }
}
// scores: {Alice=90, Charlie=72}
```

**Key takeaway:** Map iteration + structural modification requires iterator discipline or concurrent map APIs.

---

## Q164. What are `List.of`, `Set.of`, and `Map.of` (immutable factory methods)?

**Answer**

Java 9+ factory methods create **immutable** collections:
- `List.of(e1, e2, ...)`
- `Set.of(...)` — no duplicates
- `Map.of(k1, v1, k2, v2, ...)` — max 10 pairs; use `Map.ofEntries` for more

Null elements/keys/values **not allowed**. Modifications throw `UnsupportedOperationException`.

**Example**

```java
List<String> langs = List.of("Java", "Kotlin");
Set<Integer> ids = Set.of(1, 2, 3);
Map<String, Integer> map = Map.of("A", 1, "B", 2);

// langs.add("Go"); // UnsupportedOperationException
// List.of(null);   // NullPointerException
```

**Key takeaway:** Use immutable factories for constants and DTO snapshots; use mutable `ArrayList`/`HashMap` when you need to build incrementally.

---

## Q165. What is `equals` and `hashCode` contract for collection keys?

**Answer**

For objects used as **`HashMap`/`HashSet` keys**:
1. If `a.equals(b)`, then `a.hashCode() == b.hashCode()`
2. Consistent: repeated calls return same hash (unless fields used change)
3. `equals` must be reflexive, symmetric, transitive, consistent

If you override `equals`, **always override `hashCode`**. Broken contract → "lost" entries (same logical key, different buckets).

**Example**

```java
public class User {
    private final Long id;
    private String name;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof User other)) return false;
        return Objects.equals(id, other.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
```

**Key takeaway:** Key objects must honor the equals/hashCode contract — critical for correct `HashMap`/`HashSet` behavior.

---

## Q166. Summary comparison table — pick the right collection.

**Answer**

| Use case | Choose |
|----------|--------|
| General purpose list | `ArrayList` |
| Frequent head/tail ops, deque | `ArrayDeque` |
| Unique elements, fast lookup | `HashSet` |
| Unique + insertion order | `LinkedHashSet` |
| Unique + sorted | `TreeSet` |
| Key-value, general | `HashMap` |
| Key-value + order | `LinkedHashMap` |
| Key-value + sorted keys | `TreeMap` |
| FIFO queue | `ArrayDeque` or `LinkedBlockingQueue` |
| Priority scheduling | `PriorityQueue` |
| Thread-safe map | `ConcurrentHashMap` |
| Producer-consumer | `ArrayBlockingQueue` |

**Example — choosing wisely**

```java
// Cache with max 100 entries — LinkedHashMap access-order + removeEldestEntry
Map<String, byte[]> cache = new LinkedHashMap<>(16, 0.75f, true) {
    @Override
    protected boolean removeEldestEntry(Map.Entry<String, byte[]> eldest) {
        return size() > 100;
    }
};
```

**Key takeaway:** Default to `ArrayList`, `HashMap`, `HashSet`, `ArrayDeque`; upgrade to sorted or concurrent variants when requirements demand it.
