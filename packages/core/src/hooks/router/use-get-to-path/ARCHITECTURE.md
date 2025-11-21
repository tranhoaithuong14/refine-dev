# Kiến trúc và Design Patterns của useGetToPath Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          ROUTER PATH GENERATION SYSTEM            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  Resources (Config)                              │  │
│  │    ↓ provides                                    │  │
│  │    - Resource definitions                        │  │
│  │    - Action routes (list, show, edit, create)    │  │
│  │    - Route patterns (/posts, /posts/:id, etc.)   │  │
│  │                                                   │  │
│  │  useResourceParams                               │  │
│  │    ↓ provides                                    │  │
│  │    - Current resource                            │  │
│  │    - All resources                               │  │
│  │                                                   │  │
│  │  useParsed                                       │  │
│  │    ↓ provides                                    │  │
│  │    - Current route params (id, etc.)             │  │
│  │         │                                         │  │
│  │         ↓ all used by                            │  │
│  │                                                   │  │
│  │  useGetToPath ✅ (THIS HOOK)                     │  │
│  │    → Generate paths for CRUD actions             │  │
│  │         │                                         │  │
│  │         ├──→ FACTORY PATTERN:                    │  │
│  │         │     Returns path generator function    │  │
│  │         │                                         │  │
│  │         ├──→ BUILDER PATTERN:                    │  │
│  │         │     Compose routes with params         │  │
│  │         │                                         │  │
│  │         ├──→ STRATEGY PATTERN:                   │  │
│  │         │     Different routes per action        │  │
│  │         │                                         │  │
│  │         └──→ NULL SAFETY:                        │  │
│  │               Undefined for missing resource/action│ │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useNavigation (generate nav paths)          │  │
│  │    - useBreadcrumb (generate breadcrumb links)   │  │
│  │    - Custom navigation hooks                     │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide a function to generate paths for CRUD actions on resources**

### 1.2 Path Generation Flow

```
┌──────────────────────────────────────────────────────────────┐
│         PATH GENERATION - From Action to URL                 │
└──────────────────────────────────────────────────────────────┘

Input: { resource: "posts", action: "show", meta: { id: 123 } }
           ↓
1. Find resource definition
   → resource.name = "posts"
   → resource.options.route = "/posts"
           ↓
2. Get action routes
   → list: "/posts"
   → show: "/posts/show/:id"
   → edit: "/posts/edit/:id"
   → create: "/posts/create"
           ↓
3. Select action route
   → action = "show"
   → route = "/posts/show/:id"
           ↓
4. Compose route with params
   → Replace :id with 123
   → Result: "/posts/show/123"
           ↓
Output: "/posts/show/123" ✅

Use case:
const getToPath = useGetToPath();
const path = getToPath({
  resource: postsResource,
  action: "show",
  meta: { id: 123 }
});
// path = "/posts/show/123"
navigate(path);
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-get-to-path/index.ts: 64 dòng** - Path generator factory!

---

### 2.1 Factory Pattern - Path Generator Function

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Address Label Maker

```
Label Making Machine (Factory):

Input: Name, street, city, zip
Output: Formatted address label

Machine doesn't print immediately
It gives you a "label maker function"
You call that function when needed

useGetToPath:

Hook → Returns path generator function
Input: resource, action, meta
Output: Path string

Hook doesn't generate paths immediately
It gives you a "getToPath function"
You call that function when needed
```

**Factory Pattern** = Return function that creates things (instead of creating directly).

#### Implementation:

```typescript
// HOOK RETURNS FACTORY:
export const useGetToPath = (): GetToPathFn => {
  // ... setup

  const fn = React.useCallback(
    ({ resource, action, meta }) => {
      // Path generation logic
      return "/posts/show/123";
    },
    [resources, resourceFromRoute, parsed],
  );

  return fn; // ← Return function (not path)
};

// USAGE (Call factory):
const getToPath = useGetToPath(); // Get factory

const path1 = getToPath({ resource, action: "show", meta: { id: 1 } });
const path2 = getToPath({ resource, action: "edit", meta: { id: 2 } });
const path3 = getToPath({ resource, action: "create" });

// One factory, many paths! ✅
```

#### Why Factory Instead of Direct Return?

```typescript
// ❌ DIRECT (Limited):
const path = useGetPath({ resource, action, meta });
// Only one path!
// Need to call hook again for different path ❌

// ✅ FACTORY (Flexible):
const getToPath = useGetToPath();
const path1 = getToPath({ resource, action: "show", meta: { id: 1 } });
const path2 = getToPath({ resource, action: "edit", meta: { id: 2 } });
// One hook call, generate many paths! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reusable** - Call function many times
- ✅ **Efficient** - Hook called once, function called many times
- ✅ **Flexible** - Generate any path on demand
- ✅ **Performance** - Function is memoized (useCallback)

---

### 2.2 Builder Pattern - Route Composition

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Building a House Address

```
Address Building:

Base: "123 Main Street"
+ City: "New York"
+ State: "NY"
+ Zip: "10001"
= "123 Main Street, New York, NY 10001"

Route Building:

Base route: "/posts/show/:id"
+ Resource meta: parent="/categories/:categoryId"
+ Parsed params: categoryId=5
+ Path meta: id=123
= "/categories/5/posts/show/123"
```

**Builder Pattern** = Construct complex object step by step.

#### Implementation:

```typescript
const composed = composeRoute(
  actionRoute, // Base: "/posts/show/:id"
  selectedResource?.meta, // Resource meta (parent routes)
  parsed, // Current route params
  meta, // Additional params
);

// composeRoute builds path step by step:
// 1. Start with base route
// 2. Add parent routes (if nested)
// 3. Replace params with values
// 4. Return final path
```

#### Route Composition Examples:

```typescript
// EXAMPLE 1: Simple route
actionRoute = "/posts/show/:id"
meta = { id: 123 }
→ Result: "/posts/show/123"

// EXAMPLE 2: Nested route
resource.meta = { parent: { resource: "categories", id: 5 } }
actionRoute = "/posts/show/:id"
meta = { id: 123 }
→ Result: "/categories/5/posts/show/123"

// EXAMPLE 3: Multiple params
actionRoute = "/posts/:year/:month/:id"
meta = { year: 2024, month: 11, id: 123 }
→ Result: "/posts/2024/11/123"
```

#### Step-by-Step Building:

```typescript
// STEP 1: Get base route
const actionRoute = "/posts/show/:id";

// STEP 2: Get parent route (if nested)
const parentRoute = resource?.meta?.parent ? "/categories/:categoryId" : "";

// STEP 3: Combine routes
const fullRoute = parentRoute + actionRoute;
// → "/categories/:categoryId/posts/show/:id"

// STEP 4: Replace params
const withCategory = fullRoute.replace(":categoryId", "5");
const withId = withCategory.replace(":id", "123");
// → "/categories/5/posts/show/123"
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexible** - Handle simple and complex routes
- ✅ **Composable** - Combine multiple route parts
- ✅ **Nested routes** - Support parent-child relationships
- ✅ **Dynamic** - Params filled at runtime

---

### 2.3 Strategy Pattern - Action-Based Routing

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Different Delivery Methods

```
Package Delivery:

Strategy by size:
- Small: Mail slot
- Medium: Doorstep
- Large: Signature required

Each strategy = different process

Route by Action:

Strategy by action:
- list: "/posts"
- show: "/posts/show/:id"
- edit: "/posts/edit/:id"
- create: "/posts/create"

Each strategy = different route
```

**Strategy Pattern** = Select algorithm (route) based on context (action).

#### Implementation:

```typescript
// GET ALL ACTION ROUTES:
const actionRoutes = getActionRoutesFromResource(resource, resources);

// Returns:
// [
//   { action: "list", route: "/posts" },
//   { action: "show", route: "/posts/show/:id" },
//   { action: "edit", route: "/posts/edit/:id" },
//   { action: "create", route: "/posts/create" }
// ]

// SELECT STRATEGY (route for action):
const actionRoute = actionRoutes.find((item) => item.action === action)?.route;

// If action = "show" → route = "/posts/show/:id" ✅
```

#### Action Strategies:

```typescript
// STRATEGY 1: List (no ID needed)
action: "list"
route: "/posts"
params: none
→ Result: "/posts"

// STRATEGY 2: Show (ID required)
action: "show"
route: "/posts/show/:id"
params: { id: 123 }
→ Result: "/posts/show/123"

// STRATEGY 3: Edit (ID required)
action: "edit"
route: "/posts/edit/:id"
params: { id: 123 }
→ Result: "/posts/edit/123"

// STRATEGY 4: Create (no ID needed)
action: "create"
route: "/posts/create"
params: none
→ Result: "/posts/create"
```

#### Dynamic Strategy Selection:

```tsx
function NavigationButtons() {
  const getToPath = useGetToPath();
  const resource = postsResource;

  // Different strategies for different actions:
  const listPath = getToPath({ resource, action: "list" });
  const showPath = getToPath({ resource, action: "show", meta: { id: 1 } });
  const editPath = getToPath({ resource, action: "edit", meta: { id: 1 } });
  const createPath = getToPath({ resource, action: "create" });

  // Same function, different strategies! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexible** - Different routes for different actions
- ✅ **Consistent** - Same API for all actions
- ✅ **Extensible** - Easy to add new actions
- ✅ **Type-safe** - Action type constrains route

---

### 2.4 Null Safety Pattern - Graceful Degradation

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: GPS Navigation

```
GPS System:

Destination found: Show route
Destination not found: "No route available"
Don't crash car!

useGetToPath:

Resource found: Return path
Resource not found: Return undefined
Don't crash app!
```

**Null Safety** = Handle missing data gracefully without errors.

#### Implementation:

```typescript
const fn = React.useCallback(
  ({ resource, action, meta }) => {
    const selectedResource = resource || resourceFromRoute;

    // SAFETY CHECK 1: Resource exists?
    if (!selectedResource) {
      return undefined; // ← Safe return
    }

    const actionRoutes = getActionRoutesFromResource(
      selectedResource,
      resources,
    );

    const actionRoute = actionRoutes.find(
      (item) => item.action === action,
    )?.route;

    // SAFETY CHECK 2: Action route exists?
    if (!actionRoute) {
      return undefined; // ← Safe return
    }

    const composed = composeRoute(
      actionRoute,
      selectedResource?.meta,
      parsed,
      meta,
    );

    return composed; // ← Success
  },
  [resources, resourceFromRoute, parsed],
);
```

#### Safety Checks:

```typescript
// CHECK 1: Resource exists?
const selectedResource = resource || resourceFromRoute;
if (!selectedResource) {
  return undefined;  // No resource → no path
}

// CHECK 2: Action route defined?
const actionRoute = actionRoutes.find(...)?.route;
if (!actionRoute) {
  return undefined;  // Action not supported → no path
}

// Both checks passed → safe to compose route
```

#### Graceful Failures:

```typescript
// SCENARIO 1: Resource not found
const path = getToPath({
  resource: undefined, // ❌ Missing
  action: "show",
});
// → undefined (not error!) ✅

// SCENARIO 2: Action not defined
const path = getToPath({
  resource: postsResource,
  action: "archive", // ❌ Not defined
});
// → undefined (not error!) ✅

// SCENARIO 3: Valid request
const path = getToPath({
  resource: postsResource,
  action: "show",
  meta: { id: 123 },
});
// → "/posts/show/123" ✅
```

#### Using Undefined Return:

```tsx
function NavigateButton() {
  const getToPath = useGetToPath();
  const navigate = useNavigate();

  const handleClick = () => {
    const path = getToPath({ resource, action: "show", meta: { id: 1 } });

    if (path) {
      navigate(path); // Only navigate if path exists ✅
    } else {
      console.warn("Path not available"); // Handle gracefully
    }
  };
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Robust** - Doesn't crash on missing data
- ✅ **Predictable** - Consistent return type (string | undefined)
- ✅ **Testable** - Easy to test error cases
- ✅ **Developer-friendly** - Clear undefined indicates problem

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường | Giải quyết vấn đề gì         | Trong useGetToPath                          |
| --------------- | ---------------- | ---------------------------- | ------------------------------------------- |
| **Factory**     | Label maker      | Return creator, not creation | Returns path generator function             |
| **Builder**     | Building address | Construct complex object     | Compose routes with params step-by-step     |
| **Strategy**    | Delivery methods | Choose algorithm by context  | Different routes for different actions      |
| **Null Safety** | GPS fallback     | Handle missing data          | Return undefined if resource/action missing |

---

## 3. KEY FEATURES

### 3.1 Return Value - Path Generator Function

```typescript
type GetToPathFn = (params: {
  resource?: IResourceItem;
  action: Action; // "list" | "show" | "edit" | "create"
  meta?: Record<string, unknown>;
}) => string | undefined;

const getToPath = useGetToPath();
// Type: GetToPathFn
```

### 3.2 Resource Resolution

```typescript
// EXPLICIT: Pass resource
getToPath({ resource: postsResource, action: "show" });

// IMPLICIT: Use current route's resource
getToPath({ action: "show" }); // Uses resourceFromRoute
```

### 3.3 Action Support

```typescript
// Supported actions:
action: "list"; // → "/posts"
action: "show"; // → "/posts/show/:id"
action: "edit"; // → "/posts/edit/:id"
action: "create"; // → "/posts/create"
```

### 3.4 Meta Parameters

```typescript
// Simple ID:
meta: { id: 123 }
→ "/posts/show/123"

// Multiple params:
meta: { year: 2024, month: 11, id: 123 }
→ "/posts/2024/11/123"

// Nested routes:
meta: { categoryId: 5, id: 123 }
→ "/categories/5/posts/show/123"
```

---

## 4. COMMON USE CASES

### 4.1 Generate Navigation Links

```tsx
import { useGetToPath } from "@refinedev/core";

function PostActions({ id }) {
  const getToPath = useGetToPath();
  const resource = postsResource;

  const showPath = getToPath({ resource, action: "show", meta: { id } });
  const editPath = getToPath({ resource, action: "edit", meta: { id } });

  return (
    <div>
      <Link to={showPath}>View</Link>
      <Link to={editPath}>Edit</Link>
    </div>
  );
}
```

### 4.2 Breadcrumb Generation

```tsx
function Breadcrumb() {
  const getToPath = useGetToPath();
  const { resource } = useResource();

  const listPath = getToPath({ resource, action: "list" });

  return (
    <nav>
      <Link to="/">Home</Link>→<Link to={listPath}>{resource.name}</Link>
    </nav>
  );
}
```

### 4.3 Programmatic Navigation

```tsx
function CreateButton() {
  const getToPath = useGetToPath();
  const navigate = useNavigate();
  const { resource } = useResource();

  const handleClick = () => {
    const path = getToPath({ resource, action: "create" });
    if (path) {
      navigate(path);
    }
  };

  return <button onClick={handleClick}>Create New</button>;
}
```

### 4.4 Conditional Links

```tsx
function PostList({ posts }) {
  const getToPath = useGetToPath();
  const resource = postsResource;

  return posts.map((post) => {
    const canEdit = post.status === "draft";
    const editPath = canEdit
      ? getToPath({ resource, action: "edit", meta: { id: post.id } })
      : undefined;

    return (
      <div key={post.id}>
        <h3>{post.title}</h3>
        {editPath && <Link to={editPath}>Edit</Link>}
      </div>
    );
  });
}
```

### 4.5 Nested Resource Navigation

```tsx
function CommentActions({ categoryId, postId, commentId }) {
  const getToPath = useGetToPath();
  const resource = commentsResource;

  const showPath = getToPath({
    resource,
    action: "show",
    meta: {
      categoryId, // Parent 1
      postId, // Parent 2
      id: commentId, // Current resource
    },
  });

  // → "/categories/1/posts/2/comments/show/3"
}
```

### 4.6 Safe Path Generation

```tsx
function DynamicLink({ resourceName, action, id }) {
  const getToPath = useGetToPath();
  const { resources } = useResourceParams();

  const resource = resources.find((r) => r.name === resourceName);
  const path = getToPath({
    resource,
    action,
    meta: id ? { id } : undefined,
  });

  // Safe: path is undefined if resource not found
  return path ? <Link to={path}>Go</Link> : <span>Not available</span>;
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Return Function Instead of Path?

**Answer:** Flexibility and reusability

```typescript
// ❌ ALTERNATIVE: Return path directly
const path = useGetPath({ resource, action, meta });
// Need separate hook call for each path ❌
// Can't reuse ❌

// ✅ CURRENT: Return function
const getToPath = useGetToPath();
const path1 = getToPath({ resource, action: "show", meta: { id: 1 } });
const path2 = getToPath({ resource, action: "edit", meta: { id: 2 } });
// One hook, many paths ✅
// Reusable ✅
```

### 5.2 Why useCallback?

**Answer:** Stable reference for dependency arrays

```typescript
const fn = React.useCallback(
  ({ resource, action, meta }) => { ... },
  [resources, resourceFromRoute, parsed]
);

// Dependency array usage:
useEffect(() => {
  const path = getToPath({ ... });
  // ...
}, [getToPath]);  // ← Stable reference! Won't cause infinite loop
```

### 5.3 Why Allow Undefined Resource?

**Answer:** Convenience - use current route's resource

```typescript
// ON /posts/show/123 PAGE:

// EXPLICIT (verbose):
const path = getToPath({
  resource: postsResource, // Must specify
  action: "edit",
});

// IMPLICIT (convenient):
const path = getToPath({
  action: "edit", // Uses current route's resource
});
// → "/posts/edit/123"
```

### 5.4 Why Return undefined Instead of Throwing Error?

**Answer:** Graceful degradation

```typescript
// ❌ THROWING:
const path = getToPath({ resource: undefined, action: "show" });
// → Error! Crashes app! ❌

// ✅ RETURNING UNDEFINED:
const path = getToPath({ resource: undefined, action: "show" });
// → undefined
if (path) navigate(path); // Safe check ✅
```

---

## 6. HELPER FUNCTIONS

### 6.1 getActionRoutesFromResource

```typescript
// Gets all action routes for a resource
const actionRoutes = getActionRoutesFromResource(resource, resources);

// Returns:
// [
//   { action: "list", route: "/posts" },
//   { action: "show", route: "/posts/show/:id" },
//   { action: "edit", route: "/posts/edit/:id" },
//   { action: "create", route: "/posts/create" }
// ]
```

### 6.2 composeRoute

```typescript
// Composes route with parameters
const path = composeRoute(
  actionRoute, // "/posts/show/:id"
  resourceMeta, // { parent: {...} }
  parsedParams, // Current route params
  meta, // { id: 123 }
);

// Returns: "/posts/show/123"
```

---

## 7. COMMON PITFALLS

### 7.1 Not Checking for Undefined

```typescript
// ❌ WRONG - Might be undefined
const path = getToPath({ resource, action: "show" });
navigate(path);  // Error if undefined! ❌

// ✅ CORRECT - Check first
const path = getToPath({ resource, action: "show" });
if (path) {
  navigate(path); ✅
}
```

### 7.2 Missing Required Params

```typescript
// ❌ WRONG - Show needs ID
const path = getToPath({
  resource,
  action: "show"
  // Missing meta.id! ❌
});
// → "/posts/show/:id" (params not replaced!)

// ✅ CORRECT - Provide ID
const path = getToPath({
  resource,
  action: "show",
  meta: { id: 123 } ✅
});
// → "/posts/show/123"
```

### 7.3 Using Wrong Action

```typescript
// ❌ WRONG - Typo in action
const path = getToPath({
  resource,
  action: "view"  // ❌ Not "show"
});
// → undefined (action not found)

// ✅ CORRECT - Use correct action
const path = getToPath({
  resource,
  action: "show"  ✅
});
```

### 7.4 Not Memoizing in Loops

```typescript
// ❌ WRONG - Creates new function every render
function PostList({ posts }) {
  return posts.map(post => {
    const getToPath = useGetToPath();  // ❌ In loop!
    const path = getToPath({ ... });
    return <Link to={path}>{post.title}</Link>;
  });
}

// ✅ CORRECT - Call hook once
function PostList({ posts }) {
  const getToPath = useGetToPath();  ✅

  return posts.map(post => {
    const path = getToPath({ ... });
    return <Link to={path}>{post.title}</Link>;
  });
}
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useGetToPath } from "@refinedev/core";

describe("useGetToPath", () => {
  it("should generate path for action", () => {
    const { result } = renderHook(() => useGetToPath(), {
      wrapper: TestWrapper,
    });

    const path = result.current({
      resource: postsResource,
      action: "show",
      meta: { id: 123 },
    });

    expect(path).toBe("/posts/show/123");
  });

  it("should return undefined for missing resource", () => {
    const { result } = renderHook(() => useGetToPath(), {
      wrapper: TestWrapper,
    });

    const path = result.current({
      resource: undefined,
      action: "show",
    });

    expect(path).toBeUndefined();
  });

  it("should return undefined for unsupported action", () => {
    const { result } = renderHook(() => useGetToPath(), {
      wrapper: TestWrapper,
    });

    const path = result.current({
      resource: postsResource,
      action: "archive", // Not supported
    });

    expect(path).toBeUndefined();
  });

  it("should handle nested routes", () => {
    const { result } = renderHook(() => useGetToPath(), {
      wrapper: TestWrapper,
    });

    const path = result.current({
      resource: commentsResource,
      action: "show",
      meta: {
        categoryId: 1,
        postId: 2,
        id: 3,
      },
    });

    expect(path).toBe("/categories/1/posts/2/comments/show/3");
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Factory**: Returns path generator function
- ✅ **Builder**: Compose routes with parameters
- ✅ **Strategy**: Different routes for different actions
- ✅ **Null Safety**: Undefined for missing resource/action

### Key Features

1. **Path Generator** - Returns function, not path
2. **Action-Based** - Different routes for list/show/edit/create
3. **Nested Support** - Handle parent-child resources
4. **Safe** - Returns undefined gracefully
5. **Memoized** - useCallback for stable reference

### Khi nào dùng useGetToPath?

✅ **Nên dùng:**

- Generate navigation links programmatically
- Build breadcrumbs
- Create dynamic navigation
- Check if action path exists

❌ **Không dùng:**

- Direct navigation → Use `useGo()` or `useNavigation()`
- Just need current path → Use `useParsed()`
- Static links → Use hardcoded paths

### Path Generation Flow

```
Resource + Action + Meta
    ↓
Get action routes
    ↓
Find route for action
    ↓
Compose with params
    ↓
Return path string (or undefined)
```

### Remember

✅ **64 lines** - Path generator factory
🏭 **Factory Pattern** - Returns function
🏗️ **Builder Pattern** - Compose routes
🎯 **Strategy Pattern** - Action-based routing
🛡️ **Null Safety** - Undefined returns

---

> 📚 **Best Practice**: **Call hook once** outside loops/conditions. **Check for undefined** before using path. **Provide all required params** (especially ID for show/edit). Use **implicit resource** for convenience on detail pages. This hook is **foundation** for navigation - many other hooks use it internally!
