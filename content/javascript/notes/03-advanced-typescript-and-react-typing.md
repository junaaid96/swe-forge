# Advanced TypeScript & Typing React

The TypeScript guide covers the type system basics. This one goes further: type-level programming (mapped, conditional and template literal types), patterns that make illegal states unrepresentable, and how to type React components, hooks, events and refs precisely.

---

## 1. Type system refresher in one table

| Concept | Remember |
|---|---|
| `unknown` vs `any` | `unknown` forces narrowing before use; `any` turns checking off |
| `never` | the empty type: impossible branches, functions that throw |
| inference & widening | `let x = 'a'` is `string`; `const x = 'a'` is `'a'`; `as const` freezes literals deeply |
| narrowing | `typeof`, `instanceof`, `in`, equality, truthiness, discriminants, custom predicates |
| `type` vs `interface` | both describe objects; `interface` supports declaration merging and `extends`; `type` handles unions, tuples, mapped and conditional types |
| unions / intersections | `A \| B` is either; `A & B` has both |

---

## 2. Generics and utility types

```ts
function pluck<T, K extends keyof T>(items: T[], key: K): T[K][] {
  return items.map((i) => i[key]);
}
const names = pluck(users, 'name'); // string[]

type UserPatch = Partial<Pick<User, 'name' | 'email'>>;
type ReadonlyUser = Readonly<User>;
type ById = Record<string, User>;
type Fn = (id: string) => Promise<User>;
type Result = Awaited<ReturnType<Fn>>;       // User
type Args = Parameters<Fn>;                  // [id: string]
type NoNulls = NonNullable<string | null>;   // string
```

## 3. Mapped, conditional and template literal types

```ts
// Mapped: transform every property
type Optional<T> = { [K in keyof T]?: T[K] };
type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
// Getters<{ name: string }> → { getName: () => string }

// Conditional with infer
type ElementOf<T> = T extends readonly (infer E)[] ? E : never;
type Unwrap<T> = T extends Promise<infer V> ? Unwrap<V> : T;

// Distributive over unions
type NonFunction<T> = T extends (...args: never[]) => unknown ? never : T;

// Template literal types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type Route = `/api/${'users' | 'orders'}`;
type Endpoint = `${HttpMethod} ${Route}`;  // 'GET /api/users' | ...
type EventName<T extends string> = `on${Capitalize<T>}`;
```

> **Asked as:** "Implement a DeepPartial type." · "What does `infer` do?" · "Explain distributive conditional types."

---

## 4. Patterns that prevent bugs

### 4.1 Discriminated unions + exhaustiveness

```ts
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function render(s: RequestState<User>) {
  switch (s.status) {
    case 'idle': return 'Start';
    case 'loading': return 'Loading…';
    case 'success': return s.data.name;     // narrowed: data exists
    case 'error': return s.error;
    default: {
      const _exhaustive: never = s;           // compile error if a case is missing
      return _exhaustive;
    }
  }
}
```

### 4.2 Type guards and assertion functions

```ts
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x && 'email' in x;
}
function assertDefined<T>(v: T, msg = 'missing'): asserts v is NonNullable<T> {
  if (v == null) throw new Error(msg);
}
```

For data crossing a trust boundary (API responses, forms), validate at runtime with a schema library (zod, valibot) and infer the type from the schema: `type User = z.infer<typeof UserSchema>`.

### 4.3 Branded (nominal) types

```ts
type Brand<T, B extends string> = T & { readonly __brand: B };
type UserId = Brand<string, 'UserId'>;
type OrderId = Brand<string, 'OrderId'>;
const toUserId = (s: string) => s as UserId;
function getUser(id: UserId) { /* ... */ }
getUser(toUserId('u_1'));          // ok
// getUser('o_9' as OrderId);       // error: different brand
```

### 4.4 Declaration merging and module augmentation

```ts
// Add a field to Express's Request type
declare global {
  namespace Express {
    interface Request { user?: { id: string; role: 'admin' | 'user' } }
  }
}
// Extend a library's theme type
declare module '@mui/material/styles' {
  interface Palette { brand: Palette['primary'] }
}
```

---

## 5. Typing React

### 5.1 Components and props

```tsx
interface ButtonProps extends React.ComponentPropsWithoutRef<'button'> {
  variant?: 'primary' | 'ghost';
}
export function Button({ variant = 'primary', children, ...rest }: ButtonProps) {
  return <button className={variant} {...rest}>{children}</button>;
}
```

- Prefer plain functions with typed props over `React.FC` (which historically added implicit `children` and makes generics awkward).
- Children: `React.ReactNode` (anything renderable) for most slots; `React.ReactElement` when you need an element (e.g. to `cloneElement`); `JSX.Element` is what a component returns.
- `React.PropsWithChildren<P>` adds `children?: ReactNode`.

### 5.2 Hooks

```tsx
const [user, setUser] = useState<User | null>(null);      // explicit when the initial value is narrower
const inputRef = useRef<HTMLInputElement>(null);          // DOM ref (RefObject)
const timer = useRef<number | undefined>(undefined);      // mutable box
const ThemeContext = createContext<Theme | undefined>(undefined);
function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
```

Generic custom hooks keep call sites typed: `function useFetch<T>(url: string): { data?: T; error?: Error }`.

### 5.3 Events

| Event | Type |
|---|---|
| click | `React.MouseEvent<HTMLButtonElement>` |
| input change | `React.ChangeEvent<HTMLInputElement>` |
| form submit | `React.FormEvent<HTMLFormElement>` |
| key press | `React.KeyboardEvent<HTMLElement>` |
| handler prop | `React.ChangeEventHandler<HTMLInputElement>` |

### 5.4 Refs, forwardRef and useImperativeHandle

```tsx
export interface VideoHandle { play(): void; pause(): void }

export const Video = forwardRef<VideoHandle, { src: string }>(function Video({ src }, ref) {
  const el = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => ({
    play: () => el.current?.play(),
    pause: () => el.current?.pause(),
  }), []);
  return <video ref={el} src={src} />;
});
// In React 19, function components can accept `ref` as a regular prop; forwardRef still works.
```

`RefObject<T>` is what `useRef<T>(null)` returns for DOM refs; a ref you assign yourself (`useRef<number>()`) is a mutable ref whose `.current` you own.

### 5.5 Generic components

```tsx
interface ListProps<T> { items: T[]; render: (item: T) => React.ReactNode; getKey: (item: T) => string }
export function List<T>({ items, render, getKey }: ListProps<T>) {
  return <ul>{items.map((i) => <li key={getKey(i)}>{render(i)}</li>)}</ul>;
}
```

---

## 6. tsconfig settings worth knowing

`strict: true` (always), `noUncheckedIndexedAccess` (array/record access may be undefined), `exactOptionalPropertyTypes`, `verbatimModuleSyntax` (explicit `import type`), `moduleResolution: "bundler"` for Vite/Next projects, and `skipLibCheck` to speed up builds.
