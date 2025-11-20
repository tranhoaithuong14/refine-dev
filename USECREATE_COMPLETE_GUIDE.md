# 📘 HƯỚNG DẪN HOÀN CHỈNH VỀ useCreate HOOK

## 📋 MỤC LỤC

1. [Vấn Đề Ban Đầu - Tại Sao Cần useCreate?](#1-vấn-đề-ban-đầu)
2. [React Query Là Gì? Tại Sao Cần Nó?](#2-react-query-là-gì)
3. [Mutations vs Queries - Sự Khác Biệt Cơ Bản](#3-mutations-vs-queries)
4. [useCreate Hook - Tổng Quan](#4-usecreate-hook)
5. [Kiến Trúc Nội Bộ - Cách useCreate Hoạt Động](#5-kiến-trúc-nội-bộ)
6. [Luồng Dữ Liệu Chi Tiết](#6-luồng-dữ-liệu-chi-tiết)
7. [Tương Tác Với React Query](#7-tương-tác-với-react-query)
8. [Các Pattern Thiết Kế](#8-các-pattern-thiết-kế)
9. [Ví Dụ Thực Tế Từ A-Z](#9-ví-dụ-thực-tế)
10. [Tóm Tắt & Kết Luận](#10-tóm-tắt)

---

## 1. VẤN ĐỀ BAN ĐẦU - TẠI SAO CẦN useCreate?

### 1.1. Cách Cũ - KHÔNG Dùng Hook (Vanilla React)

Khi bạn muốn tạo mới dữ liệu trong React thuần, bạn phải làm như sau:

```typescript
import { useState } from "react";

function CreatePostForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const createPost = async (values) => {
    try {
      // 1. Bật loading
      setLoading(true);
      setError(null);

      // 2. Gọi API
      const response = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) throw new Error("Failed to create");

      const result = await response.json();
      setData(result);

      // 3. Hiển thị thông báo thành công
      alert("Post created successfully!");

      // 4. Làm mới danh sách posts (phải fetch lại)
      // ... code phức tạp để refetch danh sách

      // 5. Ghi log
      // ... code để ghi audit log

      // 6. Publish event cho realtime
      // ... code để notify các users khác
    } catch (err) {
      setError(err.message);
      alert("Error creating post!");

      // 7. Xử lý lỗi authentication
      if (err.status === 401) {
        // ... code để logout
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        createPost({ title: "New Post" });
      }}
    >
      <button disabled={loading}>
        {loading ? "Creating..." : "Create Post"}
      </button>
      {error && <div>Error: {error}</div>}
    </form>
  );
}
```

### 1.2. Vấn Đề Của Cách Cũ

❌ **Quá nhiều boilerplate code**

- Phải quản lý state manually (loading, error, data)
- Phải viết try-catch ở mọi nơi
- Code lặp lại nhiều lần

❌ **Khó quản lý cache**

- Sau khi tạo xong, phải manually refetch danh sách
- Không có cơ chế tự động invalidate cache

❌ **Thiếu các tính năng quan trọng**

- Không có retry mechanism
- Không có optimistic updates
- Không có error recovery

❌ **Khó tái sử dụng**

- Mỗi component phải viết lại logic tương tự
- Không có centralized error handling

### 1.3. Cách Mới - Dùng useCreate Hook

```typescript
import { useCreate } from "@refinedev/core";

function CreatePostForm() {
  const { mutate, isPending } = useCreate();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutate({
          resource: "posts",
          values: { title: "New Post" },
        });
      }}
    >
      <button disabled={isPending}>
        {isPending ? "Creating..." : "Create Post"}
      </button>
    </form>
  );
}
```

✅ **Đơn giản hơn 90%**
✅ **Tự động xử lý loading, error, success**
✅ **Tự động invalidate cache**
✅ **Tích hợp sẵn notifications, logging, realtime**

---

## 2. REACT QUERY LÀ GÌ? TẠI SAO CẦN NÓ?

### 2.1. React Query - Library Quản Lý Server State

**React Query** là thư viện giúp quản lý **server state** (dữ liệu từ server) trong React.

#### Phân Biệt Client State vs Server State

```
┌─────────────────────┬───────────────────────┬─────────────────────┐
│                     │ CLIENT STATE          │ SERVER STATE        │
├─────────────────────┼───────────────────────┼─────────────────────┤
│ Ví dụ               │ - Form input values   │ - User profile      │
│                     │ - Modal open/close    │ - List of posts     │
│                     │ - Selected tab        │ - Product details   │
├─────────────────────┼───────────────────────┼─────────────────────┤
│ Nguồn dữ liệu       │ Chỉ tồn tại ở client  │ Lưu ở server        │
├─────────────────────┼───────────────────────┼─────────────────────┤
│ Đồng bộ             │ Không cần đồng bộ     │ Cần sync với server │
├─────────────────────┼───────────────────────┼─────────────────────┤
│ Caching             │ Không cần cache       │ Cần cache           │
├─────────────────────┼───────────────────────┼─────────────────────┤
│ Quản lý bằng        │ useState, useReducer  │ React Query         │
└─────────────────────┴───────────────────────┴─────────────────────┘
```

### 2.2. React Query Giải Quyết Vấn Đề Gì?

#### Vấn Đề 1: Caching (Lưu Cache)

**Không có React Query:**

```typescript
// User mở trang /posts → Fetch dữ liệu
// User chuyển sang /settings
// User quay lại /posts → Fetch lại dữ liệu (lãng phí!)
```

**Có React Query:**

```typescript
// User mở trang /posts → Fetch dữ liệu → Lưu cache
// User chuyển sang /settings
// User quay lại /posts → Dùng cache (tức thì!) → Refetch nền (nếu cần)
```

#### Vấn Đề 2: Deduplication (Loại Bỏ Request Trùng)

**Không có React Query:**

```typescript
// 3 components cùng fetch /api/users
<UserList />   → GET /api/users
<UserProfile /> → GET /api/users
<UserDropdown /> → GET /api/users

// = 3 requests trùng nhau!
```

**Có React Query:**

```typescript
// React Query tự động gộp thành 1 request duy nhất!
<UserList />   ┐
<UserProfile /> ├─→ GET /api/users (1 request)
<UserDropdown /> ┘
```

#### Vấn Đề 3: Background Refetching

**Không có React Query:**

```typescript
// Dữ liệu có thể cũ (stale) mà không biết
// Phải manually refresh trang
```

**Có React Query:**

```typescript
// Tự động refetch khi:
// - Window focus lại
// - Network reconnect
// - Interval time
```

### 2.3. React Query API - 2 Khái Niệm Chính

React Query có 2 loại operations:

```
┌──────────────┬─────────────────────────────────────────┐
│ QUERIES      │ Đọc dữ liệu (Read Operations)           │
│              │ - useQuery                              │
│              │ - Tự động fetch khi component mount     │
│              │ - Cache kết quả                         │
│              │ - Ví dụ: GET /posts, GET /users/1      │
├──────────────┼─────────────────────────────────────────┤
│ MUTATIONS    │ Thay đổi dữ liệu (Write Operations)     │
│              │ - useMutation                           │
│              │ - Phải gọi manual (không tự động)       │
│              │ - Không cache                           │
│              │ - Ví dụ: POST, PUT, DELETE              │
└──────────────┴─────────────────────────────────────────┘
```

---

## 3. MUTATIONS VS QUERIES - SỰ KHÁC BIỆT CƠ BẢN

### 3.1. useQuery (Đọc Dữ Liệu)

```typescript
import { useQuery } from "@tanstack/react-query";

function PostList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["posts"], // ← Key để cache
    queryFn: () => fetch("/api/posts").then((r) => r.json()),
    enabled: true, // ← Tự động chạy khi mount
    staleTime: 5000, // ← Cache 5 giây
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**Đặc điểm useQuery:**

- ✅ Tự động fetch khi component mount
- ✅ Cache kết quả vào queryKey
- ✅ Tự động refetch khi stale
- ✅ Có retry mechanism
- ✅ Trả về `{ data, isLoading, error }`

### 3.2. useMutation (Thay Đổi Dữ Liệu)

```typescript
import { useMutation } from "@tanstack/react-query";

function CreatePostButton() {
  const { mutate, isPending, error } = useMutation({
    mutationFn: (newPost) =>
      fetch("/api/posts", {
        method: "POST",
        body: JSON.stringify(newPost),
      }),
    onSuccess: (data) => {
      console.log("Created:", data);
    },
    onError: (error) => {
      console.error("Failed:", error);
    },
  });

  return (
    <button onClick={() => mutate({ title: "New Post" })} disabled={isPending}>
      {isPending ? "Creating..." : "Create Post"}
    </button>
  );
}
```

**Đặc điểm useMutation:**

- ❌ KHÔNG tự động chạy - phải gọi `mutate()` manually
- ❌ KHÔNG cache kết quả
- ✅ Có callbacks: `onSuccess`, `onError`, `onMutate`
- ✅ Trả về `{ mutate, mutateAsync, isPending, error }`

### 3.3. So Sánh Trực Quan

```typescript
// ============================================
// QUERY (useQuery) - ĐỌC DỮ LIỆU
// ============================================

Component Mount → useQuery tự động fetch → Cache → Render

  <PostList />
      ↓
  useQuery({ queryKey: ['posts'], queryFn: fetchPosts })
      ↓
  GET /api/posts (TỰ ĐỘNG)
      ↓
  Cache vào key ['posts']
      ↓
  Render với data

// ============================================
// MUTATION (useMutation) - GHI DỮ LIỆU
// ============================================

Component Mount → User click → mutate() → API → Callback

  <CreateButton />
      ↓
  useMutation({ mutationFn: createPost })
      ↓
  User clicks button
      ↓
  mutate({ title: 'New' }) (MANUAL)
      ↓
  POST /api/posts
      ↓
  onSuccess callback
      ↓
  Invalidate queries (để refetch)
```

---

## 4. useCreate HOOK - TỔNG QUAN

### 4.1. useCreate Là Gì?

`useCreate` là một **custom hook** của Refine được xây dựng **trên nền tảng useMutation** của React Query.

```
useCreate Hook (Refine)
    ↓
useMutation (React Query)
    ↓
fetch API (Browser)
    ↓
Server
```

### 4.2. Tại Sao Không Dùng Trực Tiếp useMutation?

**Dùng trực tiếp useMutation:**

```typescript
const { mutate } = useMutation({
  mutationFn: (data) => fetch('/api/posts', { method: 'POST', ... }),
  onSuccess: (data) => {
    // Phải tự code:
    alert('Success!');                    // ← Notification
    queryClient.invalidateQueries(['posts']); // ← Cache invalidation
    publishEvent({ type: 'created', ... });   // ← Realtime
    logAction({ action: 'create', ... });     // ← Audit log
    // ... còn nhiều việc khác
  }
});
```

**Dùng useCreate:**

```typescript
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: { title: "New" },
});
// ✅ Tất cả (notification, cache, realtime, log) đã tự động!
```

### 4.3. Refine Thêm Gì Vào useMutation?

```
useMutation (React Query)
    ↓
useCreate (Refine) = useMutation +
    ├── 1. Data Provider Integration (API abstraction)
    ├── 2. Notification System (success/error toasts)
    ├── 3. Cache Invalidation (tự động refetch)
    ├── 4. Realtime Events (publish/subscribe)
    ├── 5. Audit Logging (ghi nhật ký)
    ├── 6. Error Handling (auth errors, etc.)
    ├── 7. i18n Support (đa ngôn ngữ)
    └── 8. Loading Overtime Tracking (performance monitoring)
```

---

## 5. KIẾN TRÚC NỘI BỘ - CÁCH useCreate HOẠT ĐỘNG

### 5.1. Sơ Đồ Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                     useCreate Hook                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  INPUT (Props)                                              │
│  ┌──────────────────────────────────────────┐               │
│  │ {                                        │               │
│  │   resource: "posts",                     │               │
│  │   values: { title: "..." },              │               │
│  │   successNotification: {...},            │               │
│  │   errorNotification: {...},              │               │
│  │   invalidates: ["list", "many"],         │               │
│  │   meta: {...}                            │               │
│  │ }                                        │               │
│  └──────────────────────────────────────────┘               │
│           ↓                                                 │
│  ┌──────────────────────────────────────────┐               │
│  │     DEPENDENCIES (Hooks)                 │               │
│  ├──────────────────────────────────────────┤               │
│  │ • useDataProvider() → API client         │               │
│  │ • useInvalidate() → Cache invalidation   │               │
│  │ • useHandleNotification() → Toasts       │               │
│  │ • useTranslate() → i18n                  │               │
│  │ • usePublish() → Realtime events         │               │
│  │ • useLog() → Audit logging               │               │
│  │ • useOnError() → Error handling          │               │
│  │ • useKeys() → Query keys                 │               │
│  └──────────────────────────────────────────┘               │
│           ↓                                                 │
│  ┌──────────────────────────────────────────┐               │
│  │       useMutation (React Query)          │               │
│  ├──────────────────────────────────────────┤               │
│  │ mutationFn: () => {                      │               │
│  │   dataProvider.create(...)               │               │
│  │ },                                       │               │
│  │ onSuccess: () => {                       │               │
│  │   handleNotification(...)                │               │
│  │   invalidateStore(...)                   │               │
│  │   publish(...)                           │               │
│  │   log(...)                               │               │
│  │ },                                       │               │
│  │ onError: (err) => {                      │               │
│  │   checkError(err)                        │               │
│  │   handleNotification(...)                │               │
│  │ }                                        │               │
│  └──────────────────────────────────────────┘               │
│           ↓                                                 │
│  OUTPUT (Return)                                            │
│  ┌──────────────────────────────────────────┐               │
│  │ {                                        │               │
│  │   mutate: (vars) => {...},               │               │
│  │   mutateAsync: async (vars) => {...},    │               │
│  │   isPending: boolean,                    │               │
│  │   isError: boolean,                      │               │
│  │   isSuccess: boolean,                    │               │
│  │   data: {...},                           │               │
│  │   error: {...},                          │               │
│  │   overtime: { elapsedTime }              │               │
│  │ }                                        │               │
│  └──────────────────────────────────────────┘               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2. Code Structure (Cấu Trúc Code)

```typescript
export const useCreate = ({
  resource: resourceFromProps,
  values: valuesFromProps,
  // ... other props
}: UseCreateProps = {}) => {

  // ==========================================
  // BƯỚC 1: KHỞI TẠO DEPENDENCIES
  // ==========================================
  const dataProvider = useDataProvider();
  const invalidateStore = useInvalidate();
  const handleNotification = useHandleNotification();
  const translate = useTranslate();
  const publish = usePublish();
  const { log } = useLog();
  const { mutate: checkError } = useOnError();
  const { keys } = useKeys();

  // ==========================================
  // BƯỚC 2: TẠO MUTATION VỚI useMutation
  // ==========================================
  const mutationResult = useMutation({

    // ------------------------------------------
    // 2.1. mutationFn - Hàm gọi API
    // ------------------------------------------
    mutationFn: async ({
      resource: resourceName = resourceFromProps,
      values = valuesFromProps,
      meta = metaFromProps,
      dataProviderName = dataProviderNameFromProps,
    }) => {
      // Validation
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      // Lấy resource config
      const { resource, identifier } = select(resourceName);

      // Kết hợp metadata
      const combinedMeta = getMeta({ resource, meta });

      // GỌI API qua dataProvider
      return dataProvider(
        pickDataProvider(identifier, dataProviderName, resources)
      ).create({
        resource: resource.name,
        variables: values,
        meta: combinedMeta
      });
    },

    // ------------------------------------------
    // 2.2. onSuccess - Callback khi thành công
    // ------------------------------------------
    onSuccess: (data, variables, context) => {
      const { resource, values, invalidates, ... } = variables;

      // ✅ 1. Hiển thị notification
      handleNotification(notificationConfig, {
        message: "Successfully created post",
        type: "success"
      });

      // ✅ 2. Invalidate cache (để refetch)
      invalidateStore({
        resource: identifier,
        dataProviderName,
        invalidates: ["list", "many"]
      });

      // ✅ 3. Publish realtime event
      publish({
        channel: `resources/${resource.name}`,
        type: "created",
        payload: { ids: [data.data.id] }
      });

      // ✅ 4. Ghi audit log
      log.mutate({
        action: "create",
        resource: resource.name,
        data: values,
        meta: { id: data.data.id }
      });

      // ✅ 5. Gọi custom callback (nếu có)
      mutationOptions?.onSuccess?.(data, variables, context);
    },

    // ------------------------------------------
    // 2.3. onError - Callback khi lỗi
    // ------------------------------------------
    onError: (err, variables, context) => {
      // ❌ 1. Check auth errors (401, 403)
      checkError(err);

      // ❌ 2. Hiển thị error notification
      handleNotification(notificationConfig, {
        message: "Error creating post",
        description: err.message,
        type: "error"
      });

      // ❌ 3. Gọi custom callback (nếu có)
      mutationOptions?.onError?.(err, variables, context);
    },

    // Mutation key
    mutationKey: keys().data().mutation("create").get(),
  });

  // ==========================================
  // BƯỚC 3: TẠO WRAPPER FUNCTIONS
  // ==========================================
  const { mutate, mutateAsync, ...mutation } = mutationResult;

  // Wrapper cho mutate() - cho phép variables là optional
  const handleMutation = (variables?, options?) => {
    return mutate(variables || {}, options);
  };

  // Wrapper cho mutateAsync()
  const handleMutateAsync = (variables?, options?) => {
    return mutateAsync(variables || {}, options);
  };

  // ==========================================
  // BƯỚC 4: THEO DÕI LOADING OVERTIME
  // ==========================================
  const { elapsedTime } = useLoadingOvertime({
    isLoading: mutation.isPending,
    ...overtimeOptions
  });

  // ==========================================
  // BƯỚC 5: RETURN KẾT QUẢ
  // ==========================================
  return {
    mutate: handleMutation,
    mutateAsync: handleMutateAsync,
    mutation: mutationResult,
    overtime: { elapsedTime },
  };
};
```

---

## 6. LUỒNG DỮ LIỆU CHI TIẾT

### 6.1. Luồng Thành Công (Success Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUCCESS FLOW                                │
└─────────────────────────────────────────────────────────────────┘

1. USER ACTION
   ↓
   User clicks "Create Post" button
   ↓

2. COMPONENT CALLS mutate()
   ↓
   mutate({
     resource: "posts",
     values: { title: "New Post", content: "Hello" }
   })
   ↓

3. WRAPPER FUNCTION (handleMutation)
   ↓
   handleMutation(variables, options)
   ↓
   mutate(variables || {}, options)  // Gọi React Query's mutate
   ↓

4. REACT QUERY TRIGGERS mutationFn
   ↓
   mutationFn({
     resource: "posts",
     values: { title: "New Post", content: "Hello" }
   })
   ↓

5. VALIDATION
   ↓
   if (!values) throw missingValuesError;   ✅ Pass
   if (!resourceName) throw missingResourceError;  ✅ Pass
   ↓

6. GET RESOURCE CONFIG
   ↓
   const { resource, identifier } = select("posts");
   // resource = { name: "posts", ... }
   // identifier = "posts"
   ↓

7. COMBINE METADATA
   ↓
   const combinedMeta = getMeta({ resource, meta });
   // Kết hợp meta từ: resource + URL params + props + context
   ↓

8. CALL API (qua Data Provider)
   ↓
   dataProvider("default").create({
     resource: "posts",
     variables: { title: "New Post", content: "Hello" },
     meta: combinedMeta
   })
   ↓
   HTTP Request:
   POST /api/posts
   Body: { "title": "New Post", "content": "Hello" }
   ↓

9. SERVER PROCESSES REQUEST
   ↓
   Server saves to database
   ↓
   Returns response:
   {
     data: {
       id: 123,
       title: "New Post",
       content: "Hello",
       createdAt: "2025-11-20T10:00:00Z"
     }
   }
   ↓

10. mutationFn RETURNS PROMISE
    ↓
    return Promise.resolve(response)
    ↓

11. REACT QUERY CALLS onSuccess CALLBACK
    ↓
    onSuccess(data, variables, context)
    ↓
    data = { data: { id: 123, title: "New Post", ... } }
    variables = { resource: "posts", values: {...} }
    ↓

12. SHOW SUCCESS NOTIFICATION
    ↓
    handleNotification({
      message: "Successfully created post",
      description: "Success",
      type: "success"
    })
    ↓
    🎉 Toast appears: "Successfully created post"
    ↓

13. INVALIDATE CACHE
    ↓
    invalidateStore({
      resource: "posts",
      dataProviderName: "default",
      invalidates: ["list", "many"]
    })
    ↓
    React Query invalidates:
    - ["data", "default", "posts", "list"]    → useList refetch
    - ["data", "default", "posts", "many"]    → useMany refetch
    ↓
    📋 List automatically updates with new post!
    ↓

14. PUBLISH REALTIME EVENT
    ↓
    publish({
      channel: "resources/posts",
      type: "created",
      payload: { ids: [123] },
      date: new Date()
    })
    ↓
    📡 Other users receive notification: "New post created"
    ↓

15. LOG AUDIT TRAIL
    ↓
    log.mutate({
      action: "create",
      resource: "posts",
      data: { title: "New Post", ... },
      meta: { id: 123 }
    })
    ↓
    📝 Audit log saved: "User X created post #123 at 10:00:00"
    ↓

16. CALL CUSTOM onSuccess CALLBACK (if provided)
    ↓
    mutationOptions?.onSuccess?.(data, variables, context)
    ↓
    // User's custom logic executes
    ↓

17. UPDATE UI STATE
    ↓
    mutation.isPending = false
    mutation.isSuccess = true
    mutation.data = { data: { id: 123, ... } }
    ↓

18. COMPONENT RE-RENDERS
    ↓
    Button changes from "Creating..." to "Create Post"
    ↓

✅ DONE! User sees success notification & updated list
```

### 6.2. Luồng Lỗi (Error Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERROR FLOW                                 │
└─────────────────────────────────────────────────────────────────┘

1-8. [Same as Success Flow up to API call]
    ↓

9. SERVER RETURNS ERROR
   ↓
   Response: 400 Bad Request
   {
     statusCode: 400,
     message: "Title is required",
     errors: { title: ["Title cannot be empty"] }
   }
   ↓

10. mutationFn THROWS ERROR
    ↓
    throw new HttpError("Title is required", 400, {...})
    ↓

11. REACT QUERY CALLS onError CALLBACK
    ↓
    onError(err, variables, context)
    ↓
    err = {
      statusCode: 400,
      message: "Title is required",
      errors: {...}
    }
    ↓

12. LAYER 1 - CHECK AUTH ERRORS
    ↓
    checkError(err)
    ↓
    if (err.statusCode === 401) {
      // Logout & redirect
      authProvider.onError(err);
      navigate("/login");
      STOP HERE! ❌
    }
    if (err.statusCode === 403) {
      // Redirect to access denied
      navigate("/access-denied");
      STOP HERE! ❌
    }
    // 400 error → Continue to next layer ⏭️
    ↓

13. LAYER 2 - SHOW ERROR NOTIFICATION
    ↓
    handleNotification({
      message: "There was an error creating post (status code: 400)",
      description: "Title is required",
      type: "error"
    })
    ↓
    🚨 Error toast appears: "Error creating post - Title is required"
    ↓

14. LAYER 3 - CALL CUSTOM onError CALLBACK (if provided)
    ↓
    mutationOptions?.onError?.(err, variables, context)
    ↓
    // User's custom error handling
    // Example: Send to Sentry, show modal, etc.
    ↓

15. UPDATE UI STATE
    ↓
    mutation.isPending = false
    mutation.isError = true
    mutation.error = { statusCode: 400, message: "Title is required" }
    ↓

16. COMPONENT RE-RENDERS
    ↓
    Button changes from "Creating..." to "Create Post"
    Error message displayed: "Title is required"
    ↓

❌ DONE! User sees error & can retry
```

---

## 7. TƯƠNG TÁC VỚI REACT QUERY

### 7.1. React Query APIs Được Sử Dụng

#### 7.1.1. useMutation Hook

```typescript
const mutationResult = useMutation({
  mutationFn: (variables) => Promise,  // ← Hàm thực hiện mutation
  onSuccess: (data, variables, context) => void,  // ← Callback thành công
  onError: (error, variables, context) => void,   // ← Callback lỗi
  onMutate: (variables) => context,    // ← Callback trước khi mutate
  mutationKey: ['key'],                // ← Key để tracking
  retry: 3,                            // ← Số lần retry
  retryDelay: 1000,                    // ← Delay giữa các retry
});
```

**Refine sử dụng:**

- ✅ `mutationFn` - Gọi dataProvider.create()
- ✅ `onSuccess` - Xử lý notification, invalidation, logging
- ✅ `onError` - Xử lý error handling
- ✅ `mutationKey` - Tracking với DevTools
- ❌ `onMutate` - Không dùng (có thể extend sau)
- ❌ `retry` - Không dùng (có thể config qua mutationOptions)

#### 7.1.2. QueryClient Methods

**invalidateQueries** - Xóa cache và trigger refetch

```typescript
// Refine gọi qua useInvalidate hook
invalidateStore({
  resource: "posts",
  dataProviderName: "default",
  invalidates: ["list", "many"],
});

// Internally, useInvalidate gọi:
queryClient.invalidateQueries({
  queryKey: ["data", "default", "posts", "list"],
});
queryClient.invalidateQueries({
  queryKey: ["data", "default", "posts", "many"],
});
```

**Kết quả:**

- ✅ Tất cả useList({ resource: "posts" }) sẽ refetch
- ✅ Tất cả useMany({ resource: "posts", ... }) sẽ refetch
- ✅ UI tự động update với data mới!

### 7.2. Query Keys Structure

Refine tổ chức query keys theo cấu trúc chuẩn:

```typescript
["data", dataProviderName, resource, type, params];
```

**Ví dụ:**

```typescript
// useList({ resource: "posts" })
["data", "default", "posts", "list", { pagination: {...}, filters: {...} }]

// useOne({ resource: "posts", id: 1 })
["data", "default", "posts", "detail", 1]

// useMany({ resource: "posts", ids: [1, 2, 3] })
["data", "default", "posts", "many", [1, 2, 3]]

// useCreate mutation
["data", "mutation", "create"]
```

**Tại sao cần structure?**

- ✅ Dễ invalidate theo pattern
- ✅ Dễ debug với DevTools
- ✅ Dễ filter queries

### 7.3. Cache Invalidation Strategy

**Khi tạo mới post, cần invalidate những gì?**

```typescript
invalidates: ["list", "many"]; // Default value
```

**Giải thích:**

```
User creates post #123
    ↓
invalidateStore({ invalidates: ["list", "many"] })
    ↓
Invalidate these queries:
    ├── ["data", "default", "posts", "list", ...]
    │   → useList refetch → User sees new post in list ✅
    │
    └── ["data", "default", "posts", "many", ...]
        → useMany refetch → Cards/widgets update ✅

NOT invalidated:
    ├── ["data", "default", "posts", "detail", 456]
    │   → useOne for post #456 still uses cache
    │   (vì post #456 không thay đổi, không cần refetch)
    │
    └── ["data", "default", "users", "list", ...]
        → Users list không liên quan, giữ nguyên cache
```

**Custom invalidates:**

```typescript
const { mutate } = useCreate();

// Invalidate cả detail (nếu cần)
mutate({
  resource: "posts",
  values: {...},
  invalidates: ["list", "many", "detail"]
});

// Không invalidate gì (nếu không muốn refetch)
mutate({
  resource: "posts",
  values: {...},
  invalidates: []
});
```

---

## 8. CÁC PATTERN THIẾT KẾ

### 8.1. Default Props with Override Pattern

**Vấn đề:** Làm sao cho phép user config mặc định nhưng vẫn có thể override khi cần?

**Giải pháp:**

```typescript
// Khởi tạo với default values
const { mutate } = useCreate({
  resource: "posts", // ← resourceFromProps
  values: { author: "John" }, // ← valuesFromProps
  successNotification: { message: "Created!" },
});

// Sử dụng defaults
mutate();
// → resource = "posts", values = { author: "John" }

// Override một phần
mutate({
  values: { title: "New", author: "John" },
});
// → resource = "posts" (từ props), values = overridden

// Override hoàn toàn
mutate({
  resource: "comments",
  values: { text: "Nice post!" },
});
// → Tất cả đều overridden
```

**Cách implement:**

```typescript
// 1. Lưu props vào biến với tên khác
export const useCreate = ({
  resource: resourceFromProps,
  values: valuesFromProps,
  // ...
}) => {
  // 2. Sử dụng default parameters
  mutationFn: ({
    resource: resourceName = resourceFromProps,
    values = valuesFromProps,
    // ...
  }) => {
    // resourceName sẽ là:
    // - Giá trị từ mutate() nếu được truyền
    // - resourceFromProps nếu không truyền
  };
};
```

### 8.2. Multi-Layer Error Handling Pattern

**Vấn đề:** Các loại lỗi cần xử lý khác nhau, làm sao tổ chức code?

**Giải pháp:** 3 layers xử lý lỗi độc lập

```typescript
onError: (err, variables, context) => {
  // LAYER 1: Auth errors (401, 403)
  // Mục đích: Logout & redirect
  // Scope: Global, áp dụng cho tất cả mutations
  checkError(err);
  if (err.statusCode === 401) {
    logout();
    redirect("/login");
    return; // STOP
  }

  // LAYER 2: User notification
  // Mục đích: Hiển thị lỗi cho user
  // Scope: Per-mutation
  handleNotification({
    message: "Error creating post",
    description: err.message,
    type: "error",
  });

  // LAYER 3: Custom callback
  // Mục đích: Logic riêng của user
  // Scope: Per-call
  mutationOptions?.onError?.(err);
  // User có thể: send to Sentry, show modal, retry, etc.
};
```

**Lợi ích:**

- ✅ Separation of concerns
- ✅ Dễ maintain
- ✅ Flexible - user có thể extend

### 8.3. Wrapper Function Pattern

**Vấn đề:** React Query's `mutate()` require variables, nhưng Refine muốn nó optional.

**Giải pháp:** Tạo wrapper function

```typescript
// React Query's mutate - variables là bắt buộc
const { mutate } = useMutation({...});
mutate();  // ❌ Error: Expected 1 argument

// Refine's handleMutation - variables là optional
const handleMutation = (variables?, options?) => {
  return mutate(variables || {}, options);
};
mutate();  // ✅ Works! Uses default props
```

### 8.4. Dependency Injection Pattern

**Vấn đề:** useCreate cần nhiều services (notification, logging, etc.), làm sao quản lý?

**Giải pháp:** Inject dependencies qua hooks

```typescript
export const useCreate = (props) => {
  // Inject dependencies
  const dataProvider = useDataProvider();
  const invalidateStore = useInvalidate();
  const handleNotification = useHandleNotification();
  const translate = useTranslate();
  const publish = usePublish();
  const { log } = useLog();

  // Use dependencies trong mutation
  useMutation({
    onSuccess: () => {
      handleNotification(...);
      invalidateStore(...);
      publish(...);
      log(...);
    }
  });
}
```

**Lợi ích:**

- ✅ Testable - có thể mock hooks
- ✅ Flexible - user có thể override hooks
- ✅ Loose coupling

---

## 9. VÍ DỤ THỰC TẾ TỪ A-Z

### 9.1. Basic Usage

```typescript
import { useCreate } from "@refinedev/core";

function CreatePostButton() {
  const { mutate, isPending } = useCreate();

  const handleClick = () => {
    mutate({
      resource: "posts",
      values: {
        title: "My New Post",
        content: "Hello World",
      },
    });
  };

  return (
    <button onClick={handleClick} disabled={isPending}>
      {isPending ? "Creating..." : "Create Post"}
    </button>
  );
}
```

**Điều gì xảy ra:**

1. User clicks button
2. `mutate()` được gọi với resource và values
3. useCreate gọi `dataProvider("default").create({ resource: "posts", variables: {...} })`
4. Data provider POST lên `/api/posts`
5. Server trả về `{ data: { id: 123, title: "...", ... } }`
6. onSuccess callback chạy:
   - Show toast "Successfully created post"
   - Invalidate ["list", "many"] queries
   - Publish event "created"
   - Log audit trail
7. UI updates: isPending = false, button re-enables

### 9.2. With Form

```typescript
import { useCreate } from "@refinedev/core";
import { useState } from "react";

function CreatePostForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const { mutate, isPending, isError, error } = useCreate();

  const handleSubmit = (e) => {
    e.preventDefault();

    mutate(
      {
        resource: "posts",
        values: { title, content },
      },
      {
        onSuccess: (data) => {
          // Reset form
          setTitle("");
          setContent("");
          console.log("Created post:", data.data);
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
      />
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Content"
      />
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create"}
      </button>
      {isError && <div>Error: {error.message}</div>}
    </form>
  );
}
```

### 9.3. With Async/Await

```typescript
function CreatePostButton() {
  const { mutateAsync } = useCreate();

  const handleClick = async () => {
    try {
      const result = await mutateAsync({
        resource: "posts",
        values: { title: "New Post" },
      });

      console.log("Created:", result.data);

      // Có thể làm gì đó với result
      const postId = result.data.id;
      navigate(`/posts/${postId}`);
    } catch (error) {
      console.error("Failed to create:", error);
    }
  };

  return <button onClick={handleClick}>Create Post</button>;
}
```

### 9.4. With Default Values

```typescript
function QuickCreateButton() {
  // Config sẵn trong hook
  const { mutate } = useCreate({
    resource: "posts",
    values: {
      status: "draft",
      author: currentUser.id,
    },
    successNotification: {
      message: "Draft created!",
      type: "success",
    },
  });

  // Chỉ cần truyền thêm title
  const handleClick = () => {
    const title = prompt("Enter post title:");
    if (title) {
      mutate({
        values: { title }, // Merge với default values
      });
    }
  };

  return <button onClick={handleClick}>Quick Create Draft</button>;
}
```

### 9.5. With Custom Notifications

```typescript
function CreatePostForm() {
  const { mutate } = useCreate();

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values,
      successNotification: (data, values, resource) => ({
        message: `Post "${data.data.title}" created successfully!`,
        description: `You can view it at /posts/${data.data.id}`,
        type: "success",
      }),
      errorNotification: (error, values, resource) => ({
        message: "Oops! Failed to create post",
        description: error.message,
        type: "error",
      }),
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 9.6. With Custom Invalidation

```typescript
function CreateCommentButton({ postId }) {
  const { mutate } = useCreate();

  const handleClick = () => {
    mutate({
      resource: "comments",
      values: {
        postId,
        text: "Nice post!",
      },
      invalidates: ["list", "detail"], // Cũng invalidate detail của post
    });
  };

  return <button onClick={handleClick}>Add Comment</button>;
}
```

### 9.7. Advanced - With Optimistic Update

```typescript
function CreatePostButton() {
  const queryClient = useQueryClient();

  const { mutate } = useCreate({
    mutationOptions: {
      // Optimistic update - update UI ngay, chưa chờ server
      onMutate: async (variables) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries(['posts', 'list']);

        // Snapshot current value
        const previousPosts = queryClient.getQueryData(['posts', 'list']);

        // Optimistically update cache
        queryClient.setQueryData(['posts', 'list'], (old) => ({
          ...old,
          data: [
            { id: 'temp-' + Date.now(), ...variables.values },
            ...old.data
          ]
        }));

        // Return context with snapshot
        return { previousPosts };
      },

      // On error, rollback
      onError: (err, variables, context) => {
        queryClient.setQueryData(['posts', 'list'], context.previousPosts);
      },

      // On success, refetch to get real data from server
      onSettled: () => {
        queryClient.invalidateQueries(['posts', 'list']);
      }
    }
  });

  return <button onClick={() => mutate({...})}>Create</button>;
}
```

---

## 10. TÓM TẮT & KẾT LUẬN

### 10.1. Tóm Tắt Ngắn Gọn

**useCreate là gì?**

- Custom hook của Refine để tạo mới dữ liệu
- Được xây dựng trên `useMutation` của React Query
- Tự động xử lý notification, cache invalidation, logging, realtime

**Khi nào dùng?**

- Khi cần POST dữ liệu lên server (create operations)
- Khi cần tích hợp với Refine ecosystem (data provider, notifications, etc.)

**Cách hoạt động?**

1. User gọi `mutate({ resource, values })`
2. Hook gọi `dataProvider.create()`
3. Server trả về response
4. onSuccess: notification + invalidate cache + publish + log
5. UI tự động update

### 10.2. So Sánh Với Các Hooks Khác

```
┌──────────────┬─────────────┬─────────────┬─────────────┐
│              │ useCreate   │ useUpdate   │ useDelete   │
├──────────────┼─────────────┼─────────────┼─────────────┤
│ Mục đích     │ Tạo mới     │ Cập nhật    │ Xóa         │
│ HTTP Method  │ POST        │ PUT/PATCH   │ DELETE      │
│ Input        │ values      │ id + values │ id          │
│ useMutation  │ ✅          │ ✅          │ ✅          │
│ Invalidates  │ list, many  │ list, detail│ list, many  │
└──────────────┴─────────────┴─────────────┴─────────────┘

┌──────────────┬─────────────┬─────────────────────────┐
│              │ useCreate   │ useOne                  │
│              │ (Mutation)  │ (Query)                 │
├──────────────┼─────────────┼─────────────────────────┤
│ Tự động chạy │ ❌ Manual   │ ✅ Automatic            │
│ Cache        │ ❌          │ ✅                      │
│ Refetch      │ ❌          │ ✅                      │
│ Return       │ mutate()    │ data, isLoading         │
└──────────────┴─────────────┴─────────────────────────┘
```

### 10.3. Key Takeaways

✅ **useCreate = useMutation + Refine Features**

- useMutation (React Query) - Core mutation logic
- Refine wrapper - Notifications, invalidation, logging, realtime

✅ **Mutations ≠ Queries**

- Queries: Read data, auto-fetch, cache
- Mutations: Write data, manual trigger, no cache

✅ **Multi-Layer Architecture**

- Layer 1: useCreate (Refine API)
- Layer 2: useMutation (React Query API)
- Layer 3: dataProvider (API abstraction)
- Layer 4: fetch/axios (HTTP client)

✅ **Automatic Side Effects**

- ✅ Notifications (success/error toasts)
- ✅ Cache invalidation (auto refetch lists)
- ✅ Realtime events (notify other users)
- ✅ Audit logging (track actions)
- ✅ Error handling (auth errors, etc.)

✅ **Flexible & Extensible**

- Default props with override
- Custom callbacks
- Custom notifications
- Custom invalidation
- Optimistic updates (advanced)

### 10.4. Khi Nào KHÔNG Nên Dùng useCreate?

❌ **Không phải CRUD operations**

```typescript
// Ví dụ: Tải file lên server (không phải create record)
// → Dùng custom mutation
const { mutate } = useMutation({
  mutationFn: (file) => uploadFile(file),
});
```

❌ **Không dùng Refine ecosystem**

```typescript
// Nếu project không dùng Refine
// → Dùng trực tiếp useMutation (React Query)
import { useMutation } from "@tanstack/react-query";
```

❌ **Cần control rất chi tiết**

```typescript
// Nếu cần custom logic phức tạp không fit vào pattern
// → Dùng useMutation + custom code
```

### 10.5. Best Practices

✅ **DO:**

- Dùng useCreate cho create operations trong Refine
- Config default values nếu dùng lại nhiều lần
- Dùng mutateAsync khi cần await
- Customize notifications khi cần
- Xử lý errors với try-catch (khi dùng mutateAsync)

❌ **DON'T:**

- Dùng useCreate cho non-CRUD operations
- Quên handle loading state (isPending)
- Bỏ qua error handling
- Over-invalidate cache (tốn performance)

### 10.6. Next Steps

📚 **Để hiểu sâu hơn, học tiếp:**

1. `useUpdate` - Update dữ liệu
2. `useDelete` - Xóa dữ liệu
3. `useList` - Lấy danh sách (Query)
4. `useOne` - Lấy chi tiết (Query)
5. Data Providers - API abstraction layer
6. React Query DevTools - Debug mutations & queries

---

## PHỤ LỤC: GLOSSARY

**Mutation** - Thao tác thay đổi dữ liệu (create, update, delete)

**Query** - Thao tác đọc dữ liệu (fetch, get)

**Cache Invalidation** - Xóa cache để trigger refetch

**Optimistic Update** - Update UI trước, chờ server confirm sau

**Data Provider** - Abstraction layer cho API calls

**Query Key** - Key để identify & cache queries

**Mutation Key** - Key để track mutations

**onSuccess Callback** - Function chạy khi mutation thành công

**onError Callback** - Function chạy khi mutation lỗi

**isPending** - Boolean state cho biết mutation đang chạy

**mutate** - Function trigger mutation (fire & forget)

**mutateAsync** - Async version của mutate (returns Promise)

---

🎉 **Chúc mừng!** Bạn đã hiểu hoàn chỉnh về useCreate hook!

Nếu vẫn còn bối rối về phần nào, hãy đọc lại phần đó hoặc chạy ví dụ thực tế để thấy rõ hơn.

**Remember:** The best way to learn is by doing! 🚀
