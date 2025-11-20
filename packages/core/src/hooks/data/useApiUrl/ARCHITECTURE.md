# Kiến trúc và Design Patterns của useApiUrl Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           DATA PROVIDER SYSTEM                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  Data Provider                                   │  │
│  │    - getList()                                   │  │
│  │    - getOne()                                    │  │
│  │    - create()                                    │  │
│  │    - update()                                    │  │
│  │    - delete()                                    │  │
│  │    - getApiUrl() ✅ (THIS METHOD)                │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  useApiUrl ✅ (THIS HOOK)                        │  │
│  │    Returns base API URL                          │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Use cases:                                      │  │
│  │    - Manual fetch calls                          │  │
│  │    - File upload URLs                            │  │
│  │    - Download links                              │  │
│  │    - WebSocket connections                       │  │
│  │    - Display API info                            │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có 1 mục đích cực kỳ đơn giản:**

> **Get the base API URL from the data provider, useful for manual API calls, file uploads, downloads, WebSocket connections, or displaying API information**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    USEAPIURL FLOW                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component calls useApiUrl                          │
│  const apiUrl = useApiUrl();                                 │
│  // or                                                       │
│  const apiUrl = useApiUrl("customProvider");                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Get Resource Info (useResourceParams)              │
│  const { resource } = useResourceParams();                   │
│  → resource.meta.dataProviderName = "customProvider"         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Resolve Data Provider Priority                     │
│  Priority:                                                   │
│  1. dataProviderName param (explicit)                        │
│  2. resource.meta.dataProviderName (resource-specific)       │
│  3. Default provider (fallback)                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Get Data Provider (useDataProvider)                │
│  const dataProvider = useDataProvider();                     │
│  const provider = dataProvider("customProvider");            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Call getApiUrl Method                              │
│  const { getApiUrl } = provider;                             │
│  const url = getApiUrl();                                    │
│  → "https://api.example.com"                                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Return URL to Component                            │
│  return url;                                                 │
│  → Component receives: "https://api.example.com"            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này chỉ 51 dòng** - Simplest hook in Refine!

---

### 2.1 Facade Pattern - Pattern "Mặt Tiền Đơn Giản"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Hotel Front Desk

```
Hotel Information:

❌ BAD - Find info yourself:
1. Go to manager's office
2. Ask for address
3. Go to IT room
4. Find server IP
5. Ask receptionist for phone
→ Too complex!

✅ GOOD - Ask front desk:
You: "What's the hotel address?"
Desk: "123 Main Street"
→ Simple! Front desk knows everything!

Same for useApiUrl:
You: "What's the API URL?"
Hook: "https://api.example.com"
```

**Facade Pattern** = Simple interface hiding complexity

#### Implementation:

```typescript
// useApiUrl = Facade over data provider system

export const useApiUrl = (dataProviderName?: string): string => {
  // SUBSYSTEM 1: Get data provider selector
  const dataProvider = useDataProvider();

  // SUBSYSTEM 2: Get current resource info
  const { resource } = useResourceParams();

  // FACADE: Simple interface
  const { getApiUrl } = dataProvider(
    dataProviderName ?? resource?.meta?.dataProviderName,
  );

  return getApiUrl();
};
```

#### ❌ KHÔNG có Facade:

```tsx
// BAD - Component must handle data provider system

function FileUpload() {
  // Must understand data provider system ❌
  const dataProvider = useDataProvider();
  const { resource } = useResourceParams();
  const providerName = resource?.meta?.dataProviderName;
  const provider = dataProvider(providerName);
  const apiUrl = provider.getApiUrl();

  return <div>Upload to: {apiUrl}/files</div>;
}

// Too complex!
```

#### ✅ CÓ Facade Pattern:

```tsx
// GOOD - Simple facade

function FileUpload() {
  const apiUrl = useApiUrl();

  return <div>Upload to: {apiUrl}/files</div>;
}

// Simple! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - One line instead of 5
- ✅ **Encapsulation** - Hide data provider complexity
- ✅ **Consistency** - Same pattern everywhere
- ✅ **Easy to use** - Can't use incorrectly

---

### 2.2 Strategy Pattern - Pattern "Chiến Lược Linh Hoạt"

#### 🗺️ VÍ DỤ ĐỜI THƯỜNG: Multiple API Servers

```
E-commerce Application:

Different services, different APIs:
- Products API: https://products.api.com
- Users API: https://users.api.com
- Orders API: https://orders.api.com
- Payments API: https://payments.api.com

Each resource uses different strategy (API server)!
```

**Strategy Pattern** = Choose data provider based on context

#### Implementation:

```typescript
// From useApiUrl (lines 44-46)

const { getApiUrl } = dataProvider(
  dataProviderName ?? resource?.meta?.dataProviderName,
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Strategy selection:
  // 1. Explicit provider name (param)
  // 2. Resource-specific provider (meta)
  // 3. Default provider (fallback)
);
```

#### Strategy Priority:

```typescript
// STRATEGY 1: Explicit provider (highest priority)
const apiUrl = useApiUrl("paymentsProvider");
// → Always uses "paymentsProvider"
// Ignores resource meta

// STRATEGY 2: Resource-specific provider
const apiUrl = useApiUrl();
// Inside "products" resource with:
// meta: { dataProviderName: "productsProvider" }
// → Uses "productsProvider"

// STRATEGY 3: Default provider (fallback)
const apiUrl = useApiUrl();
// No param, no meta
// → Uses default provider
```

#### Real Examples:

```tsx
// Example 1: Microservices Architecture

// Refine setup:
<Refine
  dataProvider={{
    default: restProvider("https://api.main.com"),
    products: restProvider("https://products.api.com"),
    users: restProvider("https://users.api.com"),
    orders: restProvider("https://orders.api.com"),
  }}
  resources={[
    {
      name: "products",
      meta: { dataProviderName: "products" },
    },
    {
      name: "users",
      meta: { dataProviderName: "users" },
    },
    {
      name: "orders",
      meta: { dataProviderName: "orders" },
    },
  ]}
/>;

// In ProductsPage:
const apiUrl = useApiUrl();
// → "https://products.api.com" (from meta)

// In UsersPage:
const apiUrl = useApiUrl();
// → "https://users.api.com" (from meta)

// Explicit override:
const mainApiUrl = useApiUrl("default");
// → "https://api.main.com" (explicit)
```

#### Visual Representation:

```
┌─────────────────────────────────────────────────────┐
│           STRATEGY SELECTION FLOWCHART              │
└─────────────────────────────────────────────────────┘

useApiUrl(dataProviderName?)
        │
        ▼
   Has param? ──YES──► Use param provider
        │
        NO
        ▼
   Has resource.meta.dataProviderName? ──YES──► Use meta provider
        │
        NO
        ▼
   Use default provider
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose provider at runtime
- ✅ **Microservices** - Different APIs per resource
- ✅ **Multi-tenant** - Different APIs per tenant
- ✅ **Override** - Explicit provider when needed

---

### 2.3 Dependency Injection Pattern

#### 💉 VÍ DỤ ĐỜI THƯỜNG: Power Outlet

```
Power Outlet (Dependency Injection):

❌ BAD - Hard-coded power source:
Device has built-in battery
→ Can't change power source
→ Battery dies, device dies

✅ GOOD - Power outlet (injection):
Device plugs into outlet
→ Outlet provides power (injected dependency)
→ Change outlet, device still works

Same for data provider:
Hook doesn't hard-code API URL
→ Data provider injected via context
→ Change provider, hook still works
```

**Dependency Injection** = Dependencies provided from outside, not hard-coded

#### Implementation:

```typescript
// useApiUrl doesn't hard-code URL

export const useApiUrl = (dataProviderName?: string): string => {
  // INJECTED DEPENDENCY 1: Data provider from context
  const dataProvider = useDataProvider(); // ← Injected!

  // INJECTED DEPENDENCY 2: Resource from context
  const { resource } = useResourceParams(); // ← Injected!

  // Use injected dependencies
  const { getApiUrl } = dataProvider(
    dataProviderName ?? resource?.meta?.dataProviderName,
  );

  return getApiUrl();
};
```

#### ❌ KHÔNG có Dependency Injection:

```typescript
// BAD - Hard-coded URL ❌

export const useApiUrl = (): string => {
  return "https://api.example.com"; // ← Hard-coded!
  // Can't change without editing code!
  // Can't test with mock API!
  // Can't support multiple APIs!
};
```

#### ✅ CÓ Dependency Injection:

```typescript
// GOOD - Injected via context ✅

// In App.tsx:
<Refine
  dataProvider={restProvider("https://api.example.com")}
  // ← Provider INJECTED here
>
  <App />
</Refine>

// In component:
const apiUrl = useApiUrl();
// → Gets URL from injected provider ✅

// Easy to change:
<Refine
  dataProvider={restProvider("https://api.production.com")}
  // ← Just change here, all components update!
>

// Easy to test:
<Refine
  dataProvider={mockProvider("http://localhost:3000")}
  // ← Mock provider for testing
>
```

#### Benefits in Real Apps:

```tsx
// Environment-based configuration:

// Development:
<Refine dataProvider={restProvider(process.env.DEV_API_URL)} />

// Staging:
<Refine dataProvider={restProvider(process.env.STAGING_API_URL)} />

// Production:
<Refine dataProvider={restProvider(process.env.PROD_API_URL)} />

// All components use useApiUrl() - no changes needed! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Testability** - Easy to mock providers
- ✅ **Flexibility** - Change provider without code changes
- ✅ **Environment** - Different URLs per environment
- ✅ **Decoupling** - Hook doesn't depend on specific implementation

---

### 2.4 Single Responsibility Principle (SRP)

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Restaurant Roles

```
Restaurant:

❌ BAD - One person does everything:
Waiter:
  - Takes orders
  - Cooks food
  - Manages inventory
  - Handles payments
  - Cleans tables
→ Too many responsibilities!

✅ GOOD - Each role has one job:
Waiter: Takes orders (only)
Chef: Cooks food (only)
Manager: Manages inventory (only)
Cashier: Handles payments (only)
Cleaner: Cleans tables (only)
→ Each has single responsibility!
```

**Single Responsibility** = One class/hook/function = One reason to change

#### Implementation:

```typescript
// useApiUrl has ONE responsibility: Get API URL

export const useApiUrl = (dataProviderName?: string): string => {
  // Does NOT handle:
  // ❌ Making API calls
  // ❌ Data fetching
  // ❌ Cache management
  // ❌ Authentication
  // ❌ Error handling

  // ONLY does:
  // ✅ Get API URL from provider

  const dataProvider = useDataProvider();
  const { resource } = useResourceParams();
  const { getApiUrl } = dataProvider(
    dataProviderName ?? resource?.meta?.dataProviderName,
  );

  return getApiUrl(); // ← Single responsibility!
};
```

#### Division of Responsibilities:

```typescript
// Each hook has single responsibility:

// useApiUrl: Get API URL
const apiUrl = useApiUrl();

// useDataProvider: Get data provider
const dataProvider = useDataProvider();

// useOne: Fetch single item
const { data } = useOne({ resource: "posts", id: 123 });

// useList: Fetch list
const { data } = useList({ resource: "posts" });

// useCreate: Create item
const { mutate } = useCreate();

// Each hook has clear, single purpose! ✅
```

#### Why SRP Matters:

```typescript
// Easy to understand:
const apiUrl = useApiUrl();
// Clear what it does: Get API URL ✅

// Easy to test:
test("should return API URL", () => {
  const { result } = renderHook(() => useApiUrl());
  expect(result.current).toBe("https://api.example.com");
});
// Single concern → Simple test ✅

// Easy to maintain:
// Need to change how URLs are retrieved?
// → Only change useApiUrl, nothing else ✅

// Easy to replace:
// Want custom URL logic?
// → Create new hook, components stay same ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Clarity** - Clear purpose
- ✅ **Testability** - Easy to test
- ✅ **Maintainability** - Easy to change
- ✅ **Composability** - Combine small hooks

---

### 2.5 Null Object Pattern (Hidden)

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Empty Shopping Cart

```
E-commerce Cart:

❌ BAD - Null cart:
if (cart === null) {
  return "No cart";
}
return `Items: ${cart.items.length}`;
→ Must check null everywhere!

✅ GOOD - Empty cart object:
// Cart always exists, might be empty
return `Items: ${cart.items.length}`; // 0 if empty
→ No null checks needed!
```

**Null Object Pattern** = Use default object instead of null

#### Implementation (Implicit):

```typescript
// useApiUrl always returns string, never null/undefined

export const useApiUrl = (dataProviderName?: string): string => {
  const { getApiUrl } = dataProvider(...);

  return getApiUrl(); // ← Always returns string ✅
  // Never returns null or undefined
  // Provider must implement getApiUrl()
};

// Data provider contract:
interface DataProvider {
  getApiUrl: () => string; // ← Must return string, not string | null
  // ...
}
```

#### Usage Benefits:

```tsx
// No null checks needed! ✅

function FileUpload() {
  const apiUrl = useApiUrl();
  // apiUrl is ALWAYS a string
  // No need: if (!apiUrl) return null;

  return <div>Upload to: {apiUrl}/files</div>;
  // Safe to use directly ✅
}

// String operations safe:
const uploadUrl = `${useApiUrl()}/upload`;
const length = useApiUrl().length;
const uppercase = useApiUrl().toUpperCase();
// All safe! No null checks! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Type safety** - Always string, never null
- ✅ **Less code** - No null checks needed
- ✅ **Fewer bugs** - Can't forget null check
- ✅ **Better UX** - API must be configured

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                   | Ví dụ đời thường     | Giải quyết vấn đề gì       | Trong useApiUrl                     |
| ------------------------- | -------------------- | -------------------------- | ----------------------------------- |
| **Facade**                | Hotel front desk     | Hide complexity            | Simple interface over data provider |
| **Strategy**              | Multiple API servers | Choose provider at runtime | Explicit > Meta > Default           |
| **Dependency Injection**  | Power outlet         | Decouple implementation    | Provider injected via context       |
| **Single Responsibility** | Restaurant roles     | One job per function       | Only get API URL                    |
| **Null Object**           | Empty cart           | Avoid null checks          | Always returns string               |

---

## 3. KEY FEATURES

### 3.1 Simple API

```typescript
// Get default provider URL
const apiUrl = useApiUrl();

// Get specific provider URL
const apiUrl = useApiUrl("customProvider");
```

### 3.2 Provider Resolution Priority

```typescript
// Priority order:
// 1. Explicit param (highest)
const url1 = useApiUrl("provider1");

// 2. Resource meta (middle)
const url2 = useApiUrl(); // Uses resource.meta.dataProviderName

// 3. Default provider (fallback)
const url3 = useApiUrl(); // No param, no meta
```

### 3.3 Type Safety

```typescript
// Always returns string, never null/undefined
const apiUrl: string = useApiUrl();

// Safe to use in string operations
const uploadUrl = `${apiUrl}/upload`;
```

### 3.4 Multi-Provider Support

```typescript
<Refine
  dataProvider={{
    default: restProvider("https://api.main.com"),
    products: restProvider("https://products.api.com"),
    users: restProvider("https://users.api.com"),
  }}
/>;

// Get different URLs
const mainUrl = useApiUrl("default"); // https://api.main.com
const productsUrl = useApiUrl("products"); // https://products.api.com
const usersUrl = useApiUrl("users"); // https://users.api.com
```

---

## 4. COMMON USE CASES

### 4.1 File Upload URL

```tsx
import { useApiUrl } from "@refinedev/core";

function FileUpload() {
  const apiUrl = useApiUrl();
  const uploadUrl = `${apiUrl}/upload`;

  return (
    <form action={uploadUrl} method="POST" encType="multipart/form-data">
      <input type="file" name="file" />
      <button type="submit">Upload</button>
    </form>
  );
}
```

### 4.2 File Download Link

```tsx
function FileList() {
  const apiUrl = useApiUrl();
  const files = ["doc1.pdf", "doc2.pdf", "doc3.pdf"];

  return (
    <ul>
      {files.map((file) => (
        <li key={file}>
          <a href={`${apiUrl}/files/${file}`} download>
            {file}
          </a>
        </li>
      ))}
    </ul>
  );
}
```

### 4.3 Manual Fetch Call

```tsx
function CustomApi() {
  const apiUrl = useApiUrl();

  const fetchCustomData = async () => {
    const response = await fetch(`${apiUrl}/custom-endpoint`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });

    return response.json();
  };

  return <button onClick={fetchCustomData}>Fetch</button>;
}
```

### 4.4 WebSocket Connection

```tsx
function RealtimeUpdates() {
  const apiUrl = useApiUrl();

  useEffect(() => {
    // Convert http:// to ws:// or https:// to wss://
    const wsUrl = apiUrl.replace(/^http/, "ws");
    const socket = new WebSocket(`${wsUrl}/realtime`);

    socket.onmessage = (event) => {
      console.log("Message:", event.data);
    };

    return () => socket.close();
  }, [apiUrl]);

  return <div>Realtime updates active</div>;
}
```

### 4.5 Display API Information

```tsx
function ApiInfo() {
  const apiUrl = useApiUrl();

  return (
    <div>
      <h3>API Configuration</h3>
      <p>Base URL: {apiUrl}</p>
      <p>
        Health Check: <a href={`${apiUrl}/health`}>{apiUrl}/health</a>
      </p>
      <p>
        Status: <a href={`${apiUrl}/status`}>{apiUrl}/status</a>
      </p>
    </div>
  );
}
```

### 4.6 Multi-Provider File Upload

```tsx
function MultiProviderUpload() {
  const mainApiUrl = useApiUrl("default");
  const cdnApiUrl = useApiUrl("cdn");

  return (
    <div>
      <form action={`${mainApiUrl}/upload`}>
        <input type="file" />
        <button>Upload to Main Server</button>
      </form>

      <form action={`${cdnApiUrl}/upload`}>
        <input type="file" />
        <button>Upload to CDN</button>
      </form>
    </div>
  );
}
```

### 4.7 Environment-Specific Display

```tsx
function DevTools() {
  const apiUrl = useApiUrl();
  const isDev = apiUrl.includes("localhost");

  if (!isDev) return null;

  return (
    <div style={{ background: "yellow", padding: 10 }}>
      <strong>Development Mode</strong>
      <p>API: {apiUrl}</p>
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Return String, Not Object?

**Question:** Why return `string` instead of `{ url: string, name: string }`?

**Answer:**

```typescript
// ✅ GOOD - Simple string
const apiUrl = useApiUrl();
const uploadUrl = `${apiUrl}/upload`;

// ❌ COMPLEX - Object
const api = useApiUrl();
const uploadUrl = `${api.url}/upload`; // Extra .url
// More verbose, less convenient

// Reason:
// - Most common use: String concatenation
// - Simpler API
// - Less typing
```

### 5.2 Why Not Cache the URL?

**Question:** Why not cache/memoize the result?

**Answer:**

```typescript
// No caching because:
// 1. getApiUrl() is extremely fast (just returns string)
// 2. No async operations
// 3. No expensive computations
// 4. Premature optimization

// The hook is so simple that caching would add complexity
// without meaningful benefit
```

### 5.3 Why Support dataProviderName Param?

**Reason:** Enable explicit provider selection, overriding resource meta. Useful for multi-provider scenarios.

```typescript
// Resource has meta.dataProviderName = "products"
// But need main API URL
const mainUrl = useApiUrl("default"); // ← Override meta
```

---

## 6. TESTING

### 6.1 Unit Test Example

```typescript
import { renderHook } from "@testing-library/react";
import { useApiUrl } from "./useApiUrl";

// Mock dependencies
jest.mock("@hooks", () => ({
  useDataProvider: jest.fn(),
  useResourceParams: jest.fn(),
}));

describe("useApiUrl", () => {
  it("should return API URL from default provider", () => {
    const mockGetApiUrl = jest.fn(() => "https://api.example.com");
    const mockDataProvider = jest.fn(() => ({
      getApiUrl: mockGetApiUrl,
    }));

    useDataProvider.mockReturnValue(mockDataProvider);
    useResourceParams.mockReturnValue({ resource: null });

    const { result } = renderHook(() => useApiUrl());

    expect(result.current).toBe("https://api.example.com");
    expect(mockGetApiUrl).toHaveBeenCalled();
  });

  it("should use explicit provider name", () => {
    const mockDataProvider = jest.fn(() => ({
      getApiUrl: () => "https://custom.api.com",
    }));

    useDataProvider.mockReturnValue(mockDataProvider);
    useResourceParams.mockReturnValue({ resource: null });

    const { result } = renderHook(() => useApiUrl("customProvider"));

    expect(result.current).toBe("https://custom.api.com");
    expect(mockDataProvider).toHaveBeenCalledWith("customProvider");
  });

  it("should use resource meta provider name", () => {
    const mockDataProvider = jest.fn(() => ({
      getApiUrl: () => "https://products.api.com",
    }));

    useDataProvider.mockReturnValue(mockDataProvider);
    useResourceParams.mockReturnValue({
      resource: {
        meta: { dataProviderName: "productsProvider" },
      },
    });

    const { result } = renderHook(() => useApiUrl());

    expect(mockDataProvider).toHaveBeenCalledWith("productsProvider");
  });
});
```

### 6.2 Integration Test

```typescript
import { render, screen } from "@testing-library/react";
import { Refine } from "@refinedev/core";
import restProvider from "@refinedev/simple-rest";

describe("useApiUrl integration", () => {
  it("should return correct URL in component", () => {
    const TestComponent = () => {
      const apiUrl = useApiUrl();
      return <div>API: {apiUrl}</div>;
    };

    render(
      <Refine dataProvider={restProvider("https://api.example.com")}>
        <TestComponent />
      </Refine>,
    );

    expect(
      screen.getByText("API: https://api.example.com"),
    ).toBeInTheDocument();
  });
});
```

---

## 7. COMMON PITFALLS

### 7.1 Using in Server-Side Rendering (SSR)

```tsx
// ⚠️ CAUTION - URL might differ client/server

function FileUpload() {
  const apiUrl = useApiUrl();

  // Server: getApiUrl() might return server-internal URL
  // Client: getApiUrl() might return public URL

  // Solution: Ensure data provider returns correct URL for context
  return <div>Upload: {apiUrl}/files</div>;
}
```

### 7.2 Assuming URL Format

```tsx
// ❌ WRONG - Assuming URL has trailing slash
const uploadUrl = `${apiUrl}upload`; // Missing /

// ✅ CORRECT - Always add /
const uploadUrl = `${apiUrl}/upload`;

// OR - Check and normalize
const normalizedUrl = apiUrl.endsWith("/") ? apiUrl : `${apiUrl}/`;
const uploadUrl = `${normalizedUrl}upload`;
```

### 7.3 Not Configuring getApiUrl

```typescript
// ❌ WRONG - Data provider without getApiUrl
const dataProvider = {
  getList: () => { ... },
  getOne: () => { ... },
  // Missing getApiUrl! ❌
};

// ✅ CORRECT - Always implement getApiUrl
const dataProvider = {
  getList: () => { ... },
  getOne: () => { ... },
  getApiUrl: () => "https://api.example.com", // ← Required!
};
```

---

## 8. PERFORMANCE CONSIDERATIONS

### 8.1 Hook is Extremely Lightweight

```typescript
// No performance concerns:
// ✅ No async operations
// ✅ No expensive computations
// ✅ No API calls
// ✅ Just returns a string from context

// Safe to call multiple times:
const url1 = useApiUrl();
const url2 = useApiUrl();
const url3 = useApiUrl();
// All instant! No performance impact!
```

### 8.2 When to Use vs. Hard-Code

```typescript
// ✅ USE useApiUrl when:
// - URL might change
// - Multiple environments
// - Testing with mocks
// - Multi-provider apps

// 🤔 CONSIDER hard-coding when:
// - External API (not controlled by data provider)
// - Third-party service
// - Static CDN URL

// Example - External API:
const STRIPE_API = "https://api.stripe.com"; // ← Hard-coded OK
const myApiUrl = useApiUrl(); // ← Use hook for your API
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Facade**: Simple interface over data provider system
- ✅ **Strategy**: Choose provider based on context
- ✅ **Dependency Injection**: Provider injected via context
- ✅ **Single Responsibility**: Only get API URL
- ✅ **Null Object** (implicit): Always returns string

### Key Features

1. **Simple** - One line usage
2. **Flexible** - Multi-provider support
3. **Type-safe** - Always returns string
4. **Context-aware** - Auto-detects resource provider
5. **Override** - Explicit provider parameter

### Khi nào dùng useApiUrl?

✅ **Nên dùng:**

- File uploads
- File downloads
- Manual fetch calls
- WebSocket connections
- Display API info
- Custom endpoints not covered by data provider methods

❌ **Không dùng:**

- Normal CRUD operations (use useOne, useList, etc.)
- External third-party APIs
- Static CDN URLs

### Remember

✅ **51 lines** - Simplest hook!
🏢 **Facade** - Hide data provider complexity
🗺️ **Strategy** - Explicit > Meta > Default
💉 **Dependency Injection** - Provider from context
🎯 **Single Responsibility** - Only get URL
🎭 **Null Object** - Always string, never null

### Pro Tips

1. **Always add `/`** - `${apiUrl}/endpoint` (not `${apiUrl}endpoint`)
2. **MultiProvider** - Use explicit name when needed
3. **Environment** - Configure via env variables
4. **Testing** - Easy to mock data provider
5. **Type safety** - Trust the string return type

### Simplest Hook Ever! 🏆

useApiUrl is possibly the simplest hook in Refine:

- Takes optional string parameter
- Returns string
- No complex logic
- No async operations
- No state management

But incredibly useful for real-world scenarios! 🚀
