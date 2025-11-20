# Kiến trúc và Design Patterns của useCreate Hook

> **📚 LƯU Ý:** File `useCreate.ts` đã có **1,601 dòng in-line documentation** cực kỳ chi tiết. ARCHITECTURE.md này bổ sung góc nhìn kiến trúc tổng quan và design patterns ở tầng cao hơn.

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DATA MUTATION SYSTEM                    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useCreate ✅ (THIS HOOK) - Create new records   │  │
│  │  useUpdate - Update existing records             │  │
│  │  useDelete - Delete records                      │  │
│  │  useCreateMany - Bulk create                     │  │
│  │  useUpdateMany - Bulk update                     │  │
│  │  useDeleteMany - Bulk delete                     │  │
│  │         │                                         │  │
│  │         ▼                                         │  │
│  │  Built on React Query useMutation                │  │
│  │         │                                         │  │
│  │         ├──→ Notifications (auto)                │  │
│  │         ├──→ Cache Invalidation (auto)           │  │
│  │         ├──→ Realtime Events (auto)              │  │
│  │         ├──→ Audit Logging (auto)                │  │
│  │         └──→ Error Handling (auto)               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Create new records with automatic notifications, cache invalidation, realtime events, audit logging, and error handling**

### 1.2 Complete Creation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  USECREATE COMPLETE FLOW                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Uses Hook                                │
│  const { mutate, isPending } = useCreate();                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: User Submits Form                                  │
│  mutate({                                                    │
│    resource: "posts",                                        │
│    values: { title: "Hello", content: "..." }               │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Validation                                          │
│  - Resource exists?                                          │
│  - Values provided?                                          │
│  → If invalid: Throw error                                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: mutationFn Executes                                │
│  dataProvider.create({                                       │
│    resource: "posts",                                        │
│    variables: { title: "Hello", content: "..." },           │
│    meta: { ... }                                             │
│  })                                                          │
│  → API Call: POST /posts                                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: onSuccess Callback                                 │
│  1. Show success notification                               │
│  2. Invalidate cache (list, many queries)                   │
│  3. Publish realtime event                                  │
│  4. Create audit log                                        │
│  5. Call user's onSuccess callback                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: UI Updates                                         │
│  - List refetches (new item appears)                        │
│  - Success notification shown                               │
│  - Form resets                                              │
│  - Redirect (if configured)                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useCreate.ts: 1,601 dòng** - Mutation pattern showcase!

---

### 2.1 Command Pattern - Pattern "Lệnh Đóng Gói"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order Ticket

```
Restaurant Order System:

❌ BAD - Customer directly tells chef:
Customer → Chef: "Make me spaghetti with extra cheese!"
→ No record of order
→ Chef forgets requirements
→ Hard to track

✅ GOOD - Order ticket system:
Customer → Waiter → Order Ticket → Chef
Order Ticket contains:
  - Item: Spaghetti
  - Modifications: Extra cheese
  - Table number: 5
  - Time: 7:30 PM
→ Clear record
→ Can track status
→ Can cancel/modify order
```

**Command Pattern** = Encapsulate request as object

#### Implementation in useCreate:

```typescript
// mutate() = Command
const { mutate } = useCreate();

// Execute command:
mutate({
  // COMMAND PAYLOAD
  resource: "posts",       // ← What to create
  values: {                // ← Data to create
    title: "Hello World",
    content: "..."
  },
  meta: { ... },           // ← Additional metadata

  // COMMAND CALLBACKS
  successNotification: { message: "Created!" },
  errorNotification: { message: "Failed!" },
  onSuccess: (data) => { ... },
  onError: (error) => { ... }
});

// Everything encapsulated in one command! ✅
```

#### ❌ KHÔNG có Command Pattern:

```tsx
// BAD - Manual API call with scattered logic

async function createPost(values) {
  try {
    // 1. Make API call
    const response = await fetch("/api/posts", {
      method: "POST",
      body: JSON.stringify(values),
    });
    const data = await response.json();

    // 2. Show notification
    toast.success("Post created!");

    // 3. Invalidate cache
    queryClient.invalidateQueries(["posts", "list"]);

    // 4. Publish realtime
    publishEvent("posts", "created", data);

    // 5. Create audit log
    auditLog("create", "posts", data.id);

    // 6. Redirect
    navigate(`/posts/show/${data.id}`);
  } catch (error) {
    toast.error("Failed to create post");
  }
}

// Problems:
// - Too much boilerplate! ❌
// - Easy to forget steps
// - Inconsistent across app
// - Hard to test
```

#### ✅ CÓ Command Pattern:

```tsx
// GOOD - Command encapsulates everything

const { mutate } = useCreate();

const createPost = (values) => {
  mutate({
    resource: "posts",
    values,
    // All the complex logic handled by hook! ✅
  });
};

// Simple! ✅
// Consistent! ✅
// Complete! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - All creation logic in one place
- ✅ **Consistency** - Same behavior everywhere
- ✅ **Completeness** - Never forget notifications/cache/etc
- ✅ **Testability** - Easy to test command execution

---

### 2.2 Observer Pattern - Pattern "Quan Sát React Query State"

#### 📡 VÍ DỤ ĐỜI THƯỜNG: Pizza Delivery Tracker

```
Pizza Delivery:

You order pizza online
→ Status: "Preparing" 🍕
→ Your phone automatically updates

Chef finishes
→ Status: "Out for delivery" 🚗
→ Your phone automatically updates

Driver arrives
→ Status: "Delivered" ✅
→ Your phone automatically updates

You don't refresh manually!
→ App OBSERVES status changes automatically
```

**Observer Pattern** = React automatically re-renders when mutation state changes

#### Implementation:

```typescript
const { mutate, mutation } = useCreate();

// Component OBSERVES mutation state:
const { isPending, isError, isSuccess, data, error } = mutation;

// When mutation state changes:
// → React automatically re-renders component ✅
// → No manual state management needed ✅
```

#### Real Example:

```tsx
function CreatePostForm() {
  const { mutate, mutation } = useCreate();

  // OBSERVE mutation state
  const { isPending, isError, isSuccess, error } = mutation;

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <input name="content" />

      {/* UI automatically reacts to mutation state changes! */}
      <button disabled={isPending}>
        {isPending ? "Creating..." : "Create Post"}
      </button>

      {isError && <div>Error: {error.message}</div>}
      {isSuccess && <div>Post created successfully!</div>}
    </form>
  );
}

// Flow:
// 1. User clicks button
// 2. isPending = true → Button shows "Creating..."
// 3. API call
// 4. Success: isSuccess = true → Shows success message
// 5. Error: isError = true → Shows error message
//
// All automatic! No manual setState() needed! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reactive** - UI updates automatically
- ✅ **No manual state** - React Query manages state
- ✅ **Consistent** - Same pattern everywhere
- ✅ **Clean code** - Less boilerplate

---

### 2.3 Chain of Responsibility Pattern - onSuccess Callbacks

#### 🔗 VÍ DỤ ĐỜI THƯỜNG: Airport Security Chain

```
Airport Security Checkpoints:

Passenger goes through:
1. Ticket Check → Valid? → Pass to next
2. ID Verification → Valid? → Pass to next
3. Security Scan → Valid? → Pass to next
4. Gate Check → Valid? → Board plane ✈️

Each checkpoint handles its responsibility
Then passes to next in chain
```

**Chain of Responsibility** = Multiple handlers process event in sequence

#### Implementation:

```typescript
// onSuccess callback chain:

// 1. Refine's internal onSuccess
const onSuccess = async (data, variables, context) => {
  // Handler 1: Show notification
  handleNotification(...);

  // Handler 2: Invalidate cache
  await invalidateQueries(...);

  // Handler 3: Publish realtime event
  publish(...);

  // Handler 4: Create audit log
  mutate({ resource: "logs", ... });

  // Handler 5: Call user's onSuccess
  variables.onSuccess?.(data, variables, context);
};

// Each handler processes, then chain continues ✅
```

#### Visual Flow:

```
mutate() called
      │
      ▼
API Call Success
      │
      ▼
┌─────────────────────┐
│ Handler 1           │
│ Show Notification   │ ✅
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ Handler 2           │
│ Invalidate Cache    │ ✅
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ Handler 3           │
│ Publish Event       │ ✅
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ Handler 4           │
│ Create Audit Log    │ ✅
└─────────────────────┘
      │
      ▼
┌─────────────────────┐
│ Handler 5           │
│ User's onSuccess    │ ✅
└─────────────────────┘
```

#### Real Example:

```tsx
const { mutate } = useCreate();

mutate({
  resource: "posts",
  values: { title: "Hello" },
  onSuccess: (data) => {
    // This runs AFTER all Refine's internal handlers
    console.log("Created post:", data);
    navigate(`/posts/show/${data.id}`);
  },
});

// Execution order:
// 1. API call succeeds
// 2. Refine shows notification ✅
// 3. Refine invalidates cache ✅
// 4. Refine publishes event ✅
// 5. Refine creates audit log ✅
// 6. YOUR onSuccess runs ✅ (navigation happens here)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Separation of concerns** - Each handler has one job
- ✅ **Extensibility** - Easy to add new handlers
- ✅ **Order** - Handlers run in predictable sequence
- ✅ **Flexibility** - Users can add custom handlers

---

### 2.4 Strategy Pattern - Notification Strategies

#### 🎨 VÍ DỤ ĐỜI THƯỜNG: Notification Preferences

```
Notification Styles:

User A: "Show toast at top-right"
User B: "Show modal dialog"
User C: "Show banner at bottom"
User D: "No notifications (silent)"

Same event (post created)
Different notification strategies!
```

**Strategy Pattern** = Choose notification strategy at runtime

#### Implementation:

```typescript
// Different notification strategies:

// STRATEGY 1: Default notification
mutate({
  resource: "posts",
  values: { ... },
  // Uses default: { message: "Successfully created posts", type: "success" }
});

// STRATEGY 2: Custom notification
mutate({
  resource: "posts",
  values: { ... },
  successNotification: {
    message: "🎉 Your amazing post is live!",
    description: "Share it with your friends!",
    type: "success"
  }
});

// STRATEGY 3: Function-based notification (dynamic)
mutate({
  resource: "posts",
  values: { ... },
  successNotification: (data, values, resource) => ({
    message: `Post "${data.title}" created successfully!`,
    type: "success"
  })
});

// STRATEGY 4: No notification (silent)
mutate({
  resource: "posts",
  values: { ... },
  successNotification: false
});
```

#### Real Examples:

```tsx
// Example 1: E-commerce order
mutate({
  resource: "orders",
  values: orderData,
  successNotification: (data) => ({
    message: "Order Placed! 🛍️",
    description: `Order #${data.orderNumber} - Total: $${data.total}`,
    type: "success",
  }),
});

// Example 2: Bulk operation (silent)
mutate({
  resource: "bulk-import",
  values: csvData,
  successNotification: false, // Silent during bulk import
});

// Example 3: Critical action
mutate({
  resource: "payments",
  values: paymentData,
  successNotification: {
    message: "Payment Successful! ✅",
    description: "Transaction ID: " + transactionId,
    type: "success",
    undoableTimeout: 0, // Don't allow undo for payments!
  },
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose strategy per mutation
- ✅ **UX** - Customize for different contexts
- ✅ **Control** - Can disable notifications when needed
- ✅ **Dynamic** - Notifications based on response data

---

### 2.5 Facade Pattern - Pattern "Mặt Tiền Đơn Giản"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Smart Home "Good Morning" Button

```
Smart Home Morning Routine:

❌ COMPLEX - Manual control:
1. Open blinds app → Open blinds
2. Open thermostat app → Set to 72°F
3. Open coffee maker app → Start brewing
4. Open music app → Play playlist
5. Open lights app → Turn on lights
→ 5 apps! Too complex!

✅ SIMPLE - One button:
Press "Good Morning"
→ All 5 actions happen automatically! ✅

Facade hides complexity behind simple interface
```

**Facade Pattern** = useCreate hides complex mutation logic

#### Implementation:

```typescript
// useCreate = Facade over many complex systems

export const useCreate = () => {
  // SUBSYSTEM 1: Data Provider
  const dataProvider = useDataProvider();

  // SUBSYSTEM 2: Notifications
  const { open: openNotification } = useNotification();

  // SUBSYSTEM 3: Translation
  const translate = useTranslate();

  // SUBSYSTEM 4: Cache Invalidation
  const invalidateQueries = useInvalidate();

  // SUBSYSTEM 5: Realtime Publishing
  const { publish } = usePublish();

  // SUBSYSTEM 6: Audit Logging
  const { mutate: logMutate } = useLog();

  // SUBSYSTEM 7: React Query
  const mutation = useMutation({ ... });

  // FACADE: Simple interface
  return { mutate, mutation };
};
```

#### ❌ KHÔNG có Facade:

```tsx
// BAD - Component must coordinate all subsystems ❌

function CreatePostForm() {
  const dataProvider = useDataProvider();
  const { open: notify } = useNotification();
  const translate = useTranslate();
  const invalidate = useInvalidate();
  const { publish } = usePublish();
  const { mutate: log } = useLog();

  const handleSubmit = async (values) => {
    try {
      // Must manually coordinate everything! ❌
      const data = await dataProvider.create({ ... });
      notify({ message: translate("success"), type: "success" });
      await invalidate({ resource: "posts", invalidates: ["list"] });
      publish({ channel: "posts", type: "created", payload: data });
      log({ resource: "posts", action: "create", data });
    } catch (error) {
      notify({ message: translate("error"), type: "error" });
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// Too complex! ❌
// Easy to forget steps! ❌
// Inconsistent! ❌
```

#### ✅ CÓ Facade Pattern:

```tsx
// GOOD - Facade hides complexity ✅

function CreatePostForm() {
  const { mutate } = useCreate();

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values,
    });
    // All subsystems coordinated automatically! ✅
  };

  return <form onSubmit={handleSubmit}>...</form>;
}

// Simple! ✅
// Complete! ✅
// Consistent! ✅
```

#### Benefits Breakdown:

```
Behind mutate({ resource: "posts", values: {...} }):

✅ Validate resource + values
✅ Call dataProvider.create()
✅ Show success notification
✅ Invalidate cache (list queries refetch)
✅ Publish realtime event
✅ Create audit log
✅ Handle errors
✅ Call user callbacks

All automatic! User just calls mutate()! 🎉
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - One hook instead of 7+
- ✅ **Completeness** - Never forget a step
- ✅ **Consistency** - Same behavior everywhere
- ✅ **Maintainability** - Change once, apply everywhere

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                     | Ví dụ đời thường         | Giải quyết vấn đề gì       | Trong useCreate                    |
| --------------------------- | ------------------------ | -------------------------- | ---------------------------------- |
| **Command**                 | Restaurant order ticket  | Encapsulate request        | mutate() encapsulates creation     |
| **Observer**                | Pizza delivery tracker   | Auto UI updates            | React Query state changes          |
| **Chain of Responsibility** | Airport security         | Sequential handlers        | onSuccess callback chain           |
| **Strategy**                | Notification preferences | Choose behavior at runtime | Different notification strategies  |
| **Facade**                  | Smart home button        | Hide complexity            | Simple mutate(), complex internals |

---

## 3. KEY FEATURES

### 3.1 Automatic Cache Invalidation

```typescript
// After successful creation, automatically invalidates:
// - "list" queries (so lists refetch and show new item)
// - "many" queries

mutate({
  resource: "posts",
  values: { title: "Hello" },
  invalidates: ["list", "many"] // Default
});

// Custom invalidation:
mutate({
  resource: "posts",
  values: { ... },
  invalidates: ["list", "detail", "many"] // Also invalidate detail
});
```

### 3.2 Realtime Event Publishing

```typescript
// Automatically publishes event to live provider
// Other users get realtime updates!

mutate({
  resource: "posts",
  values: { ... }
});

// Event published:
// {
//   channel: "resources/posts",
//   type: "created",
//   payload: { id: 123, title: "..." },
//   date: new Date()
// }
```

### 3.3 Audit Logging

```typescript
// Automatically creates audit log if auditLogProvider configured

mutate({
  resource: "posts",
  values: { ... }
});

// Audit log created:
// {
//   resource: "posts",
//   action: "create",
//   data: { id: 123, title: "..." },
//   author: { name: "John Doe", id: 1 },
//   meta: { ... }
// }
```

### 3.4 Error Handling Layers

```typescript
// Multiple error handling layers:

// LAYER 1: Try-catch in mutationFn
try {
  const data = await dataProvider.create({ ... });
} catch (error) {
  // Caught and passed to onError
}

// LAYER 2: onError callback
onError: (error, variables, context) => {
  // Show error notification
  // Handle specific errors
};

// LAYER 3: Component error handling
const { mutate, mutation } = useCreate();

if (mutation.isError) {
  return <div>Error: {mutation.error.message}</div>;
}

// LAYER 4: Error boundaries (React)
<ErrorBoundary>
  <CreatePostForm />
</ErrorBoundary>
```

### 3.5 TypeScript Generics for Type Safety

```typescript
// Full type safety with generics:

interface Post {
  id: number;
  title: string;
  content: string;
}

interface PostError {
  message: string;
  code: string;
}

interface PostCreateVariables {
  title: string;
  content: string;
}

const { mutate, mutation } = useCreate<
  Post, // TData - Response type
  PostError, // TError - Error type
  PostCreateVariables // TVariables - Input type
>();

// Now TypeScript knows:
mutate({
  resource: "posts",
  values: {
    title: "...", // ✅ Required
    content: "...", // ✅ Required
    author: "...", // ❌ Error! Not in PostCreateVariables
  },
});

mutation.data?.id; // ✅ number
mutation.data?.title; // ✅ string
mutation.error?.code; // ✅ string
```

---

## 4. COMMON USE CASES

### 4.1 Basic Form Creation

```tsx
import { useCreate } from "@refinedev/core";

function CreatePostForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const { mutate, mutation } = useCreate();

  const handleSubmit = (e) => {
    e.preventDefault();
    mutate({
      resource: "posts",
      values: { title, content },
    });
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
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Creating..." : "Create Post"}
      </button>
      {mutation.isError && <div>Error: {mutation.error.message}</div>}
    </form>
  );
}
```

### 4.2 With Navigation After Success

```tsx
import { useNavigate } from "react-router-dom";

function CreatePostForm() {
  const navigate = useNavigate();
  const { mutate } = useCreate();

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values,
      onSuccess: (data) => {
        navigate(`/posts/show/${data.id}`); // Navigate to show page
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 4.3 Optimistic Update

```tsx
function CreateComment({ postId }) {
  const { mutate } = useCreate();

  const handleCreate = (content) => {
    mutate({
      resource: "comments",
      values: { postId, content },
      mutationMode: "optimistic", // Show in UI immediately
      optimisticUpdateMap: {
        list: (previous, values) => {
          // Add to cache immediately
          return {
            data: [
              ...previous.data,
              {
                id: `temp-${Date.now()}`,
                postId: values.postId,
                content: values.content,
                createdAt: new Date(),
              },
            ],
          };
        },
      },
    });
  };

  return <button onClick={() => handleCreate("Great post!")}>Comment</button>;
}
```

### 4.4 File Upload with Progress

```tsx
function FileUploadForm() {
  const [progress, setProgress] = useState(0);
  const { mutate } = useCreate();

  const handleUpload = (file) => {
    const formData = new FormData();
    formData.append("file", file);

    mutate({
      resource: "files",
      values: formData,
      meta: {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          setProgress(percentCompleted);
        },
      },
    });
  };

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      {progress > 0 && <div>Upload progress: {progress}%</div>}
    </div>
  );
}
```

### 4.5 Multi-Step Form with Relationships

```tsx
function CreateOrderForm() {
  const { mutate: createOrder } = useCreate();
  const { mutate: createOrderItems } = useCreate();

  const handleSubmit = async (values) => {
    // Step 1: Create order
    createOrder({
      resource: "orders",
      values: {
        customerId: values.customerId,
        total: values.total,
      },
      onSuccess: (orderData) => {
        // Step 2: Create order items
        values.items.forEach((item) => {
          createOrderItems({
            resource: "order-items",
            values: {
              orderId: orderData.id,
              productId: item.productId,
              quantity: item.quantity,
            },
          });
        });
      },
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### 4.6 Conditional Notification

```tsx
function CreatePostForm() {
  const { mutate } = useCreate();
  const [isDraft, setIsDraft] = useState(false);

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values: { ...values, status: isDraft ? "draft" : "published" },
      successNotification: isDraft
        ? false // Silent for drafts
        : { message: "🎉 Post published successfully!", type: "success" },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="checkbox" onChange={(e) => setIsDraft(e.target.checked)} />
      <label>Save as draft</label>
      <button>Submit</button>
    </form>
  );
}
```

---

## 5. TESTING

### 5.1 Unit Test Example

```typescript
import { renderHook, act, waitFor } from "@testing-library/react";
import { useCreate } from "./useCreate";

// Mock dependencies
jest.mock("@tanstack/react-query");
jest.mock("../../contexts/data");

describe("useCreate", () => {
  it("should call dataProvider.create on mutate", async () => {
    const mockCreate = jest.fn(() => Promise.resolve({ data: { id: 1 } }));

    useDataProvider.mockReturnValue({
      create: mockCreate,
    });

    const { result } = renderHook(() => useCreate());

    act(() => {
      result.current.mutate({
        resource: "posts",
        values: { title: "Test" },
      });
    });

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        resource: "posts",
        values: { title: "Test" },
        meta: undefined,
      });
    });
  });

  it("should show notification on success", async () => {
    const mockNotification = jest.fn();
    useNotification.mockReturnValue({ open: mockNotification });

    const { result } = renderHook(() => useCreate());

    act(() => {
      result.current.mutate({
        resource: "posts",
        values: { title: "Test" },
      });
    });

    await waitFor(() => {
      expect(mockNotification).toHaveBeenCalledWith({
        message: expect.stringContaining("Successfully created"),
        type: "success",
      });
    });
  });
});
```

### 5.2 Integration Test

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Refine } from "@refinedev/core";

const mockDataProvider = {
  create: jest.fn(() =>
    Promise.resolve({ data: { id: 1, title: "Test Post" } }),
  ),
  getList: jest.fn(() => Promise.resolve({ data: [], total: 0 })),
  // ...other methods
};

describe("Create Post Integration", () => {
  it("should create post and show in list", async () => {
    render(
      <Refine dataProvider={mockDataProvider}>
        <PostList />
        <CreatePostForm />
      </Refine>,
    );

    const titleInput = screen.getByPlaceholderText("Title");
    const submitButton = screen.getByText("Create Post");

    fireEvent.change(titleInput, { target: { value: "New Post" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockDataProvider.create).toHaveBeenCalledWith({
        resource: "posts",
        values: { title: "New Post" },
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Post created successfully")).toBeInTheDocument();
    });
  });
});
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting Resource Parameter

```tsx
// ❌ WRONG - No resource
const { mutate } = useCreate();
mutate({
  values: { title: "Test" },
  // Missing resource! ❌
});

// ✅ CORRECT
mutate({
  resource: "posts",
  values: { title: "Test" },
});
```

### 6.2 Not Handling Loading State

```tsx
// ❌ WRONG - No loading indicator
function CreateForm() {
  const { mutate } = useCreate();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate({ ... });
    }}>
      <button>Submit</button> {/* Can click multiple times! ❌ */}
    </form>
  );
}

// ✅ CORRECT - Disable during loading
function CreateForm() {
  const { mutate, mutation } = useCreate();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutate({ ... });
    }}>
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
```

### 6.3 Mutating Wrong Data Type

```tsx
// ❌ WRONG - FormData without proper meta
const { mutate } = useCreate();
mutate({
  resource: "files",
  values: new FormData(), // ❌ Might not work with JSON API
});

// ✅ CORRECT - Specify headers
mutate({
  resource: "files",
  values: formData,
  meta: {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  },
});
```

---

## 7. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: mutate() encapsulates creation
- ✅ **Observer**: React Query state auto-updates
- ✅ **Chain of Responsibility**: onSuccess callback chain
- ✅ **Strategy**: Different notification strategies
- ✅ **Facade**: Simple interface, complex internals

### Key Features

1. **Automatic notifications** - Success/error messages
2. **Cache invalidation** - Lists auto-refresh
3. **Realtime events** - Other users get updates
4. **Audit logging** - Track who created what
5. **Error handling** - Multiple layers of protection
6. **Type safety** - Full TypeScript support

### Khi nào dùng useCreate?

✅ **Nên dùng:**

- Forms to create new records
- Quick actions (e.g., "Add to Cart")
- Bulk operations with createMany
- File uploads
- Multi-step wizards

❌ **Không dùng:**

- Read operations (use useOne, useList)
- Update operations (use useUpdate)
- Delete operations (use useDelete)
- Complex custom mutations (use useCustomMutation)

### Remember

✅ **1,601 lines** - Extensively documented in code
🎯 **Command** - Encapsulated creation
📡 **Observer** - Auto UI updates
🔗 **Chain** - Sequential success handlers
🎨 **Strategy** - Flexible notifications
🏢 **Facade** - Simple API, rich features

### Pro Tips

1. **Always disable button during isPending**
2. **Use TypeScript generics for type safety**
3. **Custom onSuccess for navigation**
4. **optimisticUpdate for instant UX**
5. **Conditional notifications for better UX**
6. **File uploads need proper meta headers**

---

> 📚 **Reminder**: This ARCHITECTURE.md complements the 1,601 lines of in-line documentation in `useCreate.ts`. Read both for complete understanding!
