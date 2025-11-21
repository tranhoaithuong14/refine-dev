# Kiến trúc và Design Patterns của useImport Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │       IMPORT/EXPORT SYSTEM (DATA UTILITIES)       │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useImport ✅ (THIS HOOK - COUNTERPART!)         │  │
│  │    → Import CSV files to backend                 │  │
│  │         │                                         │  │
│  │         ├──→ PARSE CSV:                          │  │
│  │         │     - PapaParse library                │  │
│  │         │     - Headers → Object keys            │  │
│  │         │     - Rows → Array of objects          │  │
│  │         │                                         │  │
│  │         ├──→ TRANSFORM:                          │  │
│  │         │     - mapData function                 │  │
│  │         │     - Clean/validate data              │  │
│  │         │     - Format for backend               │  │
│  │         │                                         │  │
│  │         ├──→ BATCH PROCESSING:                   │  │
│  │         │     - Configurable batch size          │  │
│  │         │     - Sequential execution             │  │
│  │         │     - Progress tracking                │  │
│  │         │                                         │  │
│  │         ├──→ MUTATIONS:                          │  │
│  │         │     - create (batchSize=1)             │  │
│  │         │     - createMany (batchSize>1)         │  │
│  │         │     - Error handling per batch         │  │
│  │         │                                         │  │
│  │         └──→ CALLBACKS:                          │  │
│  │               - onProgress → Track upload        │  │
│  │               - onFinish → Results summary       │  │
│  │                                                   │  │
│  │  Companion to:                                   │  │
│  │    - useExport → Export data to CSV              │  │
│  │                                                   │  │
│  │  Works with:                                     │  │
│  │    - useCreate → Single record creation          │  │
│  │    - useCreateMany → Batch creation              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Import CSV files to backend - Parse, transform, batch process, and track progress**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  USEIMPORT COMPLETE FLOW                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User Prepares CSV File                             │
│                                                              │
│  CSV File (products.csv):                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ name,price,category,stock                              │ │
│  │ "Product A",99.99,"Electronics",50                     │ │
│  │ "Product B",49.99,"Clothing",100                       │ │
│  │ "Product C",29.99,"Books",75                           │ │
│  │ ...                                                     │ │
│  │ (1000 rows)                                             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Setup Hook with Options                            │
│                                                              │
│  const { inputProps, isLoading, mutationResult } =          │
│    useImport({                                               │
│      resource: "products",                                   │
│      batchSize: 10, // 10 records per batch                 │
│      mapData: (item) => ({                                   │
│        name: item.name,                                      │
│        price: parseFloat(item.price),                        │
│        category: item.category,                              │
│        stock: parseInt(item.stock),                          │
│      }),                                                     │
│      onProgress: ({ totalAmount, processedAmount }) => {     │
│        const percent = (processedAmount/totalAmount) * 100;  │
│        console.log(`${percent}% completed`);                 │
│      },                                                      │
│      onFinish: ({ succeeded, errored }) => {                 │
│        console.log(`Success: ${succeeded.length}`);          │
│        console.log(`Failed: ${errored.length}`);             │
│      }                                                       │
│    });                                                       │
│                                                              │
│  <input {...inputProps} /> // File input ready! ✅          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: User Selects File                                  │
│                                                              │
│  <input type="file" accept=".csv" />                        │
│  ↓                                                           │
│  User clicks "Browse" → Selects products.csv                │
│  ↓                                                           │
│  onChange event fires                                       │
│  ↓                                                           │
│  handleChange({ file: products.csv })                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Parse CSV with PapaParse                           │
│                                                              │
│  papaparse.parse(file, {                                     │
│    complete: ({ data }) => {                                 │
│      // data = [                                             │
│      //   ["name", "price", "category", "stock"],           │
│      //   ["Product A", "99.99", "Electronics", "50"],      │
│      //   ["Product B", "49.99", "Clothing", "100"],        │
│      //   ...                                                │
│      // ]                                                    │
│    }                                                         │
│  });                                                         │
│                                                              │
│  Raw 2D array from CSV ✅                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Transform with importCSVMapper                     │
│                                                              │
│  const values = importCSVMapper(data, mapData);             │
│                                                              │
│  Internal process:                                           │
│  1. Extract headers: ["name", "price", "category", "stock"] │
│  2. Extract rows: [                                          │
│       ["Product A", "99.99", "Electronics", "50"],          │
│       ["Product B", "49.99", "Clothing", "100"],            │
│       ...                                                    │
│     ]                                                        │
│  3. Zip headers with each row:                              │
│     {                                                        │
│       name: "Product A",                                     │
│       price: "99.99",                                        │
│       category: "Electronics",                               │
│       stock: "50"                                            │
│     }                                                        │
│  4. Apply mapData to each object:                           │
│     {                                                        │
│       name: "Product A",                                     │
│       price: 99.99,        // ← Parsed!                     │
│       category: "Electronics",                               │
│       stock: 50            // ← Parsed!                     │
│     }                                                        │
│                                                              │
│  Result: Array of 1000 clean objects ✅                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Create Batches (Chunking)                          │
│                                                              │
│  batchSize = 10                                              │
│  values.length = 1000                                        │
│                                                              │
│  chunks = chunk(values, 10)                                  │
│  // [                                                        │
│  //   [item1, item2, ..., item10],   // Batch 1             │
│  //   [item11, item12, ..., item20], // Batch 2             │
│  //   ...                                                    │
│  //   [item991, ..., item1000]       // Batch 100           │
│  // ]                                                        │
│                                                              │
│  Total batches: 100 ✅                                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Sequential Processing                              │
│                                                              │
│  for each batch (sequentially):                             │
│    ┌────────────────────────────────────────────────────┐  │
│    │ Batch 1: [item1...item10]                          │  │
│    │ ↓                                                   │  │
│    │ createMany.mutateAsync({                           │  │
│    │   resource: "products",                            │  │
│    │   values: [item1...item10]                         │  │
│    │ })                                                  │  │
│    │ ↓                                                   │  │
│    │ POST /products (bulk insert 10 records)            │  │
│    │ ↓                                                   │  │
│    │ Server: Success! Created 10 records                │  │
│    │ ↓                                                   │  │
│    │ Update progress: 10/1000 (1%) ✅                   │  │
│    └────────────────────────────────────────────────────┘  │
│                                                              │
│    ┌────────────────────────────────────────────────────┐  │
│    │ Batch 2: [item11...item20]                         │  │
│    │ ↓                                                   │  │
│    │ createMany.mutateAsync(...)                        │  │
│    │ ↓                                                   │  │
│    │ POST /products                                      │  │
│    │ ↓                                                   │  │
│    │ Update progress: 20/1000 (2%) ✅                   │  │
│    └────────────────────────────────────────────────────┘  │
│                                                              │
│    ... (continue for all 100 batches)                       │
│                                                              │
│    ┌────────────────────────────────────────────────────┐  │
│    │ Batch 100: [item991...item1000]                    │  │
│    │ ↓                                                   │  │
│    │ Update progress: 1000/1000 (100%) ✅               │  │
│    └────────────────────────────────────────────────────┘  │
│                                                              │
│  Why sequential?                                             │
│  → Prevents server overload                                 │
│  → Easier error tracking                                    │
│  → Predictable progress                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: Error Handling                                     │
│                                                              │
│  If batch fails:                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Batch 5: Error! Server validation failed              │ │
│  │ ↓                                                       │ │
│  │ Catch error                                             │ │
│  │ ↓                                                       │ │
│  │ Record as "errored":                                    │ │
│  │ {                                                       │ │
│  │   type: "error",                                        │ │
│  │   request: [item41...item50],  // Failed items        │ │
│  │   response: [error]             // Error object        │ │
│  │ }                                                       │ │
│  │ ↓                                                       │ │
│  │ Continue to next batch! (Don't stop!) ✅              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Resilient: Continues even if some batches fail! ✅        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 9: Finish & Callback                                  │
│                                                              │
│  All batches processed!                                      │
│                                                              │
│  Results:                                                    │
│  {                                                           │
│    succeeded: [                                              │
│      { type: "success", request: [...], response: [...] },  │
│      { type: "success", request: [...], response: [...] },  │
│      ... (95 successful batches)                            │
│    ],                                                        │
│    errored: [                                                │
│      { type: "error", request: [...], response: [error] },  │
│      ... (5 failed batches)                                 │
│    ]                                                         │
│  }                                                           │
│                                                              │
│  onFinish({ succeeded, errored })                           │
│  ↓                                                           │
│  User sees summary:                                          │
│  "Successfully imported 950 products"                        │
│  "Failed to import 50 products"                              │
│  ✅ Import complete!                                        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File index.tsx: 321 dòng** - CSV import with batch processing!

---

### 2.1 Sequential Processing Pattern - One at a Time

#### 🚦 VÍ DỤ ĐỜI THƯỜNG: Traffic Light

```
Processing Requests:

PARALLEL (All at once):
→ Send 100 batches simultaneously
→ Server: 100 concurrent requests! 💥
→ Server overload! ❌
→ Some fail, some succeed
→ Hard to track! ❌

SEQUENTIAL (One by one):
→ Send batch 1 → Wait → Complete ✅
→ Send batch 2 → Wait → Complete ✅
→ Send batch 3 → Wait → Complete ✅
→ ...
→ Send batch 100 → Wait → Complete ✅
→ Server: 1 request at a time ✅
→ Easy to track progress! ✅

useImport = Traffic light!
→ One batch at a time
→ Wait for completion
→ Then next batch! ✅
```

**Sequential Processing Pattern** = Process items one by one, not in parallel

#### Implementation:

```typescript
// From index.tsx (lines 224-244) and sequentialPromises

// Helper function: sequentialPromises
export const sequentialPromises = async (
  promises: (() => Promise<any>)[],
  onEachResolve: (result, index) => any,
  onEachReject: (error, index) => any,
) => {
  const results = [];

  // ═══════════════════════════════════════════════════════════
  // KEY: for...of loop (NOT Promise.all!)
  // ═══════════════════════════════════════════════════════════

  for (const [index, promise] of promises.entries()) {
    // ↑ Process ONE at a time

    try {
      const result = await promise(); // ← WAIT for completion!
      // ↑ Next iteration only after this completes

      results.push(onEachResolve(result, index));
    } catch (error) {
      results.push(onEachReject(error, index));
    }
  }

  return results;
};

// Usage in useImport:
const chunkedFns = chunks.map((chunkedValues) => {
  const fn = async () => {
    return await createMany.mutateAsync({
      resource: identifier ?? "",
      values: chunkedValues,
      // ... options
    });
  };
  return fn;
});

// Sequential execution
const createdValues = await sequentialPromises(
  chunkedFns,
  // ↑ Array of functions that return promises
  ({ response, currentBatchLength }) => {
    // Success handler
    setProcessedAmount((prev) => prev + currentBatchLength);
    return { type: "success", response, ... };
  },
  (error, index) => {
    // Error handler
    return { type: "error", response: [error], ... };
  },
);
```

#### Why Sequential vs Parallel?

```typescript
// PARALLEL (bad for import):
await Promise.all([
  createMany(batch1),
  createMany(batch2),
  createMany(batch3),
  // ... 100 batches
]); // ← 100 concurrent requests! ❌

// Problems:
// - Server overload (100 simultaneous connections)
// - Memory issues (all responses in memory)
// - Hard to track which batch failed
// - Progress unclear

// SEQUENTIAL (good for import):
for (const batch of batches) {
  await createMany(batch); // ← One at a time ✅
  updateProgress();
}

// Benefits:
// - Server friendly (1 connection at a time)
// - Low memory (process one batch at a time)
// - Easy error tracking (know exact batch)
// - Clear progress (1/100, 2/100, ...)
```

#### Real Example - Upload Progress:

```tsx
function ImportButton() {
  const { inputProps, isLoading } = useImport({
    batchSize: 50,
    onProgress: ({ totalAmount, processedAmount }) => {
      console.log(`Batch ${processedAmount}/${totalAmount}`);
      // Sequential → Predictable progress! ✅
      // Batch 1/100 → 2/100 → 3/100 → ...
    },
  });

  return (
    <div>
      <input {...inputProps} />
      {isLoading && <ProgressBar />}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Server Friendly** - No overload
- ✅ **Predictable** - Clear progress tracking
- ✅ **Error Tracking** - Know exactly which batch failed
- ✅ **Memory Efficient** - Process one batch at a time

---

### 2.2 Chunking Pattern - Batch Processing

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Loading Truck

```
Moving 1000 Boxes:

ONE BY ONE (batchSize=1):
→ Trip 1: 1 box
→ Trip 2: 1 box
→ Trip 3: 1 box
→ ...
→ Trip 1000: 1 box
→ 1000 trips! ❌ Inefficient!

ALL AT ONCE (batchSize=1000):
→ Trip 1: 1000 boxes
→ Truck too heavy! 💥
→ Crashes! ❌

BATCHES (batchSize=10):
→ Trip 1: 10 boxes ✅
→ Trip 2: 10 boxes ✅
→ ...
→ Trip 100: 10 boxes ✅
→ 100 trips! Perfect! ✅

useImport chunking = Loading truck!
→ Configurable batch size
→ Balance efficiency & safety ✅
```

**Chunking Pattern** = Split large array into smaller chunks

#### Implementation:

```typescript
// From index.tsx (lines 248-270)

import chunk from "lodash/chunk";

// Step 1: Split values into chunks
const chunks = chunk(values, batchSize);
// ↑ lodash chunk utility

// Example:
values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 10 items
batchSize = 3;

chunks = chunk(values, 3);
// [
//   [1, 2, 3],      // Chunk 1
//   [4, 5, 6],      // Chunk 2
//   [7, 8, 9],      // Chunk 3
//   [10]            // Chunk 4 (smaller)
// ]

// Step 2: Create function for each chunk
const chunkedFns = chunks.map((chunkedValues) => {
  const fn = async () => {
    const response = await createMany.mutateAsync({
      resource: identifier ?? "",
      values: chunkedValues, // ← Entire chunk!
      // ...
    });

    return {
      response,
      value: chunkedValues,
      currentBatchLength: chunkedValues.length,
    };
  };

  return fn;
});

// Step 3: Process chunks sequentially
await sequentialPromises(chunkedFns, onSuccess, onError);
```

#### Batch Size Strategies:

```typescript
// STRATEGY 1: Single (batchSize=1)
const { inputProps } = useImport({
  batchSize: 1,
});

// Flow:
// → Uses useCreate (not useCreateMany)
// → POST /products (1 record)
// → POST /products (1 record)
// → ... 1000 times
// → Slowest but most compatible

// STRATEGY 2: Small batches (batchSize=10)
const { inputProps } = useImport({
  batchSize: 10,
});

// Flow:
// → Uses useCreateMany
// → POST /products (10 records)
// → POST /products (10 records)
// → ... 100 times
// → Good balance

// STRATEGY 3: Large batches (batchSize=100)
const { inputProps } = useImport({
  batchSize: 100,
});

// Flow:
// → Uses useCreateMany
// → POST /products (100 records)
// → ... 10 times
// → Fastest but risk of timeout

// STRATEGY 4: All at once (batchSize=Number.MAX_SAFE_INTEGER)
const { inputProps } = useImport({
  batchSize: Number.MAX_SAFE_INTEGER, // Default!
});

// Flow:
// → POST /products (ALL 1000 records)
// → 1 request total
// → Fastest but high risk
```

#### Choosing Batch Size:

```
Small dataset (< 100 items):
→ batchSize = 50-100 or MAX_SAFE_INTEGER
→ Fast, low risk

Medium dataset (100-1000 items):
→ batchSize = 10-50
→ Good balance

Large dataset (> 1000 items):
→ batchSize = 10-20
→ Safer, slower
→ Better progress tracking

Server limits:
→ Check backend max payload size
→ Adjust batchSize accordingly
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Efficiency** - Fewer requests than one-by-one
- ✅ **Safety** - Smaller than all-at-once
- ✅ **Flexibility** - Configurable for different needs
- ✅ **Progress** - Track batch completion

---

### 2.3 Mapper Pattern - Data Transformation

#### 🔄 VÍ DỤ ĐỜI THƯỜNG: Airport Customs

```
Importing Goods:

RAW (from CSV):
→ Prices as strings: "99.99"
→ Quantities as strings: "50"
→ Dates as strings: "2024-01-01"
→ Can't use directly! ❌

PROCESSED (after mapper):
→ Prices as numbers: 99.99 ✅
→ Quantities as integers: 50 ✅
→ Dates as Date objects: new Date(...) ✅
→ Ready to use! ✅

mapData = Customs officer!
→ Inspects each item
→ Converts to proper format
→ Ready for backend! ✅
```

**Mapper Pattern** = Transform data structure

#### Implementation:

```typescript
// From index.tsx (lines 130, 202) and importCSVMapper

// Step 1: importCSVMapper helper
export const importCSVMapper = (data: any[][], mapData: Function) => {
  const [headers, ...body] = data;
  // ↑ Extract first row as headers

  return (
    body
      .map((entry) => fromPairs(zip(headers, entry)))
      // ↑ Zip headers with each row to create objects

      .map((item, index, array) => mapData(item, index, array))
  );
  // ↑ Apply user's transformation
};

// Example transformation:
// Input CSV:
// [
//   ["name", "price", "stock"],        // Headers
//   ["Product A", "99.99", "50"],      // Row 1
//   ["Product B", "49.99", "100"],     // Row 2
// ]

// After zip:
// [
//   { name: "Product A", price: "99.99", stock: "50" },
//   { name: "Product B", price: "49.99", stock: "100" },
// ]

// After mapData:
const { inputProps } = useImport({
  mapData: (item) => ({
    name: item.name,
    price: parseFloat(item.price), // ← String to number!
    stock: parseInt(item.stock), // ← String to integer!
    available: parseInt(item.stock) > 0, // ← Computed field!
  }),
});

// Result:
// [
//   { name: "Product A", price: 99.99, stock: 50, available: true },
//   { name: "Product B", price: 49.99, stock: 100, available: true },
// ]
```

#### Common Transformations:

```typescript
const { inputProps } = useImport({
  mapData: (item, index) => ({
    // TYPE CONVERSIONS:
    price: parseFloat(item.price), // String → Number
    stock: parseInt(item.stock, 10), // String → Integer
    active: item.active === "true", // String → Boolean
    tags: item.tags.split(","), // String → Array

    // DATE PARSING:
    createdAt: new Date(item.createdAt), // String → Date

    // COMPUTED FIELDS:
    total: parseFloat(item.price) * parseInt(item.stock),
    index: index + 1, // Row number

    // VALIDATION:
    status: item.stock > 0 ? "available" : "out_of_stock",

    // RENAMING:
    productName: item.name, // name → productName

    // DEFAULTS:
    category: item.category || "Uncategorized",

    // CLEANING:
    description: item.description?.trim(),
  }),
});
```

#### Real Example - E-commerce Import:

```tsx
function ProductImport() {
  const { inputProps, isLoading } = useImport({
    resource: "products",
    mapData: (item, index) => ({
      // Required fields
      sku: item.sku.toUpperCase().trim(),
      name: item.name.trim(),

      // Type conversions
      price: parseFloat(item.price) || 0,
      cost: parseFloat(item.cost) || 0,
      stock: parseInt(item.stock, 10) || 0,

      // Computed fields
      profit: parseFloat(item.price) - parseFloat(item.cost),
      margin:
        ((parseFloat(item.price) - parseFloat(item.cost)) /
          parseFloat(item.price)) *
        100,

      // Categories (comma-separated to array)
      categories: item.categories?.split(",").map((c) => c.trim()) || [],

      // Boolean conversions
      featured: item.featured?.toLowerCase() === "true",
      active: item.active?.toLowerCase() !== "false", // Default true

      // Date parsing
      launchDate: item.launchDate ? new Date(item.launchDate) : new Date(),

      // Validation
      status: parseInt(item.stock) > 0 ? "in_stock" : "out_of_stock",

      // Metadata
      importedAt: new Date(),
      importBatch: `batch-${Date.now()}`,
      rowNumber: index + 1,
    }),
  });

  return <input {...inputProps} disabled={isLoading} />;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Type Safety** - Convert strings to proper types
- ✅ **Validation** - Clean and validate data
- ✅ **Enrichment** - Add computed fields
- ✅ **Flexibility** - Transform however needed

---

### 2.4 Progress Tracking Pattern - Observable Progress

#### 📊 VÍ DỤ ĐỜI THƯỜNG: Pizza Delivery Tracker

```
Pizza Delivery:

NO TRACKING (bad):
→ Order pizza
→ Wait...
→ Is it coming? 🤷
→ No idea! ❌

WITH TRACKING (good):
→ Order pizza
→ Preparing (25%) 🍕
→ Baking (50%) 🔥
→ Out for delivery (75%) 🚗
→ Delivered (100%) ✅
→ Always know status! ✅

useImport progress = Pizza tracker!
→ onProgress callback
→ Real-time updates
→ Show progress bar! ✅
```

**Progress Tracking Pattern** = Observable progress updates

#### Implementation:

```typescript
// From index.tsx (lines 192-194, 227-229, 274-277)

// State for tracking
const [processedAmount, setProcessedAmount] = useState<number>(0);
const [totalAmount, setTotalAmount] = useState<number>(0);

// Update total when parsing completes
const values = importCSVMapper(data, mapData);
setTotalAmount(values.length); // ← Total items

// Update processed after each batch
await sequentialPromises(
  chunkedFns,
  ({ response, currentBatchLength }) => {
    // After each successful batch:
    setProcessedAmount((prev) => prev + currentBatchLength);
    // ↑ Increment by batch size

    return { type: "success", ... };
  },
);

// Notify user via useEffect
useEffect(() => {
  onProgress?.({ totalAmount, processedAmount });
  // ↑ Callback on every update
}, [totalAmount, processedAmount]);
```

#### Progress Calculation:

```typescript
const { inputProps, isLoading } = useImport({
  batchSize: 10,
  onProgress: ({ totalAmount, processedAmount }) => {
    // Calculate percentage
    const percentage = (processedAmount / totalAmount) * 100;

    // Calculate remaining
    const remaining = totalAmount - processedAmount;

    // Estimate time (if tracked)
    const itemsPerSecond = processedAmount / elapsedSeconds;
    const remainingSeconds = remaining / itemsPerSecond;

    console.log({
      total: totalAmount, // 1000
      processed: processedAmount, // 350
      percentage: percentage.toFixed(1), // "35.0%"
      remaining, // 650
      eta: `${remainingSeconds}s`, // "180s"
    });
  },
});
```

#### Real Example - Progress Bar UI:

```tsx
function ImportWithProgress() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>("idle");

  const { inputProps, isLoading } = useImport({
    resource: "products",
    batchSize: 50,

    onProgress: ({ totalAmount, processedAmount }) => {
      const percent = Math.floor((processedAmount / totalAmount) * 100);
      setProgress(percent);

      if (percent < 100) {
        setStatus(`Importing... ${processedAmount}/${totalAmount}`);
      }
    },

    onFinish: ({ succeeded, errored }) => {
      setProgress(100);
      setStatus(
        `Complete! Success: ${succeeded.length}, Failed: ${errored.length}`,
      );
    },
  });

  return (
    <div>
      <input {...inputProps} disabled={isLoading} />

      {isLoading && (
        <div className="progress-container">
          <div className="progress-bar" style={{ width: `${progress}%` }}>
            {progress}%
          </div>
          <p>{status}</p>
        </div>
      )}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **User Feedback** - Show import progress
- ✅ **ETA Estimation** - Calculate remaining time
- ✅ **Transparency** - User knows what's happening
- ✅ **Confidence** - Not just a spinner

---

### 2.5 Error Recovery Pattern - Resilient Processing

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Assembly Line

```
Manufacturing Products:

FAIL-FAST (bad):
→ Process item 1: OK ✅
→ Process item 2: OK ✅
→ Process item 3: DEFECT! ❌
→ STOP ENTIRE LINE! 💥
→ Items 4-100 not processed! ❌

FAIL-RESILIENT (good):
→ Process item 1: OK ✅
→ Process item 2: OK ✅
→ Process item 3: DEFECT! ❌
→ Mark as defective
→ CONTINUE LINE! ✅
→ Process items 4-100 ✅
→ Report defects at end ✅

useImport = Resilient assembly!
→ One batch fails?
→ Continue with rest! ✅
```

**Error Recovery Pattern** = Continue processing despite errors

#### Implementation:

```typescript
// From sequentialPromises (lines 22-29)

for (const [index, promise] of promises.entries()) {
  try {
    const result = await promise();
    results.push(onEachResolve(result, index));
    // ↑ Success: Add to results
  } catch (error) {
    results.push(onEachReject(error, index));
    // ↑ Error: Still add to results! Don't throw!
    // ↑ Continue to next iteration! ✅
  }
}
// ↑ ALL batches processed, regardless of errors!

// Usage:
await sequentialPromises(
  chunkedFns,
  (response) => {
    // Success handler
    return {
      type: "success",
      response: response.data,
      request: values,
    };
  },
  (error, index) => {
    // Error handler - NOT thrown, just recorded!
    return {
      type: "error",
      response: [error],
      request: chunks[index],
    };
  },
);
```

#### Error Handling Flow:

```typescript
// Scenario: Importing 100 batches, batch 5 fails

// Batch 1: Success → { type: "success", ... }
// Batch 2: Success → { type: "success", ... }
// Batch 3: Success → { type: "success", ... }
// Batch 4: Success → { type: "success", ... }
// Batch 5: ERROR! → { type: "error", response: [error], request: [...] }
//   ↑ Caught! Recorded! Continue! ✅
// Batch 6: Success → { type: "success", ... }
// Batch 7: Success → { type: "success", ... }
// ...
// Batch 100: Success → { type: "success", ... }

// Final result:
{
  succeeded: 99 batches,  // ✅
  errored: 1 batch        // ❌
}
```

#### Real Example - Error Reporting:

```tsx
function ImportWithErrorHandling() {
  const [errors, setErrors] = useState<any[]>([]);

  const { inputProps } = useImport({
    resource: "products",
    batchSize: 10,

    onFinish: ({ succeeded, errored }) => {
      if (errored.length > 0) {
        // Extract failed items
        const failedItems = errored.flatMap((e) => e.request);
        setErrors(failedItems);

        // Show summary
        toast.error(
          `Import complete! ${succeeded.length} succeeded, ${errored.length} failed`,
        );

        // Optionally download failed items
        const csv = generateCSV(failedItems);
        downloadCSV(csv, "failed-items.csv");
      } else {
        toast.success(`All ${succeeded.length} items imported!`);
      }
    },
  });

  return (
    <div>
      <input {...inputProps} />

      {errors.length > 0 && (
        <div className="errors">
          <h3>Failed Items ({errors.length})</h3>
          <ul>
            {errors.map((item, i) => (
              <li key={i}>
                {item.name}: {item.error}
              </li>
            ))}
          </ul>
          <button onClick={() => retryFailed(errors)}>Retry Failed</button>
        </div>
      )}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Resilience** - Don't fail entire import
- ✅ **Partial Success** - Import what can be imported
- ✅ **Error Reporting** - Know what failed
- ✅ **Retry** - Can retry just failed items

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern               | Ví dụ đời thường | Giải quyết vấn đề gì    | Trong useImport                |
| --------------------- | ---------------- | ----------------------- | ------------------------------ |
| **Sequential**        | Traffic light    | Process one at a time   | Prevent server overload        |
| **Chunking**          | Loading truck    | Batch processing        | Configurable batch sizes       |
| **Mapper**            | Airport customs  | Data transformation     | CSV → Clean objects            |
| **Progress Tracking** | Pizza tracker    | Observable progress     | Real-time progress updates     |
| **Error Recovery**    | Assembly line    | Continue despite errors | Partial success, error reports |

---

## 3. KEY FEATURES

### 3.1 Configurable Batch Size

```typescript
// Single record at a time
const single = useImport({ batchSize: 1 });

// Small batches
const small = useImport({ batchSize: 10 });

// All at once (default)
const allAtOnce = useImport({ batchSize: Number.MAX_SAFE_INTEGER });
```

### 3.2 Progress Tracking

```typescript
const { inputProps } = useImport({
  onProgress: ({ totalAmount, processedAmount }) => {
    const percent = (processedAmount / totalAmount) * 100;
    console.log(`${percent.toFixed(1)}% complete`);
  },
});
```

### 3.3 Error Handling & Reporting

```typescript
const { inputProps } = useImport({
  onFinish: ({ succeeded, errored }) => {
    console.log(`✅ Success: ${succeeded.length}`);
    console.log(`❌ Failed: ${errored.length}`);

    // Download failed items for retry
    if (errored.length > 0) {
      const failedItems = errored.flatMap((e) => e.request);
      downloadFailedCSV(failedItems);
    }
  },
});
```

### 3.4 Data Transformation

```typescript
const { inputProps } = useImport({
  mapData: (item) => ({
    name: item.name.trim(),
    price: parseFloat(item.price),
    stock: parseInt(item.stock, 10),
    active: item.active !== "false",
  }),
});
```

### 3.5 Input Props Binding

```typescript
const { inputProps } = useImport();

// Spread directly to input element
<input {...inputProps} />;
// Automatically configured:
// - type="file"
// - accept=".csv"
// - onChange handler
```

---

## 4. COMMON USE CASES

### 4.1 Basic CSV Import

```tsx
function ProductImport() {
  const { inputProps, isLoading } = useImport({
    resource: "products",
  });

  return (
    <div>
      <input {...inputProps} disabled={isLoading} />
      {isLoading && <p>Importing...</p>}
    </div>
  );
}
```

### 4.2 Import with Progress Bar

```tsx
function ImportWithProgress() {
  const [progress, setProgress] = useState(0);

  const { inputProps } = useImport({
    resource: "products",
    batchSize: 50,
    onProgress: ({ totalAmount, processedAmount }) => {
      setProgress((processedAmount / totalAmount) * 100);
    },
  });

  return (
    <div>
      <input {...inputProps} />
      <progress value={progress} max={100} />
      <span>{progress.toFixed(0)}%</span>
    </div>
  );
}
```

### 4.3 Import with Data Transformation

```tsx
function UserImport() {
  const { inputProps } = useImport({
    resource: "users",
    mapData: (item) => ({
      firstName: item["First Name"],
      lastName: item["Last Name"],
      email: item.Email.toLowerCase(),
      age: parseInt(item.Age, 10),
      premium: item.Premium === "yes",
      registeredAt: new Date(item["Registration Date"]),
    }),
  });

  return <input {...inputProps} />;
}
```

### 4.4 Import with Error Handling

```tsx
function ImportWithErrors() {
  const [summary, setSummary] = useState<string>("");

  const { inputProps } = useImport({
    resource: "products",
    onFinish: ({ succeeded, errored }) => {
      const total = succeeded.length + errored.length;
      setSummary(
        `Imported ${total} items: ${succeeded.length} succeeded, ${errored.length} failed`,
      );

      if (errored.length > 0) {
        console.error("Failed items:", errored);
      }
    },
  });

  return (
    <div>
      <input {...inputProps} />
      {summary && <div className="summary">{summary}</div>}
    </div>
  );
}
```

### 4.5 Large File Import with Batching

```tsx
function BulkImport() {
  const [stats, setStats] = useState({ total: 0, processed: 0 });

  const { inputProps, isLoading } = useImport({
    resource: "products",
    batchSize: 100, // Large batches for efficiency

    onProgress: ({ totalAmount, processedAmount }) => {
      setStats({ total: totalAmount, processed: processedAmount });
    },

    onFinish: ({ succeeded, errored }) => {
      toast.success(
        `Import complete! ${succeeded.length}/${
          succeeded.length + errored.length
        } items`,
      );
    },
  });

  return (
    <div>
      <input {...inputProps} disabled={isLoading} />
      {isLoading && (
        <div>
          Processing: {stats.processed} / {stats.total}
        </div>
      )}
    </div>
  );
}
```

### 4.6 Manual Trigger (Not Auto-upload)

```tsx
function ManualImport() {
  const [file, setFile] = useState<File | null>(null);

  const { handleChange, isLoading } = useImport({
    resource: "products",
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (file) {
      await handleChange({ file });
    }
  };

  return (
    <div>
      <input type="file" accept=".csv" onChange={handleFileSelect} />
      <button onClick={handleImport} disabled={!file || isLoading}>
        {isLoading ? "Importing..." : "Import File"}
      </button>
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Sequential vs Parallel?

**Answer:** Server stability and progress tracking

```
Parallel (rejected):
→ All batches at once
→ Server overload risk
→ Hard to track progress
→ Memory intensive

Sequential (chosen):
→ One batch at a time
→ Server friendly
→ Clear progress
→ Low memory footprint
```

### 5.2 Why Default batchSize = MAX_SAFE_INTEGER?

**Answer:** Best performance when supported

```
When createMany supported:
→ Send all in one request
→ Fastest import
→ Fewest network calls

When createMany not supported:
→ Set batchSize=1
→ Falls back to create
→ Still works, just slower
```

### 5.3 Why Continue on Error?

**Answer:** Partial success better than total failure

```
Fail-fast (rejected):
→ One error stops all
→ Lose all progress
→ Must restart from scratch

Fail-resilient (chosen):
→ Error recorded
→ Continue processing
→ Partial success
→ Can retry failed items
```

### 5.4 Why PapaParse Library?

**Answer:** Robust CSV parsing

```
Manual parsing (rejected):
→ Handle edge cases
→ Quote handling
→ Escape characters
→ Different encodings
→ Too complex!

PapaParse (chosen):
→ Industry standard
→ Handles all edge cases
→ Configurable
→ Well-tested
```

### 5.5 Why Return inputProps?

**Answer:** Convenience and consistency

```
Without inputProps:
→ User must configure manually
→ type="file"
→ accept=".csv"
→ onChange handler
→ Boilerplate!

With inputProps:
→ <input {...inputProps} />
→ One line!
→ Consistent API
```

---

## 6. COMMON PITFALLS

### 6.1 Not Handling Loading State

```typescript
// ❌ WRONG
const { inputProps } = useImport();
return <input {...inputProps} />;
// Input enabled during import! Multiple uploads!

// ✅ CORRECT
const { inputProps, isLoading } = useImport();
return <input {...inputProps} disabled={isLoading} />;
```

### 6.2 Forgetting mapData for Type Conversion

```typescript
// ❌ WRONG
const { inputProps } = useImport();
// CSV: "99.99" (string)
// Backend expects: 99.99 (number)
// Type mismatch error! ❌

// ✅ CORRECT
const { inputProps } = useImport({
  mapData: (item) => ({
    price: parseFloat(item.price), // String → Number
  }),
});
```

### 6.3 Using Large Batch Size Without createMany

```typescript
// ❌ WRONG
const { inputProps } = useImport({
  batchSize: 100, // Large batch
  // But dataProvider doesn't support createMany!
  // Error! ❌
});

// ✅ CORRECT - Check backend support
const { inputProps } = useImport({
  batchSize: dataProvider.hasCreateMany ? 100 : 1,
});
```

### 6.4 Not Showing Progress

```typescript
// ❌ BAD - No feedback
const { inputProps, isLoading } = useImport();
return (
  <div>
    <input {...inputProps} />
    {isLoading && "Loading..."} {/* No progress! */}
  </div>
);

// ✅ GOOD - With progress
const [progress, setProgress] = useState(0);
const { inputProps, isLoading } = useImport({
  onProgress: ({ totalAmount, processedAmount }) => {
    setProgress((processedAmount / totalAmount) * 100);
  },
});
return (
  <div>
    <input {...inputProps} />
    {isLoading && `${progress.toFixed(0)}% complete`}
  </div>
);
```

### 6.5 Not Handling Errors

```typescript
// ❌ WRONG - Silent failure
const { inputProps } = useImport();
// Import fails → User doesn't know!

// ✅ CORRECT - Error notification
const { inputProps } = useImport({
  onFinish: ({ succeeded, errored }) => {
    if (errored.length > 0) {
      toast.error(`${errored.length} items failed to import`);
    }
  },
});
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Batch Size Sweet Spot

```
Too small (batchSize=1):
→ Many API calls
→ Slow import
→ Network overhead

Too large (batchSize=1000):
→ Risk of timeout
→ Large payload
→ Server strain

Recommended: 10-50
→ Good balance
→ Fast enough
→ Safe enough
```

### 7.2 Sequential vs Parallel

```
Sequential (current):
→ 1 request at a time
→ Safe for server
→ Slower total time

Parallel (not implemented):
→ N requests at once
→ Risk server overload
→ Faster total time
→ Complex error handling
```

### 7.3 Memory Considerations

```
Small file (< 1000 rows):
→ batchSize = MAX_SAFE_INTEGER
→ One request
→ Fast

Large file (> 10000 rows):
→ batchSize = 10-50
→ Process in chunks
→ Lower memory
```

---

## 8. TESTING

```typescript
// From index.spec.tsx

describe("useImport", () => {
  it("should call onProgress", async () => {
    const onProgressMock = vi.fn();

    const { result } = renderHook(
      () =>
        useImport({
          batchSize: 1,
          onProgress: onProgressMock,
        }),
      { wrapper: TestWrapper({ dataProvider: MockJSONServer }) },
    );

    await act(async () => {
      await result.current.handleChange({ file: csvFile });
    });

    expect(onProgressMock).toHaveBeenCalledWith({
      totalAmount: 3,
      processedAmount: 3,
    });
  });

  it("should handle batch processing", async () => {
    const createManyMock = vi.fn();

    renderHook(
      () =>
        useImport({
          batchSize: 2, // 2 items per batch
        }),
      {
        wrapper: TestWrapper({
          dataProvider: {
            createMany: createManyMock,
          },
        }),
      },
    );

    // CSV has 3 items → 2 batches
    expect(createManyMock).toHaveBeenCalledTimes(2);
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Sequential**: Process batches one at a time
- ✅ **Chunking**: Split large imports into batches
- ✅ **Mapper**: Transform CSV data
- ✅ **Progress Tracking**: Observable import progress
- ✅ **Error Recovery**: Continue despite failures

### Key Features

1. **CSV Parsing** - PapaParse integration
2. **Batch Processing** - Configurable batch sizes
3. **Progress Tracking** - Real-time progress updates
4. **Error Handling** - Resilient processing
5. **Data Transformation** - mapData function
6. **Input Binding** - Convenient inputProps

### Khi nào dùng useImport?

✅ **Nên dùng:**

- Import CSV files to backend
- Bulk data creation
- Data migration
- User data uploads
- Initial system setup

❌ **Không dùng:**

- Export data (use useExport)
- Single record creation (use useCreate)
- Non-CSV formats (use custom logic)
- Real-time data sync (use live provider)

### Remember

✅ **321 lines** - CSV import utility
🚦 **Sequential** - One batch at a time
📦 **Chunking** - Configurable batches
🔄 **Mapper** - Transform CSV data
📊 **Progress** - Track import status
🛡️ **Resilient** - Continue on errors

---

> 📚 **Best Practice**: Always use **mapData** to convert types (strings → numbers). Set appropriate **batchSize** (10-50 recommended). Always show **progress** to user. Handle **errors** gracefully with onFinish. Use **sequential** processing to avoid server overload. Test with **large files** before production!
