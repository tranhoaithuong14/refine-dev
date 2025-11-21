# Kiến trúc và Design Patterns của useNavigation Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              ROUTING/NAVIGATION SYSTEM            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  Low-Level Router Hooks:                         │  │
│  │    - useGo() → Navigate to path                  │  │
│  │    - useParsed() → Parse current URL             │  │
│  │                                                   │  │
│  │  useNavigation ✅ (THIS HOOK - HIGH-LEVEL)       │  │
│  │    → Resource-aware navigation                   │  │
│  │         │                                         │  │
│  │         ├──→ CRUD ACTIONS (Command Pattern):     │  │
│  │         │     - create() → /posts/create         │  │
│  │         │     - edit(id) → /posts/edit/:id       │  │
│  │         │     - show(id) → /posts/show/:id       │  │
│  │         │     - clone(id) → /posts/clone/:id     │  │
│  │         │     - list() → /posts                  │  │
│  │         │                                         │  │
│  │         ├──→ URL GENERATION (Facade Pattern):    │  │
│  │         │     - createUrl() → Get URL string     │  │
│  │         │     - editUrl(id) → Get URL string     │  │
│  │         │     - ... (paired with actions)        │  │
│  │         │                                         │  │
│  │         └──→ ROUTE COMPOSITION (Builder):        │  │
│  │               - composeRoute() builds full path  │  │
│  │               - Handles params, meta, queries    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide resource-aware navigation commands for CRUD operations**

### 1.2 Complete Flow - Navigation Action

```
┌──────────────────────────────────────────────────────────────┐
│              USER CODE: Navigate to Edit Page                │
└──────────────────────────────────────────────────────────────┘

const { edit } = useNavigation();

edit("posts", 123);  // ← Simple call!

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│         STEP 1: Resolve Resource (pickResource)              │
└──────────────────────────────────────────────────────────────┘

"posts" → Find resource config in resources array
→ { name: "posts", edit: "/posts/edit/:id" }

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│       STEP 2: Get Action Route (getActionRoutesFromResource) │
└──────────────────────────────────────────────────────────────┘

Find "edit" action:
→ { action: "edit", route: "/posts/edit/:id" }

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│         STEP 3: Compose Route (composeRoute)                  │
└──────────────────────────────────────────────────────────────┘

Template: "/posts/edit/:id"
Params: { id: 123 }
→ "/posts/edit/123"

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│            STEP 4: Navigate (go)                              │
└──────────────────────────────────────────────────────────────┘

go({ to: "/posts/edit/123", type: "push" })
→ Browser navigates! ✅
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useNavigation/index.ts: 224 dòng** - High-level navigation!

---

### 2.1 Command Pattern - CRUD Navigation Actions

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: Game Controller

```
Game Controller:

Buttons (Commands):
- A button → Jump
- B button → Attack
- X button → Use item
- Y button → Open menu

Each button:
- Encapsulates complex action
- Simple interface
- Reusable

useNavigation:
- create() → Navigate to create page
- edit(id) → Navigate to edit page
- show(id) → Navigate to show page
- list() → Navigate to list page

Each command:
- Encapsulates routing logic
- Simple interface: navigation.edit("posts", 123)
- Reusable across app
```

**Command Pattern** = Encapsulate request as an object. Decouple invoker from receiver.

#### Implementation:

```typescript
// COMMANDS: Navigation actions
const edit = (
  resource: string | IResourceItem,
  id: BaseKey,
  type: HistoryType = "push",
  meta: MetaQuery = {},
) => {
  // Complex logic hidden inside:
  // 1. Resolve resource
  // 2. Get route template
  // 3. Compose URL
  // 4. Navigate
  handleUrl(editUrl(resource, id, meta), type);
};

// Simple usage:
navigation.edit("posts", 123); // ✅ Clean!
// vs manually:
// const resource = pickResource("posts", resources);
// const route = getActionRoutesFromResource(resource).find(r => r.action === "edit");
// go({ to: composeRoute(route, ...), type: "push" });  ❌ Complex!
```

#### All Commands:

```typescript
return {
  // NAVIGATE to pages (executes navigation)
  create, // → /posts/create
  edit, // → /posts/edit/:id
  show, // → /posts/show/:id
  clone, // → /posts/clone/:id
  list, // → /posts

  // GET URLs (returns path string)
  createUrl,
  editUrl,
  showUrl,
  cloneUrl,
  listUrl,
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simple** - One function call vs multiple steps
- ✅ **Consistent** - Same pattern for all CRUD actions
- ✅ **Type-safe** - Resource and ID validation
- ✅ **Reusable** - Same commands everywhere

---

### 2.2 Facade Pattern - Simplified Routing Interface

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Hotel Concierge

```
Without Concierge (Complex):
→ Call taxi company
→ Call restaurant for reservation
→ Call tour operator
→ Handle 3 different services!

With Concierge (Facade):
→ Tell concierge: "I need taxi, dinner, and tour"
→ Concierge handles all 3 services
→ Simple interface! ✅

useNavigation (Facade):
Internal complexity:
- pickResource()
- getActionRoutesFromResource()
- composeRoute()
- go()

External interface:
- navigation.edit("posts", 123)  ← Simple!
```

**Facade Pattern** = Provide simplified interface to complex subsystem.

#### Implementation:

```typescript
// INTERNAL COMPLEXITY (Hidden from user):
const editUrl = (resource, id, meta) => {
  // 1. Resolve resource
  const resourceItem =
    typeof resource === "string"
      ? pickResource(resource, resources) ?? { name: resource }
      : resource;

  // 2. Get route template
  const editActionRoute = getActionRoutesFromResource(
    resourceItem,
    resources,
  ).find((r) => r.action === "edit")?.route;

  // 3. Encode ID
  const encodedId = encodeURIComponent(id);

  // 4. Compose route
  return go({
    to: composeRoute(editActionRoute, resourceItem?.meta, parsed, {
      ...meta,
      id: encodedId,
    }),
    type: "path",
    query: meta.query,
  }) as string;
};

// EXTERNAL INTERFACE (Simple!):
const { edit } = useNavigation();
edit("posts", 123); // ✅ Just works!
```

#### Facade Benefits:

```typescript
// ❌ WITHOUT useNavigation (Manual routing):
import { useGo, useParsed, useResourceParams } from "@refinedev/core";

function MyComponent() {
  const go = useGo();
  const parsed = useParsed();
  const { resources } = useResourceParams();

  const handleEdit = (id) => {
    const resource = pickResource("posts", resources);
    const routes = getActionRoutesFromResource(resource, resources);
    const editRoute = routes.find((r) => r.action === "edit")?.route;
    const path = composeRoute(editRoute, resource.meta, parsed, { id });
    go({ to: path, type: "push" });
  };

  return <Button onClick={() => handleEdit(123)}>Edit</Button>;
}

// ✅ WITH useNavigation (Facade):
function MyComponent() {
  const { edit } = useNavigation();

  return <Button onClick={() => edit("posts", 123)}>Edit</Button>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Abstraction** - Hide complex routing logic
- ✅ **DX** - Developer experience improved
- ✅ **Maintainable** - Changes in routing don't break user code
- ✅ **Testable** - Easy to mock navigation

---

### 2.3 Template Method Pattern - URL Generation

#### 📋 VÍ DỤ ĐỜI THƯỜNG: Form Letter Template

```
Template:
"Dear [NAME],
You have won [AMOUNT]!
Sincerely, [SENDER]"

Process:
1. Start with template
2. Replace [NAME]
3. Replace [AMOUNT]
4. Replace [SENDER]
5. Return filled letter

URL Generation:
Template: "/posts/edit/:id"

Process:
1. Start with template
2. Replace :id → 123
3. Add query params
4. Add meta params
5. Return: "/posts/edit/123?tab=details"
```

**Template Method Pattern** = Define skeleton of algorithm. Let subclasses override specific steps.

#### Implementation:

```typescript
// TEMPLATE: Standard flow for all URL generation
const editUrl = (resource, id, meta) => {
  // STEP 1: Resolve resource (same for all)
  const resourceItem = /* ... */;

  // STEP 2: Get route template (action-specific)
  const editActionRoute = getActionRoutesFromResource(
    resourceItem,
    resources
  ).find(r => r.action === "edit")?.route;  // ← "edit" varies!

  // STEP 3: Safety check (same for all)
  if (!editActionRoute) return "";

  // STEP 4: Encode ID (action-specific)
  const encodedId = encodeURIComponent(id);  // ← Only for edit/show/clone

  // STEP 5: Compose route (same for all)
  return go({
    to: composeRoute(editActionRoute, resourceItem?.meta, parsed, {
      ...meta,
      id: encodedId  // ← Param varies by action
    }),
    type: "path",
    query: meta.query
  }) as string;
};

// Same template for:
// - createUrl (no ID)
// - editUrl (with ID)
// - showUrl (with ID)
// - cloneUrl (with ID)
// - listUrl (no ID)
```

#### Visualization - Template Variations:

```typescript
// createUrl: No ID needed
Template: "/posts/create";
Params: {
}
Result: "/posts/create";

// editUrl: ID required
Template: "/posts/edit/:id";
Params: {
  id: 123;
}
Result: "/posts/edit/123";

// showUrl: ID required
Template: "/posts/show/:id";
Params: {
  id: 123;
}
Result: "/posts/show/123";

// listUrl: No ID, but filters via query
Template: "/posts";
Params: {
}
Query: {
  status: "published";
}
Result: "/posts?status=published";
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - Same process for all actions
- ✅ **DRY** - Don't repeat yourself
- ✅ **Extensible** - Easy to add new actions
- ✅ **Maintainable** - Change template logic once

---

### 2.4 Builder Pattern - Route Composition

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Building a Sandwich

```
Sandwich Builder:

Step 1: Start with bread
Step 2: Add protein (ham/turkey/tuna)
Step 3: Add cheese
Step 4: Add vegetables
Step 5: Add condiments
Result: Complete sandwich!

composeRoute (Builder):

Step 1: Start with template "/posts/edit/:id"
Step 2: Replace params { id: 123 } → "/posts/edit/123"
Step 3: Add meta params
Step 4: Add query params
Step 5: Encode special characters
Result: "/posts/edit/123?tab=details&user=john"
```

**Builder Pattern** = Construct complex object step by step.

#### Implementation (Conceptual):

```typescript
// composeRoute (internal helper):
const composeRoute = (
  template: string, // "/posts/edit/:id"
  resourceMeta: any,
  parsed: any,
  meta: MetaQuery, // { id: 123, query: { tab: "details" } }
) => {
  // STEP 1: Start with template
  let path = template; // "/posts/edit/:id"

  // STEP 2: Replace params
  Object.entries(meta).forEach(([key, value]) => {
    if (key !== "query") {
      path = path.replace(`:${key}`, value);
    }
  });
  // → "/posts/edit/123"

  // STEP 3: Add query params
  if (meta.query) {
    const queryString = new URLSearchParams(meta.query).toString();
    path += `?${queryString}`;
  }
  // → "/posts/edit/123?tab=details"

  // STEP 4: Encode
  // (handled by encodeURIComponent earlier)

  return path;
};
```

#### Real Example - Complex Route:

```typescript
const { editUrl } = useNavigation();

const url = editUrl("posts", 123, {
  query: {
    tab: "details",
    mode: "advanced",
  },
});

// Internal build process:
// Template: "/posts/edit/:id"
// + Replace :id with 123 → "/posts/edit/123"
// + Add query params → "/posts/edit/123?tab=details&mode=advanced"
// Result: "/posts/edit/123?tab=details&mode=advanced" ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexible** - Handle params, queries, meta
- ✅ **Safe** - Encoding prevents injection
- ✅ **Composable** - Build URLs step by step
- ✅ **Readable** - Clear construction process

---

### 2.5 Strategy Pattern - History Type (push vs replace)

#### 🔄 VÍ DỤ ĐỜI THƯỜNG: Browser Back Button

```
History Type:

Push (Default):
- Page A
- Page B (push)
- Page C (push)
Back button: C → B → A ✅

Replace:
- Page A
- Page B (replace A)
- Page C (push)
Back button: C → [B directly, A is gone!] ✅

useNavigation:
edit("posts", 123, "push");     // Add to history
edit("posts", 123, "replace");  // Replace current
```

**Strategy Pattern** = Select algorithm at runtime.

#### Implementation:

```typescript
export type HistoryType = "push" | "replace";

const edit = (
  resource: string | IResourceItem,
  id: BaseKey,
  type: HistoryType = "push", // ← Strategy selection!
  meta: MetaQuery = {},
) => {
  handleUrl(editUrl(resource, id, meta), type);
};

// handleUrl applies strategy:
const handleUrl = (url: string, type: HistoryType = "push") => {
  go({ to: url, type }); // ← "push" or "replace"
};
```

#### Use Cases:

```typescript
// PUSH: User navigates normally (default)
navigation.edit("posts", 123, "push");
// History: /posts → /posts/edit/123
// Back button works! ✅

// REPLACE: Redirect after login (no back to login page)
navigation.list("dashboard", "replace");
// History: /login is REPLACED by /dashboard
// Back button skips login page! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **UX** - Control back button behavior
- ✅ **Flexible** - Choose strategy per navigation
- ✅ **Default** - Sensible default (push)
- ✅ **Explicit** - Clear intent

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern             | Ví dụ đời thường | Giải quyết vấn đề gì        | Trong useNavigation                       |
| ------------------- | ---------------- | --------------------------- | ----------------------------------------- |
| **Command**         | Game controller  | Encapsulate actions         | create(), edit(), show(), clone(), list() |
| **Facade**          | Hotel concierge  | Simplify complex subsystem  | Hide routing complexity behind simple API |
| **Template Method** | Form letter      | Define skeleton algorithm   | URL generation pattern for all actions    |
| **Builder**         | Sandwich maker   | Construct step-by-step      | composeRoute() builds URLs                |
| **Strategy**        | Payment method   | Select algorithm at runtime | push vs replace history type              |

---

## 3. KEY FEATURES

### 3.1 Action + URL Pairs

```typescript
const navigation = useNavigation();

// Navigate (executes)
navigation.edit("posts", 123);

// Get URL (returns string)
const url = navigation.editUrl("posts", 123);
// → "/posts/edit/123"

// Use URL in Link:
<Link to={url}>Edit Post</Link>;
```

### 3.2 Resource Flexibility

```typescript
// String resource name:
navigation.edit("posts", 123);

// Resource object:
const resource = { name: "posts", edit: "/blog/:id/edit" };
navigation.edit(resource, 123);
```

### 3.3 Meta & Query Support

```typescript
navigation.edit("posts", 123, "push", {
  query: {
    tab: "comments",
    page: 2,
  },
});
// → /posts/edit/123?tab=comments&page=2
```

### 3.4 ID Encoding

```typescript
// Special characters are encoded:
navigation.show("posts", "hello world");
// → /posts/show/hello%20world ✅

navigation.edit("posts", "user@email.com");
// → /posts/edit/user%40email.com ✅
```

---

## 4. COMMON USE CASES

### 4.1 Table Actions

```tsx
import { useNavigation } from "@refinedev/core";

function PostsTable() {
  const { edit, show } = useNavigation();

  return (
    <Table>
      <Column
        title="Actions"
        render={(_, record) => (
          <>
            <Button onClick={() => show("posts", record.id)}>View</Button>
            <Button onClick={() => edit("posts", record.id)}>Edit</Button>
          </>
        )}
      />
    </Table>
  );
}
```

### 4.2 Breadcrumbs with URLs

```tsx
function Breadcrumb() {
  const { listUrl, showUrl } = useNavigation();
  const { id } = useParams();

  return (
    <div>
      <Link to={listUrl("posts")}>Posts</Link>
      {" / "}
      <Link to={showUrl("posts", id)}>Post #{id}</Link>
    </div>
  );
}
```

### 4.3 Redirect After Action

```tsx
function CreatePost() {
  const { list } = useNavigation();
  const { onFinish } = useForm();

  const handleSubmit = async (values) => {
    await onFinish(values);
    list("posts"); // Redirect to list after create ✅
  };
}
```

### 4.4 Replace History (Login Flow)

```tsx
function LoginPage() {
  const { list } = useNavigation();

  const handleLogin = async () => {
    await login();
    list("dashboard", "replace"); // ← Replace, not push!
    // Back button won't go back to login page ✅
  };
}
```

### 4.5 Clone with Pre-filled Data

```tsx
function PostsList() {
  const { clone } = useNavigation();

  return (
    <Button onClick={() => clone("posts", 123)}>Clone Post #123</Button>
    // → /posts/clone/123
    // → Form pre-fills with post #123 data ✅
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Separate Action and URL Functions?

**Answer:** Different use cases

```typescript
// CASE 1: Direct navigation (use action)
<Button onClick={() => navigation.edit("posts", 123)}>Edit</Button>;

// CASE 2: Get URL for Link (use URL function)
const url = navigation.editUrl("posts", 123);
<Link to={url}>Edit Post</Link>;

// CASE 3: Conditional navigation (use URL)
const url = user.canEdit
  ? navigation.editUrl("posts", 123)
  : navigation.showUrl("posts", 123);
```

### 5.2 Why Default to "push" History Type?

**Answer:** Most common and expected behavior

```typescript
// Most navigations should ADD to history:
navigation.list("posts"); // User expects back button to work
navigation.edit("posts", 123); // User expects back button to work

// Only use "replace" for specific cases:
// - Redirects after login
// - Replacing temporary pages
// - Cancel/abort flows
```

### 5.3 Why Encode IDs?

**Answer:** Safety and URL standards

```typescript
// Special characters break URLs:
navigation.show("users", "john@email.com");
// Without encoding: /users/show/john@email.com ❌ (@ breaks URL)
// With encoding: /users/show/john%40email.com ✅

// Spaces break URLs:
navigation.show("posts", "hello world");
// Without encoding: /posts/show/hello world ❌
// With encoding: /posts/show/hello%20world ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting to Handle Missing Routes

```typescript
// ❌ WRONG - Assumes edit route exists
const { edit } = useNavigation();
edit("posts", 123); // What if no edit route configured?

// ✅ BETTER - Check URL first
const { editUrl } = useNavigation();
const url = editUrl("posts", 123);
if (url) {
  // Navigate safely
} else {
  console.warn("No edit route for posts");
}
```

### 6.2 Using Raw URLs Instead of Navigation

```typescript
// ❌ WRONG - Hardcoded URLs
<Link to="/posts/edit/123">Edit</Link>;
// Breaks if route structure changes! ❌

// ✅ CORRECT - Use navigation
const { editUrl } = useNavigation();
<Link to={editUrl("posts", 123)}>Edit</Link>;
// Adapts to route changes! ✅
```

### 6.3 Not URL-Encoding IDs

```typescript
// ❌ WRONG - Manual URL building without encoding
const id = "user@email.com";
const url = `/users/show/${id}`; // ❌ Invalid URL!

// ✅ CORRECT - Let useNavigation handle encoding
const url = navigation.showUrl("users", id);
// → /users/show/user%40email.com ✅
```

---

## 7. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useNavigation } from "@refinedev/core";

describe("useNavigation", () => {
  it("should generate edit URL", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    const url = result.current.editUrl("posts", 123);
    expect(url).toBe("/posts/edit/123");
  });

  it("should encode special characters in ID", () => {
    const { result } = renderHook(() => useNavigation(), { wrapper });

    const url = result.current.showUrl("users", "john@email.com");
    expect(url).toContain("john%40email.com");
  });

  it("should navigate with push by default", () => {
    const mockGo = jest.fn();
    // Mock useGo...

    const { result } = renderHook(() => useNavigation(), { wrapper });
    result.current.edit("posts", 123);

    expect(mockGo).toHaveBeenCalledWith({
      to: expect.any(String),
      type: "push",
    });
  });
});
```

---

## 8. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: CRUD navigation actions (create, edit, show, clone, list)
- ✅ **Facade**: Simplified interface hiding routing complexity
- ✅ **Template Method**: Standard URL generation pattern
- ✅ **Builder**: Route composition with params/meta/query
- ✅ **Strategy**: push vs replace history type

### Key Features

1. **High-Level API** - Resource-aware navigation
2. **Action + URL Pairs** - Navigate or get URL string
3. **Encoding** - Safe ID handling
4. **Meta Support** - Query params, custom meta
5. **History Control** - push or replace

### Khi nào dùng useNavigation?

✅ **Nên dùng:**

- CRUD navigation (list, create, edit, show, clone)
- Table row actions
- Breadcrumbs with URLs
- Programmatic navigation

❌ **Không dùng:**

- Custom routes outside resources → Use `useGo`
- External links → Use `<a href>`
- Hash navigation → Use `useGo`

### Remember

✅ **224 lines** - High-level navigation facade
🎮 **Command Pattern** - CRUD actions
🏢 **Facade Pattern** - Simple interface
📋 **Template Method** - URL generation
🏗️ **Builder Pattern** - Route composition
🔄 **Strategy Pattern** - push/replace

---

> 📚 **Best Practice**: Always use **`useNavigation`** for resource CRUD navigation. Use **`editUrl/showUrl`** for \<Link\> components. Use **`edit/show`** for programmatic navigation. Set **`type="replace"`** only for redirects. Always let the hook **handle ID encoding**.
