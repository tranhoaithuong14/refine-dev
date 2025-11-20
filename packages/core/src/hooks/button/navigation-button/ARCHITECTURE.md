# Kiến trúc và Design Patterns của useNavigationButton Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        NAVIGATION BUTTON HOOKS SYSTEM            │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  useNavigationButton ✅ (THIS HOOK)              │  │
│  │    Used by:                                      │  │
│  │      - useEditButton                             │  │
│  │      - useShowButton                             │  │
│  │      - useCreateButton                           │  │
│  │      - useListButton                             │  │
│  │      - useCloneButton                            │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Combines:                                       │  │
│  │    - useNavigation (URL generation)              │  │
│  │    - useLink (Router Link component)             │  │
│  │    - useButtonCanAccess (permissions)            │  │
│  │    - useTranslate (i18n)                         │  │
│  │    - useResourceParams (resource resolution)     │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Returns:                                        │  │
│  │    - to: string (navigation URL)                 │  │
│  │    - label: string (button text)                 │  │
│  │    - disabled, hidden, title                     │  │
│  │    - LinkComponent (router-specific Link)        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có 1 mục đích rất rõ ràng:**

> **Provide all props needed for navigation buttons (Edit, Show, Create, List, Clone) with URL generation, permission checking, and localized labels**

### 1.2 Complete Navigation Button Flow

```
┌──────────────────────────────────────────────────────────────┐
│             NAVIGATION BUTTON COMPLETE FLOW                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component calls useNavigationButton                 │
│  const {                                                     │
│    to,                                                       │
│    label,                                                    │
│    disabled,                                                 │
│    hidden,                                                   │
│    LinkComponent                                             │
│  } = useNavigationButton({                                   │
│    action: "edit",                                           │
│    resource: "posts",                                        │
│    id: 123                                                   │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Resolve Resource & ID (useResourceParams)          │
│  resource: { name: "posts", ... }                           │
│  id: 123                                                     │
│  identifier: "posts"                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check Permissions (useButtonCanAccess)             │
│  Can user perform "edit" on "posts" #123?                   │
│                                                              │
│  YES → disabled = false, proceed                            │
│  NO → disabled = true or hidden = true                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Generate Navigation URL (useNavigation)            │
│  action: "edit" → navigation.editUrl("posts", 123)          │
│  → Result: "/posts/edit/123"                                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Generate Label (useTranslate)                      │
│  translate("buttons.edit", "Edit")                           │
│  → Result: "Edit" or "Chỉnh sửa" (Vietnamese)               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Get Router-Specific Link Component                 │
│  LinkComponent = useLink()                                   │
│  → React Router: <Link />                                   │
│  → Next.js: <NextLink />                                    │
│  → Remix: <RemixLink />                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Render Navigation Button                           │
│  if (hidden) return null;                                   │
│                                                              │
│  <LinkComponent to={to}>                                     │
│    <button disabled={disabled} title={title}>               │
│      {label}                                                 │
│    </button>                                                 │
│  </LinkComponent>                                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: User Clicks → Navigate to URL                      │
│  Router navigates to: /posts/edit/123                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này là 100 dòng** - Router-agnostic navigation!

---

### 2.1 Adapter Pattern - Pattern "Bộ Chuyển Đổi"

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Universal Charger (Sạc điện đa năng)

```
Universal Charger:

Different devices, different ports:
- iPhone: Lightning port
- Android: USB-C port
- Laptop: MagSafe port

❌ BAD - Need different chargers for each device

✅ GOOD - Universal charger with adapters:
Phone → [Lightning Adapter] → Universal Charger
Phone → [USB-C Adapter] → Universal Charger
Laptop → [MagSafe Adapter] → Universal Charger

Same charger, different adapters!
```

**Adapter Pattern** = Convert different router interfaces to unified interface

#### Implementation in useNavigationButton:

```typescript
// Different routers, different Link components:
// - React Router: <Link to="/path" />
// - Next.js: <Link href="/path" />
// - Remix: <Link to="/path" />

// useNavigationButton = Adapter
// Provides unified interface regardless of router

const Link = useLink(); // ← Returns router-specific Link
const LinkComponent = Link; // ← Expose as LinkComponent

const { to, label, LinkComponent } = useNavigationButton({
  action: "edit",
  resource: "posts",
  id: 123,
});

// Usage - Same code for ALL routers! ✅
<LinkComponent to={to}>
  <button>{label}</button>
</LinkComponent>;
```

#### ❌ KHÔNG có Adapter:

```tsx
// BAD - Must handle each router manually

// React Router version:
import { Link as ReactRouterLink } from "react-router-dom";
function EditButton() {
  return (
    <ReactRouterLink to="/posts/edit/123">
      <button>Edit</button>
    </ReactRouterLink>
  );
}

// Next.js version:
import NextLink from "next/link";
function EditButton() {
  return (
    <NextLink href="/posts/edit/123">
      <button>Edit</button>
    </NextLink>
  );
}

// Remix version:
import { Link as RemixLink } from "@remix-run/react";
function EditButton() {
  return (
    <RemixLink to="/posts/edit/123">
      <button>Edit</button>
    </RemixLink>
  );
}

// Problems:
// - Must maintain 3 versions! ❌
// - Can't switch routers easily
// - Hard to test
```

#### ✅ CÓ Adapter Pattern:

```tsx
// GOOD - One version for ALL routers!

function EditButton({ resource, id }) {
  const { to, label, LinkComponent } = useNavigationButton({
    action: "edit",
    resource,
    id,
  });

  return (
    <LinkComponent to={to}>
      <button>{label}</button>
    </LinkComponent>
  );
}

// Works with:
// - React Router ✅
// - Next.js ✅
// - Remix ✅
// - Custom router ✅

// Switch routers? Change routerProvider, button code stays same! ✅
```

#### Visual Representation:

```
┌─────────────────────────────────────────────────────┐
│              ADAPTER PATTERN FLOW                   │
└─────────────────────────────────────────────────────┘

Different Routers (Complex):
  - React Router <Link to="..." />
  - Next.js <Link href="..." />
  - Remix <Link to="..." />
                    │
                    ▼
        ┌───────────────────────┐
        │ useNavigationButton   │ ← ADAPTER
        │   (100 lines)         │
        └───────────────────────┘
                    │
                    ▼
Unified Interface (Simple):
  { to: string, LinkComponent: Component }
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Router-agnostic** - Works with any router
- ✅ **No duplication** - One button, all routers
- ✅ **Easy migration** - Switch routers without code changes
- ✅ **Testability** - Mock router easily

---

### 2.2 Strategy Pattern - Pattern "Chiến Lược Linh Hoạt"

#### 🗺️ VÍ DỤ ĐỜI THƯỜNG: Navigation Strategies

```
Google Maps:

Different destination types, different navigation:
- Restaurant: Show menu + reviews
- Gas station: Show fuel prices
- Hotel: Show rooms + booking
- Landmark: Show history + photos

Same map app, different strategies!
```

**Strategy Pattern** = Choose URL generation strategy based on action

#### Implementation:

```typescript
// From useNavigationButton (lines 67-77)

const to = React.useMemo(() => {
  if (!resource) return "";

  // STRATEGY SELECTION based on action:
  switch (props.action) {
    case "create":
    case "list":
      // STRATEGY 1: No ID needed (collection-level actions)
      return navigation[`${props.action}Url`](resource, props.meta);

    default:
      // STRATEGY 2: ID required (item-level actions)
      if (!id) return "";
      return navigation[`${props.action}Url`](resource, id, props.meta);
  }
}, [resource, id, props.meta, navigation[`${props.action}Url`]]);

// Result:
// action: "list" → /posts
// action: "create" → /posts/create
// action: "edit" → /posts/edit/123
// action: "show" → /posts/show/123
// action: "clone" → /posts/clone/123
```

#### Strategy Breakdown:

```typescript
// STRATEGY 1: Collection-level (no ID)
action: "list"
→ navigation.listUrl("posts")
→ Result: "/posts"

action: "create"
→ navigation.createUrl("posts")
→ Result: "/posts/create"

// STRATEGY 2: Item-level (requires ID)
action: "edit"
→ navigation.editUrl("posts", 123)
→ Result: "/posts/edit/123"

action: "show"
→ navigation.showUrl("posts", 123)
→ Result: "/posts/show/123"

action: "clone"
→ navigation.cloneUrl("posts", 123)
→ Result: "/posts/clone/123"
```

#### Real Examples:

```tsx
// Example 1: List Button (no ID)
const { to } = useNavigationButton({
  action: "list",
  resource: "posts",
});
// to = "/posts"

// Example 2: Create Button (no ID)
const { to } = useNavigationButton({
  action: "create",
  resource: "posts",
});
// to = "/posts/create"

// Example 3: Edit Button (requires ID)
const { to } = useNavigationButton({
  action: "edit",
  resource: "posts",
  id: 123,
});
// to = "/posts/edit/123"

// Example 4: Show Button (requires ID)
const { to } = useNavigationButton({
  action: "show",
  resource: "posts",
  id: 123,
});
// to = "/posts/show/123"

// Example 5: Clone Button (requires ID)
const { to } = useNavigationButton({
  action: "clone",
  resource: "posts",
  id: 123,
});
// to = "/posts/clone/123"
```

#### Special Case: Create Action ID Handling

```typescript
// From useNavigationButton (lines 52-55)

const { id, resource, identifier } = useResourceParams({
  resource: props.resource,
  id: props.action === "create" ? undefined : props.id,
  //   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //   Create action IGNORES id prop!
});

// Why?
// Create = Make NEW item (no existing ID)
// Even if ID accidentally provided, ignore it

// Example:
useNavigationButton({
  action: "create",
  resource: "posts",
  id: 999, // ← Ignored!
});
// to = "/posts/create" (not /posts/create/999)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Correct URLs** - Different strategies for different actions
- ✅ **Type safety** - Prevents invalid URLs (e.g., edit without ID)
- ✅ **Flexibility** - Easy to add new action types
- ✅ **Clean code** - No if-else spaghetti

---

### 2.3 Template Method Pattern - Pattern "Phương Pháp Khuôn Mẫu"

#### 🍪 VÍ DỤ ĐỜI THƯỜNG: Cookie Recipe Template

```
Cookie Baking Recipe (Template):

1. Prepare ingredients
2. Mix dough
3. Add flavoring ← Variable step
4. Bake at 350°F
5. Cool down

Different flavors, same template:
- Chocolate chip cookies: Step 3 = Add chocolate chips
- Oatmeal cookies: Step 3 = Add oats
- Sugar cookies: Step 3 = Add vanilla

Same process, different flavoring!
```

**Template Method** = Define algorithm skeleton, let subclasses override steps

#### Implementation:

```typescript
// useNavigationButton defines template:

export function useNavigationButton(props) {
  // STEP 1: Get router utilities
  const navigation = useNavigation();
  const Link = useLink();

  // STEP 2: Get translation utilities
  const translate = useTranslate();
  const getUserFriendlyName = useUserFriendlyName();
  const { humanize } = useRefineOptions();

  // STEP 3: Resolve resource & ID
  const { id, resource, identifier } = useResourceParams({ ... });

  // STEP 4: Check permissions
  const { canAccess, title, hidden, disabled } = useButtonCanAccess({ ... });

  // STEP 5: Generate URL (variable based on action)
  const to = generateUrl(props.action, resource, id);

  // STEP 6: Generate label (variable based on action)
  const label = generateLabel(props.action, resource, identifier);

  // STEP 7: Return standardized result
  return { to, label, title, disabled, hidden, canAccess, LinkComponent };
}

// All navigation buttons follow same template!
```

#### Template Applied to Different Buttons:

```typescript
// Edit Button:
useNavigationButton({ action: "edit", resource: "posts", id: 123 })
→ Template executed with:
  - Step 5: to = "/posts/edit/123"
  - Step 6: label = "Edit"

// Show Button:
useNavigationButton({ action: "show", resource: "posts", id: 123 })
→ Template executed with:
  - Step 5: to = "/posts/show/123"
  - Step 6: label = "Show"

// Create Button:
useNavigationButton({ action: "create", resource: "posts" })
→ Template executed with:
  - Step 5: to = "/posts/create"
  - Step 6: label = "Create"

// List Button:
useNavigationButton({ action: "list", resource: "posts" })
→ Template executed with:
  - Step 5: to = "/posts"
  - Step 6: label = "Posts" (plural, user-friendly)

// Same template, different results! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - All buttons follow same process
- ✅ **DRY** - No duplication across button types
- ✅ **Maintainability** - Change once, apply everywhere
- ✅ **Predictability** - Same structure for all navigation buttons

---

### 2.4 Facade Pattern - Pattern "Mặt Tiền Đơn Giản"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Smart Home Controller

```
Smart Home:

Without controller:
- Open Light app → Turn on lights
- Open Thermostat app → Set temperature
- Open Speaker app → Play music
- Open Curtains app → Open curtains
→ 4 apps! Complex!

With smart home controller:
- Press "Good Morning" button
  → Lights on ✅
  → Temperature 22°C ✅
  → Music plays ✅
  → Curtains open ✅
→ 1 button! Simple!
```

**Facade Pattern** = Simple interface hiding complex subsystem

#### Implementation:

```typescript
// useNavigationButton = Facade over 6+ hooks

export function useNavigationButton(props) {
  // SUBSYSTEM 1: Navigation
  const navigation = useNavigation();

  // SUBSYSTEM 2: Router Link
  const Link = useLink();

  // SUBSYSTEM 3: Translation
  const translate = useTranslate();

  // SUBSYSTEM 4: User-friendly names
  const getUserFriendlyName = useUserFriendlyName();

  // SUBSYSTEM 5: Text transformers
  const { humanize } = useRefineOptions();

  // SUBSYSTEM 6: Resource resolution
  const { id, resource, identifier } = useResourceParams({ ... });

  // SUBSYSTEM 7: Access control
  const { canAccess, title, hidden, disabled } = useButtonCanAccess({ ... });

  // FACADE: Coordinate all subsystems
  const to = generateUrl(); // Uses navigation
  const label = generateLabel(); // Uses translate, humanize, getUserFriendlyName

  return { to, label, disabled, hidden, ... };
}
```

#### ❌ KHÔNG có Facade:

```tsx
// BAD - Component must coordinate 7 subsystems

function EditButton({ resource, id }) {
  const navigation = useNavigation();
  const Link = useLink();
  const translate = useTranslate();
  const getUserFriendlyName = useUserFriendlyName();
  const { humanize } = useRefineOptions();
  const { id: resolvedId, resource: resolvedResource } = useResourceParams({
    resource,
    id,
  });
  const { disabled, hidden } = useButtonCanAccess({
    action: "edit",
    resource: resolvedResource,
    id: resolvedId,
  });

  const to = navigation.editUrl(resolvedResource, resolvedId);
  const label = translate("buttons.edit", humanize("edit"));

  if (hidden) return null;

  return (
    <Link to={to}>
      <button disabled={disabled}>{label}</button>
    </Link>
  );
}

// Problems:
// - Too much boilerplate! ❌
// - Easy to forget a hook
// - Inconsistent across buttons
```

#### ✅ CÓ Facade Pattern:

```tsx
// GOOD - Simple facade interface

function EditButton({ resource, id }) {
  const { to, label, disabled, hidden, LinkComponent } = useNavigationButton({
    action: "edit",
    resource,
    id,
  });

  if (hidden) return null;

  return (
    <LinkComponent to={to}>
      <button disabled={disabled}>{label}</button>
    </LinkComponent>
  );
}

// Simple! Facade handled complexity ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - 1 hook instead of 7
- ✅ **Consistency** - Same behavior everywhere
- ✅ **DRY** - No duplication
- ✅ **Easy to use** - Less error-prone

---

### 2.5 Memoization Pattern (useMemo)

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Phone Contacts

```
Phone Contacts App:

❌ BAD - Search contacts every time screen updates:
Screen updates → Search all 1000 contacts → Find "John"
Screen updates → Search all 1000 contacts → Find "John" (again!)
Screen updates → Search all 1000 contacts → Find "John" (again!)
→ Wasteful!

✅ GOOD - Cache search result:
First time: Search 1000 contacts → Find "John" → Cache result
Screen updates → Return cached "John" (instant!)
Search changed → Search again → Cache new result
```

**Memoization** = Cache expensive computation results

#### Implementation:

```typescript
// From useNavigationButton (lines 67-77)

const to = React.useMemo(() => {
  if (!resource) return "";
  switch (props.action) {
    case "create":
    case "list":
      return navigation[`${props.action}Url`](resource, props.meta);
    default:
      if (!id) return "";
      return navigation[`${props.action}Url`](resource, id, props.meta);
  }
}, [resource, id, props.meta, navigation[`${props.action}Url`]]);
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//  Dependencies - only recalculate if these change!
```

#### How It Works:

```typescript
// Render 1:
// resource = "posts"
// id = 123
// action = "edit"
// → Calculate: to = navigation.editUrl("posts", 123)
// → Cache: to = "/posts/edit/123"

// Render 2 (random state change, deps unchanged):
// resource = "posts" (same)
// id = 123 (same)
// action = "edit" (same)
// → Skip calculation
// → Return cached: "/posts/edit/123" ✅

// Render 3 (id changed):
// resource = "posts" (same)
// id = 456 (changed!)
// action = "edit" (same)
// → Dependencies changed!
// → Recalculate: to = navigation.editUrl("posts", 456)
// → Cache new: to = "/posts/edit/456"
```

#### Why Memo `to`?

```typescript
// URL generation may involve:
// 1. Resource lookup
// 2. Route template parsing
// 3. Parameter interpolation
// 4. Meta processing

// Without useMemo:
function MyList() {
  const { to } = useNavigationButton({ ... });

  // Component re-renders 100 times
  // → navigation.editUrl() called 100 times ❌
  // → Wasteful!
}

// With useMemo:
function MyList() {
  const { to } = useNavigationButton({ ... });

  // Component re-renders 100 times
  // → navigation.editUrl() called ONCE (if deps unchanged) ✅
  // → Efficient!
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid redundant URL generation
- ✅ **Efficiency** - Particularly important with complex routing
- ✅ **React best practice** - Optimize re-renders
- ✅ **Stable references** - Same URL object between renders

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern             | Ví dụ đời thường       | Giải quyết vấn đề gì             | Trong useNavigationButton      |
| ------------------- | ---------------------- | -------------------------------- | ------------------------------ |
| **Adapter**         | Universal charger      | Convert different interfaces     | Router-agnostic Link component |
| **Strategy**        | Google Maps navigation | Choose algorithm based on input  | URL generation per action type |
| **Template Method** | Cookie recipe          | Standard process, variable steps | Same flow for all buttons      |
| **Facade**          | Smart home controller  | Hide complex subsystem           | Orchestrate 7 hooks            |
| **Memoization**     | Phone contacts cache   | Avoid redundant computation      | Cache URL generation           |

---

## 3. KEY FEATURES

### 3.1 Router-Agnostic Link Component

```typescript
const { LinkComponent } = useNavigationButton({ ... });

// Works with ANY router:
// - React Router: <Link />
// - Next.js: <NextLink />
// - Remix: <RemixLink />
// - Custom: Your custom Link component

// Usage:
<LinkComponent to={to}>
  <button>{label}</button>
</LinkComponent>
```

### 3.2 Action-Specific URL Generation

```typescript
// List (collection-level):
useNavigationButton({ action: "list", resource: "posts" })
→ { to: "/posts" }

// Create (collection-level):
useNavigationButton({ action: "create", resource: "posts" })
→ { to: "/posts/create" }

// Edit (item-level):
useNavigationButton({ action: "edit", resource: "posts", id: 123 })
→ { to: "/posts/edit/123" }

// Show (item-level):
useNavigationButton({ action: "show", resource: "posts", id: 123 })
→ { to: "/posts/show/123" }

// Clone (item-level):
useNavigationButton({ action: "clone", resource: "posts", id: 123 })
→ { to: "/posts/clone/123" }
```

### 3.3 Smart Label Generation

```typescript
// FROM useNavigationButton (lines 79-88)

const label =
  props.action === "list"
    ? // SPECIAL CASE: List button shows resource name (plural)
      translate(
        `${identifier}.titles.list`,
        getUserFriendlyName(resource?.meta?.label ?? identifier, "plural")
      )
    : // DEFAULT: Show action name
      translate(`buttons.${props.action}`, humanize(props.action));

// Examples:

// List button:
useNavigationButton({ action: "list", resource: "posts" })
→ label = "Posts" (plural, user-friendly)

// Edit button:
useNavigationButton({ action: "edit", resource: "posts", id: 123 })
→ label = "Edit"

// Show button:
useNavigationButton({ action: "show", resource: "posts", id: 123 })
→ label = "Show"
```

#### Label Generation Priority:

```typescript
// For LIST action:
// 1. translate("posts.titles.list")        ← i18n key
// 2. getUserFriendlyName("posts", "plural") ← "Posts"
// 3. humanize("posts")                      ← "Posts" (fallback)

// For OTHER actions:
// 1. translate("buttons.edit")              ← i18n key
// 2. humanize("edit")                       ← "Edit" (fallback)
```

### 3.4 Permission Integration

```typescript
const { disabled, hidden, title, canAccess } = useNavigationButton({
  action: "edit",
  resource: "posts",
  id: 123,
  accessControl: {
    enabled: true,
    hideIfUnauthorized: false,
  },
});

// User without permission:
// disabled = true
// hidden = false (show but disable)
// title = "You don't have permission to edit"
```

### 3.5 Meta Parameter Support

```typescript
// Meta for custom params in URL:
const { to } = useNavigationButton({
  action: "edit",
  resource: "posts",
  id: 123,
  meta: {
    categoryId: "tech",
    lang: "en",
  },
});

// Custom router can use meta:
// to = "/categories/tech/posts/edit/123?lang=en"
```

---

## 4. COMMON USE CASES

### 4.1 Basic Edit Button

```tsx
import { useNavigationButton } from "@refinedev/core";

function EditButton({ resource, id }) {
  const { to, label, disabled, hidden, title, LinkComponent } =
    useNavigationButton({
      action: "edit",
      resource,
      id,
    });

  if (hidden) return null;

  return (
    <LinkComponent to={to}>
      <button disabled={disabled} title={title}>
        <EditIcon />
        {label}
      </button>
    </LinkComponent>
  );
}

// Usage:
<EditButton resource="posts" id={123} />;
// Renders: <Link to="/posts/edit/123"><button>Edit</button></Link>
```

### 4.2 Show Button

```tsx
function ShowButton({ resource, id }) {
  const { to, label, LinkComponent } = useNavigationButton({
    action: "show",
    resource,
    id,
  });

  return (
    <LinkComponent to={to}>
      <button>
        <EyeIcon />
        {label}
      </button>
    </LinkComponent>
  );
}

// Usage:
<ShowButton resource="posts" id={123} />;
// Renders: <Link to="/posts/show/123"><button>Show</button></Link>
```

### 4.3 List Button (Back to List)

```tsx
function ListButton({ resource }) {
  const { to, label, LinkComponent } = useNavigationButton({
    action: "list",
    resource,
  });

  return (
    <LinkComponent to={to}>
      <button>
        <ListIcon />
        {label} {/* "Posts" (plural) */}
      </button>
    </LinkComponent>
  );
}

// Usage:
<ListButton resource="posts" />;
// Renders: <Link to="/posts"><button>Posts</button></Link>
```

### 4.4 Create Button

```tsx
function CreateButton({ resource }) {
  const { to, label, LinkComponent } = useNavigationButton({
    action: "create",
    resource,
  });

  return (
    <LinkComponent to={to}>
      <button>
        <PlusIcon />
        {label}
      </button>
    </LinkComponent>
  );
}

// Usage:
<CreateButton resource="posts" />;
// Renders: <Link to="/posts/create"><button>Create</button></Link>
```

### 4.5 Clone Button

```tsx
function CloneButton({ resource, id }) {
  const { to, label, LinkComponent } = useNavigationButton({
    action: "clone",
    resource,
    id,
  });

  return (
    <LinkComponent to={to}>
      <button>
        <CopyIcon />
        {label}
      </button>
    </LinkComponent>
  );
}

// Usage:
<CloneButton resource="posts" id={123} />;
// Renders: <Link to="/posts/clone/123"><button>Clone</button></Link>
```

### 4.6 Permission-Aware Button

```tsx
function SecureEditButton({ resource, id }) {
  const { to, label, disabled, hidden, title, LinkComponent } =
    useNavigationButton({
      action: "edit",
      resource,
      id,
      accessControl: {
        enabled: true,
        hideIfUnauthorized: false, // Show but disable
      },
    });

  if (hidden) return null;

  return (
    <LinkComponent to={to}>
      <button
        disabled={disabled}
        title={title}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        {label}
      </button>
    </LinkComponent>
  );
}

// User without permission:
// → Button visible but disabled
// → Hover shows permission reason
```

### 4.7 Table Row Actions

```tsx
import { Table } from "antd";

function PostsTable() {
  const columns = [
    { title: "Title", dataIndex: "title" },
    { title: "Author", dataIndex: "author" },
    {
      title: "Actions",
      render: (_, record) => (
        <Space>
          <ShowButton resource="posts" id={record.id} />
          <EditButton resource="posts" id={record.id} />
        </Space>
      ),
    },
  ];

  return <Table dataSource={posts} columns={columns} />;
}

function ShowButton({ resource, id }) {
  const { to, LinkComponent } = useNavigationButton({
    action: "show",
    resource,
    id,
  });

  return (
    <LinkComponent to={to}>
      <Button size="small">View</Button>
    </LinkComponent>
  );
}

function EditButton({ resource, id }) {
  const { to, LinkComponent } = useNavigationButton({
    action: "edit",
    resource,
    id,
  });

  return (
    <LinkComponent to={to}>
      <Button size="small">Edit</Button>
    </LinkComponent>
  );
}
```

---

## 5. INTEGRATION WITH REFINE COMPONENTS

### 5.1 Built-in Navigation Button Components

```tsx
// Refine's UI library packages provide ready-to-use components:

// @refinedev/antd
import { EditButton, ShowButton, CreateButton, ListButton } from "@refinedev/antd";
<EditButton recordItemId={123} />
<ShowButton recordItemId={123} />

// @refinedev/mui
import { EditButton, ShowButton, CreateButton, ListButton } from "@refinedev/mui";
<EditButton recordItemId={123} />
<ShowButton recordItemId={123} />

// @refinedev/mantine
import { EditButton, ShowButton, CreateButton, ListButton } from "@refinedev/mantine";
<EditButton recordItemId={123} />
<ShowButton recordItemId={123} />

// All use useNavigationButton internally! ✅
```

### 5.2 Works Across All Routers

```
useNavigationButton (core)
        │
        ├─→ React Router → <Link to="..." />
        ├─→ Next.js → <NextLink href="..." />
        ├─→ Remix → <RemixLink to="..." />
        └─→ Custom router → <YourLink />

Same hook, different routers! ✅
```

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Why Return LinkComponent?

**Question:** Why return `LinkComponent` instead of letting component import Link directly?

**Answer:**

```tsx
// ❌ BAD - Hard-coded router dependency
import { Link } from "react-router-dom";

function EditButton() {
  const { to } = useNavigationButton({ ... });
  return <Link to={to}>Edit</Link>;
  // Locked to React Router! ❌
}

// ✅ GOOD - Router-agnostic
function EditButton() {
  const { to, LinkComponent } = useNavigationButton({ ... });
  return <LinkComponent to={to}>Edit</LinkComponent>;
  // Works with any router! ✅
}

// Benefits:
// - Switch routers without code changes
// - Test with mock Link component
// - Supports custom routers
```

### 6.2 Why Separate URL Generation Strategies?

**Reason:** Different actions have different URL patterns. List/Create don't need ID, Edit/Show/Clone require ID.

```typescript
// Type safety:
action: "list" → No ID needed ✅
action: "create" → No ID needed ✅
action: "edit" → ID required ✅

// Prevents bugs:
useNavigationButton({ action: "edit" }) // No ID
→ to = "" (empty, prevents invalid navigation)
```

### 6.3 Why Special Label for List Action?

**Reason:** List button shows plural resource name, not "List" verb.

```tsx
// Better UX:
<ListButton resource="posts" />
→ label = "Posts" ✅ (better)
→ NOT "List" ❌ (confusing)

// Example:
"← Posts" // Clear: Back to posts list
"← List"  // Unclear: List of what?
```

### 6.4 Why useMemo for URL?

**Reason:** URL generation can be expensive (template parsing, param interpolation). Memoize to avoid redundant work.

---

## 7. TESTING

### 7.1 Unit Test Example

```typescript
import { renderHook } from "@testing-library/react";
import { useNavigationButton } from "./useNavigationButton";

// Mock dependencies
jest.mock("../../navigation");
jest.mock("../../router");
jest.mock("../button-can-access");

describe("useNavigationButton", () => {
  it("should generate edit URL", () => {
    useNavigation.mockReturnValue({
      editUrl: (resource, id) => `/${resource}/edit/${id}`,
    });

    const { result } = renderHook(() =>
      useNavigationButton({
        action: "edit",
        resource: "posts",
        id: 123,
      }),
    );

    expect(result.current.to).toBe("/posts/edit/123");
  });

  it("should generate list URL without ID", () => {
    useNavigation.mockReturnValue({
      listUrl: (resource) => `/${resource}`,
    });

    const { result } = renderHook(() =>
      useNavigationButton({
        action: "list",
        resource: "posts",
      }),
    );

    expect(result.current.to).toBe("/posts");
  });

  it("should return empty URL for edit without ID", () => {
    const { result } = renderHook(() =>
      useNavigationButton({
        action: "edit",
        resource: "posts",
        // No ID!
      }),
    );

    expect(result.current.to).toBe("");
  });
});
```

### 7.2 Integration Test

```typescript
import { render, screen } from "@testing-library/react";
import { Refine } from "@refinedev/core";

const mockRouterProvider = {
  Link: ({ to, children }) => <a href={to}>{children}</a>,
  go: () => {},
  parse: () => ({ resource: "posts", id: "123" }),
  // ...
};

describe("EditButton integration", () => {
  it("should render link with correct URL", () => {
    render(
      <Refine routerProvider={mockRouterProvider}>
        <EditButtonComponent resource="posts" id={123} />
      </Refine>,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/posts/edit/123");
  });
});
```

---

## 8. COMMON PITFALLS

### 8.1 Forgetting ID for Item-Level Actions

```tsx
// ❌ WRONG - Edit without ID
const { to } = useNavigationButton({
  action: "edit",
  resource: "posts",
  // No ID! ❌
});
// to = "" (empty)

// ✅ CORRECT
const { to } = useNavigationButton({
  action: "edit",
  resource: "posts",
  id: 123, // ← Required!
});
// to = "/posts/edit/123"
```

### 8.2 Not Checking `hidden`

```tsx
// ❌ WRONG
function EditButton({ id }) {
  const { to, LinkComponent } = useNavigationButton({
    action: "edit",
    resource: "posts",
    id,
    accessControl: { hideIfUnauthorized: true },
  });

  // Forgot to check hidden! ❌
  return (
    <LinkComponent to={to}>
      <button>Edit</button>
    </LinkComponent>
  );
}

// ✅ CORRECT
function EditButton({ id }) {
  const { to, hidden, LinkComponent } = useNavigationButton({
    action: "edit",
    resource: "posts",
    id,
    accessControl: { hideIfUnauthorized: true },
  });

  if (hidden) return null; // ← Don't forget!

  return (
    <LinkComponent to={to}>
      <button>Edit</button>
    </LinkComponent>
  );
}
```

### 8.3 Hard-Coding Link Component

```tsx
// ❌ WRONG - Hard-coded React Router Link
import { Link } from "react-router-dom";

function EditButton() {
  const { to } = useNavigationButton({ ... });
  return <Link to={to}>Edit</Link>; // ← Locked to React Router!
}

// ✅ CORRECT - Use returned LinkComponent
function EditButton() {
  const { to, LinkComponent } = useNavigationButton({ ... });
  return <LinkComponent to={to}>Edit</LinkComponent>; // ← Router-agnostic!
}
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Adapter**: Router-agnostic Link component
- ✅ **Strategy**: URL generation per action type
- ✅ **Template Method**: Standard flow for all buttons
- ✅ **Facade**: Orchestrate 7 hooks
- ✅ **Memoization**: Cache URL generation

### Key Features

1. **Router-agnostic** - Works with any router
2. **Action-aware** - Different URLs for different actions
3. **Permission-integrated** - Built-in access control
4. **Smart labels** - i18n-ready, action-specific
5. **Type-safe** - Prevents invalid URLs
6. **Memoized** - Performance optimized

### Khi nào dùng useNavigationButton?

✅ **Nên dùng:**

- Edit, Show, Create, List, Clone buttons
- Any navigation to resource pages
- Table row actions
- Breadcrumb navigation
- Multi-router apps

❌ **Không dùng:**

- External links (use regular <a>)
- Custom navigation logic (use useNavigation directly)
- Non-resource navigation (use router Link directly)

### Remember

✅ **100 lines** - Router-agnostic facade
🔌 **Adapter** - Works with any router
🗺️ **Strategy** - Action-based URL generation
🏢 **Facade** - Simple interface, 7 hooks
💾 **Memoized** - Cached URL generation
🔗 **LinkComponent** - Always use returned component
