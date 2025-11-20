# Kiến trúc và Design Patterns của useOnError Hook

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
│  │ useUpdate  │    │ useOnError │    │            │  │
│  │ useDelete  │    │ useCheck   │    │            │  │
│  └────────────┘    └────────────┘    └────────────┘  │
│         │                 ▲                           │
│         └─────────────────┘                           │
│           When API returns                            │
│           401/403 errors   │                          │
│                    ┌───────┴────────┐                 │
│                    │  ERROR HANDLER │ ← useOnError    │
│                    │  (Auth Errors) │                 │
│                    └────────────────┘                 │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Authentication Error Handler** - Xử lý lỗi liên quan authentication/authorization
2. **Session Manager** - Quyết định khi nào logout user
3. **Redirect Controller** - Điều hướng user khi có lỗi
4. **Central Error Gateway** - Tất cả auth errors đều đi qua đây

### 1.2 Flow trong Application

```
┌──────────────────────────────────────────────────────────────┐
│                         ERROR FLOW                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User làm một thao tác                               │
│  useCreate() → POST /api/posts                               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: API trả về lỗi                                      │
│  ← 401 Unauthorized (Token expired)                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: useOnError check lỗi                                │
│  checkError(error) → authProvider.onError(error)             │
│                   → Returns: { logout: true }                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Hook tự động xử lý                                  │
│  if (logout === true):                                       │
│    → Call useLogout()                                        │
│    → Redirect to login page                                  │
│    → Clear user session                                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: User thấy login page                                │
│  "Session expired, please login again"                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** useOnError áp dụng nhiều patterns để xử lý errors một cách linh hoạt và có tổ chức.

---

### 2.1 Strategy Pattern - Pattern "Chiến Lược"

#### 🚨 VÍ DỤ ĐỜI THƯỜNG: Bảo vệ tòa nhà

Tưởng tượng bạn là bảo vệ tòa nhà. Khi có người lạ:

```
Trường hợp 1: Khách hàng quên thẻ
→ Chiến lược: Gọi điện xác nhận, cho vào

Trường hợp 2: Người lạ không có giấy tờ
→ Chiến lược: Từ chối, không cho vào

Trường hợp 3: Nhân viên thẻ hết hạn
→ Chiến lược: Dẫn sang phòng HR làm thẻ mới
```

**Điểm quan trọng:**

- Mỗi trường hợp có **CHIẾN LƯỢC** xử lý khác nhau
- Bảo vệ **KHÔNG TỰ QUYẾT ĐỊNH** - theo quy trình
- Quy trình có thể **THAY ĐỔI** theo công ty

#### ❌ KHÔNG có Strategy Pattern:

```typescript
// BAD - Hard-code mọi trường hợp

function useOnError() {
  const checkError = async (error) => {
    // 😱 Framework phải biết MỌI loại lỗi!

    if (error.status === 401) {
      // Hard-code: Luôn logout
      await logout();
      window.location.href = "/login";
    }

    if (error.status === 403) {
      // Hard-code: Luôn redirect
      window.location.href = "/access-denied";
    }

    // 😭 Project khác muốn xử lý khác?
    // → Phải fork framework!
  };
}
```

**Vấn đề:**

- ❌ Không linh hoạt
- ❌ Mỗi project có quy trình khác nhau
- ❌ Không thể custom

#### ✅ CÓ Strategy Pattern:

```typescript
// GOOD - Framework chỉ cần interface

// Framework CHỈ nói: "Cho tôi biết phải làm gì với lỗi này!"
function useOnError() {
  const { onError } = useAuthProviderContext(); // ← Get STRATEGY

  const checkError = async (error) => {
    const result = await onError(error); // ← Gọi strategy

    // Framework chỉ thực thi kết quả, không quyết định
    if (result.logout) {
      await logout();
    }
    if (result.redirectTo) {
      navigate(result.redirectTo);
    }
  };
}

// Project A: Strategy - Logout ngay khi 401
const authProvider_ProjectA = {
  onError: async (error) => {
    if (error.status === 401) {
      return { logout: true };
    }
    return {};
  },
};

// Project B: Strategy - Thử refresh token trước
const authProvider_ProjectB = {
  onError: async (error) => {
    if (error.status === 401) {
      const refreshed = await tryRefreshToken();
      if (refreshed) {
        return {}; // Không logout
      }
      return { logout: true }; // Logout nếu refresh fail
    }
    return {};
  },
};

// Project C: Strategy - Redirect khác nhau theo error
const authProvider_ProjectC = {
  onError: async (error) => {
    if (error.status === 401) {
      return { logout: true, redirectTo: "/session-expired" };
    }
    if (error.status === 403) {
      return { redirectTo: "/upgrade-plan" }; // Không logout
    }
    return {};
  },
};
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│    Framework (useOnError)           │
│    "Lỗi này xử lý thế nào?"         │
│    Không tự quyết định!             │
└─────────────────────────────────────┘
              ▲ Asks
              │
┌─────────────┴──────────────────────┐
│  STRATEGIES (Quy trình khác nhau)  │
├────────────────────────────────────┤
│  Strategy 1     Strategy 2     Strategy 3
│  (Logout ngay)  (Refresh token) (Custom)│
└────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Mỗi project có quy trình auth riêng
- ✅ Dễ thay đổi logic mà không sửa framework
- ✅ Test dễ (mock strategy)

---

### 2.2 Command Pattern - Pattern "Lệnh"

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Đặt món ăn nhà hàng

Khi bạn order đồ ăn:

```
❌ KHÔNG có Command (trực tiếp):
Bạn → Nói trực tiếp với đầu bếp: "Làm cho tôi phở!"
→ Vấn đề: Đầu bếp đang bận? Quên đơn? Không track được?

✅ CÓ Command (qua phiếu order):
Bạn → Viết phiếu order: "1 phở, bàn 5"
     → Phục vụ mang phiếu cho bếp
     → Bếp làm theo phiếu
     → Có thể xem lại, hủy, track
```

**Command** = Biến yêu cầu thành object, có thể lưu, queue, undo

#### ❌ KHÔNG có Command:

```typescript
// BAD - Gọi trực tiếp

function ComponentA() {
  const handleError = async (error) => {
    // 😱 Mỗi component tự xử lý
    if (error.status === 401) {
      const { logout } = useLogout();
      await logout();
      navigate("/login");
    }
  };
}

function ComponentB() {
  const handleError = async (error) => {
    // 😭 Duplicate code!
    if (error.status === 401) {
      const { logout } = useLogout();
      await logout();
      navigate("/login");
    }
  };
}
```

**Vấn đề:**

- ❌ Duplicate logic khắp nơi
- ❌ Khó maintain
- ❌ Không consistent

#### ✅ CÓ Command Pattern:

```typescript
// GOOD - Encapsulate request as object (mutation)

// React Query Mutation = COMMAND object
const mutation = useMutation({
  mutationKey: ["auth", "onError"],
  mutationFn: onErrorFunction, // ← Command
  onSuccess: (result) => {
    // Execute command result
    if (result.logout) {
      logout();
    }
    if (result.redirectTo) {
      navigate(result.redirectTo);
    }
  },
});

// Components chỉ cần "submit command"
function ComponentA() {
  const { mutate: checkError } = useOnError();

  // Submit command, không care implementation
  const handleError = (error) => {
    checkError(error); // ← Submit command
  };
}

function ComponentB() {
  const { mutate: checkError } = useOnError();

  // Tương tự, cùng command
  const handleError = (error) => {
    checkError(error); // ← Submit command
  };
}
```

#### 📊 Biểu đồ:

```
┌─────────────────────────────────────┐
│  COMPONENTS (Gửi lệnh)              │
│  checkError(error) → Submit command │
└─────────────────────────────────────┘
              │
              ▼ Command object
┌─────────────────────────────────────┐
│  COMMAND QUEUE (React Query)        │
│  - Queue commands                   │
│  - Track state (pending/success)    │
│  - Retry on failure                 │
└─────────────────────────────────────┘
              │
              ▼ Execute
┌─────────────────────────────────────┐
│  HANDLER (authProvider.onError)     │
│  Execute logic, return result       │
└─────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Centralized logic
- ✅ Track execution state
- ✅ Retry, queue, debounce dễ dàng

---

### 2.3 Chain of Responsibility - Pattern "Chuỗi Trách Nhiệm"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Xin phép nghỉ

Khi bạn xin nghỉ việc:

```
Bước 1: Gửi đơn cho Team Lead
        ↓
        Team Lead check: "1 ngày? OK, tôi approve"
        Hoặc: "3 ngày? Phải hỏi Manager"
        ↓
Bước 2: Manager check: "3 ngày? OK"
        Hoặc: "1 tuần? Phải hỏi Director"
        ↓
Bước 3: Director quyết định cuối cùng
```

**Chain** = Nhiều handler xử lý tuần tự, mỗi handler quyết định xử lý hay pass tiếp

#### ❌ KHÔNG có Chain:

```typescript
// BAD - Một function xử lý TẤT CẢ

authProvider.onError = async (error) => {
  // 😱 Một hàm khổng lồ!

  // Check 401
  if (error.status === 401) {
    // ... 50 dòng code
  }

  // Check 403
  if (error.status === 403) {
    // ... 50 dòng code
  }

  // Check token expired
  if (error.message.includes("expired")) {
    // ... 50 dòng code
  }

  // Check rate limit
  if (error.status === 429) {
    // ... 50 dòng code
  }

  // 😭 1 function 200+ dòng!
};
```

**Vấn đề:**

- ❌ Function quá dài
- ❌ Khó đọc, khó maintain
- ❌ Không thể reuse từng handler

#### ✅ CÓ Chain Pattern:

```typescript
// GOOD - Chia nhỏ thành chain of handlers

// Handler 1: Token expired
const handleTokenExpired = async (error) => {
  if (error.message.includes("expired")) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return { handled: true }; // Stop chain
    }
  }
  return { handled: false }; // Pass to next
};

// Handler 2: 401 Unauthorized
const handleUnauthorized = async (error) => {
  if (error.status === 401) {
    return {
      handled: true,
      logout: true,
    };
  }
  return { handled: false };
};

// Handler 3: 403 Forbidden
const handleForbidden = async (error) => {
  if (error.status === 403) {
    return {
      handled: true,
      redirectTo: "/access-denied",
    };
  }
  return { handled: false };
};

// Chain executor
authProvider.onError = async (error) => {
  // Try each handler in chain
  let result;

  result = await handleTokenExpired(error);
  if (result.handled) return result;

  result = await handleUnauthorized(error);
  if (result.handled) return result;

  result = await handleForbidden(error);
  if (result.handled) return result;

  // Default: không xử lý
  return {};
};
```

#### 📊 Biểu đồ:

```
Error arrives
      │
      ▼
┌─────────────────┐
│ Handler 1       │ Can handle? → YES → Return result
│ (Token Expired) │            → NO  → Pass to next
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Handler 2       │ Can handle? → YES → Return result
│ (401)           │            → NO  → Pass to next
└─────────────────┘
      │
      ▼
┌─────────────────┐
│ Handler 3       │ Can handle? → YES → Return result
│ (403)           │            → NO  → Default
└─────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Code ngắn, dễ đọc
- ✅ Mỗi handler một trách nhiệm
- ✅ Dễ thêm/bớt handlers

---

### 2.4 Template Method Pattern - Pattern "Phương Thức Mẫu"

#### 🍳 VÍ DỤ ĐỜI THƯỜNG: Công thức nấu ăn

Khung sườn chung để nấu món:

```
Template (Khung chung):
1. Chuẩn bị nguyên liệu  ← Bạn tự quyết định
2. Chế biến             ← Bạn tự quyết định
3. Nêm nếm              ← Bạn tự quyết định
4. Trình bày            ← Cố định (đẹp mắt)

Nấu PHỞ:
1. Chuẩn bị: Xương, thịt, hành, rau
2. Chế biến: Hầm xương 6 tiếng
3. Nêm: Nước mắm, muối, đường
4. Trình bày: Bát + đũa

Nấu BÚN:
1. Chuẩn bị: Thịt, bún, rau sống
2. Chế biến: Luộc thịt
3. Nêm: Nước mắm chua ngọt
4. Trình bày: Bát + đũa
```

**Template Method** = Khung sườn cố định, chi tiết thay đổi

#### ❌ KHÔNG có Template:

```typescript
// BAD - Mỗi project tự viết toàn bộ

// Project A
const handleError = async (error) => {
  const result = await authProvider.onError(error);
  if (result.logout) {
    logout(); // Thiếu navigate!
  }
};

// Project B
const handleError = async (error) => {
  const result = await authProvider.onError(error);
  if (result.logout) {
    logout();
    navigate("/login");
    showNotification("Logged out"); // Thừa notification!
  }
};

// 😭 Mỗi project làm khác nhau!
```

**Vấn đề:**

- ❌ Không consistent
- ❌ Dễ quên bước
- ❌ Hard to maintain

#### ✅ CÓ Template Method:

```typescript
// GOOD - Framework cung cấp template

// TEMPLATE (cố định) trong useOnError
const mutation = useMutation({
  mutationFn: onErrorFromContext, // ← CÓ THỂ THAY ĐỔI

  onSuccess: (result) => {
    // TEMPLATE STEPS (cố định):

    // Step 1: Check logout (cố định)
    if (result.logout) {
      logout(); // ← Cố định

      // Step 2: Check redirect (cố định)
      if (result.redirectTo) {
        navigate(result.redirectTo); // ← Cố định
      }
    }

    // Step 3: Just redirect (cố định)
    if (!result.logout && result.redirectTo) {
      navigate(result.redirectTo); // ← Cố định
    }
  },
});

// MỌI PROJECT đều follow template này!
// Chỉ thay đổi mutationFn
```

#### 📊 Biểu đồ:

```
┌────────────────────────────────────────┐
│  TEMPLATE (Framework - Cố định)        │
├────────────────────────────────────────┤
│  1. Call authProvider.onError() ◄──────┼─ Thay đổi được
│  2. Check result.logout         (Fixed)│
│  3. Call logout() if needed     (Fixed)│
│  4. Check result.redirectTo     (Fixed)│
│  5. Navigate if needed          (Fixed)│
└────────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ Consistent behavior across projects
- ✅ Không quên logic quan trọng
- ✅ Framework handle edge cases

---

### 2.5 Observer Pattern (via React Query)

_(Giống usePermissions - đã giải thích ở trên)_

#### 📺 VÍ DỤ: Subscribe thông báo

Khi error được handle:

- Tất cả components quan tâm đến auth state được notify
- Auto re-render khi user bị logout
- Sync UI state across app

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                     | Ví dụ đời thường                     | Giải quyết vấn đề gì           | Trong useOnError                |
| --------------------------- | ------------------------------------ | ------------------------------ | ------------------------------- |
| **Strategy**                | Bảo vệ tòa nhà (quy trình khác nhau) | Nhiều cách xử lý error         | authProvider.onError strategies |
| **Command**                 | Phiếu order nhà hàng                 | Encapsulate request            | React Query mutation            |
| **Chain of Responsibility** | Xin phép nghỉ (qua nhiều cấp)        | Chia nhỏ handlers              | Token refresh → 401 → 403 chain |
| **Template Method**         | Công thức nấu ăn                     | Khung chuẩn, chi tiết thay đổi | Check → Logout → Navigate flow  |
| **Observer**                | Subscribe YouTube                    | Auto update UI                 | React Query notify              |

---

## 3. KIẾN TRÚC CHI TIẾT

### 3.1 Layer Architecture

```
┌────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                  │
│  (React Components)                                    │
│                                                        │
│  catch (error) {                                       │
│    checkError(error);  // ← Gọi hook                  │
│  }                                                     │
└────────────────────────────────────────────────────────┘
                          │
                          │ Calls
                          ▼
┌────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER                    │
│  (useOnError Hook)                                     │
│                                                        │
│  - Get authProvider.onError                            │
│  - Create React Query mutation                         │
│  - Return checkError function                          │
└────────────────────────────────────────────────────────┘
                          │
                          │ Uses React Query
                          ▼
┌────────────────────────────────────────────────────────┐
│                    MUTATION LAYER                      │
│  (React Query Mutation)                                │
│                                                        │
│  - Execute authProvider.onError()                      │
│  - Track state (pending, success, error)               │
│  - Handle result                                       │
└────────────────────────────────────────────────────────┘
                          │
                          │ Calls
                          ▼
┌────────────────────────────────────────────────────────┐
│                   BUSINESS LOGIC LAYER                 │
│  (authProvider.onError)                                │
│                                                        │
│  - Analyze error                                       │
│  - Refresh token if needed                             │
│  - Decide logout/redirect                              │
│  - Return decision                                     │
└────────────────────────────────────────────────────────┘
                          │
                          │ May call
                          ▼
┌────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                   │
│                                                        │
│  - Refresh token API                                   │
│  - Logging service                                     │
│  - Analytics                                           │
└────────────────────────────────────────────────────────┘
```

### 3.2 Data Flow

```
USER ACTION              ERROR HANDLING
──────────              ──────────────
    │
    ▼
┌─────────────┐
│ API Call    │
│ (create)    │
└─────────────┘
    │
    ▼ 401
┌──────────────────┐
│ Catch error      │
│ checkError(e)    │
└──────────────────┘
    │
    ▼
┌──────────────────────┐
│ React Query Mutation │
│ (execute onError)    │
└──────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ authProvider.onError(e)  │
│ → Analyze error          │
│ → Try refresh token?     │
│ → Return decision        │
└──────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ Process result:          │
│ if logout → useLogout()  │
│ if redirect → navigate() │
└──────────────────────────┘
    │
    ▼
┌──────────────────────────┐
│ UI Updates:              │
│ → Login screen shown     │
│ → User session cleared   │
└──────────────────────────┘
```

---

## 4. TẠI SAO THIẾT KẾ NHƯ VẬY?

### 4.1 Centralized Error Handling

**Vấn đề:** Error handling rải rác khắp nơi

```typescript
// BAD
function PostList() {
  const { data } = useList({
    onError: (e) => {
      if (e.status === 401) logout(); // ← Duplicate
    },
  });
}

function UserList() {
  const { data } = useList({
    onError: (e) => {
      if (e.status === 401) logout(); // ← Duplicate
    },
  });
}
```

**Giải pháp:** Central handler

```typescript
// GOOD
// Hook tự động handle 401 cho TẤT CẢ operations
// Components không cần care!
```

### 4.2 Async Token Refresh

**Vấn đề:** Token expired không phải lúc nào cũng logout

```typescript
// Thực tế:
401 → Try refresh token
     → Success? Continue request
     → Fail? Then logout
```

**Giải pháp:** onError is async

```typescript
authProvider.onError = async (error) => {
  if (error.status === 401) {
    const refreshed = await refreshToken(); // Async!
    if (refreshed) {
      return {}; // No logout
    }
    return { logout: true };
  }
};
```

### 4.3 Flexible Response

**Nhiều scenarios:**

- Logout + redirect to login
- Just redirect (no logout)
- Show message + stay
- Silent retry

**Solution:** Flexible return

```typescript
// Scenario 1: Standard logout
return { logout: true };

// Scenario 2: Custom redirect
return { logout: true, redirectTo: "/expired" };

// Scenario 3: Just redirect
return { redirectTo: "/upgrade" };

// Scenario 4: Do nothing
return {};
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: Flexible error handling logic per project
- ✅ **Command**: Encapsulate error check as mutation
- ✅ **Chain of Responsibility**: Multiple error handlers
- ✅ **Template Method**: Standard flow for all errors
- ✅ **Observer**: Auto-update UI on logout

### Key Benefits

1. **Centralized** - One place for auth error logic
2. **Flexible** - Each project decides what to do
3. **Async** - Support token refresh, logging, etc.
4. **Consistent** - Same flow for all operations
5. **Testable** - Easy to mock authProvider

### Khi nào dùng useOnError?

✅ **Nên dùng khi:**

- Handle 401/403 errors
- Token refresh logic
- Session expiry handling
- Automatic logout/redirect

❌ **Không dùng khi:**

- Validation errors (400)
- Business logic errors
- Network errors (offline)
- Success cases
