# Kiến trúc và Design Patterns của useCustom Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DATA FETCHING SYSTEM                    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  STANDARD CRUD (Predefined):                     │  │
│  │    - useOne     → GET /posts/1                   │  │
│  │    - useList    → GET /posts                     │  │
│  │    - useMany    → GET /posts?ids=1,2,3           │  │
│  │         ↑                                         │  │
│  │         │ Standard patterns                       │  │
│  │         │                                         │  │
│  │  ────────────────────────────────────────────    │  │
│  │                                                   │  │
│  │  CUSTOM ENDPOINTS (Flexible): ✅                 │  │
│  │    useCustom ✅ (THIS HOOK)                       │  │
│  │    → GET /api/dashboard/stats                    │  │
│  │    → POST /api/reports/generate                  │  │
│  │    → GET /api/search?q=...                       │  │
│  │    → ANY method, ANY endpoint!                   │  │
│  │         │                                         │  │
│  │         ├──→ Notifications (optional)            │  │
│  │         ├──→ Error Handling                      │  │
│  │         └──→ React Query caching                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Query ANY custom endpoint that doesn't fit standard CRUD patterns - dashboard stats, reports, search, analytics, etc.**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    USECUSTOM FLOW                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Uses Hook                                │
│  const { data } = useCustom({                                │
│    url: "/api/dashboard/stats",                              │
│    method: "get"                                             │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Check Data Provider                                │
│  Does dataProvider have custom() method? ✅                  │
│  (If no: throw error)                                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Create Query Key                                   │
│  queryKey: ["custom", "get", "/api/dashboard/stats", ...]   │
│  → Unique cache key for this custom request                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Execute Query                                       │
│  dataProvider.custom({                                       │
│    url: "/api/dashboard/stats",                              │
│    method: "get",                                            │
│    config: { query, payload, headers, ... }                  │
│  })                                                          │
│  → GET /api/dashboard/stats                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Handle Success (useEffect)                         │
│  - Show notification (if configured)                        │
│  - Return data to component                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: OR Handle Error (useEffect)                        │
│  - Call onError handler                                     │
│  - Show error notification                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useCustom.ts: 243 dòng** - Flexible custom endpoint queries!

---

### 2.1 Escape Hatch Pattern - Pattern "Cửa Thoát Hiểm"

#### 🚪 VÍ DỤ ĐỜI THƯỜNG: Emergency Exit in Building

```
Building Safety System:

NORMAL EXITS (Standard):
- Front door → Most people use this
- Side door → Alternative route
- Back door → Loading dock

EMERGENCY EXIT (Escape Hatch):
- Fire escape → Use when normal exits don't work
- Flexible → Any emergency situation
- Necessary → Buildings must have it by law!

Refine is the same:
- useOne, useList → Normal CRUD (95% of cases)
- useCustom → Emergency exit (special cases)
```

**Escape Hatch Pattern** = Provide fallback for non-standard cases

#### Implementation:

```typescript
// STANDARD CRUD (95% of use cases):
const { data } = useOne({ resource: "posts", id: 1 });
// → GET /posts/1 (predefined pattern)

const { data } = useList({ resource: "posts" });
// → GET /posts (predefined pattern)

// ESCAPE HATCH (5% special cases):
const { data } = useCustom({
  url: "/api/dashboard/analytics",
  method: "get",
});
// → GET /api/dashboard/analytics (custom!)

const { data } = useCustom({
  url: "/api/reports/generate",
  method: "post",
  config: { payload: { format: "pdf" } },
});
// → POST /api/reports/generate (custom!)
```

#### Real-World Examples:

```tsx
// Example 1: Search endpoint (not CRUD)
const { data } = useCustom({
  url: "/api/search",
  method: "get",
  config: {
    query: {
      q: searchTerm,
      filters: "active",
      limit: 20,
    },
  },
});
// GET /api/search?q=react&filters=active&limit=20

// Example 2: Dashboard stats (aggregate)
const { data } = useCustom({
  url: "/api/dashboard/stats",
  method: "get",
});
// GET /api/dashboard/stats
// Returns: { totalUsers: 1500, revenue: 50000, ... }

// Example 3: Report generation (POST)
const { data } = useCustom({
  url: "/api/reports/sales",
  method: "post",
  config: {
    payload: {
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      format: "pdf",
    },
  },
});
// POST /api/reports/sales

// Example 4: Third-party API (external)
const { data } = useCustom({
  url: "https://api.github.com/repos/refinedev/refine",
  method: "get",
});
// GET https://api.github.com/repos/refinedev/refine
```

#### ❌ KHÔNG có Escape Hatch:

```tsx
// BAD - Try to force custom endpoint into CRUD pattern ❌

const { data } = useList({
  resource: "dashboard-stats", // ← Not a real resource!
});
// Doesn't make sense!
// Dashboard stats aren't a "list" of records

const { data } = useOne({
  resource: "search",
  id: searchTerm, // ← Abuse of ID parameter!
});
// Wrong pattern!
```

#### ✅ CÓ Escape Hatch:

```tsx
// GOOD - Use escape hatch for special cases ✅

const { data } = useCustom({
  url: "/api/dashboard/stats",
  method: "get",
});
// Clear intent! Custom endpoint! ✅

const { data } = useCustom({
  url: "/api/search",
  method: "get",
  config: { query: { q: searchTerm } },
});
// Proper search endpoint! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Handle ANY endpoint
- ✅ **No Forcing** - Don't abuse CRUD patterns
- ✅ **Real World** - Apps need custom endpoints
- ✅ **Safety Net** - When standard hooks don't fit

---

### 2.2 Adapter Pattern - Method Agnostic Interface

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Swiss Army Knife

```
Swiss Army Knife:

ONE TOOL → MANY FUNCTIONS
- Knife blade
- Scissors
- Screwdriver
- Bottle opener
- File
→ Same handle, different tools!

useCustom is the same:
ONE HOOK → ANY HTTP METHOD
- GET
- POST
- PUT
- PATCH
- DELETE
- HEAD
- OPTIONS
→ Same hook, different methods!
```

**Adapter Pattern** = Single interface for multiple methods

#### Implementation:

```typescript
// From useCustom.ts (line 69)

method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch"
// ↑ Any HTTP method!

// Usage examples:

// GET request
useCustom({ url: "/api/stats", method: "get" });

// POST request
useCustom({ url: "/api/reports", method: "post", config: { payload: {...} } });

// PUT request
useCustom({ url: "/api/settings", method: "put", config: { payload: {...} } });

// PATCH request
useCustom({ url: "/api/profile", method: "patch", config: { payload: {...} } });

// DELETE request
useCustom({ url: "/api/cache", method: "delete" });

// Same hook! Different methods! ✅
```

#### Real Examples:

```tsx
// Example 1: API Health Check (HEAD)
function APIHealthCheck() {
  const { data, query } = useCustom({
    url: "/api/health",
    method: "head", // ← Check if server alive (no body)
  });

  return <div>API Status: {query.isSuccess ? "✅ Healthy" : "❌ Down"}</div>;
}

// Example 2: Cache Clear (DELETE)
function CacheClearer() {
  const { query } = useCustom({
    url: "/api/cache/clear",
    method: "delete",
    queryOptions: {
      enabled: false, // Don't auto-run
    },
  });

  return <button onClick={() => query.refetch()}>Clear Cache</button>;
}

// Example 3: Export Data (POST with response)
function DataExporter() {
  const { data, query } = useCustom({
    url: "/api/export",
    method: "post",
    config: {
      payload: {
        format: "csv",
        fields: ["id", "name", "email"],
      },
    },
    queryOptions: {
      enabled: false,
    },
  });

  return (
    <div>
      <button onClick={() => query.refetch()}>Export CSV</button>
      {data?.data?.downloadUrl && <a href={data.data.downloadUrl}>Download</a>}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Unified API** - One hook for all methods
- ✅ **Consistency** - Same pattern everywhere
- ✅ **Less Complexity** - Don't need 7 different hooks
- ✅ **Type Safety** - TypeScript knows all methods

---

### 2.3 Configuration Object Pattern

#### ⚙️ VÍ DỤ ĐỜI THƯỜNG: Camera Settings

```
Camera Configuration:

❌ BAD - Many separate functions:
setISO(800);
setShutterSpeed(1/120);
setAperture(2.8);
setWhiteBalance("auto");
setFormat("RAW");
→ 5 function calls! Tedious!

✅ GOOD - Configuration object:
camera.configure({
  iso: 800,
  shutterSpeed: "1/120",
  aperture: 2.8,
  whiteBalance: "auto",
  format: "RAW"
});
→ 1 call! Clean!

useCustom uses same pattern!
```

**Configuration Object** = Group related params in single object

#### Implementation:

```typescript
// From useCustom.ts (lines 35-41)

interface UseCustomConfig<TQuery, TPayload> {
  sorters?: CrudSort[]; // ← For sorting
  filters?: CrudFilter[]; // ← For filtering
  query?: TQuery; // ← URL query params
  payload?: TPayload; // ← Request body
  headers?: {}; // ← Custom headers
}

// Usage:
useCustom({
  url: "/api/search",
  method: "get",
  config: {
    // ← All configuration in one object!
    query: { q: "react", limit: 10 },
    headers: { "X-Custom-Header": "value" },
    filters: [{ field: "status", operator: "eq", value: "active" }],
  },
});
```

#### ❌ KHÔNG có Configuration Object:

```tsx
// BAD - Flat parameters ❌

useCustom({
  url: "/api/search",
  method: "get",
  query: { q: "react" },        // ← Flat
  payload: { ... },             // ← Flat
  headers: { ... },             // ← Flat
  sorters: [...],               // ← Flat
  filters: [...]                // ← Flat
});

// Problems:
// - Too many top-level params
// - Hard to know what's query vs payload
// - Namespace pollution
```

#### ✅ CÓ Configuration Object:

```tsx
// GOOD - Grouped configuration ✅

useCustom({
  url: "/api/search",
  method: "get",
  config: { // ← Clear grouping!
    query: { q: "react" },
    payload: { ... },
    headers: { ... },
    sorters: [...],
    filters: [...]
  }
});

// Benefits:
// - Clear separation
// - Easy to understand
// - Extensible
```

#### Real Example - Complex Search:

```tsx
function AdvancedSearch() {
  const [searchParams, setSearchParams] = useState({
    keyword: "",
    category: "all",
    sortBy: "relevance",
  });

  const { data, query } = useCustom({
    url: "/api/search/advanced",
    method: "post",
    config: {
      // Request body
      payload: {
        keyword: searchParams.keyword,
        category: searchParams.category,
      },

      // URL query params
      query: {
        page: 1,
        limit: 20,
      },

      // Sorting
      sorters: [{ field: searchParams.sortBy, order: "desc" }],

      // Filtering
      filters: [
        { field: "status", operator: "eq", value: "published" },
        { field: "category", operator: "eq", value: searchParams.category },
      ],

      // Custom headers
      headers: {
        "X-Search-Version": "2.0",
      },
    },
  });

  return <SearchResults data={data} />;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Organization** - Related params grouped
- ✅ **Clarity** - Clear separation of concerns
- ✅ **Extensibility** - Easy to add new config
- ✅ **Type Safety** - TypeScript validates config

---

### 2.4 Side Effect Pattern (useEffect for Notifications)

#### ⚡ VÍ DỌI THƯỜNG: Automatic Light Switch

```
Motion-Activated Light:

NOT: Manual notification after every action
User flips switch → Manually announce "Light is on!"
→ Easy to forget! ❌

YES: Automatic notification (side effect)
User flips switch → Light turns on
                 → Motion sensor detects
                 → Automatically beeps ✅
→ Always happens! Can't forget!

useCustom notifications = Automatic side effect!
```

**Side Effect Pattern** = Auto-trigger actions on state changes

#### Implementation:

```typescript
// From useCustom.ts (lines 189-201)

// SUCCESS side effect
useEffect(() => {
  if (queryResponse.isSuccess && queryResponse.data) {
    // Show notification automatically!
    handleNotification(notificationConfig);
  }
}, [queryResponse.isSuccess, queryResponse.data]);

// ERROR side effect
useEffect(() => {
  if (queryResponse.isError && queryResponse.error) {
    // Show error notification automatically!
    checkError(queryResponse.error);
    handleNotification(errorNotificationConfig, defaultErrorConfig);
  }
}, [queryResponse.isError, queryResponse.error]);
```

#### Why useEffect Instead of Callbacks?

```typescript
// ❌ ALTERNATIVE 1: onSuccess callback (React Query)
useQuery({
  queryFn: () => fetchData(),
  onSuccess: (data) => {
    // Problem: Only runs on first success
    // Doesn't run on refetch success! ❌
  }
});

// ❌ ALTERNATIVE 2: Manual notification
const { data, isSuccess } = useQuery(...);
if (isSuccess) {
  notify("Success!"); // ← Runs every render! ❌
}

// ✅ GOOD: useEffect (current approach)
useEffect(() => {
  if (queryResponse.isSuccess && queryResponse.data) {
    handleNotification(...); // ← Runs once per success ✅
  }
}, [queryResponse.isSuccess, queryResponse.data]);
// Dependencies ensure it runs when status changes
// Not on every render!
```

#### Real Example:

```tsx
function ReportGenerator() {
  const { data, query } = useCustom({
    url: "/api/reports/generate",
    method: "post",
    config: {
      payload: { format: "pdf" },
    },
    // Auto-notification! ✅
    successNotification: {
      message: "Report generated successfully!",
      description: "Download will start automatically",
      type: "success",
    },
    errorNotification: {
      message: "Failed to generate report",
      type: "error",
    },
    queryOptions: {
      enabled: false, // Don't auto-run
    },
  });

  // Trigger manually
  return <button onClick={() => query.refetch()}>Generate Report</button>;

  // When success:
  // → isSuccess becomes true
  // → useEffect detects change
  // → Auto shows notification ✅
  // → No manual code needed!
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Automatic** - Notifications happen automatically
- ✅ **Reliable** - Can't forget to show notification
- ✅ **Consistent** - Same pattern as other hooks
- ✅ **Declarative** - Define what, not when

---

### 2.5 Query Pattern (Not Mutation) - Key Difference

#### 🔄 VÍ DỤ ĐỜI THƯỜNG: Checking Bank Balance vs Making Transfer

```
Bank App:

QUERY (useCustom):
→ Check balance → GET request
→ Automatic → Shows balance immediately
→ Cached → Don't refetch every second
→ Read-only → No side effects on server

MUTATION (useCustomMutation):
→ Transfer money → POST request
→ Manual → User clicks "Transfer"
→ Not cached → Executed once
→ Write operation → Changes server state

useCustom = Query (GET requests preferred)
useCustomMutation = Mutation (POST/PUT/DELETE)
```

**Query Pattern** = Read operations with caching

#### Implementation Difference:

```typescript
// useCustom - QUERY (this hook)
const { data, query } = useCustom({
  url: "/api/stats",
  method: "get" // ← Usually GET
});
// Executes automatically ✅
// Cached ✅
// Refetches on window focus ✅


// useCustomMutation - MUTATION (different hook)
const { mutate } = useCustomMutation();
mutate({
  url: "/api/order",
  method: "post", // ← POST/PUT/DELETE
  values: { ... }
});
// Executes manually (call mutate) ✅
// Not cached ✅
// Doesn't auto-refetch ✅
```

#### When to Use Which:

```tsx
// ✅ USE useCustom (Query):
// - Dashboard stats
// - Search results
// - Analytics data
// - Report viewing
// - Third-party API data

const { data } = useCustom({
  url: "/api/dashboard/stats",
  method: "get", // ← Read operation
});

// ✅ USE useCustomMutation (Mutation):
// - Send email
// - Generate report
// - Process payment
// - Trigger webhook
// - Clear cache

const { mutate } = useCustomMutation();
mutate({
  url: "/api/email/send",
  method: "post", // ← Write operation
  values: { to: "...", subject: "..." },
});
```

#### Interesting Case - POST as Query:

```tsx
// Some APIs use POST for search (complex queries)
// Still a "query" (read operation)!

const { data } = useCustom({
  url: "/api/search/advanced",
  method: "post", // ← POST but read-only!
  config: {
    payload: {
      filters: [...],
      aggregations: [...]
    }
  }
});

// This is OK! POST used because:
// - Query params too long for GET
// - Complex nested filters
// - But still read-only operation ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Automatic Execution** - Queries run on mount
- ✅ **Caching** - Avoid redundant requests
- ✅ **Refetching** - Auto-fresh data
- ✅ **Loading States** - Built-in pending/error states

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                  | Ví dụ đời thường   | Giải quyết vấn đề gì       | Trong useCustom                          |
| ------------------------ | ------------------ | -------------------------- | ---------------------------------------- |
| **Escape Hatch**         | Emergency exit     | Handle non-standard cases  | Custom endpoints outside CRUD            |
| **Adapter**              | Swiss Army knife   | Multi-method support       | Any HTTP method (GET/POST/etc)           |
| **Configuration Object** | Camera settings    | Group related params       | config object with query/payload/headers |
| **Side Effect**          | Auto light switch  | Automatic notifications    | useEffect for success/error              |
| **Query Pattern**        | Check bank balance | Read operations with cache | Auto-execute, cached, refetchable        |

---

## 3. KEY FEATURES

### 3.1 Method Flexibility

```typescript
// All HTTP methods supported:
useCustom({ url: "/api/data", method: "get" });
useCustom({ url: "/api/data", method: "post", config: { payload: {...} } });
useCustom({ url: "/api/data", method: "put", config: { payload: {...} } });
useCustom({ url: "/api/data", method: "patch", config: { payload: {...} } });
useCustom({ url: "/api/data", method: "delete" });
useCustom({ url: "/api/data", method: "head" });
useCustom({ url: "/api/data", method: "options" });
```

### 3.2 Config Object

```typescript
useCustom({
  url: "/api/endpoint",
  method: "get",
  config: {
    query: { page: 1, limit: 10 }, // URL params
    payload: { data: "..." }, // Request body
    headers: { Authorization: "..." }, // Custom headers
    sorters: [{ field: "name", order: "asc" }],
    filters: [{ field: "active", operator: "eq", value: true }],
  },
});
```

### 3.3 Automatic Notifications

```typescript
useCustom({
  url: "/api/stats",
  method: "get",
  successNotification: {
    message: "Stats loaded!",
    type: "success",
  },
  errorNotification: (error) => ({
    message: `Error: ${error.message}`,
    type: "error",
  }),
});
```

### 3.4 React Query Integration

```typescript
const { data, query } = useCustom({
  url: "/api/data",
  method: "get",
  queryOptions: {
    enabled: false,              // Don't auto-run
    refetchInterval: 5000,       // Refetch every 5s
    staleTime: 60000,            // Cache for 1 min
    retry: 3,                    // Retry 3 times on error
    onSuccess: (data) => { ... } // Custom callback
  }
});

// Access React Query methods:
query.refetch();      // Manual refetch
query.isFetching;     // Loading state
query.isError;        // Error state
query.error;          // Error object
```

### 3.5 Result Shape

```typescript
const { data, result, query, overtime } = useCustom({ ... });

// data = Full response from React Query
data?.data  // ← Your actual data

// result = Simplified data access
result.data  // ← Same as data?.data (with fallback to {})

// query = Full React Query observer
query.refetch();
query.isFetching;
query.error;

// overtime = Loading time tracking
overtime.elapsedTime; // ms since request started
```

---

## 4. COMMON USE CASES

### 4.1 Dashboard Statistics

```tsx
function Dashboard() {
  const { result, query } = useCustom({
    url: "/api/dashboard/stats",
    method: "get",
  });

  const stats = result.data;

  if (query.isLoading) return <div>Loading stats...</div>;
  if (query.isError) return <div>Error loading stats</div>;

  return (
    <div>
      <StatCard title="Total Users" value={stats.totalUsers} />
      <StatCard title="Revenue" value={`$${stats.revenue}`} />
      <StatCard title="Orders" value={stats.orderCount} />
    </div>
  );
}
```

### 4.2 Search with Complex Filters

```tsx
function AdvancedSearch() {
  const [filters, setFilters] = useState({
    keyword: "",
    category: "all",
    priceMin: 0,
    priceMax: 1000,
  });

  const { result, query } = useCustom({
    url: "/api/search",
    method: "post", // POST for complex search
    config: {
      payload: filters,
      sorters: [{ field: "relevance", order: "desc" }],
    },
  });

  return (
    <div>
      <SearchFilters filters={filters} onChange={setFilters} />
      {query.isLoading && <Spinner />}
      <SearchResults data={result.data} />
    </div>
  );
}
```

### 4.3 Third-Party API Integration

```tsx
function GitHubRepoInfo({ owner, repo }) {
  const { result, query } = useCustom({
    url: `https://api.github.com/repos/${owner}/${repo}`,
    method: "get",
    dataProviderName: "github", // Use specific provider
    queryOptions: {
      staleTime: 300000, // Cache for 5 minutes
    },
  });

  const repoData = result.data;

  return (
    <div>
      <h2>{repoData.name}</h2>
      <p>{repoData.description}</p>
      <div>⭐ {repoData.stargazers_count} stars</div>
      <div>🍴 {repoData.forks_count} forks</div>
    </div>
  );
}
```

### 4.4 Report Viewing (Not Generation)

```tsx
function ReportViewer({ reportId }) {
  const { result, query } = useCustom({
    url: `/api/reports/${reportId}/view`,
    method: "get",
    queryOptions: {
      // Refetch when window focused (report might be updated)
      refetchOnWindowFocus: true,
    },
  });

  return (
    <div>
      <h1>{result.data.title}</h1>
      <div>Generated: {result.data.generatedAt}</div>
      <ReportContent data={result.data.content} />
      <button onClick={() => query.refetch()}>Refresh Report</button>
    </div>
  );
}
```

### 4.5 Analytics Data

```tsx
function AnalyticsChart({ dateRange }) {
  const { result, query } = useCustom({
    url: "/api/analytics/pageviews",
    method: "get",
    config: {
      query: {
        start: dateRange.start,
        end: dateRange.end,
        granularity: "day",
      },
    },
    queryOptions: {
      // Don't cache analytics (always fresh data)
      cacheTime: 0,
    },
  });

  return (
    <div>
      <h3>Page Views</h3>
      {query.isLoading && <Spinner />}
      <Chart data={result.data.series} />
    </div>
  );
}
```

### 4.6 Health Check / Status

```tsx
function APIStatus() {
  const { query } = useCustom({
    url: "/api/health",
    method: "head", // HEAD request (no body)
    queryOptions: {
      refetchInterval: 30000, // Check every 30s
    },
  });

  return (
    <div>
      API Status:{" "}
      {query.isSuccess ? (
        <span style={{ color: "green" }}>✅ Healthy</span>
      ) : (
        <span style={{ color: "red" }}>❌ Down</span>
      )}
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why useEffect for Notifications?

**Question:** Why not use React Query's onSuccess callback?

**Answer:**

```typescript
// React Query's onSuccess:
// - Deprecated in v5 ❌
// - Only runs on first success (not refetch)
// - Discouraged pattern

// useEffect approach:
// - Runs on every success ✅
// - Works with refetch ✅
// - Future-proof ✅
// - Declarative ✅
```

### 5.2 Why result.data AND query.data?

**Answer:** Convenience + Full Access

```typescript
const { result, query } = useCustom({ ... });

// result.data = Convenience (with fallback)
result.data // ← Always defined (empty object if no data)
// Good for: Direct rendering

// query.data = Full access (can be undefined)
query.data?.data // ← Can be undefined
// Good for: Conditional logic

// Both useful! User chooses!
```

### 5.3 Why Require custom() Method?

**Question:** Why throw error if provider lacks custom()?

**Answer:**

```typescript
// From code (line 241):
if (custom) {
  // ... use custom()
}
throw Error("Not implemented custom on data provider.");

// Reason:
// - useCustom is escape hatch
// - If provider can't do custom queries, it's incomplete
// - Better to fail fast than silent error
// - Forces providers to support flexibility
```

---

## 6. COMMON PITFALLS

### 6.1 Using for Mutations (Should Use useCustomMutation)

```tsx
// ❌ WRONG - Mutation with useCustom
const { query } = useCustom({
  url: "/api/order",
  method: "post",
  config: { payload: orderData },
});
// Problem:
// - Executes automatically! ❌
// - Caches the mutation! ❌
// - Might execute multiple times! ❌

// ✅ CORRECT - Use useCustomMutation
const { mutate } = useCustomMutation();
mutate({
  url: "/api/order",
  method: "post",
  values: orderData,
});
// - Executes manually ✅
// - Not cached ✅
// - Executes once ✅
```

### 6.2 Forgetting queryOptions.enabled

```tsx
// ❌ WRONG - Auto-execute on mount
const { query } = useCustom({
  url: "/api/reports/generate",
  method: "post",
});
// Generates report immediately on mount! ❌

// ✅ CORRECT - Disable auto-execution
const { query } = useCustom({
  url: "/api/reports/generate",
  method: "post",
  queryOptions: {
    enabled: false, // ← Don't run automatically
  },
});
// Then trigger manually:
<button onClick={() => query.refetch()}>Generate</button>;
```

### 6.3 Not Handling Loading/Error States

```tsx
// ❌ WRONG - No loading state
function Stats() {
  const { result } = useCustom({ url: "/api/stats", method: "get" });

  return <div>Total: {result.data.total}</div>;
  // Shows undefined before data loads! ❌
}

// ✅ CORRECT - Handle states
function Stats() {
  const { result, query } = useCustom({ url: "/api/stats", method: "get" });

  if (query.isLoading) return <Spinner />;
  if (query.isError) return <Error message={query.error.message} />;

  return <div>Total: {result.data.total}</div>; // ✅
}
```

### 6.4 Incorrect URL Format

```tsx
// ❌ WRONG - Relative URL without leading slash
useCustom({
  url: "api/stats", // ← Missing leading /
  method: "get",
});
// Might resolve to wrong URL!

// ✅ CORRECT - Absolute or proper relative URL
useCustom({
  url: "/api/stats", // ← Leading slash
  method: "get",
});

// OR - Full URL for external API
useCustom({
  url: "https://api.example.com/stats",
  method: "get",
});
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Caching Strategy

```typescript
// Default: Standard caching
useCustom({
  url: "/api/stats",
  method: "get",
  // Uses React Query default cache (5 minutes)
});

// Fresh data always:
useCustom({
  url: "/api/realtime-price",
  method: "get",
  queryOptions: {
    cacheTime: 0, // Don't cache
    staleTime: 0, // Always stale
  },
});

// Long cache for static data:
useCustom({
  url: "/api/countries",
  method: "get",
  queryOptions: {
    cacheTime: Infinity, // Cache forever
    staleTime: Infinity, // Never stale
  },
});
```

### 7.2 Polling (Auto-Refetch)

```typescript
// Poll every 10 seconds
useCustom({
  url: "/api/order-status",
  method: "get",
  queryOptions: {
    refetchInterval: 10000, // 10s
  },
});

// Smart polling (only when window focused)
useCustom({
  url: "/api/notifications",
  method: "get",
  queryOptions: {
    refetchInterval: 5000,
    refetchIntervalInBackground: false, // Stop when tab inactive
  },
});
```

### 7.3 Dependent Queries

```typescript
// Wait for user data before fetching preferences
function UserPreferences() {
  const { data: user } = useOne({ resource: "users", id: userId });

  const { result } = useCustom({
    url: `/api/users/${user?.id}/preferences`,
    method: "get",
    queryOptions: {
      enabled: !!user?.id, // Only run when user loaded
    },
  });

  return <div>{result.data.theme}</div>;
}
```

---

## 8. TESTING

### 8.1 Unit Test

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useCustom } from "./useCustom";

describe("useCustom", () => {
  it("should fetch custom endpoint", async () => {
    const mockCustom = jest.fn(() => Promise.resolve({ data: { total: 100 } }));

    const mockDataProvider = {
      custom: mockCustom,
    };

    const { result } = renderHook(
      () =>
        useCustom({
          url: "/api/stats",
          method: "get",
        }),
      {
        wrapper: ({ children }) => (
          <Refine dataProvider={mockDataProvider}>{children}</Refine>
        ),
      },
    );

    await waitFor(() => {
      expect(mockCustom).toHaveBeenCalledWith({
        url: "/api/stats",
        method: "get",
        meta: expect.any(Object),
      });
      expect(result.current.result.data.total).toBe(100);
    });
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Escape Hatch**: Handle non-CRUD endpoints
- ✅ **Adapter**: Any HTTP method support
- ✅ **Configuration Object**: Group related params
- ✅ **Side Effect**: Auto notifications via useEffect
- ✅ **Query Pattern**: Read operations with caching

### Key Features

1. **Any Endpoint** - Not limited to CRUD
2. **Any Method** - GET, POST, PUT, PATCH, DELETE, etc
3. **Config Object** - query, payload, headers, filters, sorters
4. **Auto Notifications** - Success/error handling
5. **React Query** - Full caching + refetch support

### Khi nào dùng useCustom?

✅ **Nên dùng:**

- Dashboard stats/analytics
- Search endpoints
- Third-party APIs
- Report viewing
- Health checks
- Custom aggregations

❌ **Không dùng:**

- Standard CRUD (use useOne, useList, etc)
- Mutations that change data (use useCustomMutation)
- File uploads (use useCreate with FormData)

### Remember

✅ **243 lines** - Flexible query hook
🚪 **Escape Hatch** - For non-CRUD endpoints
🔌 **Adapter** - Any HTTP method
⚙️ **Config Object** - Clean grouping
⚡ **Side Effect** - Auto notifications
🔄 **Query** - Not mutation (auto-execute, cached)

### Pro Tips

1. **Use for READ operations** - Writes → useCustomMutation
2. **Set enabled: false** - For manual trigger
3. **Handle loading/error** - Always check query states
4. **Cache appropriately** - Fresh vs static data
5. **POST for complex queries** - OK for read operations
6. **Third-party APIs** - Works with external endpoints

---

> 📚 **Note**: For write operations (creating/updating data), use `useCustomMutation` instead! `useCustom` is for read operations with automatic execution and caching.
