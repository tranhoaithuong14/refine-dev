# useNotification Hook - Kiến trúc và Thiết kế

## 1. Vai trò trong hệ thống

`useNotification` là hook **Facade** cung cấp truy cập đơn giản tới hệ thống notification của Refine. Hook này hoạt động như một "cửa sổ" (window) cho phép bất kỳ component nào cũng có thể hiển thị hoặc đóng thông báo mà không cần biết implementation chi tiết của notification provider.

```
┌─────────────────────────────────────────────────────────────────┐
│                      REFINE APPLICATION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Component A │  │  Component B │  │  Component C │          │
│  │              │  │              │  │              │          │
│  │ useNotif()   │  │ useNotif()   │  │ useNotif()   │          │
│  │  .open()     │  │  .close()    │  │  .open()     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                           ▼                                     │
│              ┌─────────────────────────┐                        │
│              │  useNotification Hook   │ ◄── Facade Pattern     │
│              │  (Simple 10-line API)   │                        │
│              └────────────┬────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌─────────────────────────┐                        │
│              │  NotificationContext    │                        │
│              │  { open, close }        │                        │
│              └────────────┬────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌─────────────────────────┐                        │
│              │  NotificationProvider   │ ◄── Strategy Pattern   │
│              │  (Ant Design / MUI /    │                        │
│              │   Mantine / Custom)     │                        │
│              └────────────┬────────────┘                        │
│                           │                                     │
│                           ▼                                     │
│              ┌─────────────────────────┐                        │
│              │   UI Notification       │                        │
│              │   (Toast / Snackbar)    │                        │
│              └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

**Ví dụ thực tế:**
Giống như công tắc đèn trong nhà - bạn chỉ cần bấm công tắc (gọi `open()`), không cần biết hệ thống điện phía sau hoạt động thế nào (Ant Design notification, MUI Snackbar, hay custom notification system).

## 2. Luồng hoạt động chi tiết

### Flow: Hiển thị notification

```
┌──────────────┐
│  Component   │
│  Button      │
└──────┬───────┘
       │ 1. User click "Save"
       ▼
┌──────────────────────────────────────┐
│ const { open } = useNotification();  │
│                                      │
│ onClick = () => {                    │
│   open?.({                           │
│     message: "Saved!",               │
│     type: "success"                  │
│   });                                │
│ }                                    │
└──────┬───────────────────────────────┘
       │ 2. Call open with params
       ▼
┌──────────────────────────────┐
│  useNotification Hook        │
│  ┌────────────────────────┐  │
│  │ useContext(             │  │
│  │   NotificationContext   │  │
│  │ )                       │  │
│  │ → { open, close }       │  │
│  └────────────────────────┘  │
└──────┬───────────────────────┘
       │ 3. Extract from context
       ▼
┌──────────────────────────────┐
│  NotificationContext         │
│  ┌────────────────────────┐  │
│  │ Provider wraps app     │  │
│  │ with { open, close }   │  │
│  └────────────────────────┘  │
└──────┬───────────────────────┘
       │ 4. Route to provider
       ▼
┌────────────────────────────────────┐
│  NotificationProvider              │
│  (e.g., Ant Design)                │
│  ┌──────────────────────────────┐  │
│  │ open: (params) => {          │  │
│  │   notification[params.type]({│  │
│  │     message: params.message, │  │
│  │     description: params.desc │  │
│  │   });                        │  │
│  │ }                            │  │
│  └──────────────────────────────┘  │
└────────┬───────────────────────────┘
         │ 5. Execute UI library
         ▼
   ┌─────────────────────┐
   │  🎉 Success Toast   │
   │  "Saved!"           │
   └─────────────────────┘
```

### Flow: Đóng notification

```
┌──────────────┐
│  Component   │
│  or Timer    │
└──────┬───────┘
       │ 1. Need to close notification
       ▼
┌──────────────────────────────────────┐
│ const { close } = useNotification(); │
│                                      │
│ // Close specific notification      │
│ close?.("my-notification-key");     │
│                                      │
│ // Or auto-close after timeout      │
│ setTimeout(() => {                  │
│   close?.("temp-notification");     │
│ }, 3000);                           │
└──────┬───────────────────────────────┘
       │ 2. Call close with key
       ▼
┌──────────────────────────────┐
│  NotificationContext         │
│  → routes to provider.close  │
└──────┬───────────────────────┘
       │ 3. Find and close by key
       ▼
┌────────────────────────────────────┐
│  NotificationProvider              │
│  ┌──────────────────────────────┐  │
│  │ close: (key) => {            │  │
│  │   notification.close(key);   │  │
│  │ }                            │  │
│  └──────────────────────────────┘  │
└────────┬───────────────────────────┘
         │ 4. Remove from DOM
         ▼
   ┌─────────────────────┐
   │  ✖ Toast removed    │
   └─────────────────────┘
```

### Flow: Integration với mutation hooks

```
┌──────────────────────────────────────┐
│  useCreate / useUpdate Hook          │
│  ┌────────────────────────────────┐  │
│  │ const { open, close } =        │  │
│  │   useNotification();           │  │
│  │                                │  │
│  │ useMutation({                  │  │
│  │   onMutate: () => {            │  │
│  │     // Show progress           │  │
│  │     open?.({                   │  │
│  │       key: "create-123",       │  │
│  │       message: "Creating...",  │  │
│  │       type: "progress"         │  │
│  │     });                        │  │
│  │   },                           │  │
│  │   onSuccess: () => {           │  │
│  │     // Close progress          │  │
│  │     close?.("create-123");     │  │
│  │     // Show success            │  │
│  │     open?.({                   │  │
│  │       message: "Created!",     │  │
│  │       type: "success"          │  │
│  │     });                        │  │
│  │   },                           │  │
│  │   onError: (error) => {        │  │
│  │     // Close progress          │  │
│  │     close?.("create-123");     │  │
│  │     // Show error              │  │
│  │     open?.({                   │  │
│  │       message: error.message,  │  │
│  │       type: "error"            │  │
│  │     });                        │  │
│  │   }                            │  │
│  │ });                            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘

Timeline:
─────────────────────────────────────►
│        │           │
│        │           └─ onError: close progress → open error
│        └─ onSuccess: close progress → open success
└─ onMutate: open progress notification
```

## 3. Design Patterns

### 3.1. Facade Pattern

Hook che giấu complexity của notification system đằng sau interface đơn giản 2 method.

**Real-world analogy:** Giống như remote TV - bạn chỉ cần bấm nút Volume, không cần biết bên trong có bao nhiêu chip, mạch điện.

```typescript
// ❌ Without Facade - complex
import { NotificationContext } from "@contexts/notification";
import { useContext } from "react";

function MyComponent() {
  const notificationContext = useContext(NotificationContext);

  // Phải kiểm tra nhiều lần
  if (notificationContext && notificationContext.open) {
    notificationContext.open({
      message: "Hello",
      type: "success",
    });
  }
}

// ✅ With Facade - simple
import { useNotification } from "@refinedev/core";

function MyComponent() {
  const { open } = useNotification();

  // Gọn gàng với optional chaining
  open?.({
    message: "Hello",
    type: "success",
  });
}
```

### 3.2. Dependency Injection Pattern

NotificationProvider được inject vào app qua Context, hook chỉ consume.

**Real-world analogy:** Giống như hệ thống điện trong nhà - bạn cắm thiết bị vào ổ cắm (context), không cần tự tạo nguồn điện.

```typescript
// App setup - inject provider
import { Refine } from "@refinedev/core";
import { notificationProvider } from "@refinedev/antd";

<Refine
  notificationProvider={notificationProvider}
  // Provider được inject vào context tree
>
  <App />
</Refine>;

// Component usage - consume
function MyComponent() {
  // Hook tự động nhận provider từ context
  const { open } = useNotification();
  return (
    <button onClick={() => open?.({ message: "Hi", type: "success" })}>
      Click
    </button>
  );
}
```

### 3.3. Optional Chaining Pattern

Hook trả về optional methods để tránh crash khi provider chưa setup.

**Real-world analogy:** Giống như kiểm tra cửa có khóa không trước khi mở - nếu không có khóa thì không làm gì (không crash).

```typescript
function MyComponent() {
  const { open, close } = useNotification();

  // ✅ Safe - không crash nếu provider undefined
  open?.({
    message: "Test",
    type: "success",
  });

  // ❌ Unsafe - sẽ crash: "Cannot read property 'open' of undefined"
  // open({
  //   message: "Test",
  //   type: "success"
  // });

  // ✅ Có thể kiểm tra trước
  if (open) {
    open({ message: "Test", type: "success" });
  }
}
```

### 3.4. Strategy Pattern (Provider Level)

Different notification providers implement same interface differently.

**Real-world analogy:** Giống như thanh toán - bạn có thể dùng tiền mặt, thẻ, hoặc ví điện tử, nhưng interface đều là "thanh toán".

```typescript
// Strategy 1: Ant Design
import { notification } from "antd";

export const antdNotificationProvider = {
  open: (params) => {
    notification[params.type]({
      message: params.message,
      description: params.description,
      key: params.key,
    });
  },
  close: (key) => {
    notification.close(key);
  },
};

// Strategy 2: Material-UI
import { enqueueSnackbar, closeSnackbar } from "notistack";

export const muiNotificationProvider = {
  open: (params) => {
    enqueueSnackbar(params.message, {
      variant: params.type,
      key: params.key,
    });
  },
  close: (key) => {
    closeSnackbar(key);
  },
};

// Strategy 3: Custom (Console.log for testing)
export const consoleNotificationProvider = {
  open: (params) => {
    console.log(`[${params.type.toUpperCase()}]`, params.message);
  },
  close: (key) => {
    console.log(`[CLOSE]`, key);
  },
};

// Usage: Same interface, different implementation
<Refine
  notificationProvider={antdNotificationProvider}
  // or muiNotificationProvider
  // or consoleNotificationProvider
/>;
```

### 3.5. Observer Pattern (Implicit)

Mutations observe notification system để report progress/success/error.

**Real-world analogy:** Giống như đèn báo trên bảng điều khiển xe - khi có vấn đề (lỗi), đèn tự động bật (notification tự động hiển thị).

```typescript
function useCreatePost() {
  const { open, close } = useNotification();
  const { mutate } = useCreate();

  const createPost = (data) => {
    mutate(
      { resource: "posts", values: data },
      {
        // Observer callbacks
        onMutate: () => {
          open?.({
            key: "create-post",
            message: "Creating post...",
            type: "progress",
          });
        },
        onSuccess: () => {
          close?.("create-post");
          open?.({
            message: "Post created successfully!",
            type: "success",
          });
        },
        onError: (error) => {
          close?.("create-post");
          open?.({
            message: error.message,
            type: "error",
          });
        },
      },
    );
  };

  return { createPost };
}
```

## 4. Các tính năng chính

### 4.1. Simple API - Chỉ 2 methods

```typescript
const { open, close } = useNotification();

// open: Display notification
open?.({
  key?: string;              // Unique ID (optional)
  message: string;           // Main text (required)
  type: "success" | "error" | "progress"; // Type (required)
  description?: string;      // Detail text (optional)
  undoableTimeout?: number;  // For progress type
  cancelMutation?: () => void; // Cancel callback
});

// close: Remove notification by key
close?.(key: string);
```

### 4.2. Type-safe với TypeScript

```typescript
import type { OpenNotificationParams } from "@refinedev/core";

// ✅ Type checking
const params: OpenNotificationParams = {
  message: "Hello",
  type: "success", // Must be "success" | "error" | "progress"
  description: "Detail",
};

// ❌ TypeScript error
const invalid: OpenNotificationParams = {
  message: "Hello",
  type: "warning", // Error: Type '"warning"' is not assignable
};
```

### 4.3. Optional Chaining - Safe by default

```typescript
function MyComponent() {
  const { open } = useNotification();

  // ✅ Không crash ngay cả khi provider = undefined
  open?.({ message: "Test", type: "success" });

  // Alternative: Manual check
  if (open) {
    open({ message: "Test", type: "success" });
  }
}
```

### 4.4. Progress Notifications với Undo

```typescript
function DeleteWithUndo() {
  const { open, close } = useNotification();
  const { mutate } = useDelete();

  const handleDelete = (id: string) => {
    // Tạo cancel token
    let cancelled = false;

    // Show progress notification with undo
    open?.({
      key: `delete-${id}`,
      message: "Deleting post...",
      description: "Click to undo",
      type: "progress",
      undoableTimeout: 5000, // 5 seconds to undo
      cancelMutation: () => {
        cancelled = true;
        close?.(`delete-${id}`);
        open?.({
          message: "Deletion cancelled",
          type: "success",
        });
      },
    });

    // Execute after timeout
    setTimeout(() => {
      if (!cancelled) {
        mutate({ resource: "posts", id });
      }
    }, 5000);
  };

  return <button onClick={() => handleDelete("123")}>Delete</button>;
}
```

### 4.5. Chainable với các hooks khác

```typescript
function CompleteFlow() {
  const { open, close } = useNotification();
  const invalidate = useInvalidate();
  const { mutate } = useUpdate();

  const updatePost = (id: string, data: any) => {
    mutate(
      { resource: "posts", id, values: data },
      {
        onMutate: () => {
          open?.({
            key: "update",
            message: "Updating...",
            type: "progress",
          });
        },
        onSuccess: () => {
          // Chain 1: Close progress
          close?.("update");

          // Chain 2: Show success
          open?.({
            message: "Updated successfully!",
            type: "success",
          });

          // Chain 3: Invalidate cache
          invalidate({
            resource: "posts",
            invalidates: ["detail", "list"],
          });
        },
      },
    );
  };

  return (
    <button onClick={() => updatePost("1", { title: "New" })}>Update</button>
  );
}
```

## 5. Use Cases thực tế

### 5.1. Form submission success/error

```typescript
function CreatePostForm() {
  const { open } = useNotification();
  const { mutate, isLoading } = useCreate();

  const onSubmit = (values: any) => {
    mutate(
      { resource: "posts", values },
      {
        onSuccess: (data) => {
          open?.({
            message: "Post created successfully!",
            description: `Post ID: ${data.data.id}`,
            type: "success",
          });
        },
        onError: (error) => {
          open?.({
            message: "Failed to create post",
            description: error.message,
            type: "error",
          });
        },
      },
    );
  };

  return (
    <form onSubmit={onSubmit}>
      {/* form fields */}
      <button type="submit" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

### 5.2. Undoable delete với countdown

```typescript
function PostList() {
  const { open, close } = useNotification();
  const { mutate } = useDelete();

  const handleDelete = (id: string) => {
    let timeoutId: NodeJS.Timeout;

    open?.({
      key: `delete-${id}`,
      message: "Post will be deleted in 5 seconds",
      description: "Click to undo",
      type: "progress",
      undoableTimeout: 5000,
      cancelMutation: () => {
        clearTimeout(timeoutId);
        close?.(`delete-${id}`);
        open?.({
          message: "Deletion cancelled",
          type: "success",
        });
      },
    });

    timeoutId = setTimeout(() => {
      mutate(
        { resource: "posts", id },
        {
          onSuccess: () => {
            close?.(`delete-${id}`);
            open?.({
              message: "Post deleted",
              type: "success",
            });
          },
        },
      );
    }, 5000);
  };

  return (
    <div>
      {posts.map((post) => (
        <div key={post.id}>
          {post.title}
          <button onClick={() => handleDelete(post.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
```

### 5.3. Multi-step operation với progress updates

```typescript
function BatchImport() {
  const { open, close } = useNotification();

  const importData = async (files: File[]) => {
    const totalFiles = files.length;

    for (let i = 0; i < totalFiles; i++) {
      open?.({
        key: "import",
        message: `Importing file ${i + 1} of ${totalFiles}`,
        description: `Progress: ${Math.round((i / totalFiles) * 100)}%`,
        type: "progress",
      });

      try {
        await uploadFile(files[i]);
      } catch (error) {
        close?.("import");
        open?.({
          message: `Failed to import file ${files[i].name}`,
          description: error.message,
          type: "error",
        });
        return;
      }
    }

    close?.("import");
    open?.({
      message: `Successfully imported ${totalFiles} files`,
      type: "success",
    });
  };

  return <button onClick={() => importData(selectedFiles)}>Import</button>;
}
```

### 5.4. Authentication flow notifications

```typescript
function LoginForm() {
  const { open, close } = useNotification();
  const { mutate: login } = useLogin();

  const handleLogin = (credentials: any) => {
    open?.({
      key: "login",
      message: "Logging in...",
      type: "progress",
    });

    login(credentials, {
      onSuccess: (data) => {
        close?.("login");
        open?.({
          message: `Welcome back, ${data.user.name}!`,
          type: "success",
        });
      },
      onError: (error) => {
        close?.("login");

        // Different messages based on error type
        if (error.message.includes("credentials")) {
          open?.({
            message: "Invalid credentials",
            description: "Please check your email and password",
            type: "error",
          });
        } else if (error.message.includes("network")) {
          open?.({
            message: "Network error",
            description: "Please check your internet connection",
            type: "error",
          });
        } else {
          open?.({
            message: "Login failed",
            description: error.message,
            type: "error",
          });
        }
      },
    });
  };

  return <form onSubmit={handleLogin}>{/* form */}</form>;
}
```

### 5.5. Auto-dismiss notifications

```typescript
function QuickActions() {
  const { open, close } = useNotification();

  const showTemporaryNotification = (message: string) => {
    const key = `temp-${Date.now()}`;

    open?.({
      key,
      message,
      type: "success",
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
      close?.(key);
    }, 3000);
  };

  return (
    <div>
      <button onClick={() => showTemporaryNotification("Item copied!")}>
        Copy
      </button>
      <button onClick={() => showTemporaryNotification("Link shared!")}>
        Share
      </button>
    </div>
  );
}
```

### 5.6. Manual close với action buttons

```typescript
function ManualNotifications() {
  const { open, close } = useNotification();

  const showPersistentNotification = () => {
    open?.({
      key: "manual",
      message: "This notification stays until you close it",
      description: "Click the X button to dismiss",
      type: "success",
    });
  };

  const closeNotification = () => {
    close?.("manual");
  };

  return (
    <div>
      <button onClick={showPersistentNotification}>Show Persistent</button>
      <button onClick={closeNotification}>Close Notification</button>
    </div>
  );
}
```

## 6. Quyết định kiến trúc

### 6.1. Tại sao dùng Context thay vì Prop Drilling?

**Quyết định:** Sử dụng React Context để distribute notification methods.

**Lý do:**

```typescript
// ❌ Without Context - Prop Drilling Hell
<App>
  <Layout notificationOpen={open} notificationClose={close}>
    <Header notificationOpen={open} notificationClose={close}>
      <Menu notificationOpen={open} notificationClose={close}>
        <MenuItem notificationOpen={open} notificationClose={close}>
          {/* Finally use it here... */}
        </MenuItem>
      </Menu>
    </Header>
  </Layout>
</App>

// ✅ With Context - Clean
<App>
  <NotificationContextProvider value={{ open, close }}>
    <Layout>
      <Header>
        <Menu>
          <MenuItem>
            {/* Use directly with hook */}
            const { open } = useNotification();
          </MenuItem>
        </Menu>
      </Header>
    </Layout>
  </NotificationContextProvider>
</App>
```

**Trade-off:** Context có thể trigger re-renders, nhưng notification methods thường stable nên không ảnh hưởng performance.

### 6.2. Tại sao methods là optional (`open?`, `close?`)?

**Quyết định:** Return type là `{ open?: Function, close?: Function }`.

**Lý do:**

1. **Safety:** Component không crash nếu provider chưa setup
2. **Flexibility:** Có thể chạy app mà không cần notification provider (useful cho testing)
3. **Progressive Enhancement:** App vẫn functional, chỉ mất notification feature

```typescript
// ✅ Safe - doesn't crash if provider undefined
const { open } = useNotification();
open?.({ message: "Hi", type: "success" });

// ❌ Would crash: TypeError: Cannot call undefined
// const { open } = useNotification();
// open({ message: "Hi", type: "success" });
```

### 6.3. Tại sao không có `useNotificationOpen` và `useNotificationClose` riêng biệt?

**Quyết định:** Single hook trả về cả 2 methods.

**Lý do:**

```typescript
// ❌ Separated - More imports, more boilerplate
import { useNotificationOpen, useNotificationClose } from "@refinedev/core";

function MyComponent() {
  const open = useNotificationOpen();
  const close = useNotificationClose();
  // Both access same context → duplicate work
}

// ✅ Combined - Cleaner, single import
import { useNotification } from "@refinedev/core";

function MyComponent() {
  const { open, close } = useNotification();
  // Single context access
}
```

**Trade-off:** Component import cả 2 methods ngay cả khi chỉ dùng 1. Nhưng methods rất nhỏ gọn (just references) nên không ảnh hưởng performance.

### 6.4. Tại sao không built-in notification UI?

**Quyết định:** Hook chỉ là interface, UI implementation do provider quyết định.

**Lý do:**

1. **Flexibility:** Refine hỗ trợ nhiều UI libraries (Ant Design, MUI, Mantine, etc.)
2. **Customization:** User có thể implement custom notification system
3. **Bundle Size:** Không bắt buộc users download UI library họ không dùng

```typescript
// Different providers for different UI libraries
import { notificationProvider as antdProvider } from "@refinedev/antd";
import { notificationProvider as muiProvider } from "@refinedev/mui";
import { notificationProvider as mantineProvider } from "@refinedev/mantine";

// Choose what you need
<Refine notificationProvider={antdProvider} />
<Refine notificationProvider={muiProvider} />
<Refine notificationProvider={mantineProvider} />
```

## 7. Common Pitfalls

### 7.1. Quên optional chaining

```typescript
// ❌ Crash nếu provider undefined
function MyComponent() {
  const { open } = useNotification();
  open({ message: "Hello", type: "success" }); // TypeError!
}

// ✅ Safe với optional chaining
function MyComponent() {
  const { open } = useNotification();
  open?.({ message: "Hello", type: "success" });
}

// ✅ Alternative: Manual check
function MyComponent() {
  const { open } = useNotification();
  if (open) {
    open({ message: "Hello", type: "success" });
  }
}
```

### 7.2. Quên truyền `key` cho notifications cần close

```typescript
// ❌ Không thể close notification sau này
function MyComponent() {
  const { open, close } = useNotification();

  open?.({
    message: "Processing...",
    type: "progress"
    // ❌ Missing key!
  });

  // ❌ Cannot close - no key to reference
  close?.(???);
}

// ✅ Always provide key for closeable notifications
function MyComponent() {
  const { open, close } = useNotification();

  open?.({
    key: "process-123", // ✅ Has key
    message: "Processing...",
    type: "progress"
  });

  // ✅ Can close by key
  setTimeout(() => {
    close?.("process-123");
  }, 3000);
}
```

### 7.3. Duplicate notification keys gây confusion

```typescript
// ❌ Reusing same key → notifications override each other
function MyComponent() {
  const { open } = useNotification();

  open?.({
    key: "notification", // Same key
    message: "First",
    type: "success",
  });

  open?.({
    key: "notification", // Same key → replaces first
    message: "Second",
    type: "success",
  });

  // User only sees "Second", "First" is replaced
}

// ✅ Unique keys for distinct notifications
function MyComponent() {
  const { open } = useNotification();

  open?.({
    key: "notification-1", // Unique
    message: "First",
    type: "success",
  });

  open?.({
    key: "notification-2", // Unique
    message: "Second",
    type: "success",
  });

  // User sees both notifications
}

// ✅ Use timestamp for unique keys
function MyComponent() {
  const { open } = useNotification();

  const showNotification = (message: string) => {
    open?.({
      key: `notif-${Date.now()}`, // Always unique
      message,
      type: "success",
    });
  };
}
```

### 7.4. Memory leak khi không cleanup timers

```typescript
// ❌ Memory leak - timer not cleaned up
function MyComponent() {
  const { open, close } = useNotification();

  const showTempNotification = () => {
    const key = `temp-${Date.now()}`;

    open?.({ key, message: "Hi", type: "success" });

    setTimeout(() => {
      close?.(key);
    }, 3000);
    // ❌ If component unmounts, timer still runs!
  };

  return <button onClick={showTempNotification}>Show</button>;
}

// ✅ Clean up with useEffect
function MyComponent() {
  const { open, close } = useNotification();
  const [notificationKey, setNotificationKey] = React.useState<string>();

  const showTempNotification = () => {
    const key = `temp-${Date.now()}`;
    setNotificationKey(key);
    open?.({ key, message: "Hi", type: "success" });
  };

  React.useEffect(() => {
    if (!notificationKey) return;

    const timeoutId = setTimeout(() => {
      close?.(notificationKey);
      setNotificationKey(undefined);
    }, 3000);

    // ✅ Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
    };
  }, [notificationKey, close]);

  return <button onClick={showTempNotification}>Show</button>;
}
```

### 7.5. Hiển thị quá nhiều notifications làm spam user

```typescript
// ❌ Spam notifications
function MyComponent() {
  const { open } = useNotification();
  const { data } = useList({ resource: "posts" });

  // ❌ Shows notification on every render!
  open?.({
    message: `Loaded ${data?.length} posts`,
    type: "success",
  });

  return <div>{/* ... */}</div>;
}

// ✅ Show notification only once
function MyComponent() {
  const { open } = useNotification();
  const { data, isSuccess } = useList({ resource: "posts" });
  const hasNotified = React.useRef(false);

  React.useEffect(() => {
    if (isSuccess && !hasNotified.current) {
      open?.({
        message: `Loaded ${data?.length} posts`,
        type: "success",
      });
      hasNotified.current = true;
    }
  }, [isSuccess, data, open]);

  return <div>{/* ... */}</div>;
}

// ✅ Or use mutation callbacks (better)
function MyComponent() {
  const { open } = useNotification();
  const { refetch } = useList({
    resource: "posts",
    queryOptions: {
      enabled: false, // Don't auto-fetch
    },
  });

  const loadPosts = async () => {
    const result = await refetch();

    if (result.isSuccess) {
      open?.({
        message: `Loaded ${result.data?.length} posts`,
        type: "success",
      });
    }
  };

  return <button onClick={loadPosts}>Load Posts</button>;
}
```

### 7.6. Không handle provider undefined trong production

```typescript
// ❌ Silent failure - developer không biết provider thiếu
function MyComponent() {
  const { open } = useNotification();

  // Fails silently if provider undefined
  open?.({ message: "Hi", type: "success" });

  return <div>Content</div>;
}

// ✅ Warn developer in development mode
function MyComponent() {
  const { open } = useNotification();

  React.useEffect(() => {
    if (process.env.NODE_ENV === "development" && !open) {
      console.warn(
        "⚠️ notificationProvider is not configured. " +
          "Notifications will not be displayed. " +
          "See: https://refine.dev/docs/api-reference/core/providers/notification-provider",
      );
    }
  }, [open]);

  const handleClick = () => {
    open?.({ message: "Hi", type: "success" });
  };

  return <button onClick={handleClick}>Click</button>;
}

// ✅ Or create helper hook
function useNotificationRequired() {
  const { open, close } = useNotification();

  React.useEffect(() => {
    if (!open || !close) {
      throw new Error(
        "notificationProvider is required but not configured. " +
          "Please add notificationProvider to your <Refine> component.",
      );
    }
  }, [open, close]);

  return { open: open!, close: close! }; // Non-optional (asserted)
}
```

## 8. Performance Considerations

### 8.1. Context Value Stability

```typescript
// ❌ Bad - creates new object every render
function NotificationProviderWrapper({ children }) {
  const [notifications, setNotifications] = useState([]);

  // ❌ New object every render → all consumers re-render!
  const value = {
    open: (params) => {
      /* ... */
    },
    close: (key) => {
      /* ... */
    },
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ✅ Good - stable reference
function NotificationProviderWrapper({ children }) {
  const [notifications, setNotifications] = useState([]);

  // ✅ Memoized - only changes when implementation changes
  const value = React.useMemo(
    () => ({
      open: (params) => {
        setNotifications((prev) => [...prev, { ...params, id: Date.now() }]);
      },
      close: (key) => {
        setNotifications((prev) => prev.filter((n) => n.key !== key));
      },
    }),
    [], // Empty deps → stable reference
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
```

**Impact:** Stable context value ngăn unnecessary re-renders của tất cả components dùng `useNotification()`.

### 8.2. Lazy Initialization

```typescript
// ❌ Notification provider loaded in main bundle
import { notificationProvider } from "@refinedev/antd";
// ^ This imports entire Ant Design notification system upfront

<Refine notificationProvider={notificationProvider} />;

// ✅ Lazy load notification UI (code splitting)
const notificationProvider = React.lazy(() =>
  import("@refinedev/antd").then((module) => ({
    default: module.notificationProvider,
  })),
);

// Or custom implementation
const LazyNotificationProvider = React.lazy(
  () => import("./providers/notification"),
);

<React.Suspense fallback={<div>Loading...</div>}>
  <Refine notificationProvider={notificationProvider} />
</React.Suspense>;
```

**Impact:** Giảm initial bundle size, notification UI chỉ load khi cần.

### 8.3. Throttle Notification Calls

```typescript
// ❌ Spams notifications on rapid changes
function RealTimeCounter() {
  const { open } = useNotification();
  const { data: count } = useSubscription({ channel: "counter" });

  React.useEffect(() => {
    // ❌ Shows notification on every count change (could be 100x/sec!)
    open?.({
      key: "count",
      message: `Count: ${count}`,
      type: "success",
    });
  }, [count]);
}

// ✅ Throttle notifications
import { useThrottle } from "ahooks"; // or custom implementation

function RealTimeCounter() {
  const { open } = useNotification();
  const { data: count } = useSubscription({ channel: "counter" });

  // ✅ Only update notification max once per second
  const throttledCount = useThrottle(count, { wait: 1000 });

  React.useEffect(() => {
    open?.({
      key: "count",
      message: `Count: ${throttledCount}`,
      type: "success",
    });
  }, [throttledCount]);
}

// ✅ Or debounce for even better UX
import { useDebounce } from "ahooks";

function RealTimeCounter() {
  const { open } = useNotification();
  const { data: count } = useSubscription({ channel: "counter" });

  // ✅ Only show notification after count stops changing for 1 sec
  const debouncedCount = useDebounce(count, { wait: 1000 });

  React.useEffect(() => {
    if (debouncedCount !== undefined) {
      open?.({
        key: "count",
        message: `Final count: ${debouncedCount}`,
        type: "success",
      });
    }
  }, [debouncedCount]);
}
```

### 8.4. Notification Queue Management

```typescript
// ❌ Show all notifications at once → UI cluttered
function BatchOperations() {
  const { open } = useNotification();

  const processItems = async (items: Item[]) => {
    // ❌ Shows 100 notifications if 100 items!
    for (const item of items) {
      try {
        await processItem(item);
        open?.({
          message: `Processed ${item.name}`,
          type: "success",
        });
      } catch (error) {
        open?.({
          message: `Failed ${item.name}`,
          type: "error",
        });
      }
    }
  };
}

// ✅ Batch notifications
function BatchOperations() {
  const { open } = useNotification();

  const processItems = async (items: Item[]) => {
    const results = { success: 0, failed: 0 };

    for (const item of items) {
      try {
        await processItem(item);
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }

    // ✅ Single summary notification
    open?.({
      message: "Batch processing complete",
      description: `Success: ${results.success}, Failed: ${results.failed}`,
      type: results.failed > 0 ? "error" : "success",
    });
  };
}
```

### 8.5. Avoid Notification in Fast Loops

```typescript
// ❌ Notification in render loop
function DataTable({ data }: { data: Item[] }) {
  const { open } = useNotification();

  return (
    <table>
      {data.map((item) => {
        // ❌ DON'T: Notification in render!
        if (item.isExpired) {
          open?.({
            message: `${item.name} is expired`,
            type: "error",
          });
        }

        return <tr key={item.id}>{item.name}</tr>;
      })}
    </table>
  );
}

// ✅ Notification outside render
function DataTable({ data }: { data: Item[] }) {
  const { open } = useNotification();
  const hasNotifiedExpired = React.useRef(false);

  React.useEffect(() => {
    const expiredItems = data.filter((item) => item.isExpired);

    if (expiredItems.length > 0 && !hasNotifiedExpired.current) {
      open?.({
        message: `${expiredItems.length} items expired`,
        type: "error",
      });
      hasNotifiedExpired.current = true;
    }
  }, [data, open]);

  return (
    <table>
      {data.map((item) => (
        <tr key={item.id}>{item.name}</tr>
      ))}
    </table>
  );
}
```

## 9. Testing

### 9.1. Mock Provider trong Tests

```typescript
import { renderHook } from "@testing-library/react";
import { NotificationContext } from "@refinedev/core";
import { useNotification } from "./useNotification";

describe("useNotification", () => {
  it("returns open and close methods from context", () => {
    const mockOpen = vi.fn();
    const mockClose = vi.fn();

    const wrapper = ({ children }) => (
      <NotificationContext.Provider
        value={{ open: mockOpen, close: mockClose }}
      >
        {children}
      </NotificationContext.Provider>
    );

    const { result } = renderHook(() => useNotification(), { wrapper });

    expect(result.current.open).toBe(mockOpen);
    expect(result.current.close).toBe(mockClose);
  });

  it("returns undefined when provider not configured", () => {
    const { result } = renderHook(() => useNotification());

    expect(result.current.open).toBeUndefined();
    expect(result.current.close).toBeUndefined();
  });
});
```

### 9.2. Test Component sử dụng Hook

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationContext } from "@refinedev/core";

function TestComponent() {
  const { open } = useNotification();

  return (
    <button onClick={() => open?.({ message: "Test", type: "success" })}>
      Show Notification
    </button>
  );
}

describe("Component with useNotification", () => {
  it("calls open when button clicked", () => {
    const mockOpen = vi.fn();

    render(
      <NotificationContext.Provider value={{ open: mockOpen, close: vi.fn() }}>
        <TestComponent />
      </NotificationContext.Provider>,
    );

    const button = screen.getByText("Show Notification");
    fireEvent.click(button);

    expect(mockOpen).toHaveBeenCalledWith({
      message: "Test",
      type: "success",
    });
  });

  it("handles missing provider gracefully", () => {
    // No provider → open = undefined
    render(<TestComponent />);

    const button = screen.getByText("Show Notification");

    // Should not crash
    expect(() => fireEvent.click(button)).not.toThrow();
  });
});
```

### 9.3. Integration Test với Mutations

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { TestWrapper } from "@test"; // Refine test utils

describe("Notification integration", () => {
  it("shows success notification on create", async () => {
    const mockOpen = vi.fn();

    const { result } = renderHook(
      () => {
        const { open } = useNotification();
        const { mutate } = useCreate();

        return { open, mutate };
      },
      {
        wrapper: TestWrapper({
          notificationProvider: {
            open: mockOpen,
            close: vi.fn(),
          },
        }),
      },
    );

    result.current.mutate(
      { resource: "posts", values: { title: "Test" } },
      {
        onSuccess: () => {
          result.current.open?.({
            message: "Created",
            type: "success",
          });
        },
      },
    );

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith({
        message: "Created",
        type: "success",
      });
    });
  });
});
```

### 9.4. Snapshot Testing Notification Provider

```typescript
import { render } from "@testing-library/react";
import { Refine } from "@refinedev/core";
import { notificationProvider } from "@refinedev/antd";

describe("NotificationProvider snapshot", () => {
  it("matches snapshot", () => {
    const { container } = render(
      <Refine notificationProvider={notificationProvider}>
        <div>App Content</div>
      </Refine>,
    );

    expect(container).toMatchSnapshot();
  });
});
```

### 9.5. E2E Test Notification Behavior

```typescript
// Cypress / Playwright test
describe("Notification E2E", () => {
  it("shows and closes notification", () => {
    cy.visit("/posts");

    // Create post
    cy.get('[data-testid="create-button"]').click();
    cy.get('[data-testid="title-input"]').type("New Post");
    cy.get('[data-testid="submit-button"]').click();

    // Assert notification appears
    cy.get(".ant-notification")
      .should("be.visible")
      .and("contain", "Post created successfully");

    // Assert notification disappears after timeout
    cy.wait(5000);
    cy.get(".ant-notification").should("not.exist");
  });

  it("handles undoable delete", () => {
    cy.visit("/posts");

    // Delete post
    cy.get('[data-testid="delete-button"]').first().click();

    // Progress notification appears
    cy.get(".ant-notification").should("be.visible").and("contain", "Deleting");

    // Click undo
    cy.get(".ant-notification button").contains("Undo").click();

    // Cancellation notification
    cy.get(".ant-notification")
      .should("be.visible")
      .and("contain", "Deletion cancelled");

    // Post still exists
    cy.get('[data-testid="post-row"]').should("exist");
  });
});
```

## 10. Kết luận

### Tóm tắt Hook

`useNotification` là một **Facade Hook** cực kỳ đơn giản (chỉ 10 dòng code) nhưng cực kỳ quan trọng trong kiến trúc Refine. Hook này cung cấp unified interface để display user feedback qua notification system, bất kể UI library bên dưới là gì.

**Key Characteristics:**

- ✅ **Simple API**: Chỉ 2 methods (open, close)
- ✅ **Type-safe**: Full TypeScript support với `OpenNotificationParams`
- ✅ **Safe by default**: Optional chaining (`?.`) prevents crashes
- ✅ **Flexible**: Works with any notification provider (Ant Design, MUI, Mantine, custom)
- ✅ **Zero dependencies**: Chỉ dùng React Context
- ✅ **Performance**: Stable context value, không trigger unnecessary re-renders

### Khi nào dùng Hook này?

**✅ Sử dụng khi:**

- Cần hiển thị success/error/progress feedback cho users
- Mutations (create/update/delete) cần notify results
- Authentication flows (login/logout) cần user feedback
- Batch operations cần progress updates
- Undoable actions cần countdown notifications
- Any user action requires confirmation/feedback

**❌ Không dùng khi:**

- Cần modal dialogs (dùng modal hooks instead)
- Cần form validation errors (show inline errors)
- Cần logging (dùng console hoặc monitoring service)
- Cần silent background updates (skip notifications)

### So sánh với các giải pháp khác

| Feature            | useNotification  | Direct UI Library | Custom Toast    |
| ------------------ | ---------------- | ----------------- | --------------- |
| Setup Complexity   | ⭐ Very Easy     | ⭐⭐⭐ Complex    | ⭐⭐ Medium     |
| Type Safety        | ✅ Full          | ❌ Varies         | ⚠️ Custom       |
| UI Flexibility     | ✅ Any provider  | ❌ Locked-in      | ✅ Full control |
| Refine Integration | ✅ Built-in      | ❌ Manual         | ❌ Manual       |
| Bundle Size        | ✅ Tiny (~0.5KB) | ❌ Large          | ✅ Small        |
| Testing            | ✅ Easy mock     | ⚠️ Hard           | ⚠️ Medium       |

### Best Practices Summary

```typescript
// ✅ DO: Use optional chaining
const { open } = useNotification();
open?.({ message: "Hello", type: "success" });

// ✅ DO: Provide keys for closeable notifications
open?.({ key: "my-notif", message: "Processing", type: "progress" });
close?.("my-notif");

// ✅ DO: Batch notifications for bulk operations
open?.({
  message: `Processed ${count} items`,
  description: `Success: ${success}, Failed: ${failed}`,
  type: "success",
});

// ✅ DO: Clean up timers on unmount
useEffect(() => {
  const timer = setTimeout(() => close?.(key), 3000);
  return () => clearTimeout(timer);
}, [key]);

// ❌ DON'T: Call without optional chaining
open({ message: "Hello" }); // Crashes if provider undefined

// ❌ DON'T: Show notifications in render loops
data.map((item) => {
  open?.({ message: item.name }); // Spam!
});

// ❌ DON'T: Forget to close progress notifications
open?.({ type: "progress", message: "Loading..." });
// Must call close?.() later!
```

### Điểm mạnh

1. **Extremely Simple**: 10 dòng code, API rõ ràng
2. **Universal**: Works với mọi notification provider
3. **Safe**: Optional methods prevent crashes
4. **Integrated**: Được dùng throughout Refine internals (auth, data hooks)
5. **Testable**: Easy to mock in tests

### Điểm cần lưu ý

1. **Provider Required**: App cần setup `notificationProvider` để hook hoạt động
2. **Optional Chaining Required**: Luôn dùng `?.` để tránh crashes
3. **Key Management**: Phải track keys để close notifications đúng
4. **No Built-in UI**: Hook chỉ là interface, UI do provider quyết định
5. **Memory Leaks**: Cần cleanup timers khi unmount

### Resources

- **Official Docs**: https://refine.dev/docs/api-reference/core/hooks/useNotification
- **Notification Provider Docs**: https://refine.dev/docs/api-reference/core/providers/notification-provider
- **Type Definitions**: `/packages/core/src/contexts/notification/types.ts`
- **Implementation**: `/packages/core/src/hooks/notification/useNotification/index.ts` (10 lines!)

---

**Tác giả kiến trúc:** Refine Core Team
**Hook size:** 10 lines
**Dependencies:** React Context only
**Design patterns:** Facade, Dependency Injection, Optional Chaining, Strategy (provider level)
