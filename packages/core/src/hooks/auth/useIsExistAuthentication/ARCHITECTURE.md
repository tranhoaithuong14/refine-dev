# Kiến trúc và Design Patterns của useIsExistAuthentication Hook

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
│              ┌───────────▼────────────┐                │
│              │ useIsExistAuth ◄───────┼─ INTERNAL     │
│              │ (Config Check)         │                │
│              └────────────────────────┘                │
│                          │                             │
│                   Used by framework                    │
│                   internally only                      │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Configuration Validator** - Kiểm tra authProvider có được cấu hình không
2. **Feature Detector** - Phát hiện auth features có available không
3. **Conditional Renderer** - Giúp UI quyết định hiển thị auth components
4. **Internal Guard** - Hook nội bộ, không dùng trực tiếp trong app

> **⚠️ QUAN TRỌNG:** Hook này là **@internal** - chỉ dùng trong framework, không phải public API cho developers!

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                    FRAMEWORK INITIALIZATION                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Developer cấu hình Refine                           │
│                                                              │
│  <Refine                                                     │
│    authProvider={myAuthProvider}  ← Có hoặc không có        │
│    dataProvider={...}                                        │
│  />                                                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Framework kiểm tra auth features                    │
│                                                              │
│  const hasAuth = useIsExistAuthentication();                │
│  → true: authProvider provided                              │
│  → false: no authProvider                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Conditional rendering trong framework               │
│                                                              │
│  if (hasAuth) {                                              │
│    // Show login button                                     │
│    // Enable protected routes                               │
│    // Show user menu                                        │
│  } else {                                                    │
│    // Hide auth UI                                          │
│    // All routes public                                     │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này cực kỳ đơn giản (12 dòng code) nhưng áp dụng nhiều patterns quan trọng.

---

### 2.1 Feature Detection Pattern - Pattern "Phát Hiện Tính Năng"

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Kiểm tra tính năng ô tô

Khi thuê xe, check xem xe có tính năng không:

```
Kiểm tra: Xe có GPS không?
→ Có? → Hiển thị nút "Navigation"
→ Không? → Ẩn nút, không crash

Kiểm tra: Xe có camera lùi không?
→ Có? → Hiển thị màn hình khi lùi
→ Không? → Không hiện gì, vẫn chạy được
```

**Feature Detection** = Check tính năng có hay không, rồi adjust behavior

#### ❌ KHÔNG có Feature Detection:

```typescript
// BAD - Assume authProvider luôn tồn tại

function LoginButton() {
  const { mutate: login } = useLogin();
  // 💥 CRASH nếu không có authProvider!

  return <button onClick={() => login()}>Login</button>;
}

// App crashes:
// Error: authProvider is undefined
```

**Vấn đề:**

- ❌ Crash khi không có auth
- ❌ Không flexible
- ❌ Buộc phải có auth

#### ✅ CÓ Feature Detection:

```typescript
// GOOD - Check trước khi dùng

function LoginButton() {
  const hasAuth = useIsExistAuthentication();

  if (!hasAuth) {
    return null; // Không hiển thị nếu không có auth
  }

  const { mutate: login } = useLogin();
  return <button onClick={() => login()}>Login</button>;
}

// Không crash! App vẫn chạy ngon!
```

#### Trong Framework:

```typescript
// Refine internally uses this pattern

function Header() {
  const hasAuth = useIsExistAuthentication();

  return (
    <div>
      <Logo />
      {hasAuth && <UserMenu />} {/* Conditional */}
      {hasAuth && <LogoutButton />}
    </div>
  );
}
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│  CHECK: authProvider exists?        │
└─────────────────────────────────────┘
              │
              ├─ YES → Show auth UI
              │        Enable auth features
              │
              └─ NO  → Hide auth UI
                       Public-only mode
```

#### 💡 TẠI SAO quan trọng?

- ✅ Không crash khi missing config
- ✅ Graceful degradation
- ✅ Optional auth support

---

### 2.2 Null Object Pattern - Pattern "Đối Tượng Rỗng"

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Remote TV không có pin

```
❌ BAD:
Bấm nút → Kiểm tra pin → Không có → CRASH!

✅ GOOD (Null Object):
Bấm nút → Không có pin → Không làm gì (nhưng không crash)
```

**Null Object** = Thay vì null/undefined, dùng object "rỗng" an toàn

#### Implementation:

```typescript
// Framework provides safe defaults

// Scenario 1: authProvider provided
<Refine authProvider={myAuthProvider} />
→ useIsExistAuthentication() = true

// Scenario 2: No authProvider
<Refine />
→ useIsExistAuthentication() = false
→ Framework still works! (public mode)
```

#### 💡 TẠI SAO quan trọng?

- ✅ An toàn, không crash
- ✅ Framework hoạt động với/không auth
- ✅ Better developer experience

---

### 2.3 Guard Pattern - Pattern "Người Gác Cổng"

#### 🚪 VÍ DỤ ĐỜI THƯỜNG: Bảo vệ cổng công ty

```
Trước khi vào:
→ Có thẻ? → Cho vào
→ Không? → Yêu cầu đăng ký khách

Code:
→ Có auth? → Enable protected features
→ Không? → Disable, show public only
```

**Guard** = Check điều kiện trước khi thực thi

#### Trong Refine:

```typescript
// Internal framework code

function ProtectedRoute({ children }) {
  const hasAuth = useIsExistAuthentication();

  if (!hasAuth) {
    // No auth system → all routes public
    return children;
  }

  // Has auth → check permissions
  return <AuthGuard>{children}</AuthGuard>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Tránh logic chạy khi không cần
- ✅ Performance (skip unnecessary checks)
- ✅ Clean code flow

---

### 2.4 Configuration Pattern - Pattern "Cấu Hình"

#### ⚙️ VÍ DỤ ĐỜI THƯỜNG: Cài đặt điện thoại

```
Cài đặt:
- WiFi: Bật/Tắt
- Bluetooth: Bật/Tắt
- GPS: Bật/Tắt

Mỗi tính năng có thể enable/disable
```

**Configuration** = App behavior thay đổi theo config

#### Refine Configurations:

```typescript
// Config 1: Full features (auth + data)
<Refine
  authProvider={myAuthProvider}  ← Auth enabled
  dataProvider={myDataProvider}
/>

// Config 2: Public app (data only)
<Refine
  dataProvider={myDataProvider}  ← No auth
/>

// Config 3: Custom setup
<Refine
  authProvider={simpleAuthProvider}
  dataProvider={myDataProvider}
  accessControlProvider={rbacProvider}
/>
```

#### Hook Usage:

```typescript
export const useIsExistAuthentication = () => {
  const { isProvided } = useAuthProviderContext();
  return Boolean(isProvided);
  // ↑ Reflects configuration choice
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Flexible app setup
- ✅ Optional features
- ✅ Pay for what you use

---

### 2.5 Encapsulation Pattern - Pattern "Đóng Gói"

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Thư viện API

```
❌ BAD - Lộ implementation chi tiết:
const authContext = useContext(AuthContext);
const hasAuth = authContext?.provider?.isProvided?.() === true;

✅ GOOD - Encapsulated:
const hasAuth = useIsExistAuthentication();
// Đơn giản, dễ dùng, ẩn chi tiết!
```

**Encapsulation** = Ẩn complexity, expose simple API

#### Implementation:

```typescript
// INTERNAL complexity (hidden)
export const useIsExistAuthentication = () => {
  const { isProvided } = useAuthProviderContext();
  // Complex: Access context, check field, convert to boolean

  return Boolean(isProvided);
  // EXTERNAL: Simple boolean
};

// Usage
const hasAuth = useIsExistAuthentication();
// ↑ Developer không cần biết context, isProvided là gì
```

#### 💡 TẠI SAO quan trọng?

- ✅ Simple API
- ✅ Ẩn implementation details
- ✅ Dễ maintain (change internal without breaking external)

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern               | Ví dụ đời thường   | Giải quyết vấn đề gì         | Trong useIsExistAuthentication |
| --------------------- | ------------------ | ---------------------------- | ------------------------------ |
| **Feature Detection** | Kiểm tra GPS ô tô  | Check tính năng có hay không | Check authProvider exists      |
| **Null Object**       | Remote không pin   | Tránh null crashes           | Safe default behavior          |
| **Guard**             | Bảo vệ cổng        | Check trước khi thực thi     | Protect auth features          |
| **Configuration**     | Cài đặt điện thoại | Enable/disable features      | Auth optional                  |
| **Encapsulation**     | API wrapper        | Ẩn complexity                | Simple boolean return          |

---

## 3. KIẾN TRÚC CHI TIẾT

### 3.1 Code Flow

```typescript
// 1. Context provides auth state
<AuthContext.Provider value={{ isProvided: true }}>
  <App />
</AuthContext.Provider>;

// 2. Hook accesses context
const { isProvided } = useAuthProviderContext();
//                     ↑ Get from context

// 3. Convert to boolean
return Boolean(isProvided);
//     ↑ Ensure true/false (not undefined/null)

// 4. Usage
const hasAuth = useIsExistAuthentication();
// → true or false
```

### 3.2 Use Cases

#### Use Case 1: Conditional UI

```typescript
function Header() {
  const hasAuth = useIsExistAuthentication();

  return (
    <header>
      <Logo />
      {hasAuth && <UserMenu />}
      {hasAuth && <LogoutButton />}
      {!hasAuth && <PublicLinks />}
    </header>
  );
}
```

#### Use Case 2: Route Protection

```typescript
function RouteGuard({ children }) {
  const hasAuth = useIsExistAuthentication();

  if (!hasAuth) {
    // Public-only mode: all routes accessible
    return children;
  }

  // Auth mode: check permissions
  return <PermissionCheck>{children}</PermissionCheck>;
}
```

#### Use Case 3: Feature Flags

```typescript
function App() {
  const hasAuth = useIsExistAuthentication();

  return (
    <div>
      {hasAuth && <AuthDashboard />}
      {!hasAuth && <PublicDashboard />}
    </div>
  );
}
```

---

## 4. TẠI SAO THIẾT KẾ NHƯ VẬY?

### 4.1 Optional Auth Support

**Vấn đề:** Không phải app nào cũng cần auth

```typescript
// Some apps are public-only
<Refine dataProvider={publicDataProvider} />
// No login, no permissions, just data

// Framework should support this! ✅
```

**Giải pháp:** Check if auth exists

```typescript
const hasAuth = useIsExistAuthentication();
// false → Framework adapts to public mode
```

### 4.2 Graceful Degradation

**Vấn đề:** Missing config shouldn't crash

**Giải pháp:**

```typescript
// Framework internally checks
if (hasAuth) {
  // Use auth features
} else {
  // Gracefully skip auth
}
```

### 4.3 Developer Experience

**Simple API:**

```typescript
// ❌ Complex
const hasAuth = Boolean(useContext(AuthContext)?.isProvided);

// ✅ Simple
const hasAuth = useIsExistAuthentication();
```

---

## 5. KHI NÀO DÙNG HOOK NÀY?

### ⚠️ INTERNAL HOOK - Không dùng trực tiếp!

Đây là **@internal** hook của framework. Developers KHÔNG nên dùng trực tiếp trong app code.

### Framework Internal Usage:

```typescript
// ✅ Framework code (OK)
function InternalComponent() {
  const hasAuth = useIsExistAuthentication();
  // ...
}

// ❌ Your app code (DON'T!)
function MyComponent() {
  const hasAuth = useIsExistAuthentication();
  // Use public APIs instead!
}
```

### Thay vào đó, dùng:

```typescript
// Public alternative
function MyComponent() {
  try {
    const { data } = useGetIdentity();
    // If no error → auth exists
  } catch {
    // No auth
  }
}
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Feature Detection**: Check auth availability
- ✅ **Null Object**: Safe defaults
- ✅ **Guard**: Protect features
- ✅ **Configuration**: Flexible setup
- ✅ **Encapsulation**: Simple API

### Key Characteristics

1. **Internal** - Framework use only
2. **Simple** - 12 lines of code
3. **Essential** - Enables optional auth
4. **Safe** - No crashes
5. **Boolean** - Clear true/false

### Tại sao có hook này?

- ✅ Support apps without auth
- ✅ Graceful degradation
- ✅ Clean internal code
- ✅ Better developer experience
- ✅ Flexible framework architecture

### Remember

🚫 **Đây là INTERNAL hook** - Không dùng trong app code!
✅ Framework tự động handle auth detection
✅ Developers chỉ cấu hình authProvider (hoặc không)
