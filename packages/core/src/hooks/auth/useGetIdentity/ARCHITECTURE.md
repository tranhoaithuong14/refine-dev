# Kiến trúc và Design Patterns của useGetIdentity Hook

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
│                          │                             │
│              ┌───────────▼────────────┐                │
│              │ useGetIdentity         │ ← THIS HOOK   │
│              │ (User Profile Data)    │                │
│              └────────────────────────┘                │
│                          │                             │
│              Used by: Header (avatar)                  │
│                       Profile page                      │
│                       User menu                         │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **User Data Provider** - Cung cấp thông tin user đang login
2. **Profile Manager** - Quản lý user profile data
3. **UI Personalizer** - Giúp personalize UI (show name, avatar...)
4. **Identity Source** - Source of truth cho user info

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                    USER IDENTITY FLOW                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User logs in successfully                           │
│  → Token stored in localStorage                              │
│  → Navigate to dashboard                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Components need user info                           │
│  → Header wants to show avatar                               │
│  → User menu wants to show name                              │
│  → Profile page wants to show full details                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Call useGetIdentity()                               │
│  const { data: user } = useGetIdentity();                   │
│  → Hook checks React Query cache first                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Execute authProvider.getIdentity()                  │
│  → Option 1: Decode JWT locally                              │
│  → Option 2: Fetch from /api/me                              │
│  → Returns: { id, name, email, avatar, ... }                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: React Query caches result                           │
│  → Cache key: ["auth", "action", "identity"]                 │
│  → All components share same cache                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: UI displays user info                               │
│  → Header: <Avatar src={user.avatar} />                      │
│  → Menu: "Welcome, {user.name}!"                             │
│  → Profile: Show full user details                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này là USER-FACING - developers dùng trực tiếp để hiển thị user info!

---

### 2.1 Query Pattern (via React Query)

_(Tương tự useIsAuthenticated - đã giải thích)_

#### 📡 VÍ DỤ: Share data across components

```
Header component:     useGetIdentity() → { name: "John" }
Profile component:    useGetIdentity() → { name: "John" }  (cache hit!)
User menu component:  useGetIdentity() → { name: "John" }  (cache hit!)

→ 3 components = 1 API call ✅
```

---

### 2.2 Type Safety Pattern - Pattern "An Toàn Kiểu"

#### 🏷️ VÍ DỤ ĐỜI THƯỜNG: Nhãn hàng hóa

```
❌ BAD - Không nhãn:
Hộp 1: ??? (không biết trong này là gì)
Hộp 2: ??? (phải mở ra xem)
→ Rủi ro, mất thời gian!

✅ GOOD - Có nhãn rõ ràng:
Hộp 1: "QUẦN ÁO - Size M"
Hộp 2: "GIÀY - Size 42"
→ Biết chính xác, không nhầm lẫn!
```

**Type Safety** = Định nghĩa rõ data structure

#### ❌ KHÔNG có Type Safety:

```typescript
// BAD - Không biết user có gì

const { data: user } = useGetIdentity();

console.log(user.name); // 💥 Có tồn tại không?
console.log(user.email); // 💥 Đúng tên field không?
console.log(user.avatar); // 💥 URL hay object?
console.log(user.company); // 💥 Có field này không?

// Không có autocomplete!
// Không có type checking!
```

**Vấn đề:**

- ❌ Không biết available fields
- ❌ Typo dễ xảy ra
- ❌ Khó maintain

#### ✅ CÓ Type Safety:

```typescript
// GOOD - Define TypeScript interface

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string; // Optional
  role: "admin" | "user";
  company?: {
    name: string;
    logo: string;
  };
}

// Use with hook
const { data: user } = useGetIdentity<User>();

// TypeScript autocomplete:
user.name; // ✅ String
user.email; // ✅ String
user.avatar; // ✅ String | undefined
user.role; // ✅ 'admin' | 'user'
user.invalid; // ❌ Error: Property doesn't exist!
```

#### Real-world Example:

```typescript
// Define user type once
type CurrentUser = {
  id: number;
  fullName: string;
  email: string;
  avatar: string;
  permissions: string[];
  settings: {
    theme: "light" | "dark";
    language: "en" | "vi";
  };
};

// Use everywhere with type safety
function Header() {
  const { data: user } = useGetIdentity<CurrentUser>();

  return (
    <header>
      <img src={user?.avatar} />
      <span>{user?.fullName}</span>
      {/* ↑ Autocomplete works! */}
    </header>
  );
}

function ProfilePage() {
  const { data: user } = useGetIdentity<CurrentUser>();

  return (
    <div>
      <h1>{user?.fullName}</h1>
      <p>{user?.email}</p>
      <p>Theme: {user?.settings.theme}</p>
      {/* ↑ Type-safe nested access! */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Autocomplete in IDE
- ✅ Catch errors at compile time
- ✅ Self-documenting code
- ✅ Refactoring safety

---

### 2.3 Default Value Pattern - Pattern "Giá Trị Mặc Định"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Avatar mặc định

```
User chưa upload avatar:

❌ BAD - Hiện broken image:
<img src={undefined} /> → 💥 Broken!

✅ GOOD - Dùng avatar mặc định:
<img src={user?.avatar || '/default-avatar.png'} />
→ Luôn hiển thị được!
```

**Default Value** = Fallback khi data missing

#### Implementation:

```typescript
// Pattern 1: Inline default
function Header() {
  const { data: user } = useGetIdentity();

  return (
    <div>
      <img src={user?.avatar || "/default-avatar.png"} />
      <span>{user?.name || "Guest"}</span>
    </div>
  );
}

// Pattern 2: Default in queryFn
authProvider.getIdentity = async () => {
  try {
    const res = await fetch("/api/me");
    return await res.json();
  } catch {
    // Return default user
    return {
      name: "Guest User",
      avatar: "/guest-avatar.png",
    };
  }
};

// Pattern 3: React Query initialData
const { data: user } = useGetIdentity({
  queryOptions: {
    initialData: {
      name: "Loading...",
      avatar: "/placeholder.png",
    },
  },
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ No broken UI
- ✅ Better UX
- ✅ Graceful degradation

---

### 2.4 Conditional Fetching Pattern - Pattern "Fetch Có Điều Kiện"

#### 🚦 VÍ DỤ ĐỜI THƯỜNG: Đèn giao thông

```
Đèn xanh → Đi
Đèn đỏ → Dừng

Similarly:
Logged in → Fetch user data
Logged out → Don't fetch (no point!)
```

**Conditional Fetching** = Chỉ fetch khi có điều kiện

#### Implementation:

```typescript
// Hook automatically checks
const queryResponse = useQuery({
  queryKey: ["auth", "identity"],
  queryFn: getIdentity,
  enabled: !!getIdentity, // ← Only fetch if getIdentity exists
  //       ↑ Conditional!
});
```

#### Real-world scenarios:

```typescript
// Scenario 1: Public pages (no auth)
// User on /blog page (public)
// → useGetIdentity enabled: false
// → No fetch, no waste!

// Scenario 2: Protected pages (has auth)
// User on /dashboard page
// → useGetIdentity enabled: true
// → Fetch user data

// Scenario 3: Optional auth
// App can work with/without login
// → If logged in: fetch identity
// → If not: skip gracefully
```

#### Manual control:

```typescript
// Fetch only when needed
function UserProfile() {
  const [showProfile, setShowProfile] = useState(false);

  const { data: user } = useGetIdentity({
    queryOptions: {
      enabled: showProfile, // ← Custom condition
    },
  });

  return (
    <div>
      <button onClick={() => setShowProfile(true)}>Show Profile</button>
      {showProfile && <div>{user?.name}</div>}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Performance (no unnecessary fetches)
- ✅ Flexible (custom conditions)
- ✅ Resource efficient

---

### 2.5 Singleton Data Pattern - Pattern "Dữ Liệu Đơn Nhất"

#### 👤 VÍ DỤ ĐỜI THƯỜNG: Danh tính cá nhân

```
Một người chỉ có MỘT danh tính:
- 1 tên
- 1 CMND
- 1 ngày sinh

Không thể có 2 danh tính khác nhau!
```

**Singleton** = Chỉ có 1 instance duy nhất

#### In useGetIdentity:

```
Trong app, chỉ có 1 user đang login:
→ useGetIdentity() luôn return cùng 1 user
→ Cache key cố định: ["auth", "identity"]
→ Mọi nơi dùng hook đều thấy CÙNG data
```

#### Example:

```typescript
// Component A
const { data: user1 } = useGetIdentity();
console.log(user1.id); // 123

// Component B (khác component, cùng user!)
const { data: user2 } = useGetIdentity();
console.log(user2.id); // 123 (same!)

// user1 === user2 (same reference, same cache)
```

#### 💡 TẠI SAO quan trọng?

- ✅ Consistency (same data everywhere)
- ✅ Single source of truth
- ✅ Memory efficient (no duplication)

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern               | Ví dụ đời thường  | Giải quyết vấn đề gì      | Trong useGetIdentity   |
| --------------------- | ----------------- | ------------------------- | ---------------------- | --- | ------- |
| **Query**             | Share data        | Cache & reuse             | React Query caching    |
| **Type Safety**       | Nhãn hàng hóa     | Know data structure       | TypeScript generics    |
| **Default Value**     | Avatar mặc định   | Fallback for missing data | user                   |     | 'Guest' |
| **Conditional Fetch** | Đèn giao thông    | Fetch when needed         | enabled: !!getIdentity |
| **Singleton**         | Danh tính cá nhân | One user per session      | Single cache key       |

---

## 3. COMMON USE CASES

### 3.1 Show User Avatar in Header

```typescript
function Header() {
  const { data: user } = useGetIdentity<{ avatar?: string; name: string }>();

  return (
    <header>
      <img
        src={user?.avatar || "/default-avatar.png"}
        alt={user?.name || "User"}
      />
    </header>
  );
}
```

### 3.2 Personalized Welcome Message

```typescript
function Dashboard() {
  const { data: user, isLoading } = useGetIdentity<{ name: string }>();

  if (isLoading) return <Skeleton />;

  return (
    <div>
      <h1>Welcome back, {user?.name}! 👋</h1>
    </div>
  );
}
```

### 3.3 Profile Page

```typescript
interface UserProfile {
  id: number;
  name: string;
  email: string;
  avatar: string;
  bio: string;
  company: string;
}

function ProfilePage() {
  const { data: user, isLoading } = useGetIdentity<UserProfile>();

  if (isLoading) return <Loading />;

  return (
    <div>
      <img src={user?.avatar} />
      <h1>{user?.name}</h1>
      <p>{user?.email}</p>
      <p>{user?.bio}</p>
      <p>Company: {user?.company}</p>
    </div>
  );
}
```

### 3.4 Role-based UI

```typescript
interface User {
  role: "admin" | "user" | "guest";
}

function AdminPanel() {
  const { data: user } = useGetIdentity<User>();

  if (user?.role !== "admin") {
    return <AccessDenied />;
  }

  return <AdminDashboard />;
}
```

---

## 4. IMPLEMENTATION STRATEGIES

### 4.1 JWT Decode (Fast, Local)

```typescript
authProvider.getIdentity = async () => {
  const token = localStorage.getItem("token");

  if (!token) return null;

  // Decode JWT payload
  const payload = decodeJWT(token);

  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    avatar: payload.avatar,
  };
};

// Pros: Fast (no API call)
// Cons: Limited data (only what's in JWT)
```

### 4.2 API Call (Complete, Fresh)

```typescript
authProvider.getIdentity = async () => {
  const res = await fetch("/api/me", {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch user");

  return await res.json();
};

// Pros: Complete data, always fresh
// Cons: Slower (API call)
```

### 4.3 Hybrid (Best of Both)

```typescript
authProvider.getIdentity = async () => {
  // 1. Quick decode for basic info
  const token = localStorage.getItem("token");
  const basicInfo = decodeJWT(token);

  // 2. Fetch full profile from API (cached by React Query)
  const res = await fetch("/api/users/" + basicInfo.sub);
  const fullProfile = await res.json();

  return {
    ...basicInfo,
    ...fullProfile,
  };
};

// Pros: Balance speed & completeness
// Cons: More complex
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Query**: Cached, shared data
- ✅ **Type Safety**: TypeScript autocomplete
- ✅ **Default Value**: Graceful fallbacks
- ✅ **Conditional Fetch**: Performance
- ✅ **Singleton**: Single source of truth

### Key Features

1. **Generic Type Support** - Fully type-safe
2. **Cached** - Share across components
3. **Conditional** - Only fetch when needed
4. **Flexible** - Works with any identity data
5. **User-facing** - Public API for developers

### Khi nào dùng useGetIdentity?

✅ **Nên dùng:**

- Show user avatar/name in header
- Personalize UI ("Welcome, John!")
- Profile pages
- Role-based rendering
- Any user-specific UI

❌ **Không dùng:**

- Authentication check (use useIsAuthenticated)
- Permission check (use usePermissions)
- Auth config check (use useIsExistAuthentication)

### Remember

✅ **PUBLIC API** - Developers dùng trực tiếp!
✅ Type-safe với TypeScript generics
✅ Cached - efficient across components
✅ Returns user profile data (name, email, avatar, etc.)
