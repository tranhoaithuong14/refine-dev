# Kiến trúc và Design Patterns của useDeepMemo Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │             PERFORMANCE UTILITIES                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  React.useMemo → Shallow comparison (Default)    │  │
│  │    - Checks: prev === next                        │  │
│  │    - Fast but fails for new object references     │  │
│  │                                                   │  │
│  │  useDeepMemo ✅ (THIS HOOK)                      │  │
│  │    → Deep comparison (Value equality)            │  │
│  │         │                                         │  │
│  │         ├──→ CHECKS VALUES, NOT REFERENCES:      │  │
│  │         │     - { a: 1 } === { a: 1 } → TRUE ✅   │  │
│  │         │     - Prevents unnecessary re-renders   │  │
│  │         │                                         │  │
│  │         └──→ POWERED BY useMemoized:             │  │
│  │               - Stabilizes dependency arrays      │  │
│  │               - Uses lodash/isEqual               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Memoize values based on DEEP EQUALITY instead of referential equality.**

### 1.2 The Problem: Referential Integrity

```javascript
// React Default Behavior (Shallow Compare)

const obj1 = { id: 1 };
const obj2 = { id: 1 };

console.log(obj1 === obj2); // FALSE ❌
// Even though content is same, references are different!

// In React Component:
function Component() {
  const config = { theme: "dark" }; // New reference every render!

  useEffect(() => {
    // Runs EVERY render because config is "new" every time
  }, [config]);
}
```

### 1.3 The Solution: Deep Equality

```javascript
// useDeepMemo Behavior

const config = useDeepMemo(() => ({ theme: "dark" }), []);

// Render 1: Returns { theme: "dark" } (Ref A)
// Render 2: Returns { theme: "dark" } (Ref A) ✅

// Reference stays the SAME if content is the SAME!
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useDeepMemo/index.tsx & useMemoized/index.tsx**

---

### 2.1 Value Object Pattern - Identity by Value

#### 🆔 VÍ DỤ ĐỜI THƯỜNG: ID Card vs. DNA

```
Identity Check:

Shallow Compare (ID Card):
- Person A holds ID #123
- Person B holds ID #456
- Are they the same? NO ❌ (Different IDs)
- Even if they look exactly alike (Twins)!

Deep Compare (DNA Test):
- Person A (Twin 1)
- Person B (Twin 2)
- Are they the same? YES ✅ (Same DNA/Content)

useDeepMemo:
- Checks the "DNA" (content) of the object
- Ignores the "ID Card" (memory reference)
```

**Value Object Pattern** = Two objects are equal if their values are equal.

#### Implementation (`useMemoized`):

```typescript
// hooks/memoized/index.tsx

export const useMemoized = <T = unknown>(value: T): T => {
  const ref = useRef(value);

  // Compare current value with stored value using DEEP equality
  if (!isEqual(ref.current, value)) {
    ref.current = value; // Only update ref if content changed
  }

  return ref.current; // Always return the stable ref
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Stability** - Objects behave like primitives (string, number)
- ✅ **Performance** - Prevents effect loops and re-renders
- ✅ **DX** - Developers don't need to manually `JSON.stringify` or check fields

---

### 2.2 Proxy/Wrapper Pattern - Enhancing Standard Hooks

#### 🎁 VÍ DỤ ĐỜI THƯỜNG: Smart Adapter

```
Standard Outlet (useMemo):
- Plug in device
- Power flows

Smart Adapter (useDeepMemo):
- Plug in device
- Adapter checks: "Is this device fully charged?"
- If yes: Stop power
- If no: Let power flow

useDeepMemo wraps useMemo:
- Intercepts dependencies
- Stabilizes them using deep comparison
- Passes stable dependencies to real useMemo
```

**Wrapper Pattern** = Wrap existing functionality to add new behavior.

#### Implementation (`useDeepMemo`):

```typescript
export const useDeepMemo = <T>(
  fn: () => T,
  dependencies: React.DependencyList,
): T => {
  // 1. Stabilize dependencies
  // If dependencies = [{a:1}], it returns the SAME array reference
  // as long as {a:1} content doesn't change.
  const memoizedDependencies = useMemoized(dependencies);

  // 2. Pass stable dependencies to standard useMemo
  // React's useMemo sees the SAME reference, so it doesn't re-run!
  const value = useMemo(fn, memoizedDependencies);

  return value;
};
```

---

## 3. KEY FEATURES

### 3.1 `useMemoized` - The Core Engine

Hook `useMemoized` là "bộ não" phía sau. Nó đảm bảo rằng nếu bạn truyền vào một object mới nhưng có nội dung cũ, nó sẽ trả về object cũ (reference cũ).

```typescript
const a = { id: 1 };
const b = { id: 1 };

// Normal
a === b; // False

// useMemoized
const memoA = useMemoized(a);
const memoB = useMemoized(b);
memoA === memoB; // True! ✅ (Returns ref to 'a' both times)
```

### 3.2 Dependency Stabilization

`useDeepMemo` dùng `useMemoized` lên chính mảng `dependencies`.

```typescript
useDeepMemo(
  () => calculateExpensiveValue(config),
  [config], // config is an object { mode: "dark" }
);

// Flow:
// 1. [config] (New Ref) passed to useMemoized
// 2. useMemoized compares with prev [config] using isEqual
// 3. Content matches? Return Prev Ref
// 4. useMemo receives Prev Ref
// 5. useMemo sees dependencies haven't changed -> Returns cached value
```

---

## 4. COMMON USE CASES

### 4.1 Complex Configuration Objects

```tsx
function Chart({ options }) {
  // options = { colors: ["red", "blue"], axes: { x: true } }
  // options is created fresh every parent render

  // ❌ Standard useMemo: Re-runs every time because options is new ref
  // const processed = useMemo(() => heavyProcess(options), [options]);

  // ✅ useDeepMemo: Only runs if content changes
  const processed = useDeepMemo(() => heavyProcess(options), [options]);

  return <Draw data={processed} />;
}
```

### 4.2 Preventing Effect Loops

```tsx
function DataFetcher({ filter }) {
  // filter = { status: "active" }

  useEffect(() => {
    api.fetch(filter);
  }, [filter]); // ❌ Infinite loop if parent creates filter inline!

  // Solution with useDeepMemo (or useMemoized on filter):
  const stableFilter = useDeepMemo(() => filter, [filter]);

  useEffect(() => {
    api.fetch(stableFilter);
  }, [stableFilter]); // ✅ Safe!
}
```

---

## 5. PERFORMANCE CONSIDERATIONS

### ⚠️ Cost of Deep Comparison

**Deep comparison is NOT free.** It has to traverse the entire object tree.

```javascript
// Cheap
{ id: 1 } === { id: 1 }

// Expensive
{
  data: [ ...10000 items... ],
  meta: { ...nested... }
}
```

**When NOT to use:**

1. **Simple Primitives**: `useMemo(() => x * 2, [x])` (x is number). Standard `useMemo` is faster.
2. **Huge Objects**: If the object is massive, `isEqual` might be slower than just re-running the function.
3. **Functions**: `isEqual` cannot compare functions reliably.

**Best Practice:** Use only for **small to medium sized objects** where referential instability is causing performance issues (re-renders).

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Value Object**: Equality based on content, not reference.
- ✅ **Wrapper**: Enhancing `useMemo` with custom comparison logic.
- ✅ **Memoization**: Caching results to avoid re-computation.

### Remember

✅ **18 lines of code** - Powerful utility.
✅ **Powered by Lodash** - Uses `isEqual` for robust comparison.
✅ **Stabilizes Dependencies** - The key to preventing unnecessary React updates.
