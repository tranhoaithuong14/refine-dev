# Kiến trúc và Design Patterns của useRefreshButton Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           CACHE INVALIDATION SYSTEM              │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  React Query Cache                               │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  useInvalidate                                   │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  useRefreshButton ✅ (THIS HOOK)                 │  │
│  │    (Invalidate detail query)                     │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Returns:                                        │  │
│  │    - onClick: () => void                         │  │
│  │    - label: string                               │  │
│  │    - loading: boolean                            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có 1 mục đích cực kỳ đơn giản:**

> **Provide refresh button functionality that invalidates current resource's detail query, forcing React Query to refetch fresh data from the server**

### 1.2 Complete Refresh Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    REFRESH BUTTON FLOW                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User Views Detail Page                             │
│  URL: /posts/show/123                                        │
│  → useOne fetches post #123                                 │
│  → Data cached in React Query                               │
│  → Shows: "Hello World" (title)                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Data Changes on Server                             │
│  Another user edits post #123                               │
│  Server now has: "Hello Universe" (new title)               │
│  BUT current page still shows: "Hello World" (stale cache)  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Render Refresh Button                              │
│  const { onClick, label, loading } =                         │
│    useRefreshButton({                                        │
│      resource: "posts",                                      │
│      id: 123                                                 │
│    });                                                       │
│                                                              │
│  <button onClick={onClick} disabled={loading}>               │
│    {label} {/* "Refresh" */}                                │
│  </button>                                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: User Clicks Refresh Button                         │
│  onClick() called                                            │
│    ↓                                                         │
│  invalidates({                                               │
│    resource: "posts",                                        │
│    id: 123,                                                  │
│    invalidates: ["detail"]                                   │
│  })                                                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: React Query Invalidates Cache                      │
│  → Marks "posts.one.123" query as stale                     │
│  → Triggers automatic refetch                               │
│  → loading = true (isFetching)                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Fetch Fresh Data                                   │
│  → dataProvider.getOne({ resource: "posts", id: 123 })      │
│  → Server returns: { title: "Hello Universe" }             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: UI Updates with Fresh Data                         │
│  → Cache updated with new data                              │
│  → UI re-renders                                            │
│  → Shows: "Hello Universe" ✅                               │
│  → loading = false                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này chỉ 63 dòng** - Small but powerful!

---

### 2.1 Command Pattern - Pattern "Lệnh Đóng Gói"

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: Game Controller Button

```
Video Game Controller:

Button mapping:
- A button: Jump
- B button: Attack
- X button: Reload
- Y button: Refresh inventory

Each button = Command
Press button → Execute command

Same for refresh button:
Click button → Execute "invalidate cache" command
```

**Command Pattern** = Encapsulate action as object

#### Implementation in useRefreshButton:

```typescript
// onClick = Command object
const onClick = () => {
  // COMMAND: Invalidate detail query
  invalidates({
    id, // ← Which item to refresh
    invalidates: ["detail"], // ← Which query type to invalidate
    dataProviderName: props.dataProviderName,
    resource: identifier, // ← Which resource
  });
};

// Usage - Execute command:
<button onClick={onClick}>Refresh</button>;
```

#### ❌ KHÔNG có Command Pattern:

```tsx
// BAD - Component has refresh logic

function RefreshButton({ resource, id }) {
  const invalidates = useInvalidate();
  const { identifier } = useResourceParams({ resource, id });

  // Inline logic ❌
  const handleClick = () => {
    invalidates({
      id,
      invalidates: ["detail"],
      resource: identifier,
    });
  };

  return <button onClick={handleClick}>Refresh</button>;
}

// Problems:
// - Logic scattered in components
// - Hard to reuse
// - Inconsistent across app
```

#### ✅ CÓ Command Pattern:

```tsx
// GOOD - Hook encapsulates command

function RefreshButton({ resource, id }) {
  const { onClick, label, loading } = useRefreshButton({
    resource,
    id,
  });

  return (
    <button onClick={onClick} disabled={loading}>
      {label}
    </button>
  );
}

// Simple! Command encapsulated in hook ✅
```

#### Visual Representation:

```
┌─────────────────────────────────────────────────────┐
│              COMMAND PATTERN FLOW                   │
└─────────────────────────────────────────────────────┘

User Action (Simple):
  Click "Refresh" button
                    │
                    ▼
        ┌───────────────────────┐
        │  onClick Command      │ ← COMMAND
        │  (Encapsulated)       │
        └───────────────────────┘
                    │
                    ▼
Complex Operation:
  1. Resolve resource params
  2. Build query key
  3. Invalidate cache
  4. Trigger refetch
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - All refresh logic in one place
- ✅ **Reusability** - Same command everywhere
- ✅ **Testability** - Test command independently
- ✅ **Maintainability** - Change once, apply everywhere

---

### 2.2 Observer Pattern - Pattern "Quan Sát"

#### 📺 VÍ DỤ ĐỜI THƯỜNG: Live TV Updates

```
Live News Broadcast:

News station broadcasts → All TVs update
Weather changes → All weather apps update
Stock price changes → All trading apps update

Observer pattern:
- Observable: News station (data source)
- Observers: TVs, apps (consumers)

When observable changes → Notify all observers
```

**Observer Pattern** = Notify interested parties when state changes

#### Implementation:

```typescript
// From useRefreshButton (lines 38-44)

const loading = !!queryClient.isFetching({
  queryKey: keys()
    .data(pickDataProvider(identifier, props.dataProviderName, resources))
    .resource(identifier)
    .action("one")
    .get(),
});

// Hook OBSERVES React Query's fetch state:
// - isFetching = true → loading = true
// - isFetching = false → loading = false

// Multiple components can observe same query:
```

#### Real Example:

```tsx
// Component 1: Refresh Button
function RefreshButton({ resource, id }) {
  const { loading } = useRefreshButton({ resource, id });
  return <button disabled={loading}>Refresh</button>;
  // Shows loading state ✅
}

// Component 2: Data Display
function PostDetail({ id }) {
  const { data, isFetching } = useOne({ resource: "posts", id });
  return (
    <div style={{ opacity: isFetching ? 0.5 : 1 }}>
      {data?.title}
    </div>
  );
  // Shows loading via opacity ✅
}

// Component 3: Loading Spinner
function LoadingIndicator({ resource, id }) {
  const queryClient = useQueryClient();
  const isFetching = queryClient.isFetching({ ... });

  if (!isFetching) return null;
  return <Spinner />;
  // Shows global spinner ✅
}

// All THREE components observe same query state!
// When refresh button clicked:
// → All THREE components update automatically! ✅
```

#### Visual Flow:

```
Click Refresh Button
        │
        ▼
Invalidate Cache
        │
        ▼
React Query Refetches
        │
        ├──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼
    Button     Detail    Spinner    Other
   loading=T   opacity    shown    components

All observers notified automatically! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reactive** - UI updates automatically
- ✅ **Decoupled** - Components don't know about each other
- ✅ **Automatic** - No manual state management
- ✅ **React Query** - Built-in observer pattern

---

### 2.3 Facade Pattern - Pattern "Mặt Tiền Đơn Giản"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: One-Click Refresh

```
Browser Refresh Button:

Behind the scenes (complex):
1. Clear cache
2. Abort pending requests
3. Re-request all resources
4. Re-parse HTML
5. Re-execute JavaScript
6. Re-render page

User sees (simple):
Click "Refresh" button → Page reloads

Facade hides complexity!
```

**Facade Pattern** = Simple interface hiding complex subsystem

#### Implementation:

```typescript
// useRefreshButton = Facade over 5+ operations

export function useRefreshButton(props) {
  // SUBSYSTEM 1: Translation
  const translate = useTranslate();

  // SUBSYSTEM 2: Query keys
  const { keys } = useKeys();

  // SUBSYSTEM 3: Query client
  const queryClient = useQueryClient();

  // SUBSYSTEM 4: Invalidation
  const invalidates = useInvalidate();

  // SUBSYSTEM 5: Resource resolution
  const { identifier, id, resources } = useResourceParams({ ... });

  // FACADE: Simple interface
  const onClick = () => invalidates({ ... });
  const loading = queryClient.isFetching({ ... });
  const label = translate("buttons.refresh", "Refresh");

  return { onClick, label, loading };
}
```

#### ❌ KHÔNG có Facade:

```tsx
// BAD - Component must handle 5 subsystems

function RefreshButton({ resource, id }) {
  const translate = useTranslate();
  const { keys } = useKeys();
  const queryClient = useQueryClient();
  const invalidates = useInvalidate();
  const {
    identifier,
    id: resolvedId,
    resources,
  } = useResourceParams({ resource, id });

  const onClick = () => {
    invalidates({
      id: resolvedId,
      invalidates: ["detail"],
      resource: identifier,
    });
  };

  const loading = !!queryClient.isFetching({
    queryKey: keys()
      .data(pickDataProvider(identifier, undefined, resources))
      .resource(identifier)
      .action("one")
      .get(),
  });

  const label = translate("buttons.refresh", "Refresh");

  return (
    <button onClick={onClick} disabled={loading}>
      {label}
    </button>
  );
}

// Too complex! ❌
```

#### ✅ CÓ Facade Pattern:

```tsx
// GOOD - Simple facade

function RefreshButton({ resource, id }) {
  const { onClick, label, loading } = useRefreshButton({
    resource,
    id,
  });

  return (
    <button onClick={onClick} disabled={loading}>
      {label}
    </button>
  );
}

// Simple! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - 1 hook instead of 5
- ✅ **Usability** - Easy to use correctly
- ✅ **Consistency** - Same behavior everywhere
- ✅ **DRY** - No duplication

---

### 2.4 Cache Invalidation Pattern

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Browser Cache Refresh

```
Website Caching:

Normal visit:
  User visits site → Load from cache (fast!)

After website update:
  User visits site → Still shows old cached version ❌

Solution: Cache invalidation
  Developer: "Invalidate cache!"
  User visits site → Force fetch new version ✅

Same for React Query cache!
```

**Cache Invalidation** = Mark cached data as stale, trigger refetch

#### Implementation:

```typescript
// From useRefreshButton (lines 46-53)

const onClick = () => {
  invalidates({
    id,
    invalidates: ["detail"], // ← Invalidate ONLY detail query
    dataProviderName: props.dataProviderName,
    resource: identifier,
  });
};

// What happens:
// 1. Mark query as stale
// 2. Trigger automatic refetch
// 3. Update cache with fresh data
// 4. Re-render UI
```

#### Why `invalidates: ["detail"]`?

```typescript
// Resource queries:
// - "list": GET /posts → [post1, post2, ...]
// - "detail": GET /posts/123 → { id: 123, title: "..." }
// - "many": GET /posts?ids=1,2,3 → [post1, post2, post3]

// Refresh button on detail page:
// → Only invalidate "detail" query ✅
// → Don't invalidate "list" (unnecessary)
// → Don't invalidate "many" (unnecessary)

// Why?
// - Efficient: Only refetch what's needed
// - Fast: Fewer API calls
// - Focused: Update current view only

// Example:
// User on /posts/show/123
// Clicks refresh
// → Refetch ONLY post #123 ✅
// → List of posts NOT refetched ✅
```

#### Visual Representation:

```
┌─────────────────────────────────────────────────────┐
│           CACHE INVALIDATION STRATEGY               │
└─────────────────────────────────────────────────────┘

React Query Cache:
  ┌─────────────────────┐
  │ posts.list          │ ← NOT invalidated
  ├─────────────────────┤
  │ posts.detail.123 ❌ │ ← INVALIDATED (stale)
  ├─────────────────────┤
  │ posts.many.[1,2,3]  │ ← NOT invalidated
  └─────────────────────┘
            │
            ▼
  Automatic Refetch:
    GET /posts/123
            │
            ▼
  Cache Updated:
  ┌─────────────────────┐
  │ posts.list          │
  ├─────────────────────┤
  │ posts.detail.123 ✅ │ ← Fresh data
  ├─────────────────────┤
  │ posts.many.[1,2,3]  │
  └─────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Targeted** - Invalidate only what's needed
- ✅ **Efficient** - Reduce unnecessary API calls
- ✅ **Fast** - Quick refresh
- ✅ **Smart** - React Query handles refetch automatically

---

### 2.5 Loading State Pattern (Derived State)

#### ⏳ VÍ DỤ ĐỜI THƯỜNG: Download Progress Bar

```
File Download:

Progress calculated from:
- Bytes downloaded
- Total file size

Progress = (downloaded / total) × 100%

Derived state: Progress is CALCULATED, not stored separately

Same for loading state:
loading = isFetching (query state)
```

**Derived State** = Calculate state from other states, don't store separately

#### Implementation:

```typescript
// From useRefreshButton (lines 38-44)

const loading = !!queryClient.isFetching({
  queryKey: keys()
    .data(pickDataProvider(identifier, props.dataProviderName, resources))
    .resource(identifier)
    .action("one")
    .get(),
});

// loading is DERIVED from isFetching
// NOT stored in separate state

// Why?
// - Always in sync: loading always reflects actual fetch state
// - Single source of truth: React Query state is source
// - No bugs: Can't get out of sync
```

#### ❌ KHÔNG có Derived State:

```tsx
// BAD - Manual loading state

function useRefreshButton(props) {
  const [loading, setLoading] = useState(false); // ← Manual state ❌
  const invalidates = useInvalidate();

  const onClick = () => {
    setLoading(true);
    invalidates({ ... });
    // Wait... when do we set loading to false? ❌
    // What if request fails? ❌
    // What if component unmounts? ❌
  };

  return { onClick, loading };
}

// Problems:
// - Must manually manage loading state
// - Easy to get out of sync
// - Memory leaks if component unmounts
```

#### ✅ CÓ Derived State:

```tsx
// GOOD - Derive from React Query

function useRefreshButton(props) {
  const queryClient = useQueryClient();

  const loading = !!queryClient.isFetching({ queryKey: ... });
  // ← Always in sync with actual fetch state ✅

  const onClick = () => {
    invalidates({ ... });
    // React Query automatically manages fetch state ✅
    // No manual setLoading needed ✅
  };

  return { onClick, loading };
}
```

#### Flow:

```
User clicks refresh
        │
        ▼
onClick() executes
        │
        ▼
invalidates() called
        │
        ▼
React Query starts refetch
        │
        ▼
isFetching = true (automatic)
        │
        ▼
loading = true (derived)
        │
        ▼
Button shows loading state
        │
        ▼
Refetch completes
        │
        ▼
isFetching = false (automatic)
        │
        ▼
loading = false (derived)
        │
        ▼
Button normal state

All automatic! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Always in sync** - Can't get out of sync
- ✅ **No bugs** - React Query handles state
- ✅ **Automatic** - No manual state management
- ✅ **Clean** - Less code

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                | Ví dụ đời thường  | Giải quyết vấn đề gì    | Trong useRefreshButton            |
| ---------------------- | ----------------- | ----------------------- | --------------------------------- |
| **Command**            | Game button       | Encapsulate action      | onClick encapsulates invalidation |
| **Observer**           | Live TV updates   | Notify on state changes | Observe React Query fetch state   |
| **Facade**             | Browser refresh   | Hide complexity         | Simple interface over 5 hooks     |
| **Cache Invalidation** | Browser cache     | Force fetch new data    | Invalidate detail query           |
| **Derived State**      | Download progress | Calculate from source   | loading derived from isFetching   |

---

## 3. KEY FEATURES

### 3.1 Simple API

```typescript
const { onClick, label, loading } = useRefreshButton({
  resource: "posts",
  id: 123,
});

// onClick: () => void
//   - Invalidates detail query
//   - Triggers automatic refetch

// label: string
//   - "Refresh" or "Làm mới" (i18n)

// loading: boolean
//   - true: Query is refetching
//   - false: Query idle
```

### 3.2 Targeted Invalidation

```typescript
// Only invalidates "detail" query
invalidates({
  id,
  invalidates: ["detail"], // ← NOT "list", NOT "many"
  resource: identifier,
});

// Why?
// - Efficient: Only refetch current item
// - Fast: Single API call
// - Focused: Update what user is viewing
```

### 3.3 Automatic Loading State

```typescript
// No manual loading management needed!

const onClick = () => {
  invalidates({ ... });
  // That's it! ✅
  // React Query handles loading state automatically
};

const loading = !!queryClient.isFetching({ queryKey: ... });
// Derived from React Query state ✅
```

### 3.4 Data Provider Support

```typescript
// Multi-provider support
const { onClick } = useRefreshButton({
  resource: "posts",
  id: 123,
  dataProviderName: "customProvider", // ← Specific provider
});

// Useful for:
// - Multi-tenant apps
// - Microservices
// - Different backends per resource
```

---

## 4. COMMON USE CASES

### 4.1 Basic Refresh Button

```tsx
import { useRefreshButton } from "@refinedev/core";

function RefreshButton({ resource, id }) {
  const { onClick, label, loading } = useRefreshButton({
    resource,
    id,
  });

  return (
    <button onClick={onClick} disabled={loading}>
      <RefreshIcon />
      {label}
      {loading && <Spinner />}
    </button>
  );
}

// Usage:
<RefreshButton resource="posts" id={123} />;
```

### 4.2 Detail Page Refresh

```tsx
function PostDetail({ id }) {
  const { data } = useOne({ resource: "posts", id });
  const { onClick, loading } = useRefreshButton({
    resource: "posts",
    id,
  });

  return (
    <div>
      <h1>{data?.title}</h1>
      <p>{data?.content}</p>

      <button onClick={onClick} disabled={loading}>
        {loading ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}
```

### 4.3 Refresh with Icon Animation

```tsx
function AnimatedRefreshButton({ resource, id }) {
  const { onClick, loading } = useRefreshButton({ resource, id });

  return (
    <button onClick={onClick}>
      <RefreshIcon
        className={loading ? "spin" : ""}
        style={{
          animation: loading ? "spin 1s linear infinite" : "none",
        }}
      />
      Refresh
    </button>
  );
}

// CSS:
// @keyframes spin {
//   from { transform: rotate(0deg); }
//   to { transform: rotate(360deg); }
// }
```

### 4.4 Refresh in Header

```tsx
function PageHeader({ title, resource, id }) {
  const { onClick, loading } = useRefreshButton({ resource, id });

  return (
    <header>
      <h1>{title}</h1>
      <button onClick={onClick} disabled={loading} title="Refresh data">
        <RefreshIcon />
      </button>
    </header>
  );
}
```

### 4.5 Keyboard Shortcut Refresh

```tsx
function PostDetail({ id }) {
  const { onClick } = useRefreshButton({
    resource: "posts",
    id,
  });

  // Ctrl+R or Cmd+R to refresh
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "r") {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [onClick]);

  return <div>...</div>;
}
```

### 4.6 Auto-Refresh Timer

```tsx
function AutoRefreshDetail({ id }) {
  const { onClick } = useRefreshButton({
    resource: "posts",
    id,
  });

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(onClick, 30000);
    return () => clearInterval(interval);
  }, [onClick]);

  return <div>...</div>;
}
```

---

## 5. INTEGRATION WITH REFINE COMPONENTS

### 5.1 Built-in Refresh Button Components

```tsx
// Refine's UI library packages provide ready-to-use components:

// @refinedev/antd
import { RefreshButton } from "@refinedev/antd";
<RefreshButton recordItemId={123} />;

// @refinedev/mui
import { RefreshButton } from "@refinedev/mui";
<RefreshButton recordItemId={123} />;

// @refinedev/mantine
import { RefreshButton } from "@refinedev/mantine";
<RefreshButton recordItemId={123} />;

// All use useRefreshButton internally! ✅
```

### 5.2 In Detail Pages

```tsx
import { Show } from "@refinedev/antd";

function PostShow() {
  return (
    <Show
      headerButtons={({ defaultButtons }) => (
        <>
          {defaultButtons}
          <RefreshButton /> {/* Auto-detects resource & id */}
        </>
      )}
    >
      <div>...</div>
    </Show>
  );
}
```

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Why Only Invalidate "detail"?

**Question:** Why not invalidate "list" and "many" queries too?

**Answer:**

```typescript
// Refresh button is typically on detail page
// User wants to refresh CURRENT item only

// Efficient approach:
invalidates: ["detail"]; // ← Only current item

// Inefficient approach:
invalidates: ["list", "detail", "many"]; // ← Refetch everything ❌

// Benefits of "detail" only:
// ✅ Faster: Single API call
// ✅ Efficient: Less server load
// ✅ Focused: Update what user sees
// ✅ Intentional: User clicked refresh for THIS item
```

### 6.2 Why Derive Loading from isFetching?

**Reason:** Single source of truth. React Query owns fetch state, we derive loading from it. Prevents synchronization bugs.

```typescript
// ✅ GOOD - Derived state
const loading = !!queryClient.isFetching({ ... });
// Always in sync ✅

// ❌ BAD - Manual state
const [loading, setLoading] = useState(false);
// Can get out of sync ❌
```

### 6.3 Why Return onClick Instead of Imperative refresh()?

**Question:** Why return `onClick` function instead of `refresh()` function?

**Answer:**

```typescript
// onClick clearly indicates:
// → This is for button click handler
// → Semantic and clear

// Usage:
<button onClick={onClick}>Refresh</button>

// vs refresh() would be:
<button onClick={refresh}>Refresh</button>
// Less clear that it's a button handler

// onClick is more semantic ✅
```

---

## 7. TESTING

### 7.1 Unit Test Example

```typescript
import { renderHook, act } from "@testing-library/react";
import { useRefreshButton } from "./useRefreshButton";

// Mock dependencies
jest.mock("../../invalidate");
jest.mock("@tanstack/react-query");

describe("useRefreshButton", () => {
  it("should return onClick handler", () => {
    const { result } = renderHook(() =>
      useRefreshButton({ resource: "posts", id: 123 }),
    );

    expect(result.current.onClick).toBeInstanceOf(Function);
  });

  it("should invalidate detail query on click", () => {
    const invalidates = jest.fn();
    useInvalidate.mockReturnValue(invalidates);

    const { result } = renderHook(() =>
      useRefreshButton({ resource: "posts", id: 123 }),
    );

    act(() => {
      result.current.onClick();
    });

    expect(invalidates).toHaveBeenCalledWith({
      id: 123,
      invalidates: ["detail"],
      resource: "posts",
      dataProviderName: undefined,
    });
  });

  it("should show loading when query is fetching", () => {
    useQueryClient.mockReturnValue({
      isFetching: jest.fn(() => 1), // 1 query fetching
    });

    const { result } = renderHook(() =>
      useRefreshButton({ resource: "posts", id: 123 }),
    );

    expect(result.current.loading).toBe(true);
  });
});
```

### 7.2 Integration Test

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Refine } from "@refinedev/core";

const mockDataProvider = {
  getOne: jest.fn(() =>
    Promise.resolve({
      data: { id: 123, title: "Hello World" },
    }),
  ),
  // ... other methods
};

describe("RefreshButton integration", () => {
  it("should refetch data on click", async () => {
    render(
      <Refine dataProvider={mockDataProvider}>
        <PostDetailWithRefresh id={123} />
      </Refine>,
    );

    // Initial fetch
    await waitFor(() => {
      expect(mockDataProvider.getOne).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByText("Refresh");
    fireEvent.click(refreshButton);

    // Refetch triggered
    await waitFor(() => {
      expect(mockDataProvider.getOne).toHaveBeenCalledTimes(2);
    });
  });
});
```

---

## 8. COMMON PITFALLS

### 8.1 Forgetting Resource or ID

```tsx
// ❌ WRONG - No resource
const { onClick } = useRefreshButton({ id: 123 });
// Can't invalidate without resource!

// ❌ WRONG - No ID
const { onClick } = useRefreshButton({ resource: "posts" });
// Can't refresh detail without ID!

// ✅ CORRECT
const { onClick } = useRefreshButton({
  resource: "posts",
  id: 123,
});
```

### 8.2 Using on List Page

```tsx
// ❌ WRONG - Refresh button on list page
function PostList() {
  const { onClick } = useRefreshButton({
    resource: "posts",
    // No ID! ❌
  });

  return (
    <>
      <button onClick={onClick}>Refresh List</button>
      <PostsTable />
    </>
  );
}

// ✅ CORRECT - Use custom invalidation
function PostList() {
  const invalidates = useInvalidate();

  const refreshList = () => {
    invalidates({
      resource: "posts",
      invalidates: ["list"], // ← Invalidate list, not detail
    });
  };

  return (
    <>
      <button onClick={refreshList}>Refresh List</button>
      <PostsTable />
    </>
  );
}
```

### 8.3 Manual Loading State

```tsx
// ❌ WRONG - Manual loading state
function RefreshButton({ id }) {
  const [loading, setLoading] = useState(false); // ← Don't do this!
  const { onClick } = useRefreshButton({ resource: "posts", id });

  const handleClick = () => {
    setLoading(true);
    onClick();
    // When to set false? ❌
  };

  return <button onClick={handleClick}>...</button>;
}

// ✅ CORRECT - Use returned loading
function RefreshButton({ id }) {
  const { onClick, loading } = useRefreshButton({
    resource: "posts",
    id,
  });

  return (
    <button onClick={onClick} disabled={loading}>
      ...
    </button>
  );
}
```

---

## 9. PERFORMANCE CONSIDERATIONS

### 9.1 Query Key Generation

```typescript
// Query key is generated on every render
const loading = !!queryClient.isFetching({
  queryKey: keys()  // ← Function call
    .data(pickDataProvider(...))  // ← Function call
    .resource(identifier)  // ← Function call
    .action("one")  // ← Function call
    .get(),  // ← Function call
});

// This is OK because:
// ✅ React Query caches query lookups
// ✅ Keys are memoized internally
// ✅ Negligible performance impact
```

### 9.2 Refresh Frequency

```typescript
// ⚠️ CAUTION - Don't refresh too frequently!

// ❌ BAD - Refresh every second
useEffect(() => {
  const interval = setInterval(onClick, 1000); // Too fast!
  return () => clearInterval(interval);
}, [onClick]);

// ✅ GOOD - Reasonable refresh interval
useEffect(() => {
  const interval = setInterval(onClick, 30000); // Every 30s
  return () => clearInterval(interval);
}, [onClick]);

// Better: Use React Query's refetchInterval
const { data } = useOne({
  resource: "posts",
  id: 123,
  refetchInterval: 30000, // Built-in auto-refetch ✅
});
```

---

## 10. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: onClick encapsulates invalidation
- ✅ **Observer**: Watch React Query fetch state
- ✅ **Facade**: Simple interface over 5 hooks
- ✅ **Cache Invalidation**: Targeted detail query refresh
- ✅ **Derived State**: loading from isFetching

### Key Features

1. **Simple** - 3 return values (onClick, label, loading)
2. **Targeted** - Only invalidates detail query
3. **Automatic** - React Query handles refetch
4. **Efficient** - Single API call
5. **Type-safe** - TypeScript support
6. **i18n-ready** - Localized label

### Khi nào dùng useRefreshButton?

✅ **Nên dùng:**

- Detail pages (show, edit)
- Refresh current item
- Manual data refresh
- Real-time data updates

❌ **Không dùng:**

- List pages (use custom invalidation with ["list"])
- Bulk refresh (invalidate multiple queries)
- Complex refresh logic (use useInvalidate directly)

### Remember

✅ **63 lines** - Simple but powerful
🎮 **Command** - onClick encapsulates action
📺 **Observer** - Watch fetch state
🏢 **Facade** - Hide complexity
💾 **Cache** - Invalidate detail query only
⏳ **Derived** - loading from isFetching
🎯 **Targeted** - Efficient refresh

### Pro Tips

1. **Use on detail pages** - Perfect for show/edit views
2. **Check loading state** - Disable button while refreshing
3. **Combine with keyboard shortcuts** - Better UX
4. **Don't over-refresh** - Be mindful of API rate limits
5. **Use React Query's refetchInterval** - For automatic refresh
