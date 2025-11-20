# 📘 HƯỚNG DẪN HOÀN CHỈNH VỀ useDataProvider HOOK

> **TL;DR:** `useDataProvider` là hook để access data providers (API clients) trong Refine. Nó hỗ trợ single hoặc multiple providers, sử dụng Context API để share globally, và là foundation cho tất cả data operations.

---

## 📋 MỤC LỤC

1. [Vấn Đề & Giải Pháp](#1-vấn-đề--giải-pháp)
2. [Data Provider Pattern](#2-data-provider-pattern)
3. [useDataProvider Hook](#3-usedataprovider-hook)
4. [Context API Architecture](#4-context-api-architecture)
5. [Multi-Provider Support](#5-multi-provider-support)
6. [Source Code Analysis](#6-source-code-analysis)
7. [Ví Dụ Thực Tế](#7-ví-dụ-thực-tế)
8. [Best Practices](#8-best-practices)
9. [Tóm Tắt](#9-tóm-tắt)

---

## 1. VẤN ĐỀ & GIẢI PHÁP

### 1.1. Vấn Đề: Hardcoded API Calls

**❌ Cách cũ - Hardcode everywhere:**

```typescript
// PostList.tsx - Hardcoded REST API
function PostList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch("https://api.example.com/posts")
      .then((r) => r.json())
      .then(setPosts);
  }, []);
  return (
    <ul>
      {posts.map((p) => (
        <li>{p.title}</li>
      ))}
    </ul>
  );
}

// UserList.tsx - Hardcoded REST API
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetch("https://api.example.com/users")
      .then((r) => r.json())
      .then(setUsers);
  }, []);
  return (
    <ul>
      {users.map((u) => (
        <li>{u.name}</li>
      ))}
    </ul>
  );
}
```

**Vấn đề khi chuyển sang GraphQL:**

```typescript
// 😱 Phải sửa TẤT CẢ 50+ components!
function PostList() {
  const [posts, setPosts] = useState([]);
  useEffect(() => {
    fetch("https://graphql.example.com", {
      method: "POST",
      body: JSON.stringify({
        query: `query { posts { id title } }`,
      }),
    })
      .then((r) => r.json())
      .then((data) => setPosts(data.data.posts));
  }, []);
  return (
    <ul>
      {posts.map((p) => (
        <li>{p.title}</li>
      ))}
    </ul>
  );
}
// ... và 49+ components khác! 😱
```

### 1.2. Giải Pháp: Data Provider Pattern

**✅ Với Data Provider - Abstraction Layer:**

```typescript
// Components KHÔNG thay đổi khi đổi backend
function PostList() {
  const dataProvider = useDataProvider();
  const api = dataProvider(); // Get default provider

  const posts = await api.getList({ resource: "posts" });
  return (
    <ul>
      {posts.data.map((p) => (
        <li>{p.title}</li>
      ))}
    </ul>
  );
}

// Chỉ cần đổi config
<Refine
  // dataProvider={restProvider("https://api.example.com")}  // REST
  dataProvider={graphqlProvider("https://graphql.example.com")} // GraphQL
/>;
```

**Lợi ích:**

- ✅ **Decoupling** - Components độc lập với API implementation
- ✅ **Flexibility** - Dễ đổi backend (REST → GraphQL → Firebase)
- ✅ **Multi-backend** - Hỗ trợ nhiều APIs đồng thời
- ✅ **Testability** - Dễ mock cho testing
- ✅ **Reusability** - Một interface cho mọi backend

---

## 2. DATA PROVIDER PATTERN

### 2.1. Adapter Pattern

**Data Provider = Adapter Pattern trong software engineering**

```
┌─────────────────────────────────────────────────┐
│  Ví dụ thực tế: Ổ cắm điện                      │
│                                                 │
│  Thiết bị Mỹ (2 chân) → Adapter → Ổ cắm VN (3 chân)
│                                                 │
│  Tương tự:                                      │
│  Your App → Data Provider → Backend API         │
└─────────────────────────────────────────────────┘
```

### 2.2. Data Provider Interface

**Refine định nghĩa interface chuẩn:**

```typescript
interface DataProvider {
  // CRUD Operations
  getList: (params) => Promise<{ data; total }>;
  getOne: (params) => Promise<{ data }>;
  create: (params) => Promise<{ data }>;
  update: (params) => Promise<{ data }>;
  deleteOne: (params) => Promise<{ data }>;

  // Batch Operations
  getMany?: (params) => Promise<{ data }>;
  createMany?: (params) => Promise<{ data }>;
  updateMany?: (params) => Promise<{ data }>;
  deleteMany?: (params) => Promise<{ data }>;

  // Custom & Utility
  custom?: (params) => Promise<{ data }>;
  getApiUrl: () => string;
}
```

**Mọi provider PHẢI implement interface này!**

### 2.3. Kiến Trúc Tổng Quan

```
┌──────────────────────────────────────────────────┐
│          YOUR APPLICATION                        │
├──────────────────────────────────────────────────┤
│                                                  │
│  Component Layer                                 │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐           │
│  │PostList │ │UserList │ │Dashboard │           │
│  └────┬────┘ └────┬────┘ └────┬─────┘           │
│       └───────────┼───────────┘                  │
│                   ↓                              │
│         ┌──────────────────┐                     │
│         │useDataProvider() │ ← Hook Layer        │
│         └──────────────────┘                     │
│                   ↓                              │
│         ┌──────────────────┐                     │
│         │ DataProvider API │ ← Interface         │
│         └──────────────────┘                     │
│                   ↓                              │
│       ┌───────────┼───────────┐                  │
│       ↓           ↓           ↓                  │
│  ┌────────┐ ┌─────────┐ ┌─────────┐             │
│  │  REST  │ │ GraphQL │ │Firebase │ ← Adapters  │
│  └───┬────┘ └────┬────┘ └────┬────┘             │
└──────┼───────────┼───────────┼──────────────────┘
       ↓           ↓           ↓
   REST API    GraphQL     Firebase
```

### 2.4. REST vs GraphQL Provider

**REST Provider:**

```typescript
const restProvider = (apiUrl) => ({
  getList: async ({ resource, pagination, filters, sort }) => {
    // REST: GET /posts?_page=1&_limit=10
    const { current, pageSize } = pagination;
    const params = new URLSearchParams({
      _page: current,
      _limit: pageSize,
    });

    const response = await fetch(`${apiUrl}/${resource}?${params}`);
    const data = await response.json();

    return {
      data: data,
      total: parseInt(response.headers.get("x-total-count")),
    };
  },
  // ... other methods
});
```

**GraphQL Provider:**

```typescript
const graphqlProvider = (apiUrl) => ({
  getList: async ({ resource, pagination }) => {
    // GraphQL: POST /graphql với query
    const query = `
      query GetList($limit: Int, $offset: Int) {
        ${resource}(limit: $limit, offset: $offset) {
          id name createdAt
        }
        ${resource}Aggregate { count }
      }
    `;

    const response = await fetch(apiUrl, {
      method: "POST",
      body: JSON.stringify({
        query,
        variables: {
          limit: pagination.pageSize,
          offset: (pagination.current - 1) * pagination.pageSize,
        },
      }),
    });

    const result = await response.json();

    // ✅ Trả về FORMAT GIỐNG REST!
    return {
      data: result.data[resource],
      total: result.data[`${resource}Aggregate`].count,
    };
  },
  // ... other methods
});
```

**Component KHÔNG cần biết khác biệt:**

```typescript
// ✅ Code giống nhau cho cả REST và GraphQL!
function PostList() {
  const dataProvider = useDataProvider();
  const api = dataProvider();

  const { data, total } = await api.getList({
    resource: "posts",
    pagination: { current: 1, pageSize: 10 },
  });

  return (
    <div>
      <h3>Total: {total}</h3>
      <ul>
        {data.map((post) => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 3. useDataProvider HOOK

### 3.1. Type Signature

```typescript
const useDataProvider = (): ((dataProviderName?: string) => DataProvider) => {
  // Implementation
};
```

**Phân tích:**

```typescript
useDataProvider()  // Returns a FUNCTION
  ↓
(dataProviderName?: string) => DataProvider  // Function signature
  ↓
dataProvider()  // Call with no args → get default
dataProvider('analytics')  // Call with name → get named provider
```

**Tại sao trả về function?**

```typescript
// ❌ Nếu trả về provider trực tiếp:
const provider = useDataProvider(); // ← Provider nào? Default? Analytics?

// ✅ Trả về function → flexible:
const getProvider = useDataProvider();
const defaultAPI = getProvider(); // Default
const analyticsAPI = getProvider("analytics"); // Named
```

### 3.2. Cách Sử Dụng

**Single provider:**

```typescript
// Setup
<Refine dataProvider={restProvider("https://api.example.com")} />;

// Usage
function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider(); // Get default

  const { data } = await api.getList({ resource: "posts" });
}
```

**Multiple providers:**

```typescript
// Setup
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider("https://analytics.example.com"),
  }}
/>;

// Usage
function Dashboard() {
  const dataProvider = useDataProvider();

  const mainAPI = dataProvider(); // Default
  const analyticsAPI = dataProvider("analytics"); // Named

  const posts = await mainAPI.getList({ resource: "posts" });
  const metrics = await analyticsAPI.getList({ resource: "metrics" });
}
```

### 3.3. Khi Nào Dùng?

**✅ Dùng khi:**

- Custom logic không có trong high-level hooks
- Call custom API endpoints
- Multiple backends/microservices
- Build custom abstractions

**❌ KHÔNG dùng khi:**

- Có high-level hook phù hợp (useList, useCreate, useUpdate)
- Simple CRUD operations
- Không cần custom behavior

**So sánh:**

```typescript
// ❌ Low-level - Manual handling
function PostList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const dataProvider = useDataProvider();

  useEffect(() => {
    setLoading(true);
    dataProvider()
      .getList({ resource: "posts" })
      .then((result) => setData(result.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;
  return (
    <ul>
      {data.map((p) => (
        <li>{p.title}</li>
      ))}
    </ul>
  );
}

// ✅ High-level - Automatic handling
function PostList() {
  const { data, isLoading } = useList({ resource: "posts" });

  if (isLoading) return <div>Loading...</div>;
  return (
    <ul>
      {data?.data.map((p) => (
        <li>{p.title}</li>
      ))}
    </ul>
  );
}
```

---

## 4. CONTEXT API ARCHITECTURE

### 4.1. Vấn Đề: Prop Drilling

**❌ Không dùng Context:**

```typescript
function App() {
  const dataProvider = restProvider("https://api.example.com");
  return <Dashboard dataProvider={dataProvider} />;
}

function Dashboard({ dataProvider }) {
  return <Sidebar dataProvider={dataProvider} />;
}

function Sidebar({ dataProvider }) {
  return <PostList dataProvider={dataProvider} />;
}

function PostList({ dataProvider }) {
  // Cuối cùng mới dùng được!
  const posts = await dataProvider.getList({ resource: "posts" });
}
```

**Vấn đề:**

- ❌ Truyền qua 3-4 levels
- ❌ Components trung gian không cần nhưng phải nhận prop
- ❌ Khó refactor

### 4.2. Giải Pháp: Context API

**✅ Với Context:**

```typescript
// Setup at root
function App() {
  const dataProvider = restProvider("https://api.example.com");
  return (
    <DataContext.Provider value={dataProvider}>
      <Dashboard />
    </DataContext.Provider>
  );
}

function Dashboard() {
  return <Sidebar />; // ✅ No prop!
}

function Sidebar() {
  return <PostList />; // ✅ No prop!
}

function PostList() {
  // ✅ Direct access!
  const dataProvider = useDataProvider();
  const api = dataProvider();
  const posts = await api.getList({ resource: "posts" });
}
```

### 4.3. Context Structure

```typescript
// Single provider
context = restProvider; // DataProvider object

// Multiple providers
context = {
  default: restProvider,
  analytics: graphqlProvider,
  legacy: soapProvider,
};
```

---

## 5. MULTI-PROVIDER SUPPORT

### 5.1. Real-World Scenarios

**Scenario 1: Microservices**

```typescript
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    users: restProvider("https://users-service.example.com"),
    products: restProvider("https://products-service.example.com"),
    orders: restProvider("https://orders-service.example.com"),
  }}
/>;

function Dashboard() {
  const dataProvider = useDataProvider();

  const usersAPI = dataProvider("users");
  const productsAPI = dataProvider("products");
  const ordersAPI = dataProvider("orders");

  const users = await usersAPI.getList({ resource: "users" });
  const products = await productsAPI.getList({ resource: "products" });
  const orders = await ordersAPI.getList({ resource: "orders" });
}
```

**Scenario 2: Different Protocols**

```typescript
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider("https://analytics.example.com/graphql"),
    realtime: websocketProvider("wss://realtime.example.com"),
  }}
/>
```

**Scenario 3: Migration**

```typescript
<Refine
  dataProvider={{
    default: restProvider("https://new-api.example.com"),
    legacy: soapProvider("https://legacy-api.example.com"),
  }}
/>;

function CustomerList() {
  const dataProvider = useDataProvider();

  // New customers → new API
  const newAPI = dataProvider();
  const newCustomers = await newAPI.getList({ resource: "customers" });

  // Old customers → legacy API
  const legacyAPI = dataProvider("legacy");
  const oldCustomers = await legacyAPI.getList({ resource: "customers" });

  // Merge
  const all = [...newCustomers.data, ...oldCustomers.data];
}
```

### 5.2. Validation Rules

**Rule 1: Named provider phải tồn tại**

```typescript
// ❌ Error
const api = dataProvider("nonexistent");
// Error: "nonexistent" Data provider not found
```

**Rule 2: Multi-provider PHẢI có default**

```typescript
// ❌ Error
<Refine
  dataProvider={{
    analytics: graphqlProvider, // ← No 'default'!
  }}
/>
// Error: Must provide default data provider
```

**Rule 3: Default phải tồn tại khi không specify name**

```typescript
// ❌ Error
<Refine dataProvider={{}} />;
const api = dataProvider();
// Error: There is no "default" data provider
```

---

## 6. SOURCE CODE ANALYSIS

### 6.1. Full Implementation

```typescript
import { useCallback, useContext } from "react";
import { DataContext } from "@contexts/data";

export const useDataProvider = (): ((
  dataProviderName?: string,
) => DataProvider) => {
  // STEP 1: Get providers from Context
  const context = useContext(DataContext);

  // STEP 2: Create getter function
  const handleDataProvider = useCallback(
    (dataProviderName?: string) => {
      // CASE 1: Named provider
      if (dataProviderName) {
        const dataProvider = context?.[dataProviderName];

        // Validation 1: Must exist
        if (!dataProvider) {
          throw new Error(`"${dataProviderName}" Data provider not found`);
        }

        // Validation 2: Multi-provider needs default
        if (dataProvider && !context?.default) {
          throw new Error(
            "If you have multiple data providers, you must provide default data provider property",
          );
        }

        return context[dataProviderName];
      }

      // CASE 2: Default provider
      if (context.default) {
        return context.default;
      }

      // CASE 3: Error - no default
      throw new Error(
        `There is no "default" data provider. Please pass dataProviderName.`,
      );
    },
    [context],
  );

  // STEP 3: Return getter
  return handleDataProvider;
};
```

### 6.2. Logic Flow

**Case 1: Get default**

```typescript
// Setup
<Refine dataProvider={restProvider} />;

// Usage
const api = dataProvider(); // No arg

// Flow:
// 1. dataProviderName = undefined
// 2. Skip "if (dataProviderName)"
// 3. Check "if (context.default)" → true
// 4. Return context.default ✅
```

**Case 2: Get named provider**

```typescript
// Setup
<Refine dataProvider={{ default: restProvider, analytics: graphqlProvider }} />;

// Usage
const api = dataProvider("analytics");

// Flow:
// 1. dataProviderName = 'analytics'
// 2. Enter "if (dataProviderName)"
// 3. Get context?.['analytics'] = graphqlProvider
// 4. if (!dataProvider) → false (exists)
// 5. if (!context?.default) → false (default exists)
// 6. Return context['analytics'] ✅
```

**Case 3: Error - not found**

```typescript
const api = dataProvider("nonexistent");

// Flow:
// 1. dataProviderName = 'nonexistent'
// 2. Get context?.['nonexistent'] = undefined
// 3. if (!dataProvider) → true
// 4. throw Error ❌
```

### 6.3. useCallback Optimization

**Tại sao dùng useCallback?**

```typescript
// ❌ Without useCallback
const handleDataProvider = (name) => {
  return context[name] || context.default;
};
// New function mỗi render → child re-renders

// ✅ With useCallback
const handleDataProvider = useCallback(
  (name) => {
    return context[name] || context.default;
  },
  [context],
);
// Function chỉ recreate khi context thay đổi
```

**Khi nào quan trọng?**

1. Function passed to child components
2. Function in useEffect dependencies

---

## 7. VÍ DỤ THỰC TẾ

### 7.1. Basic Usage

```typescript
import { useDataProvider } from "@refinedev/core";

function PostList() {
  const [posts, setPosts] = useState([]);
  const dataProvider = useDataProvider();

  useEffect(() => {
    const api = dataProvider();
    api
      .getList({
        resource: "posts",
        pagination: { current: 1, pageSize: 10 },
      })
      .then((result) => setPosts(result.data));
  }, []);

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### 7.2. Multi-Provider - Microservices

```typescript
<Refine
  dataProvider={{
    default: dataProvider("https://main-api.example.com"),
    users: dataProvider("https://users-service.example.com"),
    products: dataProvider("https://products-service.example.com"),
  }}
/>;

function Dashboard() {
  const dataProvider = useDataProvider();

  useEffect(() => {
    const fetchData = async () => {
      const usersAPI = dataProvider("users");
      const productsAPI = dataProvider("products");

      const [users, products] = await Promise.all([
        usersAPI.getList({ resource: "users" }),
        productsAPI.getList({ resource: "products" }),
      ]);

      console.log("Users:", users.data);
      console.log("Products:", products.data);
    };

    fetchData();
  }, []);

  return <div>Dashboard</div>;
}
```

### 7.3. Custom API Endpoint

```typescript
function ExportButton() {
  const dataProvider = useDataProvider();

  const handleExport = async () => {
    const api = dataProvider();

    // Call custom endpoint
    const result = await api.custom({
      url: "/export/posts",
      method: "post",
      payload: { format: "csv" },
    });

    // Download file
    const blob = new Blob([result.data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "posts.csv";
    a.click();
  };

  return <button onClick={handleExport}>Export</button>;
}
```

### 7.4. Testing với Mock

```typescript
// Mock provider
const mockProvider = {
  getList: jest.fn(() =>
    Promise.resolve({
      data: [
        { id: 1, title: "Test Post 1" },
        { id: 2, title: "Test Post 2" },
      ],
      total: 2,
    }),
  ),
  getOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  deleteOne: jest.fn(),
  getApiUrl: () => "https://mock.example.com",
};

// Test
test("PostList renders", async () => {
  const { findByText } = render(
    <Refine dataProvider={mockProvider}>
      <PostList />
    </Refine>,
  );

  expect(await findByText("Test Post 1")).toBeInTheDocument();
  expect(mockProvider.getList).toHaveBeenCalled();
});
```

---

## 8. BEST PRACTICES

### 8.1. Naming Conventions

```typescript
// ✅ Descriptive names
<Refine
  dataProvider={{
    default: restProvider,
    analytics: graphqlProvider,
    legacy: soapProvider,
    realtime: websocketProvider,
  }}
/>

// ❌ Generic names
<Refine
  dataProvider={{
    default: restProvider,
    api1: graphqlProvider, // ❌ What is api1?
    api2: soapProvider,
  }}
/>
```

### 8.2. Environment-based Config

```typescript
const getDataProviders = () => {
  if (process.env.NODE_ENV === "production") {
    return {
      default: restProvider("https://api.production.com"),
      analytics: graphqlProvider("https://analytics.production.com"),
    };
  }
  return {
    default: restProvider("https://api.staging.com"),
    analytics: mockProvider,
  };
};

<Refine dataProvider={getDataProviders()} />;
```

### 8.3. Error Handling Wrapper

```typescript
function useDataProviderSafe() {
  const getProvider = useDataProvider();

  const safeGetProvider = (name?: string) => {
    try {
      return getProvider(name);
    } catch (error) {
      console.error("Provider error:", error);
      return getProvider(); // Fallback to default
    }
  };

  return safeGetProvider;
}
```

---

## 9. TÓM TẮT

### 9.1. Key Points

**useDataProvider là gì?**

- Hook để access data providers
- Trả về function để get provider by name
- Hỗ trợ single/multiple providers
- Sử dụng Context API

**Khi nào dùng?**

- ✅ Custom logic
- ✅ Custom endpoints
- ✅ Multiple backends
- ✅ Custom abstractions
- ❌ Simple CRUD (dùng useList, useCreate, etc.)

### 9.2. Architecture

```
Components → useDataProvider → Context → Providers → APIs
```

### 9.3. Comparison

```
┌──────────────┬─────────────────┬──────────────────┐
│              │ useDataProvider │ High-Level Hooks │
├──────────────┼─────────────────┼──────────────────┤
│ Level        │ Low             │ High             │
│ Manual work  │ More            │ Less             │
│ Flexibility  │ More            │ Less             │
│ Features     │ Basic           │ Advanced         │
│ Use case     │ Custom          │ Standard CRUD    │
└──────────────┴─────────────────┴──────────────────┘
```

### 9.4. Common Pitfalls

```typescript
// ❌ No default in multi-provider
<Refine dataProvider={{ analytics: graphqlProvider }} />

// ✅ Must have default
<Refine
  dataProvider={{
    default: restProvider,
    analytics: graphqlProvider,
  }}
/>
```

### 9.5. Next Steps

📚 **Học tiếp:**

1. Data Provider Implementation
2. useList, useOne (Query hooks)
3. useCreate, useUpdate, useDelete (Mutation hooks)
4. Error handling patterns
5. Testing strategies

---

## PHỤ LỤC: QUICK REFERENCE

### API

```typescript
// Hook
const getProvider = useDataProvider();
const api = getProvider(); // Default
const analyticsAPI = getProvider("analytics"); // Named

// Interface
interface DataProvider {
  getList;
  getOne;
  create;
  update;
  deleteOne;
  getMany?;
  createMany?;
  updateMany?;
  deleteMany?;
  custom?;
  getApiUrl;
}
```

### Setup

```typescript
// Single
<Refine dataProvider={restProvider("https://api.example.com")} />

// Multiple
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider("https://analytics.example.com")
  }}
/>
```

### Errors

| Error                   | Cause                        | Solution          |
| ----------------------- | ---------------------------- | ----------------- |
| `"[name]" not found`    | Provider name doesn't exist  | Check spelling    |
| `Must provide default`  | No default in multi-provider | Add `default` key |
| `There is no "default"` | No default configured        | Configure default |

---

🎉 **Done!** Bạn đã hiểu useDataProvider!

**Remember:** Low-level hook cho custom logic. High-level hooks (useList, useCreate) tốt hơn cho standard operations. 🚀
