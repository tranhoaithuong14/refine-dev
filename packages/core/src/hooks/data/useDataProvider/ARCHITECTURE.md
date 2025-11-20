# Kiến trúc và Design Patterns của useDataProvider Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DATA PROVIDER SYSTEM                    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useDataProvider ✅ (THIS HOOK)                   │  │
│  │    → Gateway to ALL data providers               │  │
│  │         │                                         │  │
│  │         ├──→ SINGLE PROVIDER:                    │  │
│  │         │     dataProvider() → default API       │  │
│  │         │                                         │  │
│  │         ├──→ MULTI-PROVIDER:                     │  │
│  │         │     dataProvider() → default API       │  │
│  │         │     dataProvider('analytics') → GraphQL│  │
│  │         │     dataProvider('legacy') → SOAP      │  │
│  │         │                                         │  │
│  │         └──→ Returns DataProvider with:          │  │
│  │               - getList()                         │  │
│  │               - getOne()                          │  │
│  │               - create()                          │  │
│  │               - update()                          │  │
│  │               - deleteOne()                       │  │
│  │               - custom()                          │  │
│  │                                                   │  │
│  │  Used by ALL data hooks:                         │  │
│  │    - useList → useDataProvider internally        │  │
│  │    - useOne → useDataProvider internally         │  │
│  │    - useCreate → useDataProvider internally      │  │
│  │    - useUpdate → useDataProvider internally      │  │
│  │    - useDelete → useDataProvider internally      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide access to data providers with support for multiple backends, acting as the foundation for all data operations in Refine**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│              USEDATAPROVIDER COMPLETE FLOW                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Configure Providers in <Refine>                    │
│  <Refine                                                     │
│    dataProvider={{                                           │
│      default: restProvider("https://api.example.com"),       │
│      analytics: graphqlProvider("https://analytics.com"),    │
│      legacy: soapProvider("https://legacy.com")              │
│    }}                                                        │
│  />                                                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Providers Stored in Context                        │
│  DataContext = {                                             │
│    default: restProvider,    // Required                     │
│    analytics: graphqlProvider, // Optional                   │
│    legacy: soapProvider       // Optional                    │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Component Uses Hook                                │
│  function MyComponent() {                                    │
│    const dataProvider = useDataProvider();                   │
│    // Returns: handleDataProvider function                   │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Get Provider (3 scenarios)                         │
│                                                              │
│  SCENARIO 1: Default Provider                               │
│  const api = dataProvider();    // No args                  │
│  → Returns: context.default (restProvider)                  │
│                                                              │
│  SCENARIO 2: Named Provider                                 │
│  const api = dataProvider('analytics'); // With name        │
│  → Returns: context['analytics'] (graphqlProvider)          │
│                                                              │
│  SCENARIO 3: Error                                          │
│  const api = dataProvider('nonexistent');                   │
│  → Throws: Provider not found error                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Use Provider Methods                               │
│  const posts = await api.getList({ resource: "posts" });    │
│  const post = await api.getOne({ resource: "posts", id: 1 });│
│  const created = await api.create({ resource: "posts", ... });│
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useDataProvider.tsx: 490 dòng** - Gateway to all data providers!

---

### 2.1 Adapter Pattern - Abstract Data Access

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Universal Power Adapter

```
Travel Power Adapter:

You have 1 laptop (your app)
But hotels have different outlets:
→ US outlet (REST API)
→ EU outlet (GraphQL)
→ UK outlet (SOAP)

Universal adapter:
→ Takes any outlet type
→ Gives you standard USB output
→ You don't care about outlet details!

DataProvider = Universal adapter!
Your app calls getList()
DataProvider handles REST/GraphQL/SOAP details!
```

**Adapter Pattern** = Convert one interface to another

#### Implementation:

```typescript
// From useDataProvider.tsx (lines 176-181)

export const useDataProvider = (): ((
  dataProviderName?: string,
) => DataProvider) => {
  // Returns a FUNCTION that gets the provider
  // This function ADAPTS different backends to a unified interface
};

// DataProvider Interface (unified):
interface DataProvider {
  getList: (params) => Promise<GetListResponse>;
  getOne: (params) => Promise<GetOneResponse>;
  create: (params) => Promise<CreateResponse>;
  update: (params) => Promise<UpdateResponse>;
  deleteOne: (params) => Promise<DeleteResponse>;
  // ... more methods
}

// Different implementations (adapters):
// 1. REST Adapter:
const restProvider: DataProvider = {
  getList: (params) => {
    return fetch(`/api/${params.resource}`).then((res) => res.json());
  },
};

// 2. GraphQL Adapter:
const graphqlProvider: DataProvider = {
  getList: (params) => {
    return client.query({
      query: gql`query { ${params.resource} { ... } }`,
    });
  },
};

// 3. SOAP Adapter:
const soapProvider: DataProvider = {
  getList: (params) => {
    return soapClient.call("getList", params);
  },
};

// YOUR APP: Always uses same interface!
const api = dataProvider();
const posts = await api.getList({ resource: "posts" });
// ↑ Works with REST/GraphQL/SOAP! You don't care! ✅
```

#### Visual Comparison:

```
WITHOUT ADAPTER (Hardcoded):
┌─────────────────────────────────────┐
│ Your App                            │
├─────────────────────────────────────┤
│ if (backend === 'REST') {           │
│   fetch('/api/posts')               │
│ } else if (backend === 'GraphQL') { │
│   client.query(...)                 │
│ } else if (backend === 'SOAP') {    │
│   soapClient.call(...)              │
│ }                                   │
└─────────────────────────────────────┘
// Tightly coupled! Hard to change! ❌


WITH ADAPTER (Abstracted):
┌─────────────────────────────────────┐
│ Your App                            │
├─────────────────────────────────────┤
│ api.getList({ resource: "posts" }) │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│ DataProvider (Adapter)              │
├─────────────────────────────────────┤
│ Handles REST/GraphQL/SOAP details   │
└─────────────────────────────────────┘
// Decoupled! Easy to swap! ✅
```

#### Real Example:

```tsx
function PostList() {
  const dataProvider = useDataProvider();

  // Get provider (adapter)
  const api = dataProvider(); // or dataProvider('graphql')

  // Use unified interface
  const fetchPosts = async () => {
    const { data } = await api.getList({
      resource: "posts",
      pagination: { current: 1, pageSize: 10 },
    });

    return data;
  };

  // Works with ANY backend! ✅
  // REST → fetch('/api/posts')
  // GraphQL → query { posts { ... } }
  // SOAP → <soapenv:getList>posts</soapenv:getList>
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Decoupling** - App doesn't depend on specific backend
- ✅ **Flexibility** - Swap backends without code changes
- ✅ **Consistency** - Same interface for all data sources
- ✅ **Testability** - Easy to mock providers

---

### 2.2 Registry Pattern - Provider Lookup

#### 📚 VÍ DỤ ĐỜI THƯỜNG: Phone Directory

```
Phone Directory:

Contacts:
→ "Home": 123-456-7890
→ "Work": 987-654-3210
→ "Mom": 555-555-5555

Look up by name:
→ directory["Home"] → 123-456-7890
→ directory["Mom"] → 555-555-5555

DataProvider Context = Phone directory!
→ context["default"] → restProvider
→ context["analytics"] → graphqlProvider
→ context["legacy"] → soapProvider
```

**Registry Pattern** = Store and retrieve by key

#### Implementation:

```typescript
// From useDataProvider.tsx (lines 231, 311, 387)

// STEP 1: Read registry (context)
const context = useContext(DataContext);
// context = {
//   default: restProvider,
//   analytics: graphqlProvider,
//   legacy: soapProvider
// }

// STEP 2: Look up by name
if (dataProviderName) {
  const dataProvider = context?.[dataProviderName];
  // ↑ Registry lookup! Like: directory["analytics"]

  if (!dataProvider) {
    throw new Error(`"${dataProviderName}" Data provider not found`);
  }

  return context[dataProviderName];
}

// STEP 3: Default lookup
if (context.default) {
  return context.default;
}
```

#### Registry Structure:

```typescript
// Registry (DataContext):
const providerRegistry = {
  // KEY         → VALUE
  "default"      → restProvider,
  "analytics"    → graphqlProvider,
  "legacy"       → soapProvider,
  "microservice" → microserviceProvider
};

// Lookup by key:
providerRegistry["default"]      // → restProvider
providerRegistry["analytics"]    // → graphqlProvider
providerRegistry["nonexistent"]  // → undefined (error)
```

#### Real Example - Multi-Provider:

```tsx
// Setup (in <Refine>):
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider("https://analytics.example.com"),
    legacy: soapProvider("https://legacy.example.com"),
    payments: stripeProvider("https://stripe.com/api"),
  }}
/>;

// Usage (in components):
function Dashboard() {
  const dataProvider = useDataProvider();

  // Look up "default" in registry
  const mainAPI = dataProvider();
  const posts = await mainAPI.getList({ resource: "posts" });

  // Look up "analytics" in registry
  const analyticsAPI = dataProvider("analytics");
  const metrics = await analyticsAPI.getList({ resource: "metrics" });

  // Look up "legacy" in registry
  const legacyAPI = dataProvider("legacy");
  const customers = await legacyAPI.getList({ resource: "customers" });

  // Look up "payments" in registry
  const paymentsAPI = dataProvider("payments");
  const invoices = await paymentsAPI.getList({ resource: "invoices" });
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Organized** - Central registry for all providers
- ✅ **Scalable** - Easy to add new providers
- ✅ **Named Access** - Clear, descriptive names
- ✅ **Validation** - Catch typos and missing providers

---

### 2.3 Factory Pattern - Provider Creation

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Car Factory

```
Car Factory:

Order by name:
→ "sedan" → Creates sedan car
→ "suv" → Creates SUV
→ "truck" → Creates truck

You don't create cars yourself!
You ask factory, it builds for you!

useDataProvider = Factory!
You ask for provider by name
Hook creates/returns it for you!
```

**Factory Pattern** = Object creation delegate

#### Implementation:

```typescript
// From useDataProvider.tsx (lines 268-449)

const handleDataProvider = useCallback(
  (dataProviderName?: string) => {
    // FACTORY LOGIC: Create/return provider based on input

    // FACTORY CASE 1: Named provider
    if (dataProviderName) {
      const dataProvider = context?.[dataProviderName];

      if (!dataProvider) {
        throw new Error(`"${dataProviderName}" Data provider not found`);
      }

      // Factory validation
      if (dataProvider && !context?.default) {
        throw new Error(
          "If you have multiple data providers, you must provide default data provider property",
        );
      }

      return context[dataProviderName]; // ← Factory returns product!
    }

    // FACTORY CASE 2: Default provider
    if (context.default) {
      return context.default; // ← Factory returns default product!
    }

    // FACTORY CASE 3: Error
    throw new Error(
      `There is no "default" data provider. Please pass dataProviderName.`,
    );
  },
  [context],
);

// Return factory function
return handleDataProvider;
```

#### Factory Creation Flow:

```typescript
// USER REQUEST:
const dataProvider = useDataProvider();
const api = dataProvider("analytics");
//                        ↑ Factory input


// FACTORY PROCESSING:
handleDataProvider("analytics") {
  // 1. Validate input
  if (!context?.["analytics"]) {
    throw Error("analytics not found");
  }

  // 2. Validate multi-provider setup
  if (!context?.default) {
    throw Error("Need default provider");
  }

  // 3. Return product
  return context["analytics"]; // ← GraphQL provider
}


// USER RECEIVES:
api = graphqlProvider
// Ready to use! ✅
```

#### Real Example - Factory Validation:

```tsx
// ❌ WRONG - Missing default:
<Refine
  dataProvider={{
    analytics: graphqlProvider,
    legacy: soapProvider,
    // NO default! ❌
  }}
/>;

function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider("analytics");
  // ↑ THROWS ERROR:
  // "If you have multiple data providers,
  //  you must provide default data provider property"
}

// ✅ CORRECT - Has default:
<Refine
  dataProvider={{
    default: restProvider, // ← Default! ✅
    analytics: graphqlProvider,
    legacy: soapProvider,
  }}
/>;

function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider("analytics");
  // ✅ Works! Factory validates and returns provider
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - Creation logic centralized
- ✅ **Validation** - Ensures correct configuration
- ✅ **Simplicity** - User just asks, factory delivers
- ✅ **Error Handling** - Clear error messages

---

### 2.4 Context API Pattern - Global State Access

#### 🌐 VÍ DỤ ĐỜI THƯỜNG: City Power Grid

```
City Power Grid:

Power plant (top of city):
→ Generates electricity once

Power lines (Context):
→ Distribute to all buildings

Any house (any component):
→ Plugs in, gets power
→ No need to pass power house-to-house!

React Context = Power grid!
<Refine> = Power plant (providers)
Any component = House (can access)
```

**Context API** = Global state without prop drilling

#### Implementation:

```typescript
// From useDataProvider.tsx (lines 173, 231)

import { DataContext } from "@contexts/data";

// Read from Context (global state)
const context = useContext(DataContext);
// ↑ Any component, any depth, can access! ✅

// Context structure:
// DataContext.Provider value={{
//   default: restProvider,
//   analytics: graphqlProvider
// }}
```

#### Prop Drilling vs Context:

```
WITHOUT CONTEXT (Prop Drilling):
┌─────────────────────────────────────┐
│ <App>                               │
│   providers={{ default, analytics }}│ ← Defined
│   ↓ (pass as prop)                  │
│   <Layout providers={...}>          │
│     ↓ (pass again)                  │
│     <Dashboard providers={...}>     │
│       ↓ (pass again)                │
│       <PostList providers={...}>    │
│         ↓ (FINALLY used!)           │
│         useProviders(props.providers)│
│       </PostList>                   │
│     </Dashboard>                    │
│   </Layout>                         │
│ </App>                              │
└─────────────────────────────────────┘
// Passed through 4 levels! ❌
// Tedious! Error-prone! ❌


WITH CONTEXT (Direct Access):
┌─────────────────────────────────────┐
│ <App>                               │
│   <DataContext.Provider             │
│     value={{ default, analytics }}> │ ← Stored in Context
│     ↓                                │
│     <Layout>  (no props)            │
│       ↓                              │
│       <Dashboard>  (no props)       │
│         ↓                            │
│         <PostList>  (no props)      │
│           useDataProvider()         │ ← Direct access!
│         </PostList>                 │
│       </Dashboard>                  │
│     </Layout>                       │
│   </DataContext.Provider>           │
│ </App>                              │
└─────────────────────────────────────┘
// No props! Direct access! ✅
// Clean! Simple! ✅
```

#### Real Example:

```tsx
// SETUP (in <Refine> - top level):
function App() {
  return (
    <Refine
      dataProvider={{
        default: restProvider("https://api.example.com"),
        analytics: graphqlProvider("https://analytics.example.com"),
      }}
    >
      <AppContent />
    </Refine>
  );
}

// USAGE (deep nested component):
function DeepNestedComponent() {
  // Direct access via Context! No props! ✅
  const dataProvider = useDataProvider();
  const api = dataProvider();

  const fetchData = async () => {
    const { data } = await api.getList({ resource: "posts" });
    return data;
  };
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **No Prop Drilling** - Direct access from anywhere
- ✅ **Clean Code** - No passing props through levels
- ✅ **Single Source** - Configured once, used everywhere
- ✅ **Testability** - Easy to mock context for tests

---

### 2.5 Memoization Pattern - Performance Optimization

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: Calculator Memory

```
Calculator:

Calculate 123 × 456:
→ First time: Do calculation → 56,088
→ Save to memory (M+)

Calculate 123 × 456 again:
→ Don't recalculate!
→ Recall from memory (MR) → 56,088 (instant!)

useCallback = Memory function!
Create function once
Reuse on every render (unless deps change)
```

**Memoization** = Cache computed results

#### Implementation:

```typescript
// From useDataProvider.tsx (lines 268-449)

// WITHOUT useCallback (re-created every render):
const handleDataProvider = (name) => {
  // ... function body
};
// ↑ NEW function every render! ❌
// If 100 re-renders → 100 new functions!

// WITH useCallback (memoized):
const handleDataProvider = useCallback(
  (dataProviderName?: string) => {
    // ... function body
  },
  [context], // ← Dependencies
);
// ↑ SAME function reused! ✅
// Function changes ONLY when context changes!
```

#### Performance Comparison:

```typescript
// Scenario: Component re-renders 100 times

// WITHOUT useCallback:
Render 1: Create function #1
Render 2: Create function #2
Render 3: Create function #3
...
Render 100: Create function #100
// 100 new functions! ❌
// Memory waste! ❌


// WITH useCallback:
Render 1: Create function #1
Render 2: Return function #1 (cached)
Render 3: Return function #1 (cached)
...
Render 100: Return function #1 (cached)
// Only 1 function! ✅
// Memory efficient! ✅


// Function changes ONLY when context changes:
Render 1: Create function #1 (context changed)
Render 2-99: Return function #1 (context same)
Render 100: Create function #2 (context changed)
// 2 functions total! ✅
```

#### Why Memoization Matters:

```tsx
// CASE 1: Function passed as prop
function Parent() {
  const dataProvider = useDataProvider();
  // ↑ Without useCallback: New function every render

  return <Child onFetch={dataProvider} />;
  // ↑ Child sees new prop → re-renders every time! ❌
}

const Child = React.memo(({ onFetch }) => {
  // React.memo prevents re-render if props unchanged
  // But if onFetch is new function → re-renders anyway! ❌
});

// WITH useCallback:
function Parent() {
  const dataProvider = useDataProvider();
  // ↑ Same function every render (memoized)

  return <Child onFetch={dataProvider} />;
  // ↑ Child sees same prop → NO re-render! ✅
}

const Child = React.memo(({ onFetch }) => {
  // React.memo works! Props unchanged! ✅
});

// CASE 2: useEffect dependency
function MyComponent() {
  const dataProvider = useDataProvider();

  useEffect(() => {
    const api = dataProvider();
    api.getList({ resource: "posts" });
  }, [dataProvider]); // ← Dependency

  // WITHOUT useCallback:
  // - dataProvider changes every render
  // - Effect runs every render! ❌

  // WITH useCallback:
  // - dataProvider same every render
  // - Effect runs once! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid unnecessary re-renders
- ✅ **Efficiency** - Reuse same function
- ✅ **Stability** - Consistent reference for deps
- ✅ **Optimization** - Works with React.memo

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường        | Giải quyết vấn đề gì          | Trong useDataProvider                   |
| --------------- | ----------------------- | ----------------------------- | --------------------------------------- |
| **Adapter**     | Universal power adapter | Abstract different interfaces | Unified interface for REST/GraphQL/SOAP |
| **Registry**    | Phone directory         | Store and lookup              | Context stores providers by name        |
| **Factory**     | Car factory             | Object creation               | Create provider based on name           |
| **Context API** | City power grid         | Global state access           | No prop drilling for providers          |
| **Memoization** | Calculator memory       | Performance optimization      | useCallback for stable function         |

---

## 3. KEY FEATURES

### 3.1 Single Provider Mode

```tsx
// Simple setup
<Refine dataProvider={restProvider("https://api.example.com")} />;

// Usage
function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider(); // Gets default

  const posts = await api.getList({ resource: "posts" });
}
```

### 3.2 Multi-Provider Mode

```tsx
// Multi-provider setup
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider("https://analytics.example.com"),
    legacy: soapProvider("https://legacy.example.com"),
  }}
/>;

// Usage
function Dashboard() {
  const dataProvider = useDataProvider();

  // Get different providers
  const mainAPI = dataProvider(); // default
  const analyticsAPI = dataProvider("analytics"); // analytics
  const legacyAPI = dataProvider("legacy"); // legacy
}
```

### 3.3 Provider Validation

```typescript
// Error: Named provider not found
const api = dataProvider("nonexistent");
// Throws: "nonexistent" Data provider not found

// Error: Multi-provider without default
<Refine
  dataProvider={{
    analytics: graphqlProvider,
    legacy: soapProvider,
    // Missing default!
  }}
/>;
// Throws: You must provide default data provider property

// Error: No default provider
const api = dataProvider(); // No name
// Throws: There is no "default" data provider
```

### 3.4 DataProvider Interface

```typescript
interface DataProvider {
  getList: <TData>(params: GetListParams) => Promise<GetListResponse<TData>>;
  getOne: <TData>(params: GetOneParams) => Promise<GetOneResponse<TData>>;
  getMany?: <TData>(params: GetManyParams) => Promise<GetManyResponse<TData>>;
  create: <TData>(params: CreateParams) => Promise<CreateResponse<TData>>;
  createMany?: <TData>(
    params: CreateManyParams,
  ) => Promise<CreateManyResponse<TData>>;
  update: <TData>(params: UpdateParams) => Promise<UpdateResponse<TData>>;
  updateMany?: <TData>(
    params: UpdateManyParams,
  ) => Promise<UpdateManyResponse<TData>>;
  deleteOne: <TData>(params: DeleteOneParams) => Promise<DeleteResponse<TData>>;
  deleteMany?: <TData>(
    params: DeleteManyParams,
  ) => Promise<DeleteManyResponse<TData>>;
  custom?: <TData>(params: CustomParams) => Promise<CustomResponse<TData>>;
  getApiUrl: () => string;
}
```

---

## 4. COMMON USE CASES

### 4.1 Microservices Architecture

```tsx
// Different service for each resource
<Refine
  dataProvider={{
    default: restProvider("https://main.example.com"),
    users: userServiceProvider("https://users.example.com"),
    products: productServiceProvider("https://products.example.com"),
    orders: orderServiceProvider("https://orders.example.com"),
  }}
/>;

// Usage
function Dashboard() {
  const dataProvider = useDataProvider();

  const userAPI = dataProvider("users");
  const productAPI = dataProvider("products");
  const orderAPI = dataProvider("orders");

  const users = await userAPI.getList({ resource: "users" });
  const products = await productAPI.getList({ resource: "products" });
  const orders = await orderAPI.getList({ resource: "orders" });
}
```

### 4.2 Multi-tenant Applications

```tsx
// Different provider per tenant
<Refine
  dataProvider={{
    default: tenantAProvider("https://tenant-a.example.com"),
    tenantB: tenantBProvider("https://tenant-b.example.com"),
    tenantC: tenantCProvider("https://tenant-c.example.com"),
  }}
/>;

// Usage
function TenantDashboard({ tenantId }) {
  const dataProvider = useDataProvider();

  // Get provider based on tenant
  const api =
    tenantId === "A"
      ? dataProvider() // default (tenant A)
      : dataProvider(`tenant${tenantId}`); // tenantB, tenantC

  const data = await api.getList({ resource: "posts" });
}
```

### 4.3 Migration Period (Old + New APIs)

```tsx
// During migration: Both old and new APIs
<Refine
  dataProvider={{
    default: newAPIProvider("https://new-api.example.com"),
    legacy: oldAPIProvider("https://old-api.example.com"),
  }}
/>;

// Usage
function PostList() {
  const dataProvider = useDataProvider();

  // New posts from new API
  const newAPI = dataProvider();
  const newPosts = await newAPI.getList({ resource: "posts" });

  // Old posts from legacy API
  const legacyAPI = dataProvider("legacy");
  const oldPosts = await legacyAPI.getList({ resource: "archived-posts" });
}
```

### 4.4 Different Protocols (REST + GraphQL)

```tsx
// REST for CRUD, GraphQL for analytics
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider({
      uri: "https://analytics.example.com/graphql",
    }),
  }}
/>;

// Usage
function Dashboard() {
  const dataProvider = useDataProvider();

  // CRUD operations (REST)
  const restAPI = dataProvider();
  const posts = await restAPI.getList({ resource: "posts" });

  // Analytics (GraphQL)
  const graphqlAPI = dataProvider("analytics");
  const metrics = await graphqlAPI.getList({
    resource: "metrics",
    meta: {
      fields: ["views", "clicks", "conversions"],
    },
  });
}
```

### 4.5 Custom Direct Usage

```tsx
// Low-level usage (bypassing high-level hooks)
function CustomComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider();

  const handleCustomOperation = async () => {
    try {
      // Direct provider method call
      const result = await api.custom({
        url: "/custom-endpoint",
        method: "post",
        payload: { custom: "data" },
      });

      console.log("Custom result:", result);
    } catch (error) {
      console.error("Custom operation failed:", error);
    }
  };

  return (
    <button onClick={handleCustomOperation}>Execute Custom Operation</button>
  );
}
```

### 4.6 Dynamic Provider Selection

```tsx
function DynamicProviderComponent() {
  const dataProvider = useDataProvider();
  const [selectedProvider, setSelectedProvider] = useState("default");

  const fetchData = async () => {
    // Dynamically select provider
    const api = dataProvider(selectedProvider);
    const data = await api.getList({ resource: "posts" });
    return data;
  };

  return (
    <div>
      <select onChange={(e) => setSelectedProvider(e.target.value)}>
        <option value="">Default</option>
        <option value="analytics">Analytics</option>
        <option value="legacy">Legacy</option>
      </select>

      <button onClick={fetchData}>Fetch Data</button>
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Return a Function?

**Question:** Why return `() => DataProvider` instead of `DataProvider` directly?

**Answer:** Flexibility for multi-provider scenarios

```typescript
// ❌ If returned provider directly:
const provider = useDataProvider();
// Which provider? Default? Analytics? No way to choose!


// ✅ By returning a function:
const getProvider = useDataProvider();
const default = getProvider();           // Choose default
const analytics = getProvider("analytics"); // Choose analytics

// Same hook works for single AND multi-provider! ✅
```

### 5.2 Why Require Default Provider?

**Question:** Why must multi-provider setup have a `default` key?

**Answer:** High-level hooks need a fallback

```typescript
// High-level hooks don't specify provider:
const { data } = useList({ resource: "posts" });
// ↑ Which provider to use? Needs default!

const { mutate } = useCreate({ resource: "posts" });
// ↑ Which provider to use? Needs default!

// Without default, these hooks would break! ❌
// With default, they work seamlessly! ✅
```

### 5.3 Why Use Context API?

**Question:** Why not use Redux or state management library?

**Answer:** Simpler, built-in, sufficient

```typescript
// Context advantages:
// 1. Built into React (no extra deps)
// 2. Perfect for read-only global state
// 3. Simple API (Provider + useContext)
// 4. No boilerplate (Redux needs actions, reducers, etc.)

// Providers rarely change after initial setup
// → Context is perfect! ✅
```

### 5.4 Why useCallback?

**Question:** Why memoize the function with useCallback?

**Answer:** Performance and stability

```typescript
// Without useCallback:
// - New function every render
// - Breaks React.memo optimization
// - Triggers unnecessary useEffect runs
// - Performance degradation in large apps

// With useCallback:
// - Same function reference (unless context changes)
// - React.memo works properly
// - useEffect stable dependencies
// - Better performance ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting Default Provider

```tsx
// ❌ WRONG - Multi-provider without default
<Refine
  dataProvider={{
    analytics: graphqlProvider,
    legacy: soapProvider,
    // NO default! ❌
  }}
/>;

function MyComponent() {
  const { data } = useList({ resource: "posts" });
  // THROWS ERROR! useList needs default provider! ❌
}

// ✅ CORRECT - Has default
<Refine
  dataProvider={{
    default: restProvider, // ← Default! ✅
    analytics: graphqlProvider,
    legacy: soapProvider,
  }}
/>;

function MyComponent() {
  const { data } = useList({ resource: "posts" });
  // Works! Uses default provider! ✅
}
```

### 6.2 Typo in Provider Name

```tsx
// Setup
<Refine
  dataProvider={{
    default: restProvider,
    analytics: graphqlProvider,
  }}
/>;

// ❌ WRONG - Typo
function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider("analtyics"); // ← Typo! ❌
  // THROWS: "analtyics" Data provider not found
}

// ✅ CORRECT - Correct name
function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider("analytics"); // ← Correct! ✅
  // Works! ✅
}
```

### 6.3 Not Calling the Function

```tsx
// ❌ WRONG - Forgot to call
function MyComponent() {
  const dataProvider = useDataProvider();
  // dataProvider is a FUNCTION, not the provider!

  const posts = await dataProvider.getList({ resource: "posts" });
  // ERROR! dataProvider doesn't have getList! ❌
}

// ✅ CORRECT - Call the function
function MyComponent() {
  const dataProvider = useDataProvider();
  const api = dataProvider(); // ← Call it! ✅

  const posts = await api.getList({ resource: "posts" });
  // Works! api has getList! ✅
}
```

### 6.4 Using Wrong Provider for Resource

```tsx
// Setup
<Refine
  dataProvider={{
    default: restProvider, // Has: posts, users
    analytics: graphqlProvider, // Has: metrics, stats
  }}
/>;

// ❌ WRONG - Using analytics provider for posts
function PostList() {
  const dataProvider = useDataProvider();
  const api = dataProvider("analytics"); // ← Wrong provider!

  const posts = await api.getList({ resource: "posts" });
  // Fails! Analytics provider doesn't have posts! ❌
}

// ✅ CORRECT - Use default provider for posts
function PostList() {
  const dataProvider = useDataProvider();
  const api = dataProvider(); // ← Default provider ✅

  const posts = await api.getList({ resource: "posts" });
  // Works! Default has posts! ✅
}
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Memoization Impact

```typescript
// With useCallback:
// - Function created once (or when context changes)
// - 0ms overhead on re-renders
// - Stable reference for React.memo

// Without useCallback:
// - Function created every render
// - ~0.1ms overhead per render
// - In 1000 renders: 100ms+ wasted
// - Breaks memoization optimizations
```

### 7.2 Context Re-renders

```typescript
// Context value changes:
<DataContext.Provider value={{ default, analytics }}>
// ↑ If this object changes, ALL consumers re-render!

// Best practice: Create providers ONCE
const providers = useMemo(() => ({
  default: restProvider("..."),
  analytics: graphqlProvider("...")
}), []); // ← Empty deps! Created once!

<DataContext.Provider value={providers}>
// ↑ Same reference every render! No unnecessary re-renders! ✅
```

---

## 8. TESTING

### 8.1 Test Default Provider

```typescript
describe("useDataProvider - default", () => {
  it("should return default provider", () => {
    const mockProvider = {
      getList: jest.fn(),
      getOne: jest.fn(),
    };

    const wrapper = ({ children }) => (
      <DataContext.Provider value={{ default: mockProvider }}>
        {children}
      </DataContext.Provider>
    );

    const { result } = renderHook(() => useDataProvider(), { wrapper });

    const api = result.current();
    expect(api).toBe(mockProvider);
  });
});
```

### 8.2 Test Named Provider

```typescript
describe("useDataProvider - named", () => {
  it("should return named provider", () => {
    const mockDefault = { getList: jest.fn() };
    const mockAnalytics = { getList: jest.fn() };

    const wrapper = ({ children }) => (
      <DataContext.Provider
        value={{
          default: mockDefault,
          analytics: mockAnalytics,
        }}
      >
        {children}
      </DataContext.Provider>
    );

    const { result } = renderHook(() => useDataProvider(), { wrapper });

    const api = result.current("analytics");
    expect(api).toBe(mockAnalytics);
  });
});
```

### 8.3 Test Error Cases

```typescript
describe("useDataProvider - errors", () => {
  it("should throw if provider not found", () => {
    const wrapper = ({ children }) => (
      <DataContext.Provider value={{ default: {} }}>
        {children}
      </DataContext.Provider>
    );

    const { result } = renderHook(() => useDataProvider(), { wrapper });

    expect(() => {
      result.current("nonexistent");
    }).toThrow('"nonexistent" Data provider not found');
  });

  it("should throw if no default", () => {
    const wrapper = ({ children }) => (
      <DataContext.Provider value={{}}>{children}</DataContext.Provider>
    );

    const { result } = renderHook(() => useDataProvider(), { wrapper });

    expect(() => {
      result.current();
    }).toThrow('There is no "default" data provider');
  });
});
```

---

## 9. COMPARISON WITH OTHER HOOKS

### 9.1 useDataProvider vs useList

```typescript
// useDataProvider (LOW-LEVEL):
const dataProvider = useDataProvider();
const api = dataProvider();
const { data } = await api.getList({ resource: "posts" });
// - Manual control
// - No React Query integration
// - Need to handle state yourself

// useList (HIGH-LEVEL):
const { data, isLoading, error } = useList({ resource: "posts" });
// - Automatic state management
// - React Query integration (caching, refetch, etc.)
// - Uses useDataProvider internally
```

### 9.2 When to Use What?

```typescript
// Use HIGH-LEVEL hooks (useList, useCreate, etc.):
// ✅ Standard CRUD operations
// ✅ Need caching, loading states
// ✅ Want automatic optimistic updates
// ✅ 95% of use cases

// Use LOW-LEVEL useDataProvider:
// ✅ Custom logic not covered by high-level hooks
// ✅ Building your own abstraction
// ✅ Need to call methods not exposed by Refine
// ✅ Advanced use cases (5%)
```

---

## 10. KẾT LUẬN

### Design Patterns Summary

- ✅ **Adapter**: Unified interface for REST/GraphQL/SOAP
- ✅ **Registry**: Store and retrieve providers by name
- ✅ **Factory**: Create provider based on input
- ✅ **Context API**: Global access without prop drilling
- ✅ **Memoization**: Performance optimization with useCallback

### Key Features

1. **Adapter Layer** - Abstract different backends
2. **Multi-Provider** - Support multiple backends
3. **Registry Pattern** - Named provider lookup
4. **Validation** - Ensure correct configuration
5. **Memoization** - Optimized performance

### Khi nào dùng useDataProvider?

✅ **Nên dùng:**

- Building custom abstraction
- Need methods not in high-level hooks
- Multi-provider architecture
- Advanced control needed

❌ **Không dùng:**

- Standard CRUD (use useList, useCreate, etc.)
- Want automatic caching (use React Query hooks)
- Simple operations (high-level hooks better)

### Remember

✅ **490 lines** - Foundation of all data hooks
🔌 **Adapter** - Unified interface for any backend
📚 **Registry** - Named provider storage
🏭 **Factory** - Provider creation and validation
🌐 **Context** - No prop drilling
🧠 **Memoized** - Performance optimized

### Multi-Provider Best Practices

1. **Always provide default** - Required for high-level hooks
2. **Descriptive names** - "analytics", not "api2"
3. **Validate early** - Check provider exists
4. **Document** - Which provider for which resource
5. **Test** - Mock providers in tests

### Architecture Pyramid

```
┌─────────────────────────────────────┐
│   High-Level Hooks (useList, etc.) │ ← 95% usage
├─────────────────────────────────────┤
│        useDataProvider              │ ← 5% direct usage
├─────────────────────────────────────┤
│     DataProvider Implementations    │
│   (REST, GraphQL, SOAP, etc.)       │
└─────────────────────────────────────┘
```

---

> 📚 **Best Practice**: Use high-level hooks (useList, useCreate, etc.) for standard operations. Use **useDataProvider** only when you need custom logic or advanced control. Think of it as the **foundation layer** that powers all other data hooks!
