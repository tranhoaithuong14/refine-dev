# Kiến trúc và Design Patterns của useMutationMode Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │            MUTATION BEHAVIOR SYSTEM               │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RefineContext (Global Config)                   │  │
│  │    ↓ provides                                    │  │
│  │    - mutationMode: "pessimistic" | "optimistic"  │  │
│  │                   | "undoable"                   │  │
│  │    - undoableTimeout: 5000 (ms)                  │  │
│  │         │                                         │  │
│  │         ↓ accessed via                           │  │
│  │                                                   │  │
│  │  useMutationMode ✅ (THIS HOOK)                  │  │
│  │    → Get mutation mode config with override      │  │
│  │         │                                         │  │
│  │         ├──→ STRATEGY PATTERN:                   │  │
│  │         │     3 modes determine UI behavior:     │  │
│  │         │     - pessimistic: Wait for server     │  │
│  │         │     - optimistic: Update immediately   │  │
│  │         │     - undoable: Update + allow undo    │  │
│  │         │                                         │  │
│  │         ├──→ CONFIGURATION PATTERN:              │  │
│  │         │     - Global: from RefineContext       │  │
│  │         │     - Local: parameter override        │  │
│  │         │     - Priority: Local > Global         │  │
│  │         │                                         │  │
│  │         └──→ NULLISH COALESCING (??):            │  │
│  │               param ?? context (prefer param)    │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useCreate, useUpdate, useDelete             │  │
│  │    - All mutation hooks                          │  │
│  │    - useForm (to determine mutation behavior)    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide mutation mode configuration with global defaults and local overrides**

### 1.2 The Three Mutation Modes - Visual Comparison

```
┌──────────────────────────────────────────────────────────────┐
│         USER ACTION: Update Post Title                       │
└──────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
MODE 1: PESSIMISTIC (Conservative - Wait for server)
═══════════════════════════════════════════════════════════════

User clicks Save
     ↓
Show loading spinner... ⏳
     ↓
Send request to server
     ↓
Wait for response... (might take 2-3 seconds)
     ↓
Server responds ✅
     ↓
Update UI with new data
     ↓
Hide loading spinner

Pros: ✅ Data always correct
Cons: ❌ Feels slow

═══════════════════════════════════════════════════════════════
MODE 2: OPTIMISTIC (Optimistic - Trust it will work)
═══════════════════════════════════════════════════════════════

User clicks Save
     ↓
Update UI IMMEDIATELY ✅ (assume success)
     ↓
Send request to server (in background)
     ↓
     ┌─────────────────┐
     ↓                 ↓
Server success ✅   Server error ❌
     ↓                 ↓
Done!              Rollback UI to old state
                   Show error message

Pros: ✅ Feels instant
Cons: ❌ UI might be wrong if server fails

═══════════════════════════════════════════════════════════════
MODE 3: UNDOABLE (Best of both - Instant + safety)
═══════════════════════════════════════════════════════════════

User clicks Save
     ↓
Update UI IMMEDIATELY ✅
     ↓
Show "UNDO" notification (5 seconds countdown) ⏰
     ↓
     ┌──────────────────────────┐
     ↓                          ↓
User clicks UNDO         Timeout (5 seconds)
     ↓                          ↓
Rollback to old state    Send request to server
Show "Cancelled"              ↓
                         Server responds
                              ↓
                         Done! ✅

Pros: ✅ Feels instant + user control
Cons: ⚠️ Slightly more complex
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useMutationMode.ts: 83 dòng** - Mutation mode config!

---

### 2.1 Strategy Pattern - Three Mutation Algorithms

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: Video Game Difficulty

```
Game Difficulty Settings:

Easy Mode (Pessimistic):
- Wait for confirmation before every action
- Safe, no mistakes
- Slower gameplay

Normal Mode (Optimistic):
- Actions happen immediately
- If you mess up, quick retry
- Faster gameplay

Hard Mode (Undoable):
- Actions happen immediately
- Brief window to undo
- Fast but with safety net

useMutationMode:

Pessimistic:
- Wait for server before UI update
- Safe, always correct
- Slower UX

Optimistic:
- UI updates immediately
- If server fails, rollback
- Faster UX

Undoable:
- UI updates immediately
- 5-second undo window
- Fast UX + safety
```

**Strategy Pattern** = Define family of algorithms, encapsulate each one, make them interchangeable.

#### Implementation:

```typescript
type MutationMode = "pessimistic" | "optimistic" | "undoable";

// STRATEGY 1: Pessimistic (wait)
mutationMode: "pessimistic"
→ useUpdate waits for server before updating UI

// STRATEGY 2: Optimistic (trust)
mutationMode: "optimistic"
→ useUpdate updates UI immediately, rollback on error

// STRATEGY 3: Undoable (instant + undo)
mutationMode: "undoable"
→ useUpdate updates UI, shows undo toast for 5 seconds
```

#### How Each Mode Works:

```typescript
// In useUpdate:
const { mutationMode, undoableTimeout } = useMutationMode();

if (mutationMode === "pessimistic") {
  // STRATEGY 1: Wait
  await dataProvider.update(...);  // ← Wait here! ⏳
  updateCache();  // ← Update UI after success
}

if (mutationMode === "optimistic") {
  // STRATEGY 2: Update immediately
  updateCache();  // ← Update UI first! ⚡
  try {
    await dataProvider.update(...);  // ← Background
  } catch (error) {
    rollbackCache();  // ← Rollback if fails!
  }
}

if (mutationMode === "undoable") {
  // STRATEGY 3: Update + undo window
  updateCache();  // ← Update UI first! ⚡
  showUndoToast(undoableTimeout);  // ← Show undo button (5s)
  // After timeout or no undo:
  await dataProvider.update(...);  // ← Send to server
}
```

#### Real Example - Different Behaviors:

```tsx
// PESSIMISTIC: Good for critical actions
<Refine mutationMode="pessimistic">
  {/* User edits bank account balance */}
  {/* UI waits for server confirmation ✅ */}
  {/* No UI updates until 100% sure */}
</Refine>

// OPTIMISTIC: Good for social apps
<Refine mutationMode="optimistic">
  {/* User likes a post */}
  {/* Heart icon turns red instantly ✅ */}
  {/* If server fails, heart rolls back ❌ */}
</Refine>

// UNDOABLE: Best for general CRUD
<Refine mutationMode="undoable">
  {/* User edits blog post */}
  {/* UI updates instantly ✅ */}
  {/* "Undo" toast appears for 5 seconds ⏰ */}
  {/* User can undo or let it commit */}
</Refine>
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose behavior per app needs
- ✅ **UX Control** - Balance speed vs safety
- ✅ **Consistent** - Same interface, different behaviors
- ✅ **Configurable** - Change globally or per mutation

---

### 2.2 Configuration Pattern - Global + Local Override

#### ⚙️ VÍ DỤ ĐỜI THƯỜNG: Phone Settings

```
Phone Settings:

Global Settings (RefineContext):
- Default ringtone: "Classic"
- Default volume: 80%

Per-Contact Override:
- Mom's ringtone: "Piano" ← Overrides default!
- Boss's ringtone: "Loud Alarm" ← Overrides default!
- Other contacts: "Classic" ← Uses default

useMutationMode:

Global Config (RefineContext):
- mutationMode: "optimistic"
- undoableTimeout: 5000

Per-Hook Override:
- useUpdate({ mutationMode: "pessimistic" }) ← Overrides!
- useDelete() ← Uses global default
```

**Configuration Pattern** = Centralized config with local overrides.

#### Implementation:

```typescript
// GLOBAL: Set at app level
<Refine
  mutationMode="optimistic" // ← DEFAULT for all hooks
  undoableTimeout={5000} // ← 5 seconds
>
  <App />
</Refine>;

// LOCAL: Override per hook
const { mutationMode } = useMutationMode("pessimistic");
// → Returns "pessimistic" (overrides global "optimistic")

const { mutationMode } = useMutationMode();
// → Returns "optimistic" (uses global default)
```

#### Priority System:

```typescript
export const useMutationMode = (
  preferredMutationMode?: MutationMode, // ← LOCAL (highest priority)
  preferredUndoableTimeout?: number,
) => {
  const { mutationMode, undoableTimeout } = useContext(RefineContext);
  // ↑ GLOBAL (lowest priority)

  return {
    mutationMode: preferredMutationMode ?? mutationMode,
    // ↑ Nullish coalescing: local ?? global
    undoableTimeout: preferredUndoableTimeout ?? undoableTimeout,
  };
};
```

#### Real Example - Mixed Modes:

```tsx
// Global: Optimistic for most operations
<Refine mutationMode="optimistic">
  {/* Most hooks use global optimistic */}
  <PostsList /> {/* useTable uses optimistic ✅ */}
  {/* Override for critical operation */}
  <BankTransfer /> {/* useForm({ mutationMode: "pessimistic" }) ✅ */}
  {/* Override for undo-friendly operation */}
  <EmailSend /> {/* useForm({ mutationMode: "undoable" }) ✅ */}
</Refine>
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DRY** - Don't repeat mode in every hook
- ✅ **Flexible** - Override when needed
- ✅ **Centralized** - Easy to change global default
- ✅ **Granular** - Per-hook control

---

### 2.3 Accessor Pattern - Context Value Access

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Company ID Badge

```
Company System:

HR Database (Context):
- Employee name
- Department
- Access level

ID Badge (Accessor):
- Swipe to access
- Don't need to know HR system
- Simple interface

useMutationMode:

RefineContext (Provider):
- mutationMode config
- undoableTimeout config
- Other Refine settings

useMutationMode (Accessor):
- Simple hook call
- Get mode + timeout
- Don't need to know context internals
```

**Accessor Pattern** = Provide simple access to complex context.

#### Implementation:

```typescript
// COMPLEX INTERNAL:
const RefineContext = createContext({
  mutationMode: "optimistic",
  undoableTimeout: 5000,
  // ... many other configs
});

// SIMPLE EXTERNAL:
export const useMutationMode = (preferred?, timeout?) => {
  const context = useContext(RefineContext); // ← Access context

  return {
    mutationMode: preferred ?? context.mutationMode,
    undoableTimeout: timeout ?? context.undoableTimeout,
  };
};

// USAGE:
const { mutationMode } = useMutationMode(); // ✅ Simple!
```

#### Why Not useContext Directly?

```typescript
// ❌ WITHOUT accessor:
import { RefineContext } from "@refinedev/core/contexts/...";

const context = useContext(RefineContext);
const mode = preferredMode ?? context.mutationMode;
// Long import! ❌
// Need to know context structure! ❌
// Handle override manually! ❌

// ✅ WITH accessor:
import { useMutationMode } from "@refinedev/core";

const { mutationMode } = useMutationMode(preferredMode);
// Short import! ✅
// Clear intent! ✅
// Override built-in! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Encapsulation** - Hide context implementation
- ✅ **DX** - Developer experience
- ✅ **Override** - Built-in local override logic
- ✅ **Discoverable** - Named hook is easier to find

---

### 2.4 Nullish Coalescing Pattern (??) - Prefer Local Over Global

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order

```
Restaurant Menu:

Default: All dishes served with rice
Special request: "Can I have bread instead?"

Kitchen logic:
bread ?? rice  // ← If you specify bread, use it. Else use rice.

useMutationMode:

Global default: mutationMode = "optimistic"
Local preference: mutationMode = "pessimistic"

Hook logic:
preferredMode ?? globalMode
// ← If you specify preferred, use it. Else use global.
```

**Nullish Coalescing (??)** = Return left side if not null/undefined, else return right side.

#### Implementation:

```typescript
export const useMutationMode = (
  preferredMutationMode?: MutationMode,
  preferredUndoableTimeout?: number,
) => {
  const { mutationMode, undoableTimeout } = useContext(RefineContext);

  return {
    // NULLISH COALESCING:
    mutationMode: preferredMutationMode ?? mutationMode,
    // ↑ If preferredMutationMode is provided (not null/undefined), use it
    //   Otherwise, use global mutationMode from context

    undoableTimeout: preferredUndoableTimeout ?? undoableTimeout,
    // ↑ Same logic for timeout
  };
};
```

#### Nullish Coalescing vs OR (||):

```typescript
// SCENARIO 1: No preference
preferredMode = undefined;
globalMode = "optimistic";

preferredMode ?? globalMode; // → "optimistic" ✅
preferredMode || globalMode; // → "optimistic" ✅ (same)

// SCENARIO 2: Explicit preference
preferredMode = "pessimistic";
globalMode = "optimistic";

preferredMode ?? globalMode; // → "pessimistic" ✅
preferredMode || globalMode; // → "pessimistic" ✅ (same)

// SCENARIO 3: Edge case (why ?? is better)
preferredMode = null;
globalMode = "optimistic";

preferredMode ?? globalMode; // → "optimistic" ✅ (treats null as "no preference")
preferredMode || globalMode; // → "optimistic" ✅ (same)

// SCENARIO 4: Falsy but valid value
preferredTimeout = 0; // ← Valid timeout (no delay)
globalTimeout = 5000;

preferredTimeout ?? globalTimeout; // → 0 ✅ (correct! use 0)
preferredTimeout || globalTimeout; // → 5000 ❌ (wrong! 0 is falsy)

// ?? only checks null/undefined
// || checks all falsy values (0, "", false, null, undefined)
```

#### Real Example:

```typescript
// Global: 5 seconds undo timeout
<Refine undoableTimeout={5000}>
  {/* Hook 1: Use global */}
  const {undoableTimeout} = useMutationMode(); // → 5000 ✅{/* Hook 2: Override to 10 seconds */}
  const {undoableTimeout} = useMutationMode(undefined, 10000); // → 10000 ✅
  {/* Hook 3: Override to 0 (instant execute, no undo) */}
  const {undoableTimeout} = useMutationMode(undefined, 0); // → 0 ✅ (thanks to ??
  instead of ||)
</Refine>
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Explicit** - Clear override behavior
- ✅ **Safe** - Handles null/undefined correctly
- ✅ **Modern** - ES2020 feature, cleaner than ||
- ✅ **Falsy-safe** - 0, "", false are valid values

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                | Ví dụ đời thường | Giải quyết vấn đề gì         | Trong useMutationMode                                  |
| ---------------------- | ---------------- | ---------------------------- | ------------------------------------------------------ |
| **Strategy**           | Game difficulty  | Choose algorithm             | Three mutation modes (pessimistic/optimistic/undoable) |
| **Configuration**      | Phone settings   | Global + local config        | Global context + parameter override                    |
| **Accessor**           | ID badge         | Simple context access        | Hide RefineContext complexity                          |
| **Nullish Coalescing** | Restaurant order | Prefer explicit over default | param ?? context (prefer local)                        |

---

## 3. KEY FEATURES

### 3.1 Three Mutation Modes

```typescript
type MutationMode = "pessimistic" | "optimistic" | "undoable";

// Pessimistic: Safe, wait for server
mutationMode: "pessimistic";

// Optimistic: Fast, assume success
mutationMode: "optimistic";

// Undoable: Fast + undo window
mutationMode: "undoable";
```

### 3.2 Undoable Timeout

```typescript
// Default: 5000ms (5 seconds)
undoableTimeout: 5000;

// Custom: 10 seconds
undoableTimeout: 10000;

// Instant: No undo window
undoableTimeout: 0;
```

### 3.3 Global Configuration

```typescript
<Refine mutationMode="optimistic" undoableTimeout={5000}>
  <App />
</Refine>

// All hooks use these defaults
```

### 3.4 Local Override

```typescript
// Override mode for specific hook:
const { mutationMode } = useMutationMode("pessimistic");

// Override timeout:
const { undoableTimeout } = useMutationMode(undefined, 10000);

// Override both:
const config = useMutationMode("undoable", 3000);
```

---

## 4. COMMON USE CASES

### 4.1 Global Optimistic Mode

```tsx
// Fast UX for entire app
<Refine mutationMode="optimistic" undoableTimeout={5000}>
  <App />
</Refine>

// All mutations feel instant! ⚡
```

### 4.2 Critical Operation Override

```tsx
function BankTransfer() {
  const { formProps } = useForm({
    resource: "transactions",
    mutationMode: "pessimistic", // ← Wait for server! Safety first!
  });

  // User transfers money
  // → UI waits for server confirmation ✅
  // → No optimistic update for money! 💰
}
```

### 4.3 Social App with Instant Feedback

```tsx
// Global: Optimistic
<Refine mutationMode="optimistic">

  function LikeButton({ postId }) {
    const { mutate } = useUpdate();

    const handleLike = () => {
      mutate({ resource: "posts", id: postId, values: { liked: true } });
      // → Heart icon turns red INSTANTLY ❤️
      // → Server updated in background
      // → If server fails, heart rolls back
    };
  }

</Refine>
```

### 4.4 Undoable Bulk Operations

```tsx
function BulkDelete() {
  const { mutate } = useDeleteMany({
    mutationMode: "undoable", // ← Undo window!
  });

  const handleDelete = (ids) => {
    mutate({ resource: "posts", ids });
    // → Items disappear immediately
    // → "UNDO" toast appears (5 seconds)
    // → User can undo or let it commit
  };
}
```

### 4.5 Custom Timeout for Long Operations

```tsx
function LongProcessForm() {
  const config = useMutationMode("undoable", 15000);
  // ← 15 seconds undo window (longer for complex operations)

  const { formProps } = useForm({
    resource: "reports",
    mutationMode: config.mutationMode,
    undoableTimeout: config.undoableTimeout,
  });

  // User generates complex report
  // → 15-second undo window (enough time to review)
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Three Modes?

**Answer:** Cover all UX needs

```typescript
// Pessimistic: When correctness > speed
// - Financial transactions
// - Critical updates
// - Admin operations

// Optimistic: When speed > everything
// - Social interactions (likes, follows)
// - Non-critical updates
// - High-frequency operations

// Undoable: Best of both
// - General CRUD operations
// - User-initiated changes
// - Recoverable mistakes
```

### 5.2 Why 5000ms Default Timeout?

**Answer:** Sweet spot for UX

```typescript
// Too short (1-2 seconds):
// - User barely has time to read toast
// - Might miss undo button ❌

// Too long (10+ seconds):
// - Server update delayed too long
// - User waits for confirmation ❌

// 5 seconds:
// - Enough time to read and decide
// - Not too long to wait
// - Studies show optimal for "undo" actions ✅
```

### 5.3 Why Nullish Coalescing Over OR?

**Answer:** Handle falsy values correctly

```typescript
// Timeout = 0 is valid (instant execute)
preferredTimeout = 0;
globalTimeout = 5000;

// WITH ??:
preferredTimeout ?? globalTimeout; // → 0 ✅ (correct!)

// WITH ||:
preferredTimeout || globalTimeout; // → 5000 ❌ (0 is falsy, uses global!)

// ?? only checks null/undefined
// || checks all falsy (0, "", false, null, undefined)
```

### 5.4 Why Separate Hook Instead of Direct Context?

**Answer:** Better DX and encapsulation

```typescript
// ❌ WITHOUT hook:
const context = useContext(RefineContext);
const mode = preferredMode ?? context.mutationMode;

// ✅ WITH hook:
const { mutationMode } = useMutationMode(preferredMode);

// Benefits:
// 1. Shorter import
// 2. Built-in override logic
// 3. Clear intent
// 4. Context changes don't break user code
```

---

## 6. COMMON PITFALLS

### 6.1 Using || Instead of ??

```typescript
// ❌ WRONG - Using OR
const mode = preferredMode || globalMode;
// Problem: If preferredMode is falsy but valid, uses global ❌

// ✅ CORRECT - Using ??
const mode = preferredMode ?? globalMode;
// Only uses global if preferredMode is null/undefined ✅
```

### 6.2 Forgetting Mode Affects Behavior

```typescript
// ❌ WRONG - Expecting immediate UI update in pessimistic
<Refine mutationMode="pessimistic">
  {/* User expects instant feedback */}
  {/* But UI waits for server! ❌ */}
</Refine>

// ✅ CORRECT - Choose mode based on UX needs
<Refine mutationMode="optimistic">
  {/* User gets instant feedback ✅ */}
</Refine>
```

### 6.3 Not Handling Optimistic Rollback

```typescript
// ❌ RISKY - Optimistic mode without error handling
mutationMode: "optimistic";
// If server fails, UI shows wrong state!

// ✅ BETTER - Handle errors
const { mutate } = useUpdate({
  mutationMode: "optimistic",
  onError: (error) => {
    // Cache automatically rolls back
    showNotification("Update failed!");
  },
});
```

---

## 7. INTEGRATION WITH MUTATIONS

### How useUpdate Uses This Hook

```typescript
// In useUpdate:
export const useUpdate = (config) => {
  const { mutationMode, undoableTimeout } = useMutationMode(
    config.mutationMode, // ← Local override
    config.undoableTimeout,
  );

  const mutation = useMutation({
    mutationFn: async (variables) => {
      if (mutationMode === "pessimistic") {
        // WAIT for server
        const response = await dataProvider.update(variables);
        updateCache(response); // ← Update after success
        return response;
      }

      if (mutationMode === "optimistic") {
        // UPDATE immediately
        const previousData = updateCache(variables); // ← Update first!
        try {
          return await dataProvider.update(variables);
        } catch (error) {
          rollbackCache(previousData); // ← Rollback on error
          throw error;
        }
      }

      if (mutationMode === "undoable") {
        // UPDATE + Undo window
        const previousData = updateCache(variables);
        addToUndoQueue({
          timeout: undoableTimeout,
          cancelMutation: () => rollbackCache(previousData),
          doMutation: () => dataProvider.update(variables),
        });
      }
    },
  });

  return mutation;
};
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useMutationMode } from "@refinedev/core";

// Mock RefineContext
const wrapper = ({ children }) => (
  <RefineContext.Provider
    value={{
      mutationMode: "optimistic",
      undoableTimeout: 5000,
    }}
  >
    {children}
  </RefineContext.Provider>
);

describe("useMutationMode", () => {
  it("should return global config when no override", () => {
    const { result } = renderHook(() => useMutationMode(), { wrapper });

    expect(result.current.mutationMode).toBe("optimistic");
    expect(result.current.undoableTimeout).toBe(5000);
  });

  it("should override mode when provided", () => {
    const { result } = renderHook(() => useMutationMode("pessimistic"), {
      wrapper,
    });

    expect(result.current.mutationMode).toBe("pessimistic");
  });

  it("should handle 0 timeout correctly with ??", () => {
    const { result } = renderHook(() => useMutationMode(undefined, 0), {
      wrapper,
    });

    expect(result.current.undoableTimeout).toBe(0); // ✅ Not 5000!
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: Three mutation algorithms (pessimistic/optimistic/undoable)
- ✅ **Configuration**: Global context + local override
- ✅ **Accessor**: Simple access to RefineContext
- ✅ **Nullish Coalescing**: Prefer local over global safely

### Key Features

1. **Three Modes** - pessimistic (wait), optimistic (instant), undoable (instant + undo)
2. **Global Default** - Set at \<Refine\> level
3. **Local Override** - Override per hook
4. **Configurable Timeout** - Adjust undo window (default 5s)
5. **Simple API** - One hook call

### Khi nào dùng useMutationMode?

✅ **Nên dùng:**

- Building custom mutation hooks
- Need to check current mutation mode
- Override mode for specific operations
- Custom mutation logic

❌ **Không dùng:**

- Standard mutations → Use `useUpdate` (includes this hook)
- Static mode → Set globally in \<Refine\>
- Non-mutation operations

### Which Mode to Use?

| Scenario                  | Mode            | Why                    |
| ------------------------- | --------------- | ---------------------- |
| 💰 Financial transactions | **pessimistic** | Safety > speed         |
| ❤️ Social interactions    | **optimistic**  | Speed > everything     |
| 📝 General CRUD           | **undoable**    | Balance speed + safety |
| ⚙️ Admin operations       | **pessimistic** | Correctness critical   |
| 📱 Chat messages          | **optimistic**  | Instant feedback       |

### Remember

✅ **83 lines** - Simple config accessor
🎯 **Strategy Pattern** - Three mutation modes
⚙️ **Configuration Pattern** - Global + local override
🔑 **Accessor Pattern** - Context access
?? **Nullish Coalescing** - Safe fallback

---

> 📚 **Best Practice**: Use **"undoable"** as global default for best UX. Override to **"pessimistic"** for critical operations (money, legal). Override to **"optimistic"** for social features (likes, follows). Set **undoableTimeout** based on operation complexity (3-10 seconds range).
