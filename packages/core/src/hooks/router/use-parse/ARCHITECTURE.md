# Kiến trúc và Design Patterns của useParse Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          ROUTE PARSING SYSTEM                     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  Browser URL:                                    │  │
│  │    /posts/show/123?tab=comments&page=2           │  │
│  │         ↓                                         │  │
│  │                                                   │  │
│  │  RouterContext                                   │  │
│  │    ↓ provides                                    │  │
│  │    - parse: () => ParseFunction                  │  │
│  │      (Factory returning parse function)          │  │
│  │         │                                         │  │
│  │         ↓ accessed via                           │  │
│  │                                                   │  │
│  │  useParse ✅ (THIS HOOK)                         │  │
│  │    → Parse current route information             │  │
│  │         │                                         │  │
│  │         ├──→ ACCESSOR PATTERN:                   │  │
│  │         │     Access RouterContext.parse          │  │
│  │         │                                         │  │
│  │         ├──→ FACTORY PATTERN:                    │  │
│  │         │     Returns parse function             │  │
│  │         │                                         │  │
│  │         ├──→ MEMOIZATION:                        │  │
│  │         │     Cache function (useMemo)           │  │
│  │         │                                         │  │
│  │         └──→ NULL SAFETY:                        │  │
│  │               Fallback to empty object           │  │
│  │                                                   │  │
│  │         ↓ returns ParseResponse                  │  │
│  │                                                   │  │
│  │  ParseResponse {                                 │  │
│  │    resource: IResourceItem                       │  │
│  │    action: "list" | "show" | "edit" | ...        │  │
│  │    id: BaseKey                                   │  │
│  │    pathname: string                              │  │
│  │    params: {                                     │  │
│  │      filters: CrudFilter[]                       │  │
│  │      sorters: CrudSort[]                         │  │
│  │      currentPage: number                         │  │
│  │      pageSize: number                            │  │
│  │      ... custom params                           │  │
│  │    }                                             │  │
│  │  }                                               │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useParsed (alias with live updates)         │  │
│  │    - useTable (get filters/sorters from URL)     │  │
│  │    - useResource (detect current resource)       │  │
│  │    - useBreadcrumb (build breadcrumb from route) │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Parse current route to extract resource, action, ID, and query parameters**

### 1.2 Route Parsing Flow

```
┌──────────────────────────────────────────────────────────────┐
│         ROUTE PARSING - From URL to Structured Data         │
└──────────────────────────────────────────────────────────────┘

Browser URL:
/posts/show/123?filters[0][field]=status&filters[0][value]=published&page=2

           ↓

useParse() returns parse function
           ↓

parse() extracts information:

1. Pathname: "/posts/show/123"
   ↓
2. Match resource: "posts" → postsResource
   ↓
3. Match action: "show"
   ↓
4. Extract ID: 123
   ↓
5. Parse query params:
   - filters: [{ field: "status", value: "published" }]
   - currentPage: 2

           ↓

ParseResponse {
  resource: postsResource,
  action: "show",
  id: 123,
  pathname: "/posts/show/123",
  params: {
    filters: [{ field: "status", value: "published" }],
    currentPage: 2
  }
}

           ↓

Used by components to:
- Show correct resource
- Render correct view (show page)
- Load correct record (ID 123)
- Apply filters and pagination
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-parse/index.tsx: 29 dòng** - Route parser accessor!

---

### 2.1 Accessor Pattern - RouterContext Access

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: GPS Location Reader

```
GPS System (Complex):
- Satellite signals
- Triangulation algorithms
- Map database
- Many internal systems

GPS App (Simple):
- "Get Current Location" button
- Shows: Latitude, Longitude, Address
- Don't need to know how GPS works

useParse:

RouterContext.parse (Complex):
- URL parsing
- Route matching
- Resource detection
- Query string parsing

useParse (Simple):
- Returns parse function
- Shows: resource, action, id, params
- Don't need to know router internals
```

**Accessor Pattern** = Provide simple access to complex system functionality.

#### Implementation:

```typescript
export const useParse: UseParseType = () => {
  const routerContext = useContext(RouterContext);

  // ACCESSOR: Get parse factory from context
  const useParse = React.useMemo(
    () => routerContext?.parse ?? fallback,
    [routerContext?.parse],
  );

  // Call factory to get parse function
  const parse = useParse();

  return parse;
};

// USAGE (Clean):
const parse = useParse();
const { resource, action, id, params } = parse();
// Simple access to route information! ✅
```

#### Why This Pattern?

```typescript
// ❌ WITHOUT accessor (complex):
import { RouterContext } from "@contexts/router";

const Component = () => {
  const router = useContext(RouterContext);
  const parseFactory = router?.parse;
  const parse = parseFactory ? parseFactory() : () => ({});
  const info = parse();
  // Complex! ❌
};

// ✅ WITH accessor (simple):
import { useParse } from "@refinedev/core";

const Component = () => {
  const parse = useParse();
  const info = parse();
  // Simple! ✅
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simple API** - One function to call
- ✅ **Encapsulation** - Hide router complexity
- ✅ **Consistent** - Same API across routers
- ✅ **Discoverable** - Easy to find hook

---

### 2.2 Factory Pattern - Parse Function Generator

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Photo Developer Machine

```
Old Photo Lab:

Developer Machine:
- NOT instant camera
- NOT developed photos
- MACHINE that develops photos

You:
1. Get developer machine
2. Feed film to machine
3. Get developed photos

useParse:

Hook:
- NOT route information
- NOT parsed data
- FUNCTION that parses route

You:
1. Get parse function
2. Call parse function
3. Get route information
```

**Factory Pattern** = Return function that creates things (instead of creating directly).

#### Implementation:

```typescript
// HOOK RETURNS FACTORY:
export const useParse = () => {
  const routerContext = useContext(RouterContext);

  // Get factory from context
  const parseFactory = routerContext?.parse;

  // Call factory to get parse function
  const parse = parseFactory ? parseFactory() : () => ({});

  return parse; // ← Return function (not data)
};

// USAGE (Call factory result):
const parse = useParse(); // Get parse function

// Call it to get current route info:
const info1 = parse(); // Current route

// When URL changes, call again:
const info2 = parse(); // Updated route

// One hook, always fresh data! ✅
```

#### Why Factory Instead of Direct Data?

```typescript
// ❌ ALTERNATIVE: Return data directly
const routeInfo = useParse();
// Static snapshot! Changes not reflected! ❌

// ✅ CURRENT: Return function
const parse = useParse();
const routeInfo = parse();
// Call whenever needed for fresh data! ✅

// React to URL changes:
useEffect(() => {
  const info = parse(); // Fresh data!
  console.log("Route:", info);
}, [location]); // Re-run when location changes
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Fresh data** - Get current route on demand
- ✅ **Reactive** - Responds to URL changes
- ✅ **Flexible** - Call when needed
- ✅ **Performance** - Don't parse until needed

---

### 2.3 Memoization Pattern - Performance Optimization

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Phone Contacts Cache

```
Phone Without Cache:
Every time you want to call:
1. Open contacts app
2. Search database
3. Find contact
4. Get number
(Slow!)

Phone With Cache:
First time: Search and cache
Later: Read from cache instantly!
(Fast!)

useParse Without Memo:
Every render:
1. Access context
2. Get parse factory
3. Call factory
4. Get parse function
(Slow!)

useParse With Memo:
First render: Create parse function
Later renders: Reuse same function!
(Fast!)
```

**Memoization** = Cache expensive computation results for reuse.

#### Implementation:

```typescript
// WITHOUT MEMOIZATION (Creates new function every render):
export const useParse = () => {
  const routerContext = useContext(RouterContext);
  const parse = routerContext?.parse?.() ?? (() => ({}));
  return parse; // New function every render! ❌
};

// WITH MEMOIZATION (Reuses function):
export const useParse = () => {
  const routerContext = useContext(RouterContext);

  const useParse = React.useMemo(
    () => routerContext?.parse ?? (() => () => ({})),
    [routerContext?.parse], // Only recreate if this changes
  );

  const parse = useParse();
  return parse; // Same function if context unchanged! ✅
};
```

#### Performance Impact:

```tsx
// Component with parse in dependency array:
function RouteInfo() {
  const parse = useParse();

  useEffect(() => {
    const info = parse();
    console.log("Route changed:", info);
    // Without memo: Runs every render ❌
    // With memo: Runs only when route changes ✅
  }, [parse]);
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid unnecessary recreations
- ✅ **Stable reference** - Same function across renders
- ✅ **Dependency arrays** - Won't trigger effects unnecessarily
- ✅ **Optimization** - Better React performance

---

### 2.4 Null Safety Pattern - Graceful Fallback

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Weather App

```
Weather App:

GPS Available:
- Get location
- Show local weather

GPS Unavailable:
- Show default location
- App still works!

useParse:

Router Available:
- Parse current route
- Return route info

Router Unavailable:
- Return empty object {}
- App doesn't crash!
```

**Null Safety** = Handle missing values gracefully without errors.

#### Implementation:

```typescript
export const useParse = () => {
  const routerContext = useContext(RouterContext);

  // FALLBACK PATTERN:
  const useParse = React.useMemo(
    () =>
      routerContext?.parse ?? // Try router's parse
      (() => () => ({})), // Fallback: empty object
    [routerContext?.parse],
  );

  const parse = useParse();
  return parse; // Always safe to call! ✅
};
```

#### Safety Layers:

```typescript
// LAYER 1: Optional chaining
routerContext?.parse;
// If routerContext is null/undefined → undefined ✅

// LAYER 2: Nullish coalescing
routerContext?.parse ?? (() => () => ({}));
// If undefined → fallback factory ✅

// LAYER 3: Call factory
const parse = useParse();
// If fallback → returns function that returns {} ✅

// RESULT: Always safe!
const info = parse(); // Never crashes! ✅
```

#### Real-World Scenarios:

```typescript
// SCENARIO 1: Router not initialized
// (During app initialization)
const parse = useParse();
const info = parse(); // → {} (empty, safe) ✅

// SCENARIO 2: Router context missing
// (In tests without provider)
const parse = useParse();
const info = parse(); // → {} (empty, safe) ✅

// SCENARIO 3: Custom router without parse
// (Minimal router implementation)
const parse = useParse();
const info = parse(); // → {} (empty, safe) ✅

// SCENARIO 4: Normal router
const parse = useParse();
const info = parse();
// → { resource, action, id, params } ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Robustness** - Doesn't crash
- ✅ **Testing** - Works without router provider
- ✅ **Compatibility** - Works with partial implementations
- ✅ **Developer experience** - Safe to use anywhere

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường | Giải quyết vấn đề gì         | Trong useParse                           |
| --------------- | ---------------- | ---------------------------- | ---------------------------------------- |
| **Accessor**    | GPS app          | Access complex system        | Get parse function from RouterContext    |
| **Factory**     | Photo developer  | Return creator, not creation | Returns parse function, not data         |
| **Memoization** | Contacts cache   | Cache results                | Reuse same parse function across renders |
| **Null Safety** | Weather default  | Handle missing values        | Graceful fallback to empty object        |

---

## 3. KEY FEATURES

### 3.1 ParseResponse Structure

```typescript
type ParseResponse = {
  resource?: IResourceItem;   // Current resource
  action?: Action;             // Current action
  id?: BaseKey;                // Current ID
  pathname?: string;           // Current pathname
  params?: {                   // Query parameters
    filters?: CrudFilter[];    // Filters
    sorters?: CrudSort[];      // Sorting
    currentPage?: number;      // Pagination
    pageSize?: number;         // Page size
    ...customParams            // Custom params
  };
};
```

### 3.2 Return Value - Parse Function

```typescript
const parse = useParse();
// Type: () => ParseResponse

// Call to get current route info:
const info = parse();
```

### 3.3 Router Agnostic

```typescript
// Works with any router:
// - React Router
// - Next.js Router
// - Remix Router
// - Custom routers

const parse = useParse();
// Same API everywhere! ✅
```

### 3.4 Safe to Call Anywhere

```typescript
// Even without router:
const parse = useParse();
const info = parse(); // Returns {} (no error!) ✅
```

---

## 4. COMMON USE CASES

### 4.1 Get Current Resource

```tsx
import { useParse } from "@refinedev/core";

function ResourceInfo() {
  const parse = useParse();
  const { resource } = parse();

  return <h1>{resource?.label}</h1>;
}
```

### 4.2 Get Current Action

```tsx
function ActionBadge() {
  const parse = useParse();
  const { action } = parse();

  return <span className={`badge-${action}`}>{action}</span>;
}
```

### 4.3 Get Current ID

```tsx
function RecordId() {
  const parse = useParse();
  const { id } = parse();

  if (!id) return null;

  return <div>Viewing record #{id}</div>;
}
```

### 4.4 Get URL Parameters

```tsx
function TableFilters() {
  const parse = useParse();
  const { params } = parse();

  const filters = params?.filters || [];
  const currentPage = params?.currentPage || 1;

  return (
    <div>
      <div>Filters: {filters.length}</div>
      <div>Page: {currentPage}</div>
    </div>
  );
}
```

### 4.5 Conditional Rendering Based on Route

```tsx
function ConditionalComponent() {
  const parse = useParse();
  const { resource, action } = parse();

  if (resource?.name === "posts" && action === "list") {
    return <PostsListHeader />;
  }

  if (resource?.name === "posts" && action === "show") {
    return <PostShowHeader />;
  }

  return <DefaultHeader />;
}
```

### 4.6 Breadcrumb from Route

```tsx
function Breadcrumb() {
  const parse = useParse();
  const { resource, action, id } = parse();

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

### 5.1 Why Factory Pattern?

**Answer:** Router initialization timing and fresh data

```typescript
// PROBLEM: Router might not be ready at hook call time
// Also, we want FRESH data on each call

// SOLUTION: Factory returns function when called
RouterContext.parse = () => () => getCurrentRouteInfo();
//                    ↑    ↑
//                    |    └─ Actual parse function
//                    └────── Factory (called when needed)

// Hook calls factory at runtime (when router is ready):
const parseFactory = routerContext.parse;
const parse = parseFactory(); // Router is ready now! ✅

// Every call to parse() gets FRESH data:
const info1 = parse(); // Current route
// URL changes...
const info2 = parse(); // Updated route ✅
```

### 5.2 Why useMemo Dependency on routerContext?.parse?

**Answer:** Detect router changes

```typescript
// Recreate parse function only when router's parse changes:
React.useMemo(
  () => routerContext?.parse ?? fallback,
  [routerContext?.parse], // Changes if router switches
);

// Scenarios:
// 1. Router not changed → Reuse same function ✅
// 2. Router switched → Create new function ✅
// 3. Router became available → Create real function ✅
```

### 5.3 Why Return Empty Object Instead of Undefined?

**Answer:** Consistent destructuring

```typescript
// ❌ WITH undefined:
const { resource, action } = parse() || {};
// Need fallback every time! ❌

// ✅ WITH empty object:
const { resource, action } = parse();
// Always safe to destructure! ✅
// resource and action are just undefined (not error)
```

### 5.4 Why Not Return Data Directly?

**Answer:** Fresh data on demand

```typescript
// ❌ ALTERNATIVE: Return snapshot
const info = useParse(); // Static snapshot
// URL changes → Still shows old info ❌

// ✅ CURRENT: Return function
const parse = useParse(); // Function
const info = parse(); // Call for current info
// URL changes → Call again for fresh info ✅
```

---

## 6. DIFFERENCE FROM useParsed

### useParse vs useParsed

```typescript
// useParse: Manual, on-demand
const parse = useParse();
const info = parse(); // Get current info
// Must call parse() each time you need info

// useParsed: Auto-updating, reactive
const info = useParsed(); // Always current
// Automatically updates when route changes ✅

// useParsed uses useParse internally!
```

### When to Use Each

```typescript
// USE useParse:
// - Need parse function in logic
// - Manual control of when to parse
// - Building custom hooks

// USE useParsed:
// - Need current route info in component
// - Want automatic updates
// - Standard use cases (most common)
```

---

## 7. COMMON PITFALLS

### 7.1 Forgetting to Call Parse Function

```typescript
// ❌ WRONG - Not calling the function
const parse = useParse();
console.log(parse); // Function, not data! ❌

// ✅ CORRECT - Call the function
const parse = useParse();
const info = parse(); // Data! ✅
console.log(info);
```

### 7.2 Not Handling Empty Response

```typescript
// ❌ RISKY - Assuming data exists
const parse = useParse();
const { resource } = parse();
const name = resource.name;  // Error if resource is undefined! ❌

// ✅ SAFE - Optional chaining
const { resource } = parse();
const name = resource?.name;  ✅
```

### 7.3 Using Instead of useParsed

```typescript
// ❌ INEFFICIENT - Manual updates
const parse = useParse();
const [info, setInfo] = useState(parse());

useEffect(() => {
  setInfo(parse()); // Manual sync ❌
}, [location]);

// ✅ BETTER - Use useParsed
const info = useParsed(); // Auto-updates! ✅
```

### 7.4 Not Keeping in Dependency Array

```typescript
// ❌ RISKY - Missing dependency
const parse = useParse();

useEffect(() => {
  const info = parse();
  // Uses parse but not in deps
}, []); // ❌ Missing [parse]

// ✅ CORRECT - Include parse
useEffect(() => {
  const info = parse();
}, [parse]); ✅
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useParse } from "@refinedev/core";

describe("useParse", () => {
  it("should return parse function from router", () => {
    const mockParse = jest.fn(() => ({
      resource: postsResource,
      action: "list",
    }));

    const mockRouter = {
      parse: () => mockParse,
    };

    const wrapper = ({ children }) => (
      <RouterContext.Provider value={mockRouter}>
        {children}
      </RouterContext.Provider>
    );

    const { result } = renderHook(() => useParse(), { wrapper });

    const info = result.current();
    expect(info.resource).toBe(postsResource);
    expect(info.action).toBe("list");
  });

  it("should return empty object when router not available", () => {
    const wrapper = ({ children }) => (
      <RouterContext.Provider value={null}>{children}</RouterContext.Provider>
    );

    const { result } = renderHook(() => useParse(), { wrapper });

    const info = result.current();
    expect(info).toEqual({});
  });

  it("should memoize parse function", () => {
    const mockParse = jest.fn(() => ({}));
    const mockRouter = {
      parse: () => mockParse,
    };

    const wrapper = ({ children }) => (
      <RouterContext.Provider value={mockRouter}>
        {children}
      </RouterContext.Provider>
    );

    const { result, rerender } = renderHook(() => useParse(), { wrapper });

    const firstParse = result.current;
    rerender();
    const secondParse = result.current;

    expect(firstParse).toBe(secondParse); // Same reference!
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Access RouterContext.parse function
- ✅ **Factory**: Returns parse function, not data
- ✅ **Memoization**: Cache parse function for performance
- ✅ **Null Safety**: Graceful fallback to empty object

### Key Features

1. **Parse Function** - Returns function, not data
2. **Fresh Data** - Call parse() for current route info
3. **Structured Response** - resource, action, id, params
4. **Safe** - Never crashes, even without router
5. **Memoized** - Stable reference for dependency arrays

### Khi nào dùng useParse?

✅ **Nên dùng:**

- Building custom hooks needing parse logic
- Manual control of when to parse
- Need parse function (not just data)

❌ **Không dùng:**

- Just need current route info → Use `useParsed()` (auto-updating)
- Most component use cases → Use `useParsed()`

### Parse Function Returns

```typescript
{
  resource?: IResourceItem,
  action?: Action,
  id?: BaseKey,
  pathname?: string,
  params?: {
    filters?: CrudFilter[],
    sorters?: CrudSort[],
    currentPage?: number,
    pageSize?: number,
    ...customParams
  }
}
```

### Remember

✅ **29 lines** - Route parser accessor
🔑 **Accessor Pattern** - Get parse from RouterContext
🏭 **Factory Pattern** - Returns function, not data
💾 **Memoization** - Stable function reference
🛡️ **Null Safety** - Empty object fallback

---

> 📚 **Best Practice**: For most use cases, prefer **`useParsed()`** (auto-updating). Use **`useParse()`** when building custom hooks or need manual control. The parse function **returns fresh data** on each call - perfect for getting current route info on demand. **Always call the function** - `parse()` not just `parse`!
