# Kiến trúc và Design Patterns của useUpdatePassword Hook

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
│              │ useUpdatePassword      │ ← THIS HOOK   │
│              │ (Password Change)      │                │
│              └────────────────────────┘                │
│                          │                             │
│              Used by: Profile Settings                 │
│                       Password Reset Flow               │
│                       Admin User Management             │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Password Manager** - Quản lý việc đổi password
2. **Security Handler** - Xử lý bảo mật password updates
3. **Token Refresher** - Có thể trigger token refresh
4. **Flow Orchestrator** - Điều phối password change flow

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                   PASSWORD UPDATE FLOW                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User triggers password change                       │
│  Scenario A: Settings page (logged in)                      │
│  Scenario B: Password reset link (from email)                │
│  Scenario C: First-time login (force change)                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: User fills form                                     │
│  → Current password (if logged in)                           │
│  → New password                                              │
│  → Confirm new password                                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Client-side validation                              │
│  → Passwords match?                                          │
│  → Strong enough? (length, complexity)                       │
│  → Different from old? (if required)                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Call authProvider.updatePassword()                  │
│  → Merge URL params + form values                            │
│  → POST to /api/update-password                              │
│  → Verify current password (backend)                         │
│  → Hash new password                                         │
│  → Update database                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Handle response                                     │
│  Success:                                                    │
│  → Show success notification                                 │
│  → Optional: Invalidate old sessions                         │
│  → Optional: Redirect to login (re-auth)                     │
│  → Optional: Stay logged in (new token)                      │
│                                                              │
│  Error:                                                      │
│  → Show error notification                                   │
│  → User can retry                                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này liên quan đến SECURITY - password là tài sản quan trọng nhất!

---

### 2.1 Command Pattern - Pattern "Lệnh"

_(Tương tự useLogin/useRegister - đã giải thích)_

#### 🔐 VÍ DỤ: Đổi khóa nhà

```
Component: updatePassword(newPassword) → 1 lệnh
Hook: Làm TẤT CẢ
    → Verify current password
    → Validate new password
    → Update database
    → Invalidate old sessions
    → Show notification
    → Redirect if needed
```

---

### 2.2 Parameter Merging Pattern - Pattern "Gộp Tham Số"

#### 🔗 VÍ DỤ ĐỜI THƯỜNG: Reset password via email link

```
User clicks email link:
https://app.com/reset-password?token=abc123&email=user@example.com

Form submit với:
{ newPassword: "SecurePass123!" }

Hook merges:
{
  token: "abc123",          ← From URL
  email: "user@example.com", ← From URL
  newPassword: "SecurePass123!" ← From form
}
```

**Parameter Merging** = Combine URL params + form data

#### ❌ KHÔNG có Merging:

```typescript
// BAD - Manual merging everywhere

function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const { mutate: updatePassword } = useUpdatePassword();

  const handleSubmit = (values) => {
    // 😱 Phải manually merge!
    updatePassword({
      token: searchParams.get("token"),
      email: searchParams.get("email"),
      newPassword: values.newPassword,
    });
  };
}

// Duplicate logic mọi nơi!
```

**Vấn đề:**

- ❌ Duplicate code
- ❌ Easy to forget params
- ❌ Hard to maintain

#### ✅ CÓ Parameter Merging:

```typescript
// GOOD - Auto merge trong hook

function ResetPasswordPage() {
  const { mutate: updatePassword } = useUpdatePassword();

  const handleSubmit = (values) => {
    // 😊 Chỉ cần pass form values!
    updatePassword(values);
    // Hook tự động merge URL params (token, email...)
  };
}

// Hook internal:
mutationFn: async (variables) => {
  return updatePasswordFromContext?.({
    ...params, // ← URL params (token, email)
    ...variables, // ← Form values (newPassword)
  });
};
```

#### Real-world Scenarios:

```typescript
// Scenario 1: Password reset from email
// URL: /reset?token=xyz&email=user@example.com
updatePassword({ newPassword: "NewPass123" });
// Merged: { token, email, newPassword }

// Scenario 2: Change password in settings
// URL: /settings/security
updatePassword({
  currentPassword: "OldPass",
  newPassword: "NewPass",
});
// Merged: { currentPassword, newPassword }

// Scenario 3: First-time password set
// URL: /welcome?userId=123
updatePassword({ newPassword: "FirstPass" });
// Merged: { userId, newPassword }
```

#### 💡 TẠI SAO quan trọng?

- ✅ Clean component code
- ✅ Auto handle URL params
- ✅ Flexible for different flows

---

### 2.3 Strategy Pattern - Pattern "Chiến Lược"

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Các cách đổi khóa

```
Strategy 1: Đổi khóa tại chỗ
→ Unlock cửa → Thay khóa → Lock lại
→ Không cần chìa mới

Strategy 2: Đổi cả cylinder
→ Tháo cả ổ khóa → Lắp ổ mới
→ Cần chìa mới

Strategy 3: Smart lock
→ Change password remotely
→ Update mobile app
```

**Strategy** = Mỗi app có cách update password khác nhau

#### Implementation Strategies:

```typescript
// Strategy 1: Simple Update (Stay Logged In)
authProvider.updatePassword = async ({ currentPassword, newPassword }) => {
  const res = await fetch("/api/update-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    throw new Error("Wrong current password");
  }

  return {
    success: true,
    successNotification: {
      message: "Password updated",
      description: "Your password has been changed successfully",
    },
  };
};

// Strategy 2: Re-authentication Required
authProvider.updatePassword = async (params) => {
  await fetch("/api/update-password", {
    method: "POST",
    body: JSON.stringify(params),
  });

  // Force re-login
  localStorage.removeItem("token");

  return {
    success: true,
    redirectTo: "/login",
    successNotification: {
      message: "Password updated",
      description: "Please login with your new password",
    },
  };
};

// Strategy 3: Token Reset (From Email Link)
authProvider.updatePassword = async ({ token, email, newPassword }) => {
  const res = await fetch("/api/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, email, newPassword }),
  });

  const data = await res.json();

  // Auto-login with new token
  localStorage.setItem("token", data.newToken);

  return {
    success: true,
    redirectTo: "/dashboard",
    successNotification: {
      message: "Password set successfully",
      description: "You can now use your new password",
    },
  };
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Flexible flows
- ✅ Support different UX patterns
- ✅ Framework-agnostic

---

### 2.4 Validation Pattern - Pattern "Kiểm Tra"

#### ✅ VÍ DỤ: Password strength requirements

```
Weak password check:
❌ "123456" → Too simple!
❌ "password" → Common word!
❌ "abc" → Too short!

Strong password:
✅ "MyP@ssw0rd2024!" → Good!
   - Minimum 8 characters ✅
   - Has uppercase ✅
   - Has lowercase ✅
   - Has number ✅
   - Has special char ✅
```

**Validation** = Ensure password meets requirements

#### Multi-layer Validation:

```typescript
// Layer 1: CLIENT-SIDE (Fast feedback)
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Need uppercase")
      .regex(/[a-z]/, "Need lowercase")
      .regex(/[0-9]/, "Need number")
      .regex(/[^A-Za-z0-9]/, "Need special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different",
  });

// Layer 2: SERVER-SIDE (Security)
authProvider.updatePassword = async (params) => {
  const res = await fetch("/api/update-password", {
    method: "POST",
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const error = await res.json();
    // Backend errors:
    // - "Current password incorrect"
    // - "New password too similar to old"
    // - "Password in breach database"
    throw new Error(error.message);
  }

  return { success: true };
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ UX (client-side fast feedback)
- ✅ Security (server-side enforcement)
- ✅ Data integrity

---

### 2.5 Notification Pattern - Pattern "Thông Báo"

#### 🔔 VÍ DỤ: Password change notifications

```
Success notification:
✅ "Password Updated"
   "Your password has been changed successfully.
    Use it on your next login."

Error notification:
❌ "Update Failed"
   "Current password is incorrect.
    Please try again."
```

**Notification** = Inform user of outcome

#### Implementation:

```typescript
const mutation = useMutation({
  mutationFn: updatePasswordFromContext,

  onSuccess: ({ success, error, successNotification }) => {
    if (success) {
      // Close previous errors
      close?.("update-password-error");

      // Show success
      open?.({
        type: "success",
        message: successNotification?.message || "Updated!",
        description: successNotification?.description,
      });
    }

    if (error) {
      // Show error with details
      open?.({
        type: "error",
        message: "Update Failed",
        description: error.message,
      });
    }
  },

  onError: (error) => {
    // Network/unexpected errors
    open?.({
      type: "error",
      message: "Something went wrong",
      description: error.message,
    });
  },
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ User feedback
- ✅ Clear error messages
- ✅ Better UX

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern               | Ví dụ đời thường        | Giải quyết vấn đề gì     | Trong useUpdatePassword    |
| --------------------- | ----------------------- | ------------------------ | -------------------------- |
| **Command**           | Đổi khóa nhà            | Encapsulate complex flow | mutation encapsulates all  |
| **Parameter Merging** | Email reset link        | Combine URL + form data  | params + variables         |
| **Strategy**          | Cách đổi khóa khác nhau | Different update flows   | authProvider strategies    |
| **Validation**        | Password strength       | Ensure security          | Client + Server validation |
| **Notification**      | Inform outcome          | User feedback            | Success/error toasts       |

---

## 3. SECURITY BEST PRACTICES

### 3.1 Password Strength Requirements

```typescript
// Minimum requirements
const passwordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  preventCommon: true, // Block "password123"
  preventUserInfo: true, // Block using email/name
};
```

### 3.2 Rate Limiting

```typescript
// Backend should implement
authProvider.updatePassword = async (params) => {
  const res = await fetch("/api/update-password", {
    method: "POST",
    body: JSON.stringify(params),
  });

  if (res.status === 429) {
    throw new Error("Too many attempts. Try again in 5 minutes.");
  }

  // ...
};

// Prevent brute force attacks
```

### 3.3 Session Invalidation

```typescript
// After password change, invalidate old sessions
authProvider.updatePassword = async (params) => {
  await fetch("/api/update-password", {
    method: "POST",
    body: JSON.stringify(params),
  });

  // Invalidate all other sessions
  await fetch("/api/invalidate-sessions", {
    method: "POST",
  });

  return { success: true };
};
```

### 3.4 Audit Logging

```typescript
// Log password changes for security
authProvider.updatePassword = async (params) => {
  const result = await fetch("/api/update-password", {
    method: "POST",
    body: JSON.stringify(params),
  });

  // Log event
  await fetch("/api/audit-log", {
    method: "POST",
    body: JSON.stringify({
      event: "PASSWORD_CHANGED",
      userId: getCurrentUserId(),
      timestamp: new Date(),
      ipAddress: getClientIP(),
    }),
  });

  return result;
};
```

---

## 4. COMMON USE CASES

### 4.1 Change Password in Settings

```typescript
function PasswordSettings() {
  const { mutate: updatePassword, isLoading } = useUpdatePassword();

  const handleSubmit = (values) => {
    updatePassword({
      currentPassword: values.current,
      newPassword: values.new,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="password" name="current" placeholder="Current" />
      <input type="password" name="new" placeholder="New" />
      <input type="password" name="confirm" placeholder="Confirm" />
      <button disabled={isLoading}>Update Password</button>
    </form>
  );
}
```

### 4.2 Password Reset from Email

```typescript
// URL: /reset-password?token=abc123&email=user@example.com

function ResetPasswordPage() {
  const { mutate: updatePassword } = useUpdatePassword();

  const handleSubmit = (values) => {
    // Hook auto-merges token & email from URL!
    updatePassword({
      newPassword: values.password,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="password" name="password" placeholder="New Password" />
      <input type="password" name="confirm" placeholder="Confirm" />
      <button>Set Password</button>
    </form>
  );
}
```

### 4.3 Force Password Change

```typescript
function ForcePasswordChange() {
  const { mutate: updatePassword } = useUpdatePassword();

  useEffect(() => {
    // Show modal forcing password change
    // (e.g., first login, expired password)
  }, []);

  const handleSubmit = (values) => {
    updatePassword(
      { newPassword: values.password },
      {
        onSuccess: () => {
          // Continue to app after change
          navigate("/dashboard");
        },
      },
    );
  };

  return <ForceChangeModal onSubmit={handleSubmit} />;
}
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: Encapsulated password update
- ✅ **Parameter Merging**: Auto-combine URL + form
- ✅ **Strategy**: Flexible update flows
- ✅ **Validation**: Multi-layer security
- ✅ **Notification**: Clear user feedback

### Security Best Practices

1. **Strong password requirements**
2. **Rate limiting** (prevent brute force)
3. **Session invalidation** (logout other devices)
4. **Audit logging** (track changes)
5. **HTTPS only** (encrypt transmission)

### Key Features

1. **Flexible** - Multiple update flows
2. **Secure** - Validation + encryption
3. **User-friendly** - Clear notifications
4. **Auto-merge** - URL params + form data
5. **Customizable** - Custom mutation options

### Khi nào dùng useUpdatePassword?

✅ **Nên dùng:**

- Settings page (change password)
- Password reset flow (from email)
- First-time password set
- Force password change
- Admin reset user password

❌ **Không dùng:**

- Forgot password (use custom flow → email → reset)
- Initial registration (use useRegister)
- Login (use useLogin)

### Remember

🔐 **SECURITY CRITICAL** - Password là tài sản quan trọng nhất!
✅ Always validate client + server side
✅ Use HTTPS for transmission
✅ Hash passwords (never store plain text)
✅ Implement rate limiting
✅ Log security events
