# Kiến trúc và Design Patterns của usePermissions Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   DATA       │  │     AUTH     │  │   ROUTING    │ │
│  │   LAYER      │  │    LAYER     │  │    LAYER     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                 │                  │         │
│         │                 │                  │         │
│  ┌──────▼─────┐    ┌─────▼──────┐    ┌──────▼─────┐  │
│  │ useList    │    │ useLogin   │    │ useGo      │  │
│  │ useCreate  │    │ useLogout  │    │ useParse   │  │
│  │ useUpdate  │    │ usePermissions│  │            │  │
│  │ useDelete  │    │ useIdentity│    │            │  │
│  └────────────┘    └────────────┘    └────────────┘  │
│                           ▲                           │
│                           │                           │
│                    ┌──────┴───────┐                   │
│                    │ AUTHORIZATION│                   │
│                    │   CHECKING   │ ← usePermissions  │
│                    └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Authorization Layer** - Quản lý quyền truy cập (WHAT user can do)
2. **Bridge** giữa UI và Permission Logic
3. **Cache Manager** cho permission data
4. **Type Safety** provider cho permissions

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                         USER FLOW                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User logs in                                        │
│  useLogin() → authProvider.login() → Store token             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Fetch permissions                                   │
│  usePermissions() → authProvider.getPermissions()            │
│                  → Returns: ['admin', 'editor']              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: React Query caches permissions                      │
│  Cache Key: ["auth", "action", "permissions"]                │
│  All components share this cache!                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Components use permissions                          │
│                                                              │
│  ComponentA: usePermissions() → Gets from cache             │
│  ComponentB: usePermissions() → Gets from cache (no refetch)│
│  ComponentC: usePermissions() → Gets from cache (no refetch)│
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Conditional rendering                               │
│                                                              │
│  {permissions.includes('admin') && <AdminPanel />}          │
│  {permissions.canEdit && <EditButton />}                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS

### 2.1 Strategy Pattern

**Định nghĩa:** Cho phép định nghĩa một họ các thuật toán, đóng gói mỗi thuật toán và làm cho chúng có thể hoán đổi cho nhau.

**Áp dụng trong usePermissions:**

```typescript
// INTERFACE (Strategy Interface)
type AuthProvider = {
  getPermissions?: (params?: any) => Promise<PermissionResponse>;
};

// CONCRETE STRATEGIES (Implementations)

// Strategy 1: Role-based permissions
const roleBasedAuth: AuthProvider = {
  getPermissions: async () => {
    const user = getCurrentUser();
    return user.roles; // ['admin', 'editor']
  },
};

// Strategy 2: Permission-based
const permissionBasedAuth: AuthProvider = {
  getPermissions: async () => {
    const user = getCurrentUser();
    return user.permissions; // ['posts.edit', 'users.view']
  },
};

// Strategy 3: API-based
const apiBasedAuth: AuthProvider = {
  getPermissions: async () => {
    const response = await fetch("/api/permissions");
    return response.json();
  },
};

// CONTEXT (usePermissions hook)
// Không quan tâm STRATEGY nào được dùng
const { data } = usePermissions(); // Works with ANY strategy!
```

**Lợi ích:**

- Dễ thay đổi logic permissions mà không sửa code Refine
- Mỗi project có thể có implementation khác nhau
- Testable - có thể mock authProvider dễ dàng

**Biểu đồ:**

```
┌─────────────────────────────────────────┐
│       YOUR CODE (Strategy)              │
│                                         │
│  authProvider.getPermissions = async()  │
│  → Fetch from DB / API / Cache / ...   │
└─────────────────────────────────────────┘
                    ▲
                    │ Injected via Context
                    │
┌───────────────────┴─────────────────────┐
│       REFINE (Context)                  │
│                                         │
│  usePermissions() {                     │
│    const { getPermissions } = context;  │
│    return useQuery(getPermissions);     │
│  }                                      │
└─────────────────────────────────────────┘
                    ▲
                    │ Returns result
                    │
┌───────────────────┴─────────────────────┐
│       COMPONENTS                        │
│                                         │
│  const { data } = usePermissions();     │
│  {data?.includes('admin') && ...}       │
└─────────────────────────────────────────┘
```

---

### 2.2 Facade Pattern

**Định nghĩa:** Cung cấp interface đơn giản cho một subsystem phức tạp.

**Áp dụng:**

usePermissions **ẨN ĐI** sự phức tạp của React Query:

```typescript
// PHỨC TẠP - Nếu không có Facade
import { useQuery } from "@tanstack/react-query";

function MyComponent() {
  const { getPermissions } = useAuthProviderContext();
  const { keys } = useKeys();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: keys().auth().action("permissions").get(),
    queryFn: getPermissions
      ? () => getPermissions()
      : () => Promise.resolve(undefined),
    enabled: !!getPermissions,
    // ... many more options
  });

  // Use data...
}

// ĐơN GIẢN - Với Facade (usePermissions)
function MyComponent() {
  const { data, isLoading } = usePermissions();

  // Use data - that's it!
}
```

**Biểu đồ:**

```
┌─────────────────────────────────────────────────┐
│            SIMPLE INTERFACE (Facade)            │
│                                                 │
│  usePermissions() → { data, isLoading, ... }   │
└─────────────────────────────────────────────────┘
                        │
                        │ Hides complexity
                        ▼
┌─────────────────────────────────────────────────┐
│            COMPLEX SUBSYSTEM                    │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ React Query                              │  │
│  │ - Query key generation                   │  │
│  │ - Cache management                       │  │
│  │ - Refetch logic                          │  │
│  │ - Error handling                         │  │
│  │ - DevTools integration                   │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Auth Provider Context                    │  │
│  │ - Get getPermissions function            │  │
│  │ - Validate existence                     │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

### 2.3 Observer Pattern (via React Query)

**Định nghĩa:** Khi một object thay đổi state, tất cả dependents được notify tự động.

**Áp dụng:**

React Query tự động notify components khi permissions thay đổi:

```typescript
// Component A
function AdminPanel() {
  const { data } = usePermissions(); // Observer 1
  console.log("AdminPanel renders with:", data);
}

// Component B
function UserMenu() {
  const { data } = usePermissions(); // Observer 2
  console.log("UserMenu renders with:", data);
}

// Khi permissions thay đổi:
const { refetch } = usePermissions();
refetch(); // → BOTH components re-render automatically!
```

**Flow:**

```
┌────────────────────────────────────────────┐
│  React Query Cache (Subject)               │
│                                            │
│  permissions: ['admin']                    │
└────────────────────────────────────────────┘
        │           │           │
        │           │           │
   ┌────▼───┐  ┌───▼────┐  ┌──▼─────┐
   │Observer│  │Observer│  │Observer│
   │   A    │  │   B    │  │   C    │
   └────────┘  └────────┘  └────────┘
   ComponentA  ComponentB  ComponentC

   All automatically update when permissions change!
```

---

### 2.4 Adapter Pattern

**Định nghĩa:** Convert interface của một class sang interface khác mà clients mong đợi.

**Áp dụng:**

usePermissions **ADAPT** bất kỳ backend nào thành interface chuẩn:

```typescript
// Backend 1: REST API returns JSON
authProvider.getPermissions = async () => {
  const res = await fetch("/api/permissions");
  return res.json(); // { roles: ['admin'] }
};

// Backend 2: GraphQL
authProvider.getPermissions = async () => {
  const res = await graphqlClient.query(`{ me { permissions } }`);
  return res.data.me.permissions;
};

// Backend 3: Local Storage
authProvider.getPermissions = async () => {
  return JSON.parse(localStorage.getItem("permissions"));
};

// Backend 4: Firebase
authProvider.getPermissions = async () => {
  const user = auth.currentUser;
  const doc = await firestore.doc(`users/${user.uid}`).get();
  return doc.data().permissions;
};

// ALL backends work the same for components!
const { data } = usePermissions(); // Same API for all!
```

**Biểu đồ:**

```
┌──────────────────────────────────────────────────┐
│         DIFFERENT BACKENDS (Adaptees)            │
├──────────────────────────────────────────────────┤
│  REST API  │  GraphQL  │  Firebase  │  LocalDB  │
└──────────────────────────────────────────────────┘
                        │
                        │ Adapted via authProvider.getPermissions
                        ▼
┌──────────────────────────────────────────────────┐
│              ADAPTER (authProvider)               │
│  getPermissions: () => Promise<PermissionData>  │
└──────────────────────────────────────────────────┘
                        │
                        │ Standardized interface
                        ▼
┌──────────────────────────────────────────────────┐
│          CLIENT (usePermissions hook)            │
│  Always receives same format regardless of       │
│  backend implementation                          │
└──────────────────────────────────────────────────┘
```

---

### 2.5 Dependency Injection Pattern

**Định nghĩa:** Dependencies được "inject" từ bên ngoài thay vì hard-code.

**Áp dụng:**

```typescript
// BAD - Hard-coded dependency
function usePermissions() {
  const data = await fetch("/api/permissions"); // ← Hard-coded!
  return data;
}

// GOOD - Injected dependency
function usePermissions() {
  const { getPermissions } = useAuthProviderContext(); // ← Injected!
  const data = await getPermissions();
  return data;
}
```

**Injection Flow:**

```
┌─────────────────────────────────────────┐
│  STEP 1: Define dependency              │
│                                         │
│  <Refine                                │
│    authProvider={{                      │
│      getPermissions: myFunction ───┐    │
│    }}                              │    │
│  />                                │    │
└────────────────────────────────────┼────┘
                                     │
                                     │ Inject via Context
                                     ▼
┌────────────────────────────────────┼────┐
│  STEP 2: Store in Context          │    │
│                                    │    │
│  AuthContext.Provider              │    │
│    value={{ getPermissions }} ◄────┘    │
└─────────────────────────────────────────┘
                                     │
                                     │ Consume from Context
                                     ▼
┌─────────────────────────────────────────┐
│  STEP 3: Use in hook                    │
│                                         │
│  const { getPermissions } =             │
│    useAuthProviderContext(); ◄──────────┘
└─────────────────────────────────────────┘
```

**Lợi ích:**

- Testing: Dễ mock authProvider
- Flexibility: Swap implementation dễ dàng
- Decoupling: Hook không biết implementation details

---

## 3. KIẾN TRÚC CHI TIẾT

### 3.1 Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                  │
│  (React Components)                                    │
│                                                        │
│  const { data, isLoading } = usePermissions();        │
│  {data?.includes('admin') && <AdminPanel />}          │
└────────────────────────────────────────────────────────┘
                          │
                          │ Uses hook
                          ▼
┌────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                    │
│  (usePermissions Hook)                                 │
│                                                        │
│  - Get authProvider from Context                       │
│  - Create React Query                                  │
│  - Return result                                       │
└────────────────────────────────────────────────────────┘
                          │
                          │ Uses React Query
                          ▼
┌────────────────────────────────────────────────────────┐
│                    CACHING LAYER                       │
│  (React Query)                                         │
│                                                        │
│  - Cache management                                    │
│  - Refetch logic                                       │
│  - State management (loading, error, success)          │
└────────────────────────────────────────────────────────┘
                          │
                          │ Calls API
                          ▼
┌────────────────────────────────────────────────────────┐
│                   DATA ACCESS LAYER                    │
│  (authProvider.getPermissions)                         │
│                                                        │
│  - Fetch from backend                                  │
│  - Transform data                                      │
│  - Error handling                                      │
└────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/GraphQL/etc.
                          ▼
┌────────────────────────────────────────────────────────┐
│                    BACKEND / API                       │
│                                                        │
│  - Database queries                                    │
│  - Permission calculation                              │
│  - Return permission data                              │
└────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
USER ACTION                  STATE CHANGES
────────────                 ─────────────
    │                             │
    ▼                             │
┌─────────────┐                   │
│ Component   │                   │
│ renders     │                   │
└─────────────┘                   │
    │                             │
    ▼                             │
┌─────────────────────┐           │
│ Call usePermissions │           │
└─────────────────────┘           │
    │                             │
    ▼                             │
┌─────────────────────┐           │
│ Check React Query   │           │
│ cache               │           │
└─────────────────────┘           │
    │                             │
    ├─ Cache hit? ────────────────┼─> Return cached data
    │                             │
    └─ Cache miss? ───┐           │
                      │           │
                      ▼           │
            ┌──────────────────┐  │
            │ Call authProvider│  │
            │ .getPermissions  │  │
            └──────────────────┘  │
                      │           │
                      ▼           │
            ┌──────────────────┐  │
            │ Fetch from API   │  │
            └──────────────────┘  │
                      │           │
                      ▼           │
            ┌──────────────────┐  │
            │ Store in cache   │──┘
            └──────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │ Notify observers │
            │ (re-render       │
            │  components)     │
            └──────────────────┘
```

---

## 4. TẠI SAO THIẾT KẾ NHƯ VẬY?

### 4.1 Separation of Concerns

**Vấn đề:** Nếu mix permission logic vào components:

```typescript
// BAD - Tightly coupled
function AdminPanel() {
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    fetch("/api/permissions")
      .then((res) => res.json())
      .then(setPermissions);
  }, []);

  if (!permissions.includes("admin")) return null;
  return <div>Admin Panel</div>;
}
```

**Vấn đề:**

- Component biết quá nhiều (URL, fetch logic, cache...)
- Khó test
- Khó reuse
- Duplicate code

**Giải pháp:** Tách ra hook riêng:

```typescript
// GOOD - Separated concerns
function AdminPanel() {
  const { data: permissions } = usePermissions();

  if (!permissions?.includes("admin")) return null;
  return <div>Admin Panel</div>;
}
```

**Lợi ích:**

- Component chỉ care về UI
- Hook care về data fetching
- React Query care về caching
- AuthProvider care về backend

### 4.2 Reusability

**Một lần định nghĩa, dùng mọi nơi:**

```typescript
// Define once
const authProvider = {
  getPermissions: async () => {
    // Complex logic here
    const user = await getUserFromToken();
    const roles = await fetchRolesFromDB(user.id);
    return roles;
  },
};

// Use everywhere - NO duplication!
function ComponentA() {
  const { data } = usePermissions();
}

function ComponentB() {
  const { data } = usePermissions(); // Same logic, same cache!
}

function ComponentC() {
  const { data } = usePermissions(); // Same logic, same cache!
}
```

### 4.3 Testability

**Dễ dàng mock cho testing:**

```typescript
// In tests
const mockAuthProvider = {
  getPermissions: jest.fn().mockResolvedValue(["admin"]),
};

render(
  <Refine authProvider={mockAuthProvider}>
    <YourComponent />
  </Refine>,
);

// Test different scenarios
mockAuthProvider.getPermissions.mockResolvedValue(["editor"]);
mockAuthProvider.getPermissions.mockResolvedValue([]);
mockAuthProvider.getPermissions.mockRejectedValue(new Error("Failed"));
```

### 4.4 Performance

**React Query caching tránh fetch duplicate:**

```
Scenario: 10 components cần permissions

WITHOUT caching:
  Component 1 → Fetch API (100ms)
  Component 2 → Fetch API (100ms)
  ...
  Component 10 → Fetch API (100ms)
  Total: 1000ms + 10 API calls

WITH caching (usePermissions):
  Component 1 → Fetch API (100ms) → Cache
  Component 2 → Read cache (0ms)
  Component 3 → Read cache (0ms)
  ...
  Component 10 → Read cache (0ms)
  Total: 100ms + 1 API call ✅
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

| Pattern                  | Áp dụng ở đâu               | Lợi ích                 |
| ------------------------ | --------------------------- | ----------------------- |
| **Strategy**             | authProvider.getPermissions | Flexible implementation |
| **Facade**               | usePermissions API          | Simple interface        |
| **Observer**             | React Query notifications   | Auto re-render          |
| **Adapter**              | authProvider interface      | Backend agnostic        |
| **Dependency Injection** | Context Provider            | Testable, decoupled     |

### Architectural Principles

1. **Single Responsibility** - Mỗi layer có 1 nhiệm vụ rõ ràng
2. **Open/Closed** - Mở rộng được (new authProvider) nhưng không sửa code
3. **Dependency Inversion** - Depend on abstractions (interface), not concrete
4. **Separation of Concerns** - UI, Logic, Data tách biệt
5. **DRY** - Define once, use everywhere

### Khi nào dùng usePermissions?

✅ **Nên dùng khi:**

- Cần show/hide UI based on permissions
- RBAC (Role-Based Access Control)
- Feature flags
- Dynamic menu rendering

❌ **Không nên dùng khi:**

- Server-side authorization (luôn validate ở backend!)
- Security-critical operations (backend phải check lại!)
- Static permissions (không cần fetch từ API)
