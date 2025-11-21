# Kiến trúc và Design Patterns của useCancelNotification Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            UNDOABLE MUTATION SYSTEM               │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  UndoableQueueContext                            │  │
│  │    ↓ provides                                    │  │
│  │    - notifications: IUndoableQueue[]             │  │
│  │    - notificationDispatch: Dispatch              │  │
│  │         │                                         │  │
│  │         ↓ accessed via                           │  │
│  │                                                   │  │
│  │  useCancelNotification ✅ (THIS HOOK)            │  │
│  │    → Accessor for undoable notification queue   │  │
│  │         │                                         │  │
│  │         ├──→ READ: notifications array           │  │
│  │         │     - List of pending undoable actions │  │
│  │         │     - Each: { id, isSilent, cancelMutation } │
│  │         │                                         │  │
│  │         └──→ WRITE: notificationDispatch         │  │
│  │               - Add notification                 │  │
│  │               - Remove notification              │  │
│  │               - Update notification              │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useUpdate (adds undo notification)          │  │
│  │    - useDelete (adds undo notification)          │  │
│  │    - UndoableNotification UI component           │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide access to the undoable notification queue for displaying and canceling mutations**

### 1.2 The Undoable System - How It Works

```
┌──────────────────────────────────────────────────────────────┐
│         USER ACTION: Update with Undo (Undoable Mode)        │
└──────────────────────────────────────────────────────────────┘

const { mutate } = useUpdate();

mutate({
  resource: "posts",
  id: 123,
  values: { title: "New Title" },
  mutationMode: "undoable"  // ← KEY!
});

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│       STEP 1: Add to Undoable Queue (useUpdate internal)     │
└──────────────────────────────────────────────────────────────┘

notificationDispatch({
  type: "ADD",
  payload: {
    id: "mutation-123",
    resource: "posts",
    cancelMutation: () => { /* cancel logic */ },
    doMutation: () => { /* execute mutation */ }
  }
});

// Queue: [{ id: "mutation-123", ... }] ✅

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│      STEP 2: Show Undo Notification (UI Component)           │
└──────────────────────────────────────────────────────────────┘

function UndoableNotification() {
  const { notifications, notificationDispatch } = useCancelNotification();

  return (
    <>
      {notifications.map(notif => (
        <Toast key={notif.id}>
          "Post updated. Undo?"
          <Button onClick={() => {
            notif.cancelMutation();  // ← Cancel!
            notificationDispatch({ type: "REMOVE", payload: { id: notif.id } });
          }}>
            UNDO
          </Button>
        </Toast>
      ))}
    </>
  );
}

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│        STEP 3: User Clicks UNDO or Waits                      │
└──────────────────────────────────────────────────────────────┘

IF user clicks "UNDO":
  → cancelMutation() is called
  → Mutation is cancelled ❌
  → Notification removed from queue

IF user waits (timeout):
  → doMutation() is called
  → Mutation is executed ✅
  → Notification removed from queue
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useCancelNotification/index.tsx: 17 dòng** - Ultra-minimal accessor!

---

### 2.1 Accessor Pattern - Context Value Access

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Hotel Key Card

```
Hotel System:

Front Desk (Context Provider):
- Stores all room keys
- Guest info
- Access cards

Key Card (Accessor Hook):
- Gives you access to your room
- Simple to use
- No need to understand hotel system

useCancelNotification:

UndoableQueueContext (Provider):
- Stores notification queue
- Stores dispatch function
- Complex internal state

useCancelNotification (Accessor):
- Gives you access to notifications
- Simple to use: const { notifications } = useCancelNotification()
- No need to understand context internals
```

**Accessor Pattern** = Provide simple access to complex context/state.

#### Implementation:

```typescript
// CONTEXT: Complex internal system
const UndoableQueueContext = createContext({
  notifications: [],
  notificationDispatch: () => {},
});

// ACCESSOR: Simple interface
export const useCancelNotification = () => {
  const { notifications, notificationDispatch } =
    useContext(UndoableQueueContext);

  return { notifications, notificationDispatch };
};

// USAGE: Dead simple!
const { notifications } = useCancelNotification();
```

#### Why Not useContext Directly?

```typescript
// ❌ WITHOUT accessor - Users need to know context name
import { UndoableQueueContext } from "@refinedev/core/contexts/...";

function MyComponent() {
  const { notifications } = useContext(UndoableQueueContext);
  // Long import path! ❌
  // Need to know internal structure! ❌
}

// ✅ WITH accessor - Clean API
import { useCancelNotification } from "@refinedev/core";

function MyComponent() {
  const { notifications } = useCancelNotification();
  // Short import! ✅
  // Clear intent! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - Hide context implementation
- ✅ **DX** - Developer experience improved
- ✅ **Maintainable** - Context changes don't break user code
- ✅ **Discoverable** - Named hook is easier to find

---

### 2.2 Facade Pattern - Simplified Interface

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Customer Service Hotline

```
Behind the scenes (Complex):
- Database queries
- Multiple departments
- Escalation procedures
- Logging systems

Customer sees (Simple):
- Call one number
- Speak to one person
- Get help

useCancelNotification:

Behind the scenes:
- React Context API
- useContext internals
- Context provider hierarchy
- State management

User sees:
- Call one hook
- Get notifications array
- Get dispatch function
```

**Facade Pattern** = Provide unified interface to set of interfaces in subsystem.

#### Implementation:

```typescript
// COMPLEX INTERNAL SYSTEM:
// - Context creation
// - Provider setup
// - Reducer logic
// - State persistence

// SIMPLE EXTERNAL INTERFACE:
export const useCancelNotification = () => {
  // All complexity hidden here ↓
  const context = useContext(UndoableQueueContext);

  // Simple return ✅
  return context;
};

// USER CODE: Super simple!
const { notifications } = useCancelNotification();
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - One hook vs understanding contexts
- ✅ **Abstraction** - Hide implementation details
- ✅ **Flexibility** - Change internals without breaking API
- ✅ **Consistency** - Follows React hooks pattern

---

### 2.3 Observer Pattern - Reactive Notification Queue

#### 📺 VÍ DỤ ĐỜI THƯỜNG: YouTube Subscriptions

```
YouTube Channel (Subject):
- Publishes new videos
- Notifies subscribers

Subscribers (Observers):
- Get notified of new videos
- React to notifications
- Can unsubscribe

Notification Queue (Subject):
- Mutations add notifications
- UI components observe
- Update when queue changes
```

**Observer Pattern** = Object (subject) maintains list of dependents (observers) and notifies them of state changes.

#### Implementation:

```typescript
// SUBJECT: Notification queue (in context)
const [notifications, setNotifications] = useState<IUndoableQueue[]>([]);

// OBSERVERS: Components using the hook
function UndoableNotification1() {
  const { notifications } = useCancelNotification();
  // Re-renders when notifications change ✅
}

function UndoableNotification2() {
  const { notifications } = useCancelNotification();
  // Also re-renders when notifications change ✅
}

// MUTATION: Add notification (Subject notifies)
notificationDispatch({
  type: "ADD",
  payload: newNotification,
});
// → Both components re-render! ✅
```

#### Real Flow:

```
Time 0: notifications = []

useUpdate adds mutation:
  notificationDispatch({ type: "ADD", ... })
  → notifications = [{ id: "mutation-1", ... }]
  → All observers (UI components) re-render! ✅

User clicks UNDO:
  notificationDispatch({ type: "REMOVE", ... })
  → notifications = []
  → All observers re-render again! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reactive** - UI auto-updates when queue changes
- ✅ **Decoupled** - Mutations and UI are independent
- ✅ **Scalable** - Multiple observers can watch same queue
- ✅ **Real-time** - Immediate feedback to user

---

### 2.4 Command Pattern - Notification Dispatch

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: Game Save System

```
Game Commands:
- SAVE game → Execute save
- LOAD game → Execute load
- DELETE save → Execute delete

Each command:
- Encapsulates action
- Can be queued
- Can be undone

Notification Dispatch:
- ADD notification → Add to queue
- REMOVE notification → Remove from queue
- Update notification → Modify queue
```

**Command Pattern** = Encapsulate request as an object.

#### Implementation:

```typescript
// COMMANDS: Different actions on queue
notificationDispatch({ type: "ADD", payload: newNotification });
notificationDispatch({ type: "REMOVE", payload: { id: "mutation-1" } });
notificationDispatch({ type: "UPDATE", payload: { id: "mutation-1", ... } });

// Each command:
// 1. Encapsulated as object
// 2. Dispatched to reducer
// 3. Reducer executes appropriate logic
```

#### Real Example:

```tsx
function UndoButton({ mutation }) {
  const { notificationDispatch } = useCancelNotification();

  const handleUndo = () => {
    // COMMAND 1: Cancel mutation
    mutation.cancelMutation();

    // COMMAND 2: Remove from queue
    notificationDispatch({
      type: "REMOVE",
      payload: { id: mutation.id },
    });
  };

  return <Button onClick={handleUndo}>UNDO</Button>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - Actions as objects
- ✅ **Queueable** - Can be batched
- ✅ **Traceable** - Easy to log/debug
- ✅ **Testable** - Easy to test commands

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern      | Ví dụ đời thường      | Giải quyết vấn đề gì       | Trong useCancelNotification                |
| ------------ | --------------------- | -------------------------- | ------------------------------------------ |
| **Accessor** | Hotel key card        | Access complex context     | Simple access to UndoableQueueContext      |
| **Facade**   | Customer hotline      | Simplify complex subsystem | Hide context API complexity                |
| **Observer** | YouTube subscriptions | Notify of state changes    | UI auto-updates when queue changes         |
| **Command**  | Game save system      | Encapsulate actions        | notificationDispatch commands (ADD/REMOVE) |

---

## 3. KEY FEATURES

### 3.1 Notification Queue Access

```typescript
const { notifications } = useCancelNotification();

// notifications is an array:
notifications.forEach((notif) => {
  console.log(notif.id); // Unique ID
  console.log(notif.resource); // e.g., "posts"
  console.log(notif.cancelMutation); // Function to cancel
  console.log(notif.doMutation); // Function to execute
  console.log(notif.isSilent); // Hide from UI?
});
```

### 3.2 Dispatch Commands

```typescript
const { notificationDispatch } = useCancelNotification();

// ADD notification
notificationDispatch({
  type: "ADD",
  payload: {
    id: "mutation-123",
    resource: "posts",
    cancelMutation: () => {},
    doMutation: () => {},
    isSilent: false,
  },
});

// REMOVE notification
notificationDispatch({
  type: "REMOVE",
  payload: { id: "mutation-123" },
});
```

### 3.3 Reactive Updates

```typescript
// Component re-renders when notifications change:
const { notifications } = useCancelNotification();

// Displays current count:
<span>Pending: {notifications.length}</span>;
```

---

## 4. COMMON USE CASES

### 4.1 Display Undoable Notifications

```tsx
import { useCancelNotification } from "@refinedev/core";
import { Toast } from "antd";

function UndoableNotifications() {
  const { notifications, notificationDispatch } = useCancelNotification();

  return (
    <div className="notification-container">
      {notifications
        .filter((notif) => !notif.isSilent) // Hide silent ones
        .map((notif) => (
          <Toast key={notif.id}>
            <p>Action pending...</p>
            <button
              onClick={() => {
                notif.cancelMutation(); // Cancel!
                notificationDispatch({
                  type: "REMOVE",
                  payload: { id: notif.id },
                });
              }}
            >
              UNDO
            </button>
          </Toast>
        ))}
    </div>
  );
}
```

### 4.2 Show Pending Count

```tsx
function PendingBadge() {
  const { notifications } = useCancelNotification();

  const count = notifications.filter((n) => !n.isSilent).length;

  if (count === 0) return null;

  return (
    <Badge count={count}>
      <BellIcon />
    </Badge>
  );
}
```

### 4.3 Cancel All Pending

```tsx
function CancelAllButton() {
  const { notifications, notificationDispatch } = useCancelNotification();

  const handleCancelAll = () => {
    notifications.forEach((notif) => {
      notif.cancelMutation(); // Cancel each
      notificationDispatch({
        type: "REMOVE",
        payload: { id: notif.id },
      });
    });
  };

  return (
    <Button onClick={handleCancelAll}>
      Cancel All ({notifications.length})
    </Button>
  );
}
```

### 4.4 Auto-Execute After Timeout

```tsx
function UndoableToast({ notification }) {
  const { notificationDispatch } = useCancelNotification();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown === 0) {
      // Time's up! Execute mutation
      notification.doMutation();
      notificationDispatch({
        type: "REMOVE",
        payload: { id: notification.id },
      });
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  return (
    <div>
      <p>Undoing in {countdown}s...</p>
      <button
        onClick={() => {
          notification.cancelMutation();
          notificationDispatch({
            type: "REMOVE",
            payload: { id: notification.id },
          });
        }}
      >
        UNDO NOW
      </button>
    </div>
  );
}
```

### 4.5 Group by Resource

```tsx
function GroupedNotifications() {
  const { notifications } = useCancelNotification();

  const grouped = notifications.reduce((acc, notif) => {
    const resource = notif.resource || "other";
    if (!acc[resource]) acc[resource] = [];
    acc[resource].push(notif);
    return acc;
  }, {});

  return (
    <div>
      {Object.entries(grouped).map(([resource, notifs]) => (
        <div key={resource}>
          <h3>{resource}</h3>
          <p>{notifs.length} pending</p>
        </div>
      ))}
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Separate Hook Instead of Direct Context?

**Answer:** Better DX and encapsulation

```typescript
// ❌ WITHOUT hook - Verbose
import { UndoableQueueContext } from "@refinedev/core/contexts/undoableQueue";

const context = useContext(UndoableQueueContext);
const { notifications } = context;

// ✅ WITH hook - Clean
import { useCancelNotification } from "@refinedev/core";

const { notifications } = useCancelNotification();
```

### 5.2 Why Named "useCancelNotification"?

**Answer:** Intent-revealing name

```typescript
// Name reveals what you can do:
// - Access notification queue
// - Cancel notifications
// - Manage undoable mutations

const { notifications, notificationDispatch } = useCancelNotification();
// ↑ Clear: "I'm working with cancellable notifications"
```

### 5.3 Why Return Both notifications AND dispatch?

**Answer:** Read and write access

```typescript
// READ: Display notifications
const { notifications } = useCancelNotification();
{notifications.map(n => <Toast key={n.id} />)}

// WRITE: Modify queue
const { notificationDispatch } = useCancelNotification();
notificationDispatch({ type: "REMOVE", ... });

// Different use cases need different access ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Not Removing After Cancel

```typescript
// ❌ WRONG - Cancel but don't remove from queue
const { notifications } = useCancelNotification();

notifications[0].cancelMutation();
// Still shows in UI! ❌

// ✅ CORRECT - Remove from queue
const { notifications, notificationDispatch } = useCancelNotification();

notifications[0].cancelMutation();
notificationDispatch({
  type: "REMOVE",
  payload: { id: notifications[0].id },
});
// Removed from UI! ✅
```

### 6.2 Modifying notifications Array Directly

```typescript
// ❌ WRONG - Direct mutation
const { notifications } = useCancelNotification();
notifications.push(newNotif); // ❌ Won't work!

// ✅ CORRECT - Use dispatch
const { notificationDispatch } = useCancelNotification();
notificationDispatch({
  type: "ADD",
  payload: newNotif,
});
```

### 6.3 Forgetting to Filter Silent Notifications

```typescript
// ❌ WRONG - Shows silent notifications
const { notifications } = useCancelNotification();
{
  notifications.map((n) => <Toast />);
}

// ✅ CORRECT - Filter silent
const { notifications } = useCancelNotification();
{
  notifications.filter((n) => !n.isSilent).map((n) => <Toast />);
}
```

---

## 7. INTEGRATION WITH UNDOABLE MUTATIONS

### How useUpdate Uses This Hook (Internally)

```typescript
// In useUpdate hook:
export const useUpdate = () => {
  const { notificationDispatch } = useCancelNotification();

  const mutation = useMutation({
    mutationFn: async (variables) => {
      if (mutationMode === "undoable") {
        // ADD to queue
        notificationDispatch({
          type: "ADD",
          payload: {
            id: uniqueId(),
            resource: variables.resource,
            cancelMutation: () => {
              // Cancel logic: restore cache, show cancelled message
            },
            doMutation: () => {
              // Execute: actually call API
              dataProvider.update(variables);
            },
          },
        });

        // Wait for user decision (undo or timeout)
        await waitForDecision();
      } else {
        // Pessimistic/optimistic: execute immediately
        await dataProvider.update(variables);
      }
    },
  });

  return mutation;
};
```

### Complete Flow Visualization

```
User clicks "Save" (undoable mode)
           ↓
useUpdate.mutate() called
           ↓
Add to notification queue via useCancelNotification
           ↓
UI component using useCancelNotification renders toast
           ↓
User has 5 seconds to decide:
           ↓
    ┌──────┴──────┐
    ↓             ↓
UNDO clicked   Timeout
    ↓             ↓
Cancel mutation  Execute mutation
    ↓             ↓
Remove from queue Remove from queue
    ↓             ↓
Toast disappears  Toast shows success
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useCancelNotification } from "@refinedev/core";

// Mock context provider
const wrapper = ({ children }) => (
  <UndoableQueueContext.Provider value={mockContext}>
    {children}
  </UndoableQueueContext.Provider>
);

describe("useCancelNotification", () => {
  it("should return notifications from context", () => {
    const { result } = renderHook(() => useCancelNotification(), { wrapper });

    expect(result.current.notifications).toEqual([]);
  });

  it("should return dispatch function", () => {
    const { result } = renderHook(() => useCancelNotification(), { wrapper });

    expect(typeof result.current.notificationDispatch).toBe("function");
  });

  it("should dispatch ADD action", () => {
    const mockDispatch = jest.fn();
    // Setup mock...

    const { result } = renderHook(() => useCancelNotification(), { wrapper });

    act(() => {
      result.current.notificationDispatch({
        type: "ADD",
        payload: { id: "test", cancelMutation: jest.fn() },
      });
    });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "ADD",
      payload: expect.objectContaining({ id: "test" }),
    });
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Simple access to UndoableQueueContext
- ✅ **Facade**: Hide context complexity
- ✅ **Observer**: Reactive queue updates
- ✅ **Command**: Dispatch actions (ADD/REMOVE)

### Key Features

1. **Queue Access** - Read notifications array
2. **Dispatch** - Modify queue (add/remove/update)
3. **Reactive** - Auto-updates when queue changes
4. **Simple** - Only 17 lines of code!
5. **Encapsulated** - Hides context internals

### Khi nào dùng useCancelNotification?

✅ **Nên dùng:**

- Display undoable notifications UI
- Show pending mutations count
- Cancel/undo functionality
- Custom notification components

❌ **Không dùng:**

- Regular notifications (use `useNotification`)
- Direct mutation cancellation (use mutation.cancel())
- Non-undoable operations

### Remember

✅ **17 lines** - Ultra-minimal accessor
🔑 **Accessor Pattern** - Context access
🏢 **Facade Pattern** - Simple interface
📺 **Observer Pattern** - Reactive updates
🎮 **Command Pattern** - Dispatch actions

---

> 📚 **Best Practice**: Always **remove** notifications from queue after canceling. **Filter** silent notifications in UI. Use **dispatch** to modify queue, never mutate directly. This hook is specifically for **undoable mutations** - for regular notifications, use **`useNotification`** instead!
