# Kiến trúc và Design Patterns của useKeys Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │               QUERY KEY MANAGEMENT                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useKeys ✅ (THIS HOOK)                          │  │
│  │    ↓                                             │  │
│  │    ├──→ ACCESSOR PATTERN:                        │  │
│  │    │     Exposes the 'keys' builder factory       │  │
│  │    │                                             │  │
│  │    └──→ BUILDER PATTERN (The Core):              │  │
│  │          Fluent interface for constructing keys   │  │
│  │                                                   │  │
│  │    ↓ returns { keys: () => KeyBuilder }           │  │
│  │                                                   │  │
│  │  keys().data("posts").action("list").get()       │  │
│  │    ↓                                             │  │
│  │  ["data", "posts", "list", { ...params }]        │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - React Query (Query Keys)                    │  │
│  │    - useList, useOne, useMany (Internal)         │  │
│  │    - Developers (Custom invalidation)            │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide a standardized, type-safe way to generate Query Keys for data fetching and caching (React Query).**

### 1.2 Why do we need a Builder?

React Query keys are arrays, e.g., `['data', 'posts', 'list', { filters: ... }]`.
Manually writing these arrays is error-prone:

- Typo in "data" or "posts"?
- Wrong order of elements?
- Forgot to include parameters?

The `keys()` builder solves this by enforcing a strict structure via TypeScript.

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File definitions/helpers/keys/index.ts** - The Key Architect!

---

### 2.1 Builder Pattern - "Legos for Keys"

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Subway Sandwich Order

```
Manual Order (Array):
"I want a sandwich, wheat bread, turkey, lettuce, mayo."
(Easy to forget bread or mix up order)

Builder Order (Fluent Interface):
Order()
  .bread("wheat")
  .meat("turkey")
  .veggies("lettuce")
  .sauce("mayo")
  .build();
(Step-by-step, guided, impossible to put sauce before bread)

useKeys:
keys()
  .data("posts")      // Select Data domain
  .action("list")     // Select Action
  .params({ ... })    // Add Params
  .get()              // Build!
```

**Builder Pattern** = Separate the construction of a complex object from its representation.

#### Implementation:

```typescript
// Each method returns a NEW builder instance with added segments
class DataKeyBuilder {
  resource(name) {
    return new DataResourceKeyBuilder([...this.segments, name]);
  }
}
```

---

### 2.2 Fluent Interface - Method Chaining

#### 🔗 VÍ DỤ ĐỜI THƯỜNG: Sentence Construction

```
"Start" -> "Add Subject" -> "Add Verb" -> "Add Object" -> "End"

keys()
  .data("posts")  // -> Returns DataKeyBuilder
  .action("one")  // -> Returns DataIdRequiringKeyBuilder
  .id(123)        // -> Returns ParamsKeyBuilder
  .get()          // -> Returns Array
```

**Fluent Interface** = An API design that relies on method chaining to make code read like a sentence.

---

### 2.3 State Machine / Type Safety

The builder is smart. It changes its "Type" based on what you call.

```typescript
// 1. Start
keys() // Type: KeyBuilder
  // 2. Select Data
  .data("posts") // Type: DataKeyBuilder

  // 3. Select Action
  .action("one") // Type: DataIdRequiringKeyBuilder (Forces you to provide ID!)

  // 4. Provide ID
  .id(123); // Type: ParamsKeyBuilder (Now you can add params or get)
```

**Benefit:** You CANNOT call `.id()` before selecting an action that needs an ID. TypeScript will yell at you!

---

## 3. KEY FEATURES

### 3.1 Domain Separation

The builder supports different domains:

- `.data()`: For data provider resources (posts, users).
- `.auth()`: For auth provider (user, permissions).
- `.access()`: For access control (can).
- `.audit()`: For audit logs.

### 3.2 Immutability

Every method call returns a **new instance**. The original builder is never modified.

```typescript
const base = keys().data("posts");
const listKey = base.action("list"); // New object
const oneKey = base.action("one"); // New object
```

---

## 4. COMMON USE CASES

### 4.1 Invalidating Queries (React Query)

When you want to manually refetch data:

```tsx
import { useQueryClient } from "@tanstack/react-query";
import { useKeys } from "@refinedev/core";

const MyComponent = () => {
  const queryClient = useQueryClient();
  const { keys } = useKeys();

  const handleRefresh = () => {
    // Invalidate ALL posts data
    queryClient.invalidateQueries(keys().data("posts").get());
  };
};
```

### 4.2 Custom React Query Hooks

If you use `useQuery` directly but want to stay consistent with Refine:

```tsx
useQuery({
  queryKey: keys().data("posts").action("list").params({ filters: [] }).get(),
  queryFn: fetchPosts,
});
```

---

## 5. TESTING

```typescript
import { keys } from "./index";

describe("keys builder", () => {
  it("should build list key", () => {
    const key = keys().data("posts").action("list").get();
    expect(key).toEqual(["data", "posts", "list"]);
  });

  it("should build one key with id", () => {
    const key = keys().data("posts").action("one").id(123).get();
    expect(key).toEqual(["data", "posts", "one", "123"]);
  });

  it("should enforce order", () => {
    // TypeScript would fail here if we tried:
    // keys().id(123) // Error: Property 'id' does not exist...
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Builder**: Step-by-step construction
- ✅ **Fluent Interface**: Readable method chaining
- ✅ **Type State**: Enforces valid key structure
- ✅ **Immutability**: Safe reuse of builder instances

### Khi nào dùng?

- Khi bạn cần tương tác trực tiếp với **React Query Client** (invalidateQueries, setQueryData).
- Khi bạn muốn tạo custom hooks mà vẫn tuân thủ chuẩn query key của Refine.

### Remember

🏗️ **Builder** - Constructs arrays
🔗 **Fluent** - Chainable methods
🛡️ **Safe** - TypeScript enforced
