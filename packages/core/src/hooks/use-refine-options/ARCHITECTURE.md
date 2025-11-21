# Kiến trúc và Design Patterns của useRefineOptions Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │              GLOBAL CONFIGURATION                 │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  <Refine options={{ ... }} />                    │  │
│  │         ↓                                         │  │
│  │  RefineContext                                   │  │
│  │         ↓                                         │  │
│  │  useRefineOptions ✅ (THIS HOOK)                 │  │
│  │    ↓                                             │  │
│  │    ├──→ ACCESSOR PATTERN:                        │  │
│  │    │     Extracts "options" from Context          │  │
│  │    │                                             │  │
│  │    └──→ ABSTRACTION PATTERN:                     │  │
│  │          Hides Context implementation             │  │
│  │                                                   │  │
│  │    ↓ returns IRefineOptions                       │  │
│  │                                                   │  │
│  │  {                                               │  │
│  │    mutationMode: "optimistic",                   │  │
│  │    syncWithLocation: true,                       │  │
│  │    warnWhenUnsavedChanges: true,                 │  │
│  │    liveMode: "auto",                             │  │
│  │    ...                                           │  │
│  │  }                                               │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - useForm (unsaved changes)                   │  │
│  │    - useTable (sync with location)               │  │
│  │    - useMutation (optimistic updates)            │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide direct access to the global `options` object passed to the `<Refine>` component.**

### 1.2 Data Flow

```
1. Developer configures <Refine options={...} />
   ↓
2. RefineProvider stores options in Context
   ↓
3. Component calls useRefineOptions()
   ↓
4. Hook extracts `options` from Context
   ↓
5. Component uses options (e.g., checks if mutationMode is "undoable")
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-refine-options/index.tsx: 45 dòng** - The Config Reader!

---

### 2.1 Accessor Pattern - The "Getter"

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Settings Menu

```
Phone System (RefineContext):
- Contains: User info, Battery level, Network status, SETTINGS

Settings App (useRefineOptions):
- Doesn't care about battery or network
- Just opens the "Settings" menu
- Gives you access to: Brightness, Volume, WiFi (The Options)

useRefineOptions:
- Ignores other Context data (resources, auth, etc.)
- Grabs ONLY the "options" object
```

**Accessor Pattern** = A method/hook designed specifically to retrieve a particular piece of data from a larger source.

#### Implementation:

```typescript
export const useRefineOptions = () => {
  // 1. Access the big container (Context)
  const context = React.useContext(RefineContext);

  // 2. Extract ONLY what we need (options)
  const { options } = context;

  // 3. Return it
  return options;
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - Consumers don't need to know about `RefineContext` structure
- ✅ **Focus** - Component declares "I need options", not "I need the whole app state"
- ✅ **Decoupling** - If Context structure changes, we only fix this hook

---

### 2.2 Abstraction Pattern - Hiding Details

#### 📦 VÍ DỤ ĐỜI THƯỜNG: ATM Machine

```
Bank Vault (RefineContext):
- Complex security
- Millions of dollars
- Gold bars

ATM (useRefineOptions):
- Simple interface
- Hides the complexity of the vault
- Just gives you cash (options)

useRefineOptions:
- Hides the fact that options come from React Context
- Could come from Redux, Recoil, or a global variable in the future
- The component doesn't care HOW it gets options, just THAT it gets them
```

**Abstraction Pattern** = Hiding complex implementation details behind a simple interface.

---

## 3. KEY FEATURES

### 3.1 Global Configuration Access

Access settings like:

- `mutationMode` (pessimistic, optimistic, undoable)
- `syncWithLocation` (boolean)
- `warnWhenUnsavedChanges` (boolean)
- `undoableTimeout` (number)
- `liveMode` (auto, manual, off)
- `disableTelemetry` (boolean)
- `reactQuery` (client config)

### 3.2 Type Safety

Returns `IRefineOptions` interface, ensuring TypeScript knows exactly what options are available.

---

## 4. COMMON USE CASES

### 4.1 Checking Mutation Mode

```tsx
const DeleteButton = () => {
  const { mutationMode } = useRefineOptions();

  if (mutationMode === "undoable") {
    return <button>Delete (Undoable)</button>;
  }
  return <button>Delete (Instant)</button>;
};
```

### 4.2 Checking Unsaved Changes Warning

```tsx
const Form = () => {
  const { warnWhenUnsavedChanges } = useRefineOptions();

  // Logic to enable/disable warning based on global config
};
```

---

## 5. TESTING

```typescript
import { renderHook } from "@testing-library/react";
import { useRefineOptions } from "./index";
import { RefineContext } from "@contexts/refine";

describe("useRefineOptions", () => {
  it("should return options from context", () => {
    const mockOptions = {
      mutationMode: "optimistic",
      syncWithLocation: true,
    };

    const wrapper = ({ children }) => (
      <RefineContext.Provider value={{ options: mockOptions }}>
        {children}
      </RefineContext.Provider>
    );

    const { result } = renderHook(() => useRefineOptions(), { wrapper });

    expect(result.current).toEqual(mockOptions);
  });
});
```

---

## 6. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: Extracts specific data from Context
- ✅ **Abstraction**: Hides implementation details

### Khi nào dùng?

- Khi bạn cần đọc **cấu hình toàn cục** của ứng dụng Refine (ví dụ: để quyết định hiển thị UI hoặc logic xử lý dữ liệu).

### Remember

✅ **Simple** - Just returns an object
🔑 **Accessor** - Gets `options` from Context
⚙️ **Global** - Affects entire app behavior
