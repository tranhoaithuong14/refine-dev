# Kiến trúc và Design Patterns của useWarnAboutChange Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │       UNSAVED CHANGES WARNING SYSTEM              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RefineContext (Global Config)                   │  │
│  │    ↓ provides                                    │  │
│  │    - warnWhenUnsavedChanges: boolean             │  │
│  │      (Feature enabled/disabled globally)         │  │
│  │                                                   │  │
│  │  UnsavedWarnContext (Runtime State)              │  │
│  │    ↓ provides                                    │  │
│  │    - warnWhen: boolean                           │  │
│  │      (Currently warning active?)                 │  │
│  │    - setWarnWhen: (value: boolean) => void       │  │
│  │      (Enable/disable warning)                    │  │
│  │         │                                         │  │
│  │         ↓ both accessed via                      │  │
│  │                                                   │  │
│  │  useWarnAboutChange ✅ (THIS HOOK)               │  │
│  │    → Combines global config + runtime state      │  │
│  │         │                                         │  │
│  │         ├──→ ACCESSOR PATTERN:                   │  │
│  │         │     Access 2 separate contexts          │  │
│  │         │                                         │  │
│  │         ├──→ COMPOSITE PATTERN:                  │  │
│  │         │     Combine config + state in one API  │  │
│  │         │                                         │  │
│  │         ├──→ STATE MANAGEMENT:                   │  │
│  │         │     warnWhen state + setter             │  │
│  │         │                                         │  │
│  │         └──→ GUARD PATTERN:                      │  │
│  │               Prevent navigation with unsaved data│  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useForm (sets warnWhen when form is dirty)  │  │
│  │    - Router guards (check warnWhen before nav)   │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Manage unsaved changes warning by combining global configuration with runtime state**

### 1.2 Complete Flow - Unsaved Changes Warning

```
┌──────────────────────────────────────────────────────────────┐
│         USER ACTION: Edit Form Without Saving                │
└──────────────────────────────────────────────────────────────┘

User opens edit form
           ↓
Form loads initial values
           ↓
User starts typing
           ↓
Form becomes "dirty" (has unsaved changes)
           ↓
useForm detects change:
  const { setWarnWhen, warnWhenUnsavedChanges } = useWarnAboutChange();
  setWarnWhen(warnWhenUnsavedChanges);  // ← Enable warning
           ↓
warnWhen = true (if feature enabled globally)
           ↓
══════════════════════════════════════════════════════════════
│         USER TRIES TO LEAVE PAGE                            │
══════════════════════════════════════════════════════════════
           ↓
Browser checks: window.onbeforeunload
           ↓
Refine router guard checks: warnWhen === true?
           ↓
    YES → Show warning dialog:
    ┌────────────────────────────────────┐
    │  You have unsaved changes!         │
    │  Are you sure you want to leave?   │
    │                                    │
    │  [Stay on Page]  [Leave Anyway]   │
    └────────────────────────────────────┘
           ↓
    User clicks "Stay" → Navigation cancelled ✅
    User clicks "Leave" → Navigation proceeds ❌ (data lost)

══════════════════════════════════════════════════════════════
│         USER SAVES FORM                                      │
══════════════════════════════════════════════════════════════
           ↓
useForm onSuccess:
  setWarnWhen(false);  // ← Disable warning
           ↓
warnWhen = false
           ↓
User can now navigate freely ✅
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useWarnAboutChange/index.ts: 81 dòng** - Unsaved changes guard!

---

### 2.1 Accessor Pattern - Dual Context Access

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Hotel Room Service

```
Hotel Systems:

Front Desk (RefineContext):
- Room service enabled? (global policy)
- YES/NO for entire hotel

Room Control Panel (UnsavedWarnContext):
- Service requested for THIS room?
- Current request status
- Request/cancel button

useWarnAboutChange:

RefineContext (Global):
- warnWhenUnsavedChanges: boolean
- Feature enabled for app?

UnsavedWarnContext (Runtime):
- warnWhen: boolean
- Warning active NOW?
- setWarnWhen: function
- Enable/disable function

Hook accesses BOTH!
```

**Accessor Pattern** = Access multiple data sources through single interface.

#### Implementation:

```typescript
export const useWarnAboutChange = () => {
  // ACCESS 1: Global config
  const { warnWhenUnsavedChanges } = useContext(RefineContext);

  // ACCESS 2: Runtime state
  const { warnWhen, setWarnWhen } = useContext(UnsavedWarnContext);

  // COMBINE: Return both in one object
  return {
    warnWhenUnsavedChanges, // Config
    warnWhen, // State
    setWarnWhen, // Setter
  };
};
```

#### Why Access Both?

```typescript
// GLOBAL CONFIG (warnWhenUnsavedChanges):
<Refine warnWhenUnsavedChanges={true}>
  {/* Feature enabled app-wide */}
</Refine>

// RUNTIME STATE (warnWhen):
// Changes during app usage:
// - false → User hasn't edited anything
// - true → User edited form, has unsaved changes

// LOGIC:
if (warnWhenUnsavedChanges && warnWhen) {
  // Both config enabled AND currently has unsaved changes
  showWarning(); ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Single API** - One hook for related data
- ✅ **Consistent** - Same hook everywhere
- ✅ **Complete** - Get config + state together
- ✅ **Convenient** - Don't call 2 hooks separately

---

### 2.2 Composite Pattern - Combine Config + State

#### 🎛️ VÍ DỤ ĐỜI THƯỜNG: Car Alarm System

```
Car Alarm:

Master Switch (Config):
- Alarm system installed? (warnWhenUnsavedChanges)
- YES (factory option) or NO

Current State (Runtime):
- Alarm armed NOW? (warnWhen)
- YES (after locking car) or NO

Logic:
- Master OFF → Alarm never triggers (even if armed)
- Master ON + Armed → Alarm triggers if door opened
- Master ON + Disarmed → Alarm doesn't trigger

useWarnAboutChange:

warnWhenUnsavedChanges (Master):
- Feature enabled globally?
- Set once at app start

warnWhen (Current):
- Warning active now?
- Changes during usage

Combined logic:
if (warnWhenUnsavedChanges && warnWhen) {
  showWarning();
}
```

**Composite Pattern** = Combine multiple related values into single cohesive interface.

#### Implementation:

```typescript
// SEPARATED (Complex):
const { warnWhenUnsavedChanges } = useRefineContext();
const { warnWhen, setWarnWhen } = useUnsavedWarnContext();

if (warnWhenUnsavedChanges && warnWhen) { ... }
// Need to remember both! ❌

// COMBINED (Simple):
const { warnWhenUnsavedChanges, warnWhen, setWarnWhen } = useWarnAboutChange();

if (warnWhenUnsavedChanges && warnWhen) { ... }
// All in one! ✅
```

#### Real Usage:

```tsx
function useForm() {
  const { warnWhenUnsavedChanges, warnWhen, setWarnWhen } =
    useWarnAboutChange();

  // When form becomes dirty:
  const handleChange = () => {
    setFormDirty(true);

    if (warnWhenUnsavedChanges) {
      setWarnWhen(true); // Enable warning
    }
  };

  // When form saves successfully:
  const onSuccess = () => {
    setWarnWhen(false); // Disable warning
  };

  // Check before navigation:
  const canNavigate = !warnWhen || !warnWhenUnsavedChanges;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Cohesive** - Related values together
- ✅ **Simple** - One hook call
- ✅ **Clear** - Purpose obvious
- ✅ **Maintainable** - Changes in one place

---

### 2.3 State Management Pattern - warnWhen State

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Door Lock Indicator

```
Front Door:

Lock Mechanism:
- Can be locked/unlocked
- State changes when you use key

Indicator Light:
- RED: Door locked
- GREEN: Door unlocked
- Changes based on lock state

warnWhen State:

Value:
- true: Warning active
- false: Warning inactive

Setter:
- setWarnWhen(true): Activate warning
- setWarnWhen(false): Deactivate warning

Indicator:
- Shows warning dialog if true
- Allows navigation if false
```

**State Management** = Track and update mutable state over time.

#### Implementation:

```typescript
// STATE DEFINED IN CONTEXT:
const [warnWhen, setWarnWhen] = useState(false);

// ACCESSED VIA HOOK:
const { warnWhen, setWarnWhen } = useWarnAboutChange();

// STATE LIFECYCLE:
// 1. Initial: false
setWarnWhen(false);

// 2. User edits form: true
setWarnWhen(true);

// 3. User saves: false
setWarnWhen(false);

// 4. User edits again: true
setWarnWhen(true);

// 5. User cancels: false
setWarnWhen(false);
```

#### State Transitions:

```
Initial State: warnWhen = false
     ↓
User types in form
     ↓
setWarnWhen(true)
     ↓
State: warnWhen = true ← Warning active!
     ↓
     ┌─────────────────────────┐
     ↓                         ↓
User saves form          User cancels
     ↓                         ↓
setWarnWhen(false)       setWarnWhen(false)
     ↓                         ↓
State: warnWhen = false ← Warning inactive!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Dynamic** - State changes during usage
- ✅ **Controlled** - Explicit state updates
- ✅ **Reactive** - UI responds to state
- ✅ **Testable** - Easy to test state changes

---

### 2.4 Guard Pattern - Navigation Protection

#### 🚧 VÍ DỤ ĐỜI THƯỜNG: Construction Site Gate

```
Construction Site:

Gate Guard:
- Checks: Do you have safety gear?
- YES → Enter
- NO → Can't enter, go get gear

useWarnAboutChange Guard:

Router Guard:
- Checks: warnWhen === true?
- YES → Show warning dialog
- NO → Allow navigation

Logic:
if (warnWhen) {
  const confirmed = showDialog("Unsaved changes! Leave anyway?");
  if (!confirmed) {
    preventNavigation(); ✅
  }
}
```

**Guard Pattern** = Check condition before allowing action to proceed.

#### Implementation:

```typescript
// BROWSER GUARD (beforeunload):
useEffect(() => {
  const { warnWhen, warnWhenUnsavedChanges } = useWarnAboutChange();

  if (warnWhen && warnWhenUnsavedChanges) {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "You have unsaved changes!";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }
}, [warnWhen, warnWhenUnsavedChanges]);

// ROUTER GUARD (internal navigation):
const navigate = (path: string) => {
  const { warnWhen } = useWarnAboutChange();

  if (warnWhen) {
    const confirmed = window.confirm("You have unsaved changes! Leave anyway?");
    if (!confirmed) {
      return; // ← GUARD: Prevent navigation!
    }
  }

  history.push(path);
};
```

#### Guard Scenarios:

```typescript
// SCENARIO 1: No unsaved changes
warnWhen = false
→ Navigate freely ✅

// SCENARIO 2: Has unsaved changes
warnWhen = true
→ Show warning dialog
→ User clicks "Stay" → Navigation prevented ✅
→ User clicks "Leave" → Navigation allowed ⚠️

// SCENARIO 3: Feature disabled
warnWhenUnsavedChanges = false
→ Navigate freely (even if warnWhen = true) ✅

// SCENARIO 4: Both enabled
warnWhenUnsavedChanges = true && warnWhen = true
→ Show warning dialog ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Data protection** - Prevent accidental data loss
- ✅ **User control** - User decides to stay/leave
- ✅ **Safety net** - Catch navigation attempts
- ✅ **UX** - Better user experience

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern              | Ví dụ đời thường    | Giải quyết vấn đề gì     | Trong useWarnAboutChange                                      |
| -------------------- | ------------------- | ------------------------ | ------------------------------------------------------------- |
| **Accessor**         | Hotel room service  | Access multiple contexts | Get config from RefineContext + state from UnsavedWarnContext |
| **Composite**        | Car alarm system    | Combine related values   | Merge global config + runtime state in one API                |
| **State Management** | Door lock indicator | Track mutable state      | warnWhen state + setWarnWhen setter                           |
| **Guard**            | Construction gate   | Protect action           | Prevent navigation with unsaved changes                       |

---

## 3. KEY FEATURES

### 3.1 Three Return Values

```typescript
const {
  warnWhenUnsavedChanges, // boolean - Global config
  warnWhen, // boolean - Current state
  setWarnWhen, // function - State setter
} = useWarnAboutChange();
```

### 3.2 Global Configuration

```typescript
<Refine warnWhenUnsavedChanges={true}>
  <App />
</Refine>

// All forms respect this setting
```

### 3.3 Runtime State Control

```typescript
// Enable warning:
setWarnWhen(true);

// Disable warning:
setWarnWhen(false);
```

### 3.4 Safe Fallbacks

```typescript
// If context not available:
warnWhen: Boolean(warnWhen); // → false (not undefined)
setWarnWhen: setWarnWhen ?? (() => {}); // → no-op function
```

---

## 4. COMMON USE CASES

### 4.1 Enable Warning When Form Dirty

```tsx
import { useWarnAboutChange } from "@refinedev/core";

function MyForm() {
  const { warnWhenUnsavedChanges, setWarnWhen } = useWarnAboutChange();
  const [isDirty, setIsDirty] = useState(false);

  const handleChange = () => {
    setIsDirty(true);

    if (warnWhenUnsavedChanges) {
      setWarnWhen(true); // Enable warning
    }
  };

  return <input onChange={handleChange} />;
}
```

### 4.2 Disable Warning After Save

```tsx
function EditForm() {
  const { setWarnWhen } = useWarnAboutChange();
  const { mutate } = useUpdate();

  const handleSave = (values) => {
    mutate(
      { resource: "posts", values },
      {
        onSuccess: () => {
          setWarnWhen(false); // Disable warning
        },
      },
    );
  };
}
```

### 4.3 Browser Beforeunload Handler

```tsx
function FormWithWarning() {
  const { warnWhen, warnWhenUnsavedChanges } = useWarnAboutChange();

  useEffect(() => {
    if (warnWhen && warnWhenUnsavedChanges) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = "";
        return "";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [warnWhen, warnWhenUnsavedChanges]);
}
```

### 4.4 Router Guard

```tsx
function CustomRouter() {
  const { warnWhen } = useWarnAboutChange();
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    if (warnWhen) {
      const confirmed = window.confirm(
        "You have unsaved changes! Are you sure you want to leave?",
      );

      if (!confirmed) {
        return; // Stay on page
      }
    }

    navigate(path);
  };

  return <Button onClick={() => handleNavigate("/posts")}>Go to Posts</Button>;
}
```

### 4.5 Show Warning Indicator

```tsx
function FormHeader() {
  const { warnWhen } = useWarnAboutChange();

  return (
    <div className="header">
      <h2>Edit Post</h2>
      {warnWhen && <Badge color="orange">Unsaved Changes</Badge>}
    </div>
  );
}
```

### 4.6 Reset on Cancel

```tsx
function FormWithCancel() {
  const { setWarnWhen } = useWarnAboutChange();
  const navigate = useNavigate();

  const handleCancel = () => {
    setWarnWhen(false); // Disable warning
    navigate("/posts"); // Safe to navigate now
  };

  return <Button onClick={handleCancel}>Cancel</Button>;
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Two Separate Contexts?

**Answer:** Separation of concerns

```typescript
// RefineContext: Global configuration
// - Set once at app initialization
// - Rarely changes
// - Global scope

// UnsavedWarnContext: Runtime state
// - Changes frequently (every form edit)
// - Per-component scope
// - Dynamic

// Separated for:
// 1. Performance (state changes don't re-render config consumers)
// 2. Clarity (config vs state)
// 3. Flexibility (can change state provider without affecting config)
```

### 5.2 Why Boolean(warnWhen)?

**Answer:** Type safety and consistency

```typescript
// Context might return undefined:
warnWhen: boolean | undefined;

// Boolean() ensures always boolean:
Boolean(undefined); // → false
Boolean(null); // → false
Boolean(true); // → true
Boolean(false); // → false

// Consistent type! ✅
warnWhen: boolean;
```

### 5.3 Why Fallback for setWarnWhen?

**Answer:** Graceful degradation

```typescript
// If context not initialized:
setWarnWhen: undefined ❌

// Call would error:
setWarnWhen(true) // ❌ Cannot call undefined!

// With fallback:
setWarnWhen: setWarnWhen ?? (() => {})

// Call is safe:
setWarnWhen(true) // ✅ No-op, but doesn't crash
```

### 5.4 Why Not Store State in Component?

**Answer:** Cross-component coordination

```typescript
// IN COMPONENT (Local):
const [warnWhen, setWarnWhen] = useState(false);
// Only this component knows about warning ❌
// Router can't check it ❌

// IN CONTEXT (Global):
// Any component can check warnWhen ✅
// Router guard can check ✅
// Multiple forms can coordinate ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting to Disable After Save

```typescript
// ❌ WRONG - Warning stays active
const handleSave = (values) => {
  mutate({ resource: "posts", values });
  // warnWhen still true! ❌
};

// ✅ CORRECT - Disable in onSuccess
const handleSave = (values) => {
  mutate({ resource: "posts", values }, {
    onSuccess: () => {
      setWarnWhen(false); ✅
    }
  });
};
```

### 6.2 Not Checking Global Config

```typescript
// ❌ WRONG - Always set warning
const handleChange = () => {
  setWarnWhen(true);
  // Even if feature disabled! ❌
};

// ✅ CORRECT - Check config first
const { warnWhenUnsavedChanges, setWarnWhen } = useWarnAboutChange();

const handleChange = () => {
  if (warnWhenUnsavedChanges) {
    setWarnWhen(true); ✅
  }
};
```

### 6.3 Setting True on Mount

```typescript
// ❌ WRONG - Warning immediately on mount
useEffect(() => {
  setWarnWhen(true); ❌
}, []);

// ✅ CORRECT - Only when form dirty
const handleChange = () => {
  setWarnWhen(true); ✅
};
```

### 6.4 Not Cleaning Up Event Listeners

```typescript
// ❌ WRONG - Memory leak
useEffect(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  // No cleanup! ❌
}, []);

// ✅ CORRECT - Clean up
useEffect(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  return () => {
    window.removeEventListener("beforeunload", handleBeforeUnload); ✅
  };
}, []);
```

---

## 7. INTEGRATION WITH FORMS

### How useForm Uses This Hook

```typescript
// In useForm:
export const useForm = () => {
  const { warnWhenUnsavedChanges, setWarnWhen } = useWarnAboutChange();
  const [formState, setFormState] = useState({});

  // Track if form is dirty
  const [isDirty, setIsDirty] = useState(false);

  // Enable warning when form becomes dirty
  useEffect(() => {
    if (isDirty && warnWhenUnsavedChanges) {
      setWarnWhen(true);
    }
  }, [isDirty, warnWhenUnsavedChanges]);

  // Disable warning on successful save
  const mutation = useMutation({
    onSuccess: () => {
      setWarnWhen(false);
      setIsDirty(false);
    },
  });

  return { formState, mutation };
};
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useWarnAboutChange } from "@refinedev/core";

// Mock contexts
const wrapper = ({ children, config, state }) => (
  <RefineContext.Provider value={{ warnWhenUnsavedChanges: config }}>
    <UnsavedWarnContext.Provider value={state}>
      {children}
    </UnsavedWarnContext.Provider>
  </RefineContext.Provider>
);

describe("useWarnAboutChange", () => {
  it("should return config and state", () => {
    const mockState = {
      warnWhen: true,
      setWarnWhen: jest.fn(),
    };

    const { result } = renderHook(() => useWarnAboutChange(), {
      wrapper: (props) => wrapper({ ...props, config: true, state: mockState }),
    });

    expect(result.current.warnWhenUnsavedChanges).toBe(true);
    expect(result.current.warnWhen).toBe(true);
    expect(typeof result.current.setWarnWhen).toBe("function");
  });

  it("should convert warnWhen to boolean", () => {
    const mockState = {
      warnWhen: undefined,
      setWarnWhen: jest.fn(),
    };

    const { result } = renderHook(() => useWarnAboutChange(), {
      wrapper: (props) => wrapper({ ...props, config: true, state: mockState }),
    });

    expect(result.current.warnWhen).toBe(false); // Not undefined!
  });

  it("should provide fallback for setWarnWhen", () => {
    const mockState = {
      warnWhen: false,
      setWarnWhen: undefined,
    };

    const { result } = renderHook(() => useWarnAboutChange(), {
      wrapper: (props) => wrapper({ ...props, config: true, state: mockState }),
    });

    expect(() => result.current.setWarnWhen(true)).not.toThrow();
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Access RefineContext + UnsavedWarnContext
- ✅ **Composite**: Combine global config + runtime state
- ✅ **State Management**: warnWhen state + setter
- ✅ **Guard**: Prevent navigation with unsaved changes

### Key Features

1. **Dual Context** - Config from RefineContext, state from UnsavedWarnContext
2. **Three Values** - warnWhenUnsavedChanges, warnWhen, setWarnWhen
3. **Safe Fallbacks** - Boolean conversion + no-op setter
4. **Navigation Guard** - Prevent data loss
5. **Browser Warning** - beforeunload event support

### Khi nào dùng useWarnAboutChange?

✅ **Nên dùng:**

- Building custom forms with unsaved changes detection
- Custom router guards
- Need to enable/disable warning dynamically
- Show warning indicators

❌ **Không dùng:**

- Standard forms → Use `useForm` (includes this hook)
- Read-only pages → No unsaved changes possible
- Non-form components → Probably don't need it

### Warning Workflow

```
1. User edits form
   → setWarnWhen(true)

2. User tries to navigate
   → Check warnWhen
   → Show warning if true

3. User saves
   → setWarnWhen(false)

4. User can navigate freely
```

### Remember

✅ **81 lines** - Dual context accessor
🔑 **Accessor Pattern** - Two contexts
🎛️ **Composite Pattern** - Config + state
💾 **State Management** - warnWhen state
🚧 **Guard Pattern** - Navigation protection

---

> 📚 **Best Practice**: **Enable** warning when form becomes dirty (`setWarnWhen(true)`). **Disable** after successful save (`setWarnWhen(false)`). Always **check warnWhenUnsavedChanges** before enabling warning. **Clean up** beforeunload listeners. This pattern prevents **accidental data loss** and provides **better UX**!
