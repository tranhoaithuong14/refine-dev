# 🏗️ KIẾN TRÚC useOnError TRONG REFINE

## Tóm tắt

`useOnError` là hook **TRUNG TÂM** để xử lý lỗi trong toàn bộ kiến trúc Refine. Nó được tích hợp tự động vào TẤT CẢ các data hooks (useCreate, useUpdate, useDelete, etc.) để xử lý lỗi authentication một cách nhất quán.

---

## 📊 Vị trí trong Kiến trúc Refine

```
┌─────────────────────────────────────────────────────────────────┐
│                    REFINE ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────────┐
         │   USER INTERFACE (Your Components)  │
         │   - PostList.tsx                     │
         │   - UserEdit.tsx                     │
         │   - ProductCreate.tsx                │
         └──────────────────────────────────────┘
                        ↓
                  Uses hooks:
                        ↓
    ┌──────────────────────────────────────────────────┐
    │  DATA HOOKS (Refine Core Hooks)                  │
    │  - useCreate → Tạo record mới                    │
    │  - useUpdate → Cập nhật record                   │
    │  - useDelete → Xóa record                        │
    │  - useList   → Lấy danh sách                     │
    └──────────────────────────────────────────────────┘
                        ↓ (on error)
                 Automatically calls
                        ↓
    ┌──────────────────────────────────────────────────┐
    │  👉 useOnError (ERROR HANDLER)                   │
    │  File: hooks/auth/useOnError/index.ts            │
    │  - Centralizes ALL error handling                │
    │  - Detects auth errors (401, 403)                │
    │  - Triggers logout/redirect automatically        │
    └──────────────────────────────────────────────────┘
                        ↓ calls
    ┌──────────────────────────────────────────────────┐
    │  YOUR authProvider.onError                       │
    │  - Your custom business logic                    │
    │  - Decides what to do with each error            │
    │  - Returns { logout?, redirectTo? }              │
    └──────────────────────────────────────────────────┘
                        ↓ returns
            { logout: boolean, redirectTo: string }
                        ↓
    ┌──────────────────────────────────────────────────┐
    │  useLogout / useGo                               │
    │  - Executes the logout action                    │
    │  - Performs navigation/redirect                  │
    └──────────────────────────────────────────────────┘
```

---

## 🔄 Flow chi tiết (Real-World Example)

### Scenario: User cập nhật post sau khi session hết hạn

```typescript
// 1️⃣ COMPONENT: User clicks "Update Post"
function PostEdit() {
  const { mutate: updatePost } = useUpdate();

  const handleSave = () => {
    updatePost({
      resource: "posts",
      id: 1,
      values: { title: "New Title" },
    });
  };

  return <button onClick={handleSave}>Save</button>;
}

// 2️⃣ useUpdate HOOK (packages/core/src/hooks/data/useUpdate.ts)
export const useUpdate = () => {
  const { mutate: checkError } = useOnError(); // ← Tích hợp sẵn

  return useMutation({
    mutationFn: async ({ resource, id, values }) => {
      // Gọi API
      return await dataProvider.update({ resource, id, values });
    },

    onError: (error) => {
      // ← Tự động gọi khi có lỗi
      checkError(error); // ← GỌI useOnError
      showNotification({ type: "error", message: "Update failed" });
    },
  });
};

// 3️⃣ API RESPONSE: Server trả về 401
// Response: { status: 401, message: "Token expired" }

// 4️⃣ useOnError PROCESSES (packages/core/src/hooks/auth/useOnError/index.ts)
// checkError({ status: 401, message: "Token expired" })
//   ↓
// Calls: authProvider.onError({ status: 401 })

// 5️⃣ YOUR authProvider.onError
const authProvider = {
  onError: async (error) => {
    console.log("Error:", error);

    if (error.status === 401) {
      // Session expired
      return {
        logout: true, // ← TRẢ VỀ
        redirectTo: "/login", // ← TRẢ VỀ
      };
    }

    return {};
  },
};

// 6️⃣ useOnError's onSuccess HANDLER
// onSuccess receives: { logout: true, redirectTo: "/login" }
//   ↓
// if (logout) {
//   logout({ redirectPath: "/login" });  // ← GỌI useLogout
// }

// 7️⃣ useLogout EXECUTES
// - Clears localStorage.removeItem("token")
// - Resets auth state
// - Calls authProvider.logout()
// - Redirects to /login

// 8️⃣ RESULT: User sees login page
// "Your session has expired. Please login again."
```

---

## 🎯 Lợi ích của Kiến trúc này

### 1. **Centralization (Tập trung hóa)**

❌ **Không có useOnError:**

```typescript
// Phải handle auth errors ở MỌI component
function PostEdit() {
  const handleUpdate = async () => {
    try {
      await fetch("/api/posts/1", { method: "PATCH" });
    } catch (error) {
      if (error.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
  };
}

// Lặp lại code này ở HÀNG TRĂM components! 😱
```

✅ **Có useOnError:**

```typescript
// Define logic 1 LẦN trong authProvider
const authProvider = {
  onError: async (error) => {
    if (error.status === 401) {
      return { logout: true, redirectTo: "/login" };
    }
    return {};
  },
};

// Dùng ở MỌI NƠI mà KHÔNG cần lo auth errors
function PostEdit() {
  const { mutate: updatePost } = useUpdate();

  updatePost({ id: 1, values: { title: "New" } });
  // ↑ Auth errors được handle TỰ ĐỘNG! ✨
}
```

### 2. **Separation of Concerns (Tách biệt trách nhiệm)**

- **Data Hooks** (useCreate, useUpdate): Chỉ lo CRUD operations
- **useOnError**: Chỉ lo error handling
- **authProvider**: Chỉ lo business logic
- **useLogout/useGo**: Chỉ lo actions (logout, redirect)

### 3. **Automatic Integration (Tích hợp tự động)**

Bạn KHÔNG bao giờ phải gọi `useOnError` thủ công trong components!

```typescript
// ❌ KHÔNG CẦN làm thế này:
function MyComponent() {
  const { mutate: checkError } = useOnError();
  const { mutate: updatePost } = useUpdate();

  const handleUpdate = () => {
    updatePost(data, {
      onError: (error) => checkError(error), // ← KHÔNG CẦN!
    });
  };
}

// ✅ useUpdate ĐÃ TỰ ĐỘNG gọi useOnError
function MyComponent() {
  const { mutate: updatePost } = useUpdate();

  updatePost(data); // ← Đơn giản thế này thôi!
}
```

### 4. **Declarative Error Handling (Khai báo thay vì mệnh lệnh)**

```typescript
// ❌ Imperative (Mệnh lệnh): Bạn phải viết HOW (làm thế nào)
if (error.status === 401) {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  queryClient.clear();
  window.location.href = "/login";
}

// ✅ Declarative (Khai báo): Bạn chỉ viết WHAT (cần gì)
if (error.status === 401) {
  return { logout: true, redirectTo: "/login" };
  // Refine tự xử lý HOW
}
```

---

## 📁 Các file liên quan

### Core Implementation

- **`packages/core/src/hooks/auth/useOnError/index.ts`**
  - Hook chính xử lý errors
  - Gọi authProvider.onError
  - Trigger logout/redirect

### Integration Points (Nơi useOnError được sử dụng)

- **`packages/core/src/hooks/data/useCreate.ts:744`**

  ```typescript
  const { mutate: checkError } = useOnError();
  // ... trong onError callback
  checkError(err); // line 1183
  ```

- **`packages/core/src/hooks/data/useUpdate.ts`**

  ```typescript
  const { mutate: checkError } = useOnError();
  // ... trong onError callback
  checkError(err);
  ```

- **`packages/core/src/hooks/data/useDelete.ts`**

  ```typescript
  const { mutate: checkError } = useOnError();
  // ... trong onError callback
  checkError(err);
  ```

- Và nhiều hooks khác: `useDeleteMany`, `useCustomMutation`, `useInfiniteList`, etc.

### Supporting Hooks

- **`packages/core/src/hooks/auth/useLogout/index.ts`**

  - Thực hiện logout action
  - Clear tokens, reset state
  - Redirect to login

- **`packages/core/src/hooks/navigation/useGo/index.ts`**
  - Thực hiện navigation/redirect
  - Wrap router navigation

---

## 🎭 Design Patterns được sử dụng

### 1. **Observer Pattern**

Data hooks "observe" errors và notify useOnError khi có lỗi xảy ra.

### 2. **Strategy Pattern**

Bạn provide "strategy" (authProvider.onError) để quyết định xử lý lỗi như thế nào.

### 3. **Hollywood Principle**

"Don't call us, we'll call you"

- Bạn định nghĩa logic (authProvider.onError)
- Refine gọi nó khi cần (useOnError)
- Bạn không cần trigger manually

### 4. **Inversion of Control**

- Framework (Refine) control flow
- You provide configuration (authProvider)
- Framework executes your code at the right time

---

## 💡 Ví dụ thực tế

### Example 1: Basic 401 Handling

```typescript
const authProvider = {
  onError: async (error) => {
    if (error.status === 401) {
      return {
        logout: true,
        redirectTo: "/login",
      };
    }
    return {};
  },
};

// Tất cả các operations (create, update, delete) đều được protect!
```

### Example 2: Advanced Error Handling

```typescript
const authProvider = {
  onError: async (error) => {
    // 401: Session expired → logout
    if (error.status === 401) {
      return {
        logout: true,
        redirectTo: "/login?reason=expired",
      };
    }

    // 403: Forbidden → redirect to access denied
    if (error.status === 403) {
      return {
        logout: false, // Không logout
        redirectTo: "/access-denied",
      };
    }

    // 503: Service unavailable → redirect to maintenance
    if (error.status === 503) {
      return {
        logout: false,
        redirectTo: "/maintenance",
      };
    }

    // Other errors → do nothing (just show notification)
    return {};
  },
};
```

### Example 3: Token Refresh Flow

```typescript
const authProvider = {
  onError: async (error) => {
    if (error.status === 401) {
      // Try to refresh token first
      try {
        const newToken = await refreshToken();
        if (newToken) {
          localStorage.setItem("token", newToken);
          return {}; // No logout needed, token refreshed!
        }
      } catch (refreshError) {
        // Refresh failed
      }

      // If refresh failed, logout
      return {
        logout: true,
        redirectTo: "/login?reason=session-expired",
      };
    }

    return {};
  },
};
```

---

## 🔍 Data Flow (Ai trả về gì cho ai?)

```typescript
// 1. BẠN ĐỊNH NGHĨA:
const authProvider = {
  onError: async (error) => {
    return {
      logout: true, // ← BẠN TRẢ VỀ
      redirectTo: "/login", // ← BẠN TRẢ VỀ
    };
  },
};

// 2. useOnError GỌI authProvider.onError (mutationFn):
const result = await onErrorFromContext(error);
// result = { logout: true, redirectTo: "/login" }  ← TỪ authProvider

// 3. React Query TỰ ĐỘNG GỌI onSuccess VỚI result:
onSuccess(result); // onSuccess({ logout: true, redirectTo: "/login" })

// 4. onSuccess DESTRUCTURE PARAMETERS:
onSuccess: ({ logout: shouldLogout, redirectTo }) => {
  // shouldLogout = true
  // redirectTo = "/login"

  if (shouldLogout) {
    logout({ redirectPath: redirectTo }); // ← GỌI useLogout
  }
};

// 5. useLogout THỰC HIỆN:
// - Clear tokens
// - Reset state
// - Redirect to /login
```

---

## 📝 Summary

**useOnError là trung tâm xử lý lỗi của Refine:**

1. ✅ Tập trung hóa error handling
2. ✅ Tự động tích hợp vào tất cả data hooks
3. ✅ Declarative API (khai báo WHAT, không cần HOW)
4. ✅ Consistent error handling across the app
5. ✅ Separation of concerns (mỗi layer một trách nhiệm)

**Bạn chỉ cần:**

- Define authProvider.onError một lần
- Return { logout?, redirectTo? }
- Refine lo toàn bộ infrastructure!

**Flow tóm tắt:**

```
Data Hook Error → useOnError → authProvider.onError → returns { logout, redirectTo }
→ useOnError.onSuccess → useLogout/useGo → Clear & Redirect
```

Đơn giản, mạnh mẽ, và elegant! 🎉
