# Kiến trúc và Design Patterns của useAction Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              INTERNAL HELPER LAYER                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  URL: /posts/show/123                            │  │
│  │         ↓                                         │  │
│  │  useParsed                                       │  │
│  │    → action: "show"                              │  │
│  │         ↓                                         │  │
│  │  useAction ✅ (THIS HOOK)                        │  │
│  │    → Input: action prop (optional)               │  │
│  │    → Logic: Prop ?? URL Action                   │  │
│  │         │                                         │  │
│  │         ├──→ FALLBACK/PRIORITY PATTERN:          │  │
│  │         │     Prop overrides URL inference        │  │
│  │         │                                         │  │
│  │         └──→ COMPOSITION PATTERN:                │  │
│  │               Uses useParsed internally           │  │
│  │                                                   │  │
│  │    ↓ returns Action ("show", "edit", etc.)        │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useResourceParams (to determine action)     │  │
│  │    - Internal logic needing current action       │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Determine the current action, prioritizing the explicitly passed prop over the inferred action from the URL.**

### 1.2 Logic Flow

```
Input: action prop (e.g., "create" or undefined)

1. Get inferred action from URL via useParsed()
   → inferredAction = "list"

2. Apply Priority Logic:
   If (prop is defined) → Return prop
   Else → Return inferredAction

Example 1:
useAction("create") → Returns "create" (Prop wins)

Example 2:
useAction(undefined) → Returns "list" (URL fallback)
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-action/index.tsx: 16 dòng** - The Decision Maker!

---

### 2.1 Fallback/Priority Pattern - "Explicit over Implicit"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Ordering Food

```
Waiter: "What do you want to eat?"

Scenario 1 (Explicit):
You: "I want the Steak."
Waiter writes: Steak. (Ignores the daily special)

Scenario 2 (Implicit/Default):
You: "I'll have the daily special."
Waiter writes: Fish (Today's special).

useAction:
- If you say "I want 'create' action" (Prop) → It uses 'create'.
- If you say nothing (undefined) → It looks at the URL (Daily special).
```

**Fallback/Priority Pattern** = Prefer a specific, explicit value. If missing, fall back to a general, implicit value.

#### Implementation:

```typescript
export const useAction = (action?: Action) => {
  const parsed = useParsed();

  // The Core Logic:
  return action ?? parsed.action;
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Allows components to override the URL.
  - Example: A `<CreateButton>` on a "List" page needs to know it's for "create", even though the URL is "list".
- ✅ **Robustness** - Always tries to provide _some_ action, even if not explicitly passed.

---

### 2.2 Composition Pattern - Building on Basics

#### 🧱 VÍ DỤ ĐỜI THƯỜNG: Lego Bricks

```
Brick 1: useParsed (Knows how to read URL)
Brick 2: useAction (Knows how to decide priority)

useAction sits on top of useParsed.
It doesn't re-implement URL parsing. It just uses the existing tool.
```

**Composition Pattern** = Using existing hooks to build new, more specific functionality.

---

## 3. KEY FEATURES

### 3.1 Internal Usage

This hook is marked `@internal`. It is primarily used by other Refine hooks (like `useResourceParams`) to standardize how the "current action" is determined.

### 3.2 Nullish Coalescing

Uses the `??` operator to ensure that only `null` or `undefined` triggers the fallback.

---

## 4. COMMON USE CASES

### 4.1 Inside useResourceParams

```typescript
// Simplified usage inside useResourceParams
const useResourceParams = (props) => {
  // ...
  const action = useAction(props.action);
  // ...
};
```

If the developer passes `action` to `useResourceParams`, it's used. Otherwise, it's inferred from the URL.

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useAction } from "./index";

// Mock useParsed
jest.mock("../../router/use-parsed", () => ({
  useParsed: () => ({ action: "list" }),
}));

describe("useAction", () => {
  it("should return prop if provided", () => {
    const { result } = renderHook(() => useAction("create"));
    expect(result.current).toBe("create");
  });

  it("should return inferred action if prop is undefined", () => {
    const { result } = renderHook(() => useAction(undefined));
    expect(result.current).toBe("list");
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Fallback/Priority**: Prop > URL
- ✅ **Composition**: Uses `useParsed`

### Khi nào dùng?

- **Internal Development**: Khi bạn đang viết một hook mới cho Refine và cần xác định action hiện tại (ưu tiên tham số truyền vào).
- **Advanced Users**: Hiếm khi cần dùng trực tiếp trong ứng dụng. Thường dùng `useResourceParams` thay thế.

### Remember

✅ **Tiny** - 16 lines
⚖️ **Prioritizes** - Prop over URL
🔒 **Internal** - Helper hook
