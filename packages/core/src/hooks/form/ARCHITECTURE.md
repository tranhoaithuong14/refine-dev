# Kiến trúc và Design Patterns của useForm Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │         FORM SYSTEM (CORE ABSTRACTION)            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useForm ✅ (THIS HOOK - THE BRAIN!)             │  │
│  │    → Orchestrates ENTIRE form lifecycle          │  │
│  │         │                                         │  │
│  │         ├──→ DATA FETCHING:                      │  │
│  │         │     - useOne → Fetch record for edit   │  │
│  │         │     - Query caching                     │  │
│  │         │     - Live mode support                 │  │
│  │         │                                         │  │
│  │         ├──→ DATA MUTATIONS:                     │  │
│  │         │     - useCreate → Create new record    │  │
│  │         │     - useUpdate → Update existing      │  │
│  │         │     - Optimistic updates               │  │
│  │         │     - Undoable mutations               │  │
│  │         │                                         │  │
│  │         ├──→ AUTO-SAVE:                          │  │
│  │         │     - Debounced saving                 │  │
│  │         │     - Silent mutations                 │  │
│  │         │     - Invalidation control             │  │
│  │         │                                         │  │
│  │         ├──→ NAVIGATION:                         │  │
│  │         │     - Auto redirect after submit       │  │
│  │         │     - Configurable routes              │  │
│  │         │     - URL sync                         │  │
│  │         │                                         │  │
│  │         ├──→ USER EXPERIENCE:                    │  │
│  │         │     - Warn before leaving              │  │
│  │         │     - Loading overtime tracking        │  │
│  │         │     - Success/error notifications      │  │
│  │         │                                         │  │
│  │         └──→ CACHE MANAGEMENT:                   │  │
│  │               - Invalidate on success            │  │
│  │               - Optimistic updates               │  │
│  │               - Auto-refetch                     │  │
│  │                                                   │  │
│  │  Foundation for:                                 │  │
│  │    - useFormReactHookForm → React Hook Form     │  │
│  │    - useFormAntd → Ant Design                   │  │
│  │    - useFormMantine → Mantine                   │  │
│  │    - Custom form integrations                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **The ORCHESTRATOR - Manages entire form lifecycle from data fetching to submission, with advanced features like auto-save, optimistic updates, and smart redirects**

### 1.2 Complete Flow - The Three Actions

```
┌──────────────────────────────────────────────────────────────┐
│                    USEFORM - THREE PATHS                     │
└──────────────────────────────────────────────────────────────┘

PATH 1: CREATE MODE (New Record)
═══════════════════════════════════════════════════════════════

User opens /posts/create
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  useForm({ action: "create" })                              │
│  → No data fetching (new record)                            │
│  → Empty form                                               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  User fills form                                            │
│  { title: "New Post", content: "..." }                      │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  onFinish({ title: "New Post", content: "..." })            │
│  → useCreate mutation                                       │
│  → POST /posts                                              │
│  → Server creates record                                    │
│  → Returns: { id: 123, title: "New Post", ... }            │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Success! Redirect to:                                      │
│  → "edit" (default): /posts/edit/123                        │
│  → "show": /posts/show/123                                  │
│  → "list": /posts                                           │
│  → false: Stay on page                                      │
└─────────────────────────────────────────────────────────────┘


PATH 2: EDIT MODE (Existing Record)
═══════════════════════════════════════════════════════════════

User opens /posts/edit/123
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  useForm({ action: "edit", id: 123 })                       │
│  → useOne({ id: 123 }) - Fetch existing data               │
│  → GET /posts/123                                           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Server returns:                                            │
│  { id: 123, title: "Existing Post", content: "..." }       │
│  → Pre-fill form with existing data                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  User modifies form                                         │
│  { title: "Updated Post", content: "..." }                  │
│                                                              │
│  Optional: Auto-save enabled                                │
│  → onFinishAutoSave debounced                               │
│  → Silent PUT /posts/123 every 1s after change              │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  onFinish({ title: "Updated Post", content: "..." })        │
│  → useUpdate mutation                                       │
│  → PUT /posts/123                                           │
│  → Server updates record                                    │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Success! Redirect to:                                      │
│  → "list" (default): /posts                                 │
│  → "show": /posts/show/123                                  │
│  → false: Stay on page                                      │
└─────────────────────────────────────────────────────────────┘


PATH 3: CLONE MODE (Copy Existing)
═══════════════════════════════════════════════════════════════

User opens /posts/clone/123
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  useForm({ action: "clone", id: 123 })                      │
│  → useOne({ id: 123 }) - Fetch original data               │
│  → GET /posts/123                                           │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Server returns:                                            │
│  { id: 123, title: "Original Post", content: "..." }       │
│  → Pre-fill form (WITHOUT id - new record!)                │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  User modifies cloned data                                  │
│  { title: "Cloned Post", content: "..." }                   │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  onFinish({ title: "Cloned Post", content: "..." })         │
│  → useCreate mutation (NOT update!)                         │
│  → POST /posts (create NEW record)                         │
│  → Returns: { id: 456, title: "Cloned Post", ... }         │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Success! Redirect to edit of NEW record:                   │
│  → /posts/edit/456                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File index.ts: 981 dòng** - The most complex and important hook in Refine!

---

### 2.1 Orchestrator Pattern - Central Coordinator

#### 🎼 VÍ DỤ ĐỜI THƯỜNG: Orchestra Conductor

```
Symphony Orchestra:

WITHOUT Conductor (Chaos):
→ Violins play too fast
→ Drums out of sync
→ Trumpets too loud
→ Mess! ❌

WITH Conductor (Harmony):
→ Conductor coordinates everyone
→ Signals when to start/stop
→ Controls tempo and volume
→ Beautiful music! ✅

useForm = Orchestra Conductor!
→ Coordinates useOne, useCreate, useUpdate
→ Manages timing and flow
→ Ensures everything works together! ✅
```

**Orchestrator Pattern** = Central component coordinates multiple sub-components

#### Implementation:

```typescript
// From index.ts

export const useForm = <...>(...) => {
  // ═══════════════════════════════════════════════════════════
  // ORCHESTRATOR - Coordinates all these hooks:
  // ═══════════════════════════════════════════════════════════

  // 1. Data Fetching
  const queryResult = useOne({
    resource: identifier,
    id,
    // ... fetch existing data for edit/clone
  });

  // 2. Create Mutation
  const createMutation = useCreate({
    mutationOptions: props.createMutationOptions,
  });

  // 3. Update Mutation
  const updateMutation = useUpdate({
    mutationOptions: props.updateMutationOptions,
  });

  // 4. Cache Invalidation
  const invalidate = useInvalidate();

  // 5. Navigation/Redirect
  const handleSubmitWithRedirect = useRedirectionAfterSubmission();

  // 6. Warn on unsaved changes
  const { setWarnWhen } = useWarnAboutChange();

  // 7. Loading overtime
  const { elapsedTime } = useLoadingOvertime({
    isLoading: formLoading,
  });

  // ═══════════════════════════════════════════════════════════
  // ORCHESTRATION LOGIC in onFinish:
  // ═══════════════════════════════════════════════════════════

  const onFinish = async (values: TVariables) => {
    // 1. Disable unsaved changes warning
    setWarnWhen(false);

    // 2. Choose mutation based on action
    const mutation = isEdit ? updateMutation : createMutation;

    // 3. Execute mutation
    const result = await mutation.mutateAsync(variables);

    // 4. Invalidate cache
    if (!isAutosave) {
      invalidate({ resource, id });
    }

    // 5. Redirect user
    if (isPessimistic && !isAutosave) {
      redirect(redirectAction, result.data.id);
    }

    // 6. Return result
    return result;
  };

  // All coordinated from ONE place! ✅
};
```

#### Why Orchestrator?

```typescript
// WITHOUT Orchestrator (User has to coordinate):
const PostEditForm = () => {
  const { data } = useOne({ resource: "posts", id: 123 });
  const { mutate: update } = useUpdate();
  const { setWarnWhen } = useWarnAboutChange();
  const invalidate = useInvalidate();
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    setWarnWhen(false); // Don't forget this!
    await update({ resource: "posts", id: 123, values });
    invalidate({ resource: "posts" }); // Don't forget this!
    navigate("/posts"); // Don't forget this!
  };

  // User must remember ALL steps! ❌
  // Easy to forget something!
};

// WITH Orchestrator (useForm handles everything):
const PostEditForm = () => {
  const { onFinish, query } = useForm();

  const handleSubmit = async (values) => {
    await onFinish(values);
    // That's it! Everything handled! ✅
  };

  // useForm orchestrates all steps automatically! ✅
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Single Responsibility** - User focuses on UI, not logic
- ✅ **DRY Principle** - Don't repeat orchestration code
- ✅ **Consistent Behavior** - All forms work the same way
- ✅ **Easy to Extend** - Add features in one place

---

### 2.2 Strategy Pattern - Three Mutation Modes

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Package Delivery Strategies

```
Delivering a Package:

STRATEGY 1 - Pessimistic (Careful):
→ Deliver package
→ Wait for signature confirmation
→ Then mark as delivered ✅
→ Safe but slow!

STRATEGY 2 - Optimistic (Fast):
→ Mark as delivered immediately
→ Deliver package later
→ If failed, undo mark ⚠️
→ Fast but risky!

STRATEGY 3 - Undoable (Flexible):
→ Mark as delivered
→ Show "Undo" button for 5 seconds
→ If no undo, deliver for real
→ Best user experience! ✨

useForm supports all 3 strategies!
```

**Strategy Pattern** = Choose algorithm at runtime

#### Implementation:

```typescript
// From index.ts (lines 508-755)

const onFinish = async (values: TVariables, { isAutosave = false } = {}) => {
  const isPessimistic = mutationMode === "pessimistic";

  setWarnWhen(false);

  const onSuccessRedirect = (id?: BaseKey) => redirect(redirectAction, id);

  return new Promise((resolve, reject) => {
    // ═══════════════════════════════════════════════════════════
    // STRATEGY 1: OPTIMISTIC / UNDOABLE MODE
    // ═══════════════════════════════════════════════════════════

    if (!isPessimistic && !isAutosave) {
      // Redirect IMMEDIATELY (before server response!)
      deferExecution(() => onSuccessRedirect());

      // Resolve promise immediately
      resolve();
      // → UI updates instantly! ⚡
      // → Mutation happens in background
    }

    // Execute mutation
    mutateAsync(variables)
      .then((data) => {
        // ═══════════════════════════════════════════════════════════
        // STRATEGY 2: PESSIMISTIC MODE
        // ═══════════════════════════════════════════════════════════

        if (isPessimistic && !isAutosave) {
          // Redirect AFTER server confirms
          deferExecution(() => onSuccessRedirect(data?.data?.id));
        }

        resolve(data);
        // → UI updates after server confirms! 🛡️
      })
      .catch(reject);
  });
};
```

#### Three Modes Comparison:

```typescript
// MODE 1: Pessimistic (Safe)
const { onFinish } = useForm({
  mutationMode: "pessimistic",
});

// Flow:
// 1. User clicks submit
// 2. Show loading spinner
// 3. Wait for server response... ⏳
// 4. Server confirms success
// 5. Update UI
// 6. Redirect to list
// → Total time: 2-3 seconds
// → Safe: Only update if server confirms ✅
// → Slow: User waits for server ⏳

// MODE 2: Optimistic (Fast)
const { onFinish } = useForm({
  mutationMode: "optimistic",
});

// Flow:
// 1. User clicks submit
// 2. Update UI immediately ⚡
// 3. Redirect to list immediately ⚡
// 4. Send request to server in background
// 5. If server fails, show error + rollback ⚠️
// → Total time: ~100ms
// → Fast: Instant feedback ⚡
// → Risky: Might need rollback if server fails ⚠️

// MODE 3: Undoable (Flexible)
const { onFinish } = useForm({
  mutationMode: "undoable",
  undoableTimeout: 5000, // 5 seconds to undo
});

// Flow:
// 1. User clicks submit
// 2. Update UI immediately ⚡
// 3. Show "Undo" notification (5 seconds)
// 4. Redirect to list immediately ⚡
// 5. Wait 5 seconds...
// 6. If user clicks undo → Rollback!
// 7. If no undo → Send to server
// → Best UX: Instant + Safety net! ✨
```

#### Real Example - E-commerce Form:

```tsx
function ProductEditForm() {
  // Pessimistic for critical data (prices, stock)
  const pessimisticForm = useForm({
    resource: "products",
    mutationMode: "pessimistic", // ← Wait for confirmation
  });

  // Optimistic for non-critical data (description)
  const optimisticForm = useForm({
    resource: "posts",
    mutationMode: "optimistic", // ← Instant update
  });

  // Undoable for user actions (delete, publish)
  const undoableForm = useForm({
    resource: "posts",
    mutationMode: "undoable", // ← Can undo!
    undoableTimeout: 5000,
  });

  return (
    <div>
      {/* Critical: Wait for server */}
      <PriceForm onFinish={pessimisticForm.onFinish} />

      {/* Non-critical: Update instantly */}
      <DescriptionForm onFinish={optimisticForm.onFinish} />

      {/* User action: Can undo */}
      <PublishButton onClick={undoableForm.onFinish} />
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Choose best strategy for use case
- ✅ **User Experience** - Instant feedback vs safety
- ✅ **Error Handling** - Optimistic can rollback
- ✅ **Configurability** - Per-form or global setting

---

### 2.3 Debouncing Pattern - Auto-Save Optimization

#### ⏱️ VÍ DỤ ĐỜI THƯỜNG: Hotel Elevator

```
Hotel Elevator with Debounce:

WITHOUT Debounce (Wasteful):
→ Person presses button: Floor 5
→ Elevator starts moving
→ Another person arrives: Floor 5
→ Elevator moves again
→ Another person: Floor 5
→ Elevator moves AGAIN!
→ Wasteful! ❌

WITH Debounce (Smart):
→ Person presses button: Floor 5
→ Wait 3 seconds...
→ Another person arrives: Floor 5
→ Reset timer, wait 3 seconds...
→ Another person: Floor 5
→ Reset timer, wait 3 seconds...
→ (No more people for 3 seconds)
→ Elevator moves ONCE with everyone! ✅

Auto-save = Hotel elevator!
→ User types: "H", "e", "l", "l", "o"
→ Wait 1 second after LAST keystroke
→ Save ONCE with "Hello" ✅
```

**Debouncing Pattern** = Delay execution until action stops

#### Implementation:

```typescript
// From index.ts (lines 786-834)

// Step 1: Store onFinish in ref (stable reference)
const onFinishRef = React.useRef(onFinish);

React.useEffect(() => {
  onFinishRef.current = onFinish;
}, [onFinish]);

// Step 2: Create debounced version with useMemo
const onFinishAutoSave = React.useMemo(
  () =>
    asyncDebounce(
      // Function to debounce
      (values: TVariables) => onFinishRef.current(values, { isAutosave: true }),

      // Debounce time (default: 1000ms)
      props.autoSave?.debounce ?? 1000,

      // Cancel message
      "Cancelled by debounce",
    ),
  [props.autoSave?.debounce],
);

// Step 3: Cleanup on unmount
React.useEffect(() => {
  return () => {
    onFinishAutoSave.cancel(); // Cancel pending debounces
  };
}, [onFinishAutoSave]);
```

#### How Debouncing Works:

```typescript
// asyncDebounce internal mechanism:

let timeoutId: NodeJS.Timeout | null = null;

function asyncDebounce(fn, delay, cancelMessage) {
  return function debouncedFunction(...args) {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
      // Previous call cancelled!
    }

    // Create new promise
    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        fn(...args)
          .then(resolve)
          .catch(reject);
      }, delay);
    });
  };
}

// Usage timeline:
// t=0ms:   User types "H" → Schedule save in 1000ms
// t=200ms: User types "e" → Cancel previous, schedule in 1000ms
// t=400ms: User types "l" → Cancel previous, schedule in 1000ms
// t=600ms: User types "l" → Cancel previous, schedule in 1000ms
// t=800ms: User types "o" → Cancel previous, schedule in 1000ms
// t=1800ms: (No more typing) → SAVE "Hello" ✅
//
// Result: 5 keystrokes, only 1 API call! ✅
```

#### Real Example - Auto-Save Form:

```tsx
function BlogPostEditor() {
  const { onFinishAutoSave, autoSaveProps } = useForm({
    resource: "posts",
    action: "edit",
    id: postId,
    autoSave: {
      enabled: true,
      debounce: 2000, // Save 2s after user stops typing
      invalidateOnUnmount: true, // Refresh data when unmount
    },
  });

  return (
    <div>
      {/* Auto-save indicator */}
      <AutoSaveIndicator
        status={autoSaveProps.status}
        data={autoSaveProps.data}
        error={autoSaveProps.error}
      />
      {/* idle: Not saving
          pending: Saving...
          success: Saved! ✅
          error: Error! ❌ */}

      <TextField
        name="title"
        onChange={(e) => {
          // Debounced! Only saves 2s after user stops typing
          onFinishAutoSave({ title: e.target.value });
        }}
      />

      <TextArea
        name="content"
        onChange={(e) => {
          // Same here - debounced auto-save
          onFinishAutoSave({ content: e.target.value });
        }}
      />

      {/* User types fast: No saves
          User stops for 2s: Save once! ✅ */}
    </div>
  );
}
```

#### Performance Comparison:

```
WITHOUT Debouncing:
User types "Hello World" (11 keystrokes)
→ 11 API calls
→ Network: 11 * 100ms = 1100ms
→ Server load: 11 requests
→ Wasteful! ❌

WITH Debouncing (1s):
User types "Hello World" (11 keystrokes in 2s)
→ 1 API call (after user stops)
→ Network: 1 * 100ms = 100ms
→ Server load: 1 request
→ Efficient! ✅

Savings: 90% fewer API calls! 🎉
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Reduce API calls dramatically
- ✅ **Server Load** - Less stress on backend
- ✅ **Network** - Save bandwidth
- ✅ **UX** - No lag from constant saves

---

### 2.4 Promise Pattern - Asynchronous Flow Control

#### 🎁 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order

```
Ordering Food at Restaurant:

SYNCHRONOUS (Blocking):
→ Order food
→ Wait at counter... ⏳
→ Cannot do anything else ❌
→ Get food
→ Sit down and eat

ASYNCHRONOUS (Non-blocking):
→ Order food
→ Get receipt with number
→ Sit down while waiting ✅
→ Read phone, talk to friends ✅
→ Number called
→ Pick up food
→ Eat

Promise = Restaurant receipt!
→ Order = Create promise
→ Receipt = Promise object
→ Number called = Promise resolved
→ Get food = .then() callback
```

**Promise Pattern** = Handle async operations elegantly

#### Implementation:

```typescript
// From index.ts (lines 531-754)

const onFinish = async (values: TVariables, { isAutosave = false } = {}) => {
  // Create promise to control flow
  const submissionPromise = new Promise<CreateResponse | UpdateResponse | void>(
    (resolve, reject) => {
      // ═══════════════════════════════════════════════════════════
      // VALIDATION - Reject early if invalid
      // ═══════════════════════════════════════════════════════════

      if (!resource) return reject(missingResourceError);
      if (isClone && !id) return reject(missingIdError);
      if (!values) return reject(missingValuesError);
      if (isAutosave && !isEdit) return reject(autosaveOnNonEditError);

      // ═══════════════════════════════════════════════════════════
      // OPTIMISTIC MODE - Resolve immediately
      // ═══════════════════════════════════════════════════════════

      if (!isPessimistic && !isAutosave) {
        deferExecution(() => onSuccessRedirect());
        resolve(); // Promise resolved before API call!
      }

      // ═══════════════════════════════════════════════════════════
      // MUTATION - Call API
      // ═══════════════════════════════════════════════════════════

      mutateAsync(variables)
        .then((data) => {
          // Pessimistic: Redirect after success
          if (isPessimistic && !isAutosave) {
            deferExecution(() => onSuccessRedirect(data?.data?.id));
          }

          // Auto-save: Mark as saved
          if (isAutosave) {
            setAutosaved(true);
          }

          resolve(data); // Promise resolved with data
        })
        .catch(reject); // Promise rejected on error
    },
  );

  return submissionPromise; // Return promise to caller
};
```

#### Promise States:

```typescript
// Promise has 3 states:

// 1. PENDING (Waiting)
const promise = onFinish({ title: "Hello" });
// → API call in progress... ⏳
// → promise.status = "pending"

// 2. FULFILLED (Success)
promise.then((data) => {
  console.log("Success!", data);
  // → API call succeeded! ✅
  // → promise.status = "fulfilled"
});

// 3. REJECTED (Error)
promise.catch((error) => {
  console.error("Failed!", error);
  // → API call failed! ❌
  // → promise.status = "rejected"
});
```

#### Real Example - Complex Flow Control:

```tsx
function PostCreateForm() {
  const { onFinish, formLoading } = useForm();
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (values) => {
    try {
      setError(null);

      // Wait for mutation to complete
      const result = await onFinish(values);

      // Do something with result
      console.log("Created post:", result.data);

      // Optional: Custom redirect logic
      if (values.publishImmediately) {
        navigate(`/posts/show/${result.data.id}`);
      } else {
        navigate("/posts");
      }
    } catch (err) {
      // Handle error
      setError(err.message);

      // Show error modal
      Modal.error({
        title: "Failed to create post",
        content: err.message,
      });
    } finally {
      // Always runs
      console.log("Submit attempt finished");
    }
  };

  // Promise pattern enables clean async/await! ✅
}
```

#### Multiple Promises:

```tsx
function BulkEditForm() {
  const { onFinish } = useForm();

  const handleBulkUpdate = async (posts) => {
    // Promise.all - Wait for all
    const results = await Promise.all(
      posts.map((post) => onFinish({ ...post, updated: true })),
    );

    console.log(`Updated ${results.length} posts!`);
  };

  const handleOptionalUpdates = async (posts) => {
    // Promise.allSettled - Don't fail if one fails
    const results = await Promise.allSettled(
      posts.map((post) => onFinish({ ...post, updated: true })),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`Succeeded: ${succeeded}, Failed: ${failed}`);
  };

  // Promises enable complex async patterns! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Async/Await** - Clean syntax for async code
- ✅ **Error Handling** - try/catch works naturally
- ✅ **Flow Control** - Sequential or parallel execution
- ✅ **Composability** - Chain multiple async operations

---

### 2.5 Ref Pattern - Stable References Across Renders

#### 📦 VÍ DỤ ĐỜI THƯỜNG: PO Box at Post Office

```
Receiving Mail:

WITHOUT PO Box (Unstable):
→ Move to new address every day
→ Mail goes to old address ❌
→ Never receive packages!

WITH PO Box (Stable):
→ PO Box #123 never changes ✅
→ Move to new address
→ Mail goes to PO Box
→ Always receive packages! ✅

useRef = PO Box!
→ Component re-renders = New address
→ ref.current = PO Box (stable!)
→ Always access latest value! ✅
```

**Ref Pattern** = Mutable value that persists across renders

#### Implementation:

```typescript
// From index.ts (lines 775-782)

// Store onFinish in ref
const onFinishRef = React.useRef(onFinish);

// Update ref when onFinish changes
React.useEffect(() => {
  onFinishRef.current = onFinish; // Always points to latest!
}, [onFinish]);

// Usage in debounced function
const onFinishAutoSave = React.useMemo(
  () =>
    asyncDebounce(
      (values: TVariables) => onFinishRef.current(values, { isAutosave: true }),
      // ↑ Always calls latest onFinish! ✅
      // Even if debounced function created earlier!

      props.autoSave?.debounce ?? 1000,
      "Cancelled by debounce",
    ),
  [props.autoSave?.debounce],
  // ↑ Only recreate when debounce time changes
  // NOT when onFinish changes!
);
```

#### Why useRef for onFinish?

```typescript
// PROBLEM without ref:

const onFinishAutoSave = React.useMemo(
  () => asyncDebounce((values) => onFinish(values, { isAutosave: true }), 1000),
  [], // ❌ No dependencies - stale closure!
);

// Issue:
// - onFinishAutoSave created on first render
// - Captures onFinish from first render
// - onFinish changes on later renders (new dependencies)
// - onFinishAutoSave still uses OLD onFinish! ❌
// - Stale closure problem!

// SOLUTION with ref:

const onFinishRef = React.useRef(onFinish);

React.useEffect(() => {
  onFinishRef.current = onFinish; // Update ref
}, [onFinish]);

const onFinishAutoSave = React.useMemo(
  () =>
    asyncDebounce(
      (values) => onFinishRef.current(values, { isAutosave: true }),
      // ↑ Always calls latest! ✅
      1000,
    ),
  [], // Can be empty! ref.current always updated!
);
```

#### useRef vs useState:

```typescript
// useState - Causes re-render
const [count, setCount] = useState(0);
setCount(1); // → Component re-renders! ↻

// useRef - No re-render
const countRef = useRef(0);
countRef.current = 1; // → No re-render! ✅

// When to use each:
// - useState: Value affects UI (render-dependent)
// - useRef: Value doesn't affect UI (render-independent)
```

#### Real Example - Timer with Ref:

```tsx
function AutoSaveTimer() {
  const { onFinishAutoSave } = useForm({
    autoSave: { enabled: true },
  });

  const [values, setValues] = useState({ title: "" });
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleChange = (e) => {
    const newValues = { ...values, [e.target.name]: e.target.value };
    setValues(newValues);

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      onFinishAutoSave(newValues);
    }, 1000);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current); // ✅ No memory leak!
      }
    };
  }, []);

  // timerRef persists across renders! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - No re-renders on update
- ✅ **Closure Stability** - Always access latest value
- ✅ **Cleanup** - Store timeout/interval IDs
- ✅ **Memoization** - Stable dependencies for useMemo

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern          | Ví dụ đời thường       | Giải quyết vấn đề gì         | Trong useForm                 |
| ---------------- | ---------------------- | ---------------------------- | ----------------------------- |
| **Orchestrator** | Orchestra conductor    | Coordinate multiple hooks    | Manages entire form lifecycle |
| **Strategy**     | Package delivery types | Choose algorithm at runtime  | 3 mutation modes              |
| **Debouncing**   | Hotel elevator         | Delay execution until idle   | Auto-save optimization        |
| **Promise**      | Restaurant order       | Handle async operations      | onFinish async flow           |
| **Ref**          | Post office PO box     | Stable reference across time | Latest onFinish in debounce   |

---

## 3. KEY FEATURES

### 3.1 Three Actions: Create, Edit, Clone

```typescript
// CREATE - New record
const createForm = useForm({
  resource: "posts",
  action: "create", // Default
});
// → No data fetching
// → Uses useCreate
// → Redirect to edit after success

// EDIT - Update existing
const editForm = useForm({
  resource: "posts",
  action: "edit",
  id: 123,
});
// → Fetches data with useOne
// → Pre-fills form
// → Uses useUpdate
// → Redirect to list after success

// CLONE - Copy existing
const cloneForm = useForm({
  resource: "posts",
  action: "clone",
  id: 123,
});
// → Fetches data with useOne
// → Pre-fills form (without id)
// → Uses useCreate (new record!)
// → Redirect to edit of NEW record
```

### 3.2 Auto-Save with Debouncing

```typescript
const { onFinishAutoSave, autoSaveProps } = useForm({
  resource: "posts",
  action: "edit",
  id: 123,
  autoSave: {
    enabled: true,
    debounce: 1000, // 1 second
    invalidateOnUnmount: true,
  },
});

// Auto-save features:
// ✅ Debounced (1s after user stops typing)
// ✅ Silent (no notifications)
// ✅ No cache invalidation (prevent refetch loops)
// ✅ Status indicator (idle/pending/success/error)
// ✅ Cleanup on unmount
```

### 3.3 Three Mutation Modes

```typescript
// Pessimistic - Wait for server
const form1 = useForm({
  mutationMode: "pessimistic",
});

// Optimistic - Update UI immediately
const form2 = useForm({
  mutationMode: "optimistic",
});

// Undoable - Can undo within timeout
const form3 = useForm({
  mutationMode: "undoable",
  undoableTimeout: 5000, // 5 seconds
});
```

### 3.4 Smart Redirects

```typescript
const form = useForm({
  redirect: "show", // or "list", "edit", false

  // Custom redirect logic
  onMutationSuccess: (data) => {
    if (data.status === "draft") {
      redirect("edit", data.id);
    } else {
      redirect("show", data.id);
    }
  },
});

// Default redirects:
// Create → edit (of new record)
// Edit → list
// Clone → edit (of new record)
```

### 3.5 Warn on Unsaved Changes

```typescript
const form = useForm({
  warnWhenUnsavedChanges: true, // Global setting
});

// Automatically warns:
// → User tries to navigate away
// → Form has changes
// → Not submitted yet
// → Browser shows confirmation dialog

// Disabled after:
// → onFinish called
// → Auto-save completed
```

### 3.6 Loading Overtime Tracking

```typescript
const { overtime } = useForm({
  overtimeOptions: {
    interval: 1000, // Check every second
    onInterval: (elapsedTime) => {
      if (elapsedTime > 5000) {
        console.log("Loading too long! Show skeleton");
      }
    },
  },
});

// overtime.elapsedTime → milliseconds since loading started
```

---

## 4. COMMON USE CASES

### 4.1 Basic Create Form

```tsx
function PostCreate() {
  const { onFinish, formLoading } = useForm();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        onFinish({
          title: formData.get("title"),
          content: formData.get("content"),
        });
      }}
    >
      <input name="title" placeholder="Title" />
      <textarea name="content" placeholder="Content" />
      <button type="submit" disabled={formLoading}>
        {formLoading ? "Creating..." : "Create Post"}
      </button>
    </form>
  );
}
```

### 4.2 Edit Form with Pre-filled Data

```tsx
function PostEdit() {
  const { onFinish, query } = useForm({
    action: "edit",
    id: postId,
  });

  if (query.isLoading) return <div>Loading...</div>;

  const post = query.data?.data;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        onFinish({
          title: formData.get("title"),
          content: formData.get("content"),
        });
      }}
    >
      <input name="title" defaultValue={post?.title} />
      <textarea name="content" defaultValue={post?.content} />
      <button type="submit">Update Post</button>
    </form>
  );
}
```

### 4.3 Auto-Save Form

```tsx
function BlogEditor() {
  const { onFinishAutoSave, autoSaveProps } = useForm({
    action: "edit",
    id: postId,
    autoSave: {
      enabled: true,
      debounce: 2000,
    },
  });

  const [values, setValues] = useState({ title: "", content: "" });

  const handleChange = (field, value) => {
    const newValues = { ...values, [field]: value };
    setValues(newValues);
    onFinishAutoSave(newValues); // Debounced auto-save
  };

  return (
    <div>
      {/* Auto-save indicator */}
      <div>
        {autoSaveProps.status === "pending" && "Saving..."}
        {autoSaveProps.status === "success" && "Saved ✅"}
        {autoSaveProps.status === "error" && "Error ❌"}
      </div>

      <input
        value={values.title}
        onChange={(e) => handleChange("title", e.target.value)}
      />

      <textarea
        value={values.content}
        onChange={(e) => handleChange("content", e.target.value)}
      />
    </div>
  );
}
```

### 4.4 Clone Form

```tsx
function PostClone() {
  const { onFinish, query } = useForm({
    action: "clone",
    id: originalPostId,
  });

  const original = query.data?.data;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        onFinish({
          title: formData.get("title"),
          content: formData.get("content"),
          // Note: No id! Creates NEW record
        });
      }}
    >
      <p>Cloning from: {original?.title}</p>
      <input name="title" defaultValue={`${original?.title} (Copy)`} />
      <textarea name="content" defaultValue={original?.content} />
      <button type="submit">Create Clone</button>
    </form>
  );
}
```

### 4.5 Optimistic Update Form

```tsx
function QuickEditForm() {
  const { onFinish } = useForm({
    mutationMode: "optimistic",
    // UI updates instantly! ⚡
  });

  const handleQuickSave = async (values) => {
    try {
      await onFinish(values);
      // User redirected immediately!
      // Mutation happens in background
    } catch (error) {
      // If server fails, show error
      // UI already updated (optimistic)
      alert("Failed to save! Rolling back...");
    }
  };

  return <FastEditUI onSave={handleQuickSave} />;
}
```

### 4.6 Custom Redirect Logic

```tsx
function StatusDependentForm() {
  const { onFinish, redirect } = useForm({
    redirect: false, // Disable default redirect

    onMutationSuccess: (data) => {
      // Custom redirect based on data
      if (data.data.status === "draft") {
        redirect("edit", data.data.id);
      } else if (data.data.status === "published") {
        redirect("show", data.data.id);
      } else {
        redirect("list");
      }
    },
  });

  return <FormUI onSubmit={onFinish} />;
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Orchestrator Pattern?

**Answer:** Consistency and Developer Experience

```
Without useForm:
→ 15+ lines of boilerplate per form
→ Easy to forget steps (invalidate, redirect, etc.)
→ Inconsistent behavior across forms
→ Hard to add global features

With useForm:
→ 1 line: const { onFinish } = useForm()
→ All steps handled automatically
→ Consistent behavior everywhere
→ Easy to add features globally
```

### 5.2 Why Three Mutation Modes?

**Answer:** Different use cases need different strategies

```
Pessimistic:
→ Financial transactions
→ Critical data (prices, inventory)
→ When rollback is expensive

Optimistic:
→ Social media (likes, comments)
→ Non-critical data
→ When speed matters

Undoable:
→ User actions (delete, publish)
→ Balance of speed + safety
→ Best UX for most cases
```

### 5.3 Why Separate Auto-Save Function?

**Answer:** Different behavior for manual vs auto

```
onFinish (manual):
→ Show notifications
→ Invalidate cache
→ Redirect user
→ User-initiated action

onFinishAutoSave (auto):
→ No notifications (silent)
→ No cache invalidation
→ No redirect
→ Background action
```

### 5.4 Why Promise Instead of Callback?

**Answer:** Modern async/await syntax

```
Callback (old):
onFinish(values, (error, data) => {
  if (error) {
    // handle error
  } else {
    // handle success
  }
}); // Callback hell! ❌

Promise (modern):
try {
  const data = await onFinish(values);
  // handle success ✅
} catch (error) {
  // handle error ✅
} // Clean! ✅
```

### 5.5 Why useRef for onFinish?

**Answer:** Avoid recreating debounced function

```
Without ref:
→ onFinish changes (new dependencies)
→ Must recreate onFinishAutoSave
→ Lose pending debounces
→ Auto-save breaks! ❌

With ref:
→ onFinish changes
→ Update ref.current
→ onFinishAutoSave stays same
→ Debounces preserved! ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting to Handle Loading State

```typescript
// ❌ WRONG
const { onFinish } = useForm();
return <button onClick={onFinish}>Submit</button>;
// Button enabled during submission! Multiple clicks!

// ✅ CORRECT
const { onFinish, formLoading } = useForm();
return (
  <button onClick={onFinish} disabled={formLoading}>
    {formLoading ? "Submitting..." : "Submit"}
  </button>
);
```

### 6.2 Using Auto-Save with Create Action

```typescript
// ❌ WRONG
const { onFinishAutoSave } = useForm({
  action: "create", // ← Error!
  autoSave: { enabled: true },
});
// Auto-save only works with edit! ❌

// ✅ CORRECT
const { onFinishAutoSave } = useForm({
  action: "edit", // ← Must be edit!
  autoSave: { enabled: true },
});
```

### 6.3 Not Providing ID for Edit/Clone

```typescript
// ❌ WRONG
const { onFinish } = useForm({
  resource: "posts",
  action: "edit",
  // Missing id! ❌
});

// ✅ CORRECT
const { onFinish } = useForm({
  resource: "posts",
  action: "edit",
  id: 123, // ← Required for edit/clone!
});
```

### 6.4 Calling onFinish Without Values

```typescript
// ❌ WRONG
const { onFinish } = useForm();
<button onClick={() => onFinish()}>Submit</button>;
// No values! Promise rejected!

// ✅ CORRECT
const { onFinish } = useForm();
<button onClick={() => onFinish({ title: "Hello" })}>Submit</button>;
```

### 6.5 Expecting Optimistic Mode to Wait

```typescript
// ❌ WRONG - Optimistic mode
const { onFinish } = useForm({
  mutationMode: "optimistic",
});

const handleSubmit = async (values) => {
  const result = await onFinish(values);
  console.log(result.data.id); // ← undefined! Already redirected!
};

// ✅ CORRECT - Pessimistic mode
const { onFinish } = useForm({
  mutationMode: "pessimistic", // ← Wait for server
});

const handleSubmit = async (values) => {
  const result = await onFinish(values);
  console.log(result.data.id); // ← Works! ✅
};
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Auto-Save Debounce Time

```
Too short (< 500ms):
→ Too many API calls
→ Server overload
→ Network congestion

Too long (> 5000ms):
→ Long wait after typing stops
→ Might lose changes
→ Poor UX

Recommended: 1000-2000ms (1-2 seconds)
```

### 7.2 Query Enabled Optimization

```typescript
// Optimize by disabling unnecessary queries
const { query } = useForm({
  action: "create",
  // Query auto-disabled for create! ✅

  queryOptions: {
    enabled: shouldFetch, // Conditional fetching
  },
});
```

### 7.3 Mutation Mode Performance

```
Pessimistic:
→ Wait for server: ~500ms
→ User sees loading longer
→ Safest but slowest

Optimistic:
→ Update UI immediately: ~0ms
→ User sees instant feedback
→ Fastest but risky

Undoable:
→ Update UI + 5s delay
→ Best balance for most cases
```

---

## 8. TESTING

```typescript
// From index.spec.tsx

describe("useForm Hook", () => {
  it("fetches data when in edit mode", async () => {
    const { result } = renderHook(() => useForm({ resource: "posts" }), {
      wrapper: EditWrapper,
    });

    await waitFor(() => {
      expect(!result.current.formLoading).toBeTruthy();
    });

    expect(result.current.query?.data?.data.title).toEqual(posts[0].title);
  });

  it("uses correct meta values when fetching", async () => {
    const getOneMock = vi.fn();

    renderHook(
      () =>
        useForm({
          resource: "posts",
          action: "edit",
          id: 1,
          meta: { foo: "baz" },
          queryMeta: { foo: "bar" },
        }),
      { wrapper: TestWrapper({ dataProvider: { getOne: getOneMock } }) },
    );

    await waitFor(() => {
      expect(getOneMock).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({ foo: "bar" }),
        }),
      );
    });
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Orchestrator**: Coordinates all form operations
- ✅ **Strategy**: Three mutation modes
- ✅ **Debouncing**: Auto-save optimization
- ✅ **Promise**: Clean async flow
- ✅ **Ref**: Stable references for closures

### Key Features

1. **Three Actions** - Create, Edit, Clone
2. **Three Mutation Modes** - Pessimistic, Optimistic, Undoable
3. **Auto-Save** - Debounced, silent mutations
4. **Smart Redirects** - Configurable navigation
5. **Warn on Changes** - Prevent data loss
6. **Loading Overtime** - Track long operations

### Khi nào dùng useForm?

✅ **Nên dùng:**

- Building forms (obviously!)
- Need full lifecycle management
- Want consistent form behavior
- Need auto-save functionality
- Building form library integrations

❌ **Không dùng:**

- Simple read-only data (use useOne)
- List operations (use useList)
- Custom mutations (use useCreate/useUpdate directly)
- Non-CRUD operations (use useCustomMutation)

### Remember

✅ **981 lines** - Most complex hook in Refine
🎼 **Orchestrator** - Coordinates everything
🎯 **Strategy** - Three mutation modes
⏱️ **Debouncing** - Auto-save optimization
🎁 **Promise** - Async flow control
📦 **Ref** - Stable closures

---

> 📚 **Best Practice**: Always handle **formLoading** state. Use **pessimistic** mode for critical data. Use **optimistic** for speed. Use **auto-save** for long forms. Always provide **id** for edit/clone. Use **onMutationSuccess** for custom logic. Enable **warnWhenUnsavedChanges** to prevent data loss!
