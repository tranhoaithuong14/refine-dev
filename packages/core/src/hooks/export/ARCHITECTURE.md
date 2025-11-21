# Kiến trúc và Design Patterns của useExport Hook

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
│  │  useExport ✅ (THIS HOOK - CORE!)                 │  │
│  │    → Export data to CSV/Text files               │  │
│  │         │                                         │  │
│  │         ├──→ FETCH DATA:                         │  │
│  │         │     - Paginated batching (20/page)     │  │
│  │         │     - Filter & sort support            │  │
│  │         │     - Max item limit                   │  │
│  │         │     - Error handling                   │  │
│  │         │                                         │  │
│  │         ├──→ TRANSFORM:                          │  │
│  │         │     - mapData function                 │  │
│  │         │     - Select columns                   │  │
│  │         │     - Format values                    │  │
│  │         │                                         │  │
│  │         ├──→ GENERATE FILE:                      │  │
│  │         │     - CSV (default)                    │  │
│  │         │     - Text file (optional)             │  │
│  │         │     - PapaParse library                │  │
│  │         │     - BOM support (UTF-8)              │  │
│  │         │                                         │  │
│  │         └──→ DOWNLOAD:                           │  │
│  │               - Browser download                 │  │
│  │               - Custom filename                  │  │
│  │               - Optional title row               │  │
│  │                                                   │  │
│  │  Related hooks:                                  │  │
│  │    - useImport → Import CSV to backend           │  │
│  │    - useList → Fetch list data                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Export resource data to CSV/Text files - Perfect for data backup, reports, and data migration**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  USEEXPORT COMPLETE FLOW                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User Triggers Export                               │
│  const { triggerExport, isLoading } = useExport({           │
│    resource: "posts",                                        │
│    filters: [{ field: "status", operator: "eq",             │
│                value: "published" }],                        │
│    mapData: (item) => ({                                     │
│      id: item.id,                                            │
│      title: item.title,                                      │
│      author: item.author.name                                │
│    }),                                                       │
│    maxItemCount: 1000,                                       │
│    filename: "published-posts"                               │
│  });                                                         │
│                                                              │
│  <button onClick={triggerExport}>Export to CSV</button>     │
│  // ↑ User clicks button                                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Start Loading & Initialize Variables               │
│  setIsLoading(true);                                         │
│                                                              │
│  let rawData = [];                                           │
│  let currentPage = 1;                                        │
│  let preparingData = true;                                   │
│                                                              │
│  // Ready to fetch data in batches!                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Paginated Data Fetching (Loop)                     │
│  while (preparingData) {                                     │
│    // Fetch one page at a time                              │
│    const { data, total } = await getList({                  │
│      resource: "posts",                                      │
│      filters: [{ field: "status", ... }],                   │
│      sorters: [...],                                         │
│      pagination: {                                           │
│        currentPage: 1,  // Then 2, 3, 4...                  │
│        pageSize: 20,    // Configurable batch size          │
│        mode: "server"                                        │
│      }                                                       │
│    });                                                       │
│                                                              │
│    rawData.push(...data);  // Accumulate data               │
│    currentPage++;                                            │
│                                                              │
│    // Stop conditions:                                       │
│    // 1. Reached maxItemCount (user limit)                  │
│    // 2. Fetched all data (rawData.length === total)        │
│  }                                                           │
│                                                              │
│  Example:                                                    │
│  - Total: 100 posts                                          │
│  - Page 1: Fetch 20 posts (rawData = 20)                    │
│  - Page 2: Fetch 20 posts (rawData = 40)                    │
│  - Page 3: Fetch 20 posts (rawData = 60)                    │
│  - Page 4: Fetch 20 posts (rawData = 80)                    │
│  - Page 5: Fetch 20 posts (rawData = 100) → Stop! ✅        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Apply maxItemCount Limit                           │
│  if (maxItemCount && rawData.length >= maxItemCount) {      │
│    rawData = rawData.slice(0, maxItemCount);                │
│    preparingData = false;                                    │
│  }                                                           │
│                                                              │
│  Example:                                                    │
│  - maxItemCount = 50                                         │
│  - After page 3: rawData.length = 60                        │
│  - Slice to 50: rawData = rawData.slice(0, 50) ✅          │
│  - Stop fetching! (Save API calls)                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Transform Data with mapData                        │
│  const transformedData = rawData.map(mapData);               │
│                                                              │
│  mapData function:                                           │
│  (item) => ({                                                │
│    id: item.id,              // Select specific fields      │
│    title: item.title,                                        │
│    author: item.author.name, // Flatten nested objects      │
│    date: formatDate(item.createdAt) // Format values        │
│  })                                                          │
│                                                              │
│  Before:                                                     │
│  [                                                           │
│    {                                                         │
│      id: 1,                                                  │
│      title: "Post 1",                                        │
│      content: "...", // Not needed in export                │
│      author: { id: 10, name: "John", email: "..." },        │
│      createdAt: "2024-01-01T10:00:00Z",                     │
│      meta: { ... }   // Not needed                          │
│    }                                                         │
│  ]                                                           │
│                                                              │
│  After mapData:                                              │
│  [                                                           │
│    {                                                         │
│      id: 1,                                                  │
│      title: "Post 1",                                        │
│      author: "John",        // ← Flattened!                 │
│      date: "Jan 1, 2024"    // ← Formatted!                 │
│    }                                                         │
│  ]                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Generate CSV with PapaParse                        │
│  let csv = papaparse.unparse(                                │
│    transformedData,                                          │
│    {                                                         │
│      quotes: true,        // Wrap fields in quotes          │
│      header: true,        // Include column headers         │
│      delimiter: ",",      // Column separator               │
│      ...unparseConfig     // User custom config             │
│    }                                                         │
│  );                                                          │
│                                                              │
│  Generated CSV:                                              │
│  "id","title","author","date"                               │
│  "1","Post 1","John","Jan 1, 2024"                          │
│  "2","Post 2","Jane","Jan 2, 2024"                          │
│  "3","Post 3","Bob","Jan 3, 2024"                           │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Add Optional Title                                 │
│  if (showTitle) {                                            │
│    csv = `${title}\r\n\n${csv}`;                            │
│  }                                                           │
│                                                              │
│  Example with title:                                         │
│  Published Posts Report                                     │
│                                                              │
│  "id","title","author","date"                               │
│  "1","Post 1","John","Jan 1, 2024"                          │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: Download File in Browser                           │
│  const fileExtension = useTextFile ? ".txt" : ".csv";       │
│  const fileType = useTextFile ? "text/plain" : "text/csv";  │
│  const downloadFilename = `published-posts.csv`;            │
│                                                              │
│  downloadInBrowser(                                          │
│    downloadFilename,                                         │
│    `${useBom ? "\ufeff" : ""}${csv}`,  // BOM for UTF-8     │
│    fileType                                                  │
│  );                                                          │
│                                                              │
│  Browser triggers download:                                  │
│  → published-posts.csv                                       │
│  → User saves file! ✅                                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 9: Cleanup & Return                                   │
│  setIsLoading(false);                                        │
│  return csv;  // Return CSV string                          │
│                                                              │
│  User can:                                                   │
│  - Open in Excel/Google Sheets ✅                           │
│  - Import to database ✅                                    │
│  - Share with others ✅                                     │
│  - Backup data ✅                                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File index.ts: 233 dòng** - Powerful data export utility!

---

### 2.1 Batch Processing Pattern - Paginated Data Fetching

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Moving House with Truck

```
Moving 1000 boxes:

BAD APPROACH - All at once:
→ Load ALL 1000 boxes into one giant truck
→ Truck too heavy! ❌
→ Crashes! 💥
→ Memory overflow! ❌

GOOD APPROACH - Batches (Pagination):
→ Trip 1: Load 20 boxes, deliver
→ Trip 2: Load 20 boxes, deliver
→ Trip 3: Load 20 boxes, deliver
→ ...
→ Trip 50: Load 20 boxes, deliver ✅
→ Efficient! No overload! ✅

useExport = Moving truck with batches!
→ Fetch 20 records at a time
→ Accumulate data
→ Prevents memory issues! ✅
```

**Batch Processing Pattern** = Process large datasets in small chunks

#### Implementation:

```typescript
// From index.ts (lines 153-194)

const triggerExport = async () => {
  setIsLoading(true);

  let rawData: BaseRecord[] = []; // Accumulator
  let currentPage = 1;
  let preparingData = true;

  while (preparingData) {
    // ↑ Loop until all data fetched

    try {
      // Fetch ONE batch (page)
      const { data, total } = await getList<TData>({
        resource: resource?.name ?? "",
        filters,
        sorters: sorters ?? [],
        pagination: {
          currentPage, // ← Current batch number
          pageSize, // ← Batch size (default 20)
          mode: "server",
        },
        meta: combinedMeta,
      });

      currentPage++; // Next batch

      rawData.push(...data); // Accumulate data
      // ↑ Spread operator: Add all items from batch

      // Stop condition 1: Max limit reached
      if (maxItemCount && rawData.length >= maxItemCount) {
        rawData = rawData.slice(0, maxItemCount);
        preparingData = false;
      }

      // Stop condition 2: All data fetched
      if (total === rawData.length) {
        preparingData = false;
      }
    } catch (error) {
      setIsLoading(false);
      preparingData = false;
      onError?.(error);
      return;
    }
  }

  // All data fetched! Proceed to export...
};
```

#### Why Batch Processing?

```typescript
// WITHOUT batch processing (bad):
const allData = await getList({
  pagination: { pageSize: 999999 }, // ← Try to get everything!
});
// Problems:
// 1. Server timeout ⏳
// 2. Memory overflow (10,000 records = crash!) 💥
// 3. Slow network transfer ⏳
// 4. Poor user experience ❌

// WITH batch processing (good):
// Page 1: 20 records (0.5s) ✅
// Page 2: 20 records (0.5s) ✅
// Page 3: 20 records (0.5s) ✅
// ...
// Total: 1s per 40 records
// Efficient! Scalable! ✅
```

#### Real Example - Export 10,000 Posts:

```tsx
function ExportButton() {
  const { triggerExport, isLoading } = useExport({
    resource: "posts",
    pageSize: 50, // Batch size
    maxItemCount: 10000,
  });

  return (
    <button onClick={triggerExport} disabled={isLoading}>
      {isLoading ? "Exporting..." : "Export All Posts"}
    </button>
  );

  // Flow:
  // - Total: 10,000 posts
  // - Batch size: 50
  // - Batches: 10,000 / 50 = 200 batches
  // - Time: ~200 * 0.5s = 100s
  // - Progress: Can show progress bar!
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Scalability** - Handle large datasets (millions of records)
- ✅ **Memory Efficient** - No memory overflow
- ✅ **Server Friendly** - No timeout issues
- ✅ **Progressive** - Can show progress

---

### 2.2 Command Pattern - Triggered Action

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: TV Remote Control

```
TV Remote:

Components:
→ Button: "Power" button on remote
→ Command: Turn on TV
→ Receiver: TV itself

Flow:
1. Press button → Trigger command
2. Command executes → TV turns on ✅

useExport = TV remote!
→ triggerExport() = Press button
→ Export logic = Command
→ File download = Result ✅
```

**Command Pattern** = Encapsulate action as function

#### Implementation:

```typescript
// Hook returns command object:
export const useExport = (...options): UseExportReturnType => {
  const [isLoading, setIsLoading] = useState(false);

  const triggerExport = async () => {
    // ↑ Command function!
    // Encapsulates entire export logic
    // Can be called anytime
    // Returns Promise<string>

    setIsLoading(true);
    // ... fetch data
    // ... transform data
    // ... generate CSV
    // ... download file
    setIsLoading(false);
    return csv;
  };

  return {
    isLoading, // ← State
    triggerExport, // ← Command!
  };
};
```

#### Why Command Pattern?

```typescript
// ALTERNATIVE 1: Auto-export on mount (bad):
export const useExport = (options) => {
  useEffect(() => {
    // Export immediately when component mounts! ❌
    exportData();
  }, []);

  // Problem: No user control! ❌
  // Exports even if user doesn't want it!
};

// ALTERNATIVE 2: Command pattern (good):
export const useExport = (options) => {
  const triggerExport = async () => {
    // Only runs when user calls it! ✅
  };

  return { triggerExport }; // ← User decides when!
};

// Usage:
const { triggerExport } = useExport();

<button onClick={triggerExport}>Export</button>;
// ↑ User controls when to export! ✅
```

#### Real Example - Multiple Triggers:

```tsx
function PostList() {
  const { triggerExport, isLoading } = useExport({
    resource: "posts",
    mapData: (item) => ({
      id: item.id,
      title: item.title,
    }),
  });

  return (
    <div>
      {/* Trigger 1: Button */}
      <button onClick={triggerExport}>Export to CSV</button>

      {/* Trigger 2: Keyboard shortcut */}
      <div
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "e") {
            triggerExport();
          }
        }}
      >
        Press Ctrl+E to export
      </div>

      {/* Trigger 3: Conditional */}
      <button
        onClick={async () => {
          const confirmed = window.confirm("Export all data?");
          if (confirmed) {
            const csv = await triggerExport();
            console.log(`Exported ${csv.split("\n").length} rows`);
          }
        }}
      >
        Export with confirmation
      </button>

      {/* Flexible! User controls when! ✅ */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **User Control** - User decides when to export
- ✅ **Flexibility** - Multiple triggers possible
- ✅ **Testable** - Easy to test function
- ✅ **Reusable** - Can be called multiple times

---

### 2.3 Strategy Pattern - CSV vs Text File

#### 🎨 VÍ DỤ ĐỜI THƯỜNG: Paint Export

```
Photoshop Export:

Format options:
→ Strategy 1: Export as JPEG
→ Strategy 2: Export as PNG
→ Strategy 3: Export as PDF
→ Same image, different format! ✅

useExport = Image export!
→ Strategy 1: CSV file (.csv)
→ Strategy 2: Text file (.txt)
→ Same data, different format! ✅
```

**Strategy Pattern** = Choose algorithm at runtime

#### Implementation:

```typescript
// From index.ts (lines 212-221)

if (typeof window !== "undefined" && csv.length > 0 && (download ?? true)) {
  // Strategy selection based on useTextFile flag:

  const fileExtension = useTextFile ? ".txt" : ".csv";
  // ↑ STRATEGY 1: .txt
  // ↑ STRATEGY 2: .csv

  const fileType = `text/${useTextFile ? "plain" : "csv"};charset=utf8;`;
  // ↑ STRATEGY 1: text/plain
  // ↑ STRATEGY 2: text/csv

  const downloadFilename = `${filename.replace(/ /g, "_")}${fileExtension}`;

  downloadInBrowser(
    downloadFilename,
    `${useBom ? "\ufeff" : ""}${csv}`, // ← BOM strategy!
    fileType,
  );
}
```

#### BOM Strategy:

```typescript
// BOM (Byte Order Mark) strategy:

// WITH BOM (default):
const content = `${useBom ? "\ufeff" : ""}${csv}`;
// ↑ Adds UTF-8 BOM: \ufeff
// → Excel correctly detects UTF-8 encoding! ✅
// → Special characters display correctly: é, ñ, 中文 ✅

// WITHOUT BOM:
const content = csv;
// → Excel may use wrong encoding ⚠️
// → Special characters broken: é → Ã©, 中文 → ??? ❌
```

#### Real Example - Different Formats:

```tsx
function ExportOptions() {
  const csvExport = useExport({
    resource: "posts",
    useTextFile: false, // ← CSV strategy
    useBom: true, // ← With BOM
    filename: "posts-data",
  });

  const textExport = useExport({
    resource: "posts",
    useTextFile: true, // ← Text strategy
    filename: "posts-backup",
  });

  const noBomExport = useExport({
    resource: "posts",
    useBom: false, // ← No BOM strategy
    filename: "posts-ascii",
  });

  return (
    <div>
      {/* Strategy 1: CSV with BOM (Excel) */}
      <button onClick={csvExport.triggerExport}>
        Export CSV (Excel-friendly)
      </button>

      {/* Strategy 2: Text file (Simple) */}
      <button onClick={textExport.triggerExport}>
        Export TXT (Plain text)
      </button>

      {/* Strategy 3: CSV without BOM (ASCII) */}
      <button onClick={noBomExport.triggerExport}>
        Export CSV (ASCII only)
      </button>
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Multiple export formats
- ✅ **Compatibility** - BOM for Excel
- ✅ **User Choice** - Let user pick format
- ✅ **Runtime Selection** - No code duplication

---

### 2.4 Mapper Pattern - Data Transformation

#### 🔄 VÍ DỤ ĐỜI THƯỜNG: Coffee Filter

```
Coffee Making:

Raw coffee beans → Grinder → Ground coffee
Ground coffee → Filter → Clean coffee
Clean coffee → Cup → Ready to drink! ✅

useExport mapData = Coffee filter!
Raw data → mapData → Clean data
Clean data → CSV → Ready to export! ✅
```

**Mapper Pattern** = Transform data structure

#### Implementation:

```typescript
// From index.ts (lines 204-206)

let csv = papaparse.unparse(
  rawData.map(mapData as any), // ← Transform each item!
  finalUnparseConfig,
);

// mapData signature:
type MapDataFn<TItem, TVariables> = (
  item: TItem,
  index?: number,
  items?: TItem[],
) => TVariables;

// Example transformation:
const mapData = (item, index, items) => ({
  // SELECT specific fields:
  id: item.id,
  title: item.title,

  // FLATTEN nested objects:
  authorName: item.author.name, // item.author → item.authorName

  // FORMAT values:
  date: new Date(item.createdAt).toLocaleDateString(),

  // COMPUTE new fields:
  index: index + 1,
  total: items.length,

  // CONDITIONAL values:
  status: item.published ? "Published" : "Draft",
});
```

#### Why Mapper Pattern?

```typescript
// WITHOUT mapper (export everything):
const { triggerExport } = useExport({ resource: "posts" });
// Exports ALL fields:
// {
//   id, title, content, authorId, categoryId, tags,
//   createdAt, updatedAt, deletedAt, meta, settings,
//   permissions, ... (50+ fields!) ❌
// }

// WITH mapper (select only needed):
const { triggerExport } = useExport({
  resource: "posts",
  mapData: (item) => ({
    ID: item.id,
    Title: item.title,
    Author: item.author.name,
    Date: formatDate(item.createdAt),
  }),
});
// Exports only 4 clean fields! ✅
```

#### Real Example - Complex Transformation:

```tsx
function ProductExport() {
  const { triggerExport } = useExport({
    resource: "products",
    mapData: (product, index) => ({
      // Index
      "#": index + 1,

      // Basic fields
      SKU: product.sku,
      Name: product.name,

      // Flatten category
      Category: product.category?.name || "Uncategorized",

      // Format price
      Price: `$${product.price.toFixed(2)}`,

      // Calculate discount
      "Discount %": product.discount
        ? `${(product.discount * 100).toFixed(0)}%`
        : "No discount",

      // Final price
      "Final Price": `$${(
        product.price *
        (1 - (product.discount || 0))
      ).toFixed(2)}`,

      // Stock status
      Stock: product.stock > 0 ? `${product.stock} units` : "Out of stock",

      // Array to string
      Tags: product.tags.join(", "),

      // Date formatting
      "Added On": new Date(product.createdAt).toLocaleDateString("en-US"),
    }),
  });

  return <button onClick={triggerExport}>Export Products</button>;
}

// Exported CSV:
// #,SKU,Name,Category,Price,Discount %,Final Price,Stock,Tags,Added On
// 1,SKU001,Product 1,Electronics,$99.99,10%,$89.99,50 units,"new,sale",1/1/2024
// 2,SKU002,Product 2,Clothing,$49.99,No discount,$49.99,Out of stock,"featured",1/2/2024
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Clean Data** - Only export needed fields
- ✅ **Formatting** - Human-readable output
- ✅ **Flattening** - Nested → Flat structure
- ✅ **Computation** - Add calculated fields

---

### 2.5 Error Handling Pattern - Graceful Degradation

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Safety Net

```
Trapeze Artist:

WITHOUT safety net:
→ Perform trick
→ Fall → Injury! ❌

WITH safety net:
→ Perform trick
→ Fall → Caught by net! ✅
→ Try again!

useExport = Trapeze with safety net!
→ Try to fetch data
→ Error → Catch & handle! ✅
→ User notified!
```

**Error Handling Pattern** = Catch and handle errors gracefully

#### Implementation:

```typescript
// From index.ts (lines 186-193)

while (preparingData) {
  try {
    const { data, total } = await getList<TData>({
      // ... fetch data
    });
    // ... process data
  } catch (error) {
    // ↑ Catch ANY error during fetch!

    setIsLoading(false);
    // ↑ Stop loading state

    preparingData = false;
    // ↑ Stop loop

    onError?.(error);
    // ↑ Call user error handler (optional)

    return;
    // ↑ Exit function (no download)
  }
}
```

#### Error Scenarios:

```typescript
// ERROR 1: Network failure
// → Server down
// → No internet
// → Timeout
// → onError called with network error

// ERROR 2: API error
// → 401 Unauthorized
// → 403 Forbidden
// → 500 Server error
// → onError called with API error

// ERROR 3: Data processing error
// → Invalid data format
// → Null reference
// → Type mismatch
// → onError called with processing error
```

#### Real Example - Error Handling UI:

```tsx
function ExportWithErrorHandling() {
  const [error, setError] = useState<Error | null>(null);

  const { triggerExport, isLoading } = useExport({
    resource: "posts",
    onError: (err) => {
      console.error("Export failed:", err);
      setError(err);

      // Show toast notification
      toast.error(`Export failed: ${err.message}`);
    },
  });

  const handleExport = async () => {
    setError(null); // Reset error

    try {
      const csv = await triggerExport();

      if (csv) {
        toast.success(`Exported ${csv.split("\n").length - 1} rows!`);
      }
    } catch (err) {
      // Additional error handling
      console.error("Unexpected error:", err);
    }
  };

  return (
    <div>
      <button onClick={handleExport} disabled={isLoading}>
        {isLoading ? "Exporting..." : "Export Data"}
      </button>

      {error && (
        <div className="error">
          <p>❌ Export failed: {error.message}</p>
          <button onClick={handleExport}>Retry</button>
        </div>
      )}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **User Feedback** - Show error messages
- ✅ **Graceful Degradation** - Don't crash app
- ✅ **Recovery** - Allow retry
- ✅ **Debugging** - Log errors for analysis

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern              | Ví dụ đời thường     | Giải quyết vấn đề gì        | Trong useExport                 |
| -------------------- | -------------------- | --------------------------- | ------------------------------- |
| **Batch Processing** | Moving truck trips   | Handle large datasets       | Paginated data fetching         |
| **Command**          | TV remote            | User-triggered action       | triggerExport() function        |
| **Strategy**         | Export image formats | Choose algorithm at runtime | CSV vs Text, BOM vs no BOM      |
| **Mapper**           | Coffee filter        | Transform data structure    | mapData transformation          |
| **Error Handling**   | Safety net           | Graceful error recovery     | try/catch with onError callback |

---

## 3. KEY FEATURES

### 3.1 Paginated Batch Fetching

```typescript
const { triggerExport } = useExport({
  resource: "posts",
  pageSize: 50, // Fetch 50 records per batch
  maxItemCount: 1000, // Stop at 1000 records
});

// Flow:
// Batch 1: Fetch 50 (total: 50)
// Batch 2: Fetch 50 (total: 100)
// ...
// Batch 20: Fetch 50 (total: 1000) → Stop! ✅
```

### 3.2 Data Transformation

```typescript
const { triggerExport } = useExport({
  resource: "orders",
  mapData: (order) => ({
    "Order ID": order.id,
    Customer: order.customer.name,
    Total: `$${order.total.toFixed(2)}`,
    Status: order.status.toUpperCase(),
  }),
});

// Clean, formatted export! ✅
```

### 3.3 Filters & Sorting

```typescript
const { triggerExport } = useExport({
  resource: "products",
  filters: [
    { field: "category", operator: "eq", value: "electronics" },
    { field: "price", operator: "gte", value: 100 },
  ],
  sorters: [{ field: "price", order: "desc" }],
});

// Export filtered & sorted data! ✅
```

### 3.4 Custom CSV Configuration

```typescript
const { triggerExport } = useExport({
  resource: "users",
  unparseConfig: {
    delimiter: ";", // Use semicolon instead of comma
    header: true,
    quotes: true,
    quoteChar: '"',
    escapeChar: "\\",
  },
});

// Customized CSV format! ✅
```

### 3.5 Optional Title Row

```typescript
const { triggerExport } = useExport({
  resource: "sales",
  title: "Monthly Sales Report - January 2024",
  showTitle: true,
});

// CSV with title:
// Monthly Sales Report - January 2024
//
// "ID","Product","Amount"
// "1","Product A","$100"
// ...
```

### 3.6 BOM Support for UTF-8

```typescript
const { triggerExport } = useExport({
  resource: "international",
  useBom: true, // Add UTF-8 BOM
});

// Excel correctly displays: é, ñ, 中文, العربية ✅
```

---

## 4. COMMON USE CASES

### 4.1 Basic Export Button

```tsx
function PostList() {
  const { triggerExport, isLoading } = useExport({
    resource: "posts",
  });

  return (
    <div>
      <button onClick={triggerExport} disabled={isLoading}>
        {isLoading ? "Exporting..." : "Export to CSV"}
      </button>
    </div>
  );
}
```

### 4.2 Export with Filters

```tsx
function FilteredExport() {
  const [status, setStatus] = useState("published");
  const [dateFrom, setDateFrom] = useState("2024-01-01");

  const { triggerExport, isLoading } = useExport({
    resource: "posts",
    filters: [
      { field: "status", operator: "eq", value: status },
      { field: "createdAt", operator: "gte", value: dateFrom },
    ],
    filename: `posts-${status}-from-${dateFrom}`,
  });

  return (
    <div>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>

      <input
        type="date"
        value={dateFrom}
        onChange={(e) => setDateFrom(e.target.value)}
      />

      <button onClick={triggerExport} disabled={isLoading}>
        Export Filtered Posts
      </button>
    </div>
  );
}
```

### 4.3 Export with Data Transformation

```tsx
function TransformedExport() {
  const { triggerExport } = useExport({
    resource: "users",
    mapData: (user, index) => ({
      "#": index + 1,
      "Full Name": `${user.firstName} ${user.lastName}`,
      Email: user.email,
      "Join Date": new Date(user.createdAt).toLocaleDateString(),
      Status: user.active ? "Active" : "Inactive",
      "Total Orders": user.orders?.length || 0,
    }),
    filename: "users-report",
  });

  return <button onClick={triggerExport}>Export Users</button>;
}
```

### 4.4 Export with Progress Tracking

```tsx
function ExportWithProgress() {
  const [progress, setProgress] = useState(0);

  const { triggerExport, isLoading } = useExport({
    resource: "products",
    pageSize: 100,
    onError: (error) => {
      alert(`Export failed: ${error.message}`);
      setProgress(0);
    },
  });

  const handleExport = async () => {
    setProgress(0);

    // Simple progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 10, 90));
    }, 500);

    try {
      await triggerExport();
      clearInterval(interval);
      setProgress(100);
    } catch (error) {
      clearInterval(interval);
      setProgress(0);
    }
  };

  return (
    <div>
      <button onClick={handleExport} disabled={isLoading}>
        Export Products
      </button>

      {isLoading && (
        <div>
          <div className="progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}% completed...</p>
        </div>
      )}
    </div>
  );
}
```

### 4.5 Export without Download (Get CSV String)

```tsx
function ExportToClipboard() {
  const { triggerExport } = useExport({
    resource: "posts",
    download: false, // Don't download, just return CSV
  });

  const handleCopyToClipboard = async () => {
    const csv = await triggerExport();

    if (csv) {
      await navigator.clipboard.writeText(csv);
      alert("CSV copied to clipboard!");
    }
  };

  return <button onClick={handleCopyToClipboard}>Copy CSV to Clipboard</button>;
}
```

### 4.6 Export to Text File

```tsx
function ExportToText() {
  const { triggerExport } = useExport({
    resource: "logs",
    useTextFile: true, // Export as .txt instead of .csv
    filename: "system-logs",
    mapData: (log) => ({
      Timestamp: log.timestamp,
      Level: log.level,
      Message: log.message,
    }),
  });

  return <button onClick={triggerExport}>Export Logs (TXT)</button>;
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Paginated Fetching?

**Answer:** Prevent memory overflow and server timeout

```typescript
// WITHOUT pagination (bad):
// - Fetch 100,000 records at once
// - Memory: ~100MB+ ❌
// - Server timeout ⏳
// - Browser freezes 💥

// WITH pagination (good):
// - Fetch 20 records per batch
// - Memory: ~2MB per batch ✅
// - No timeout ✅
// - Smooth experience ✅
```

### 5.2 Why mapData Function?

**Answer:** Flexibility and data cleaning

```typescript
// Reasons:
// 1. Select only needed columns ✅
// 2. Flatten nested objects ✅
// 3. Format values for Excel ✅
// 4. Compute derived fields ✅
// 5. Rename columns ✅
```

### 5.3 Why BOM by Default?

**Answer:** Excel UTF-8 compatibility

```typescript
// WITHOUT BOM:
// - Excel uses default encoding (Windows-1252)
// - Special characters broken: José → JosÃ© ❌

// WITH BOM (default):
// - Excel detects UTF-8 encoding
// - Special characters correct: José ✅
```

### 5.4 Why Command Pattern (triggerExport)?

**Answer:** User control and flexibility

```typescript
// Reasons:
// 1. User decides when to export ✅
// 2. Can be called from anywhere ✅
// 3. Can be wrapped with confirmation ✅
// 4. Testable ✅
```

### 5.5 Why Return CSV String?

**Answer:** Flexibility for custom handling

```typescript
const csv = await triggerExport();

// Use cases:
// 1. Copy to clipboard ✅
// 2. Send to backend API ✅
// 3. Preview before download ✅
// 4. Custom download logic ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Not Handling Loading State

```typescript
// ❌ WRONG
const { triggerExport } = useExport();
return <button onClick={triggerExport}>Export</button>;
// Button clickable during export → Multiple triggers! ❌

// ✅ CORRECT
const { triggerExport, isLoading } = useExport();
return (
  <button onClick={triggerExport} disabled={isLoading}>
    {isLoading ? "Exporting..." : "Export"}
  </button>
);
```

### 6.2 Forgetting mapData for Nested Objects

```typescript
// ❌ WRONG
const { triggerExport } = useExport({ resource: "orders" });
// Exports: order.customer = [object Object] ❌

// ✅ CORRECT
const { triggerExport } = useExport({
  resource: "orders",
  mapData: (order) => ({
    id: order.id,
    customerName: order.customer.name, // ← Flatten!
    customerEmail: order.customer.email,
  }),
});
```

### 6.3 Not Setting maxItemCount

```typescript
// ❌ WRONG - No limit
const { triggerExport } = useExport({ resource: "logs" });
// Exports 1,000,000 logs → Memory crash! 💥

// ✅ CORRECT - Set limit
const { triggerExport } = useExport({
  resource: "logs",
  maxItemCount: 10000, // Safety limit!
});
```

### 6.4 Not Handling Errors

```typescript
// ❌ WRONG
const { triggerExport } = useExport({ resource: "posts" });
<button onClick={triggerExport}>Export</button>;
// Silent failure if API error! ❌

// ✅ CORRECT
const { triggerExport } = useExport({
  resource: "posts",
  onError: (error) => {
    toast.error(`Export failed: ${error.message}`);
  },
});
```

### 6.5 Large pageSize Causing Timeout

```typescript
// ❌ WRONG
const { triggerExport } = useExport({
  pageSize: 10000, // Too large! ⏳
});
// Server timeout! ❌

// ✅ CORRECT
const { triggerExport } = useExport({
  pageSize: 50, // Reasonable batch size ✅
});
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Batch Size (pageSize)

```
Small pageSize (10-20):
- More API calls ⏳
- Less memory per call ✅
- Slower overall ⏳

Medium pageSize (50-100):
- Balanced ✅
- Good for most cases ✅

Large pageSize (500+):
- Fewer API calls ✅
- More memory per call ⚠️
- Risk of timeout ⏳

Recommended: 50-100
```

### 7.2 maxItemCount Limit

```
No limit:
- Risk of memory overflow ❌
- Very slow for large datasets ⏳

With limit (1,000 - 10,000):
- Predictable performance ✅
- Prevents crashes ✅
- User can export in chunks ✅
```

### 7.3 mapData Complexity

```typescript
// SIMPLE (fast):
mapData: (item) => ({
  id: item.id,
  name: item.name,
});

// COMPLEX (slow):
mapData: (item, index, items) => ({
  id: item.id,
  name: item.name,
  // Expensive computation:
  similarity: items.map((other) => calculateSimilarity(item, other)),
});
// O(n²) complexity → Very slow for large datasets! ⏳
```

---

## 8. TESTING

```typescript
// From index.spec.ts

describe("useExport Hook", () => {
  it("should trigger export correctly", async () => {
    const { result } = renderHook(() => useExport(), {
      wrapper: TestWrapper({
        dataProvider: MockJSONServer,
        resources: [{ name: "posts" }],
      }),
    });

    let resultingCSV = null;
    await act(async () => {
      resultingCSV = await result.current.triggerExport();
    });

    expect(papaparse.unparse).toHaveBeenCalledWith(posts, expect.anything());
    expect(resultingCSV).toEqual(testCsv);
  });

  it("should work with custom mapData", async () => {
    const { result } = renderHook(
      () =>
        useExport({
          mapData: (item) => ({
            id: item.id,
            title: item.title,
          }),
        }),
      {
        wrapper: TestWrapper({
          dataProvider: MockJSONServer,
          resources: [{ name: "posts" }],
        }),
      },
    );

    await act(async () => {
      await result.current.triggerExport();
    });

    expect(papaparse.unparse).toHaveBeenCalledWith(
      posts.map((post) => ({
        id: post.id,
        title: post.title,
      })),
      expect.anything(),
    );
  });

  it("should handle getList throwing error", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useExport({ onError }), {
      wrapper: TestWrapper({
        dataProvider: {
          default: {
            ...MockJSONServer.default,
            getList: () => {
              throw new Error("Error");
            },
          },
        },
        resources: [{ name: "posts" }],
      }),
    });

    await act(async () => {
      await result.current.triggerExport();
    });

    expect(result.current.isLoading).toEqual(false);
    expect(onError).toHaveBeenCalledWith(Error("Error"));
    expect(papaparse.unparse).not.toHaveBeenCalled();
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Batch Processing**: Paginated fetching for scalability
- ✅ **Command**: User-triggered export action
- ✅ **Strategy**: CSV vs Text, BOM options
- ✅ **Mapper**: Transform data structure
- ✅ **Error Handling**: Graceful error recovery

### Key Features

1. **Paginated Fetching** - Handle large datasets efficiently
2. **Data Transformation** - mapData for clean exports
3. **Filters & Sorting** - Export filtered data
4. **Multiple Formats** - CSV or Text files
5. **BOM Support** - UTF-8 Excel compatibility
6. **Error Handling** - onError callback

### Khi nào dùng useExport?

✅ **Nên dùng:**

- Export data to CSV/Excel
- Backup data
- Generate reports
- Share data with non-technical users
- Data migration

❌ **Không dùng:**

- Real-time data sync (use websockets)
- Import data (use useImport)
- Small data (< 10 records, not worth it)
- Binary formats (PDF, images - use other tools)

### Remember

✅ **233 lines** - Powerful export utility
📦 **Batch Processing** - Paginated fetching
🎮 **Command** - User-triggered
🎨 **Strategy** - Multiple formats
🔄 **Mapper** - Transform data
🛡️ **Error Handling** - Graceful degradation

---

> 📚 **Best Practice**: Always use **mapData** to select and format fields. Set **maxItemCount** limit for safety. Use **pageSize** of 50-100 for best performance. Enable **BOM** for Excel compatibility. Always handle **onError** for user feedback. **Disable button** during export with isLoading state!
