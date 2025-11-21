# useSelect Hook - Kiến trúc và Thiết kế

## 1. Vai trò trong hệ thống

`useSelect` là một **Composite Data Hook** chuyên dụng cho các select/dropdown components. Hook này orchestrate nhiều data operations: fetch danh sách options (useList), load giá trị được chọn (useMany), search với debounce, và transform data thành format phù hợp cho UI libraries (Ant Design Select, MUI Autocomplete, etc.).

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELECT/DROPDOWN COMPONENT                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  <Select>                                                 │   │
│  │    {options.map(opt => (                                  │   │
│  │      <Option key={opt.value} value={opt.value}>          │   │
│  │        {opt.label}                                        │   │
│  │      </Option>                                            │   │
│  │    ))}                                                    │   │
│  │  </Select>                                                │   │
│  └────────────┬──────────────────────────────────────────────┘   │
│               │                                                  │
│               ▼                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  const { options, onSearch } = useSelect({               │   │
│  │    resource: "users",                                     │   │
│  │    defaultValue: [1, 2]  // Pre-selected IDs             │   │
│  │  });                                                      │   │
│  └────────────┬──────────────────────────────────────────────┘   │
│               │                                                  │
│               ▼                                                  │
│         useSelect Hook                                           │
│         (Orchestrator)                                           │
│               │                                                  │
│      ┌────────┼────────┐                                         │
│      │        │        │                                         │
│      ▼        ▼        ▼                                         │
│  ┌────────┐ ┌─────────┐ ┌──────────────┐                       │
│  │useList │ │useMany  │ │useLoadingOT  │                       │
│  │        │ │         │ │              │                       │
│  │Fetch   │ │Fetch    │ │Track timing  │                       │
│  │options │ │selected │ │              │                       │
│  └───┬────┘ └────┬────┘ └──────────────┘                       │
│      │           │                                               │
│      │  Parallel │                                               │
│      │  Queries  │                                               │
│      │           │                                               │
│      └─────┬─────┘                                               │
│            │                                                     │
│            ▼                                                     │
│  ┌──────────────────────┐                                       │
│  │  Transform & Combine │                                       │
│  │  ┌────────────────┐  │                                       │
│  │  │ Raw Data:      │  │                                       │
│  │  │ { id, name }   │  │                                       │
│  │  │       ↓        │  │                                       │
│  │  │ Transformed:   │  │                                       │
│  │  │ { value, label}│  │                                       │
│  │  └────────────────┘  │                                       │
│  │                      │                                       │
│  │  ┌────────────────┐  │                                       │
│  │  │ Merge options  │  │                                       │
│  │  │ + selected     │  │                                       │
│  │  │ → uniqBy value │  │                                       │
│  │  └────────────────┘  │                                       │
│  └──────────────────────┘                                       │
│            │                                                     │
│            ▼                                                     │
│    ┌───────────────────┐                                        │
│    │ Return:           │                                        │
│    │ - options[]       │                                        │
│    │ - onSearch()      │                                        │
│    │ - query           │                                        │
│    │ - defaultValueQ   │                                        │
│    └───────────────────┘                                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

FLOW DIAGRAM:
┌────────────┐   ┌──────────────┐   ┌───────────────┐
│  useList   │   │   useMany    │   │useLoadingOT   │
│  (options) │   │ (selected)   │   │   (timing)    │
└─────┬──────┘   └──────┬───────┘   └───────┬───────┘
      │                 │                   │
      │ Parallel Fetch  │                   │
      │◄────────────────┤                   │
      │                 │                   │
      ▼                 ▼                   ▼
┌──────────────────────────────────────────────┐
│        Transform to { label, value }         │
│  ┌────────────┐      ┌────────────────────┐ │
│  │ Options:   │      │ Selected:          │ │
│  │ [{label,   │  +   │ [{label,           │ │
│  │   value}]  │      │   value}]          │ │
│  └─────┬──────┘      └───────┬────────────┘ │
│        │                     │              │
│        └──────┬──────────────┘              │
│               ▼                             │
│       ┌───────────────┐                     │
│       │ uniqBy(value) │ ← Remove duplicates│
│       └───────┬───────┘                     │
└───────────────┼─────────────────────────────┘
                │
                ▼
        Final options array
```

**Ví dụ thực tế:**
Giống như tìm kiếm contact trong điện thoại:

1. **useList** = Load danh sách contacts (tất cả người dùng)
2. **useMany** = Load contacts yêu thích (đã được chọn trước)
3. **Search** = Gõ tên để lọc danh sách
4. **Transform** = Hiển thị "Tên + Số điện thoại" thay vì raw data
5. **Merge** = Contacts yêu thích + danh sách tìm kiếm, không trùng lặp

## 2. Luồng hoạt động chi tiết

### Flow 1: Initial Load (Component mount)

```
STEP 1: Component mounts
─────────────────────────
const { options, onSearch } = useSelect({
  resource: "users",
  defaultValue: [1, 2], // Pre-selected users
  optionLabel: "name",
  optionValue: "id"
});

STEP 2: useSelect initializes two queries
──────────────────────────────────────────
┌────────────────────────────────────┐
│  useMany Query                     │
│  ┌──────────────────────────────┐  │
│  │ resource: "users"            │  │
│  │ ids: [1, 2]                  │  │
│  │ ↓                            │  │
│  │ GET /users?ids=1,2           │  │
│  │ ↓                            │  │
│  │ Response: [                  │  │
│  │   { id: 1, name: "Alice" },  │  │
│  │   { id: 2, name: "Bob" }     │  │
│  │ ]                            │  │
│  └──────────────────────────────┘  │
└────────────────┬───────────────────┘
                 │
                 ▼
      Transform to options:
      [
        { value: "1", label: "Alice" },
        { value: "2", label: "Bob" }
      ]
      → setSelectedOptions([...])

┌────────────────────────────────────┐
│  useList Query                     │  (Parallel)
│  ┌──────────────────────────────┐  │
│  │ resource: "users"            │  │
│  │ pagination: { page: 1,       │  │
│  │              size: 10 }      │  │
│  │ ↓                            │  │
│  │ GET /users?_start=0&_end=10  │  │
│  │ ↓                            │  │
│  │ Response: [                  │  │
│  │   { id: 1, name: "Alice" },  │  │
│  │   { id: 3, name: "Charlie"}, │  │
│  │   { id: 4, name: "David" }   │  │
│  │   ... (10 total)             │  │
│  │ ]                            │  │
│  └──────────────────────────────┘  │
└────────────────┬───────────────────┘
                 │
                 ▼
      Transform to options:
      [
        { value: "1", label: "Alice" },
        { value: "3", label: "Charlie" },
        { value: "4", label: "David" },
        ...
      ]
      → setOptions([...])

STEP 3: Combine & deduplicate
──────────────────────────────
selectedOptions = [
  { value: "1", label: "Alice" },
  { value: "2", label: "Bob" }
]

options = [
  { value: "1", label: "Alice" },  ← Duplicate
  { value: "3", label: "Charlie" },
  { value: "4", label: "David" }
]

combinedOptions = uniqBy([
  ...selectedOptions,
  ...options
], "value")

Result = [
  { value: "1", label: "Alice" },  ← From selectedOptions
  { value: "2", label: "Bob" },    ← From selectedOptions
  { value: "3", label: "Charlie" },
  { value: "4", label: "David" }
]
```

### Flow 2: Search với Debounce

```
User types in search input:
────────────────────────────

Time: 0ms
├─ User types: "a"
│  ├─ onSearch("a") called
│  │  └─ Debounce starts (300ms timer)
│  └─ No API call yet ⏱️

Time: 100ms
├─ User types: "al"
│  ├─ onSearch("al") called
│  │  ├─ Previous timer cancelled ❌
│  │  └─ New debounce timer (300ms) ⏱️
│  └─ No API call yet

Time: 200ms
├─ User types: "ali"
│  ├─ onSearch("ali") called
│  │  ├─ Previous timer cancelled ❌
│  │  └─ New debounce timer (300ms) ⏱️
│  └─ No API call yet

Time: 500ms (no more typing for 300ms)
└─ Debounce fires! ⏰
   ├─ setSearch([{
   │    field: "name",        ← searchField
   │    operator: "contains",
   │    value: "ali"
   │  }])
   │
   └─ useList re-fetches with new filters:
      ┌──────────────────────────────────┐
      │ GET /users?name_contains=ali     │
      │ ↓                                │
      │ Response: [                      │
      │   { id: 1, name: "Alice" },      │
      │   { id: 5, name: "Alicia" }      │
      │ ]                                │
      └──────────────────────────────────┘
      ↓
   Transform & update options:
   [
     { value: "1", label: "Alice" },
     { value: "5", label: "Alicia" }
   ]

WITHOUT DEBOUNCE (problem):
├─ "a"   → API call 1 ❌
├─ "al"  → API call 2 ❌
├─ "ali" → API call 3 ❌
└─ Result: 3 unnecessary API calls! 💸

WITH DEBOUNCE (solution):
└─ "ali" → API call 1 ✅
   Result: Only 1 API call! 💰
```

### Flow 3: Custom onSearch Override

```
// User provides custom onSearch
const { options, onSearch } = useSelect({
  resource: "products",
  onSearch: (searchValue) => {
    // ✅ Custom filter logic
    return [
      {
        field: "title",
        operator: "contains",
        value: searchValue
      },
      {
        field: "description",
        operator: "contains",
        value: searchValue
      }
    ];
    // → Search in both title AND description
  }
});

Flow:
User types "laptop"
↓
onSearch("laptop") triggered
↓
onSearchFromPropRef.current("laptop") called
↓
Returns: [
  { field: "title", operator: "contains", value: "laptop" },
  { field: "description", operator: "contains", value: "laptop" }
]
↓
setSearch([...])
↓
useList re-fetches with custom filters:
GET /products?title_contains=laptop&description_contains=laptop
```

### Flow 4: Selected Options Order

```
Case 1: selectedOptionsOrder = "selected-first" (default for editing)
─────────────────────────────────────────────────────────────────────

selectedOptions = [
  { value: "1", label: "Alice" },
  { value: "2", label: "Bob" }
]

options = [
  { value: "1", label: "Alice" },  ← Duplicate
  { value: "3", label: "Charlie" },
  { value: "4", label: "David" }
]

Result = uniqBy([
  ...selectedOptions,  ← Put selected first
  ...options
], "value")
= [
  { value: "1", label: "Alice" },   ← Selected
  { value: "2", label: "Bob" },     ← Selected
  { value: "3", label: "Charlie" },
  { value: "4", label: "David" }
]

UI Display:
┌──────────────────────┐
│ ☑ Alice              │ ← Pre-selected, shown first
│ ☑ Bob                │ ← Pre-selected, shown first
│ ☐ Charlie            │
│ ☐ David              │
└──────────────────────┘


Case 2: selectedOptionsOrder = "in-place" (default for viewing)
────────────────────────────────────────────────────────────────

Result = uniqBy([
  ...options,          ← Put fetched first
  ...selectedOptions
], "value")
= [
  { value: "1", label: "Alice" },   ← From options (alphabetical)
  { value: "3", label: "Charlie" },
  { value: "4", label: "David" },
  { value: "2", label: "Bob" }      ← From selected (not duplicate)
]

UI Display:
┌──────────────────────┐
│ ☑ Alice              │ ← Alphabetical order
│ ☑ Bob                │
│ ☐ Charlie            │
│ ☐ David              │
└──────────────────────┘
```

### Flow 5: Loading Overtime Tracking

```
┌──────────────────────────────────────────────────────────┐
│  useLoadingOvertime Integration                          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Time: 0ms - Query starts                                │
│  ├─ isLoading: true                                      │
│  └─ elapsedTime: 0ms                                     │
│                                                           │
│  Time: 500ms - Still loading                             │
│  ├─ isLoading: true                                      │
│  └─ elapsedTime: 500ms                                   │
│                                                           │
│  Time: 1000ms - Still loading (overtime threshold)       │
│  ├─ isLoading: true                                      │
│  ├─ elapsedTime: 1000ms                                  │
│  └─ overtimeOptions.onInterval?.() ← Callback triggered  │
│                                                           │
│  Time: 1500ms - Query completes                          │
│  ├─ isLoading: false                                     │
│  └─ elapsedTime: 1500ms (final)                          │
│                                                           │
└──────────────────────────────────────────────────────────┘

Usage:
const { options, overtime } = useSelect({
  resource: "users",
  overtimeOptions: {
    interval: 1000, // Check every 1s
    onInterval: (elapsedTime) => {
      console.log(`Loading for ${elapsedTime}ms...`);
      // Show "Still loading..." message to user
    }
  }
});

// Display loading indicator
{overtime.elapsedTime > 1000 && (
  <span>This is taking longer than usual...</span>
)}
```

## 3. Design Patterns

### 3.1. Composite Pattern

Hook kết hợp nhiều data operations thành một unified interface.

**Real-world analogy:** Giống như máy giặt all-in-one - vừa giặt, vừa vắt, vừa sấy, nhưng user chỉ cần bấm 1 nút Start.

```typescript
// ❌ Without Composite - user manages everything
function MyComponent() {
  const { data: allUsers } = useList({ resource: "users" });
  const { data: selectedUsers } = useMany({
    resource: "users",
    ids: defaultIds,
  });
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  // Transform options manually
  const options = allUsers?.data.map((user) => ({
    label: user.name,
    value: user.id,
  }));

  // Merge selected + all
  const mergedOptions = uniqBy([...selectedOptions, ...options], "value");

  // Complex! 😫
}

// ✅ With Composite - hook handles everything
function MyComponent() {
  const { options, onSearch } = useSelect({
    resource: "users",
    defaultValue: defaultIds,
  });

  // Simple! 😊
  return <Select options={options} onSearch={onSearch} />;
}
```

### 3.2. Transformer Pattern

Hook transforms raw data thành standardized option format.

**Real-world analogy:** Giống như bộ chuyển đổi điện - dù điện từ đâu (110V, 220V, 240V), đều chuyển thành 5V cho thiết bị.

```typescript
// Transform configuration
const { options } = useSelect({
  resource: "users",
  optionLabel: "name",     // ← Field to use as label
  optionValue: "id",       // ← Field to use as value
});

// Internal transformation:
Raw Data:
[
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" }
]

↓ Transform with optionLabel="name", optionValue="id"

Standardized Options:
[
  { value: "1", label: "Alice" },
  { value: "2", label: "Bob" }
]

// ✅ Works with any UI library
<AntdSelect options={options} />
<MuiAutocomplete options={options} />
<MantineSelect data={options} />
```

**Advanced transformation with functions:**

```typescript
// ✅ Custom label function
const { options } = useSelect({
  resource: "users",
  optionLabel: (user) => `${user.name} (${user.email})`,
  optionValue: (user) => user.id
});

// Result:
[
  { value: "1", label: "Alice (alice@example.com)" },
  { value: "2", label: "Bob (bob@example.com)" }
]

// ✅ Nested field support
const { options } = useSelect({
  resource: "posts",
  optionLabel: "author.name",  // ← Nested path
  optionValue: "id"
});

// Handles nested data:
Raw: { id: 1, author: { name: "Alice" } }
→ { value: "1", label: "Alice" }
```

### 3.3. Debounce Pattern

Hook debounces search input để reduce API calls.

**Real-world analogy:** Giống như lift/elevator - chờ 3 giây xem có ai vào thêm không, rồi mới đóng cửa và đi. Không đóng/mở liên tục mỗi khi có 1 người.

```typescript
// Configuration
const { onSearch } = useSelect({
  resource: "users",
  debounce: 300  // Wait 300ms after last keystroke
});

// Implementation visualization:
User types: "a" → "al" → "ali" → "alic" → "alice"
Timeline:
0ms    "a"   ⏱️ Start timer (300ms)
100ms  "al"  ❌ Cancel previous, ⏱️ new timer (300ms)
200ms  "ali" ❌ Cancel previous, ⏱️ new timer (300ms)
250ms  "alic" ❌ Cancel previous, ⏱️ new timer (300ms)
300ms  "alice" ❌ Cancel previous, ⏱️ new timer (300ms)
600ms  ⏰ Timer fires! → API call with "alice"

// Result: Only 1 API call instead of 5!

// Without debounce:
5 keystrokes = 5 API calls = $$$
// With debounce:
5 keystrokes = 1 API call = $
```

### 3.4. Dual Query Pattern

Hook runs two parallel queries (useMany + useList) and merges results.

**Real-world analogy:** Giống như đặt món ăn - vừa xem menu (useList), vừa chef đã bắt đầu làm món bạn đặt trước (useMany). Hai việc song song.

```typescript
const { options, defaultValueQuery, query } = useSelect({
  resource: "categories",
  defaultValue: [1, 5, 10]  // Pre-selected IDs
});

// Two queries run in parallel:
┌─────────────────┐       ┌─────────────────┐
│  useMany        │       │  useList        │
│  (selected)     │       │  (all options)  │
│                 │       │                 │
│ GET /categories │  ◄──► │ GET /categories │
│ ?ids=1,5,10     │       │ ?_start=0       │
│                 │       │ &_end=10        │
└────────┬────────┘       └────────┬────────┘
         │                         │
         │    Both complete        │
         └────────┬────────────────┘
                  │
                  ▼
            Merge results
                  │
                  ▼
         ┌─────────────────┐
         │ Combined Options│
         │ (unique by ID)  │
         └─────────────────┘

// Why parallel?
// → Faster than sequential (500ms + 500ms = 1000ms)
// → User sees results immediately
// → Better UX
```

### 3.5. Ref Pattern for Callback Stability

Hook dùng useRef để store callback, tránh stale closures.

**Real-world analogy:** Giống như để contact card trong ví - khi người đó đổi số điện thoại, bạn update card trong ví (ref), không cần in card mới.

```typescript
// Problem: Stale closure
const onSearch = useMemo(() => {
  return debounce((value) => {
    // ❌ onSearchFromProp might be stale (from old render)
    if (onSearchFromProp) {
      setSearch(onSearchFromProp(value));
    }
  }, debounceValue);
}, [debounceValue]); // ← onSearchFromProp not in deps!

// Solution: Use ref
const onSearchFromPropRef = useRef(onSearchFromProp);

useEffect(() => {
  // Always update ref with latest callback
  onSearchFromPropRef.current = onSearchFromProp;
}, [onSearchFromProp]);

const onSearch = useMemo(() => {
  return debounce((value) => {
    // ✅ onSearchFromPropRef.current always points to latest
    if (onSearchFromPropRef.current) {
      setSearch(onSearchFromPropRef.current(value));
    }
  }, debounceValue);
}, [debounceValue]); // ← No stale closure!
```

**Why this matters:**

```typescript
// Scenario:
Parent component changes onSearch callback on every render
↓
Without ref: debounce function recreated on every render
→ Debounce broken! (timer resets)
↓
With ref: debounce function stable, ref.current updated
→ Debounce works! (timer preserved)
```

## 4. Các tính năng chính

### 4.1. Flexible Option Transformation

```typescript
// String fields (simple)
const { options } = useSelect({
  resource: "users",
  optionLabel: "name",
  optionValue: "id",
});

// Function transformers (complex)
const { options } = useSelect({
  resource: "products",
  optionLabel: (product) => `${product.name} - $${product.price}`,
  optionValue: (product) => `${product.id}-${product.sku}`,
});

// Nested fields (dot notation)
const { options } = useSelect({
  resource: "posts",
  optionLabel: "author.profile.displayName",
  optionValue: "id",
});

// Result formats:
// Simple: { value: "1", label: "iPhone" }
// Complex: { value: "1-IPHN13", label: "iPhone - $999" }
// Nested: { value: "1", label: "John Doe" }
```

### 4.2. Default Value Pre-loading

```typescript
// Single default value
const { options } = useSelect({
  resource: "categories",
  defaultValue: "5", // Pre-load category ID 5
});

// Multiple default values
const { options } = useSelect({
  resource: "tags",
  defaultValue: ["1", "5", "10"], // Pre-load tags 1, 5, 10
});

// How it works:
// → useMany({ ids: ["1", "5", "10"] }) fetches selected items
// → Ensures selected options appear even if not in current page
// → Important for edit forms where selected items might not be in initial list
```

### 4.3. Search with Multiple Strategies

```typescript
// Strategy 1: Default (single field search)
const { onSearch } = useSelect({
  resource: "posts",
  searchField: "title", // Search in title field
});
// → Generates: { field: "title", operator: "contains", value: "..." }

// Strategy 2: Custom multi-field search
const { onSearch } = useSelect({
  resource: "posts",
  onSearch: (value) => [
    { field: "title", operator: "contains", value },
    { field: "description", operator: "contains", value },
  ],
});
// → Search in both title AND description

// Strategy 3: Complex search logic
const { onSearch } = useSelect({
  resource: "products",
  onSearch: (value) => {
    const filters: CrudFilter[] = [];

    // Search by name
    filters.push({
      field: "name",
      operator: "contains",
      value,
    });

    // If value is numeric, also search by SKU
    if (/^\d+$/.test(value)) {
      filters.push({
        field: "sku",
        operator: "eq",
        value,
      });
    }

    return filters;
  },
});
```

### 4.4. Pagination Support

```typescript
// Server-side pagination
const { options, query } = useSelect({
  resource: "users",
  pagination: {
    current: 1,
    pageSize: 20,
    mode: "server", // ← API handles pagination
  },
});

// Client-side pagination (default)
const { options } = useSelect({
  resource: "users",
  pagination: {
    pageSize: 10,
    mode: "off", // ← Fetch all, paginate in memory
  },
});

// Infinite scroll support
const { options, query } = useSelect({
  resource: "products",
  pagination: {
    current: page, // ← Controlled by scroll
    pageSize: 50,
  },
});

useEffect(() => {
  // Load more when user scrolls
  if (isBottomReached && query.hasNextPage) {
    setPage((prev) => prev + 1);
  }
}, [isBottomReached]);
```

### 4.5. Sorting and Filtering

```typescript
// Sort options
const { options } = useSelect({
  resource: "users",
  sorters: [
    {
      field: "name",
      order: "asc",
    },
  ],
});

// Filter options
const { options } = useSelect({
  resource: "posts",
  filters: [
    {
      field: "status",
      operator: "eq",
      value: "published",
    },
    {
      field: "categoryId",
      operator: "in",
      value: [1, 2, 3],
    },
  ],
});

// Combined
const { options } = useSelect({
  resource: "products",
  filters: [{ field: "inStock", operator: "eq", value: true }],
  sorters: [{ field: "price", order: "asc" }],
});
// → GET /products?inStock=true&_sort=price&_order=asc
```

### 4.6. Loading Overtime Tracking

```typescript
const { options, overtime } = useSelect({
  resource: "users",
  overtimeOptions: {
    interval: 1000, // Check every 1 second
    onInterval: (elapsedTime) => {
      console.log(`Loading for ${elapsedTime}ms`);

      if (elapsedTime > 3000) {
        // Show message after 3 seconds
        notification.warning({
          message: "Slow connection detected",
          description: "This is taking longer than usual...",
        });
      }
    },
  },
});

// Display loading feedback
{
  overtime.elapsedTime > 1000 && <Spin tip="Still loading..." />;
}
```

## 5. Use Cases thực tế

### 5.1. Basic Select Dropdown

```typescript
import { useSelect } from "@refinedev/core";
import { Select } from "antd";

function CategorySelect() {
  const { options, query } = useSelect({
    resource: "categories",
  });

  return (
    <Select
      options={options}
      loading={query.isLoading}
      placeholder="Select category"
    />
  );
}

// Generated options:
// [
//   { value: "1", label: "Electronics" },
//   { value: "2", label: "Books" },
//   ...
// ]
```

### 5.2. Searchable Autocomplete

```typescript
import { useSelect } from "@refinedev/core";
import { AutoComplete } from "antd";

function UserAutocomplete() {
  const { options, onSearch, query } = useSelect({
    resource: "users",
    optionLabel: "name",
    debounce: 500, // Wait 500ms after typing
  });

  return (
    <AutoComplete
      options={options}
      onSearch={onSearch}
      loading={query.isFetching}
      placeholder="Search users..."
      filterOption={false} // ← Server-side search
    />
  );
}
```

### 5.3. Edit Form với Default Values

```typescript
import { useSelect } from "@refinedev/core";
import { Select, Form } from "antd";

function EditPostForm({ post }: { post: Post }) {
  const { options, defaultValueQuery } = useSelect({
    resource: "tags",
    defaultValue: post.tagIds, // Pre-load selected tags
    selectedOptionsOrder: "selected-first",
  });

  return (
    <Form initialValues={{ tags: post.tagIds }}>
      <Form.Item name="tags" label="Tags">
        <Select
          mode="multiple"
          options={options}
          loading={defaultValueQuery.isLoading}
        />
      </Form.Item>
    </Form>
  );
}

// Ensures selected tags appear first in dropdown
// Even if they're not in current page
```

### 5.4. Multi-Field Search

```typescript
function ProductSearch() {
  const { options, onSearch } = useSelect({
    resource: "products",
    optionLabel: (product) => `${product.name} (${product.sku})`,
    onSearch: (value) => [
      // Search in name
      {
        field: "name",
        operator: "contains",
        value,
      },
      // OR search in SKU
      {
        field: "sku",
        operator: "contains",
        value,
      },
      // OR search in description
      {
        field: "description",
        operator: "contains",
        value,
      },
    ],
  });

  return (
    <AutoComplete
      options={options}
      onSearch={onSearch}
      placeholder="Search by name, SKU, or description"
    />
  );
}
```

### 5.5. Filtered Options với Relationships

```typescript
function PostCategorySelect({ authorId }: { authorId: string }) {
  // Only show categories that this author can post to
  const { options } = useSelect({
    resource: "categories",
    filters: [
      {
        field: "allowedAuthors",
        operator: "contains",
        value: authorId,
      },
      {
        field: "isActive",
        operator: "eq",
        value: true,
      },
    ],
    sorters: [
      {
        field: "name",
        order: "asc",
      },
    ],
  });

  return <Select options={options} />;
}
```

### 5.6. Infinite Scroll Select

```typescript
function InfiniteScrollSelect() {
  const [page, setPage] = useState(1);

  const { options, query } = useSelect({
    resource: "products",
    pagination: {
      current: page,
      pageSize: 50,
    },
  });

  const handlePopupScroll = (e: React.UIEvent) => {
    const { target } = e;
    const bottom =
      target.scrollHeight - target.scrollTop === target.clientHeight;

    if (bottom && query.hasNextPage && !query.isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  return (
    <Select
      options={options}
      loading={query.isLoading}
      onPopupScroll={handlePopupScroll}
      dropdownRender={(menu) => (
        <>
          {menu}
          {query.isFetching && <Spin />}
        </>
      )}
    />
  );
}
```

## 6. Quyết định kiến trúc

### 6.1. Tại sao dùng cả useList VÀ useMany?

**Quyết định:** Run two separate queries thay vì một query duy nhất.

**Lý do:**

```typescript
// Scenario: Edit form với category select
// - User editing post with categoryId = "5"
// - Current page shows categories 1, 2, 3, 4 (not 5)
// - Problem: Selected category "5" not in options!

// ❌ With only useList:
const { data } = useList({
  resource: "categories",
  pagination: { current: 1, pageSize: 4 },
});
// Returns: categories 1, 2, 3, 4
// Selected category 5 is missing! ❌

// ✅ With useList + useMany:
const { data: allCategories } = useList({
  resource: "categories",
  pagination: { current: 1, pageSize: 4 },
});
// Returns: 1, 2, 3, 4

const { data: selectedCategories } = useMany({
  resource: "categories",
  ids: ["5"], // ← Fetch selected explicitly
});
// Returns: 5

// Merge both:
// Final options: 1, 2, 3, 4, 5 ✅
// Selected option always present!
```

**Trade-off:**

- ✅ **Pro:** Selected options always available
- ✅ **Pro:** Works with pagination
- ⚠️ **Con:** Two network requests (but parallel)

### 6.2. Tại sao default debounce là 300ms?

**Quyết định:** Default debounce delay là 300ms.

**Lý do:**

```
User Typing Speed Study:
─────────────────────────
Average typing speed: 40-60 WPM (words per minute)
= 200-300ms per character

Fast typers: 80+ WPM
= 100-150ms per character

Debounce Analysis:
─────────────────────────
100ms: Too fast → many API calls (fast typers)
200ms: Better, but still some unnecessary calls
300ms: Sweet spot → reduces ~80% of API calls
500ms: Too slow → feels laggy to users
1000ms: Way too slow → users think it's broken

Chosen: 300ms
─────────────
✅ Fast enough for good UX
✅ Slow enough to batch most keystrokes
✅ Industry standard (lodash debounce default)
```

**User Control:**

```typescript
// Users can override if needed
useSelect({
  resource: "users",
  debounce: 500, // ← Slower for expensive searches
});

useSelect({
  resource: "cache-results",
  debounce: 100, // ← Faster for cached data
});
```

### 6.3. Tại sao separate options và selectedOptions state?

**Quyết định:** Maintain 2 separate state arrays thay vì một.

**Lý do:**

```typescript
// WHY SEPARATE STATE?

// Scenario: User searches "alice"
// 1. useList returns: [Alice, Alicia, Alexander]
// 2. User selects "Alice"
// 3. User clears search
// 4. useList returns: [Bob, Charlie, David] (different page)
// 5. Problem: "Alice" disappears from options! ❌

// Solution: Track separately

// State 1: options (from useList - changes with search/pagination)
const [options, setOptions] = useState([
  { value: "1", label: "Alice" },
  { value: "5", label: "Alicia" }
]);

// State 2: selectedOptions (from useMany - stable)
const [selectedOptions, setSelectedOptions] = useState([
  { value: "1", label: "Alice" }  ← From defaultValue
]);

// Merge on render:
const combinedOptions = uniqBy([
  ...selectedOptions,  ← Always present
  ...options           ← Changes with search
], "value");

// Result: Selected options never disappear ✅
```

**Trade-off:**

- ✅ **Pro:** Selected options always visible
- ✅ **Pro:** Handles pagination correctly
- ⚠️ **Con:** More complex state management
- ⚠️ **Con:** Need uniqBy to deduplicate

### 6.4. Tại sao dùng useRef cho onSearch callback?

**Quyết định:** Store `onSearchFromProp` trong ref thay vì dependency array.

**Lý do:**

```typescript
// Problem: Stale closure in debounced function

// ❌ Without ref - BROKEN
const onSearch = useMemo(() => {
  return debounce((value) => {
    // ❌ onSearchFromProp captured at creation time
    // If parent changes onSearchFromProp, this still uses old version!
    if (onSearchFromProp) {
      setSearch(onSearchFromProp(value));
    }
  }, debounceValue);
}, [debounceValue]); // ← onSearchFromProp not in deps!

// If we add onSearchFromProp to deps:
}, [debounceValue, onSearchFromProp]); // ← Re-create on every change
// Problem: debounce broken! Timer resets on every parent render

// ✅ With ref - WORKS
const onSearchFromPropRef = useRef(onSearchFromProp);

useEffect(() => {
  onSearchFromPropRef.current = onSearchFromProp;
}, [onSearchFromProp]); // ← Update ref

const onSearch = useMemo(() => {
  return debounce((value) => {
    // ✅ ref.current always points to latest callback
    if (onSearchFromPropRef.current) {
      setSearch(onSearchFromPropRef.current(value));
    }
  }, debounceValue);
}, [debounceValue]); // ← Stable deps, debounce preserved
```

**Summary:**

- ✅ Debounce function remains stable
- ✅ Always uses latest onSearch callback
- ✅ No stale closures

## 7. Common Pitfalls

### 7.1. Quên provide defaultValue trong edit forms

```typescript
// ❌ Wrong - selected option disappears
function EditPostForm({ post }: { post: Post }) {
  const { options } = useSelect({
    resource: "categories",
    // ❌ Missing defaultValue: post.categoryId
  });

  // Problem: If category ID 5 is not in current page,
  // it won't appear in options → user sees empty select!

  return (
    <Select
      value={post.categoryId} // ← "5"
      options={options} // ← [1, 2, 3, 4] (no 5!)
    />
  );
}

// ✅ Correct - provide defaultValue
function EditPostForm({ post }: { post: Post }) {
  const { options } = useSelect({
    resource: "categories",
    defaultValue: post.categoryId, // ✅ Pre-load category 5
  });

  return (
    <Select
      value={post.categoryId}
      options={options} // ← [1, 2, 3, 4, 5] ✅
    />
  );
}
```

### 7.2. Không disable filterOption cho server-side search

```typescript
// ❌ Wrong - double filtering (client + server)
function UserSearch() {
  const { options, onSearch } = useSelect({
    resource: "users",
  });

  return (
    <AutoComplete
      options={options}
      onSearch={onSearch}
      // ❌ Missing filterOption=false
      // → Both server AND client filter
      // → Wrong results!
    />
  );
}

// How it breaks:
// 1. User types "alice"
// 2. Server returns: ["Alice", "Alicia"]
// 3. Client filters again with built-in logic
// 4. Might hide "Alicia" if client logic doesn't match! ❌

// ✅ Correct - disable client-side filtering
function UserSearch() {
  const { options, onSearch } = useSelect({
    resource: "users",
  });

  return (
    <AutoComplete
      options={options}
      onSearch={onSearch}
      filterOption={false} // ✅ Let server handle filtering
    />
  );
}
```

### 7.3. optionLabel typo causing blank labels

```typescript
// ❌ Wrong - typo in field name
const { options } = useSelect({
  resource: "users",
  optionLabel: "fullName", // ❌ Field doesn't exist!
});

// Data: { id: 1, name: "Alice" }
// Result: { value: "1", label: undefined } ← Blank label!

// ✅ Correct - verify field name
const { options } = useSelect({
  resource: "users",
  optionLabel: "name", // ✅ Correct field
});

// ✅ Better - use function to debug
const { options } = useSelect({
  resource: "users",
  optionLabel: (user) => {
    // Debug what fields are available
    console.log("User object:", user);
    return user.name || "Unknown";
  },
});
```

### 7.4. Không handle loading states

```typescript
// ❌ Wrong - no loading indicator
function CategorySelect() {
  const { options } = useSelect({
    resource: "categories",
  });

  return <Select options={options} />;
  // Problem: User sees empty select while loading
  // Might think no options available!
}

// ✅ Correct - show loading state
function CategorySelect() {
  const { options, query } = useSelect({
    resource: "categories",
  });

  return (
    <Select
      options={options}
      loading={query.isLoading} // ✅ Show spinner
      placeholder={
        query.isLoading ? "Loading categories..." : "Select category"
      }
    />
  );
}
```

### 7.5. Debounce quá ngắn hoặc quá dài

```typescript
// ❌ Wrong - debounce too short
const { onSearch } = useSelect({
  resource: "users",
  debounce: 50, // ❌ Too fast! Many API calls
});

// Result: User types "alice" → 5 API calls ❌

// ❌ Wrong - debounce too long
const { onSearch } = useSelect({
  resource: "users",
  debounce: 2000, // ❌ Too slow! Feels broken
});

// Result: User types "alice" → waits 2 seconds → thinks it's frozen

// ✅ Correct - reasonable debounce
const { onSearch } = useSelect({
  resource: "users",
  debounce: 300, // ✅ Sweet spot
});

// Guidelines:
// - Fast local data: 100-200ms
// - Normal API: 300ms (default)
// - Slow/expensive API: 500-800ms
// - Never exceed 1000ms
```

### 7.6. Không cleanup khi unmount

```typescript
// ❌ Wrong - memory leak
function UserSelect({ show }: { show: boolean }) {
  const { options, onSearch } = useSelect({
    resource: "users",
  });

  if (!show) return null;

  return <Select options={options} onSearch={onSearch} />;
  // Problem: When unmounted, debounced function still exists
  // If user typed then component unmounts, API call still fires!
  // → Memory leak + unexpected API calls
}

// ✅ Correct - lodash debounce auto-cancels on unmount
// useSelect already handles this internally via useMemo deps

// But if you're manually creating debounced functions:
const MyComponent = () => {
  const debouncedSearch = useMemo(
    () =>
      debounce((value) => {
        // search logic
      }, 300),
    [],
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel(); // ✅ Cancel on unmount
    };
  }, [debouncedSearch]);
};
```

## 8. Performance Considerations

### 8.1. Parallel Queries Optimization

```typescript
// useSelect runs useMany + useList in parallel

// Sequential (bad):
// Time = useMany (500ms) + useList (500ms) = 1000ms

// Parallel (good):
// Time = max(useMany (500ms), useList (500ms)) = 500ms

// ✅ 2x faster!

// Both queries start simultaneously:
const defaultValueQueryResult = useMany(...);  // ← Starts
const queryResult = useList(...);              // ← Starts

// React Query handles parallel execution automatically
```

### 8.2. Debounce Reduces API Calls by ~80%

```typescript
// Without debounce:
// User types "alice" (5 letters)
// = 5 API calls

// With 300ms debounce:
// User types "alice" in < 1.5 seconds
// = 1 API call

// Savings:
// - 80% fewer API calls
// - 80% less bandwidth
// - 80% less server load
// - Faster UX (fewer network requests)
```

### 8.3. uniqBy Deduplication Cost

```typescript
// uniqBy is O(n) operation
// Where n = selectedOptions.length + options.length

// Small dataset (< 100 items):
// Cost: ~1ms → Negligible

// Medium dataset (100-1000 items):
// Cost: ~10ms → Acceptable

// Large dataset (10,000+ items):
// Cost: ~100ms → Noticeable

// Optimization for large datasets:
const combinedOptions = useMemo(
  () => uniqBy([...selectedOptions, ...options], "value"),
  [selectedOptions, options], // ← Only recompute when changed
);
```

### 8.4. Transform Functions Called Per Item

```typescript
// optionLabel/optionValue called for EVERY item

// Example: 1000 products
const { options } = useSelect({
  resource: "products",
  optionLabel: (product) => {
    // ❌ Expensive operation in loop!
    return fetchRelatedData(product.id); // BAD!
  },
});
// → 1000 * fetchRelatedData = SLOW!

// ✅ Keep transformers lightweight
const { options } = useSelect({
  resource: "products",
  optionLabel: (product) => {
    // ✅ Fast string operations only
    return `${product.name} - $${product.price}`;
  },
});

// If you need related data:
// → Fetch it in the main query, not in transformer
const { options } = useSelect({
  resource: "products",
  meta: {
    fields: ["id", "name", "price", "category.name"], // ← Join upfront
  },
  optionLabel: (product) => `${product.name} (${product.category.name})`,
});
```

### 8.5. Search Filter Complexity

```typescript
// Simple filter (fast):
onSearch: (value) => [{ field: "name", operator: "contains", value }];
// → Single index scan on server

// Complex filter (slower):
onSearch: (value) => [
  { field: "name", operator: "contains", value },
  { field: "email", operator: "contains", value },
  { field: "phone", operator: "contains", value },
  { field: "address", operator: "contains", value },
];
// → Multiple index scans → slower

// Balance: Search most relevant fields only
onSearch: (value) => [
  { field: "name", operator: "contains", value },
  { field: "email", operator: "contains", value },
];
// → Good balance between coverage and speed
```

### 8.6. Pagination to Reduce Payload Size

```typescript
// ❌ Without pagination - huge payload
const { options } = useSelect({
  resource: "users",
  // Fetches ALL users → 10,000 records → 5MB payload!
});

// ✅ With pagination - small payload
const { options } = useSelect({
  resource: "users",
  pagination: {
    current: 1,
    pageSize: 20, // ← Only 20 records → 10KB payload
  },
});

// Performance impact:
// - 500x smaller payload
// - 10x faster network transfer
// - 100x faster DOM rendering
// - Less memory usage
```

## 9. Testing

### 9.1. Basic Hook Test

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useSelect } from "@refinedev/core";
import { TestWrapper } from "@test";

describe("useSelect", () => {
  it("fetches and transforms options", async () => {
    const { result } = renderHook(() => useSelect({ resource: "users" }), {
      wrapper: TestWrapper({
        dataProvider: {
          getList: vi.fn().mockResolvedValue({
            data: [
              { id: 1, name: "Alice" },
              { id: 2, name: "Bob" },
            ],
            total: 2,
          }),
          getMany: vi.fn().mockResolvedValue({ data: [] }),
        },
      }),
    });

    await waitFor(() => {
      expect(result.current.query.isSuccess).toBe(true);
    });

    expect(result.current.options).toEqual([
      { value: "1", label: "Alice" },
      { value: "2", label: "Bob" },
    ]);
  });
});
```

### 9.2. Test Default Values

```typescript
it("preloads default values", async () => {
  const getManyMock = vi.fn().mockResolvedValue({
    data: [{ id: 5, name: "Charlie" }],
  });

  const { result } = renderHook(
    () =>
      useSelect({
        resource: "users",
        defaultValue: ["5"],
      }),
    {
      wrapper: TestWrapper({
        dataProvider: {
          getList: vi.fn().mockResolvedValue({
            data: [
              { id: 1, name: "Alice" },
              { id: 2, name: "Bob" },
            ],
            total: 2,
          }),
          getMany: getManyMock,
        },
      }),
    },
  );

  // Should call getMany with defaultValue IDs
  expect(getManyMock).toHaveBeenCalledWith({
    resource: "users",
    ids: ["5"],
    meta: undefined,
  });

  await waitFor(() => {
    expect(result.current.defaultValueQuery.isSuccess).toBe(true);
  });

  // Default option should be in combined options
  expect(result.current.options).toContainEqual({
    value: "5",
    label: "Charlie",
  });
});
```

### 9.3. Test Search Debounce

```typescript
import { act } from "@testing-library/react";

it("debounces search input", async () => {
  vi.useFakeTimers();

  const getListMock = vi.fn().mockResolvedValue({
    data: [{ id: 1, name: "Alice" }],
    total: 1,
  });

  const { result } = renderHook(
    () =>
      useSelect({
        resource: "users",
        debounce: 300,
      }),
    {
      wrapper: TestWrapper({
        dataProvider: {
          getList: getListMock,
          getMany: vi.fn().mockResolvedValue({ data: [] }),
        },
      }),
    },
  );

  // Type "ali"
  act(() => {
    result.current.onSearch("a");
  });
  act(() => {
    result.current.onSearch("al");
  });
  act(() => {
    result.current.onSearch("ali");
  });

  // Should not call API yet (debouncing)
  expect(getListMock).toHaveBeenCalledTimes(1); // Initial call only

  // Fast-forward 300ms
  act(() => {
    vi.advanceTimersByTime(300);
  });

  // Now should call API with "ali"
  await waitFor(() => {
    expect(getListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: [{ field: "title", operator: "contains", value: "ali" }],
      }),
    );
  });

  vi.useRealTimers();
});
```

### 9.4. Test Custom optionLabel/optionValue

```typescript
it("supports custom option transformers", async () => {
  const { result } = renderHook(
    () =>
      useSelect({
        resource: "products",
        optionLabel: (product) => `${product.name} - $${product.price}`,
        optionValue: (product) => product.sku,
      }),
    {
      wrapper: TestWrapper({
        dataProvider: {
          getList: vi.fn().mockResolvedValue({
            data: [{ id: 1, name: "iPhone", price: 999, sku: "IPHN13" }],
            total: 1,
          }),
          getMany: vi.fn().mockResolvedValue({ data: [] }),
        },
      }),
    },
  );

  await waitFor(() => {
    expect(result.current.options).toEqual([
      { value: "IPHN13", label: "iPhone - $999" },
    ]);
  });
});
```

### 9.5. Integration Test với UI Component

```typescript
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Select } from "antd";

function TestComponent() {
  const { options, onSearch, query } = useSelect({
    resource: "users",
  });

  return (
    <Select
      options={options}
      onSearch={onSearch}
      loading={query.isLoading}
      data-testid="user-select"
    />
  );
}

it("renders select with options", async () => {
  render(<TestComponent />, {
    wrapper: TestWrapper({
      dataProvider: mockDataProvider,
    }),
  });

  const select = screen.getByTestId("user-select");

  // Click to open dropdown
  fireEvent.mouseDown(select);

  // Options should appear
  await waitFor(() => {
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });
});
```

## 10. Kết luận

### Tóm tắt Hook

`useSelect` là một **Composite Data Hook** cực kỳ powerful cho select/dropdown components. Hook orchestrate 4 major operations: parallel data fetching (useList + useMany), debounced search, data transformation, và intelligent merging. Với ~180 dòng code, hook này giải quyết hầu hết use cases cho dropdown UIs.

**Key Characteristics:**

- ✅ **Dual Query System**: useMany (selected) + useList (options) parallel
- ✅ **Smart Search**: Debounced với customizable logic
- ✅ **Flexible Transform**: String fields hoặc function transformers
- ✅ **Intelligent Merge**: Deduplicate và order options correctly
- ✅ **Performance Optimized**: Parallel queries, debounce, memoization
- ✅ **UI Agnostic**: Works với Ant Design, MUI, Mantine, etc.

### Khi nào dùng Hook này?

**✅ Sử dụng khi:**

- Select/dropdown components cần fetch data từ API
- Autocomplete với server-side search
- Edit forms với pre-selected values
- Multi-select với many options
- Filtered dropdowns (by category, status, etc.)
- Relationship selectors (foreign keys)

**❌ Không dùng khi:**

- Static options (hardcoded list) → Use plain array
- Already have data loaded → Use useMemo to transform
- Need complex multi-step selection → Use custom logic
- Options tree structure → Use specialized tree hooks

### So sánh với các giải pháp khác

| Feature            | useSelect          | Manual useList | UI Library Hook |
| ------------------ | ------------------ | -------------- | --------------- |
| Default Values     | ✅ Auto (useMany)  | ❌ Manual      | ⚠️ Varies       |
| Search Debounce    | ✅ Built-in        | ❌ Manual      | ⚠️ Some         |
| Data Transform     | ✅ Built-in        | ❌ Manual map  | ⚠️ Limited      |
| Pagination         | ✅ Supported       | ✅ Manual      | ⚠️ Varies       |
| Refine Integration | ✅ Full            | ⚠️ Partial     | ❌ None         |
| Type Safety        | ✅ Full TypeScript | ⚠️ Manual      | ⚠️ Varies       |

### Best Practices Summary

```typescript
// ✅ DO: Provide defaultValue for edit forms
useSelect({
  resource: "categories",
  defaultValue: post.categoryId,
});

// ✅ DO: Disable filterOption for server search
<AutoComplete options={options} onSearch={onSearch} filterOption={false} />;

// ✅ DO: Use reasonable debounce (300ms default)
useSelect({
  resource: "users",
  debounce: 300,
});

// ✅ DO: Show loading states
<Select options={options} loading={query.isLoading} />;

// ❌ DON'T: Use expensive operations in transformers
optionLabel: (item) => {
  return fetchRelatedData(item.id); // ❌ BAD!
};

// ❌ DON'T: Forget to handle empty states
// Always show placeholder/empty message

// ❌ DON'T: Load huge datasets without pagination
// Use pagination for > 100 items
```

### Điểm mạnh

1. **Complete Solution**: Handles everything for dropdowns
2. **Performance Optimized**: Parallel queries, debounce, memoization
3. **Flexible**: Works with any UI library
4. **Smart Merging**: Selected + fetched options correctly combined
5. **Developer Experience**: Simple API, complex logic hidden

### Điểm cần lưu ý

1. **Two Queries**: useMany + useList = 2 network requests
2. **Debounce Trade-off**: Better performance, slight delay in UX
3. **Transform Cost**: Function called per item (keep lightweight)
4. **Memory Usage**: Stores options + selectedOptions separately
5. **Complexity**: ~180 lines with many features (but abstracted well)

### Architectural Significance

```
┌────────────────────────────────────────┐
│      REFINE DATA LAYER                 │
├────────────────────────────────────────┤
│                                        │
│  useList ◄────────┐                    │
│                   │                    │
│  useMany ◄────────┼──── useSelect      │
│                   │                    │
│  useLoadingOT ◄───┘                    │
│                                        │
│  useSelect = Composite Pattern         │
│  - Orchestrates multiple hooks         │
│  - Transforms data for UI              │
│  - Provides unified interface          │
│                                        │
└────────────────────────────────────────┘

Hook Composition Levels:
1. Primitive: useQuery (React Query)
2. Basic: useList, useMany
3. Composite: useSelect ← We are here
4. Domain: usePostSelect, useUserSelect (app-specific)
```

### Resources

- **Official Docs**: https://refine.dev/docs/api-reference/core/hooks/useSelect
- **Implementation**: `/packages/core/src/hooks/useSelect/index.ts` (~180 lines)
- **Tests**: `/packages/core/src/hooks/useSelect/index.spec.ts`
- **Related**: useList, useMany, useLoadingOvertime
- **UI Examples**:
  - Ant Design: https://refine.dev/docs/ui-frameworks/antd/hooks/useSelect
  - Material-UI: https://refine.dev/docs/ui-frameworks/mui/hooks/useAutocomplete

---

**Tác giả kiến trúc:** Refine Core Team
**Hook size:** ~180 lines
**Hook type:** Composite Data Hook
**Dependencies:** useList, useMany, useLoadingOvertime, lodash (debounce, get, uniqBy)
**Design patterns:** Composite, Transformer, Debounce, Dual Query, Ref Pattern
