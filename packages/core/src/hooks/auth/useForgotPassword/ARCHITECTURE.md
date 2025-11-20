# Kiến trúc và Design Patterns của useForgotPassword Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         PASSWORD RECOVERY FLOW                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  useForgotPassword ──→ Send Email               │  │
│  │        │                   │                     │  │
│  │        ▼                   ▼                     │  │
│  │  User clicks link ──→ useUpdatePassword         │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Password Recovery Initiator** - Bắt đầu quy trình khôi phục password
2. **Email Trigger** - Gửi email chứa reset link
3. **Token Generator** - Tạo token an toàn cho reset
4. **UX Manager** - Quản lý trải nghiệm người dùng trong flow

### 1.2 Complete Password Reset Flow

```
┌──────────────────────────────────────────────────────────────┐
│              COMPLETE PASSWORD RESET FLOW                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User forgot password                                │
│  → Clicks "Forgot Password?" on login page                   │
│  → Navigate to /forgot-password                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: User enters email                                   │
│  → Form: "Enter your email address"                          │
│  → Email: john@example.com                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Call useForgotPassword()                            │
│  const { mutate: forgotPassword } = useForgotPassword();    │
│  forgotPassword({ email: "john@example.com" });             │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: authProvider.forgotPassword()                       │
│  → Generate secure token (UUID/JWT)                          │
│  → Store token in database with expiry (15-60 minutes)       │
│  → Send email with reset link:                               │
│    "https://app.com/reset-password?token=abc123&email=..."   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Show success notification                           │
│  "Check your email!"                                         │
│  "We sent a password reset link to john@example.com"        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: User checks email                                   │
│  → Opens email                                               │
│  → Clicks reset link                                         │
│  → Navigate to /reset-password?token=abc123                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Reset password form                                 │
│  → Verify token validity (not expired, not used)             │
│  → Show "Set New Password" form                              │
│  → User enters new password                                  │
│  → Call useUpdatePassword() (see useUpdatePassword docs)     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: Complete!                                           │
│  → Password updated                                          │
│  → Redirect to /login                                        │
│  → User logs in with new password                            │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này là BƯỚC ĐẦU trong password recovery flow - chỉ gửi email, không reset password!

---

### 2.1 Command Pattern - Pattern "Lệnh"

_(Tương tự các auth hooks khác)_

#### 📧 VÍ DỤ: Gửi thư khiếu nại

```
Component: forgotPassword(email) → 1 lệnh
Hook: Làm TẤT CẢ
    → Validate email
    → Generate token
    → Send email
    → Show notification
    → Redirect confirmation
```

---

### 2.2 Async Communication Pattern - Pattern "Giao Tiếp Bất Đồng Bộ"

#### 📬 VÍ DỤ ĐỜI THƯỜNG: Gửi thư qua bưu điện

```
❌ SYNCHRONOUS (đồng bộ):
Bạn: "Tôi quên mật khẩu"
Hệ thống: "Đợi... đang reset..."
[5 giây sau]
Hệ thống: "OK, password mới là: XYZ123"
→ Không an toàn! Password qua mạng!

✅ ASYNCHRONOUS (bất đồng bộ):
Bạn: "Tôi quên mật khẩu ở john@example.com"
Hệ thống: "OK, đã gửi email!"
[Bạn đi làm việc khác...]
[Sau vài phút] Email đến hộp thư
→ An toàn! Token có expiry!
```

**Async Communication** = Không trả kết quả ngay, gửi qua kênh khác (email)

#### Tại sao không reset trực tiếp?

```typescript
// ❌ BAD - Reset ngay (không an toàn)
authProvider.forgotPassword = async ({ email }) => {
  const newPassword = generateRandomPassword();
  await updatePasswordInDB(email, newPassword);

  return {
    success: true,
    newPassword: newPassword, // 😱 Trả password qua network!
  };
};

// Vấn đề:
// 1. Password transmitted over network
// 2. Không verify ownership (ai cũng reset được)
// 3. User không chọn password

// ✅ GOOD - Send email with token
authProvider.forgotPassword = async ({ email }) => {
  const token = generateSecureToken(); // UUID hoặc JWT

  await storeToken(email, token, {
    expiresIn: "15m", // Hết hạn sau 15 phút
  });

  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    body: `Click here: https://app.com/reset?token=${token}`,
  });

  return {
    success: true,
    successNotification: {
      message: "Check your email",
      description: `We sent a reset link to ${email}`,
    },
  };
};

// Benefits:
// ✅ Token có expiry (security)
// ✅ Token one-time use (không reuse)
// ✅ Email proves ownership
// ✅ User chọn password mới
```

#### 💡 TẠI SAO quan trọng?

- ✅ Security (token instead of password)
- ✅ Proof of ownership (access to email)
- ✅ Time-limited (token expires)
- ✅ User control (choose new password)

---

### 2.3 Token Pattern - Pattern "Token Bảo Mật"

#### 🎫 VÍ DỤ ĐỜI THƯỜNG: Phiếu đổi quà

```
Shop tặng phiếu đổi quà:
- Phiếu số: #ABC123
- Hết hạn: 31/12/2024
- Chỉ dùng 1 lần

Token reset password tương tự:
- Token: "550e8400-e29b-41d4-a716-446655440000"
- Expires: 15 minutes
- One-time use only
```

**Token Pattern** = Temporary credential với constraints

#### Token Properties:

```typescript
interface ResetToken {
  token: string;          // Unique identifier
  email: string;          // For which user
  expiresAt: Date;        // Time limit
  used: boolean;          // One-time use
  createdAt: Date;        // Audit trail
}

// Backend stores:
{
  token: "550e8400-e29b-41d4-a716-446655440000",
  email: "john@example.com",
  expiresAt: "2024-01-20T15:30:00Z",  // 15 mins from now
  used: false,
  createdAt: "2024-01-20T15:15:00Z"
}
```

#### Token Validation:

```typescript
// When user clicks reset link
authProvider.validateResetToken = async ({ token }) => {
  const record = await db.resetTokens.findOne({ token });

  // Check 1: Token exists?
  if (!record) {
    throw new Error("Invalid token");
  }

  // Check 2: Not expired?
  if (new Date() > record.expiresAt) {
    throw new Error("Token expired. Request a new one.");
  }

  // Check 3: Not used?
  if (record.used) {
    throw new Error("Token already used");
  }

  return { valid: true, email: record.email };
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Time-limited (auto-expire)
- ✅ One-time use (prevent reuse)
- ✅ Auditable (track usage)
- ✅ Secure (random, hard to guess)

---

### 2.4 Email Template Pattern - Pattern "Mẫu Email"

#### 📝 VÍ DỤ: Professional email template

```html
<!-- Email Template -->
<!DOCTYPE html>
<html>
  <head>
    <style>
      /* Professional styling */
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Reset Your Password</h1>
      <p>Hi {{userName}},</p>
      <p>We received a request to reset your password.</p>

      <a href="{{resetLink}}" class="button"> Reset Password </a>

      <p>This link expires in {{expiryMinutes}} minutes.</p>

      <p>If you didn't request this, ignore this email.</p>

      <p>Best regards,<br />{{appName}} Team</p>
    </div>
  </body>
</html>
```

**Email Template** = Branded, professional email với variables

#### Implementation:

```typescript
authProvider.forgotPassword = async ({ email }) => {
  const user = await db.users.findOne({ email });
  const token = generateToken();

  const resetLink = `${process.env.APP_URL}/reset-password?token=${token}&email=${email}`;

  await emailService.send({
    to: email,
    template: "password-reset",
    variables: {
      userName: user.name,
      resetLink: resetLink,
      expiryMinutes: 15,
      appName: "MyApp",
    },
  });

  return { success: true };
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Professional appearance
- ✅ Consistent branding
- ✅ Clear instructions
- ✅ Reusable template

---

### 2.5 Rate Limiting Pattern - Pattern "Giới Hạn Tần Suất"

#### 🚦 VÍ DỜI THƯỜNG: Rút tiền ATM

```
ATM giới hạn:
- Tối đa 3 lần nhập sai PIN
- Sau 3 lần → Khóa thẻ
→ Ngăn chặn brute force!

Forgot Password giới hạn:
- Tối đa 3 requests / 15 phút
- After 3 → "Too many attempts"
→ Ngăn spam email!
```

**Rate Limiting** = Limit requests per time period

#### Implementation:

```typescript
// Backend tracking
const rateLimits = new Map<string, { count: number; resetAt: Date }>();

authProvider.forgotPassword = async ({ email }) => {
  const now = new Date();
  const limit = rateLimits.get(email);

  // Reset if time window passed
  if (limit && now > limit.resetAt) {
    rateLimits.delete(email);
  }

  // Check current limit
  const current = rateLimits.get(email);
  if (current && current.count >= 3) {
    throw new Error("Too many attempts. Try again in 15 minutes.");
  }

  // Increment counter
  rateLimits.set(email, {
    count: (current?.count || 0) + 1,
    resetAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 mins
  });

  // Send email...
  await sendResetEmail(email);

  return { success: true };
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Prevent spam
- ✅ Prevent brute force
- ✅ Protect email service
- ✅ Better UX (no email flood)

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                 | Ví dụ đời thường      | Giải quyết vấn đề gì     | Trong useForgotPassword |
| ----------------------- | --------------------- | ------------------------ | ----------------------- |
| **Command**             | Gửi khiếu nại         | Encapsulate flow         | mutation                |
| **Async Communication** | Gửi thư bưu điện      | Secure password recovery | Email with token        |
| **Token**               | Phiếu đổi quà         | Temporary credential     | Reset token             |
| **Email Template**      | Mẫu thư chuyên nghiệp | Professional emails      | Branded template        |
| **Rate Limiting**       | Giới hạn rút ATM      | Prevent abuse            | 3 requests/15min        |

---

## 3. SECURITY CONSIDERATIONS

### 3.1 Token Security

```typescript
// Generate cryptographically secure token
import { randomUUID } from "crypto";

const token = randomUUID();
// → "550e8400-e29b-41d4-a716-446655440000"

// Or use JWT
const token = jwt.sign({ email, purpose: "password-reset" }, SECRET_KEY, {
  expiresIn: "15m",
});
```

### 3.2 Email Enumeration Prevention

```typescript
// ❌ BAD - Reveals if email exists
if (!userExists) {
  return {
    success: false,
    error: "Email not found", // 😱 Attacker learns email doesn't exist
  };
}

// ✅ GOOD - Same response for existing/non-existing
authProvider.forgotPassword = async ({ email }) => {
  const user = await db.users.findOne({ email });

  if (user) {
    // Send real email
    await sendResetEmail(email, token);
  } else {
    // Don't send email, but pretend we did!
    // (prevents email enumeration attack)
  }

  // Same response either way
  return {
    success: true,
    successNotification: {
      message: "Check your email",
      description: "If account exists, reset link was sent",
    },
  };
};
```

### 3.3 Token Expiry

```typescript
// Short expiry = better security
const EXPIRY_MINUTES = 15; // Not too long, not too short

// Cleanup expired tokens (cron job)
cron.schedule("*/5 * * * *", async () => {
  await db.resetTokens.deleteMany({
    expiresAt: { $lt: new Date() },
  });
});
```

---

## 4. COMMON USE CASES

### 4.1 Simple Forgot Password Form

```typescript
function ForgotPasswordPage() {
  const { mutate: forgotPassword, isLoading } = useForgotPassword();

  const handleSubmit = (values: { email: string }) => {
    forgotPassword(values);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h1>Forgot Password?</h1>
      <p>Enter your email and we'll send reset instructions</p>

      <input type="email" name="email" placeholder="your@email.com" required />

      <button disabled={isLoading}>
        {isLoading ? "Sending..." : "Send Reset Link"}
      </button>

      <Link to="/login">Back to Login</Link>
    </form>
  );
}
```

### 4.2 With Custom Success Redirect

```typescript
function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { mutate: forgotPassword } = useForgotPassword({
    mutationOptions: {
      onSuccess: () => {
        // Redirect to confirmation page
        navigate("/forgot-password/check-email");
      },
    },
  });

  // ...
}
```

### 4.3 Confirmation Page

```typescript
function CheckEmailPage() {
  return (
    <div>
      <h1>Check Your Email</h1>
      <p>We sent password reset instructions to your email.</p>
      <p>The link expires in 15 minutes.</p>

      <h3>Didn't receive?</h3>
      <ul>
        <li>Check spam folder</li>
        <li>Wait a few minutes</li>
        <li>
          <Link to="/forgot-password">Try again</Link>
        </li>
      </ul>
    </div>
  );
}
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: Simple API
- ✅ **Async Communication**: Secure via email
- ✅ **Token**: Time-limited credential
- ✅ **Email Template**: Professional UX
- ✅ **Rate Limiting**: Prevent abuse

### Security Best Practices

1. **Secure tokens** (UUID/JWT)
2. **Short expiry** (15-60 minutes)
3. **One-time use** (mark as used)
4. **Rate limiting** (prevent spam)
5. **Email enumeration prevention** (same response)
6. **HTTPS only** (encrypt transmission)

### Key Features

1. **User-friendly** - Simple email flow
2. **Secure** - Token-based
3. **Time-limited** - Auto-expire
4. **Professional** - Branded emails
5. **Protected** - Rate limiting

### Khi nào dùng useForgotPassword?

✅ **Nên dùng:**

- "Forgot Password?" link on login
- Password recovery flow
- Account recovery

❌ **Không dùng:**

- Change password while logged in (use useUpdatePassword)
- Initial password set (use useRegister or admin flow)
- Force password change (use useUpdatePassword with flag)

### Complete Flow

1. **useForgotPassword** → Send email with token
2. User clicks email link
3. **useUpdatePassword** → Set new password
4. Done!

### Remember

📧 **Chỉ gửi email** - Không reset password ngay!
🔒 **Token có expiry** - Hết hạn sau 15-60 phút
🚫 **Rate limiting** - Ngăn spam
✅ **Professional emails** - Use templates
