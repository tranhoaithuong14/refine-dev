# Kiến trúc và Design Patterns của useResourceParams Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │               CONTEXT AWARENESS LAYER             │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  URL: /posts/123/edit                            │  │
│  │  Props: { resource: "users" } (Optional)         │  │
│  │                                                   │  │
│  │         ↓ inputs                                  │  │
│  │                                                   │  │
│  │  useResourceParams ✅ (THIS HOOK)                │  │
│  │    ↓                                             │  │
│  │    ├──→ ORCHESTRATOR PATTERN:                    │  │
│  │    │     Combines useResource, useId, useAction   │  │
│  │    │                                             │  │
│  │    ├──→ INFERENCE ENGINE:                        │  │
│  │    │     Decides values based on Props vs URL     │  │
│  │    │                                             │  │
│  │    ├──→ VALIDATION LOGIC:                        │  │
│  │    │     Checks if URL ID is valid for Resource   │  │
│  │    │                                             │  │
│  │    └──→ DERIVED STATE:                           │  │
│  │          Calculates formAction ("create"/"edit")  │  │
│  │                                                   │  │
│  │    ↓ returns                                      │  │
│  │                                                   │  │
│  │  {                                               │  │
│  │    resource: "users",                            │  │
│  │    id: undefined, (Mismatch!)                    │  │
│  │    action: "edit",                               │  │
│  │    formAction: "create"                          │  │
│  │  }                                               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **The "Brain" that determines the current Resource, ID, and Action by resolving conflicts between explicit Props and implicit URL context.**

### 1.2 The Decision Matrix (Inference Logic)

| Scenario        | URL          | Props                      | Result Resource | Result ID      | Result Action |
| :-------------- | :----------- | :------------------------- | :-------------- | :------------- | :------------ |
| **1. Standard** | `/posts/123` | -                          | `posts`         | `123`          | `show`        |
| **2. Override** | `/posts/123` | `id: 456`                  | `posts`         | `456`          | `show`        |
| **3. Mismatch** | `/posts/123` | `resource: "users"`        | `users`         | `undefined` ⚠️ | `show`        |
| **4. Explicit** | `/`          | `resource: "posts", id: 1` | `posts`         | `1`            | `list`        |

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-resource-params/index.ts: 500 dòng** - The Context Resolver!

---

### 2.1 Orchestrator Pattern - The Conductor

#### 🎻 VÍ DỤ ĐỜI THƯỜNG: Orchestra Conductor

```
Musicians (Sub-hooks):
- Violinist (useResource)
- Flutist (useId)
- Drummer (useAction)

Conductor (useResourceParams):
- Doesn't play an instrument.
- Listens to all of them.
- Tells them when to play louder or softer (Priority).
- Produces a harmonious song (The final Params object).
```

**Orchestrator Pattern** = A component that coordinates the actions of other components to achieve a goal.

#### Implementation:

```typescript
export const useResourceParams = (props) => {
  // 1. Call sub-hooks
  const { resource: urlResource } = useResource();
  const urlId = useId();
  const urlAction = useAction();

  // 2. Coordinate and resolve conflicts
  // ... logic ...

  // 3. Return unified result
  return { ... };
};
```

---

### 2.2 Priority/Fallback Pattern - "Props First"

#### 🥇 VÍ DỤ ĐỜI THƯỜNG: GPS Navigation

```
Car GPS (URL):
- Says you are at "123 Main St".

You (Props):
- Type in "456 Elm St" as destination.

Navigation System (useResourceParams):
- Prioritizes what YOU typed (Props).
- Ignores where the car is (URL) if they conflict.
```

**Priority Pattern** = Explicit instructions (Props) always override implicit context (URL).

#### Implementation:

```typescript
const resourceToCheck = props?.resource ?? inferredIdentifier;
const action = props?.action ?? inferredAction;
// ID logic is more complex (see below)
```

---

### 2.3 Validation Logic - The "Mismatch" Guard

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Key and Lock

```
Situation:
- You are standing at "House A" (URL Resource).
- You are holding a key for "House B" (Prop Resource).
- The door ID is "Room 101" (URL ID).

Guard (useResourceParams):
"Wait! You are asking for 'House B', but you are at 'House A'.
The 'Room 101' ID belongs to House A.
I cannot let you use 'Room 101' for 'House B'. It might not exist!"

Result:
- Resource: House B
- ID: undefined (Safety measure!)
```

**Validation Logic** = Ensure that data from different sources is compatible before combining it.

#### Implementation:

```typescript
const isSameResource = inferredIdentifier === identifier;

const defaultId = React.useMemo(() => {
  // If resources don't match, URL ID is invalid!
  if (!isSameResource) return props?.id;

  return props?.id ?? inferredId;
}, [isSameResource, props?.id, inferredId]);
```

---

### 2.4 Derived State - Form Action

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Actor Roles

```
Script (Action):
- "Show", "List", "Edit", "Create", "Clone"

Actor (Form):
- Can only play 3 roles: "Create", "Edit", "Clone".

Director (useResourceParams):
- "If script says 'Show', you play 'Create'."
- "If script says 'List', you play 'Create'."
- "If script says 'Edit', you play 'Edit'."
```

**Derived State** = Computing a new value based on existing state, rather than storing it separately.

#### Implementation:

```typescript
const formAction = React.useMemo(() => {
  if (!isSameResource && !props?.action) return "create";
  if (action === "edit" || action === "clone") return action;
  return "create";
}, [action, ...]);
```

---

## 3. KEY FEATURES

### 3.1 Dynamic ID Management

Returns `setId`, allowing components to change the ID programmatically without changing the URL.

```tsx
const { id, setId } = useResourceParams();

// User clicks "Next Post"
<button onClick={() => setId(id + 1)}>Next</button>;
```

### 3.2 Resource Selection

Returns a `select` function to look up other resources.

```tsx
const { select } = useResourceParams();
const { resource: userResource } = select("users");
```

---

## 4. COMMON USE CASES

### 4.1 Inside useForm

`useForm` uses this hook to know _what_ to edit/create.

```tsx
// Inside useForm
const { resource, id, formAction } = useResourceParams(props);

// If formAction === "edit", it fetches data for `id`.
// If formAction === "create", it starts empty.
```

### 4.2 Inside useTable

`useTable` uses this hook to know _what_ to list.

```tsx
// Inside useTable
const { resource } = useResourceParams(props);
// Fetches list for `resource`.
```

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useResourceParams } from "./index";

describe("useResourceParams", () => {
  it("should infer from URL", () => {
    // Mock URL: /posts/123
    const { result } = renderHook(() => useResourceParams());

    expect(result.current.resource.name).toBe("posts");
    expect(result.current.id).toBe("123");
  });

  it("should override with props", () => {
    // Mock URL: /posts/123
    const { result } = renderHook(() =>
      useResourceParams({
        resource: "users",
        id: 456,
      }),
    );

    expect(result.current.resource.name).toBe("users");
    expect(result.current.id).toBe(456);
  });

  it("should handle resource mismatch", () => {
    // Mock URL: /posts/123
    // Prop: resource="users" (no ID)
    const { result } = renderHook(() =>
      useResourceParams({
        resource: "users",
      }),
    );

    expect(result.current.resource.name).toBe("users");
    expect(result.current.id).toBeUndefined(); // Safety!
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Orchestrator**: Combines `useResource`, `useId`, `useAction`
- ✅ **Priority**: Props override URL
- ✅ **Validation**: Prevents invalid ID usage
- ✅ **Derived State**: Calculates `formAction`

### Khi nào dùng?

- Khi bạn cần biết **context hiện tại** (Resource, ID, Action) trong bất kỳ component nào.
- Khi viết custom hook cần hỗ trợ cả việc tự động lấy từ URL lẫn nhận tham số truyền vào.

### Remember

🧠 **The Brain** - Resolves context
🛡️ **Safe** - Checks resource mismatch
🎭 **Flexible** - Props > URL
