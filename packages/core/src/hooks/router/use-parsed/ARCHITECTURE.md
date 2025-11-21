# Kiến trúc và Design Patterns của useParsed Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          AUTO-UPDATING ROUTE INFO SYSTEM          │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  Browser URL:                                    │  │
│  │    /posts/show/123?page=2                        │  │
│  │         ↓                                         │  │
│  │                                                   │  │
│  │  useParse (Low-level)                            │  │
│  │    → Returns parse function                      │  │
│  │    → Manual: parse()                             │  │
│  │    → Fresh data on demand                        │  │
│  │         │                                         │  │
│  │         ↓ wrapped by                             │  │
│  │                                                   │  │
│  │  useParsed ✅ (THIS HOOK - 13 lines!)           │  │
│  │    → Auto-updating route information             │  │
│  │         │                                         │  │
│  │         ├──→ FACADE PATTERN:                     │  │
│  │         │     Simplifies useParse usage           │  │
│  │         │                                         │  │
│  │         ├──→ EAGER EVALUATION:                   │  │
│  │         │     Auto-calls parse()                 │  │
│  │         │                                         │  │
│  │         ├──→ MEMOIZATION:                        │  │
│  │         │     Cache parse result                 │  │
│  │         │                                         │  │
│  │         └──→ DELEGATION:                         │  │
│  │               Uses useParse internally           │  │
│  │                                                   │  │
│  │         ↓ returns ParseResponse                  │  │
│  │                                                   │  │
│  │  {                                               │  │
│  │    resource: postsResource,                      │  │
│  │    action: "show",                               │  │
│  │    id: 123,                                      │  │
│  │    pathname: "/posts/show/123",                  │  │
│  │    params: { currentPage: 2 }                    │  │
│  │  }                                               │  │
│  │                                                   │  │
│  │  Used by (MOST COMMON):                          │  │
│  │    - useTable (sync with URL params)             │  │
│  │    - useResource (detect current resource)       │  │
│  │    - useBreadcrumb (build from route)            │  │
│  │    - Components (show current resource/action)   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide auto-updating route information (simplified useParse)**

### 1.2 Comparison: useParse vs useParsed

```
┌──────────────────────────────────────────────────────────────┐
│         USPARSE VS USEPARSED - Manual vs Auto                │
└──────────────────────────────────────────────────────────────┘

useParse (Manual, Low-level)
═══════════════════════════════
const parse = useParse();        // Get function
const info = parse();            // Call manually

Use when:
- Building custom hooks
- Need parse function
- Manual control

useParsed (Auto, High-level) ✅
═══════════════════════════════
const info = useParsed();        // Get data directly!

Use when:
- Need current route info
- Standard component usage
- Auto-updates wanted

INTERNAL RELATIONSHIP:
═══════════════════════════════
useParsed() {
  const parse = useParse();      // Delegate to useParse
  return useMemo(() => parse()); // Auto-call + cache
}

// useParsed = Auto-calling wrapper around useParse!


EXAMPLE COMPARISON:
═══════════════════════════════

// useParse (verbose):
const parse = useParse();
const { resource, action } = parse();  // Manual call

// useParsed (concise):
const { resource, action } = useParsed();  // Auto call! ✅

// 90% of time → Use useParsed!
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-parsed/index.tsx: 13 dòng** - Auto-updating wrapper!

---

### 2.1 Facade Pattern - Simplified Interface

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Smart Home Controller

```
Complex System (useParse):
Home automation:
- Get light controller
- Call controller.getLights()
- Get current state

Smart Button (useParsed):
- Press button
- Get current state
Done! Simple!

useParse (Complex):
const parse = useParse();
const info = parse();

useParsed (Simple):
const info = useParsed();
Done! ✅
```

**Facade Pattern** = Provide simplified interface to complex system.

#### Implementation:

```typescript
// COMPLEX (useParse):
const parse = useParse(); // Step 1: Get function
const info = parse(); // Step 2: Call function

// SIMPLE (useParsed - Facade):
const info = useParsed(); // One step! ✅

// IMPLEMENTATION:
export const useParsed = () => {
  const parse = useParse(); // Delegate to complex system
  const parsed = React.useMemo(() => parse(), [parse]); // Simplify!
  return parsed; // Direct data! ✅
};
```

#### Benefit:

```tsx
// WITHOUT facade (verbose):
function Component() {
  const parse = useParse();
  const { resource, action, id } = parse();

  return (
    <div>
      {resource?.name} - {action}
    </div>
  );
}

// WITH facade (concise):
function Component() {
  const { resource, action, id } = useParsed(); // ✅

  return (
    <div>
      {resource?.name} - {action}
    </div>
  );
}

// Less code, same result!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simpler** - One call vs two
- ✅ **Common case** - 90% of usage
- ✅ **Less code** - Fewer lines
- ✅ **Clearer** - Intent obvious

---

### 2.2 Eager Evaluation Pattern - Auto Execution

#### ⚡ VÍ DỤ ĐỜI THƯỜNG: Vending Machine

```
Manual Machine (useParse):
1. Get coin slot (parse function)
2. Insert coin (call parse())
3. Get item (route info)

Auto Machine (useParsed):
1. Press button
2. Get item immediately!

useParse (Lazy):
const parse = useParse();  // Get function
const info = parse();      // Call when needed

useParsed (Eager):
const info = useParsed();  // Auto-called! ✅
```

**Eager Evaluation** = Execute immediately instead of waiting for explicit call.

#### Implementation:

```typescript
// LAZY (useParse):
export const useParse = () => {
  const parse = /* get parse function */;
  return parse;  // Return function (not executed)
};

// EAGER (useParsed):
export const useParsed = () => {
  const parse = useParse();  // Get function
  const parsed = React.useMemo(() => parse(), [parse]);  // Execute immediately!
  return parsed;  // Return result
};
```

#### When Each is Better:

```tsx
// LAZY (useParse) - When you need control:
const parse = useParse();

const handleClick = () => {
  const info = parse(); // Call only on click
  console.log(info);
};

// Don't need info on render, only on click!

// EAGER (useParsed) - When you need data now:
const { resource, action } = useParsed(); // Need data immediately

return <h1>{resource?.name}</h1>; // Render with data

// Need data for rendering!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Immediate data** - Available right away
- ✅ **Declarative** - "I need this data"
- ✅ **Reactive** - Auto-updates with URL
- ✅ **Standard** - Most common pattern

---

### 2.3 Memoization Pattern - Cached Result

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Calculator Memory

```
Without Memory:
Every time: Recalculate 123 × 456
Slow!

With Memory:
First time: Calculate, save result
Later: Return saved result
Fast!

Without Memoization:
Every render: Call parse()
Slow!

With Memoization:
First render: Call parse(), cache result
Later renders: Return cached result
Fast! ✅
```

**Memoization** = Cache result, recalculate only when dependencies change.

#### Implementation:

```typescript
// WITHOUT MEMO (recalculates every render):
export const useParsed = () => {
  const parse = useParse();
  const parsed = parse(); // Called every render! ❌
  return parsed;
};

// WITH MEMO (caches result):
export const useParsed = () => {
  const parse = useParse();
  const parsed = React.useMemo(
    () => parse(),
    [parse], // Only recalculate if parse changes
  );
  return parsed; // Cached! ✅
};
```

#### Performance Impact:

```tsx
// Component that re-renders often:
function FastRenderingComponent() {
  const [count, setCount] = useState(0);
  const parsed = useParsed(); // Memoized! ✅

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>
      <div>Resource: {parsed.resource?.name}</div>
    </div>
  );

  // Without memo: parse() called on every click ❌
  // With memo: parse() called only when URL changes ✅
}
```

#### When Re-evaluation Happens:

```typescript
// Memoization dependency: [parse]

// SCENARIO 1: Component re-renders, URL unchanged
// → parse function same
// → Return cached result ✅

// SCENARIO 2: URL changes
// → parse function new (from router)
// → Recalculate parse() ✅

// SCENARIO 3: Router switches
// → parse function new
// → Recalculate parse() ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid unnecessary parsing
- ✅ **Stable** - Same object reference
- ✅ **Efficient** - Parse only on URL change
- ✅ **React optimization** - Works with React.memo

---

### 2.4 Delegation Pattern - Leverage Existing Tool

#### 🛠️ VÍ DỤ ĐỜI THƯỜNG: Restaurant Waiter

```
Kitchen (useParse):
- Cooks food
- Complex process

Waiter (useParsed):
- Doesn't cook
- Delegates to kitchen
- Brings food to table
- Simplified for customer

useParse (Core Logic):
- Parses route
- Complex logic

useParsed (Wrapper):
- Doesn't parse
- Delegates to useParse
- Simplifies for components ✅
```

**Delegation Pattern** = Assign responsibility to specialized component.

#### Implementation:

```typescript
export const useParsed = () => {
  // DELEGATE to useParse:
  const parse = useParse(); // Get specialized tool

  // ADD convenience layer:
  const parsed = React.useMemo(() => parse(), [parse]);

  return parsed; // Simplified result!
};

// useParsed does NOT re-implement parsing!
// It DELEGATES to useParse! ✅
```

#### Separation of Concerns:

```
useParse:
- Core parsing logic
- Factory pattern
- RouterContext access
- Null safety

useParsed:
- Convenience wrapper
- Eager evaluation
- Memoization
- Simplified API

Clear separation! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DRY** - Don't repeat parsing logic
- ✅ **Single responsibility** - Each does one thing
- ✅ **Maintainable** - Fix in one place
- ✅ **Testable** - Test each separately

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern              | Ví dụ đời thường     | Giải quyết vấn đề gì    | Trong useParsed             |
| -------------------- | -------------------- | ----------------------- | --------------------------- |
| **Facade**           | Smart home button    | Simplify complex system | One call vs two (useParse)  |
| **Eager Evaluation** | Auto vending machine | Immediate execution     | Auto-calls parse()          |
| **Memoization**      | Calculator memory    | Cache results           | Only re-parse on URL change |
| **Delegation**       | Restaurant waiter    | Leverage specialist     | Uses useParse internally    |

---

## 3. KEY FEATURES

### 3.1 Direct Data Return

```typescript
// useParse (function):
const parse = useParse();
const data = parse();

// useParsed (data):
const data = useParsed(); // Direct! ✅
```

### 3.2 Auto-Updating

```typescript
// URL changes:
// - useParsed automatically returns new data
// - No manual parse() call needed
const info = useParsed(); // Always current! ✅
```

### 3.3 Memoized for Performance

```typescript
// Re-renders don't trigger re-parsing
// Only URL changes trigger re-parsing
const info = useParsed(); // Efficient! ✅
```

### 3.4 Same ParseResponse Type

```typescript
type ParseResponse = {
  resource?: IResourceItem;
  action?: Action;
  id?: BaseKey;
  pathname?: string;
  params?: ParsedParams;
};
```

---

## 4. COMMON USE CASES

### 4.1 Get Current Resource

```tsx
import { useParsed } from "@refinedev/core";

function ResourceHeader() {
  const { resource } = useParsed();

  return <h1>{resource?.label}</h1>;
}
```

### 4.2 Get Current Action

```tsx
function ActionIndicator() {
  const { action } = useParsed();

  return <div className={`action-${action}`}>Current Action: {action}</div>;
}
```

### 4.3 Get All Route Info

```tsx
function RouteDebug() {
  const { resource, action, id, pathname, params } = useParsed();

  return (
    <div>
      <div>Resource: {resource?.name}</div>
      <div>Action: {action}</div>
      <div>ID: {id}</div>
      <div>Path: {pathname}</div>
      <div>Params: {JSON.stringify(params)}</div>
    </div>
  );
}
```

### 4.4 Conditional Rendering

```tsx
function ConditionalHeader() {
  const { resource, action } = useParsed();

  if (resource?.name === "posts" && action === "list") {
    return <PostsListHeader />;
  }

  if (resource?.name === "posts" && action === "show") {
    return <PostShowHeader />;
  }

  return <DefaultHeader />;
}
```

### 4.5 Sync Component State with URL

```tsx
function TableComponent() {
  const { params } = useParsed();

  const filters = params?.filters || [];
  const currentPage = params?.currentPage || 1;

  return <Table filters={filters} currentPage={currentPage} />;
}
```

### 4.6 Breadcrumb Navigation

```tsx
function Breadcrumb() {
  const { resource, action, id } = useParsed();

  return (
    <nav>
      <Link to="/">Home</Link>
      {resource && (
        <>
          {" > "}
          <Link to={`/${resource.name}`}>{resource.label}</Link>
        </>
      )}
      {action === "show" && id && (
        <>
          {" > "}
          <span>#{id}</span>
        </>
      )}
    </nav>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Wrapper Instead of Copy?

**Answer:** DRY principle and single source of truth

```typescript
// ❌ BAD: Copy useParse logic
export const useParsed = () => {
  const routerContext = useContext(RouterContext);
  const parseFactory = routerContext?.parse;
  const parse = parseFactory?.() ?? (() => ({}));
  return useMemo(() => parse(), [parse]);
};
// Code duplication! ❌

// ✅ GOOD: Delegate to useParse
export const useParsed = () => {
  const parse = useParse(); // Reuse!
  return useMemo(() => parse(), [parse]);
};
// DRY! ✅
```

### 5.2 Why Memoize Result?

**Answer:** Performance and stable references

```typescript
// WITHOUT memo:
export const useParsed = () => {
  const parse = useParse();
  return parse(); // New object every render! ❌
};

// Component:
const info = useParsed();
useEffect(() => {
  // Runs every render! ❌
}, [info]);

// WITH memo:
export const useParsed = () => {
  const parse = useParse();
  return useMemo(() => parse(), [parse]); // Same object! ✅
};

// Component:
const info = useParsed();
useEffect(() => {
  // Runs only when URL changes! ✅
}, [info]);
```

### 5.3 Why Dependency is [parse]?

**Answer:** parse changes when router changes or URL changes

```typescript
const parsed = useMemo(() => parse(), [parse]);

// parse changes when:
// 1. Router implementation switches
// 2. URL changes (router provides new parse function)

// Perfect trigger for re-parsing! ✅
```

### 5.4 Why Not useEffect?

**Answer:** Synchronous data preferred

```typescript
// ❌ ALTERNATIVE: useEffect (asynchronous)
export const useParsed = () => {
  const parse = useParse();
  const [info, setInfo] = useState(parse());

  useEffect(() => {
    setInfo(parse());
  }, [parse]);

  return info;
};
// - Extra render (initial + effect)
// - More complex
// - Stale data for one render ❌

// ✅ CURRENT: useMemo (synchronous)
export const useParsed = () => {
  const parse = useParse();
  return useMemo(() => parse(), [parse]);
};
// - Single render
// - Simple
// - Always fresh ✅
```

---

## 6. COMPARISON WITH useParse

### Feature Comparison

| Feature        | useParse         | useParsed   |
| -------------- | ---------------- | ----------- |
| **Returns**    | Function         | Data        |
| **Pattern**    | Factory          | Facade      |
| **Calling**    | Manual `parse()` | Auto-called |
| **Complexity** | Low-level        | High-level  |
| **Use case**   | Custom hooks     | Components  |
| **Frequency**  | 10%              | 90% ✅      |

### Code Comparison

```tsx
// useParse (manual):
const parse = useParse();
const { resource, action } = parse(); // 2 steps

// useParsed (auto):
const { resource, action } = useParsed(); // 1 step ✅

// Same result, less code!
```

### When to Use Each

```typescript
// USE useParse when:
// ✅ Building custom hooks
// ✅ Need parse function for logic
// ✅ Conditional parsing

// USE useParsed when:
// ✅ Standard component usage (90% of cases)
// ✅ Need current route info
// ✅ Want auto-updates
```

---

## 7. COMMON PITFALLS

### 7.1 Destructuring Undefined

```tsx
// ❌ RISKY - resource might be undefined
const { resource } = useParsed();
const name = resource.name;  // Error if undefined! ❌

// ✅ SAFE - Optional chaining
const { resource } = useParsed();
const name = resource?.name;  ✅
```

### 7.2 Using useParse Instead

```tsx
// ❌ WRONG - Forgot to call parse()
const parse = useParse();  // Just function!
const name = parse.resource?.name;  // Undefined! ❌

// ✅ CORRECT - Use useParsed
const parsed = useParsed();  // Data!
const name = parsed.resource?.name;  ✅
```

### 7.3 Assuming Data Exists

```tsx
// ❌ WRONG - Assuming resource exists
const { resource } = useParsed();
return <h1>{resource.label}</h1>;  // Error if undefined! ❌

// ✅ CORRECT - Check existence
const { resource } = useParsed();
if (!resource) return null;
return <h1>{resource.label}</h1>;  ✅
```

### 7.4 Not Reactive to URL Changes

```tsx
// ⚠️ MISTAKE - Extracting on mount only
useEffect(() => {
  const { resource } = useParsed();
  // ...
}, []); // ❌ Doesn't update on URL change!

// ✅ CORRECT - Use directly in render
const { resource } = useParsed(); // Auto-updates! ✅
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useParsed } from "@refinedev/core";

describe("useParsed", () => {
  it("should return parsed route info", () => {
    const mockRouter = {
      parse: () => () => ({
        resource: postsResource,
        action: "list",
        pathname: "/posts",
      }),
    };

    const wrapper = createWrapper(mockRouter);
    const { result } = renderHook(() => useParsed(), { wrapper });

    expect(result.current.resource).toBe(postsResource);
    expect(result.current.action).toBe("list");
    expect(result.current.pathname).toBe("/posts");
  });

  it("should return empty object without router", () => {
    const wrapper = createWrapper(null);
    const { result } = renderHook(() => useParsed(), { wrapper });

    expect(result.current).toEqual({});
  });

  it("should memoize result", () => {
    const wrapper = createWrapper(mockRouter);
    const { result, rerender } = renderHook(() => useParsed(), { wrapper });

    const first = result.current;
    rerender();
    const second = result.current;

    expect(first).toBe(second); // Same reference!
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Facade**: Simplifies useParse to one call
- ✅ **Eager Evaluation**: Auto-calls parse()
- ✅ **Memoization**: Caches result for performance
- ✅ **Delegation**: Uses useParse internally

### Key Features

1. **Direct Data** - Returns data, not function
2. **Auto-Updating** - Reactive to URL changes
3. **Memoized** - Efficient, stable references
4. **Simple API** - One call, get data
5. **90% Use Case** - Most common pattern

### Khi nào dùng useParsed?

✅ **Nên dùng (90% of cases):**

- Standard component usage
- Need current route info
- Want auto-updates
- Declarative style

❌ **Không dùng:**

- Building custom hooks → Use `useParse()`
- Need parse function → Use `useParse()`
- Conditional parsing → Use `useParse()`

### useParse vs useParsed

```typescript
// useParse: Manual, low-level
const parse = useParse();
const info = parse();

// useParsed: Auto, high-level ✅
const info = useParsed();

// 90% of time → useParsed!
```

### Remember

✅ **13 lines** - Ultra-minimal facade
🎭 **Facade Pattern** - Simplifies useParse
⚡ **Eager Evaluation** - Auto-calls parse()
💾 **Memoization** - Caches result
🛠️ **Delegation** - Uses useParse

---

> 📚 **Best Practice**: Use **`useParsed()`** for standard component usage (90% of cases). It's **auto-updating**, **memoized**, and **simpler** than useParse. Only use **`useParse()`** when building custom hooks or need manual control. The hook **returns data directly** - no need to call a function!
