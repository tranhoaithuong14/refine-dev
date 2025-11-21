# Kiến trúc và Design Patterns của I18n Hooks System

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │      I18N SYSTEM (INTERNATIONALIZATION)          │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  I18n Hooks System ✅ (THIS MODULE!)             │  │
│  │    → Multi-language support                      │  │
│  │         │                                         │  │
│  │         ├──→ useTranslate:                       │  │
│  │         │     - Translate text keys              │  │
│  │         │     - Interpolation support            │  │
│  │         │     - Fallback to default              │  │
│  │         │                                         │  │
│  │         ├──→ useGetLocale:                       │  │
│  │         │     - Get current language             │  │
│  │         │     - Read from i18nProvider           │  │
│  │         │                                         │  │
│  │         ├──→ useSetLocale:                       │  │
│  │         │     - Change language at runtime       │  │
│  │         │     - Trigger re-render                │  │
│  │         │                                         │  │
│  │         └──→ useTranslation:                     │  │
│  │               - Combines all 3 hooks             │  │
│  │               - Convenience wrapper              │  │
│  │                                                   │  │
│  │  Powered by:                                     │  │
│  │    - I18nContext → Provider context              │  │
│  │    - I18nProvider → User implementation          │  │
│  │                                                   │  │
│  │  Works with:                                     │  │
│  │    - i18next                                     │  │
│  │    - react-intl                                  │  │
│  │    - Custom implementations                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Module này có mục đích:**

> **Enable multi-language support - Translate UI text, switch languages at runtime, and provide a consistent i18n API**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    I18N SYSTEM FLOW                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: App Setup - Define I18n Provider                   │
│                                                              │
│  <Refine                                                     │
│    i18nProvider={{                                           │
│      translate: (key, options, defaultMessage) => {         │
│        // Use i18next or custom implementation              │
│        return i18next.t(key, options) || defaultMessage;    │
│      },                                                      │
│      changeLocale: (locale) => {                            │
│        // Change language                                   │
│        return i18next.changeLanguage(locale);               │
│      },                                                      │
│      getLocale: () => {                                      │
│        // Get current language                              │
│        return i18next.language || "en";                     │
│      }                                                       │
│    }}                                                        │
│  >                                                           │
│    <App />                                                   │
│  </Refine>                                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Component Uses Hooks                               │
│                                                              │
│  function ProductList() {                                    │
│    const translate = useTranslate();                         │
│    const getLocale = useGetLocale();                         │
│    const changeLocale = useSetLocale();                      │
│                                                              │
│    // Or use combined hook:                                 │
│    const { translate, getLocale, changeLocale } =           │
│      useTranslation();                                       │
│                                                              │
│    return (                                                  │
│      <div>                                                   │
│        <h1>{translate("products.title")}</h1>               │
│        <p>Current: {getLocale()}</p>                        │
│        <button onClick={() => changeLocale("es")}>          │
│          Español                                             │
│        </button>                                             │
│      </div>                                                  │
│    );                                                        │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Translate Text                                     │
│                                                              │
│  translate("products.title")                                 │
│  → Hooks read from I18nContext                              │
│  → Call i18nProvider.translate("products.title")            │
│  → i18next.t("products.title")                              │
│  → Looks up in translation files                            │
│                                                              │
│  Translation files (en.json):                                │
│  {                                                           │
│    "products": {                                             │
│      "title": "Products"                                     │
│    }                                                         │
│  }                                                           │
│                                                              │
│  Returns: "Products"                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Change Locale                                      │
│                                                              │
│  User clicks: <button onClick={() => changeLocale("es")}>   │
│  → Hooks call i18nProvider.changeLocale("es")               │
│  → i18next.changeLanguage("es")                             │
│  → Loads Spanish translations                               │
│  → All components re-render                                 │
│  → translate("products.title") now returns "Productos"      │
│                                                              │
│  Translation files (es.json):                                │
│  {                                                           │
│    "products": {                                             │
│      "title": "Productos"                                    │
│    }                                                         │
│  }                                                           │
│                                                              │
│  UI updates to Spanish! ✅                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **4 tiny hooks** - Simple but powerful i18n abstraction!

---

### 2.1 Context Pattern - Dependency Injection

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Power Outlet

```
Using Electricity in Different Countries:

WITHOUT Adapter (Hardcoded):
→ US device: 110V plug
→ Go to Europe: 220V outlet
→ Device doesn't work! ❌
→ Must rewire device!

WITH Adapter (Context):
→ US device: Any plug
→ Context: Power adapter
→ Go to Europe: Same device
→ Adapter converts voltage
→ Device works! ✅

I18n Context = Power adapter!
→ Hooks: Device (independent)
→ Context: Adapter (i18nProvider)
→ Works with any i18n library! ✅
```

**Context Pattern** = Inject dependencies without prop drilling

#### Implementation:

```typescript
// From all i18n hooks:

// Step 1: Create Context (in @contexts/i18n)
export const I18nContext = createContext<II18nContext>({});

export type I18nProvider = {
  translate: (key: string, options?: any, defaultMessage?: string) => string;
  changeLocale: (locale: string, options?: any) => Promise<any> | any;
  getLocale: () => string;
};

// Step 2: Provide Context (in Refine component)
<Refine
  i18nProvider={{
    translate: (key, options, defaultMessage) => i18next.t(key, options),
    changeLocale: (locale) => i18next.changeLanguage(locale),
    getLocale: () => i18next.language,
  }}
>
  <App />
</Refine>;

// Step 3: Consume Context (in hooks)
export const useTranslate = () => {
  const { i18nProvider } = useContext(I18nContext);
  // ↑ Access provider from context!

  return useMemo(() => {
    function translate(key, options, defaultMessage) {
      return (
        i18nProvider?.translate(key, options, defaultMessage) ??
        defaultMessage ??
        key
      );
    }
    return translate;
  }, [i18nProvider]);
};

// Step 4: Use in Components
function ProductList() {
  const translate = useTranslate();
  // ↑ No props! Gets provider from context! ✅

  return <h1>{translate("products.title")}</h1>;
}
```

#### Why Context vs Props?

```typescript
// WITHOUT Context (Props drilling - bad):
<App i18nProvider={provider}>
  <Layout i18nProvider={provider}>
    <Sidebar i18nProvider={provider}>
      <Menu i18nProvider={provider}>
        <MenuItem i18nProvider={provider}>
          <Text i18nProvider={provider}>
            {provider.translate("menu.home")}
          </Text>
        </MenuItem>
      </Menu>
    </Sidebar>
  </Layout>
</App>
// ↑ Must pass through ALL levels! ❌
// ↑ Tedious and error-prone!

// WITH Context (good):
<Refine i18nProvider={provider}>
  <App>
    <Layout>
      <Sidebar>
        <Menu>
          <MenuItem>
            <Text>
              {useTranslate()("menu.home")}
            </Text>
          </MenuItem>
        </Menu>
      </Sidebar>
    </Layout>
  </App>
</Refine>
// ↑ Provide ONCE at top! ✅
// ↑ Access ANYWHERE with hook! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **No Prop Drilling** - Access anywhere
- ✅ **Loose Coupling** - Components don't depend on specific i18n library
- ✅ **Easy Testing** - Mock provider in tests
- ✅ **Flexibility** - Switch i18n libraries without changing components

---

### 2.2 Adapter Pattern - Provider Interface

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: USB-C Adapter

```
Connecting Different Devices:

WITHOUT Adapter (Specific cables):
→ iPhone: Lightning cable
→ Android: USB-C cable
→ Laptop: Different cable
→ Need 3+ cables! ❌

WITH Adapter (Universal):
→ All devices: USB-C adapter
→ iPhone: Lightning → USB-C
→ Android: USB-C → USB-C
→ Laptop: USB-C → USB-C
→ One interface! ✅

I18nProvider = USB-C adapter!
→ i18next: Specific implementation
→ react-intl: Different implementation
→ Provider: Unified interface ✅
```

**Adapter Pattern** = Unified interface for different implementations

#### Implementation:

```typescript
// Provider Interface (Standard)
export type I18nProvider = {
  translate: (key: string, options?: any, defaultMessage?: string) => string;
  changeLocale: (locale: string, options?: any) => Promise<any> | any;
  getLocale: () => string;
};

// ═══════════════════════════════════════════════════════════
// ADAPTER 1: i18next
// ═══════════════════════════════════════════════════════════

import i18next from "i18next";

const i18nProvider: I18nProvider = {
  translate: (key, options, defaultMessage) => {
    return i18next.t(key, { ...options, defaultValue: defaultMessage });
  },
  changeLocale: (locale) => {
    return i18next.changeLanguage(locale);
  },
  getLocale: () => {
    return i18next.language;
  },
};

// ═══════════════════════════════════════════════════════════
// ADAPTER 2: react-intl
// ═══════════════════════════════════════════════════════════

import { useIntl } from "react-intl";

const i18nProvider: I18nProvider = {
  translate: (key, options) => {
    const intl = useIntl();
    return intl.formatMessage({ id: key }, options);
  },
  changeLocale: (locale) => {
    // react-intl locale change logic
  },
  getLocale: () => {
    const intl = useIntl();
    return intl.locale;
  },
};

// ═══════════════════════════════════════════════════════════
// ADAPTER 3: Custom (Dictionary)
// ═══════════════════════════════════════════════════════════

const translations = {
  en: { "products.title": "Products" },
  es: { "products.title": "Productos" },
};

let currentLocale = "en";

const i18nProvider: I18nProvider = {
  translate: (key, options, defaultMessage) => {
    return translations[currentLocale][key] || defaultMessage || key;
  },
  changeLocale: (locale) => {
    currentLocale = locale;
  },
  getLocale: () => {
    return currentLocale;
  },
};

// ═══════════════════════════════════════════════════════════
// ALL adapters work with same hooks! ✅
// ═══════════════════════════════════════════════════════════

function ProductList() {
  const translate = useTranslate();
  // ↑ Works with i18next, react-intl, or custom! ✅

  return <h1>{translate("products.title")}</h1>;
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Library Agnostic** - Works with any i18n library
- ✅ **Easy Migration** - Switch libraries without changing code
- ✅ **Consistency** - Same API everywhere
- ✅ **Flexibility** - Use custom implementation

---

### 2.3 Facade Pattern - Simplified Interface

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Hotel Concierge

```
Booking Services:

WITHOUT Concierge (Complex):
→ Call restaurant directly
→ Call taxi company directly
→ Call tour operator directly
→ 3 different phone numbers! ❌
→ 3 different procedures!

WITH Concierge (Simple):
→ Call concierge
→ "Book dinner, taxi, and tour"
→ Concierge handles all! ✅
→ One interface!

useTranslation = Hotel concierge!
→ Combines 3 hooks
→ One simple interface ✅
```

**Facade Pattern** = Simple interface for complex subsystem

#### Implementation:

```typescript
// From useTranslation.tsx

// Individual hooks (Complex subsystem)
export const useTranslate = () => {
  const { i18nProvider } = useContext(I18nContext);
  return useMemo(() => {
    function translate(key, options, defaultMessage) {
      return (
        i18nProvider?.translate(key, options, defaultMessage) ??
        defaultMessage ??
        key
      );
    }
    return translate;
  }, [i18nProvider]);
};

export const useSetLocale = () => {
  const { i18nProvider } = useContext(I18nContext);
  return useCallback((lang: string) => i18nProvider?.changeLocale(lang), []);
};

export const useGetLocale = () => {
  const { i18nProvider } = useContext(I18nContext);
  return useCallback(() => i18nProvider.getLocale(), []);
};

// Facade (Simple interface)
export const useTranslation = () => {
  const translate = useTranslate();
  const changeLocale = useSetLocale();
  const getLocale = useGetLocale();

  return {
    translate,
    changeLocale,
    getLocale,
  };
  // ↑ One hook returns all three functions! ✅
};
```

#### Usage Comparison:

```tsx
// WITHOUT Facade (Multiple hooks)
function LanguageSwitcher() {
  const translate = useTranslate();
  const getLocale = useGetLocale();
  const changeLocale = useSetLocale();

  return (
    <div>
      <h1>{translate("settings.language")}</h1>
      <p>Current: {getLocale()}</p>
      <button onClick={() => changeLocale("es")}>Español</button>
    </div>
  );
}
// ↑ 3 separate hooks! ✅ Fine for simple cases

// WITH Facade (Single hook)
function LanguageSwitcher() {
  const { translate, getLocale, changeLocale } = useTranslation();

  return (
    <div>
      <h1>{translate("settings.language")}</h1>
      <p>Current: {getLocale()}</p>
      <button onClick={() => changeLocale("es")}>Español</button>
    </div>
  );
}
// ↑ One hook! ✅ Better for components using all 3
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Convenience** - One import instead of three
- ✅ **Consistency** - All i18n functions together
- ✅ **Discoverability** - Easier to find all i18n features
- ✅ **Backward Compatibility** - Individual hooks still available

---

### 2.4 Fallback Pattern - Graceful Degradation

#### 🚰 VÍ DỤ ĐỜI THƯỜNG: Water Supply

```
Water System:

LEVEL 1 - Main water supply:
→ City water (best quality)
→ Always available ✅

LEVEL 2 - Backup tank:
→ If main fails
→ Use tank water ⚠️

LEVEL 3 - Emergency well:
→ If tank empty
→ Use well water ⚠️

LEVEL 4 - No water:
→ Show error ❌

useTranslate = Water system!
→ Try translation → Use default → Use key
→ Always shows SOMETHING! ✅
```

**Fallback Pattern** = Multiple levels of fallback

#### Implementation:

```typescript
// From useTranslate.ts (lines 22-34)

function translate(key: string, options?: any, defaultMessage?: string) {
  return (
    // LEVEL 1: Try provider translation
    i18nProvider?.translate(key, options, defaultMessage) ??
    // ↑ Best: Actual translation from i18n library

    // LEVEL 2: Use default message
    defaultMessage ??
    // ↑ Good: User-provided fallback

    // LEVEL 3: If options is string, use it
    (typeof options === "string" && typeof defaultMessage === "undefined"
      ? options
      : // LEVEL 4: Show key as last resort
        key)
    // ↑ Fallback: Show the key itself
  );
}

// Nullish coalescing (??) checks for null/undefined
// Falls through until finding a value ✅
```

#### Fallback Chain Examples:

```typescript
const translate = useTranslate();

// SCENARIO 1: Translation exists
translate("products.title");
// Provider: "Products" ✅
// → Returns: "Products"

// SCENARIO 2: Translation missing, has default
translate("products.subtitle", "All Products");
// Provider: undefined
// Default: "All Products" ✅
// → Returns: "All Products"

// SCENARIO 3: Translation missing, no default
translate("products.unknown");
// Provider: undefined
// Default: undefined
// → Returns: "products.unknown" (key itself) ⚠️

// SCENARIO 4: No i18n provider at all
// Provider: undefined
translate("products.title", "Products");
// → Returns: "Products" (default) ✅

// SCENARIO 5: Options as default (legacy API)
translate("products.title", "Products");
// If options is string and no defaultMessage
// → Returns: "Products" ✅
```

#### Why Multiple Fallbacks?

```typescript
// User experience with fallbacks:

// NO Fallbacks (bad):
{
  translate("products.title") || "???";
}
// Translation missing → Shows "???" ❌
// User confused!

// WITH Fallbacks (good):
{
  translate("products.title", "Products");
}
// Translation missing → Shows "Products" ✅
// Still readable!

// BEST (shows key):
{
  translate("products.title");
}
// Translation missing → Shows "products.title" ⚠️
// Developer knows what's missing!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Resilience** - Always shows something
- ✅ **Development** - Works without i18n provider
- ✅ **Migration** - Gradual translation addition
- ✅ **User Experience** - Never shows blank/error

---

### 2.5 Memoization Pattern - Performance Optimization

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: Phone Number Memory

```
Calling Friends:

WITHOUT Memory (Lookup every time):
→ Want to call John
→ Look up phone book
→ Find John's number
→ Dial
→ Next day: Same process! ❌
→ Wasteful!

WITH Memory (Remember):
→ First time: Look up John
→ Remember: John = 555-1234
→ Next time: Use memory ✅
→ No lookup!

useMemo = Phone number memory!
→ First render: Create function
→ Next renders: Reuse same function ✅
```

**Memoization Pattern** = Cache computed values

#### Implementation:

```typescript
// From useTranslate.ts (lines 14-37)

export const useTranslate = () => {
  const { i18nProvider } = useContext(I18nContext);

  const fn = useMemo(() => {
    // ↑ useMemo: Only create function once!

    function translate(key: string, options?: any, defaultMessage?: string) {
      return (
        i18nProvider?.translate(key, options, defaultMessage) ??
        defaultMessage ??
        key
      );
    }

    return translate;
  }, [i18nProvider]);
  // ↑ Only recreate if i18nProvider changes

  return fn;
};

// Why memoize?
// - translate function is stable across renders
// - Can be used in dependency arrays safely
// - Prevents unnecessary re-renders
```

#### Performance Impact:

```typescript
// WITHOUT Memoization (bad):
export const useTranslate = () => {
  const { i18nProvider } = useContext(I18nContext);

  // New function every render! ❌
  function translate(key, options, defaultMessage) {
    return (
      i18nProvider?.translate(key, options, defaultMessage) ??
      defaultMessage ??
      key
    );
  }

  return translate;
};

function ProductList() {
  const translate = useTranslate();

  useEffect(() => {
    console.log("Translate changed!");
  }, [translate]); // ← Runs EVERY render! ❌
  // Because translate is new function every time!
}

// WITH Memoization (good):
export const useTranslate = () => {
  const { i18nProvider } = useContext(I18nContext);

  const fn = useMemo(() => {
    function translate(key, options, defaultMessage) {
      return (
        i18nProvider?.translate(key, options, defaultMessage) ??
        defaultMessage ??
        key
      );
    }
    return translate;
  }, [i18nProvider]);

  return fn;
};

function ProductList() {
  const translate = useTranslate();

  useEffect(() => {
    console.log("Translate changed!");
  }, [translate]); // ← Runs only when provider changes! ✅
  // Same function reference across renders!
}
```

#### Real Example - Form Validation:

```tsx
function ProductForm() {
  const translate = useTranslate();

  const validate = useMemo(
    () => ({
      title: {
        required: translate("validation.required"),
        minLength: translate("validation.minLength", { min: 3 }),
      },
      price: {
        required: translate("validation.required"),
        positive: translate("validation.positive"),
      },
    }),
    [translate], // ← Stable dependency! ✅
  );

  return <Form validate={validate} />;
  // ↑ validate object only recreates when translations change
  // ↑ Form doesn't re-render unnecessarily
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Prevents unnecessary re-renders
- ✅ **Stability** - Safe in dependency arrays
- ✅ **Predictable** - Same reference across renders
- ✅ **Optimized** - React can bail out of updates

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường | Giải quyết vấn đề gì     | Trong I18n Hooks                  |
| --------------- | ---------------- | ------------------------ | --------------------------------- |
| **Context**     | Power adapter    | Dependency injection     | I18nContext provides i18nProvider |
| **Adapter**     | USB-C adapter    | Unified interface        | Works with any i18n library       |
| **Facade**      | Hotel concierge  | Simplified interface     | useTranslation combines 3 hooks   |
| **Fallback**    | Water supply     | Graceful degradation     | Translation → Default → Key       |
| **Memoization** | Phone memory     | Performance optimization | Stable function references        |

---

## 3. KEY FEATURES

### 3.1 Four Hooks for Different Needs

```typescript
// Hook 1: useTranslate - Translate text
const translate = useTranslate();
translate("products.title"); // "Products"

// Hook 2: useGetLocale - Get current language
const getLocale = useGetLocale();
getLocale(); // "en"

// Hook 3: useSetLocale - Change language
const changeLocale = useSetLocale();
changeLocale("es"); // Change to Spanish

// Hook 4: useTranslation - All in one
const { translate, getLocale, changeLocale } = useTranslation();
```

### 3.2 Flexible Translation API

```typescript
const translate = useTranslate();

// Simple translation
translate("products.title");
// → "Products"

// With interpolation
translate("welcome.message", { name: "John" });
// → "Welcome, John!"

// With default message
translate("new.key", "Default Text");
// → "Default Text" (if translation missing)

// With options and default
translate("items.count", { count: 5 }, "5 items");
// → "5 items" (with interpolation)
```

### 3.3 Works Without Provider

```typescript
// No i18nProvider? Still works!
const translate = useTranslate();

translate("products.title", "Products");
// → Returns "Products" (default) ✅
// No error! Graceful degradation!
```

### 3.4 Library Agnostic

```typescript
// Works with i18next
import i18next from "i18next";

const i18nProvider = {
  translate: (key, options) => i18next.t(key, options),
  changeLocale: (locale) => i18next.changeLanguage(locale),
  getLocale: () => i18next.language,
};

// Works with react-intl
import { useIntl } from "react-intl";

const i18nProvider = {
  translate: (key, options) => {
    const intl = useIntl();
    return intl.formatMessage({ id: key }, options);
  },
  // ...
};

// Works with custom implementation
const translations = { en: {}, es: {} };
let locale = "en";

const i18nProvider = {
  translate: (key) => translations[locale][key] || key,
  changeLocale: (newLocale) => {
    locale = newLocale;
  },
  getLocale: () => locale,
};
```

---

## 4. COMMON USE CASES

### 4.1 Basic Translation

```tsx
function ProductList() {
  const translate = useTranslate();

  return (
    <div>
      <h1>{translate("products.title")}</h1>
      <p>{translate("products.subtitle")}</p>
    </div>
  );
}
```

### 4.2 Language Switcher

```tsx
function LanguageSwitcher() {
  const { getLocale, changeLocale } = useTranslation();

  const currentLocale = getLocale();

  return (
    <select
      value={currentLocale}
      onChange={(e) => changeLocale(e.target.value)}
    >
      <option value="en">English</option>
      <option value="es">Español</option>
      <option value="fr">Français</option>
      <option value="de">Deutsch</option>
    </select>
  );
}
```

### 4.3 Translation with Interpolation

```tsx
function WelcomeBanner() {
  const translate = useTranslate();
  const user = useGetIdentity();

  return (
    <div>
      {translate("welcome.greeting", { name: user.name })}
      {/* Translation: "Welcome, {{name}}!" */}
      {/* Result: "Welcome, John!" */}
    </div>
  );
}
```

### 4.4 Pluralization

```tsx
function ItemCount({ count }) {
  const translate = useTranslate();

  return (
    <div>
      {translate("items.count", { count })}
      {/* i18next handles pluralization:
          - count: 0 → "No items"
          - count: 1 → "1 item"
          - count: 5 → "5 items" */}
    </div>
  );
}
```

### 4.5 Form Validation Messages

```tsx
function ProductForm() {
  const translate = useTranslate();

  const validate = {
    title: {
      required: translate("validation.required", "This field is required"),
      minLength: translate(
        "validation.minLength",
        { min: 3 },
        "At least 3 characters",
      ),
    },
    price: {
      required: translate("validation.required"),
      positive: translate("validation.positive", "Must be positive number"),
    },
  };

  return <Form validate={validate} />;
}
```

### 4.6 Date/Time Formatting

```tsx
function PostMeta({ createdAt }) {
  const translate = useTranslate();
  const locale = useGetLocale()();

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(createdAt));

  return (
    <div>
      {translate("post.createdAt")}: {formattedDate}
      {/* en: "Created at: January 1, 2024 at 10:00 AM"
          es: "Creado el: 1 de enero de 2024 a las 10:00" */}
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Separate Hooks Instead of One?

**Answer:** Flexibility and tree-shaking

```
Single hook (rejected):
→ Always returns all 3 functions
→ Can't tree-shake unused functions
→ Less flexible

Separate hooks (chosen):
→ Import only what you need
→ Better tree-shaking
→ More flexible
→ + useTranslation facade for convenience
```

### 5.2 Why useCallback in useGetLocale/useSetLocale?

**Answer:** Stable function references

```typescript
// Without useCallback:
export const useGetLocale = () => {
  const { i18nProvider } = useContext(I18nContext);
  return () => i18nProvider.getLocale(); // ❌ New function every render
};

// With useCallback:
export const useGetLocale = () => {
  const { i18nProvider } = useContext(I18nContext);
  return useCallback(() => i18nProvider.getLocale(), []); // ✅ Stable reference
};
```

### 5.3 Why useMemo in useTranslate?

**Answer:** Overloaded function signatures

```typescript
// useTranslate has 2 signatures:
function translate(key: string, options?: any, defaultMessage?: string): string;
function translate(key: string, defaultMessage?: string): string;

// Must wrap in useMemo to maintain stable reference
// while supporting both signatures
```

### 5.4 Why Fallback to Key?

**Answer:** Developer experience

```
Options:
1. Throw error → Breaks app ❌
2. Return empty string → Silent failure ❌
3. Return key → Shows missing translation ✅

Showing key helps developers:
→ See what's missing
→ Add translations incrementally
→ Debug translation issues
```

### 5.5 Why No Built-in I18n Library?

**Answer:** Flexibility and bundle size

```
If Refine included i18next:
→ Forces all users to download it
→ Limited to one library
→ Larger bundle size

Provider pattern:
→ Users choose their library
→ Or use custom implementation
→ Smaller bundle (only what you need)
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting to Provide i18nProvider

```typescript
// ❌ WRONG - No provider
<Refine>
  <App />
</Refine>;

function Component() {
  const getLocale = useGetLocale();
  getLocale(); // ← Error! No provider!
}

// ✅ CORRECT - With provider
<Refine
  i18nProvider={{
    translate: (key) => key,
    changeLocale: (locale) => Promise.resolve(),
    getLocale: () => "en",
  }}
>
  <App />
</Refine>;
```

### 6.2 Not Memoizing Validation Objects

```typescript
// ❌ WRONG - New object every render
function Form() {
  const translate = useTranslate();

  const validate = {
    // New object every render!
    title: { required: translate("validation.required") },
  };

  return <FormComponent validate={validate} />;
  // ← FormComponent re-renders unnecessarily!
}

// ✅ CORRECT - Memoized
function Form() {
  const translate = useTranslate();

  const validate = useMemo(
    () => ({
      title: { required: translate("validation.required") },
    }),
    [translate],
  );

  return <FormComponent validate={validate} />;
}
```

### 6.3 Calling changeLocale in Render

```typescript
// ❌ WRONG - Infinite loop!
function Component() {
  const changeLocale = useSetLocale();

  changeLocale("es"); // ← Calls in render → Re-render → Call again! ❌

  return <div>Hello</div>;
}

// ✅ CORRECT - In event handler
function Component() {
  const changeLocale = useSetLocale();

  const handleClick = () => {
    changeLocale("es"); // ← Safe! Only on click
  };

  return <button onClick={handleClick}>Español</button>;
}
```

### 6.4 Not Providing Default Messages

```typescript
// ❌ BAD - No fallback
translate("new.unfinished.key");
// → Shows "new.unfinished.key" (confusing for users)

// ✅ GOOD - With fallback
translate("new.unfinished.key", "Work in Progress");
// → Shows "Work in Progress" (readable!)
```

### 6.5 Hardcoded Strings

```typescript
// ❌ WRONG - Hardcoded
function Header() {
  return <h1>Products</h1>; // ← Not translatable!
}

// ✅ CORRECT - Translatable
function Header() {
  const translate = useTranslate();
  return <h1>{translate("products.title", "Products")}</h1>;
}
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Memoization is Critical

```
Without memoization:
→ New function every render
→ Dependencies change constantly
→ Unnecessary re-renders
→ Poor performance

With memoization:
→ Stable function reference
→ Dependencies only change when needed
→ Minimal re-renders
→ Good performance
```

### 7.2 Context Changes Trigger Re-renders

```typescript
// When i18nProvider changes (locale switch):
// → All components using i18n hooks re-render
// → This is expected and necessary
// → Translations need to update!

// Optimization: Only use hooks where needed
function ProductList() {
  // ✅ Uses translation
  const translate = useTranslate();
  return <h1>{translate("products.title")}</h1>;
}

function ProductImage({ src }) {
  // ✅ Doesn't use translation - won't re-render on locale change
  return <img src={src} />;
}
```

---

## 8. TESTING

```typescript
// From useTranslate.spec.tsx

describe("useTranslate", () => {
  it("works without i18n provider", () => {
    const { result } = renderHook(() => useTranslate());

    expect(result.current("key", "default")).toBe("default");
  });

  it("works with i18nprovider", () => {
    const { result } = renderHook(() => useTranslate(), {
      wrapper: ({ children }) => (
        <Refine
          i18nProvider={{
            translate: () => "translated",
            changeLocale: () => Promise.resolve(),
            getLocale: () => "en",
          }}
        >
          {children}
        </Refine>
      ),
    });

    expect(result.current("key")).toBe("translated");
  });

  it("works with interpolation", () => {
    const { result } = renderHook(() => useTranslate(), {
      wrapper: ({ children }) => (
        <Refine
          i18nProvider={{
            translate: (key, options) => `Hello ${options.name}`,
            changeLocale: () => Promise.resolve(),
            getLocale: () => "en",
          }}
        >
          {children}
        </Refine>
      ),
    });

    expect(result.current("greeting", { name: "John" })).toBe("Hello John");
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Context**: Dependency injection via I18nContext
- ✅ **Adapter**: Works with any i18n library
- ✅ **Facade**: useTranslation combines 3 hooks
- ✅ **Fallback**: Translation → Default → Key
- ✅ **Memoization**: Stable function references

### Key Features

1. **Four Hooks** - useTranslate, useGetLocale, useSetLocale, useTranslation
2. **Library Agnostic** - Works with i18next, react-intl, custom
3. **Graceful Fallback** - Always shows something
4. **Flexible API** - Multiple signatures for translate
5. **Performance Optimized** - Memoized functions

### Khi nào dùng I18n Hooks?

✅ **Nên dùng:**

- Multi-language applications
- Need to translate UI text
- Support international users
- Runtime language switching
- Any app with i18n requirements

❌ **Không dùng:**

- Single language only
- Static content
- No translation needs

### Remember

✅ **4 hooks** - Small and focused
🔌 **Context** - Dependency injection
🔄 **Adapter** - Library agnostic
🎭 **Facade** - useTranslation convenience
🛡️ **Fallback** - Always shows something
🧠 **Memoization** - Performance optimized

---

> 📚 **Best Practice**: Always provide **default messages** as fallback. Use **useTranslation** when you need all three functions. **Memoize** validation objects. Use translation **keys as fallback** to spot missing translations. Consider **bundle size** when choosing i18n library!
