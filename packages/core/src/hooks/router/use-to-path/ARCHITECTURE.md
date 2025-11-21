# Kiến trúc và Design Patterns của useToPath Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            PATH GENERATION SYSTEM                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useGetToPath (Low-level Factory)                │  │
│  │    → Returns function: (params) => string        │  │
│  │    → "Give me a tool to make paths"              │  │
│  │         │                                         │  │
│  │         ↓ wrapped by                             │  │
│  │                                                   │  │
│  │  useToPath ✅ (THIS HOOK - 27 lines!)            │  │
│  │    → Returns path string directly                │  │
│  │    → "Give me the path right now"                │  │
│  │         │                                         │  │
│  │         ├──→ FACADE PATTERN:                     │  │
│  │         │     Simplifies useGetToPath usage       │  │
│  │         │                                         │  │
│  │         ├──→ DELEGATION PATTERN:                 │  │
│  │         │     Delegates logic to useGetToPath     │  │
│  │         │                                         │  │
│  │         └──→ EAGER EVALUATION:                   │  │
│  │               Calculates path immediately        │  │
│  │                                                   │  │
│  │    ↓ returns string | undefined                   │  │
│  │                                                   │  │
│  │  "/posts/show/123"                               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Generate a navigation path string for a specific resource and action immediately.**

### 1.2 Comparison: useGetToPath vs useToPath

```
┌──────────────────────────────────────────────────────────────┐
│         USEGETTOPATH VS USETOPATH - Factory vs Result        │
└──────────────────────────────────────────────────────────────┘

useGetToPath (Factory)
═══════════════════════════════
const getToPath = useGetToPath();  // Get function
const path = getToPath({ ... });   // Call later

Use when:
- Generating multiple paths (e.g., in a list)
- Params not ready yet
- Event handlers

useToPath (Result) ✅
═══════════════════════════════
const path = useToPath({ ... });   // Get string directly!

Use when:
- Rendering a single link
- Params are known
- Need path for render
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-to-path/index.ts: 27 dòng** - Path generation shortcut!

---

### 2.1 Facade Pattern - Simplified Interface

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Coffee Machine

```
Barista (useGetToPath):
1. You ask for barista
2. You tell barista "Make me a latte"
3. Barista makes latte

Coffee Vending Machine (useToPath):
1. You press "Latte" button
2. Machine gives latte

useGetToPath (Manual):
const getToPath = useGetToPath();
const path = getToPath({ ... });

useToPath (Direct):
const path = useToPath({ ... });
```

**Facade Pattern** = Provide a simplified interface to a complex subsystem.

#### Implementation:

```typescript
export const useToPath = (params: UseToPathParams) => {
  // 1. Get the complex tool
  const getToPath = useGetToPath();

  // 2. Use it immediately and return result
  return getToPath(params);
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Convenience** - Less boilerplate code
- ✅ **Readability** - Intent is clear ("I want a path")
- ✅ **Simplicity** - One step instead of two

---

### 2.2 Delegation Pattern - Reuse Logic

#### 🛠️ VÍ DỤ ĐỜI THƯỜNG: General Contractor

```
You (Developer):
"I want a wall built."

General Contractor (useToPath):
"I don't build walls myself. I'll hire a bricklayer."

Bricklayer (useGetToPath):
*Builds the wall*

useToPath:
"I don't calculate paths. I'll ask useGetToPath."
```

**Delegation Pattern** = Object handles a request by delegating to a second object (the delegate).

#### Implementation:

```typescript
// useToPath doesn't know HOW to make paths.
// It just asks useGetToPath.

const getToPath = useGetToPath(); // The Delegate
return getToPath(params); // Delegation
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DRY (Don't Repeat Yourself)** - Path logic exists in only one place
- ✅ **Consistency** - Both hooks behave exactly the same
- ✅ **Maintainability** - Fix bugs in `useGetToPath`, fix both hooks

---

## 3. KEY FEATURES

### 3.1 Immediate Path Generation

```tsx
const path = useToPath({
  resource: "posts",
  action: "show",
  meta: { id: 123 },
});

// path === "/posts/show/123"
```

### 3.2 Resource Inference

If `resource` is omitted, it tries to infer it from the current route (via `useGetToPath`'s logic).

```tsx
// On page /posts
const path = useToPath({ action: "create" });
// path === "/posts/create"
```

---

## 4. COMMON USE CASES

### 4.1 Rendering a Link

```tsx
import { useToPath, Link } from "@refinedev/core";

const CreatePostButton = () => {
  const createPath = useToPath({
    resource: "posts",
    action: "create",
  });

  return <Link to={createPath}>Create Post</Link>;
};
```

### 4.2 Redirect Logic

```tsx
const path = useToPath({ resource: "users", action: "list" });

useEffect(() => {
  if (shouldRedirect) {
    window.location.href = path;
  }
}, [path]);
```

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useToPath } from "./index";

describe("useToPath", () => {
  it("should return path string", () => {
    // Mock useGetToPath to return a function that returns "/test"
    // ... setup mocks ...

    const { result } = renderHook(() =>
      useToPath({ resource: "posts", action: "list" }),
    );

    expect(result.current).toBe("/posts");
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Facade**: Simplifies `useGetToPath`
- ✅ **Delegation**: Reuses logic from `useGetToPath`
- ✅ **Eager Evaluation**: Returns result immediately

### Khi nào dùng useToPath?

- Khi bạn cần **một đường dẫn cụ thể** ngay lập tức để render (ví dụ: trong `href` của thẻ `<a>` hoặc prop `to` của `<Link>`).
- Khi bạn đã có đủ tham số (resource, action, id).

### Khi nào dùng useGetToPath?

- Khi bạn cần tạo **nhiều đường dẫn** (ví dụ: trong vòng lặp `map` của bảng dữ liệu).
- Khi bạn muốn truyền hàm tạo đường dẫn xuống component con.

### Remember

✅ **27 lines** - Simple wrapper
🎭 **Facade** - Easy to use
🛠️ **Delegation** - Powered by `useGetToPath`
