# Kiến trúc và Design Patterns của useSyncWithLocation Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          URL SYNC CONFIGURATION SYSTEM            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RefineContext                                   │  │
│  │    ↓ provides                                    │  │
│  │    - syncWithLocation: boolean                   │  │
│  │         │                                         │  │
│  │         ↓ accessed via                           │  │
│  │                                                   │  │
│  │  useSyncWithLocation ✅ (THIS HOOK)              │  │
│  │    → Specialized accessor for URL sync config    │  │
│  │         │                                         │  │
│  │         ├──→ ACCESSOR PATTERN:                   │  │
│  │         │     Single config value access          │  │
│  │         │                                         │  │
│  │         ├──→ SPECIALIZATION PATTERN:             │  │
│  │         │     Focused on syncWithLocation only   │  │
│  │         │                                         │  │
│  │         └──→ FACADE PATTERN:                     │  │
│  │               Simple boolean flag interface      │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useTable (sync table state with URL)        │  │
│  │    - useList (sync filters/sorting to URL)       │  │
│  │    - Custom hooks needing URL sync detection     │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide access to syncWithLocation configuration flag for URL synchronization**

### 1.2 What is syncWithLocation?

```
┌──────────────────────────────────────────────────────────────┐
│         SYNC WITH LOCATION - URL State Management            │
└──────────────────────────────────────────────────────────────┘

WITHOUT syncWithLocation (false):

User opens /posts
Table shows: 10 items, no filters

User filters by "published"
URL stays: /posts ❌
State: In memory only

User refreshes page
Filters lost! ❌ Back to initial state


WITH syncWithLocation (true):

User opens /posts
Table shows: 10 items, no filters

User filters by "published"
URL updates: /posts?filters[0][field]=status&filters[0][value]=published ✅
State: In URL query params

User refreshes page
Filters preserved! ✅ State restored from URL

User copies URL
Other user opens same URL
Same filters applied! ✅ Shareable state!
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useSyncWithLocation.ts: 21 dòng** - Specialized config accessor!

---

### 2.1 Accessor Pattern - Single Config Value Access

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Light Switch

```
Entire Electrical Panel (RefineContext):
- Main power: ON/OFF
- Circuit 1: 120V
- Circuit 2: 240V
- Breakers: 15 states
- Complex system!

Light Switch (useSyncWithLocation):
- One simple switch
- ON or OFF
- Just controls one thing
- Easy to use!

useSyncWithLocation:

RefineContext:
- mutationMode
- syncWithLocation ← ONLY THIS
- undoableTimeout
- warnWhenUnsavedChanges
- liveMode
- Many more...

useSyncWithLocation:
- syncWithLocation: boolean
- That's it!
- Simple!
```

**Accessor Pattern** = Provide access to specific part of larger data structure.

#### Implementation:

```typescript
// FULL CONTEXT (Complex):
const RefineContext = {
  mutationMode: "optimistic",
  syncWithLocation: true, // ← THIS ONE
  undoableTimeout: 5000,
  warnWhenUnsavedChanges: true,
  // ... many more
};

// SPECIALIZED ACCESSOR (Simple):
export const useSyncWithLocation = () => {
  const { syncWithLocation } = useContext(RefineContext);
  return { syncWithLocation }; // ← Only this!
};

// USAGE:
const { syncWithLocation } = useSyncWithLocation();
// Gets ONLY what you need! ✅
```

#### Why Not Use useRefineContext?

```typescript
// OPTION 1: Use full context accessor (verbose)
const { syncWithLocation } = useRefineContext();
// Gets all config, extract one ❌

// OPTION 2: Use specialized accessor (clean)
const { syncWithLocation } = useSyncWithLocation();
// Gets only what you need ✅
// Clear intent! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Focused** - Only one concern
- ✅ **Clear intent** - Name says exactly what it does
- ✅ **Lightweight** - No extra data
- ✅ **Semantic** - Better code readability

---

### 2.2 Specialization Pattern - Focused Hook

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Specialist Doctors

```
General Practitioner (useRefineContext):
- Treats everything
- General health check
- Refers to specialists

Eye Specialist (useSyncWithLocation):
- Only treats eyes
- Expert in one area
- Focused care

useSyncWithLocation:

General hook (useRefineContext):
- Returns all config
- Use for anything
- Multipurpose

Specialized hook (useSyncWithLocation):
- Returns only syncWithLocation
- Use for URL sync
- Single purpose
```

**Specialization Pattern** = Create focused versions of general purpose tools.

#### Implementation:

```typescript
// GENERAL PURPOSE:
export const useRefineContext = () => {
  const context = useContext(RefineContext);
  return context;  // Everything!
};

// SPECIALIZED:
export const useSyncWithLocation = () => {
  const { syncWithLocation } = useContext(RefineContext);
  return { syncWithLocation };  // Only this!
};

// More specialized hooks:
export const useMutationMode = () => { ... };
export const useLiveMode = () => { ... };
// Each focused on one config!
```

#### Benefits of Specialization:

```typescript
// IN TABLE HOOK:
// ❌ GENERAL (unclear intent):
const config = useRefineContext();
if (config.syncWithLocation) { ... }

// ✅ SPECIALIZED (clear intent):
const { syncWithLocation } = useSyncWithLocation();
if (syncWithLocation) { ... }
// Immediately clear: "This code deals with URL sync"
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Clarity** - Purpose obvious from hook name
- ✅ **Maintainability** - Changes isolated
- ✅ **Discoverability** - Easy to find right hook
- ✅ **Documentation** - Self-documenting code

---

### 2.3 Facade Pattern - Simple Boolean Flag

#### 🎚️ VÍ DỤ ĐỜI THƯỜNG: Master Switch

```
Behind the scenes (Complex):
- URL parsing
- Query parameter encoding
- State serialization
- History API
- Browser compatibility

Front facing (Simple):
- ON: Sync with URL
- OFF: Don't sync
- One boolean!

useSyncWithLocation:

Behind the scenes:
- useTable checks flag
- Serializes filters to URL
- Updates query params
- Syncs history
- Complex logic!

Front facing:
- syncWithLocation: true/false
- That's it!
- Simple!
```

**Facade Pattern** = Hide complexity behind simple interface.

#### Implementation:

```typescript
// SIMPLE INTERFACE:
const { syncWithLocation } = useSyncWithLocation();

// Enables complex behavior:
if (syncWithLocation) {
  // Serialize state
  const params = serializeFilters(filters);
  // Update URL
  updateQueryParams(params);
  // Push to history
  history.push({ search: params });
  // ... many steps!
}
```

#### Real Usage in useTable:

```typescript
function useTable() {
  const { syncWithLocation } = useSyncWithLocation();

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    if (syncWithLocation) {
      // COMPLEX: Sync to URL
      const searchParams = new URLSearchParams();
      newFilters.forEach((filter, index) => {
        searchParams.set(`filters[${index}][field]`, filter.field);
        searchParams.set(`filters[${index}][value]`, filter.value);
      });
      history.push({ search: searchParams.toString() });
    }
    // If false, just update local state
  };
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - Complex behavior behind simple flag
- ✅ **Control** - Easy to toggle feature
- ✅ **Testable** - Easy to test both modes
- ✅ **Flexible** - Can change implementation without changing API

---

### 2.4 Configuration Flag Pattern - Feature Toggle

#### 🚦 VÍ DỤ ĐỜI THƯỜNG: Car Features

```
Car with Features:

Cruise Control:
- ON: Car maintains speed automatically
- OFF: Manual speed control

Lane Assist:
- ON: Car helps stay in lane
- OFF: Manual steering

Each feature:
- Simple ON/OFF
- Enables/disables functionality
- User chooses

syncWithLocation:

Feature:
- ON (true): URL sync enabled
- OFF (false): URL sync disabled

Behavior:
- true: Table state → URL params
- false: Table state → Memory only

User chooses at app level!
```

**Configuration Flag Pattern** = Control feature via simple boolean.

#### Implementation:

```typescript
// APP LEVEL CONFIGURATION:
<Refine
  syncWithLocation={true} // ← Feature flag
>
  <App />
</Refine>;

// ALL COMPONENTS READ FLAG:
function TableComponent() {
  const { syncWithLocation } = useSyncWithLocation();

  // Feature enabled?
  if (syncWithLocation) {
    // Enable URL sync
  } else {
    // Disable URL sync
  }
}
```

#### Feature States:

```typescript
// STATE 1: Enabled (default for most apps)
<Refine syncWithLocation={true}>

// Behavior:
// - Filters → URL: /posts?status=published
// - Sorting → URL: /posts?sort=createdAt&order=desc
// - Pagination → URL: /posts?page=2
// - Shareable URLs ✅
// - Bookmarkable ✅

// STATE 2: Disabled (for some use cases)
<Refine syncWithLocation={false}>

// Behavior:
// - Filters → Memory only
// - Sorting → Memory only
// - Pagination → Memory only
// - URLs don't change
// - State lost on refresh
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simple control** - One flag, big impact
- ✅ **Predictable** - Same flag everywhere
- ✅ **Consistent** - All tables behave same way
- ✅ **Flexible** - Easy to change app-wide

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                | Ví dụ đời thường | Giải quyết vấn đề gì  | Trong useSyncWithLocation               |
| ---------------------- | ---------------- | --------------------- | --------------------------------------- |
| **Accessor**           | Light switch     | Access specific value | Get syncWithLocation from RefineContext |
| **Specialization**     | Eye doctor       | Focused functionality | Hook only for URL sync config           |
| **Facade**             | Master switch    | Hide complexity       | Simple boolean hides URL sync logic     |
| **Configuration Flag** | Car features     | Feature toggle        | Enable/disable URL sync globally        |

---

## 3. KEY FEATURES

### 3.1 Simple Boolean Return

```typescript
const { syncWithLocation } = useSyncWithLocation();

// Type: boolean
// true: Sync table state with URL
// false: Keep state in memory only
```

### 3.2 Global Configuration

```typescript
<Refine syncWithLocation={true}>
  <App />
</Refine>;

// All components see same value
const { syncWithLocation } = useSyncWithLocation();
// → true everywhere ✅
```

### 3.3 URL State Examples

```typescript
// When syncWithLocation = true:

// Filters:
/posts?filters[0][field]=status&filters[0][value]=published

// Sorting:
/posts?sorters[0][field]=createdAt&sorters[0][order]=desc

// Pagination:
/posts?current=2&pageSize=20

// Search:
/posts?q=react

// All combined:
/posts?filters[0][field]=status&filters[0][value]=published&current=2&pageSize=20&q=react
```

---

## 4. COMMON USE CASES

### 4.1 Check If URL Sync Is Enabled

```tsx
import { useSyncWithLocation } from "@refinedev/core";

function TableToolbar() {
  const { syncWithLocation } = useSyncWithLocation();

  return (
    <div>
      {syncWithLocation && (
        <Tooltip title="Share this URL to share current filters">
          <Button icon={<ShareIcon />} />
        </Tooltip>
      )}
    </div>
  );
}
```

### 4.2 Conditional URL Updates

```tsx
function FilterBar() {
  const { syncWithLocation } = useSyncWithLocation();
  const history = useHistory();

  const handleFilterChange = (filters) => {
    setFilters(filters);

    if (syncWithLocation) {
      // Update URL
      const params = serializeFilters(filters);
      history.push({ search: params });
    }
    // If false, just local state update
  };
}
```

### 4.3 Show URL Sync Indicator

```tsx
function TableHeader() {
  const { syncWithLocation } = useSyncWithLocation();

  return (
    <div className="header">
      <h2>Posts</h2>
      {syncWithLocation && <Badge color="blue">URL Sync Active</Badge>}
    </div>
  );
}
```

### 4.4 Custom Hook with URL Sync

```tsx
function useCustomFilters() {
  const { syncWithLocation } = useSyncWithLocation();
  const [filters, setFilters] = useState([]);

  const updateFilters = (newFilters) => {
    setFilters(newFilters);

    if (syncWithLocation) {
      // Sync to URL
      updateURL(newFilters);
    }
  };

  return { filters, updateFilters };
}
```

### 4.5 Debug URL State

```tsx
function DebugPanel() {
  const { syncWithLocation } = useSyncWithLocation();
  const location = useLocation();

  if (!syncWithLocation) {
    return <p>URL sync disabled</p>;
  }

  return (
    <pre>
      Current URL: {location.pathname + location.search}
      Params: {JSON.stringify(parseQuery(location.search), null, 2)}
    </pre>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Separate Hook Instead of useRefineContext?

**Answer:** Better semantics and discoverability

```typescript
// ❌ USING useRefineContext (unclear):
const { syncWithLocation } = useRefineContext();
// What config am I getting? Many fields!

// ✅ USING useSyncWithLocation (clear):
const { syncWithLocation } = useSyncWithLocation();
// Immediately clear: URL sync config!
```

### 5.2 Why Boolean Instead of String Modes?

**Answer:** Simplicity - only two states needed

```typescript
// CURRENT (Simple):
syncWithLocation: boolean;
// true: Sync enabled
// false: Sync disabled

// ALTERNATIVE (Over-engineered):
syncWithLocation: "full" | "partial" | "off";
// Unnecessary complexity! ❌

// Boolean is enough! ✅
```

### 5.3 Why Not Allow Override Per Component?

**Answer:** Consistency - same behavior app-wide

```typescript
// CURRENT (Consistent):
<Refine syncWithLocation={true}>
  <Table1 />  {/* Syncs */}
  <Table2 />  {/* Syncs */}
  <Table3 />  {/* Syncs */}
</Refine>

// ALTERNATIVE (Inconsistent):
<Refine syncWithLocation={true}>
  <Table1 syncWithLocation={false} />  {/* Doesn't sync */}
  <Table2 />  {/* Syncs */}
  <Table3 syncWithLocation={false} />  {/* Doesn't sync */}
</Refine>

// Confusing! URLs would be inconsistent! ❌
// Global flag is better! ✅
```

### 5.4 Why Not Include in useTable Directly?

**Answer:** Separation of concerns

```typescript
// useTable focuses on table logic
// useSyncWithLocation focuses on config access
// Each has one responsibility ✅

// If config logic changes, only this hook updates
// useTable stays unchanged ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Assuming Always True

```typescript
// ❌ WRONG - Assuming enabled
const updateURL = (filters) => {
  history.push({ search: serializeFilters(filters) });
  // Always updates URL! ❌
};

// ✅ CORRECT - Check flag
const { syncWithLocation } = useSyncWithLocation();
const updateURL = (filters) => {
  if (syncWithLocation) {
    history.push({ search: serializeFilters(filters) });
  }
};
```

### 6.2 Not Handling Disabled State

```typescript
// ❌ INCOMPLETE - Only handles enabled
const { syncWithLocation } = useSyncWithLocation();
if (syncWithLocation) {
  syncToURL();
}
// What if false? State lost! ❌

// ✅ COMPLETE - Handle both states
const { syncWithLocation } = useSyncWithLocation();
if (syncWithLocation) {
  syncToURL();
} else {
  persistToLocalStorage(); // Alternative storage
}
```

### 6.3 Overriding Global Setting

```typescript
// ❌ WRONG - Trying to override
const { syncWithLocation } = useSyncWithLocation();
const shouldSync = customCondition || syncWithLocation;
// Breaks consistency! ❌

// ✅ CORRECT - Respect global setting
const { syncWithLocation } = useSyncWithLocation();
if (syncWithLocation) {
  // Only sync if globally enabled
}
```

---

## 7. INTEGRATION WITH TABLES

### How useTable Uses This Hook

```typescript
// In useTable:
export const useTable = () => {
  const { syncWithLocation } = useSyncWithLocation();

  // Initialize state from URL if sync enabled
  const [filters, setFilters] = useState(() => {
    if (syncWithLocation) {
      return parseFiltersFromURL();
    }
    return [];
  });

  // Update URL when filters change
  useEffect(() => {
    if (syncWithLocation) {
      updateURLParams({ filters });
    }
  }, [filters, syncWithLocation]);

  return { filters, setFilters };
};
```

### Complete Flow:

```
User opens /posts?status=published
           ↓
useSyncWithLocation() → true
           ↓
useTable reads URL params
           ↓
Filters initialized: [{ field: "status", value: "published" }]
           ↓
Table renders with filters applied ✅

User changes filter to "draft"
           ↓
setFilters([{ field: "status", value: "draft" }])
           ↓
useEffect detects change
           ↓
syncWithLocation = true → Update URL
           ↓
URL changes: /posts?status=draft ✅
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useSyncWithLocation } from "@refinedev/core";

// Mock RefineContext
const wrapper = ({ children, syncValue }) => (
  <RefineContext.Provider
    value={{
      syncWithLocation: syncValue,
      // ... other values
    }}
  >
    {children}
  </RefineContext.Provider>
);

describe("useSyncWithLocation", () => {
  it("should return true when sync enabled", () => {
    const { result } = renderHook(() => useSyncWithLocation(), {
      wrapper: (props) => wrapper({ ...props, syncValue: true }),
    });

    expect(result.current.syncWithLocation).toBe(true);
  });

  it("should return false when sync disabled", () => {
    const { result } = renderHook(() => useSyncWithLocation(), {
      wrapper: (props) => wrapper({ ...props, syncValue: false }),
    });

    expect(result.current.syncWithLocation).toBe(false);
  });

  it("should return same value as RefineContext", () => {
    const { result, rerender } = renderHook(() => useSyncWithLocation(), {
      wrapper: (props) => wrapper({ ...props, syncValue: true }),
    });

    expect(result.current.syncWithLocation).toBe(true);

    rerender({ syncValue: false });

    expect(result.current.syncWithLocation).toBe(false);
  });
});
```

---

## 9. WHEN TO ENABLE/DISABLE

### ✅ Enable syncWithLocation (true) when:

```typescript
// Good use cases:
- Admin panels (shareable filtered views)
- Data dashboards (bookmark specific reports)
- Public listings (share search results)
- Analytics pages (share date ranges)

<Refine syncWithLocation={true}>
```

### ❌ Disable syncWithLocation (false) when:

```typescript
// Good use cases:
- Embedded widgets (don't pollute parent URL)
- Mobile apps (no URL bar anyway)
- Sensitive data (don't leak in URL)
- Simple CRUD (no complex filtering)

<Refine syncWithLocation={false}>
```

---

## 10. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Access single config value (syncWithLocation)
- ✅ **Specialization**: Focused hook for one purpose
- ✅ **Facade**: Simple boolean hides URL sync complexity
- ✅ **Configuration Flag**: Enable/disable feature globally

### Key Features

1. **Simple Boolean** - true/false, that's it
2. **Global Config** - Same value app-wide
3. **URL State** - Filters/sorting/pagination in URL
4. **Shareable** - Copy URL = share state
5. **Bookmarkable** - Bookmark URL = save state

### Khi nào dùng useSyncWithLocation?

✅ **Nên dùng:**

- Building custom table components
- Custom hooks that modify table state
- Need to detect if URL sync is active
- Conditional URL updates

❌ **Không dùng:**

- Just reading all config → Use `useRefineContext`
- Modifying sync setting → Update `<Refine>` props
- Non-table components → Probably don't need it

### Remember

✅ **21 lines** - Ultra-minimal accessor
🔑 **Accessor Pattern** - Single config value
🎯 **Specialization Pattern** - Focused on URL sync
🎚️ **Facade Pattern** - Simple boolean flag
🚦 **Configuration Flag** - Feature toggle

---

> 📚 **Best Practice**: **Enable** syncWithLocation for **admin panels** and **dashboards** (shareable state). **Disable** for **embedded widgets** and **sensitive data** (don't leak in URL). Always **check the flag** before updating URL params. This hook is **read-only** - to change setting, update **\<Refine syncWithLocation={...}\>** props!
