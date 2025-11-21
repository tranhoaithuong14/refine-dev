# Kiến trúc và Design Patterns của useRefineContext Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          REFINE CONFIGURATION SYSTEM              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RefineContext (Global Configuration Store)      │  │
│  │    ↓ provides ALL Refine configurations          │  │
│  │    - mutationMode: "pessimistic" | ...           │  │
│  │    - syncWithLocation: boolean                   │  │
│  │    - undoableTimeout: number                     │  │
│  │    - warnWhenUnsavedChanges: boolean             │  │
│  │    - liveMode: "auto" | "manual" | "off"         │  │
│  │    - onLiveEvent: function                       │  │
│  │    - options: { ... }                            │  │
│  │    - __initialized: boolean                      │  │
│  │         │                                         │  │
│  │         ↓ accessed via                           │  │
│  │                                                   │  │
│  │  useRefineContext ✅ (THIS HOOK)                 │  │
│  │    → Master accessor for ALL Refine config       │  │
│  │         │                                         │  │
│  │         ├──→ ACCESSOR PATTERN:                   │  │
│  │         │     One hook to access all settings    │  │
│  │         │                                         │  │
│  │         ├──→ FACADE PATTERN:                     │  │
│  │         │     Simple interface to complex context│  │
│  │         │                                         │  │
│  │         └──→ SELECTIVE EXPOSURE:                 │  │
│  │               Only public fields (hide internals)│  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useMutationMode (reads mutationMode)        │  │
│  │    - useSyncWithLocation (reads syncWithLocation)│  │
│  │    - useLiveMode (reads liveMode, onLiveEvent)   │  │
│  │    - useWarnAboutChange (reads warnWhen...)      │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide unified access to ALL Refine global configuration settings**

### 1.2 Complete Configuration Tree

```
┌──────────────────────────────────────────────────────────────┐
│         REFINE GLOBAL CONFIGURATION (All Settings)           │
└──────────────────────────────────────────────────────────────┘

<Refine
  mutationMode="optimistic"          // How mutations behave
  syncWithLocation={true}            // Sync table state with URL
  undoableTimeout={5000}             // Undo window duration (ms)
  warnWhenUnsavedChanges={true}      // Warn before leaving unsaved form
  liveMode="auto"                    // Realtime updates mode
  onLiveEvent={handleLiveEvent}      // Realtime event handler
  options={{                         // Additional options
    breadcrumb: MyBreadcrumb,
    mutationMode: "undoable",        // Legacy support
    // ... more options
  }}
>
  <App />
</Refine>

           │
           ↓
    ALL stored in RefineContext
           │
           ↓
    useRefineContext() → Access ALL! ✅

const {
  mutationMode,              // "optimistic"
  syncWithLocation,          // true
  undoableTimeout,           // 5000
  warnWhenUnsavedChanges,    // true
  liveMode,                  // "auto"
  onLiveEvent,               // function
  options,                   // { breadcrumb: ..., ... }
  __initialized              // true (internal flag)
} = useRefineContext();
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useRefineContext.ts: 28 dòng** - Master config accessor!

---

### 2.1 Accessor Pattern - Global Config Access

#### 🗄️ VÍ DỤ ĐỜI THƯỜNG: Company HR Portal

```
Company HR System:

Database (Context):
- Employee info
- Salary data
- Benefits
- Policies
- Access levels

HR Portal (Accessor):
- One login
- See all your info
- Don't need to know database structure
- Simple interface

useRefineContext:

RefineContext (Store):
- mutationMode
- syncWithLocation
- undoableTimeout
- warnWhenUnsavedChanges
- liveMode
- onLiveEvent
- options
- __initialized

useRefineContext (Portal):
- One hook call
- Get all config
- Don't need to know context internals
- Simple interface
```

**Accessor Pattern** = Provide simple access to complex data store.

#### Implementation:

```typescript
// COMPLEX INTERNAL (Context):
const RefineContext = createContext({
  mutationMode: "optimistic",
  syncWithLocation: true,
  undoableTimeout: 5000,
  warnWhenUnsavedChanges: true,
  liveMode: "auto",
  onLiveEvent: () => {},
  options: { ... },
  __initialized: true
  // ... and potentially more internal fields
});

// SIMPLE EXTERNAL (Accessor):
export const useRefineContext = () => {
  const context = useContext(RefineContext);
  return context;  // ✅ All config in one call!
};

// USAGE:
const config = useRefineContext();
console.log(config.mutationMode);
console.log(config.syncWithLocation);
// ... access any config easily!
```

#### Why This Pattern?

```typescript
// ❌ WITHOUT accessor - Need to import context
import { RefineContext } from "@refinedev/core/contexts/refine";

const context = useContext(RefineContext);
const mode = context.mutationMode;
// Long import path! ❌
// Need to know context name! ❌

// ✅ WITH accessor - Clean API
import { useRefineContext } from "@refinedev/core";

const { mutationMode } = useRefineContext();
// Short import! ✅
// Clear intent! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Centralized** - All config in one place
- ✅ **Simple** - One hook call
- ✅ **Encapsulation** - Hide context internals
- ✅ **Discoverable** - Named hook is easy to find

---

### 2.2 Facade Pattern - Unified Interface

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Smart Home App

```
Behind the scenes (Complex):
- Thermostat API
- Lights API
- Security API
- Entertainment API
- Different protocols
- Different credentials

Smart Home App (Facade):
- One app
- Control everything
- Simple interface
- Unified experience

useRefineContext:

Behind the scenes:
- React Context API
- Provider hierarchy
- State management
- Internal flags

External interface:
- One hook
- Get all config
- Simple return object
- Unified access
```

**Facade Pattern** = Provide unified interface to set of interfaces.

#### Implementation:

```typescript
// COMPLEX BEHIND THE SCENES:
// - RefineProvider setup
// - Context creation
// - State initialization
// - Props validation
// - Default values
// - Internal flags

// SIMPLE EXTERNAL API:
const config = useRefineContext();

// User gets everything in one simple object! ✅
```

#### Comparison:

```typescript
// ❌ WITHOUT facade - Manual access to each setting
const mutationModeContext = useContext(MutationModeContext);
const syncContext = useContext(SyncContext);
const liveContext = useContext(LiveContext);
// ... many contexts! ❌

// ✅ WITH facade - One hook for all
const {
  mutationMode,
  syncWithLocation,
  liveMode,
  // ... everything!
} = useRefineContext();
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - One hook vs many contexts
- ✅ **Consistency** - Unified API
- ✅ **Maintainable** - Internal changes don't break users
- ✅ **Complete** - Access everything you need

---

### 2.3 Selective Exposure Pattern - Public API Only

#### 🔐 VÍ DỤ ĐỜI THƯỜNG: Bank ATM

```
Bank Database (Internal):
- Account balance ✅ (show)
- Transaction history ✅ (show)
- PIN hash ❌ (hide)
- Internal account ID ❌ (hide)
- Bank routing details ❌ (hide)

ATM Screen (Public):
- Balance: $1,000 ✅
- Recent transactions ✅
- (No sensitive data shown)

useRefineContext:

RefineContext (Internal):
- mutationMode ✅ (expose)
- syncWithLocation ✅ (expose)
- __initialized ✅ (expose for checks)
- __internalFlag1 ❌ (hide)
- __internalFlag2 ❌ (hide)

useRefineContext (Public):
- Returns only public fields
- Hides internal implementation details
```

**Selective Exposure** = Only expose necessary parts of internal state.

#### Implementation:

```typescript
export const useRefineContext = () => {
  const {
    // PUBLIC FIELDS (exposed):
    mutationMode,
    syncWithLocation,
    undoableTimeout,
    warnWhenUnsavedChanges,
    liveMode,
    onLiveEvent,
    options,
    __initialized, // ← Technically internal, but useful for users

    // INTERNAL FIELDS (not extracted, so not exposed):
    // __someInternalFlag,
    // __privateMethod,
    // ...
  } = useContext(RefineContext);

  // Return only public fields:
  return {
    __initialized,
    mutationMode,
    syncWithLocation,
    undoableTimeout,
    warnWhenUnsavedChanges,
    liveMode,
    onLiveEvent,
    options,
  };
};
```

#### Why Not Return Entire Context?

```typescript
// ❌ RISKY - Return entire context
export const useRefineContext = () => {
  const context = useContext(RefineContext);
  return context;  // ← Includes internal fields!
};

// Users might access internal fields:
const { __someInternalFlag } = useRefineContext();
// If we change/remove __someInternalFlag, user code breaks! ❌

// ✅ SAFE - Return only public fields
export const useRefineContext = () => {
  const { mutationMode, ... } = useContext(RefineContext);
  return { mutationMode, ... };  // ← Only public API!
};

// Users can only access public API:
const { mutationMode } = useRefineContext();
// Safe! We control the public API! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - Hide implementation details
- ✅ **Stability** - Public API is stable
- ✅ **Backward compatible** - Internal changes don't break users
- ✅ **Clear contract** - Explicit about what's public

---

### 2.4 Single Source of Truth Pattern

#### 📚 VÍ DỤ ĐỜI THƯỜNG: Library Card Catalog

```
Old System (Multiple sources):
- Author index
- Title index
- Subject index
- Dewey decimal system
- Different places to look!

New System (Single source):
- Central database
- One search interface
- All information in one place
- Easy to update
- No inconsistencies

useRefineContext:

Old approach (Distributed):
- mutationMode from one context
- syncWithLocation from another
- liveMode from yet another
- Hard to manage!

New approach (Centralized):
- All config in RefineContext
- One hook to access all
- Single source of truth
- Easy to manage
```

**Single Source of Truth** = One authoritative data source for each piece of information.

#### Implementation:

```typescript
// SINGLE SOURCE: RefineContext
<Refine
  mutationMode="optimistic" // ← Stored once
  syncWithLocation={true} // ← Stored once
  liveMode="auto" // ← Stored once
  // ... all config defined once
>
  <App />
</Refine>;

// ACCESSED EVERYWHERE via same hook:
function ComponentA() {
  const { mutationMode } = useRefineContext();
  // Guaranteed to be same value as ComponentB! ✅
}

function ComponentB() {
  const { mutationMode } = useRefineContext();
  // Same source! ✅
}
```

#### Benefits:

```typescript
// ❌ WITHOUT single source:
// ComponentA reads from localStorage
const mode = localStorage.getItem("mutationMode");

// ComponentB reads from URL
const mode = queryParams.get("mutationMode");

// ComponentC has default
const mode = "optimistic";

// ALL DIFFERENT! Inconsistent! ❌

// ✅ WITH single source:
// All components read from RefineContext
const { mutationMode } = useRefineContext();

// ALWAYS SAME! Consistent! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - Same value everywhere
- ✅ **Predictable** - No surprises
- ✅ **Easy updates** - Change once, affects all
- ✅ **No conflicts** - One truth, no contradictions

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                    | Ví dụ đời thường | Giải quyết vấn đề gì      | Trong useRefineContext                           |
| -------------------------- | ---------------- | ------------------------- | ------------------------------------------------ |
| **Accessor**               | HR portal        | Access complex data       | Simple access to all RefineContext values        |
| **Facade**                 | Smart home app   | Unify multiple interfaces | One hook for all config instead of many contexts |
| **Selective Exposure**     | Bank ATM         | Hide sensitive data       | Only expose public fields, hide internals        |
| **Single Source of Truth** | Library catalog  | Avoid inconsistencies     | All config in one place (RefineContext)          |

---

## 3. CONFIGURATION FIELDS EXPLAINED

### 3.1 mutationMode

```typescript
mutationMode: "pessimistic" | "optimistic" | "undoable"

// Controls how mutations behave:
"pessimistic": Wait for server before UI update
"optimistic": Update UI immediately, rollback on error
"undoable": Update UI, show undo toast

// Usage:
const { mutationMode } = useRefineContext();
```

### 3.2 syncWithLocation

```typescript
syncWithLocation: boolean

// Sync table state (filters, sorting, pagination) with URL:
true: /posts?page=2&sort=title&filter=published
false: State only in memory

// Usage:
const { syncWithLocation } = useRefineContext();
if (syncWithLocation) {
  // Update URL params
}
```

### 3.3 undoableTimeout

```typescript
undoableTimeout: number  // milliseconds

// How long to show undo toast (when mutationMode="undoable"):
5000: 5 seconds (default)
0: Instant execute, no undo
10000: 10 seconds

// Usage:
const { undoableTimeout } = useRefineContext();
showUndoToast({ duration: undoableTimeout });
```

### 3.4 warnWhenUnsavedChanges

```typescript
warnWhenUnsavedChanges: boolean

// Show browser warning when leaving page with unsaved form:
true: "You have unsaved changes. Leave anyway?" ✅
false: Navigate away freely

// Usage:
const { warnWhenUnsavedChanges } = useRefineContext();
if (warnWhenUnsavedChanges && formIsDirty) {
  window.onbeforeunload = () => "Unsaved changes!";
}
```

### 3.5 liveMode

```typescript
liveMode: "auto" | "manual" | "off"

// Realtime update mode:
"auto": Automatically apply realtime updates
"manual": Show notification, user decides to refresh
"off": No realtime updates

// Usage:
const { liveMode } = useRefineContext();
if (liveMode === "auto") {
  applyRealtimeUpdate(event);
}
```

### 3.6 onLiveEvent

```typescript
onLiveEvent?: (event: LiveEvent) => void

// Custom handler for realtime events:
(event) => {
  console.log("Live event:", event.type, event.payload);
  // Custom logic
}

// Usage:
const { onLiveEvent } = useRefineContext();
if (onLiveEvent) {
  onLiveEvent({ type: "created", payload: newRecord });
}
```

### 3.7 options

```typescript
options?: {
  breadcrumb?: React.FC;
  mutationMode?: MutationMode;  // Legacy
  undoableTimeout?: number;     // Legacy
  // ... more options
}

// Additional configuration:
- breadcrumb: Custom breadcrumb component
- Legacy support for old API

// Usage:
const { options } = useRefineContext();
const Breadcrumb = options?.breadcrumb;
```

### 3.8 \_\_initialized

```typescript
__initialized: boolean

// Internal flag indicating Refine is ready:
false: Still initializing
true: Ready to use

// Usage:
const { __initialized } = useRefineContext();
if (!__initialized) {
  return <Spinner />;
}
```

---

## 4. COMMON USE CASES

### 4.1 Check If Refine Is Initialized

```tsx
import { useRefineContext } from "@refinedev/core";

function MyComponent() {
  const { __initialized } = useRefineContext();

  if (!__initialized) {
    return <div>Loading Refine...</div>;
  }

  return <div>Refine is ready! ✅</div>;
}
```

### 4.2 Access Current Mutation Mode

```tsx
function MutationIndicator() {
  const { mutationMode } = useRefineContext();

  return (
    <div>
      Current mode: {mutationMode}
      {mutationMode === "optimistic" && " ⚡ (Instant feedback)"}
      {mutationMode === "undoable" && " ⏰ (With undo)"}
      {mutationMode === "pessimistic" && " 🐢 (Wait for server)"}
    </div>
  );
}
```

### 4.3 Conditional URL Sync

```tsx
function TableComponent() {
  const { syncWithLocation } = useRefineContext();

  const handleFilterChange = (filters) => {
    if (syncWithLocation) {
      // Update URL params
      updateQueryParams({ filters });
    } else {
      // Only update local state
      setLocalFilters(filters);
    }
  };
}
```

### 4.4 Unsaved Changes Warning

```tsx
function FormComponent() {
  const { warnWhenUnsavedChanges } = useRefineContext();
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (warnWhenUnsavedChanges && isDirty) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = "You have unsaved changes!";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () =>
        window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [warnWhenUnsavedChanges, isDirty]);
}
```

### 4.5 Realtime Updates Handler

```tsx
function RealtimeComponent() {
  const { liveMode, onLiveEvent } = useRefineContext();

  useEffect(() => {
    if (liveMode === "off") return;

    // Subscribe to realtime events
    const unsubscribe = subscribeToChannel("posts", (event) => {
      if (liveMode === "auto") {
        // Auto-apply updates
        applyUpdate(event);
      } else if (liveMode === "manual") {
        // Show notification
        showNotification("New update available");
      }

      // Call custom handler
      onLiveEvent?.(event);
    });

    return unsubscribe;
  }, [liveMode, onLiveEvent]);
}
```

### 4.6 Get All Config at Once

```tsx
function DebugPanel() {
  const config = useRefineContext();

  return <pre>{JSON.stringify(config, null, 2)}</pre>;
}

// Output:
// {
//   "__initialized": true,
//   "mutationMode": "optimistic",
//   "syncWithLocation": true,
//   "undoableTimeout": 5000,
//   "warnWhenUnsavedChanges": true,
//   "liveMode": "auto",
//   "onLiveEvent": [Function],
//   "options": { ... }
// }
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Return All Fields?

**Answer:** Complete access to global configuration

```typescript
// Instead of separate hooks for each field:
const mode = useMutationMode();
const sync = useSyncWithLocation();
const live = useLiveMode();
// ... many hooks! ❌

// One hook for all:
const { mutationMode, syncWithLocation, liveMode } = useRefineContext();
// Simple! ✅
```

### 5.2 Why Include \_\_initialized?

**Answer:** Allow users to check if Refine is ready

```typescript
const { __initialized } = useRefineContext();

// Useful for:
// 1. Preventing errors before Refine is ready
// 2. Showing loading states
// 3. Conditional rendering

if (!__initialized) {
  return <LoadingScreen />;
}
```

### 5.3 Why Destructure Then Re-construct?

**Answer:** Explicit control over public API

```typescript
// CURRENT (Explicit):
const { mutationMode, syncWithLocation, ... } = useContext(RefineContext);
return { mutationMode, syncWithLocation, ... };
// ← We control exactly what's exposed ✅

// ALTERNATIVE (Implicit):
const context = useContext(RefineContext);
return context;
// ← Exposes everything, including internals ❌
```

### 5.4 Why Not Memoize Return Value?

**Answer:** Context already handles re-render optimization

```typescript
// Context reference only changes when context value changes
// No need for useMemo:
export const useRefineContext = () => {
  const context = useContext(RefineContext);
  return context; // ← Already optimized by React Context
};

// useMemo would add unnecessary overhead:
// return useMemo(() => context, [context]);  // ❌ Not needed!
```

---

## 6. COMMON PITFALLS

### 6.1 Using Before Refine Is Initialized

```typescript
// ❌ WRONG - Might access before initialization
const { mutationMode } = useRefineContext();
console.log(mutationMode); // Might be undefined! ❌

// ✅ CORRECT - Check initialization first
const { __initialized, mutationMode } = useRefineContext();
if (__initialized) {
  console.log(mutationMode); // Safe! ✅
}
```

### 6.2 Assuming Default Values

```typescript
// ❌ RISKY - Assuming mutationMode is always set
const { mutationMode } = useRefineContext();
if (mutationMode === "optimistic") { ... }
// What if user didn't set it? ❌

// ✅ BETTER - Provide fallback
const { mutationMode = "pessimistic" } = useRefineContext();
// Now has default! ✅
```

### 6.3 Mutating Config

```typescript
// ❌ WRONG - Trying to mutate config
const config = useRefineContext();
config.mutationMode = "optimistic"; // ❌ Won't work!

// ✅ CORRECT - Config is read-only
// To change, update <Refine> props or use specialized hooks
<Refine mutationMode="optimistic" />;
```

---

## 7. INTEGRATION WITH OTHER HOOKS

### useMutationMode Uses This

```typescript
// useMutationMode.ts:
export const useMutationMode = (preferred?, timeout?) => {
  const { mutationMode, undoableTimeout } = useRefineContext();
  // ↑ Gets global defaults from this hook!

  return {
    mutationMode: preferred ?? mutationMode,
    undoableTimeout: timeout ?? undoableTimeout,
  };
};
```

### Custom Hooks Can Access Config

```typescript
export const useMyCustomHook = () => {
  const { syncWithLocation, liveMode } = useRefineContext();

  // Use config in custom logic
  if (syncWithLocation && liveMode === "auto") {
    // Custom behavior based on Refine config
  }
};
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useRefineContext } from "@refinedev/core";

// Mock RefineContext
const wrapper = ({ children }) => (
  <RefineContext.Provider
    value={{
      __initialized: true,
      mutationMode: "optimistic",
      syncWithLocation: true,
      undoableTimeout: 5000,
      warnWhenUnsavedChanges: true,
      liveMode: "auto",
      onLiveEvent: jest.fn(),
      options: {},
    }}
  >
    {children}
  </RefineContext.Provider>
);

describe("useRefineContext", () => {
  it("should return all config values", () => {
    const { result } = renderHook(() => useRefineContext(), { wrapper });

    expect(result.current.__initialized).toBe(true);
    expect(result.current.mutationMode).toBe("optimistic");
    expect(result.current.syncWithLocation).toBe(true);
    expect(result.current.undoableTimeout).toBe(5000);
    expect(result.current.warnWhenUnsavedChanges).toBe(true);
    expect(result.current.liveMode).toBe("auto");
    expect(typeof result.current.onLiveEvent).toBe("function");
    expect(result.current.options).toEqual({});
  });

  it("should allow destructuring specific values", () => {
    const { result } = renderHook(
      () => {
        const { mutationMode, liveMode } = useRefineContext();
        return { mutationMode, liveMode };
      },
      { wrapper },
    );

    expect(result.current.mutationMode).toBe("optimistic");
    expect(result.current.liveMode).toBe("auto");
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Simple access to all RefineContext values
- ✅ **Facade**: Unified interface to entire Refine config
- ✅ **Selective Exposure**: Only public fields exposed
- ✅ **Single Source of Truth**: All config centralized in RefineContext

### Key Features

1. **Complete Access** - All Refine config in one hook
2. **8 Config Fields** - mutationMode, syncWithLocation, undoableTimeout, warnWhenUnsavedChanges, liveMode, onLiveEvent, options, \_\_initialized
3. **Simple API** - One hook call to access everything
4. **Type-Safe** - Full TypeScript support
5. **Stable** - Context-based, optimized re-renders

### Khi nào dùng useRefineContext?

✅ **Nên dùng:**

- Need access to global Refine config
- Building custom hooks that depend on Refine settings
- Checking if Refine is initialized
- Debug/logging Refine configuration

❌ **Không dùng:**

- Only need one specific config → Use specialized hooks (useMutationMode, etc.)
- Want to modify config → Update \<Refine\> props instead
- Non-Refine components → Won't have context

### Config Fields Quick Reference

| Field                    | Type                                        | Purpose                          |
| ------------------------ | ------------------------------------------- | -------------------------------- |
| `mutationMode`           | "pessimistic" \| "optimistic" \| "undoable" | Mutation behavior                |
| `syncWithLocation`       | boolean                                     | URL sync for table state         |
| `undoableTimeout`        | number                                      | Undo window duration (ms)        |
| `warnWhenUnsavedChanges` | boolean                                     | Warn before leaving unsaved form |
| `liveMode`               | "auto" \| "manual" \| "off"                 | Realtime update mode             |
| `onLiveEvent`            | function                                    | Custom realtime handler          |
| `options`                | object                                      | Additional config                |
| `__initialized`          | boolean                                     | Refine ready flag                |

### Remember

✅ **28 lines** - Master config accessor
🗄️ **Accessor Pattern** - Access all config
🏢 **Facade Pattern** - Unified interface
🔐 **Selective Exposure** - Public API only
📚 **Single Source** - One truth

---

> 📚 **Best Practice**: Always **check `__initialized`** before using config in critical paths. Use **destructuring** to get only needed fields. For **single config field**, consider **specialized hooks** (useMutationMode, etc.) for better semantics. This hook is for **read-only access** - to change config, update **\<Refine\>** props!
