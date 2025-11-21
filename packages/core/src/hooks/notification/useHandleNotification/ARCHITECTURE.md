# useHandleNotification Hook - Kiến trúc và Thiết kế

## 1. Vai trò trong hệ thống

`useHandleNotification` là một **Internal Helper Hook** cung cấp logic thông minh để xử lý việc hiển thị notifications với hỗ trợ fallback. Hook này được sử dụng rộng rãi bởi các data hooks (useCreate, useUpdate, useDelete, etc.) và auth hooks để standardize notification behavior.

```
┌─────────────────────────────────────────────────────────────────┐
│                      REFINE INTERNAL HOOKS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  useCreate   │  │  useUpdate   │  │  useDelete   │          │
│  │              │  │              │  │              │          │
│  │ - User says: │  │ - User says: │  │ - User says: │          │
│  │   ✅ Show    │  │   ❌ Don't   │  │   undefined  │          │
│  │              │  │     show     │  │   (default)  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                           ▼                                     │
│         ┌──────────────────────────────────┐                    │
│         │  useHandleNotification Hook      │ ◄── Decision Logic │
│         │  (Smart Fallback Handler)        │                    │
│         │                                  │                    │
│         │  if (notification === false)     │                    │
│         │    → Don't show anything         │                    │
│         │  else if (notification exists)   │                    │
│         │    → Show user's notification    │                    │
│         │  else if (fallback exists)       │                    │
│         │    → Show fallback               │                    │
│         │  else                            │                    │
│         │    → Don't show anything         │                    │
│         └────────────┬─────────────────────┘                    │
│                      │                                          │
│                      ▼                                          │
│         ┌──────────────────────────────────┐                    │
│         │    useNotification Hook          │                    │
│         │    { open, close }               │                    │
│         └────────────┬─────────────────────┘                    │
│                      │                                          │
│                      ▼                                          │
│         ┌──────────────────────────────────┐                    │
│         │   Notification Provider          │                    │
│         │   (Ant Design / MUI / etc.)      │                    │
│         └──────────────────────────────────┘                    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

DECISION TABLE:
┌────────────────────┬─────────────────┬─────────────────┐
│ notification value │ fallback value  │ Result          │
├────────────────────┼─────────────────┼─────────────────┤
│ false              │ (any)           │ Don't show      │
│ { message: "Hi" }  │ (any)           │ Show "Hi"       │
│ undefined          │ { message: "!" }│ Show "!"        │
│ undefined          │ undefined       │ Don't show      │
└────────────────────┴─────────────────┴─────────────────┘
```

**Ví dụ thực tế:**
Giống như hệ thống cảnh báo xe hơi:
- Nếu tài xế **TẮT** cảnh báo (false) → không kêu dù có vấn đề
- Nếu tài xế **TÙY CHỈNH** âm thanh → dùng âm thanh tùy chỉnh
- Nếu tài xế **KHÔNG TÙY CHỈNH** → dùng âm thanh mặc định
- Nếu **KHÔNG CÓ** mặc định → im lặng

## 2. Luồng hoạt động chi tiết

### Flow 1: User explicitly disables notification (false)

```
┌──────────────────────────────────────┐
│  useCreate Hook                      │
│  ┌────────────────────────────────┐  │
│  │ mutate({                       │  │
│  │   resource: "posts",           │  │
│  │   values: data,                │  │
│  │   successNotification: false   │ ◄─── User says "Don't show"
│  │ });                            │  │
│  └────────────────────────────────┘  │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  handleNotification(                 │
│    notification: false,              │ ◄─── First param = false
│    fallback: {                       │
│      message: "Created successfully" │ ◄─── Fallback exists but...
│    }                                 │
│  )                                   │
│  ┌────────────────────────────────┐  │
│  │ if (notification === false)    │  │
│  │   return; // EXIT EARLY        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
             │
             ▼
        ✖ No notification shown
```

### Flow 2: User provides custom notification

```
┌──────────────────────────────────────┐
│  useUpdate Hook                      │
│  ┌────────────────────────────────┐  │
│  │ mutate({                       │  │
│  │   resource: "posts",           │  │
│  │   id: "1",                     │  │
│  │   values: data,                │  │
│  │   successNotification: {       │ ◄─── User provides custom
│  │     message: "Post updated!",  │
│  │     type: "success"            │
│  │   }                            │  │
│  │ });                            │  │
│  └────────────────────────────────┘  │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  handleNotification(                 │
│    notification: {                   │ ◄─── Custom notification
│      message: "Post updated!",       │
│      type: "success"                 │
│    },                                │
│    fallback: {                       │
│      message: "Successfully updated" │ ◄─── Fallback ignored
│    }                                 │
│  )                                   │
│  ┌────────────────────────────────┐  │
│  │ if (notification !== false) {  │  │
│  │   if (notification) {          │  │
│  │     open?.(notification); ─────┼──┼─► Show custom notification
│  │   }                            │  │
│  │ }                              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
             │
             ▼
   ┌────────────────────────┐
   │  🎉 "Post updated!"    │
   └────────────────────────┘
```

### Flow 3: User doesn't provide notification → use fallback

```
┌──────────────────────────────────────┐
│  useDelete Hook                      │
│  ┌────────────────────────────────┐  │
│  │ mutate({                       │  │
│  │   resource: "posts",           │  │
│  │   id: "1"                      │  │
│  │   // ❌ No successNotification │ ◄─── User didn't specify
│  │ });                            │  │
│  └────────────────────────────────┘  │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  handleNotification(                 │
│    notification: undefined,          │ ◄─── Not provided
│    fallback: {                       │
│      message: "Successfully deleted",│ ◄─── Hook's default message
│      type: "success"                 │
│    }                                 │
│  )                                   │
│  ┌────────────────────────────────┐  │
│  │ if (notification !== false) {  │  │
│  │   if (notification) {          │  │
│  │     // ❌ Skip - undefined     │  │
│  │   } else if (fallback) {       │  │
│  │     open?.(fallback); ─────────┼──┼─► Show fallback
│  │   }                            │  │
│  │ }                              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
             │
             ▼
   ┌──────────────────────────────┐
   │  🎉 "Successfully deleted"   │
   └──────────────────────────────┘
```

### Flow 4: Neither notification nor fallback → silent

```
┌──────────────────────────────────────┐
│  useCustom Hook                      │
│  ┌────────────────────────────────┐  │
│  │ mutate({                       │  │
│  │   url: "/custom-endpoint",     │  │
│  │   method: "post",              │  │
│  │   values: data                 │  │
│  │   // ❌ No notification config │ ◄─── User didn't specify
│  │ });                            │  │
│  └────────────────────────────────┘  │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  handleNotification(                 │
│    notification: undefined,          │ ◄─── Not provided
│    fallback: undefined               │ ◄─── No default either
│  )                                   │
│  ┌────────────────────────────────┐  │
│  │ if (notification !== false) {  │  │
│  │   if (notification) {          │  │
│  │     // ❌ Skip - undefined     │  │
│  │   } else if (fallback) {       │  │
│  │     // ❌ Skip - undefined     │  │
│  │   }                            │  │
│  │   // Falls through - no action │  │
│  │ }                              │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
             │
             ▼
        ✖ Silent - no notification
```

### Flow 5: Integration với mutation lifecycle

```
┌──────────────────────────────────────────────────────────┐
│  useCreate Hook                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ const handleNotification =                         │  │
│  │   useHandleNotification();                         │  │ ◄── Hook init
│  │                                                    │  │
│  │ useMutation({                                      │  │
│  │   mutationFn: (params) => {                        │  │
│  │     return dataProvider.create(params);            │  │
│  │   },                                               │  │
│  │   onSuccess: (data, variables) => {                │  │
│  │     // Build notification config                  │  │
│  │     const notificationConfig =                     │  │
│  │       variables.successNotification ───────────────┼──┼─► User config
│  │       || buildDefaultNotification(data);           │  │    (might be false)
│  │                                                    │  │
│  │     handleNotification(                            │  │
│  │       notificationConfig,                          │  │ ◄── Pass to handler
│  │       {                                            │  │
│  │         message: "Successfully created",           │  │
│  │         type: "success"                            │  │
│  │       }                                            │  │ ◄── Fallback
│  │     );                                             │  │
│  │   },                                               │  │
│  │   onError: (error, variables) => {                 │  │
│  │     const errorConfig =                            │  │
│  │       variables.errorNotification ─────────────────┼──┼─► User config
│  │       || buildErrorNotification(error);            │  │    (might be false)
│  │                                                    │  │
│  │     handleNotification(                            │  │
│  │       errorConfig,                                 │  │
│  │       {                                            │  │
│  │         message: error.message,                    │  │
│  │         type: "error"                              │  │
│  │       }                                            │  │ ◄── Error fallback
│  │     );                                             │  │
│  │   }                                                │  │
│  │ });                                                │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

## 3. Design Patterns

### 3.1. Strategy Pattern với Fallback
Hook triển khai strategy pattern với fallback mechanism - chọn strategy dựa trên input.

**Real-world analogy:** Giống như gọi taxi:
1. Nếu bạn **TẮT** app (false) → không gọi taxi
2. Nếu bạn chọn **Xe cụ thể** (custom notification) → gọi xe đó
3. Nếu bạn **KHÔNG CHỌN** (undefined) → hệ thống tự chọn xe gần nhất (fallback)

```typescript
// Strategy implementation
function useHandleNotification() {
  const { open } = useNotification();

  return useCallback((notification, fallback) => {
    // Strategy 1: Explicit disable
    if (notification === false) {
      return; // Don't show anything
    }

    // Strategy 2: Custom notification
    if (notification) {
      open?.(notification);
      return;
    }

    // Strategy 3: Fallback
    if (fallback) {
      open?.(fallback);
      return;
    }

    // Strategy 4: Silent (do nothing)
  }, []);
}

// Usage in data hooks
function useCreate() {
  const handleNotification = useHandleNotification();

  return useMutation({
    onSuccess: (data, variables) => {
      // User controls strategy via successNotification prop
      handleNotification(
        variables.successNotification, // ← User's choice
        { message: "Created!", type: "success" } // ← Default
      );
    }
  });
}
```

### 3.2. Null Object Pattern
Hook xử lý null/undefined values gracefully thay vì crash.

**Real-world analogy:** Giống như đèn xe có "chế độ tự động" - nếu cảm biến bị lỗi (null), vẫn có thể dùng chế độ thủ công thay vì xe không hoạt động.

```typescript
// ❌ Without Null Object Pattern - crashes
function badHandleNotification(notification) {
  notification.open(notification); // TypeError if notification is null!
}

// ✅ With Null Object Pattern - safe
function useHandleNotification() {
  const { open } = useNotification();

  return useCallback((notification, fallback) => {
    // Handles all null/undefined cases gracefully
    if (notification !== false) {
      if (notification) {
        open?.(notification); // Safe with optional chaining
      } else if (fallback) {
        open?.(fallback);
      }
      // else: Silent - no crash, just no action
    }
  }, []);
}

// Usage is safe regardless of input
handleNotification(null, null); // ✅ No crash
handleNotification(undefined, undefined); // ✅ No crash
handleNotification(false, { message: "Hi" }); // ✅ Respects explicit false
```

### 3.3. Builder Pattern (Implicit)
Data hooks build notification configs before passing to handler.

**Real-world analogy:** Giống như đặt món ăn - bạn tự xây dựng (build) order trước, rồi gửi cho bếp (handler).

```typescript
// Builder pattern in data hooks
function useUpdate() {
  const handleNotification = useHandleNotification();

  return useMutation({
    onSuccess: (data, variables) => {
      // Build notification config (Builder Pattern)
      let notificationConfig: OpenNotificationParams | false | undefined;

      if (variables.successNotification === false) {
        notificationConfig = false; // Explicit disable
      } else if (typeof variables.successNotification === "function") {
        // Build from function
        notificationConfig = variables.successNotification(
          data,
          variables.values,
          variables.resource
        );
      } else if (variables.successNotification) {
        notificationConfig = variables.successNotification; // Use as-is
      } else {
        notificationConfig = undefined; // Will use fallback
      }

      // Build fallback
      const fallback: OpenNotificationParams = {
        message: translate("notifications.success"),
        description: translate("notifications.editSuccess", {
          resource: variables.resource
        }),
        type: "success"
      };

      // Pass built configs to handler
      handleNotification(notificationConfig, fallback);
    }
  });
}
```

### 3.4. Callback Pattern với useCallback
Hook returns memoized callback để tránh unnecessary re-renders.

**Real-world analogy:** Giống như lưu số điện thoại - thay vì phải tra cứu số mỗi lần gọi, bạn lưu vào danh bạ (memoize) để dùng lại.

```typescript
// ❌ Without useCallback - new function every render
function useHandleNotification() {
  const { open } = useNotification();

  // ❌ New function instance on every render!
  const handleNotification = (notification, fallback) => {
    // ... logic
  };

  return handleNotification;
}

// ✅ With useCallback - stable reference
function useHandleNotification() {
  const { open } = useNotification();

  // ✅ Same function instance across renders (empty deps)
  const handleNotification = useCallback(
    (notification, fallback) => {
      if (notification !== false) {
        if (notification) {
          open?.(notification);
        } else if (fallback) {
          open?.(fallback);
        }
      }
    },
    [] // Empty deps → stable reference
  );

  return handleNotification;
}

// Impact: Components using this hook won't re-render unnecessarily
```

### 3.5. Priority Pattern
Hook triển khai priority system: explicit false > custom > fallback > silent.

**Real-world analogy:** Giống như priority seat trên xe bus:
1. **Người khuyết tật** (false) → Ưu tiên cao nhất (respect explicit disable)
2. **Người có vé đặc biệt** (custom) → Ưu tiên cao
3. **Người đến trước** (fallback) → Ưu tiên thấp
4. **Không ai** (silent) → Không ai ngồi

```typescript
// Priority implementation
const handleNotification = (notification, fallback) => {
  // Priority 1: HIGHEST - Explicit false (user wants no notification)
  if (notification === false) {
    return; // ← EXIT - respect user's explicit choice
  }

  // Priority 2: HIGH - Custom notification (user provided specific config)
  if (notification) {
    open?.(notification);
    return; // ← EXIT - used custom
  }

  // Priority 3: MEDIUM - Fallback (hook's default message)
  if (fallback) {
    open?.(fallback);
    return; // ← EXIT - used fallback
  }

  // Priority 4: LOWEST - Silent (do nothing)
  // Falls through - no action taken
};

// Decision tree visualization:
//
//              false?
//             /      \
//           YES      NO
//           /          \
//       [STOP]      notification?
//                    /          \
//                  YES          NO
//                  /              \
//          [USE CUSTOM]       fallback?
//                              /      \
//                            YES      NO
//                            /          \
//                    [USE FALLBACK]  [SILENT]
```

## 4. Các tính năng chính

### 4.1. Explicit False Support - Tôn trọng ý muốn user

```typescript
// User có thể EXPLICITLY disable notifications
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: data,
  successNotification: false, // ← "Don't show notification"
});

// Hook respects this choice
handleNotification(false, defaultNotification);
// → Result: No notification shown (fallback ignored)
```

### 4.2. Custom Notification Priority

```typescript
// Custom notification has priority over fallback
const { mutate } = useUpdate();

mutate({
  resource: "posts",
  id: "1",
  values: data,
  successNotification: {
    message: "✨ Your post is now live!",
    description: "It will appear in the feed shortly",
    type: "success"
  }
});

// Hook uses custom notification
handleNotification(
  customNotification, // ← Used
  fallbackNotification // ← Ignored
);
// → Result: Shows "✨ Your post is now live!"
```

### 4.3. Automatic Fallback

```typescript
// If user doesn't provide notification, hook uses fallback
const { mutate } = useDelete();

mutate({
  resource: "posts",
  id: "1"
  // ❌ No successNotification specified
});

// Hook automatically uses fallback
handleNotification(
  undefined, // ← Not provided
  {
    message: "Successfully deleted post",
    type: "success"
  } // ← Used automatically
);
// → Result: Shows default message
```

### 4.4. Function-based Notifications (Dynamic)

```typescript
// User can provide function for dynamic notifications
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: data,
  successNotification: (data, values, resource) => {
    // ✅ Dynamic notification based on response
    return {
      message: `Post "${data.title}" created!`,
      description: `ID: ${data.id}`,
      type: "success"
    };
  }
});

// Data hook evaluates function, then passes result to handler
const notificationConfig = successNotification(data, values, resource);
handleNotification(notificationConfig, fallback);
```

### 4.5. Silent Mode Support

```typescript
// Hook supports silent mode (no notification at all)
const { mutate } = useCustom();

mutate({
  url: "/background-sync",
  method: "post",
  values: data
  // ❌ No notification config
});

// Neither custom nor fallback provided
handleNotification(undefined, undefined);
// → Result: Silent - no notification shown
// → Use case: Background operations, polling, etc.
```

## 5. Use Cases thực tế

### 5.1. Standard CRUD notifications với fallback

```typescript
function CreatePostButton() {
  const { mutate } = useCreate();

  // Case 1: User doesn't specify notification → use default
  const createWithDefault = () => {
    mutate({
      resource: "posts",
      values: { title: "New Post" }
      // ❌ No successNotification
    });
    // → Shows: "Successfully created post"
  };

  // Case 2: User provides custom notification
  const createWithCustom = () => {
    mutate({
      resource: "posts",
      values: { title: "New Post" },
      successNotification: {
        message: "🎉 Your post is live!",
        description: "Share it with your friends",
        type: "success"
      }
    });
    // → Shows: "🎉 Your post is live!"
  };

  // Case 3: User disables notification
  const createSilently = () => {
    mutate({
      resource: "posts",
      values: { title: "New Post" },
      successNotification: false
    });
    // → Shows: Nothing
  };

  return (
    <div>
      <button onClick={createWithDefault}>Create (Default)</button>
      <button onClick={createWithCustom}>Create (Custom)</button>
      <button onClick={createSilently}>Create (Silent)</button>
    </div>
  );
}
```

### 5.2. Dynamic notifications based on response data

```typescript
function UpdatePostForm() {
  const { mutate } = useUpdate();

  const onSubmit = (values: any) => {
    mutate({
      resource: "posts",
      id: values.id,
      values,
      successNotification: (data, variables, resource) => {
        // ✅ Dynamic notification based on response
        if (data.published) {
          return {
            message: "Post published!",
            description: `"${data.title}" is now visible to everyone`,
            type: "success"
          };
        } else {
          return {
            message: "Draft saved",
            description: "Your changes have been saved",
            type: "success"
          };
        }
      }
    });
  };

  return <form onSubmit={onSubmit}>{/* form fields */}</form>;
}
```

### 5.3. Conditional error notifications

```typescript
function DeletePostButton({ postId }: { postId: string }) {
  const { mutate } = useDelete();

  const handleDelete = () => {
    mutate({
      resource: "posts",
      id: postId,
      errorNotification: (error, variables, resource) => {
        // ✅ Custom error message based on error type
        if (error.statusCode === 403) {
          return {
            message: "Permission denied",
            description: "You don't have permission to delete this post",
            type: "error"
          };
        }

        if (error.statusCode === 404) {
          return {
            message: "Post not found",
            description: "This post may have already been deleted",
            type: "error"
          };
        }

        // Return false to disable notification for other errors
        return false;
      }
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### 5.4. Silent background operations

```typescript
function AutoSaveDraft() {
  const { mutate } = useUpdate();
  const [content, setContent] = React.useState("");

  // Auto-save every 30 seconds without notification
  React.useEffect(() => {
    const timer = setInterval(() => {
      if (content) {
        mutate({
          resource: "drafts",
          id: "current",
          values: { content },
          successNotification: false, // ← Silent auto-save
          errorNotification: (error) => ({
            // Only show notification on error
            message: "Failed to auto-save",
            description: "Your changes may be lost",
            type: "error"
          })
        });
      }
    }, 30000);

    return () => clearInterval(timer);
  }, [content]);

  return (
    <textarea
      value={content}
      onChange={(e) => setContent(e.target.value)}
      placeholder="Write your draft..."
    />
  );
}
```

### 5.5. Batch operations với summary notification

```typescript
function BatchDeleteButton({ selectedIds }: { selectedIds: string[] }) {
  const { mutate } = useDelete();
  const { open } = useNotification();

  const handleBatchDelete = async () => {
    let successCount = 0;
    let failedCount = 0;

    for (const id of selectedIds) {
      try {
        await mutate({
          resource: "posts",
          id,
          successNotification: false, // ← Silent individual deletes
          errorNotification: false
        });
        successCount++;
      } catch (error) {
        failedCount++;
      }
    }

    // ✅ Show single summary notification
    open?.({
      message: "Batch delete complete",
      description: `Success: ${successCount}, Failed: ${failedCount}`,
      type: failedCount > 0 ? "error" : "success"
    });
  };

  return (
    <button onClick={handleBatchDelete}>
      Delete {selectedIds.length} items
    </button>
  );
}
```

### 5.6. Multi-language notifications

```typescript
function useCreateWithI18n() {
  const { mutate } = useCreate();
  const translate = useTranslate(); // i18n hook

  const createPost = (values: any) => {
    mutate({
      resource: "posts",
      values,
      successNotification: (data) => ({
        // ✅ Translated notification
        message: translate("notifications.createSuccess"),
        description: translate("notifications.postCreatedDescription", {
          title: data.title,
          id: data.id
        }),
        type: "success"
      }),
      errorNotification: (error) => ({
        message: translate("notifications.createError"),
        description: translate("errors." + error.code, {
          fallback: error.message
        }),
        type: "error"
      })
    });
  };

  return { createPost };
}
```

## 6. Quyết định kiến trúc

### 6.1. Tại sao không merge với useNotification?

**Quyết định:** Tách riêng `useHandleNotification` thay vì thêm logic vào `useNotification`.

**Lý do:**

```typescript
// ❌ If merged into useNotification - bloated API
function useNotification() {
  const { open, close } = useContext(NotificationContext);

  const handleWithFallback = (notification, fallback) => {
    // Complex logic here...
  };

  return { open, close, handleWithFallback };
  // ← Public API gets complex
}

// ✅ Separated - clean responsibilities
function useNotification() {
  const { open, close } = useContext(NotificationContext);
  return { open, close }; // ← Simple public API
}

function useHandleNotification() {
  const { open } = useNotification();
  const handle = useCallback((notification, fallback) => {
    // Complex logic isolated here
  }, []);
  return handle; // ← Internal helper
}
```

**Trade-off:**
- ✅ **Pro:** Separation of concerns, simpler public API
- ✅ **Pro:** useNotification stays tiny (10 lines), easy to understand
- ⚠️ **Con:** Two hooks instead of one (but useHandleNotification is internal)

### 6.2. Tại sao dùng `false` để disable thay vì `null`?

**Quyết định:** Dùng `false` để explicitly disable notifications.

**Lý do:**

```typescript
// Why false instead of null/undefined?

// ❌ Problem with null/undefined
successNotification: undefined // User didn't specify? Or wants to disable?
successNotification: null      // User wants to disable? Or forgot to set?

// ✅ Clear with boolean false
successNotification: undefined // ← User didn't specify (use fallback)
successNotification: false     // ← User explicitly disabled (don't show)

// Boolean false is INTENTIONAL, null/undefined is ABSENCE
```

**Decision Table:**
```
┌──────────────┬────────────────────────────────────────┐
│ Value        │ Meaning                                │
├──────────────┼────────────────────────────────────────┤
│ undefined    │ "I didn't decide" → use fallback       │
│ null         │ Ambiguous ← DON'T USE                  │
│ false        │ "I explicitly don't want" → disable    │
│ { ... }      │ "I want this specific config" → use it │
└──────────────┴────────────────────────────────────────┘
```

### 6.3. Tại sao fallback là second parameter thay vì default object?

**Quyết định:** Fallback là function parameter, không phải default trong hook.

**Lý do:**

```typescript
// ❌ If fallback was hardcoded in hook
function useHandleNotification() {
  const DEFAULT_FALLBACK = {
    message: "Success",
    type: "success"
  };

  return (notification) => {
    // ❌ Problem: Can't customize fallback per use case
    handleNotification(notification, DEFAULT_FALLBACK);
  };
}

// ✅ Fallback as parameter - flexible
function useHandleNotification() {
  return (notification, fallback) => {
    // ✅ Each caller can provide own fallback
    if (notification !== false) {
      if (notification) {
        open?.(notification);
      } else if (fallback) {
        open?.(fallback); // ← Caller's fallback
      }
    }
  };
}

// Usage: Different fallbacks for different operations
handleNotification(userConfig, {
  message: "Successfully created post" // ← Create fallback
});

handleNotification(userConfig, {
  message: "Successfully updated post" // ← Update fallback
});
```

**Trade-off:**
- ✅ **Pro:** Maximum flexibility, each operation can have custom fallback
- ✅ **Pro:** i18n-friendly (translate keys per operation)
- ⚠️ **Con:** Callers must provide fallback (but that's their responsibility)

### 6.4. Tại sao dùng useCallback với empty deps array?

**Quyết định:** Wrap handler function với `useCallback(() => {...}, [])`.

**Lý do:**

```typescript
// Why empty deps array [] ?

// The handler function has NO dependencies:
const handleNotification = useCallback(
  (notification, fallback) => {
    // ✅ Only uses `open` from closure
    // ✅ `open` is stable (from context)
    // ✅ notification & fallback are parameters (not dependencies)
    if (notification !== false) {
      if (notification) {
        open?.(notification);
      } else if (fallback) {
        open?.(fallback);
      }
    }
  },
  [] // ← Empty deps: function never changes
);

// Result: handleNotification has stable reference across renders
// → Components using this hook won't re-render unnecessarily
// → Can be safely used in other useCallback/useMemo deps
```

**Note:** Một số developers có thể nghĩ cần thêm `open` vào deps:
```typescript
useCallback((notification, fallback) => {
  open?.(notification);
}, [open]); // ← Should we add open?
```

**Answer:** Không cần, vì:
1. `open` comes from context và được guaranteed stable bởi provider
2. ESLint warning có thể ignore với comment nếu cần
3. Empty deps array đảm bảo handler không bao giờ thay đổi

## 7. Common Pitfalls

### 7.1. Quên rằng `false` khác với `undefined`

```typescript
// ❌ Wrong - treats false and undefined the same
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: data,
  successNotification: someCondition ? notification : undefined
  // ❌ Problem: If want to disable, should use false, not undefined
});

// ✅ Correct - explicit false to disable
mutate({
  resource: "posts",
  values: data,
  successNotification: someCondition ? notification : false
  // ✅ false = "don't show", undefined = "use default"
});

// Better: Use ternary correctly
successNotification: shouldShow
  ? { message: "Created!", type: "success" }
  : false
```

### 7.2. Không hiểu priority order

```typescript
// ❌ Misunderstanding - thinking fallback overrides false
const { mutate } = useUpdate();

mutate({
  resource: "posts",
  id: "1",
  values: data,
  successNotification: false // ← User explicitly disabled
});

// Inside hook:
handleNotification(
  false, // ← false has HIGHEST priority
  { message: "Updated!", type: "success" } // ← IGNORED
);

// ❌ Wrong expectation: "Fallback will show because I provided it"
// ✅ Actual behavior: Nothing shows (false takes priority)
```

**Correct understanding:**
```
Priority Order (highest to lowest):
1. false → ALWAYS disable (even if fallback exists)
2. Custom notification → Use custom (ignore fallback)
3. undefined + fallback → Use fallback
4. undefined + no fallback → Silent
```

### 7.3. Passing notification object khi muốn disable

```typescript
// ❌ Wrong - passing empty object to disable
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: data,
  successNotification: {} // ← WRONG! Empty object !== disable
});

// Result: Hook sees truthy object → tries to show notification
// → Might crash or show broken notification

// ✅ Correct - use false to disable
mutate({
  resource: "posts",
  values: data,
  successNotification: false // ← Explicit disable
});
```

### 7.4. Không handle function return values correctly

```typescript
// ❌ Wrong - function might return false but not handled
const { mutate } = useUpdate();

mutate({
  resource: "posts",
  id: "1",
  values: data,
  successNotification: (data) => {
    if (data.isDraft) {
      return false; // User wants to disable for drafts
    }
    return { message: "Published!", type: "success" };
  }
});

// ❌ If data hook doesn't evaluate function correctly:
// handleNotification(
//   successNotification, // ← Passes function instead of result!
//   fallback
// );

// ✅ Correct - evaluate function first
const notificationConfig =
  typeof successNotification === "function"
    ? successNotification(data, values, resource)
    : successNotification;

handleNotification(notificationConfig, fallback);
```

### 7.5. Using handleNotification outside mutation context

```typescript
// ❌ Wrong - trying to use handleNotification directly
import { useHandleNotification } from "@refinedev/core";

function MyComponent() {
  const handleNotification = useHandleNotification();

  // ❌ Misuse - this hook is for internal use in data/auth hooks
  const onClick = () => {
    handleNotification(
      { message: "Clicked!", type: "success" },
      undefined
    );
  };

  return <button onClick={onClick}>Click</button>;
}

// ✅ Correct - use useNotification directly for manual notifications
import { useNotification } from "@refinedev/core";

function MyComponent() {
  const { open } = useNotification();

  const onClick = () => {
    open?.({
      message: "Clicked!",
      type: "success"
    });
  };

  return <button onClick={onClick}>Click</button>;
}
```

**Rule of thumb:**
- `useNotification()` → For application code (your components)
- `useHandleNotification()` → For internal Refine hooks only

### 7.6. Không provide fallback khi cần default notification

```typescript
// ❌ Wrong - no fallback provided
function useCustomCreate() {
  const handleNotification = useHandleNotification();

  return useMutation({
    onSuccess: (data, variables) => {
      // ❌ No fallback → silent if user doesn't provide notification
      handleNotification(variables.successNotification, undefined);
    }
  });
}

// Result: Silent operation confuses users

// ✅ Correct - always provide sensible fallback
function useCustomCreate() {
  const handleNotification = useHandleNotification();
  const translate = useTranslate();

  return useMutation({
    onSuccess: (data, variables) => {
      // ✅ Provide default fallback
      handleNotification(
        variables.successNotification,
        {
          message: translate("notifications.createSuccess"),
          description: translate("notifications.created", {
            resource: variables.resource
          }),
          type: "success"
        }
      );
    }
  });
}
```

## 8. Performance Considerations

### 8.1. useCallback Memoization

```typescript
// ✅ Hook uses useCallback for stable reference
export const useHandleNotification = () => {
  const { open } = useNotification();

  const handleNotification = useCallback(
    (notification, fallback) => {
      // ... logic
    },
    [] // ← Stable reference (empty deps)
  );

  return handleNotification;
};

// Impact: Prevents re-renders in components using this hook
```

**Benchmark:**
```typescript
// Without useCallback
// → New function every render
// → Components re-render unnecessarily
// → 1000 renders = 1000 new function instances

// With useCallback
// → Same function across all renders
// → Components don't re-render
// → 1000 renders = 1 function instance
```

### 8.2. Early Return Pattern

```typescript
// ✅ Hook uses early returns to avoid unnecessary work
const handleNotification = useCallback((notification, fallback) => {
  // Early return for false - fastest path
  if (notification === false) {
    return; // ← Exit immediately, no further checks
  }

  // Check custom notification
  if (notification) {
    open?.(notification);
    return; // ← Exit, don't check fallback
  }

  // Only check fallback if needed
  if (fallback) {
    open?.(fallback);
  }
}, []);

// Performance: Each early return saves subsequent condition checks
```

### 8.3. No Heavy Computations

```typescript
// ✅ Hook delegates heavy work to caller
function useCreate() {
  const handleNotification = useHandleNotification();

  return useMutation({
    onSuccess: (data, variables) => {
      // ✅ Heavy work done HERE (in data hook)
      const notificationConfig = buildNotificationConfig(
        variables.successNotification,
        data,
        variables.resource
      );

      const fallbackConfig = buildFallbackConfig(
        data,
        variables.resource
      );

      // ✅ Handler just does simple conditional logic
      handleNotification(notificationConfig, fallbackConfig);
    }
  });
}

// Result: Handler stays fast, heavy work is in caller context
```

### 8.4. Optional Chaining Performance

```typescript
// ✅ Using optional chaining (minimal cost)
open?.(notification); // Very fast

// vs.

// ❌ Manual checking (more verbose, not faster)
if (open) {
  open(notification);
}

// Modern JS engines optimize optional chaining
// Performance difference is negligible (< 1ms)
```

### 8.5. Avoid Notification Spam

```typescript
// ❌ Bad - notification on every re-render
function MyComponent() {
  const handleNotification = useHandleNotification();

  // ❌ Called on every render!
  handleNotification(
    { message: "Rendered", type: "success" },
    undefined
  );

  return <div>Content</div>;
}

// ✅ Good - notification only in effects or callbacks
function MyComponent() {
  const handleNotification = useHandleNotification();
  const { mutate } = useCreate();

  // ✅ Only called when mutation succeeds
  const onCreate = () => {
    mutate(
      { resource: "posts", values: data },
      {
        onSuccess: () => {
          handleNotification(
            { message: "Created", type: "success" },
            undefined
          );
        }
      }
    );
  };

  return <button onClick={onCreate}>Create</button>;
}
```

## 9. Testing

### 9.1. Unit Test - Hook Behavior

```typescript
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { TestWrapper } from "@test";
import { useHandleNotification } from "./useHandleNotification";

describe("useHandleNotification", () => {
  const openMock = vi.fn();
  const closeMock = vi.fn();

  const wrapper = ({ children }) =>
    TestWrapper({
      notificationProvider: {
        open: openMock,
        close: closeMock
      }
    })({ children });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls open with notification when provided", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    const notification = {
      message: "Test",
      type: "success" as const
    };

    result.current(notification, undefined);

    expect(openMock).toHaveBeenCalledWith(notification);
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it("does not call open when notification is false", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    const fallback = {
      message: "Fallback",
      type: "success" as const
    };

    result.current(false, fallback);

    expect(openMock).not.toHaveBeenCalled();
  });

  it("calls open with fallback when notification is undefined", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    const fallback = {
      message: "Fallback",
      type: "success" as const
    };

    result.current(undefined, fallback);

    expect(openMock).toHaveBeenCalledWith(fallback);
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it("does not call open when both are undefined", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    result.current(undefined, undefined);

    expect(openMock).not.toHaveBeenCalled();
  });

  it("prioritizes notification over fallback", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    const notification = {
      message: "Custom",
      type: "success" as const
    };

    const fallback = {
      message: "Fallback",
      type: "success" as const
    };

    result.current(notification, fallback);

    expect(openMock).toHaveBeenCalledWith(notification);
    expect(openMock).not.toHaveBeenCalledWith(fallback);
  });
});
```

### 9.2. Integration Test - với Data Hooks

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { TestWrapper } from "@test";

describe("useHandleNotification integration", () => {
  it("shows custom notification on useCreate success", async () => {
    const openMock = vi.fn();

    const { result } = renderHook(
      () => {
        const { mutate } = useCreate();
        return { mutate };
      },
      {
        wrapper: TestWrapper({
          notificationProvider: {
            open: openMock,
            close: vi.fn()
          },
          dataProvider: {
            create: vi.fn().mockResolvedValue({ data: { id: 1 } })
          }
        })
      }
    );

    result.current.mutate({
      resource: "posts",
      values: { title: "Test" },
      successNotification: {
        message: "Custom success!",
        type: "success"
      }
    });

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith({
        message: "Custom success!",
        type: "success"
      });
    });
  });

  it("respects false notification config", async () => {
    const openMock = vi.fn();

    const { result } = renderHook(
      () => {
        const { mutate } = useCreate();
        return { mutate };
      },
      {
        wrapper: TestWrapper({
          notificationProvider: {
            open: openMock,
            close: vi.fn()
          },
          dataProvider: {
            create: vi.fn().mockResolvedValue({ data: { id: 1 } })
          }
        })
      }
    );

    result.current.mutate({
      resource: "posts",
      values: { title: "Test" },
      successNotification: false // ← Explicit disable
    });

    await waitFor(() => {
      expect(openMock).not.toHaveBeenCalled();
    });
  });
});
```

### 9.3. Test Priority Logic

```typescript
describe("useHandleNotification priority", () => {
  it("false has highest priority", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    result.current(
      false,
      { message: "Fallback", type: "success" }
    );

    expect(openMock).not.toHaveBeenCalled();
  });

  it("custom has priority over fallback", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    const custom = { message: "Custom", type: "success" as const };
    const fallback = { message: "Fallback", type: "success" as const };

    result.current(custom, fallback);

    expect(openMock).toHaveBeenCalledWith(custom);
    expect(openMock).toHaveBeenCalledTimes(1);
  });

  it("fallback has priority over silent", () => {
    const { result } = renderHook(() => useHandleNotification(), { wrapper });

    result.current(
      undefined,
      { message: "Fallback", type: "success" }
    );

    expect(openMock).toHaveBeenCalledWith({
      message: "Fallback",
      type: "success"
    });
  });
});
```

### 9.4. Test Stability (useCallback)

```typescript
describe("useHandleNotification stability", () => {
  it("returns stable reference across re-renders", () => {
    const { result, rerender } = renderHook(
      () => useHandleNotification(),
      { wrapper }
    );

    const firstReference = result.current;

    rerender();

    const secondReference = result.current;

    // Should be same function instance
    expect(firstReference).toBe(secondReference);
  });
});
```

### 9.5. E2E Test - User Perspective

```typescript
// Cypress / Playwright test
describe("Notification behavior E2E", () => {
  it("shows default notification when user doesn't customize", () => {
    cy.visit("/posts");
    cy.get('[data-testid="create-button"]').click();
    cy.get('[data-testid="title-input"]').type("New Post");
    cy.get('[data-testid="submit"]').click();

    // Default notification should appear
    cy.get('.ant-notification')
      .should('be.visible')
      .and('contain', 'Successfully created');
  });

  it("respects disabled notification", () => {
    // Mount component with successNotification: false
    cy.visit("/posts?disableNotification=true");
    cy.get('[data-testid="create-button"]').click();
    cy.get('[data-testid="submit"]').click();

    // No notification should appear
    cy.get('.ant-notification').should('not.exist');
  });
});
```

## 10. Kết luận

### Tóm tắt Hook

`useHandleNotification` là một **Internal Helper Hook** chỉ 27 dòng code nhưng cực kỳ quan trọng cho consistency của notification system trong Refine. Hook này triển khai priority-based logic để quyết định hiển thị notification: explicit false > custom > fallback > silent.

**Key Characteristics:**
- ✅ **Simple Logic**: Chỉ 4 branches: false → custom → fallback → silent
- ✅ **Priority-Based**: Clear priority order với explicit false ưu tiên cao nhất
- ✅ **Fallback Support**: Automatic fallback khi user không specify
- ✅ **Type-safe**: Full TypeScript với proper type guards
- ✅ **Stable**: useCallback với empty deps → stable reference
- ✅ **Internal Use**: Designed for Refine internals, not public API

### Khi nào dùng Hook này?

**✅ Sử dụng khi:**
- **NEVER** - This is an internal hook for Refine maintainers only
- Building custom data hooks that need notification handling
- Extending Refine with custom mutations that follow same patterns

**❌ Không dùng khi:**
- Building application features (use `useNotification` instead)
- Need manual notification control
- Want to show notifications outside mutation lifecycle

**Rule of Thumb:**
```typescript
// Application code (your components)
import { useNotification } from "@refinedev/core";
const { open } = useNotification();

// Refine internal code (data hooks, auth hooks)
import { useHandleNotification } from "@refinedev/core";
const handleNotification = useHandleNotification();
```

### So sánh với các giải pháp khác

| Feature | useHandleNotification | useNotification | Direct open() |
|---------|----------------------|-----------------|---------------|
| Use Case | Internal hooks | Application code | Quick calls |
| Fallback Support | ✅ Built-in | ❌ Manual | ❌ Manual |
| Priority Logic | ✅ Automatic | ❌ Manual | ❌ Manual |
| False Support | ✅ Explicit | ⚠️ Manual check | ❌ No |
| Consistency | ✅ Standardized | ⚠️ Per dev | ❌ Ad-hoc |

### Best Practices Summary

```typescript
// ✅ DO: Use for internal hooks (data/auth hooks)
const handleNotification = useHandleNotification();
handleNotification(userConfig, defaultFallback);

// ✅ DO: Always provide sensible fallback
handleNotification(userConfig, {
  message: translate("notifications.success"),
  type: "success"
});

// ✅ DO: Respect false priority
if (variables.successNotification === false) {
  // Don't show notification
}

// ✅ DO: Evaluate functions before passing
const config = typeof notification === "function"
  ? notification(data, values, resource)
  : notification;
handleNotification(config, fallback);

// ❌ DON'T: Use in application components
// Use useNotification instead

// ❌ DON'T: Treat empty object as disable
// Use false explicitly

// ❌ DON'T: Forget fallback
// Always provide default notification
```

### Điểm mạnh

1. **Standardization**: Consistent notification behavior across all Refine hooks
2. **Flexibility**: Supports false/custom/fallback/silent patterns
3. **Type-Safe**: Full TypeScript với proper null checks
4. **Performance**: Stable reference với useCallback
5. **Simple**: Only 27 lines, easy to understand logic

### Điểm cần lưu ý

1. **Internal Use**: Không phải public API cho end users
2. **Priority Order**: false > custom > fallback > silent (must understand)
3. **False vs Undefined**: false = disable, undefined = use fallback
4. **No Validation**: Hook không validate notification config
5. **Depends on useNotification**: Requires notification provider setup

### Architectural Role

```
┌─────────────────────────────────────────┐
│         NOTIFICATION SYSTEM             │
├─────────────────────────────────────────┤
│                                         │
│  NotificationProvider (Setup)           │
│          ↓                              │
│  NotificationContext (Storage)          │
│          ↓                              │
│  useNotification (Access) ◄──────────┐  │
│          ↓                           │  │
│  useHandleNotification (Logic) ◄─────┤  │
│          ↓                           │  │
│  Data Hooks (useCreate, etc.) ───────┘  │
│                                         │
└─────────────────────────────────────────┘

Layers:
1. Provider → Setup notification system
2. Context → Store open/close methods
3. useNotification → Direct access (public)
4. useHandleNotification → Smart logic (internal)
5. Data/Auth Hooks → Consumers
```

### Resources

- **Type Definitions**: `/packages/core/src/contexts/notification/types.ts`
- **Implementation**: `/packages/core/src/hooks/notification/useHandleNotification/index.ts` (27 lines)
- **Usage Examples**: `/packages/core/src/hooks/data/useCreate.ts`, `/hooks/data/useUpdate.ts`
- **Tests**: `/packages/core/src/hooks/notification/useHandleNotification/index.spec.tsx`

---

**Tác giả kiến trúc:** Refine Core Team
**Hook size:** 27 lines
**Hook type:** Internal Helper
**Dependencies:** useNotification, useCallback
**Design patterns:** Strategy (priority-based), Null Object, Callback, Builder (implicit)
