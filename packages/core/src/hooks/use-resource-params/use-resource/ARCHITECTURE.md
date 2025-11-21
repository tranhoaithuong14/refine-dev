# Kiến trúc và Design Patterns của useResource Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │               RESOURCE RESOLUTION LAYER           │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  ResourceContext (List of all resources)         │  │
│  │         ↓                                         │  │
│  │  useResource ✅ (THIS HOOK)                      │  │
│  │    ↓                                             │  │
│  │    ├──→ SELECTOR PATTERN:                        │  │
│  │    │     Finds specific resource in the list      │  │
│  │    │                                             │  │
│  │    ├──→ FALLBACK/INFERENCE PATTERN:              │  │
│  │    │     Arg provided? Use it.                    │  │
│  │    │     No arg? Use URL (useParsed).             │  │
│  │    │                                             │  │
│  │    └──→ FACTORY PATTERN (select function):       │  │
│  │          Returns a tool to find other resources   │  │
│  │                                                   │  │
│  │    ↓ returns                                      │  │
│  │                                                   │  │
│  │  {                                               │  │
│  │    resource: { name: "posts", ... },             │  │
│  │    identifier: "posts",                          │  │
│  │    resources: [...],                             │  │
│  │    select: (name) => { ... }                     │  │
│  │  }                                               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Find and return the correct Resource Object based on an identifier (from arguments) or the current URL.**

### 1.2 Logic Flow

```
Input: identifier argument (optional)

1. Get all resources from Context.
2. Get current route params from useParsed().

3. Decision Tree:
   IF (identifier is provided)
      → Search resources list for matching name/identifier.
      → IF found: Return it.
      → IF NOT found: Return a "mock" resource with that name.

   ELSE IF (URL has resource param)
      → Return the resource object from useParsed().

   ELSE
      → Return undefined.
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-resource/index.ts: 114 dòng** - The Resource Finder!

---

### 2.1 Selector Pattern - "Find in List"

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Phonebook

```
Phonebook (ResourceContext):
- List of 1000 names and numbers.

You (useResource):
- "Give me the number for 'John Doe'."

Selector:
- Scans the list.
- Finds 'John Doe'.
- Returns the details.
```

**Selector Pattern** = Logic to extract/select specific data from a larger dataset.

#### Implementation:

```typescript
// Helper function used internally
const pickedResource = pickResource(identifier, resources);
```

---

### 2.2 Fallback/Inference Pattern - "Smart Defaults"

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: ID Card Check

```
Security Guard: "Who are you?"

Scenario 1 (Explicit):
You hand over your ID card.
Guard: "Okay, you are Mr. Smith."

Scenario 2 (Implicit):
You are wearing a name tag "Visitor".
Guard: "I see your tag. You are a Visitor."

useResource:
- useResource("posts") → Explicitly asks for "posts".
- useResource() → Looks at the URL (Name tag) to figure it out.
```

**Fallback Pattern** = If primary input is missing, use secondary context.

#### Implementation:

```typescript
if (identifier) {
  // Use argument
  resource = pickResource(identifier, resources);
} else if (params?.resource) {
  // Use URL
  resource = params.resource;
}
```

---

### 2.3 Factory Pattern - The `select` Function

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Vending Machine

```
useResource returns a `select` function.

`select` is like a mini-vending machine you carry around.
Whenever you need another resource, you just ask `select("users")`.
```

**Factory Pattern** = A function that creates/returns objects (in this case, finding resource objects).

#### Implementation:

```typescript
const select = (resourceName, force) => {
  // Logic to find and return a resource object
  return { resource: ... };
};

return { select, ... };
```

---

### 2.4 Overloading Pattern (TypeScript)

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: Swiss Army Knife Blades

```
Blade 1 (No args):
- useResource()
- Returns: { resource: IResourceItem | undefined } (Might be undefined)

Blade 2 (With arg):
- useResource("posts")
- Returns: { resource: IResourceItem } (Definitely defined - or mock)
```

**Overloading** = Defining multiple signatures for the same function to handle different input/output types safely.

---

## 3. KEY FEATURES

### 3.1 "Mock" Resource Fallback

If you ask for `useResource("unknown_table")` and it's NOT in the `<Refine>` config, the hook doesn't crash. It creates a temporary "mock" resource object:

```javascript
{
  name: "unknown_table",
  identifier: "unknown_table"
}
```

This allows Refine to work even with dynamic resources not known at build time.

### 3.2 `select` Helper

Very useful when you are on one page (e.g., Posts) but need data about another resource (e.g., Users).

```tsx
const { select } = useResource();
const { resource: userResource } = select("users");
```

---

## 4. COMMON USE CASES

### 4.1 Getting Current Resource

```tsx
const MyComponent = () => {
  const { resource } = useResource();

  return <h1>Current Resource: {resource?.name}</h1>;
};
```

### 4.2 Getting Specific Resource

```tsx
const MyComponent = () => {
  const { resource } = useResource("posts");

  return <div>Link to: {resource.list}</div>;
};
```

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useResource } from "./index";

describe("useResource", () => {
  it("should infer from URL", () => {
    // Mock URL: /posts
    const { result } = renderHook(() => useResource());
    expect(result.current.resource.name).toBe("posts");
  });

  it("should find by name", () => {
    const { result } = renderHook(() => useResource("users"));
    expect(result.current.resource.name).toBe("users");
  });

  it("should return mock for unknown", () => {
    const { result } = renderHook(() => useResource("ghosts"));
    expect(result.current.resource.name).toBe("ghosts");
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Selector**: Finds item in list
- ✅ **Fallback**: URL inference
- ✅ **Factory**: `select` helper
- ✅ **Overloading**: Type-safe signatures

### Khi nào dùng?

- Khi bạn cần **thông tin chi tiết** về một resource (label, route, icon, v.v.).
- Khi bạn cần tìm resource khác resource hiện tại.

### Remember

🔍 **Finder** - Locates resources
🧠 **Smart** - Infers from URL
🏭 **Toolbox** - Provides `select` function
