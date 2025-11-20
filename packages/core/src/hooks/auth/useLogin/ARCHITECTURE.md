# Kiến trúc và Design Patterns của useLogin Hook

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
│                    │ useLogin   │ ← THIS HOOK          │
│                    │ useLogout  │                      │
│                    │ useCheck   │                      │
│                    └────────────┘                      │
│                          │                             │
│                    ┌─────▼──────┐                      │
│                    │ GATEWAY    │                      │
│                    │ (Entry)    │                      │
│                    └────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Authentication Gateway** - Cổng vào hệ thống
2. **Credential Validator** - Xác thực thông tin đăng nhập
3. **Session Creator** - Tạo phiên làm việc (token, cookies)
4. **Access Granter** - Cấp quyền truy cập vào app

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User nhập thông tin                                 │
│  Email: user@example.com                                     │
│  Password: ******                                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Submit form                                         │
│  const { mutate: login } = useLogin();                       │
│  login({ email, password });                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Call authProvider.login()                           │
│  → POST /api/login { email, password }                       │
│  → Backend validates credentials                             │
│  → Returns: { success: true, token: "..." }                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Store authentication data                           │
│  → localStorage.setItem('token', token)                      │
│  → Set cookies (if needed)                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Invalidate cache                                    │
│  → Fetch fresh permissions                                   │
│  → Fetch user identity                                       │
│  → Update auth state                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Show success notification                           │
│  "Welcome back!"                                             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Redirect to app                                     │
│  → Navigate to /dashboard (or ?to param)                     │
│  → User sees main app                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** useLogin là hook quan trọng nhất - cổng vào app. Nó phải robust, secure và user-friendly.

---

### 2.1 Strategy Pattern - Pattern "Chiến Lược"

#### 🔐 VÍ DỤ ĐỜI THƯỜNG: Vào công ty

Các công ty có cách xác thực khác nhau:

```
Công ty A: Thẻ từ + Vân tay
→ Chiến lược: Quẹt thẻ → Quét vân tay → Vào

Công ty B: Username + Password + OTP
→ Chiến lược: Nhập user/pass → Nhập OTP → Vào

Công ty C: Face ID
→ Chiến lược: Quét mặt → Vào
```

**Điểm quan trọng:**

- Mỗi công ty có **QUY TRÌNH** riêng
- Cổng vào **KHÔNG QUAN TÂM** cách xác thực
- Chỉ cần kết quả: Được vào hay không?

#### ❌ KHÔNG có Strategy Pattern:

```typescript
// BAD - Hard-code mọi phương thức login

function useLogin() {
  const login = async (credentials) => {
    // 😱 Framework phải biết MỌI cách login!

    if (method === "email-password") {
      const res = await fetch("/api/login", {
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });
    }

    if (method === "google-oauth") {
      window.location.href = "/auth/google";
    }

    if (method === "magic-link") {
      await sendMagicLink(credentials.email);
    }

    // 😭 Thêm method mới? Sửa framework!
  };
}
```

**Vấn đề:**

- ❌ Framework phụ thuộc implementation
- ❌ Không linh hoạt
- ❌ Khó test

#### ✅ CÓ Strategy Pattern:

```typescript
// GOOD - Framework chỉ cần interface

// Framework CHỈ nói: "Cho tôi một hàm login!"
function useLogin() {
  const { login } = useAuthProviderContext(); // ← Strategy

  const mutation = useMutation({
    mutationFn: login // ← Gọi strategy
  });

  return mutation;
}

// Strategy 1: Email + Password
const authProvider_EmailPassword = {
  login: async ({ email, password }) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return { success: true };
  }
};

// Strategy 2: Google OAuth
const authProvider_Google = {
  login: async () => {
    // Redirect to Google
    window.location.href = 'https://accounts.google.com/oauth...';
    return { success: true };
  }
};

// Strategy 3: Magic Link
const authProvider_MagicLink = {
  login: async ({ email }) => {
    await fetch('/api/send-magic-link', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    return {
      success: true,
      successNotification: {
        message: 'Check your email',
        description: 'Click the link to login'
      }
    };
  }
};

// Strategy 4: Biometric (Face ID)
const authProvider_Biometric = {
  login: async () => {
    const result = await navigator.credentials.get({
      publicKey: { ... }
    });
    const res = await fetch('/api/verify-biometric', {
      method: 'POST',
      body: JSON.stringify({ credential: result })
    });
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return { success: true };
  }
};
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│    Framework (useLogin)             │
│    "Thực hiện login!"               │
│    Không quan tâm HOW               │
└─────────────────────────────────────┘
              ▲ Uses
              │
┌─────────────┴──────────────────────────┐
│  STRATEGIES (Phương thức login)        │
├────────────────────────────────────────┤
│  Email/Pass   OAuth   Magic   Biometric│
└────────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Support mọi phương thức login
- ✅ Framework không phụ thuộc implementation
- ✅ Dễ thêm phương thức mới

---

### 2.2 Command Pattern - Pattern "Lệnh"

#### 🎫 VÍ DỤ ĐỜI THƯỜNG: Mua vé xem phim

```
❌ TRỰC TIẾP (không tốt):
Bạn: Tự chọn ghế
     Tự in vé
     Tự thanh toán
     Tự check mã vé
→ Phức tạp, dễ sai!

✅ QUA HỆ THỐNG (Command):
Bạn: "Mua 1 vé phim Avengers"  ← 1 LỆNH
Hệ thống: Làm TẤT CẢ
     1. Chọn ghế trống
     2. Tạo mã vé
     3. Thanh toán
     4. Gửi email xác nhận
→ Đơn giản, đúng quy trình!
```

#### ❌ KHÔNG có Command:

```typescript
// BAD - Component tự làm mọi thứ

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (values) => {
    try {
      setLoading(true);

      // 😱 Phải tự làm MỌI bước!
      const res = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("token", data.token);
        toast.success("Login successful!");

        // Invalidate cache
        queryClient.invalidateQueries(["user"]);
        queryClient.invalidateQueries(["permissions"]);

        // Redirect
        const redirectTo = searchParams.get("to") || "/dashboard";
        navigate(redirectTo);
      } else {
        setError(data.error);
        toast.error(data.error);
      }
    } catch (err) {
      setError(err.message);
      toast.error("Login failed");
    } finally {
      setLoading(false);
    }
  };

  // 😭 Quá nhiều logic! Dễ quên bước!
}
```

**Vấn đề:**

- ❌ Component quá phức tạp
- ❌ Duplicate code
- ❌ Khó maintain

#### ✅ CÓ Command Pattern:

```typescript
// GOOD - Command đóng gói tất cả

function LoginPage() {
  const { mutate: login, isLoading, error } = useLogin();

  const handleLogin = (values) => {
    // 😊 CHỈ 1 dòng! Hook lo hết!
    login(values);
  };

  // Component chỉ care về UI!
  return <form onSubmit={handleSubmit(handleLogin)}>...</form>;
}

// Hook encapsulates ALL logic
const mutation = useMutation({
  mutationFn: authProvider.login,
  onSuccess: (data) => {
    // Tất cả side effects:
    // ✅ Store token
    // ✅ Show notification
    // ✅ Invalidate cache
    // ✅ Redirect
  },
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ Component đơn giản
- ✅ Logic tập trung
- ✅ Dễ test

---

### 2.3 Redirect Strategy Pattern - Pattern "Chiến Lược Điều Hướng"

#### 🚗 VÍ DỤ ĐỜI THƯỜNG: Xe đón khách sân bay

```
Priority 1: Khách có yêu cầu cụ thể
"Đưa tôi đến Khách sạn A" → Đi khách sạn A

Priority 2: Công ty có gợi ý
"recommend": Khách sạn B → Đi khách sạn B

Priority 3: Default
Không ai nói gì → Đi center city
```

**Redirect Strategy** = Nhiều options, chọn theo priority

#### Redirect Logic trong useLogin:

```typescript
// Priority 1: URL param ?to=/admin
const to = searchParams.get("to");
if (to) {
  navigate(to); // Ưu tiên cao nhất!
}

// Priority 2: Backend response redirectTo
else if (data.redirectTo) {
  navigate(data.redirectTo);
}

// Priority 3: Default (không redirect)
// User ở lại trang hiện tại
```

#### Use Cases:

```typescript
// Case 1: Redirect sau khi login từ trang protected
// User vào /admin/posts → Chưa login → Redirect to /login?to=/admin/posts
// Sau login → Redirect về /admin/posts ✅

<Link to="/login?to=/admin/posts">Login</Link>

// Case 2: Backend quyết định redirect
authProvider.login = async (credentials) => {
  const res = await fetch('/api/login', ...);
  return {
    success: true,
    redirectTo: res.data.isAdmin ? '/admin' : '/user-dashboard'
  };
};

// Case 3: Không redirect (ở lại trang login)
// Useful cho mobile apps hoặc embedded login forms
```

#### 💡 TẠI SAO quan trọng?

- ✅ UX tốt (redirect về nơi user muốn)
- ✅ Linh hoạt (backend hoặc frontend quyết định)
- ✅ Security (protected routes hoạt động đúng)

---

### 2.4 Template Method Pattern - Pattern "Phương Thức Mẫu"

#### 📋 VÍ DỤ: Quy trình checkin khách sạn

```
TEMPLATE (Mọi khách sạn):
1. Check thông tin     ← Khác nhau
2. Tạo key card        ← Cố định
3. Phân phòng          ← Cố định
4. Hướng dẫn khách     ← Cố định
```

#### Template trong useLogin:

```typescript
const mutation = useMutation({
  // CUSTOMIZABLE: Login logic
  mutationFn: authProvider.login,

  // TEMPLATE FLOW (cố định):
  onSuccess: (data) => {
    // Step 1: Close error (fixed)
    close?.("login-error");

    // Step 2: Show success (fixed)
    if (data.successNotification) {
      open?.(buildSuccessNotification(...));
    }

    // Step 3: Show error if any (fixed)
    if (data.error || !data.success) {
      open?.(buildNotification(data.error));
    }

    // Step 4: Redirect (fixed)
    if (data.success) {
      const redirectTo = to || data.redirectTo;
      if (redirectTo) navigate(redirectTo);
    }

    // Step 5: Invalidate cache (fixed)
    setTimeout(() => invalidateAuthStore(), 32);
    // ✅ Mọi app đều follow flow này!
  }
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ Consistent behavior
- ✅ Không quên bước
- ✅ Framework đảm bảo UX tốt

---

### 2.5 Promise Pattern - Async/Await

#### ⏳ VÍ DỤ: Đặt món ăn

```
Synchronous (blocking):
Bạn: "1 phở!"
Đợi... đợi... đợi... 10 phút
Nhận phở
Bị block, không làm gì được!

Asynchronous (non-blocking):
Bạn: "1 phở!" → Nhận số phiếu
Làm việc khác (đọc báo, gọi điện...)
Nghe tên → Lên lấy phở
Hiệu quả hơn!
```

#### Trong useLogin:

```typescript
// authProvider.login is ASYNC
login: async (credentials) => {
  const res = await fetch('/api/login', ...);
  //         ^^^^^ await - đợi response
  const data = await res.json();
  return data;
};

// useMutation handles async automatically
const { mutate: login } = useLogin();

login(credentials); // Non-blocking!
// Component không bị freeze
// User thấy loading spinner
// UI vẫn responsive
```

#### 💡 TẠI SAO quan trọng?

- ✅ UI không bị freeze
- ✅ Better UX
- ✅ Easy error handling

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern               | Ví dụ đời thường     | Giải quyết vấn đề gì    | Trong useLogin                |
| --------------------- | -------------------- | ----------------------- | ----------------------------- |
| **Strategy**          | Cách vào công ty     | Nhiều phương thức login | authProvider.login strategies |
| **Command**           | Mua vé xem phim      | Đóng gói login flow     | mutation encapsulates all     |
| **Redirect Strategy** | Xe đón khách sân bay | Ưu tiên redirect logic  | ?to > redirectTo > default    |
| **Template Method**   | Checkin khách sạn    | Flow chuẩn cho mọi app  | onSuccess steps cố định       |
| **Promise**           | Đặt món ăn           | Async, non-blocking     | async/await pattern           |

---

## 3. KIẾN TRÚC CHI TIẾT

### 3.1 Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                  │
│  (Login Form Component)                                │
│                                                        │
│  <form onSubmit={() => login(values)}>                │
│    <input name="email" />                             │
│    <input name="password" />                          │
│    <button>Login</button>                             │
│  </form>                                              │
└────────────────────────────────────────────────────────┘
                          │
                          │ Submits credentials
                          ▼
┌────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                    │
│  (useLogin Hook)                                       │
│                                                        │
│  - Get authProvider.login                              │
│  - Create mutation                                     │
│  - Handle success/error                                │
│  - Manage redirects                                    │
└────────────────────────────────────────────────────────┘
                          │
                          │ Uses React Query
                          ▼
┌────────────────────────────────────────────────────────┐
│                    MUTATION LAYER                      │
│  (React Query Mutation)                                │
│                                                        │
│  - Execute login function                              │
│  - Track state                                         │
│  - Retry on failure                                    │
└────────────────────────────────────────────────────────┘
                          │
                          │ Calls
                          ▼
┌────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                 │
│  (authProvider.login)                                  │
│                                                        │
│  - Validate credentials                                │
│  - Call authentication API                             │
│  - Store token/session                                 │
│  - Return result                                       │
└────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Request
                          ▼
┌────────────────────────────────────────────────────────┐
│                    BACKEND API                         │
│                                                        │
│  POST /api/login                                       │
│  - Check credentials in database                       │
│  - Generate JWT token                                  │
│  - Return user data + token                            │
└────────────────────────────────────────────────────────┘
```

---

## 4. ĐIỂM ĐẶC BIỆT CỦA useLogin

### 4.1 Timeout for Cache Invalidation

```typescript
setTimeout(() => {
  invalidateAuthStore();
}, 32);
```

**Tại sao 32ms?**

- ⏱️ 32ms ≈ 2 frames (60fps)
- Đủ để navigate complete trước khi invalidate
- Tránh race condition giữa redirect và fetch

### 4.2 Redirect Priority Logic

```
Priority 1: URL param ?to=/page    (Cao nhất - user intent)
Priority 2: data.redirectTo         (Backend suggestion)
Priority 3: No redirect             (Stay on current page)
```

### 4.3 Error vs Success with Error

```typescript
// Case 1: Real error (exception)
try {
  await login();
} catch (error) {
  // onError triggered
  show("Network error!");
}

// Case 2: API returns error in response
{
  success: false,
  error: { message: "Invalid credentials" }
}
// onSuccess triggered, but shows error notification
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: Flexible login methods
- ✅ **Command**: Encapsulated login flow
- ✅ **Redirect Strategy**: Smart navigation
- ✅ **Template Method**: Consistent UX
- ✅ **Promise**: Async handling

### Key Benefits

1. **Flexible** - Support any login method
2. **Simple** - One hook for all
3. **Smart** - Intelligent redirects
4. **UX-focused** - Notifications, loading states
5. **Secure** - Proper cache invalidation

### Khi nào dùng useLogin?

✅ **Nên dùng:**

- Login forms
- Authentication flows
- OAuth callbacks
- Magic link handling

❌ **Không dùng:**

- Registration (use useRegister)
- Password reset (custom logic)
- Profile updates (use data hooks)
