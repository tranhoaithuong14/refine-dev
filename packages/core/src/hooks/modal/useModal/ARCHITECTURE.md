# Kiến trúc và Design Patterns của useModal Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  UI UTILITIES                     │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useModal ✅ (THIS HOOK)                         │  │
│  │    → Simple modal state management               │  │
│  │         │                                         │  │
│  │         ├──→ STATE MANAGEMENT:                   │  │
│  │         │     - visible: boolean                  │  │
│  │         │     - Default initial state             │  │
│  │         │                                         │  │
│  │         ├──→ ACTIONS (Command Pattern):          │  │
│  │         │     - show(): Open modal               │  │
│  │         │     - close(): Close modal             │  │
│  │         │                                         │  │
│  │         └──→ MEMOIZATION:                        │  │
│  │               - useCallback for stable refs      │  │
│  │               - Prevent re-renders               │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide a simple, reusable way to manage modal visibility state**

### 1.2 The Problem: Modal State Boilerplate

```jsx
// ❌ WITHOUT useModal - Repetitive code
function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Repetitive handlers...
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const openDeleteModal = () => setIsDeleteModalOpen(true);
  const closeDeleteModal = () => setIsDeleteModalOpen(false);

  // ... same for edit modal
}

// ✅ WITH useModal - Clean & reusable
function MyComponent() {
  const mainModal = useModal();
  const deleteModal = useModal();
  const editModal = useModal();

  // Use: mainModal.show(), mainModal.close(), mainModal.visible
}
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useModal/index.tsx: 30 dòng** - Ultra-simple modal state!

---

### 2.1 State Pattern - Managing Modal Visibility

#### 💡 VÍ DỤ ĐỜI THƯỜNG: Light Switch

```
Light Switch:

States:
- ON (light visible) 💡
- OFF (light hidden) ⚫

Actions:
- Turn ON (show)
- Turn OFF (close)

useModal:
- visible = true (modal shown) ✅
- visible = false (modal hidden) ❌

Actions:
- show() → visible = true
- close() → visible = false
```

**State Pattern** = Object changes behavior when internal state changes.

#### Implementation:

```typescript
const [visible, setVisible] = useState(defaultVisible);

// STATE: visible (boolean)
// TRANSITIONS:
// - show(): false → true
// - close(): true → false
```

#### State Diagram:

```
┌─────────────┐         show()          ┌─────────────┐
│   HIDDEN    │ ───────────────────────→ │   VISIBLE   │
│ visible=false│                         │ visible=true│
│             │ ←─────────────────────── │             │
└─────────────┘         close()         └─────────────┘
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simple** - Only 2 states (visible/hidden)
- ✅ **Clear** - Explicit state transitions
- ✅ **Predictable** - Always know current state
- ✅ **Accessible** - Easy to read for screen readers

---

### 2.2 Command Pattern - Encapsulated Actions

#### 🎮 VÍ DỤ ĐỜI THƯỜNG: TV Remote

```
TV Remote:

Buttons (Commands):
- Power ON button → execute: turnOn()
- Power OFF button → execute: turnOff()

Each button:
- Encapsulates the action
- Can be passed around
- Can be triggered anywhere

useModal:
- show() command → execute: setVisible(true)
- close() command → execute: setVisible(false)

Pass to components:
- <Button onClick={modal.show} />
- <Modal onClose={modal.close} />
```

**Command Pattern** = Encapsulate request as an object. Decouple sender from receiver.

#### Implementation:

```typescript
const show = useCallback(() => setVisible(true), [visible]);
const close = useCallback(() => setVisible(false), [visible]);

// Usage:
<Button onClick={show}>Open Modal</Button>
<Modal visible={visible} onCancel={close} />
```

#### Why useCallback?

```typescript
// WITHOUT useCallback - New function every render!
const show = () => setVisible(true);
// Child component: useEffect(() => {...}, [show])
// → Runs every render! ❌

// WITH useCallback - Stable reference
const show = useCallback(() => setVisible(true), [visible]);
// Child component: useEffect(() => {...}, [show])
// → Only runs when `visible` changes ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Stable** - Reference doesn't change unnecessarily
- ✅ **Performance** - Prevents child re-renders
- ✅ **Composable** - Can be passed as props
- ✅ **Testable** - Easy to test in isolation

---

### 2.3 Encapsulation Pattern - Bundling State + Actions

#### 📦 VÍ DỤ ĐỜI THƯỜNG: ATM Machine

```
ATM:

Internal:
- Current balance (state)
- Deposit logic (private)
- Withdraw logic (private)

Public Interface:
- getBalance() → Read state
- deposit(amount) → Action
- withdraw(amount) → Action

useModal:

Internal:
- visible state
- setVisible (private)

Public Interface:
- visible → Read state
- show() → Action
- close() → Action
```

**Encapsulation** = Bundle data and methods. Hide internal implementation.

#### Implementation:

```typescript
export const useModal = ({ defaultVisible = false } = {}) => {
  // PRIVATE: Internal state
  const [visible, setVisible] = useState(defaultVisible);

  // PUBLIC: Actions
  const show = useCallback(() => setVisible(true), [visible]);
  const close = useCallback(() => setVisible(false), [visible]);

  // PUBLIC API: Only expose what's needed
  return {
    visible, // ← Read-only state
    show, // ← Action
    close, // ← Action
  };
  // setVisible is NOT exposed! ✅
};
```

#### Why NOT expose setVisible?

```typescript
// ❌ BAD - Exposing setVisible
return { visible, setVisible };

// User can do:
setVisible("hello"); // ❌ Type error!
setVisible(123); // ❌ Type error!

// ✅ GOOD - Only expose show/close
return { visible, show, close };

// User can only:
show(); // ✅ Always correct
close(); // ✅ Always correct
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Safety** - Controlled state mutations
- ✅ **API** - Clear, simple interface
- ✅ **Type-safe** - No invalid states
- ✅ **Maintainable** - Internal changes don't break users

---

### 2.4 Factory Pattern - Creating Multiple Modal Instances

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Cookie Cutter

```
Cookie Cutter:

Template: Star shape ⭐

Use it multiple times:
→ Cookie 1 (Star)
→ Cookie 2 (Star)
→ Cookie 3 (Star)

Each cookie:
- Same shape (interface)
- Independent (different dough)

useModal (Factory):
→ modal1 = useModal()  // Independent instance
→ modal2 = useModal()  // Independent instance
→ modal3 = useModal()  // Independent instance
```

**Factory Pattern** = Create objects without specifying exact class. Reusable creation logic.

#### Implementation:

```tsx
function MyComponent() {
  // Factory creates independent instances
  const editModal = useModal();
  const deleteModal = useModal({ defaultVisible: true });
  const confirmModal = useModal();

  // Each has its own state! ✅
  editModal.show(); // Only edit modal opens
  deleteModal.close(); // Only delete modal closes

  return (
    <>
      <Modal visible={editModal.visible} onClose={editModal.close}>
        Edit Form
      </Modal>

      <Modal visible={deleteModal.visible} onClose={deleteModal.close}>
        Delete Confirmation
      </Modal>

      <Modal visible={confirmModal.visible} onClose={confirmModal.close}>
        Confirm Action
      </Modal>
    </>
  );
}
```

#### Independent State:

```typescript
// Each useModal() call creates NEW state
const modal1 = useModal(); // { visible: false, show, close }
const modal2 = useModal(); // { visible: false, show, close }

modal1.show();
// modal1.visible = true ✅
// modal2.visible = false ✅ (not affected!)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Reusable** - Same hook, different instances
- ✅ **Independent** - No shared state
- ✅ **Scalable** - Create as many as needed
- ✅ **Clean** - No global state pollution

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern           | Ví dụ đời thường | Giải quyết vấn đề gì        | Trong useModal                                  |
| ----------------- | ---------------- | --------------------------- | ----------------------------------------------- |
| **State**         | Light switch     | Manage visible/hidden state | `visible` boolean with `show/close` transitions |
| **Command**       | TV remote        | Encapsulate actions         | `show()` and `close()` as stable commands       |
| **Encapsulation** | ATM machine      | Hide implementation         | Bundle state + actions, hide `setVisible`       |
| **Factory**       | Cookie cutter    | Create multiple instances   | Each `useModal()` call = independent modal      |

---

## 3. KEY FEATURES

### 3.1 Default Initial State

```typescript
// Modal starts hidden
const modal1 = useModal();
// modal1.visible = false ✅

// Modal starts visible
const modal2 = useModal({ defaultVisible: true });
// modal2.visible = true ✅
```

### 3.2 Stable References (useCallback)

```typescript
const { show, close } = useModal();

// `show` and `close` are stable references
// Only change when `visible` dependency changes
// Perfect for React.memo and useEffect dependencies
```

### 3.3 Simple API

```typescript
const modal = useModal();

modal.visible; // boolean - Is modal shown?
modal.show(); // void - Show modal
modal.close(); // void - Hide modal

// That's it! Super simple! 🎉
```

---

## 4. COMMON USE CASES

### 4.1 Basic Modal

```tsx
import { useModal } from "@refinedev/core";
import { Modal, Button } from "antd";

function BasicExample() {
  const modal = useModal();

  return (
    <>
      <Button onClick={modal.show}>Open Modal</Button>

      <Modal open={modal.visible} onCancel={modal.close} onOk={modal.close}>
        <p>Modal Content</p>
      </Modal>
    </>
  );
}
```

### 4.2 Multiple Modals

```tsx
function MultipleModals() {
  const createModal = useModal();
  const editModal = useModal();
  const deleteModal = useModal();

  return (
    <>
      <Button onClick={createModal.show}>Create</Button>
      <Button onClick={editModal.show}>Edit</Button>
      <Button onClick={deleteModal.show}>Delete</Button>

      <Modal visible={createModal.visible} onClose={createModal.close}>
        Create Form
      </Modal>

      <Modal visible={editModal.visible} onClose={editModal.close}>
        Edit Form
      </Modal>

      <Modal visible={deleteModal.visible} onClose={deleteModal.close}>
        Are you sure?
      </Modal>
    </>
  );
}
```

### 4.3 Conditional Rendering

```tsx
function ConditionalExample() {
  const modal = useModal();

  return (
    <>
      <Button onClick={modal.show}>Open</Button>

      {modal.visible && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button onClick={modal.close}>Close</button>
            Content here
          </div>
        </div>
      )}
    </>
  );
}
```

### 4.4 Form with Modal

```tsx
import { useForm } from "@refinedev/core";

function FormInModal() {
  const modal = useModal();
  const { formProps, onFinish } = useForm();

  const handleSubmit = async (values) => {
    await onFinish(values);
    modal.close(); // Close after successful submit ✅
  };

  return (
    <>
      <Button onClick={modal.show}>Create Post</Button>

      <Modal open={modal.visible} onCancel={modal.close}>
        <Form {...formProps} onFinish={handleSubmit}>
          <Form.Item name="title">
            <Input />
          </Form.Item>
          <Button type="submit">Submit</Button>
        </Form>
      </Modal>
    </>
  );
}
```

### 4.5 Modal with useTable

```tsx
function TableWithModals() {
  const editModal = useModal();
  const deleteModal = useModal();
  const [selectedRecord, setSelectedRecord] = useState(null);

  const { tableProps } = useTable();

  const handleEdit = (record) => {
    setSelectedRecord(record);
    editModal.show();
  };

  const handleDelete = (record) => {
    setSelectedRecord(record);
    deleteModal.show();
  };

  return (
    <>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Actions"
          render={(_, record) => (
            <>
              <Button onClick={() => handleEdit(record)}>Edit</Button>
              <Button onClick={() => handleDelete(record)}>Delete</Button>
            </>
          )}
        />
      </Table>

      <Modal visible={editModal.visible} onClose={editModal.close}>
        Edit: {selectedRecord?.title}
      </Modal>

      <Modal visible={deleteModal.visible} onClose={deleteModal.close}>
        Delete: {selectedRecord?.title}?
      </Modal>
    </>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why useCallback?

**Answer:** Stable references for performance

```typescript
// WITHOUT useCallback
const show = () => setVisible(true);

// Component re-renders:
// Render 1: show = function A
// Render 2: show = function B (NEW reference!)
// Render 3: show = function C (NEW reference!)

// Effects that depend on `show` will re-run! ❌

// WITH useCallback
const show = useCallback(() => setVisible(true), [visible]);

// Component re-renders:
// Render 1: show = function A
// Render 2: show = function A (SAME reference!) ✅
// Render 3: show = function A (SAME reference!) ✅

// Effects only run when `visible` changes! ✅
```

### 5.2 Why Not Expose setVisible?

**Answer:** Controlled API, prevent misuse

```typescript
// If we expose setVisible:
const { visible, setVisible } = useModal();

// Users might do:
setVisible("open"); // ❌ Type error (string)
setVisible(undefined); // ❌ Invalid state
setVisible(null); // ❌ Invalid state

// With show/close only:
const { visible, show, close } = useModal();

// Users can only:
show(); // ✅ Always valid
close(); // ✅ Always valid

// Type-safe and foolproof! ✅
```

### 5.3 Why Default to Hidden?

**Answer:** Common use case and performance

```typescript
// Most modals start hidden:
// - Dialog boxes
// - Confirmation modals
// - Forms

// Performance: Don't render modal content until needed
{
  modal.visible && <ExpensiveModalContent />;
}

// If defaultVisible=true, content renders immediately
// If defaultVisible=false (default), content waits ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting to Close Modal

```typescript
// ❌ WRONG - Modal never closes
const modal = useModal();

<Button onClick={modal.show}>Open</Button>
<Modal visible={modal.visible}>
  Content
  {/* No way to close! ❌ */}
</Modal>

// ✅ CORRECT - Provide close handler
<Modal
  visible={modal.visible}
  onCancel={modal.close}  // ← Close button
  onOk={modal.close}      // ← OK button
>
  Content
</Modal>
```

### 6.2 Using setVisible Instead of show/close

```typescript
// ❌ WRONG - Directly using setVisible (not exposed anyway)
const modal = useModal();
// modal.setVisible(true);  // ❌ Doesn't exist!

// ✅ CORRECT - Use provided methods
modal.show();
modal.close();
```

### 6.3 Sharing Modal Instance Between Components

```tsx
// ❌ WRONG - Passing modal as prop
function Parent() {
  const modal = useModal();
  return <Child modal={modal} />; // ❌ Tight coupling
}

function Child({ modal }) {
  return <Button onClick={modal.show}>Open</Button>;
}

// ✅ BETTER - Pass only what's needed
function Parent() {
  const modal = useModal();
  return <Child onOpen={modal.show} />; // ✅ Loose coupling
}

function Child({ onOpen }) {
  return <Button onClick={onOpen}>Open</Button>;
}

// OR BEST - Each component has own modal
function Child() {
  const modal = useModal();
  return <Button onClick={modal.show}>Open</Button>;
}
```

---

## 7. PERFORMANCE CONSIDERATIONS

### ⚡ Memoization with useCallback

```typescript
const show = useCallback(() => setVisible(true), [visible]);
const close = useCallback(() => setVisible(false), [visible]);

// Dependencies: [visible]
// When visible changes: true → false or false → true
// Callbacks are recreated

// Why include `visible` dependency?
// To ensure closures capture latest state
```

### 🎯 Conditional Rendering

```tsx
// Render modal content only when visible
{
  modal.visible && (
    <Modal>
      <ExpensiveComponent /> {/* Only renders when visible ✅ */}
    </Modal>
  );
}

// vs always rendering (even if hidden)
<Modal visible={modal.visible}>
  <ExpensiveComponent /> {/* Always mounts, just hidden ❌ */}
</Modal>;
```

---

## 8. TESTING

```typescript
import { renderHook, act } from "@testing-library/react";
import { useModal } from "@refinedev/core";

describe("useModal", () => {
  it("should start with visible=false by default", () => {
    const { result } = renderHook(() => useModal());
    expect(result.current.visible).toBe(false);
  });

  it("should show modal", () => {
    const { result } = renderHook(() => useModal());

    act(() => {
      result.current.show();
    });

    expect(result.current.visible).toBe(true);
  });

  it("should close modal", () => {
    const { result } = renderHook(() => useModal({ defaultVisible: true }));

    expect(result.current.visible).toBe(true);

    act(() => {
      result.current.close();
    });

    expect(result.current.visible).toBe(false);
  });

  it("should respect defaultVisible", () => {
    const { result } = renderHook(() => useModal({ defaultVisible: true }));
    expect(result.current.visible).toBe(true);
  });
});
```

---

## 9. ALTERNATIVES

### When NOT to use useModal?

**Use global modal management instead:**

```typescript
// For complex modal orchestration:
import { useModalForm } from "@refinedev/antd";

// Automatically handles:
// - Modal visibility
// - Form state
// - Loading states
// - Data fetching
// - Submission

const { modalProps, formProps } = useModalForm({
  resource: "posts",
  action: "create",
});

// useModal is for SIMPLE visibility management only
```

---

## 10. KẾT LUẬN

### Design Patterns Summary

- ✅ **State**: Manage visible/hidden transitions
- ✅ **Command**: Encapsulate show/close actions
- ✅ **Encapsulation**: Bundle state + actions, hide implementation
- ✅ **Factory**: Create independent modal instances

### Key Features

1. **Simple API** - Only 3 properties (visible, show, close)
2. **Stable References** - useCallback for performance
3. **Type-Safe** - No invalid states possible
4. **Reusable** - Create multiple independent instances
5. **Lightweight** - Only 30 lines of code!

### Khi nào dùng useModal?

✅ **Nên dùng:**

- Simple modals (dialogs, confirmations)
- Custom modal components
- Multiple independent modals
- Basic show/hide functionality

❌ **Không dùng:**

- Forms in modals → Use `useModalForm`
- Complex modal orchestration → Use global state
- Data-driven modals → Use higher-level hooks

### Remember

✅ **30 lines** - Ultra-simple utility
💡 **State Pattern** - Visible/hidden transitions
🎮 **Command Pattern** - show/close actions
📦 **Encapsulation** - Clean API
🏭 **Factory** - Multiple instances

---

> 📚 **Best Practice**: Use **separate modal instances** for different modals. Always provide **close handlers** (onCancel, onOk). Use **conditional rendering** for performance. For forms in modals, prefer **`useModalForm`** over `useModal` + `useForm`.
