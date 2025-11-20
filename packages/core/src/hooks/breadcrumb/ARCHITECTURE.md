# Kiến trúc và Design Patterns của useBreadcrumb Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │          NAVIGATION SYSTEM                       │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  useGo ────────→ Navigate to routes             │  │
│  │  useNavigation → Get navigation helpers          │  │
│  │  useBreadcrumb → Build breadcrumb trail ✅       │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  ["Home", "Products", "Edit #123"]               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Navigation Indicator** - Hiển thị vị trí hiện tại trong app
2. **Hierarchical Path Builder** - Build cấu trúc parent → child → action
3. **Localization Support** - Translate breadcrumb labels (i18n)
4. **Link Generator** - Generate hrefs cho mỗi breadcrumb item

### 1.2 Complete Breadcrumb Generation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   BREADCRUMB GENERATION FLOW                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User navigates to a page                            │
│  URL: /products/edit/123                                     │
│  → Router parses: resource="products", action="edit", id=123 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: useBreadcrumb hook called                           │
│  const { breadcrumbs } = useBreadcrumb();                    │
│  → Extracts current resource, action, params                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check resource hierarchy (parent chain)             │
│  products.meta.parent = "dashboard"                          │
│  → Recursively build parent chain                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Build breadcrumb items                              │
│  [                                                           │
│    { label: "Dashboard", href: "/", icon: <HomeIcon/> },    │
│    { label: "Products", href: "/products" },                │
│    { label: "Edit" } // current page, no href               │
│  ]                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Translate labels (i18n)                             │
│  translate("products.products") → "Sản phẩm"                 │
│  translate("actions.edit") → "Chỉnh sửa"                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Render in UI                                        │
│  <Breadcrumb>                                                │
│    Dashboard > Sản phẩm > Chỉnh sửa                          │
│  </Breadcrumb>                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Hook này là 114 dòng** - nhỏ gọn nhưng sử dụng nhiều patterns thông minh!

---

### 2.1 Composite Pattern (Recursive Tree Building)

#### 🌳 VÍ DỤ ĐỜI THƯỜNG: Cây gia phả

```
Imagine a family tree:

Great Grandpa (root)
    │
    ├─ Grandpa (parent)
    │    │
    │    └─ Dad (parent)
    │         │
    │         └─ You (current)

To get YOUR full lineage:
1. Start from YOU
2. Find YOUR parent (Dad)
3. Find DAD's parent (Grandpa)
4. Find GRANDPA's parent (Great Grandpa)
5. Build chain: Great Grandpa → Grandpa → Dad → You
```

**Composite Pattern** = Build tree structure recursively

#### ❌ KHÔNG có Composite Pattern:

```typescript
// BAD - Manual parent finding

const breadcrumbs = [];

// Hard-code hierarchy (not scalable!)
if (resource === "products") {
  breadcrumbs.push({ label: "Home", href: "/" });
  breadcrumbs.push({ label: "Products", href: "/products" });
}

if (resource === "product-variants") {
  breadcrumbs.push({ label: "Home", href: "/" });
  breadcrumbs.push({ label: "Products", href: "/products" });
  breadcrumbs.push({ label: "Variants", href: "/variants" });
}

// Vấn đề:
// - Phải hard-code mọi hierarchy
// - Không scale (100 resources = 100 if statements!)
// - Thay đổi cấu trúc = sửa code
```

#### ✅ CÓ Composite Pattern:

```typescript
// GOOD - Recursive parent finding

const addBreadcrumb = (resource) => {
  // RECURSIVE BASE CASE: nếu có parent, đệ quy lên
  if (resource.meta?.parent) {
    addBreadcrumb(resource.meta.parent); // ← Recursion!
  }

  // Add current resource to breadcrumbs
  breadcrumbs.push({
    label: resource.name,
    href: resource.route,
  });
};

// Start recursion from current resource
addBreadcrumb(currentResource);

// Example flow for "product-variants":
// 1. addBreadcrumb("product-variants")
//    → Has parent "products", call addBreadcrumb("products")
// 2.   addBreadcrumb("products")
//      → Has parent "dashboard", call addBreadcrumb("dashboard")
// 3.     addBreadcrumb("dashboard")
//        → No parent, add "Dashboard" to breadcrumbs
//        return ← back to products
// 4.   Add "Products" to breadcrumbs
//      return ← back to product-variants
// 5. Add "Product Variants" to breadcrumbs
//
// Result: ["Dashboard", "Products", "Product Variants"] ✅
```

#### Real Code Example:

```typescript
// From useBreadcrumb hook (lines 48-85)

const addBreadcrumb = (parentName: string | IResourceItem) => {
  const parentResource =
    typeof parentName === "string"
      ? pickResource(parentName, resources)
      : parentName;

  if (parentResource) {
    const grandParentName = parentResource?.meta?.parent;

    // RECURSIVE CALL - Find grandparent first!
    if (grandParentName) {
      addBreadcrumb(grandParentName); // ← Recursion
    }

    // Then add current parent
    breadcrumbs.push({
      label: parentResource.meta?.label ??
             translate(`${parentResource.name}.${parentResource.name}`),
      href: /* generate route */,
      icon: parentResource.meta?.icon,
    });
  }
};

// Start from current resource
addBreadcrumb(resource);
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Scalable** - Works with ANY hierarchy depth
- ✅ **Dynamic** - No hard-coding
- ✅ **Maintainable** - Change hierarchy = change meta only
- ✅ **Elegant** - Short code, handles complex trees

---

### 2.2 Builder Pattern - Pattern "Xây Dựng Từng Bước"

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Xây nhà

```
Building a house:

❌ BAD - Build everything at once:
→ Too complex!
→ Hard to customize

✅ GOOD - Build step by step:
1. Foundation (base)
2. Walls (structure)
3. Roof (protection)
4. Interior (details)

→ Each step adds to the result
→ Easy to customize each step
```

**Builder Pattern** = Construct complex object step by step

#### ❌ KHÔNG có Builder:

```typescript
// BAD - Create entire breadcrumb array at once

const breadcrumbs = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  action !== "list" ? { label: "Edit" } : null,
].filter(Boolean);

// Vấn đề:
// - Phức tạp, khó đọc
// - Không linh hoạt (hard to add conditions)
// - Khó debug
```

#### ✅ CÓ Builder Pattern:

```typescript
// GOOD - Build step by step

const breadcrumbs: BreadcrumbsType[] = [];

// Step 1: Add parent resources
if (resource.meta?.parent) {
  addBreadcrumb(resource.meta.parent);
}

// Step 2: Add current resource
breadcrumbs.push({
  label: resource.name,
  href: resource.route,
});

// Step 3: Add action (if not list)
if (action && action !== "list") {
  breadcrumbs.push({
    label: translate(`actions.${action}`),
  });
}

return { breadcrumbs };
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Readable** - Clear step-by-step logic
- ✅ **Flexible** - Easy to add/remove steps
- ✅ **Testable** - Test each step independently

---

### 2.3 Strategy Pattern - Pattern "Chiến Lược Linh Hoạt"

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Thanh toán

```
Shopping cart payment:

Different payment strategies:
- Credit Card → CardPaymentStrategy
- PayPal → PayPalStrategy
- Cash → CashStrategy

Same interface, different implementations!
```

**Strategy Pattern** = Select algorithm at runtime

#### Implementation in useBreadcrumb:

```typescript
// STRATEGY 1: Label from resource meta
const labelFromMeta = parentResource.meta?.label;

// STRATEGY 2: Label from i18n translation
const labelFromI18n = translate(
  `${parentResource.name}.${parentResource.name}`,
  fallback
);

// STRATEGY 3: Label from humanizer (fallback)
const labelFromHumanizer = textTransformers.humanize(
  parentResource.name
);

// Select strategy (priority order):
const label =
  labelFromMeta ??           // Strategy 1 (highest priority)
  labelFromI18n ??           // Strategy 2
  labelFromHumanizer;        // Strategy 3 (lowest priority)

breadcrumbs.push({ label, ... });
```

#### Examples:

```typescript
// Resource: "productCategories"

// Strategy 1 (meta.label):
{
  name: "productCategories",
  meta: { label: "Danh mục SP" } // ← Used!
}
→ Label: "Danh mục SP" ✅

// Strategy 2 (i18n):
{
  name: "productCategories"
  // No meta.label
}
// i18n file has: "productCategories.productCategories": "Product Categories"
→ Label: "Product Categories" ✅

// Strategy 3 (humanizer fallback):
{
  name: "productCategories"
  // No meta.label, no i18n
}
→ Label: "Product Categories" (humanized from "productCategories") ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Multiple ways to provide labels
- ✅ **Graceful degradation** - Always has fallback
- ✅ **i18n support** - Multi-language friendly

---

### 2.4 Memoization Pattern (via React Hooks)

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Cache search results

```
Google Search:

You search "React hooks"
→ Google queries database (slow)
→ Shows results
→ Caches results

You search "React hooks" again
→ Google returns cached results (fast!)
→ No need to query database again
```

**Memoization** = Cache expensive computations

#### Implementation:

```typescript
const { breadcrumbs } = useBreadcrumb();

// Component re-renders when:
// - resource changes → Rebuild breadcrumbs ✅
// - action changes → Rebuild breadcrumbs ✅
// - random state changes → Use cached breadcrumbs ✅ (via React)

// React automatically caches between renders if deps don't change
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Avoid rebuilding on every render
- ✅ **Efficiency** - Only compute when needed

---

### 2.5 Null Object Pattern - Pattern "Đối Tượng Rỗng An Toàn"

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Empty shopping cart

```
Shopping Cart:

❌ BAD - Return null:
const cart = getCart();
if (cart) {
  cart.items.forEach(...) // Có thể crash!
}

✅ GOOD - Return empty cart:
const cart = getCart() ?? { items: [] };
cart.items.forEach(...) // Always safe! ✅
```

**Null Object Pattern** = Return safe empty object instead of null

#### Implementation:

```typescript
const breadcrumbs: BreadcrumbsType[] = [];

// Early return with EMPTY array (not null!)
if (!resource?.name) {
  return { breadcrumbs }; // ← Safe empty array
}

// Component can ALWAYS use breadcrumbs:
breadcrumbs.map((crumb) => <Link>{crumb.label}</Link>);
// No need to check if breadcrumbs is null!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **No crashes** - Always returns valid array
- ✅ **No null checks** - Component code simpler
- ✅ **Consistent API** - Always same return type

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường  | Giải quyết vấn đề gì         | Trong useBreadcrumb                   |
| --------------- | ----------------- | ---------------------------- | ------------------------------------- |
| **Composite**   | Cây gia phả       | Build hierarchical structure | Recursive parent finding              |
| **Builder**     | Xây nhà từng bước | Construct complex object     | Build breadcrumbs step-by-step        |
| **Strategy**    | Payment methods   | Select algorithm at runtime  | Label resolution (meta/i18n/humanize) |
| **Memoization** | Google cache      | Avoid redundant computation  | React caching                         |
| **Null Object** | Empty cart        | Avoid null checks            | Return [] instead of null             |

---

## 3. KEY FEATURES

### 3.1 Automatic Parent Chain Resolution

```typescript
// Resource definition:
const resources = [
  { name: "dashboard" },
  {
    name: "products",
    meta: { parent: "dashboard" },
  },
  {
    name: "product-variants",
    meta: { parent: "products" },
  },
];

// URL: /product-variants/edit/123
const { breadcrumbs } = useBreadcrumb();

// Result:
// [
//   { label: "Dashboard", href: "/" },
//   { label: "Products", href: "/products" },
//   { label: "Product Variants", href: "/product-variants" },
//   { label: "Edit" } // current page
// ]
```

### 3.2 Multi-Strategy Label Resolution

```typescript
// Priority order:
// 1. meta.label (highest priority)
// 2. i18n translation
// 3. humanizer (fallback)

const resource = {
  name: "productCategories",
  meta: {
    label: "Categories", // ← Used first
  },
};

// If no meta.label:
// translate("productCategories.productCategories")
// → "Product Categories" (from i18n file)

// If no i18n:
// textTransformers.humanize("productCategories")
// → "Product Categories" (auto-generated)
```

### 3.3 Icon Support

```typescript
import { ShoppingCartIcon } from "icons";

const resource = {
  name: "products",
  meta: {
    icon: <ShoppingCartIcon />,
  },
};

const { breadcrumbs } = useBreadcrumb();
// breadcrumbs[0].icon = <ShoppingCartIcon />

// Render:
// <Breadcrumb>
//   <ShoppingCartIcon /> Products
// </Breadcrumb>
```

### 3.4 i18n Support with Warnings

```typescript
// Missing translation warning:
// If i18nProvider exists but translation missing:
translate("actions.edit") === "actions.edit"
→ Shows warning in console:
   "[useBreadcrumb]: Missing translation key 'actions.edit'"

// Fallback to button translation:
translate("buttons.edit") → "Edit"
```

---

## 4. COMMON USE CASES

### 4.1 Basic Breadcrumb

```typescript
function ProductEditPage() {
  const { breadcrumbs } = useBreadcrumb();

  return (
    <>
      <Breadcrumb items={breadcrumbs} />
      <ProductForm />
    </>
  );
}

// Renders: Home > Products > Edit
```

### 4.2 Nested Resources

```typescript
// Define hierarchy:
const resources = [
  { name: "companies" },
  {
    name: "departments",
    meta: { parent: "companies" },
  },
  {
    name: "employees",
    meta: { parent: "departments" },
  },
];

// URL: /employees/edit/42
const { breadcrumbs } = useBreadcrumb();
// → Companies > Departments > Employees > Edit
```

### 4.3 Custom Meta Params

```typescript
// Dynamic route params:
const { breadcrumbs } = useBreadcrumb({
  meta: {
    companyId: "123",
    departmentId: "456",
  },
});

// These params are used in route composition:
// /companies/123/departments/456/employees
```

### 4.4 Custom Breadcrumb Component

```typescript
import { useBreadcrumb } from "@refinedev/core";

function CustomBreadcrumb() {
  const { breadcrumbs } = useBreadcrumb();

  return (
    <nav>
      {breadcrumbs.map((crumb, index) => (
        <span key={index}>
          {crumb.icon}
          {crumb.href ? (
            <a href={crumb.href}>{crumb.label}</a>
          ) : (
            <span>{crumb.label}</span>
          )}
          {index < breadcrumbs.length - 1 && " > "}
        </span>
      ))}
    </nav>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Recursive Parent Resolution?

**Problem:** Flat iteration cannot handle arbitrary depth hierarchies.

**Solution:** Recursion naturally handles trees of any depth.

```typescript
// Handles ANY depth:
A → B → C → D → E → F → ... → Z
```

### 5.2 Why Builder Pattern over Declarative Array?

**Reason:** Step-by-step construction is more readable and debuggable than complex array expressions.

### 5.3 Why Multi-Strategy Label Resolution?

**Reason:** Different use cases need different label sources:

- Quick prototypes → humanizer fallback
- Production apps → i18n translations
- Custom branding → meta.label override

---

## 6. INTEGRATION WITH REFINE

### 6.1 Auto-Detection from Router

```typescript
// URL: /products/edit/123
const parsed = useParsed();
// → { resource: "products", action: "edit", id: "123" }

const { resource, action } = useResourceParams();
// → Automatically detected from URL!

const { breadcrumbs } = useBreadcrumb();
// → Built from detected resource + action
```

### 6.2 Works with Any Router

```typescript
// React Router, Next.js, Remix, etc.
// useBreadcrumb adapts to router via routerProvider
```

---

## 7. KẾT LUẬN

### Design Patterns Summary

- ✅ **Composite**: Recursive tree traversal
- ✅ **Builder**: Step-by-step construction
- ✅ **Strategy**: Multi-source label resolution
- ✅ **Memoization**: Performance optimization
- ✅ **Null Object**: Safe empty returns

### Key Features

1. **Automatic** - Auto-detects from router
2. **Hierarchical** - Supports nested resources
3. **i18n-ready** - Multi-language support
4. **Flexible** - Custom labels, icons, routes
5. **Type-safe** - Full TypeScript support

### Khi nào dùng useBreadcrumb?

✅ **Nên dùng:**

- Admin dashboards
- Multi-level navigation
- E-commerce category pages
- CMS systems
- Any hierarchical UI

❌ **Không dùng:**

- Flat navigation (use menu instead)
- Single-page apps (no hierarchy)

### Remember

✅ **Automatic** - Just call hook, get breadcrumbs
🌳 **Recursive** - Handles any depth
🌍 **i18n** - Translation-ready
🎨 **Customizable** - Icons, labels, routes
⚡ **Fast** - Cached by React
