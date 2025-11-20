# Kiến trúc và Design Patterns của useActionableButton Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │           UI COMPONENT SYSTEM                    │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  Form Components:                                │  │
│  │    <SaveButton>                                  │  │
│  │    <ExportButton>                                │  │
│  │    <ImportButton>                                │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  useActionableButton ✅                          │  │
│  │    (Provides localized labels)                   │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │    "Save" | "Lưu" | "保存"                       │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này chỉ có 1 mục đích duy nhất:**

> **Cung cấp localized label cho action buttons (Save, Export, Import)**

### 1.2 Tại sao cần hook này?

#### ❌ KHÔNG có useActionableButton:

```tsx
// Component developers phải tự translate:

function SaveButton() {
  const translate = useTranslate();
  const { humanize } = useRefineOptions();

  // Duplicate logic in EVERY button component! ❌
  const label = translate("buttons.save", humanize("save"));

  return <button>{label}</button>;
}

function ExportButton() {
  const translate = useTranslate();
  const { humanize } = useRefineOptions();

  // DUPLICATE AGAIN! ❌
  const label = translate("buttons.export", humanize("export"));

  return <button>{label}</button>;
}

// Vấn đề:
// - Code duplication (DRY violation)
// - Inconsistent translation logic
// - Hard to maintain
```

#### ✅ CÓ useActionableButton:

```tsx
// Centralized translation logic! ✅

function SaveButton() {
  const { label } = useActionableButton({ type: "save" });
  return <button>{label}</button>;
}

function ExportButton() {
  const { label } = useActionableButton({ type: "export" });
  return <button>{label}</button>;
}

// Benefits:
// - No duplication
// - Consistent translation
// - Easy to maintain
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này chỉ 27 dòng** - nhưng demonstrate 4 patterns quan trọng!

---

### 2.1 Strategy Pattern - Pattern "Chiến Lược Linh Hoạt"

#### 🌍 VÍ DỤ ĐỜI THƯỜNG: Restaurant Menu Translation

```
Imagine a restaurant with multilingual menus:

English customer:
  Menu item "save" → "Save"

Vietnamese customer:
  Menu item "save" → "Lưu"

Japanese customer:
  Menu item "save" → "保存"

Same button, different languages!
```

**Strategy Pattern** = Select translation strategy at runtime

#### Implementation:

```typescript
// STRATEGY 1: i18n translation (primary)
const labelFromI18n = translate("buttons.save");
// → "Lưu" (if Vietnamese locale)

// STRATEGY 2: Humanizer fallback (if no translation)
const labelFromHumanizer = humanize("save");
// → "Save" (capitalized)

// Select strategy:
const label = translate(key, fallback);
//            ^^^^^^^^      ^^^^^^^^
//            Strategy 1    Strategy 2 (fallback)
```

#### Real Example Flow:

```typescript
// User with Vietnamese locale:
const { label } = useActionableButton({ type: "save" });

// Flow:
// 1. key = "buttons.save"
// 2. fallback = humanize("save") = "Save"
// 3. translate("buttons.save", "Save")
//    ↓
//    Check i18n file for "buttons.save"
//    ↓
//    Found: "Lưu" ✅
//    ↓
//    Return: "Lưu"

// User without i18n configuration:
const { label } = useActionableButton({ type: "export" });

// Flow:
// 1. key = "buttons.export"
// 2. fallback = humanize("export") = "Export"
// 3. translate("buttons.export", "Export")
//    ↓
//    Check i18n file for "buttons.export"
//    ↓
//    Not found (no i18nProvider) ❌
//    ↓
//    Return fallback: "Export" ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Works with/without i18n
- ✅ **Graceful degradation** - Always has fallback
- ✅ **Multi-language** - Easy to support 100+ languages

---

### 2.2 Factory Pattern - Pattern "Nhà Máy Sản Xuất"

#### 🏭 VÍ DỤ ĐỜI THƯỜNG: Button Label Factory

```
Button Factory:

Input: "save" → Output: "Save" label
Input: "export" → Output: "Export" label
Input: "import" → Output: "Import" label

Same factory, different products!
```

**Factory Pattern** = Create objects based on input type

#### ❌ KHÔNG có Factory Pattern:

```tsx
// BAD - Conditional logic in every component

function SaveButton() {
  const translate = useTranslate();
  const label = translate("buttons.save", "Save");
  return <button>{label}</button>;
}

function ExportButton() {
  const translate = useTranslate();
  const label = translate("buttons.export", "Export");
  return <button>{label}</button>;
}

function ImportButton() {
  const translate = useTranslate();
  const label = translate("buttons.import", "Import");
  return <button>{label}</button>;
}

// Vấn đề:
// - Duplicate logic in EVERY component
// - Hard to add new button types
// - Inconsistent
```

#### ✅ CÓ Factory Pattern:

```tsx
// GOOD - Factory creates labels based on type

function useActionableButton({ type }) {
  const translate = useTranslate();
  const { humanize } = useRefineOptions();

  // FACTORY: Create label based on type
  const key = `buttons.${type}`; // ← Dynamic key generation
  const fallback = humanize(type); // ← Dynamic fallback
  const label = translate(key, fallback);

  return { label };
}

// Usage - Just specify type!
function SaveButton() {
  const { label } = useActionableButton({ type: "save" });
  return <button>{label}</button>;
}

function ExportButton() {
  const { label } = useActionableButton({ type: "export" });
  return <button>{label}</button>;
}

// Add new button type? NO code changes needed!
function DeleteButton() {
  const { label } = useActionableButton({ type: "delete" }); // ✅
  return <button>{label}</button>;
}
```

#### Real Code:

```typescript
// From useActionableButton (lines 20-23)

const key = `buttons.${type}`; // ← Factory creates key
const fallback = humanize(type); // ← Factory creates fallback
const label = translate(key, fallback); // ← Factory produces label

return { label };

// Examples:
// type: "save"   → key: "buttons.save"   → label: "Save" | "Lưu"
// type: "export" → key: "buttons.export" → label: "Export" | "Xuất"
// type: "import" → key: "buttons.import" → label: "Import" | "Nhập"
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DRY** - Don't Repeat Yourself
- ✅ **Scalable** - Easy to add new button types
- ✅ **Centralized** - One place to change logic

---

### 2.3 Dependency Injection Pattern

#### 💉 VÍ DỤ ĐỜI THƯỜNG: TV Remote Control

```
TV Remote Control:

❌ BAD - Remote hard-coded to Samsung TV:
class Remote {
  turnOn() {
    SamsungTV.turnOn(); // ← Hard-coded!
  }
}
→ Can't use with Sony TV, LG TV, etc.

✅ GOOD - Remote works with any TV:
class Remote {
  constructor(tv) { // ← Inject dependency
    this.tv = tv;
  }
  turnOn() {
    this.tv.turnOn(); // ← Works with ANY TV!
  }
}

const remote = new Remote(sonyTV); // Sony
const remote2 = new Remote(lgTV); // LG
```

**Dependency Injection** = Inject dependencies from outside, not hard-code them

#### Implementation:

```typescript
export function useActionableButton({ type }) {
  // DEPENDENCIES INJECTED via Refine Context:
  const translate = useTranslate(); // ← Injected from I18nContext
  const { humanize } = useRefineOptions(); // ← Injected from RefineContext

  // Hook doesn't know HOW to translate or humanize
  // It just USES the injected dependencies!

  const label = translate(key, humanize(type));
  return { label };
}

// Refine framework provides:
// - i18nProvider (translation strategy)
// - textTransformers (humanization strategy)
```

#### Why Injection is Powerful:

```typescript
// App 1: Uses i18next for translation
const App1 = () => (
  <Refine
    i18nProvider={i18nextProvider} // ← Inject i18next
  >
    <SaveButton /> {/* Uses i18next internally */}
  </Refine>
);

// App 2: Uses react-intl for translation
const App2 = () => (
  <Refine
    i18nProvider={reactIntlProvider} // ← Inject react-intl
  >
    <SaveButton /> {/* Uses react-intl internally */}
  </Refine>
);

// App 3: No translation
const App3 = () => (
  <Refine>
    <SaveButton /> {/* Uses humanizer fallback */}
  </Refine>
);

// Same hook, different providers! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Testable** - Easy to mock dependencies
- ✅ **Flexible** - Works with any i18n library
- ✅ **Decoupled** - Hook doesn't depend on specific implementation

---

### 2.4 Single Responsibility Principle (SRP)

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Restaurant Staff

```
Restaurant Staff Responsibilities:

❌ BAD - One person does everything:
class Employee {
  cook()         // Chef's job
  serve()        // Waiter's job
  wash()         // Dishwasher's job
  manage()       // Manager's job
}
→ Too many responsibilities! Inefficient!

✅ GOOD - Each person has ONE job:
class Chef { cook() }
class Waiter { serve() }
class Dishwasher { wash() }
class Manager { manage() }
→ Focused, efficient, easy to replace!
```

**SRP** = Each class/function/hook should have ONE reason to change

#### Implementation:

```typescript
// useActionableButton has ONLY ONE responsibility:
// → "Provide localized label for action buttons"

export function useActionableButton({ type }) {
  const translate = useTranslate(); // ← NOT responsible for translation
  const { humanize } = useRefineOptions(); // ← NOT responsible for humanization

  // ONLY responsible for:
  // 1. Build key from type
  // 2. Build fallback from type
  // 3. Combine them
  const key = `buttons.${type}`;
  const fallback = humanize(type);
  const label = translate(key, fallback);

  return { label }; // ← ONLY returns label, nothing else!
}

// NOT responsible for:
// ❌ Rendering button
// ❌ Handling clicks
// ❌ Styling
// ❌ Translation logic
// ❌ Humanization logic

// ONLY responsible for:
// ✅ Mapping type → label
```

#### Responsibilities Separated:

```typescript
// Responsibility 1: Translation → useTranslate hook
const translate = useTranslate();

// Responsibility 2: Humanization → useRefineOptions hook
const { humanize } = useRefineOptions();

// Responsibility 3: Label generation → useActionableButton
const { label } = useActionableButton({ type: "save" });

// Responsibility 4: Button rendering → SaveButton component
function SaveButton() {
  const { label } = useActionableButton({ type: "save" });
  return <button>{label}</button>; // ← Renders UI
}

// Responsibility 5: Click handling → onClick prop
<SaveButton onClick={handleSave} />;
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Easy to understand** - One clear purpose
- ✅ **Easy to test** - Test one thing
- ✅ **Easy to maintain** - Change one thing at a time
- ✅ **Reusable** - Can be used anywhere

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                   | Ví dụ đời thường     | Giải quyết vấn đề gì         | Trong useActionableButton          |
| ------------------------- | -------------------- | ---------------------------- | ---------------------------------- |
| **Strategy**              | Multilingual menu    | Select algorithm at runtime  | i18n vs humanizer fallback         |
| **Factory**               | Button label factory | Create objects based on type | Generate labels from type param    |
| **Dependency Injection**  | TV remote control    | Decouple dependencies        | Inject translate & humanize        |
| **Single Responsibility** | Restaurant staff     | One reason to change         | Only responsible for label mapping |

---

## 3. KEY FEATURES

### 3.1 Type Safety

```typescript
// Only 3 allowed types:
type: "save" | "export" | "import";

// TypeScript prevents typos:
useActionableButton({ type: "sav" }); // ❌ TypeScript error!
useActionableButton({ type: "save" }); // ✅ Valid

// Future: Easy to add new types
type: "save" | "export" | "import" | "delete" | "refresh";
```

### 3.2 Automatic Fallback

```typescript
// With i18n provider:
<Refine i18nProvider={i18nProvider}>
  <SaveButton />
</Refine>
// Result: "Lưu" (Vietnamese)

// Without i18n provider:
<Refine>
  <SaveButton />
</Refine>
// Result: "Save" (humanized fallback) ✅
```

### 3.3 Consistent Button Labels

```typescript
// All action buttons use same translation pattern:
translate("buttons.save")   → "Save" | "Lưu" | "保存"
translate("buttons.export") → "Export" | "Xuất" | "エクスポート"
translate("buttons.import") → "Import" | "Nhập" | "インポート"

// Consistency across entire app!
```

---

## 4. COMMON USE CASES

### 4.1 Save Button

```tsx
import { useActionableButton } from "@refinedev/core";

function SaveButton({ onClick, disabled }) {
  const { label } = useActionableButton({ type: "save" });

  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

// Usage:
<SaveButton onClick={handleSave} />;
// Renders: "Save" (English) or "Lưu" (Vietnamese)
```

### 4.2 Export Button

```tsx
function ExportButton({ onClick }) {
  const { label } = useActionableButton({ type: "export" });

  return (
    <button onClick={onClick}>
      <DownloadIcon />
      {label}
    </button>
  );
}

// Usage:
<ExportButton onClick={exportToExcel} />;
// Renders: "Export" (English) or "Xuất" (Vietnamese)
```

### 4.3 Import Button

```tsx
function ImportButton({ onFileSelect }) {
  const { label } = useActionableButton({ type: "import" });

  return (
    <label>
      <input type="file" onChange={onFileSelect} style={{ display: "none" }} />
      <button as="span">
        <UploadIcon />
        {label}
      </button>
    </label>
  );
}

// Usage:
<ImportButton onFileSelect={handleFileImport} />;
// Renders: "Import" (English) or "Nhập" (Vietnamese)
```

### 4.4 Custom Styling

```tsx
import { useActionableButton } from "@refinedev/core";
import { Button } from "@mantine/core";

function MantineSaveButton() {
  const { label } = useActionableButton({ type: "save" });

  return (
    <Button color="green" leftIcon={<SaveIcon />}>
      {label}
    </Button>
  );
}
```

---

## 5. I18N INTEGRATION

### 5.1 Translation File Structure

```typescript
// i18n/vi.json (Vietnamese)
{
  "buttons": {
    "save": "Lưu",
    "export": "Xuất dữ liệu",
    "import": "Nhập dữ liệu"
  }
}

// i18n/en.json (English)
{
  "buttons": {
    "save": "Save",
    "export": "Export",
    "import": "Import"
  }
}

// i18n/ja.json (Japanese)
{
  "buttons": {
    "save": "保存",
    "export": "エクスポート",
    "import": "インポート"
  }
}
```

### 5.2 Setup with i18next

```typescript
import i18next from "i18next";
import { Refine } from "@refinedev/core";
import { useTranslation } from "react-i18next";

i18next.init({
  resources: {
    en: { translation: require("./i18n/en.json") },
    vi: { translation: require("./i18n/vi.json") },
    ja: { translation: require("./i18n/ja.json") },
  },
  lng: "vi", // Default language
});

function App() {
  const { t } = useTranslation();

  return (
    <Refine
      i18nProvider={{
        translate: (key, defaultMessage) => t(key, defaultMessage),
        changeLocale: (lang) => i18next.changeLanguage(lang),
        getLocale: () => i18next.language,
      }}
    >
      <SaveButton /> {/* Renders: "Lưu" */}
    </Refine>
  );
}
```

### 5.3 Fallback Behavior

```typescript
// Scenario 1: Translation exists
translate("buttons.save", "Save")
→ Returns: "Lưu" ✅

// Scenario 2: Translation missing
translate("buttons.delete", "Delete")
→ Returns: "Delete" (fallback) ✅

// Scenario 3: No i18nProvider
translate("buttons.save", "Save")
→ Returns: "Save" (fallback) ✅
```

---

## 6. ARCHITECTURE DECISIONS

### 6.1 Why Only 3 Button Types?

**Question:** Why limit to save/export/import? Why not delete, refresh, etc.?

**Answer:** This hook is specifically for **actionable buttons** that:

- Trigger data operations
- Need consistent labeling
- Are commonly used across Refine apps

Other buttons (delete, refresh, etc.) may have different patterns or use separate hooks.

### 6.2 Why Not Include Icon?

**Question:** Why only return `label`, not icon?

**Answer:**

- **Icons are UI-specific** - Different UI libraries use different icon systems
- **Flexibility** - Developers may not want icons
- **Single Responsibility** - This hook focuses on labels only

Developers can add icons separately:

```tsx
function SaveButton() {
  const { label } = useActionableButton({ type: "save" });
  return (
    <button>
      <SaveIcon /> {/* Add icon separately */}
      {label}
    </button>
  );
}
```

### 6.3 Why Use Template String for Key?

```typescript
const key = `buttons.${type}`; // ← Template string

// Instead of:
const keyMap = {
  save: "buttons.save",
  export: "buttons.export",
  import: "buttons.import",
};
const key = keyMap[type];
```

**Reasons:**

- ✅ **Less code** - No need for mapping object
- ✅ **Consistent pattern** - Follows Refine convention (`buttons.*`)
- ✅ **Easy to extend** - New types work automatically

---

## 7. INTEGRATION WITH REFINE COMPONENTS

### 7.1 Built-in Button Components

```typescript
// Refine's built-in buttons use this hook internally:

// @refinedev/antd
export function SaveButton() {
  const { label } = useActionableButton({ type: "save" });
  return <AntButton>{label}</AntButton>;
}

// @refinedev/mui
export function ExportButton() {
  const { label } = useActionableButton({ type: "export" });
  return <MuiButton>{label}</MuiButton>;
}

// @refinedev/mantine
export function ImportButton() {
  const { label } = useActionableButton({ type: "import" });
  return <MantineButton>{label}</MantineButton>;
}
```

### 7.2 Works Across All UI Libraries

```
useActionableButton (core)
        │
        ├─→ @refinedev/antd → <AntButton>
        ├─→ @refinedev/mui → <MuiButton>
        ├─→ @refinedev/mantine → <MantineButton>
        ├─→ @refinedev/chakra-ui → <ChakraButton>
        └─→ Custom UI → <YourButton>

Same hook, different UI implementations! ✅
```

---

## 8. TESTING

### 8.1 Unit Test Example

```typescript
import { renderHook } from "@testing-library/react";
import { useActionableButton } from "./useActionableButton";

// Mock dependencies
jest.mock("../../use-refine-options", () => ({
  useRefineOptions: () => ({
    textTransformers: {
      humanize: (str) => str.charAt(0).toUpperCase() + str.slice(1),
    },
  }),
}));

jest.mock("../../i18n", () => ({
  useTranslate: () => (key, fallback) => fallback, // No translation
}));

describe("useActionableButton", () => {
  it("should return label for save button", () => {
    const { result } = renderHook(() => useActionableButton({ type: "save" }));

    expect(result.current.label).toBe("Save");
  });

  it("should return label for export button", () => {
    const { result } = renderHook(() =>
      useActionableButton({ type: "export" }),
    );

    expect(result.current.label).toBe("Export");
  });
});
```

### 8.2 Integration Test with i18n

```typescript
import { renderHook } from "@testing-library/react";
import { Refine } from "@refinedev/core";
import { useActionableButton } from "./useActionableButton";

const i18nProvider = {
  translate: (key) => {
    const translations = {
      "buttons.save": "Lưu",
      "buttons.export": "Xuất",
      "buttons.import": "Nhập",
    };
    return translations[key] || key;
  },
  changeLocale: () => Promise.resolve(),
  getLocale: () => "vi",
};

describe("useActionableButton with i18n", () => {
  it("should return Vietnamese label", () => {
    const wrapper = ({ children }) => (
      <Refine i18nProvider={i18nProvider}>{children}</Refine>
    );

    const { result } = renderHook(() => useActionableButton({ type: "save" }), {
      wrapper,
    });

    expect(result.current.label).toBe("Lưu");
  });
});
```

---

## 9. COMMON PITFALLS

### 9.1 Typo in Type

```typescript
// ❌ WRONG - Typo in type
const { label } = useActionableButton({ type: "sav" });
// TypeScript error: Type '"sav"' is not assignable to type '"save" | "export" | "import"'

// ✅ CORRECT
const { label } = useActionableButton({ type: "save" });
```

### 9.2 Missing Translation

```typescript
// i18n file missing "buttons.save" key

// Result:
const { label } = useActionableButton({ type: "save" });
// label = "Save" (fallback) ✅

// No crash! Graceful fallback!
```

### 9.3 Using for Non-Actionable Buttons

```typescript
// ❌ WRONG - Using for navigation buttons
const { label } = useActionableButton({ type: "back" });
// Error: Type '"back"' is not assignable...

// ✅ CORRECT - Use general translate hook
const translate = useTranslate();
const label = translate("buttons.back", "Back");
```

---

## 10. KẾT LUẬN

### Design Patterns Summary

- ✅ **Strategy**: i18n vs humanizer fallback
- ✅ **Factory**: Generate labels from type
- ✅ **Dependency Injection**: Inject translate & humanize
- ✅ **Single Responsibility**: Only map type → label

### Key Features

1. **Type-safe** - TypeScript enforces valid types
2. **i18n-ready** - Multi-language support
3. **Fallback** - Works without i18n
4. **Consistent** - Standardized button labels
5. **Simple** - 27 lines, easy to understand

### Khi nào dùng useActionableButton?

✅ **Nên dùng:**

- Save buttons in forms
- Export buttons for data
- Import buttons for uploads
- Any actionable button needing localization

❌ **Không dùng:**

- Navigation buttons (use useTranslate)
- Custom actions (use useTranslate)
- Buttons with complex logic (create custom hook)

### Remember

✅ **27 lines** - Small but powerful
🌍 **i18n** - Translation-ready
🏭 **Factory** - Type → Label
💉 **Injected** - No hard dependencies
🎯 **SRP** - One clear purpose

---

## 11. RELATED HOOKS

```typescript
// Translation hooks:
useTranslate(); // General translation
useSetLocale(); // Change language

// Button-related hooks:
useActionableButton(); // ✅ THIS HOOK
// (Other button hooks may exist in UI packages)

// Configuration hooks:
useRefineOptions(); // Access text transformers
```

---

## 12. REFERENCES

- **Source code**: `/packages/core/src/hooks/button/actionable-button/index.tsx` (27 lines)
- **Related components**: `<SaveButton>`, `<ExportButton>`, `<ImportButton>`
- **i18n docs**: https://refine.dev/docs/core/hooks/translate/use-translate
- **Design patterns**: Strategy, Factory, Dependency Injection, SRP
