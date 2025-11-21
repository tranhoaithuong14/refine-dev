# Kiến trúc và Design Patterns của useGo Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          PROGRAMMATIC NAVIGATION SYSTEM           │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RouterContext                                   │  │
│  │    ↓ provides                                    │  │
│  │    - go: (config) => void                        │  │
│  │      (Low-level navigation function)             │  │
│  │                                                   │  │
│  │  useGetToPath                                    │  │
│  │    ↓ provides                                    │  │
│  │    - getToPath: (resource, action) => path       │  │
│  │      (Path generator)                            │  │
│  │                                                   │  │
│  │  useResourceParams                               │  │
│  │    ↓ provides                                    │  │
│  │    - Resource selector                           │  │
│  │         │                                         │  │
│  │         ↓ all used by                            │  │
│  │                                                   │  │
│  │  useGo ✅ (THIS HOOK)                            │  │
│  │    → Enhanced navigation with resource support   │  │
│  │         │                                         │  │
│  │         ├──→ ADAPTER PATTERN:                    │  │
│  │         │     Extends router.go with resources   │  │
│  │         │                                         │  │
│  │         ├──→ OVERLOADING PATTERN:                │  │
│  │         │     Accept string path OR resource obj │  │
│  │         │                                         │  │
│  │         ├──→ TYPE SAFETY:                        │  │
│  │         │     Union types (with/without ID)      │  │
│  │         │                                         │  │
│  │         ├──→ ERROR HANDLING:                     │  │
│  │         │     Validate required fields           │  │
│  │         │                                         │  │
│  │         └──→ DELEGATION:                         │  │
│  │               Uses useGetToPath for paths        │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - Components (programmatic navigation)        │  │
│  │    - useNavigation (CRUD shortcuts)              │  │
│  │    - Custom navigation logic                     │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide programmatic navigation supporting both string paths and resource-based navigation**

### 1.2 Two Navigation Modes

```
┌──────────────────────────────────────────────────────────────┐
│         DUAL NAVIGATION MODES - String vs Resource           │
└──────────────────────────────────────────────────────────────┘

MODE 1: String Path (Direct)
═══════════════════════════════
const go = useGo();

go({ to: "/posts/show/123" });
// Direct path navigation

MODE 2: Resource Object (Smart)
═══════════════════════════════
const go = useGo();

go({
  to: {
    resource: "posts",
    action: "show",
    id: 123
  }
});

Flow:
1. Find resource definition → postsResource
2. Generate path → "/posts/show/123"
3. Navigate → same as Mode 1!

Benefits of Mode 2:
✅ Type-safe (requires ID for show/edit)
✅ Resource validation
✅ Auto path generation
✅ Refactor-friendly (change routes in config)
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-go/index.tsx: 104 dòng** - Enhanced navigation!

---

### 2.1 Adapter Pattern - Extend Router Functionality

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Smart TV Remote

```
Regular TV Remote:
- Channel 1, 2, 3... (numbers only)
- Press 5 → Channel 5

Smart Remote (Adapter):
- Still supports numbers
- ALSO supports: "Netflix", "YouTube"
- Says "Netflix" → Opens Netflix app

useGo:

Regular router.go:
- Accepts string paths only
- go("/posts/show/123")

useGo (Adapter):
- Still supports string paths
- ALSO supports resource objects
- go({ resource: "posts", action: "show", id: 123 })
  → Generates "/posts/show/123"
  → Calls router.go
```

**Adapter Pattern** = Add new interface while maintaining compatibility with old interface.

#### Implementation:

```typescript
export const useGo = () => {
  const goFromRouter = useGo(); // Get original go from router
  const getToPath = useGetToPath();

  const go = useCallback(
    (config) => {
      // STRING PATH (original interface):
      if (typeof config.to !== "object") {
        return goFromRouter(config); // ← Pass-through!
      }

      // RESOURCE OBJECT (new interface):
      const path = getToPath({
        resource,
        action: config.to.action,
        meta: { id: config.to.id, ...config.to.meta },
      });

      return goFromRouter({ ...config, to: path }); // ← Adapt!
    },
    [goFromRouter, getToPath],
  );

  return go; // Enhanced function!
};
```

#### Backward Compatibility:

```typescript
// OLD CODE (still works):
const go = useGo();
go({ to: "/posts" }); // ✅ String path

// NEW CODE (also works):
go({ to: { resource: "posts", action: "list" } }); // ✅ Resource object

// Both work! Backward compatible! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Backward compatible** - Old code still works
- ✅ **Enhanced** - New capabilities added
- ✅ **Unified API** - One function for both modes
- ✅ **Gradual migration** - Can mix old and new

---

### 2.2 Function Overloading Pattern - Multiple Signatures

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order

```
Restaurant:

Order by name: "Burger"
Order by number: "#5"
Order by description: "Beef burger with cheese"

All valid! Different formats, same result.

useGo:

Go by path: "/posts/show/123"
Go by resource: { resource: "posts", action: "show", id: 123 }

All valid! Different formats, same navigation.
```

**Function Overloading** = Function accepts different parameter types/formats.

#### TypeScript Types:

```typescript
// TYPE 1: String path
type GoConfigBase = {
  to: string;
  type?: "push" | "replace";
  options?: Record<string, unknown>;
};

// TYPE 2: Resource object
type Resource = ResourceWithoutId | ResourceWithId;

type ResourceWithoutId = {
  resource: string;
  action: "create" | "list";
  id?: never; // ← No ID allowed!
};

type ResourceWithId = {
  resource: string;
  action: "edit" | "show" | "clone";
  id: BaseKey; // ← ID required!
};

// COMBINED:
type GoConfigWithResource = {
  to: string | Resource; // ← Union type!
  type?: "push" | "replace";
  options?: Record<string, unknown>;
};
```

#### Type-Safe Usage:

```typescript
// ✅ VALID: list (no ID needed)
go({ to: { resource: "posts", action: "list" } });

// ✅ VALID: show (ID provided)
go({ to: { resource: "posts", action: "show", id: 123 } });

// ❌ INVALID: show (missing ID)
go({ to: { resource: "posts", action: "show" } });
// TypeScript error! ✅

// ❌ INVALID: create (ID not allowed)
go({ to: { resource: "posts", action: "create", id: 123 } });
// TypeScript error! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Type safety** - Catch errors at compile time
- ✅ **Flexible** - Multiple ways to navigate
- ✅ **Clear** - TypeScript guides correct usage
- ✅ **Self-documenting** - Types show requirements

---

### 2.3 Delegation Pattern - Leverage Existing Tools

#### 🛠️ VÍ DỤ ĐỜI THƯỜNG: General Contractor

```
Building a House:

General Contractor:
- Does NOT do all tasks
- DELEGATES to specialists:
  - Plumber → Pipes
  - Electrician → Wiring
  - Carpenter → Framing

useGo:

Does NOT do everything:
- Path generation → useGetToPath
- Resource selection → useResourceParams
- Actual navigation → router.go

Orchestrates!
```

**Delegation Pattern** = Assign responsibilities to specialized components.

#### Implementation:

```typescript
export const useGo = () => {
  // DELEGATION 1: Get router's go function
  const goFromRouter = useGo();

  // DELEGATION 2: Get resource selector
  const { select: resourceSelect } = useResourceParams();

  // DELEGATION 3: Get path generator
  const getToPath = useGetToPath();

  const go = useCallback(
    (config) => {
      if (typeof config.to !== "object") {
        // DELEGATE: To router directly
        return goFromRouter(config);
      }

      // DELEGATE: To resource selector
      const { resource } = resourceSelect(config.to.resource);

      // DELEGATE: To path generator
      const path = getToPath({
        resource,
        action: config.to.action,
        meta: { id: config.to.id, ...config.to.meta },
      });

      // DELEGATE: To router for actual navigation
      return goFromRouter({ ...config, to: path });
    },
    [goFromRouter, resourceSelect, getToPath],
  );

  return go; // Orchestrator!
};
```

#### Responsibilities:

```
useGo (Orchestrator):
├─ Determine navigation mode (string vs resource)
├─ Validate resource navigation
└─ Coordinate:
   ├─ useResourceParams → Find resource
   ├─ useGetToPath → Generate path
   └─ router.go → Navigate
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Single Responsibility** - Each tool does one thing
- ✅ **Reusable** - Tools can be used independently
- ✅ **Testable** - Test each component separately
- ✅ **Maintainable** - Easy to change one component

---

### 2.4 Error Handling Pattern - Fail Fast

#### 🚦 VÍ DỤ ĐỜI THƯỜNG: Airport Security

```
Airport Security:

Check BEFORE boarding:
- Valid ticket? → No → STOP! ✋
- Valid ID? → No → STOP! ✋
- Valid passport? → No → STOP! ✋

Better than:
- Let them board
- Discover problem mid-flight ❌

useGo Error Handling:

Check BEFORE navigation:
- Resource provided? → No → ERROR! ✋
- Action provided? → No → ERROR! ✋
- ID for show/edit? → No → ERROR! ✋
- Action exists? → No → ERROR! ✋

Better than:
- Navigate
- 404 error ❌
```

**Fail Fast** = Detect errors early, report immediately.

#### Implementation:

```typescript
export const handleResourceErrors = (to: Resource, resource: IResourceItem) => {
  // CHECK 1: Required fields present?
  if (!to?.action || !to?.resource) {
    throw new Error('[useGo]: "action" or "resource" is required.');
  }

  // CHECK 2: ID required for certain actions?
  if (["edit", "show", "clone"].includes(to?.action) && !to.id) {
    throw new Error(
      `[useGo]: [action: ${to.action}] requires an "id" for resource [resource: ${to.resource}]`,
    );
  }

  // CHECK 3: Action defined for resource?
  const actionUrl = resource[to.action];
  if (!actionUrl) {
    throw new Error(
      `[useGo]: [action: ${to.action}] is not defined for [resource: ${to.resource}]`,
    );
  }
};

// Called in useGo:
const { resource } = resourceSelect(config.to.resource);
handleResourceErrors(config.to, resource); // ← Validate!
```

#### Error Scenarios:

```typescript
// ERROR 1: Missing action
go({ to: { resource: "posts" } });
// → Error: "action" or "resource" is required ❌

// ERROR 2: Missing ID for show
go({ to: { resource: "posts", action: "show" } });
// → Error: [action: show] requires an "id" ❌

// ERROR 3: Action not defined
go({ to: { resource: "posts", action: "archive" } });
// → Error: [action: archive] is not defined for [resource: posts] ❌

// SUCCESS: Valid navigation
go({ to: { resource: "posts", action: "show", id: 123 } });
// → Navigates to /posts/show/123 ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Early detection** - Errors caught before navigation
- ✅ **Clear messages** - Developer knows what's wrong
- ✅ **Debugging** - Stack trace shows exact location
- ✅ **Type safety++** - Runtime validation complements TypeScript

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường   | Giải quyết vấn đề gì   | Trong useGo                                    |
| --------------- | ------------------ | ---------------------- | ---------------------------------------------- |
| **Adapter**     | Smart TV remote    | Add new interface      | Extends router.go with resource support        |
| **Overloading** | Restaurant order   | Multiple input formats | Accept string path OR resource object          |
| **Delegation**  | General contractor | Assign to specialists  | Use useGetToPath, useResourceParams, router.go |
| **Fail Fast**   | Airport security   | Early error detection  | Validate before navigation                     |

---

## 3. KEY FEATURES

### 3.1 Two Navigation Modes

```typescript
// MODE 1: String path
go({ to: "/posts/show/123" });

// MODE 2: Resource object
go({
  to: {
    resource: "posts",
    action: "show",
    id: 123,
  },
});
```

### 3.2 Navigation Options

```typescript
go({
  to: "/posts",
  type: "push",      // or "replace"
  options: { ... }   // Router-specific options
});
```

### 3.3 Type-Safe Actions

```typescript
// Actions WITHOUT ID:
action: "list"; // → /posts
action: "create"; // → /posts/create

// Actions WITH ID (required):
action: "show"; // → /posts/show/:id
action: "edit"; // → /posts/edit/:id
action: "clone"; // → /posts/clone/:id
```

### 3.4 Meta Parameters

```typescript
go({
  to: {
    resource: "posts",
    action: "show",
    id: 123,
    meta: { tab: "comments" }, // Additional params
  },
});
// → /posts/show/123?tab=comments
```

---

## 4. COMMON USE CASES

### 4.1 Navigate to List

```tsx
import { useGo } from "@refinedev/core";

function BackToList() {
  const go = useGo();

  const handleClick = () => {
    // String path:
    go({ to: "/posts" });

    // OR resource object:
    go({ to: { resource: "posts", action: "list" } });
  };

  return <button onClick={handleClick}>Back to List</button>;
}
```

### 4.2 Navigate to Detail

```tsx
function ViewPost({ id }) {
  const go = useGo();

  const handleView = () => {
    go({
      to: {
        resource: "posts",
        action: "show",
        id, // Required for show!
      },
    });
  };

  return <button onClick={handleView}>View</button>;
}
```

### 4.3 Navigate to Edit

```tsx
function EditButton({ id }) {
  const go = useGo();

  const handleEdit = () => {
    go({
      to: {
        resource: "posts",
        action: "edit",
        id,
      },
    });
  };

  return <button onClick={handleEdit}>Edit</button>;
}
```

### 4.4 Navigate with Replace (No History)

```tsx
function RedirectToLogin() {
  const go = useGo();

  useEffect(() => {
    go({
      to: "/login",
      type: "replace", // Don't add to history
    });
  }, []);
}
```

### 4.5 Navigate with Meta Params

```tsx
function OpenPostTab({ id, tab }) {
  const go = useGo();

  const handleClick = () => {
    go({
      to: {
        resource: "posts",
        action: "show",
        id,
        meta: { tab }, // Additional params
      },
    });
  };

  // → /posts/show/123?tab=comments
}
```

### 4.6 Nested Resource Navigation

```tsx
function CommentLink({ categoryId, postId, commentId }) {
  const go = useGo();

  const handleClick = () => {
    go({
      to: {
        resource: "comments",
        action: "show",
        id: commentId,
        meta: {
          categoryId, // Parent params
          postId,
        },
      },
    });
  };

  // → /categories/1/posts/2/comments/show/3
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Support Both String and Resource?

**Answer:** Flexibility and gradual migration

```typescript
// STRING: Quick, simple
go({ to: "/posts/show/123" });

// RESOURCE: Type-safe, refactor-friendly
go({ to: { resource: "posts", action: "show", id: 123 } });

// Users can choose based on needs!
```

### 5.2 Why Not Separate Hooks?

**Answer:** Single entry point is simpler

```typescript
// ❌ ALTERNATIVE: Separate hooks
const goPath = useGoPath();
const goResource = useGoResource();
// Need to know which to use ❌

// ✅ CURRENT: One hook
const go = useGo();
// Handles both! ✅
```

### 5.3 Why Throw Errors Instead of Returning undefined?

**Answer:** Navigation errors should be loud

```typescript
// Path generation (useGetToPath):
const path = getToPath({ ... });
if (!path) { /* Handle gracefully */ }
// → undefined is OK (might be conditional navigation)

// Navigation (useGo):
go({ to: { resource: "posts", action: "show" } });  // Missing ID!
// → ERROR! This is a bug! Should be loud! ✋
```

### 5.4 Why useCallback?

**Answer:** Stable reference for dependency arrays

```typescript
const go = useCallback(
  (config) => { ... },
  [goFromRouter, resourceSelect, getToPath]
);

// Safe in dependencies:
useEffect(() => {
  go({ to: "/posts" });
}, [go]);  // Won't cause infinite loop ✅
```

---

## 6. COMPARISON WITH OTHER HOOKS

### useGo vs useNavigation

```typescript
// useNavigation: CRUD shortcuts
const { list, show, edit, create } = useNavigation();
list("posts"); // Go to posts list
show("posts", 123); // Go to post show

// useGo: Generic navigation
const go = useGo();
go({ to: { resource: "posts", action: "list" } });
go({ to: { resource: "posts", action: "show", id: 123 } });

// useNavigation uses useGo internally!
```

### useGo vs useBack

```typescript
// useBack: Go to previous page
const back = useBack();
back(); // Navigate back

// useGo: Go to specific page
const go = useGo();
go({ to: "/posts" }); // Navigate forward

// Different purposes!
```

### useGo vs useGetToPath

```typescript
// useGetToPath: Generate path only
const getToPath = useGetToPath();
const path = getToPath({ resource, action, meta });
// → "/posts/show/123" (string)

// useGo: Generate path AND navigate
const go = useGo();
go({ to: { resource, action, id } });
// → Navigates immediately

// useGo uses useGetToPath internally!
```

---

## 7. COMMON PITFALLS

### 7.1 Forgetting ID for show/edit

```typescript
// ❌ WRONG - Missing ID
go({ to: { resource: "posts", action: "show" } });
// → ERROR! ❌

// ✅ CORRECT - Provide ID
go({ to: { resource: "posts", action: "show", id: 123 } });
```

### 7.2 Providing ID for list/create

```typescript
// ❌ WRONG - ID not allowed
go({ to: { resource: "posts", action: "list", id: 123 } });
// → TypeScript error! ❌

// ✅ CORRECT - No ID
go({ to: { resource: "posts", action: "list" } });
```

### 7.3 Using Non-existent Action

```typescript
// ❌ WRONG - Action not defined
go({ to: { resource: "posts", action: "archive" } });
// → ERROR! ❌

// ✅ CORRECT - Use defined action
go({ to: { resource: "posts", action: "edit", id: 123 } });
```

### 7.4 Not Handling Async Navigation

```typescript
// ❌ WRONG - Assuming synchronous
const handleClick = () => {
  go({ to: "/posts" });
  console.log("Navigated!"); // ❌ Might not have navigated yet
};

// ✅ BETTER - Understand it's async
const handleClick = () => {
  go({ to: "/posts" });
  // Navigation happens asynchronously
  // Use router events to track navigation completion
};
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useGo } from "@refinedev/core";

describe("useGo", () => {
  it("should navigate with string path", () => {
    const mockRouter = {
      go: jest.fn(() => jest.fn()),
    };

    const { result } = renderHook(() => useGo(), {
      wrapper: createWrapper(mockRouter),
    });

    result.current({ to: "/posts" });

    expect(mockRouter.go).toHaveBeenCalled();
  });

  it("should navigate with resource object", () => {
    const { result } = renderHook(() => useGo(), {
      wrapper: TestWrapper,
    });

    result.current({
      to: {
        resource: "posts",
        action: "show",
        id: 123,
      },
    });

    // Should generate path and navigate
  });

  it("should throw error for missing ID", () => {
    const { result } = renderHook(() => useGo(), {
      wrapper: TestWrapper,
    });

    expect(() => {
      result.current({
        to: {
          resource: "posts",
          action: "show",
          // Missing ID!
        },
      });
    }).toThrow('[useGo]: [action: show] requires an "id"');
  });

  it("should throw error for undefined action", () => {
    const { result } = renderHook(() => useGo(), {
      wrapper: TestWrapper,
    });

    expect(() => {
      result.current({
        to: {
          resource: "posts",
          action: "archive", // Not defined
        },
      });
    }).toThrow("[useGo]: [action: archive] is not defined");
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Adapter**: Extends router.go with resource support
- ✅ **Overloading**: Accept string path OR resource object
- ✅ **Delegation**: Use useGetToPath, useResourceParams
- ✅ **Fail Fast**: Validate before navigation

### Key Features

1. **Dual Mode** - String path or resource object
2. **Type-Safe** - Union types enforce ID requirements
3. **Validated** - Error handling catches mistakes
4. **Flexible** - Navigation options (push/replace)
5. **Memoized** - useCallback for stable reference

### Khi nào dùng useGo?

✅ **Nên dùng:**

- Programmatic navigation in event handlers
- When you need flexibility (string or resource)
- Building custom navigation components
- Need type-safe navigation

❌ **Không dùng:**

- Simple back navigation → Use `useBack()`
- CRUD shortcuts → Use `useNavigation()` (uses useGo internally)
- Just generating paths → Use `useGetToPath()`

### Navigation Modes

```
String Path:  go({ to: "/posts/show/123" })
Resource Object: go({ to: { resource, action, id } })
```

### Type Safety

```
list/create: NO ID allowed
show/edit/clone: ID required!
```

### Remember

✅ **104 lines** - Enhanced navigation
🔌 **Adapter Pattern** - Extends router.go
🎭 **Overloading** - String or resource
🛠️ **Delegation** - Uses specialized hooks
🚦 **Fail Fast** - Validates before nav

---

> 📚 **Best Practice**: Use **resource objects** for type safety and refactoring ease. Use **string paths** for quick, simple navigation. Always **provide ID** for show/edit/clone actions. Resource objects are **validated at runtime** - errors are loud and clear! This hook is **foundation** for useNavigation CRUD shortcuts!
