# Kiến trúc và Design Patterns của useUpdateMany Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          DATA MUTATION SYSTEM (BATCH)             │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useUpdate → Update single record                │  │
│  │                                                   │  │
│  │  useUpdateMany ✅ (THIS HOOK - BATCH UPDATE!)    │  │
│  │    → Update MULTIPLE records at once             │  │
│  │         │                                         │  │
│  │         ├──→ TWO STRATEGIES:                     │  │
│  │         │     1. Native updateMany (1 API call) ⚡│  │
│  │         │     2. Fallback: Multiple update calls│  │
│  │         │                                         │  │
│  │         ├──→ BATCH OPTIMISTIC UPDATES:          │  │
│  │         │     - Update ALL records instantly     │  │
│  │         │     - IDs filter: ids.includes(id)     │  │
│  │         │     - Rollback ALL on error            │  │
│  │         │                                         │  │
│  │         ├──→ INVALIDATION:                       │  │
│  │         │     - List (all records)               │  │
│  │         │     - Many (batch queries)             │  │
│  │         │     - Detail (each ID individually)    │  │
│  │         │                                         │  │
│  │         └──→ AUDIT LOGGING:                     │  │
│  │               - Track previous values (array)   │  │
│  │               - One log entry for batch          │  │
│  │                                                   │  │
│  │  useDeleteMany → Delete multiple records         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Batch update multiple records with single mutation - The bulk edit hook**

### 1.2 Complete Flow - Native vs Fallback

```
┌──────────────────────────────────────────────────────────────┐
│           STRATEGY 1: Native updateMany (Best) ⚡             │
└──────────────────────────────────────────────────────────────┘

mutate({
  resource: "posts",
  ids: [1, 2, 3, 4, 5],  // ← 5 records
  values: { status: "published" }
});

IF dataProvider.updateMany exists:

1. Single API call:
   PUT /posts/batch
   Body: {
     ids: [1, 2, 3, 4, 5],
     values: { status: "published" }
   }

2. Server processes ALL in one transaction ✅

3. Response:
   {
     data: [
       { id: 1, status: "published" },
       { id: 2, status: "published" },
       ...
     ]
   }

Timeline:
T0: Mutate → 1 API call
T1: Response → All updated! ✅

Benefits:
✅ Fast (1 API call)
✅ Atomic (transaction)
✅ Efficient (server-side batch)

┌──────────────────────────────────────────────────────────────┐
│         STRATEGY 2: Fallback to Multiple update() 🔄         │
└──────────────────────────────────────────────────────────────┘

IF dataProvider.updateMany NOT exists:

1. Fallback to handleMultiple():
   Promise.all([
     update({ id: 1, values: {...} }),
     update({ id: 2, values: {...} }),
     update({ id: 3, values: {...} }),
     update({ id: 4, values: {...} }),
     update({ id: 5, values: {...} })
   ])

2. Five separate API calls:
   PUT /posts/1 { status: "published" }
   PUT /posts/2 { status: "published" }
   PUT /posts/3 { status: "published" }
   PUT /posts/4 { status: "published" }
   PUT /posts/5 { status: "published" }

3. All execute in parallel ⚡

4. Wait for ALL to complete

Timeline:
T0: Mutate → 5 API calls (parallel)
T1: All responses → All updated! ✅

Benefits:
✅ Works with any data provider
⚠️ Slower (multiple API calls)
⚠️ Not atomic (partial success possible)
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useUpdateMany.ts: 709 dòng** - Batch update system!

---

### 2.1 Batch Processing Pattern - Process Multiple Items Together

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Package Shipping

```
Shipping Items:

Individual Shipping (useUpdate):
→ Ship item 1 (separate box)
→ Ship item 2 (separate box)
→ Ship item 3 (separate box)
→ Result: 3 shipping fees! 💸

Batch Shipping (useUpdateMany):
→ Pack items 1, 2, 3 in ONE box
→ Ship ALL together
→ Result: 1 shipping fee! ✅

useUpdateMany:
→ Update posts [1, 2, 3]
→ ONE mutation (batch)
→ Efficient! ⚡
```

**Batch Processing** = Process multiple items as a group

#### Implementation:

```typescript
// Native batch (best)
if (dataProvider.updateMany) {
  return dataProvider.updateMany({
    resource: "posts",
    ids: [1, 2, 3, 4, 5],
    values: { status: "published" },
  });
  // → 1 API call: PUT /posts/batch
}

// Fallback: Multiple calls
return handleMultiple(
  ids.map((id) =>
    dataProvider.update({
      resource: "posts",
      id,
      values: { status: "published" },
    }),
  ),
);
// → 5 API calls: PUT /posts/1, PUT /posts/2, ...
// → Promise.all() waits for ALL
```

#### Real Example - Bulk Status Update:

```tsx
function BulkPublisher({ selectedIds }) {
  const { mutate } = useUpdateMany();

  const handlePublishAll = () => {
    mutate({
      resource: "posts",
      ids: selectedIds, // [1, 2, 3, ..., 100]
      values: { status: "published" },
    });

    // If dataProvider.updateMany:
    //   → 1 API call for 100 posts! ⚡
    // Else:
    //   → 100 parallel API calls
  };

  return (
    <div>
      <p>Selected: {selectedIds.length} posts</p>
      <Button onClick={handlePublishAll}>Publish All</Button>
    </div>
  );
}
```

#### Batch Optimistic Update:

```typescript
// Update ALL selected records in cache
onMutate: async ({ ids, values }) => {
  queryClient.setQueriesData({ queryKey: ["posts", "list"] }, (old) => ({
    ...old,
    data: old.data.map((post) =>
      ids.includes(post.id)
        ? { ...post, ...values } // ← Update if ID in batch!
        : post,
    ),
  }));

  // All selected posts updated in cache! ✅
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Efficiency** - Process multiple items at once
- ✅ **Performance** - Fewer API calls (if native)
- ✅ **Atomic** - All succeed or all fail (if native)
- ✅ **UX** - Bulk operations (select all → update)

---

### 2.2 Composite Pattern - Treat Single and Multiple Uniformly

#### 🌳 VÍ DỤ ĐỜI THƯỜNG: File System

```
File System:

File (Leaf):
→ file.delete()

Folder (Composite):
→ Contains: [file1, file2, file3]
→ folder.delete()
→ Internally: file1.delete(), file2.delete(), file3.delete()

Same interface! ✅

useUpdate vs useUpdateMany:

useUpdate (Single):
→ update({ id: 1, values: {...} })

useUpdateMany (Composite):
→ updateMany({ ids: [1,2,3], values: {...} })
→ Internally: update(1), update(2), update(3)

Same pattern! ✅
```

**Composite Pattern** = Uniform interface for single and multiple

#### Implementation:

```typescript
// BASE OPERATION: Single update
interface DataProvider {
  update: (params) => Promise<UpdateResponse>;
  updateMany?: (params) => Promise<UpdateManyResponse>; // ← Optional!
}

// COMPOSITE: Batch update
const mutationFn = () => {
  // Try native batch first
  if (selectedDataProvider.updateMany) {
    return selectedDataProvider.updateMany({
      resource: "posts",
      ids: [1, 2, 3],
      values: { status: "published" },
    });
  }

  // Fallback: Compose multiple single operations
  return handleMultiple(
    ids.map((id) =>
      selectedDataProvider.update({
        resource: "posts",
        id,
        values: { status: "published" },
      }),
    ),
  );
};

// Same result, different execution! ✅
```

#### handleMultiple Helper:

```typescript
// Executes multiple promises and combines results
export const handleMultiple = async <T>(
  promises: Promise<T>[]
): Promise<{ data: T[] }> => {
  const results = await Promise.all(promises);
  return {
    data: results.map(r => r.data)
  };
};

// Usage:
const result = await handleMultiple([
  update({ id: 1, values: {...} }),
  update({ id: 2, values: {...} }),
  update({ id: 3, values: {...} })
]);

// result.data = [
//   { id: 1, status: "published" },
//   { id: 2, status: "published" },
//   { id: 3, status: "published" }
// ]
```

#### Real Example:

```tsx
// REST Data Provider (native batch)
const restDataProvider = {
  updateMany: async ({ resource, ids, variables }) => {
    const { data } = await axios.put(`/${resource}/batch`, {
      ids,
      ...variables,
    });
    return { data };
  },
};

// Simple Data Provider (fallback)
const simpleDataProvider = {
  update: async ({ resource, id, variables }) => {
    const { data } = await axios.put(`/${resource}/${id}`, variables);
    return { data };
  },
  // No updateMany! ❌
  // → useUpdateMany will use handleMultiple fallback ✅
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Works with any data provider
- ✅ **Graceful Degradation** - Fallback to multiple calls
- ✅ **Uniform API** - Same hook interface
- ✅ **Backend Agnostic** - Native or composed

---

### 2.3 Filter Pattern - Batch Optimistic Updates

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Bulk Email

```
Email Client:

Select emails: [1, 3, 5, 7, 9]
Mark as read

Inbox updates:
→ For each email in inbox:
    → If email.id in [1,3,5,7,9]:
        → Mark as read ✅
    → Else:
        → Keep as-is

useUpdateMany optimistic update:
→ For each post in cache:
    → If post.id in [1,2,3,4,5]:
        → Apply update ✅
    → Else:
        → Keep unchanged
```

**Filter Pattern** = Select subset, transform only matching items

#### Implementation:

```typescript
onMutate: async ({ ids, values }) => {
  // Update list cache
  queryClient.setQueriesData({ queryKey: ["posts", "list"] }, (previous) => ({
    ...previous,
    data: previous.data.map((record) => {
      // FILTER: Check if ID in batch
      if (
        record.id !== undefined &&
        ids
          .filter((id) => id !== undefined)
          .map(String)
          .includes(record.id.toString())
      ) {
        // TRANSFORM: Apply update
        return {
          ...record,
          ...values,
        };
      }

      // KEEP: No change
      return record;
    }),
  }));
};
```

#### Visualization:

```
Cache Before:
posts.list.data = [
  { id: 1, title: "A", status: "draft" },
  { id: 2, title: "B", status: "draft" },
  { id: 3, title: "C", status: "draft" },
  { id: 4, title: "D", status: "draft" },
  { id: 5, title: "E", status: "draft" }
]

Batch Update:
mutate({
  ids: [1, 3, 5],
  values: { status: "published" }
})

Filter & Transform:
[
  { id: 1, ... } → IDs: [1,3,5] → includes(1)? YES → Update! ✅
  { id: 2, ... } → IDs: [1,3,5] → includes(2)? NO  → Keep
  { id: 3, ... } → IDs: [1,3,5] → includes(3)? YES → Update! ✅
  { id: 4, ... } → IDs: [1,3,5] → includes(4)? NO  → Keep
  { id: 5, ... } → IDs: [1,3,5] → includes(5)? YES → Update! ✅
]

Cache After:
posts.list.data = [
  { id: 1, title: "A", status: "published" },  ✅
  { id: 2, title: "B", status: "draft" },
  { id: 3, title: "C", status: "published" },  ✅
  { id: 4, title: "D", status: "draft" },
  { id: 5, title: "E", status: "published" }   ✅
]
```

#### Detail Cache Updates:

```typescript
// Update EACH detail cache individually
if (optimisticUpdateMap.detail) {
  for (const id of ids) {
    // ← Loop through IDs!
    queryClient.setQueriesData(
      { queryKey: ["posts", "one", id] },
      (previous) => ({
        ...previous,
        data: {
          ...previous.data,
          ...values,
        },
      }),
    );
  }
}

// Result: All detail caches for [1,3,5] updated! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Selective Update** - Only matching records
- ✅ **Preserve Others** - Non-matching unchanged
- ✅ **Efficient** - Single pass through cache
- ✅ **Precise** - Exact ID matching

---

### 2.4 Fan-Out Pattern - Invalidate Multiple Caches

#### 📡 VÍ DỤ ĐỜI THƯỜNG: Breaking News

```
News Agency publishes story:

Fan-Out to:
→ TV stations (broadcast)
→ Radio stations (broadcast)
→ Newspapers (print)
→ Websites (publish)
→ Social media (tweet)

All channels updated! 📢

useUpdateMany invalidation:

Batch update posts [1,2,3]:

Fan-Out invalidation:
→ List queries (all posts)
→ Many queries (batch queries)
→ Detail query for post #1
→ Detail query for post #2
→ Detail query for post #3

All caches refreshed! ✅
```

**Fan-Out Pattern** = One event triggers multiple actions

#### Implementation:

```typescript
onSettled: ({ ids }) => {
  // INVALIDATE 1: List (once for all)
  invalidateStore({
    resource: "posts",
    invalidates: ["list", "many"],
  });

  // INVALIDATE 2: Detail (for each ID)
  ids.forEach((id) => {
    invalidateStore({
      resource: "posts",
      invalidates: ["detail"],
      id, // ← Specific ID!
    });
  });
};

// Timeline:
// T0: Update complete
// T1: Invalidate list → Refetch all posts
// T2: Invalidate many → Refetch batch queries
// T3: Invalidate detail #1 → Refetch post #1
// T4: Invalidate detail #2 → Refetch post #2
// T5: Invalidate detail #3 → Refetch post #3

// All caches fresh! ✅
```

#### Visualization:

```
Batch Update: ids = [5, 10, 15]

┌─────────────────────────────────────────────────┐
│            FAN-OUT INVALIDATION                 │
└─────────────────────────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          │           │           │
          ▼           ▼           ▼
      ┌────────┐  ┌──────┐  ┌─────────┐
      │ LIST   │  │ MANY │  │ DETAIL  │
      │ (once) │  │(once)│  │ (3x)    │
      └────────┘  └──────┘  └─────────┘
          │           │           │
          │           │           ├──→ Detail #5
          │           │           ├──→ Detail #10
          │           │           └──→ Detail #15
          │           │
          ▼           ▼
    All posts     Batch queries
    refetched     refetched

Total invalidations:
- 1x list
- 1x many
- 3x detail (one per ID)
= 5 invalidations for 3 records ✅
```

#### Real Example:

```tsx
function BulkArchiver({ selectedIds }) {
  const { mutate } = useUpdateMany({
    mutationOptions: {
      onSettled: () => {
        console.log("Invalidations triggered:");
        console.log("- List query (all posts)");
        console.log("- Many queries (batch)");
        selectedIds.forEach((id) => {
          console.log(`- Detail query #${id}`);
        });
      },
    },
  });

  const handleArchive = () => {
    mutate({
      resource: "posts",
      ids: selectedIds, // [1, 2, 3, 4, 5]
      values: { status: "archived" },
    });

    // After success:
    // → List refetches (shows updated list)
    // → Detail #1 refetches (if viewing)
    // → Detail #2 refetches (if viewing)
    // → ... all updated! ✅
  };
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Comprehensive** - All affected caches updated
- ✅ **Automatic** - No manual invalidation
- ✅ **Efficient** - List/many once, detail per ID
- ✅ **Consistency** - All views synchronized

---

### 2.5 Aggregate Pattern - Combine Multiple Results

#### 📊 VÍ DỤ ĐỜI THƯỜNG: Sales Report

```
Daily Sales:
→ Store 1: $1000
→ Store 2: $1500
→ Store 3: $800

Aggregate Report:
→ Total: $3300
→ Average: $1100
→ Stores: 3

handleMultiple:
→ Update post #1: success
→ Update post #2: success
→ Update post #3: success

Aggregate Result:
{
  data: [
    { id: 1, status: "published" },
    { id: 2, status: "published" },
    { id: 3, status: "published" }
  ]
}
```

**Aggregate Pattern** = Combine multiple results into one

#### Implementation:

```typescript
// handleMultiple aggregates results
export const handleMultiple = async <T>(
  promises: Promise<{ data: T }>[],
): Promise<{ data: T[] }> => {
  // Wait for ALL promises
  const results = await Promise.all(promises);

  // AGGREGATE: Combine into single response
  return {
    data: results.map((result) => result.data),
  };
};

// Usage in useUpdateMany:
const mutationFn = () => {
  if (!dataProvider.updateMany) {
    // Create array of promises
    const promises = ids.map((id) =>
      dataProvider.update({
        resource: "posts",
        id,
        values: { status: "published" },
      }),
    );

    // Aggregate results
    return handleMultiple(promises);

    // Result:
    // {
    //   data: [
    //     { id: 1, status: "published" },
    //     { id: 2, status: "published" },
    //     { id: 3, status: "published" }
    //   ]
    // }
  }
};
```

#### Audit Logging Aggregation:

```typescript
onSuccess: ({ ids, values, context }) => {
  // AGGREGATE: Collect previous data for all IDs
  const previousData: any[] = [];

  ids.forEach((id) => {
    const queryData = queryClient.getQueryData(["posts", "one", id]);

    // Extract relevant fields
    previousData.push(
      Object.keys(values).reduce((acc, key) => {
        acc[key] = queryData?.data?.[key];
        return acc;
      }, {}),
    );
  });

  // Log SINGLE entry with aggregated data
  log.mutate({
    action: "updateMany",
    resource: "posts",
    data: values, // New values (same for all)
    previousData, // Array of old values!
    meta: { ids },
  });

  // Audit log:
  // {
  //   action: "updateMany",
  //   data: { status: "published" },
  //   previousData: [
  //     { status: "draft" },    ← Post #1
  //     { status: "draft" },    ← Post #2
  //     { status: "draft" }     ← Post #3
  //   ]
  // }
};
```

#### Partial Success Handling:

```typescript
// If using fallback (multiple calls)
// Some might succeed, some might fail!

try {
  const result = await handleMultiple([
    update({ id: 1, values: {...} }),  // ✅ Success
    update({ id: 2, values: {...} }),  // ❌ Error!
    update({ id: 3, values: {...} })   // ✅ Success
  ]);
} catch (error) {
  // Promise.all fails if ANY promise fails!
  // Result: ALL or NOTHING ⚠️

  // Better approach: Promise.allSettled
  const results = await Promise.allSettled([
    update({ id: 1, values: {...} }),
    update({ id: 2, values: {...} }),
    update({ id: 3, values: {...} })
  ]);

  // Results:
  // [
  //   { status: "fulfilled", value: {...} },  ✅
  //   { status: "rejected", reason: {...} },  ❌
  //   { status: "fulfilled", value: {...} }   ✅
  // ]

  // Can handle partial success! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Combine Results** - Single response from multiple
- ✅ **Audit Trail** - Track all changes together
- ✅ **Error Handling** - All-or-nothing or partial
- ✅ **Reporting** - Aggregate stats

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern              | Ví dụ đời thường | Giải quyết vấn đề gì                | Trong useUpdateMany                        |
| -------------------- | ---------------- | ----------------------------------- | ------------------------------------------ |
| **Batch Processing** | Package shipping | Process multiple items together     | Update multiple records in one mutation    |
| **Composite**        | File system      | Uniform interface single/multiple   | Native batch or fallback to multiple calls |
| **Filter**           | Bulk email       | Select subset, transform matching   | Optimistic update only selected IDs        |
| **Fan-Out**          | Breaking news    | One event triggers multiple actions | Invalidate list once, detail per ID        |
| **Aggregate**        | Sales report     | Combine multiple results            | handleMultiple combines update results     |

---

## 3. KEY FEATURES

### 3.1 Native Batch vs Fallback

```typescript
// STRATEGY 1: Native (best)
if (dataProvider.updateMany) {
  return updateMany({
    ids: [1, 2, 3],
    values: { status: "published" },
  });
  // → 1 API call ⚡
  // → Atomic transaction ✅
}

// STRATEGY 2: Fallback
return handleMultiple(ids.map((id) => update({ id, values })));
// → 3 parallel API calls
// → Works anywhere ✅
```

### 3.2 Batch Optimistic Updates

```typescript
// Update ALL selected records
mutate({
  ids: [1, 3, 5],
  values: { status: "published" },
});

// Cache updates:
// List: Posts 1,3,5 → status = "published" ✅
// Many: Posts 1,3,5 → status = "published" ✅
// Detail #1: status = "published" ✅
// Detail #3: status = "published" ✅
// Detail #5: status = "published" ✅

// All caches synchronized! ⚡
```

### 3.3 Fan-Out Invalidation

```typescript
// After update [1, 2, 3]:
// → Invalidate list (once)
// → Invalidate many (once)
// → Invalidate detail #1
// → Invalidate detail #2
// → Invalidate detail #3

// Smart invalidation strategy! ✅
```

### 3.4 Aggregate Audit Logging

```typescript
log.mutate({
  action: "updateMany",
  data: { status: "published" },
  previousData: [
    { status: "draft" }, // Post #1 old value
    { status: "draft" }, // Post #2 old value
    { status: "draft" }, // Post #3 old value
  ],
  meta: { ids: [1, 2, 3] },
});

// Single log entry for batch! ✅
```

---

## 4. COMMON USE CASES

### 4.1 Bulk Status Update

```tsx
function BulkStatusUpdater() {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const { mutate } = useUpdateMany();

  const handlePublishSelected = () => {
    mutate({
      resource: "posts",
      ids: selectedIds,
      values: { status: "published" },
    });
  };

  return (
    <div>
      <Table
        rowSelection={{
          onChange: (ids) => setSelectedIds(ids),
        }}
      />
      <Button
        onClick={handlePublishSelected}
        disabled={selectedIds.length === 0}
      >
        Publish {selectedIds.length} Posts
      </Button>
    </div>
  );
}
```

### 4.2 Batch Edit Form

```tsx
function BatchEditor({ selectedIds }) {
  const { mutate } = useUpdateMany();

  const handleBatchEdit = (values) => {
    mutate({
      resource: "posts",
      ids: selectedIds,
      values,
    });
  };

  return (
    <Modal title={`Edit ${selectedIds.length} Posts`}>
      <Form onFinish={handleBatchEdit}>
        <Select name="category">
          <Option value="tech">Tech</Option>
          <Option value="news">News</Option>
        </Select>

        <Select name="status">
          <Option value="draft">Draft</Option>
          <Option value="published">Published</Option>
        </Select>

        <Button type="submit">Update All</Button>
      </Form>
    </Modal>
  );
}
```

### 4.3 Progressive Batch with Progress

```tsx
function ProgressiveBatchUpdater({ ids }) {
  const { mutateAsync } = useUpdateMany();
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);

  const handleBatchUpdate = async () => {
    setProcessing(true);

    // Process in chunks of 10
    const chunkSize = 10;
    const chunks = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
      chunks.push(ids.slice(i, i + chunkSize));
    }

    for (let i = 0; i < chunks.length; i++) {
      await mutateAsync({
        resource: "posts",
        ids: chunks[i],
        values: { processed: true },
      });

      setProgress(((i + 1) / chunks.length) * 100);
    }

    setProcessing(false);
  };

  return (
    <div>
      <Button onClick={handleBatchUpdate} loading={processing}>
        Process {ids.length} Records
      </Button>
      {processing && <Progress percent={progress} />}
    </div>
  );
}
```

### 4.4 Conditional Batch Update

```tsx
function ConditionalBulkUpdate() {
  const { result: posts } = useList({ resource: "posts" });
  const { mutate } = useUpdateMany();

  const handleArchiveOldPosts = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldPostIds = posts.data
      .filter(
        (post) =>
          new Date(post.createdAt) < thirtyDaysAgo && post.status === "draft",
      )
      .map((post) => post.id);

    if (oldPostIds.length > 0) {
      mutate({
        resource: "posts",
        ids: oldPostIds,
        values: { status: "archived" },
      });
    }
  };

  return <Button onClick={handleArchiveOldPosts}>Archive Old Drafts</Button>;
}
```

### 4.5 Batch with Different Values per ID

```tsx
function CustomBatchUpdate({ updates }) {
  const { mutateAsync } = useUpdateMany();

  // updates = [
  //   { id: 1, values: { title: "A" } },
  //   { id: 2, values: { title: "B" } },
  //   { id: 3, values: { title: "C" } }
  // ]

  const handleCustomBatch = async () => {
    // Group by values (if same)
    const grouped = new Map();

    updates.forEach(({ id, values }) => {
      const key = JSON.stringify(values);
      if (!grouped.has(key)) {
        grouped.set(key, { values, ids: [] });
      }
      grouped.get(key).ids.push(id);
    });

    // Execute batches
    for (const { values, ids } of grouped.values()) {
      await mutateAsync({
        resource: "posts",
        ids,
        values,
      });
    }
  };

  // If all have same values:
  //   → 1 batch call ✅
  // If different values:
  //   → Multiple batch calls (grouped)
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Native + Fallback Strategy?

**Answer:** Maximum compatibility with performance

```
Native updateMany:
- Best: 1 API call, atomic, server-side batch ✅
- But: Not all data providers support it ❌

Fallback to multiple update:
- Works everywhere ✅
- But: Multiple API calls, not atomic ⚠️

Solution: Try native first, fallback if unavailable
→ Best performance when available
→ Still works when not available
→ Win-win! ✅
```

### 5.2 Why Invalidate List Once but Detail Per ID?

**Answer:** Different cache scope

```
List cache:
- Scope: ALL posts
- Invalidate once: Refetches all ✅
- Efficient! ⚡

Detail cache:
- Scope: ONE post per ID
- Different keys: ["posts", "one", 1], ["posts", "one", 2]
- Must invalidate each separately ✅

Example:
Update [1, 2, 3]:
→ List: 1 invalidation → All posts refresh
→ Detail: 3 invalidations → Each detail refreshes
```

### 5.3 Why Use Promise.all in handleMultiple?

**Answer:** Parallel execution, wait for all

```typescript
// Sequential (slow)
for (const id of ids) {
  await update({ id, values });
}
// T0: Update #1 (500ms)
// T1: Update #2 (500ms)
// T2: Update #3 (500ms)
// Total: 1500ms ❌

// Parallel (fast)
await Promise.all(ids.map((id) => update({ id, values })));
// T0: All start simultaneously
// T1: All complete
// Total: 500ms ✅

// But: All-or-nothing (one fails → all fail)
```

---

## 6. COMMON PITFALLS

### 6.1 Not Handling Partial Success

```typescript
// ❌ WRONG - Assumes all succeed
const { mutate } = useUpdateMany();

mutate({
  ids: [1, 2, 3, 4, 5],
  values: { status: "published" },
});
// If ID #3 fails → ALL rollback! ❌
// IDs 1,2,4,5 not updated! ❌

// ✅ BETTER - Handle partial success
const { mutateAsync } = useUpdateMany();

// Option 1: Try-catch per batch
try {
  await mutateAsync({ ids, values });
} catch (error) {
  // All failed, user notified ✅
}

// Option 2: Progressive batching
for (const id of ids) {
  try {
    await mutateAsync({ ids: [id], values });
    // This ID succeeded ✅
  } catch (error) {
    // This ID failed, continue with others
  }
}
```

### 6.2 Too Large Batch Size

```typescript
// ❌ WRONG - Update 10,000 records at once
const { mutate } = useUpdateMany();

mutate({
  ids: Array.from({ length: 10000 }, (_, i) => i),
  values: { processed: true },
});
// → Server timeout! ❌
// → Memory issues! ❌

// ✅ CORRECT - Chunk into smaller batches
const chunkSize = 100;
const chunks = [];

for (let i = 0; i < ids.length; i += chunkSize) {
  chunks.push(ids.slice(i, i + chunkSize));
}

for (const chunk of chunks) {
  await mutateAsync({
    ids: chunk,
    values: { processed: true },
  });
  // 100 records per batch ✅
}
```

### 6.3 Forgetting to Filter IDs in Optimistic Update

```typescript
// ❌ WRONG - Updates ALL records
queryClient.setQueriesData({ queryKey: ["posts", "list"] }, (old) => ({
  ...old,
  data: old.data.map((post) => ({
    ...post,
    ...values, // ← Updates EVERY post! ❌
  })),
}));

// ✅ CORRECT - Filter by IDs
queryClient.setQueriesData({ queryKey: ["posts", "list"] }, (old) => ({
  ...old,
  data: old.data.map((post) =>
    ids.includes(post.id)
      ? { ...post, ...values } // ← Only selected! ✅
      : post,
  ),
}));
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Batch Size

```
Small batch (1-10 records):
→ Single batch call ✅

Medium batch (10-100 records):
→ Single batch or chunked ✅

Large batch (100-1000 records):
→ Chunk into batches of 50-100 ✅

Very large (1000+ records):
→ Background job, not mutation! ⚠️
```

### 7.2 Native vs Fallback Performance

```
Native updateMany:
- 1 API call
- Server-side batch
- Atomic transaction
- Performance: ⚡⚡⚡

Fallback (100 records):
- 100 parallel API calls
- Network overhead
- No transaction
- Performance: ⚡ (slower)

Recommendation: Implement native updateMany! ✅
```

---

## 8. TESTING

```typescript
describe("useUpdateMany", () => {
  it("should use native updateMany if available", async () => {
    const mockUpdateMany = jest.fn();
    mockDataProvider.updateMany = mockUpdateMany;

    const { result } = renderHook(() => useUpdateMany(), { wrapper });

    act(() => {
      result.current.mutate({
        resource: "posts",
        ids: [1, 2, 3],
        values: { status: "published" },
      });
    });

    await waitFor(() => {
      expect(mockUpdateMany).toHaveBeenCalledWith({
        resource: "posts",
        ids: [1, 2, 3],
        variables: { status: "published" },
      });
    });
  });

  it("should fallback to multiple update calls", async () => {
    const mockUpdate = jest.fn();
    mockDataProvider.update = mockUpdate;
    delete mockDataProvider.updateMany; // ← No native!

    const { result } = renderHook(() => useUpdateMany(), { wrapper });

    act(() => {
      result.current.mutate({
        resource: "posts",
        ids: [1, 2, 3],
        values: { status: "published" },
      });
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(3);
    });
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Batch Processing**: Update multiple records together
- ✅ **Composite**: Native batch or fallback to multiple
- ✅ **Filter**: Optimistic update only selected IDs
- ✅ **Fan-Out**: Invalidate list once, detail per ID
- ✅ **Aggregate**: Combine results, track all changes

### Key Features

1. **Native + Fallback** - Best performance or compatibility
2. **Batch Optimistic Updates** - All selected records updated
3. **Fan-Out Invalidation** - Smart cache invalidation strategy
4. **Aggregate Logging** - Single audit entry for batch
5. **Flexible** - Works with any data provider

### Khi nào dùng useUpdateMany?

✅ **Nên dùng:**

- Bulk status updates (publish all)
- Batch edits (same values for multiple)
- Conditional batch (archive old drafts)
- Mass operations (100-1000 records)

❌ **Không dùng:**

- Single record (use useUpdate)
- Different values per ID (loop useUpdate)
- Very large batches (10,000+) → Background job

### Remember

✅ **709 lines** - Batch update system
📦 **Batch Processing** - Multiple records, one mutation
🌳 **Composite** - Native or fallback
🔍 **Filter** - Only selected IDs updated
📡 **Fan-Out** - Smart invalidation
📊 **Aggregate** - Combined results

---

> 📚 **Best Practice**: Implement **native updateMany** for best performance! **Chunk large batches** (100-500 records). Always **filter by IDs** in optimistic updates. Handle **partial success** in fallback mode. Use **fan-out invalidation** for complete cache sync!
