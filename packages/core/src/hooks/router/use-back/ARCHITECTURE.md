# Kiến trúc và Design Patterns của useBack Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          ROUTER NAVIGATION SYSTEM                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RouterContext (Router Integration)              │  │
│  │    ↓ provides                                    │  │
│  │    - back: () => () => void                      │  │
│  │      (Factory function for back navigation)      │  │
│  │         │                                         │  │
│  │         ↓ accessed via                           │  │
│  │                                                   │  │
│  │  useBack ✅ (THIS HOOK)                          │  │
│  │    → Navigate to previous page                   │  │
│  │         │                                         │  │
│  │         ├──→ ACCESSOR PATTERN:                   │  │
│  │         │     Access RouterContext.back           │  │
│  │         │                                         │  │
│  │         ├──→ ADAPTER PATTERN:                    │  │
│  │         │     Normalize router-specific API       │  │
│  │         │                                         │  │
│  │         ├──→ MEMOIZATION:                        │  │
│  │         │     Cache back function (useMemo)      │  │
│  │         │                                         │  │
│  │         └──→ NULL SAFETY:                        │  │
│  │               Fallback for missing router        │  │
│  │                                                   │  │
│  │  Similar hooks:                                  │  │
│  │    - useGo (navigate to specific path)           │  │
│  │    - useParsed (parse current route)             │  │
│  │    - useGetToPath (generate paths)               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide a router-agnostic way to navigate back to the previous page**

### 1.2 Browser History Navigation

```
┌──────────────────────────────────────────────────────────────┐
│         BROWSER HISTORY - How Back Navigation Works          │
└──────────────────────────────────────────────────────────────┘

History Stack:
┌────────────────┐
│ /posts/123     │ ← Current page
├────────────────┤
│ /posts         │ ← Previous page (back will go here)
├────────────────┤
│ /dashboard     │
├────────────────┤
│ /              │
└────────────────┘

User clicks "Back" button
           ↓
const back = useBack();
back();
           ↓
Router executes: history.back()
           ↓
Browser pops current page from stack
           ↓
┌────────────────┐
│ /posts         │ ← Now current
├────────────────┤
│ /dashboard     │
├────────────────┤
│ /              │
└────────────────┘

User is now on /posts ✅
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-back/index.tsx: 16 dòng** - Browser back navigation!

---

### 2.1 Accessor Pattern - RouterContext Access

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: TV Remote Control

```
TV System (Complex):
- Signal processing
- Channel tuner
- Display controller
- Sound processor
- Many internal systems

Remote Control (Simple):
- "Back" button
- Just calls TV's back function
- Don't need to know how TV works

useBack:

RouterContext (Complex):
- React Router integration
- History API
- Location tracking
- Route matching

useBack (Simple):
- "back" function
- Just calls router's back
- Don't need to know router internals
```

**Accessor Pattern** = Provide simple access to complex system functionality.

#### Implementation:

```typescript
// COMPLEX ROUTER CONTEXT:
const RouterContext = {
  back: () => () => {
    // Router-specific logic
    history.back();
    // Update location
    // Trigger callbacks
    // ...
  },
  // ... many other router methods
};

// SIMPLE ACCESSOR:
export const useBack = () => {
  const routerContext = useContext(RouterContext);
  const back = routerContext?.back?.() ?? (() => {});
  return back;
};

// USAGE (Clean):
const back = useBack();
back(); // Navigate back! ✅
```

#### Why This Pattern?

```typescript
// ❌ WITHOUT accessor (complex):
import { RouterContext } from "@contexts/router";

const Component = () => {
  const router = useContext(RouterContext);
  const handleBack = () => {
    if (router?.back) {
      const backFn = router.back();
      backFn();
    }
  };
  // Complex! ❌
};

// ✅ WITH accessor (simple):
import { useBack } from "@refinedev/core";

const Component = () => {
  const back = useBack();
  const handleBack = () => back();
  // Simple! ✅
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simple API** - One function to call
- ✅ **Encapsulation** - Hide router complexity
- ✅ **Consistent** - Same API across routers
- ✅ **Discoverable** - Easy to find hook

---

### 2.2 Adapter Pattern - Router Abstraction

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Universal Power Adapter

```
Different Countries:
- US: 110V outlets
- EU: 220V outlets
- UK: 230V outlets
- Different plugs!

Universal Adapter:
- Works with all outlets
- Provides same USB output
- Device doesn't care which country

useBack:

Different Routers:
- React Router: history.goBack()
- Next.js Router: router.back()
- Remix Router: navigate(-1)
- Different APIs!

useBack (Adapter):
- Works with all routers
- Provides same back() function
- Component doesn't care which router
```

**Adapter Pattern** = Make different interfaces compatible through common interface.

#### Implementation:

```typescript
// DIFFERENT ROUTER IMPLEMENTATIONS:

// React Router:
RouterContext.back = () => () => history.goBack();

// Next.js Router:
RouterContext.back = () => () => router.back();

// Remix:
RouterContext.back = () => () => navigate(-1);

// COMMON INTERFACE:
const back = useBack();
back(); // Works with any router! ✅

// Component doesn't need to know which router!
```

#### Router Independence:

```tsx
// SAME CODE WORKS WITH ANY ROUTER:
function BackButton() {
  const back = useBack();

  return <button onClick={back}>← Back</button>;

  // Works with:
  // - React Router ✅
  // - Next.js Router ✅
  // - Remix Router ✅
  // - Custom Router ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Router agnostic** - Works with any router
- ✅ **Portable** - Same code everywhere
- ✅ **Flexible** - Easy to switch routers
- ✅ **Future-proof** - New routers just need adapter

---

### 2.3 Memoization Pattern - Performance Optimization

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Speed Dial Contacts

```
Phone Without Speed Dial:
Every time you call Mom:
1. Open contacts
2. Search "Mom"
3. Find number
4. Dial
(Slow!)

Phone With Speed Dial:
First time: Search and save to speed dial
Later: Press 1 → Instant call!
(Fast!)

useBack Without Memo:
Every render:
1. Access context
2. Get back factory
3. Call factory
4. Get back function
(Slow!)

useBack With Memo:
First render: Create back function
Later renders: Reuse same function!
(Fast!)
```

**Memoization** = Cache expensive computation results for reuse.

#### Implementation:

```typescript
// WITHOUT MEMOIZATION (Creates new function every render):
export const useBack = () => {
  const routerContext = useContext(RouterContext);
  const back = routerContext?.back?.() ?? (() => {});
  return back; // New function every render! ❌
};

// WITH MEMOIZATION (Reuses function):
export const useBack = () => {
  const routerContext = useContext(RouterContext);

  const useBack = React.useMemo(
    () => routerContext?.back ?? (() => () => {}),
    [routerContext?.back], // Only recreate if this changes
  );

  const back = useBack();
  return back; // Same function if context unchanged! ✅
};
```

#### Performance Impact:

```tsx
// Component with back in dependency array:
function BackButton() {
  const back = useBack();

  useEffect(() => {
    console.log("Effect ran");
    // Without memo: Runs every render ❌
    // With memo: Runs only when back changes ✅
  }, [back]);

  return <button onClick={back}>Back</button>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid unnecessary recreations
- ✅ **Stable reference** - Same function across renders
- ✅ **Dependency arrays** - Won't trigger effects unnecessarily
- ✅ **Optimization** - Better React performance

---

### 2.4 Null Safety Pattern - Graceful Degradation

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Emergency Exit

```
Building With Emergency Exit:
- Door exists: Use it to exit
- Door missing: Show error message
- Better than: Crash building!

useBack:

Router Context Available:
- back exists: Return real back function
- back missing: Return no-op function
- Better than: Crash app!
```

**Null Safety** = Handle missing/null values gracefully without errors.

#### Implementation:

```typescript
export const useBack = () => {
  const routerContext = useContext(RouterContext);

  // DOUBLE FALLBACK:
  const useBack = React.useMemo(
    () =>
      routerContext?.back ?? // Try to get back factory
      (() => () => undefined), // Fallback to no-op
    [routerContext?.back],
  );

  const back = useBack(); // Always safe to call! ✅
  return back;
};
```

#### Null Safety Layers:

```typescript
// LAYER 1: Optional chaining
routerContext?.back;
// If routerContext is null/undefined → undefined ✅

// LAYER 2: Nullish coalescing
routerContext?.back ?? (() => () => undefined);
// If undefined → no-op factory ✅

// LAYER 3: Call factory
const back = useBack();
// If no-op factory → no-op function ✅

// RESULT: Always safe!
back(); // Never crashes! ✅
```

#### Real-World Scenarios:

```typescript
// SCENARIO 1: Router not initialized yet
// (During app initialization)
const back = useBack();
back(); // No-op, doesn't crash ✅

// SCENARIO 2: Router context missing
// (In tests without provider)
const back = useBack();
back(); // No-op, doesn't crash ✅

// SCENARIO 3: Custom router without back
// (Some custom implementation)
const back = useBack();
back(); // No-op, doesn't crash ✅

// SCENARIO 4: Normal router
const back = useBack();
back(); // Navigates back ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Robustness** - Doesn't crash
- ✅ **Testing** - Works without router provider
- ✅ **Compatibility** - Works with partial router implementations
- ✅ **Developer experience** - Safe to use anywhere

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường        | Giải quyết vấn đề gì  | Trong useBack                                       |
| --------------- | ----------------------- | --------------------- | --------------------------------------------------- |
| **Accessor**    | TV remote               | Access complex system | Get back function from RouterContext                |
| **Adapter**     | Universal power adapter | Different interfaces  | Works with any router (React Router, Next.js, etc.) |
| **Memoization** | Speed dial              | Cache results         | Reuse same back function across renders             |
| **Null Safety** | Emergency exit          | Handle missing values | Graceful fallback if router missing                 |

---

## 3. KEY FEATURES

### 3.1 Simple Function Return

```typescript
const back = useBack();

// Type: () => void
// Call to navigate back
back();
```

### 3.2 Router Agnostic

```typescript
// Works with any router:
// - React Router
// - Next.js Router
// - Remix Router
// - Custom routers

const back = useBack();
// Same API everywhere! ✅
```

### 3.3 Factory Pattern

```typescript
// RouterContext provides factory:
RouterContext.back = () => () => history.goBack();

// useBack calls factory:
const factory = routerContext.back; // Get factory
const back = factory(); // Call factory → get function
```

### 3.4 Safe to Call Anywhere

```typescript
// Even without router:
const back = useBack();
back(); // No error! ✅
```

---

## 4. COMMON USE CASES

### 4.1 Back Button in Header

```tsx
import { useBack } from "@refinedev/core";

function Header() {
  const back = useBack();

  return (
    <header>
      <button onClick={back}>← Back</button>
    </header>
  );
}
```

### 4.2 Cancel Form Action

```tsx
function EditForm() {
  const back = useBack();
  const { formProps } = useForm();

  const handleCancel = () => {
    if (confirm("Discard changes?")) {
      back(); // Go back to previous page
    }
  };

  return (
    <form {...formProps}>
      <button type="submit">Save</button>
      <button type="button" onClick={handleCancel}>
        Cancel
      </button>
    </form>
  );
}
```

### 4.3 Navigate Back After Action

```tsx
function DeleteButton({ id }) {
  const back = useBack();
  const { mutate } = useDelete();

  const handleDelete = () => {
    mutate(
      { resource: "posts", id },
      {
        onSuccess: () => {
          back(); // Go back after deletion
        },
      },
    );
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

### 4.4 Breadcrumb Navigation

```tsx
function Breadcrumb() {
  const back = useBack();

  return (
    <nav>
      <button onClick={back}>← Go Back</button>
    </nav>
  );
}
```

### 4.5 Mobile App Navigation

```tsx
function MobileHeader() {
  const back = useBack();

  return (
    <div className="mobile-header">
      <button className="back-icon" onClick={back}>
        <ChevronLeftIcon />
      </button>
      <h1>Edit Post</h1>
    </div>
  );
}
```

### 4.6 Keyboard Shortcut

```tsx
function KeyboardShortcuts() {
  const back = useBack();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Alt + Left Arrow = Back
      if (e.altKey && e.key === "ArrowLeft") {
        back();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [back]); // Safe dependency (memoized)
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Factory Pattern?

**Answer:** Router initialization timing

```typescript
// PROBLEM: Router might not be ready at hook definition time
// RouterContext.back = () => history.goBack();  // history not ready yet!

// SOLUTION: Factory returns function when called
RouterContext.back = () => () => history.goBack();
//                   ↑    ↑
//                   |    └─ Actual back function
//                   └────── Factory (called when needed)

// Hook calls factory at runtime (when router is ready):
const factory = routerContext.back;
const back = factory(); // Router is ready now! ✅
```

### 5.2 Why useMemo Dependency on routerContext?.back?

**Answer:** Detect router changes

```typescript
// Recreate back function only when router's back changes:
React.useMemo(
  () => routerContext?.back ?? (() => () => {}),
  [routerContext?.back], // Changes if router switches
);

// Scenarios:
// 1. Router not changed → Reuse same function ✅
// 2. Router switched → Create new function ✅
// 3. Router became available → Create real function ✅
```

### 5.3 Why Not Just Return routerContext.back()?

**Answer:** Null safety and consistent return type

```typescript
// ❌ UNSAFE:
return routerContext.back();
// What if routerContext is null? Crash! ❌
// What if back is undefined? Crash! ❌

// ✅ SAFE:
const useBack = routerContext?.back ?? (() => () => {});
const back = useBack();
return back;
// Always returns function ✅
// Safe to call ✅
```

### 5.4 Why Not useCallback Instead of useMemo?

**Answer:** Different purposes

```typescript
// useCallback: Memoize function definition
const back = useCallback(() => {
  history.goBack();
}, []);
// Creates new function ❌

// useMemo: Memoize function value
const back = useMemo(() => {
  return routerContext?.back?.();
}, [routerContext?.back]);
// Returns existing function ✅
// Don't create new, reuse router's function!
```

---

## 6. COMMON PITFALLS

### 6.1 Not Keeping back in Dependency Array

```typescript
// ❌ RISKY - Missing dependency
const Component = () => {
  const back = useBack();

  useEffect(() => {
    // Uses back but not in deps
    eventBus.on("cancel", back);
  }, []); // ❌ Missing [back]
};

// ✅ CORRECT - Include back
useEffect(() => {
  eventBus.on("cancel", back);
  return () => eventBus.off("cancel", back);
}, [back]); ✅
```

### 6.2 Calling Conditionally

```typescript
// ❌ WRONG - Conditional hook call
const Component = ({ showBack }) => {
  if (showBack) {
    const back = useBack(); // ❌ Conditional!
  }
};

// ✅ CORRECT - Always call, conditionally use
const Component = ({ showBack }) => {
  const back = useBack(); ✅

  return showBack ? <button onClick={back}>Back</button> : null;
};
```

### 6.3 Assuming History Exists

```typescript
// ❌ WRONG - Assuming can go back
const handleBack = () => {
  back(); // What if this is first page? ❌
};

// ✅ BETTER - Check history
const handleBack = () => {
  if (window.history.length > 1) {
    back();
  } else {
    navigate("/"); // Fallback
  }
};
```

---

## 7. BROWSER HISTORY API

### How back() Works Under the Hood

```typescript
// BROWSER HISTORY API:
window.history.back(); // Go back one page
window.history.forward(); // Go forward one page
window.history.go(-1); // Go back one page (same as back)
window.history.go(-2); // Go back two pages

// REFINE'S useBack:
const back = useBack();
back();
// ↓
// Router calls:
history.back(); // Or router-specific equivalent
```

### History Stack Example

```
User Journey:
1. Visit / → History: [/]
2. Click login → History: [/, /login]
3. Login success → History: [/, /login, /dashboard]
4. Click posts → History: [/, /login, /dashboard, /posts]

back() called:
History: [/, /login, /dashboard] ← posts removed
Current: /dashboard

back() called again:
History: [/, /login] ← dashboard removed
Current: /login
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useBack } from "@refinedev/core";
import { RouterContext } from "@contexts/router";

describe("useBack", () => {
  it("should return back function from router", () => {
    const mockBack = jest.fn();
    const mockRouter = {
      back: () => mockBack,
    };

    const wrapper = ({ children }) => (
      <RouterContext.Provider value={mockRouter}>
        {children}
      </RouterContext.Provider>
    );

    const { result } = renderHook(() => useBack(), { wrapper });

    result.current();
    expect(mockBack).toHaveBeenCalled();
  });

  it("should return no-op when router not available", () => {
    const wrapper = ({ children }) => (
      <RouterContext.Provider value={null}>{children}</RouterContext.Provider>
    );

    const { result } = renderHook(() => useBack(), { wrapper });

    expect(() => result.current()).not.toThrow();
  });

  it("should memoize back function", () => {
    const mockBack = jest.fn();
    const mockRouter = {
      back: () => mockBack,
    };

    const wrapper = ({ children }) => (
      <RouterContext.Provider value={mockRouter}>
        {children}
      </RouterContext.Provider>
    );

    const { result, rerender } = renderHook(() => useBack(), { wrapper });

    const firstBack = result.current;
    rerender();
    const secondBack = result.current;

    expect(firstBack).toBe(secondBack); // Same reference!
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Access RouterContext.back function
- ✅ **Adapter**: Works with any router implementation
- ✅ **Memoization**: Cache back function for performance
- ✅ **Null Safety**: Graceful fallback if router missing

### Key Features

1. **Simple API** - `const back = useBack(); back();`
2. **Router Agnostic** - Works with React Router, Next.js, Remix, etc.
3. **Performance** - Memoized stable reference
4. **Safe** - Never crashes, even without router
5. **Factory Pattern** - Handles router initialization timing

### Khi nào dùng useBack?

✅ **Nên dùng:**

- Back buttons in headers/toolbars
- Cancel actions in forms
- Breadcrumb navigation
- Mobile app navigation
- After successful mutations

❌ **Không dùng:**

- Need specific path → Use `useGo()`
- Need to go forward → Use router's forward
- Multiple steps back → Use `history.go(-n)`

### Browser Navigation

```
back() = history.back() = Go to previous page
```

### Remember

✅ **16 lines** - Ultra-minimal router accessor
🔑 **Accessor Pattern** - Get back from RouterContext
🔌 **Adapter Pattern** - Works with any router
💾 **Memoization** - Stable function reference
🛡️ **Null Safety** - Never crashes

---

> 📚 **Best Practice**: Use `useBack()` for **back buttons** and **cancel actions**. Always **include it in dependency arrays** (it's memoized, safe). For **specific navigation**, use `useGo()` instead. The hook is **router-agnostic** - works with **any router** Refine supports!
