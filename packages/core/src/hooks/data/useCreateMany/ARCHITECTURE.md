# Kiến trúc và Design Patterns của useCreateMany Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           BULK MUTATION SYSTEM                    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useCreate - Create single record                │  │
│  │  useCreateMany ✅ (THIS HOOK) - Bulk create      │  │
│  │         │                                         │  │
│  │         ▼                                         │  │
│  │  Strategy Selection:                             │  │
│  │    1. Use createMany() if available ✅           │  │
│  │    2. Fallback: Multiple create() calls ⚠️       │  │
│  │         │                                         │  │
│  │         ├──→ Notifications (bulk)                │  │
│  │         ├──→ Cache Invalidation                  │  │
│  │         ├──→ Realtime Events (bulk)              │  │
│  │         └──→ Audit Logging (bulk)                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Bulk create multiple records efficiently with automatic fallback to individual create() calls if createMany() not supported**

### 1.2 Complete Flow with Fallback Strategy

```
┌──────────────────────────────────────────────────────────────┐
│              USECREATEMANY COMPLETE FLOW                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Calls Hook                               │
│  const { mutate } = useCreateMany();                         │
│  mutate({                                                    │
│    resource: "posts",                                        │
│    values: [                                                 │
│      { title: "Post 1" },                                   │
│      { title: "Post 2" },                                   │
│      { title: "Post 3" }                                    │
│    ]                                                         │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Validation                                          │
│  - Resource exists? ✅                                       │
│  - Values is array? ✅                                       │
│  - Values not empty? ✅                                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Strategy Selection (KEY INSIGHT!)                  │
│                                                              │
│  Check: Does dataProvider have createMany()?                 │
│         ┌────────────┬────────────┐                         │
│         YES          NO (fallback)                           │
│         │            │                                       │
│         ▼            ▼                                       │
│  Use createMany()  Use create() x N                         │
│  (EFFICIENT ✅)    (LESS EFFICIENT ⚠️)                       │
│         │            │                                       │
│         └────────────┴────────────┐                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4A: createMany() Path (Preferred)                     │
│  dataProvider.createMany({                                   │
│    resource: "posts",                                        │
│    variables: [                                              │
│      { title: "Post 1" },                                   │
│      { title: "Post 2" },                                   │
│      { title: "Post 3" }                                    │
│    ]                                                         │
│  })                                                          │
│  → Single API call (efficient!) ✅                          │
│  → POST /posts/bulk                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4B: create() Fallback Path (If no createMany)         │
│  Promise.all([                                               │
│    dataProvider.create({ title: "Post 1" }),  // Call 1     │
│    dataProvider.create({ title: "Post 2" }),  // Call 2     │
│    dataProvider.create({ title: "Post 3" })   // Call 3     │
│  ])                                                          │
│  → Multiple API calls ⚠️                                    │
│  → POST /posts (x3)                                         │
│  → Slower but works with any provider!                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: onSuccess (Same for Both Paths)                    │
│  1. Show success notification ("3 posts created")           │
│  2. Invalidate cache (list, many)                           │
│  3. Publish realtime event (bulk)                           │
│  4. Create audit log (bulk action)                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: UI Updates                                         │
│  - List shows 3 new posts                                   │
│  - Success notification shown                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useCreateMany.ts: 331 dòng** - Bulk creation with smart fallback!

---

### 2.1 Strategy Pattern - Adaptive Bulk Creation

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Package Shipping Methods

```
Shipping 100 packages:

METHOD A: Bulk Container Ship (Efficient)
→ Load all 100 packages in one container
→ Ship in single trip
→ Fast! Cheap! Efficient! ✅

METHOD B: Individual Delivery (Fallback)
→ No container ship available
→ Send 100 separate packages
→ Still works, but slower and more expensive ⚠️

useCreateMany does the same:
- Try bulk API (createMany) first ✅
- Fallback to individual calls if needed ⚠️
```

**Strategy Pattern** = Choose creation strategy based on API capabilities

#### Implementation:

```typescript
// From useCreateMany.ts (lines 142-157)

// STRATEGY SELECTION:
if (selectedDataProvider.createMany) {
  // STRATEGY 1: Bulk API (Preferred) ✅
  return selectedDataProvider.createMany<TData, TVariables>({
    resource: resource.name,
    variables: values, // All values in one call
    meta: combinedMeta,
  });
}

// STRATEGY 2: Fallback (Individual Calls) ⚠️
return handleMultiple(
  values.map((val) =>
    selectedDataProvider.create<TData, TVariables>({
      resource: resource.name,
      variables: val, // One value per call
      meta: combinedMeta,
    }),
  ),
);
```

#### Visual Comparison:

```
STRATEGY 1: createMany() - Bulk API
┌──────────────────────────────────────┐
│  Frontend                            │
│    mutate({                          │
│      values: [item1, item2, item3]   │
│    })                                │
└──────────────────────────────────────┘
            │
            ▼ (SINGLE API CALL)
┌──────────────────────────────────────┐
│  Backend                             │
│    POST /api/posts/bulk              │
│    Body: [item1, item2, item3]       │
│    → Process all in one transaction  │
└──────────────────────────────────────┘
            │
            ▼
     ✅ Fast & Efficient!


STRATEGY 2: create() Fallback - Multiple Calls
┌──────────────────────────────────────┐
│  Frontend                            │
│    mutate({                          │
│      values: [item1, item2, item3]   │
│    })                                │
└──────────────────────────────────────┘
            │
            ├─────┬─────┬───── (3 API CALLS)
            ▼     ▼     ▼
┌──────┐ ┌──────┐ ┌──────┐
│  POST│ │  POST│ │  POST│
│ item1│ │ item2│ │ item3│
└──────┘ └──────┘ └──────┘
            │
            ▼
     ⚠️ Slower but works!
```

#### Real Examples:

```tsx
// Example 1: CSV Import with createMany support

const { mutate } = useCreateMany();

const handleCSVImport = (rows) => {
  mutate({
    resource: "products",
    values: rows.map((row) => ({
      name: row.name,
      price: row.price,
      stock: row.stock,
    })),
  });

  // If backend has /products/bulk:
  // → 1 API call for 1000 rows ✅

  // If backend has only /products:
  // → 1000 API calls ⚠️ (still works!)
};

// Example 2: Tag creation for post

const { mutate } = useCreateMany();

const handlePublish = (postData) => {
  // Create multiple tags at once
  mutate({
    resource: "tags",
    values: [{ name: "javascript" }, { name: "react" }, { name: "typescript" }],
    onSuccess: (data) => {
      // Then create post with tag IDs
      createPost({
        ...postData,
        tagIds: data.data.map((tag) => tag.id),
      });
    },
  });
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Backward Compatible** - Works with any data provider
- ✅ **Optimized** - Uses bulk API when available
- ✅ **Graceful Degradation** - Falls back automatically
- ✅ **Developer Friendly** - Same API regardless of backend

---

### 2.2 Adapter Pattern - Unified Bulk Interface

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Universal Power Adapter

```
Travel Adapter:

Different countries, different outlets:
- USA: 110V, Type A
- Europe: 220V, Type C
- UK: 230V, Type G

Universal adapter:
→ You plug same device
→ Adapter handles conversion
→ Device works everywhere! ✅

useCreateMany is the same:
→ You use same mutate() call
→ Hook adapts to backend API
→ Works with any data provider! ✅
```

**Adapter Pattern** = Uniform interface for different backends

#### Implementation:

```typescript
// UNIFIED INTERFACE (what you call):
const { mutate } = useCreateMany();

mutate({
  resource: "posts",
  values: [{ title: "A" }, { title: "B" }]
});

// ADAPTED CALLS (what happens internally):

// BACKEND TYPE 1: Has bulk API ✅
// Adapter calls: createMany()
POST /api/posts/bulk
Body: [{ title: "A" }, { title: "B" }]

// BACKEND TYPE 2: Only single API ⚠️
// Adapter calls: create() x2
POST /api/posts  Body: { title: "A" }
POST /api/posts  Body: { title: "B" }

// BACKEND TYPE 3: GraphQL
// Adapter calls: mutation createPosts
mutation { createPosts(input: [...]) }

// Same interface, different adaptations! ✅
```

#### Component Code (Same for All Backends):

```tsx
// This component works with ANY backend! ✅

function BulkImportForm() {
  const { mutate, mutation } = useCreateMany();

  const handleImport = (csvData) => {
    mutate({
      resource: "products",
      values: csvData, // Could be 1 or 1000 items!
    });
  };

  return (
    <div>
      <input
        type="file"
        onChange={(e) => parseCSV(e.target.files[0], handleImport)}
      />
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Importing..." : "Import CSV"}
      </button>
    </div>
  );
}

// Works with:
// ✅ REST API with /bulk endpoint
// ✅ REST API without /bulk endpoint
// ✅ GraphQL API
// ✅ Custom API
// Same code! Hook adapts! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Portability** - Switch backends without changing components
- ✅ **Abstraction** - Components don't care about API details
- ✅ **Consistency** - Same pattern for all resources
- ✅ **Future-Proof** - Add new backends without breaking code

---

### 2.3 Composite Pattern - Aggregating Multiple Results

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Shopping Cart Checkout

```
Shopping Cart with 3 items:

Checkout → Process all 3 at once
→ Get single receipt with all items
→ One transaction, one confirmation

Not: 3 separate purchases
× Would need 3 checkout processes
× Would get 3 receipts
× Confusing! ❌

useCreateMany aggregates results:
→ Multiple creates
→ Single response object
→ Easy to handle! ✅
```

**Composite Pattern** = Treat collection same as single item

#### Implementation:

```typescript
// Multiple creates aggregated into single response

const { mutate, mutation } = useCreateMany();

mutate({
  resource: "posts",
  values: [{ title: "Post 1" }, { title: "Post 2" }, { title: "Post 3" }],
});

// Response aggregated:
mutation.data = {
  data: [
    { id: 1, title: "Post 1" }, // ← Result 1
    { id: 2, title: "Post 2" }, // ← Result 2
    { id: 3, title: "Post 3" }, // ← Result 3
  ],
  // All in one array! ✅
};

// NOT 3 separate responses! ✅
```

#### From Code (lines 209-211):

```typescript
// Aggregate IDs from all created items
const ids = response?.data
  .filter((item) => item?.id !== undefined)
  .map((item) => item.id!);

// Publish single event with all IDs
publish?.({
  channel: `resources/${resource.name}`,
  type: "created",
  payload: {
    ids, // ← All IDs in one event! ✅
  },
  // ...
});
```

#### Real Example - Order with Items:

```tsx
function CreateOrderWithItems() {
  const { mutate: createItems } = useCreateMany();

  const handleOrder = (orderData) => {
    // Create all order items at once
    createItems({
      resource: "order-items",
      values: orderData.items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
      onSuccess: (response) => {
        // Get all created IDs at once ✅
        const itemIds = response.data.map((item) => item.id);

        // Create order with all item IDs
        createOrder({
          customerId: orderData.customerId,
          itemIds: itemIds, // ← All IDs in one array
          total: calculateTotal(orderData.items),
        });
      },
    });
  };

  return <button onClick={handleOrder}>Place Order</button>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Single Response** - Easy to handle all results
- ✅ **Atomic Feel** - Feels like one operation
- ✅ **Simple Callbacks** - One onSuccess, not N callbacks
- ✅ **ID Collection** - Easy to get all created IDs

---

### 2.4 Template Method Pattern - Reusing useCreate Logic

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: House Building Template

```
Building Houses:

Template (same for all):
1. Lay foundation
2. Build walls
3. Add roof
4. Install utilities

Variations:
- Small house: Simple walls, basic roof
- Large house: Complex walls, fancy roof

Template stays same,
Details change! ✅

useCreateMany:
- Template: useCreate logic
- Variation: Call once vs multiple times
```

**Template Method** = Define skeleton, vary implementations

#### Implementation:

```typescript
// useCreateMany uses same structure as useCreate:

// TEMPLATE (same structure):
export const useCreateMany = () => {
  // 1. Setup hooks (same as useCreate)
  const dataProvider = useDataProvider();
  const handleNotification = useHandleNotification();
  const invalidateStore = useInvalidate();
  const { publish } = usePublish();
  const { log } = useLog();

  // 2. useMutation (same pattern)
  const mutation = useMutation({
    mutationFn: (...) => { ... },
    onSuccess: (...) => {
      // Notification ✅
      // Cache invalidation ✅
      // Realtime publish ✅
      // Audit log ✅
    },
    onError: (...) => { ... }
  });

  // 3. Return (same shape)
  return { mutate, mutation, overtime };
};

// VARIATION (different details):
// - mutationFn: createMany() or create() x N
// - onSuccess: Handle array response
// - notification: Plural resource name
```

#### Code Comparison:

```typescript
// useCreate template:
mutationFn: () => {
  return dataProvider.create({
    // ← Single
    resource: "posts",
    variables: values,
  });
};

// useCreateMany variation:
mutationFn: () => {
  return dataProvider.createMany({
    // ← Bulk
    resource: "posts",
    variables: values, // ← Array
  });
};

// Same structure, different method! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Code Reuse** - Don't repeat notification/cache logic
- ✅ **Consistency** - Same behavior across hooks
- ✅ **Maintainability** - Fix once, all hooks benefit
- ✅ **Predictability** - Developers know what to expect

---

### 2.5 Batch Processing Pattern

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Factory Assembly Line

```
Car Factory:

❌ BAD - Make one car at a time:
1. Build car 1 → Wait → Ship
2. Build car 2 → Wait → Ship
3. Build car 3 → Wait → Ship
→ Slow! Inefficient!

✅ GOOD - Batch processing:
1. Build cars 1, 2, 3 together
2. Ship all at once
→ Fast! Efficient!

useCreateMany = Batch processor!
```

**Batch Processing** = Process multiple items efficiently

#### Implementation:

```typescript
// Batch configuration

const { mutate } = useCreateMany();

// SMALL BATCH (quick operations)
mutate({
  resource: "tags",
  values: [{ name: "javascript" }, { name: "react" }, { name: "typescript" }],
  // Batch size: 3 (fast)
});

// LARGE BATCH (bulk import)
mutate({
  resource: "products",
  values: csvData, // Could be 1000+ items!
  // Batch size: 1000 (slower but still efficient)
});
```

#### From Code - Fallback uses Promise.all:

```typescript
// handleMultiple function batches all promises
return handleMultiple(
  values.map((val) =>
    selectedDataProvider.create({ ... })
  ),
);

// Internally (simplified):
const handleMultiple = (promises) => {
  return Promise.all(promises).then(results => ({
    data: results.map(r => r.data)
  }));
};

// All requests sent in parallel! ✅
// Wait for all to complete
// Aggregate results
```

#### Performance Comparison:

```
Sequential (BAD) ❌:
Request 1 → Wait → Complete
                   ↓
           Request 2 → Wait → Complete
                              ↓
                      Request 3 → Wait → Complete
Total: 3 x (request + processing) time


Parallel Batch (GOOD) ✅:
Request 1 ──┐
Request 2 ──┼─→ Wait → All Complete
Request 3 ──┘
Total: 1 x (request + processing) time
```

#### Real Example - CSV Import:

```tsx
function CSVImporter() {
  const { mutate, mutation } = useCreateMany();
  const [batchSize, setBatchSize] = useState(100);

  const handleImport = (allRows) => {
    // Split into batches
    const batches = chunk(allRows, batchSize);

    // Process batch by batch
    batches.forEach((batch, index) => {
      mutate({
        resource: "products",
        values: batch,
        onSuccess: () => {
          console.log(`Batch ${index + 1}/${batches.length} imported`);
        },
      });
    });
  };

  return (
    <div>
      <input
        type="number"
        value={batchSize}
        onChange={(e) => setBatchSize(Number(e.target.value))}
        placeholder="Batch size"
      />
      <input type="file" onChange={(e) => parseCSV(e, handleImport)} />
      {mutation.isPending && <div>Importing...</div>}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Parallel processing faster
- ✅ **Efficiency** - Less overhead than sequential
- ✅ **Network** - Batch = fewer round trips
- ✅ **Transactional** - All or nothing (with bulk API)

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern              | Ví dụ đời thường             | Giải quyết vấn đề gì              | Trong useCreateMany          |
| -------------------- | ---------------------------- | --------------------------------- | ---------------------------- |
| **Strategy**         | Container ship vs individual | Choose method based on capability | createMany() vs create() x N |
| **Adapter**          | Universal power adapter      | Unified interface                 | Works with any backend       |
| **Composite**        | Shopping cart checkout       | Aggregate results                 | Single response array        |
| **Template Method**  | House building template      | Reuse structure                   | Same as useCreate pattern    |
| **Batch Processing** | Factory assembly line        | Efficient processing              | Parallel requests            |

---

## 3. KEY FEATURES

### 3.1 Smart Fallback Mechanism

```typescript
// Automatically chooses best strategy:

// IF provider has createMany:
dataProvider.createMany({ ... })
// → 1 API call ✅
// → POST /api/posts/bulk
// → Transaction-safe
// → Fast!

// IF provider ONLY has create:
Promise.all([
  dataProvider.create({ ... }),
  dataProvider.create({ ... }),
  dataProvider.create({ ... })
])
// → N API calls ⚠️
// → POST /api/posts (x3)
// → Still works!
// → Slower but compatible
```

### 3.2 Bulk Notification

```typescript
// From code (lines 192-198)

// Plural resource name in notification
const resourcePlural = textTransformers.plural(identifier);
// "posts" → "posts"
// "category" → "categories"

handleNotification(notificationConfig, {
  message: translate(
    "notifications.createSuccess",
    { resource: resourcePlural },
    `Successfully created ${resourcePlural}`, // ← Plural!
  ),
  type: "success",
});

// Shows: "Successfully created posts" (not "post")
```

### 3.3 Batch Realtime Events

```typescript
// From code (lines 209-223)

// Single event with all IDs
const ids = response?.data
  .filter((item) => item?.id !== undefined)
  .map((item) => item.id!);

publish?.({
  channel: `resources/${resource.name}`,
  type: "created",
  payload: {
    ids, // ← Array of all created IDs! ✅
  },
  date: new Date(),
});

// Other users get ONE update with all new items
// Not N separate updates! ✅
```

### 3.4 Batch Audit Logging

```typescript
// From code (lines 231-240)

log?.mutate({
  action: "createMany", // ← Bulk action logged
  resource: resource.name,
  data: values, // ← All input values
  meta: {
    dataProviderName,
    ids, // ← All created IDs
    ...rest,
  },
});

// Single audit log entry for bulk operation ✅
```

---

## 4. COMMON USE CASES

### 4.1 CSV Import

```tsx
import { useCreateMany } from "@refinedev/core";
import Papa from "papaparse";

function CSVImport() {
  const { mutate, mutation } = useCreateMany();

  const handleFileUpload = (file) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        mutate({
          resource: "products",
          values: results.data.map((row) => ({
            name: row.name,
            price: parseFloat(row.price),
            stock: parseInt(row.stock),
          })),
        });
      },
    });
  };

  return (
    <div>
      <input
        type="file"
        accept=".csv"
        onChange={(e) => handleFileUpload(e.target.files[0])}
      />
      {mutation.isPending && (
        <div>Importing {mutation.variables?.values?.length} products...</div>
      )}
      {mutation.isSuccess && (
        <div>Successfully imported {mutation.data.data.length} products!</div>
      )}
    </div>
  );
}
```

### 4.2 Batch Tag Creation

```tsx
function PostEditor() {
  const { mutate: createTags } = useCreateMany();
  const { mutate: createPost } = useCreate();

  const handlePublish = (postData) => {
    const newTags = postData.tags.filter((tag) => !tag.id);

    if (newTags.length > 0) {
      // Create all new tags at once
      createTags({
        resource: "tags",
        values: newTags.map((tag) => ({ name: tag.name })),
        onSuccess: (tagResponse) => {
          // Then create post with all tag IDs
          const allTagIds = [
            ...postData.tags.filter((t) => t.id).map((t) => t.id),
            ...tagResponse.data.map((t) => t.id),
          ];

          createPost({
            resource: "posts",
            values: {
              ...postData,
              tagIds: allTagIds,
            },
          });
        },
      });
    } else {
      // No new tags, create post directly
      createPost({
        resource: "posts",
        values: postData,
      });
    }
  };

  return <button onClick={handlePublish}>Publish</button>;
}
```

### 4.3 Bulk User Invitation

```tsx
function BulkInvite() {
  const { mutate, mutation } = useCreateMany();
  const [emails, setEmails] = useState("");

  const handleInvite = () => {
    const emailList = emails
      .split("\n")
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    mutate({
      resource: "invitations",
      values: emailList.map((email) => ({
        email,
        role: "member",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })),
      successNotification: (data) => ({
        message: `Sent ${data.data.length} invitations!`,
        type: "success",
      }),
    });
  };

  return (
    <div>
      <textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="Enter emails (one per line)"
        rows={10}
      />
      <button onClick={handleInvite} disabled={mutation.isPending}>
        {mutation.isPending ? "Sending..." : "Send Invitations"}
      </button>
    </div>
  );
}
```

### 4.4 Cloning Records

```tsx
function CloneRecords() {
  const { mutate } = useCreateMany();

  const handleClone = (originalRecords, count) => {
    const clones = [];

    originalRecords.forEach((record) => {
      for (let i = 0; i < count; i++) {
        clones.push({
          ...record,
          name: `${record.name} (Copy ${i + 1})`,
          // Remove ID as these are new records
          id: undefined,
        });
      }
    });

    mutate({
      resource: "posts",
      values: clones,
    });
  };

  return (
    <button onClick={() => handleClone(selectedRecords, 3)}>
      Clone 3 times
    </button>
  );
}
```

### 4.5 Seeding Test Data

```tsx
function DevSeeder() {
  const { mutate } = useCreateMany();

  const seedTestData = () => {
    // Create test users
    mutate({
      resource: "users",
      values: Array.from({ length: 10 }, (_, i) => ({
        name: `Test User ${i + 1}`,
        email: `user${i + 1}@test.com`,
        role: i === 0 ? "admin" : "member",
      })),
      successNotification: false, // Silent seeding
      onSuccess: (userData) => {
        // Then create test posts
        mutate({
          resource: "posts",
          values: Array.from({ length: 50 }, (_, i) => ({
            title: `Test Post ${i + 1}`,
            content: "Lorem ipsum...",
            authorId: userData.data[i % 10].id,
          })),
          successNotification: {
            message: "Test data seeded!",
            type: "success",
          },
        });
      },
    });
  };

  return <button onClick={seedTestData}>Seed Test Data</button>;
}
```

### 4.6 Batched Form Submissions

```tsx
function MultiProductForm() {
  const [products, setProducts] = useState([
    { name: "", price: 0 },
    { name: "", price: 0 },
    { name: "", price: 0 },
  ]);
  const { mutate, mutation } = useCreateMany();

  const handleSubmitAll = () => {
    mutate({
      resource: "products",
      values: products.filter((p) => p.name && p.price > 0),
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmitAll();
      }}
    >
      {products.map((product, index) => (
        <div key={index}>
          <input
            value={product.name}
            onChange={(e) => {
              const newProducts = [...products];
              newProducts[index].name = e.target.value;
              setProducts(newProducts);
            }}
            placeholder="Product name"
          />
          <input
            type="number"
            value={product.price}
            onChange={(e) => {
              const newProducts = [...products];
              newProducts[index].price = parseFloat(e.target.value);
              setProducts(newProducts);
            }}
            placeholder="Price"
          />
        </div>
      ))}
      <button type="submit" disabled={mutation.isPending}>
        Create All Products
      </button>
    </form>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Fallback to Multiple create() Calls?

**Question:** Why not require createMany() method?

**Answer:**

```typescript
// REASON 1: Backward Compatibility ✅
// Old data providers without createMany still work!

const oldDataProvider = {
  getList: () => { ... },
  create: () => { ... }, // ← Only has create
  // No createMany! But useCreateMany still works! ✅
};

// REASON 2: Simple APIs ✅
// Some REST APIs don't have bulk endpoints
// useCreateMany adapts automatically!

// REASON 3: Graceful Degradation ✅
// Better to be slow than broken!
// Multiple create() calls > Error thrown
```

### 5.2 Why aggregate IDs in realtime event?

**Question:** Why not publish N events?

**Answer:**

```typescript
// ❌ BAD - N events:
publish({ type: "created", payload: { id: 1 } });
publish({ type: "created", payload: { id: 2 } });
publish({ type: "created", payload: { id: 3 } });
// → 3 network messages
// → 3 UI updates
// → Laggy/flickering UI ❌

// ✅ GOOD - 1 event:
publish({
  type: "created",
  payload: { ids: [1, 2, 3] }, // ← Batch!
});
// → 1 network message
// → 1 UI update
// → Smooth! ✅
```

### 5.3 Why use textTransformers.plural?

**Answer:** Better UX with grammatically correct notifications

```typescript
// Without plural transformer:
"Successfully created category"; // ← Wrong! (created 3)

// With plural transformer:
"Successfully created categories"; // ← Correct! ✅

// Special cases handled:
// "post" → "posts"
// "category" → "categories"
// "person" → "people"
```

---

## 6. PERFORMANCE CONSIDERATIONS

### 6.1 createMany() vs create() x N Performance

```
Scenario: Create 100 records

METHOD 1: createMany() (if available) ✅
┌────────────────────────────────────┐
│ 1 API call                         │
│ Network: ~100ms                    │
│ Processing: ~200ms (bulk insert)   │
│ Total: ~300ms                      │
└────────────────────────────────────┘


METHOD 2: create() x 100 (fallback) ⚠️
┌────────────────────────────────────┐
│ 100 API calls (parallel)           │
│ Network: ~100ms each               │
│ Processing: ~50ms each             │
│ Total: ~150ms (parallel)           │
│ BUT: Higher server load!           │
└────────────────────────────────────┘

Note: Fallback is parallel (Promise.all)
not sequential, so still reasonable!
```

### 6.2 Batch Size Recommendations

```tsx
// Small batches (< 100 items): Fine ✅
mutate({
  resource: "tags",
  values: Array.from({ length: 50 }, ...) // ← OK
});

// Medium batches (100-1000): Good ⚠️
mutate({
  resource: "products",
  values: Array.from({ length: 500 }, ...) // ← Consider chunking
});

// Large batches (> 1000): Chunk it! 🚨
const chunks = chunk(allItems, 100);
chunks.forEach(chunk => {
  mutate({ resource: "products", values: chunk });
});
```

### 6.3 Network Optimization

```typescript
// If using fallback (create x N):

// Option 1: Increase browser connection limit
// Most browsers: 6 parallel connections per domain
// Consider using CDN/multiple domains

// Option 2: Batch manually
const batchSize = 50;
const batches = chunk(items, batchSize);

for (const batch of batches) {
  await mutateAsync({ resource: "posts", values: batch });
  await sleep(100); // Small delay between batches
}

// Option 3: Implement createMany on backend ✅
// Best solution!
```

---

## 7. TESTING

### 7.1 Test createMany Path

```typescript
describe("useCreateMany - createMany path", () => {
  it("should call createMany when available", async () => {
    const mockCreateMany = jest.fn(() =>
      Promise.resolve({
        data: [
          { id: 1, title: "Post 1" },
          { id: 2, title: "Post 2" },
        ],
      }),
    );

    const mockDataProvider = {
      createMany: mockCreateMany,
      create: jest.fn(), // Should NOT be called
    };

    const { result } = renderHook(() => useCreateMany(), {
      wrapper: ({ children }) => (
        <Refine dataProvider={mockDataProvider}>{children}</Refine>
      ),
    });

    act(() => {
      result.current.mutate({
        resource: "posts",
        values: [{ title: "Post 1" }, { title: "Post 2" }],
      });
    });

    await waitFor(() => {
      expect(mockCreateMany).toHaveBeenCalledWith({
        resource: "posts",
        variables: [{ title: "Post 1" }, { title: "Post 2" }],
        meta: undefined,
      });
      expect(mockDataProvider.create).not.toHaveBeenCalled();
    });
  });
});
```

### 7.2 Test Fallback Path

```typescript
describe("useCreateMany - fallback path", () => {
  it("should fallback to multiple create calls", async () => {
    const mockCreate = jest.fn((params) =>
      Promise.resolve({
        data: { id: Math.random(), title: params.variables.title },
      }),
    );

    const mockDataProvider = {
      create: mockCreate,
      // No createMany! ← Forces fallback
    };

    const { result } = renderHook(() => useCreateMany(), {
      wrapper: ({ children }) => (
        <Refine dataProvider={mockDataProvider}>{children}</Refine>
      ),
    });

    act(() => {
      result.current.mutate({
        resource: "posts",
        values: [{ title: "Post 1" }, { title: "Post 2" }],
      });
    });

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(mockCreate).toHaveBeenNthCalledWith(1, {
        resource: "posts",
        variables: { title: "Post 1" },
        meta: undefined,
      });
      expect(mockCreate).toHaveBeenNthCalledWith(2, {
        resource: "posts",
        variables: { title: "Post 2" },
        meta: undefined,
      });
    });
  });
});
```

---

## 8. COMMON PITFALLS

### 8.1 Large Batch Without Chunking

```tsx
// ❌ WRONG - Import 10000 items at once
const { mutate } = useCreateMany();

mutate({
  resource: "products",
  values: hugeCSVData, // 10000 items! 🚨
});

// Problems:
// - Timeout on slow connections
// - High memory usage
// - Poor UX (no progress indication)

// ✅ CORRECT - Chunk large batches
const BATCH_SIZE = 100;
const batches = chunk(hugeCSVData, BATCH_SIZE);

batches.forEach((batch, index) => {
  mutate({
    resource: "products",
    values: batch,
    onSuccess: () => {
      console.log(`Progress: ${index + 1}/${batches.length}`);
    },
  });
});
```

### 8.2 Not Handling Partial Failures (Fallback Mode)

```tsx
// ⚠️ CAUTION - Fallback mode can have partial failures

// If using create() x N fallback:
// - create() call 1: Success ✅
// - create() call 2: Success ✅
// - create() call 3: Fail ❌
// → 2 items created, 1 failed
// → Inconsistent state!

// Solution 1: Transaction on backend (createMany)
// Solution 2: Cleanup on error

mutate({
  resource: "posts",
  values: [...],
  onError: (error, variables, context) => {
    // Cleanup partially created items
    if (context?.createdIds) {
      deleteMany({
        resource: "posts",
        ids: context.createdIds
      });
    }
  }
});
```

### 8.3 Forgetting values is Array

```tsx
// ❌ WRONG - values is object
mutate({
  resource: "posts",
  values: { title: "Test" }, // ❌ Object, not array!
});

// ✅ CORRECT - values is array
mutate({
  resource: "posts",
  values: [{ title: "Test" }], // ✅ Array!
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: createMany() vs create() x N fallback
- ✅ **Adapter**: Unified interface for any backend
- ✅ **Composite**: Aggregate multiple results
- ✅ **Template Method**: Reuse useCreate pattern
- ✅ **Batch Processing**: Efficient parallel processing

### Key Features

1. **Smart Fallback** - Auto-adapts to API capabilities
2. **Bulk Notifications** - Plural resource names
3. **Batch Events** - Single realtime event
4. **Batch Audit** - Single log entry
5. **Parallel Processing** - Fast fallback mode

### Khi nào dùng useCreateMany?

✅ **Nên dùng:**

- CSV imports
- Bulk tag creation
- User invitations
- Seeding test data
- Cloning records
- Multi-item forms

❌ **Không dùng:**

- Single record (use useCreate)
- Updating records (use useUpdateMany)
- Deleting records (use useDeleteMany)
- Very large batches without chunking

### Remember

✅ **331 lines** - Compact bulk creation
🎯 **Strategy** - Smart fallback mechanism
🔌 **Adapter** - Works with any backend
📦 **Composite** - Single aggregated response
🏭 **Batch** - Efficient parallel processing
💡 **Smart** - createMany() preferred, create() x N fallback

### Pro Tips

1. **Implement createMany() on backend** - Much faster!
2. **Chunk large batches** - Better UX with progress
3. **Handle partial failures** - Cleanup on error
4. **Use plural notifications** - Better grammar
5. **Test both paths** - createMany + fallback
6. **Monitor performance** - Fallback = more requests

### Bulk Creation Comparison

| Feature      | useCreate   | useCreateMany               |
| ------------ | ----------- | --------------------------- |
| Records      | Single      | Multiple                    |
| API Calls    | 1           | 1 (bulk) or N (fallback)    |
| Notification | Singular    | Plural                      |
| Realtime     | 1 ID        | Array of IDs                |
| Use Case     | Form submit | CSV import                  |
| Performance  | Fast        | Fast (bulk) / OK (fallback) |

---

> 📚 **Best Practice**: Always implement `createMany()` on your backend for optimal performance! If not possible, fallback still works but slower.
