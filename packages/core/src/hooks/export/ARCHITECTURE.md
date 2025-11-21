# Kiến trúc và Design Patterns của useExport Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │               IMPORT/EXPORT SYSTEM                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useImport → Import CSV to API                   │  │
│  │                                                   │  │
│  │  useExport ✅ (THIS HOOK)                        │  │
│  │    → Export API data to CSV                      │  │
│  │         │                                         │  │
│  │         ├──→ BATCH FETCHING (Iterator Pattern):  │  │
│  │         │     - Fetches data page by page        │  │
│  │         │     - Prevents browser freeze          │  │
│  │         │     - Handles large datasets           │  │
│  │         │                                         │  │
│  │         ├──→ CSV GENERATION (Adapter Pattern):   │  │
│  │         │     - Uses PapaParse library           │  │
│  │         │     - Handles escaping, quotes, etc.   │  │
│  │         │                                         │  │
│  │         └──→ DATA MAPPING (Strategy Pattern):    │  │
│  │               - Transform data before export      │  │
│  │               - Select specific columns           │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Automate the process of fetching, transforming, and downloading data as CSV.**

### 1.2 The Flow: Fetch → Transform → Download

```
User clicks "Export"
     │
     ▼
triggerExport()
     │
     ├──→ 1. FETCHING LOOP (Iterator) 🔄
     │    │  while (fetched < total) {
     │    │     API Call (Page 1) → [Data...]
     │    │     API Call (Page 2) → [Data...]
     │    │     ...
     │    │  }
     │
     ├──→ 2. TRANSFORMATION (Strategy) 🛠️
     │       data.map(item => mapData(item))
     │
     ├──→ 3. GENERATION (Adapter) 📄
     │       Papa.unparse(mappedData) → "id,title\n1,Hello..."
     │
     └──→ 4. DOWNLOAD ⬇️
             Create Blob → Trigger Browser Download
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useExport/index.ts: 233 dòng** - Export automation!

---

### 2.1 Iterator Pattern - Handling Large Datasets

#### 📚 VÍ DỤ ĐỜI THƯỜNG: Reading a Book Series

```
Reading "Harry Potter":

Bad Way (Fetch All):
- Try to read all 7 books at EXACTLY the same time.
- Result: Brain overload! 🤯

Good Way (Iterator):
- Read Book 1. Done?
- Read Book 2. Done?
- Read Book 3. Done?
- ...
- Result: Smooth reading! ✅

useExport:
- Fetches Page 1. Done?
- Fetches Page 2. Done?
- ...
- Until all data is loaded.
```

**Iterator Pattern** = Access elements of a collection sequentially without exposing underlying representation.

#### Implementation:

```typescript
let currentPage = 1;
let preparingData = true;

while (preparingData) {
  // Fetch one page
  const { data, total } = await getList({
    pagination: { currentPage, pageSize },
  });

  // Add to collection
  rawData.push(...data);

  // Check if done
  if (total === rawData.length) {
    preparingData = false;
  }

  currentPage++;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Memory Management** - Process chunks instead of crashing
- ✅ **Reliability** - Handles 10,000 records as easily as 10
- ✅ **UX** - Prevents browser from freezing during fetch

---

### 2.2 Strategy Pattern - Custom Data Transformation

#### 🎨 VÍ DỤ ĐỜI THƯỜNG: Printing Photos

```
Photo Printer:

Raw Photo: [High Res, Metadata, RAW format]

Strategies:
1. Passport Photo Strategy: Crop to face, 2x2 inch.
2. Instagram Strategy: Square crop, filter applied.
3. Backup Strategy: Keep original.

useExport (mapData):
- Raw API Data: { id: 1, title: "Post", user: { id: 5, name: "John" } }
- Strategy: "I only want Title and User Name"
- Result: { Title: "Post", Author: "John" }
```

**Strategy Pattern** = Define a family of algorithms (mappings) and make them interchangeable.

#### Implementation:

```typescript
// Default Strategy (Identity)
mapData = (item) => item;

// Custom Strategy (User provided)
const mapData = (item) => ({
  ID: item.id,
  Title: item.title,
  Category: item.category.title, // Flatten nested object
  Date: new Date(item.createdAt).toLocaleDateString(), // Format date
});

// Apply Strategy
const csvData = rawData.map(mapData);
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Export exactly what you need
- ✅ **Decoupling** - API structure ≠ Export structure
- ✅ **Formatting** - Format dates, currency, booleans for Excel

---

### 2.3 Adapter Pattern - CSV Generation

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Power Adapter

```
Your Device: 2-pin plug
Wall Socket: 3-pin socket

Adapter: Connects 2-pin to 3-pin.

useExport:
- Input: JavaScript Objects (Array of JSON)
- Output: CSV String (Comma Separated Values)

Adapter (PapaParse):
- Takes JSON
- Handles weird characters (quotes, commas in text)
- Outputs valid CSV
```

**Adapter Pattern** = Convert interface of a class into another interface clients expect.

#### Implementation:

```typescript
import papaparse from "papaparse";

// ... inside triggerExport
const csv = papaparse.unparse(mappedData, {
  quotes: true, // Wrap values in quotes "Value"
  header: true, // Include header row
});
```

---

## 3. KEY FEATURES

### 3.1 Batch Fetching (Pagination)

Instead of calling `getAll`, `useExport` calls `getList` multiple times.

```typescript
// Config
const { triggerExport } = useExport({
  pageSize: 50, // Fetch 50 items per request
  maxItemCount: 1000, // Stop after 1000 items
});
```

### 3.2 Browser Download Trigger

It automatically handles the file download process in the browser.

```typescript
// Creates a hidden link and clicks it
downloadInBrowser(filename, csvContent, "text/csv");
```

### 3.3 BOM (Byte Order Mark) Support

Crucial for Excel compatibility!

```typescript
// Adds \ufeff at the start of file
// Tells Excel: "This file is UTF-8 encoded!"
const content = `${useBom ? "\ufeff" : ""}${csv}`;
```

---

## 4. COMMON USE CASES

### 4.1 Simple Export

```tsx
const { triggerExport, isLoading } = useExport();

return (
  <Button onClick={triggerExport} loading={isLoading}>
    Export CSV
  </Button>
);
```

### 4.2 Export with Custom Columns

```tsx
const { triggerExport } = useExport({
  mapData: (item) => ({
    "Order ID": item.id,
    Customer: item.user.fullName,
    "Total ($)": item.amount.toFixed(2),
    Status: item.status.toUpperCase(),
  }),
});
```

### 4.3 Export Filtered Data

Connects with `useTable` filters!

```tsx
const { tableProps, filters, sorters } = useTable();

const { triggerExport } = useExport({
  filters, // Pass current table filters
  sorters, // Pass current table sorters
});

// Result: Exports only what the user currently sees!
```

---

## 5. PERFORMANCE CONSIDERATIONS

### ⚠️ Large Datasets

- **Browser Memory**: All fetched data is stored in `rawData` array in memory.
- **Limit**: If exporting 100,000+ records, the browser might crash.
- **Solution**: For massive exports, use a **Server-Side Export** (backend generates CSV and returns URL). `useExport` is for Client-Side generation.

### ⚠️ API Rate Limits

- **Batching**: `useExport` makes sequential requests.
- **Risk**: If `pageSize` is small and dataset is large, you might hit API rate limits (Too Many Requests).
- **Fix**: Increase `pageSize` (e.g., 100 or 500) to reduce number of requests.

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Iterator**: Fetches data page-by-page to handle pagination.
- ✅ **Strategy**: `mapData` allows custom data transformation.
- ✅ **Adapter**: Uses `papaparse` to convert JSON to CSV.

### Key Features

1. **Automated Pagination** - Handles fetching loop for you.
2. **Excel Compatibility** - BOM support prevents garbled characters.
3. **Filter Integration** - Exports exactly what's filtered in the UI.

### Remember

✅ **Client-Side Export** - Great for < 10,000 records.
✅ **Customizable** - Map data, change headers, filter results.
✅ **User Friendly** - Handles loading states and file downloads.
