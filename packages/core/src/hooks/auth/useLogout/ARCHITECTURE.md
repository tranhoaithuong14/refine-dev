# Kiến trúc và Design Patterns của useLogout Hook

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
│                          │                             │
│                    ┌─────▼──────┐                      │
│                    │ useLogin   │                      │
│                    │ useLogout  │ ← THIS HOOK          │
│                    │ useCheck   │                      │
│                    └────────────┘                      │
│                          │                             │
│                    ┌─────▼──────┐                      │
│                    │  LOGOUT    │                      │
│                    │  FLOW      │                      │
│                    └────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Session Terminator** - Kết thúc phiên đăng nhập của user
2. **State Cleaner** - Xóa dữ liệu auth (token, user info, permissions...)
3. **Redirect Manager** - Điều hướng về login page
4. **Notification Handler** - Thông báo kết quả cho user

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                         LOGOUT FLOW                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User clicks logout button                          │
│  const { mutate: logout } = useLogout();                     │
│  logout();                                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Hook calls authProvider.logout()                   │
│  → Clear token from localStorage                             │
│  → Call backend to invalidate session                        │
│  → Clear cookies                                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Invalidate auth cache                               │
│  → Clear permissions cache                                   │
│  → Clear user identity cache                                 │
│  → React Query removes all auth data                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Show notification                                   │
│  "Logged out successfully"                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Redirect to login page                              │
│  → Navigate to /login                                        │
│  → User sees login form                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** useLogout hook đơn giản nhưng vẫn áp dụng nhiều patterns để đảm bảo logout process diễn ra trơn tru.

---

### 2.1 Command Pattern - Pattern "Lệnh"

#### 📱 VÍ DỤ ĐỜI THƯỜNG: Checkout khách sạn

Khi bạn checkout khỏi khách sạn:

```
❌ TRỰC TIẾP (không tốt):
Bạn: Tự trả phòng
     Tự trả chìa khóa
     Tự xóa đồ trong tủ lạnh
     Tự check bill
→ Vấn đề: Quên bước? Làm sai? Mất thời gian!

✅ QUA LỄ TÂN (Command Pattern):
Bạn: "Tôi muốn checkout"  ← 1 LỆNH đơn giản
Lễ tân: Làm HẾT mọi thứ
     1. Check bill
     2. Thu chìa khóa
     3. Xóa thông tin
     4. Gửi email xác nhận
→ Lợi ích: Đơn giản, không quên, chuyên nghiệp!
```

**Command** = Đóng gói request phức tạp thành 1 lệnh đơn giản

#### ❌ KHÔNG có Command:

```typescript
// BAD - Component phải làm MỌI thứ

function LogoutButton() {
  const handleLogout = async () => {
    // 😱 Phải nhớ làm TẤT CẢ các bước!

    // 1. Clear token
    localStorage.removeItem("token");

    // 2. Call API
    await fetch("/api/logout", { method: "POST" });

    // 3. Clear permissions cache
    queryClient.invalidateQueries(["permissions"]);

    // 4. Clear user cache
    queryClient.invalidateQueries(["user"]);

    // 5. Show notification
    toast.success("Logged out!");

    // 6. Redirect
    navigate("/login");

    // 😭 Quên 1 bước = BUG!
  };

  return <button onClick={handleLogout}>Logout</button>;
}
```

**Vấn đề:**

- ❌ Dễ quên bước
- ❌ Duplicate code nếu nhiều nơi logout
- ❌ Khó maintain

#### ✅ CÓ Command Pattern:

```typescript
// GOOD - Một lệnh làm TẤT CẢ

function LogoutButton() {
  const { mutate: logout } = useLogout();

  // 😊 CHỈ 1 dòng! Hook lo hết!
  return <button onClick={() => logout()}>Logout</button>;
}

// Hook encapsulates ALL steps
const mutation = useMutation({
  mutationFn: authProvider.logout, // ← Command
  onSuccess: () => {
    // Hook tự động làm:
    // ✅ Clear cache
    // ✅ Show notification
    // ✅ Redirect
    // ✅ Invalidate queries
  },
});
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│  COMPONENT (Gửi lệnh)               │
│  logout() → 1 lệnh đơn giản         │
└─────────────────────────────────────┘
              │
              ▼ Command
┌─────────────────────────────────────┐
│  HOOK (Xử lý lệnh)                  │
│  1. Call authProvider.logout        │
│  2. Clear caches                    │
│  3. Show notification               │
│  4. Redirect                        │
└─────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Đơn giản cho component
- ✅ Không quên bước nào
- ✅ Consistent across app

---

### 2.2 Template Method Pattern - Pattern "Phương Thức Mẫu"

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Quy trình đóng cửa hàng

Mỗi cửa hàng có quy trình đóng cửa chuẩn:

```
TEMPLATE (Khung chuẩn):
1. Dọn dẹp          ← Mỗi cửa hàng khác nhau
2. Đóng két         ← Cố định
3. Tắt điện         ← Cố định
4. Khóa cửa         ← Cố định
5. Bật báo động     ← Cố định

Cửa hàng COFFEE:
1. Dọn dẹp: Rửa máy pha, đổ rác
2-5: Theo template

Cửa hàng QUẦN ÁO:
1. Dọn dẹp: Gấp quần áo, sắp xếp
2-5: Theo template
```

**Template Method** = Khung quy trình cố định, một số bước tùy chỉnh

#### ❌ KHÔNG có Template:

```typescript
// BAD - Mỗi project tự implement toàn bộ

// Project A
const logout = async () => {
  await authProvider.logout();
  // Quên clear cache!
  navigate("/login");
};

// Project B
const logout = async () => {
  await authProvider.logout();
  queryClient.clear(); // Clear toàn bộ cache (quá đà!)
  navigate("/login");
  // Quên show notification!
};

// 😭 Mỗi nơi một khác!
```

**Vấn đề:**

- ❌ Không consistent
- ❌ Dễ thiếu bước
- ❌ Khó debug

#### ✅ CÓ Template Method:

```typescript
// GOOD - Template chuẩn trong hook

const mutation = useMutation({
  // CUSTOMIZABLE: Logic logout tùy project
  mutationFn: authProvider.logout,

  // TEMPLATE FLOW (cố định cho mọi project):
  onSuccess: (data, variables) => {
    // Step 1: Close existing error notifications (cố định)
    close?.("useLogout-error");

    // Step 2: Show success notification if needed (cố định)
    if (data.successNotification) {
      open?.(buildSuccessNotification(data.successNotification));
    }

    // Step 3: Navigate if needed (cố định)
    const redirect = variables?.redirectPath ?? data.redirectTo;
    if (redirect !== false && redirect) {
      go({ to: redirect });
    }

    // Step 4: Invalidate auth cache (cố định)
    invalidateAuthStore();
    // ✅ Mọi project đều follow template này!
  },
});
```

#### 📊 Biểu đồ:

```
┌────────────────────────────────────────┐
│  TEMPLATE (Framework - Cố định)        │
├────────────────────────────────────────┤
│  1. Call logout()         ◄─────────── │ Tùy chỉnh
│  2. Close error notify    (Fixed)      │
│  3. Show success notify   (Fixed)      │
│  4. Navigate              (Fixed)      │
│  5. Invalidate cache      (Fixed)      │
└────────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Consistent behavior
- ✅ Không bỏ sót bước
- ✅ Framework đảm bảo đúng flow

---

### 2.3 Strategy Pattern - Pattern "Chiến Lược"

#### 🏪 VÍ DỤ ĐỜI THƯỜNG: Các cách đóng cửa hàng

Mỗi cửa hàng có cách đóng khác nhau:

```
Cửa hàng ONLINE:
→ Chỉ cần logout khỏi hệ thống

Cửa hàng VẬT LÝ:
→ Đóng két tiền
→ Tắt đèn
→ Khóa cửa

Cửa hàng 24/7:
→ Không đóng, chỉ chuyển ca
```

**Strategy** = Mỗi loại có cách thực hiện khác nhau

#### ❌ KHÔNG có Strategy:

```typescript
// BAD - Hard-code cho mọ scenario

function useLogout() {
  const logout = async () => {
    // 😱 Phải biết MỌI trường hợp!
    if (isOnlineStore) {
      localStorage.removeItem("token");
    }

    if (isPhysicalStore) {
      await closeRegister();
      await turnOffLights();
      await lockDoors();
    }

    // 😭 Thêm scenario = sửa framework!
  };
}
```

**Vấn đề:**

- ❌ Framework phụ thuộc business logic
- ❌ Không linh hoạt
- ❌ Khó mở rộng

#### ✅ CÓ Strategy Pattern:

```typescript
// GOOD - Framework chỉ cần interface

// Framework
function useLogout() {
  const { logout } = useAuthProviderContext(); // ← Strategy

  const mutation = useMutation({
    mutationFn: logout, // ← Gọi strategy
  });

  return mutation;
}

// Strategy 1: Simple token removal
const authProvider_Simple = {
  logout: async () => {
    localStorage.removeItem("token");
    return { success: true };
  },
};

// Strategy 2: Backend call + cleanup
const authProvider_Backend = {
  logout: async () => {
    await fetch("/api/logout", { method: "POST" });
    localStorage.clear();
    sessionStorage.clear();
    return { success: true, redirectTo: "/goodbye" };
  },
};

// Strategy 3: Complex cleanup
const authProvider_Complex = {
  logout: async () => {
    // Close WebSocket connections
    await closeWebSockets();

    // Log analytics
    await logEvent("user_logout");

    // Clear IndexedDB
    await clearOfflineData();

    return { success: true };
  },
};
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│    Framework (useLogout)            │
│    "Làm logout theo cách nào?"      │
└─────────────────────────────────────┘
              ▲ Uses
              │
┌─────────────┴──────────────────────┐
│  STRATEGIES (Cách logout khác nhau)│
├────────────────────────────────────┤
│  Simple     Backend     Complex    │
│  (Token)    (API+Clean) (Full)     │
└────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Mỗi app có logout logic riêng
- ✅ Framework không phụ thuộc business
- ✅ Dễ test và mock

---

### 2.4 Observer Pattern (via React Query)

_(Tương tự usePermissions và useOnError)_

#### 🔔 VÍ DỤ: Thông báo logout

Khi logout:

- Tất cả components thấy auth state thay đổi
- Auto redirect về login
- UI update automatically

---

### 2.5 Null Object Pattern - Pattern "Đối Tượng Rỗng"

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Hệ thống âm thanh

Khi tắt loa:

```
❌ BAD - Check null mọi nơi:
if (speaker !== null) {
  speaker.playSound("beep");
}

✅ GOOD - Null Object:
speaker.playSound("beep"); // Nếu tắt → không làm gì, không crash
```

**Null Object** = Object không làm gì, tránh null checks

#### ❌ KHÔNG có Null Object:

```typescript
// BAD - Phải check null mọi nơi

const { open } = useNotification();

// 😱 Phải check mọi lúc
if (open) {
  open({ message: "Logged out" });
}

if (open) {
  open({ message: "Error" });
}
```

**Vấn đề:**

- ❌ Nhiều null checks
- ❌ Dễ quên check
- ❌ Code dài dòng

#### ✅ CÓ Null Object:

```typescript
// GOOD - Optional chaining operator

const { open, close } = useNotification();

// 😊 Luôn an toàn, không cần check
open?.({ message: "Logged out" }); // Nếu không có → không làm gì
close?.("error-key");

// Hook tự động handle:
// - Có notification system → show
// - Không có → silent (không crash)
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│  CODE (Không cần check)             │
│  open?.(notification);              │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  NOTIFICATION SYSTEM                │
│  ├─ Có? → Show notification         │
│  └─ Không? → Do nothing (safe)      │
└─────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Code sạch, ít checks
- ✅ Safe, không crash
- ✅ Flexible (có thể không cần notification)

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern             | Ví dụ đời thường        | Giải quyết vấn đề gì        | Trong useLogout                 |
| ------------------- | ----------------------- | --------------------------- | ------------------------------- |
| **Command**         | Checkout khách sạn      | Đóng gói request phức tạp   | logout() encapsulates all steps |
| **Template Method** | Quy trình đóng cửa hàng | Khung chuẩn, bước tùy chỉnh | onSuccess flow cố định          |
| **Strategy**        | Các cách đóng cửa hàng  | Nhiều cách thực hiện        | authProvider.logout strategies  |
| **Observer**        | Subscribe thông báo     | Auto update UI              | React Query notify              |
| **Null Object**     | Tắt loa an toàn         | Tránh null checks           | Optional chaining open?.        |

---

## 3. KIẾN TRÚC CHI TIẾT

### 3.1 Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                  │
│  (React Components)                                    │
│                                                        │
│  const { mutate: logout } = useLogout();              │
│  <button onClick={() => logout()}>Logout</button>     │
└────────────────────────────────────────────────────────┘
                          │
                          │ Calls
                          ▼
┌────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                    │
│  (useLogout Hook)                                      │
│                                                        │
│  - Get authProvider.logout                             │
│  - Create React Query mutation                         │
│  - Return logout function                              │
└────────────────────────────────────────────────────────┘
                          │
                          │ Uses React Query
                          ▼
┌────────────────────────────────────────────────────────┐
│                    MUTATION LAYER                      │
│  (React Query Mutation)                                │
│                                                        │
│  - Execute authProvider.logout()                       │
│  - Track state (pending, success, error)               │
│  - Trigger side effects                                │
└────────────────────────────────────────────────────────┘
                          │
                          │ Calls
                          ▼
┌────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                 │
│  (authProvider.logout)                                 │
│                                                        │
│  - Clear localStorage/cookies                          │
│  - Call backend API                                    │
│  - Return success/redirect info                        │
└────────────────────────────────────────────────────────┘
                          │
                          │ Side effects
                          ▼
┌────────────────────────────────────────────────────────┐
│                    SIDE EFFECTS                        │
│                                                        │
│  - Clear auth cache (invalidateAuthStore)              │
│  - Show notification                                   │
│  - Navigate to login                                   │
└────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
USER ACTION              LOGOUT FLOW
──────────              ───────────
    │
    ▼
┌─────────────┐
│ Click       │
│ logout btn  │
└─────────────┘
    │
    ▼
┌──────────────────┐
│ Call logout()    │
└──────────────────┘
    │
    ▼
┌──────────────────────┐
│ React Query Mutation │
│ (execute)            │
└──────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ authProvider.logout()    │
│ → Clear token            │
│ → Call API               │
│ → Return result          │
└──────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ onSuccess:               │
│ → Close error notif      │
│ → Show success notif     │
│ → Navigate               │
│ → Invalidate cache       │
└──────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ UI Updates:              │
│ → Login screen shown     │
│ → Auth state cleared     │
└──────────────────────────┘
```

---

## 4. TẠI SAO THIẾT KẾ NHƯ VẬY?

### 4.1 All-in-One Logout

**Vấn đề:** Logout có nhiều bước phải nhớ

**Giải pháp:**

```typescript
// Component chỉ cần:
logout();

// Hook lo:
// ✅ Clear token
// ✅ Call API
// ✅ Clear caches
// ✅ Show notification
// ✅ Redirect
```

### 4.2 Flexible Redirects

**Nhiều scenarios:**

```typescript
// Normal logout → /login
logout();

// Logout → custom page
logout({ redirectPath: "/goodbye" });

// Logout → no redirect
logout({ redirectPath: false });
```

### 4.3 Automatic Cache Invalidation

**Vấn đề:** Quên clear cache = security issue

**Giải pháp:**

```typescript
// Hook TƯ ĐỘNG clear:
invalidateAuthStore();
// → Permissions gone
// → User identity gone
// → All auth data gone
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: One call does everything
- ✅ **Template Method**: Standard logout flow
- ✅ **Strategy**: Custom logout logic per app
- ✅ **Observer**: Auto UI updates
- ✅ **Null Object**: Safe optional chaining

### Key Benefits

1. **Simple** - One function call
2. **Complete** - All steps included
3. **Safe** - Auto cache clearance
4. **Flexible** - Custom redirects
5. **User-friendly** - Notifications

### Khi nào dùng useLogout?

✅ **Nên dùng:**

- Logout button
- Session timeout
- Security events
- User-initiated logout

❌ **Không dùng:**

- Auto-refresh (use different mechanism)
- Switching accounts (use different flow)
