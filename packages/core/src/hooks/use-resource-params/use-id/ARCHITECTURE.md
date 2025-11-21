# Kiến trúc và Design Patterns của useId Hook

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
│  │    → id: "123"                                   │  │
│  │         ↓                                         │  │
│  │  useId ✅ (THIS HOOK)                            │  │
│  │    → Input: id prop (optional)                   │  │
│  │    → Logic: Prop ?? URL ID                       │  │
│  │         │                                         │  │
│  │         ├──→ FALLBACK/PRIORITY PATTERN:          │  │
│  │         │     Prop overrides URL inference        │  │
│  │         │                                         │  │
│  │         └──→ COMPOSITION PATTERN:                │  │
│  │               Uses useParsed internally           │  │
│  │                                                   │  │
│  │    ↓ returns BaseKey ("123", 456, etc.)           │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useResourceParams (to determine id)         │  │
│  │    - Internal logic needing current record ID    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Determine the current record ID, prioritizing the explicitly passed prop over the inferred ID from the URL.**

### 1.2 Logic Flow

```
Input: id prop (e.g., 999 or undefined)

1. Get inferred ID from URL via useParsed()
   → inferredId = 123

2. Apply Priority Logic:
   If (prop is defined) → Return prop
   Else → Return inferredId

Example 1:
useId(999) → Returns 999 (Prop wins)

Example 2:
useId(undefined) → Returns 123 (URL fallback)
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-id/index.tsx: 16 dòng** - The ID Resolver!

---

### 2.1 Fallback/Priority Pattern - "Explicit over Implicit"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Mailing Address

```
Mailman: "Where should I deliver this?"

Scenario 1 (Explicit):
You write on the envelope: "Deliver to House #5"
Mailman delivers to: House #5. (Ignores where he is standing)

Scenario 2 (Implicit/Default):
You write nothing.
Mailman delivers to: The house he is currently standing in front of.

useId:
- If you say "Use ID 5" (Prop) → It uses 5.
- If you say nothing (undefined) → It looks at the URL (Current location).
```

**Fallback/Priority Pattern** = Prefer a specific, explicit value. If missing, fall back to a general, implicit value.

#### Implementation:

```typescript
export const useId = (id?: BaseKey) => {
  const parsed = useParsed();

  // The Core Logic:
  return id ?? parsed.id;
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Allows components to work with a specific record regardless of the URL.
  - Example: A `<EditButton id={5}>` on a "List" page needs to edit ID 5, not the "list" page ID (which is undefined).
- ✅ **Robustness** - Always tries to provide _some_ ID, even if not explicitly passed.

---

### 2.2 Composition Pattern - Building on Basics

#### 🧱 VÍ DỤ ĐỜI THƯỜNG: Lego Bricks

```
Brick 1: useParsed (Knows how to read URL)
Brick 2: useId (Knows how to decide priority)

useId sits on top of useParsed.
It doesn't re-implement URL parsing. It just uses the existing tool.
```

**Composition Pattern** = Using existing hooks to build new, more specific functionality.

---

## 3. KEY FEATURES

### 3.1 Internal Usage

This hook is marked `@internal`. It is primarily used by other Refine hooks (like `useResourceParams`) to standardize how the "current record ID" is determined.

### 3.2 Nullish Coalescing

Uses the `??` operator to ensure that only `null` or `undefined` triggers the fallback.
_Note: `0` is a valid ID, so `||` would be incorrect here._

```typescript
// Correct (??):
useId(0) → Returns 0

// Incorrect (||):
// 0 || 123 → Returns 123 (Wrong!)
```

---

## 4. COMMON USE CASES

### 4.1 Inside useResourceParams

```typescript
// Simplified usage inside useResourceParams
const useResourceParams = (props) => {
  // ...
  const id = useId(props.id);
  // ...
};
```

If the developer passes `id` to `useResourceParams`, it's used. Otherwise, it's inferred from the URL.

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useId } from "./index";

// Mock useParsed
jest.mock("../../router/use-parsed", () => ({
  useParsed: () => ({ id: 123 }),
}));

describe("useId", () => {
  it("should return prop if provided", () => {
    const { result } = renderHook(() => useId(999));
    expect(result.current).toBe(999);
  });

  it("should return inferred ID if prop is undefined", () => {
    const { result } = renderHook(() => useId(undefined));
    expect(result.current).toBe(123);
  });

  it("should return 0 if prop is 0", () => {
    const { result } = renderHook(() => useId(0));
    expect(result.current).toBe(0);
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Fallback/Priority**: Prop > URL
- ✅ **Composition**: Uses `useParsed`

### Khi nào dùng?

- **Internal Development**: Khi bạn đang viết một hook mới cho Refine và cần xác định ID hiện tại (ưu tiên tham số truyền vào).
- **Advanced Users**: Hiếm khi cần dùng trực tiếp trong ứng dụng. Thường dùng `useResourceParams` thay thế.

### Remember

✅ **Tiny** - 16 lines
⚖️ **Prioritizes** - Prop over URL
🔢 **Handles 0** - Uses `??` correctly
