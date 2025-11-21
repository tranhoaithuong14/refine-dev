# Kiến trúc và Design Patterns của useRouterMisuseWarning Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            DEVELOPER EXPERIENCE (DX)              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  <Refine routerProvider={...} />                 │  │
│  │         ↓                                         │  │
│  │                                                   │  │
│  │  useRouterMisuseWarning ✅ (THIS HOOK)           │  │
│  │    → Validates routerProvider prop               │  │
│  │         │                                         │  │
│  │         ├──→ SIDE EFFECT PATTERN:                │  │
│  │         │     No return value, just warning       │  │
│  │         │                                         │  │
│  │         ├──→ SINGLETON/FLAG PATTERN:             │  │
│  │         │     Warn only once (useRef)            │  │
│  │         │                                         │  │
│  │         └──→ VALIDATOR PATTERN:                  │  │
│  │               Checks for legacy props            │  │
│  │                                                   │  │
│  │    ↓ if invalid                                   │  │
│  │                                                   │  │
│  │  Console Warning:                                │  │
│  │  "Unsupported properties found...                │  │
│  │   You may wanted to use legacyRouterProvider"    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Detect and warn about incorrect usage of the `routerProvider` prop (specifically legacy router objects).**

### 1.2 Validation Logic

```
Input: routerProvider object

Allowed Keys (New Router):
- go
- back
- parse
- Link

Legacy Keys (Old Router):
- push
- replace
- prompt
- etc...

Logic:
If object has keys NOT in Allowed Keys
→ Trigger Warning!
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-router-misuse-warning/index.ts: 19 dòng** - DX Guard!

---

### 2.1 Side Effect Hook Pattern

#### ⚠️ VÍ DỤ ĐỜI THƯỜNG: Security Guard

```
Normal Employee (Standard Hook):
- Do work
- Produce result (Return value)

Security Guard (Side Effect Hook):
- Watch people
- Yell if something wrong (Console warn)
- Doesn't produce a product (No return value)

useRouterMisuseWarning:
- Watches routerProvider
- Warns if invalid
- Returns nothing (void)
```

**Side Effect Hook** = Hook that performs actions (effects) but returns no data.

#### Implementation:

```typescript
export const useRouterMisuseWarning = (value?: RouterProvider) => {
  // ... logic ...

  React.useEffect(() => {
    // ... warning logic ...
  }, [value]);

  // NO RETURN STATEMENT!
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Separation** - Keeps validation logic out of main render
- ✅ **Passive** - Doesn't affect component rendering
- ✅ **DX** - Improves developer experience without runtime cost

---

### 2.2 Singleton/Flag Pattern - Warn Once

#### 🛑 VÍ DỤ ĐỜI THƯỜNG: "Wet Floor" Sign

```
Janitor:
1. Sees wet floor
2. Puts up sign ONCE
3. Doesn't put up 100 signs for every person walking by

Hook:
1. Sees invalid prop
2. Warns ONCE
3. Doesn't warn on every re-render
```

**Singleton/Flag Pattern** = Ensure action happens only once.

#### Implementation:

```typescript
export const useRouterMisuseWarning = (value?: RouterProvider) => {
  // FLAG: Track if we already warned
  const warned = React.useRef(false);

  React.useEffect(() => {
    // CHECK FLAG:
    if (warned.current === false) {
      if (shouldWarn(value)) {
        console.warn("...");

        // SET FLAG:
        warned.current = true;
      }
    }
  }, [value]);
};
```

#### Why useRef?

```typescript
// useRef value persists across renders but doesn't trigger re-render!
// Perfect for flags!

// ❌ useState: Triggers re-render (unnecessary)
// ❌ Variable: Resets on re-render (warns loop)
// ✅ useRef: Persists, silent
```

#### 💡 TẠI SAO quan trọng?

- ✅ **No Spam** - Keeps console clean
- ✅ **Performance** - Avoids repeated checks/logging
- ✅ **User Experience** - One clear message

---

### 2.3 Validator Pattern - Schema Checking

#### 📋 VÍ DỤ ĐỜI THƯỜNG: Airport Baggage Sizer

```
Baggage Sizer:
- Allowed dimensions: 50x40x20
- Your bag: 60x40x20
- Result: REJECTED (Too big)

Validator:
- Allowed keys: go, back, parse, Link
- Your object: { push, replace }
- Result: WARNING (Legacy keys)
```

**Validator Pattern** = Check input against defined rules.

#### Implementation (in helper):

```typescript
const bindings = ["go", "parse", "back", "Link"];

const otherProps = Object.keys(value).filter((key) => !bindings.includes(key));

if (otherProps.length > 0) {
  // Invalid keys found!
  return true; // Should warn
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Guidance** - Tells user exactly what's wrong
- ✅ **Migration** - Helps users upgrade from v3 to v4
- ✅ **Safety** - Prevents silent failures

---

## 3. KEY FEATURES

### 3.1 Legacy Detection

Detects if a user is trying to use the old router interface with the new `routerProvider` prop.

```tsx
// ❌ WRONG (Legacy Router Object):
<Refine
  routerProvider={{
    push: () => ...,    // Legacy!
    replace: () => ...  // Legacy!
  }}
/>
// → Warning: "Unsupported properties... use legacyRouterProvider"

// ✅ CORRECT (New Router Object):
<Refine
  routerProvider={{
    go: () => ...,
    back: () => ...
  }}
/>
// → No Warning
```

### 3.2 Fail Soft

The hook **only warns**. It does **not** throw an error or crash the app. This allows the app to potentially still work (if the router happens to be compatible enough) or at least fail gracefully.

---

## 4. ARCHITECTURE DECISIONS

### 4.1 Why a Hook?

**Answer:** Lifecycle management.
We need to check when the component mounts or when the prop changes. `useEffect` is the standard React way to do this.

### 4.2 Why Separate Helper Function?

**Answer:** Testability and Purity.
The `checkRouterPropMisuse` function is a pure function (mostly, except console.warn). It can be unit tested easily without rendering a React component.

### 4.3 Why useRef instead of Global Variable?

**Answer:** Component Scoping.
If we used a global variable, the warning might be suppressed for _other_ instances of `<Refine />` (though usually there's only one). `useRef` scopes the flag to this specific component instance.

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useRouterMisuseWarning } from "./index";

describe("useRouterMisuseWarning", () => {
  it("should warn if legacy props are present", () => {
    const spy = jest.spyOn(console, "warn");

    const legacyRouter = {
      push: () => {},
      replace: () => {},
    };

    renderHook(() => useRouterMisuseWarning(legacyRouter));

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Unsupported properties"),
    );
  });

  it("should NOT warn for valid router", () => {
    const spy = jest.spyOn(console, "warn");

    const validRouter = {
      go: () => {},
      back: () => {},
      parse: () => {},
      Link: () => null,
    };

    renderHook(() => useRouterMisuseWarning(validRouter));

    expect(spy).not.toHaveBeenCalled();
  });

  it("should warn only once", () => {
    const spy = jest.spyOn(console, "warn");
    const legacyRouter = { push: () => {} };

    const { rerender } = renderHook(
      ({ router }) => useRouterMisuseWarning(router),
      { initialProps: { router: legacyRouter } },
    );

    rerender({ router: legacyRouter });

    expect(spy).toHaveBeenCalledTimes(1); // Only once!
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Side Effect Hook**: Performs action without return value
- ✅ **Singleton/Flag**: Ensures warning happens once
- ✅ **Validator**: Checks keys against allowed list
- ✅ **Fail Soft**: Warns instead of crashing

### Khi nào dùng?

Hook này được dùng nội bộ trong `<Refine />` component để cải thiện Developer Experience (DX). Developer bình thường không cần gọi hook này thủ công.

### Remember

✅ **19 lines** - Simple DX guard
⚠️ **Console Warning** - The output
🛑 **Warn Once** - The behavior
📋 **Key Check** - The logic
