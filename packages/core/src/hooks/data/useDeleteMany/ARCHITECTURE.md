# Kiến trúc và Design Patterns của useDeleteMany Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │        BULK DELETE MUTATION SYSTEM                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useDeleteMany ✅ (THIS HOOK)                     │  │
│  │    → DELETE multiple records                     │  │
│  │         │                                         │  │
│  │         ├──→ SMART FALLBACK:                     │  │
│  │         │     ✅ Provider has deleteMany()       │  │
│  │         │        → Use native bulk delete        │  │
│  │         │     ❌ Provider lacks deleteMany()     │  │
│  │         │        → Loop deleteOne() x N          │  │
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
│  │  Companion hook:                                 │  │
│  │    - useDelete → Delete single record            │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Delete multiple records efficiently with smart fallback (deleteMany() or deleteOne() x N), 3 mutation modes, optimistic updates, error rollback, and comprehensive cache management**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│            USEDELETEMANY COMPLETE FLOW                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User Triggers Bulk Delete                          │
│  const selectedIds = [1, 2, 3, 4, 5];                        │
│  mutate({                                                    │
│    resource: "posts",                                        │
│    ids: selectedIds                                          │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Smart Fallback Decision                            │
│  Does provider have deleteMany()?                           │
│    ├─→ YES ✅ → Use native deleteMany([1,2,3,4,5])          │
│    │             (Single API call, efficient!)              │
│    │                                                         │
│    └─→ NO ❌ → Fallback to deleteOne() loop:                │
│                  - deleteOne(1)                             │
│                  - deleteOne(2)                             │
│                  - deleteOne(3)                             │
│                  - deleteOne(4)                             │
│                  - deleteOne(5)                             │
│                  (5 API calls, still works!)                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Optimistic Update (for optimistic/undoable modes)  │
│  Before API calls, update cache immediately:                │
│  - Remove all 5 items from list cache ⚡                     │
│  - Remove all 5 items from many cache ⚡                     │
│  - Set each detail cache to null ⚡                          │
│  → UI updates INSTANTLY! User sees items gone! ⚡            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Execute Deletion                                   │
│  - API calls execute (1 call or N calls)                    │
│  - If undoable: Wait 5 seconds (user can undo) ⏱️            │
│  - If pessimistic: Wait for response before UI update       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Handle Result                                      │
│  SUCCESS ✅:                                                 │
│    - Show success notification                              │
│    - Publish realtime event (deleted: [1,2,3,4,5])          │
│    - Log audit entry                                        │
│    - Invalidate list/many caches                            │
│    - Remove detail caches for all IDs                       │
│                                                              │
│  ERROR ❌:                                                   │
│    - ROLLBACK cache (restore all 5 items) ↩️                 │
│    - Show error notification                                │
│    - Call error handler                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useDeleteMany.ts: 533 dòng** - Bulk delete with smart fallback!

---

### 2.1 Strategy Pattern with Fallback - Smart API Selection

#### 🔄 VÍ DỤ ĐỜI THƯỜNG: Package Delivery Options

```
Delivering 100 Packages:

STRATEGY 1 (Best): Bulk truck delivery 🚛
→ Load all 100 packages on one truck
→ Deliver to warehouse once
→ Fast! Efficient! ✅
→ But requires: Bulk delivery service

STRATEGY 2 (Fallback): Individual courier 🚴
→ Courier delivers package 1
→ Courier delivers package 2
→ ... (100 trips)
→ Slower but still works! ✅
→ Works with: Standard delivery

useDeleteMany does the same:
→ Try deleteMany([1,2,3...100]) first 🚛
→ Fallback to deleteOne() x 100 if needed 🚴
```

**Strategy with Fallback** = Try best approach, fallback if unavailable

#### Implementation:

```typescript
// From useDeleteMany.ts (lines 205-224)

const mutationFn = () => {
  // STRATEGY 1: Try native bulk delete (best)
  if (selectedDataProvider.deleteMany) {
    return selectedDataProvider.deleteMany<TData, TVariables>({
      resource: resource.name,
      ids, // ← All IDs at once! [1, 2, 3, 4, 5]
      meta: combinedMeta,
      variables: values,
    });
    // ↑ Single API call! Efficient! ✅
    // Example: DELETE /posts?ids=1,2,3,4,5
  }

  // STRATEGY 2: Fallback to loop (still works)
  return handleMultiple(
    ids.map((id) =>
      selectedDataProvider.deleteOne<TData, TVariables>({
        resource: resource.name,
        id, // ← One ID at a time!
        meta: combinedMeta,
        variables: values,
      }),
    ),
  );
  // ↑ Multiple API calls! Less efficient but works! ✅
  // Example:
  // DELETE /posts/1
  // DELETE /posts/2
  // DELETE /posts/3
  // DELETE /posts/4
  // DELETE /posts/5
};

// Result: ALWAYS works, regardless of provider capabilities! ✅
```

#### Visual Comparison:

```
SCENARIO: Delete 5 posts [1, 2, 3, 4, 5]


STRATEGY 1 (Native deleteMany):
┌──────────────────────────────────┐
│ Frontend                         │
├──────────────────────────────────┤
│ deleteMany([1,2,3,4,5])          │
└──────────────────────────────────┘
         │ (1 API call)
         ▼
┌──────────────────────────────────┐
│ Backend API                      │
├──────────────────────────────────┤
│ DELETE /posts?ids=1,2,3,4,5      │
│ → Deletes all 5 in one query    │
└──────────────────────────────────┘

Performance: ~100ms (1 network roundtrip) ✅
Efficiency: HIGH ⚡


STRATEGY 2 (Fallback deleteOne loop):
┌──────────────────────────────────┐
│ Frontend                         │
├──────────────────────────────────┤
│ deleteOne(1)                     │
│ deleteOne(2)                     │
│ deleteOne(3)                     │
│ deleteOne(4)                     │
│ deleteOne(5)                     │
└──────────────────────────────────┘
    │ │ │ │ │ (5 API calls)
    ▼ ▼ ▼ ▼ ▼
┌──────────────────────────────────┐
│ Backend API                      │
├──────────────────────────────────┤
│ DELETE /posts/1                  │
│ DELETE /posts/2                  │
│ DELETE /posts/3                  │
│ DELETE /posts/4                  │
│ DELETE /posts/5                  │
└──────────────────────────────────┘

Performance: ~500ms (5 network roundtrips) ⏳
Efficiency: LOWER (but still works!) ✅
```

#### Real Example:

```tsx
// Provider WITH deleteMany (modern):
const modernProvider: DataProvider = {
  deleteMany: async ({ ids }) => {
    // Native bulk delete
    await fetch(`/api/posts?ids=${ids.join(',)}`, { method: 'DELETE' });
    return { data: [] };
  }
};

// Provider WITHOUT deleteMany (legacy):
const legacyProvider: DataProvider = {
  deleteOne: async ({ id }) => {
    // Only supports single delete
    await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    return { data: {} };
  }
  // No deleteMany! ❌
};


// Usage (same code works with both!):
function BulkDeleteButton({ selectedIds }) {
  const { mutate } = useDeleteMany();

  const handleBulkDelete = () => {
    mutate({
      resource: "posts",
      ids: selectedIds // [1, 2, 3, 4, 5]
    });
  };

  // With modernProvider:
  // → Calls deleteMany([1,2,3,4,5]) (1 API call) ✅

  // With legacyProvider:
  // → Calls deleteOne(1), deleteOne(2), ... (5 API calls) ✅

  // Both work! Smart fallback! ✅

  return <button onClick={handleBulkDelete}>Delete Selected</button>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Compatibility** - Works with any provider
- ✅ **Performance** - Uses bulk when available
- ✅ **Reliability** - Always has fallback
- ✅ **Flexibility** - No provider limitation

---

### 2.2 Batch Processing Pattern - Efficient Bulk Operations

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Dishwasher vs Hand Washing

```
Washing 100 Dishes:

HAND WASHING (Sequential):
→ Wash dish 1, dry, put away
→ Wash dish 2, dry, put away
→ ... (100 times)
→ Time: 100 minutes ⏳

DISHWASHER (Batch):
→ Load all 100 dishes
→ Run dishwasher once
→ Unload all dishes
→ Time: 10 minutes ⚡

deleteMany = Dishwasher (batch)!
deleteOne x N = Hand washing (sequential)!
```

**Batch Processing** = Process multiple items together

#### Implementation:

```typescript
// Batch processing with deleteMany:
deleteMany({
  ids: [1, 2, 3, 4, 5, ..., 100]  // ← All at once!
});
// Result:
// - 1 network request ✅
// - Server processes in batch ✅
// - Faster! ⚡


// Sequential processing (fallback):
handleMultiple([
  deleteOne({ id: 1 }),
  deleteOne({ id: 2 }),
  deleteOne({ id: 3 }),
  // ... 100 promises
]);
// Result:
// - 100 network requests ⏳
// - Server processes one by one
// - Slower but works ✅
```

#### Performance Comparison:

```typescript
// BATCH (deleteMany):
// Delete 100 items:
// - API calls: 1
// - Network time: ~100ms
// - Server time: ~50ms (batch SQL)
// - Total: ~150ms ⚡

DELETE FROM posts WHERE id IN (1,2,3,...,100);
// ↑ Single SQL query! Fast! ✅


// SEQUENTIAL (deleteOne loop):
// Delete 100 items:
// - API calls: 100
// - Network time: ~10,000ms (100 x 100ms)
// - Server time: ~5,000ms (100 x 50ms)
// - Total: ~15,000ms ⏳

DELETE FROM posts WHERE id = 1;
DELETE FROM posts WHERE id = 2;
// ... (100 queries)
// ↑ Many SQL queries! Slow! ⏳

// Batch is 100x faster! ⚡
```

#### Real Example - Batch vs Sequential:

```tsx
function DataTable() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { mutate } = useDeleteMany();

  const handleBulkDelete = () => {
    // Deleting 50 selected items
    mutate({
      resource: "posts",
      ids: selectedIds, // [1, 5, 10, ..., 250]
    });
  };

  return (
    <div>
      <table>{/* ... table with checkboxes ... */}</table>

      <button onClick={handleBulkDelete}>
        Delete {selectedIds.length} Selected Posts
      </button>

      {/* BATCH (if provider has deleteMany):
          - 1 API call
          - ~200ms total time ⚡
          
          SEQUENTIAL (if fallback):
          - 50 API calls
          - ~5000ms total time ⏳
          
          But both work! ✅ */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Much faster with batch
- ✅ **Network** - Fewer roundtrips
- ✅ **Server** - Single query vs many
- ✅ **UX** - Faster perceived performance

---

### 2.3 Optimistic Update Pattern - Instant UI for Bulk Delete

#### ⚡ VÍ DỤ ĐỜI THƯỜNG: Deleting Email (Bulk Selection)

```
Gmail Bulk Delete:

Select 50 emails
Click "Delete"
→ ALL 50 disappear INSTANTLY! ⚡
→ API requests in background
→ If error: ALL 50 reappear ↩️

useDeleteMany optimistic = Gmail bulk delete!
```

**Optimistic Bulk Update** = Remove all items from UI before server confirms

#### Implementation:

```typescript
// From useDeleteMany.ts (lines 301-334)

// onMutate (before API calls):
if (mutationMode !== "pessimistic") {
  // UPDATE 1: Remove from list cache
  queryClient.setQueriesData(
    { queryKey: resourceKeys.action("list").get() },
    (previous?: GetListResponse<TData>) => {
      if (!previous) return null;

      // Filter out ALL deleted IDs! ⚡
      const data = previous.data.filter(
        (item) => item.id && !ids.map(String).includes(item.id.toString()),
      );
      // ↑ Remove [1,2,3,4,5] from list IMMEDIATELY!

      return {
        data,
        total: previous.total - ids.length, // Update count!
      };
    },
  );

  // UPDATE 2: Remove from many cache
  queryClient.setQueriesData(
    { queryKey: resourceKeys.action("many").get() },
    (previous?: GetListResponse<TData>) => {
      if (!previous) return null;

      const data = previous.data.filter((record: TData) => {
        if (record.id) {
          return !ids.map(String).includes(record.id.toString());
        }
        return false;
      });

      return { ...previous, data };
    },
  );

  // UPDATE 3: Set each detail cache to null
  for (const id of ids) {
    queryClient.setQueriesData(
      { queryKey: resourceKeys.action("one").id(id).get() },
      () => null,
    );
  }
}

// Result: ALL items disappear from UI INSTANTLY! ⚡
// Even before DELETE requests complete!
```

#### Visual Timeline:

```
BULK DELETE 5 posts [1, 2, 3, 4, 5]

PESSIMISTIC Mode (Wait):
User selects 5 posts, clicks delete
    │
    ├─→ API Requests sent
    │   DELETE /posts/1
    │   DELETE /posts/2
    │   DELETE /posts/3
    │   DELETE /posts/4
    │   DELETE /posts/5
    │   ⏳ WAITING (spinner shown)
    │   ⏳ User sees old list (5 items still there)
    │   ⏳ 500ms...
    ▼
All API Responses received
    │
    └─→ UI updates (all 5 items removed)
        User sees new list ✅
Total: 500ms+ delay


OPTIMISTIC Mode (Instant):
User selects 5 posts, clicks delete
    │
    ├─→ UI updates IMMEDIATELY ⚡
    │   All 5 posts disappear from list! ✅
    │   List count: 100 → 95
    │   User sees new list (instantly)
    │
    └─→ API Requests sent (background)
        DELETE /posts/1,2,3,4,5
        ⏳ 500ms...
        ▼
        All API Responses received
        (UI already updated!) ✅
Total: 0ms perceived delay! ⚡


UNDOABLE Mode (Instant + Undo):
User selects 5 posts, clicks delete
    │
    ├─→ UI updates IMMEDIATELY ⚡
    │   All 5 posts disappear! ✅
    │
    ├─→ Show UNDO notification ⏱️
    │   "5 posts deleted [UNDO] (5s)"
    │   User has 5 seconds to undo
    │
    └─→ After 5s timeout or UNDO:
        - Timeout → DELETE requests sent ✅
        - UNDO → Restore all 5 posts ↩️
Total: 0ms perceived + undo option! ⚡↩️
```

#### Real Example:

```tsx
function PostList() {
  const { data: posts } = useList({ resource: "posts" });
  const { mutate } = useDeleteMany();
  const [selected, setSelected] = useState<number[]>([]);

  const handleBulkDelete = () => {
    mutate({
      resource: "posts",
      ids: selected, // [1, 2, 3, 4, 5]
      mutationMode: "optimistic", // ← Instant UI!
    });
  };

  return (
    <div>
      {posts?.data.map((post) => (
        <div key={post.id}>
          <input
            type="checkbox"
            checked={selected.includes(post.id)}
            onChange={(e) => {
              if (e.target.checked) {
                setSelected([...selected, post.id]);
              } else {
                setSelected(selected.filter((id) => id !== post.id));
              }
            }}
          />
          <h3>{post.title}</h3>
        </div>
      ))}

      <button onClick={handleBulkDelete} disabled={selected.length === 0}>
        Delete {selected.length} Selected
      </button>
    </div>
  );

  // When delete clicked:
  // All selected posts DISAPPEAR IMMEDIATELY! ⚡
  // List count updates instantly!
  // If error: All posts REAPPEAR! ↩️
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Instant Feedback** - All items removed instantly
- ✅ **Better UX** - No waiting for bulk operations
- ✅ **Scalable** - Works with 1 or 1000 items
- ✅ **Error Recovery** - Auto-rollback on failure

---

### 2.4 Memento Pattern - Bulk State Rollback

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Photo Album Backup

```
Deleting 50 Photos:

BEFORE DELETE:
1. Take snapshot of album (memento) 📸
   → All 50 photos saved

DELETE:
2. Remove all 50 photos from album

ERROR SCENARIO:
3. Restore from snapshot ↩️
   → All 50 photos back!

useDeleteMany does the same:
1. Save cache state (memento) ✅
2. Remove all items (optimistic)
3. If error: Restore cache ↩️
```

**Memento for Bulk** = Save entire state, restore all on error

#### Implementation:

```typescript
// From useDeleteMany.ts (lines 282-285)

// STEP 1: SAVE state (memento)
const previousQueries: PreviousQuery<TData>[] = queryClient.getQueriesData({
  queryKey: resourceKeys.get(),
});
// ↑ Save ALL query states (memento)

// From useDeleteMany.ts (lines 483-487)

// STEP 2: RESTORE state (on error)
if (context) {
  for (const query of context.previousQueries) {
    queryClient.setQueryData(query[0], query[1]);
    // ↑ Restore ALL queries from memento! ↩️
  }
}

// Result: Complete bulk rollback! ✅
```

#### Complete Save & Restore Flow:

```typescript
// Example: Delete 3 posts [1, 2, 3]

// BEFORE DELETE:
Cache state: {
  "posts-list": [
    { id: 1, title: "Post 1" }, // ← Will delete
    { id: 2, title: "Post 2" }, // ← Will delete
    { id: 3, title: "Post 3" }, // ← Will delete
    { id: 4, title: "Post 4" },
    { id: 5, title: "Post 5" }
  ],
  "posts-many": [...],
  "posts-one-1": { id: 1, ... },
  "posts-one-2": { id: 2, ... },
  "posts-one-3": { id: 3, ... }
}


// STEP 1 - onMutate (SAVE):
previousQueries = [
  ["posts-list", [Post 1, Post 2, Post 3, Post 4, Post 5]], // ← SAVED!
  ["posts-many", [...]],                                      // ← SAVED!
  ["posts-one-1", { id: 1, ... }],                           // ← SAVED!
  ["posts-one-2", { id: 2, ... }],                           // ← SAVED!
  ["posts-one-3", { id: 3, ... }]                            // ← SAVED!
]


// STEP 2 - onMutate (UPDATE optimistically):
Cache state: {
  "posts-list": [
    // Posts 1, 2, 3 removed! ⚡
    { id: 4, title: "Post 4" },
    { id: 5, title: "Post 5" }
  ],
  "posts-many": [Post 4, Post 5],
  "posts-one-1": null,  // ← Removed!
  "posts-one-2": null,  // ← Removed!
  "posts-one-3": null   // ← Removed!
}


// STEP 3A - onSuccess:
// Keep optimistic update ✅
// No rollback needed!


// STEP 3B - onError (if API fails):
// RESTORE ALL from previousQueries ↩️
Cache state: {
  "posts-list": [
    { id: 1, title: "Post 1" }, // ← RESTORED! ↩️
    { id: 2, title: "Post 2" }, // ← RESTORED! ↩️
    { id: 3, title: "Post 3" }, // ← RESTORED! ↩️
    { id: 4, title: "Post 4" },
    { id: 5, title: "Post 5" }
  ],
  "posts-many": [Post 1, 2, 3, 4, 5], // ← RESTORED! ↩️
  "posts-one-1": { id: 1, ... },      // ← RESTORED! ↩️
  "posts-one-2": { id: 2, ... },      // ← RESTORED! ↩️
  "posts-one-3": { id: 3, ... }       // ← RESTORED! ↩️
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Atomic** - All or nothing (no partial state)
- ✅ **Consistency** - Cache always correct
- ✅ **User Trust** - No corrupted UI
- ✅ **Error Recovery** - Complete rollback

---

### 2.5 Composite Pattern - Aggregate Results

#### 🧩 VÍ DỤ ĐỜI THƯỜNG: Team Project Grading

```
Grading 5 Student Projects:

Individual grades:
→ Student 1: Pass ✅
→ Student 2: Pass ✅
→ Student 3: Fail ❌
→ Student 4: Pass ✅
→ Student 5: Pass ✅

Aggregate result:
→ 4 passed, 1 failed
→ Overall: Partially successful ⚠️

deleteMany with fallback does the same:
deleteOne([1]) → Success ✅
deleteOne([2]) → Success ✅
deleteOne([3]) → Failed ❌
deleteOne([4]) → Success ✅
deleteOne([5]) → Success ✅
→ Aggregate: Partial success ⚠️
```

**Composite Pattern** = Combine multiple results into one

#### Implementation:

```typescript
// handleMultiple aggregates results:
return handleMultiple(
  ids.map((id) =>
    selectedDataProvider.deleteOne({
      resource: resource.name,
      id,
      ...
    })
  )
);

// handleMultiple logic (conceptual):
const handleMultiple = async (promises) => {
  const results = await Promise.all(promises);
  // ↑ Wait for all deleteOne() calls

  // Aggregate into single response:
  return {
    data: results.map(r => r.data) // Combine all results
  };
};

// Result:
// Input: [deleteOne(1), deleteOne(2), deleteOne(3)]
// Output: { data: [{}, {}, {}] }
// ↑ Single aggregated response! ✅
```

#### Visual Aggregation:

```
DELETE 3 posts [1, 2, 3] with fallback:

Individual Operations:
┌─────────────────────┐
│ deleteOne(1)        │ → { data: {} } ✅
└─────────────────────┘
┌─────────────────────┐
│ deleteOne(2)        │ → { data: {} } ✅
└─────────────────────┘
┌─────────────────────┐
│ deleteOne(3)        │ → { data: {} } ✅
└─────────────────────┘

Aggregation (handleMultiple):
┌─────────────────────────────────┐
│ Combine all results             │
├─────────────────────────────────┤
│ { data: [{}, {}, {}] }          │
│ ↑ Single DeleteManyResponse     │
└─────────────────────────────────┘

Result: Components see 1 response,
        not 3 separate responses! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Unified Interface** - Same response format
- ✅ **Abstraction** - Hide fallback complexity
- ✅ **Consistent** - Always DeleteManyResponse
- ✅ **Simplicity** - Easy to consume

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                    | Ví dụ đời thường          | Giải quyết vấn đề gì              | Trong useDeleteMany                     |
| -------------------------- | ------------------------- | --------------------------------- | --------------------------------------- |
| **Strategy with Fallback** | Truck delivery vs courier | Try best, fallback if unavailable | deleteMany() or deleteOne() x N         |
| **Batch Processing**       | Dishwasher vs hand wash   | Process multiple items together   | Single API call vs N calls              |
| **Optimistic Update**      | Gmail bulk delete         | Instant UI for bulk operations    | Remove all items before server confirms |
| **Memento**                | Photo album backup        | Save/restore entire state         | Save cache, restore all on error        |
| **Composite**              | Team project grading      | Aggregate multiple results        | Combine deleteOne() results             |

---

## 3. KEY FEATURES

### 3.1 Smart Fallback Strategy

```typescript
// AUTO-DETECTS provider capability:

// Provider WITH deleteMany (modern):
mutate({ ids: [1, 2, 3, 4, 5] });
// → Calls: deleteMany([1,2,3,4,5])
// → 1 API call ⚡

// Provider WITHOUT deleteMany (legacy):
mutate({ ids: [1, 2, 3, 4, 5] });
// → Calls: deleteOne(1), deleteOne(2), ...
// → 5 API calls (slower but works) ✅
```

### 3.2 Three Mutation Modes

```typescript
// MODE 1: Pessimistic (Wait)
mutate({ ids: [1, 2, 3], mutationMode: "pessimistic" });
// Timeline: Wait → Delete → Update UI

// MODE 2: Optimistic (Instant)
mutate({ ids: [1, 2, 3], mutationMode: "optimistic" });
// Timeline: Update UI → Delete (background)

// MODE 3: Undoable (Instant + Undo)
mutate({
  ids: [1, 2, 3],
  mutationMode: "undoable",
  undoableTimeout: 5000,
});
// Timeline: Update UI → Wait 5s → Delete
```

### 3.3 Comprehensive Cache Updates

```typescript
// Automatically updates ALL caches:
// 1. List cache (removes all items)
// 2. Many cache (removes all items)
// 3. Detail caches (removes each item)

// For 5 items [1,2,3,4,5]:
// - posts-list: Filters out all 5 ✅
// - posts-many: Filters out all 5 ✅
// - posts-one-1: Removed ✅
// - posts-one-2: Removed ✅
// - posts-one-3: Removed ✅
// - posts-one-4: Removed ✅
// - posts-one-5: Removed ✅
```

### 3.4 Bulk Error Rollback

```typescript
// On error (optimistic/undoable modes):
// ALL items restored from memento ↩️

// Before: [Post 1, Post 2, Post 3, Post 4, Post 5]
// Optimistic: [Post 4, Post 5] (removed 1,2,3) ⚡
// Error: [Post 1, Post 2, Post 3, Post 4, Post 5] ↩️
// ↑ Complete rollback! All 3 restored!
```

### 3.5 Bulk Realtime Events

```typescript
// On success:
publish({
  channel: `resources/${resource.name}`,
  type: "deleted",
  payload: { ids: [1, 2, 3, 4, 5] }, // ← All IDs!
});

// Other users/tabs notified of bulk deletion! ✅
```

---

## 4. COMMON USE CASES

### 4.1 Bulk Delete with Selection

```tsx
function DataTable() {
  const { data } = useList({ resource: "posts" });
  const { mutate } = useDeleteMany();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.length} posts?`)) {
      mutate({
        resource: "posts",
        ids: selectedIds,
        mutationMode: "optimistic",
      });
      setSelectedIds([]); // Clear selection
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const selectAll = () => {
    setSelectedIds(data?.data.map((p) => p.id) || []);
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  return (
    <div>
      <div>
        <button onClick={selectAll}>Select All</button>
        <button onClick={clearSelection}>Clear</button>
        <button onClick={handleBulkDelete} disabled={selectedIds.length === 0}>
          Delete {selectedIds.length} Selected
        </button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Select</th>
            <th>Title</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map((post) => (
            <tr key={post.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(post.id)}
                  onChange={() => toggleSelection(post.id)}
                />
              </td>
              <td>{post.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 4.2 Delete All Filtered Items

```tsx
function FilteredList() {
  const [filters, setFilters] = useState({ status: "draft" });
  const { data } = useList({
    resource: "posts",
    filters: [{ field: "status", operator: "eq", value: filters.status }],
  });
  const { mutate } = useDeleteMany();

  const handleDeleteAllFiltered = () => {
    const ids = data?.data.map((p) => p.id) || [];

    if (confirm(`Delete all ${ids.length} draft posts?`)) {
      mutate({
        resource: "posts",
        ids,
        mutationMode: "undoable",
        undoableTimeout: 5000,
      });
    }
  };

  return (
    <div>
      <select
        value={filters.status}
        onChange={(e) => setFilters({ status: e.target.value })}
      >
        <option value="draft">Drafts</option>
        <option value="published">Published</option>
      </select>

      <button onClick={handleDeleteAllFiltered}>
        Delete All {data?.total} {filters.status} Posts
      </button>

      {/* List items... */}
    </div>
  );
}
```

### 4.3 Cleanup Old Records

```tsx
function CleanupOldRecords() {
  const { mutate } = useDeleteMany();
  const queryClient = useQueryClient();

  const handleCleanupOld = async () => {
    // Get all posts older than 1 year
    const oldPosts = await queryClient.fetchQuery({
      queryKey: ["posts", "old"],
      queryFn: async () => {
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const response = await fetch(
          `/api/posts?createdAt_lt=${oneYearAgo.toISOString()}`,
        );
        return response.json();
      },
    });

    const oldIds = oldPosts.data.map((p) => p.id);

    if (confirm(`Delete ${oldIds.length} old posts?`)) {
      mutate({
        resource: "posts",
        ids: oldIds,
        successNotification: {
          message: `Cleaned up ${oldIds.length} old posts`,
          type: "success",
        },
      });
    }
  };

  return (
    <button onClick={handleCleanupOld}>Cleanup Posts Older Than 1 Year</button>
  );
}
```

### 4.4 Delete with Undo

```tsx
function UndoableDelete() {
  const { mutate } = useDeleteMany();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleDeleteWithUndo = () => {
    mutate({
      resource: "posts",
      ids: selectedIds,
      mutationMode: "undoable",
      undoableTimeout: 5000, // 5 seconds
      successNotification: {
        message: `${selectedIds.length} posts deleted`,
        description: "You can undo this action within 5 seconds",
        type: "success",
        undoableTimeout: 5000,
      },
    });
  };

  return (
    <button onClick={handleDeleteWithUndo}>
      Delete {selectedIds.length} (can undo in 5s)
    </button>
  );
}
```

### 4.5 Batch Delete with Progress

```tsx
function BatchDeleteWithProgress() {
  const { mutate, mutation } = useDeleteMany();
  const [progress, setProgress] = useState(0);

  const handleBatchDelete = (ids: number[]) => {
    setProgress(0);

    mutate({
      resource: "posts",
      ids,
      onSuccess: () => {
        setProgress(100);
      },
    });

    // Simulate progress (in reality, track via mutation state)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div>
      <button onClick={() => handleBatchDelete([1, 2, 3, 4, 5])}>
        Delete 5 Posts
      </button>

      {mutation.isPending && (
        <div>
          <div>Deleting... {progress}%</div>
          <progress value={progress} max={100} />
        </div>
      )}
    </div>
  );
}
```

### 4.6 Conditional Bulk Delete

```tsx
function ConditionalBulkDelete() {
  const { mutate } = useDeleteMany();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleConditionalDelete = async () => {
    // Check if posts can be deleted (e.g., no comments)
    const checks = await Promise.all(
      selectedIds.map(async (id) => {
        const response = await fetch(`/api/posts/${id}/can-delete`);
        const { canDelete } = await response.json();
        return { id, canDelete };
      }),
    );

    const canDelete = checks.filter((c) => c.canDelete).map((c) => c.id);
    const cannotDelete = checks.filter((c) => !c.canDelete);

    if (cannotDelete.length > 0) {
      alert(`${cannotDelete.length} posts have comments and cannot be deleted`);
    }

    if (canDelete.length > 0 && confirm(`Delete ${canDelete.length} posts?`)) {
      mutate({
        resource: "posts",
        ids: canDelete,
      });
    }
  };

  return (
    <button onClick={handleConditionalDelete}>
      Delete Selected (with validation)
    </button>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Smart Fallback Strategy?

**Answer:** Maximum compatibility with all providers

```typescript
// OPTION 1: Require deleteMany (strict)
// ❌ Problem: Breaks with providers without deleteMany
// ❌ Result: Limited compatibility

// OPTION 2: Always use deleteOne loop (simple)
// ❌ Problem: Slow even with modern providers
// ❌ Result: Poor performance

// OPTION 3: Smart fallback (chosen) ✅
// ✅ Benefit: Works with ALL providers
// ✅ Benefit: Optimal performance when available
// ✅ Benefit: Graceful degradation
```

### 5.2 Why Bulk Optimistic Updates?

**Answer:** Better UX for bulk operations

```typescript
// Scenario: Delete 50 items

// WITHOUT optimistic:
// - User waits 2-3 seconds ⏳
// - UI freezes
// - Bad UX ❌

// WITH optimistic:
// - All 50 items disappear instantly ⚡
// - UI responsive
// - Excellent UX ✅
```

### 5.3 Why handleMultiple for Fallback?

**Answer:** Aggregate individual results into unified response

```typescript
// Without handleMultiple:
// Returns: [result1, result2, result3, ...]
// Type: Array<DeleteOneResponse>
// ❌ Inconsistent with deleteMany response

// With handleMultiple:
// Returns: { data: [...] }
// Type: DeleteManyResponse
// ✅ Consistent response format
// ✅ Components don't care about fallback
```

---

## 6. COMMON PITFALLS

### 6.1 Not Confirming Bulk Delete

```tsx
// ❌ WRONG - Delete without confirmation
<button onClick={() => mutate({ resource: "posts", ids: selectedIds })}>
  Delete {selectedIds.length} Posts
</button>
// User accidentally clicks! Many items lost! ❌

// ✅ CORRECT - Confirm first
<button onClick={() => {
  if (confirm(`Delete ${selectedIds.length} posts?`)) {
    mutate({ resource: "posts", ids: selectedIds });
  }
}}>
  Delete {selectedIds.length} Posts
</button>
```

### 6.2 Empty IDs Array

```tsx
// ❌ WRONG - Not checking empty array
const handleBulkDelete = () => {
  mutate({ resource: "posts", ids: selectedIds });
  // If selectedIds is [], still calls API! ❌
};

// ✅ CORRECT - Check before calling
const handleBulkDelete = () => {
  if (selectedIds.length === 0) {
    alert("Please select items to delete");
    return;
  }
  mutate({ resource: "posts", ids: selectedIds });
};
```

### 6.3 Not Clearing Selection After Delete

```tsx
// ❌ WRONG - Selection still active
const handleBulkDelete = () => {
  mutate({ resource: "posts", ids: selectedIds });
  // selectedIds still has deleted IDs! ❌
};

// ✅ CORRECT - Clear selection
const handleBulkDelete = () => {
  mutate({
    resource: "posts",
    ids: selectedIds,
    onSuccess: () => {
      setSelectedIds([]); // Clear! ✅
    },
  });
};
```

### 6.4 Performance with Large Fallback

```tsx
// ⚠️ CAUTION - Deleting 1000 items with fallback
mutate({ resource: "posts", ids: Array.from({ length: 1000 }, (_, i) => i) });
// If provider lacks deleteMany:
// → 1000 API calls! ⏳
// → 10+ seconds!
// → May timeout! ❌

// ✅ BETTER - Batch in chunks or use provider with deleteMany
const deleteInChunks = async (ids: number[]) => {
  const chunkSize = 100;
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    await mutateAsync({ resource: "posts", ids: chunk });
  }
};
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 deleteMany vs deleteOne Loop

```
Delete 100 items:

WITH deleteMany (native):
- API calls: 1
- Network time: ~100ms
- Server time: ~50ms (batch SQL)
- Total: ~150ms ⚡

WITHOUT deleteMany (fallback):
- API calls: 100
- Network time: ~10,000ms (100 x 100ms)
- Server time: ~5,000ms (100 x 50ms)
- Total: ~15,000ms ⏳

Performance difference: 100x! ⚡
```

### 7.2 Optimistic vs Pessimistic for Bulk

```
Bulk delete 50 items:

PESSIMISTIC:
- User waits for all 50 deletions
- Perceived delay: 2-5 seconds ⏳
- UX: Poor ❌

OPTIMISTIC:
- All 50 disappear instantly
- Perceived delay: 0ms ⚡
- UX: Excellent ✅

Recommendation: Use optimistic for bulk! ⚡
```

---

## 8. TESTING

### 8.1 Test deleteMany (Native)

```typescript
describe("useDeleteMany - native deleteMany", () => {
  it("should use deleteMany if available", async () => {
    const mockDeleteMany = jest.fn(() => Promise.resolve({ data: [] }));

    const { result } = renderHook(() => useDeleteMany(), {
      wrapper: createWrapper({ deleteMany: mockDeleteMany }),
    });

    act(() => {
      result.current.mutate({
        resource: "posts",
        ids: [1, 2, 3],
      });
    });

    await waitFor(() => {
      expect(mockDeleteMany).toHaveBeenCalledWith({
        resource: "posts",
        ids: [1, 2, 3],
        meta: expect.any(Object),
        variables: undefined,
      });
    });

    // Should call ONCE (not 3 times)
    expect(mockDeleteMany).toHaveBeenCalledTimes(1);
  });
});
```

### 8.2 Test Fallback (deleteOne Loop)

```typescript
describe("useDeleteMany - fallback", () => {
  it("should fallback to deleteOne loop", async () => {
    const mockDeleteOne = jest.fn(() => Promise.resolve({ data: {} }));

    const { result } = renderHook(() => useDeleteMany(), {
      wrapper: createWrapper({
        deleteOne: mockDeleteOne,
        // NO deleteMany! ❌
      }),
    });

    act(() => {
      result.current.mutate({
        resource: "posts",
        ids: [1, 2, 3],
      });
    });

    await waitFor(() => {
      expect(mockDeleteOne).toHaveBeenCalledTimes(3);
    });

    expect(mockDeleteOne).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ id: 1 }),
    );
    expect(mockDeleteOne).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ id: 2 }),
    );
    expect(mockDeleteOne).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ id: 3 }),
    );
  });
});
```

### 8.3 Test Bulk Optimistic Update

```typescript
describe("useDeleteMany - optimistic", () => {
  it("should update cache immediately", async () => {
    queryClient.setQueryData(["posts", "list"], {
      data: [
        { id: 1, title: "Post 1" },
        { id: 2, title: "Post 2" },
        { id: 3, title: "Post 3" },
      ],
      total: 3,
    });

    const { result } = renderHook(() => useDeleteMany(), { wrapper });

    act(() => {
      result.current.mutate({
        resource: "posts",
        ids: [1, 2],
        mutationMode: "optimistic",
      });
    });

    // Cache updated IMMEDIATELY (before API)
    const cacheAfter = queryClient.getQueryData(["posts", "list"]);
    expect(cacheAfter.data).toHaveLength(1); // Only Post 3
    expect(cacheAfter.total).toBe(1);
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy with Fallback**: deleteMany() or deleteOne() x N
- ✅ **Batch Processing**: Single API call vs multiple calls
- ✅ **Optimistic Update**: Remove all items instantly
- ✅ **Memento**: Save cache, restore all on error
- ✅ **Composite**: Aggregate multiple results

### Key Features

1. **Smart Fallback** - Works with any provider
2. **Bulk Operations** - Delete multiple items efficiently
3. **3 Mutation Modes** - Pessimistic/Optimistic/Undoable
4. **Bulk Optimistic Updates** - All items removed instantly
5. **Complete Rollback** - All items restored on error

### Khi nào dùng useDeleteMany?

✅ **Nên dùng:**

- Delete multiple records
- Bulk operations (select all, delete filtered, etc.)
- Cleanup old data
- User selections in tables

❌ **Không dùng:**

- Delete single record (use useDelete)
- No fallback needed (ensure provider has deleteMany)

### Remember

✅ **533 lines** - Bulk delete with smart fallback
🔄 **Smart Fallback** - deleteMany() or deleteOne() x N
📦 **Batch** - Efficient bulk operations
⚡ **Optimistic** - All items removed instantly
💾 **Memento** - Complete rollback on error
🧩 **Composite** - Aggregate results

### Performance Tips

1. **Use providers with deleteMany** - 100x faster than fallback
2. **Use optimistic mode** - Instant UI for better UX
3. **Batch large deletions** - Don't delete 10,000 items at once
4. **Confirm bulk actions** - Prevent accidental deletions

---

> 📚 **Best Practice**: Use **providers with native deleteMany** support for best performance. Enable **optimistic mode** for instant UI feedback. Always **confirm bulk deletions** to prevent accidents. For very large deletions, consider **batching in chunks** or **background jobs**!
