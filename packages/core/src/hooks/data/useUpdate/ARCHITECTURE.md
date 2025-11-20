# Kiến trúc và Design Patterns của useUpdate Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            DATA MUTATION SYSTEM (WRITE)           │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useCreate  → Create new record                  │  │
│  │                                                   │  │
│  │  useUpdate ✅ (THIS HOOK - UPDATE RECORD!)       │  │
│  │    → Update existing record by ID                │  │
│  │         │                                         │  │
│  │         ├──→ THREE MUTATION MODES:               │  │
│  │         │     1. Pessimistic (safe) 🐢           │  │
│  │         │     2. Optimistic (fast) ⚡            │  │
│  │         │     3. Undoable (Gmail) ↩️             │  │
│  │         │                                         │  │
│  │         ├──→ OPTIMISTIC UPDATES:                │  │
│  │         │     - Update UI instantly               │  │
│  │         │     - Rollback on error                │  │
│  │         │     - Automatic cache sync            │  │
│  │         │                                         │  │
│  │         ├──→ UNDO FUNCTIONALITY:                │  │
│  │         │     - 5-second countdown              │  │
│  │         │     - "Undo" button                    │  │
│  │         │     - Cancel mutation                  │  │
│  │         │                                         │  │
│  │         ├──→ CACHE MANAGEMENT:                  │  │
│  │         │     - Save previous state              │  │
│  │         │     - Update list/many/detail         │  │
│  │         │     - Invalidate after commit          │  │
│  │         │                                         │  │
│  │         └──→ AUDIT LOGGING:                     │  │
│  │               - Track previous vs new values    │  │
│  │               - Complete audit trail            │  │
│  │                                                   │  │
│  │  useUpdateMany → Update multiple records         │  │
│  │  useDelete → Delete record                       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Update existing record by ID with optimistic updates and undo functionality**

### 1.2 Complete Flow - Three Mutation Modes

```
┌──────────────────────────────────────────────────────────────┐
│              MODE 1: PESSIMISTIC (Safe & Slow) 🐢            │
└──────────────────────────────────────────────────────────────┘

1. User clicks "Save"
2. Show loading spinner 🔄
3. Send API request: PUT /posts/123
4. Wait for server response... ⏳
5. Server responds: { data: {...} } ✅
6. Update cache
7. Hide loading spinner
8. Show success notification
9. UI updates with new data

Timeline:
T0: Click save → Loading
T1: (waiting for server)
T2: Response → Update UI ✅

UX: Slower but safer ✅

┌──────────────────────────────────────────────────────────────┐
│            MODE 2: OPTIMISTIC (Fast & Risky) ⚡               │
└──────────────────────────────────────────────────────────────┘

1. User clicks "Save"
2. Update UI IMMEDIATELY ⚡ (optimistic)
3. Send API request: PUT /posts/123
4. User sees new data (instant!) ✅
5. Server responds...
   ├─→ SUCCESS ✅
   │    → Cache already updated!
   │    → Invalidate to sync
   │    → Done! ✅
   │
   └─→ ERROR ❌
        → ROLLBACK cache to old data
        → Show error notification
        → UI reverts to old state

Timeline:
T0: Click save → UI updates instantly! ⚡
T1: (API call in background)
T2: If error → Rollback

UX: Fast but might rollback ⚠️

┌──────────────────────────────────────────────────────────────┐
│         MODE 3: UNDOABLE (Gmail-style Undo) ↩️                │
└──────────────────────────────────────────────────────────────┘

1. User clicks "Save"
2. Update UI IMMEDIATELY ⚡
3. Show notification: "Updated. Undo? [5]" ↩️
4. Start 5-second countdown... 5, 4, 3, 2, 1...
5. User choice:
   ├─→ CLICK UNDO:
   │    → Cancel mutation
   │    → Rollback cache
   │    → No API call!
   │    → Done! ✅
   │
   └─→ DON'T CLICK (timeout):
        → Send API request: PUT /posts/123
        → Server responds
        → Invalidate cache
        → Done! ✅

Timeline:
T0: Click save → UI updates instantly! ⚡
T0-T5: Countdown (can undo)
T5: If no undo → API call
T6: Server response

UX: Best of both worlds! ⚡↩️
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useUpdate.ts: 1,249 dòng** - Complete mutation system with undo!

---

### 2.1 Command Pattern - Encapsulate Update Operation

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: Video Game Undo

```
Video Game (Chess):

Turn 1: Move Knight
  → Command: MoveKnight(from: e1, to: f3)
  → Execute: Knight moves
  → Save to history: [MoveKnight...]

Turn 2: Click "Undo"
  → Get last command from history
  → Execute undo: MoveKnight.undo()
  → Knight returns to e1 ✅

useUpdate with undoable mode:

Update 1: Change title
  → Command: UpdatePost(id: 123, values: {title: "New"})
  → Execute (optimistic): Cache updates
  → Save command: Can undo!

User clicks "Undo":
  → Get command
  → Execute undo: Rollback cache ✅
  → Cancel API call ✅
```

**Command Pattern** = Encapsulate request as object with undo

#### Implementation:

```typescript
// Command stored in undoable queue
const command = {
  id: 123, // Record ID
  resource: "posts", // Resource name
  doMutation: async () => {
    // ← Execute command
    await dataProvider.update({
      resource: "posts",
      id: 123,
      variables: { title: "New Title" },
    });
  },
  cancelMutation: () => {
    // ← Undo command
    reject({ message: "mutationCancelled" });
  },
  seconds: 5000, // Timeout
};

// Add to queue
notificationDispatch({
  type: ActionTypes.ADD,
  payload: command,
});

// Execute after timeout (if not cancelled)
setTimeout(() => {
  command.doMutation();
}, 5000);

// Or cancel (undo)
command.cancelMutation(); // ← Rollback!
```

#### Real Example - Undoable Edit:

```tsx
function PostEdit() {
  const [cancelUpdate, setCancelUpdate] = useState<(() => void) | null>(null);

  const { mutate } = useUpdate({
    mutationMode: "undoable", // ← Undoable mode!
    undoableTimeout: 5000, // 5 seconds to undo
    onCancel: (cancel) => {
      setCancelUpdate(() => cancel); // ← Save cancel function!
    },
  });

  const handleSave = (values) => {
    mutate({
      resource: "posts",
      id: 123,
      values,
    });
    // UI updates IMMEDIATELY! ⚡
    // Notification: "Updated. Undo? [5]"
  };

  return (
    <div>
      <Form onFinish={handleSave}>
        <Input name="title" />
        <Button type="submit">Save</Button>
      </Form>

      {/* Custom undo button */}
      {cancelUpdate && (
        <Button
          onClick={() => {
            cancelUpdate(); // ← Undo mutation!
            setCancelUpdate(null);
          }}
        >
          Undo Last Update
        </Button>
      )}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reversible** - Can undo operations
- ✅ **Encapsulation** - Mutation logic in one place
- ✅ **Queue** - Multiple undoable actions
- ✅ **UX** - Gmail-style undo!

---

### 2.2 Memento Pattern - Save and Restore State

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Text Editor Undo

```
Text Editor:

State 1: "Hello"
  → Save memento: "Hello"

User edits: "Hello World"
  → Current state: "Hello World"

User clicks "Undo":
  → Restore from memento: "Hello" ✅

useUpdate optimistic mode:

State 1: Post { title: "Old Title", content: "..." }
  → Save memento (previousQueries)

User updates: { title: "New Title" }
  → Current cache: { title: "New Title", ... }
  → API call...

API Error ❌:
  → Restore from memento: { title: "Old Title" } ✅
```

**Memento Pattern** = Save state for rollback

#### Implementation:

```typescript
// STEP 1: Save current state (onMutate)
onMutate: async ({ id, values }) => {
  // Get all queries for this resource
  const previousQueries = queryClient.getQueriesData({
    queryKey: resourceKeys.get(),
  });

  // Result: Array of [queryKey, data]
  // [
  //   [["posts", "list"], { data: [...], total: 10 }],
  //   [["posts", "one", "123"], { data: { id: 123, title: "Old" } }],
  //   [["posts", "many"], { data: [...] }]
  // ]

  // Update cache optimistically
  queryClient.setQueryData(["posts", "one", "123"], (old) => ({
    data: { ...old.data, ...values }, // ← Optimistic update!
  }));

  // Return memento
  return { previousQueries }; // ← Save for rollback!
};

// STEP 2: Restore state if error (onError)
onError: (error, variables, context) => {
  // Rollback from memento!
  if (context?.previousQueries) {
    for (const [queryKey, data] of context.previousQueries) {
      queryClient.setQueryData(queryKey, data); // ← Restore!
    }
  }

  // Cache restored! ✅
  // UI shows old data again! ✅
};
```

#### Flow Visualization:

```
Timeline of Optimistic Update with Rollback:

T0: User clicks "Save"
    Cache Before: { title: "Old Title" }
    ↓
    Save memento: previousQueries = [
      [["posts", "one", "123"], { data: { title: "Old Title" } }]
    ]

T1: Optimistic update
    Cache After: { title: "New Title" } ⚡
    UI shows: "New Title" (instant!)
    API call: PUT /posts/123 { title: "New Title" }

T2: Server returns error ❌
    Error: { statusCode: 400, message: "Validation failed" }
    ↓
    Rollback from memento!
    ↓
    Cache After: { title: "Old Title" } ✅ (restored!)
    UI shows: "Old Title" (rolled back!)
    Notification: "Error: Validation failed" 🔴
```

#### Real Example:

```tsx
function PostEditor() {
  const { mutate } = useUpdate({
    mutationMode: "optimistic", // ← Optimistic mode!
  });

  const handleSave = (values) => {
    mutate({
      resource: "posts",
      id: 123,
      values,
    });

    // Flow:
    // 1. onMutate: Save memento, update cache
    // 2. UI updates INSTANTLY ⚡
    // 3. API call...
    // 4a. If success: Invalidate, sync ✅
    // 4b. If error: Rollback from memento ↩️
  };

  return (
    <Form onFinish={handleSave}>
      <Input name="title" />
      <Button type="submit">Save</Button>
      {/* User sees changes INSTANTLY!
          If error → Automatically rolls back! */}
    </Form>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Fast UX** - Instant UI updates
- ✅ **Error Recovery** - Auto-rollback on error
- ✅ **Complete State** - Save ALL related queries
- ✅ **Consistency** - Cache never corrupted

---

### 2.3 Strategy Pattern - Three Mutation Modes

#### 🎲 VÍ DỤ ĐỜI THƯỜNG: Payment Methods

```
Payment Strategies:

Strategy 1: Cash (pessimistic)
→ Give money first
→ Wait for receipt
→ Transaction confirmed
→ Slow but safe ✅

Strategy 2: Credit card (optimistic)
→ Assume payment will go through
→ Take goods immediately
→ Payment processes in background
→ Fast but might decline ⚠️

Strategy 3: Hold check (undoable)
→ Write check
→ 5-day hold period
→ Can stop payment!
→ Flexible! ⚡↩️

useUpdate mutation modes:

Mode 1: Pessimistic (cash)
→ API call first, then update UI

Mode 2: Optimistic (credit card)
→ Update UI first, API call background

Mode 3: Undoable (check hold)
→ Update UI, can undo, then API call
```

**Strategy Pattern** = Choose algorithm at runtime

#### Implementation:

```typescript
// All 3 strategies in ONE hook!
export const useUpdate = ({ mutationMode, ... }) => {
  return useMutation({
    mutationFn: async ({ id, values, mutationMode }) => {
      const mode = mutationMode ?? mutationModeContext;

      // STRATEGY 1: Pessimistic
      if (mode === "pessimistic") {
        // Call API immediately
        return await dataProvider.update({ id, values });
        // No optimistic update!
        // UI updates AFTER response ✅
      }

      // STRATEGY 2: Optimistic
      if (mode === "optimistic") {
        // Call API immediately
        return await dataProvider.update({ id, values });
        // onMutate will handle optimistic update!
      }

      // STRATEGY 3: Undoable
      if (mode === "undoable") {
        // Return PROMISE that resolves after timeout!
        return new Promise((resolve, reject) => {
          const doMutation = () => {
            dataProvider.update({ id, values })
              .then(resolve)
              .catch(reject);
          };

          const cancelMutation = () => {
            reject({ message: "mutationCancelled" });
          };

          // Add to undoable queue
          notificationDispatch({
            type: ActionTypes.ADD,
            payload: {
              id,
              doMutation,      // ← Execute after timeout
              cancelMutation,  // ← Cancel (undo)
              seconds: 5000
            }
          });
        });
      }
    },

    onMutate: async ({ mutationMode }) => {
      const mode = mutationMode ?? mutationModeContext;

      // Only optimistic/undoable update cache
      if (mode !== "pessimistic") {
        // Save memento
        const previousQueries = queryClient.getQueriesData(...);

        // Update cache
        queryClient.setQueryData(...);

        return { previousQueries };
      }
    }
  });
};
```

#### Mode Comparison:

```typescript
// MODE 1: PESSIMISTIC (safest, slowest)
const { mutate } = useUpdate({
  mutationMode: "pessimistic",
});

mutate({ id: 123, values: { title: "New" } });

// Timeline:
// T0: Click save → Show loading
// T1: API call...
// T2: Response → Update UI ✅
// UX: User waits but guaranteed correct

// MODE 2: OPTIMISTIC (fast, might rollback)
const { mutate } = useUpdate({
  mutationMode: "optimistic",
});

mutate({ id: 123, values: { title: "New" } });

// Timeline:
// T0: Click save → Update UI IMMEDIATELY ⚡
// T1: API call in background...
// T2: If error → Rollback ↩️
// UX: Fast but might see rollback

// MODE 3: UNDOABLE (best UX!)
const { mutate } = useUpdate({
  mutationMode: "undoable",
  undoableTimeout: 5000,
});

mutate({ id: 123, values: { title: "New" } });

// Timeline:
// T0: Click save → Update UI IMMEDIATELY ⚡
// T0-T5: Notification "Updated. Undo? [5]" ↩️
// T5: If no undo → API call
// T6: Response ✅
// UX: Fast + can undo = Gmail! ✅
```

#### Real Example - Mode Switcher:

```tsx
function PostForm() {
  const [mode, setMode] = useState<MutationMode>("optimistic");

  const { mutate } = useUpdate({
    mutationMode: mode,
  });

  return (
    <div>
      {/* Mode selector */}
      <Select value={mode} onChange={setMode}>
        <Option value="pessimistic">🐢 Pessimistic (Safe & Slow)</Option>
        <Option value="optimistic">⚡ Optimistic (Fast & Risky)</Option>
        <Option value="undoable">↩️ Undoable (Best UX)</Option>
      </Select>

      <Form
        onFinish={(values) => {
          mutate({ resource: "posts", id: 123, values });
        }}
      >
        <Input name="title" />
        <Button type="submit">Save</Button>
      </Form>

      {/* Different behavior based on mode! */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose mode per use case
- ✅ **UX Optimization** - Fast when possible
- ✅ **Safety** - Pessimistic when critical
- ✅ **User Control** - Undoable for best UX

---

### 2.4 Observer Pattern - Cache Synchronization

#### 🔔 VÍ DỤ ĐỜI THƯỜNG: Newsletter Subscription

```
Newsletter System:

Publisher: Blog publishes new post
Subscribers:
  - Email list (receive email)
  - RSS feed (update feed)
  - Social media (auto-tweet)

All subscribers notified automatically! ✅

useUpdate cache update:

Mutation: Update post #123
Observers (cache queries):
  - useList cache (list updates)
  - useMany cache (many updates)
  - useOne cache (detail updates)

All observers updated automatically! ✅
```

**Observer Pattern** = Notify all dependents of changes

#### Implementation:

```typescript
// When update happens, notify ALL related caches!

onMutate: async ({ id, values }) => {
  // UPDATE OBSERVER 1: List cache
  queryClient.setQueriesData({ queryKey: ["posts", "list"] }, (old) => {
    // Update record in list
    return {
      ...old,
      data: old.data.map((post) =>
        post.id === id ? { ...post, ...values } : post,
      ),
    };
  });

  // UPDATE OBSERVER 2: Many cache
  queryClient.setQueriesData({ queryKey: ["posts", "many"] }, (old) => {
    // Update record in many
    return {
      ...old,
      data: old.data.map((post) =>
        post.id === id ? { ...post, ...values } : post,
      ),
    };
  });

  // UPDATE OBSERVER 3: Detail cache
  queryClient.setQueriesData({ queryKey: ["posts", "one", id] }, (old) => {
    // Update detail
    return {
      data: { ...old.data, ...values },
    };
  });

  // All caches updated! ✅
  // All components re-render with new data! ✅
};
```

#### Custom Update Map:

```typescript
const { mutate } = useUpdate({
  optimisticUpdateMap: {
    // Custom list update
    list: (previous, values, id) => {
      return {
        ...previous,
        data: previous.data.map((item) =>
          item.id === id
            ? { ...item, ...values, updatedAt: new Date() } // ← Add timestamp!
            : item,
        ),
      };
    },

    // Custom detail update
    detail: (previous, values, id) => {
      return {
        data: {
          ...previous.data,
          ...values,
          version: previous.data.version + 1, // ← Increment version!
        },
      };
    },

    // Don't update many cache
    many: false,
  },
});
```

#### Real Example - Synchronized Views:

```tsx
function App() {
  return (
    <>
      {/* Component 1: List view */}
      <PostList />

      {/* Component 2: Detail view */}
      <PostDetail id={123} />

      {/* Component 3: Edit form */}
      <PostEdit id={123} />
    </>
  );
}

function PostEdit({ id }) {
  const { mutate } = useUpdate({
    mutationMode: "optimistic",
  });

  const handleSave = (values) => {
    mutate({ resource: "posts", id, values });

    // ALL caches updated simultaneously:
    // 1. PostList cache → List re-renders ✅
    // 2. PostDetail cache → Detail re-renders ✅
    // 3. PostEdit cache → Form updates ✅

    // All components synchronized! ⚡
  };
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - All views synchronized
- ✅ **Automatic** - No manual cache updates
- ✅ **Efficient** - Only relevant caches updated
- ✅ **Flexible** - Custom update logic

---

### 2.5 Template Method Pattern - Mutation Lifecycle

#### 📋 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order Flow

```
Restaurant Order (Template):

1. Take order (always) ✅
2. Prepare food (always) ✅
3. [HOOK] Add special sauce? (optional) 🎯
4. Serve food (always) ✅
5. [HOOK] Ask for feedback? (optional) 🎯
6. Clean table (always) ✅

Steps 1,2,4,6 are fixed
Steps 3,5 are customizable hooks!

useUpdate mutation flow:

1. onMutate (always) → Save state
2. mutationFn (always) → API call
3. [HOOK] onSuccess? (optional) 🎯
4. [HOOK] onError? (optional) 🎯
5. onSettled (always) → Cleanup
```

**Template Method** = Define algorithm skeleton, allow customization

#### Implementation:

```typescript
export const useUpdate = ({ mutationOptions, ... }) => {
  return useMutation({
    // STEP 1: (always) Save state
    onMutate: async (variables) => {
      const previousQueries = queryClient.getQueriesData(...);
      queryClient.setQueryData(...);  // Optimistic update
      return { previousQueries };
    },

    // STEP 2: (always) Execute mutation
    mutationFn: async (variables) => {
      return await dataProvider.update(...);
    },

    // STEP 3: (always) On success
    onSuccess: (data, variables, context) => {
      handleNotification(...);  // Show notification (always)
      publish({ type: "updated" });  // Publish event (always)
      log.mutate({ action: "update" });  // Audit log (always)

      // HOOK: Custom onSuccess
      mutationOptions?.onSuccess?.(data, variables, context);  // 🎯
    },

    // STEP 4: (always) On error
    onError: (error, variables, context) => {
      // Rollback cache (always)
      for (const [key, data] of context.previousQueries) {
        queryClient.setQueryData(key, data);
      }

      handleNotification({ type: "error" });  // Error notification (always)

      // HOOK: Custom onError
      mutationOptions?.onError?.(error, variables, context);  // 🎯
    },

    // STEP 5: (always) Cleanup
    onSettled: (data, error, variables, context) => {
      invalidateStore(...);  // Invalidate cache (always)
      notificationDispatch({ type: ActionTypes.REMOVE });  // Remove from queue (always)

      // HOOK: Custom onSettled
      mutationOptions?.onSettled?.(data, error, variables, context);  // 🎯
    }
  });
};
```

#### Real Example - Custom Hooks:

```tsx
function PostEditor() {
  const navigate = useNavigate();
  const [saveCount, setSaveCount] = useState(0);

  const { mutate } = useUpdate({
    mutationOptions: {
      // HOOK: Custom onSuccess
      onSuccess: (data, variables, context) => {
        console.log("Update successful!", data);
        setSaveCount((prev) => prev + 1);

        // Redirect to list after 3 saves
        if (saveCount >= 2) {
          navigate("/posts");
        }
      },

      // HOOK: Custom onError
      onError: (error, variables, context) => {
        console.error("Update failed!", error);

        // Custom error handling
        if (error.statusCode === 409) {
          alert("Conflict! Someone else updated this post.");
        }
      },

      // HOOK: Custom onSettled
      onSettled: (data, error, variables, context) => {
        console.log("Mutation settled (success or error)");

        // Always log analytics
        analytics.track("post_update_attempt", {
          success: !error,
          postId: variables.id,
        });
      },
    },
  });

  return (
    <Form
      onFinish={(values) => {
        mutate({ resource: "posts", id: 123, values });

        // Flow:
        // 1. onMutate → Save + optimistic update (automatic)
        // 2. mutationFn → API call (automatic)
        // 3. onSuccess → Notification + custom hook ✅
        // 4. onSettled → Invalidate + custom hook ✅
      }}
    >
      <Input name="title" />
      <Button type="submit">Save (Count: {saveCount})</Button>
    </Form>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - Core flow always same
- ✅ **Flexibility** - Customize at key points
- ✅ **Maintainability** - Clear lifecycle
- ✅ **Extensibility** - Easy to add features

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern             | Ví dụ đời thường | Giải quyết vấn đề gì         | Trong useUpdate                                    |
| ------------------- | ---------------- | ---------------------------- | -------------------------------------------------- |
| **Command**         | Video game undo  | Reversible operations        | Undoable mutations with cancel                     |
| **Memento**         | Text editor undo | Save/restore state           | previousQueries for rollback                       |
| **Strategy**        | Payment methods  | Runtime algorithm choice     | 3 mutation modes (pessimistic/optimistic/undoable) |
| **Observer**        | Newsletter       | Notify all dependents        | Update list/many/detail caches                     |
| **Template Method** | Restaurant flow  | Define skeleton, allow hooks | Mutation lifecycle with custom callbacks           |

---

## 3. KEY FEATURES

### 3.1 Three Mutation Modes

```typescript
// MODE 1: Pessimistic (safest)
const { mutate } = useUpdate({
  mutationMode: "pessimistic",
});
// → API call first
// → UI updates after response
// → Slow but safe ✅

// MODE 2: Optimistic (fastest)
const { mutate } = useUpdate({
  mutationMode: "optimistic",
});
// → UI updates immediately ⚡
// → API call in background
// → Rollback on error

// MODE 3: Undoable (best UX)
const { mutate } = useUpdate({
  mutationMode: "undoable",
  undoableTimeout: 5000,
});
// → UI updates immediately ⚡
// → 5-second undo window ↩️
// → API call after timeout
```

### 3.2 Automatic Cache Synchronization

```typescript
// Update post #123
mutate({
  resource: "posts",
  id: 123,
  values: { title: "New Title" },
});

// Automatically updates:
// 1. useList cache → List shows "New Title" ✅
// 2. useMany cache → Many shows "New Title" ✅
// 3. useOne cache → Detail shows "New Title" ✅

// All components synchronized! ⚡
```

### 3.3 Rollback on Error

```typescript
// Before update
Cache: { title: "Old Title" }

// Optimistic update
mutate({ id: 123, values: { title: "New Title" } });
Cache: { title: "New Title" } ⚡

// API error!
Error: 400 Bad Request

// Automatic rollback
Cache: { title: "Old Title" } ✅
// UI reverts to old state!
```

### 3.4 Audit Logging

```typescript
// Tracks BOTH old and new values!
log.mutate({
  action: "update",
  resource: "posts",
  data: { title: "New Title" }, // ← New value
  previousData: { title: "Old Title" }, // ← Old value
  meta: { id: 123 },
});

// Perfect for audit trails! ✅
```

---

## 4. COMMON USE CASES

### 4.1 Basic Edit Form

```tsx
function PostEdit() {
  const { id } = useParams();
  const { result } = useOne({ resource: "posts", id });
  const { mutate } = useUpdate();

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      id: Number(id),
      values,
    });
  };

  if (!result) return <div>Loading...</div>;

  return (
    <Form initialValues={result} onFinish={handleSubmit}>
      <Input name="title" />
      <TextArea name="content" />
      <Button type="submit">Save</Button>
    </Form>
  );
}
```

### 4.2 Inline Edit with Optimistic Update

```tsx
function PostListItem({ post }) {
  const [isEditing, setIsEditing] = useState(false);
  const { mutate } = useUpdate({
    mutationMode: "optimistic", // ← Fast!
  });

  const handleSave = (title) => {
    mutate({
      resource: "posts",
      id: post.id,
      values: { title },
    });
    setIsEditing(false);
    // UI updates INSTANTLY! ⚡
  };

  if (isEditing) {
    return (
      <Input
        defaultValue={post.title}
        onPressEnter={(e) => handleSave(e.target.value)}
        onBlur={(e) => handleSave(e.target.value)}
        autoFocus
      />
    );
  }

  return <div onClick={() => setIsEditing(true)}>{post.title}</div>;
}
```

### 4.3 Undoable Delete

```tsx
function PostCard({ post }) {
  const { mutate: updatePost } = useUpdate({
    mutationMode: "undoable",
    undoableTimeout: 5000,
  });

  const handleArchive = () => {
    updatePost({
      resource: "posts",
      id: post.id,
      values: { status: "archived" },
    });

    // Notification: "Post archived. Undo? [5]" ↩️
    // User has 5 seconds to undo!
  };

  return (
    <Card>
      <h3>{post.title}</h3>
      <Button onClick={handleArchive}>Archive</Button>
    </Card>
  );
}
```

### 4.4 Batch Update with Progress

```tsx
function BulkStatusUpdate({ selectedIds }) {
  const { mutate } = useUpdate({
    mutationMode: "pessimistic", // ← Safe for bulk
  });
  const [progress, setProgress] = useState(0);

  const handleBulkUpdate = async () => {
    for (let i = 0; i < selectedIds.length; i++) {
      await mutateAsync({
        resource: "posts",
        id: selectedIds[i],
        values: { status: "published" },
      });

      setProgress(((i + 1) / selectedIds.length) * 100);
    }
  };

  return (
    <div>
      <Button onClick={handleBulkUpdate}>
        Publish {selectedIds.length} Posts
      </Button>
      {progress > 0 && <Progress percent={progress} />}
    </div>
  );
}
```

### 4.5 Custom Optimistic Update

```tsx
function PostLikeButton({ post }) {
  const { mutate } = useUpdate({
    mutationMode: "optimistic",
    optimisticUpdateMap: {
      // Custom logic: Increment likes
      detail: (previous, values, id) => {
        return {
          data: {
            ...previous.data,
            likes: previous.data.likes + 1, // ← Increment!
            likedAt: new Date(),
          },
        };
      },
    },
  });

  const handleLike = () => {
    mutate({
      resource: "posts",
      id: post.id,
      values: { liked: true },
    });

    // Likes count updates INSTANTLY! ⚡
  };

  return <Button onClick={handleLike}>❤️ {post.likes}</Button>;
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Three Mutation Modes?

**Answer:** Different use cases need different trade-offs

```
Pessimistic:
- Critical operations (payments, status changes)
- When accuracy > speed
- When rollback is unacceptable

Optimistic:
- Frequent operations (likes, votes)
- When speed > accuracy
- When rollback UX is acceptable

Undoable:
- User-facing operations (edits, archives)
- Best UX (fast + can undo)
- Gmail-style interactions
```

### 5.2 Why Save Previous Queries Instead of Just Previous Data?

**Answer:** Complete rollback, not partial

```typescript
// If saved only detail cache:
previousData = { id: 123, title: "Old" }

// But also need to rollback:
// - List cache (shows this post in list)
// - Many cache (shows this post with others)
// - Filtered queries
// - Sorted queries

// Solution: Save ALL queries!
previousQueries = [
  [["posts", "list"], { data: [...] }],
  [["posts", "one", "123"], { data: {...} }],
  [["posts", "many"], { data: [...] }],
  // ...ALL related queries! ✅
]

// Complete rollback! ✅
```

### 5.3 Why Undoable Uses Promise?

**Answer:** Delay execution until timeout

```typescript
// Undoable returns Promise that resolves after timeout
const updatePromise = new Promise((resolve, reject) => {
  const doMutation = () => {
    dataProvider.update(...).then(resolve);
  };

  const cancelMutation = () => {
    reject({ message: "mutationCancelled" });
  };

  // Add to queue with doMutation + cancelMutation
  notificationDispatch({
    type: ActionTypes.ADD,
    payload: { doMutation, cancelMutation, seconds: 5000 }
  });
});

// Queue calls doMutation after 5s (if not cancelled)
// If cancelled → reject promise → onError triggered
// If not cancelled → resolve promise → onSuccess triggered
```

---

## 6. COMMON PITFALLS

### 6.1 Not Handling Optimistic Rollback

```typescript
// ❌ WRONG - Assume update always succeeds
const { mutate } = useUpdate({
  mutationMode: "optimistic",
});

mutate({ id: 123, values: { title: "New" } });
navigate("/posts"); // ← Redirect immediately! ❌
// What if API error? User sees wrong state! ❌

// ✅ CORRECT - Handle both success and error
const { mutate } = useUpdate({
  mutationMode: "optimistic",
  mutationOptions: {
    onSuccess: () => {
      navigate("/posts"); // ← Only redirect on success! ✅
    },
    onError: () => {
      // Stay on page, show error
      // Cache already rolled back! ✅
    },
  },
});
```

### 6.2 Not Memoizing Optimistic Update Map

```typescript
// ❌ WRONG - Creates new function every render
const { mutate } = useUpdate({
  optimisticUpdateMap: {
    detail: (previous, values, id) => ({
      data: { ...previous.data, ...values },
    }),
  },
});
// New function → onMutate re-runs! ❌

// ✅ CORRECT - Memoize with useMemo
const optimisticUpdateMap = useMemo(
  () => ({
    detail: (previous, values, id) => ({
      data: { ...previous.data, ...values },
    }),
  }),
  [],
);

const { mutate } = useUpdate({
  optimisticUpdateMap,
});
```

### 6.3 Forgetting to Handle Undo Cancellation

```typescript
// ❌ WRONG - Not checking if cancelled
const { mutate } = useUpdate({
  mutationMode: "undoable",
  mutationOptions: {
    onError: (error) => {
      alert("Error: " + error.message); // ← Shows "mutationCancelled"! ❌
    },
  },
});

// ✅ CORRECT - Check if cancelled
const { mutate } = useUpdate({
  mutationMode: "undoable",
  mutationOptions: {
    onError: (error) => {
      if (error.message === "mutationCancelled") {
        // User clicked undo, don't show error! ✅
        return;
      }

      alert("Error: " + error.message);
    },
  },
});
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Mode Selection

```
Small edits (title, status):
  → Optimistic ⚡
  → Fast UX, rollback acceptable

Large edits (entire document):
  → Pessimistic 🐢
  → User expects wait

User-facing (archive, delete):
  → Undoable ↩️
  → Best UX
```

### 7.2 Cache Invalidation

```typescript
// GOOD - Invalidate only what changed
const { mutate } = useUpdate({
  invalidates: ["detail"], // ← Only invalidate detail
});
// Don't refetch list if it doesn't show this field

// BETTER - No invalidation if optimistic update is correct
const { mutate } = useUpdate({
  mutationMode: "optimistic",
  invalidates: [], // ← No invalidation!
});
// Optimistic update IS the final state! ⚡
```

---

## 8. TESTING

```typescript
describe("useUpdate", () => {
  it("should update with optimistic mode", async () => {
    const { result } = renderHook(
      () =>
        useUpdate({
          mutationMode: "optimistic",
        }),
      { wrapper },
    );

    // Trigger update
    act(() => {
      result.current.mutate({
        resource: "posts",
        id: 123,
        values: { title: "New" },
      });
    });

    // Cache updated immediately (optimistic)
    const cache = queryClient.getQueryData(["posts", "one", "123"]);
    expect(cache.data.title).toBe("New");

    // Wait for API response
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it("should rollback on error", async () => {
    mockUpdate.mockRejectedValue({ statusCode: 400 });

    const { result } = renderHook(
      () =>
        useUpdate({
          mutationMode: "optimistic",
        }),
      { wrapper },
    );

    // Trigger update
    act(() => {
      result.current.mutate({
        resource: "posts",
        id: 123,
        values: { title: "New" },
      });
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // Cache rolled back
    const cache = queryClient.getQueryData(["posts", "one", "123"]);
    expect(cache.data.title).toBe("Old"); // ← Rolled back!
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: Encapsulate mutation as undoable object
- ✅ **Memento**: Save state for complete rollback
- ✅ **Strategy**: Three mutation modes (pessimistic/optimistic/undoable)
- ✅ **Observer**: Synchronize all related caches
- ✅ **Template Method**: Mutation lifecycle with hooks

### Key Features

1. **Three Modes** - Pessimistic/Optimistic/Undoable
2. **Optimistic Updates** - Instant UI, rollback on error
3. **Undo Functionality** - Gmail-style undo
4. **Cache Sync** - Auto-update list/many/detail
5. **Audit Logging** - Track old vs new values

### Khi nào dùng từng mode?

**Pessimistic 🐢:**

- Critical operations (payments)
- When accuracy > speed
- Batch updates

**Optimistic ⚡:**

- Frequent operations (likes, votes)
- When speed > accuracy
- Inline edits

**Undoable ↩️:**

- User-facing operations
- Best UX (fast + undo)
- Archive/delete actions

### Remember

✅ **1,249 lines** - Complete mutation system
🎮 **Command** - Undoable operations
💾 **Memento** - Complete rollback
🎲 **Strategy** - 3 mutation modes
🔔 **Observer** - Cache synchronization
📋 **Template** - Lifecycle hooks

---

> 📚 **Best Practice**: Use **optimistic** for frequent edits (fast!). Use **undoable** for user-facing actions (best UX!). Use **pessimistic** for critical operations (safe!). Always handle **onError** for rollback UX. **Memoize** optimisticUpdateMap to avoid re-renders!
