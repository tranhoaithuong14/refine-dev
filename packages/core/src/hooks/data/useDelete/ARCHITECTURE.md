# Kiến trúc và Design Patterns của useDelete Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DELETE MUTATION SYSTEM                  │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useDelete ✅ (THIS HOOK)                         │  │
│  │    → DELETE /posts/1                             │  │
│  │         │                                         │  │
│  │         ├──→ MUTATION MODES:                     │  │
│  │         │     1. Pessimistic (wait) ⏳           │  │
│  │         │     2. Optimistic (instant UI) ⚡      │  │
│  │         │     3. Undoable (with undo) ↩️         │  │
│  │         │                                         │  │
│  │         ├──→ Optimistic Update (instant UI)      │  │
│  │         ├──→ Error Rollback (revert on fail)     │  │
│  │         ├──→ Notifications                       │  │
│  │         ├──→ Cache Invalidation                  │  │
│  │         ├──→ Realtime Events                     │  │
│  │         └──→ Audit Logging                       │  │
│  │                                                   │  │
│  │  Companion hooks:                                │  │
│  │    - useDeleteMany → Bulk delete                 │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Delete a single record with 3 mutation modes (pessimistic/optimistic/undoable), automatic optimistic updates, error rollback, and cache management**

### 1.2 Complete Flow (All 3 Modes)

```
┌──────────────────────────────────────────────────────────────┐
│              USEDELETE COMPLETE FLOW                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User Triggers Delete                               │
│  <button onClick={() => mutate({ id: 1, resource: "posts" })}> │
│    Delete Post                                               │
│  </button>                                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Choose Mutation Mode                               │
│  mutationMode: "pessimistic" | "optimistic" | "undoable"     │
│    ┌─────────────┬──────────────┬──────────────┐            │
│    PESSIMISTIC   OPTIMISTIC     UNDOABLE                     │
│    (wait)        (instant UI)   (with undo)                  │
└──────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ PESSIMISTIC  │  │  OPTIMISTIC  │  │  UNDOABLE    │
    └──────────────┘  └──────────────┘  └──────────────┘


FLOW PESSIMISTIC (Traditional):
┌──────────────────────────────────────────────────────────────┐
│  1. onMutate: Cancel ongoing queries ✅                      │
│  2. mutationFn: DELETE /posts/1 (WAIT) ⏳                    │
│  3. onSuccess: Update cache, show notification ✅            │
│  4. UI updates AFTER server responds ⏳                      │
└──────────────────────────────────────────────────────────────┘


FLOW OPTIMISTIC (Instant UI):
┌──────────────────────────────────────────────────────────────┐
│  1. onMutate:                                                │
│     - Cancel ongoing queries ✅                              │
│     - Save previous data ✅                                  │
│     - UPDATE UI IMMEDIATELY (remove item) ⚡                 │
│  2. mutationFn: DELETE /posts/1 (background) ⚙️              │
│  3. onSuccess: Show notification ✅                          │
│  4. onError: ROLLBACK UI (restore item) ↩️                   │
│  → UI updates BEFORE server responds! ⚡                     │
└──────────────────────────────────────────────────────────────┘


FLOW UNDOABLE (With Undo Timer):
┌──────────────────────────────────────────────────────────────┐
│  1. onMutate:                                                │
│     - Cancel ongoing queries ✅                              │
│     - Save previous data ✅                                  │
│     - UPDATE UI IMMEDIATELY (remove item) ⚡                 │
│     - Show UNDO notification (5 sec countdown) ⏱️            │
│  2. mutationFn: WAIT 5 seconds ⏳                            │
│     - If UNDO clicked → Cancel mutation ↩️                  │
│     - If timeout → DELETE /posts/1 ✅                        │
│  3. onSuccess: Show success notification ✅                  │
│  4. onError: ROLLBACK UI ↩️                                  │
│  → UI updates IMMEDIATELY + Can UNDO! ⚡↩️                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useDelete.ts: 504 dòng** - Delete with optimistic updates & undo!

---

### 2.1 Optimistic Update Pattern - Instant UI Feedback

#### ⚡ VÍ DỤ ĐỜI THƯỜNG: Deleting Email (Optimistic)

```
Email App (Gmail):

❌ PESSIMISTIC (Old way):
1. Click "Delete"
2. Show spinner ⏳
3. Wait for server response...
4. THEN remove email from list
→ Slow! User waits! ❌

✅ OPTIMISTIC (Modern way):
1. Click "Delete"
2. Email DISAPPEARS IMMEDIATELY ⚡
3. Server request in background
4. If error: UNDO (email comes back) ↩️
→ Fast! Feels instant! ✅

useDelete optimistic mode = Gmail delete!
```

**Optimistic Update** = Update UI before server confirms

#### Implementation:

```typescript
// From useDelete.ts (lines 279-301)

// onMutate (before API call):
if (mutationMode !== "pessimistic") {
  // Update cache IMMEDIATELY (optimistic)
  queryClient.setQueriesData(
    { queryKey: resourceKeys.action("list").get() },
    (previous?: GetListResponse<TData>) => {
      if (!previous) return null;

      // Remove item from list BEFORE server responds! ⚡
      const data = previous.data.filter(
        (record) => record.id?.toString() !== id.toString(),
      );

      return {
        data,
        total: previous.total - 1, // Update count too
      };
    },
  );
}

// Result: Item disappears from UI INSTANTLY! ⚡
// Even before DELETE request completes!
```

#### Visual Timeline:

```
PESSIMISTIC Mode (Wait for server):
User clicks delete
    │
    ├─→ API Request sent
    │   ⏳ WAITING (spinner shown)
    │   ⏳ User sees old list
    │   ⏳ 200ms...
    ▼
API Response received
    │
    └─→ UI updates (item removed)
        User sees new list ✅
Total: 200ms+ delay


OPTIMISTIC Mode (Update immediately):
User clicks delete
    │
    ├─→ UI updates IMMEDIATELY ⚡
    │   User sees new list (item gone) ✅
    │
    └─→ API Request sent (background)
        ⏳ 200ms...
        ▼
        API Response received
        (UI already updated!) ✅
Total: 0ms perceived delay!
```

#### Real Example:

```tsx
function PostList() {
  const { data: posts } = useList({ resource: "posts" });
  const { mutate } = useDelete();

  const handleDelete = (id) => {
    mutate({
      resource: "posts",
      id,
      mutationMode: "optimistic", // ← Instant UI!
    });
  };

  return (
    <div>
      {posts?.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <button onClick={() => handleDelete(post.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// When user clicks "Delete":
// 1. Post DISAPPEARS IMMEDIATELY ⚡
// 2. API request sent (background)
// 3. If success: Stay deleted ✅
// 4. If error: Post REAPPEARS (rollback) ↩️
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Instant Feedback** - UI updates immediately
- ✅ **Better UX** - Feels faster, more responsive
- ✅ **Network Independence** - Don't wait for server
- ✅ **Error Recovery** - Auto-rollback on failure

---

### 2.2 Memento Pattern - Save & Restore State

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Video Game Save Points

```
Video Game:

Before boss fight:
1. Save game state ✅
2. Fight boss
3. If lose → RESTORE save point ↩️
4. If win → Keep progress ✅

useDelete does the same:
1. Save queries (memento) ✅
2. Delete item (optimistic)
3. If error → RESTORE queries ↩️
4. If success → Keep deleted ✅
```

**Memento Pattern** = Save state for potential rollback

#### Implementation:

```typescript
// From useDelete.ts (lines 274-277)

// STEP 1: SAVE state (before mutation)
const previousQueries: PreviousQuery<TData>[] = queryClient.getQueriesData({
  queryKey: resourceKeys.get(),
});
// ↑ Save ALL queries (memento) ✅

// Return saved state
return {
  previousQueries, // ← Memento!
  queryKey: resourceKeys.get(),
};

// From useDelete.ts (lines 453-457)

// STEP 2: RESTORE state (on error)
if (context) {
  for (const query of context.previousQueries) {
    queryClient.setQueryData(query[0], query[1]);
    // ↑ Restore from memento! ↩️
  }
}

// Result: Complete rollback! ✅
```

#### Complete Save & Restore Flow:

```typescript
// Example: Delete post optimistically

// BEFORE DELETE:
Cache state: {
  "posts-list": [
    { id: 1, title: "Post 1" },
    { id: 2, title: "Post 2" }, // ← Will delete this
    { id: 3, title: "Post 3" }
  ],
  "posts-many": [...],
  "posts-detail": {...}
}

// STEP 1 - onMutate (SAVE):
previousQueries = [
  ["posts-list", [Post 1, Post 2, Post 3]], // ← SAVED! ✅
  ["posts-many", [...]], // ← SAVED! ✅
  ["posts-detail", {...}] // ← SAVED! ✅
]

// STEP 2 - onMutate (UPDATE optimistically):
Cache state: {
  "posts-list": [
    { id: 1, title: "Post 1" },
    // Post 2 removed! ⚡
    { id: 3, title: "Post 3" }
  ]
}

// STEP 3A - onSuccess:
// Keep optimistic update ✅
// No rollback needed!

// STEP 3B - onError (if API fails):
// RESTORE from previousQueries ↩️
Cache state: {
  "posts-list": [
    { id: 1, title: "Post 1" },
    { id: 2, title: "Post 2" }, // ← RESTORED! ↩️
    { id: 3, title: "Post 3" }
  ]
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Error Recovery** - Restore state on failure
- ✅ **Data Integrity** - No corrupted cache
- ✅ **User Confidence** - UI always consistent
- ✅ **Transactional Feel** - All or nothing

---

### 2.3 Command Pattern with Undo - Undoable Mutations

#### ↩️ VÍ DỤ ĐỜI THƯỜNG: Text Editor Undo (Ctrl+Z)

```
Text Editor:

Type "Hello"
    ↓
Delete "o"
    ↓
Undo! (Ctrl+Z)
    ↓
"Hello" restored! ✅

useDelete undoable mode:
Click delete
    ↓
Item removed (5 sec countdown)
    ↓
Click "UNDO"
    ↓
Item restored! ✅
```

**Command with Undo** = Execute command with option to cancel

#### Implementation:

```typescript
// From useDelete.ts (lines 214-251)

// Create UNDO-able delete
const deletePromise = new Promise<DeleteOneResponse<TData>>(
  (resolve, reject) => {
    // Define the actual mutation
    const doMutation = () => {
      dataProvider.deleteOne({...})
        .then((result) => resolve(result))
        .catch((err) => reject(err));
    };

    // Define the cancel function (UNDO)
    const cancelMutation = () => {
      reject({ message: "mutationCancelled" }); // ← UNDO! ↩️
    };

    // Give user cancel function
    if (onCancel) {
      onCancel(cancelMutation);
    }

    // Add to undo queue with timeout
    notificationDispatch({
      type: ActionTypes.ADD,
      payload: {
        id,
        resource: identifier,
        cancelMutation: cancelMutation, // ← UNDO callback
        doMutation: doMutation,         // ← Actual delete
        seconds: undoableTimeout,       // ← Countdown (5s)
        isSilent: !!onCancel
      }
    });
  }
);

// Result:
// 1. Item removed from UI IMMEDIATELY ⚡
// 2. Countdown starts (5 seconds) ⏱️
// 3. User can click "UNDO" ↩️
// 4. If timeout: Execute delete ✅
// 5. If undo: Cancel delete ↩️
```

#### Visual Timeline:

```
UNDOABLE Mode:
User clicks delete (t=0s)
    │
    ├─→ UI updates IMMEDIATELY ⚡
    │   Item disappears from list
    │
    └─→ UNDO notification shown:
        ┌──────────────────────────┐
        │ ✓ Post deleted           │
        │ [UNDO] (5s remaining)    │
        └──────────────────────────┘
        │
        ├─→ t=1s → [UNDO] (4s)
        ├─→ t=2s → [UNDO] (3s)
        ├─→ t=3s → [UNDO] (2s)
        ├─→ t=4s → [UNDO] (1s)
        │
        ▼
    DECISION POINT (t=5s):
        │
        ├─→ User clicked UNDO ↩️
        │   → Cancel mutation
        │   → Restore item to list
        │   → Show "Deletion cancelled"
        │
        └─→ Timeout (no undo) ✅
            → Execute DELETE API call
            → Show "Successfully deleted"
```

#### Real Example:

```tsx
function PostList() {
  const { mutate } = useDelete();

  const handleDelete = (id) => {
    mutate({
      resource: "posts",
      id,
      mutationMode: "undoable", // ← Undo mode!
      undoableTimeout: 5000, // 5 seconds
      onCancel: (cancelMutation) => {
        // Expose cancel function to notification
        // Notification will call this if user clicks "UNDO"
      },
    });
  };

  return (
    <button onClick={() => handleDelete(post.id)}>Delete (with undo)</button>
  );
}

// Timeline:
// 1. Click "Delete"
// 2. Post disappears ⚡
// 3. Notification: "Post deleted [UNDO] (5s)"
// 4. User has 5 seconds to undo ⏱️
// 5. If UNDO: Post reappears ↩️
// 6. If timeout: Delete confirmed ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Mistake Prevention** - Users can recover
- ✅ **Confidence** - Delete without fear
- ✅ **Better UX** - Forgiving interface
- ✅ **Instant + Safe** - Fast but reversible

---

### 2.4 Strategy Pattern - Mutation Mode Selection

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Driving Modes

```
Car Driving Modes:

ECO Mode (Pessimistic):
→ Save fuel, slower acceleration
→ Wait for optimal conditions

SPORT Mode (Optimistic):
→ Instant response, fast acceleration
→ Risk higher fuel consumption

COMFORT Mode (Undoable):
→ Balanced, can adjust mid-drive

useDelete has 3 strategies:
→ Pessimistic (wait)
→ Optimistic (instant)
→ Undoable (instant + undo)
```

**Strategy Pattern** = Choose behavior at runtime

#### Implementation:

```typescript
// From useDelete.ts (lines 198-212)

const mutationModePropOrContext = mutationMode ?? mutationModeContext;

// STRATEGY SELECTION:
if (!(mutationModePropOrContext === "undoable")) {
  // STRATEGY 1 & 2: Pessimistic or Optimistic
  return dataProvider.deleteOne({
    resource: resource.name,
    id,
    meta: combinedMeta,
    variables: values,
  });
  // ↑ Direct execution (no undo queue)
}

// STRATEGY 3: Undoable
const deletePromise = new Promise((resolve, reject) => {
  // ... (undo queue logic)
});
return deletePromise;
// ↑ Delayed execution with undo
```

#### Strategy Comparison:

```typescript
// STRATEGY 1: PESSIMISTIC (Conservative)
mutate({
  resource: "posts",
  id: 1,
  mutationMode: "pessimistic",
});

// Behavior:
// - onMutate: Cancel queries (no UI update)
// - mutationFn: DELETE /posts/1 (wait)
// - onSuccess: Update UI (show success)
// - Timeline: Wait → Delete → Update UI ⏳

// Best for:
// - Critical operations
// - When server validation needed
// - Unreliable networks

// STRATEGY 2: OPTIMISTIC (Aggressive)
mutate({
  resource: "posts",
  id: 1,
  mutationMode: "optimistic",
});

// Behavior:
// - onMutate: Update UI immediately ⚡
// - mutationFn: DELETE /posts/1 (background)
// - onSuccess: Already updated!
// - onError: Rollback UI ↩️
// - Timeline: Update UI → Delete (background) ⚡

// Best for:
// - Responsive UIs
// - High confidence operations
// - Reliable networks

// STRATEGY 3: UNDOABLE (Balanced)
mutate({
  resource: "posts",
  id: 1,
  mutationMode: "undoable",
  undoableTimeout: 5000,
});

// Behavior:
// - onMutate: Update UI immediately ⚡
// - mutationFn: Wait 5s → DELETE /posts/1 ⏱️
// - User can undo in 5s ↩️
// - Timeline: Update UI → Wait → Delete ⚡⏱️

// Best for:
// - User-friendly apps
// - Mistake-prone operations
// - When undo valuable
```

#### Real Example - Mode Selection:

```tsx
function PostActions({ post }) {
  const { mutate } = useDelete();

  // Different modes for different contexts

  const handleQuickDelete = () => {
    // Optimistic: Fast, instant UI
    mutate({
      resource: "posts",
      id: post.id,
      mutationMode: "optimistic", // ⚡ Instant
    });
  };

  const handleSafeDelete = () => {
    // Pessimistic: Wait for confirmation
    mutate({
      resource: "posts",
      id: post.id,
      mutationMode: "pessimistic", // ⏳ Wait
    });
  };

  const handleDeleteWithUndo = () => {
    // Undoable: Instant but reversible
    mutate({
      resource: "posts",
      id: post.id,
      mutationMode: "undoable", // ⚡↩️ Instant + Undo
      undoableTimeout: 5000,
    });
  };

  return (
    <div>
      <button onClick={handleQuickDelete}>Quick Delete (instant)</button>
      <button onClick={handleSafeDelete}>Safe Delete (wait)</button>
      <button onClick={handleDeleteWithUndo}>Delete (can undo in 5s)</button>
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose mode per operation
- ✅ **Context-Aware** - Different modes for different needs
- ✅ **User Choice** - Let users decide
- ✅ **Performance Tuning** - Optimize per scenario

---

### 2.5 Cache-Aside Pattern - Smart Cache Management

#### 🗄️ VÍ DỤ ĐỜI THƯỜNG: Library Book System

```
Library:

When book returned (deleted from user):
1. Remove from "Your Books" shelf ✅
2. Update "Available Books" count ✅
3. Remove book details from desk ✅
4. Update "Recently Returned" list ✅
→ Multiple locations updated!

useDelete does the same:
1. Remove from list cache ✅
2. Update many query cache ✅
3. Remove detail query cache ✅
4. Invalidate related queries ✅
```

**Cache-Aside** = Manage cache separately from data source

#### Implementation:

```typescript
// From useDelete.ts (lines 279-320)

// UPDATE 1: List cache (remove item)
queryClient.setQueriesData(
  { queryKey: resourceKeys.action("list").get() },
  (previous?: GetListResponse<TData>) => {
    if (!previous) return null;

    const data = previous.data.filter((record) => record.id !== id);

    return {
      data,
      total: previous.total - 1, // ← Update count!
    };
  },
);

// UPDATE 2: Many query cache (remove from bulk queries)
queryClient.setQueriesData(
  { queryKey: resourceKeys.action("many").get() },
  (previous?: GetListResponse<TData>) => {
    if (!previous) return null;

    const data = previous.data.filter((record) => record.id !== id);

    return { ...previous, data };
  },
);

// From useDelete.ts (lines 386-388, 441-443)

// UPDATE 3: Remove detail cache (cleanup)
queryClient.removeQueries({
  queryKey: resourceKeys.action("one").get(),
});
// ↑ No point caching deleted item!
```

#### Cache Update Strategy:

```
BEFORE DELETE:
┌─────────────────────────────────────┐
│ React Query Cache                   │
├─────────────────────────────────────┤
│ posts-list: [                       │
│   { id: 1, title: "Post 1" },       │
│   { id: 2, title: "Post 2" }, ← DEL │
│   { id: 3, title: "Post 3" }        │
│ ]                                   │
│                                     │
│ posts-many: [Post 1, Post 2, Post 3]│
│ posts-one-2: { id: 2, ... }         │
└─────────────────────────────────────┘


OPTIMISTIC UPDATE (onMutate):
┌─────────────────────────────────────┐
│ React Query Cache                   │
├─────────────────────────────────────┤
│ posts-list: [                       │
│   { id: 1, title: "Post 1" },       │
│   // Post 2 removed! ⚡             │
│   { id: 3, title: "Post 3" }        │
│ ] total: 2 (was 3)                  │
│                                     │
│ posts-many: [Post 1, Post 3]        │
│ // Post 2 removed! ⚡               │
│ posts-one-2: { id: 2, ... } ← Still │
└─────────────────────────────────────┘


AFTER SUCCESS (onSuccess):
┌─────────────────────────────────────┐
│ React Query Cache                   │
├─────────────────────────────────────┤
│ posts-list: [                       │
│   { id: 1, title: "Post 1" },       │
│   { id: 3, title: "Post 3" }        │
│ ] ← Confirmed!                      │
│                                     │
│ posts-many: [Post 1, Post 3]        │
│ posts-one-2: REMOVED ✅             │
└─────────────────────────────────────┘


ON ERROR (onError - Rollback):
┌─────────────────────────────────────┐
│ React Query Cache                   │
├─────────────────────────────────────┤
│ posts-list: [                       │
│   { id: 1, title: "Post 1" },       │
│   { id: 2, title: "Post 2" }, ← BACK│
│   { id: 3, title: "Post 3" }        │
│ ] ← Restored from previousQueries! ↩│
│                                     │
│ posts-many: [Post 1, Post 2, Post 3]│
│ posts-one-2: { id: 2, ... }         │
└─────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - All caches updated together
- ✅ **Performance** - No refetch needed
- ✅ **Accuracy** - Remove stale data
- ✅ **Comprehensive** - List, many, detail all handled

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern               | Ví dụ đời thường    | Giải quyết vấn đề gì    | Trong useDelete                |
| --------------------- | ------------------- | ----------------------- | ------------------------------ |
| **Optimistic Update** | Gmail delete        | Instant UI feedback     | Update UI before API confirms  |
| **Memento**           | Game save points    | State rollback on error | Save queries, restore on fail  |
| **Command with Undo** | Text editor Ctrl+Z  | Reversible actions      | Undoable mode with timeout     |
| **Strategy**          | Car driving modes   | Runtime behavior choice | 3 mutation modes               |
| **Cache-Aside**       | Library book system | Cache management        | Update list/many/detail caches |

---

## 3. KEY FEATURES

### 3.1 Three Mutation Modes

```typescript
// MODE 1: Pessimistic (Wait for server)
mutate({
  resource: "posts",
  id: 1,
  mutationMode: "pessimistic",
});
// Timeline: Wait → Delete → Update UI

// MODE 2: Optimistic (Instant UI)
mutate({
  resource: "posts",
  id: 1,
  mutationMode: "optimistic",
});
// Timeline: Update UI → Delete (background)

// MODE 3: Undoable (Instant + Undo)
mutate({
  resource: "posts",
  id: 1,
  mutationMode: "undoable",
  undoableTimeout: 5000, // 5 seconds to undo
});
// Timeline: Update UI → Wait 5s → Delete
```

### 3.2 Automatic Cache Updates

```typescript
// Automatically updates:
// 1. List queries (removes item)
// 2. Many queries (removes from bulk)
// 3. Detail query (removes cached item)

// No manual cache management needed! ✅
```

### 3.3 Error Rollback

```typescript
// On error (optimistic/undoable modes):
// 1. Restore previous queries ↩️
// 2. Show error notification
// 3. Call checkError handler

// UI automatically reverts! ✅
```

### 3.4 Realtime Events

```typescript
// On success:
publish({
  channel: `resources/${resource.name}`,
  type: "deleted",
  payload: { ids: [id] },
});

// Other users/tabs notified! ✅
```

### 3.5 Audit Logging

```typescript
// On success:
log.mutate({
  action: "delete",
  resource: resource.name,
  meta: { id, dataProviderName },
});

// Deletion tracked! ✅
```

---

## 4. COMMON USE CASES

### 4.1 Simple Delete (Pessimistic)

```tsx
function DeleteButton({ id }) {
  const { mutate, mutation } = useDelete();

  const handleDelete = () => {
    if (confirm("Are you sure?")) {
      mutate({
        resource: "posts",
        id,
        mutationMode: "pessimistic", // Wait for server
      });
    }
  };

  return (
    <button onClick={handleDelete} disabled={mutation.isPending}>
      {mutation.isPending ? "Deleting..." : "Delete"}
    </button>
  );
}
```

### 4.2 Instant Delete (Optimistic)

```tsx
function PostList() {
  const { data: posts } = useList({ resource: "posts" });
  const { mutate } = useDelete();

  const handleDelete = (id) => {
    mutate({
      resource: "posts",
      id,
      mutationMode: "optimistic", // Instant UI! ⚡
    });
  };

  return (
    <div>
      {posts?.data.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
          <button onClick={() => handleDelete(post.id)}>Delete</button>
        </div>
      ))}
    </div>
  );

  // When delete clicked:
  // Post disappears IMMEDIATELY! ⚡
}
```

### 4.3 Delete with Undo

```tsx
function PostActions({ post }) {
  const { mutate } = useDelete();

  const handleDelete = () => {
    mutate({
      resource: "posts",
      id: post.id,
      mutationMode: "undoable",
      undoableTimeout: 5000, // 5 seconds
      successNotification: {
        message: "Post deleted",
        description: "You can undo this action",
        type: "success",
        undoableTimeout: 5000,
      },
    });
  };

  return <button onClick={handleDelete}>Delete (can undo)</button>;
}
```

### 4.4 Soft Delete with Custom Values

```typescript
function SoftDelete({ id }) {
  const { mutate } = useDelete();

  const handleSoftDelete = () => {
    mutate({
      resource: "posts",
      id,
      values: {
        // Custom soft delete logic
        deletedAt: new Date().toISOString(),
        deletedBy: currentUser.id,
      },
      mutationMode: "optimistic",
    });
  };

  return <button onClick={handleSoftDelete}>Archive</button>;
}
```

### 4.5 Delete with Confirmation Modal

```tsx
function DeleteWithModal({ post }) {
  const [showModal, setShowModal] = useState(false);
  const { mutate, mutation } = useDelete();

  const handleConfirmDelete = () => {
    mutate({
      resource: "posts",
      id: post.id,
      mutationMode: "optimistic",
      onSuccess: () => {
        setShowModal(false);
      },
    });
  };

  return (
    <>
      <button onClick={() => setShowModal(true)}>Delete</button>

      <Modal show={showModal} onClose={() => setShowModal(false)}>
        <h2>Delete "{post.title}"?</h2>
        <p>This action cannot be undone.</p>
        <button onClick={handleConfirmDelete} disabled={mutation.isPending}>
          {mutation.isPending ? "Deleting..." : "Confirm Delete"}
        </button>
        <button onClick={() => setShowModal(false)}>Cancel</button>
      </Modal>
    </>
  );
}
```

### 4.6 Cascading Delete

```tsx
function DeletePost({ postId }) {
  const { mutate: deletePost } = useDelete();
  const { mutate: deleteComments } = useDeleteMany();
  const queryClient = useQueryClient();

  const handleCascadingDelete = () => {
    // Get all comments for this post
    const comments = queryClient.getQueryData([
      "comments",
      "list",
      { filters: [{ field: "postId", operator: "eq", value: postId }] },
    ]);

    const commentIds = comments?.data?.map((c) => c.id) || [];

    // Delete comments first
    deleteComments({
      resource: "comments",
      ids: commentIds,
      onSuccess: () => {
        // Then delete post
        deletePost({
          resource: "posts",
          id: postId,
          mutationMode: "optimistic",
        });
      },
    });
  };

  return (
    <button onClick={handleCascadingDelete}>Delete Post & Comments</button>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Three Mutation Modes?

**Answer:** Different use cases need different behaviors

```typescript
// PESSIMISTIC: When accuracy critical
// - Financial transactions
// - Legal documents
// - Critical data

// OPTIMISTIC: When UX speed matters
// - Social media posts
// - Comments
// - Non-critical data

// UNDOABLE: When user mistakes possible
// - User-facing apps
// - Destructive actions
// - High-value data
```

### 5.2 Why Remove Detail Cache?

**Answer:** Deleted items shouldn't be cached

```typescript
// From code (lines 386-388)
queryClient.removeQueries({
  queryKey: resourceKeys.action("one").get(),
});

// Reason:
// - Item is deleted
// - No point caching non-existent data
// - Prevents confusion if user navigates to detail page
// - Cleanup cache space
```

### 5.3 Why Update List AND Many Caches?

**Answer:** Comprehensive cache consistency

```typescript
// LIST cache: For list pages
// MANY cache: For bulk queries (e.g., displaying multiple posts)

// Both need updates to stay consistent!
// Otherwise: List shows deleted item removed, but bulk query still has it!
```

---

## 6. COMMON PITFALLS

### 6.1 Not Handling Confirmation

```tsx
// ❌ WRONG - Delete without confirmation
<button onClick={() => mutate({ resource: "posts", id })}>
  Delete
</button>
// User accidentally clicks! Data lost! ❌

// ✅ CORRECT - Confirm first
<button onClick={() => {
  if (confirm("Delete this post?")) {
    mutate({ resource: "posts", id });
  }
}}>
  Delete
</button>
```

### 6.2 Using Pessimistic for Everything

```tsx
// ❌ SUBOPTIMAL - Always pessimistic
mutate({ resource: "posts", id, mutationMode: "pessimistic" });
// Slow UX! Users wait! ❌

// ✅ BETTER - Use optimistic when safe
mutate({ resource: "posts", id, mutationMode: "optimistic" });
// Instant UX! ⚡
```

### 6.3 Forgetting Undo Timeout

```tsx
// ❌ WRONG - Undoable without timeout
mutate({
  resource: "posts",
  id,
  mutationMode: "undoable",
  // No undoableTimeout! Uses default (5s)
});

// ✅ BETTER - Explicit timeout
mutate({
  resource: "posts",
  id,
  mutationMode: "undoable",
  undoableTimeout: 3000, // 3 seconds (explicit)
});
```

### 6.4 Not Handling Delete Errors

```tsx
// ❌ WRONG - No error handling
mutate({ resource: "posts", id });
// If delete fails, user doesn't know! ❌

// ✅ CORRECT - Handle errors
mutate({
  resource: "posts",
  id,
  errorNotification: (error) => ({
    message: "Failed to delete post",
    description: error.message,
    type: "error",
  }),
  onError: (error) => {
    console.error("Delete failed:", error);
    // Maybe refresh data?
  },
});
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Optimistic vs Pessimistic Performance

```
Scenario: Delete 1 item

PESSIMISTIC:
- User clicks → Spinner shown
- Wait for API (200ms)
- Update UI
- Total perceived delay: 200ms+


OPTIMISTIC:
- User clicks → UI updates immediately (0ms)
- API in background (200ms)
- Total perceived delay: 0ms!

Improvement: 200ms+ faster perceived performance! ⚡
```

### 7.2 Cache Update Performance

```typescript
// Optimistic updates are INSTANT because:
// 1. No API call wait ⚡
// 2. Direct cache mutation (fast)
// 3. React Query re-renders (optimized)

// Cache operations: ~1-5ms (negligible)
// API call: ~100-500ms (slow)
// Result: 100x+ faster UI updates! ⚡
```

---

## 8. TESTING

### 8.1 Test Pessimistic Delete

```typescript
describe("useDelete - pessimistic", () => {
  it("should wait for API before updating cache", async () => {
    const mockDeleteOne = jest.fn(() => Promise.resolve({ data: {} }));

    const { result } = renderHook(() => useDelete(), {
      wrapper: createWrapper({ deleteOne: mockDeleteOne }),
    });

    // Cache before delete
    const cacheBefore = queryClient.getQueryData(["posts", "list"]);
    expect(cacheBefore.data).toHaveLength(3);

    act(() => {
      result.current.mutate({
        resource: "posts",
        id: 1,
        mutationMode: "pessimistic",
      });
    });

    // Cache UNCHANGED immediately (pessimistic wait)
    const cacheDuring = queryClient.getQueryData(["posts", "list"]);
    expect(cacheDuring.data).toHaveLength(3); // Still 3!

    await waitFor(() => {
      expect(mockDeleteOne).toHaveBeenCalled();
    });

    // Cache updated AFTER API response
    const cacheAfter = queryClient.getQueryData(["posts", "list"]);
    expect(cacheAfter.data).toHaveLength(2); // Now 2!
  });
});
```

### 8.2 Test Optimistic Delete with Rollback

```typescript
describe("useDelete - optimistic rollback", () => {
  it("should rollback on error", async () => {
    const mockDeleteOne = jest.fn(() =>
      Promise.reject({ message: "Network error" }),
    );

    const { result } = renderHook(() => useDelete(), {
      wrapper: createWrapper({ deleteOne: mockDeleteOne }),
    });

    // Cache before delete
    const cacheBefore = queryClient.getQueryData(["posts", "list"]);
    expect(cacheBefore.data).toHaveLength(3);

    act(() => {
      result.current.mutate({
        resource: "posts",
        id: 1,
        mutationMode: "optimistic",
      });
    });

    // Cache UPDATED immediately (optimistic)
    await waitFor(() => {
      const cacheDuring = queryClient.getQueryData(["posts", "list"]);
      expect(cacheDuring.data).toHaveLength(2); // Removed!
    });

    // Wait for error
    await waitFor(() => {
      expect(result.current.mutation.isError).toBe(true);
    });

    // Cache ROLLED BACK (restored)
    const cacheAfter = queryClient.getQueryData(["posts", "list"]);
    expect(cacheAfter.data).toHaveLength(3); // Back to 3! ↩️
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Optimistic Update**: Instant UI feedback
- ✅ **Memento**: Save & restore state on error
- ✅ **Command with Undo**: Undoable mutations with timeout
- ✅ **Strategy**: 3 mutation modes (pessimistic/optimistic/undoable)
- ✅ **Cache-Aside**: Comprehensive cache management

### Key Features

1. **3 Mutation Modes** - Pessimistic/Optimistic/Undoable
2. **Optimistic Updates** - Instant UI (before API confirms)
3. **Error Rollback** - Auto-restore on failure
4. **Cache Management** - List, many, detail all updated
5. **Undo Support** - 5-second countdown to cancel

### Khi nào dùng useDelete?

✅ **Nên dùng:**

- Delete single record
- Need optimistic UI
- Want undo functionality
- Require cache management

❌ **Không dùng:**

- Delete multiple records (use useDeleteMany)
- Soft delete with complex logic (use useUpdate)
- Custom delete endpoint (use useCustomMutation)

### Remember

✅ **504 lines** - Most complex mutation hook
⚡ **Optimistic** - Instant UI updates
💾 **Memento** - Error rollback
↩️ **Undoable** - 5-second undo
🎯 **Strategy** - 3 mutation modes
🗄️ **Cache** - List, many, detail all managed

### Mutation Mode Comparison

| Feature         | Pessimistic   | Optimistic | Undoable      |
| --------------- | ------------- | ---------- | ------------- |
| UI Update       | After API     | Immediate  | Immediate     |
| API Call        | Immediate     | Immediate  | After timeout |
| Error Rollback  | N/A           | Yes ✅     | Yes ✅        |
| Undo Option     | No            | No         | Yes ✅        |
| Use Case        | Critical data | Fast UX    | User-friendly |
| Perceived Speed | Slow          | Fast ⚡    | Fast ⚡       |

### Pro Tips

1. **Default to optimistic** - Better UX in most cases
2. **Use undoable** - For user-facing delete actions
3. **Confirm destructive** - Always confirm deletes
4. **Handle errors** - Show clear error messages
5. **Test rollback** - Verify error recovery works
6. **Consider soft delete** - For recoverable deletes

---

> 📚 **Best Practice**: Use **optimistic mode** for responsive UX, **undoable mode** for user-friendly apps, and **pessimistic mode** only for critical operations where accuracy is paramount!
