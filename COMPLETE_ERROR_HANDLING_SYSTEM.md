# 🛡️ HỆ THỐNG XỬ LÝ LỖI HOÀN CHỈNH TRONG REFINE

## ❓ Câu hỏi: "useOnError là trung tâm xử lý lỗi? Còn những lỗi khác thì sao?"

### ✅ Câu trả lời:

**KHÔNG!** `useOnError` KHÔNG phải là trung tâm xử lý TẤT CẢ lỗi.

Refine có **3 LAYERS** xử lý lỗi, mỗi layer có một nhiệm vụ riêng:

1. **LAYER 1:** `useOnError` - CHỈ xử lý AUTH errors (401, 403)
2. **LAYER 2:** `useHandleNotification` - Hiển thị notifications cho TẤT CẢ lỗi
3. **LAYER 3:** Custom callbacks - Custom logic do user cung cấp

---

## 📊 Kiến trúc 3 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│         REFINE COMPLETE ERROR HANDLING SYSTEM                   │
└─────────────────────────────────────────────────────────────────┘

                    API Error Occurred
                            ↓
                ┌───────────────────────┐
                │   Data Hook onError   │
                │   (useCreate, etc.)   │
                └───────────────────────┘
                            ↓
                  ALL 3 LAYERS EXECUTE:
                            ↓
    ┌────────────────────────────────────────────────────────┐
    │ LAYER 1: 🔐 AUTH ERROR CHECK (useOnError)              │
    │                                                         │
    │ Purpose: Handle authentication/authorization errors    │
    │ Scope:   ONLY 401, 403, token expired                  │
    │ Action:  Logout & redirect to login                    │
    │                                                         │
    │ Implementation:                                         │
    │   checkError(err);                                      │
    │   - If 401/403 → logout & redirect (STOP)              │
    │   - Other errors → do nothing (CONTINUE to Layer 2)    │
    └────────────────────────────────────────────────────────┘
                            ↓
    ┌────────────────────────────────────────────────────────┐
    │ LAYER 2: 📢 NOTIFICATION (useHandleNotification)       │
    │                                                         │
    │ Purpose: Show error message to user                    │
    │ Scope:   ALL error types                               │
    │ Action:  Display toast/notification                    │
    │                                                         │
    │ Implementation:                                         │
    │   handleNotification({                                  │
    │     type: "error",                                      │
    │     message: "Failed to create post"                    │
    │   });                                                   │
    └────────────────────────────────────────────────────────┘
                            ↓
    ┌────────────────────────────────────────────────────────┐
    │ LAYER 3: 🎯 CUSTOM CALLBACK (optional)                 │
    │                                                         │
    │ Purpose: User's custom error handling                  │
    │ Scope:   User decides                                  │
    │ Action:  Logging, tracking, retry, etc.                │
    │                                                         │
    │ Implementation:                                         │
    │   mutationOptions?.onError?.(err, vars, ctx);          │
    └────────────────────────────────────────────────────────┘
```

---

## 🔍 Chi tiết từng Layer

### LAYER 1: 🔐 useOnError (Auth Errors Only)

**File:** `packages/core/src/hooks/auth/useOnError/index.ts`

**Nhiệm vụ:**

- Xử lý **CHỈ** authentication/authorization errors
- Check xem có cần logout không
- Redirect đến login page hoặc access denied page

**Xử lý:**

- ✅ 401 Unauthorized → Logout & redirect to login
- ✅ 403 Forbidden → Redirect to access denied
- ❌ 400 Validation → SKIP (không xử lý)
- ❌ 500 Server Error → SKIP (không xử lý)
- ❌ Network errors → SKIP (không xử lý)

**Code example:**

```typescript
// In useCreate.ts line 1231
checkError(err);

// Internally:
// 1. Calls authProvider.onError(err)
// 2. If returns { logout: true } → logout & redirect
// 3. If returns { redirectTo: "/path" } → navigate
// 4. Otherwise → do nothing
```

**Tại sao chỉ xử lý auth errors?**

- Auth errors cần **global action** (logout, clear session)
- Các lỗi khác cần **local action** (show message, update form)
- Separation of concerns - mỗi layer một trách nhiệm

---

### LAYER 2: 📢 useHandleNotification (All Errors)

**File:** `packages/core/src/hooks/notification/useHandleNotification/index.ts`

**Nhiệm vụ:**

- Hiển thị thông báo lỗi cho user
- Translate error messages (i18n)
- Toast/Alert notifications

**Xử lý:**

- ✅ 400 Validation → "Validation failed"
- ✅ 401 Auth → "Session expired" (nếu không logout)
- ✅ 403 Forbidden → "Access denied"
- ✅ 500 Server Error → "Server error occurred"
- ✅ Network errors → "Network error, please try again"

**Code example:**

```typescript
// In useCreate.ts line 1270
handleNotification(notificationConfig, {
  key: `create-${identifier}-notification`,
  description: err.message,
  message: translate("notifications.createError", {...}),
  type: "error",
});
```

**Tại sao xử lý tất cả errors?**

- User cần biết có lỗi xảy ra (feedback)
- Mọi lỗi đều cần notification
- Centralized notification system

---

### LAYER 3: 🎯 Custom Callback (Optional)

**User-provided callback**

**Nhiệm vụ:**

- User tự định nghĩa logic xử lý lỗi
- Error tracking (Sentry, LogRocket)
- Custom retry logic
- Show custom modals

**Code example:**

```typescript
const { mutate: createPost } = useCreate();

createPost({
  resource: "posts",
  values: { title: "New Post" },
  onError: (error, variables, context) => {
    // Custom error handling
    console.log("Error:", error);

    // Send to Sentry
    Sentry.captureException(error);

    // Show custom modal
    showModal({ type: "error", message: error.message });

    // Retry logic
    if (error.status === 503) {
      setTimeout(() => retry(), 5000);
    }
  },
});
```

---

## 🎯 Ví dụ thực tế: Các loại lỗi khác nhau

### Scenario 1: Validation Error (400)

```typescript
// User submits form with empty title
createPost({ resource: "posts", values: { title: "" } });

// API Response:
{
  status: 400,
  message: "Validation failed",
  errors: { title: "Title is required" }
}

// LAYER 1 (useOnError):
checkError(err);
// → Không làm gì (not 401/403) ⏭️

// LAYER 2 (Notification):
handleNotification({ type: "error", message: "Validation failed" });
// → Shows toast: "Failed to create post (status code: 400)" ✅

// LAYER 3 (Custom):
onError?.(err);
// → Execute custom callback (if provided) ✅

// RESULT:
// - User sees validation error toast
// - Form shows field errors
// - User can fix and retry
```

---

### Scenario 2: Auth Error (401)

```typescript
// User tries to create post with expired token
createPost({ resource: "posts", values: { title: "New" } });

// API Response:
{
  status: 401,
  message: "Token expired"
}

// LAYER 1 (useOnError):
checkError(err);
// → Calls authProvider.onError(err)
// → authProvider returns { logout: true, redirectTo: "/login" }
// → Calls logout({ redirectPath: "/login" })
// → User REDIRECTED to login page ✅

// LAYER 2 (Notification):
handleNotification({ type: "error", message: "Token expired" });
// → Tries to show toast but user already redirected ⚠️

// LAYER 3 (Custom):
onError?.(err);
// → May not execute if redirect happens first ❌

// RESULT:
// - User redirected to login page immediately
// - Session cleared
// - Must login again
```

---

### Scenario 3: Server Error (500)

```typescript
// Server has database connection issue
createPost({ resource: "posts", values: { title: "New" } });

// API Response:
{
  status: 500,
  message: "Database connection failed"
}

// LAYER 1 (useOnError):
checkError(err);
// → Không làm gì (not 401/403) ⏭️

// LAYER 2 (Notification):
handleNotification({ type: "error", message: "Database connection failed" });
// → Shows toast: "Server error occurred" ✅

// LAYER 3 (Custom):
onError?.(err);
// → Execute custom callback ✅
// → Maybe send to Sentry, retry logic, etc.

// RESULT:
// - User sees server error toast
// - Error logged to monitoring service
// - Can retry the operation
```

---

### Scenario 4: Network Error (timeout)

```typescript
// Network timeout after 30 seconds
createPost({ resource: "posts", values: { title: "New" } });

// Error:
{
  type: "NetworkError",
  message: "Request timeout"
}

// LAYER 1 (useOnError):
checkError(err);
// → Không làm gì (not HTTP error) ⏭️

// LAYER 2 (Notification):
handleNotification({ type: "error", message: "Request timeout" });
// → Shows toast: "Network error, please try again" ✅

// LAYER 3 (Custom):
onError?.(err);
// → Execute custom callback ✅
// → Maybe implement retry logic

// RESULT:
// - User sees network error toast
// - Can retry manually or auto-retry
```

---

## 📝 Code Implementation

### Trong useCreate.ts (line 1182-1363)

```typescript
onError: (err, variables, context) => {
  // ======================================================================
  // LAYER 1: 🔐 AUTH ERROR CHECK (useOnError)
  // ======================================================================

  /**
   * Check if this is an AUTH ERROR (401, 403)
   * - If 401/403 → logout & redirect (STOP)
   * - Other errors → continue to next layers
   */
  checkError(err);

  // ======================================================================
  // LAYER 2: 📢 NOTIFICATION (useHandleNotification)
  // ======================================================================

  /**
   * Show error notification to user
   * - Applies to ALL error types
   * - Translates error messages
   * - Displays toast
   */
  handleNotification(notificationConfig, {
    key: `create-${identifier}-notification`,
    description: err.message,
    message: translate("notifications.createError", {...}),
    type: "error",
  });

  // ======================================================================
  // LAYER 3: 🎯 CUSTOM CALLBACK (optional)
  // ======================================================================

  /**
   * Execute user's custom error handling
   * - Optional callback
   * - Custom logic (tracking, retry, etc.)
   */
  mutationOptions?.onError?.(err, variables, context);
}
```

---

## 🎭 Design Principles

### 1. Single Responsibility Principle

Mỗi layer có MỘT nhiệm vụ:

- **useOnError:** Xử lý auth errors
- **useHandleNotification:** Hiển thị notifications
- **Custom callback:** User's custom logic

### 2. Separation of Concerns

Các concerns được tách biệt:

- Auth layer không biết về forms
- Notification layer không biết về auth
- Custom layer không biết về infrastructure

### 3. Open/Closed Principle

- Open for extension (custom callbacks)
- Closed for modification (core layers stable)

### 4. Layered Architecture

```
┌─────────────────────────────┐
│  Custom Layer (User)        │  ← User extends
├─────────────────────────────┤
│  Notification Layer         │  ← Framework provides
├─────────────────────────────┤
│  Auth Layer                 │  ← Framework provides
├─────────────────────────────┤
│  Data Layer (API calls)     │  ← Framework provides
└─────────────────────────────┘
```

---

## 📚 Summary

### useOnError là gì?

- **KHÔNG** phải trung tâm xử lý TẤT CẢ lỗi
- **KHÔNG** xử lý validation, network, business errors
- **CHỈ** xử lý authentication/authorization errors (401, 403)
- Là **MỘT PHẦN** của hệ thống xử lý lỗi 3 layers

### Các lỗi khác được xử lý như thế nào?

| Loại lỗi        | Layer 1 (useOnError)         | Layer 2 (Notification)             | Layer 3 (Custom)   |
| --------------- | ---------------------------- | ---------------------------------- | ------------------ |
| 401 Auth        | ✅ Logout & redirect         | ⚠️ Show toast (may not be visible) | ❌ May not execute |
| 403 Forbidden   | ✅ Redirect to access denied | ✅ Show toast                      | ✅ Execute         |
| 400 Validation  | ⏭️ Skip                      | ✅ Show toast                      | ✅ Execute         |
| 500 Server      | ⏭️ Skip                      | ✅ Show toast                      | ✅ Execute         |
| Network timeout | ⏭️ Skip                      | ✅ Show toast                      | ✅ Execute         |

### Tại sao thiết kế như vậy?

1. **Different errors need different handling**

   - Auth errors → Global action (logout)
   - Validation errors → Local action (show field errors)
   - Network errors → Retry logic

2. **Separation of concerns**

   - Each layer has one responsibility
   - Easy to maintain and extend

3. **Flexibility**
   - Users can override any layer
   - Can add custom logic without modifying core

### Files liên quan

- **useOnError:** `packages/core/src/hooks/auth/useOnError/index.ts`
- **useHandleNotification:** `packages/core/src/hooks/notification/useHandleNotification/index.ts`
- **useCreate (example):** `packages/core/src/hooks/data/useCreate.ts:1182-1363`

---

**Kết luận:** Refine có hệ thống xử lý lỗi rất hoàn chỉnh với 3 layers, mỗi layer xử lý một khía cạnh khác nhau. useOnError chỉ là một phần nhỏ, chịu trách nhiệm auth errors. Các lỗi khác được xử lý bởi notification system và custom callbacks! 🎉
