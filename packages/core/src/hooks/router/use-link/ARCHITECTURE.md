# Kiến trúc và Design Patterns của useLink Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          DECLARATIVE NAVIGATION SYSTEM            │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  RouterContext                                   │  │
│  │    ↓ provides                                    │  │
│  │    - Link component (from router provider)       │  │
│  │      (React Router Link, Next.js Link, etc.)     │  │
│  │                                                   │  │
│  │  useGo                                          │  │
│  │    ↓ provides                                    │  │
│  │    - go function (programmatic navigation)       │  │
│  │                                                   │  │
│  │  Link Component ✅                               │  │
│  │    ↓ uses both                                   │  │
│  │    - RouterContext.Link (if available)           │  │
│  │    - useGo (for resource objects)                │  │
│  │    - Fallback to <a> tag                        │  │
│  │         │                                         │  │
│  │         ├──→ ADAPTER PATTERN:                    │  │
│  │         │     Works with any router's Link       │  │
│  │         │                                         │  │
│  │         ├──→ FALLBACK PATTERN:                   │  │
│  │         │     <a> tag if no router               │  │
│  │         │                                         │  │
│  │         ├──→ OVERLOADING:                        │  │
│  │         │     Accept "to" OR "go" prop           │  │
│  │         │                                         │  │
│  │         └──→ FORWARDREF:                         │  │
│  │               Ref forwarding support             │  │
│  │                                                   │  │
│  │  useLink ✅ (THIS HOOK - 6 lines!)              │  │
│  │    → Simple accessor returning Link              │  │
│  │         │                                         │  │
│  │         └──→ ACCESSOR PATTERN:                   │  │
│  │               Export Link component              │  │
│  │                                                   │  │
│  │  Used by:                                        │  │
│  │    - UI components (navigation links)            │  │
│  │    - Breadcrumbs (resource links)                │  │
│  │    - Menus (navigation items)                    │  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Provide a router-agnostic Link component for declarative navigation**

### 1.2 Two-Layer Architecture

```
┌──────────────────────────────────────────────────────────────┐
│         USELINK ARCHITECTURE - Hook + Component              │
└──────────────────────────────────────────────────────────────┘

LAYER 1: useLink Hook (6 lines)
═══════════════════════════════════
export const useLink = () => {
  return Link;  // Just returns component!
};

// Purpose: Convenience accessor
// Why hook? Consistent API pattern with other hooks


LAYER 2: Link Component (73 lines)
═══════════════════════════════════
export const Link = forwardRef((props, ref) => {
  // 1. Get router's Link (if available)
  const LinkFromContext = RouterContext.Link;

  // 2. Get go function
  const go = useGo();

  // 3. Resolve path:
  if (props.go) {
    // Resource object → Generate path
    resolvedTo = go({ ...props.go, type: "path" });
  } else if (props.to) {
    // String path → Use directly
    resolvedTo = props.to;
  }

  // 4. Render:
  if (LinkFromContext) {
    return <LinkFromContext to={resolvedTo} />;
  }
  return <a href={resolvedTo} />;
});

// Purpose: Router-agnostic navigation component


WHY TWO LAYERS?
===============
Hook: Consistent API (like useGo, useBack)
Component: Actual implementation (can be used directly too)
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File use-link/index.tsx: 6 dòng** - Simple accessor!  
> **File components/link/index.tsx: 73 dòng** - Router-agnostic Link!

---

### 2.1 Accessor Pattern - Simple Export

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Library Checkout Desk

```
Library:

Books on shelves (Link component)
Checkout desk (useLink hook)

You can:
1. Go to shelf directly (import Link)
2. Ask checkout desk (useLink())

Both get you the book!

useLink:

Link component defined in components/
useLink hook in hooks/

You can:
1. Import Link directly
2. Call useLink()

Both get you the component!
```

**Accessor Pattern** = Provide simple getter for existing resource.

#### Implementation:

```typescript
// COMPONENT (in /components/link/):
export const Link = forwardRef(LinkComponent);

// HOOK (in /hooks/router/use-link/):
export const useLink = () => {
  return Link; // ← Just return it!
};

// USAGE - Two ways:

// Way 1: Direct import
import { Link } from "@refinedev/core";
<Link to="/posts">Posts</Link>;

// Way 2: Via hook
const Link = useLink();
<Link to="/posts">Posts</Link>;

// Same result! ✅
```

#### Why This Pattern?

```typescript
// CONSISTENCY:
// Other router hooks follow pattern:
const go = useGo();
const back = useBack();
const Link = useLink(); // Consistent! ✅

// FLEXIBILITY:
// Can be swapped/mocked easily:
const Link = useLink(); // Could return different component
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Consistent API** - Same pattern as other hooks
- ✅ **Flexible** - Can be customized if needed
- ✅ **Discoverable** - Found alongside other router hooks
- ✅ **Simple** - Just 6 lines!

---

### 2.2 Adapter Pattern - Router Agnostic Link

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Universal Charger

```
Different Devices:
- iPhone: Lightning cable
- Android: USB-C cable
- Laptop: MagSafe

Universal Charger (Adapter):
- Detects device
- Uses correct cable
- Same charging for all

Link Component:

Different Routers:
- React Router: <Link to="...">
- Next.js: <Link href="...">
- Remix: <Link to="...">
- No router: <a href="...">

Link Component (Adapter):
- Detects router
- Uses correct Link
- Same API for all
```

**Adapter Pattern** = Make different interfaces work through common interface.

#### Implementation:

```typescript
export const Link = forwardRef((props, ref) => {
  // DETECT ROUTER:
  const LinkFromContext = useContext(RouterContext)?.Link;

  // RESOLVE PATH:
  const resolvedTo = /* ... */;

  // ADAPT TO ROUTER:
  if (LinkFromContext) {
    // Use router's Link component
    return <LinkFromContext to={resolvedTo} {...props} ref={ref} />;
  }

  // FALLBACK:
  // No router → Use standard anchor
  return <a href={resolvedTo} {...props} ref={ref} />;
});
```

#### Router Compatibility:

```tsx
// REACT ROUTER:
RouterContext.Link = ReactRouterLink;
<Link to="/posts" /> → <ReactRouterLink to="/posts" />

// NEXT.JS:
RouterContext.Link = NextLink;
<Link to="/posts" /> → <NextLink to="/posts" />

// REMIX:
RouterContext.Link = RemixLink;
<Link to="/posts" /> → <RemixLink to="/posts" />

// NO ROUTER:
RouterContext.Link = undefined;
<Link to="/posts" /> → <a href="/posts" />

// Same code, different routers! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Router agnostic** - Works with any router
- ✅ **Single API** - Same props for all
- ✅ **Portable** - Change routers easily
- ✅ **Progressive** - Works even without router

---

### 2.3 Overloading Pattern - Dual Props

#### 🎭 VÍ DỤ ĐỜI THƯỜNG: GPS Navigation

```
Car GPS:

Input option 1: Address
"123 Main St, New York"

Input option 2: Place name
"Starbucks" → GPS finds address

Both get you there!

Link Component:

Input option 1: Direct path (to)
<Link to="/posts/show/123" />

Input option 2: Resource object (go)
<Link go={{ resource: "posts", action: "show", id: 123 }} />

Both navigate there!
```

**Overloading Pattern** = Accept different prop formats for same goal.

#### Implementation:

```typescript
// TYPE 1: String path
type LinkPropsWithTo = {
  to: string;
};

// TYPE 2: Resource object
type LinkPropsWithGo = {
  go: Omit<GoConfigWithResource, "type">;
};

// UNION:
export type LinkProps = LinkPropsWithTo | LinkPropsWithGo;

// RESOLVE IN COMPONENT:
let resolvedTo = "";

if ("go" in props) {
  // Generate path from resource
  resolvedTo = goFunction({ ...props.go, type: "path" }) as string;
}

if ("to" in props) {
  // Use path directly (overrides go!)
  resolvedTo = props.to;
}
```

#### Usage Comparison:

```tsx
// MODE 1: Direct path (simple)
<Link to="/posts/show/123">View Post</Link>

// MODE 2: Resource object (type-safe)
<Link
  go={{
    resource: "posts",
    action: "show",
    id: 123
  }}
>
  View Post
</Link>

// MODE 3: Nested resource
<Link
  go={{
    resource: "comments",
    action: "show",
    id: 456,
    meta: { postId: 123 }
  }}
>
  View Comment
</Link>

// All valid! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexible** - Two ways to specify destination
- ✅ **Simple mode** - Direct path for quick use
- ✅ **Smart mode** - Resource object for type safety
- ✅ **Backward compatible** - `to` works like standard Link

---

### 2.4 Fallback Pattern - Graceful Degradation

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Building Elevator

```
Modern Building:

Normal: High-tech elevator
Fallback: Stairs (always work)

Even if elevator broken → Building usable!

Link Component:

Normal: Router's Link component
Fallback: Standard <a> tag

Even without router → Navigation works!
```

**Fallback Pattern** = Provide working alternative when preferred option unavailable.

#### Implementation:

```typescript
export const Link = forwardRef((props, ref) => {
  const LinkFromContext = useContext(RouterContext)?.Link;
  const resolvedTo = /* resolve path */;

  // PREFERRED: Use router's Link
  if (LinkFromContext) {
    return (
      <LinkFromContext
        to={resolvedTo}
        {...props}
        ref={ref}
      />
    );
  }

  // FALLBACK: Use standard anchor
  return (
    <a
      href={resolvedTo}
      {...props}
      ref={ref}
    />
  );
});
```

#### Fallback Scenarios:

```tsx
// SCENARIO 1: React Router available
<RouterContext.Provider value={{ Link: ReactRouterLink }}>
  <Link to="/posts">Posts</Link>
  {/* → <ReactRouterLink to="/posts">Posts</ReactRouterLink> */}
</RouterContext.Provider>

// SCENARIO 2: Next.js available
<RouterContext.Provider value={{ Link: NextLink }}>
  <Link to="/posts">Posts</Link>
  {/* → <NextLink to="/posts">Posts</NextLink> */}
</RouterContext.Provider>

// SCENARIO 3: No router (tests, SSR, etc.)
<RouterContext.Provider value={null}>
  <Link to="/posts">Posts</Link>
  {/* → <a href="/posts">Posts</a> */}
</RouterContext.Provider>

// All work! ✅
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Robust** - Works in all scenarios
- ✅ **Testable** - Can test without router
- ✅ **SSR-friendly** - Standard anchor for SEO
- ✅ **Progressive** - Graceful degradation

---

### 2.5 forwardRef Pattern - Ref Support

#### 📌 VÍ DỤ ĐỜI THƯỜNG: Package Forwarding

```
Post Office:

Normal delivery: Direct to address
Package forwarding: Forward to new address

forwardRef:

Normal ref: Direct to DOM element
Ref forwarding: Forward through component to child
```

**forwardRef Pattern** = Pass ref through component to underlying element.

#### Implementation:

```typescript
// WITHOUT forwardRef (ref lost):
const Link = (props) => {
  // ref not accessible! ❌
  return <a {...props} />;
};

// WITH forwardRef (ref forwarded):
const LinkComponent = (props, ref) => {
  return <a {...props} ref={ref} />; // ← ref forwarded!
};

export const Link = forwardRef(LinkComponent);
```

#### Usage:

```tsx
function ScrollToLink() {
  const linkRef = useRef<HTMLAnchorElement>(null);

  const scrollToLink = () => {
    linkRef.current?.scrollIntoView(); // ← Works! ✅
  };

  return (
    <>
      <button onClick={scrollToLink}>Scroll to Link</button>
      <Link ref={linkRef} to="/posts">
        Posts
      </Link>
      {/* ref forwarded to underlying <a> or router Link */}
    </>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **DOM access** - Can access underlying element
- ✅ **Scroll** - Scroll into view
- ✅ **Focus** - Programmatic focus
- ✅ **Standard** - Expected behavior for Link

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern         | Ví dụ đời thường      | Giải quyết vấn đề gì   | Trong useLink/Link                             |
| --------------- | --------------------- | ---------------------- | ---------------------------------------------- |
| **Accessor**    | Library checkout desk | Simple getter          | useLink returns Link component                 |
| **Adapter**     | Universal charger     | Work with any router   | Adapts to React Router, Next.js, Remix, or <a> |
| **Overloading** | GPS navigation        | Multiple input formats | Accept "to" (string) OR "go" (resource object) |
| **Fallback**    | Building stairs       | Graceful degradation   | Fall back to <a> if no router                  |
| **forwardRef**  | Package forwarding    | Pass ref through       | Forward ref to underlying element              |

---

## 3. KEY FEATURES

### 3.1 Two Usage Modes

```tsx
// MODE 1: Direct path
<Link to="/posts/show/123">View Post</Link>

// MODE 2: Resource object
<Link
  go={{
    resource: "posts",
    action: "show",
    id: 123
  }}
>
  View Post
</Link>
```

### 3.2 Router Agnostic

```tsx
// Works with ANY router:
// - React Router
// - Next.js
// - Remix
// - No router (fallback to <a>)

<Link to="/posts">Posts</Link>
// Adapts automatically! ✅
```

### 3.3 Ref Forwarding

```tsx
const linkRef = useRef();
<Link ref={linkRef} to="/posts">
  Posts
</Link>;
```

### 3.4 Standard Props Support

```tsx
<Link
  to="/posts"
  className="nav-link"
  onClick={handleClick}
  target="_blank"
  rel="noopener"
>
  Posts
</Link>
```

---

## 4. COMMON USE CASES

### 4.1 Simple Navigation Link

```tsx
import { useLink } from "@refinedev/core";

function Navigation() {
  const Link = useLink();

  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/posts">Posts</Link>
      <Link to="/users">Users</Link>
    </nav>
  );
}
```

### 4.2 Resource-Based Link

```tsx
function PostItem({ post }) {
  const Link = useLink();

  return (
    <div>
      <Link
        go={{
          resource: "posts",
          action: "show",
          id: post.id,
        }}
      >
        {post.title}
      </Link>
    </div>
  );
}
```

### 4.3 Breadcrumb Navigation

```tsx
function Breadcrumb({ items }) {
  const Link = useLink();

  return (
    <nav>
      {items.map((item, index) => (
        <span key={index}>
          <Link to={item.path}>{item.label}</Link>
          {index < items.length - 1 && " > "}
        </span>
      ))}
    </nav>
  );
}
```

### 4.4 Menu Items

```tsx
function MenuItem({ resource }) {
  const Link = useLink();

  return (
    <li>
      <Link
        go={{
          resource: resource.name,
          action: "list",
        }}
      >
        {resource.label}
      </Link>
    </li>
  );
}
```

### 4.5 External Link

```tsx
function ExternalLink() {
  const Link = useLink();

  return (
    <Link to="https://example.com" target="_blank" rel="noopener noreferrer">
      External Site
    </Link>
  );
}
```

### 4.6 With Ref

```tsx
function ScrollableLink() {
  const Link = useLink();
  const linkRef = useRef<HTMLAnchorElement>(null);

  const handleScroll = () => {
    linkRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <>
      <button onClick={handleScroll}>Scroll to Link</button>
      <Link ref={linkRef} to="/posts">
        Posts
      </Link>
    </>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Separate Hook and Component?

**Answer:** Consistency and flexibility

```typescript
// CONSISTENCY:
// Matches pattern with other router hooks:
const go = useGo();
const back = useBack();
const Link = useLink(); // ✅ Consistent!

// FLEXIBILITY:
// Component can be imported directly:
import { Link } from "@refinedev/core"; // Direct
const Link = useLink(); // Via hook

// Both work!
```

### 5.2 Why Prefer RouterContext.Link Over Custom Implementation?

**Answer:** Router-specific features

```typescript
// Router's Link has features we can't replicate:
// - Prefetching (Next.js)
// - Active state (React Router)
// - Scroll restoration
// - Route transitions

// Better to use router's Link when available!
```

### 5.3 Why Fallback to <a> Instead of div?

**Answer:** Accessibility and SEO

```tsx
// ❌ BAD: div (not semantic)
<div onClick={navigate}>Link</div>
// - Not keyboard accessible
// - Search engines ignore
// - Screen readers confused

// ✅ GOOD: <a> (semantic HTML)
<a href="/posts">Link</a>
// - Keyboard accessible (Tab, Enter)
// - SEO friendly
// - Screen reader compatible
```

### 5.4 Why Support Both "to" and "go"?

**Answer:** Flexibility for different use cases

```tsx
// SIMPLE: Use "to" for quick links
<Link to="/posts">Posts</Link>

// COMPLEX: Use "go" for resource-based with type safety
<Link go={{ resource: "posts", action: "show", id: 123 }}>
  View Post
</Link>

// Both supported for different needs!
```

---

## 6. COMMON PITFALLS

### 6.1 Forgetting useLink Returns Component

```tsx
// ❌ WRONG - Trying to call as function
const link = useLink();
link({ to: "/posts" });  // ❌ It's a component, not function!

// ✅ CORRECT - Use as component
const Link = useLink();
<Link to="/posts">Posts</Link>  ✅
```

### 6.2 Using Both "to" and "go"

```tsx
// ❌ CONFLICTING - Both provided
<Link
  to="/posts"
  go={{ resource: "posts", action: "list" }}
>
  Posts
</Link>
// "to" will override "go"! Confusing!

// ✅ CLEAR - Use one
<Link to="/posts">Posts</Link>
// OR
<Link go={{ resource: "posts", action: "list" }}>Posts</Link>
```

### 6.3 Not Handling Missing Router

```tsx
// Link works WITHOUT router:
<Link to="/posts">Posts</Link>
// → Falls back to <a href="/posts">

// But be aware:
// - No client-side navigation
// - Full page reload
// - Consider this in tests!
```

### 6.4 Ref Type Mismatch

```tsx
// ❌ WRONG - Specific type
const linkRef = useRef<HTMLAnchorElement>(null);
<Link ref={linkRef} to="/posts">
  Link
</Link>;
// Might be NextLink, not <a>! Type error!

// ✅ BETTER - Generic type
const linkRef = useRef<Element>(null);
<Link ref={linkRef} to="/posts">
  Link
</Link>;
```

---

## 7. TESTING

```typescript
import { render } from "@testing-library/react";
import { useLink } from "@refinedev/core";

describe("useLink", () => {
  it("should return Link component", () => {
    const Link = useLink();
    expect(Link).toBeDefined();
  });

  it("should render with string path", () => {
    const Link = useLink();
    const { getByText } = render(<Link to="/posts">Posts</Link>);

    expect(getByText("Posts")).toBeInTheDocument();
  });

  it("should render with resource object", () => {
    const Link = useLink();
    const { getByText } = render(
      <TestWrapper>
        <Link go={{ resource: "posts", action: "list" }}>Posts</Link>
      </TestWrapper>,
    );

    expect(getByText("Posts")).toBeInTheDocument();
  });

  it("should fallback to anchor tag without router", () => {
    const Link = useLink();
    const { container } = render(<Link to="/posts">Posts</Link>);

    expect(container.querySelector("a")).toBeInTheDocument();
  });

  it("should forward ref", () => {
    const Link = useLink();
    const ref = React.createRef<Element>();

    render(
      <Link ref={ref} to="/posts">
        Posts
      </Link>,
    );

    expect(ref.current).toBeInstanceOf(Element);
  });
});
```

---

## 8. KẾT LUẬN

### Design Patterns Summary

- ✅ **Accessor**: useLink returns Link component
- ✅ **Adapter**: Works with any router's Link
- ✅ **Overloading**: Accept "to" or "go" prop
- ✅ **Fallback**: Falls back to <a> tag
- ✅ **forwardRef**: Supports ref forwarding

### Key Features

1. **Two-Layer** - Hook (6 lines) + Component (73 lines)
2. **Router Agnostic** - Works with any router
3. **Dual Mode** - String path OR resource object
4. **Fallback** - Standard <a> if no router
5. **Ref Support** - forwardRef pattern

### Khi nào dùng useLink?

✅ **Nên dùng:**

- Declarative navigation (links in UI)
- Breadcrumbs, menus, navigation
- When you need ref access
- Consistent with other hooks pattern

❌ **Không dùng:**

- Programmatic navigation → Use `useGo()`
- Back navigation → Use `useBack()`
- Just importing component → Import `Link` directly

### Hook vs Direct Import

```tsx
// Via hook (consistent with other hooks):
const Link = useLink();

// Direct import (simpler):
import { Link } from "@refinedev/core";

// Both work! Choose based on preference!
```

### Remember

✅ **6 lines** - Ultra-minimal accessor hook
✅ **73 lines** - Sophisticated Link component
🔑 **Accessor Pattern** - Returns component
🔌 **Adapter Pattern** - Router agnostic
🎭 **Overloading** - to OR go props
🛡️ **Fallback** - <a> tag if no router
📌 **forwardRef** - Ref support

---

> 📚 **Best Practice**: Use `<Link>` for **declarative navigation** (JSX). Use `useGo()` for **programmatic navigation** (event handlers). The Link component **adapts to your router** automatically - works with React Router, Next.js, Remix, or even without a router! **Type-safe** with resource objects, **simple** with string paths!
