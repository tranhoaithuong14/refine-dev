# Kiến trúc và Design Patterns của useCan Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │          ACCESS CONTROL SYSTEM                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  DEVELOPERS USE:                                 │  │
│  │  useCan() ──→ Cached, Fast ✅                    │  │
│  │        │                                         │  │
│  │        ▼ uses internally                         │  │
│  │  useCanWithoutCache() ──→ No Cache               │  │
│  │        │                                         │  │
│  │        ▼ calls                                   │  │
│  │  accessControlProvider.can()                     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Permission Checker** - Check user có quyền không
2. **Cache Manager** - Cache permission results
3. **UI Controller** - Control button/route visibility
4. **PUBLIC API** - Hook developers dùng trực tiếp

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  PERMISSION CHECK FLOW                       │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component needs permission check                    │
│  const { data } = useCan({                                   │
│    action: "edit",                                           │
│    resource: "posts"                                         │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Check React Query cache                             │
│  Cache key: ["access", "posts", "edit", {...params}]        │
│  → Hit? Return cached result (instant!)                      │
│  → Miss? Continue to fetch                                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Call accessControlProvider.can()                    │
│  → Check database/API                                        │
│  → RBAC logic: User role → Permissions                       │
│  → Return: { can: true/false, reason?: string }              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Cache result                                        │
│  → Store in React Query cache                                │
│  → Share across all components                               │
│  → Auto-invalidate on staleTime                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Component renders based on result                   │
│  {data?.can ? <EditButton /> : null}                         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này là PUBLIC API - developers dùng trực tiếp mọi nơi!

---

### 2.1 Query Pattern (via React Query)

_(Tương tự usePermissions, useIsAuthenticated - đã giải thích)_

#### 📡 VÍ DỤ: Permission check caching

```
Component A: useCan({ action: "edit", resource: "posts" })
→ Fetch from API → Cache result

Component B: useCan({ action: "edit", resource: "posts" })
→ Cache hit! (instant) ✅

Component C: useCan({ action: "edit", resource: "posts" })
→ Cache hit! (instant) ✅

→ 3 components = 1 API call!
```

---

### 2.2 Layered Architecture Pattern - Pattern "Kiến Trúc Phân Tầng"

#### 🏢 VÍ DỤ ĐỜI THƯỜNG: Tòa nhà văn phòng

```
Tầng 5: Customers (Developers)
  ↓ Use elevator
Tầng 4: Reception (useCan - Public API)
  ↓ Uses internal elevator
Tầng 3: Operations (useCanWithoutCache)
  ↓ Calls
Tầng 2: Backend (accessControlProvider)
  ↓ Queries
Tầng 1: Database (Permissions data)
```

**Layered Architecture** = Mỗi tầng có responsibility riêng

#### Layers trong Access Control:

```typescript
// LAYER 1: Developer-facing (PUBLIC)
const { data } = useCan({
  action: "edit",
  resource: "posts",
});
// ↑ Simple API, with caching

// LAYER 2: Internal (FRAMEWORK)
const { can } = useCanWithoutCache();
// ↑ No cache, just sanitization

// LAYER 3: Provider (CUSTOM)
accessControlProvider.can = async ({ action, resource }) => {
  // Your custom permission logic
  return { can: true / false };
};
// ↑ Business logic

// LAYER 4: Data Source
// Database, API, etc.
```

#### Why layers?

```
Benefits:
✅ Separation of concerns
✅ Easy to swap implementations
✅ Testable (mock each layer)
✅ Clear responsibilities
```

#### 💡 TẠI SAO quan trọng?

- ✅ Clean architecture
- ✅ Easy to maintain
- ✅ Flexible (swap layers independently)

---

### 2.3 Options Merging Pattern - Pattern "Gộp Tùy Chọn"

#### 🎛️ VÍ DỪ ĐỜI THƯỜNG: Settings cascade

```
Global settings (Company):
- Work hours: 9-5
- Lunch break: 1 hour

Department settings:
- Lunch break: 30 minutes (override!)

Personal settings:
- Work hours: 10-6 (override!)

Final result:
- Work hours: 10-6 (personal wins)
- Lunch break: 30 minutes (department wins)
```

**Options Merging** = Combine multiple config levels

#### Implementation:

```typescript
// LEVEL 1: Global options (from Provider)
<Refine
  accessControlProvider={{
    can: ...,
    options: {
      queryOptions: {
        staleTime: 5 * 60 * 1000,  // 5 minutes
        retry: false
      }
    }
  }}
/>

// LEVEL 2: Hook-specific options
const { data } = useCan({
  action: "edit",
  resource: "posts",
  queryOptions: {
    enabled: isLoggedIn,  // Override/add
    staleTime: 10 * 60 * 1000 // Override to 10 minutes
  }
});

// MERGED result:
{
  enabled: isLoggedIn,      // From hook
  staleTime: 10 * 60 * 1000, // From hook (wins!)
  retry: false              // From global
}
```

#### Code:

```typescript
const mergedQueryOptions = {
  ...globalQueryOptions, // Base
  ...hookQueryOptions, // Override
};
```

#### 💡 TẠI SAO quan trọng?

- ✅ Flexible configuration
- ✅ Global defaults + local overrides
- ✅ DRY (Don't Repeat Yourself)

---

### 2.4 Graceful Degradation Pattern - Pattern "Suy Giảm Duyên Dáng"

#### 🛡️ VÍ DỤ ĐỜI THƯỜNG: Xe ô tô

```
Xe full options:
- ABS brakes ✅
- Airbags ✅
- GPS ✅
→ Tất cả hoạt động!

GPS hỏng:
- ABS brakes ✅
- Airbags ✅
- GPS ❌ (nhưng xe vẫn chạy!)
→ Graceful degradation: Mất tính năng nhưng vẫn dùng được
```

**Graceful Degradation** = Hoạt động (limited) khi thiếu features

#### In useCan:

```typescript
// Scenario 1: No accessControlProvider configured
return typeof can === "undefined"
  ? ({ data: { can: true } } as typeof queryResponse)
  : //   ↑ Default: Allow everything!
    queryResponse;

// Scenario 2: Provider exists
// → Use real permission checks

// Benefits:
// ✅ App works without access control (dev mode)
// ✅ Can add access control incrementally
// ✅ No crashes if misconfigured
```

#### Real-world scenarios:

```typescript
// Development: No access control
<Refine /> // No accessControlProvider
// → useCan() always returns { can: true }
// → All buttons visible, all routes accessible

// Production: With access control
<Refine accessControlProvider={myProvider} />
// → useCan() checks real permissions
// → Buttons/routes controlled by RBAC
```

#### 💡 TẠI SAO quan trọng?

- ✅ Works in dev without setup
- ✅ Incremental adoption
- ✅ No crashes

---

### 2.5 Cache Key Strategy Pattern - Pattern "Chiến Lược Cache Key"

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Tủ khóa

```
Tủ khóa gym:
- Tủ #123: Cho user "John"
- Tủ #124: Cho user "Jane"

Key strategy: User ID + Locker Number
→ Mỗi người có key riêng
→ Không conflict!

useCan cache:
- ["access", "posts", "edit", {...}]: Permission result
- ["access", "users", "delete", {...}]: Permission result

Key strategy: resource + action + params
→ Mỗi permission có cache riêng
→ Không conflict!
```

**Cache Key Strategy** = Cách tạo unique keys

#### Implementation:

```typescript
queryKey: keys()
  .access()
  .resource(resource)      // "posts"
  .action(action)          // "edit"
  .params({
    params: { ...paramsRest, resource: sanitizedResource },
    enabled: mergedQueryOptions?.enabled
  })
  .get()

// Result:
["access", "posts", "edit", { params: {...}, enabled: true }]

// Different permissions = Different keys:
["access", "posts", "edit", {...}]    // Cache #1
["access", "posts", "delete", {...}]  // Cache #2
["access", "users", "list", {...}]    // Cache #3
```

#### Why structured keys?

```
Benefits:
✅ Granular invalidation (only invalidate specific permissions)
✅ No conflicts (each permission separate)
✅ Debugging (clear key structure)
✅ Predictable (easy to understand)
```

#### 💡 TẠI SAO quan trọng?

- ✅ Efficient caching
- ✅ Granular control
- ✅ Clear structure

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                  | Ví dụ đời thường   | Giải quyết vấn đề gì   | Trong useCan          |
| ------------------------ | ------------------ | ---------------------- | --------------------- |
| **Query**                | Permission caching | Cache & reuse          | React Query           |
| **Layered Architecture** | Tòa nhà văn phòng  | Separation of concerns | 4 layers              |
| **Options Merging**      | Settings cascade   | Global + local config  | Merge queryOptions    |
| **Graceful Degradation** | Xe thiếu GPS       | Work without features  | Default { can: true } |
| **Cache Key Strategy**   | Tủ khóa gym        | Unique keys            | Structured keys       |

---

## 3. COMMON USE CASES

### 3.1 Show/Hide Buttons

```typescript
function EditButton() {
  const { data, isLoading } = useCan({
    action: "edit",
    resource: "posts",
    params: { id: post.id },
  });

  if (isLoading) return <Skeleton />;

  return data?.can ? <button onClick={handleEdit}>Edit</button> : null;
}
```

### 3.2 Conditional Rendering

```typescript
function PostList() {
  const { data: canCreate } = useCan({
    action: "create",
    resource: "posts",
  });

  return (
    <div>
      <h1>Posts</h1>
      {canCreate?.can && <button onClick={handleCreate}>+ New Post</button>}
      <PostTable />
    </div>
  );
}
```

### 3.3 Route Protection

```typescript
function ProtectedRoute({ children }) {
  const { data, isLoading } = useCan({
    action: "list",
    resource: "admin-panel",
  });

  if (isLoading) return <Loading />;

  if (!data?.can) {
    return <Navigate to="/access-denied" />;
  }

  return children;
}
```

### 3.4 With Reason Display

```typescript
function DeleteButton() {
  const { data } = useCan({
    action: "delete",
    resource: "posts",
    params: { id: post.id },
  });

  return (
    <Tooltip title={data?.reason || "Delete post"}>
      <button disabled={!data?.can}>Delete</button>
    </Tooltip>
  );
}
```

### 3.5 Global vs Local Options

```typescript
// Global (apply to all useCan calls)
<Refine
  accessControlProvider={{
    can: myCanFunction,
    options: {
      queryOptions: {
        staleTime: 5 * 60 * 1000, // 5 mins
        retry: false,
      },
    },
  }}
/>;

// Local override
const { data } = useCan({
  action: "edit",
  resource: "posts",
  queryOptions: {
    enabled: isLoggedIn, // Add condition
    staleTime: 1 * 60 * 1000, // Override to 1 min
  },
});
```

---

## 4. PERFORMANCE OPTIMIZATIONS

### 4.1 Caching Benefits

```
Without cache:
Component A: API call (200ms)
Component B: API call (200ms)
Component C: API call (200ms)
Total: 600ms

With cache (useCan):
Component A: API call (200ms) → Cache
Component B: Cache hit (0ms) ✅
Component C: Cache hit (0ms) ✅
Total: 200ms (3x faster!)
```

### 4.2 Shared Cache

```typescript
// All components checking same permission share cache

<EditButton />    // useCan({ action: "edit", resource: "posts" })
<DeleteButton />  // useCan({ action: "delete", resource: "posts" })
<ShareButton />   // useCan({ action: "share", resource: "posts" })

// 3 different actions = 3 API calls
// But same action across components = 1 API call
```

### 4.3 Smart Invalidation

```typescript
// Invalidate specific permission
queryClient.invalidateQueries({
  queryKey: ["access", "posts", "edit"],
});
// Only refetch edit permission, not others!
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Query**: Cached permission checks
- ✅ **Layered Architecture**: Clean separation
- ✅ **Options Merging**: Flexible config
- ✅ **Graceful Degradation**: Works without provider
- ✅ **Cache Key Strategy**: Granular caching

### Key Features

1. **PUBLIC API** - Developers dùng trực tiếp
2. **Cached** - Fast, efficient
3. **Flexible** - Global + local options
4. **Safe** - Defaults to allowing
5. **Shared** - Cache across components

### Khi nào dùng useCan?

✅ **Nên dùng:**

- Show/hide buttons based on permission
- Conditional rendering
- Route protection
- Feature flags
- RBAC (Role-Based Access Control)

❌ **Không dùng:**

- Authentication check (use useIsAuthenticated)
- User identity (use useGetIdentity)
- Static content (no permission needed)

### Remember

✅ **PUBLIC API** - Dùng trực tiếp!
✅ Cached với React Query (fast!)
✅ Defaults to { can: true } if no provider
✅ Merge global + local queryOptions
✅ Structured cache keys for granular control
