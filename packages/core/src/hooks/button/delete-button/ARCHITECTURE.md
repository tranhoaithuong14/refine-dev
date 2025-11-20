# Kiến trúc và Design Patterns của useDeleteButton Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           BUTTON HOOKS SYSTEM                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  useRefreshButton                                │  │
│  │  useEditButton                                   │  │
│  │  useDeleteButton ✅ (THIS HOOK)                  │  │
│  │  useShowButton                                   │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Combines:                                       │  │
│  │    - useDelete (data mutation)                   │  │
│  │    - useButtonCanAccess (permissions)            │  │
│  │    - useWarnAboutChange (unsaved changes)        │  │
│  │    - useTranslate (i18n)                         │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Returns:                                        │  │
│  │    - label, title, disabled, hidden              │  │
│  │    - confirmOkLabel, cancelLabel, confirmTitle   │  │
│  │    - onConfirm (delete handler)                  │  │
│  │    - loading state                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có 1 mục đích rất rõ ràng:**

> **Provide all props needed for a fully-featured Delete Button with confirmation dialog, permission checking, and loading states**

### 1.2 Complete Delete Button Flow

```
┌──────────────────────────────────────────────────────────────┐
│                 DELETE BUTTON COMPLETE FLOW                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Render Delete Button                               │
│  const {                                                     │
│    label,                                                    │
│    disabled,                                                 │
│    hidden,                                                   │
│    loading,                                                  │
│    onConfirm,                                                │
│    confirmTitle                                              │
│  } = useDeleteButton({ resource: "posts", id: 123 });       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Check Permissions (useButtonCanAccess)             │
│  Can user delete this resource?                             │
│                                                              │
│  YES → disabled = false, proceed                            │
│  NO → disabled = true or hidden = true                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: User Clicks Delete Button                          │
│  <button disabled={disabled} onClick={showConfirmDialog}>   │
│    {label} {/* "Delete" or "Xóa" */}                        │
│  </button>                                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Show Confirmation Dialog                           │
│  <Modal                                                      │
│    title={confirmTitle} {/* "Are you sure?" */}             │
│    onOk={onConfirm}                                          │
│    okText={confirmOkLabel} {/* "Delete" */}                 │
│    cancelText={cancelLabel} {/* "Cancel" */}                │
│  >                                                           │
│    Are you sure you want to delete this item?               │
│  </Modal>                                                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: User Confirms Deletion                             │
│  onConfirm() called                                          │
│    ↓                                                         │
│  1. setWarnWhen(false) - Disable unsaved changes warning    │
│  2. mutate({ id, resource }) - Call useDelete mutation      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Delete Mutation Executes (useDelete)               │
│  → Calls dataProvider.delete({ resource, id })              │
│  → Shows loading state (loading = true)                     │
│  → Optimistic update (if mutationMode: "optimistic")        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Handle Success                                     │
│  → Show success notification                                │
│  → Invalidate cache (list queries refetch)                  │
│  → Call props.onSuccess callback (if provided)              │
│  → loading = false                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: UI Updates                                         │
│  → Item removed from list                                   │
│  → Or redirect to list page (if on detail page)             │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này là 103 dòng** - Orchestrates 5 different hooks!

---

### 2.1 Facade Pattern - Pattern "Mặt Tiền Đơn Giản"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Hotel Concierge (Lễ tân khách sạn)

```
Imagine you want a vacation package:

❌ BAD - Book everything yourself:
1. Call airline for flight
2. Call hotel for room
3. Call rental car company
4. Call tour guide
5. Buy travel insurance
→ Too complex! Must deal with 5 different services!

✅ GOOD - Talk to hotel concierge:
You: "I want a vacation package"
Concierge: "Sure! I'll arrange:
  - Flight ✅
  - Hotel ✅
  - Car ✅
  - Tours ✅
  - Insurance ✅"
→ Simple! One interface, handles all complexity!
```

**Facade Pattern** = Simple interface hiding complex subsystem

#### Implementation in useDeleteButton:

```typescript
// useDeleteButton = Facade
// Coordinates 5 different hooks:

export function useDeleteButton(props) {
  // Hook 1: Translation
  const translate = useTranslate();

  // Hook 2: Delete mutation
  const { mutation: { mutate, isPending, variables } } = useDelete();

  // Hook 3: Unsaved changes warning
  const { setWarnWhen } = useWarnAboutChange();

  // Hook 4: Mutation mode
  const { mutationMode } = useMutationMode(props.mutationMode);

  // Hook 5: Resource params
  const { id, resource, identifier } = useResourceParams({
    resource: props.resource,
    id: props.id,
  });

  // Hook 6: Access control
  const { title, disabled, hidden, canAccess } = useButtonCanAccess({
    action: "delete",
    accessControl: props.accessControl,
    id,
    resource,
  });

  // ... Orchestrate all hooks

  return { label, disabled, hidden, loading, onConfirm, ... };
}
```

#### ❌ KHÔNG có Facade:

```tsx
// BAD - Component must coordinate all hooks manually

function DeleteButton({ resource, id }) {
  // Developer must remember to use ALL these hooks! ❌
  const translate = useTranslate();
  const { mutate, isPending } = useDelete();
  const { setWarnWhen } = useWarnAboutChange();
  const { mutationMode } = useMutationMode();
  const { id: resourceId, identifier } = useResourceParams({ resource, id });
  const { disabled, hidden } = useButtonCanAccess({
    action: "delete",
    id,
    resource,
  });

  // Developer must coordinate them correctly ❌
  const onConfirm = () => {
    setWarnWhen(false); // Don't forget this!
    mutate({
      id: resourceId,
      resource: identifier,
      mutationMode,
      // ... many more options
    });
  };

  const label = translate("buttons.delete", "Delete");
  const loading = isPending && variables?.id === resourceId;

  // ... More logic

  if (hidden) return null;
  return (
    <button disabled={disabled} onClick={onConfirm}>
      {label}
    </button>
  );
}

// Problems:
// - Too much boilerplate in EVERY delete button
// - Easy to forget a hook (e.g., setWarnWhen)
// - Inconsistent across components
// - Hard to maintain
```

#### ✅ CÓ Facade Pattern:

```tsx
// GOOD - Facade hides complexity

function DeleteButton({ resource, id }) {
  const {
    label,
    disabled,
    hidden,
    loading,
    onConfirm,
    confirmTitle,
    confirmOkLabel,
    cancelLabel,
  } = useDeleteButton({ resource, id });

  // Simple! Facade handled all complexity ✅

  if (hidden) return null;

  return (
    <Popconfirm
      title={confirmTitle}
      onConfirm={onConfirm}
      okText={confirmOkLabel}
      cancelText={cancelLabel}
    >
      <button disabled={disabled} loading={loading}>
        {label}
      </button>
    </Popconfirm>
  );
}

// Benefits:
// - Simple, clean component code
// - No boilerplate
// - Consistent behavior
// - Easy to use
```

#### Visual Representation:

```
┌─────────────────────────────────────────────────────┐
│                 FACADE PATTERN                      │
└─────────────────────────────────────────────────────┘

Component (Simple Interface)
    │
    ▼
┌───────────────────────┐
│  useDeleteButton      │ ← FACADE
│  (103 lines)          │
└───────────────────────┘
    │
    ├─→ useTranslate (i18n)
    ├─→ useDelete (mutation)
    ├─→ useWarnAboutChange (unsaved warning)
    ├─→ useMutationMode (optimistic/pessimistic)
    ├─→ useResourceParams (resource resolution)
    └─→ useButtonCanAccess (permissions)

Complex Subsystem (6 hooks)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - One hook instead of 6
- ✅ **Consistency** - Same behavior everywhere
- ✅ **DRY** - No duplication
- ✅ **Maintainability** - Change once, apply everywhere

---

### 2.2 Composition Pattern - Pattern "Ghép Lắp"

#### 🧩 VÍ DỤ ĐỜI THƯỜNG: LEGO Blocks

```
Building a LEGO spaceship:

Small blocks:
  - Engine block
  - Wing block
  - Cockpit block
  - Weapon block

Composition:
  Engine + Wings + Cockpit + Weapons = Spaceship!

Same blocks, different compositions = different ships!
```

**Composition Pattern** = Build complex functionality from simple parts

#### Implementation:

```typescript
// useDeleteButton composes 6 hooks:

// COMPOSITION 1: Label translations
const label = translate("buttons.delete", "Delete");
const confirmOkLabel = translate("buttons.delete", "Delete");
const confirmTitle = translate("buttons.confirm", "Are you sure?");
const cancelLabel = translate("buttons.cancel", "Cancel");

// COMPOSITION 2: Permission checking
const { title, disabled, hidden, canAccess } = useButtonCanAccess({
  action: "delete",
  accessControl: props.accessControl,
  id,
  resource,
});

// COMPOSITION 3: Resource resolution
const { id, resource, identifier } = useResourceParams({
  resource: props.resource,
  id: props.id,
});

// COMPOSITION 4: Delete mutation
const {
  mutation: { mutate, isPending, variables },
} = useDelete();

// COMPOSITION 5: Unsaved changes
const { setWarnWhen } = useWarnAboutChange();

// COMPOSITION 6: Mutation mode
const { mutationMode } = useMutationMode(props.mutationMode);

// Compose them into onConfirm:
const onConfirm = () => {
  setWarnWhen(false); // ← From COMPOSITION 5
  mutate({
    id, // ← From COMPOSITION 3
    resource: identifier, // ← From COMPOSITION 3
    mutationMode, // ← From COMPOSITION 6
    // ...
  });
};

// Return composed result:
return {
  label, // ← From COMPOSITION 1
  disabled, // ← From COMPOSITION 2
  hidden, // ← From COMPOSITION 2
  loading, // ← From COMPOSITION 4
  onConfirm, // ← Composed from 5, 3, 6, 4
  // ...
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reusability** - Each hook can be used independently
- ✅ **Modularity** - Easy to swap implementations
- ✅ **Testability** - Test each hook separately
- ✅ **Flexibility** - Compose differently for different needs

---

### 2.3 Command Pattern - Pattern "Lệnh Đóng Gói"

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order

```
Restaurant:

❌ BAD - Customer goes to kitchen directly:
Customer: "Chef, cook me a steak!"
→ Chaotic! Kitchen can't track orders!

✅ GOOD - Customer gives order ticket:
1. Customer tells waiter: "One steak, medium rare"
2. Waiter writes order ticket
3. Order ticket goes to kitchen
4. Chef cooks when ready
5. Waiter brings food

→ Order = Command object!
   Contains: what to cook, for whom, when, etc.
```

**Command Pattern** = Encapsulate request as object

#### Implementation:

```typescript
// onConfirm = Command object
const onConfirm = () => {
  // Command encapsulates:
  // - What: Delete operation
  // - Which: id, resource
  // - How: mutationMode, meta
  // - Callbacks: onSuccess, notifications

  if (id && identifier) {
    setWarnWhen(false);

    mutate(
      // COMMAND PAYLOAD
      {
        id,                        // ← What to delete
        resource: identifier,      // ← From which resource
        mutationMode,              // ← How to delete (optimistic/pessimistic)
        successNotification: props.successNotification,
        errorNotification: props.errorNotification,
        meta: props.meta,
        dataProviderName: props.dataProviderName,
        invalidates: props.invalidates,
      },
      // COMMAND CALLBACKS
      {
        onSuccess: props.onSuccess,
      },
    );
  }
};

// Usage - Execute command:
<button onClick={onConfirm}>Delete</button>
// or
<Popconfirm onConfirm={onConfirm}>...</Popconfirm>
```

#### Real-World Examples:

```tsx
// Example 1: Basic delete
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,
});

<button onClick={onConfirm}>Delete</button>;
// Command executes: DELETE /posts/123

// Example 2: Delete with custom success handler
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,
  onSuccess: (data) => {
    console.log("Deleted!", data);
    navigate("/posts");
  },
});

<button onClick={onConfirm}>Delete</button>;
// Command executes deletion + custom callback

// Example 3: Optimistic delete
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,
  mutationMode: "optimistic",
});

<button onClick={onConfirm}>Delete</button>;
// Command executes with optimistic update

// Example 4: Undoable delete
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,
  mutationMode: "undoable",
});

<button onClick={onConfirm}>Delete</button>;
// Command executes with undo capability
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - All delete logic in one place
- ✅ **Flexibility** - Easy to add callbacks, options
- ✅ **Testability** - Test command execution separately
- ✅ **Undo/Redo** - Command pattern enables undoable operations

---

### 2.4 Strategy Pattern - Pattern "Chiến Lược Linh Hoạt"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Delete Strategies

```
Different ways to delete:

Strategy 1 (Pessimistic):
  Wait for server → Then remove from UI
  Slow but safe

Strategy 2 (Optimistic):
  Remove from UI immediately → Call server
  Fast but risky (must rollback if fails)

Strategy 3 (Undoable):
  Remove from UI → Wait 5 seconds → Call server
  User can undo within timeout
  Gmail-style!

Same delete, different strategies!
```

**Strategy Pattern** = Choose algorithm at runtime

#### Implementation:

```typescript
// From useDeleteButton (line 45)
const { mutationMode } = useMutationMode(props.mutationMode);

// mutationMode selects strategy:
// - "pessimistic": Wait for server
// - "optimistic": Immediate UI update
// - "undoable": Delayed with undo option

// Strategy applied in onConfirm:
mutate({
  id,
  resource: identifier,
  mutationMode, // ← Strategy selection
  // ...
});

// useDelete handles each strategy differently:
// - Pessimistic: UI updates after success
// - Optimistic: UI updates before API call
// - Undoable: UI updates + undo notification
```

#### Visual Comparison:

```
PESSIMISTIC (Safe):
User clicks → 🔄 Loading... → API call → ✅ Success → UI updates
              └── Slow (wait for server)

OPTIMISTIC (Fast):
User clicks → ✅ UI updates → API call → Success ✅
                             └→ Error ❌ → Rollback
              └── Fast (instant feedback)

UNDOABLE (Gmail-style):
User clicks → ✅ UI updates → ⏱️ Wait 5s → API call
              └── Notification: "Undo?" [5s countdown]
              └── User clicks Undo → ❌ Rollback (no API call)
```

#### Example Usage:

```tsx
// Strategy 1: Pessimistic (default)
<DeleteButton
  resource="posts"
  id={123}
  mutationMode="pessimistic"
/>
// → Safe, traditional delete

// Strategy 2: Optimistic
<DeleteButton
  resource="posts"
  id={123}
  mutationMode="optimistic"
/>
// → Fast, instant feedback

// Strategy 3: Undoable
<DeleteButton
  resource="posts"
  id={123}
  mutationMode="undoable"
/>
// → Gmail-style with undo
```

#### 💡 TẠI SAO quan trọng?

- ✅ **UX flexibility** - Choose best UX for your app
- ✅ **Same code** - Strategy changes, code stays same
- ✅ **Decoupled** - Strategy logic in useDelete, not useDeleteButton

---

### 2.5 Observer Pattern - Pattern "Quan Sát"

#### 👀 VÍ DỤ ĐỜI THƯỜNG: YouTube Notifications

```
YouTube:

You subscribe to a channel
→ You = Observer
→ Channel = Observable

When channel uploads video:
→ Channel notifies ALL subscribers
→ You get notification: "New video!"

Same for delete mutation:
→ Multiple components observe mutation state
```

**Observer Pattern** = Notify interested parties when state changes

#### Implementation:

```typescript
// useDelete returns mutation state
const {
  mutation: { mutate, isPending, variables },
} = useDelete();

// useDeleteButton observes mutation state:
const loading = id === variables?.id && isPending;
//              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//              Observing: Is THIS item being deleted?

// Multiple components can observe same mutation:

// Component 1: Delete button
function DeleteButton() {
  const { loading } = useDeleteButton({ id: 123 });
  return <button loading={loading}>Delete</button>;
}

// Component 2: Item in list
function PostItem() {
  const { mutation } = useDelete();
  const isDeleting = mutation.isPending && mutation.variables?.id === 123;

  return <div style={{ opacity: isDeleting ? 0.5 : 1 }}>Post content</div>;
}

// Both observe same mutation state! ✅
```

#### Why `id === variables?.id` Check?

```typescript
// Problem: Multiple delete buttons on same page
<DeleteButton id={1} />
<DeleteButton id={2} />
<DeleteButton id={3} />

// All use same useDelete hook (shared state)

// User clicks Delete on id=2:
const { loading } = useDeleteButton({ id: 2 });

// Without check:
loading = isPending; // ← ALL buttons show loading! ❌

// With check:
loading = id === variables?.id && isPending;
//        ^^^^^^^^^^^^^^^^^^^^^
//        Only TRUE for button with id=2 ✅

// Result:
// Button 1: loading = false (1 !== 2)
// Button 2: loading = true  (2 === 2) ✅
// Button 3: loading = false (3 !== 2)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reactive** - UI updates automatically
- ✅ **Granular** - Each button tracks own state
- ✅ **Shared state** - Multiple observers, one mutation
- ✅ **React Query** - Automatic state management

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường      | Giải quyết vấn đề gì        | Trong useDeleteButton           |
| --------------- | --------------------- | --------------------------- | ------------------------------- |
| **Facade**      | Hotel concierge       | Hide complex subsystem      | Orchestrate 6 hooks             |
| **Composition** | LEGO blocks           | Build from small parts      | Compose 6 hooks into one        |
| **Command**     | Restaurant order      | Encapsulate request         | onConfirm encapsulates delete   |
| **Strategy**    | Delete strategies     | Choose algorithm at runtime | Pessimistic/Optimistic/Undoable |
| **Observer**    | YouTube notifications | Notify on state changes     | Watch mutation state            |

---

## 3. KEY FEATURES

### 3.1 Comprehensive Button Props

```typescript
const {
  // Display
  label, // "Delete" or "Xóa"
  title, // Tooltip (permission reason or empty)

  // State
  hidden, // Hide if no permission
  disabled, // Disable if no permission
  loading, // Show loading during delete

  // Permission
  canAccess, // Full permission object

  // Confirmation dialog
  confirmTitle, // "Are you sure?"
  confirmOkLabel, // "Delete"
  cancelLabel, // "Cancel"

  // Action
  onConfirm, // Execute delete
} = useDeleteButton({ resource: "posts", id: 123 });
```

### 3.2 Automatic Unsaved Changes Handling

```typescript
// From useDeleteButton (lines 44, 71)
const { setWarnWhen } = useWarnAboutChange();

const onConfirm = () => {
  setWarnWhen(false); // ← Disable unsaved changes warning
  mutate({ ... });
};

// Why?
// User has unsaved form changes
// User clicks Delete
// → Should NOT show "You have unsaved changes" warning
// → Deletion takes priority
```

#### Example:

```tsx
function EditPostPage() {
  const [title, setTitle] = useState("");

  // Warn if unsaved changes
  useWarnAboutChange(title !== originalTitle);

  return (
    <>
      <input value={title} onChange={(e) => setTitle(e.target.value)} />

      <DeleteButton id={postId} />
      {/* 
        Clicking Delete:
        1. setWarnWhen(false) - Disable warning
        2. Delete post
        → NO "unsaved changes" warning! ✅
      */}
    </>
  );
}
```

### 3.3 Smart Loading State

```typescript
// From useDeleteButton (line 67)
const loading = id === variables?.id && isPending;

// Why this check?
// Multiple delete buttons on same page
// Only show loading for the button that was clicked

// Example:
<DeleteButton id={1} />  // loading = false
<DeleteButton id={2} />  // loading = true ✅ (this one clicked)
<DeleteButton id={3} />  // loading = false
```

### 3.4 Flexible Notifications

```typescript
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,

  // Custom success notification
  successNotification: (data, values, resource) => ({
    message: `Post "${data.title}" deleted successfully!`,
    type: "success",
    description: "The post has been removed from your blog.",
  }),

  // Custom error notification
  errorNotification: (error, values, resource) => ({
    message: "Failed to delete post",
    type: "error",
    description: error.message,
  }),
});
```

### 3.5 Cache Invalidation Control

```typescript
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,

  // Control which queries to invalidate
  invalidates: ["list", "many", "detail"],
  // After delete:
  // - "list": Refetch all list queries
  // - "many": Refetch getMany queries
  // - "detail": Invalidate detail query for this item
});
```

---

## 4. COMMON USE CASES

### 4.1 Basic Delete Button with Confirmation

```tsx
import { useDeleteButton } from "@refinedev/core";
import { Popconfirm, Button } from "antd";

function DeleteButton({ resource, id }) {
  const {
    label,
    disabled,
    hidden,
    loading,
    onConfirm,
    confirmTitle,
    confirmOkLabel,
    cancelLabel,
  } = useDeleteButton({ resource, id });

  if (hidden) return null;

  return (
    <Popconfirm
      title={confirmTitle}
      onOk={onConfirm}
      okText={confirmOkLabel}
      cancelText={cancelLabel}
      okButtonProps={{ danger: true }}
    >
      <Button danger disabled={disabled} loading={loading}>
        {label}
      </Button>
    </Popconfirm>
  );
}

// Usage:
<DeleteButton resource="posts" id={123} />;
```

### 4.2 Delete with Redirect

```tsx
import { useNavigate } from "react-router-dom";

function DeletePostButton({ id }) {
  const navigate = useNavigate();

  const { onConfirm, ... } = useDeleteButton({
    resource: "posts",
    id,
    onSuccess: () => {
      navigate("/posts"); // ← Redirect to list after delete
    },
  });

  return (
    <Popconfirm onConfirm={onConfirm} ...>
      <Button>Delete</Button>
    </Popconfirm>
  );
}
```

### 4.3 Optimistic Delete (Instant Feedback)

```tsx
function FastDeleteButton({ id }) {
  const { onConfirm, loading } = useDeleteButton({
    resource: "posts",
    id,
    mutationMode: "optimistic", // ← Instant UI update
  });

  return (
    <Popconfirm onConfirm={onConfirm}>
      <Button loading={loading}>Delete (Fast)</Button>
    </Popconfirm>
  );
}

// Flow:
// 1. User clicks → Item removed from list IMMEDIATELY ✅
// 2. API call in background
// 3. If API fails → Item restored with error message
```

### 4.4 Undoable Delete (Gmail-style)

```tsx
function UndoableDeleteButton({ id }) {
  const { onConfirm } = useDeleteButton({
    resource: "posts",
    id,
    mutationMode: "undoable", // ← Undo support
  });

  return (
    <Popconfirm onConfirm={onConfirm}>
      <Button>Delete</Button>
    </Popconfirm>
  );
}

// Flow:
// 1. User confirms → Item removed from list
// 2. Notification: "Item deleted. Undo? [5s]"
// 3. User can click "Undo" within 5 seconds
// 4. After 5s → API call executes deletion
```

### 4.5 Delete with Permission Check

```tsx
function SecureDeleteButton({ id }) {
  const { onConfirm, disabled, hidden, title } = useDeleteButton({
    resource: "posts",
    id,
    accessControl: {
      enabled: true,
      hideIfUnauthorized: false, // Show but disable
    },
  });

  if (hidden) return null;

  return (
    <Popconfirm onConfirm={onConfirm}>
      <Button
        danger
        disabled={disabled}
        title={title} // ← Shows permission reason on hover
      >
        Delete
      </Button>
    </Popconfirm>
  );
}

// User without permission:
// → Button visible but disabled
// → Hover shows: "You don't have permission to delete"
```

### 4.6 Custom Confirmation Dialog

```tsx
import { Modal } from "antd";

function CustomConfirmDeleteButton({ id, postTitle }) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { onConfirm, loading, confirmTitle, confirmOkLabel, cancelLabel } =
    useDeleteButton({
      resource: "posts",
      id,
    });

  const handleConfirm = () => {
    onConfirm(); // ← Execute delete
    setIsModalOpen(false);
  };

  return (
    <>
      <Button danger onClick={() => setIsModalOpen(true)}>
        Delete
      </Button>

      <Modal
        open={isModalOpen}
        onOk={handleConfirm}
        onCancel={() => setIsModalOpen(false)}
        okText={confirmOkLabel}
        cancelText={cancelLabel}
        okButtonProps={{ danger: true, loading }}
      >
        <h3>{confirmTitle}</h3>
        <p>
          You are about to delete: <strong>{postTitle}</strong>
        </p>
        <p>This action cannot be undone!</p>
      </Modal>
    </>
  );
}
```

---

## 5. INTEGRATION WITH REFINE COMPONENTS

### 5.1 Built-in Delete Button Components

```tsx
// Refine's UI library packages provide ready-to-use components:

// @refinedev/antd
import { DeleteButton } from "@refinedev/antd";
<DeleteButton recordItemId={123} />;

// @refinedev/mui
import { DeleteButton } from "@refinedev/mui";
<DeleteButton recordItemId={123} />;

// @refinedev/mantine
import { DeleteButton } from "@refinedev/mantine";
<DeleteButton recordItemId={123} />;

// All use useDeleteButton internally! ✅
```

### 5.2 Inside Data Grids

```tsx
import { Table } from "antd";
import { useDeleteButton } from "@refinedev/core";

function PostsTable() {
  const columns = [
    { title: "Title", dataIndex: "title" },
    { title: "Author", dataIndex: "author" },
    {
      title: "Actions",
      render: (_, record) => <DeleteActionButton id={record.id} />,
    },
  ];

  return <Table dataSource={posts} columns={columns} />;
}

function DeleteActionButton({ id }) {
  const { onConfirm, loading } = useDeleteButton({
    resource: "posts",
    id,
  });

  return (
    <Popconfirm onConfirm={onConfirm}>
      <Button danger size="small" loading={loading}>
        Delete
      </Button>
    </Popconfirm>
  );
}
```

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Why Return onConfirm Instead of onClick?

**Question:** Why return `onConfirm` instead of `onClick`?

**Answer:**

```tsx
// onConfirm clearly indicates:
// → This should be called AFTER confirmation
// → Not a direct button click

// Pattern:
<Popconfirm onConfirm={onConfirm}> // ← After user confirms
  <Button>Delete</Button>
</Popconfirm>

// vs onClick would be confusing:
<Popconfirm onConfirm={onClick}> // ← Confusing naming!
  <Button>Delete</Button>
</Popconfirm>

// onConfirm is semantic and clear ✅
```

### 6.2 Why Include Confirmation Labels?

**Reason:** Different UI libraries have different confirmation components. Providing all labels makes the hook UI-library-agnostic.

```tsx
// Ant Design:
<Popconfirm
  title={confirmTitle}
  okText={confirmOkLabel}
  cancelText={cancelLabel}
/>

// Material-UI:
<Dialog title={confirmTitle}>
  <Button onClick={onConfirm}>{confirmOkLabel}</Button>
  <Button>{cancelLabel}</Button>
</Dialog>

// Mantine:
<Modal title={confirmTitle}>
  <Button onClick={onConfirm}>{confirmOkLabel}</Button>
  <Button>{cancelLabel}</Button>
</Modal>

// Same hook, different UI libraries! ✅
```

### 6.3 Why setWarnWhen(false)?

**Reason:** Delete operation takes priority over unsaved changes. User intentionally chose to delete, so unsaved form data is irrelevant.

```tsx
// Scenario:
// 1. User editing post
// 2. User has unsaved changes
// 3. User clicks Delete

// Without setWarnWhen(false):
// → Browser shows: "You have unsaved changes. Leave page?" ❌
// → Confusing! User WANTS to delete!

// With setWarnWhen(false):
// → No warning
// → Deletion proceeds smoothly ✅
```

### 6.4 Why Check `id === variables?.id`?

**Reason:** Multiple delete buttons share same mutation state. Need to distinguish which button is loading.

```tsx
// Shared mutation:
const { mutation } = useDelete(); // ← Singleton

// Multiple buttons:
<DeleteButton id={1} />
<DeleteButton id={2} />
<DeleteButton id={3} />

// User clicks button 2:
// mutation.isPending = true
// mutation.variables = { id: 2, resource: "posts" }

// Button 1: id (1) !== variables.id (2) → loading = false
// Button 2: id (2) === variables.id (2) → loading = true ✅
// Button 3: id (3) !== variables.id (2) → loading = false
```

---

## 7. TESTING

### 7.1 Unit Test Example

```typescript
import { renderHook } from "@testing-library/react";
import { useDeleteButton } from "./useDeleteButton";

// Mock dependencies
jest.mock("../../data/useDelete");
jest.mock("../button-can-access");
jest.mock("../../i18n");

describe("useDeleteButton", () => {
  it("should return onConfirm handler", () => {
    const { result } = renderHook(() =>
      useDeleteButton({ resource: "posts", id: 123 }),
    );

    expect(result.current.onConfirm).toBeInstanceOf(Function);
  });

  it("should disable unsaved changes warning on confirm", () => {
    const setWarnWhen = jest.fn();
    useWarnAboutChange.mockReturnValue({ setWarnWhen });

    const { result } = renderHook(() =>
      useDeleteButton({ resource: "posts", id: 123 }),
    );

    result.current.onConfirm();

    expect(setWarnWhen).toHaveBeenCalledWith(false);
  });

  it("should show loading only for clicked button", () => {
    useDelete.mockReturnValue({
      mutation: {
        isPending: true,
        variables: { id: 2 },
      },
    });

    const { result } = renderHook(() =>
      useDeleteButton({ resource: "posts", id: 2 }),
    );

    expect(result.current.loading).toBe(true);

    // Different ID:
    const { result: result2 } = renderHook(() =>
      useDeleteButton({ resource: "posts", id: 3 }),
    );

    expect(result2.current.loading).toBe(false);
  });
});
```

### 7.2 Integration Test

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import { Refine } from "@refinedev/core";

const mockDataProvider = {
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  // ... other methods
};

describe("DeleteButton integration", () => {
  it("should delete item on confirm", async () => {
    render(
      <Refine dataProvider={mockDataProvider}>
        <DeleteButtonComponent id={123} />
      </Refine>,
    );

    const button = screen.getByText("Delete");
    fireEvent.click(button);

    const confirmButton = screen.getByText("OK");
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockDataProvider.delete).toHaveBeenCalledWith({
        resource: "posts",
        id: 123,
        // ...
      });
    });
  });
});
```

---

## 8. COMMON PITFALLS

### 8.1 Forgetting to Check `hidden`

```tsx
// ❌ WRONG
function DeleteButton({ id }) {
  const { disabled, onConfirm } = useDeleteButton({
    resource: "posts",
    id,
    accessControl: { hideIfUnauthorized: true },
  });

  // Forgot to check hidden! ❌
  return (
    <Popconfirm onConfirm={onConfirm}>
      <Button disabled={disabled}>Delete</Button>
    </Popconfirm>
  );
}

// ✅ CORRECT
function DeleteButton({ id }) {
  const { hidden, disabled, onConfirm } = useDeleteButton({
    resource: "posts",
    id,
    accessControl: { hideIfUnauthorized: true },
  });

  if (hidden) return null; // ← Don't forget!

  return (
    <Popconfirm onConfirm={onConfirm}>
      <Button disabled={disabled}>Delete</Button>
    </Popconfirm>
  );
}
```

### 8.2 Not Using Confirmation Dialog

```tsx
// ❌ DANGEROUS - Direct delete without confirmation
function DeleteButton({ id }) {
  const { onConfirm } = useDeleteButton({ resource: "posts", id });

  return <Button onClick={onConfirm}>Delete</Button>;
  // No confirmation! User can accidentally delete! ❌
}

// ✅ SAFE - Always use confirmation
function DeleteButton({ id }) {
  const { onConfirm, confirmTitle } = useDeleteButton({
    resource: "posts",
    id,
  });

  return (
    <Popconfirm title={confirmTitle} onConfirm={onConfirm}>
      <Button>Delete</Button>
    </Popconfirm>
  );
}
```

### 8.3 Missing Resource Prop

```tsx
// ❌ WRONG - No resource specified
const { onConfirm } = useDeleteButton({ id: 123 });
// Can't determine which resource to delete from!

// ✅ CORRECT
const { onConfirm } = useDeleteButton({
  resource: "posts",
  id: 123,
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Facade**: Orchestrate 6 hooks into simple interface
- ✅ **Composition**: Build from reusable parts
- ✅ **Command**: Encapsulate delete operation
- ✅ **Strategy**: Pessimistic/Optimistic/Undoable modes
- ✅ **Observer**: Watch mutation state

### Key Features

1. **Comprehensive props** - All you need for delete button
2. **Permission checking** - Integrated access control
3. **Confirmation labels** - i18n-ready dialog labels
4. **Smart loading** - Per-button loading state
5. **Unsaved changes** - Automatic warning disable
6. **Flexible notifications** - Custom success/error messages

### Khi nào dùng useDeleteButton?

✅ **Nên dùng:**

- Delete buttons in lists/tables
- Delete actions in detail pages
- Any delete operation needing confirmation
- Multi-tenant apps with permissions

❌ **Không dùng:**

- Soft deletes with custom logic (use useDelete directly)
- Bulk deletes (use custom implementation)
- Non-delete destructive actions (create custom hook)

### Remember

✅ **103 lines** - Facade over 6 hooks
🏢 **Facade** - Simple interface, complex subsystem
📦 **Command** - onConfirm encapsulates operation
🎯 **Strategy** - Choose mutation mode
⚠️ **Confirmation** - Always use dialog!
🔒 **Permissions** - Built-in access control
