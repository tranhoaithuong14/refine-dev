# Kiến trúc và Design Patterns của useMenu Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │                  UI SYSTEM                        │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useMenu ✅ (THIS HOOK)                          │  │
│  │    → Generates navigation menu from resources    │  │
│  │         │                                         │  │
│  │         ├──→ TREE STRUCTURE (Composite Pattern): │  │
│  │         │     - Nested menus (parent/children)   │  │
│  │         │     - Recursive processing             │  │
│  │         │                                         │  │
│  │         ├──→ ROUTE GENERATION:                   │  │
│  │         │     - getToPath() for each resource    │  │
│  │         │     - Handles parameters               │  │
│  │         │                                         │  │
│  │         ├──→ ACTIVE STATE:                       │  │
│  │         │     - selectedKey (current page)       │  │
│  │         │     - defaultOpenKeys (parent chain)   │  │
│  │         │                                         │  │
│  │         └──→ FILTERING:                          │  │
│  │               - Hide items with meta.hide        │  │
│  │               - Hide routes with missing params  │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Automatically generate navigation menu structure from resource definitions**

### 1.2 Complete Flow - Resources to Menu

```
┌──────────────────────────────────────────────────────────────┐
│              INPUT: Resources Configuration                   │
└──────────────────────────────────────────────────────────────┘

<Refine
  resources={[
    { name: "posts", list: "/posts", icon: <FileIcon /> },
    { name: "categories", list: "/categories", parentName: "posts" },
    { name: "users", list: "/users/:role", meta: { hide: true } }
  ]}
/>

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│         STEP 1: Create Tree Structure (Composite)             │
└──────────────────────────────────────────────────────────────┘

createTree(resources) →

[
  {
    name: "posts",
    children: [
      { name: "categories", children: [] }
    ]
  },
  { name: "users", children: [] }
]

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│        STEP 2: Process Tree Recursively (Visitor)             │
└──────────────────────────────────────────────────────────────┘

prepare(items) → For each item:
  1. Check if hidden (meta.hide) → Skip ❌
  2. Generate route with getToPath()
  3. Check if route has missing params → Skip ❌
  4. Add label, icon
  5. Process children recursively

           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│                  OUTPUT: Menu Items                           │
└──────────────────────────────────────────────────────────────┘

menuItems = [
  {
    key: "posts",
    label: "Posts",
    icon: <FileIcon />,
    route: "/posts",
    children: [
      {
        key: "posts/categories",
        label: "Categories",
        route: "/categories"
      }
    ]
  }
  // "users" SKIPPED (has :role param but no value provided)
]

selectedKey = "posts" (current page)
defaultOpenKeys = ["posts"] (auto-expand parent)
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useMenu.tsx: 145 dòng** - Menu generation system!

---

### 2.1 Composite Pattern - Tree Structure for Nested Menus

#### 🌳 VÍ DỤ ĐỜI THƯỜNG: Folder Structure

```
File Explorer:

📁 Documents (Folder - can contain files)
  ├─ 📁 Work (Folder - can contain files)
  │   ├─ report.pdf (File - cannot contain anything)
  │   └─ presentation.pptx (File)
  └─ 📁 Personal (Folder)
      └─ photo.jpg (File)

Composite Pattern:
- Folder and File have same interface (open, delete)
- Folder CAN contain children (Composite)
- File CANNOT contain children (Leaf)
- Treat both uniformly!

useMenu:
- Menu Item (can have children)
  ├─ Sub Menu Item (can have children)
  └─ Leaf Menu Item (no children)
```

**Composite Pattern** = Compose objects into tree structures. Treat individual and composite objects uniformly.

#### Implementation:

```typescript
export type TreeMenuItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  route?: string;
  children: TreeMenuItem[]; // ← Recursive! Can contain itself!
};

// Example:
const menuItems: TreeMenuItem[] = [
  {
    key: "products",
    label: "Products",
    route: "/products",
    children: [
      // ← Nested!
      {
        key: "products/categories",
        label: "Categories",
        route: "/products/categories",
        children: [], // ← Leaf (no children)
      },
    ],
  },
];
```

#### Real Example - Nested Resources:

```tsx
<Refine
  resources={[
    {
      name: "products",
      list: "/products",
      meta: { icon: <BoxIcon /> }
    },
    {
      name: "categories",
      list: "/categories",
      parentName: "products",  // ← Nested under "products"!
      meta: { icon: <TagIcon /> }
    },
    {
      name: "brands",
      list: "/brands",
      parentName: "products",  // ← Also nested!
      meta: { icon: <BrandIcon /> }
    }
  ]}
/>

// useMenu() generates:
{
  key: "products",
  label: "Products",
  icon: <BoxIcon />,
  children: [
    { key: "products/categories", label: "Categories", icon: <TagIcon /> },
    { key: "products/brands", label: "Brands", icon: <BrandIcon /> }
  ]
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Hierarchy** - Organize menus by category/domain
- ✅ **Scalability** - Unlimited nesting levels
- ✅ **Uniform** - Same code handles parent and leaf items
- ✅ **UX** - Collapsible sections for better navigation

---

### 2.2 Visitor Pattern - Recursive Tree Processing

#### 🚶 VÍ DỤ ĐỜI THƯỜNG: Security Guard Inspection

```
Shopping Mall Security:

Guard visits each store:
- Main Entrance
  → Visit Store A
    → Visit Stall A1 (inside Store A)
    → Visit Stall A2
  → Visit Store B

Visitor Pattern:
- "Visit" operation applied to each node
- Works recursively through tree

useMenu prepare():
- Visit each menu item
- Check if should be shown
- Visit children recursively
```

**Visitor Pattern** = Define new operation on elements without changing their classes. Process tree structure recursively.

#### Implementation:

```typescript
const prepare = (items: TreeMenuItem[]): TreeMenuItem[] => {
  return items.flatMap((item) => {
    // VISIT CHILDREN FIRST (Depth-first)
    const preparedNodes = prepare(item.children); // ← Recursive!

    // PROCESS CURRENT ITEM
    const newItem = prepareItem({
      ...item,
      children: preparedNodes,
    });

    // FILTER: Return empty array if should hide
    if (!newItem) return [];

    return [newItem];
  });
};
```

#### Visualization - Recursive Flow:

```
Input Tree:
┌─ products
│   ├─ categories
│   └─ brands
└─ users

Execution:
1. prepare([products, users])
2.   └─ prepare(products.children) → [categories, brands]
3.       └─ prepare(categories.children) → []  ← Leaf!
4.       └─ prepareItem(categories) → { label: "Categories", ... }
5.       └─ prepare(brands.children) → []  ← Leaf!
6.       └─ prepareItem(brands) → { label: "Brands", ... }
7.   └─ prepareItem(products) → { label: "Products", children: [...] }
8.   └─ prepare(users.children) → []
9.   └─ prepareItem(users) → { label: "Users", ... }
10. Result: [products (with nested), users]
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Recursive** - Handles any tree depth
- ✅ **Filtering** - Remove items at any level
- ✅ **Transformation** - Add routes, labels, icons
- ✅ **Bottom-up** - Process children first, then parent

---

### 2.3 Builder Pattern - Constructing Menu Items

#### 🏗️ VÍ DỤ ĐỜI THƯỜNG: Building a House

```
House Construction:

Step 1: Foundation (resource config)
Step 2: Add walls (route generation)
Step 3: Add roof (label translation)
Step 4: Add windows (icon)
Step 5: Paint (final touches)

useMenu prepareItem():
1. Start with resource
2. Generate route
3. Translate label
4. Add icon
5. Return complete menu item
```

**Builder Pattern** = Construct complex object step by step. Separate construction from representation.

#### Implementation:

```typescript
const prepareItem = (item: FlatTreeItem): TreeMenuItem | undefined => {
  // STEP 1: Check if hidden
  if (item?.meta?.hide) {
    return undefined;
  }

  // STEP 2: Generate route
  const route = item.list
    ? getToPath({
        resource: item,
        action: "list",
        meta
      })
    : undefined;

  // STEP 3: Check for missing params (e.g., /users/:role)
  if (
    hideOnMissingParameter &&
    route &&
    route.match(/(\\/|^):(.+?)(\\/|$){1}/)  // ← Regex for :param
  ) {
    return undefined;  // Skip if param missing!
  }

  // STEP 4: Build final item
  return {
    ...item,
    route,
    icon: item.meta?.icon,  // ← Add icon
    label:
      item?.meta?.label ??
      translate(  // ← Translate label
        `${item.name}.${item.name}`,
        getFriendlyName(item.name, "plural")
      )
  };
};
```

#### Real Example - Custom Labels:

```tsx
<Refine
  resources={[
    {
      name: "products",
      list: "/products",
      meta: {
        label: "Our Products",  // ← Custom label!
        icon: <BoxIcon />
      }
    },
    {
      name: "posts",
      list: "/posts/:categoryId",  // ← Has param!
      meta: { icon: <FileIcon /> }
    }
  ]}
/>

// prepareItem() for "products":
{
  key: "products",
  route: "/products",
  icon: <BoxIcon />,
  label: "Our Products"  ✅
}

// prepareItem() for "posts":
undefined  ❌ (route has :categoryId but no value provided)
// Won't appear in menu!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Step-by-step** - Clear construction process
- ✅ **Validation** - Filter invalid items early
- ✅ **Customization** - Labels, icons, routes
- ✅ **Safety** - Hide routes with missing params

---

### 2.4 State Pattern - Active Menu State

#### 🎯 VÍ DỤ ĐỜI THƯỜNG: Elevator Floor Indicator

```
Elevator:

Current Floor: highlighted in the panel
Floors you passed through: remembered

useMenu:
- selectedKey: Current page (highlighted)
- defaultOpenKeys: Parent chain (auto-expanded)
```

**State Pattern** = Track current state and provide appropriate UI feedback.

#### Implementation:

```typescript
// SELECTED KEY: Current page
const selectedKey = resource
  ? createResourceKey(resource, resources) // e.g., "posts"
  : cleanRoute ?? "";

// DEFAULT OPEN KEYS: Parent chain
const defaultOpenKeys = React.useMemo(() => {
  if (!resource) return [];

  let parent = getParentResource(resource, resources);
  const keys = [createResourceKey(resource, resources)];

  // Walk up the parent chain
  while (parent) {
    keys.push(createResourceKey(parent, resources));
    parent = getParentResource(parent, resources);
  }

  return keys; // ["categories", "products"] ← Current and all parents!
}, []);
```

#### Visualization - Parent Chain:

```
Current URL: /products/categories/123

Resource Tree:
📁 products
  └─ 📁 categories (← YOU ARE HERE)

defaultOpenKeys calculation:
1. Start: resource = "categories"
2. keys = ["categories"]
3. parent = "products"
4. keys.push("products") → ["categories", "products"]
5. parent = null (top level)
6. Return: ["categories", "products"]

Result: Both "products" and "categories" menu items are EXPANDED! ✅
```

#### Real Example - Nested Navigation:

```tsx
// Menu structure:
<Menu
  selectedKeys={[selectedKey]} // ← Highlight current
  defaultOpenKeys={defaultOpenKeys} // ← Auto-expand parents
  items={menuItems}
/>

// User visits: /products/categories/create
// → selectedKey = "products/categories"  ← Highlighted!
// → defaultOpenKeys = ["products/categories", "products"]  ← Both expanded!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **UX** - User knows where they are
- ✅ **Context** - Parent sections auto-expand
- ✅ **Navigation** - Easy to see menu hierarchy
- ✅ **Accessibility** - Clear active state

---

### 2.5 Template Method Pattern - Menu Item Creation Template

#### 📋 VÍ DỤ ĐỜI THƯỜNG: Coffee Making

```
Coffee Template:
1. Heat water
2. Add coffee grounds
3. ADD CUSTOMIZATION ← Variable
4. Pour
5. Serve

Espresso: Step 3 = Nothing
Latte: Step 3 = Add steamed milk
Cappuccino: Step 3 = Add foam

useMenu:
1. Get resource
2. Generate base structure
3. ADD CUSTOMIZATION (meta.label, meta.icon, etc.)
4. Return item
```

**Template Method Pattern** = Define skeleton of algorithm. Let subclasses override specific steps.

#### Implementation:

```typescript
// TEMPLATE: Standard flow for all menu items
const prepareItem = (item: FlatTreeItem): TreeMenuItem | undefined => {
  // STEP 1: Base validation (all items)
  if (item?.meta?.hide) return undefined;
  if (!item?.list && item.children.length === 0) return undefined;

  // STEP 2: Route generation (all items)
  const route = item.list ? getToPath(...) : undefined;

  // STEP 3: Parameter validation (all items)
  if (hideOnMissingParameter && route?.match(/:.+/)) return undefined;

  // STEP 4: CUSTOMIZATION (varies per item)
  return {
    ...item,
    route,
    icon: item.meta?.icon,  // ← Custom icon OR undefined
    label: item?.meta?.label ?? translate(...)  // ← Custom label OR auto-generated
  };
};
```

#### Customization Points:

```tsx
// Resource 1: Custom everything
{
  name: "products",
  list: "/products",
  meta: {
    label: "Our Products",  // ← Custom label
    icon: <BoxIcon />,       // ← Custom icon
    hide: false              // ← Show
  }
}

// Resource 2: Defaults
{
  name: "posts",
  list: "/posts"
  // No meta → Uses default label "Posts" and no icon
}

// Resource 3: Hidden
{
  name: "internal",
  list: "/internal",
  meta: { hide: true }  // ← Won't appear in menu
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistency** - All items follow same flow
- ✅ **Flexibility** - Override labels, icons per item
- ✅ **Maintainability** - Single place to update logic
- ✅ **Convention** - Defaults for common cases

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern             | Ví dụ đời thường    | Giải quyết vấn đề gì           | Trong useMenu                                      |
| ------------------- | ------------------- | ------------------------------ | -------------------------------------------------- |
| **Composite**       | Folder structure    | Tree of menus                  | Nested menu items with children                    |
| **Visitor**         | Security inspection | Process tree recursively       | `prepare()` walks tree, filters/transforms         |
| **Builder**         | House construction  | Build complex objects          | `prepareItem()` constructs menu items step-by-step |
| **State**           | Elevator indicator  | Track active state             | `selectedKey` + `defaultOpenKeys` for highlighting |
| **Template Method** | Coffee recipe       | Standardize with customization | Standard flow + custom labels/icons                |

---

## 3. KEY FEATURES

### 3.1 Automatic Tree Construction

```typescript
// Resources:
[
  { name: "products", list: "/products" },
  { name: "categories", parentName: "products" }
]

// useMenu automatically nests:
{
  key: "products",
  children: [
    { key: "products/categories" }
  ]
}
```

### 3.2 Route Generation with Missing Param Detection

```typescript
// Resource with param:
{ name: "users", list: "/users/:role" }

// If :role NOT provided in URL:
// → Menu item is HIDDEN! ❌

// If you want to show it anyway:
useMenu({ hideOnMissingParameter: false })
```

### 3.3 Parent Chain Auto-Expansion

```typescript
// Current page: /products/categories

defaultOpenKeys = ["products", "products/categories"];
// → Both "products" and "categories" sections expanded! ✅
```

### 3.4 Label Translation

```typescript
// Auto-translates using i18n:
translate("products.products", "Products");

// Or use custom:
meta: {
  label: "Our Products";
}
```

---

## 4. COMMON USE CASES

### 4.1 Basic Sidebar Menu

```tsx
import { useMenu } from "@refinedev/core";
import { Menu } from "antd";

function Sidebar() {
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();

  return (
    <Menu
      mode="inline"
      selectedKeys={[selectedKey]}
      defaultOpenKeys={defaultOpenKeys}
      items={menuItems}
    />
  );
}
```

### 4.2 Custom Menu with Icons

```tsx
<Refine
  resources={[
    {
      name: "dashboard",
      list: "/",
      meta: {
        label: "Dashboard",
        icon: <DashboardIcon />,
      },
    },
    {
      name: "products",
      list: "/products",
      meta: { icon: <BoxIcon /> },
    },
  ]}
/>

// useMenu() includes icons automatically! ✅
```

### 4.3 Nested Menu Categories

```tsx
<Refine
  resources={[
    { name: "sales", list: "/sales", meta: { icon: <ChartIcon /> } },
    { name: "orders", parentName: "sales", list: "/orders" },
    { name: "invoices", parentName: "sales", list: "/invoices" },

    { name: "settings", list: "/settings", meta: { icon: <SettingsIcon /> } },
    { name: "users", parentName: "settings", list: "/users" },
    { name: "roles", parentName: "settings", list: "/roles" }
  ]}
/>

// Menu structure:
📊 Sales
  ├─ Orders
  └─ Invoices
⚙️ Settings
  ├─ Users
  └─ Roles
```

### 4.4 Hide Specific Items

```tsx
<Refine
  resources={[
    { name: "posts", list: "/posts" },
    {
      name: "internal-logs",
      list: "/logs",
      meta: { hide: true }, // ← Won't appear in menu!
    },
  ]}
/>
```

### 4.5 Custom Menu Component

```tsx
function CustomMenu() {
  const { menuItems, selectedKey } = useMenu();

  return (
    <nav>
      {menuItems.map((item) => (
        <div key={item.key}>
          {item.icon}
          <Link to={item.route}>{item.label}</Link>
          {item.children.length > 0 && (
            <ul>
              {item.children.map((child) => (
                <li key={child.key}>
                  <Link to={child.route}>{child.label}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </nav>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Auto-Expand Parent Chain?

**Answer:** Contextual navigation UX

```
User visits: /products/categories/create

Without auto-expand:
📁 Products (CLOSED) ❌
  └─ Categories (HIDDEN!)
     └─ Create (CURRENT PAGE - BUT MENU LOOKS COLLAPSED!)

With auto-expand:
📂 Products (OPEN) ✅
  └─ 📂 Categories (OPEN)
     └─ ➡️ Create (HIGHLIGHTED)

User sees full context! ✅
```

### 5.2 Why Hide Routes with Missing Params?

**Answer:** Broken links are worse than no links

```
Resource: /users/:role

Without hiding:
Menu shows: "Users" → /users/:role
User clicks → ERROR 404! ❌ (No :role value)

With hiding (default):
Menu: "Users" item doesn't appear ✅
Only shows when :role is available
```

### 5.3 Why Recursive Processing?

**Answer:** Unknown menu depth

```
Flat processing:
- Can only handle 1 level
- Requires hardcoded depth

Recursive:
- Handles unlimited nesting ✅
- Same code for all levels
- Scales to any complexity
```

---

## 6. COMMON PITFALLS

### 6.1 Missing Route Parameter

```typescript
// ❌ WRONG - Resource with param but no default
{
  name: "posts",
  list: "/posts/:categoryId"
}
// Won't appear in menu! ❌

// ✅ CORRECT - Either:
// 1. Don't use params in list route
{
  name: "posts",
  list: "/posts"  // Categories shown in filter
}

// 2. Or disable hiding:
useMenu({ hideOnMissingParameter: false })
```

### 6.2 Forgetting parentName

```typescript
// ❌ WRONG - Want nested but no parentName
[
  { name: "products", list: "/products" },
  { name: "categories", list: "/categories" },
][
  // Result: TWO separate top-level items ❌

  // ✅ CORRECT
  ({ name: "products", list: "/products" },
  { name: "categories", parentName: "products", list: "/categories" })
];
// Result: categories NESTED under products ✅
```

### 6.3 Not Using selectedKey

```tsx
// ❌ WRONG - Menu doesn't highlight current page
<Menu items={menuItems} />;

// ✅ CORRECT
const { menuItems, selectedKey } = useMenu();
<Menu
  selectedKeys={[selectedKey]} // ← Highlight current!
  items={menuItems}
/>;
```

---

## 7. PERFORMANCE CONSIDERATIONS

### ⚡ Memoization

All heavy computations are memoized:

```typescript
const treeItems = React.useMemo(() => {
  // Only re-computes if resources change
}, [resources, prepareItem]);

const defaultOpenKeys = React.useMemo(() => {
  // Only computes once (no dependencies changing)
}, []);
```

### 🎯 When Does It Re-compute?

- ✅ **Resources change** - User updates \<Refine resources={...} />
- ❌ **Navigation** - Changing pages does NOT rebuild menu
- ❌ **Re-renders** - Parent component re-render does NOT rebuild menu

---

## 8. TESTING

```typescript
describe("useMenu", () => {
  it("should generate menu items from resources", () => {
    const { result } = renderHook(() => useMenu(), { wrapper });

    expect(result.current.menuItems).toHaveLength(2);
    expect(result.current.menuItems[0]).toMatchObject({
      key: "posts",
      label: "Posts",
      route: "/posts",
    });
  });

  it("should nest children under parent", () => {
    // Mock resources with parentName
    const { result } = renderHook(() => useMenu(), { wrapper });

    expect(result.current.menuItems[0].children).toHaveLength(1);
    expect(result.current.menuItems[0].children[0].key).toBe(
      "posts/categories",
    );
  });

  it("should hide items with missing params", () => {
    // Resource: /users/:role
    const { result } = renderHook(() => useMenu(), { wrapper });

    const userItem = result.current.menuItems.find(
      (item) => item.key === "users",
    );
    expect(userItem).toBeUndefined(); // Hidden!
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Composite**: Tree structure for nested menus
- ✅ **Visitor**: Recursive processing of tree
- ✅ **Builder**: Step-by-step menu item construction
- ✅ **State**: Active menu highlighting
- ✅ **Template Method**: Standard flow with customization

### Key Features

1. **Automatic** - Menu generated from resources
2. **Nested** - Unlimited hierarchy with parentName
3. **Smart** - Hides routes with missing params
4. **Contextual** - Auto-expands parent chain
5. **Customizable** - Labels, icons, hiding

### Khi nào dùng useMenu?

✅ **Nên dùng:**

- Building sidebar navigation
- Custom menu components
- Need auto-generated menus
- Multi-level menu hierarchy

❌ **Không dùng:**

- Static menus (hardcode is simpler)
- Non-resource-based navigation
- Complex custom routing logic

### Remember

✅ **145 lines** - Automatic menu generation
🌳 **Composite** - Tree structure
🚶 **Visitor** - Recursive processing
🏗️ **Builder** - Step-by-step construction
🎯 **State** - Active highlighting

---

> 📚 **Best Practice**: Use `parentName` for **nested menus**. Set `meta.hide` to **exclude from menu**. Always pass `selectedKeys` and `defaultOpenKeys` to **Menu component** for proper highlighting and expansion!
