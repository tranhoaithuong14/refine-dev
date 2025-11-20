# Kiến trúc và Design Patterns của useList Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          DATA FETCHING SYSTEM (READ)              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useList ✅ (THIS HOOK - CORE!)                   │  │
│  │    → Fetch list of records                       │  │
│  │         │                                         │  │
│  │         ├──→ PAGINATION:                         │  │
│  │         │     - Server-side: Page 1, 2, 3...    │  │
│  │         │     - Client-side: Slice locally      │  │
│  │         │                                         │  │
│  │         ├──→ FILTERING:                          │  │
│  │         │     - Search: title contains "React"   │  │
│  │         │     - Filter: status = "published"     │  │
│  │         │     - Complex: AND/OR operators        │  │
│  │         │                                         │  │
│  │         ├──→ SORTING:                            │  │
│  │         │     - Sort by: createdAt DESC          │  │
│  │         │     - Multi-sort: name ASC, date DESC  │  │
│  │         │                                         │  │
│  │         ├──→ SMART CACHING:                      │  │
│  │         │     - React Query cache                │  │
│  │         │     - Stale-while-revalidate           │  │
│  │         │     - Background refetch               │  │
│  │         │                                         │  │
│  │         └──→ REALTIME UPDATES:                   │  │
│  │               - Auto-invalidate on events        │  │
│  │               - Live mode support                │  │
│  │                                                   │  │
│  │  Related hooks:                                  │  │
│  │    - useInfiniteList → Infinite scroll           │  │
│  │    - useOne → Single record                      │  │
│  │    - useMany → Multiple specific records         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **The MOST used hook in Refine - Fetch list of records with pagination, filtering, sorting, caching, and realtime updates**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  USELIST COMPLETE FLOW                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Renders                                   │
│  const { result, query } = useList({                         │
│    resource: "posts",                                        │
│    pagination: { current: 1, pageSize: 10 },                │
│    filters: [{ field: "status", operator: "eq",             │
│                value: "published" }],                        │
│    sorters: [{ field: "createdAt", order: "desc" }]         │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Query Key (Cache Key)                     │
│  keys()                                                      │
│    .data("default")                                          │
│    .resource("posts")                                        │
│    .action("list")                                           │
│    .params({                                                 │
│      filters: [{ field: "status", ... }],                   │
│      pagination: { current: 1, pageSize: 10 },              │
│      sorters: [{ field: "createdAt", ... }]                 │
│    })                                                        │
│    .get()                                                    │
│                                                              │
│  → Key: ["posts", "list", { filters, pagination, sorters }] │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check Cache (React Query)                          │
│  Is data in cache?                                           │
│    ├─→ YES (cache hit) ✅                                    │
│    │     → Return cached data INSTANTLY ⚡                   │
│    │     → Background refetch (if stale)                    │
│    │                                                         │
│    └─→ NO (cache miss) ❌                                    │
│          → Proceed to fetch                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Execute Query Function                             │
│  dataProvider.getList({                                      │
│    resource: "posts",                                        │
│    pagination: { current: 1, pageSize: 10 },                │
│    filters: [{ field: "status", operator: "eq",             │
│                value: "published" }],                        │
│    sorters: [{ field: "createdAt", order: "desc" }],        │
│    meta: { ... }                                             │
│  })                                                          │
│                                                              │
│  → API Call: GET /posts?status=published&page=1&sort=-date  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Process Response                                   │
│  Server response:                                            │
│  {                                                           │
│    data: [                                                   │
│      { id: 1, title: "Post 1", status: "published", ... },  │
│      { id: 2, title: "Post 2", status: "published", ... },  │
│      ...                                                     │
│    ],                                                        │
│    total: 50                                                 │
│  }                                                           │
│                                                              │
│  If pagination.mode = "client":                             │
│    → Slice data locally: data.slice(0, 10)                  │
│                                                              │
│  If queryOptions.select provided:                           │
│    → Transform data: select(rawData)                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Cache Data                                         │
│  Store in React Query cache:                                │
│  Key: ["posts", "list", {...}]                              │
│  Value: { data: [...], total: 50 }                          │
│  Timestamp: 2024-01-01 10:00:00                             │
│  StaleTime: 5 minutes (configurable)                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Return to Component                                │
│  result = {                                                  │
│    data: [Post 1, Post 2, ...],  // ← Array ready to map!   │
│    total: 50                      // ← For pagination UI    │
│  }                                                           │
│                                                              │
│  query = {                                                   │
│    isLoading: false,                                         │
│    isFetching: false,                                        │
│    refetch: fn,                                              │
│    ...                                                       │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: Realtime Subscription (Optional)                   │
│  If liveMode = "auto":                                       │
│    → Subscribe to "resources/posts" channel                 │
│    → On event (created/updated/deleted):                    │
│        → Invalidate cache automatically                     │
│        → Refetch latest data                                │
│        → UI updates! ✅                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useList.ts: 366 dòng** - Core data fetching hook!

---

### 2.1 Query Pattern - Read-Only Data Fetching

#### 📖 VÍ DỤ ĐỜI THƯỜNG: Library Search

```
Library Database:

WRITE (Mutation):
→ Add new book to library ✍️
→ Update book information 🔄
→ Delete book from library 🗑️

READ (Query):
→ Search for books 🔍
→ Browse book catalog 📚
→ View book details 👁️

useList = Library search (READ only)!
→ Fetch list of posts 📚
→ No modifications!
→ Just viewing data! ✅
```

**Query Pattern** = Read-only operations (GET requests)

#### Implementation:

```typescript
// From useList.ts (lines 259-302)

const queryResponse = useQuery({
  // Unique cache key
  queryKey: keys()
    .data(pickedDataProvider)
    .resource(identifier)
    .action("list") // ← "list" action (READ)
    .params({ filters, pagination, sorters })
    .get(),

  // Query function (GET operation)
  queryFn: (context) => {
    return getList({
      resource: resource?.name,
      pagination: prefferedPagination,
      filters: prefferedFilters,
      sorters: prefferedSorters,
      meta,
    });
    // ↑ Calls dataProvider.getList()
    // → HTTP GET /posts?page=1&status=published
  },

  // React Query options
  enabled: !!resource?.name,
  select: memoizedSelect,
  staleTime: 5 * 60 * 1000, // 5 minutes (example)
  // ... other options
});

// Result:
// - isLoading: true/false
// - data: { data: [...], total: 100 }
// - refetch: () => void
// - NO mutate() function! (read-only) ✅
```

#### Query vs Mutation:

```typescript
// QUERY (useList - READ):
const { result } = useList({ resource: "posts" });
// → GET /posts
// → Returns data
// → Cached automatically
// → Background refetch
// → No side effects ✅


// MUTATION (useCreate - WRITE):
const { mutate } = useCreate();
mutate({ resource: "posts", values: {...} });
// → POST /posts
// → Returns created item
// → Invalidates cache
// → Has side effects! ⚠️
```

#### Real Example:

```tsx
function PostList() {
  // QUERY (read-only)
  const { result, query } = useList({
    resource: "posts",
    pagination: { current: 1, pageSize: 10 },
  });

  return (
    <div>
      {query.isLoading && <div>Loading...</div>}

      {result.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          {/* Just displaying data! No mutations! ✅ */}
        </div>
      ))}

      {/* Refetch (still read-only) */}
      <button onClick={() => query.refetch()}>Refresh</button>
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Idempotent** - Same query = Same result
- ✅ **Cacheable** - Safe to cache aggressively
- ✅ **Predictable** - No side effects
- ✅ **Parallel** - Multiple queries = OK

---

### 2.2 Filter Pattern - Declarative Data Selection

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Amazon Product Search

```
Amazon Search Filters:

Category: Electronics ✅
Price: $100 - $500 ✅
Rating: 4+ stars ✅
Brand: Sony ✅

→ Click "Apply Filters"
→ See matching products

useList filters = Amazon filters!
→ Declare what you want
→ Hook handles SQL/API translation
→ Get filtered results! ✅
```

**Filter Pattern** = Declarative data selection

#### Implementation:

```typescript
// Declarative filter syntax:
const { result } = useList({
  resource: "posts",
  filters: [
    // Filter 1: Status equals "published"
    {
      field: "status",
      operator: "eq", // equals
      value: "published",
    },

    // Filter 2: Title contains "React"
    {
      field: "title",
      operator: "contains",
      value: "React",
    },

    // Filter 3: Created after Jan 1, 2024
    {
      field: "createdAt",
      operator: "gte", // greater than or equal
      value: "2024-01-01",
    },
  ],
});

// Refine translates to API call:
// GET /posts?status=published&title_contains=React&createdAt_gte=2024-01-01

// Or REST provider might translate to:
// GET /posts?filter[status]=published&filter[title]=React&filter[createdAt][gte]=2024-01-01

// Or GraphQL provider translates to:
// query {
//   posts(
//     where: {
//       status: { eq: "published" }
//       title: { contains: "React" }
//       createdAt: { gte: "2024-01-01" }
//     }
//   ) { ... }
// }

// You write once, works with all backends! ✅
```

#### Filter Operators:

```typescript
// COMPARISON:
{
  operator: "eq";
} // equals
{
  operator: "ne";
} // not equals
{
  operator: "lt";
} // less than
{
  operator: "lte";
} // less than or equal
{
  operator: "gt";
} // greater than
{
  operator: "gte";
} // greater than or equal

// STRING:
{
  operator: "contains";
} // contains substring
{
  operator: "ncontains";
} // doesn't contain
{
  operator: "startswith";
} // starts with
{
  operator: "nstartswith";
} // doesn't start with
{
  operator: "endswith";
} // ends with
{
  operator: "nendswith";
} // doesn't end with

// ARRAY:
{
  operator: "in";
} // in array
{
  operator: "nin";
} // not in array

// NULL:
{
  operator: "null";
} // is null
{
  operator: "nnull";
} // is not null

// LOGICAL:
{
  operator: "or";
} // OR condition
{
  operator: "and";
} // AND condition (default)
```

#### Real Example - Product Filters:

```tsx
function ProductList() {
  const [category, setCategory] = useState("electronics");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [inStock, setInStock] = useState(true);

  const { result } = useList({
    resource: "products",
    filters: [
      {
        field: "category",
        operator: "eq",
        value: category,
      },
      {
        field: "price",
        operator: "gte",
        value: minPrice,
      },
      {
        field: "price",
        operator: "lte",
        value: maxPrice,
      },
      {
        field: "stock",
        operator: "gt",
        value: inStock ? 0 : -1,
      },
    ],
  });

  return (
    <div>
      {/* Filter UI */}
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
      </select>

      <input
        type="range"
        min={0}
        max={1000}
        value={minPrice}
        onChange={(e) => setMinPrice(Number(e.target.value))}
      />

      <input
        type="checkbox"
        checked={inStock}
        onChange={(e) => setInStock(e.target.checked)}
      />

      {/* Results */}
      {result.data.map((product) => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Declarative** - What, not how
- ✅ **Backend Agnostic** - Works with REST/GraphQL/etc
- ✅ **Type Safe** - TypeScript support
- ✅ **Composable** - Combine multiple filters

---

### 2.3 Strategy Pattern - Server vs Client Pagination

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Restaurant Menu

```
STRATEGY 1 - Kitchen Makes Pages (Server):
→ Customer orders: "Page 2 of desserts"
→ Kitchen prepares ONLY page 2 (10 desserts)
→ Serves to customer
→ Efficient! Only makes what's needed! ✅

STRATEGY 2 - All at Once, Customer Divides (Client):
→ Kitchen makes ALL 100 desserts
→ Brings to customer
→ Customer picks desserts 11-20
→ Inefficient but flexible! ⚠️

useList supports both strategies!
```

**Strategy Pattern** = Choose pagination algorithm at runtime

#### Implementation:

```typescript
// STRATEGY 1: Server-side pagination (default)
const { result } = useList({
  resource: "posts",
  pagination: {
    mode: "server", // ← Server strategy!
    current: 2,
    pageSize: 10,
  },
});

// Flow:
// 1. API call: GET /posts?page=2&pageSize=10
// 2. Server returns ONLY page 2 (10 items)
// 3. result.data = [Post 11-20]
// 4. Efficient! ✅

// STRATEGY 2: Client-side pagination
const { result } = useList({
  resource: "posts",
  pagination: {
    mode: "client", // ← Client strategy!
    current: 2,
    pageSize: 10,
  },
});

// Flow:
// 1. API call: GET /posts (no page param)
// 2. Server returns ALL items (100 items)
// 3. useList slices locally: data.slice(10, 20)
// 4. result.data = [Post 11-20]
// 5. Less efficient but useful for small datasets
```

#### Client Pagination Logic:

```typescript
// From useList.ts (lines 230-240)

if (prefferedPagination.mode === "client") {
  data = {
    ...data,
    data: data.data.slice(
      (prefferedPagination.currentPage - 1) * prefferedPagination.pageSize,
      // ↑ Start index: (2-1) * 10 = 10

      prefferedPagination.currentPage * prefferedPagination.pageSize,
      // ↑ End index: 2 * 10 = 20
    ),
    total: data.total,
  };
}

// Result: data.slice(10, 20) = [Post 11-20]
```

#### Performance Comparison:

```
Scenario: 10,000 posts, show page 5

SERVER PAGINATION:
→ API call: GET /posts?page=5&pageSize=10
→ Server processes: WHERE ... LIMIT 10 OFFSET 40
→ Network transfer: 10 posts (~10KB)
→ Total time: ~200ms ⚡
→ Memory: 10 posts
→ Scalable! ✅


CLIENT PAGINATION:
→ API call: GET /posts
→ Server processes: SELECT * FROM posts
→ Network transfer: 10,000 posts (~10MB) ⏳
→ Client slices: [40-50]
→ Total time: ~5000ms ⏳
→ Memory: 10,000 posts
→ Not scalable! ❌

Use client pagination only for:
- Small datasets (< 1000 items)
- No backend pagination support
- Complex client-side filtering
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose best strategy
- ✅ **Performance** - Server pagination for large datasets
- ✅ **Compatibility** - Client fallback if needed
- ✅ **Runtime Choice** - Can switch dynamically

---

### 2.4 Observer Pattern - Realtime Updates

#### 📡 VÍ DỤ ĐỜI THƯỜNG: Stock Market Dashboard

```
Stock Market Display:

Traditional (No Observer):
→ Refresh button to see updates
→ Manual polling every 5 seconds
→ Outdated data! ❌

Realtime (Observer):
→ Dashboard auto-updates when stock price changes
→ WebSocket connection
→ Always fresh data! ✅

useList with liveMode = Stock dashboard!
→ Subscribe to "resources/posts" channel
→ Auto-refresh when data changes
→ Always up-to-date! ✅
```

**Observer Pattern** = Subscribe to events, auto-update on changes

#### Implementation:

```typescript
// From useList.ts (lines 198-218)

useResourceSubscription({
  resource: identifier, // "posts"
  types: ["*"], // All event types
  channel: `resources/${resource?.name}`,
  enabled: isEnabled,
  liveMode, // "auto" | "manual" | "off"
  onLiveEvent,
  params: {
    meta: combinedMeta,
    pagination: prefferedPagination,
    filters: prefferedFilters,
    sorters: prefferedSorters,
    subscriptionType: "useList",
  },
});

// When event received (e.g., new post created):
// 1. Event: { type: "created", payload: { id: 123 } }
// 2. If liveMode = "auto":
//      → Invalidate query cache
//      → Refetch latest data
//      → UI updates automatically! ✅
// 3. If liveMode = "manual":
//      → Call onLiveEvent callback
//      → You decide when to refetch
```

#### Live Modes:

```typescript
// MODE 1: Auto (default)
const { result } = useList({
  resource: "posts",
  liveMode: "auto", // ← Automatic refetch!
});

// Event flow:
// 1. User A creates post → Event emitted
// 2. User B's useList receives event
// 3. Cache invalidated automatically
// 4. List refetches
// 5. New post appears in User B's list! ✅

// MODE 2: Manual
const { result } = useList({
  resource: "posts",
  liveMode: "manual",
  onLiveEvent: (event) => {
    console.log("Event received:", event);
    // You decide if/when to refetch
    if (event.type === "created") {
      query.refetch();
    }
  },
});

// MODE 3: Off
const { result } = useList({
  resource: "posts",
  liveMode: "off", // ← No subscriptions
});
```

#### Real Example - Collaborative List:

```tsx
function CollaborativePostList() {
  const [showToast, setShowToast] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);

  const { result, query } = useList({
    resource: "posts",
    liveMode: "auto", // ← Auto-refresh on changes!
    onLiveEvent: (event) => {
      // Optional: Show notification
      if (event.type === "created") {
        setShowToast(true);
        setUpdateCount((prev) => prev + 1);
        setTimeout(() => setShowToast(false), 3000);
      }
    },
  });

  return (
    <div>
      {showToast && (
        <div className="toast">New post added! List updated automatically.</div>
      )}

      <div>Real-time updates: {updateCount}</div>

      {result.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
        </div>
      ))}

      {/* User A creates post in another tab/device
          → Event triggered
          → User B's list auto-refreshes
          → New post appears! ✅ */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Realtime** - Always fresh data
- ✅ **Collaborative** - Multi-user support
- ✅ **Automatic** - No manual refresh
- ✅ **Flexible** - 3 modes (auto/manual/off)

---

### 2.5 Memoization Pattern - Optimize Select Function

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: Calculator Memory

```
Calculator:

WITHOUT memory:
→ Calculate 5 × 10 = 50
→ Calculate 5 × 10 again = 50
→ Calculate 5 × 10 again = 50
→ Wasteful! Same calculation! ❌

WITH memory (memoization):
→ Calculate 5 × 10 = 50 (save result)
→ Next time 5 × 10 → Return saved 50 ⚡
→ Efficient! No recalculation! ✅

useList select memoization = Calculator memory!
```

**Memoization** = Cache expensive computations

#### Implementation:

```typescript
// From useList.ts (lines 226-253)

const memoizedSelect = useMemo(() => {
  return (rawData: GetListResponse<TQueryFnData>) => {
    let data = rawData;

    // Client pagination (if needed)
    if (prefferedPagination.mode === "client") {
      data = {
        ...data,
        data: data.data.slice(
          (prefferedPagination.currentPage - 1) * prefferedPagination.pageSize,
          prefferedPagination.currentPage * prefferedPagination.pageSize,
        ),
        total: data.total,
      };
    }

    // User's custom select (if provided)
    if (queryOptions?.select) {
      return queryOptions.select(data);
    }

    return data;
  };
}, [
  // Re-create only when these change:
  prefferedPagination.currentPage,
  prefferedPagination.pageSize,
  prefferedPagination.mode,
  queryOptions?.select,
]);
// ↑ Dependencies: Only re-create function when pagination or select changes

// Used in useQuery:
useQuery({
  // ...
  select: memoizedSelect, // ← Stable reference! ✅
});
```

#### Why Memoization Matters:

```typescript
// WITHOUT memoization (bad):
useQuery({
  select: (data) => {
    // This creates NEW function every render! ❌
    // React Query thinks select changed
    // → Re-runs select on every render
    // → Wasteful!
    return transformData(data);
  },
});

// WITH memoization (good):
const memoizedSelect = useMemo(
  () => (data) => transformData(data),
  [
    /* deps */
  ],
);

useQuery({
  select: memoizedSelect, // ← Same reference! ✅
  // React Query knows select hasn't changed
  // → Only runs when data changes
  // → Efficient!
});
```

#### Real Example:

```tsx
function PostListWithTransform() {
  const { result } = useList({
    resource: "posts",
    queryOptions: {
      // ❌ WRONG - Not memoized
      select: (data) => ({
        ...data,
        data: data.data.map((post) => ({
          ...post,
          titleUppercase: post.title.toUpperCase(),
        })),
      }),
      // This creates new function every render!
      // React Query re-runs on every render!
    },
  });

  // ✅ CORRECT - Memoized
  const selectFn = useCallback(
    (data) => ({
      ...data,
      data: data.data.map((post) => ({
        ...post,
        titleUppercase: post.title.toUpperCase(),
      })),
    }),
    [],
  ); // ← Stable reference!

  const { result: result2 } = useList({
    resource: "posts",
    queryOptions: {
      select: selectFn, // ← Memoized! ✅
    },
  });
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid unnecessary re-runs
- ✅ **Stability** - Stable select reference
- ✅ **Efficiency** - Only compute when needed
- ✅ **React Query** - Optimizes caching

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường  | Giải quyết vấn đề gì            | Trong useList              |
| --------------- | ----------------- | ------------------------------- | -------------------------- |
| **Query**       | Library search    | Read-only operations            | GET requests, no mutations |
| **Filter**      | Amazon filters    | Declarative data selection      | Backend-agnostic filters   |
| **Strategy**    | Restaurant menu   | Server vs client pagination     | Choose pagination strategy |
| **Observer**    | Stock dashboard   | Realtime updates                | Auto-refresh on events     |
| **Memoization** | Calculator memory | Optimize expensive computations | Cache select function      |

---

## 3. KEY FEATURES

### 3.1 Automatic Caching

```typescript
// First render - Cache miss
const { result } = useList({ resource: "posts" });
// → API call: GET /posts
// → Cache: ["posts", "list"] = { data: [...], total: 100 }

// Second render - Cache hit
const { result } = useList({ resource: "posts" });
// → NO API call! ✅
// → Return from cache ⚡
// → Background refetch (if stale)
```

### 3.2 Smart Query Keys

```typescript
// Different filters = Different cache
useList({
  filters: [{ field: "status", operator: "eq", value: "published" }],
});
// Key: ["posts", "list", { filters: [{ ... }] }]

useList({
  filters: [{ field: "status", operator: "eq", value: "draft" }],
});
// Key: ["posts", "list", { filters: [{ ... }] }] (different!)

// Each filter combo cached separately! ✅
```

### 3.3 Background Refetch

```typescript
const { result, query } = useList({
  resource: "posts",
  queryOptions: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30s
  },
});

// Flow:
// 1. First load: API call
// 2. Return cached data (instant!)
// 3. After 5 min: Data marked stale
// 4. Next access: Return stale data (instant!)
// 5. Background refetch: GET /posts
// 6. Update with fresh data ✅
```

### 3.4 Multi-Sort Support

```typescript
const { result } = useList({
  resource: "posts",
  sorters: [
    { field: "category", order: "asc" }, // Primary sort
    { field: "createdAt", order: "desc" }, // Secondary sort
  ],
});

// SQL equivalent:
// ORDER BY category ASC, createdAt DESC
```

### 3.5 Complex Filters

```typescript
const { result } = useList({
  resource: "posts",
  filters: [
    {
      operator: "or",
      value: [
        { field: "status", operator: "eq", value: "published" },
        { field: "status", operator: "eq", value: "featured" },
      ],
    },
    {
      operator: "and",
      value: [
        { field: "views", operator: "gt", value: 1000 },
        { field: "createdAt", operator: "gte", value: "2024-01-01" },
      ],
    },
  ],
});

// SQL equivalent:
// WHERE (status = 'published' OR status = 'featured')
//   AND views > 1000
//   AND createdAt >= '2024-01-01'
```

---

## 4. COMMON USE CASES

### 4.1 Basic List with Pagination

```tsx
function PostList() {
  const [current, setCurrent] = useState(1);

  const { result, query } = useList({
    resource: "posts",
    pagination: {
      current,
      pageSize: 10,
    },
  });

  return (
    <div>
      {query.isLoading && <div>Loading...</div>}

      {result.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
        </div>
      ))}

      <div>
        <button
          onClick={() => setCurrent((prev) => Math.max(1, prev - 1))}
          disabled={current === 1}
        >
          Previous
        </button>

        <span>
          Page {current} of {Math.ceil((result.total || 0) / 10)}
        </span>

        <button
          onClick={() => setCurrent((prev) => prev + 1)}
          disabled={current >= Math.ceil((result.total || 0) / 10)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
```

### 4.2 Search and Filter

```tsx
function SearchablePosts() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [debouncedSearch] = useDebounce(search, 500);

  const { result } = useList({
    resource: "posts",
    filters: [
      {
        field: "title",
        operator: "contains",
        value: debouncedSearch,
      },
      ...(status !== "all"
        ? [
            {
              field: "status",
              operator: "eq" as const,
              value: status,
            },
          ]
        : []),
    ],
  });

  return (
    <div>
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search posts..."
      />

      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="all">All</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <div>Found {result.total} posts</div>

      {result.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <span>{post.status}</span>
        </div>
      ))}
    </div>
  );
}
```

### 4.3 Sort by Clicking Headers

```tsx
function SortableTable() {
  const [sorters, setSorters] = useState<CrudSort[]>([
    { field: "createdAt", order: "desc" },
  ]);

  const { result } = useList({
    resource: "posts",
    sorters,
  });

  const handleSort = (field: string) => {
    setSorters((prev) => {
      const existing = prev.find((s) => s.field === field);
      if (existing) {
        // Toggle order
        return [
          {
            field,
            order: existing.order === "asc" ? "desc" : "asc",
          },
        ];
      }
      // New sort
      return [{ field, order: "asc" }];
    });
  };

  const getSortIcon = (field: string) => {
    const sort = sorters.find((s) => s.field === field);
    if (!sort) return "⇅";
    return sort.order === "asc" ? "↑" : "↓";
  };

  return (
    <table>
      <thead>
        <tr>
          <th onClick={() => handleSort("title")}>
            Title {getSortIcon("title")}
          </th>
          <th onClick={() => handleSort("createdAt")}>
            Date {getSortIcon("createdAt")}
          </th>
          <th onClick={() => handleSort("views")}>
            Views {getSortIcon("views")}
          </th>
        </tr>
      </thead>
      <tbody>
        {result.data.map((post) => (
          <tr key={post.id}>
            <td>{post.title}</td>
            <td>{post.createdAt}</td>
            <td>{post.views}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### 4.4 Realtime Collaborative List

```tsx
function RealtimePostList() {
  const [notifications, setNotifications] = useState<string[]>([]);

  const { result } = useList({
    resource: "posts",
    liveMode: "auto", // ← Auto-refresh!
    onLiveEvent: (event) => {
      // Show notification
      const message = `${event.type}: ${event.payload?.id}`;
      setNotifications((prev) => [...prev, message].slice(-5));
    },
  });

  return (
    <div>
      {/* Activity feed */}
      <div className="notifications">
        {notifications.map((msg, i) => (
          <div key={i}>{msg}</div>
        ))}
      </div>

      {/* Auto-updating list */}
      {result.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
        </div>
      ))}

      {/* When someone creates/updates/deletes a post:
          - Event received
          - List auto-refreshes
          - New data appears! ✅ */}
    </div>
  );
}
```

### 4.5 Advanced Filters with URL Sync

```tsx
function AdvancedFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: CrudFilter[] = [];

  if (searchParams.get("status")) {
    filters.push({
      field: "status",
      operator: "eq",
      value: searchParams.get("status")!,
    });
  }

  if (searchParams.get("minPrice")) {
    filters.push({
      field: "price",
      operator: "gte",
      value: Number(searchParams.get("minPrice")),
    });
  }

  const { result } = useList({
    resource: "products",
    filters,
    pagination: {
      current: Number(searchParams.get("page") || "1"),
      pageSize: 20,
    },
  });

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  // URL updates → Filters update → List refetches
  // Can bookmark/share filtered URLs! ✅
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why useQuery Instead of useState + useEffect?

**Answer:** React Query handles complexity automatically

```typescript
// MANUAL (complex):
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  fetch("/posts")
    .then((r) => r.json())
    .then(setData)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);

// Problems:
// - No caching ❌
// - Race conditions ❌
// - No refetch logic ❌
// - No background updates ❌

// useQuery (simple):
const { data, isLoading, error } = useQuery({
  queryKey: ["posts"],
  queryFn: () => fetch("/posts").then((r) => r.json()),
});

// Benefits:
// - Auto caching ✅
// - Race condition handling ✅
// - Auto refetch ✅
// - Background updates ✅
```

### 5.2 Why Memoize Select Function?

**Answer:** Prevent unnecessary re-runs

```typescript
// React Query's select optimization:
// - Only runs when data changes OR select function changes
// - If select function changes every render → Runs every render ❌
// - If select function memoized → Runs only when data changes ✅

// Therefore: useList memoizes select to optimize!
```

### 5.3 Why Empty Array Fallback?

**Answer:** Prevent undefined errors in UI

```typescript
// From useList.ts (line 360):
data: queryResponse?.data?.data || EMPTY_ARRAY

// Without fallback:
result.data?.map(...)  // ← Need optional chaining everywhere! ❌

// With fallback:
result.data.map(...)   // ← Clean! Always array! ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Not Memoizing Custom Select

```typescript
// ❌ WRONG
const { result } = useList({
  queryOptions: {
    select: (data) => ({
      ...data,
      data: data.data.filter((p) => p.active),
    }),
  },
});
// Creates new function every render!
// React Query re-runs every render! ❌

// ✅ CORRECT
const selectFn = useCallback(
  (data) => ({
    ...data,
    data: data.data.filter((p) => p.active),
  }),
  [],
);

const { result } = useList({
  queryOptions: { select: selectFn },
});
```

### 6.2 Forgetting to Handle Loading State

```typescript
// ❌ WRONG
const { result } = useList({ resource: "posts" });
return result.data.map(...);
// Renders before data loads! Error! ❌

// ✅ CORRECT
const { result, query } = useList({ resource: "posts" });
if (query.isLoading) return <div>Loading...</div>;
return result.data.map(...);
```

### 6.3 Using Client Pagination for Large Datasets

```typescript
// ❌ WRONG for 10,000 items
const { result } = useList({
  resource: "posts",
  pagination: { mode: "client", current: 5, pageSize: 10 },
});
// Loads ALL 10,000 items! ⏳

// ✅ CORRECT
const { result } = useList({
  resource: "posts",
  pagination: { mode: "server", current: 5, pageSize: 10 },
});
// Loads only page 5 (10 items)! ⚡
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Pagination Mode Choice

```
Small dataset (< 1000):
- Client pagination: OK ✅
- Server pagination: Better ⚡

Large dataset (> 1000):
- Client pagination: BAD ❌
- Server pagination: MUST ✅
```

### 7.2 Filter Performance

```typescript
// GOOD - Indexed field
filters: [{ field: "id", operator: "eq", value: 123 }];
// → WHERE id = 123 (indexed, fast) ⚡

// BAD - Non-indexed field
filters: [{ field: "description", operator: "contains", value: "React" }];
// → WHERE description LIKE '%React%' (slow) ⏳

// Ensure filters use indexed columns!
```

---

## 8. TESTING

```typescript
describe("useList", () => {
  it("should fetch list with filters", async () => {
    const { result } = renderHook(
      () =>
        useList({
          resource: "posts",
          filters: [{ field: "status", operator: "eq", value: "published" }],
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.result.data).toHaveLength(10);
    });

    expect(mockGetList).toHaveBeenCalledWith({
      resource: "posts",
      filters: [{ field: "status", operator: "eq", value: "published" }],
      pagination: expect.any(Object),
      sorters: undefined,
      meta: expect.any(Object),
    });
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Query**: Read-only operations (GET)
- ✅ **Filter**: Declarative data selection
- ✅ **Strategy**: Server vs client pagination
- ✅ **Observer**: Realtime auto-updates
- ✅ **Memoization**: Optimize select function

### Key Features

1. **Automatic Caching** - React Query cache
2. **Smart Query Keys** - Different params = Different cache
3. **Background Refetch** - Stale-while-revalidate
4. **Filters & Sorts** - Backend-agnostic syntax
5. **Realtime Updates** - Observer pattern

### Khi nào dùng useList?

✅ **Nên dùng:**

- Fetch list of records (THE most common use case!)
- With pagination/filters/sorts
- Need caching
- Need realtime updates

❌ **Không dùng:**

- Infinite scroll (use useInfiniteList)
- Single record (use useOne)
- Multiple specific IDs (use useMany)

### Remember

✅ **366 lines** - Core data fetching
📖 **Query** - Read-only (GET)
🔍 **Filter** - Declarative selection
🏢 **Strategy** - Server/client pagination
📡 **Observer** - Realtime updates
🧠 **Memoization** - Optimize select

---

> 📚 **Best Practice**: Use **server pagination** for large datasets. **Memo ize custom select** with useCallback. Always **handle loading state**. Use **filters** for backend-agnostic querying. Enable **liveMode** for realtime collaborative apps!
