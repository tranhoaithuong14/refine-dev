# Kiến trúc và Design Patterns của useButtonCanAccess Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │        ACCESS CONTROL SYSTEM                     │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  accessControlProvider                           │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  useCan ─────→ Check permissions                │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  useButtonCanAccess ✅                           │  │
│  │    (Apply permissions to buttons)                │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Returns:                                        │  │
│  │    - disabled: true/false                        │  │
│  │    - hidden: true/false                          │  │
│  │    - title: "No permission"                      │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có 1 mục đích rất rõ ràng:**

> **Apply access control to buttons - Hide/Disable buttons based on user permissions**

### 1.2 Complete Access Control Flow

```
┌──────────────────────────────────────────────────────────────┐
│              BUTTON ACCESS CONTROL FLOW                      │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User renders a button                               │
│  <EditButton resource="posts" id={123} />                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Button calls useButtonCanAccess                     │
│  const { disabled, hidden, title } =                         │
│    useButtonCanAccess({                                      │
│      action: "edit",                                         │
│      resource: postsResource,                                │
│      id: 123                                                 │
│    });                                                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check if access control enabled                    │
│  accessControlEnabled = props?.enabled ??                   │
│                         context.options.buttons.enabled      │
│                                                              │
│  If disabled → skip check, return { disabled: false }       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Call useCan to check permission                    │
│  const { data: canAccess } = useCan({                        │
│    resource: "posts",                                        │
│    action: "edit",                                           │
│    params: { id: 123 }                                       │
│  });                                                         │
│                                                              │
│  → Calls accessControlProvider.can()                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Process permission result                          │
│                                                              │
│  Scenario A: User HAS permission                            │
│    canAccess = { can: true }                                │
│    → disabled = false                                        │
│    → hidden = false                                          │
│    → title = ""                                              │
│                                                              │
│  Scenario B: User LACKS permission                          │
│    canAccess = { can: false, reason: "Admin only" }         │
│    → disabled = true                                         │
│    → hidden = hideIfUnauthorized ? true : false             │
│    → title = "Admin only"                                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Render button based on result                      │
│                                                              │
│  if (hidden) return null; // Don't render                   │
│                                                              │
│  <button                                                     │
│    disabled={disabled}                                       │
│    title={title}                                             │
│  >                                                           │
│    Edit                                                      │
│  </button>                                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này là 74 dòng** - Small but critical for security!

---

### 2.1 Adapter Pattern - Pattern "Bộ Chuyển Đổi"

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Power Adapter (Adapter điện)

```
Imagine you travel from Vietnam to USA:

Vietnam socket: 220V, 2 pins
USA socket: 110V, 3 pins

❌ BAD - Can't plug Vietnamese device into USA socket directly

✅ GOOD - Use power adapter:
Vietnamese device → [Power Adapter] → USA socket

The adapter:
- Takes Vietnamese plug (input)
- Converts to USA plug (output)
- Device works seamlessly!
```

**Adapter Pattern** = Convert one interface to another

#### Implementation in useButtonCanAccess:

```typescript
// useCan returns complex permission object:
{
  can: true,
  reason?: string,
  data?: any
}

// Buttons need simple props:
{
  disabled: boolean,
  hidden: boolean,
  title: string
}

// useButtonCanAccess = ADAPTER
// Converts useCan → Button props
```

#### ❌ KHÔNG có Adapter:

```tsx
// BAD - Every button must parse useCan result

function EditButton({ resource, id }) {
  const { data: canAccess } = useCan({
    resource,
    action: "edit",
    params: { id },
  });

  // DUPLICATE logic in every button! ❌
  const disabled = canAccess?.can === false;
  const hidden = !canAccess?.can && hideIfUnauth;
  const title = canAccess?.reason || "No permission";

  if (hidden) return null;
  return (
    <button disabled={disabled} title={title}>
      Edit
    </button>
  );
}

function DeleteButton({ resource, id }) {
  const { data: canAccess } = useCan({
    resource,
    action: "delete",
    params: { id },
  });

  // DUPLICATE AGAIN! ❌
  const disabled = canAccess?.can === false;
  const hidden = !canAccess?.can && hideIfUnauth;
  const title = canAccess?.reason || "No permission";

  if (hidden) return null;
  return (
    <button disabled={disabled} title={title}>
      Delete
    </button>
  );
}

// Vấn đề:
// - Code duplication (DRY violation)
// - Inconsistent logic across buttons
// - Hard to change behavior
```

#### ✅ CÓ Adapter Pattern:

```tsx
// GOOD - Adapter centralizes conversion logic

function useButtonCanAccess(props) {
  const { data: canAccess } = useCan({ ... });

  // ADAPTER: Convert useCan result → button props
  const disabled = canAccess?.can === false;
  const hidden = accessControlEnabled &&
                 hideIfUnauthorized &&
                 !canAccess?.can;
  const title = canAccess?.reason ||
                translate("buttons.notAccessTitle");

  return { disabled, hidden, title, canAccess };
}

// Usage - Simple and consistent!
function EditButton({ resource, id }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "edit",
    resource,
    id
  });

  if (hidden) return null;
  return <button disabled={disabled} title={title}>Edit</button>;
}

function DeleteButton({ resource, id }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "delete",
    resource,
    id
  });

  if (hidden) return null;
  return <button disabled={disabled} title={title}>Delete</button>;
}

// All buttons use same adapter! ✅
```

#### Visual Representation:

```
┌─────────────────────────────────────────────────────┐
│             ADAPTER PATTERN FLOW                    │
└─────────────────────────────────────────────────────┘

useCan (complex output)
  { can: false, reason: "Admin only", data: {...} }
                    │
                    ▼
        ┌───────────────────────┐
        │  useButtonCanAccess   │ ← ADAPTER
        │   (74 lines)          │
        └───────────────────────┘
                    │
                    ▼
Button props (simple output)
  { disabled: true, hidden: false, title: "Admin only" }
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DRY** - No duplication
- ✅ **Consistency** - Same logic everywhere
- ✅ **Maintainability** - Change once, apply everywhere
- ✅ **Testability** - Test adapter once

---

### 2.2 Strategy Pattern - Pattern "Chiến Lược Linh Hoạt"

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Security Guard Strategies

```
Building Security Guard:

Strategy 1 (Strict): Unauthorized → HIDE person, don't let in
Strategy 2 (Lenient): Unauthorized → SHOW person, but disable entry
Strategy 3 (Off): No check, everyone allowed

Same guard, different strategies!
```

**Strategy Pattern** = Choose behavior at runtime

#### Implementation:

```typescript
// STRATEGY 1: Hide unauthorized buttons
hideIfUnauthorized = true
→ Button completely hidden if no permission

// STRATEGY 2: Show but disable unauthorized buttons
hideIfUnauthorized = false
→ Button visible but disabled (with tooltip explaining why)

// STRATEGY 3: Access control disabled
accessControlEnabled = false
→ All buttons enabled (no check)
```

#### Real Code:

```typescript
// From useButtonCanAccess (lines 36-42)

// Strategy selection from TWO sources:
const accessControlEnabled =
  props.accessControl?.enabled ?? // ← Per-button override
  accessControlContext.options.buttons.enableAccessControl; // ← Global default

const hideIfUnauthorized =
  props.accessControl?.hideIfUnauthorized ?? // ← Per-button override
  accessControlContext.options.buttons.hideIfUnauthorized; // ← Global default

// Strategy application (line 63):
const hidden =
  accessControlEnabled && // ← If AC enabled
  hideIfUnauthorized && // ← AND hide strategy
  !canAccess?.can; // ← AND no permission
// → HIDE button
```

#### Examples:

```tsx
// Example 1: Global strategy (hide unauthorized)
<Refine
  accessControlProvider={{
    can: async ({ action, resource }) => checkPermission(action, resource),
    options: {
      buttons: {
        enableAccessControl: true,
        hideIfUnauthorized: true // ← Global: HIDE
      }
    }
  }}
>
  <EditButton />
  {/* No permission → Hidden completely ✅ */}
</Refine>

// Example 2: Global strategy (show but disable)
<Refine
  accessControlProvider={{
    can: async ({ action, resource }) => checkPermission(action, resource),
    options: {
      buttons: {
        enableAccessControl: true,
        hideIfUnauthorized: false // ← Global: SHOW BUT DISABLE
      }
    }
  }}
>
  <EditButton />
  {/* No permission → Visible but disabled with tooltip ✅ */}
</Refine>

// Example 3: Per-button override
<EditButton
  accessControl={{
    enabled: true,
    hideIfUnauthorized: false // ← Override global strategy
  }}
/>
{/* Override global setting for THIS button only ✅ */}

// Example 4: Disable access control for specific button
<DeleteButton
  accessControl={{
    enabled: false // ← Skip AC check for this button
  }}
/>
{/* Always enabled, regardless of permissions ✅ */}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexible UX** - Choose between hide vs disable
- ✅ **Per-button control** - Override global settings
- ✅ **Context-aware** - Different strategies for different apps

---

### 2.3 Fallback Pattern (Null Object Pattern)

#### 🛟 VÍ DỤ ĐỜI THƯỜNG: Safety Net

```
Circus Trapeze Artist:

❌ BAD - No safety net:
Artist falls → Crash! 💥

✅ GOOD - Safety net below:
Artist falls → Caught by net ✅

Same for code - always have fallback!
```

**Fallback Pattern** = Provide safe default instead of null/undefined

#### Implementation:

```typescript
// FALLBACK 1: Title fallback
const title =
  canAccess?.reason ?? // ← Custom reason from backend
  translate(
    "buttons.notAccessTitle", // ← i18n translation
    "You don't have permission to access", // ← Hard-coded fallback
  );

// Flow:
// 1. Try canAccess?.reason (e.g., "Admin only")
// 2. If undefined → Try translate("buttons.notAccessTitle")
// 3. If translation missing → Use "You don't have..."
// → Always has a title! ✅

// FALLBACK 2: Access control config fallback
const accessControlEnabled =
  props.accessControl?.enabled ?? // ← Per-button config
  accessControlContext.options.buttons.enableAccessControl; // ← Global config

// Flow:
// 1. Try props.accessControl?.enabled
// 2. If undefined → Use global config
// → Always has a value! ✅

// FALLBACK 3: Hide strategy fallback
const hideIfUnauthorized =
  props.accessControl?.hideIfUnauthorized ?? // ← Per-button
  accessControlContext.options.buttons.hideIfUnauthorized; // ← Global

// Triple layer fallback!
```

#### Examples:

```typescript
// Scenario 1: Custom reason from backend
accessControlProvider.can({ action: "edit", resource: "posts" })
→ Returns: { can: false, reason: "Only post author can edit" }
→ title = "Only post author can edit" ✅

// Scenario 2: No custom reason
accessControlProvider.can({ action: "delete", resource: "posts" })
→ Returns: { can: false }
→ title = translate("buttons.notAccessTitle")
→ title = "Bạn không có quyền truy cập" (Vietnamese) ✅

// Scenario 3: No i18n provider
→ title = "You don't have permission to access" (fallback) ✅

// Never crashes! Always has title!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Robustness** - Never crashes on missing data
- ✅ **UX** - Always shows meaningful message
- ✅ **Graceful degradation** - Works without full config

---

### 2.4 Lazy Evaluation Pattern (Conditional Execution)

#### ⚡ VÍ DỤ ĐỜI THƯỜNG: Lazy Loading

```
Streaming Service (Netflix):

❌ BAD - Download entire movie before playing:
→ Slow, wastes bandwidth

✅ GOOD - Download only when needed:
→ Fast, efficient

Same for code - only compute when needed!
```

**Lazy Evaluation** = Defer computation until necessary

#### Implementation:

```typescript
// From useButtonCanAccess (lines 44-51)

const { data: canAccess } = useCan({
  resource: props.resource?.name,
  action: props.action === "clone" ? "create" : props.action,
  params: { meta: props.meta, id: props.id, resource: props.resource },
  queryOptions: {
    enabled: accessControlEnabled, // ← LAZY EVALUATION
    //       ^^^^^^^^^^^^^^^^^^^^^^^^
    //       Only runs if TRUE!
  },
});

// If accessControlEnabled = false:
// → useCan doesn't fetch
// → No API call
// → Saves bandwidth & CPU ✅

// If accessControlEnabled = true:
// → useCan fetches permission
// → Returns result
```

#### Examples:

```tsx
// Example 1: Access control DISABLED globally
<Refine
  accessControlProvider={{
    can: async () => {
      console.log("Checking permission..."); // ← NEVER CALLED!
      return { can: true };
    },
    options: {
      buttons: {
        enableAccessControl: false // ← Disabled
      }
    }
  }}
>
  <EditButton />
  {/* useCan not called → No API request → Fast! ✅ */}
</Refine>

// Example 2: Access control ENABLED globally
<Refine
  accessControlProvider={{
    can: async () => {
      console.log("Checking permission..."); // ← CALLED!
      return { can: true };
    },
    options: {
      buttons: {
        enableAccessControl: true // ← Enabled
      }
    }
  }}
>
  <EditButton />
  {/* useCan called → Checks permission → Secure! ✅ */}
</Refine>

// Example 3: Per-button disable
<EditButton
  accessControl={{ enabled: false }}
/>
{/* useCan skipped for THIS button only ✅ */}
```

#### Performance Impact:

```
With 10 buttons on page:

Access control DISABLED:
  0 API calls ✅
  Instant render

Access control ENABLED:
  10 API calls (cached by React Query)
  First render: ~100ms
  Subsequent renders: ~0ms (cached)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Skip unnecessary work
- ✅ **Bandwidth** - Reduce API calls
- ✅ **Flexibility** - Enable/disable per button

---

### 2.5 Memoization Pattern (useMemo)

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Calculator with Memory

```
Calculator:

❌ BAD - Recalculate 2+2 every time:
2+2 = ? → Calculate → 4
2+2 = ? → Calculate → 4 (again!)
2+2 = ? → Calculate → 4 (again!)

✅ GOOD - Remember result:
2+2 = ? → Calculate → 4 → Save to memory
2+2 = ? → Recall from memory → 4 (instant!)
3+3 = ? → Calculate → 6 → Save to memory
```

**Memoization** = Cache expensive computation results

#### Implementation:

```typescript
// From useButtonCanAccess (lines 53-61)

const title = React.useMemo(() => {
  if (canAccess?.can) return "";
  if (canAccess?.reason) return canAccess.reason;

  return translate(
    "buttons.notAccessTitle",
    "You don't have permission to access",
  );
}, [canAccess?.can, canAccess?.reason, translate]);
//  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//  Dependencies - only recalculate if these change!
```

#### How it Works:

```typescript
// Render 1:
// canAccess = { can: false, reason: "Admin only" }
// → Calculate title = "Admin only"
// → Cache result

// Render 2 (random state change, canAccess unchanged):
// canAccess = { can: false, reason: "Admin only" } (same!)
// → Skip calculation
// → Return cached "Admin only" ✅

// Render 3 (canAccess changed):
// canAccess = { can: true }
// → Dependencies changed!
// → Recalculate title = ""
// → Cache new result
```

#### Why Memo Title?

```typescript
// Title calculation involves:
// 1. canAccess?.can check
// 2. canAccess?.reason check
// 3. translate() function call (may be expensive)

// Without useMemo:
function MyPage() {
  const { title } = useButtonCanAccess(...);

  // Component re-renders 100 times (e.g., animation)
  // → translate() called 100 times ❌
  // → Wasteful!
}

// With useMemo:
function MyPage() {
  const { title } = useButtonCanAccess(...);

  // Component re-renders 100 times
  // → translate() called ONCE (if deps unchanged) ✅
  // → Efficient!
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid redundant computations
- ✅ **Efficiency** - Particularly important with i18n (translate can be slow)
- ✅ **React best practice** - Optimize re-renders

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern             | Ví dụ đời thường    | Giải quyết vấn đề gì              | Trong useButtonCanAccess             |
| ------------------- | ------------------- | --------------------------------- | ------------------------------------ |
| **Adapter**         | Power adapter       | Convert interface A → interface B | useCan result → button props         |
| **Strategy**        | Security strategies | Choose behavior at runtime        | Hide vs Disable unauthorized buttons |
| **Fallback**        | Safety net          | Provide safe defaults             | Title fallback chain                 |
| **Lazy Evaluation** | Lazy loading        | Defer computation                 | Conditional useCan execution         |
| **Memoization**     | Calculator memory   | Cache computation                 | Cache title calculation              |

---

## 3. KEY FEATURES

### 3.1 Three Output Properties

```typescript
const { disabled, hidden, title } = useButtonCanAccess({
  action: "edit",
  resource: postsResource,
  id: 123,
});

// disabled: boolean
//   - true: User can SEE but can't CLICK
//   - false: User can click normally
//   - Use case: Show "what's possible", but deny action

// hidden: boolean
//   - true: Button completely REMOVED from UI
//   - false: Button visible
//   - Use case: "Security through obscurity"

// title: string
//   - Tooltip/title attribute
//   - Explains WHY user can't access
//   - Example: "Admin only", "You don't have permission"
```

### 3.2 Action Mapping (Clone → Create)

```typescript
// Special case: Clone action
const { data: canAccess } = useCan({
  action: props.action === "clone" ? "create" : props.action,
  //      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //      Clone requires CREATE permission!
});

// Why?
// Clone = Create a copy of existing record
// If user can't CREATE, they can't CLONE!

// Examples:
action: "edit" → Check "edit" permission
action: "delete" → Check "delete" permission
action: "clone" → Check "create" permission ✅
action: "create" → Check "create" permission
```

### 3.3 Global + Per-Button Configuration

```tsx
// Global configuration:
<Refine
  accessControlProvider={{
    can: checkPermission,
    options: {
      buttons: {
        enableAccessControl: true,      // ← Global
        hideIfUnauthorized: false       // ← Global
      }
    }
  }}
/>

// Per-button override:
<EditButton
  accessControl={{
    enabled: false,              // ← Override: Skip AC
  }}
/>

<DeleteButton
  accessControl={{
    hideIfUnauthorized: true     // ← Override: Hide if denied
  }}
/>

// Priority: Per-button > Global
```

### 3.4 React Query Integration

```typescript
// useCan uses React Query internally
// → Automatic caching
// → Automatic deduplication
// → Background refetching

// Multiple buttons with same permission:
<EditButton resource="posts" id={123} />
<DeleteButton resource="posts" id={123} />
<CloneButton resource="posts" id={123} />

// React Query deduplicates:
// 3 buttons → only 2 API calls (edit, delete, create)
// Not 3 calls! ✅
```

---

## 4. COMMON USE CASES

### 4.1 Hide Unauthorized Buttons (Strict Security)

```tsx
import { useButtonCanAccess } from "@refinedev/core";

function EditButton({ resource, id }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "edit",
    resource,
    id,
    accessControl: {
      enabled: true,
      hideIfUnauthorized: true, // ← Hide completely
    },
  });

  if (hidden) return null; // ← Don't render at all

  return (
    <button disabled={disabled} title={title}>
      <EditIcon />
      Edit
    </button>
  );
}

// User without permission:
// → Button not in DOM ✅
// → Can't even see it exists
```

### 4.2 Show Disabled Buttons (Better UX)

```tsx
function DeleteButton({ resource, id }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "delete",
    resource,
    id,
    accessControl: {
      enabled: true,
      hideIfUnauthorized: false, // ← Show but disable
    },
  });

  if (hidden) return null;

  return (
    <button
      disabled={disabled}
      title={title}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <DeleteIcon />
      Delete
    </button>
  );
}

// User without permission:
// → Button visible but grayed out ✅
// → Hover shows: "You don't have permission" ✅
// → Better UX: User knows action exists but can't use it
```

### 4.3 Custom Permission Reason

```tsx
// Backend provides custom reason:
const accessControlProvider = {
  can: async ({ action, resource, params }) => {
    const user = getCurrentUser();

    if (action === "edit" && resource === "posts") {
      const post = await getPost(params.id);

      if (post.authorId !== user.id) {
        return {
          can: false,
          reason: "Only the post author can edit this post", // ← Custom reason
        };
      }

      return { can: true };
    }

    return { can: true };
  },
};

// Button usage:
const { disabled, title } = useButtonCanAccess({
  action: "edit",
  resource: "posts",
  id: 123,
});

// Result:
// disabled = true
// title = "Only the post author can edit this post" ✅
// → Specific, actionable feedback!
```

### 4.4 Disable Access Control for Admin Tools

```tsx
// Admin bypass:
function AdminEditButton({ resource, id }) {
  const user = useGetIdentity();

  const { disabled, hidden, title } = useButtonCanAccess({
    action: "edit",
    resource,
    id,
    accessControl: {
      enabled: user.role !== "admin", // ← Admin bypasses AC
    },
  });

  if (hidden) return null;

  return (
    <button disabled={disabled} title={title}>
      Edit
    </button>
  );
}

// Admin user:
// → accessControl.enabled = false
// → Button always enabled ✅

// Regular user:
// → accessControl.enabled = true
// → Normal permission check ✅
```

---

## 5. INTEGRATION WITH REFINE BUTTONS

### 5.1 Built-in Button Components

```tsx
// Refine's built-in buttons use this hook internally:

// @refinedev/antd
export function EditButton({ resource, recordItemId, accessControl }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "edit",
    resource,
    id: recordItemId,
    accessControl,
  });

  if (hidden) return null;

  return (
    <AntButton disabled={disabled} title={title}>
      Edit
    </AntButton>
  );
}

// @refinedev/mui
export function DeleteButton({ resource, recordItemId, accessControl }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "delete",
    resource,
    id: recordItemId,
    accessControl,
  });

  if (hidden) return null;

  return (
    <MuiButton disabled={disabled} title={title}>
      Delete
    </MuiButton>
  );
}

// All UI libraries use same hook! ✅
```

### 5.2 Works Across All UI Libraries

```
useButtonCanAccess (core)
        │
        ├─→ @refinedev/antd → <EditButton>, <DeleteButton>
        ├─→ @refinedev/mui → <EditButton>, <DeleteButton>
        ├─→ @refinedev/mantine → <EditButton>, <DeleteButton>
        ├─→ @refinedev/chakra-ui → <EditButton>, <DeleteButton>
        └─→ Custom UI → <YourButton>

Same access control, different UI implementations! ✅
```

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Why Separate Hook from useCan?

**Question:** Why not just use `useCan` directly in buttons?

**Answer:**

```tsx
// useCan returns:
{ can: true/false, reason?: string }

// Buttons need:
{ disabled: boolean, hidden: boolean, title: string }

// useButtonCanAccess = Adapter layer
// Benefits:
// - Centralizes conversion logic
// - Handles hideIfUnauthorized strategy
// - Manages title fallback
// - Consistent across all buttons
```

### 6.2 Why useMemo for Title?

**Reason:** `translate()` function can be expensive (especially with i18n libraries like i18next). Memoizing prevents redundant calls on every re-render.

### 6.3 Why Clone → Create Mapping?

**Reason:** Cloning is conceptually creating a new record based on existing one. If user can't `create`, they shouldn't be able to `clone`.

```typescript
// Permission check:
action: "clone" → Check "create" permission

// Why?
// Clone flow:
// 1. Copy existing record data
// 2. CREATE new record with copied data
//    ^^^^^^
//    Requires CREATE permission!
```

### 6.4 Why Both disabled AND hidden?

**UX Trade-off:**

```tsx
// Strategy 1: Hide (hideIfUnauthorized: true)
// Pros: Cleaner UI, don't show unavailable actions
// Cons: User doesn't know action exists

// Strategy 2: Disable (hideIfUnauthorized: false)
// Pros: User sees what's possible, educates user
// Cons: Cluttered UI with disabled buttons

// useButtonCanAccess supports BOTH!
// Let developers choose based on UX needs ✅
```

---

## 7. SECURITY CONSIDERATIONS

### 7.1 Client-Side Only (Not Replacement for Backend)

```tsx
// ⚠️ IMPORTANT:
// useButtonCanAccess is CLIENT-SIDE security
// → Prevents UI access
// → Improves UX

// ❌ NOT sufficient alone!
// Must also check on BACKEND:

// Frontend (UI security):
const { disabled } = useButtonCanAccess({
  action: "delete",
  resource: "posts",
});
<button disabled={disabled}>Delete</button>;

// Backend (Real security):
router.delete("/posts/:id", async (req, res) => {
  const user = req.user;
  const post = await getPost(req.params.id);

  // ✅ ALWAYS check permission on backend!
  if (!canDelete(user, post)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await deletePost(req.params.id);
  res.json({ success: true });
});

// Layered security:
// - Frontend: Better UX (hide/disable buttons)
// - Backend: Real security (enforce permissions)
```

### 7.2 hideIfUnauthorized Trade-off

```tsx
// hideIfUnauthorized: true (Security through obscurity)
// Pros: Attacker doesn't know feature exists
// Cons: User doesn't know feature exists either

// hideIfUnauthorized: false (Transparency)
// Pros: User knows feature exists, may request access
// Cons: Attacker knows feature exists

// Recommendation:
// - Admin features: hideIfUnauthorized: true (hide completely)
// - User features: hideIfUnauthorized: false (show disabled)
```

---

## 8. TESTING

### 8.1 Unit Test Example

```typescript
import { renderHook } from "@testing-library/react";
import { useButtonCanAccess } from "./useButtonCanAccess";

// Mock useCan
jest.mock("../../accessControl", () => ({
  useCan: jest.fn(),
}));

describe("useButtonCanAccess", () => {
  it("should disable button when user lacks permission", () => {
    // Mock useCan to return no permission
    useCan.mockReturnValue({
      data: { can: false, reason: "Admin only" },
    });

    const { result } = renderHook(() =>
      useButtonCanAccess({
        action: "edit",
        resource: { name: "posts" },
        id: 123,
        accessControl: {
          enabled: true,
          hideIfUnauthorized: false,
        },
      }),
    );

    expect(result.current.disabled).toBe(true);
    expect(result.current.hidden).toBe(false);
    expect(result.current.title).toBe("Admin only");
  });

  it("should hide button when hideIfUnauthorized is true", () => {
    useCan.mockReturnValue({
      data: { can: false },
    });

    const { result } = renderHook(() =>
      useButtonCanAccess({
        action: "delete",
        resource: { name: "posts" },
        id: 123,
        accessControl: {
          enabled: true,
          hideIfUnauthorized: true, // ← Hide
        },
      }),
    );

    expect(result.current.hidden).toBe(true);
  });
});
```

### 8.2 Integration Test

```typescript
import { render, screen } from "@testing-library/react";
import { Refine } from "@refinedev/core";
import { EditButton } from "./EditButton";

describe("EditButton with access control", () => {
  it("should hide button for unauthorized user", async () => {
    const accessControlProvider = {
      can: async () => ({ can: false }),
      options: {
        buttons: {
          enableAccessControl: true,
          hideIfUnauthorized: true,
        },
      },
    };

    render(
      <Refine accessControlProvider={accessControlProvider}>
        <EditButton resource={{ name: "posts" }} recordItemId={123} />
      </Refine>,
    );

    // Button should not exist in DOM
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });
});
```

---

## 9. COMMON PITFALLS

### 9.1 Forgetting to Check `hidden`

```tsx
// ❌ WRONG - Disabled but not hidden
function EditButton({ resource, id }) {
  const { disabled, title } = useButtonCanAccess({
    action: "edit",
    resource,
    id,
    accessControl: { hideIfUnauthorized: true },
  });

  // Forgot to check `hidden`! ❌
  return (
    <button disabled={disabled} title={title}>
      Edit
    </button>
  );
}

// Result: Button shows even when should be hidden!

// ✅ CORRECT - Check hidden
function EditButton({ resource, id }) {
  const { disabled, hidden, title } = useButtonCanAccess({
    action: "edit",
    resource,
    id,
    accessControl: { hideIfUnauthorized: true },
  });

  if (hidden) return null; // ← Don't forget this!

  return (
    <button disabled={disabled} title={title}>
      Edit
    </button>
  );
}
```

### 9.2 Not Providing Resource

```tsx
// ❌ WRONG - Missing resource
const { disabled } = useButtonCanAccess({
  action: "edit",
  id: 123,
  // No resource! ❌
});

// Result: Can't check permission without resource!

// ✅ CORRECT - Provide resource
const { disabled } = useButtonCanAccess({
  action: "edit",
  resource: postsResource,
  id: 123,
});
```

### 9.3 Relying Only on Client-Side Security

```tsx
// ❌ DANGEROUS:
// Only checking on frontend
<DeleteButton accessControl={{ enabled: true }} />

// → User can bypass with DevTools!
// → Must ALSO check on backend!

// ✅ CORRECT:
// Frontend check (UX):
<DeleteButton accessControl={{ enabled: true }} />

// Backend check (security):
router.delete("/posts/:id", checkPermission("delete"), handler);
```

---

## 10. KẾT LUẬN

### Design Patterns Summary

- ✅ **Adapter**: Convert useCan result → button props
- ✅ **Strategy**: Hide vs Disable unauthorized buttons
- ✅ **Fallback**: Safe defaults for missing data
- ✅ **Lazy Evaluation**: Conditional permission checking
- ✅ **Memoization**: Cache title calculation

### Key Features

1. **Three outputs** - disabled, hidden, title
2. **Strategy selection** - Hide or disable
3. **Global + per-button config** - Flexible control
4. **Action mapping** - Clone → Create
5. **Fallback chain** - Always has title

### Khi nào dùng useButtonCanAccess?

✅ **Nên dùng:**

- Action buttons (Edit, Delete, Clone)
- Permission-based UI
- Multi-role applications
- Enterprise apps with RBAC

❌ **Không dùng:**

- Public websites (no permissions)
- Single-role apps (everyone has same access)
- Navigation buttons (use useCan directly)

### Security Reminder

⚠️ **Client-side security is UX, not real security!**

```
Frontend (UX):     Hide/disable buttons
Backend (Security): Enforce permissions
```

**Always implement both layers!** ✅

### Remember

✅ **74 lines** - Small but critical
🔒 **Security** - UX layer only
🎯 **Adapter** - useCan → button props
🛡️ **Strategy** - Hide vs Disable
🛟 **Fallback** - Always has title
