# Kiến trúc và Design Patterns của useShow Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                DATA FETCHING LAYER                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  URL / Route Params                              │  │
│  │    ↓                                             │  │
│  │  useResourceParams                               │  │
│  │    ↓ (Infers resource & ID)                      │  │
│  │                                                   │  │
│  │  useShow ✅ (THIS HOOK)                          │  │
│  │    ↓                                             │  │
│  │    ├──→ COMPOSITION PATTERN:                     │  │
│  │    │     Combines URL params + Data fetching      │  │
│  │    │                                             │  │
│  │    ├──→ INFERENCE PATTERN:                       │  │
│  │    │     Auto-detects ID from URL                 │  │
│  │    │                                             │  │
│  │    ├──→ FACADE PATTERN:                          │  │
│  │    │     Simplifies useOne for "Show" pages       │  │
│  │    │                                             │  │
│  │    └──→ META PATTERN:                            │  │
│  │          Merges global & local metadata           │  │
│  │                                                   │  │
│  │    ↓ calls                                        │  │
│  │                                                   │  │
│  │  useOne (Core Data Hook)                         │  │
│  │    ↓                                             │  │
│  │  dataProvider.getOne()                           │  │
│  │    ↓                                             │  │
│  │  API / Backend                                   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Fetch a single record for a "Show" page, automatically handling ID inference from the URL.**

### 1.2 Data Flow

```
1. Component mounts (e.g., <PostShow>)
   ↓
2. useShow() called
   ↓
3. useResourceParams() checks URL
   → Found ID: 123
   → Found Resource: "posts"
   ↓
4. useMeta() merges metadata
   ↓
5. useOne({ resource: "posts", id: 123 }) called
   ↓
6. Data returned to component
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-show/index.ts: 84 dòng** - The "Show Page" Specialist!

---

### 2.1 Composition Pattern - The "All-in-One" Tool

#### 🛠️ VÍ DỤ ĐỜI THƯỜNG: Swiss Army Knife

```
Separate Tools:
- Knife (useOne)
- Screwdriver (useResourceParams)
- Bottle Opener (useMeta)

Swiss Army Knife (useShow):
- Contains all of them in one package!
- Convenient for camping (Show Page)

useShow combines:
1. useResourceParams (Find out WHAT to fetch)
2. useMeta (Find out HOW to fetch)
3. useOne (ACTUALLY fetch)
```

**Composition Pattern** = Combine multiple smaller units to create a more complex/useful unit.

#### Implementation:

```typescript
export const useShow = (props) => {
  // 1. Get ID and Resource from URL (or props)
  const { resource, id: showId } = useResourceParams({
    id: props.id,
    resource: props.resource,
  });

  // 2. Get Metadata
  const getMeta = useMeta();
  const combinedMeta = getMeta({ ... });

  // 3. Fetch Data
  const queryResult = useOne({
    resource,
    id: showId,
    meta: combinedMeta,
    ...
  });

  return { ...queryResult, showId };
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Convenience** - Developer doesn't need to manually wire up 3 hooks
- ✅ **Consistency** - Standard way to build Show pages
- ✅ **Less Boilerplate** - Cleaner component code

---

### 2.2 Inference Pattern - Smart Defaults

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: Smart Assistant

```
Dumb Assistant:
"Fetch the package."
"Which package ID?"
"The one on the table."
"I need you to tell me the ID explicitly."

Smart Assistant (useShow):
"Fetch the package."
"I see you are looking at package #123 on the table. I'll get that one."

useShow:
- If you pass an ID → Uses it
- If you DON'T pass an ID → Looks at URL (e.g., /posts/show/123)
```

**Inference Pattern** = Automatically deduce missing information from context.

#### Implementation:

```typescript
// Inside useResourceParams (called by useShow):
const { id } = useResourceParams({ id: props.id });

// If props.id is undefined, it checks the Router!
```

#### Usage:

```tsx
// On URL: /posts/show/123

// 1. Explicit (Manual):
useShow({ id: 123 }); // Fetches 123

// 2. Implicit (Inferred):
useShow(); // Fetches 123 (Detected from URL!) ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DRY** - Don't repeat ID if it's already in the URL
- ✅ **Flexibility** - Works for both URL-based and manual usage
- ✅ **Speed** - Faster development

---

### 2.3 Facade Pattern - Specialized Interface

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Restaurant Menu

```
Kitchen (useOne):
- Can cook ANYTHING (if you give exact recipe)
- Complex options

"Steak Frites" Item (useShow):
- Pre-configured order for the kitchen
- "Just give me the steak"

useOne:
- Generic data fetcher
- Needs strict config

useShow:
- Specialized for "Show" pages
- Pre-configures useOne for this specific use case
```

**Facade Pattern** = Provide a simplified interface to a complex subsystem.

#### Implementation:

```typescript
// useShow wraps useOne but exposes a simpler API tailored for Show pages
// It adds "showId" and "setShowId" to the return value
```

---

## 3. KEY FEATURES

### 3.1 Auto-ID Detection

```tsx
// Route: /posts/show/55

const {
  query: { data },
} = useShow();
// data.id === 55
```

### 3.2 Manual Override

```tsx
// Route: /posts/show/55

const {
  query: { data },
} = useShow({ id: 99 });
// data.id === 99 (Prop overrides URL)
```

### 3.3 Meta Merging

Merges metadata from:

1. Global config (`<Refine>`)
2. Resource config (`resources` prop)
3. Hook prop (`useShow({ meta: ... })`)

---

## 4. COMMON USE CASES

### 4.1 Basic Show Page

```tsx
export const PostShow = () => {
  const {
    query: { data, isLoading },
  } = useShow();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{data?.data.title}</h1>
      <p>{data?.data.content}</p>
    </div>
  );
};
```

### 4.2 Show Page with Custom ID (e.g., Modal)

```tsx
export const PostPreviewModal = ({ postId }) => {
  const {
    query: { data },
  } = useShow({
    resource: "posts",
    id: postId, // Explicit ID
  });

  return (
    <Modal>
      <h1>{data?.data.title}</h1>
    </Modal>
  );
};
```

---

## 5. TESTING

```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useShow } from "./index";

describe("useShow", () => {
  it("should fetch data using inferred ID", async () => {
    // Mock Router to return ID 123
    // Mock DataProvider to return { id: 123, title: "Test" }

    const { result } = renderHook(() => useShow());

    await waitFor(() => {
      expect(result.current.query.data?.data.id).toBe(123);
    });
  });

  it("should fetch data using prop ID", async () => {
    const { result } = renderHook(() => useShow({ id: 999 }));

    await waitFor(() => {
      expect(result.current.query.data?.data.id).toBe(999);
    });
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Composition**: Combines params, meta, and fetching
- ✅ **Inference**: Smartly detects ID from URL
- ✅ **Facade**: Specialized interface for Show pages

### Khi nào dùng useShow?

- Khi xây dựng trang **Show/Details** (chi tiết bản ghi).
- Khi cần lấy dữ liệu của **một bản ghi** dựa trên URL hoặc ID.

### Khi nào dùng useOne?

- Khi cần lấy dữ liệu của một bản ghi **không liên quan đến trang Show** (ví dụ: lấy thông tin user hiện tại, lấy config hệ thống).
- Khi không cần logic suy luận ID từ URL.

### Remember

✅ **Specialist** - Built for Show pages
🧠 **Smart** - Infers ID automatically
🛠️ **Composite** - Wraps `useOne` + `useResourceParams`
