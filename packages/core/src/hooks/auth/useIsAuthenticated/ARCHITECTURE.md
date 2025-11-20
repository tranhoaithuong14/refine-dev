# Kiến trúc và Design Patterns của useIsAuthenticated Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 So sánh với useIsExistAuthentication

```
┌───────────────────────────────────────────────────────────┐
│  useIsExistAuthentication (Config Check)                 │
│  "App có CẤU HÌNH authProvider không?"                    │
│  → Check lúc khởi động                                    │
│  → Static config check                                     │
│  → true/false                                             │
└───────────────────────────────────────────────────────────┘

VS

┌───────────────────────────────────────────────────────────┐
│  useIsAuthenticated (Runtime Check)                       │
│  "User hiện tại có ĐANG LOGIN không?"                     │
│  → Check mỗi lần cần                                      │
│  → Dynamic runtime check                                   │
│  → { authenticated: true/false, redirectTo?, error? }     │
└───────────────────────────────────────────────────────────┘
```

### 1.2 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   DATA       │  │     AUTH     │  │   ROUTING    │ │
│  │   LAYER      │  │    LAYER     │  │    LAYER     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                          │                             │
│                          │                             │
│              ┌───────────▼────────────┐                │
│              │ useIsAuthenticated     │ ← THIS HOOK   │
│              │ (Session Check)        │                │
│              └────────────────────────┘                │
│                          │                             │
│              Used by: Protected Routes                 │
│                       Conditional UI                    │
│                       Navigation Guards                 │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Session Validator** - Kiểm tra session còn hợp lệ không
2. **Auth State Provider** - Cung cấp auth state cho components
3. **Route Guardian** - Bảo vệ protected routes
4. **Realtime Checker** - Check auth mỗi khi cần (reactive)

### 1.3 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION CHECK FLOW                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component mount hoặc user navigate                  │
│  → Protected route: /admin/dashboard                         │
│  → Component needs to check auth                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Call useIsAuthenticated()                           │
│  const { data, isLoading } = useIsAuthenticated();          │
│  → Hook fetch auth state từ React Query cache               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Execute authProvider.check()                        │
│  → Check token in localStorage                               │
│  → Validate token with backend (optional)                    │
│  → Return: { authenticated: true/false }                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: React Query caches result                           │
│  → Cache key: ["auth", "action", "check"]                    │
│  → TTL: default (5 minutes)                                  │
│  → Auto refetch on window focus                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Component renders based on result                   │
│                                                              │
│  if (isLoading) return <Loading />;                          │
│  if (!data?.authenticated) return <Navigate to="/login" />; │
│  return <Dashboard />;  // Show protected content           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này là CORE của auth system - nó check auth state và bảo vệ protected resources.

---

### 2.1 Query Pattern (via React Query)

#### 📡 VÍ DỤ ĐỜI THƯỜNG: Hỏi thăm sức khỏe

```
Hỏi bác sĩ: "Tôi khỏe chưa?"

❌ BAD - Hỏi mỗi giây:
Giây 1: "Tôi khỏe chưa?" → Check
Giây 2: "Tôi khỏe chưa?" → Check
Giây 3: "Tôi khỏe chưa?" → Check
→ Tốn thời gian, mệt mỏi!

✅ GOOD - Hỏi, nhớ kết quả:
Lần 1: "Tôi khỏe chưa?" → Check → Nhớ: "Khỏe"
Lần 2-10: Dùng kết quả đã nhớ → Không check
Sau 5 phút: Hỏi lại để update
→ Hiệu quả!
```

**Query Pattern** = Fetch data, cache it, reuse

#### ❌ KHÔNG có Query Pattern:

```typescript
// BAD - Fetch mỗi lần check

function ProtectedRoute() {
  const [authenticated, setAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 😱 Fetch mỗi lần component mount!
    const checkAuth = async () => {
      setLoading(true);
      const isAuth = await authProvider.check();
      setAuthenticated(isAuth.authenticated);
      setLoading(false);
    };

    checkAuth();
  }, []);

  // 10 protected routes = 10 API calls! 💥
}
```

**Vấn đề:**

- ❌ Duplicate API calls
- ❌ Slow (mỗi route phải chờ)
- ❌ Không sync giữa components

#### ✅ CÓ Query Pattern:

```typescript
// GOOD - React Query cache

function ProtectedRoute() {
  const { data, isLoading } = useIsAuthenticated();
  //                          ↑ React Query tự động:
  //                            - Fetch lần đầu
  //                            - Cache result
  //                            - Share giữa components
  //                            - Auto refetch khi cần

  // 10 protected routes = 1 API call! ✅
}
```

#### React Query Benefits:

```typescript
// Component A
const { data } = useIsAuthenticated();
// → Fetch từ API

// Component B (mounted sau)
const { data } = useIsAuthenticated();
// → Lấy từ cache (instant!)

// Component C
const { data } = useIsAuthenticated();
// → Lấy từ cache (instant!)

// User switch tab → refocus
// → React Query auto refetch (data fresh)
```

#### 💡 TẠI SAO quan trọng?

- ✅ Giảm API calls (1 thay vì 10)
- ✅ Faster UI (cache hit instant)
- ✅ Auto sync across components
- ✅ Smart refetch strategies

---

### 2.2 Guard Pattern - Pattern "Người Gác Cổng"

#### 🚪 VÍ DỤ ĐỜI THƯỜNG: Vào phòng VIP

```
Bạn muốn vào phòng VIP:

Bảo vệ: "Cho tôi xem thẻ!"
→ Có thẻ VIP? → "Mời vào"
→ Không có? → "Xin lỗi, không được vào"
```

**Guard** = Check quyền trước khi cho access

#### Implementation:

```typescript
// Protected Route Guard
function ProtectedRoute({ children }) {
  const { data, isLoading } = useIsAuthenticated();

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated
  if (!data?.authenticated) {
    return <Navigate to="/login" />;
  }

  // Authenticated → Allow access
  return children;
}

// Usage
<Routes>
  <Route
    path="/admin"
    element={
      <ProtectedRoute>
        <AdminDashboard />
      </ProtectedRoute>
    }
  />
</Routes>;
```

#### Advanced Guard:

```typescript
// Guard với redirect kèm return URL
function AuthGuard({ children }) {
  const { data, isLoading } = useIsAuthenticated();
  const location = useLocation();

  if (isLoading) return <Loading />;

  if (!data?.authenticated) {
    // Save current URL để redirect về sau login
    const returnUrl = location.pathname + location.search;
    return <Navigate to={`/login?to=${returnUrl}`} />;
  }

  return children;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Security (prevent unauthorized access)
- ✅ UX (redirect to login)
- ✅ Centralized protection logic

---

### 2.3 Null Safety Pattern - Pattern "An Toàn Null"

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Optional equipment

```
Car có thể có/không có GPS:

❌ BAD:
const gps = car.gps;
gps.navigate(); // 💥 Crash nếu undefined!

✅ GOOD:
const gps = car.gps ?? defaultGPS;
gps.navigate(); // An toàn!
```

**Null Safety** = Xử lý trường hợp null/undefined

#### Implementation:

```typescript
// Hook handles missing authProvider gracefully
const queryResponse = useQuery({
  queryFn: async () => (await check?.(params)) ?? { authenticated: true },
  //        ↑ Optional chaining: safe if check undefined
  //                             ↑↑ Nullish coalescing: default value
});
```

#### Scenarios:

```typescript
// Scenario 1: authProvider.check exists
check?.() → Calls authProvider.check()
        → Returns { authenticated: true/false }

// Scenario 2: authProvider.check missing
check?.() → undefined
        → Fallback: { authenticated: true }
        → App still works (public mode)
```

#### 💡 TẠI SAO quan trọng?

- ✅ No crashes
- ✅ Graceful degradation
- ✅ Support apps without auth

---

### 2.4 Observer Pattern (via React Query)

_(Tương tự usePermissions - đã giải thích)_

#### 🔔 VÍ DỤ: Subscribe auth changes

```
Component A: useIsAuthenticated()
Component B: useIsAuthenticated()
Component C: useIsAuthenticated()

User logs out → Cache invalidated
→ TẤT CẢ components re-render
→ Redirect to login ĐỒNG THỜI
```

---

### 2.5 Lazy Evaluation Pattern - Pattern "Đánh Giá Trễ"

#### ⏰ VÍ DỤ ĐỜI THƯỜNG: Đặt món ăn

```
❌ EAGER (tức thì):
Vào nhà hàng → Làm TẤT CẢ món ngay
→ Lãng phí (khách chưa order!)

✅ LAZY (khi cần):
Vào nhà hàng → Đợi
Khách order → MỚI làm món đó
→ Hiệu quả!
```

**Lazy Evaluation** = Chỉ thực thi khi cần

#### Implementation:

```typescript
// React Query chỉ fetch khi component mount
const { data } = useIsAuthenticated();

// Nếu component chưa render → Không fetch
// Component unmount → Cancel request
// Component remount → Reuse cache (nếu fresh)
```

#### Smart Fetch Strategy:

```typescript
useQuery({
  queryKey: ["auth", "check"],
  queryFn: authProvider.check,

  // Smart strategies:
  staleTime: 5 * 60 * 1000, // 5 phút
  // → Trong 5 phút: dùng cache, không fetch

  refetchOnWindowFocus: true,
  // → User quay lại tab → refetch (security)

  refetchOnReconnect: true,
  // → Internet reconnect → check lại session

  retry: false,
  // → Fail → Không retry (auth errors nên logout)
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ Performance (no unnecessary fetches)
- ✅ Fresh data (refetch on focus)
- ✅ Smart caching

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường         | Giải quyết vấn đề gì | Trong useIsAuthenticated |
| --------------- | ------------------------ | -------------------- | ------------------------ |
| **Query**       | Hỏi bác sĩ (nhớ kết quả) | Cache, reuse data    | React Query caching      |
| **Guard**       | Bảo vệ phòng VIP         | Protect resources    | Route protection         |
| **Null Safety** | Optional equipment       | Handle missing data  | check?.() ?? default     |
| **Observer**    | Subscribe updates        | Auto sync UI         | React Query notify       |
| **Lazy**        | Đặt món khi cần          | Fetch on demand      | Query on mount           |

---

## 3. AUTH CHECK STRATEGIES

### 3.1 Simple Token Check (Fast)

```typescript
authProvider.check = async () => {
  const token = localStorage.getItem("token");

  if (token) {
    return { authenticated: true };
  }

  return {
    authenticated: false,
    redirectTo: "/login",
  };
};

// Pros: Fast (no API call)
// Cons: Không verify token validity
```

### 3.2 Backend Verification (Secure)

```typescript
authProvider.check = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return { authenticated: false, redirectTo: "/login" };
  }

  try {
    // Verify với backend
    const res = await fetch("/api/verify-token", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      return { authenticated: true };
    }

    // Token invalid
    localStorage.removeItem("token");
    return { authenticated: false, redirectTo: "/login" };
  } catch (error) {
    return { authenticated: false, error };
  }
};

// Pros: Secure (backend validates)
// Cons: Slower (API call)
```

### 3.3 JWT Expiry Check (Balanced)

```typescript
authProvider.check = async () => {
  const token = localStorage.getItem("token");

  if (!token) {
    return { authenticated: false, redirectTo: "/login" };
  }

  // Decode JWT (client-side)
  const payload = decodeJWT(token);
  const isExpired = payload.exp * 1000 < Date.now();

  if (isExpired) {
    localStorage.removeItem("token");
    return {
      authenticated: false,
      redirectTo: "/login",
      logout: true,
    };
  }

  return { authenticated: true };
};

// Pros: Fast + reasonably secure
// Cons: Client can manipulate (but backend still validates)
```

---

## 4. COMMON PATTERNS

### 4.1 Conditional UI Based on Auth

```typescript
function Header() {
  const { data } = useIsAuthenticated();

  return (
    <header>
      <Logo />
      {data?.authenticated ? (
        <>
          <UserMenu />
          <LogoutButton />
        </>
      ) : (
        <LoginButton />
      )}
    </header>
  );
}
```

### 4.2 Protected Route

```typescript
function ProtectedRoute({ children }) {
  const { data, isLoading } = useIsAuthenticated();

  if (isLoading) return <Spinner />;

  if (!data?.authenticated) {
    return <Navigate to={data?.redirectTo || "/login"} />;
  }

  return children;
}
```

### 4.3 Manual Refetch

```typescript
function RefreshAuthButton() {
  const { refetch } = useIsAuthenticated();

  return <button onClick={() => refetch()}>Refresh Session</button>;
}
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Query**: Cache + smart refetch
- ✅ **Guard**: Protect routes/resources
- ✅ **Null Safety**: Graceful handling
- ✅ **Observer**: Auto sync
- ✅ **Lazy**: Fetch on demand

### Key Benefits

1. **Reactive** - Auto updates on auth changes
2. **Cached** - Fast repeated checks
3. **Flexible** - Multiple check strategies
4. **Safe** - Null-safe, no crashes
5. **Smart** - Refetch on focus/reconnect

### Khi nào dùng useIsAuthenticated?

✅ **Nên dùng:**

- Protected routes
- Conditional UI (show/hide based on auth)
- Navigation guards
- Session validation

❌ **Không dùng:**

- Initial config check (use useIsExistAuthentication)
- Permission checks (use usePermissions)
- Identity data (use useGetIdentity)

### Refetch Strategies

- **refetchOnWindowFocus**: true (security)
- **refetchOnReconnect**: true (session check)
- **retry**: false (auth fail → logout)
- **staleTime**: 5 minutes (balance freshness/performance)
