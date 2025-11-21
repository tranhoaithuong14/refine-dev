# useMemoized Hook - Kiến trúc và Thiết kế

## 1. Vai trò trong hệ thống

`useMemoized` là một **Primitive Memoization Hook** cực kỳ quan trọng trong Refine architecture. Đây là building block foundation cho deep equality memoization - giải quyết một trong những vấn đề phổ biến nhất trong React: **unnecessary re-renders do to referential inequality của objects/arrays**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT RE-RENDER PROBLEM                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Component Re-renders                                            │
│       ↓                                                          │
│  Creates new object: { id: 1, name: "Alice" }                   │
│       ↓                                                          │
│  {} === {} → FALSE ❌ (different reference)                      │
│       ↓                                                          │
│  Child component sees "different" prop                           │
│       ↓                                                          │
│  Child re-renders unnecessarily 💸                               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SOLUTION: useMemoized                                    │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  const memoized = useMemoized(value);              │  │   │
│  │  │                                                     │  │   │
│  │  │  if (isEqual(ref.current, value)) {                │  │   │
│  │  │    return ref.current; ← Same reference! ✅         │  │   │
│  │  │  } else {                                          │  │   │
│  │  │    ref.current = value; ← Update only if changed  │  │   │
│  │  │    return value;                                   │  │   │
│  │  │  }                                                  │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘

ARCHITECTURE HIERARCHY:
┌─────────────────────────────────────────────┐
│  Application Code (Components)              │
│  ┌───────────────────────────────────────┐  │
│  │ <ExpensiveChild data={memoizedData} />│  │
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│                  ▼                           │
│  ┌───────────────────────────────────────┐  │
│  │  useDeepMemo (High-level)             │  │ ← User-facing
│  │  - Factory function + deps            │  │
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│                  ▼                           │
│  ┌───────────────────────────────────────┐  │
│  │  useMemoized (Primitive) ◄────────────┼──┼── WE ARE HERE
│  │  - Deep equality check                │  │
│  │  - Ref-based caching                  │  │ ← Foundation
│  └───────────────┬───────────────────────┘  │
│                  │                           │
│                  ▼                           │
│  ┌───────────────────────────────────────┐  │
│  │  lodash.isEqual                       │  │ ← Low-level utility
│  │  - Deep comparison algorithm          │  │
│  └───────────────────────────────────────┘  │
│                                              │
└──────────────────────────────────────────────┘

FLOW VISUALIZATION:
┌─────────────────────────────────────────────────────────┐
│  Render 1:                                              │
│  value = { id: 1, name: "Alice" }  (ref: 0x001)        │
│       ↓                                                 │
│  useMemoized(value)                                     │
│       ↓                                                 │
│  ref.current = undefined (first time)                   │
│       ↓                                                 │
│  ref.current = value (store)                            │
│       ↓                                                 │
│  return value (ref: 0x001)                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Render 2:                                              │
│  value = { id: 1, name: "Alice" }  (ref: 0x002) ← NEW! │
│       ↓                                                 │
│  useMemoized(value)                                     │
│       ↓                                                 │
│  isEqual(ref.current, value)                            │
│  isEqual({ id: 1, name: "Alice" }, { id: 1, ... })     │
│       ↓                                                 │
│  TRUE ✅ (content equal)                                │
│       ↓                                                 │
│  return ref.current (ref: 0x001) ← OLD reference!       │
│  ↓                                                      │
│  Result: Child component receives SAME reference        │
│         → No re-render! 🎉                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Render 3:                                              │
│  value = { id: 2, name: "Bob" }  (ref: 0x003)          │
│       ↓                                                 │
│  useMemoized(value)                                     │
│       ↓                                                 │
│  isEqual(ref.current, value)                            │
│  isEqual({ id: 1, ... }, { id: 2, ... })               │
│       ↓                                                 │
│  FALSE ❌ (content different)                           │
│       ↓                                                 │
│  ref.current = value (update)                           │
│       ↓                                                 │
│  return value (ref: 0x003) ← NEW reference!             │
│  ↓                                                      │
│  Result: Child component receives NEW reference         │
│         → Re-render (expected) ✅                        │
└─────────────────────────────────────────────────────────┘
```

**Ví dụ thực tế:**
Giống như nhận diện khuôn mặt:
- **Reference equality** (===) = So sánh ảnh thẻ (bức ảnh này có phải cùng 1 tờ giấy không?)
- **Deep equality** (isEqual) = Nhận diện khuôn mặt (người trong ảnh có phải cùng 1 người không?)

useMemoized giúp React "nhận diện" rằng object mới thực chất là "cùng một người" (same content), không cần "xử lý lại hồ sơ" (re-render).

## 2. Luồng hoạt động chi tiết

### Flow: First Render (Initialization)

```
STEP 1: Component mounts
────────────────────────────
function MyComponent() {
  const config = { theme: "dark", lang: "en" };
  const memoized = useMemoized(config);
  return <Child config={memoized} />;
}

STEP 2: useMemoized called with initial value
──────────────────────────────────────────────
┌────────────────────────────────────┐
│  useMemoized(config)               │
│  ┌──────────────────────────────┐  │
│  │ Input:                       │  │
│  │ value = { theme: "dark",     │  │
│  │          lang: "en" }        │  │
│  │ (ref: 0x001)                 │  │
│  │                              │  │
│  │ Current State:               │  │
│  │ ref.current = undefined      │  │ ← Empty on first call
│  │                              │  │
│  │ Logic:                       │  │
│  │ if (!isEqual(undefined, value)) │
│  │   → TRUE (undefined ≠ value)│  │
│  │   ref.current = value        │  │ ← Store
│  │                              │  │
│  │ return ref.current           │  │ ← Return stored value
│  └──────────────────────────────┘  │
└────────────────────────────────────┘

STEP 3: Result stored in ref
─────────────────────────────
ref.current = { theme: "dark", lang: "en" } (ref: 0x001)
           ↓
Child receives: { theme: "dark", lang: "en" } (ref: 0x001)
```

### Flow: Second Render (Same Content, Different Reference)

```
STEP 1: Parent re-renders (e.g., state change)
───────────────────────────────────────────────
function MyComponent() {
  const [count, setCount] = useState(0); // ← Changed!

  // ❌ New object created (different reference)
  const config = { theme: "dark", lang: "en" };
  //               └─────────────┬─────────────┘
  //                    (ref: 0x002) ← NEW!

  const memoized = useMemoized(config);
  return <Child config={memoized} />;
}

STEP 2: useMemoized performs deep comparison
──────────────────────────────────────────────
┌────────────────────────────────────────────────┐
│  useMemoized(config)                           │
│  ┌──────────────────────────────────────────┐  │
│  │ Input:                                   │  │
│  │ value = { theme: "dark", lang: "en" }    │  │
│  │ (ref: 0x002) ← NEW reference             │  │
│  │                                          │  │
│  │ Current State:                           │  │
│  │ ref.current = { theme: "dark",           │  │
│  │                lang: "en" }              │  │
│  │ (ref: 0x001) ← OLD reference             │  │
│  │                                          │  │
│  │ Deep Comparison:                         │  │
│  │ isEqual(                                 │  │
│  │   { theme: "dark", lang: "en" },  ← old  │  │
│  │   { theme: "dark", lang: "en" }   ← new  │  │
│  │ )                                        │  │
│  │ ↓                                        │  │
│  │ Compares key by key:                     │  │
│  │ - "theme": "dark" === "dark" ✅          │  │
│  │ - "lang": "en" === "en" ✅               │  │
│  │ ↓                                        │  │
│  │ Result: TRUE ✅ (deep equal)             │  │
│  │                                          │  │
│  │ Action:                                  │  │
│  │ Since equal, DON'T update ref            │  │
│  │ return ref.current (0x001) ← OLD ref!    │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘

STEP 3: Child receives same reference
──────────────────────────────────────
Previous render: Child received ref 0x001
Current render:  Child receives ref 0x001 ← SAME!
                 ↓
React's shallow comparison: 0x001 === 0x001 → TRUE
                 ↓
Result: Child DOESN'T re-render! 🎉
        ↓
Performance win: Avoided expensive re-render
```

### Flow: Third Render (Different Content)

```
STEP 1: User changes theme
───────────────────────────
function MyComponent() {
  // ❌ Content changed!
  const config = { theme: "light", lang: "en" };
  //                       ↑
  //                   Changed!

  const memoized = useMemoized(config);
  return <Child config={memoized} />;
}

STEP 2: useMemoized detects content change
───────────────────────────────────────────
┌────────────────────────────────────────────────┐
│  useMemoized(config)                           │
│  ┌──────────────────────────────────────────┐  │
│  │ Input:                                   │  │
│  │ value = { theme: "light", lang: "en" }   │  │
│  │ (ref: 0x003)                             │  │
│  │                                          │  │
│  │ Current State:                           │  │
│  │ ref.current = { theme: "dark",           │  │
│  │                lang: "en" }              │  │
│  │ (ref: 0x001)                             │  │
│  │                                          │  │
│  │ Deep Comparison:                         │  │
│  │ isEqual(                                 │  │
│  │   { theme: "dark", lang: "en" },   ← old │  │
│  │   { theme: "light", lang: "en" }  ← new  │  │
│  │ )                                        │  │
│  │ ↓                                        │  │
│  │ Compares:                                │  │
│  │ - "theme": "dark" !== "light" ❌         │  │
│  │ ↓                                        │  │
│  │ Result: FALSE ❌ (not equal)             │  │
│  │                                          │  │
│  │ Action:                                  │  │
│  │ ref.current = value (update to new)      │  │
│  │ return value (0x003) ← NEW ref!          │  │
│  └──────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘

STEP 3: Child receives new reference
─────────────────────────────────────
Previous render: Child received ref 0x001
Current render:  Child receives ref 0x003 ← DIFFERENT!
                 ↓
React's shallow comparison: 0x001 !== 0x003 → FALSE
                 ↓
Result: Child DOES re-render ✅ (expected)
        ↓
Correct behavior: Content changed, so re-render needed
```

### Flow: Complex Object with Nested Structure

```
STEP 1: Parent renders with complex object
───────────────────────────────────────────
function MyComponent() {
  const filters = {
    search: "alice",
    status: ["active", "pending"],
    date: {
      from: "2024-01-01",
      to: "2024-12-31"
    }
  };

  const memoized = useMemoized(filters);
  return <FilteredList filters={memoized} />;
}

STEP 2: lodash.isEqual performs RECURSIVE deep comparison
───────────────────────────────────────────────────────────
┌────────────────────────────────────────────────────────┐
│  isEqual(oldFilters, newFilters)                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Level 1: Compare root object                     │  │
│  │ - typeof: "object" === "object" ✅               │  │
│  │ - keys: ["search", "status", "date"] ✅          │  │
│  │                                                  │  │
│  │ Level 2: Compare each property                   │  │
│  │ ┌──────────────────────────────────────────────┐ │  │
│  │ │ "search":                                    │ │  │
│  │ │   "alice" === "alice" ✅                     │ │  │
│  │ └──────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │ ┌──────────────────────────────────────────────┐ │  │
│  │ │ "status": (array - recurse)                  │ │  │
│  │ │   length: 2 === 2 ✅                         │ │  │
│  │ │   [0]: "active" === "active" ✅              │ │  │
│  │ │   [1]: "pending" === "pending" ✅            │ │  │
│  │ └──────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │ ┌──────────────────────────────────────────────┐ │  │
│  │ │ "date": (object - recurse)                   │ │  │
│  │ │   typeof: "object" === "object" ✅           │ │  │
│  │ │   keys: ["from", "to"] ✅                    │ │  │
│  │ │   "from": "2024-01-01" === "2024-01-01" ✅   │ │  │
│  │ │   "to": "2024-12-31" === "2024-12-31" ✅     │ │  │
│  │ └──────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │ Final Result: ALL properties equal → TRUE ✅     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘

STEP 3: Return cached reference
────────────────────────────────
All nested properties equal
→ return ref.current (old reference)
→ FilteredList receives same reference
→ No re-render! 🎉
```

### Flow: React Node (JSX) Memoization

```
STEP 1: Component renders with JSX element
───────────────────────────────────────────
function IconProvider() {
  const icon = <svg><path d="..." /></svg>;
  //            └────────┬────────┘
  //          React.createElement() creates
  //          new object every render!

  const memoized = useMemoized(icon);
  return <Button icon={memoized} />;
}

STEP 2: isEqual compares React element structure
─────────────────────────────────────────────────
┌────────────────────────────────────────────────────┐
│  React Element Structure:                          │
│  {                                                 │
│    type: "svg",                                    │
│    props: {                                        │
│      children: {                                   │
│        type: "path",                               │
│        props: { d: "..." }                         │
│      }                                             │
│    },                                              │
│    key: null,                                      │
│    ref: null                                       │
│  }                                                 │
│                                                    │
│  isEqual compares STRUCTURE:                       │
│  - type: "svg" === "svg" ✅                        │
│  - props.children.type: "path" === "path" ✅       │
│  - props.children.props.d: "..." === "..." ✅      │
│  ↓                                                 │
│  Result: TRUE ✅                                   │
│  → Return cached icon (same reference)             │
│  → Button doesn't re-render! 🎉                    │
└────────────────────────────────────────────────────┘
```

## 3. Design Patterns

### 3.1. Primitive Pattern
Hook là building block đơn giản nhất, không dependencies khác (ngoài lodash).

**Real-world analogy:** Giống như gạch trong xây dựng - đơn giản nhưng là foundation cho mọi cấu trúc phức tạp.

```typescript
// Primitive (useMemoized) - Simple, focused
export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};

// Composite (useDeepMemo) - Built on primitive
export const useDeepMemo = <T>(
  fn: () => T,
  dependencies: React.DependencyList
): T => {
  const memoizedDeps = useMemoized(dependencies); // ← Uses primitive
  return useMemo(fn, memoizedDeps);
};

// Why primitive pattern?
// ✅ Single responsibility (only memoize value)
// ✅ Reusable in different contexts
// ✅ Easy to test
// ✅ Easy to understand
// ✅ Can be composed into higher-level hooks
```

### 3.2. Ref Pattern - State Without Re-renders
Hook dùng useRef thay vì useState để store value mà KHÔNG trigger re-render.

**Real-world analogy:** Giống như notepad bên cạnh - bạn ghi chú (update ref) nhưng không cần thông báo cho cả văn phòng (trigger re-render).

```typescript
// ❌ Wrong approach - using useState (causes re-renders)
export const useMemoizedWrong = <T>(value: T): T => {
  const [cached, setCached] = useState(value);

  if (!isEqual(cached, value)) {
    setCached(value); // ← Triggers re-render! ❌
  }

  return cached;
};

// Problem:
// 1. Component renders
// 2. useMemoizedWrong checks equality
// 3. If different, calls setCached
// 4. setCached triggers NEW render! ❌
// 5. Infinite loop or double-render

// ✅ Correct approach - using useRef (no re-renders)
export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isEqual(ref.current, value)) {
    ref.current = value; // ← NO re-render! ✅
  }

  return ref.current;
};

// Why useRef?
// ✅ Mutates ref.current directly (no re-render)
// ✅ Persists across renders
// ✅ Synchronous update (immediate)
// ✅ No render loop issues
```

### 3.3. Lazy Evaluation Pattern
Hook chỉ update ref khi THỰC SỰ khác nhau (deep equality check).

**Real-world analogy:** Giống như so sánh file trước khi copy - nếu file giống hệt nhau, không cần copy (save time + space).

```typescript
// Lazy evaluation implementation
export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  // ✅ Check FIRST before updating
  if (!isEqual(ref.current, value)) {
    // Only execute if different
    ref.current = value; // ← Lazy update
  }

  return ref.current;
};

// Why lazy?
// 1. Avoid unnecessary memory writes
// 2. Preserve reference stability
// 3. Optimization for React reconciliation

// Comparison with eager approach:
// ❌ Eager (always update):
ref.current = value;
return ref.current;
// → Always new reference
// → Child always re-renders

// ✅ Lazy (conditional update):
if (!isEqual(ref.current, value)) {
  ref.current = value;
}
return ref.current;
// → Same reference if equal
// → Child doesn't re-render
```

### 3.4. Deep Equality Pattern
Hook sử dụng deep comparison thay vì shallow/reference comparison.

**Real-world analogy:** Giống như so sánh nội dung 2 cuốn sách thay vì chỉ nhìn bìa. Hai cuốn sách khác nhau (reference) nhưng nội dung giống hệt → coi là "giống nhau".

```typescript
// Comparison of equality strategies:

// Strategy 1: Reference equality (===)
// ❌ Too strict - new objects always "different"
const obj1 = { id: 1 };
const obj2 = { id: 1 };
obj1 === obj2 // → false ❌
// Problem: Same content but different reference

// Strategy 2: Shallow equality (React.memo)
// ⚠️ Works for primitives, fails for nested objects
const config1 = { user: { id: 1 } };
const config2 = { user: { id: 1 } };
shallowEqual(config1, config2) // → false ❌
// Problem: Nested objects not deeply compared

// Strategy 3: Deep equality (lodash.isEqual)
// ✅ Compares all nested levels
import isEqual from "lodash/isEqual";

const config1 = { user: { id: 1, settings: { theme: "dark" } } };
const config2 = { user: { id: 1, settings: { theme: "dark" } } };
isEqual(config1, config2) // → true ✅
// Success: Recursively compares all levels

// useMemoized uses Strategy 3
export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  // ✅ Deep equality check
  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};
```

**Deep Equality Algorithm (simplified):**
```typescript
// How isEqual works internally (simplified):
function isEqual(a: any, b: any): boolean {
  // 1. Same reference → equal
  if (a === b) return true;

  // 2. Different types → not equal
  if (typeof a !== typeof b) return false;

  // 3. Primitives → use ===
  if (typeof a !== "object") return a === b;

  // 4. null check
  if (a === null || b === null) return a === b;

  // 5. Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false; // ← Recursive
    }
    return true;
  }

  // 6. Objects
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!isEqual(a[key], b[key])) return false; // ← Recursive
  }

  return true;
}
```

### 3.5. Immutable Reference Pattern
Hook guarantees reference stability khi content không đổi.

**Real-world analogy:** Giống như số CMND - dù bạn in ra bao nhiêu bản copy, số CMND vẫn là duy nhất và identify bạn.

```typescript
// Immutable Reference Guarantee
function MyComponent() {
  const config = { theme: "dark" };
  const memoized = useMemoized(config);

  // ✅ Guarantee: If content same, reference same
  // render 1: memoized → ref A
  // render 2: memoized → ref A (same!)
  // render 3: memoized → ref A (same!)

  return <Child config={memoized} />;
}

// Child component benefits from reference stability:
const Child = React.memo(({ config }) => {
  // ✅ Only re-renders when config REFERENCE changes
  // ✅ useMemoized keeps reference stable → no re-render

  useEffect(() => {
    console.log("Config changed!");
  }, [config]); // ← Stable reference = effect won't run

  return <div>{config.theme}</div>;
});

// Why important?
// 1. React.memo optimization works
// 2. useEffect deps stable
// 3. useMemo/useCallback deps stable
// 4. PureComponent optimization works
// 5. Context consumers don't re-render
```

## 4. Các tính năng chính

### 4.1. Deep Equality Checking

```typescript
const memoized = useMemoized(value);

// ✅ Handles primitives
useMemoized(42);
useMemoized("hello");
useMemoized(true);

// ✅ Handles arrays
useMemoized([1, 2, 3]);
useMemoized(["a", "b", "c"]);

// ✅ Handles objects
useMemoized({ id: 1, name: "Alice" });

// ✅ Handles nested structures
useMemoized({
  user: {
    id: 1,
    profile: {
      settings: {
        theme: "dark"
      }
    }
  }
});

// ✅ Handles React nodes
useMemoized(<div>Hello</div>);

// ✅ Handles arrays of objects
useMemoized([
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" }
]);

// ✅ Handles mixed types
useMemoized({
  count: 42,
  items: [1, 2, 3],
  user: { id: 1 },
  active: true,
  icon: <Icon />
});
```

### 4.2. Reference Stability

```typescript
function MyComponent() {
  const [count, setCount] = useState(0);

  // ❌ Without useMemoized - new reference every render
  const config = { theme: "dark" };
  // render 1: config → 0x001
  // render 2: config → 0x002 (new!)
  // render 3: config → 0x003 (new!)

  // ✅ With useMemoized - stable reference
  const memoizedConfig = useMemoized(config);
  // render 1: memoizedConfig → 0x001
  // render 2: memoizedConfig → 0x001 (same!)
  // render 3: memoizedConfig → 0x001 (same!)

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
      <ExpensiveChild config={memoizedConfig} />
    </div>
  );
}

// Result: ExpensiveChild only renders once!
```

### 4.3. Works with React.memo

```typescript
// Child component wrapped with React.memo
const ExpensiveChild = React.memo(({ data }) => {
  console.log("Child rendered!");

  // Expensive computation
  const result = expensiveOperation(data);

  return <div>{result}</div>;
});

// Parent component
function Parent() {
  const [unrelatedState, setUnrelatedState] = useState(0);

  // Without useMemoized:
  const data = { id: 1, value: 100 };
  // → ExpensiveChild re-renders on every parent render ❌

  // With useMemoized:
  const memoizedData = useMemoized({ id: 1, value: 100 });
  // → ExpensiveChild only renders when data content changes ✅

  return (
    <div>
      <button onClick={() => setUnrelatedState(s => s + 1)}>
        Unrelated: {unrelatedState}
      </button>
      <ExpensiveChild data={memoizedData} />
    </div>
  );
}

// Result:
// - Click button → parent re-renders
// - memoizedData keeps same reference
// - React.memo sees same reference
// - ExpensiveChild doesn't re-render! 🎉
```

### 4.4. Stable useEffect Dependencies

```typescript
function MyComponent({ userId }: { userId: string }) {
  const [count, setCount] = useState(0);

  // ❌ Without useMemoized - effect runs on every render
  const filters = { userId, status: "active" };

  useEffect(() => {
    console.log("Fetching data...");
    fetchData(filters);
  }, [filters]); // ← filters is new object every render

  // Problem: Effect runs even when filters content unchanged

  // ✅ With useMemoized - effect only runs when content changes
  const memoizedFilters = useMemoized({ userId, status: "active" });

  useEffect(() => {
    console.log("Fetching data...");
    fetchData(memoizedFilters);
  }, [memoizedFilters]); // ← Stable reference

  // Result: Effect only runs when userId actually changes!

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
```

### 4.5. Memoizes React Nodes (JSX)

```typescript
function IconProvider() {
  // ❌ Without useMemoized - new React element every render
  const icon = <svg width="24" height="24">
    <path d="M12 2L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"/>
  </svg>;
  // Each render: React.createElement() creates new object

  // ✅ With useMemoized - stable React element
  const memoizedIcon = useMemoized(
    <svg width="24" height="24">
      <path d="M12 2L2 7v10c0 5.5 3.8 10.7 10 12 6.2-1.3 10-6.5 10-12V7l-10-5z"/>
    </svg>
  );

  return <Button icon={memoizedIcon} />;
}

// Why it works:
// - React elements are just objects with type, props, children
// - lodash.isEqual compares object structure
// - Same JSX → same structure → isEqual returns true
// - Returns cached React element → same reference
// - Button doesn't re-render unless icon content changes
```

### 4.6. Type-Safe với Generics

```typescript
// ✅ Full TypeScript support
interface User {
  id: number;
  name: string;
  settings: {
    theme: "light" | "dark";
  };
}

// Type inferred from value
const user = { id: 1, name: "Alice", settings: { theme: "dark" } };
const memoized = useMemoized(user);
// memoized: { id: number; name: string; settings: { theme: string } }

// Explicit type parameter
const memoized2 = useMemoized<User>(user);
// memoized2: User

// Works with any type
const array = useMemoized<number[]>([1, 2, 3]);
const tuple = useMemoized<[string, number]>(["alice", 42]);
const union = useMemoized<string | number>("hello");
```

## 5. Use Cases thực tế

### 5.1. Memoize Configuration Objects

```typescript
function DataTable({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);

  // Configuration object
  const queryConfig = useMemoized({
    filters: {
      userId,
      status: "active"
    },
    pagination: {
      page: 1,
      pageSize: 20
    },
    sorting: {
      field: "createdAt",
      order: "desc"
    }
  });

  const { data } = useQuery({
    queryKey: ["users", queryConfig], // ← Stable reference
    queryFn: () => fetchUsers(queryConfig)
  });

  // ✅ Query only refetches when queryConfig content changes
  // ✅ Page state changes don't trigger refetch

  return <Table data={data} />;
}
```

### 5.2. Stable Context Values

```typescript
const ThemeContext = React.createContext(null);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState("dark");
  const [fontSize, setFontSize] = useState(16);

  // ❌ Without useMemoized - new object every render
  // const contextValue = {
  //   theme,
  //   fontSize,
  //   setTheme,
  //   setFontSize
  // };
  // → All consumers re-render even if theme/fontSize unchanged!

  // ✅ With useMemoized - stable reference
  const contextValue = useMemoized({
    theme,
    fontSize,
    setTheme,
    setFontSize
  });

  // ✅ Consumers only re-render when theme or fontSize changes

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### 5.3. Memoize Filters for Lists

```typescript
function ProductList() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);

  // Combine filters into object
  const filters = useMemoized({
    search,
    category,
    priceRange: {
      min: priceRange[0],
      max: priceRange[1]
    }
  });

  // Pass to child - child only re-renders when filters content changes
  return <FilteredProducts filters={filters} />;
}

const FilteredProducts = React.memo(({ filters }) => {
  const { data } = useQuery({
    queryKey: ["products", filters], // ← Stable reference
    queryFn: () => fetchProducts(filters)
  });

  return <ProductGrid products={data} />;
});
```

### 5.4. Resource Arrays Memoization (Refine Internal)

```typescript
// Refine internal use case: Resources configuration
function RefineApp() {
  // ❌ Problem: Resources recreated every render
  const resources = [
    {
      name: "posts",
      list: "/posts",
      icon: <PostIcon />
    },
    {
      name: "users",
      list: "/users",
      icon: <UserIcon />
    }
  ];

  // Each render:
  // - New array created
  // - New objects created
  // - New React elements (icons) created
  // → Sidebar, menu, etc. all re-render! ❌

  // ✅ Solution: useMemoized
  const memoizedResources = useMemoized([
    {
      name: "posts",
      list: "/posts",
      icon: <PostIcon />
    },
    {
      name: "users",
      list: "/users",
      icon: <UserIcon />
    }
  ]);

  // ✅ Deep equality check:
  // - Same array structure? ✅
  // - Same object properties? ✅
  // - Same React element structure? ✅
  // → Returns cached reference
  // → Sidebar doesn't re-render! 🎉

  return <Refine resources={memoizedResources} />;
}
```

### 5.5. Memoize Complex Dependencies

```typescript
function ChartComponent({ userId, dateRange, metrics }: Props) {
  // Complex dependencies object
  const chartConfig = useMemoized({
    user: userId,
    period: {
      from: dateRange.start,
      to: dateRange.end
    },
    metrics: metrics.map(m => ({
      id: m.id,
      label: m.name,
      color: m.color
    })),
    options: {
      showLegend: true,
      animate: true,
      tooltips: {
        enabled: true,
        format: "dd/MM/yyyy"
      }
    }
  });

  useEffect(() => {
    // Heavy computation
    const chart = createChart(chartConfig);
    chart.render();

    return () => chart.destroy();
  }, [chartConfig]); // ← Stable reference

  // ✅ Chart only recreates when config content actually changes
  // ✅ Component re-renders (e.g., hover effects) don't recreate chart

  return <div ref={chartRef} />;
}
```

### 5.6. Prevent Infinite Loops

```typescript
function InfiniteLoopPrevention() {
  const [data, setData] = useState([]);

  // ❌ Without useMemoized - infinite loop!
  const filters = { status: "active" };

  useEffect(() => {
    fetchData(filters).then(result => {
      setData(result); // ← Triggers re-render
    });
  }, [filters]); // ← filters is new object → effect runs again!

  // Result: Infinite loop! ❌

  // ✅ With useMemoized - no infinite loop
  const memoizedFilters = useMemoized({ status: "active" });

  useEffect(() => {
    fetchData(memoizedFilters).then(result => {
      setData(result); // ← Triggers re-render
    });
  }, [memoizedFilters]); // ← Stable reference → effect won't run again

  // Result: Effect runs only once! ✅

  return <DataList data={data} />;
}
```

## 6. Quyết định kiến trúc

### 6.1. Tại sao dùng useRef thay vì useState?

**Quyết định:** Store cached value trong `useRef` thay vì `useState`.

**Lý do:**

```typescript
// ❌ If we used useState:
export const useMemoizedWrong = <T>(value: T): T => {
  const [cached, setCached] = useState(value);

  if (!isEqual(cached, value)) {
    setCached(value); // ← Problem!
  }

  return cached;
};

// Flow with useState:
// 1. Component renders
// 2. useMemoizedWrong executes
// 3. Checks equality
// 4. If different, calls setCached(value)
// 5. setCached triggers RE-RENDER ❌
// 6. Component renders AGAIN
// 7. useMemoizedWrong executes AGAIN
// 8. Now cached === value, returns cached
// 9. Total: 2 renders instead of 1! ❌

// ✅ With useRef:
export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isEqual(ref.current, value)) {
    ref.current = value; // ← No re-render!
  }

  return ref.current;
};

// Flow with useRef:
// 1. Component renders
// 2. useMemoized executes
// 3. Checks equality
// 4. If different, updates ref.current (no re-render)
// 5. Returns ref.current
// 6. Total: 1 render! ✅
```

**Trade-off:**
- ✅ **Pro:** No extra renders
- ✅ **Pro:** Synchronous update
- ✅ **Pro:** Better performance
- ⚠️ **Con:** Value updates don't trigger re-render (but that's what we want!)

### 6.2. Tại sao dùng lodash.isEqual thay vì custom implementation?

**Quyết định:** Use lodash `isEqual` thay vì viết custom deep equality check.

**Lý do:**

```typescript
// ❌ Custom implementation - many edge cases!
function customIsEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;

  // ❌ Missing edge cases:
  // - What about null vs undefined?
  // - What about NaN?
  // - What about Date objects?
  // - What about RegExp?
  // - What about circular references?
  // - What about Map/Set?
  // - What about typed arrays?
  // - What about symbols?
  // ... 50+ edge cases!

  // Simplified recursion (buggy):
  if (typeof a === "object") {
    // Bugs here...
  }

  return false;
}

// ✅ lodash.isEqual - battle-tested
// - Handles 50+ edge cases
// - Handles circular references
// - Handles all JS types
// - Optimized for performance
// - Used by millions of projects
// - Well-maintained
// - Extensively tested

import isEqual from "lodash/isEqual";

export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isEqual(ref.current, value)) { // ← Reliable!
    ref.current = value;
  }

  return ref.current;
};
```

**Trade-off:**
- ✅ **Pro:** Handles all edge cases correctly
- ✅ **Pro:** Battle-tested (10+ years)
- ✅ **Pro:** Performance optimized
- ✅ **Pro:** No maintenance burden
- ⚠️ **Con:** External dependency (~7KB)
- ⚠️ **Con:** Slightly slower than reference equality (but necessary trade-off)

### 6.3. Tại sao marked as @internal?

**Quyết định:** Mark hook với `@internal` JSDoc tag.

**Lý do:**

```typescript
/**
 * Hook that memoizes the given value with deep equality.
 * @internal  ← Why internal?
 */
export const useMemoized = <T>(value: T): T => {
  // ...
};

// Reasoning:

// 1. Low-level primitive - users should use high-level hooks
//    ❌ User code:
//    import { useMemoized } from "@refinedev/core";
//    const memoized = useMemoized(value);
//
//    ✅ User code:
//    import { useDeepMemo } from "@refinedev/core";
//    const memoized = useDeepMemo(() => value, [deps]);

// 2. API might change - internal hooks can evolve faster
//    If we make it public, need to maintain backward compatibility

// 3. Encourages best practices
//    useDeepMemo is better API (factory function + deps)
//    useMemoized is too low-level for most use cases

// 4. Reduces API surface
//    Fewer public APIs = easier to understand framework
//    Only expose what users NEED to use

// Users CAN still import it if needed:
// import { useMemoized } from "@refinedev/core/dist/hooks/memoized";
// But @internal signals "use at your own risk"
```

**Trade-off:**
- ✅ **Pro:** API flexibility
- ✅ **Pro:** Encourages useDeepMemo (better API)
- ✅ **Pro:** Smaller public API surface
- ⚠️ **Con:** Advanced users can't easily use it (but they can import from dist)

### 6.4. Tại sao không cache isEqual result?

**Quyết định:** Don't cache the result of `isEqual()` comparison.

**Lý do:**

```typescript
// ❌ Hypothetical caching approach:
export const useMemoizedWithCache = <T>(value: T): T => {
  const ref = useRef(value);
  const lastResult = useRef(true);
  const lastValue = useRef(value);

  // Check if value reference changed
  if (lastValue.current !== value) {
    // Recompute isEqual
    lastResult.current = isEqual(ref.current, value);
    lastValue.current = value;
  }

  if (!lastResult.current) {
    ref.current = value;
  }

  return ref.current;
};

// Why NOT do this?

// 1. Extra complexity - 3 refs instead of 1
// 2. Extra memory - storing lastResult and lastValue
// 3. Minimal benefit - isEqual is already fast (milliseconds)
// 4. Reference check is shallow - not expensive enough to optimize
// 5. Code harder to understand and maintain

// ✅ Keep it simple - just call isEqual
export const useMemoized = <T>(value: T): T => {
  const ref = useRef(value);

  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};

// Benchmark:
// isEqual for typical objects: ~0.01-0.1ms
// Premature optimization not worth the complexity
```

**Trade-off:**
- ✅ **Pro:** Simple code (16 lines vs 30+ lines)
- ✅ **Pro:** Easy to understand
- ✅ **Pro:** Less memory usage
- ⚠️ **Con:** isEqual called every render (but fast enough)

## 7. Common Pitfalls

### 7.1. Mutating the value after memoization

```typescript
// ❌ Wrong - mutating memoized value
function MyComponent() {
  const config = useMemoized({ theme: "dark", items: [] });

  // ❌ DON'T mutate memoized value!
  config.items.push("new item"); // ← Mutation!

  return <Child config={config} />;
}

// Problem:
// - Mutation changes ref.current directly
// - Next render: isEqual sees same reference → returns cached
// - But cached value is mutated! ❌
// - Child component doesn't know about mutation

// ✅ Correct - create new object
function MyComponent() {
  const [items, setItems] = useState([]);

  const config = useMemoized({
    theme: "dark",
    items: items // ← New array reference
  });

  const addItem = (item: string) => {
    setItems(prev => [...prev, item]); // ← Immutable update
  };

  return <Child config={config} onAdd={addItem} />;
}
```

### 7.2. Không hiểu deep equality performance cost

```typescript
// ⚠️ Deep equality is O(n) where n = object size

// ❌ Bad - memoizing huge objects
function MyComponent() {
  const hugeData = useMemoized({
    // 10,000 items array
    items: Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      data: {
        nested: {
          deep: {
            value: i
          }
        }
      }
    }))
  });

  // Problem: isEqual traverses 10,000+ objects every render!
  // Cost: ~10-100ms per render ❌

  return <DataView data={hugeData} />;
}

// ✅ Good - memoize smaller chunks
function MyComponent() {
  const config = useMemoized({
    // Small config object
    pageSize: 20,
    sortBy: "name"
  });

  // Fetch data separately (not memoized with useMemoized)
  const { data } = useQuery(["items", config], fetchItems);

  return <DataView config={config} data={data} />;
}

// Rule of thumb:
// - Small objects (< 100 properties): OK
// - Medium objects (100-1000 properties): Acceptable
// - Large objects (1000+ properties): Avoid useMemoized
```

### 7.3. Sử dụng cho primitives (unnecessary)

```typescript
// ❌ Unnecessary - primitives don't need deep equality
function MyComponent() {
  const memoizedString = useMemoized("hello");
  const memoizedNumber = useMemoized(42);
  const memoizedBoolean = useMemoized(true);

  // Problem: Overhead for no benefit
  // Primitives already use value equality (===)
  // "hello" === "hello" → true (same value)
  // No need for deep equality check!
}

// ✅ Correct - only use for objects/arrays
function MyComponent() {
  // ✅ Use for objects
  const config = useMemoized({ theme: "dark" });

  // ✅ Use for arrays
  const items = useMemoized([1, 2, 3]);

  // ❌ Don't use for primitives
  const name = "Alice"; // Just use directly
  const count = 42; // Just use directly

  return <Child config={config} items={items} name={name} count={count} />;
}
```

### 7.4. Quên rằng hook không reactive với mutations

```typescript
// ❌ Wrong - expecting reactivity to mutations
function MyComponent() {
  const data = { items: [] };
  const memoized = useMemoized(data);

  // ❌ Mutation - but memoized won't update!
  useEffect(() => {
    data.items.push("new");
    // memoized still has old reference ❌
  }, []);

  return <Child data={memoized} />;
}

// Why doesn't it update?
// 1. data.items.push() mutates data
// 2. Next render: data reference is same
// 3. isEqual(memoized, data) → true (same reference)
// 4. Returns old memoized reference
// 5. Child doesn't see mutation ❌

// ✅ Correct - create new object on change
function MyComponent() {
  const [items, setItems] = useState([]);

  const data = useMemoized({ items });

  useEffect(() => {
    // ✅ Immutable update
    setItems(prev => [...prev, "new"]);
    // Next render: items is new array
    // isEqual(memoized, { items: newArray }) → false
    // Updates memoized reference ✅
  }, []);

  return <Child data={data} />;
}
```

### 7.5. Nested memoization (double memoization)

```typescript
// ❌ Wrong - memoizing memoized value
function MyComponent() {
  const config = useMemoized({ theme: "dark" });
  const doubleMemoized = useMemoized(config); // ← Unnecessary!

  // Problem: Redundant work
  // config is already memoized
  // No need to memoize again

  return <Child config={doubleMemoized} />;
}

// ✅ Correct - single memoization
function MyComponent() {
  const config = useMemoized({ theme: "dark" });

  return <Child config={config} />;
}

// When you MIGHT need double memoization (rare):
function MyComponent() {
  const config = useMemoized({ theme: "dark" });

  // If you transform memoized value:
  const transformed = useMemoized({
    ...config,
    extra: "data"
  });

  // ✅ OK - transforming creates new object
  // Need to memoize transformed result

  return <Child config={transformed} />;
}
```

### 7.6. Không dùng với React.memo

```typescript
// ⚠️ useMemoized without React.memo - wasted effort

// ❌ Child not memoized - useMemoized has no effect
const Child = ({ data }) => {
  // This re-renders on every parent render
  // Even if data reference is stable!
  return <div>{JSON.stringify(data)}</div>;
};

function Parent() {
  const data = useMemoized({ id: 1 });
  return <Child data={data} />; // ← Child always re-renders ❌
}

// ✅ Correct - combine useMemoized + React.memo
const Child = React.memo(({ data }) => {
  // Now this only re-renders when data reference changes!
  return <div>{JSON.stringify(data)}</div>;
});

function Parent() {
  const data = useMemoized({ id: 1 });
  return <Child data={data} />; // ← Child doesn't re-render ✅
}

// Rule: useMemoized + React.memo = Optimization Complete
```

## 8. Performance Considerations

### 8.1. isEqual Performance Cost

```typescript
// Benchmark: isEqual performance
// ================================

// Small object (5 properties):
const small = { a: 1, b: 2, c: 3, d: 4, e: 5 };
// isEqual time: ~0.01ms ✅ Negligible

// Medium object (50 properties):
const medium = { /* 50 properties */ };
// isEqual time: ~0.1ms ✅ Acceptable

// Large object (500 properties):
const large = { /* 500 properties */ };
// isEqual time: ~1ms ⚠️ Noticeable

// Huge object (5000 properties):
const huge = { /* 5000 properties */ };
// isEqual time: ~10ms ❌ Expensive

// Nested deep (10 levels):
const deep = { a: { b: { c: { /* 10 levels */ } } } };
// isEqual time: ~2ms ⚠️ Depends on depth

// Guideline:
// - < 100 properties: Use freely ✅
// - 100-1000 properties: Use with caution ⚠️
// - > 1000 properties: Avoid or optimize differently ❌
```

### 8.2. Memory Usage

```typescript
// Memory cost of useMemoized

// Without useMemoized:
function Component() {
  const config = { theme: "dark" };
  // Memory: 1 object per render
  // render 1: object A (48 bytes)
  // render 2: object B (48 bytes) ← new
  // render 3: object C (48 bytes) ← new
  // Total: 144 bytes (3 renders)
  // GC can collect old objects
}

// With useMemoized:
function Component() {
  const config = useMemoized({ theme: "dark" });
  // Memory: 1 object + 1 ref + isEqual overhead
  // render 1: object A (48 bytes) + ref (8 bytes) = 56 bytes
  // render 2: same ref → 56 bytes (no new object)
  // render 3: same ref → 56 bytes (no new object)
  // Total: 56 bytes (3 renders)
  // But: isEqual allocates temp memory during comparison (~100 bytes)
}

// Trade-off:
// ✅ Saves memory over time (fewer objects)
// ⚠️ isEqual temp allocations during comparison
// ✅ Overall: Memory positive (especially with many children)
```

### 8.3. When NOT to Use useMemoized

```typescript
// ❌ Case 1: Simple primitives
const memoizedNumber = useMemoized(42); // Unnecessary

// ❌ Case 2: Already stable reference
const stableRef = useRef({ theme: "dark" });
const memoized = useMemoized(stableRef.current); // Redundant

// ❌ Case 3: Value changes every render anyway
const timestamp = useMemoized(Date.now()); // No benefit

// ❌ Case 4: Huge objects (isEqual too expensive)
const hugeArray = useMemoized(new Array(100000).fill(0)); // Slow

// ❌ Case 5: No consumers care about reference equality
function Component() {
  const data = useMemoized({ id: 1 });
  return <div>{data.id}</div>; // No child, no effect deps → wasted
}

// ✅ When TO use:
// 1. Objects/arrays passed to React.memo components
// 2. Objects/arrays in useEffect deps
// 3. Objects/arrays in useMemo/useCallback deps
// 4. Context values
// 5. Query keys (React Query)
```

### 8.4. Optimization: Shallow Check Before Deep Check

```typescript
// Potential optimization (not in current implementation):
export const useMemoizedOptimized = <T>(value: T): T => {
  const ref = useRef(value);

  // Fast path: Reference equality (O(1))
  if (ref.current === value) {
    return ref.current; // ← Same reference, skip deep check
  }

  // Slow path: Deep equality (O(n))
  if (!isEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
};

// Benefit:
// - If value reference unchanged: Skip isEqual entirely
// - If value reference changed: Fall back to isEqual

// Why not in current implementation?
// - Added complexity
// - Reference rarely same (would need useMemo/useCallback)
// - If reference same, isEqual is fast anyway (early return)
```

### 8.5. Comparison with useMemo

```typescript
// useMemo vs useMemoized

// useMemo:
// - Shallow equality on dependencies
// - Good for computed values
const computed = useMemo(() => {
  return expensiveComputation(a, b, c);
}, [a, b, c]); // ← Shallow check: a === a && b === b && c === c

// Problem: If dependencies are objects, useMemo fails
const computed = useMemo(() => {
  return expensiveComputation(config);
}, [config]); // ← config is new object every render → useMemo useless ❌

// Solution: useMemoized + useMemo (= useDeepMemo)
const memoizedConfig = useMemoized(config);
const computed = useMemo(() => {
  return expensiveComputation(memoizedConfig);
}, [memoizedConfig]); // ← Stable reference → useMemo works ✅

// Or better: useDeepMemo (combines both)
const computed = useDeepMemo(() => {
  return expensiveComputation(config);
}, [config]); // ← Deep equality check on dependencies
```

## 9. Testing

### 9.1. Basic Equality Test

```typescript
import { renderHook } from "@testing-library/react";
import { useMemoized } from "./useMemoized";

describe("useMemoized", () => {
  it("returns same reference for deep equal objects", () => {
    const obj1 = { id: 1, name: "Alice" };

    const { result, rerender } = renderHook(
      ({ value }) => useMemoized(value),
      { initialProps: { value: obj1 } }
    );

    const firstRef = result.current;

    // Create new object with same content
    const obj2 = { id: 1, name: "Alice" };

    rerender({ value: obj2 });

    const secondRef = result.current;

    // Should return same reference (obj1)
    expect(secondRef).toBe(firstRef);
    expect(secondRef).toBe(obj1);
    expect(secondRef).not.toBe(obj2);
  });
});
```

### 9.2. Test Content Change Detection

```typescript
it("returns new reference when content changes", () => {
  const obj1 = { id: 1, name: "Alice" };

  const { result, rerender } = renderHook(
    ({ value }) => useMemoized(value),
    { initialProps: { value: obj1 } }
  );

  const firstRef = result.current;

  // Create object with different content
  const obj2 = { id: 2, name: "Bob" };

  rerender({ value: obj2 });

  const secondRef = result.current;

  // Should return new reference (obj2)
  expect(secondRef).not.toBe(firstRef);
  expect(secondRef).toBe(obj2);
});
```

### 9.3. Test Nested Objects

```typescript
it("handles nested objects correctly", () => {
  const nested1 = {
    user: {
      profile: {
        settings: { theme: "dark" }
      }
    }
  };

  const { result, rerender } = renderHook(
    ({ value }) => useMemoized(value),
    { initialProps: { value: nested1 } }
  );

  const firstRef = result.current;

  // Same content, different references at all levels
  const nested2 = {
    user: {
      profile: {
        settings: { theme: "dark" }
      }
    }
  };

  rerender({ value: nested2 });

  // Should recognize as equal and return old reference
  expect(result.current).toBe(firstRef);
});
```

### 9.4. Test React Elements

```typescript
it("memoizes React elements with same structure", () => {
  const element1 = <div>Hello</div>;

  const { result, rerender } = renderHook(
    ({ value }) => useMemoized(value),
    { initialProps: { value: element1 } }
  );

  const firstRef = result.current;

  // Same JSX structure
  const element2 = <div>Hello</div>;

  rerender({ value: element2 });

  // Should return cached element
  expect(result.current).toBe(firstRef);
  expect(result.current).toBe(element1);
});
```

### 9.5. Performance Test

```typescript
it("performs efficiently for medium-sized objects", () => {
  const mediumObject = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    data: { value: i * 2 }
  }));

  const startTime = performance.now();

  const { result, rerender } = renderHook(
    ({ value }) => useMemoized(value),
    { initialProps: { value: mediumObject } }
  );

  // Rerender with same content 100 times
  for (let i = 0; i < 100; i++) {
    const sameContent = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      data: { value: i * 2 }
    }));

    rerender({ value: sameContent });
  }

  const endTime = performance.now();
  const totalTime = endTime - startTime;

  // Should complete in reasonable time (< 100ms for 100 comparisons)
  expect(totalTime).toBeLessThan(100);

  // Should return same reference for all renders
  expect(result.current).toBe(mediumObject);
});
```

## 10. Kết luận

### Tóm tắt Hook

`useMemoized` là một **Primitive Memoization Hook** cực kỳ đơn giản (chỉ 16 dòng code) nhưng vô cùng powerful và foundational trong Refine architecture. Hook này giải quyết referential inequality problem - một trong những nguyên nhân chính gây unnecessary re-renders trong React applications.

**Key Characteristics:**
- ✅ **Primitive Pattern**: Building block cho higher-level hooks
- ✅ **Deep Equality**: Uses lodash.isEqual cho recursive comparison
- ✅ **Ref-based**: useRef thay vì useState (no re-renders)
- ✅ **Reference Stability**: Guarantees same reference when content unchanged
- ✅ **Type-Safe**: Full TypeScript support với generics
- ✅ **Internal**: Marked @internal, foundation for useDeepMemo

### Khi nào dùng Hook này?

**✅ Sử dụng khi:**
- Building higher-level hooks (như useDeepMemo)
- Need deep equality memoization for objects/arrays
- Want to prevent unnecessary re-renders
- Stabilizing references for React.memo
- Stabilizing references for useEffect deps

**❌ Không dùng khi:**
- Working with primitives (strings, numbers, booleans)
- Value changes every render anyway
- Object is huge (> 1000 properties)
- Value already has stable reference (useRef)
- No consumers care about reference equality

**⚠️ Note:** Đây là internal hook. Users nên dùng `useDeepMemo` instead (higher-level wrapper).

### So sánh với các giải pháp khác

| Feature | useMemoized | useMemo | React.memo | useRef |
|---------|-------------|---------|------------|--------|
| Equality Check | Deep | Shallow | Shallow | Reference |
| Re-render on Update | No | No | Yes (child) | No |
| Handles Objects | ✅ Excellent | ❌ Poor | ❌ Poor | ✅ Good |
| Handles Nested | ✅ Yes | ❌ No | ❌ No | ⚠️ Manual |
| Performance | ⚠️ O(n) | ✅ O(1) | ✅ O(1) | ✅ O(1) |
| Use Case | Memoize values | Compute values | Memo components | Store refs |

### Best Practices Summary

```typescript
// ✅ DO: Use for objects/arrays
const config = useMemoized({ theme: "dark", items: [1, 2, 3] });

// ✅ DO: Combine with React.memo
const Child = React.memo(({ config }) => <div>{config.theme}</div>);
<Child config={useMemoized(config)} />

// ✅ DO: Use in useEffect deps
useEffect(() => {
  fetchData(memoizedFilters);
}, [memoizedFilters]);

// ✅ DO: Use for context values
<Context.Provider value={useMemoized({ state, dispatch })}>

// ❌ DON'T: Use for primitives
useMemoized(42); // Unnecessary

// ❌ DON'T: Mutate memoized values
const data = useMemoized({ items: [] });
data.items.push("new"); // ❌ BAD!

// ❌ DON'T: Use for huge objects
useMemoized(arrayWith100kItems); // Too expensive

// ❌ DON'T: Use without consumers
const data = useMemoized(config);
return <div>{data.theme}</div>; // No child/dep → wasted
```

### Điểm mạnh

1. **Extremely Simple**: Chỉ 16 dòng code, dễ hiểu
2. **Powerful**: Solves major React performance problem
3. **Foundation**: Building block cho useDeepMemo và other hooks
4. **Type-Safe**: Full TypeScript support
5. **Battle-Tested**: Uses lodash.isEqual (tested by millions)
6. **Zero Re-renders**: useRef-based, không trigger re-renders

### Điểm cần lưu ý

1. **Internal Hook**: Not for direct user consumption (use useDeepMemo)
2. **Performance Cost**: O(n) deep equality check every render
3. **Memory**: Stores value in ref (persists between renders)
4. **Mutation Risk**: Users might mutate memoized value (breaks invariant)
5. **Not Reactive**: Doesn't detect mutations on existing object

### Architectural Significance

```
┌──────────────────────────────────────────────┐
│      REFINE MEMOIZATION ARCHITECTURE         │
├──────────────────────────────────────────────┤
│                                              │
│  Application Code (Components)              │
│         ↓                                    │
│  useDeepMemo (High-level)                    │ ← User-facing
│         ↓                                    │
│  useMemoized (Primitive) ◄──────────────────┼─── WE ARE HERE
│         ↓                                    │
│  lodash.isEqual (Utility)                    │ ← Low-level
│                                              │
│  Hook Hierarchy:                             │
│  - useMemoized: Primitive (value memoization)│
│  - useDeepMemo: Composite (factory + deps)   │
│  - Application hooks: Built on useDeepMemo   │
│                                              │
└──────────────────────────────────────────────┘

Design Pattern:
Primitive → Composite → Application

useMemoized is the ATOM that everything else builds on.
```

### Resources

- **Implementation**: `/packages/core/src/hooks/memoized/index.tsx` (16 lines!)
- **Tests**: `/packages/core/src/hooks/memoized/index.spec.tsx`
- **Related**: useDeepMemo, useRef, useMemo
- **Dependency**: lodash/isEqual
- **Status**: @internal (not public API)

---

**Tác giả kiến trúc:** Refine Core Team
**Hook size:** 16 lines
**Hook type:** Primitive Memoization Hook
**Dependencies:** React (useRef), lodash/isEqual
**Design patterns:** Primitive, Ref Pattern, Lazy Evaluation, Deep Equality, Immutable Reference
**Performance:** O(n) where n = object size (isEqual cost)
**Use case:** Foundation for deep equality memoization trong Refine
