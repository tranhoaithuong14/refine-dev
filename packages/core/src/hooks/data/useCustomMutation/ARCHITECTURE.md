# Kiến trúc và Design Patterns của useCustomMutation Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │           DATA MUTATION SYSTEM                    │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  STANDARD MUTATIONS (Predefined):                │  │
│  │    - useCreate      → POST /posts                │  │
│  │    - useUpdate      → PUT /posts/1               │  │
│  │    - useDelete      → DELETE /posts/1            │  │
│  │         ↑                                         │  │
│  │         │ Standard patterns                       │  │
│  │         │                                         │  │
│  │  ────────────────────────────────────────────    │  │
│  │                                                   │  │
│  │  CUSTOM MUTATIONS (Flexible): ✅                 │  │
│  │    useCustomMutation ✅ (THIS HOOK)               │  │
│  │    → POST /api/email/send                        │  │
│  │    → POST /api/reports/generate                  │  │
│  │    → POST /api/payment/process                   │  │
│  │    → DELETE /api/cache/clear                     │  │
│  │    → ANY write endpoint!                         │  │
│  │         │                                         │  │
│  │         ├──→ Notifications                       │  │
│  │         ├──→ Error Handling                      │  │
│  │         └──→ NO auto cache invalidation ⚠️       │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Execute ANY custom mutation that doesn't fit standard CRUD - email sending, report generation, payment processing, cache clearing, etc.**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│              USECUSTOMMUTATION FLOW                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Initializes Hook                         │
│  const { mutate } = useCustomMutation();                     │
│  // Hook ready, but NOT executed yet! ⚠️                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: User Triggers Action                               │
│  <button onClick={() => mutate({                             │
│    url: "/api/email/send",                                   │
│    method: "post",                                           │
│    values: { to: "...", subject: "..." }                     │
│  })}>                                                        │
│    Send Email                                                │
│  </button>                                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check Data Provider                                │
│  Does dataProvider have custom() method? ✅                  │
│  (If no: throw error)                                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Execute Mutation                                    │
│  dataProvider.custom({                                       │
│    url: "/api/email/send",                                   │
│    method: "post",                                           │
│    payload: { to: "...", subject: "..." },                   │
│    headers: { ... }                                          │
│  })                                                          │
│  → POST /api/email/send                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Handle Success (onSuccess)                         │
│  - Show success notification                                │
│  - Call user's onSuccess callback                           │
│  - NO auto cache invalidation! ⚠️                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: OR Handle Error (onError)                          │
│  - Call checkError handler                                  │
│  - Show error notification                                  │
│  - Call user's onError callback                             │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 KEY DIFFERENCE vs useCustom

```
┌──────────────────────────────────────────────────────────┐
│             useCustom vs useCustomMutation               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  useCustom (QUERY):                                      │
│    - Purpose: Read operations                           │
│    - Execution: Automatic (on mount)                    │
│    - Methods: ANY (GET/POST/etc) ✅                     │
│    - Caching: YES ✅                                    │
│    - Refetch: YES ✅                                    │
│    - Use case: Dashboard, search, stats                 │
│                                                          │
│  useCustomMutation (MUTATION): ✅ (THIS HOOK)            │
│    - Purpose: Write operations                          │
│    - Execution: Manual (call mutate) ✅                 │
│    - Methods: POST/PUT/PATCH/DELETE only ⚠️            │
│    - Caching: NO ❌                                     │
│    - Refetch: NO ❌                                     │
│    - Use case: Email, payments, reports                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useCustomMutation.ts: 233 dòng** - Flexible custom mutation operations!

---

### 2.1 Command Pattern - Encapsulated Mutation Request

#### 📜 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order Ticket

```
Restaurant Kitchen:

❌ BAD - Waiter shouts order directly:
Waiter: "Hey chef! Make burger! No pickles!"
→ Chaotic! Hard to track! ❌

✅ GOOD - Written order ticket (Command):
┌─────────────────────────┐
│ TABLE 5                 │
│ ORDER #123              │
│ 1x Burger (no pickles)  │
│ 1x Fries                │
│ Time: 12:30 PM          │
└─────────────────────────┘
→ Clear! Traceable! Can be queued! ✅

useCustomMutation = Order ticket!
→ Package mutation as command object
→ Execute when ready
→ Track status
```

**Command Pattern** = Encapsulate request as object

#### Implementation:

```typescript
// From useCustomMutation.ts (lines 35-52)

// COMMAND OBJECT:
type useCustomMutationParams<TData, TError, TVariables> = {
  url: string;                    // ← Where to send
  method: "post" | "put" | "patch" | "delete"; // ← What to do
  values: TVariables;             // ← Payload
  meta?: MetaQuery;               // ← Metadata
  dataProviderName?: string;      // ← Which provider
  config?: UseCustomMutationConfig; // ← Headers
  // Notifications:
  successNotification?: ...;
  errorNotification?: ...;
};

// Usage:
const { mutate } = useCustomMutation();

// Create command object:
const emailCommand = {
  url: "/api/email/send",
  method: "post",
  values: {
    to: "user@example.com",
    subject: "Welcome!",
    body: "..."
  }
};

// Execute command:
mutate(emailCommand);
```

#### Real Example - Email Sending:

```tsx
function SendEmailButton() {
  const { mutate, mutation } = useCustomMutation();

  const handleSendEmail = () => {
    // Command object
    mutate({
      url: "/api/email/send",
      method: "post",
      values: {
        to: "customer@example.com",
        subject: "Order Confirmation",
        body: "Thank you for your order!",
        attachments: ["receipt.pdf"],
      },
      successNotification: {
        message: "Email sent successfully!",
        type: "success",
      },
      errorNotification: {
        message: "Failed to send email",
        type: "error",
      },
    });
  };

  return (
    <button onClick={handleSendEmail} disabled={mutation.isPending}>
      {mutation.isPending ? "Sending..." : "Send Email"}
    </button>
  );
}
```

#### Why Command Pattern?

```typescript
// ✅ BENEFITS:

// 1. DEFERRED EXECUTION
const { mutate } = useCustomMutation();
// Hook created, but command not executed until:
mutate({ ... }); // ← Executed here!

// 2. PARAMETERIZATION
const sendEmail = (recipient) => {
  mutate({
    url: "/api/email/send",
    method: "post",
    values: { to: recipient } // ← Different params each time
  });
};

// 3. QUEUEING
const commands = [
  { url: "/api/email/1", method: "post", values: {...} },
  { url: "/api/email/2", method: "post", values: {...} },
  { url: "/api/email/3", method: "post", values: {...} }
];
commands.forEach(cmd => mutate(cmd)); // Execute in sequence

// 4. UNDO/REDO (if needed)
const lastCommand = { ... };
mutate(lastCommand); // Re-execute command
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Deferred Execution** - Create hook, execute later
- ✅ **Parameterization** - Same hook, different params
- ✅ **Encapsulation** - All mutation details in one object
- ✅ **Traceable** - Easy to log/debug

---

### 2.2 Strategy Pattern - Method Selection

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Delivery Methods

```
Package Delivery:

Different methods for different needs:
- POST Office → Create new package record
- PUT Truck → Update entire delivery route
- PATCH Motorcycle → Update just delivery status
- DELETE Return → Remove failed delivery

useCustomMutation supports all strategies!
```

**Strategy Pattern** = Choose mutation method at runtime

#### Implementation:

```typescript
// From useCustomMutation.ts (line 37)

method: "post" | "put" | "patch" | "delete"
// ⚠️ NOTE: NO "get" or "head"! Write operations only!

// Different strategies:

// STRATEGY 1: POST (Create/Send)
mutate({
  url: "/api/email/send",
  method: "post", // ← Create new email
  values: { ... }
});

// STRATEGY 2: PUT (Full Replace)
mutate({
  url: "/api/settings",
  method: "put", // ← Replace all settings
  values: { theme: "dark", language: "en", ... }
});

// STRATEGY 3: PATCH (Partial Update)
mutate({
  url: "/api/settings",
  method: "patch", // ← Update only one setting
  values: { theme: "dark" } // Only theme changed
});

// STRATEGY 4: DELETE (Remove)
mutate({
  url: "/api/cache/clear",
  method: "delete", // ← Clear cache
  values: {} // Empty payload
});
```

#### Real Examples:

```tsx
// Example 1: POST - Report Generation
function GenerateReportButton() {
  const { mutate, mutation } = useCustomMutation();

  const handleGenerate = () => {
    mutate({
      url: "/api/reports/generate",
      method: "post", // ← Create new report
      values: {
        type: "sales",
        startDate: "2024-01-01",
        endDate: "2024-12-31",
        format: "pdf",
      },
    });
  };

  return <button onClick={handleGenerate}>Generate Report</button>;
}

// Example 2: PUT - Replace Settings
function SaveAllSettings({ settings }) {
  const { mutate } = useCustomMutation();

  const handleSave = () => {
    mutate({
      url: "/api/user/settings",
      method: "put", // ← Replace entire settings object
      values: settings, // All settings
    });
  };

  return <button onClick={handleSave}>Save All Settings</button>;
}

// Example 3: PATCH - Update One Field
function ToggleNotifications({ enabled }) {
  const { mutate } = useCustomMutation();

  const handleToggle = () => {
    mutate({
      url: "/api/user/settings",
      method: "patch", // ← Update only one field
      values: { notifications: !enabled },
    });
  };

  return <button onClick={handleToggle}>Toggle Notifications</button>;
}

// Example 4: DELETE - Clear Cache
function ClearCacheButton() {
  const { mutate, mutation } = useCustomMutation();

  const handleClear = () => {
    mutate({
      url: "/api/cache/clear",
      method: "delete", // ← Delete operation
      values: {}, // No payload needed
    });
  };

  return (
    <button onClick={handleClear} disabled={mutation.isPending}>
      {mutation.isPending ? "Clearing..." : "Clear Cache"}
    </button>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Semantic Clarity** - Method shows intent
- ✅ **HTTP Compliance** - Follows REST standards
- ✅ **Flexibility** - Choose right method for operation
- ✅ **Server Optimization** - Server can optimize by method

---

### 2.3 Template Method Pattern - Reusable Mutation Structure

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Assembly Line Template

```
Car Assembly Line:

TEMPLATE (same for all cars):
1. Weld chassis
2. Install engine
3. Add interior
4. Paint
5. Quality check

VARIATIONS (different details):
- Sports car: V8 engine, leather seats, red paint
- Sedan: V6 engine, cloth seats, blue paint

Structure same, details different! ✅

useCustomMutation uses same pattern!
```

**Template Method** = Define skeleton, vary implementations

#### Implementation:

```typescript
// TEMPLATE STRUCTURE (same for all mutations):

export const useCustomMutation = () => {
  // 1. Setup (same for all)
  const dataProvider = useDataProvider();
  const handleNotification = useHandleNotification();
  const { mutate: checkError } = useOnError();

  // 2. useMutation (same pattern)
  const mutationResult = useMutation({
    mutationFn: ({ url, method, values, ... }) => {
      // Execute custom mutation
      return dataProvider.custom({ url, method, payload: values });
    },

    // 3. onSuccess (same structure)
    onSuccess: (data, variables, context) => {
      // Show notification ✅
      handleNotification(...);
      // Call user callback ✅
      mutationOptions?.onSuccess?.(data, variables, context);
    },

    // 4. onError (same structure)
    onError: (err, variables, context) => {
      // Check error ✅
      checkError(err);
      // Show notification ✅
      handleNotification(...);
      // Call user callback ✅
      mutationOptions?.onError?.(err, variables, context);
    }
  });

  // 5. Return (same shape)
  return { mutate, mutateAsync, mutation };
};

// VARIATIONS (different mutations use same template):
// - Email sending: POST /api/email/send
// - Report generation: POST /api/reports/generate
// - Payment processing: POST /api/payment/process
// - Cache clearing: DELETE /api/cache/clear

// All use same template! ✅
```

#### Comparison with Other Mutation Hooks:

```typescript
// useCreate template:
mutationFn: (variables) => {
  return dataProvider.create({
    // ← Standard create
    resource: "posts",
    variables: variables,
  });
};

// useUpdate template:
mutationFn: (variables) => {
  return dataProvider.update({
    // ← Standard update
    resource: "posts",
    id: id,
    variables: variables,
  });
};

// useCustomMutation template:
mutationFn: ({ url, method, values }) => {
  return dataProvider.custom({
    // ← Custom endpoint!
    url: url, // ← User provides URL
    method: method, // ← User provides method
    payload: values,
  });
};

// Same structure (template), different data provider methods!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - Same behavior as useCreate/useUpdate
- ✅ **Predictability** - Developers know what to expect
- ✅ **Maintainability** - Fix once, all hooks benefit
- ✅ **Code Reuse** - Don't repeat notification/error logic

---

### 2.4 Lazy Execution Pattern - Manual Trigger

#### ⏸️ VÍ DỤ ĐỜI THƯỜNG: Camera Shutter Button

```
Camera:

❌ AUTO MODE (useCustom - Query):
→ Camera auto-takes photo when you open it
→ Good for: Continuous monitoring

✅ MANUAL MODE (useCustomMutation):
→ Camera ready, but waits for you to press button
→ Good for: Controlled actions

useCustomMutation = Manual mode!
```

**Lazy Execution** = Initialize but don't execute until triggered

#### Implementation:

```typescript
// useCustom (QUERY) - Auto-executes:
const { data } = useCustom({
  url: "/api/stats",
  method: "get"
});
// ↑ Executes IMMEDIATELY on mount! ✅
// Good for: Data fetching


// useCustomMutation (MUTATION) - Lazy:
const { mutate } = useCustomMutation();
// ↑ Hook created, but NOT executed! ⚠️

// Must call mutate() manually:
mutate({
  url: "/api/email/send",
  method: "post",
  values: { ... }
});
// ↑ NOW it executes! ✅
// Good for: User actions
```

#### Why Lazy Execution?

```tsx
// REASON 1: User-Triggered Actions
function PaymentButton({ amount }) {
  const { mutate } = useCustomMutation();

  // Don't charge automatically! ❌
  // Wait for user to click button ✅

  return (
    <button onClick={() => mutate({
      url: "/api/payment/charge",
      method: "post",
      values: { amount }
    })}>
      Pay ${amount}
    </button>
  );
}


// REASON 2: Conditional Mutations
function DeleteButton({ itemId, confirmed }) {
  const { mutate } = useCustomMutation();

  const handleDelete = () => {
    if (!confirmed) {
      alert("Please confirm first!");
      return; // Don't execute
    }

    // Only execute if confirmed
    mutate({
      url: `/api/items/${itemId}`,
      method: "delete",
      values: {}
    });
  };

  return <button onClick={handleDelete}>Delete</button>;
}


// REASON 3: Sequential Mutations
function MultiStepProcess() {
  const { mutate } = useCustomMutation();

  const handleProcess = async () => {
    // Step 1: Validate
    const validation = await mutateAsync({
      url: "/api/validate",
      method: "post",
      values: { ... }
    });

    if (!validation.data.valid) return;

    // Step 2: Process (only if step 1 succeeds)
    mutate({
      url: "/api/process",
      method: "post",
      values: { ... }
    });
  };

  return <button onClick={handleProcess}>Start Process</button>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **User Control** - Execute only when user wants
- ✅ **Conditional Logic** - Can add validation before execution
- ✅ **No Accidental Execution** - Won't run on component mount
- ✅ **Sequential Operations** - Control execution order

---

### 2.5 No Cache Invalidation Pattern - Explicit Intent

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Sending vs Receiving Mail

```
Post Office:

When you SEND a letter (mutation):
→ You DON'T need to check your mailbox (cache)
→ Sending ≠ Receiving

When you CREATE a post (useCreate):
→ Automatically refresh post list (cache invalidation) ✅
→ Makes sense! New post should show in list!

When you SEND an email (useCustomMutation):
→ DON'T automatically refresh anything ⚠️
→ Email sending ≠ Email list
→ Custom operation, unpredictable side effects!

useCustomMutation = No assumptions about cache!
```

**No Cache Invalidation** = Don't assume what data changed

#### Implementation:

```typescript
// useCreate - Auto cache invalidation:
const { mutate } = useCreate();
mutate({
  resource: "posts",
  values: { title: "..." }
});
// ↑ After success:
// - Invalidates "list" query (posts list) ✅
// - Invalidates "many" query ✅
// - Post list auto-refreshes! ✅


// useCustomMutation - NO auto cache invalidation:
const { mutate } = useCustomMutation();
mutate({
  url: "/api/email/send",
  method: "post",
  values: { ... }
});
// ↑ After success:
// - NO cache invalidation ⚠️
// - NO auto-refresh ⚠️
// - You invalidate manually if needed! ✅
```

#### Manual Invalidation When Needed:

```tsx
function SendEmailButton() {
  const { mutate } = useCustomMutation();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  const handleSend = () => {
    mutate({
      url: "/api/email/send",
      method: "post",
      values: { ... },
      onSuccess: () => {
        // Manual invalidation if needed:

        // Option 1: Invalidate specific resource
        invalidate({
          resource: "sent-emails",
          invalidates: ["list"]
        });

        // Option 2: Invalidate specific query
        queryClient.invalidateQueries({
          queryKey: ["custom", "get", "/api/email/stats"]
        });

        // Option 3: Do nothing (email sent, no list to refresh)
        // ← Most common for custom mutations! ✅
      }
    });
  };

  return <button onClick={handleSend}>Send Email</button>;
}
```

#### Why No Auto-Invalidation?

```typescript
// REASON 1: Unpredictable Side Effects

// Email sending:
mutate({ url: "/api/email/send", method: "post", values: {...} });
// What to invalidate? ❓
// - Email list? (maybe)
// - Notification count? (maybe)
// - User stats? (maybe)
// - Nothing? (maybe)
// → Can't know! User decides! ✅


// REASON 2: Non-Resource Operations

// Generate report:
mutate({ url: "/api/reports/generate", method: "post", values: {...} });
// No "resource" involved!
// Nothing to invalidate!
// → Manual download, no cache! ✅


// REASON 3: Third-Party Services

// Charge payment:
mutate({ url: "/api/payment/stripe", method: "post", values: {...} });
// External service!
// No Refine cache involved!
// → No invalidation needed! ✅


// REASON 4: Performance

// Bulk operation:
mutate({ url: "/api/sync/all", method: "post", values: {...} });
// Could affect MANY caches!
// Invalidating all = slow! ❌
// → User invalidates only what changed! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Explicit Intent** - User decides what to invalidate
- ✅ **Performance** - Don't invalidate unnecessarily
- ✅ **Flexibility** - Custom ops have custom side effects
- ✅ **Predictability** - No hidden cache mutations

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                   | Ví dụ đời thường        | Giải quyết vấn đề gì   | Trong useCustomMutation      |
| ------------------------- | ----------------------- | ---------------------- | ---------------------------- |
| **Command**               | Restaurant order ticket | Encapsulate request    | Mutation params object       |
| **Strategy**              | Delivery methods        | Choose mutation method | POST/PUT/PATCH/DELETE        |
| **Template Method**       | Assembly line           | Reuse structure        | Same as useCreate pattern    |
| **Lazy Execution**        | Camera shutter button   | Manual trigger         | Call mutate() when ready     |
| **No Cache Invalidation** | Sending mail            | Explicit side effects  | User decides what to refresh |

---

## 3. KEY FEATURES

### 3.1 Write-Only Methods

```typescript
// Only mutation methods supported:
method: "post" | "put" | "patch" | "delete";

// ❌ NO read methods:
// method: "get"   ← Use useCustom instead!
// method: "head"  ← Use useCustom instead!
```

### 3.2 Manual Execution

```typescript
const { mutate, mutateAsync } = useCustomMutation();

// Sync (fire and forget):
mutate({ url: "...", method: "post", values: {...} });

// Async (await result):
const result = await mutateAsync({
  url: "...",
  method: "post",
  values: {...}
});
```

### 3.3 Mutation State

```typescript
const { mutation } = useCustomMutation();

// Loading state
mutation.isPending; // true during execution

// Success state
mutation.isSuccess; // true after success
mutation.data; // Response data

// Error state
mutation.isError; // true on error
mutation.error; // Error object

// Reset
mutation.reset(); // Clear mutation state
```

### 3.4 Notifications

```typescript
mutate({
  url: "/api/email/send",
  method: "post",
  values: {...},
  successNotification: {
    message: "Email sent!",
    type: "success"
  },
  errorNotification: (error) => ({
    message: `Failed: ${error.message}`,
    type: "error"
  })
});
```

### 3.5 Custom Headers

```typescript
mutate({
  url: "/api/secure",
  method: "post",
  values: {...},
  config: {
    headers: {
      "Authorization": "Bearer token",
      "X-Custom-Header": "value"
    }
  }
});
```

---

## 4. COMMON USE CASES

### 4.1 Email Sending

```tsx
function EmailComposer() {
  const { mutate, mutation } = useCustomMutation();
  const [email, setEmail] = useState({
    to: "",
    subject: "",
    body: "",
  });

  const handleSend = () => {
    mutate({
      url: "/api/email/send",
      method: "post",
      values: email,
      successNotification: {
        message: "Email sent successfully!",
        type: "success",
      },
    });
  };

  return (
    <div>
      <input
        value={email.to}
        onChange={(e) => setEmail({ ...email, to: e.target.value })}
        placeholder="To"
      />
      <input
        value={email.subject}
        onChange={(e) => setEmail({ ...email, subject: e.target.value })}
        placeholder="Subject"
      />
      <textarea
        value={email.body}
        onChange={(e) => setEmail({ ...email, body: e.target.value })}
        placeholder="Message"
      />
      <button onClick={handleSend} disabled={mutation.isPending}>
        {mutation.isPending ? "Sending..." : "Send Email"}
      </button>
    </div>
  );
}
```

### 4.2 Report Generation

```tsx
function ReportGenerator() {
  const { mutate, mutation } = useCustomMutation();
  const [reportConfig, setReportConfig] = useState({
    type: "sales",
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    format: "pdf",
  });

  const handleGenerate = () => {
    mutate({
      url: "/api/reports/generate",
      method: "post",
      values: reportConfig,
      onSuccess: (data) => {
        // Download report
        window.open(data.data.downloadUrl, "_blank");
      },
    });
  };

  return (
    <div>
      <select
        value={reportConfig.type}
        onChange={(e) =>
          setReportConfig({ ...reportConfig, type: e.target.value })
        }
      >
        <option value="sales">Sales Report</option>
        <option value="inventory">Inventory Report</option>
        <option value="customers">Customer Report</option>
      </select>

      <input
        type="date"
        value={reportConfig.startDate}
        onChange={(e) =>
          setReportConfig({ ...reportConfig, startDate: e.target.value })
        }
      />
      <input
        type="date"
        value={reportConfig.endDate}
        onChange={(e) =>
          setReportConfig({ ...reportConfig, endDate: e.target.value })
        }
      />

      <button onClick={handleGenerate} disabled={mutation.isPending}>
        {mutation.isPending ? "Generating..." : "Generate Report"}
      </button>

      {mutation.isError && (
        <div style={{ color: "red" }}>Error: {mutation.error.message}</div>
      )}
    </div>
  );
}
```

### 4.3 Payment Processing

```tsx
function PaymentButton({ orderId, amount }) {
  const { mutate, mutation } = useCustomMutation();
  const invalidate = useInvalidate();

  const handlePayment = () => {
    mutate({
      url: "/api/payment/process",
      method: "post",
      values: {
        orderId,
        amount,
        currency: "USD",
        paymentMethod: "stripe",
      },
      successNotification: {
        message: "Payment successful!",
        description: `$${amount} charged`,
        type: "success",
      },
      onSuccess: () => {
        // Refresh order status
        invalidate({
          resource: "orders",
          invalidates: ["detail"],
          id: orderId,
        });
      },
    });
  };

  return (
    <button onClick={handlePayment} disabled={mutation.isPending}>
      {mutation.isPending ? "Processing..." : `Pay $${amount}`}
    </button>
  );
}
```

### 4.4 Webhook Trigger

```tsx
function WebhookTrigger({ eventType, payload }) {
  const { mutate, mutation } = useCustomMutation();

  const handleTrigger = () => {
    mutate({
      url: "/api/webhooks/trigger",
      method: "post",
      values: {
        event: eventType,
        data: payload,
        timestamp: new Date().toISOString(),
      },
      successNotification: {
        message: `Webhook "${eventType}" triggered`,
        type: "success",
      },
    });
  };

  return (
    <button onClick={handleTrigger} disabled={mutation.isPending}>
      Trigger Webhook
    </button>
  );
}
```

### 4.5 Cache Clearing

```tsx
function CacheManager() {
  const { mutate, mutation } = useCustomMutation();
  const queryClient = useQueryClient();

  const handleClearCache = (cacheType) => {
    mutate({
      url: `/api/cache/clear/${cacheType}`,
      method: "delete",
      values: {},
      successNotification: {
        message: `${cacheType} cache cleared`,
        type: "success",
      },
      onSuccess: () => {
        // Also clear React Query cache
        queryClient.clear();
      },
    });
  };

  return (
    <div>
      <button onClick={() => handleClearCache("all")}>Clear All Cache</button>
      <button onClick={() => handleClearCache("user")}>Clear User Cache</button>
      <button onClick={() => handleClearCache("products")}>
        Clear Products Cache
      </button>
      {mutation.isPending && <div>Clearing...</div>}
    </div>
  );
}
```

### 4.6 Data Export

```tsx
function DataExporter() {
  const { mutate, mutation } = useCustomMutation();

  const handleExport = (format) => {
    mutate({
      url: "/api/export",
      method: "post",
      values: {
        format,
        filters: {
          dateRange: "last-30-days",
          status: "active",
        },
      },
      onSuccess: (data) => {
        // Download file
        const link = document.createElement("a");
        link.href = data.data.downloadUrl;
        link.download = `export.${format}`;
        link.click();
      },
    });
  };

  return (
    <div>
      <button onClick={() => handleExport("csv")} disabled={mutation.isPending}>
        Export CSV
      </button>
      <button
        onClick={() => handleExport("xlsx")}
        disabled={mutation.isPending}
      >
        Export Excel
      </button>
      <button
        onClick={() => handleExport("json")}
        disabled={mutation.isPending}
      >
        Export JSON
      </button>
      {mutation.isPending && <div>Preparing export...</div>}
    </div>
  );
}
```

### 4.7 Batch Processing

```tsx
function BatchProcessor({ items }) {
  const { mutate, mutation } = useCustomMutation();

  const handleBatchProcess = () => {
    mutate({
      url: "/api/batch/process",
      method: "post",
      values: {
        operation: "update-status",
        items: items.map((item) => item.id),
        newStatus: "processed",
      },
      successNotification: (data) => ({
        message: `Processed ${data.data.count} items`,
        type: "success",
      }),
    });
  };

  return (
    <button onClick={handleBatchProcess} disabled={mutation.isPending}>
      {mutation.isPending
        ? `Processing ${items.length} items...`
        : `Process ${items.length} items`}
    </button>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why No GET Method?

**Question:** Why doesn't useCustomMutation support GET?

**Answer:**

```typescript
// From code (line 37):
method: "post" | "put" | "patch" | "delete";
// ⚠️ No "get" or "head"!

// REASON 1: Semantics
// GET = Read operation (query) → Use useCustom ✅
// POST/PUT/PATCH/DELETE = Write operations (mutation) → Use useCustomMutation ✅

// REASON 2: React Query Philosophy
// Queries (GET): Auto-execute, cached, refetchable
// Mutations (POST/etc): Manual, not cached, one-time
// → Mixing GET with mutations = confusing! ❌

// REASON 3: Best Practices
// GET requests should be idempotent (no side effects)
// Mutations change server state
// → Separate hooks = clear intent! ✅
```

### 5.2 Why No Auto Cache Invalidation?

**Answer:** Custom mutations have unpredictable side effects

```typescript
// useCreate knows what to invalidate:
mutate({ resource: "posts", values: {...} });
// → Invalidate "posts" list ✅
// → Simple! Predictable!

// useCustomMutation doesn't know:
mutate({ url: "/api/email/send", method: "post", values: {...} });
// → Invalidate what?? ❓
// → Email list? Notification count? Stats? Nothing?
// → Better to let user decide! ✅
```

### 5.3 Why Separate from useCustom?

**Answer:** Different use cases, different behaviors

```typescript
// useCustom (Query):
// - Auto-execute
// - Cached
// - Refetchable
// - Loading states
// → Good for: Dashboard, stats, search

// useCustomMutation (Mutation):
// - Manual execution
// - Not cached
// - One-time execution
// - Success/error callbacks
// → Good for: Email, payments, reports

// Separate hooks = clearer purpose! ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Using for GET Requests

```tsx
// ❌ WRONG - GET with mutation
const { mutate } = useCustomMutation();
mutate({
  url: "/api/stats",
  method: "get", // ❌ TypeScript error! Not allowed!
  values: {},
});

// ✅ CORRECT - Use useCustom for GET
const { data } = useCustom({
  url: "/api/stats",
  method: "get", // ✅ Correct hook!
});
```

### 6.2 Expecting Auto-Refresh

```tsx
// ❌ WRONG - Expecting auto-refresh
function CreatePost() {
  const { mutate } = useCustomMutation();

  const handleCreate = () => {
    mutate({
      url: "/api/posts/create",
      method: "post",
      values: { title: "..." },
    });
    // Post created, but list doesn't refresh! ❌
  };
}

// ✅ CORRECT - Manual invalidation
function CreatePost() {
  const { mutate } = useCustomMutation();
  const invalidate = useInvalidate();

  const handleCreate = () => {
    mutate({
      url: "/api/posts/create",
      method: "post",
      values: { title: "..." },
      onSuccess: () => {
        invalidate({
          resource: "posts",
          invalidates: ["list"],
        }); // ✅ Manual refresh!
      },
    });
  };
}
```

### 6.3 Not Handling Loading State

```tsx
// ❌ WRONG - Button always enabled
function SendButton() {
  const { mutate } = useCustomMutation();

  return (
    <button onClick={() => mutate({...})}>
      Send Email
    </button>
  );
  // Can click multiple times! ❌
}

// ✅ CORRECT - Disable during loading
function SendButton() {
  const { mutate, mutation } = useCustomMutation();

  return (
    <button
      onClick={() => mutate({...})}
      disabled={mutation.isPending} // ✅ Disabled when sending
    >
      {mutation.isPending ? "Sending..." : "Send Email"}
    </button>
  );
}
```

### 6.4 Forgetting Error Handling

```tsx
// ❌ WRONG - No error handling
function PaymentButton() {
  const { mutate } = useCustomMutation();

  return (
    <button onClick={() => mutate({
      url: "/api/payment",
      method: "post",
      values: {...}
    })}>
      Pay Now
    </button>
  );
  // If payment fails, user doesn't know! ❌
}

// ✅ CORRECT - Handle errors
function PaymentButton() {
  const { mutate, mutation } = useCustomMutation();

  return (
    <div>
      <button onClick={() => mutate({
        url: "/api/payment",
        method: "post",
        values: {...},
        errorNotification: {
          message: "Payment failed!",
          type: "error"
        }
      })}>
        Pay Now
      </button>
      {mutation.isError && (
        <div style={{color: "red"}}>
          Error: {mutation.error.message}
        </div>
      )}
    </div>
  );
}
```

---

## 7. TESTING

### 7.1 Unit Test

```typescript
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCustomMutation } from "./useCustomMutation";

describe("useCustomMutation", () => {
  it("should execute custom mutation", async () => {
    const mockCustom = jest.fn(() =>
      Promise.resolve({ data: { success: true } }),
    );

    const mockDataProvider = {
      custom: mockCustom,
    };

    const { result } = renderHook(() => useCustomMutation(), {
      wrapper: ({ children }) => (
        <Refine dataProvider={mockDataProvider}>{children}</Refine>
      ),
    });

    act(() => {
      result.current.mutate({
        url: "/api/email/send",
        method: "post",
        values: { to: "test@example.com" },
      });
    });

    await waitFor(() => {
      expect(mockCustom).toHaveBeenCalledWith({
        url: "/api/email/send",
        method: "post",
        payload: { to: "test@example.com" },
        meta: expect.any(Object),
        headers: {},
      });
      expect(result.current.mutation.isSuccess).toBe(true);
    });
  });
});
```

---

## 8. KẾT LUẬN

### Design Patterns Summary

- ✅ **Command**: Encapsulate mutation as object
- ✅ **Strategy**: Choose mutation method (POST/PUT/PATCH/DELETE)
- ✅ **Template Method**: Reuse structure from useCreate
- ✅ **Lazy Execution**: Manual trigger, no auto-execute
- ✅ **No Cache Invalidation**: Explicit side effects

### Key Features

1. **Write-Only Methods** - POST/PUT/PATCH/DELETE (no GET)
2. **Manual Execution** - Call mutate() when ready
3. **Mutation State** - isPending, isSuccess, isError
4. **Notifications** - Success/error messages
5. **Custom Headers** - Authorization, custom headers

### Khi nào dùng useCustomMutation?

✅ **Nên dùng:**

- Email sending
- Report generation
- Payment processing
- Webhook triggers
- Cache clearing
- Data export
- Batch processing
- Any custom write operation

❌ **Không dùng:**

- Read operations (use useCustom)
- Standard CRUD (use useCreate, useUpdate, useDelete)
- Auto-execute on mount (use useCustom with POST if needed)

### Remember

✅ **233 lines** - Flexible mutation hook
📜 **Command** - Mutation as object
🎯 **Strategy** - POST/PUT/PATCH/DELETE
🏗️ **Template** - Same as useCreate
⏸️ **Lazy** - Manual execution
🔍 **No Cache** - Explicit invalidation

### Pro Tips

1. **Use for write ops** - Read ops → useCustom
2. **Handle loading state** - Disable button when pending
3. **Handle errors** - Always show error messages
4. **Manual invalidation** - Refresh caches when needed
5. **Await if needed** - Use mutateAsync for sequential ops
6. **Custom headers** - For auth/special requirements

### useCustom vs useCustomMutation

| Feature   | useCustom          | useCustomMutation     |
| --------- | ------------------ | --------------------- |
| Purpose   | Read ops           | Write ops             |
| Execution | Auto (on mount)    | Manual (call mutate)  |
| Methods   | Any (GET/POST/etc) | POST/PUT/PATCH/DELETE |
| Caching   | YES ✅             | NO ❌                 |
| Refetch   | YES ✅             | NO ❌                 |
| Use Case  | Stats, search      | Email, payments       |

---

> 📚 **Best Practice**: Use sticky for custom WRITE operations (mutations). For custom READ operations (queries), use `useCustom` instead!
