# Kiến trúc và Design Patterns của useRedirectionAfterSubmission Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              FORM SUBMISSION FLOW                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  User submits form (create/edit)                 │  │
│  │         ↓                                         │  │
│  │  useForm/useModalForm calls mutation             │  │
│  │         ↓                                         │  │
│  │  Mutation succeeds ✅                            │  │
│  │         ↓                                         │  │
│  │  useRedirectionAfterSubmission ✅ (THIS HOOK)    │  │
│  │    → Decides where to go next                    │  │
│  │         │                                         │  │
│  │         ├──→ STRATEGY PATTERN:                   │  │
│  │         │     - redirect: "show" → /posts/123    │  │
│  │         │     - redirect: "edit" → /posts/edit/123 │
│  │         │     - redirect: "create" → /posts/create │
│  │         │     - redirect: "list" → /posts        │  │
│  │         │     - redirect: false → Stay on page   │  │
│  │         │                                         │  │
│  │         ├──→ DECISION TREE:                      │  │
│  │         │     1. Check if resource supports action │
│  │         │     2. Check if ID is provided          │  │
│  │         │     3. Execute navigation               │  │
│  │         │                                         │  │
│  │         └──→ PRIORITY CHAIN:                     │  │
│  │               show → edit → create → list (default) │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useForm (after create/edit/clone)           │  │
│  │    - useModalForm (modal forms)                  │  │
│  │    - useDrawerForm (drawer forms)                │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Determine and execute post-submission navigation based on redirect action and resource capabilities**

### 1.2 Complete Flow - Form Submission to Redirect

```
┌──────────────────────────────────────────────────────────────┐
│         USER ACTION: Submit Create Post Form                 │
└──────────────────────────────────────────────────────────────┘

const { onFinish, redirect } = useForm({
  resource: "posts",
  action: "create",
  redirect: "show"  // ← Redirect to show page after creation
});

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│         STEP 1: Mutation Executes (useCreate)                │
└──────────────────────────────────────────────────────────────┘

dataProvider.create({ resource: "posts", values: { title: "..." } })
→ Returns: { data: { id: 123, title: "..." } } ✅

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│    STEP 2: useRedirectionAfterSubmission Called              │
└──────────────────────────────────────────────────────────────┘

const handleRedirect = useRedirectionAfterSubmission();

handleRedirect({
  redirect: "show",      // User's preference
  resource: postsResource,  // { name: "posts", show: "/posts/:id", ... }
  id: 123,              // New post ID from mutation response
  meta: {}
});

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│         STEP 3: Decision Tree Execution                       │
└──────────────────────────────────────────────────────────────┘

1. redirect = "show" ✅
2. resource.show exists? → YES ("/posts/:id") ✅
3. id provided? → YES (123) ✅
4. → Execute: show(resource, 123) ✅

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│         STEP 4: Navigation (via useNavigation)                │
└──────────────────────────────────────────────────────────────┘

show(resource, 123)
→ Navigates to: /posts/show/123 ✅
→ User sees the newly created post! 🎉
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useRedirectionAfterSubmission/index.ts: 116 dòng** - Post-submission router!

---

### 2.1 Strategy Pattern - Redirect Actions

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: GPS Route Selection

```
GPS Navigation:

After reaching destination, you can:
- "Fastest route home" strategy
- "Scenic route" strategy
- "Avoid highways" strategy
- "Stay here" strategy (no navigation)

Each strategy:
- Different algorithm
- Same interface
- Chosen at runtime

useRedirectionAfterSubmission:

After form submission, you can:
- "show" strategy → View created/edited item
- "edit" strategy → Continue editing
- "create" strategy → Create another item
- "list" strategy → Return to list
- false strategy → Stay on current page

Each strategy:
- Different navigation logic
- Same interface: handleRedirect()
- Chosen by user config
```

**Strategy Pattern** = Define family of algorithms. Encapsulate each one. Make them interchangeable.

#### Implementation:

```typescript
const handleRedirect = ({ redirect, resource, id, meta }) => {
  if (redirect && resource) {
    // STRATEGY 1: Show (view created item)
    if (resource.show && redirect === "show" && id) {
      return show(resource, id, undefined, meta);
    }

    // STRATEGY 2: Edit (continue editing)
    if (resource.edit && redirect === "edit" && id) {
      return edit(resource, id, undefined, meta);
    }

    // STRATEGY 3: Create (create another)
    if (resource.create && redirect === "create") {
      return create(resource, undefined, meta);
    }

    // STRATEGY 4: List (default - return to list)
    return list(resource, "push", meta);
  }

  // STRATEGY 5: False (stay on page)
  return;
};
```

#### All Strategies:

| Strategy     | When Used                | Navigation        | Example                      |
| ------------ | ------------------------ | ----------------- | ---------------------------- |
| **"show"**   | View created/edited item | `/posts/show/123` | After creating post, view it |
| **"edit"**   | Continue editing         | `/posts/edit/123` | After creating, edit details |
| **"create"** | Create another item      | `/posts/create`   | Bulk data entry              |
| **"list"**   | Return to list (default) | `/posts`          | After edit, see updated list |
| **false**    | Stay on page             | No navigation     | Custom workflows             |

#### Real Examples:

```typescript
// Example 1: Create → Show (View what you created)
useForm({
  resource: "posts",
  action: "create",
  redirect: "show", // ← After create, navigate to /posts/show/123
});

// Example 2: Create → Create (Bulk entry)
useForm({
  resource: "posts",
  action: "create",
  redirect: "create", // ← After create, stay on /posts/create for another
});

// Example 3: Edit → List (See updated list)
useForm({
  resource: "posts",
  action: "edit",
  redirect: "list", // ← After edit, return to /posts
});

// Example 4: Edit → Edit (Continue editing)
useForm({
  resource: "posts",
  action: "edit",
  redirect: "edit", // ← After edit, stay on /posts/edit/123
});

// Example 5: Custom workflow (No redirect)
useForm({
  resource: "posts",
  action: "create",
  redirect: false, // ← Stay on page, custom logic handles navigation
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexible** - Different workflows for different needs
- ✅ **Configurable** - User chooses strategy
- ✅ **Extensible** - Easy to add new strategies
- ✅ **Predictable** - Clear behavior for each strategy

---

### 2.2 Chain of Responsibility Pattern - Priority Chain

#### ⛓️ VÍ DỤ ĐỜI THƯỜNG: Hotel Check-in

```
Hotel Reception Chain:

1. VIP desk - Handles VIP guests
   → If not VIP, pass to next
2. Members desk - Handles members
   → If not member, pass to next
3. Regular desk - Handles everyone
   → Always handles if reached

useRedirectionAfterSubmission Priority:

1. "show" - If resource.show exists AND id provided
   → If not, try next
2. "edit" - If resource.edit exists AND id provided
   → If not, try next
3. "create" - If resource.create exists
   → If not, try next
4. "list" - Always succeeds (default)
   → Always handles
```

**Chain of Responsibility** = Avoid coupling sender to receiver. Give multiple objects chance to handle request.

#### Implementation:

```typescript
const handleRedirect = ({ redirect, resource, id, meta }) => {
  if (redirect && resource) {
    // HANDLER 1: Try "show"
    if (resource.show && redirect === "show" && id) {
      return show(resource, id, undefined, meta); // ← Handled! Stop chain.
    }

    // HANDLER 2: Try "edit"
    if (resource.edit && redirect === "edit" && id) {
      return edit(resource, id, undefined, meta); // ← Handled! Stop chain.
    }

    // HANDLER 3: Try "create"
    if (resource.create && redirect === "create") {
      return create(resource, undefined, meta); // ← Handled! Stop chain.
    }

    // HANDLER 4: Default to "list" (always succeeds)
    return list(resource, "push", meta); // ← Final handler!
  }

  return; // No handler (redirect = false)
};
```

#### Priority Visualization:

```
redirect = "show"
     ↓
  Check: resource.show exists? ✅
  Check: id provided? ✅
     ↓
  Execute: show() ✅ STOP!

  (edit, create, list never checked)


redirect = "show" but no resource.show
     ↓
  Check: resource.show exists? ❌
     ↓
  Skip to next handler...
     ↓
  (Falls through to list by default)


redirect = "edit" but no id
     ↓
  Check: resource.edit exists? ✅
  Check: id provided? ❌
     ↓
  Skip to next handler...
     ↓
  (Falls through to list by default)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Fallback** - Always has default (list)
- ✅ **Safe** - Won't navigate to non-existent routes
- ✅ **Priority** - Tries user preference first
- ✅ **Graceful** - Degrades to list if preference not possible

---

### 2.3 Facade Pattern - Navigation Wrapper

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Universal Remote

```
Without Universal Remote (Complex):
- TV remote (power, volume, channels)
- Soundbar remote (volume, mode)
- DVD remote (play, pause, stop)
- 3 different remotes! ❌

With Universal Remote (Facade):
- One remote
- "Movie Mode" button → Powers on TV, soundbar, DVD
- Simple interface! ✅

useRedirectionAfterSubmission:

Without:
- import { useNavigation }
- Get show, edit, list, create
- Check resource capabilities
- Check if id exists
- Call appropriate function
- Complex! ❌

With:
- const handleRedirect = useRedirectionAfterSubmission()
- handleRedirect({ redirect: "show", resource, id })
- Simple! ✅
```

**Facade Pattern** = Provide unified interface to set of interfaces.

#### Implementation:

```typescript
// COMPLEX INTERNAL (Hidden):
const { show, edit, list, create } = useNavigation();

if (resource.show && redirect === "show" && id) {
  return show(resource, id, undefined, meta);
}
// ... more complex logic

// SIMPLE EXTERNAL (Exposed):
export const useRedirectionAfterSubmission = () => {
  return handleRedirect; // Simple function!
};

// USAGE:
const handleRedirect = useRedirectionAfterSubmission();
handleRedirect({ redirect: "show", resource, id }); // ✅ Clean!
```

#### Benefits:

```typescript
// ❌ WITHOUT facade (manual navigation):
import { useNavigation } from "@refinedev/core";

const { show, list } = useNavigation();

const handleSuccess = (data) => {
  if (redirect === "show" && resource.show && data.id) {
    show(resource, data.id);
  } else {
    list(resource);
  }
};

// ✅ WITH facade (automatic):
const handleRedirect = useRedirectionAfterSubmission();

const handleSuccess = (data) => {
  handleRedirect({ redirect, resource, id: data.id });
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - One function vs multiple checks
- ✅ **Encapsulation** - Hide complexity
- ✅ **Reusable** - Same interface for all forms
- ✅ **Maintainable** - Change logic in one place

---

### 2.4 Template Method Pattern - Redirection Flow

#### 📋 VÍ DỤ ĐỜI THƯỜNG: Restaurant Order Process

```
Restaurant Template:

1. Greet customer (same for all)
2. Take order (varies: dine-in, takeout, delivery)
3. Prepare food (same for all)
4. Serve (varies: table, counter, delivery)

useRedirectionAfterSubmission Template:

1. Check if redirect allowed (same for all)
2. Determine action (varies: show, edit, create, list)
3. Validate requirements (same: check resource, id)
4. Execute navigation (varies by action)
```

**Template Method** = Define skeleton of algorithm. Let subclasses override specific steps.

#### Implementation:

```typescript
const handleRedirect = ({ redirect, resource, id, meta }) => {
  // STEP 1: Validate redirect is allowed (template)
  if (redirect && resource) {
    // STEP 2: Determine action (varies by redirect)
    // STEP 3: Validate requirements (template per action)
    // STEP 4: Execute navigation (varies by action)

    if (resource.show && redirect === "show" && id) {
      return show(resource, id, undefined, meta);
    }

    if (resource.edit && redirect === "edit" && id) {
      return edit(resource, id, undefined, meta);
    }

    if (resource.create && redirect === "create") {
      return create(resource, undefined, meta);
    }

    // Default action
    return list(resource, "push", meta);
  }

  return;
};
```

#### Flow Template:

```
For ALL redirect actions:

┌─────────────────────────────────────┐
│ STEP 1: Check redirect && resource  │ ← TEMPLATE (same)
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ STEP 2: Match redirect action       │ ← VARIES
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ STEP 3: Validate requirements       │ ← TEMPLATE (per action)
│  - resource.{action} exists?         │
│  - id provided? (if needed)          │
└─────────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────┐
│ STEP 4: Execute navigation           │ ← VARIES
└─────────────────────────────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - Same flow for all actions
- ✅ **Safety** - Always validates before navigating
- ✅ **Clarity** - Clear steps
- ✅ **Extensible** - Easy to add new actions

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                     | Ví dụ đời thường | Giải quyết vấn đề gì        | Trong useRedirectionAfterSubmission                         |
| --------------------------- | ---------------- | --------------------------- | ----------------------------------------------------------- |
| **Strategy**                | GPS routes       | Choose algorithm at runtime | Different redirect strategies (show/edit/list/create/false) |
| **Chain of Responsibility** | Hotel check-in   | Priority handling           | show → edit → create → list (fallback)                      |
| **Facade**                  | Universal remote | Simplify complex subsystem  | Hide useNavigation complexity                               |
| **Template Method**         | Restaurant order | Define algorithm skeleton   | Standard validation + action execution flow                 |

---

## 3. KEY FEATURES

### 3.1 Redirect Strategies

```typescript
type RedirectAction = "show" | "edit" | "create" | "list" | false;

// All possible strategies:
handleRedirect({ redirect: "show", resource, id: 123 }); // → /posts/show/123
handleRedirect({ redirect: "edit", resource, id: 123 }); // → /posts/edit/123
handleRedirect({ redirect: "create", resource }); // → /posts/create
handleRedirect({ redirect: "list", resource }); // → /posts
handleRedirect({ redirect: false, resource }); // → No navigation
```

### 3.2 Resource Capability Checking

```typescript
// Only navigates if resource supports the action:

// ✅ Works: resource has show route
resource = { name: "posts", show: "/posts/:id" }
handleRedirect({ redirect: "show", resource, id: 123 })
→ Navigates to /posts/show/123

// ❌ Fails gracefully: resource missing show route
resource = { name: "posts" }  // No show!
handleRedirect({ redirect: "show", resource, id: 123 })
→ Falls back to list: /posts
```

### 3.3 ID Requirement Validation

```typescript
// show/edit require ID:

handleRedirect({ redirect: "show", resource, id: 123 }); // ✅ Works
handleRedirect({ redirect: "show", resource }); // ❌ No ID → Falls back to list

// create/list don't need ID:

handleRedirect({ redirect: "create", resource }); // ✅ Works
handleRedirect({ redirect: "list", resource }); // ✅ Works
```

### 3.4 Meta Forwarding

```typescript
// Meta data is passed to navigation:

handleRedirect({
  redirect: "show",
  resource,
  id: 123,
  meta: {
    query: { tab: "comments" },
  },
});

// → Navigates to: /posts/show/123?tab=comments ✅
```

---

## 4. COMMON USE CASES

### 4.1 Basic Form with Default Redirect

```tsx
import { useForm } from "@refinedev/core";

function CreatePost() {
  const { formProps, saveButtonProps } = useForm({
    resource: "posts",
    action: "create",
    redirect: "list", // ← After create, return to list
  });

  // Internally uses useRedirectionAfterSubmission!

  return (
    <form {...formProps}>
      <input name="title" />
      <button {...saveButtonProps}>Save</button>
    </form>
  );
}
```

### 4.2 View After Create

```tsx
function CreatePost() {
  const { formProps, saveButtonProps } = useForm({
    resource: "posts",
    action: "create",
    redirect: "show", // ← After create, view the post
  });

  // User clicks Save
  // → Post created (id: 123)
  // → Redirects to /posts/show/123 ✅
}
```

### 4.3 Bulk Data Entry

```tsx
function BulkCreateProducts() {
  const { formProps, saveButtonProps } = useForm({
    resource: "products",
    action: "create",
    redirect: "create", // ← After create, stay on create page
  });

  // User creates product 1
  // → Stays on /products/create
  // User creates product 2
  // → Stays on /products/create
  // Efficient bulk entry! ✅
}
```

### 4.4 Edit with Continue Editing

```tsx
function EditPost() {
  const { formProps, saveButtonProps } = useForm({
    resource: "posts",
    action: "edit",
    id: 123,
    redirect: "edit", // ← After edit, stay on edit page
  });

  // User saves changes
  // → Stays on /posts/edit/123
  // User can continue editing! ✅
}
```

### 4.5 Custom Redirect Logic

```tsx
function CustomForm() {
  const { formProps, onFinish } = useForm({
    resource: "posts",
    action: "create",
    redirect: false, // ← No automatic redirect
  });

  const handleRedirect = useRedirectionAfterSubmission();

  const handleSubmit = async (values) => {
    const response = await onFinish(values);

    // Custom logic:
    if (values.status === "draft") {
      handleRedirect({ redirect: "edit", resource, id: response.id });
    } else {
      handleRedirect({ redirect: "show", resource, id: response.id });
    }
  };

  return <form {...formProps} onSubmit={handleSubmit} />;
}
```

### 4.6 Modal Form with List Refresh

```tsx
import { useModalForm } from "@refinedev/antd";

function PostsListWithModal() {
  const { modalProps, formProps } = useModalForm({
    resource: "posts",
    action: "create",
    redirect: "list", // ← After create, modal closes + list refreshes
  });

  // Uses useRedirectionAfterSubmission internally
  // After successful create:
  // 1. Modal closes
  // 2. Redirects to /posts
  // 3. List re-fetches with new post ✅
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Default to "list"?

**Answer:** Safest and most common behavior

```typescript
// Most users expect to return to list after edit:
Edit post → Save → See updated post in list ✅

// Missing routes fall back to list:
redirect: "show" but no resource.show
→ Falls back to list (safe!) ✅

// List is guaranteed to exist (required for resource)
```

### 5.2 Why Check resource.{action} Exists?

**Answer:** Prevent navigation to non-existent routes

```typescript
// ❌ WITHOUT check:
redirect: "show"
→ Navigates to /posts/show/123
→ 404 Error! No show route configured! ❌

// ✅ WITH check:
if (resource.show && redirect === "show" && id) {
  return show(resource, id);
}
→ Only navigates if route exists ✅
→ Falls back to list if missing
```

### 5.3 Why useCallback with Empty Dependencies?

**Answer:** Stable reference, navigation functions don't change

```typescript
const handleRedirect = useCallback((...) => {
  // Uses show, edit, list, create from useNavigation
  // These are stable (don't change)
}, []);  // ← Empty! No deps needed

// Benefits:
// 1. handleRedirect reference is stable
// 2. Can be safely passed to children
// 3. Won't cause re-renders
```

### 5.4 Why Forward meta?

**Answer:** Preserve context across navigation

```typescript
// Example: User is viewing posts with filter
// URL: /posts?status=published&category=tech

// Creates new post, redirect to list:
handleRedirect({
  redirect: "list",
  resource,
  meta: {
    query: { status: "published", category: "tech" },
  },
});

// → Navigates to: /posts?status=published&category=tech
// User returns to same filtered view! ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Missing ID for show/edit

```typescript
// ❌ WRONG - redirect to show without id
handleRedirect({ redirect: "show", resource });
// No id! Falls back to list ❌

// ✅ CORRECT
handleRedirect({ redirect: "show", resource, id: data.id });
```

### 6.2 Redirect to Non-existent Route

```typescript
// ❌ RISKY - Assuming resource has show
resource = { name: "posts" }; // No show route!
handleRedirect({ redirect: "show", resource, id: 123 });
// Falls back to list (safe but unexpected)

// ✅ BETTER - Check resource capabilities first
if (resource.show) {
  handleRedirect({ redirect: "show", resource, id: 123 });
} else {
  handleRedirect({ redirect: "list", resource });
}
```

### 6.3 Not Handling redirect = false

```typescript
// ❌ WRONG - Expecting navigation when redirect=false
useForm({
  redirect: false,
  // ... expecting some default redirect ❌
});

// ✅ CORRECT - Handle custom logic when false
const { redirect } = useForm({ redirect: false });

if (redirect === false) {
  // Custom navigation logic
  customNavigate();
}
```

---

## 7. INTEGRATION WITH FORMS

### How useForm Uses This Hook

```typescript
// In useForm hook:
export const useForm = ({ redirect = "list", ... }) => {
  const handleRedirect = useRedirectionAfterSubmission();

  const mutation = useMutation({
    onSuccess: (data) => {
      // After successful mutation:
      handleRedirect({
        redirect: redirect || "list",  // User preference or default
        resource: resourceFromContext,
        id: data.data.id,  // New/updated record ID
        meta: metaFromOptions
      });
    }
  });

  return { ... };
};
```

### Complete Form Flow

```
User fills form
           ↓
User clicks Submit
           ↓
useForm.onFinish() called
           ↓
Mutation executes (useCreate/useUpdate)
           ↓
Mutation succeeds ✅
           ↓
onSuccess callback fires
           ↓
useRedirectionAfterSubmission() called
           ↓
Decision tree executes
           ↓
Navigation happens
           ↓
User sees new page! 🎉
```

---

## 8. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useRedirectionAfterSubmission } from "@refinedev/core";

// Mock useNavigation
const mockShow = jest.fn();
const mockEdit = jest.fn();
const mockList = jest.fn();
const mockCreate = jest.fn();

jest.mock("@hooks", () => ({
  useNavigation: () => ({
    show: mockShow,
    edit: mockEdit,
    list: mockList,
    create: mockCreate,
  }),
}));

describe("useRedirectionAfterSubmission", () => {
  const resource = {
    name: "posts",
    show: "/posts/:id",
    edit: "/posts/edit/:id",
    list: "/posts",
    create: "/posts/create",
  };

  it("should redirect to show when action is show", () => {
    const { result } = renderHook(() => useRedirectionAfterSubmission());

    result.current({ redirect: "show", resource, id: 123 });

    expect(mockShow).toHaveBeenCalledWith(resource, 123, undefined, {});
  });

  it("should fall back to list when show has no id", () => {
    const { result } = renderHook(() => useRedirectionAfterSubmission());

    result.current({ redirect: "show", resource }); // No id!

    expect(mockList).toHaveBeenCalled();
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("should not redirect when redirect is false", () => {
    const { result } = renderHook(() => useRedirectionAfterSubmission());

    result.current({ redirect: false, resource, id: 123 });

    expect(mockShow).not.toHaveBeenCalled();
    expect(mockEdit).not.toHaveBeenCalled();
    expect(mockList).not.toHaveBeenCalled();
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: Different redirect actions (show/edit/create/list/false)
- ✅ **Chain of Responsibility**: Priority fallback chain
- ✅ **Facade**: Simplified navigation interface
- ✅ **Template Method**: Standard validation + execution flow

### Key Features

1. **Five Strategies** - show, edit, create, list, false
2. **Safe Fallback** - Always defaults to list if preferred action not possible
3. **Capability Checking** - Only navigates to existing routes
4. **ID Validation** - Ensures required params for actions
5. **Meta Support** - Preserve context across navigation

### Khi nào dùng useRedirectionAfterSubmission?

✅ **Nên dùng:**

- Building custom forms
- Custom post-submission logic
- Non-standard redirect flows
- Manual redirect control

❌ **Không dùng:**

- Standard forms → Use `useForm` (includes this hook)
- Simple redirects → Use `useNavigation` directly
- Static redirects → Use \<Link\>

### Remember

✅ **116 lines** - Post-submission router
🎯 **Strategy Pattern** - Five redirect strategies
⛓️ **Chain of Responsibility** - Priority fallback
🏢 **Facade Pattern** - Simple interface
📋 **Template Method** - Standard flow

---

> 📚 **Best Practice**: Use **"list"** as default for safest behavior. Always **check resource capabilities** before redirecting. For **bulk entry**, use **"create"** redirect. For **immediate feedback**, use **"show"** redirect. Set **false** only when implementing **custom navigation logic**!
