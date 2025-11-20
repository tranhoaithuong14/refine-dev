# Kiến trúc và Design Patterns của useCanWithoutCache Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   DATA       │  │     AUTH     │  │ACCESS CONTROL│ │
│  │   LAYER      │  │    LAYER     │  │    LAYER     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                              │         │
│                          ┌───────────────────▼──────┐  │
│                          │ useCanWithoutCache       │  │
│                          │ (No Cache)               │  │
│                          └────────────┬─────────────┘  │
│                                       │                │
│                          Used by: useCan (with cache) │
│                                   Other hooks          │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Low-level Access** - Direct access to can() function
2. **Resource Sanitizer** - Clean resource names before checking
3. **Base Layer** - Foundation for cached hooks (useCan)
4. **Internal Hook** - Not typically used directly by developers

> **⚠️ INTERNAL HOOK** - Developers nên dùng `useCan` (cached version) thay vì hook này!

### 1.2 Relationship với useCan

```
┌──────────────────────────────────────────────────────┐
│  DEVELOPERS USE                                      │
│                                                      │
│  useCan() ──→ With React Query cache ✅              │
│               Fast, efficient                        │
└──────────────────────────────────────────────────────┘
                      │
                      │ Uses internally
                      ▼
┌──────────────────────────────────────────────────────┐
│  FRAMEWORK INTERNAL                                  │
│                                                      │
│  useCanWithoutCache() ──→ No cache                   │
│                           Direct call                │
└──────────────────────────────────────────────────────┘
                      │
                      │ Calls
                      ▼
┌──────────────────────────────────────────────────────┐
│  accessControlProvider.can()                         │
│  → Check permissions in database/API                 │
│  → Return { can: true/false }                        │
└──────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này cực kỳ đơn giản (40 dòng) nhưng là nền tảng cho access control system!

---

### 2.1 Decorator Pattern - Pattern "Trang Trí"

#### 🎁 VÍ DỤ ĐỜI THƯỜNG: Gói quà

```
Quà gốc: Sách
→ Bước 1: Bọc giấy đẹp
→ Bước 2: Thêm nơ
→ Kết quả: Sách (nhưng đẹp hơn!)

useCanWithoutCache:
can() gốc: accessControlProvider.can
→ Bước 1: Sanitize resource name
→ Bước 2: Wrap với useMemo
→ Kết quả: can() (nhưng sạch hơn!)
```

**Decorator** = Thêm functionality mà không thay đổi core

#### ❌ KHÔNG có Decorator:

```typescript
// BAD - Components gọi trực tiếp provider

function EditButton() {
  const { accessControlProvider } = useContext(...);

  const checkPermission = async () => {
    // 😱 Phải tự sanitize!
    const resource = "blog_posts"; // From route
    const sanitized = resource.replace(/_/g, '-'); // blog-posts

    const result = await accessControlProvider.can({
      action: "edit",
      resource: sanitized
    });

    return result.can;
  };

  // Duplicate sanitization mọi nơi!
}
```

**Vấn đề:**

- ❌ Duplicate sanitization logic
- ❌ Easy to forget
- ❌ Inconsistent resource names

#### ✅ CÓ Decorator Pattern:

```typescript
// GOOD - Hook decorates with sanitization

export const useCanWithoutCache = () => {
  const { can: canFromContext } = useContext(AccessControlContext);

  // Decorate original function
  const can = useMemo(() => {
    if (!canFromContext) return undefined;

    // Enhanced version with sanitization
    const canWithSanitizedResource = async ({ params, ...rest }) => {
      // 1. Sanitize resource (decoration!)
      const sanitizedResource = params?.resource
        ? sanitizeResource(params.resource)
        : undefined;

      // 2. Call original with clean resource
      return canFromContext({
        ...rest,
        params: {
          ...params,
          resource: sanitizedResource,
        },
      });
    };

    return canWithSanitizedResource;
  }, [canFromContext]);

  return { can };
};

// Usage - No manual sanitization needed!
function EditButton() {
  const { can } = useCanWithoutCache();

  const result = await can({
    action: "edit",
    resource: "blog_posts", // Auto-sanitized to "blog-posts"
  });
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Consistent resource naming
- ✅ Single sanitization point
- ✅ Clean API for consumers

---

### 2.2 Adapter Pattern - Pattern "Bộ Chuyển Đổi"

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Adapter điện

```
Bạn có sạc iPhone (Lightning):
Nhưng laptop chỉ có USB-C!

Giải pháp: Adapter
Lightning → [Adapter] → USB-C
→ Hoạt động!

useCanWithoutCache:
Backend resource: "blog_posts"
Framework expects: "blog-posts"

Hook adapts:
"blog_posts" → [sanitize] → "blog-posts"
```

**Adapter** = Convert format to match expectations

#### What is sanitizeResource?

```typescript
// Transform resource names to consistent format
function sanitizeResource(resource: string): string {
  // "blog_posts" → "blog-posts"
  // "user_profiles" → "user-profiles"
  // "adminPanel" → "admin-panel"

  return resource
    .replace(/_/g, "-") // Underscores to dashes
    .replace(/([A-Z])/g, "-$1") // CamelCase to kebab-case
    .toLowerCase();
}

// Examples:
sanitizeResource("blog_posts"); // → "blog-posts"
sanitizeResource("userProfiles"); // → "user-profiles"
sanitizeResource("AdminPanel"); // → "admin-panel"
```

#### Why sanitize?

```
Different naming conventions:
- Database: snake_case (blog_posts)
- Routes: kebab-case (blog-posts)
- Code: camelCase (blogPosts)

Framework needs consistent names!
→ Sanitize to kebab-case everywhere
```

#### 💡 TẠI SAO quan trọng?

- ✅ Consistent naming convention
- ✅ Works with any input format
- ✅ Prevents mismatches

---

### 2.3 Memoization Pattern - Pattern "Ghi Nhớ"

#### 🧠 VÍ DỤ ĐỜI THƯỜNG: Bảng cửu chương

```
❌ KHÔNG ghi nhớ:
"8 x 7 = ?"
→ Tính: 8+8+8+8+8+8+8 = 56
→ Mỗi lần đều tính lại!

✅ CÓ ghi nhớ:
"8 x 7 = ?"
→ Nhớ: "56!"
→ Trả lời ngay!
```

**Memoization** = Remember computed values

#### Implementation:

```typescript
const can = useMemo(() => {
  // Only recompute when canFromContext changes
  if (!canFromContext) return undefined;

  // Create wrapped function
  const canWithSanitizedResource = async ({ params, ...rest }) => {
    // ... sanitization logic
  };

  return canWithSanitizedResource;
}, [canFromContext]); // ← Dependency
```

#### Why useMemo here?

```typescript
// WITHOUT useMemo:
// Every render creates NEW function
render 1: can = function() {...}  // Object #1
render 2: can = function() {...}  // Object #2 (different!)
render 3: can = function() {...}  // Object #3 (different!)
→ Breaks referential equality
→ Causes unnecessary re-renders in children

// WITH useMemo:
// Same function reference if dependency unchanged
render 1: can = function() {...}  // Object #1
render 2: can = function() {...}  // Object #1 (same!)
render 3: can = function() {...}  // Object #1 (same!)
→ Stable reference
→ Performance optimization
```

#### 💡 TẠI SAO quan trọng?

- ✅ Stable function reference
- ✅ Prevent unnecessary re-renders
- ✅ Performance optimization

---

### 2.4 Null Object Pattern - Pattern "Đối Tượng Rỗng"

_(Tương tự useIsExistAuthentication - đã giải thích)_

#### 🎭 VÍ DỤ: No access control provider

```typescript
// If no accessControlProvider configured:
canFromContext = undefined;

// Hook returns:
{
  can: undefined;
}

// Component can safely check:
if (!can) {
  // No access control → Allow everything
  return <EditButton />;
}

// Safe, no crashes!
```

---

### 2.5 Single Responsibility Pattern

#### 🎯 ONE job: Provide unsanitized can() function

```
useCanWithoutCache does:
✅ Get can() from context
✅ Add sanitization
✅ Return wrapped function

useCanWithoutCache does NOT:
❌ Cache results (useCan does this)
❌ Fetch permissions (useCan does this)
❌ Handle loading states (useCan does this)
```

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                   | Ví dụ đời thường | Giải quyết vấn đề gì  | Trong useCanWithoutCache    |
| ------------------------- | ---------------- | --------------------- | --------------------------- |
| **Decorator**             | Gói quà          | Add functionality     | Sanitization wrapper        |
| **Adapter**               | Adapter điện     | Format conversion     | Resource name normalization |
| **Memoization**           | Bảng cửu chương  | Remember values       | Stable function reference   |
| **Null Object**           | Safe defaults    | Handle missing config | Return undefined safely     |
| **Single Responsibility** | One job          | Clear purpose         | Only wrap, no cache         |

---

## 3. IMPLEMENTATION DETAILS

### 3.1 What Gets Sanitized?

```typescript
// Input formats:
"blog_posts"      → "blog-posts"     (snake_case)
"userProfiles"    → "user-profiles"   (camelCase)
"AdminPanel"      → "admin-panel"     (PascalCase)
"custom-resource" → "custom-resource" (already kebab-case)

// All become consistent kebab-case!
```

### 3.2 Params Structure

```typescript
interface CanParams {
  action: string; // "list", "create", "edit", "delete"
  resource: string; // Resource name
  params?: Record<string, any>; // Custom params
}

// Example:
can({
  action: "edit",
  resource: "blog_posts", // ← Gets sanitized!
  params: {
    id: 123,
    userId: 456,
  },
});
```

### 3.3 Return Value

```typescript
// accessControlProvider.can() returns:
{
  can: boolean;          // true = allowed, false = denied
  reason?: string;       // Optional explanation
}

// Example:
{
  can: false,
  reason: "You don't have permission to edit this post"
}
```

---

## 4. WHEN TO USE

### ❌ DON'T Use Directly

```typescript
// ❌ BAD - No caching, inefficient
function EditButton() {
  const { can } = useCanWithoutCache();

  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    can({ action: "edit", resource: "posts" }).then((result) =>
      setCanEdit(result.can),
    );
  }, []);

  // Every render = new check!
}
```

### ✅ Use useCan Instead

```typescript
// ✅ GOOD - With React Query cache
function EditButton() {
  const { data } = useCan({
    action: "edit",
    resource: "posts",
  });

  // Cached, shared, efficient!
  return data?.can ? <EditButton /> : null;
}
```

### When Framework Uses It

```typescript
// useCan internally uses useCanWithoutCache
export const useCan = (params) => {
  const { can } = useCanWithoutCache(); // ← Get base function

  return useQuery({
    queryKey: ["can", params],
    queryFn: () => can(params), // ← Add caching layer
  });
};
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Decorator**: Add sanitization
- ✅ **Adapter**: Normalize resource names
- ✅ **Memoization**: Stable references
- ✅ **Null Object**: Safe fallbacks
- ✅ **Single Responsibility**: One clear job

### Key Characteristics

1. **Internal** - Framework use only
2. **Simple** - 40 lines of code
3. **Foundation** - Base for useCan
4. **Sanitizer** - Consistent resource names
5. **No Cache** - Direct provider access

### Why This Hook Exists

- ✅ Consistent resource naming
- ✅ Separation of concerns (caching vs base access)
- ✅ Foundation for cached hooks
- ✅ Single sanitization point

### Remember

🚫 **INTERNAL HOOK** - Không dùng trực tiếp!
✅ Developers nên dùng `useCan` (cached version)
✅ Sanitizes resource names tự động
✅ Foundation cho access control system
🎯 Single responsibility: wrap + sanitize
