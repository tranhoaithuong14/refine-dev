# Kiến trúc và Design Patterns của useRegister Hook

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
│                    │ useRegister│ ← THIS HOOK          │
│                    │ useLogout  │                      │
│                    └────────────┘                      │
│                          │                             │
│                    ┌─────▼──────┐                      │
│                    │ ONBOARDING │                      │
│                    │ (New Users)│                      │
│                    └────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **User Onboarding** - Đưa user mới vào hệ thống
2. **Account Creator** - Tạo tài khoản mới
3. **Data Validator** - Kiểm tra thông tin hợp lệ
4. **Welcome Manager** - Chào mừng user mới

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                      REGISTRATION FLOW                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User điền form đăng ký                              │
│  Name: John Doe                                              │
│  Email: john@example.com                                     │
│  Password: ********                                          │
│  Confirm Password: ********                                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Submit registration                                 │
│  const { mutate: register } = useRegister();                 │
│  register({ name, email, password });                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Call authProvider.register()                        │
│  → Validate data (email format, password strength...)        │
│  → Check email already exists?                               │
│  → POST /api/register                                        │
│  → Create user in database                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Send verification email (optional)                  │
│  → Generate verification token                               │
│  → Send email to user                                        │
│  → Return: { success: true, redirectTo: '/verify-email' }    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Auto-login or redirect to login                     │
│  Option 1: Auto-login → Dashboard                            │
│  Option 2: Verify email first → /verify-email                │
│  Option 3: Login manually → /login                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Show success notification                           │
│  "Account created! Welcome to [App Name]"                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** useRegister tương tự useLogin nhưng có thêm logic đặc biệt cho onboarding như email verification, terms acceptance, etc.

---

### 2.1 Strategy Pattern - Pattern "Chiến Lược"

#### 📝 VÍ DỤ ĐỜI THƯỜNG: Mở tài khoản ngân hàng

Các ngân hàng có quy trình mở tài khoản khác nhau:

```
Ngân hàng A: Chỉ cần CMND + Selfie
→ Chiến lược: Nhanh, đơn giản

Ngân hàng B: CMND + Giấy tờ nhà + Thu nhập
→ Chiến lược: Chi tiết, cẩn thận

Ngân hàng C: Video call xác minh
→ Chiến lược: Remote, hiện đại
```

**Điểm quan trọng:**

- Mỗi ứng dụng có **YÊU CẦU** đăng ký khác nhau
- Framework **KHÔNG QUAN TÂM** requirements cụ thể
- Chỉ cần interface chuẩn

#### ❌ KHÔNG có Strategy Pattern:

```typescript
// BAD - Hard-code requirements

function useRegister() {
  const register = async (data) => {
    // 😱 Framework phải biết MỌI requirements!

    // App A: Simple email/password
    if (appType === "simple") {
      if (!data.email || !data.password) {
        throw new Error("Missing fields");
      }
    }

    // App B: Full profile
    if (appType === "profile") {
      if (
        !data.email ||
        !data.password ||
        !data.firstName ||
        !data.lastName ||
        !data.phone ||
        !data.address
      ) {
        throw new Error("Full profile required");
      }
    }

    // App C: Social media
    if (appType === "social") {
      if (!data.username || !data.bio || !data.avatar) {
        throw new Error("Social profile required");
      }
    }

    // 😭 Thêm app type? Sửa framework!
  };
}
```

**Vấn đề:**

- ❌ Framework biết quá nhiều business logic
- ❌ Không linh hoạt
- ❌ Khó scale

#### ✅ CÓ Strategy Pattern:

```typescript
// GOOD - Framework chỉ cần interface

// Framework CHỈ nói: "Cho tôi một hàm register!"
function useRegister() {
  const { register } = useAuthProviderContext(); // ← Strategy

  const mutation = useMutation({
    mutationFn: register, // ← Gọi strategy
  });

  return mutation;
}

// Strategy 1: Simple Email/Password
const authProvider_Simple = {
  register: async ({ email, password }) => {
    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    return {
      success: true,
      redirectTo: "/login", // User phải login sau
    };
  },
};

// Strategy 2: Email Verification Required
const authProvider_WithVerification = {
  register: async ({ email, password }) => {
    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Send verification email
    await fetch("/api/send-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    return {
      success: true,
      redirectTo: "/verify-email",
      successNotification: {
        message: "Check your email",
        description: "Click the link to verify your account",
      },
    };
  },
};

// Strategy 3: Auto-Login After Registration
const authProvider_AutoLogin = {
  register: async ({ email, password }) => {
    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    // Auto-login
    localStorage.setItem("token", data.token);

    return {
      success: true,
      redirectTo: "/onboarding", // Hướng dẫn cho user mới
      successNotification: {
        message: "Welcome!",
        description: "Your account has been created",
      },
    };
  },
};

// Strategy 4: Multi-step Registration
const authProvider_MultiStep = {
  register: async ({ email, password, step }) => {
    if (step === 1) {
      // Step 1: Basic info
      await fetch("/api/register/step1", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      return {
        success: true,
        redirectTo: "/register/step2",
      };
    }

    if (step === 2) {
      // Step 2: Profile
      await fetch("/api/register/step2", {
        method: "POST",
        body: JSON.stringify({ ...profileData }),
      });
      return {
        success: true,
        redirectTo: "/dashboard",
      };
    }
  },
};
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│    Framework (useRegister)          │
│    "Thực hiện đăng ký!"             │
│    Không quan tâm HOW               │
└─────────────────────────────────────┘
              ▲ Uses
              │
┌─────────────┴──────────────────────────────┐
│  STRATEGIES (Quy trình đăng ký)            │
├────────────────────────────────────────────┤
│  Simple   Verification   AutoLogin   Multi │
└────────────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Support mọi quy trình đăng ký
- ✅ Framework không phụ thuộc business logic
- ✅ Dễ customize theo từng app

---

### 2.2 Validation Strategy - Pattern "Chiến Lược Kiểm Tra"

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Kiểm tra hồ sơ xin visa

Mỗi nước có tiêu chuẩn khác nhau:

```
Visa Thái Lan: Hộ chiếu + Vé máy bay
Visa Nhật Bản: Hộ chiếu + Tài chính + Lý lịch
Visa Mỹ: Hộ chiếu + Tài chính + Mục đích + Phỏng vấn
```

**Validation** = Kiểm tra đủ điều kiện chưa?

#### Client-side vs Server-side Validation:

```typescript
// CLIENT-SIDE (useRegister component)
// → Nhanh, UX tốt, nhưng không an toàn

const schema = z
  .object({
    email: z.string().email("Invalid email"),
    password: z.string().min(8, "Too short"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
  });

// Validate trước khi submit
const { mutate: register } = useRegister();
const handleSubmit = (values) => {
  const result = schema.safeParse(values);
  if (!result.success) {
    // Show validation errors
    return;
  }
  register(values); // ✅ Chỉ submit khi valid
};

// SERVER-SIDE (authProvider.register)
// → Chậm hơn, nhưng AN TOÀN, bắt buộc

register: async ({ email, password }) => {
  const res = await fetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!data.success) {
    // Backend trả lỗi validation
    throw new Error(data.error); // "Email already exists"
  }

  return { success: true };
};
```

#### Best Practice: 2-Layer Validation

```
Layer 1: CLIENT (Fast feedback)
→ Email format wrong? → Show error immediately
→ Password too short? → Show error immediately

Layer 2: SERVER (Security)
→ Email exists? → Must check database
→ Valid domain? → Must verify DNS
→ Rate limiting? → Must check IP
```

#### 💡 TẠI SAO quan trọng?

- ✅ UX tốt (client-side)
- ✅ An toàn (server-side)
- ✅ Prevent malicious data

---

### 2.3 Command Pattern - Pattern "Lệnh"

_(Giống useLogin - xem useLogin/ARCHITECTURE.md)_

#### 🎫 VÍ DỤ: Đăng ký khóa học

```
COMPONENT: register(studentData) → 1 lệnh
HOOK: Làm TẤT CẢ
    → Validate
    → Create account
    → Send welcome email
    → Redirect to course
```

---

### 2.4 Template Method Pattern - Pattern "Phương Thức Mẫu"

#### 📋 VÍ DỤ: Quy trình nhập học

```
TEMPLATE (Mọi trường):
1. Nộp hồ sơ         ← Custom
2. Nhận số báo danh  ← Cố định
3. Tạo tài khoản     ← Cố định
4. Gửi thông báo     ← Cố định
5. Hướng dẫn         ← Cố định
```

#### Template trong useRegister:

```typescript
const mutation = useMutation({
  // CUSTOMIZABLE: Register logic
  mutationFn: authProvider.register,

  // TEMPLATE FLOW (cố định):
  onSuccess: (data) => {
    // Step 1: Close error (fixed)
    close?.("register-error");

    // Step 2: Show success (fixed)
    if (data.successNotification) {
      open?.(buildSuccessNotification(...));
    }

    // Step 3: Redirect (fixed)
    if (data.redirectTo) {
      navigate(data.redirectTo);
    }

    // Step 4: Invalidate cache (fixed)
    if (data.success) {
      setTimeout(() => invalidateAuthStore(), 32);
    }
    // ✅ Consistent across all apps!
  }
});
```

---

### 2.5 Builder Pattern - Pattern "Người Xây Dựng"

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Đặt pizza

```
❌ BAD: Phải nhớ mọi thứ
Pizza(size, crust, sauce, cheese, topping1, topping2, ...)

✅ GOOD: Build từng bước
Pizza.builder()
  .size("large")
  .crust("thin")
  .sauce("tomato")
  .addTopping("pepperoni")
  .addTopping("mushrooms")
  .build()
```

#### Builder trong Registration Form:

```typescript
// Multi-step registration form
const [formData, setFormData] = useState({});

// Step 1: Basic info
const handleStep1 = (data) => {
  setFormData((prev) => ({ ...prev, ...data }));
  // → { email, password }
};

// Step 2: Profile
const handleStep2 = (data) => {
  setFormData((prev) => ({ ...prev, ...data }));
  // → { email, password, firstName, lastName }
};

// Step 3: Preferences
const handleStep3 = (data) => {
  setFormData((prev) => ({ ...prev, ...data }));
  // → { email, password, firstName, lastName, theme, language }

  // Build complete data → Submit
  register(formData);
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Multi-step forms dễ manage
- ✅ Validation từng step
- ✅ User có thể back/forward

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                 | Ví dụ đời thường       | Giải quyết vấn đề gì    | Trong useRegister     |
| ----------------------- | ---------------------- | ----------------------- | --------------------- |
| **Strategy**            | Mở tài khoản ngân hàng | Nhiều quy trình đăng ký | authProvider.register |
| **Validation Strategy** | Kiểm tra visa          | 2-layer validation      | Client + Server       |
| **Command**             | Đăng ký khóa học       | Đóng gói registration   | mutation              |
| **Template Method**     | Nhập học               | Flow chuẩn              | onSuccess steps       |
| **Builder**             | Đặt pizza              | Multi-step forms        | Form state building   |

---

## 3. REGISTRATION PATTERNS

### 3.1 Auto-Login After Registration

```typescript
authProvider.register = async ({ email, password }) => {
  // 1. Create account
  const res = await fetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  // 2. Auto-login
  localStorage.setItem("token", data.token);

  // 3. Return
  return {
    success: true,
    redirectTo: "/dashboard", // User vào app ngay!
  };
};
```

**Use case:** Apps muốn onboarding nhanh

---

### 3.2 Email Verification Required

```typescript
authProvider.register = async ({ email, password }) => {
  // 1. Create account (unverified)
  await fetch("/api/register", {
    method: "POST",
    body: JSON.stringify({ email, password, verified: false }),
  });

  // 2. Send verification email
  await fetch("/api/send-verification-email", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  // 3. Return
  return {
    success: true,
    redirectTo: "/verify-email",
    successNotification: {
      message: "Check your inbox",
      description: "We sent you a verification link",
    },
  };
};
```

**Use case:** Security-focused apps

---

### 3.3 Manual Approval Required

```typescript
authProvider.register = async ({ email, password }) => {
  // 1. Create account (pending approval)
  await fetch("/api/register", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      status: "pending",
    }),
  });

  // 2. Notify admin
  await fetch("/api/notify-admin", {
    method: "POST",
    body: JSON.stringify({ newUser: email }),
  });

  // 3. Return
  return {
    success: true,
    redirectTo: "/waiting-approval",
    successNotification: {
      message: "Application submitted",
      description: "We will review your request within 24 hours",
    },
  };
};
```

**Use case:** B2B apps, enterprise

---

### 3.4 Social Registration (OAuth)

```typescript
authProvider.register = async ({ provider }) => {
  // 1. Redirect to OAuth provider
  if (provider === "google") {
    window.location.href = "https://accounts.google.com/oauth...";
  }

  if (provider === "github") {
    window.location.href = "https://github.com/login/oauth...";
  }

  // OAuth callback will handle the rest
  return { success: true };
};
```

**Use case:** Consumer apps

---

## 4. TẠI SAO THIẾT KẾ NHƯ VẬY?

### 4.1 Flexibility for Any Registration Flow

```typescript
// Simple
register({ email, password });

// With profile
register({ email, password, firstName, lastName, phone });

// With terms acceptance
register({ email, password, acceptTerms: true });

// Multi-step
register({ step: 1, email, password });
```

### 4.2 Consistent UX

```typescript
// Mọi app đều:
// ✅ Show success notification
// ✅ Redirect appropriately
// ✅ Handle errors gracefully
// ✅ Invalidate cache if needed
```

### 4.3 Security Best Practices

```typescript
// Hook tự động:
// ✅ Call invalidateAuthStore (refresh permissions)
// ✅ Use setTimeout (avoid race conditions)
// ✅ Handle both success and error cases
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: Flexible registration methods
- ✅ **Validation**: Client + Server layers
- ✅ **Command**: Encapsulated flow
- ✅ **Template**: Consistent UX
- ✅ **Builder**: Multi-step support

### Key Benefits

1. **Flexible** - Any registration flow
2. **Secure** - Proper validation
3. **UX-focused** - Notifications, redirects
4. **Consistent** - Same behavior across apps
5. **Extensible** - Easy to add features

### Khi nào dùng useRegister?

✅ **Nên dùng:**

- Registration forms
- Sign-up flows
- Account creation
- User onboarding

❌ **Không dùng:**

- Login (use useLogin)
- Profile updates (use data hooks)
- Password reset (custom logic)
