# Kiến trúc và Design Patterns của useInvalidateAuthStore Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           AUTH LIFECYCLE                         │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  useLogin ──────┐                                │  │
│  │  useLogout ─────┼─→ useInvalidateAuthStore       │  │
│  │  useRegister ───┘    (Clear Auth Cache)         │  │
│  │                           │                      │  │
│  │                           ▼                      │  │
│  │                    Invalidate:                   │  │
│  │                    - check                       │  │
│  │                    - identity                    │  │
│  │                    - permissions                 │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Cache Invalidator** - Xóa auth cache cũ
2. **State Refresher** - Force refetch fresh data
3. **Cleanup Manager** - Dọn dẹp sau auth changes
4. **Synchronization Trigger** - Trigger UI updates across app

> **⚠️ INTERNAL HOOK** - Chỉ dùng trong framework, không phải public API!

### 1.2 Khi nào hook này được gọi?

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTH STATE CHANGES                        │
└──────────────────────────────────────────────────────────────┘

SCENARIO 1: LOGIN
User login → Store token → invalidateAuthStore()
→ Clear old "check" cache
→ Clear old "identity" cache
→ Clear old "permissions" cache
→ Components refetch → Show user data

SCENARIO 2: LOGOUT
User logout → Remove token → invalidateAuthStore()
→ Clear all auth caches
→ Components refetch → Show logged-out state

SCENARIO 3: REGISTER
User register → Create account → invalidateAuthStore()
→ Clear caches
→ Fetch new user data

SCENARIO 4: TOKEN REFRESH
Token refreshed → invalidateAuthStore()
→ Force revalidate session
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này nhỏ (20 dòng) nhưng CỰC KỲ quan trọng - không có nó, UI sẽ show data cũ!

---

### 2.1 Cache Invalidation Pattern - Pattern "Hủy Cache"

#### 🗑️ VÍ DỤ ĐỜI THƯỜNG: Cập nhật menu nhà hàng

```
Nhà hàng in menu:
Menu cũ: Phở 50k, Bún 40k

Chủ tăng giá:
Phở 60k, Bún 50k

❌ BAD - Không xóa menu cũ:
Khách vẫn thấy: Phở 50k
Order → Nhân viên: "Giá mới 60k rồi!"
→ Khách bực!

✅ GOOD - Invalidate (xóa menu cũ):
Chủ: Xé menu cũ đi!
Khách: "Cho xem menu"
Nhân viên: "Chờ in menu mới..."
→ Khách thấy giá đúng!
```

**Cache Invalidation** = Xóa dữ liệu cũ, buộc fetch lại

#### ❌ KHÔNG có Cache Invalidation:

```typescript
// BAD - Không invalidate cache

function handleLogin() {
  const { mutate: login } = useLogin();

  login(credentials);
  // 😱 Login thành công nhưng...

  // Components vẫn dùng cache CŨ:
  const { data: oldUserData } = useGetIdentity();
  // → Show thông tin user cũ!

  const { data: oldPermissions } = usePermissions();
  // → Show permissions cũ!

  // 😭 UI sai! User mới nhưng hiện data cũ!
}
```

**Vấn đề:**

- ❌ UI show stale data
- ❌ User confused
- ❌ Security risk (wrong permissions)

#### ✅ CÓ Cache Invalidation:

```typescript
// GOOD - Invalidate after auth change

// Trong useLogin hook:
onSuccess: () => {
  // Clear all auth caches
  invalidateAuthStore();

  //→ useGetIdentity() refetch
  //→ usePermissions() refetch
  //→ useIsAuthenticated() refetch

  // → UI shows FRESH data! ✅
};
```

#### Implementation:

```typescript
const invalidate = async () => {
  await Promise.all([
    // Invalidate check cache
    queryClient.invalidateQueries({
      queryKey: ["auth", "action", "check"],
    }),

    // Invalidate identity cache
    queryClient.invalidateQueries({
      queryKey: ["auth", "action", "identity"],
    }),

    // Invalidate permissions cache
    queryClient.invalidateQueries({
      queryKey: ["auth", "action", "permissions"],
    }),
  ]);

  // → All auth queries refetch simultaneously!
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ UI always shows fresh data
- ✅ No stale state bugs
- ✅ Security (correct permissions)

---

### 2.2 Parallel Execution Pattern - Pattern "Thực Thi Song Song"

#### ⚡ VÍ DỤ ĐỜI THƯỜNG: Giặt quần áo

```
Bạn có 3 máy giặt:

❌ SEQUENTIAL (tuần tự):
Máy 1: Giặt áo → 30 phút
Máy 2: Giặt quần → 30 phút
Máy 3: Giặt khăn → 30 phút
Total: 90 phút ⏰

✅ PARALLEL (song song):
Máy 1: Giặt áo ┐
Máy 2: Giặt quần├→ Cùng lúc!
Máy 3: Giặt khăn┘
Total: 30 phút ⚡ (3x faster!)
```

**Parallel Execution** = Làm nhiều việc cùng lúc

#### ❌ SEQUENTIAL Invalidation:

```typescript
// BAD - Invalidate lần lượt

const invalidate = async () => {
  // 😱 Chờ từng cái!
  await queryClient.invalidateQueries({
    queryKey: ["auth", "check"],
  }); // 100ms

  await queryClient.invalidateQueries({
    queryKey: ["auth", "identity"],
  }); // 100ms

  await queryClient.invalidateQueries({
    queryKey: ["auth", "permissions"],
  }); // 100ms

  // Total: 300ms 😭
};
```

**Vấn đề:**

- ❌ Slow (3x slower)
- ❌ Poor UX (loading longer)

#### ✅ PARALLEL Invalidation:

```typescript
// GOOD - Invalidate cùng lúc

const invalidate = async () => {
  await Promise.all([
    // ⚡ Chạy ĐỒNG THỜI!
    queryClient.invalidateQueries({
      queryKey: ["auth", "check"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["auth", "identity"],
    }),

    queryClient.invalidateQueries({
      queryKey: ["auth", "permissions"],
    }),
  ]);

  // Total: ~100ms ✅ (3x faster!)
};
```

#### Visualization:

```
SEQUENTIAL:
─[check]─────[identity]─────[permissions]─
0ms        100ms         200ms          300ms

PARALLEL:
─[check──────]─
─[identity───]─  ← All start at same time!
─[permissions]─
0ms          100ms
```

#### 💡 TẠI SAO quan trọng?

- ✅ Fast (parallel execution)
- ✅ Better UX (shorter loading)
- ✅ Efficient resource usage

---

### 2.3 Cleanup Pattern - Pattern "Dọn Dẹp"

#### 🧹 VÍ DỤ ĐỜI THƯỜNG: Dọn phòng khi chuyển nhà

```
Chuyển từ nhà cũ → nhà mới:

❌ BAD - Không dọn:
Nhà mới: Còn đồ người cũ
→ Lộn xộn, không biết đồ ai!

✅ GOOD - Cleanup:
Vào nhà mới → Dọn sạch đồ cũ
→ Bắt đầu fresh, clean!
```

**Cleanup Pattern** = Dọn dẹp state cũ trước khi dùng mới

#### Use Cases:

```typescript
// Use Case 1: LOGIN
// Old user: john@example.com
// New user: jane@example.com

// WITHOUT cleanup:
Login → Still shows John's data! 😱

// WITH cleanup:
Login → invalidateAuthStore()
      → Clear John's data
      → Fetch Jane's data ✅

// Use Case 2: LOGOUT
// Logged in as admin

// WITHOUT cleanup:
Logout → Still shows admin permissions! 🔐😱

// WITH cleanup:
Logout → invalidateAuthStore()
       → Clear admin data
       → Public mode ✅

// Use Case 3: SWITCH ACCOUNT
// Account A logged in

// WITHOUT cleanup:
Switch to B → Mix of A and B data! 😭

// WITH cleanup:
Switch → invalidateAuthStore()
       → Clear A's data
       → Fetch B's data ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ No data leakage between users
- ✅ Security (clear sensitive data)
- ✅ Clean state transitions

---

### 2.4 Encapsulation Pattern - Pattern "Đóng Gói"

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Remote control

```
❌ BAD - Exposed internals:
Bấm nút TV:
→ Phải biết tần số sóng
→ Phải biết mã xung
→ Phải config receiver
→ Quá phức tạp!

✅ GOOD - Encapsulated:
Bấm nút "Power"
→ Remote lo hết!
→ Đơn giản!
```

**Encapsulation** = Ẩn complexity, expose simple API

#### Implementation:

```typescript
// COMPLEX internals (hidden):
export const useInvalidateAuthStore = () => {
  const queryClient = useQueryClient();
  const { keys } = useKeys();

  const invalidate = async () => {
    // Complex logic:
    await Promise.all(
      (["check", "identity", "permissions"] as const).map((action) =>
        queryClient.invalidateQueries({
          queryKey: keys().auth().action(action).get(),
        }),
      ),
    );
  };

  return invalidate; // Simple function
};

// SIMPLE usage:
const invalidateAuthStore = useInvalidateAuthStore();
invalidateAuthStore(); // ← Just call it! Easy!
```

#### 💡 TẠI SAO quan trọng?

- ✅ Simple API
- ✅ Hide complexity
- ✅ Easy to maintain

---

### 2.5 Single Responsibility Pattern - Pattern "Trách Nhiệm Đơn"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Job roles

```
❌ BAD - One person many jobs:
Nhân viên phải:
- Nấu ăn
- Phục vụ
- Rửa bát
- Kế toán
→ Overwhelmed!

✅ GOOD - Specialized:
Đầu bếp: Chỉ nấu
Phục vụ: Chỉ phục vụ
Rửa bát: Chỉ rửa bát
→ Efficient, expert!
```

**Single Responsibility** = Mỗi function một nhiệm vụ

#### Implementation:

```typescript
// useInvalidateAuthStore:
// ✅ ONE job: Invalidate auth caches
// ❌ NOT do: Login logic
// ❌ NOT do: Fetch data logic
// ❌ NOT do: UI rendering

// Clear separation:
useLogin()             // Login logic
  → invalidateAuthStore()  // Cache invalidation
    → useGetIdentity()     // Fetch fresh data
```

#### 💡 TẠI SAO quan trọng?

- ✅ Easy to understand
- ✅ Easy to test
- ✅ Easy to maintain

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                   | Ví dụ đời thường    | Giải quyết vấn đề gì | Trong useInvalidateAuthStore |
| ------------------------- | ------------------- | -------------------- | ---------------------------- |
| **Cache Invalidation**    | Menu nhà hàng       | Clear stale data     | Invalidate 3 auth queries    |
| **Parallel Execution**    | Giặt 3 máy cùng lúc | Speed optimization   | Promise.all()                |
| **Cleanup**               | Dọn phòng mới       | State transitions    | Clear old user data          |
| **Encapsulation**         | Remote control      | Hide complexity      | Simple function API          |
| **Single Responsibility** | Specialized jobs    | Clear purpose        | Only invalidates cache       |

---

## 3. IMPLEMENTATION DETAILS

### 3.1 What Gets Invalidated?

```typescript
const authQueries = [
  "check",        // useIsAuthenticated()
  "identity",     // useGetIdentity()
  "permissions"   // usePermissions()
];

// Each invalidation triggers refetch:
invalidateQueries("check")
  → useIsAuthenticated() refetches

invalidateQueries("identity")
  → useGetIdentity() refetches

invalidateQueries("permissions")
  → usePermissions() refetches
```

### 3.2 Timing: setTimeout(32ms)

```typescript
// Why 32ms delay in useLogin/useLogout?

setTimeout(() => {
  invalidateAuthStore();
}, 32);

// Reasons:
// 1. 32ms ≈ 2 frames (60fps)
// 2. Ensure navigation completes first
// 3. Avoid race conditions
// 4. Smoother UX (no flash)
```

### 3.3 Promise.all Benefits

```
Single invalidation: 100ms
Three invalidations:
  - Sequential: 300ms ❌
  - Parallel: 100ms ✅

Performance gain: 3x faster!
```

---

## 4. COMMON USE CASES

### 4.1 After Login

```typescript
const { mutate: login } = useLogin({
  mutationOptions: {
    onSuccess: () => {
      setTimeout(() => {
        invalidateAuthStore();
        // → Fetch new user's identity
        // → Fetch new permissions
        // → Update auth check
      }, 32);
    },
  },
});
```

### 4.2 After Logout

```typescript
const { mutate: logout } = useLogout({
  mutationOptions: {
    onSuccess: () => {
      invalidateAuthStore();
      // → Clear user identity
      // → Clear permissions
      // → Update auth status to false
    },
  },
});
```

### 4.3 After Register

```typescript
const { mutate: register } = useRegister({
  mutationOptions: {
    onSuccess: () => {
      if (autoLogin) {
        setTimeout(() => {
          invalidateAuthStore();
          // → Fetch new user data
        }, 32);
      }
    },
  },
});
```

### 4.4 Manual Refetch

```typescript
function RefreshButton() {
  const invalidateAuthStore = useInvalidateAuthStore();

  const handleRefresh = () => {
    invalidateAuthStore();
    // → Force refresh all auth data
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Cache Invalidation**: Fresh data guarantee
- ✅ **Parallel Execution**: 3x performance boost
- ✅ **Cleanup**: Secure state transitions
- ✅ **Encapsulation**: Simple API
- ✅ **Single Responsibility**: Clear purpose

### Key Characteristics

1. **Internal** - Framework use only
2. **Small** - 20 lines of code
3. **Critical** - Without it, UI shows stale data
4. **Fast** - Parallel invalidation
5. **Comprehensive** - Invalidates all 3 auth caches

### Why This Hook Exists

- ✅ Prevent stale data bugs
- ✅ Security (show correct permissions)
- ✅ UX (instant UI updates)
- ✅ Consistency (sync state across app)
- ✅ Performance (parallel execution)

### Remember

🚫 **INTERNAL HOOK** - Không dùng trực tiếp!
✅ Framework tự động gọi after login/logout/register
✅ Invalidates check + identity + permissions cùng lúc
⚡ Promise.all() = 3x faster than sequential
