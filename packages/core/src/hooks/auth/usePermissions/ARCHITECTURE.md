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

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Design Pattern = "Công thức" giải quyết vấn đề lập trình phổ biến. Giống như công thức nấu ăn, bạn có thể áp dụng lại nhiều lần.

---

### 2.1 Strategy Pattern - Pattern "Chiến Lược"

#### 🏪 VÍ DỤ ĐỜI THƯỜNG: Cửa hàng thanh toán

Tưởng tượng bạn vào cửa hàng mua đồ. Khi đến quầy thanh toán:

```
Nhân viên: "Anh muốn thanh toán bằng gì?"
Bạn: "Thẻ tín dụng"
     HOẶC "Tiền mặt"
     HOẶC "Chuyển khoản"
     HOẶC "Ví điện tử"
```

**Điểm quan trọng:**

- Cửa hàng **KHÔNG QUAN TÂM** bạn trả bằng gì
- Họ chỉ cần nhận được tiền
- Cách thanh toán có thể **THAY ĐỔI**

#### ❌ KHÔNG có Strategy Pattern:

```typescript
// BAD - Hard-code mọi trường hợp
function usePermissions() {
  // Phải viết code riêng cho TỪNG project!

  if (project === "ecommerce") {
    // Fetch từ MySQL
    const perms = await mysql.query("SELECT roles FROM users");
    return perms;
  }

  if (project === "blog") {
    // Fetch từ Firebase
    const perms = await firebase.get("roles");
    return perms;
  }

  if (project === "crm") {
    // Fetch từ GraphQL
    const perms = await graphql.query("{ roles }");
    return perms;
  }

  // 😱 Thêm project mới = phải SỬA CODE framework!
}
```

**Vấn đề:**

- ❌ Phải sửa code framework mỗi khi có project mới
- ❌ Framework biết quá nhiều chi tiết (MySQL, Firebase, GraphQL...)
- ❌ Không thể test dễ dàng

#### ✅ CÓ Strategy Pattern:

```typescript
// GOOD - Framework chỉ cần interface

// Framework CHỈ nói: "Tôi cần một hàm getPermissions, còn nó làm gì thì tùy!"
function usePermissions() {
  const { getPermissions } = useAuthProviderContext(); // ← Get STRATEGY
  const data = await getPermissions(); // ← Gọi strategy
  return data;
}

// Project A: Strategy cho MySQL
const authProvider_ProjectA = {
  getPermissions: async () => {
    return await mysql.query("SELECT roles FROM users");
  },
};

// Project B: Strategy cho Firebase
const authProvider_ProjectB = {
  getPermissions: async () => {
    return await firebase.get("roles");
  },
};

// Project C: Strategy cho GraphQL
const authProvider_ProjectC = {
  getPermissions: async () => {
    return await graphql.query("{ roles }");
  },
};

// Framework KHÔNG CẦN SỬA khi có project mới! ✅
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│    Framework (usePermissions)       │
│    "Tôi cần permissions,            │
│     không quan tâm từ đâu!"         │
└─────────────────────────────────────┘
              ▲ Uses
              │
┌─────────────┴──────────────────────┐
│  STRATEGIES (Các cách khác nhau)   │
├────────────────────────────────────┤
│  Strategy 1   Strategy 2   Strategy 3
│  (MySQL)      (Firebase)   (GraphQL)│
└────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Framework linh hoạt, dùng cho mọi project
- ✅ Thêm strategy mới KHÔNG cần sửa framework
- ✅ Dễ test (mock strategy)

---

### 2.2 Facade Pattern - Pattern "Mặt Tiền"

#### 🏠 VÍ DỤ ĐỜI THƯỜNG: Khách sạn

Khi bạn ở khách sạn:

```
❌ KHÔNG có Facade (phức tạp):
Bạn: "Tôi muốn phòng sạch"
→ Phải gọi: Bộ phận dọn phòng
→ Phải gọi: Bộ phận giặt khăn
→ Phải gọi: Bộ phận thay ga
→ Phải gọi: Bộ phận kiểm tra

✅ CÓ Facade (đơn giản):
Bạn: "Tôi muốn phòng sạch"
Lễ tân (Facade): "OK!" ← Họ lo hết!
```

**Facade** = Người trung gian che giấu sự phức tạp

#### ❌ KHÔNG có Facade:

```typescript
// BAD - Component phải biết QUANULL CHI TIẾT

function MyComponent() {
  // 😱 Phải import nhiều thứ
  const { getPermissions } = useAuthProviderContext();
  const { keys } = useKeys();
  const queryClient = useQueryClient();

  // 😱 Phải config phức tạp
  const { data, isLoading, isError, error } = useQuery({
    queryKey: keys().auth().action("permissions").get(),
    queryFn: getPermissions
      ? () => getPermissions()
      : () => Promise.resolve(undefined),
    enabled: !!getPermissions,
    retry: 3,
    staleTime: 5 * 60 * 1000,
    // ... 20 dòng config nữa
  });

  // 😭 Mệt mỏi!
}
```

**Vấn đề:**

- ❌ Component biết quá nhiều (React Query, keys, context...)
- ❌ Code dài dòng, khó đọc
- ❌ Copy-paste mãi nếu nhiều components cần permissions

#### ✅ CÓ Facade:

```typescript
// GOOD - Đơn giản, sạch sẽ

function MyComponent() {
  // 😊 Chỉ 1 dòng!
  const { data, isLoading } = usePermissions();

  // Dùng thôi!
  if (isLoading) return <Loading />;
  return <div>{data}</div>;
}
```

**usePermissions** = Facade che giấu React Query phức tạp!

#### 📊 Biểu đồ:

```
┌──────────────────────────────────┐
│   SIMPLE API (Facade)            │
│   usePermissions()               │
│   ↓ CHỈ 1 dòng!                  │
└──────────────────────────────────┘
           │ Che giấu
           ▼
┌──────────────────────────────────┐
│   PHỨC TẠP (Behind the scenes)   │
│   - React Query config           │
│   - Context access               │
│   - Key generation               │
│   - Error handling               │
│   - Cache management             │
│   - DevTools integration         │
└──────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Code ngắn gọn, dễ đọc
- ✅ Component không cần biết chi tiết phức tạp
- ✅ Thay đổi implementation dễ dàng (component không bị ảnh hưởng)

---

### 2.3 Observer Pattern - Pattern "Người Quan Sát"

#### 📺 VÍ DỤ ĐỜI THƯỜNG: Kênh YouTube

Tưởng tượng bạn subscribe kênh YouTube:

```
Kênh YouTube = SUBJECT (Chủ thể)
Subscribers  = OBSERVERS (Quan sát viên)

Khi kênh đăng video mới:
→ TẤT CẢ subscribers nhận thông báo CÙNG LÚC!

Bạn KHÔNG cần:
- F5 liên tục để check
- Hỏi kênh: "Video mới chưa? Video mới chưa?"
→ Kênh TỰ ĐỘNG thông báo!
```

#### ❌ KHÔNG có Observer (phải polling):

```typescript
// BAD - Mỗi component tự fetch

function ComponentA() {
  const [perms, setPerms] = useState([]);

  // 😱 Cứ 5 giây fetch lại
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/permissions")
        .then((res) => res.json())
        .then(setPerms);
    }, 5000);
  }, []);
}

function ComponentB() {
  const [perms, setPerms] = useState([]);

  // 😱 Lại fetch nữa!
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/permissions")
        .then((res) => res.json())
        .then(setPerms);
    }, 5000);
  }, []);
}

// 10 components = 10 API calls mỗi 5 giây = 💥 Server chết!
```

#### ✅ CÓ Observer (via React Query):

```typescript
// GOOD - Tất cả components tự động update

function ComponentA() {
  const { data } = usePermissions(); // Observer 1
  // Tự động re-render khi permissions thay đổi!
}

function ComponentB() {
  const { data } = usePermissions(); // Observer 2
  // Cũng tự động re-render!
}

function ComponentC() {
  const { data } = usePermissions(); // Observer 3
  // Cũng tự động re-render!
}

// Khi permissions thay đổi:
const { refetch } = usePermissions();
refetch(); // → TẤT CẢ components update CÙNG LÚC! ✅
```

#### 📊 Biểu đồ:

```
        ┌─────────────────────────┐
        │ React Query Cache       │
        │ (SUBJECT - Chủ thể)     │
        │ permissions: ['admin']  │
        └─────────────────────────┘
                │    │    │
        Notify  │    │    │  Notify
                ▼    ▼    ▼
        ┌────┐ ┌────┐ ┌────┐
        │ A  │ │ B  │ │ C  │  ← OBSERVERS
        └────┘ └────┘ └────┘

Permissions thay đổi → TẤT CẢ được notify!
```

#### 💡 TẠI SAO quan trọng?

- ✅ Không cần polling (tiết kiệm server)
- ✅ Components tự động sync
- ✅ Đơn giản - không cần quản lý subscriptions thủ công

---

### 2.4 Adapter Pattern - Pattern "Bộ Chuyển Đổi"

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Cổng sạc điện thoại

Bạn có điện thoại iPhone (Lightning), đi nước ngoài cần sạc:

```
❌ KHÔNG có Adapter:
Ổ cắm Việt Nam ≠ Ổ cắm Mỹ ≠ Ổ cắm Nhật
→ Mỗi nước phải mua sạc mới! 😭

✅ CÓ Adapter (đầu chuyển đổi):
Ổ cắm BẤT KỲ → Adapter → Sạc iPhone
→ 1 sạc đi khắp thế giới! 😊
```

**Adapter** = Chuyển đổi interface này sang interface khác

#### ❌ KHÔNG có Adapter:

```typescript
// BAD - Component phải biết TỪNG backend

function MyComponent() {
  const [perms, setPerms] = useState();

  // 😱 Phải check backend type
  if (backendType === "REST") {
    const res = await fetch("/api/permissions");
    const data = await res.json();
    setPerms(data.roles); // Format 1
  }

  if (backendType === "GraphQL") {
    const res = await graphql.query("{ me { permissions } }");
    setPerms(res.data.me.permissions); // Format 2
  }

  if (backendType === "Firebase") {
    const doc = await firestore.get("permissions");
    setPerms(doc.data().perms); // Format 3
  }

  // 😭 Thêm backend = sửa component!
}
```

**Vấn đề:**

- ❌ Component biết chi tiết mọi backend
- ❌ Thêm backend mới = sửa tất cả components
- ❌ Khó bảo trì

#### ✅ CÓ Adapter:

```typescript
// GOOD - authProvider = ADAPTER

// Backend REST
const restAdapter = {
  getPermissions: async () => {
    const res = await fetch("/api/permissions");
    const data = await res.json();
    return data.roles; // ← Chuyển đổi về format chung
  },
};

// Backend GraphQL
const graphqlAdapter = {
  getPermissions: async () => {
    const res = await graphql.query("{ me { permissions } }");
    return res.data.me.permissions; // ← Chuyển đổi về format chung
  },
};

// Backend Firebase
const firebaseAdapter = {
  getPermissions: async () => {
    const doc = await firestore.get("permissions");
    return doc.data().perms; // ← Chuyển đổi về format chung
  },
};

// Component KHÔNG CẦN BIẾT backend nào!
function MyComponent() {
  const { data } = usePermissions(); // ← Luôn nhận format giống nhau!
  return <div>{data}</div>;
}
```

#### 📊 Biểu đồ:

```
┌────────────────────────────────────┐
│  DIFFERENT BACKENDS (Khác nhau)   │
│  REST │ GraphQL │ Firebase │ SQL  │
└────────────────────────────────────┘
         │     │     │      │
         └─────┴─────┴──────┘
                 │
         Adapter chuyển đổi
                 ▼
┌────────────────────────────────────┐
│    STANDARD INTERFACE (Chuẩn)     │
│  getPermissions() → ['admin']     │
└────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│    COMPONENTS (Luôn giống nhau)   │
│  const { data } = usePermissions() │
└────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Components không phụ thuộc backend cụ thể
- ✅ Đổi backend dễ dàng (chỉ đổi adapter)
- ✅ Code reusable (1 component chạy với mọi backend)

---

### 2.5 Dependency Injection - Pattern "Tiêm Phụ Thuộc"

#### 🍰 VÍ DỤ ĐỜI THƯỜNG: Làm bánh

**Tình huống 1 - Hard-coded (Không linh hoạt):**

```
Công thức: "Làm bánh STRAWBERRY"
Bước 1: Lấy STRAWBERRY từ tủ lạnh
Bước 2: Cho vào bánh

Vấn đề: Muốn làm bánh CHOCOLATE? → Phải viết lại TOÀN BỘ công thức!
```

**Tình huống 2 - Dependency Injection (Linh hoạt):**

```
Công thức: "Làm bánh với TOPPING"
Bước 1: Ai đó đưa cho bạn TOPPING (strawberry, chocolate, blueberry...)
Bước 2: Cho topping đó vào bánh

Lợi ích: Cùng 1 công thức, làm được MỌI loại bánh!
```

#### ❌ KHÔNG có Dependency Injection:

```typescript
// BAD - Hard-code URL

function usePermissions() {
  // 😱 Hard-code URL
  const data = await fetch("/api/permissions");
  return data;

  // Vấn đề:
  // - Đổi URL? → Sửa code
  // - Test? → Không mock được
  // - Dùng cho backend khác? → Viết lại hàm
}
```

**Vấn đề:**

- ❌ Cứng nhắc, không linh hoạt
- ❌ Khó test
- ❌ Không reusable

#### ✅ CÓ Dependency Injection:

```typescript
// GOOD - "Inject" dependency từ bên ngoài

// KHÔNG biết trước sẽ dùng gì
function usePermissions() {
  // ↓ AI ĐÓ sẽ "inject" (tiêm) getPermissions vào
  const { getPermissions } = useAuthProviderContext();
  const data = await getPermissions(); // ← Dùng cái được inject
  return data;
}

// NGƯỜI DÙNG quyết định inject gì
// Project A: Inject REST API
<Refine
  authProvider={{
    getPermissions: () => fetch('/api/permissions')
  }}
/>

// Project B: Inject GraphQL
<Refine
  authProvider={{
    getPermissions: () => graphql.query('...')
  }}
/>

// Cùng 1 hook, hoạt động với MỌI injection! ✅
```

#### 📊 Injection Flow:

```
BƯỚC 1: DEFINE (Định nghĩa)
┌─────────────────────────────┐
│ <Refine                     │
│   authProvider={{           │
│     getPermissions: myFunc  │─┐
│   }}                        │ │
│ />                          │ │
└─────────────────────────────┘ │
                                │
        INJECT (Tiêm vào)      │
                                ▼
BƯỚC 2: STORE (Lưu trữ)
┌─────────────────────────────┐
│ Context.Provider            │
│   value={{ getPermissions }}│◄┘
└─────────────────────────────┘
                │
                │
                ▼
BƯỚC 3: USE (Sử dụng)
┌─────────────────────────────┐
│ const { getPermissions } =  │
│   useAuthProviderContext(); │◄─┘
└─────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Linh hoạt - dễ thay đổi implementation
- ✅ Testable - dễ mock dependencies
- ✅ Decoupled - các phần không phụ thuộc chặt chẽ vào nhau

---

## 📝 TÓM TẮT 5 PATTERNS

| Pattern                  | Ví dụ đời thường                  | Giải quyết vấn đề gì          | Trong usePermissions       |
| ------------------------ | --------------------------------- | ----------------------------- | -------------------------- |
| **Strategy**             | Cách thanh toán (tiền mặt/thẻ/ví) | Nhiều cách làm 1 việc         | Nhiều cách lấy permissions |
| **Facade**               | Lễ tân khách sạn                  | Ẩn sự phức tạp                | Ẩn React Query config      |
| **Observer**             | Subscribe YouTube                 | Tự động nhận thông báo        | Tự động re-render          |
| **Adapter**              | Đầu chuyển đổi sạc                | Kết nối 2 interface khác nhau | Kết nối mọi backend        |
| **Dependency Injection** | Công thức làm bánh                | Linh hoạt, dễ thay đổi        | Inject authProvider        |

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
