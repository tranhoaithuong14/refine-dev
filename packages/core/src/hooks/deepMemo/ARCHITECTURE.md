# Kiến trúc và Design Patterns của useDeepMemo Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          UTILITY HOOKS (INTERNAL)                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useDeepMemo ✅ (THIS HOOK - UTILITY!)            │  │
│  │    → Memoize with deep equality                  │  │
│  │         │                                         │  │
│  │         ├──→ PREVENTS:                           │  │
│  │         │     - Unnecessary re-renders            │  │
│  │         │     - Infinite loops                    │  │
│  │         │     - Wasted computations               │  │
│  │         │                                         │  │
│  │         ├──→ COMPARES:                           │  │
│  │         │     - Objects: { a: 1 } === { a: 1 }   │  │
│  │         │     - Arrays: [1, 2] === [1, 2]        │  │
│  │         │     - Nested: Deep comparison           │  │
│  │         │                                         │  │
│  │         └──→ USED BY:                            │  │
│  │               - Data hooks (useList, useOne...)   │  │
│  │               - Internal utilities                │  │
│  │                                                   │  │
│  │  Built on:                                       │  │
│  │    - useMemoized → Deep equality memoization     │  │
│  │    - React.useMemo → Standard memoization        │  │
│  │                                                   │  │
│  │  Related hooks:                                  │  │
│  │    - useMemoized → Base memoization hook         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Internal utility hook - Memoizes values with deep equality check to prevent unnecessary re-renders and infinite loops**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                USEDEEPMEMO COMPLETE FLOW                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Renders with Dependencies                │
│  const value = useDeepMemo(                                  │
│    () => ({ filters: [...], pagination: {...} }),           │
│    [filters, pagination]  // ← New objects every render!    │
│  );                                                          │
│                                                              │
│  Problem without useDeepMemo:                                │
│  → filters = [{ field: "status", value: "active" }]         │
│  → Next render: new array reference! ❌                      │
│  → useEffect sees different reference                       │
│  → Triggers re-run even though content is same! ❌          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: useMemoized (Deep Equality Check)                  │
│  const memoizedDependencies = useMemoized(dependencies);     │
│                                                              │
│  Internal flow:                                              │
│  1. Get previous deps from ref                              │
│  2. Deep compare: isEqual(prevDeps, currentDeps)            │
│  3. If equal:                                                │
│       → Return previous reference ✅                         │
│  4. If different:                                            │
│       → Update ref with new deps                            │
│       → Return new reference                                │
│                                                              │
│  Example:                                                    │
│  Prev: [{ a: 1, b: 2 }]                                     │
│  Curr: [{ a: 1, b: 2 }]  // ← Different reference!         │
│  isEqual: true → Return prev reference! ✅                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: useMemo (Standard Memoization)                     │
│  const value = useMemo(fn, memoizedDependencies);           │
│                                                              │
│  Because memoizedDependencies has stable reference:         │
│  → useMemo only re-runs when content actually changes       │
│  → Not when reference changes! ✅                           │
│                                                              │
│  Flow:                                                       │
│  1. Check if memoizedDependencies changed (by reference)    │
│  2. If same reference:                                       │
│       → Return cached value ⚡                               │
│  3. If different reference:                                  │
│       → Run fn() and cache result                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Return to Component                                │
│  Component receives:                                         │
│  → Same value object if deps are deeply equal ✅            │
│  → New value object only if deps truly changed ✅           │
│                                                              │
│  Result:                                                     │
│  → Prevents unnecessary re-renders                          │
│  → Avoids infinite loops                                    │
│  → Optimizes performance                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File index.tsx: 18 dòng** - Tiny but powerful utility hook!

---

### 2.1 Memoization Pattern - Cache Expensive Computations

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: Calculator Memory

```
Calculator:

WITHOUT memory (useMemo):
→ Calculate 5 × 10 = 50
→ Calculate 5 × 10 again = 50
→ Calculate 5 × 10 again = 50
→ Wasteful! Same calculation! ❌

WITH memory (useMemo):
→ Calculate 5 × 10 = 50 (save result)
→ Next time 5 × 10 → Return saved 50 ⚡
→ Efficient! No recalculation! ✅

useDeepMemo = Smart calculator with deep comparison!
→ Compares by VALUE, not reference
→ { a: 1 } equals { a: 1 } ✅
```

**Memoization Pattern** = Cache results to avoid recalculation

#### Implementation:

```typescript
// From index.tsx (lines 8-17)

export const useDeepMemo = <T>(
  fn: () => T,
  dependencies: React.DependencyList,
): T => {
  // Step 1: Deep memoize dependencies
  const memoizedDependencies = useMemoized(dependencies);
  // ↑ Returns same reference if deeply equal!

  // Step 2: Standard memoization with stable deps
  const value = useMemo(fn, memoizedDependencies);
  // ↑ Only re-runs when memoizedDependencies changes

  return value;
};
```

#### Standard useMemo Problem:

```typescript
// PROBLEM with standard useMemo:
function Component() {
  const filters = [{ field: "status", operator: "eq", value: "active" }];
  // ↑ New array every render! ❌

  const result = useMemo(() => {
    return expensiveComputation(filters);
  }, [filters]); // ← filters is new reference every render!
  // → useMemo re-runs every render! ❌
  // → No optimization! ❌

  return <div>{result}</div>;
}
```

#### useDeepMemo Solution:

```typescript
// SOLUTION with useDeepMemo:
function Component() {
  const filters = [{ field: "status", operator: "eq", value: "active" }];
  // ↑ Still new array every render

  const result = useDeepMemo(() => {
    return expensiveComputation(filters);
  }, [filters]); // ← Deep comparison! ✅
  // → useDeepMemo checks VALUES, not references
  // → Only re-runs when content changes! ✅
  // → Optimized! ✅

  return <div>{result}</div>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Prevents Infinite Loops** - Dependencies stable by value
- ✅ **Optimizes Performance** - Avoids unnecessary computations
- ✅ **Works with Objects/Arrays** - Deep comparison
- ✅ **Transparent** - Drop-in replacement for useMemo

---

### 2.2 Composition Pattern - Building Blocks

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: LEGO Blocks

```
LEGO Building:

Simple blocks:
→ useMemo: Basic memoization
→ useMemoized: Deep equality check

Complex structure:
→ useDeepMemo = useMemoized + useMemo ✅
→ Combine two blocks to make better tool!

Composition Pattern = Combine simple pieces!
```

**Composition Pattern** = Build complex from simple pieces

#### Implementation:

```typescript
// useDeepMemo is composed from TWO hooks:

// 1. useMemoized (Deep equality)
const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};

// 2. React.useMemo (Standard memoization)
const useMemo = <T>(fn: () => T, deps: DependencyList): T => {
  // React's built-in memoization
};

// 3. useDeepMemo (Composition!)
const useDeepMemo = <T>(fn: () => T, dependencies: DependencyList): T => {
  const memoizedDependencies = useMemoized(dependencies); // ← Hook 1
  const value = useMemo(fn, memoizedDependencies); // ← Hook 2
  return value;
};
// ↑ Combines both to create powerful utility! ✅
```

#### Why Composition?

```typescript
// ALTERNATIVE 1: All-in-one (bad)
function useDeepMemo(fn, deps) {
  const ref = useRef(deps);

  if (!isEqual(ref.current, deps)) {
    ref.current = deps;
  }

  const memoizedDeps = ref.current;

  const valueRef = useRef();
  const prevDeps = useRef();

  if (!shallowEqual(prevDeps.current, memoizedDeps)) {
    valueRef.current = fn();
    prevDeps.current = memoizedDeps;
  }

  return valueRef.current;
}
// ↑ Complex! Hard to understand! ❌
// ↑ Duplicates React's useMemo logic! ❌

// ALTERNATIVE 2: Composition (good) ✅
function useDeepMemo(fn, deps) {
  const memoizedDependencies = useMemoized(deps); // ← Reusable!
  const value = useMemo(fn, memoizedDependencies); // ← Built-in!
  return value;
}
// ↑ Simple! Easy to understand! ✅
// ↑ Reuses existing logic! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - Small, focused pieces
- ✅ **Reusability** - useMemoized can be used alone
- ✅ **Maintainability** - Easy to understand
- ✅ **Testability** - Test each piece separately

---

### 2.3 Reference Equality Pattern - Stable References

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Person Identity

```
Identifying a Person:

REFERENCE equality (===):
→ "Are you the SAME person I met yesterday?"
→ "Do you live at the SAME address?"
→ Checks identity, not appearance
→ JavaScript: obj1 === obj2 (same memory address)

VALUE equality (deep equal):
→ "Do you have the SAME name, age, height?"
→ "Do you look identical?"
→ Checks content, not identity
→ JavaScript: isEqual(obj1, obj2) (same content)

useDeepMemo:
→ Converts value equality to reference equality! ✅
→ Same content → Same reference!
```

**Reference Equality Pattern** = Maintain same reference for equal values

#### Implementation:

```typescript
// useMemoized maintains reference equality:

const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);
  // ↑ Stores previous value

  if (!isEqual(ref.current, value)) {
    // ↑ Deep comparison (value equality)
    ref.current = value;
    // ↑ Update only if values different
  }

  return ref.current;
  // ↑ Returns SAME reference if values equal! ✅
};

// Example:
const obj1 = { a: 1, b: 2 };
const obj2 = { a: 1, b: 2 }; // Different reference!

console.log(obj1 === obj2); // false (reference inequality)
console.log(isEqual(obj1, obj2)); // true (value equality)

const memoized1 = useMemoized(obj1);
const memoized2 = useMemoized(obj2);

console.log(memoized1 === memoized2); // true! ✅
// ↑ Same reference returned because values are equal!
```

#### Real Example - Prevent Infinite Loop:

```tsx
function PostList() {
  const [status, setStatus] = useState("active");

  // WITHOUT useDeepMemo (infinite loop!) ❌
  const filters = [{ field: "status", operator: "eq", value: status }];
  // ↑ New array every render!

  useEffect(() => {
    fetchPosts(filters);
  }, [filters]); // ← Triggers every render! ❌
  // → Infinite loop! ❌

  // WITH useDeepMemo (works!) ✅
  const memoizedFilters = useDeepMemo(
    () => [{ field: "status", operator: "eq", value: status }],
    [status],
  );
  // ↑ Same reference until status changes!

  useEffect(() => {
    fetchPosts(memoizedFilters);
  }, [memoizedFilters]); // ← Only triggers when status changes! ✅
  // → No infinite loop! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Prevents Infinite Loops** - Stable references
- ✅ **Optimizes useEffect** - Fewer re-runs
- ✅ **Works with React** - Reference-based dependency tracking
- ✅ **Predictable** - Same content = Same reference

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                | Ví dụ đời thường  | Giải quyết vấn đề gì              | Trong useDeepMemo             |
| ---------------------- | ----------------- | --------------------------------- | ----------------------------- |
| **Memoization**        | Calculator memory | Cache expensive computations      | Avoid recalculating values    |
| **Composition**        | LEGO blocks       | Build complex from simple         | Combine useMemoized + useMemo |
| **Reference Equality** | Person identity   | Stable references for same values | Same content = Same reference |

---

## 3. KEY FEATURES

### 3.1 Deep Equality Comparison

```typescript
// Compares by VALUE, not reference:

const filters1 = [{ field: "status", value: "active" }];
const filters2 = [{ field: "status", value: "active" }];

console.log(filters1 === filters2); // false (different references)

const memoized1 = useDeepMemo(() => filters1, [filters1]);
const memoized2 = useDeepMemo(() => filters2, [filters2]);

console.log(memoized1 === memoized2); // true! ✅
// ↑ Same reference because values are deeply equal!
```

### 3.2 Works with Nested Objects

```typescript
const value = useDeepMemo(
  () => ({
    filters: [{ field: "status", operator: "eq", value: "active" }],
    pagination: {
      current: 1,
      pageSize: 10,
    },
    meta: {
      foo: "bar",
    },
  }),
  [filters, pagination, meta],
);

// Deep comparison works at ALL levels! ✅
```

### 3.3 Prevents Infinite Loops

```typescript
function Component() {
  const config = { timeout: 5000 };
  // ↑ New object every render!

  const api = useDeepMemo(() => createAPI(config), [config]);
  // ↑ Same API instance until config changes!

  useEffect(() => {
    api.connect();
  }, [api]); // ← Stable reference! No infinite loop! ✅
}
```

---

## 4. COMMON USE CASES

### 4.1 Memoizing Filter/Sort Options

```tsx
function PostList() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");

  const filters = useDeepMemo(
    () => [
      { field: "title", operator: "contains", value: search },
      { field: "status", operator: "eq", value: status },
    ],
    [search, status],
  );

  const { data } = useList({
    resource: "posts",
    filters, // ← Stable reference! ✅
  });
}
```

### 4.2 Preventing useEffect Re-runs

```tsx
function DataSync() {
  const [userId, setUserId] = useState(1);

  const syncConfig = useDeepMemo(
    () => ({
      userId,
      endpoints: ["posts", "comments"],
      options: { realtime: true },
    }),
    [userId],
  );

  useEffect(() => {
    // Only runs when userId changes, not on every render!
    syncData(syncConfig);
  }, [syncConfig]);
}
```

### 4.3 Memoizing Complex Calculations

```tsx
function Dashboard() {
  const [dateRange, setDateRange] = useState({
    start: "2024-01-01",
    end: "2024-12-31",
  });

  const chartConfig = useDeepMemo(
    () => ({
      type: "line",
      data: processData(dateRange),
      options: {
        scales: { x: { type: "time" } },
      },
    }),
    [dateRange],
  );

  return <Chart config={chartConfig} />;
  // ↑ Chart only re-renders when dateRange changes! ✅
}
```

### 4.4 Optimizing Context Values

```tsx
function AppProvider({ children }) {
  const [theme, setTheme] = useState("light");
  const [locale, setLocale] = useState("en");

  const contextValue = useDeepMemo(
    () => ({
      theme,
      locale,
      setTheme,
      setLocale,
    }),
    [theme, locale],
  );

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
  // ↑ Context consumers only re-render when theme/locale changes! ✅
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Not Just Use useMemo?

**Answer:** useMemo uses shallow (reference) equality

```typescript
// Problem with useMemo:
const filters = [{ field: "status", value: "active" }];

const result = useMemo(() => {
  return computeResult(filters);
}, [filters]); // ← New array reference every render!
// → useMemo re-runs every render! ❌

// Solution with useDeepMemo:
const result = useDeepMemo(() => {
  return computeResult(filters);
}, [filters]); // ← Deep comparison! ✅
// → Only re-runs when content changes! ✅
```

### 5.2 Why Use lodash.isEqual?

**Answer:** Robust deep equality implementation

```typescript
// Manual deep equal (incomplete):
function isEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  // ... what about:
  // - Nested objects?
  // - Arrays?
  // - Dates?
  // - RegExp?
  // - Circular references?
  // - Symbol properties?
  // Too complex! ❌
}

// lodash.isEqual (complete):
import isEqual from "lodash/isEqual";
// ✅ Handles all edge cases
// ✅ Battle-tested
// ✅ Performance optimized
```

### 5.3 Why Internal Hook?

**Answer:** Implementation detail, not public API

```typescript
// useDeepMemo is marked @internal:
/**
 * Hook that memoizes the given dependency array...
 * @internal
 */

// Reasons:
// 1. Implementation detail ✅
// 2. May change in future ✅
// 3. Advanced users only ✅
// 4. Could be replaced with React.useMemo with deep deps in future ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Overusing useDeepMemo

```typescript
// ❌ WRONG - Unnecessary for primitives
const count = useDeepMemo(() => 42, [42]);
// Use regular useMemo or just constant! ❌

// ❌ WRONG - Unnecessary for stable objects
const config = useMemo(() => ({ timeout: 5000 }), []);
// Already stable! No need for deep memo! ❌

// ✅ CORRECT - Only for objects/arrays that recreate
const filters = useDeepMemo(
  () => [{ field: "status", value: status }],
  [status],
);
```

### 6.2 Not Including All Dependencies

```typescript
// ❌ WRONG
const [search, setSearch] = useState("");
const [status, setStatus] = useState("active");

const filters = useDeepMemo(
  () => [
    { field: "title", value: search },
    { field: "status", value: status },
  ],
  [search], // ← Missing status! ❌
);

// ✅ CORRECT
const filters = useDeepMemo(
  () => [
    { field: "title", value: search },
    { field: "status", value: status },
  ],
  [search, status], // ← All dependencies! ✅
);
```

### 6.3 Using for Large Objects

```typescript
// ⚠️ WARNING - Deep comparison is expensive!
const hugeObject = useDeepMemo(
  () => ({
    data: Array(10000).fill({ nested: { deep: { object: {} } } }),
  }),
  [someValue],
);
// → Deep comparison of 10,000 nested objects! ⏳
// → Performance hit! ❌

// ✅ BETTER - Break into smaller pieces
const smallPiece = useDeepMemo(() => ({ value: someValue }), [someValue]);
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Deep Comparison Cost

```
Small objects (< 10 properties):
- Deep comparison: ~0.01ms ✅
- Negligible overhead ✅

Medium objects (10-100 properties):
- Deep comparison: ~0.1ms ⚠️
- Acceptable overhead ✅

Large objects (> 1000 properties):
- Deep comparison: ~10ms+ ❌
- Significant overhead ❌
- Consider splitting or restructuring!
```

### 7.2 When to Use

```
✅ USE when:
- Dependencies are objects/arrays
- Dependencies recreate every render
- Need stable references for useEffect/useMemo
- Object is small-medium size

❌ AVOID when:
- Dependencies are primitives
- Dependencies already stable
- Object is very large
- Deep comparison is expensive
```

---

## 8. TESTING

```typescript
// From index.spec.tsx

describe("useDeepMemo Hook", () => {
  it("should return the same instance when new dependency is deep equal", () => {
    const initialValue = { value: 5 };
    const { result, rerender } = renderHook(
      (value) => useDeepMemo(() => value, [value]),
      { initialProps: initialValue },
    );

    expect(result.current).toBe(initialValue);

    const newButSameValue = { value: 5 }; // ← Different reference!

    rerender(newButSameValue);

    expect(result.current).toBe(initialValue); // ← Same reference! ✅
    expect(result.current).not.toBe(newButSameValue);
  });

  it("should return new value when dependency is not deep equal", () => {
    const initialValue = { value: 5 };
    const { result, rerender } = renderHook(
      (value) => useDeepMemo(() => value, [value]),
      { initialProps: initialValue },
    );

    const newValue = { value: 6 }; // ← Different content!

    rerender(newValue);

    expect(result.current).not.toBe(initialValue); // ← Different reference! ✅
    expect(result.current).toBe(newValue);
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Memoization**: Cache expensive computations
- ✅ **Composition**: Build from useMemoized + useMemo
- ✅ **Reference Equality**: Stable references for equal values

### Key Features

1. **Deep Equality** - Compares by value, not reference
2. **Prevents Infinite Loops** - Stable dependencies
3. **Optimizes Performance** - Avoids unnecessary re-runs
4. **Works with Complex Objects** - Nested comparison

### Khi nào dùng useDeepMemo?

✅ **Nên dùng:**

- Dependencies are objects/arrays
- Need stable references
- Prevent useEffect infinite loops
- Optimize component re-renders

❌ **Không dùng:**

- Dependencies are primitives
- Dependencies already stable
- Very large objects (expensive comparison)
- Public API (use internal only)

### Remember

✅ **18 lines** - Tiny but powerful
🧠 **Memoization** - Cache by value
🏗️ **Composition** - Built from simple pieces
🎯 **Reference Equality** - Same value = Same reference
⚠️ **Internal** - Implementation detail

---

> 📚 **Best Practice**: Only use **useDeepMemo** for objects/arrays that recreate every render. Always **include all dependencies**. Avoid for **very large objects**. Use for **preventing infinite loops** in useEffect. This is an **internal hook** - not part of public API!
