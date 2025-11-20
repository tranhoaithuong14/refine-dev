# 📘 HƯỚNG DẪN HOÀN CHỈNH VỀ useCustom HOOK

> **TL;DR:** `useCustom` là hook để gọi custom API endpoints không có trong CRUD standard (create, read, update, delete). Nó sử dụng `useQuery` của React Query và tự động xử lý notifications, error handling, và loading states.

---

## 📋 MỤC LỤC

1. [Vấn Đề Ban Đầu - Tại Sao Cần useCustom?](#1-vấn-đề-ban-đầu)
2. [useQuery vs useMutation - Tại Sao useCustom Dùng useQuery?](#2-usequery-vs-usemutation)
3. [useCustom Hook - Tổng Quan](#3-usecustom-hook)
4. [Kiến Trúc Nội Bộ](#4-kiến-trúc-nội-bộ)
5. [Luồng Hoạt Động Chi Tiết](#5-luồng-hoạt-động)
6. [Config Options Deep Dive](#6-config-options)
7. [Source Code Analysis](#7-source-code-analysis)
8. [Ví Dụ Thực Tế](#8-ví-dụ-thực-tế)
9. [Best Practices & Patterns](#9-best-practices)
10. [So Sánh Với useCustomMutation](#10-so-sánh-với-usecustommutation)
11. [Tóm Tắt & Kết Luận](#11-tóm-tắt)

---

## 1. VẤN ĐỀ BAN ĐẦU - TẠI SAO CẦN useCustom?

### 1.1. Giới Hạn Của CRUD Standard

**CRUD standard chỉ cover 5 operations cơ bản:**

```typescript
// ✅ CRUD operations - Có hooks sẵn
useList({ resource: "posts" }); // GET /posts
useOne({ resource: "posts", id: 1 }); // GET /posts/1
useCreate({ resource: "posts", values: {...} }); // POST /posts
useUpdate({ resource: "posts", id: 1, values: {...} }); // PUT /posts/1
useDelete({ resource: "posts", id: 1 }); // DELETE /posts/1
```

**Nhưng real-world APIs có nhiều endpoints khác:**

```typescript
// ❌ Không fit vào CRUD pattern - Cần custom calls!
POST /posts/1/publish      // Publish a post
POST /posts/1/archive      // Archive a post
GET  /posts/1/analytics    // Get post analytics
POST /posts/import         // Import bulk posts
GET  /posts/export         // Export posts to CSV
POST /auth/forgot-password // Forgot password
GET  /dashboard/metrics    // Dashboard metrics
POST /generate-report      // Generate report
```

### 1.2. Cách Cũ - Dùng fetch Trực Tiếp

**❌ Without useCustom:**

```typescript
function PostAnalytics({ postId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/posts/${postId}/analytics`);
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
        alert("Error fetching analytics!");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [postId]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>Views: {data?.views}</div>;
}
```

**Vấn đề:**

- ❌ Phải manage state manually (loading, error, data)
- ❌ Không có caching
- ❌ Không có retry mechanism
- ❌ Không có refetch on window focus
- ❌ Không có notifications
- ❌ Không integrate với Refine ecosystem

### 1.3. Cách Mới - Dùng useCustom

**✅ With useCustom:**

```typescript
function PostAnalytics({ postId }) {
  const { data, isLoading, isError } = useCustom({
    url: `/posts/${postId}/analytics`,
    method: "get",
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error loading analytics</div>;

  return <div>Views: {data?.data.views}</div>;
}
```

**Lợi ích:**

- ✅ **Đơn giản** - Chỉ cần url + method
- ✅ **Caching** - React Query tự động cache
- ✅ **Retry** - Tự động retry khi fail
- ✅ **Refetch** - Auto refetch on window focus
- ✅ **Notifications** - Tích hợp notifications
- ✅ **Error handling** - Centralized error handling
- ✅ **Loading states** - isPending, isFetching, isRefetching
- ✅ **TypeScript** - Full type safety

---

## 2. useQuery vs useMutation - TẠI SAO useCustom DÙNG useQuery?

### 2.1. React Query - 2 Loại Operations

```
┌──────────────┬─────────────────────────────────────────┐
│ useQuery     │ Đọc dữ liệu (Read Operations)           │
│              │ - Tự động fetch khi mount               │
│              │ - Cache kết quả                         │
│              │ - Auto refetch                          │
│              │ - VD: GET requests                      │
├──────────────┼─────────────────────────────────────────┤
│ useMutation  │ Thay đổi dữ liệu (Write Operations)     │
│              │ - Phải gọi manual (mutate)              │
│              │ - Không cache                           │
│              │ - Không auto refetch                    │
│              │ - VD: POST, PUT, DELETE requests        │
└──────────────┴─────────────────────────────────────────┘
```

### 2.2. Tại Sao useCustom Dùng useQuery?

**Design decision: useCustom dùng useQuery vì:**

1. **Caching hữu ích cho read operations**

```typescript
// ✅ Dashboard metrics - fetch 1 lần, cache, reuse
const { data } = useCustom({
  url: "/dashboard/metrics",
  method: "get", // Read operation
});

// Cache giúp:
// - User chuyển tab khác → quay lại → instant (dùng cache)
// - Multiple components cùng fetch → deduplicate
// - Background refetch → keep data fresh
```

2. **Auto refetch cho fresh data**

```typescript
// ✅ Real-time data như stock prices
const { data } = useCustom({
  url: "/stocks/AAPL/price",
  method: "get",
  queryOptions: {
    refetchInterval: 5000, // Refetch every 5s
  },
});

// Auto refetch khi:
// - Window focus lại
// - Network reconnect
// - Interval timer
```

3. **Suspense & optimistic updates**

```typescript
// ✅ React Suspense support
const { data } = useCustom({
  url: "/user/profile",
  method: "get",
  queryOptions: {
    suspense: true, // Works with Suspense
  },
});
```

### 2.3. Write Operations - Nên Dùng useCustomMutation

**⚠️ useCustom KHÔNG phù hợp cho write operations:**

```typescript
// ❌ BAD - Write operation với useCustom
const { data } = useCustom({
  url: "/posts/1/publish",
  method: "post", // Write operation
});
// Vấn đề:
// - Tự động chạy khi mount (không mong muốn!)
// - Cache result (không cần thiết)
// - Auto refetch (lãng phí!)

// ✅ GOOD - Dùng useCustomMutation thay vào
const { mutate } = useCustomMutation();
mutate({
  url: "/posts/1/publish",
  method: "post",
  values: {},
});
// - Chỉ chạy khi gọi mutate() (control được)
// - Không cache (đúng với write operation)
// - Không auto refetch (không lãng phí)
```

### 2.4. Decision Tree

```
Cần gọi custom API endpoint?
    ↓
Read operation (GET)?
    ├─ YES → useCustom() ✅
    │   - Fetch 1 lần, cache, reuse
    │   - Auto refetch để keep fresh
    │   - VD: analytics, metrics, reports
    │
    └─ NO → Write operation (POST/PUT/DELETE)?
        └─ YES → useCustomMutation() ✅
            - Manual trigger khi cần
            - Không cache
            - VD: publish, archive, import
```

---

## 3. useCustom HOOK - TỔNG QUAN

### 3.1. Type Signature

```typescript
const useCustom = <TQueryFnData, TError, TQuery, TPayload, TData>({
  url, // Required - API endpoint
  method, // Required - HTTP method
  config?, // Optional - query, payload, headers, filters, sorters
  queryOptions?, // Optional - React Query options
  successNotification?, // Optional - Success notification config
  errorNotification?, // Optional - Error notification config
  meta?, // Optional - Metadata for data provider
  dataProviderName?, // Optional - Data provider name
  overtimeOptions?, // Optional - Loading overtime options
}: UseCustomProps): UseCustomReturnType;
```

### 3.2. Parameters

**Required:**

```typescript
{
  url: string;              // "/posts/1/analytics"
  method: "get" | "post" | "put" | "patch" | "delete" | "head" | "options";
}
```

**Optional:**

```typescript
{
  config?: {
    query?: Record<string, any>;    // URL query params
    payload?: any;                  // Request body
    headers?: Record<string, string>; // Custom headers
    filters?: CrudFilter[];         // Filters (Refine format)
    sorters?: CrudSort[];           // Sorters (Refine format)
  };
  queryOptions?: UseQueryOptions;   // React Query options
  successNotification?: NotificationConfig | Function;
  errorNotification?: NotificationConfig | Function;
  meta?: MetaQuery;                 // Metadata
  dataProviderName?: string;        // Provider name
  overtimeOptions?: OvertimeOptions; // Loading overtime tracking
}
```

### 3.3. Return Value

```typescript
{
  // Query result (React Query)
  query: QueryObserverResult<CustomResponse<TData>, TError>;
  // Shorthand for data
  result: {
    data: TData | undefined;
  };
  // Loading overtime tracking
  overtime: {
    elapsedTime: number | undefined;
  };
}
```

**Query result includes:**

```typescript
{
  data: CustomResponse<TData>;     // Response data
  error: TError | null;            // Error if failed
  isLoading: boolean;              // Initial loading
  isFetching: boolean;             // Any fetching (including refetch)
  isRefetching: boolean;           // Background refetch
  isSuccess: boolean;              // Fetch succeeded
  isError: boolean;                // Fetch failed
  refetch: () => Promise;          // Manual refetch
  // ... và nhiều fields khác
}
```

### 3.4. Cách Sử Dụng Cơ Bản

**Example 1: Simple GET request**

```typescript
const { data, isLoading } = useCustom({
  url: "/dashboard/metrics",
  method: "get",
});

// data = { data: { views: 1000, clicks: 500 } }
```

**Example 2: GET with query params**

```typescript
const { data } = useCustom({
  url: "/posts/search",
  method: "get",
  config: {
    query: {
      q: "react",
      page: 1,
      limit: 10,
    },
  },
});

// Calls: GET /posts/search?q=react&page=1&limit=10
```

**Example 3: POST with payload**

```typescript
const { data } = useCustom({
  url: "/generate-report",
  method: "post",
  config: {
    payload: {
      format: "pdf",
      dateRange: "last-month",
    },
  },
});

// Calls: POST /generate-report
// Body: { format: "pdf", dateRange: "last-month" }
```

### 3.5. Khi Nào Dùng useCustom?

**✅ Dùng khi:**

- GET requests cho custom endpoints
- Dashboard metrics, analytics, reports
- Search, autocomplete, suggestions
- Export data (CSV, PDF, etc.)
- Custom filters/aggregations
- Third-party API integration

**❌ KHÔNG dùng khi:**

- Standard CRUD operations → Dùng useList, useOne, useCreate, useUpdate, useDelete
- Write operations (POST/PUT/DELETE) → Dùng useCustomMutation
- WebSocket/SSE streams → Dùng custom hooks
- File downloads requiring authentication → Dùng custom solution

---

## 4. KIẾN TRÚC NỘI BỘ

### 4.1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    useCustom Hook                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  INPUT                                                  │
│  ┌───────────────────────────────────────────┐         │
│  │ {                                         │         │
│  │   url: "/posts/1/analytics",              │         │
│  │   method: "get",                          │         │
│  │   config: { query: {...} },               │         │
│  │   queryOptions: {...},                    │         │
│  │ }                                         │         │
│  └───────────────────────────────────────────┘         │
│           ↓                                            │
│  ┌───────────────────────────────────────────┐         │
│  │     DEPENDENCIES (Hooks)                  │         │
│  ├───────────────────────────────────────────┤         │
│  │ • useDataProvider() → API client          │         │
│  │ • useHandleNotification() → Toasts        │         │
│  │ • useTranslate() → i18n                   │         │
│  │ • useOnError() → Error handling           │         │
│  │ • useMeta() → Metadata                    │         │
│  │ • useKeys() → Query keys                  │         │
│  └───────────────────────────────────────────┘         │
│           ↓                                            │
│  ┌───────────────────────────────────────────┐         │
│  │       useQuery (React Query)              │         │
│  ├───────────────────────────────────────────┤         │
│  │ queryKey: ["custom", url, method, ...]    │         │
│  │ queryFn: () => dataProvider.custom(...)   │         │
│  │ - Auto fetch on mount                     │         │
│  │ - Cache result                            │         │
│  │ - Auto refetch                            │         │
│  └───────────────────────────────────────────┘         │
│           ↓                                            │
│  ┌───────────────────────────────────────────┐         │
│  │     useEffect (Side Effects)              │         │
│  ├───────────────────────────────────────────┤         │
│  │ • onSuccess → Show notification           │         │
│  │ • onError → Check error + Show toast      │         │
│  └───────────────────────────────────────────┘         │
│           ↓                                            │
│  OUTPUT                                                │
│  ┌───────────────────────────────────────────┐         │
│  │ {                                         │         │
│  │   query: QueryObserverResult,             │         │
│  │   result: { data },                       │         │
│  │   overtime: { elapsedTime }               │         │
│  │ }                                         │         │
│  └───────────────────────────────────────────┘         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 4.2. Layer Breakdown

**Layer 1: User Input**

```typescript
const { data } = useCustom({
  url: "/posts/1/analytics",
  method: "get",
});
```

**Layer 2: Hook Dependencies**

```typescript
const dataProvider = useDataProvider();
const translate = useTranslate();
const { mutate: checkError } = useOnError();
const handleNotification = useHandleNotification();
const getMeta = useMeta();
const { keys } = useKeys();
```

**Layer 3: useQuery (React Query)**

```typescript
const queryResponse = useQuery({
  queryKey: ["custom", url, method, ...],
  queryFn: () => dataProvider().custom({ url, method, ... }),
  ...queryOptions,
});
```

**Layer 4: Side Effects (useEffect)**

```typescript
useEffect(() => {
  if (queryResponse.isSuccess) {
    handleNotification(successNotification);
  }
}, [queryResponse.isSuccess]);

useEffect(() => {
  if (queryResponse.isError) {
    checkError(queryResponse.error);
    handleNotification(errorNotification);
  }
}, [queryResponse.isError]);
```

**Layer 5: Return Result**

```typescript
return {
  query: queryResponse,
  result: { data: queryResponse.data?.data },
  overtime: { elapsedTime },
};
```

---

## 5. LUỒNG HOẠT ĐỘNG CHI TIẾT

### 5.1. Complete Flow - Success Case

```
┌─────────────────────────────────────────────────────────────┐
│ STEP-BY-STEP FLOW - SUCCESS CASE                           │
└─────────────────────────────────────────────────────────────┘

1. Component mounts
   ↓
   function PostAnalytics() {
     const { data, isLoading } = useCustom({
       url: "/posts/1/analytics",
       method: "get"
     });
   }
   ↓

2. useCustom initializes
   ↓
   - Get dependencies (dataProvider, translate, etc.)
   - Get custom method from data provider
   - Build query key
   ↓

3. useQuery executes
   ↓
   queryKey: ["data", "default", "custom", {
     method: "get",
     url: "/posts/1/analytics"
   }]
   ↓
   queryFn: () => dataProvider().custom({
     url: "/posts/1/analytics",
     method: "get"
   })
   ↓

4. Data provider makes API call
   ↓
   GET /posts/1/analytics
   ↓

5. Server responds
   ↓
   200 OK
   {
     views: 1000,
     clicks: 500,
     shares: 50
   }
   ↓

6. useQuery updates state
   ↓
   queryResponse.isLoading = false
   queryResponse.isSuccess = true
   queryResponse.data = {
     data: {
       views: 1000,
       clicks: 500,
       shares: 50
     }
   }
   ↓

7. useEffect (success) triggers
   ↓
   if (queryResponse.isSuccess) {
     handleNotification(successNotification);
   }
   ↓
   🎉 Toast: "Analytics loaded successfully!"
   ↓

8. Component receives data
   ↓
   data = {
     views: 1000,
     clicks: 500,
     shares: 50
   }
   isLoading = false
   ↓

9. Component renders
   ↓
   <div>Views: 1000</div>
   ✅ DONE!
```

### 5.2. Complete Flow - Error Case

```
┌─────────────────────────────────────────────────────────────┐
│ STEP-BY-STEP FLOW - ERROR CASE                             │
└─────────────────────────────────────────────────────────────┘

1-4. [Same as success case]
   ↓

5. Server responds with error
   ↓
   403 Forbidden
   {
     message: "You don't have permission to view analytics",
     statusCode: 403
   }
   ↓

6. useQuery updates state
   ↓
   queryResponse.isLoading = false
   queryResponse.isError = true
   queryResponse.error = {
     message: "You don't have permission...",
     statusCode: 403
   }
   ↓

7. useEffect (error) triggers
   ↓
   if (queryResponse.isError) {
     // LAYER 1: Check if auth error
     checkError(queryResponse.error);
     // If 401/403 → logout & redirect

     // LAYER 2: Show error notification
     handleNotification(errorNotification, {
       message: "Error (status code: 403)",
       description: "You don't have permission...",
       type: "error"
     });
   }
   ↓
   🚨 Toast: "Error - You don't have permission..."
   ↓

8. Component receives error
   ↓
   data = undefined
   isLoading = false
   isError = true
   error = { message: "...", statusCode: 403 }
   ↓

9. Component renders error state
   ↓
   <div>Error loading analytics</div>
   ❌ DONE
```

### 5.3. Refetch Flow

```
┌─────────────────────────────────────────────────────────────┐
│ REFETCH FLOW                                                │
└─────────────────────────────────────────────────────────────┘

Scenario 1: Manual refetch
   ↓
   const { refetch } = useCustom({ url: "/metrics", method: "get" });
   ↓
   <button onClick={() => refetch()}>Refresh</button>
   ↓
   User clicks button
   ↓
   refetch() is called
   ↓
   useQuery refetches data
   ↓
   isFetching = true, isRefetching = true
   ↓
   API call → response
   ↓
   isFetching = false, isRefetching = false
   ↓
   Updated data rendered

Scenario 2: Auto refetch on window focus
   ↓
   User switches to another tab
   ↓
   User switches back
   ↓
   useQuery detects window focus
   ↓
   Auto refetch (if staleTime passed)
   ↓
   Fresh data loaded

Scenario 3: Interval refetch
   ↓
   useCustom({
     url: "/stock/price",
     method: "get",
     queryOptions: {
       refetchInterval: 5000  // Every 5 seconds
     }
   })
   ↓
   Every 5s → auto refetch
   ↓
   Real-time data updates
```

---

## 6. CONFIG OPTIONS DEEP DIVE

### 6.1. config.query - URL Query Parameters

**Purpose:** Add query parameters to URL

```typescript
const { data } = useCustom({
  url: "/posts/search",
  method: "get",
  config: {
    query: {
      q: "react",
      page: 1,
      limit: 10,
      sort: "createdAt",
    },
  },
});

// Resulting URL:
// GET /posts/search?q=react&page=1&limit=10&sort=createdAt
```

**Use cases:**

- Search/filter parameters
- Pagination
- Sorting
- API versioning
- Custom flags

### 6.2. config.payload - Request Body

**Purpose:** Send data in request body (POST/PUT/PATCH)

```typescript
const { data } = useCustom({
  url: "/generate-report",
  method: "post",
  config: {
    payload: {
      format: "pdf",
      dateRange: {
        from: "2024-01-01",
        to: "2024-12-31",
      },
      includeCharts: true,
    },
  },
});

// Request body:
// {
//   "format": "pdf",
//   "dateRange": { "from": "2024-01-01", "to": "2024-12-31" },
//   "includeCharts": true
// }
```

### 6.3. config.headers - Custom Headers

**Purpose:** Add custom HTTP headers

```typescript
const { data } = useCustom({
  url: "/external-api/data",
  method: "get",
  config: {
    headers: {
      "X-API-Key": "your-api-key",
      "X-Custom-Header": "value",
      Authorization: "Bearer token",
    },
  },
});

// Request headers:
// X-API-Key: your-api-key
// X-Custom-Header: value
// Authorization: Bearer token
```

**Use cases:**

- API authentication
- Custom tracking headers
- Content negotiation
- Rate limiting tokens

### 6.4. config.filters - Refine Filters

**Purpose:** Use Refine's filter format (converted by data provider)

```typescript
const { data } = useCustom({
  url: "/posts/filtered",
  method: "get",
  config: {
    filters: [
      {
        field: "status",
        operator: "eq",
        value: "published",
      },
      {
        field: "createdAt",
        operator: "gte",
        value: "2024-01-01",
      },
    ],
  },
});

// Data provider converts to appropriate format:
// REST: GET /posts/filtered?status=published&createdAt_gte=2024-01-01
// GraphQL: { where: { status: { _eq: "published" }, createdAt: { _gte: "2024-01-01" } } }
```

### 6.5. config.sorters - Refine Sorters

**Purpose:** Use Refine's sorter format

```typescript
const { data } = useCustom({
  url: "/posts/sorted",
  method: "get",
  config: {
    sorters: [
      {
        field: "createdAt",
        order: "desc",
      },
      {
        field: "title",
        order: "asc",
      },
    ],
  },
});

// Data provider converts to appropriate format:
// REST: GET /posts/sorted?_sort=createdAt&_order=desc
// GraphQL: { orderBy: [{ createdAt: DESC }, { title: ASC }] }
```

### 6.6. queryOptions - React Query Options

**Purpose:** Control React Query behavior

```typescript
const { data } = useCustom({
  url: "/dashboard/metrics",
  method: "get",
  queryOptions: {
    // Caching
    staleTime: 60000, // Consider data fresh for 60s
    cacheTime: 300000, // Keep in cache for 5 minutes

    // Refetching
    refetchOnWindowFocus: true, // Refetch on window focus
    refetchOnMount: true, // Refetch on component mount
    refetchOnReconnect: true, // Refetch on network reconnect
    refetchInterval: 5000, // Refetch every 5 seconds

    // Retry
    retry: 3, // Retry 3 times on failure
    retryDelay: 1000, // Wait 1s between retries

    // Enabled
    enabled: true, // Enable/disable query

    // Data transformation
    select: (data) => {
      // Transform data before returning
      return {
        ...data,
        data: {
          totalViews: data.data.views * 2,
        },
      };
    },

    // Callbacks
    onSuccess: (data) => {
      console.log("Success:", data);
    },
    onError: (error) => {
      console.error("Error:", error);
    },
  },
});
```

### 6.7. Notifications

**successNotification - Static config:**

```typescript
const { data } = useCustom({
  url: "/posts/1/analytics",
  method: "get",
  successNotification: {
    message: "Analytics loaded!",
    description: "Successfully fetched post analytics",
    type: "success",
  },
});
```

**successNotification - Dynamic (function):**

```typescript
const { data } = useCustom({
  url: "/posts/1/analytics",
  method: "get",
  successNotification: (data, config) => ({
    message: `Analytics for ${data.data.postTitle}`,
    description: `Views: ${data.data.views}`,
    type: "success",
  }),
});
```

**Disable notifications:**

```typescript
const { data } = useCustom({
  url: "/silent-endpoint",
  method: "get",
  successNotification: false, // No success notification
  errorNotification: false, // No error notification
});
```

---

## 7. SOURCE CODE ANALYSIS

### 7.1. Full Code với Comments

```typescript
export const useCustom = <TQueryFnData, TError, TQuery, TPayload, TData>({
  url,
  method,
  config,
  queryOptions,
  successNotification,
  errorNotification,
  meta,
  dataProviderName,
  overtimeOptions,
}: UseCustomProps): UseCustomReturnType<TData, TError> => {
  // ============================================================================
  // STEP 1: INITIALIZE DEPENDENCIES
  // ============================================================================

  const dataProvider = useDataProvider();
  const translate = useTranslate();
  const { mutate: checkError } = useOnError();
  const handleNotification = useHandleNotification();
  const getMeta = useMeta();
  const { keys } = useKeys();

  const preferredMeta = meta;

  // ============================================================================
  // STEP 2: GET CUSTOM METHOD FROM DATA PROVIDER
  // ============================================================================

  const { custom } = dataProvider(dataProviderName);

  // Combine metadata
  const combinedMeta = getMeta({ meta: preferredMeta });

  // ============================================================================
  // STEP 3: CHECK IF CUSTOM METHOD EXISTS
  // ============================================================================

  if (custom) {
    // ========================================================================
    // STEP 4: CREATE QUERY WITH useQuery
    // ========================================================================

    const queryResponse = useQuery<
      CustomResponse<TQueryFnData>,
      TError,
      CustomResponse<TData>
    >({
      // Query key - Unique identifier cho cache
      queryKey: keys()
        .data(dataProviderName)
        .mutation("custom")
        .params({
          method,
          url,
          ...config,
          ...(preferredMeta || {}),
        })
        .get(),

      // Query function - Hàm fetch data
      queryFn: (context) =>
        custom<TQueryFnData>({
          url,
          method,
          ...config, // query, payload, headers, filters, sorters
          meta: {
            ...combinedMeta,
            ...prepareQueryContext(context as any),
          },
        }),

      // Merge with user-provided options
      ...queryOptions,

      // Meta for DevTools
      meta: {
        ...queryOptions?.meta,
        ...getXRay("useCustom"),
      },
    });

    // ========================================================================
    // STEP 5: HANDLE SUCCESS (useEffect)
    // ========================================================================

    useEffect(() => {
      if (queryResponse.isSuccess && queryResponse.data) {
        // Prepare notification config
        const notificationConfig =
          typeof successNotification === "function"
            ? successNotification(queryResponse.data, {
                ...config,
                ...combinedMeta,
              })
            : successNotification;

        // Show notification
        handleNotification(notificationConfig);
      }
    }, [queryResponse.isSuccess, queryResponse.data, successNotification]);

    // ========================================================================
    // STEP 6: HANDLE ERROR (useEffect)
    // ========================================================================

    useEffect(() => {
      if (queryResponse.isError && queryResponse.error) {
        // Check if auth error (401/403)
        checkError(queryResponse.error);

        // Prepare notification config
        const notificationConfig =
          typeof errorNotification === "function"
            ? errorNotification(queryResponse.error, {
                ...config,
                ...combinedMeta,
              })
            : errorNotification;

        // Show error notification
        handleNotification(notificationConfig, {
          key: `${method}-notification`,
          message: translate(
            "notifications.error",
            { statusCode: queryResponse.error.statusCode },
            `Error (status code: ${queryResponse.error.statusCode})`,
          ),
          description: queryResponse.error.message,
          type: "error",
        });
      }
    }, [queryResponse.isError, queryResponse.error?.message]);

    // ========================================================================
    // STEP 7: TRACK LOADING OVERTIME
    // ========================================================================

    const { elapsedTime } = useLoadingOvertime({
      ...overtimeOptions,
      isLoading: queryResponse.isFetching,
    });

    // ========================================================================
    // STEP 8: RETURN RESULT
    // ========================================================================

    return {
      query: queryResponse, // Full React Query result
      result: {
        data: queryResponse.data?.data || EMPTY_OBJECT, // Shorthand
      },
      overtime: { elapsedTime },
    };
  }

  // ============================================================================
  // STEP 9: ERROR IF CUSTOM METHOD NOT IMPLEMENTED
  // ============================================================================

  throw Error("Not implemented custom on data provider.");
};
```

### 7.2. Query Key Structure

**Query key format:**

```typescript
["data", dataProviderName, "custom", { method, url, ...config, ...meta }];
```

**Example:**

```typescript
// useCustom({ url: "/posts/1/analytics", method: "get" })
[
  "data",
  "default",
  "custom",
  {
    method: "get",
    url: "/posts/1/analytics",
  },
];

// useCustom({ url: "/search", method: "get", config: { query: { q: "react" } } })
[
  "data",
  "default",
  "custom",
  {
    method: "get",
    url: "/search",
    query: { q: "react" },
  },
];
```

**Tại sao cần query key?**

1. **Caching:** React Query dùng key để cache data

```typescript
// First call
useCustom({ url: "/metrics", method: "get" });
// → Fetch from API → Cache với key ["data", "default", "custom", { method: "get", url: "/metrics" }]

// Second call (same key)
useCustom({ url: "/metrics", method: "get" });
// → Return từ cache (instant!) → Background refetch nếu stale
```

2. **Deduplication:** Multiple calls cùng key → chỉ 1 request

```typescript
// 3 components cùng gọi:
<ComponentA>
  useCustom({ url: "/metrics", method: "get" })
</ComponentA>
<ComponentB>
  useCustom({ url: "/metrics", method: "get" })
</ComponentB>
<ComponentC>
  useCustom({ url: "/metrics", method: "get" })
</ComponentC>

// React Query: Cùng key → Chỉ 1 API call → 3 components share data
```

3. **Invalidation:** Xóa cache khi cần

```typescript
// Invalidate specific query
queryClient.invalidateQueries(["data", "default", "custom", { url: "/metrics" }]);

// Invalidate all custom queries
queryClient.invalidateQueries(["data", "default", "custom"]);
```

### 7.3. useEffect Pattern - Tại Sao Không Dùng onSuccess Callback?

**React Query v5 deprecated callbacks trong config:**

```typescript
// ❌ OLD WAY (React Query v4) - Deprecated
useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
  onSuccess: (data) => {
    // This is deprecated!
  },
  onError: (error) => {
    // This is deprecated!
  },
});

// ✅ NEW WAY (React Query v5) - Use useEffect
const queryResult = useQuery({
  queryKey: ["data"],
  queryFn: fetchData,
});

useEffect(() => {
  if (queryResult.isSuccess) {
    // Handle success
  }
}, [queryResult.isSuccess]);

useEffect(() => {
  if (queryResult.isError) {
    // Handle error
  }
}, [queryResult.isError]);
```

**Tại sao thay đổi?**

- ✅ **Consistent with React model** - Effects run after render
- ✅ **Better control** - Can customize dependencies
- ✅ **Avoid stale closures** - Access latest props/state
- ✅ **Easier testing** - Effects are more testable

### 7.4. EMPTY_OBJECT Pattern

**Code:**

```typescript
const EMPTY_OBJECT = Object.freeze({}) as any;

return {
  result: {
    data: queryResponse.data?.data || EMPTY_OBJECT,
  },
};
```

**Tại sao?**

1. **Avoid creating new objects on every render:**

```typescript
// ❌ BAD - Creates new {} on every render
data: queryResponse.data?.data || {};

// ✅ GOOD - Reuses same object reference
data: queryResponse.data?.data || EMPTY_OBJECT;
```

2. **Object.freeze prevents mutation:**

```typescript
const obj = EMPTY_OBJECT;
obj.foo = "bar"; // ❌ Error in strict mode / Silent fail in non-strict
```

3. **Type assertion `as any`:**

```typescript
// Allow using EMPTY_OBJECT for any type
const data: { views: number } = EMPTY_OBJECT; // ✅ TypeScript OK
```

---

## 8. VÍ DỤ THỰC TẾ

### 8.1. Dashboard Metrics

```typescript
// ============================================
// Real-time dashboard metrics
// ============================================
function DashboardMetrics() {
  const { data, isLoading, refetch } = useCustom({
    url: "/dashboard/metrics",
    method: "get",
    queryOptions: {
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 20000, // Consider fresh for 20 seconds
    },
  });

  if (isLoading) return <div>Loading metrics...</div>;

  return (
    <div>
      <h2>Dashboard Metrics</h2>
      <div>Total Users: {data?.data.totalUsers}</div>
      <div>Active Sessions: {data?.data.activeSessions}</div>
      <div>Revenue Today: ${data?.data.revenueToday}</div>
      <button onClick={() => refetch()}>Refresh Now</button>
    </div>
  );
}
```

### 8.2. Search with Autocomplete

```typescript
// ============================================
// Search posts with debounced input
// ============================================
function PostSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 500);

  const { data, isFetching } = useCustom({
    url: "/posts/search",
    method: "get",
    config: {
      query: {
        q: debouncedQuery,
        limit: 10,
      },
    },
    queryOptions: {
      enabled: debouncedQuery.length >= 3, // Only search if 3+ chars
      staleTime: 5000, // Cache for 5 seconds
    },
  });

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search posts..."
      />
      {isFetching && <div>Searching...</div>}
      <ul>
        {data?.data.results?.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 8.3. Export Data to CSV

```typescript
// ============================================
// Export posts to CSV
// ============================================
function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const { refetch } = useCustom({
    url: "/posts/export",
    method: "get",
    config: {
      query: {
        format: "csv",
        filters: { status: "published" },
      },
    },
    queryOptions: {
      enabled: false, // Don't auto-fetch
      onSuccess: (data) => {
        // Download CSV file
        const blob = new Blob([data.data], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "posts.csv";
        a.click();
        setIsExporting(false);
      },
    },
  });

  const handleExport = async () => {
    setIsExporting(true);
    await refetch();
  };

  return (
    <button onClick={handleExport} disabled={isExporting}>
      {isExporting ? "Exporting..." : "Export to CSV"}
    </button>
  );
}
```

### 8.4. Analytics with Date Range

```typescript
// ============================================
// Post analytics with date range filter
// ============================================
function PostAnalytics({ postId }) {
  const [dateRange, setDateRange] = useState({
    from: "2024-01-01",
    to: "2024-12-31",
  });

  const { data, isLoading } = useCustom({
    url: `/posts/${postId}/analytics`,
    method: "get",
    config: {
      query: {
        from: dateRange.from,
        to: dateRange.to,
        metrics: ["views", "clicks", "shares"],
      },
    },
    queryOptions: {
      // Refetch when date range changes
      queryKey: ["analytics", postId, dateRange],
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h3>Analytics</h3>
      <DateRangePicker value={dateRange} onChange={setDateRange} />

      <div>
        <p>Views: {data?.data.views}</p>
        <p>Clicks: {data?.data.clicks}</p>
        <p>Shares: {data?.data.shares}</p>
      </div>
    </div>
  );
}
```

### 8.5. Third-Party API Integration

```typescript
// ============================================
// Fetch data from external API
// ============================================
function WeatherWidget({ city }) {
  const { data, isLoading } = useCustom({
    url: `/external/weather`,
    method: "get",
    config: {
      query: { city },
      headers: {
        "X-API-Key": process.env.REACT_APP_WEATHER_API_KEY,
      },
    },
    queryOptions: {
      refetchInterval: 600000, // Refetch every 10 minutes
      staleTime: 300000, // Consider fresh for 5 minutes
    },
  });

  if (isLoading) return <div>Loading weather...</div>;

  return (
    <div>
      <h3>Weather in {city}</h3>
      <p>Temperature: {data?.data.temp}°C</p>
      <p>Condition: {data?.data.condition}</p>
    </div>
  );
}
```

### 8.6. Conditional Fetching

```typescript
// ============================================
// Only fetch when user is authenticated
// ============================================
function UserDashboard() {
  const { isAuthenticated, user } = useAuth();

  const { data, isLoading } = useCustom({
    url: "/user/dashboard",
    method: "get",
    queryOptions: {
      enabled: isAuthenticated && !!user, // Only fetch if authenticated
    },
  });

  if (!isAuthenticated) {
    return <div>Please login to view dashboard</div>;
  }

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <div>Activity: {data?.data.activityCount}</div>
    </div>
  );
}
```

### 8.7. Dependent Queries

```typescript
// ============================================
// Fetch comments after post is loaded
// ============================================
function PostWithComments({ postId }) {
  // First query - Get post
  const {
    data: post,
    isLoading: postLoading,
    isSuccess: postSuccess,
  } = useCustom({
    url: `/posts/${postId}`,
    method: "get",
  });

  // Second query - Get comments (depends on post)
  const { data: comments, isLoading: commentsLoading } = useCustom({
    url: `/posts/${postId}/comments`,
    method: "get",
    queryOptions: {
      enabled: postSuccess, // Only fetch when post loaded
    },
  });

  if (postLoading) return <div>Loading post...</div>;

  return (
    <div>
      <h1>{post?.data.title}</h1>
      <p>{post?.data.content}</p>

      <h2>Comments</h2>
      {commentsLoading ? (
        <div>Loading comments...</div>
      ) : (
        <ul>
          {comments?.data.map((comment) => (
            <li key={comment.id}>{comment.text}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### 8.8. Custom Notifications

```typescript
// ============================================
// Custom success/error notifications
// ============================================
function CustomNotificationExample() {
  const { data } = useCustom({
    url: "/posts/trending",
    method: "get",
    successNotification: (data, config) => ({
      message: "Trending Posts Loaded!",
      description: `Found ${data.data.length} trending posts`,
      type: "success",
    }),
    errorNotification: (error, config) => ({
      message: "Failed to Load Trending Posts",
      description: error.message,
      type: "error",
    }),
  });

  return <div>{/* ... */}</div>;
}
```

---

## 9. BEST PRACTICES & PATTERNS

### 9.1. Query Key Management

**✅ DO: Include all variables in query key**

```typescript
const { data } = useCustom({
  url: "/posts/search",
  method: "get",
  config: {
    query: { q: searchTerm, page, limit },
  },
  queryOptions: {
    // ✅ React Query automatically includes config in key
    // Key: ["data", "default", "custom", { url, method, query: {...} }]
  },
});
```

**❌ DON'T: Manual query key without all deps**

```typescript
const { data } = useCustom({
  url: "/posts/search",
  method: "get",
  config: {
    query: { q: searchTerm, page, limit },
  },
  queryOptions: {
    queryKey: ["search"], // ❌ Missing dependencies!
    // If searchTerm/page/limit changes, query key doesn't change
    // → Old cached data returned!
  },
});
```

### 9.2. Conditional Fetching

**✅ DO: Use enabled option**

```typescript
const { data } = useCustom({
  url: "/user/profile",
  method: "get",
  queryOptions: {
    enabled: isAuthenticated, // Only fetch if authenticated
  },
});
```

**❌ DON'T: Conditional hook call**

```typescript
// ❌ Violates Rules of Hooks!
if (isAuthenticated) {
  const { data } = useCustom({
    url: "/user/profile",
    method: "get",
  });
}
```

### 9.3. Data Transformation

**✅ DO: Use select option**

```typescript
const { data } = useCustom({
  url: "/posts/stats",
  method: "get",
  queryOptions: {
    select: (response) => ({
      // Transform data before returning
      totalViews: response.data.views * 1000,
      avgRating: response.data.rating / 5,
    }),
  },
});

// data = { totalViews: ..., avgRating: ... }
```

**❌ DON'T: Transform in component**

```typescript
const { data: rawData } = useCustom({
  url: "/posts/stats",
  method: "get",
});

// ❌ Transforms on every render!
const data = {
  totalViews: rawData?.data.views * 1000,
  avgRating: rawData?.data.rating / 5,
};
```

### 9.4. Error Handling

**✅ Pattern: Specific error handling**

```typescript
const { data, error, isError } = useCustom({
  url: "/sensitive-data",
  method: "get",
});

if (isError) {
  if (error.statusCode === 403) {
    return <div>Access denied. Contact administrator.</div>;
  }
  if (error.statusCode === 404) {
    return <div>Data not found.</div>;
  }
  return <div>Error: {error.message}</div>;
}
```

### 9.5. Loading States

**✅ Pattern: Distinguish initial loading vs refetching**

```typescript
const { data, isLoading, isFetching, isRefetching } = useCustom({
  url: "/dashboard/metrics",
  method: "get",
});

if (isLoading) {
  // Initial loading - no data yet
  return <div>Loading dashboard...</div>;
}

return (
  <div>
    {isFetching && !isRefetching && <div>Updating...</div>}
    {/* Show data */}
  </div>
);
```

### 9.6. Debounced Search

**✅ Pattern: Debounce + enabled**

```typescript
function Search() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);

  const { data } = useCustom({
    url: "/search",
    method: "get",
    config: {
      query: { q: debouncedQuery },
    },
    queryOptions: {
      enabled: debouncedQuery.length >= 3, // Min 3 chars
    },
  });

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### 9.7. Pagination

**✅ Pattern: Keep previous data**

```typescript
function PaginatedList() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useCustom({
    url: "/posts/paginated",
    method: "get",
    config: {
      query: { page, limit: 10 },
    },
    queryOptions: {
      keepPreviousData: true, // Show old data while fetching new page
    },
  });

  return (
    <div>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <ul>
          {data?.data.results.map((item) => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      )}
      {isFetching && <div>Loading page {page}...</div>}
      <button onClick={() => setPage(page - 1)}>Previous</button>
      <button onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}
```

### 9.8. Background Sync

**✅ Pattern: Polling with visibility check**

```typescript
const { data } = useCustom({
  url: "/live-stats",
  method: "get",
  queryOptions: {
    refetchInterval: (data) => {
      // Stop polling if error or specific condition
      if (!data || data.data.stopped) return false;
      return 5000; // Poll every 5 seconds
    },
    refetchIntervalInBackground: false, // Stop when tab hidden
  },
});
```

---

## 10. SO SÁNH VỚI useCustomMutation

### 10.1. useCustom vs useCustomMutation

```
┌────────────────┬──────────────────┬──────────────────────┐
│                │ useCustom        │ useCustomMutation    │
├────────────────┼──────────────────┼──────────────────────┤
│ React Query    │ useQuery         │ useMutation          │
│ Trigger        │ Auto on mount    │ Manual (mutate())    │
│ Caching        │ Yes              │ No                   │
│ Refetch        │ Auto             │ No                   │
│ Use case       │ GET requests     │ POST/PUT/DELETE      │
│ Example        │ Fetch analytics  │ Publish post         │
└────────────────┴──────────────────┴──────────────────────┘
```

### 10.2. When to Use Which?

**useCustom - Read operations:**

```typescript
// ✅ GET - Fetch data
useCustom({
  url: "/dashboard/metrics",
  method: "get",
});

// ✅ GET - Search
useCustom({
  url: "/posts/search",
  method: "get",
  config: { query: { q: "react" } },
});
```

**useCustomMutation - Write operations:**

```typescript
// ✅ POST - Publish
const { mutate } = useCustomMutation();
mutate({
  url: "/posts/1/publish",
  method: "post",
  values: {},
});

// ✅ POST - Import
mutate({
  url: "/posts/import",
  method: "post",
  values: { file: csvData },
});
```

### 10.3. Edge Case - POST for Read

**Scenario:** API requires POST for search (large filters)

```typescript
// ❌ BAD - useCustom with POST auto-triggers
const { data } = useCustom({
  url: "/advanced-search",
  method: "post", // POST but read operation
  config: {
    payload: { filters: {...}, sort: {...} }
  }
});
// Problem: Auto-triggers POST on mount (unwanted side effects)

// ✅ GOOD - Use enabled to control
const { data, refetch } = useCustom({
  url: "/advanced-search",
  method: "post",
  config: {
    payload: { filters, sort }
  },
  queryOptions: {
    enabled: false, // Don't auto-trigger
  }
});

// Manually trigger when needed
<button onClick={() => refetch()}>Search</button>
```

---

## 11. TÓM TẮT & KẾT LUẬN

### 11.1. Tóm Tắt Ngắn Gọn

**useCustom là gì?**

- Hook để gọi custom API endpoints
- Sử dụng useQuery (React Query)
- Tự động xử lý caching, refetching, notifications

**Khi nào dùng?**

- GET requests cho custom endpoints
- Analytics, metrics, reports
- Search, autocomplete
- Export data
- Third-party API integration

**Khi nào KHÔNG dùng?**

- Standard CRUD → useList, useOne, useCreate, useUpdate, useDelete
- Write operations → useCustomMutation
- WebSocket/SSE → Custom hooks

### 11.2. Key Concepts

**1. useQuery Foundation**

```
useCustom = useQuery + Refine Features
- useQuery: Caching, refetching, auto-trigger
- Refine: Notifications, error handling, meta
```

**2. Query Key Structure**

```typescript
["data", dataProviderName, "custom", { method, url, ...config }];
```

**3. Auto Trigger**

```typescript
// ✅ Auto-fetches on mount
const { data } = useCustom({ url: "/metrics", method: "get" });

// ✅ Conditional fetch
const { data } = useCustom({
  url: "/metrics",
  method: "get",
  queryOptions: { enabled: isReady },
});
```

**4. Side Effects with useEffect**

```typescript
useEffect(() => {
  if (queryResponse.isSuccess) {
    handleNotification(successNotification);
  }
}, [queryResponse.isSuccess]);
```

### 11.3. Architecture Summary

```
Component
    ↓
useCustom
    ↓
useQuery (React Query)
    ├─ Auto fetch on mount
    ├─ Cache result
    ├─ Auto refetch
    └─ Return data/loading/error
    ↓
useEffect (Success)
    └─ Show notification
    ↓
useEffect (Error)
    └─ Check error + Show toast
```

### 11.4. Best Practices Checklist

✅ **DO:**

- Use for GET requests
- Enable caching with staleTime
- Use enabled for conditional fetching
- Transform data with select
- Handle different error codes
- Use refetchInterval for real-time data

❌ **DON'T:**

- Use for write operations (use useCustomMutation)
- Violate Rules of Hooks (conditional calls)
- Forget to handle loading states
- Ignore error cases
- Over-refetch (set appropriate staleTime)

### 11.5. Common Patterns

```typescript
// Pattern 1: Dashboard metrics
useCustom({
  url: "/metrics",
  method: "get",
  queryOptions: {
    refetchInterval: 30000, // Every 30s
    staleTime: 20000, // Fresh for 20s
  },
});

// Pattern 2: Search
useCustom({
  url: "/search",
  method: "get",
  config: { query: { q: debouncedQuery } },
  queryOptions: {
    enabled: debouncedQuery.length >= 3,
  },
});

// Pattern 3: Export
useCustom({
  url: "/export",
  method: "get",
  queryOptions: {
    enabled: false, // Manual trigger
  },
});
```

### 11.6. Next Steps

📚 **Để hiểu sâu hơn, học tiếp:**

1. **useCustomMutation** - Write operations
2. **React Query Advanced** - Parallel queries, dependent queries
3. **Data Provider custom method** - Implementation details
4. **Caching strategies** - staleTime, cacheTime, refetch
5. **Error handling patterns** - Retry, fallback, recovery

---

## PHỤ LỤC: QUICK REFERENCE

### API

```typescript
// Basic
const { data, isLoading, error } = useCustom({
  url: string, // Required
  method: "get" | "post" | "put" | "patch" | "delete", // Required
});

// Full
const { query, result, overtime } = useCustom({
  url: string,
  method: string,
  config: {
    query?: object,
    payload?: any,
    headers?: object,
    filters?: CrudFilter[],
    sorters?: CrudSort[],
  },
  queryOptions?: UseQueryOptions,
  successNotification?: Notification | Function,
  errorNotification?: Notification | Function,
  meta?: MetaQuery,
  dataProviderName?: string,
  overtimeOptions?: OvertimeOptions,
});
```

### Common Patterns

```typescript
// GET
useCustom({ url: "/endpoint", method: "get" });

// GET with query params
useCustom({
  url: "/search",
  method: "get",
  config: { query: { q: "react", page: 1 } },
});

// POST with payload
useCustom({
  url: "/generate",
  method: "post",
  config: { payload: { format: "pdf" } },
});

// Conditional fetch
useCustom({
  url: "/data",
  method: "get",
  queryOptions: { enabled: isReady },
});

// Polling
useCustom({
  url: "/live",
  method: "get",
  queryOptions: { refetchInterval: 5000 },
});
```

### Return Value

```typescript
{
  query: {
    data,              // Response data
    error,             // Error if failed
    isLoading,         // Initial loading
    isFetching,        // Any fetching
    isRefetching,      // Background refetch
    isSuccess,         // Success
    isError,           // Error
    refetch,           // Manual refetch
  },
  result: {
    data,              // Shorthand for query.data?.data
  },
  overtime: {
    elapsedTime,       // Loading time tracking
  }
}
```

---

🎉 **Done!** Bạn đã hiểu useCustom!

**Remember:** useCustom cho READ operations (GET). Write operations dùng useCustomMutation! 🚀
