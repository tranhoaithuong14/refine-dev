# KIẾN TRÚC: useLiveMode Hook

## 1. Vai trò trong hệ thống

`useLiveMode` là hook đơn giản nhưng quan trọng trong hệ thống **Real-time/Live Updates** của Refine. Nó xác định chế độ xử lý live events: tự động cập nhật (`auto`), thủ công (`manual`), hoặc tắt (`off`).

### Vị trí trong kiến trúc:

```
┌─────────────────────────────────────────────────────────────┐
│                    REFINE LIVE SYSTEM                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              CONFIGURATION LAYER                    │     │
│  │                                                      │     │
│  │  <Refine liveMode="auto" />  ← Global Config       │     │
│  │            │                                        │     │
│  │            └──► RefineContext                       │     │
│  │                       │                             │     │
│  │                       ▼                             │     │
│  │            ┌──────────────────────┐                 │     │
│  │            │   useLiveMode()      │                 │     │
│  │            │                      │                 │     │
│  │            │  Resolve liveMode:   │                 │     │
│  │            │  prop > context      │                 │     │
│  │            └──────────┬───────────┘                 │     │
│  └───────────────────────┼──────────────────────────────┘     │
│                          │                                    │
│                          ▼                                    │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              CONSUMPTION LAYER                       │     │
│  │                                                       │     │
│  │  const liveMode = useLiveMode(propValue);            │     │
│  │                                                       │     │
│  │  Switch on liveMode:                                 │     │
│  │  ┌──────────────────────────────────────────┐       │     │
│  │  │ "auto"   → Auto invalidate cache         │       │     │
│  │  │ "manual" → Notify but don't invalidate   │       │     │
│  │  │ "off"    → Don't subscribe to events     │       │     │
│  │  └──────────────────────────────────────────┘       │     │
│  └─────────────────────────────────────────────────────┘     │
│                          │                                    │
│  ┌───────────────────────┼──────────────────────────────┐    │
│  │                       ▼                               │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │    useResourceSubscription                   │    │    │
│  │  │                                              │    │    │
│  │  │  if (liveMode === "auto") {                 │    │    │
│  │  │    invalidate({ ... });                     │    │    │
│  │  │  }                                           │    │    │
│  │  │                                              │    │    │
│  │  │  if (liveMode === "manual") {               │    │    │
│  │  │    onLiveEvent(event);  // Just notify      │    │    │
│  │  │  }                                           │    │    │
│  │  │                                              │    │    │
│  │  │  if (liveMode === "off") {                  │    │    │
│  │  │    return;  // No subscription              │    │    │
│  │  │  }                                           │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                       │                              │    │
│  │                       ▼                              │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │         Live Provider (WebSocket)            │    │    │
│  │  │                                              │    │    │
│  │  │  • Ably                                      │    │    │
│  │  │  • Pusher                                    │    │    │
│  │  │  • Socket.io                                 │    │    │
│  │  │  • Custom WebSocket                          │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

LUỒNG QUYẾT ĐỊNH:
┌─────────────────────────────────────────────────────────────┐
│  Component Props                                             │
│  const { data } = useList({                                  │
│    resource: "posts",                                        │
│    liveMode: "auto"  ← Prop liveMode                        │
│  });                                                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  useLiveMode Resolution                                      │
│                                                               │
│  const liveMode = useLiveMode(propLiveMode);                 │
│                                                               │
│  Logic: propLiveMode ?? contextLiveMode                      │
│                                                               │
│  Priority:                                                   │
│  1. Prop value (highest)                                     │
│  2. Context value                                            │
│  3. undefined → default "off"                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────┐     ┌─────────────┐
│ Prop: "off" │     │ Prop: null  │
│             │     │             │
│ Result:     │     │ Context:    │
│   "off"     │     │   "auto"    │
│             │     │             │
│ Override!   │     │ Result:     │
│             │     │   "auto"    │
└─────────────┘     └─────────────┘
```

### Ví dụ thực tế:

Giống như cài đặt thông báo trên điện thoại:

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Notification Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global setting (Context)
<Phone notificationMode="auto">
  {/* Mọi app tự động show notification */}

  <WhatsApp />  {/* Auto notify ✅ */}
  <Email />     {/* Auto notify ✅ */}

  {/* Override cho app cụ thể */}
  <Instagram notificationMode="manual" />  {/* Manual - check manually */}
  <Twitter notificationMode="off" />       {/* Off - no notifications */}
</Phone>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG REFINE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global setting
<Refine liveMode="auto">
  {/* Mọi query tự động update khi có live event */}

  {/* List tự động update */}
  <PostList />  {/* liveMode = "auto" from context */}

  {/* Detail page - manual control */}
  <PostDetail liveMode="manual" />  {/* Override to "manual" */}

  {/* Analytics - no real-time */}
  <Analytics liveMode="off" />  {/* Override to "off" */}
</Refine>
```

## 2. Luồng hoạt động chi tiết

### Sơ đồ luồng đầy đủ:

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: SETUP CONTEXT (App Bootstrap)                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  <Refine                                                      │
│    liveMode="auto"                                           │
│    liveProvider={liveProvider}                               │
│  >                                                            │
│    <App />                                                    │
│  </Refine>                                                    │
│                                                               │
│  → RefineContext.liveMode = "auto"                           │
│  → LiveContext.liveProvider = liveProvider                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: COMPONENT RENDER                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  function PostList() {                                       │
│    const { data } = useList({                                │
│      resource: "posts",                                      │
│      liveMode: undefined,  // Không pass prop                │
│    });                                                        │
│                                                               │
│    // Internally, useList gọi useLiveMode                    │
│  }                                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3: RESOLVE LIVE MODE                                   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  export const useLiveMode = (                                │
│    liveMode: "auto" | "manual" | "off" | undefined          │
│  ) => {                                                       │
│    // 3.1: Get context value                                 │
│    const { liveMode: liveModeFromContext } =                 │
│      useContext(RefineContext);                              │
│                                                               │
│    // 3.2: Return with priority                              │
│    return liveMode ?? liveModeFromContext;                   │
│    //     ^^^^^^^^    ^^^^^^^^^^^^^^^^^^^                    │
│    //     Prop (1st)  Context (fallback)                     │
│  };                                                           │
│                                                               │
│  CASE 1: liveMode = "off"                                    │
│    → Return "off"  (prop override)                           │
│                                                               │
│  CASE 2: liveMode = undefined                                │
│    → Return liveModeFromContext = "auto"                     │
│                                                               │
│  CASE 3: liveMode = "manual"                                 │
│    → Return "manual"  (prop override)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 4: USE RESOLVED VALUE                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  // In useList/useOne/useMany hooks                          │
│  const resolvedLiveMode = useLiveMode(propLiveMode);         │
│                                                               │
│  // Pass to useResourceSubscription                          │
│  useResourceSubscription({                                   │
│    resource: "posts",                                        │
│    liveMode: resolvedLiveMode,  // "auto" | "manual" | "off"│
│    ...                                                        │
│  });                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬──────────────┐
         │             │             │              │
         ▼             ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │  "off" │   │ "manual"│   │  "auto" │   │undefined│
    └────┬───┘   └────┬────┘   └────┬────┘   └────┬────┘
         │            │              │             │
         │            │              │             │
         ▼            ▼              ▼             ▼

═══════════════════════════════════════════════════════════════
SCENARIO 1: liveMode = "off"
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Không subscribe to live events                              │
│                                                               │
│  useResourceSubscription({                                   │
│    liveMode: "off",                                          │
│    ...                                                        │
│  });                                                          │
│                                                               │
│  // Internal check:                                          │
│  if (liveMode && liveMode !== "off" && enabled) {           │
│    subscription = liveProvider?.subscribe(...);              │
│  }                                                            │
│  // → Condition FALSE → No subscription                      │
│                                                               │
│  ✅ Use case:                                                 │
│    - Static data (categories, countries)                     │
│    - Archive pages                                           │
│    - Performance optimization (reduce WebSocket connections) │
│    - Development/testing                                     │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
SCENARIO 2: liveMode = "manual"
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Subscribe nhưng KHÔNG tự động invalidate cache              │
│                                                               │
│  useResourceSubscription({                                   │
│    liveMode: "manual",                                       │
│    onLiveEvent: (event) => {                                 │
│      console.log("New event:", event);                       │
│      // User decides what to do                              │
│    }                                                          │
│  });                                                          │
│                                                               │
│  // Internal logic:                                          │
│  const callback = (event: LiveEvent) => {                    │
│    if (liveMode === "auto") {                                │
│      invalidate({ ... });  // ❌ SKIP for "manual"          │
│    }                                                          │
│                                                               │
│    onLiveEvent?.(event);  // ✅ Call user callback           │
│  };                                                           │
│                                                               │
│  subscription = liveProvider.subscribe({                     │
│    channel: "posts",                                         │
│    callback                                                  │
│  });                                                          │
│                                                               │
│  ✅ Use case:                                                 │
│    - Show notification toast                                 │
│    - User-triggered refresh                                  │
│    - Batch updates (collect events then refresh)             │
│    - Custom logic                                            │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
SCENARIO 3: liveMode = "auto"
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Subscribe VÀ tự động invalidate cache                       │
│                                                               │
│  useResourceSubscription({                                   │
│    liveMode: "auto",                                         │
│  });                                                          │
│                                                               │
│  // Internal logic:                                          │
│  const callback = (event: LiveEvent) => {                    │
│    if (liveMode === "auto") {                                │
│      invalidate({  // ✅ AUTO INVALIDATE                     │
│        resource: "posts",                                    │
│        invalidates: ["resourceAll"]                          │
│      });                                                      │
│    }                                                          │
│                                                               │
│    onLiveEvent?.(event);  // ✅ Also call callback           │
│  };                                                           │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │  LIVE EVENT FLOW:                             │           │
│  │                                                │           │
│  │  1. WebSocket receives event                  │           │
│  │     ↓                                          │           │
│  │  2. liveProvider.subscribe callback            │           │
│  │     ↓                                          │           │
│  │  3. Auto invalidate cache                      │           │
│  │     ↓                                          │           │
│  │  4. React Query refetch                        │           │
│  │     ↓                                          │           │
│  │  5. Component re-render with new data          │           │
│  │     ↓                                          │           │
│  │  6. UI updated! ✨                             │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│  ✅ Use case:                                                 │
│    - Real-time dashboards                                    │
│    - Chat applications                                       │
│    - Collaborative editing                                   │
│    - Live notifications                                      │
│    - Stock/crypto prices                                     │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
SCENARIO 4: liveMode = undefined
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Fallback to context value                                   │
│                                                               │
│  const liveMode = useLiveMode(undefined);                    │
│  //                            ^^^^^^^^^                     │
│  // No prop → use context                                    │
│                                                               │
│  return undefined ?? contextLiveMode;                        │
│  //                  ^^^^^^^^^^^^^^^^                        │
│  //                  "auto" | "manual" | "off" | undefined   │
│                                                               │
│  If contextLiveMode = "auto":                                │
│    → Behaves like SCENARIO 3                                 │
│                                                               │
│  If contextLiveMode = undefined:                             │
│    → Default to "off" (no subscription)                      │
│                                                               │
│  ✅ Use case:                                                 │
│    - Default behavior                                        │
│    - Inherit global setting                                  │
│    - Most common case                                        │
└─────────────────────────────────────────────────────────────┘
```

### Truth Table - LiveMode Resolution:

```
┌─────────────┬──────────────────┬─────────────┬────────────┐
│ Prop Value  │ Context Value    │ Result      │ Behavior   │
├─────────────┼──────────────────┼─────────────┼────────────┤
│ "auto"      │ "off"            │ "auto"      │ Subscribe  │
│ "auto"      │ "manual"         │ "auto"      │ Subscribe  │
│ "auto"      │ "auto"           │ "auto"      │ Subscribe  │
│ "auto"      │ undefined        │ "auto"      │ Subscribe  │
├─────────────┼──────────────────┼─────────────┼────────────┤
│ "manual"    │ "auto"           │ "manual"    │ Subscribe  │
│ "manual"    │ "off"            │ "manual"    │ Subscribe  │
│ "manual"    │ "manual"         │ "manual"    │ Subscribe  │
│ "manual"    │ undefined        │ "manual"    │ Subscribe  │
├─────────────┼──────────────────┼─────────────┼────────────┤
│ "off"       │ "auto"           │ "off"       │ No sub     │
│ "off"       │ "manual"         │ "off"       │ No sub     │
│ "off"       │ "off"            │ "off"       │ No sub     │
│ "off"       │ undefined        │ "off"       │ No sub     │
├─────────────┼──────────────────┼─────────────┼────────────┤
│ undefined   │ "auto"           │ "auto"      │ Subscribe  │
│ undefined   │ "manual"         │ "manual"    │ Subscribe  │
│ undefined   │ "off"            │ "off"       │ No sub     │
│ undefined   │ undefined        │ undefined   │ No sub*    │
└─────────────┴──────────────────┴─────────────┴────────────┘

* undefined được treat như "off" trong useResourceSubscription
```

## 3. Design Patterns được sử dụng

### Pattern 1: Default Value Pattern (Mẫu Giá trị Mặc định)

**Khái niệm:**
Cung cấp giá trị mặc định khi không có giá trị được chỉ định.

**Tại sao dùng:**
- User không cần config mọi component
- Có global setting, có thể override local
- Fallback mechanism đảm bảo luôn có value

**Cách implement:**

```typescript
export const useLiveMode = (
  liveMode: LiveModeProps["liveMode"]
): LiveModeProps["liveMode"] => {
  // Get default value from context
  const { liveMode: liveModeFromContext } = useContext(RefineContext);

  // Return prop value hoặc fallback to context
  return liveMode ?? liveModeFromContext;
  //     ^^^^^^^^    ^^^^^^^^^^^^^^^^^^^
  //     Explicit    Default/Fallback
};
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Theme settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global default
<App theme="dark">
  {/* Mọi component dùng dark theme */}

  <Header />             {/* theme = "dark" (default) */}
  <Sidebar />            {/* theme = "dark" (default) */}

  {/* Override cho component cụ thể */}
  <Content theme="light" />  {/* Override to "light" */}
</App>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG useTheme:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useTheme(propTheme) {
  const { theme: contextTheme } = useContext(ThemeContext);
  return propTheme ?? contextTheme;
  //     ^^^^^^^^^    ^^^^^^^^^^^^
  //     "light"      "dark" (default)
  // → Returns "light" (prop override)
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useLiveMode:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global default
<Refine liveMode="auto">
  {/* Mọi query auto update */}

  <PostList />              {/* liveMode = "auto" (default) */}
  <UserList />              {/* liveMode = "auto" (default) */}

  {/* Override */}
  <AnalyticsDashboard liveMode="off" />  {/* Override */}
</Refine>

// In component:
function PostList({ liveMode: propLiveMode }) {
  const resolvedLiveMode = useLiveMode(propLiveMode);
  //                       ^^^^^^^^^^^^^^^^^^^^^^^^
  //                       undefined ?? "auto" = "auto"
}
```

**Lợi ích:**
- **Convenience:** Không cần config từng component
- **Flexibility:** Có thể override khi cần
- **Consistency:** Behavior consistent across app
- **Maintainability:** Đổi global setting = đổi toàn bộ app

### Pattern 2: Context Pattern (Mẫu Ngữ cảnh)

**Khái niệm:**
Sử dụng React Context để share data giữa components mà không cần pass props qua nhiều levels.

**Tại sao dùng:**
- Tránh prop drilling
- Global configuration accessible từ mọi nơi
- Dependency injection

**Cách hoạt động:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 1: Define Context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// In RefineContext
export const RefineContext = createContext<IRefineContext>({
  liveMode: undefined,
  // ... other config
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 2: Provide Context Value
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<Refine liveMode="auto">
  {/* RefineContext.Provider value={{ liveMode: "auto" }} */}
  <App />
</Refine>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STEP 3: Consume Context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useLiveMode = (liveMode) => {
  // Access context value
  const { liveMode: liveModeFromContext } = useContext(RefineContext);
  //                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                        Read from context tree

  return liveMode ?? liveModeFromContext;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENT TREE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<RefineContext.Provider value={{ liveMode: "auto" }}>
  <App>
    <Dashboard>
      <PostList>
        <useList>
          <useLiveMode />  ← Can access liveMode here!
        </useList>
      </PostList>
    </Dashboard>
  </App>
</RefineContext.Provider>

// Không cần pass liveMode qua:
// App → Dashboard → PostList → useList → useLiveMode
// Direct access via context! ✅
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: User Authentication Context
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ WITHOUT Context - Prop Drilling Hell
<App user={currentUser}>
  <Layout user={currentUser}>
    <Sidebar user={currentUser}>
      <Menu user={currentUser}>
        <MenuItem>
          {/* Cuối cùng mới dùng user! */}
          {currentUser.name}
        </MenuItem>
      </Menu>
    </Sidebar>
  </Layout>
</App>

// ✅ WITH Context - Clean
const AuthContext = createContext();

<AuthContext.Provider value={{ user: currentUser }}>
  <App>
    <Layout>
      <Sidebar>
        <Menu>
          <MenuItem>
            {/* Direct access! */}
            {useContext(AuthContext).user.name}
          </MenuItem>
        </Menu>
      </Sidebar>
    </Layout>
  </App>
</AuthContext.Provider>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING với useLiveMode:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Prop drilling:
<Refine liveMode="auto">
  <App liveMode="auto">
    <PostList liveMode="auto">
      <useList liveMode="auto">
        {/* Finally use it */}
      </useList>
    </PostList>
  </App>
</Refine>

// ✅ Context:
<Refine liveMode="auto">
  {/* RefineContext */}
  <App>
    <PostList>
      <useList>
        {/* useLiveMode() → access context directly */}
      </useList>
    </PostList>
  </App>
</Refine>
```

**Lợi ích:**
- **No Prop Drilling:** Không cần pass props qua nhiều levels
- **Cleaner Code:** Components không cần nhận props không dùng
- **Centralized Config:** Một nơi quản lý config
- **Easy Updates:** Đổi context value → tất cả consumers update

### Pattern 3: Override Pattern (Mẫu Ghi đè)

**Khái niệm:**
Cho phép ghi đè (override) default behavior bằng cách truyền explicit value.

**Tại sao dùng:**
- Flexibility - có thể customize per-component
- Granular control - control từng use case riêng
- Backward compatibility - default vẫn hoạt động

**Cách implement:**

```typescript
export const useLiveMode = (liveMode) => {
  const { liveMode: liveModeFromContext } = useContext(RefineContext);

  // Nullish coalescing operator (??)
  // Returns liveMode if truthy, else liveModeFromContext
  return liveMode ?? liveModeFromContext;
  //     ^^^^^^^^
  //     Override value (highest priority)
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OVERRIDE SCENARIOS:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Context: "auto"

// Case 1: No override
useLiveMode(undefined)  // → "auto" (use context)

// Case 2: Override to "off"
useLiveMode("off")      // → "off" (override wins)

// Case 3: Override to "manual"
useLiveMode("manual")   // → "manual" (override wins)

// Case 4: Explicit "auto"
useLiveMode("auto")     // → "auto" (same as context, but explicit)
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Font size settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global default: fontSize = 16px
<App fontSize={16}>
  <Header />               {/* 16px (default) */}
  <Content fontSize={14} /> {/* 14px (override smaller) */}
  <Footer fontSize={12} />  {/* 12px (override smaller) */}
</App>

function useFontSize(propFontSize) {
  const { fontSize: contextFontSize } = useContext(AppContext);
  return propFontSize ?? contextFontSize;
  //     ^^^^^^^^^^^^
  //     Override if provided
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING với useLiveMode:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global: liveMode = "auto"
<Refine liveMode="auto">
  {/* Real-time dashboard - keep auto */}
  <Dashboard />  {/* "auto" */}

  {/* Analytics - disable live updates for performance */}
  <Analytics liveMode="off" />  {/* Override to "off" */}

  {/* Detail page - manual refresh button */}
  <PostDetail liveMode="manual" />  {/* Override to "manual" */}
</Refine>

// Real-world use case:
function AnalyticsPage() {
  const { data } = useList({
    resource: "analytics",
    liveMode: "off",  // ← Override
    // Lý do: Analytics data heavy, không cần real-time
    // Refresh manually thay vì auto
  });
}
```

**Lợi ích:**
- **Flexibility:** Per-component customization
- **Performance:** Disable live updates khi không cần
- **User Experience:** Control behavior theo context
- **Developer Experience:** Explicit = dễ hiểu

### Pattern 4: Single Responsibility Pattern (Mẫu Trách nhiệm Đơn)

**Khái niệm:**
Một function/module chỉ làm một việc duy nhất và làm tốt việc đó.

**Tại sao dùng:**
- Testability - dễ test
- Readability - dễ đọc hiểu
- Maintainability - dễ maintain
- Reusability - dễ reuse

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ GOOD - Single Responsibility
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// useLiveMode: CHỈ resolve liveMode value
export const useLiveMode = (liveMode) => {
  const { liveMode: liveModeFromContext } = useContext(RefineContext);
  return liveMode ?? liveModeFromContext;
};

// useSubscription: CHỈ subscribe to events
export const useSubscription = ({ channel, onLiveEvent, ... }) => {
  const { liveProvider } = useContext(LiveContext);

  useEffect(() => {
    const subscription = liveProvider?.subscribe({ ... });
    return () => liveProvider?.unsubscribe(subscription);
  }, []);
};

// useResourceSubscription: Combine above + invalidation logic
export const useResourceSubscription = ({ liveMode, ... }) => {
  const resolvedLiveMode = useLiveMode(liveMode);  // Delegate
  const invalidate = useInvalidate();

  useSubscription({
    onLiveEvent: (event) => {
      if (resolvedLiveMode === "auto") {
        invalidate({ ... });
      }
    }
  });
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ❌ BAD - Multiple Responsibilities
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useLiveMode = (liveMode) => {
  const { liveMode: contextLiveMode } = useContext(RefineContext);
  const { liveProvider } = useContext(LiveContext);
  const invalidate = useInvalidate();

  // 1. Resolve liveMode ✅
  const resolved = liveMode ?? contextLiveMode;

  // 2. Subscribe to events ❌ (should be separate)
  useEffect(() => {
    liveProvider?.subscribe({ ... });
  }, []);

  // 3. Invalidate cache ❌ (should be separate)
  const handleEvent = () => {
    invalidate({ ... });
  };

  // Too many responsibilities!
  return resolved;
};
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Restaurant Kitchen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ✅ GOOD - Single Responsibility
class Chef {
  cook() { /* Chỉ nấu ăn */ }
}

class Waiter {
  serve() { /* Chỉ phục vụ */ }
}

class Cashier {
  processBill() { /* Chỉ tính tiền */ }
}

// Order flow:
const chef = new Chef();
const waiter = new Waiter();
const cashier = new Cashier();

chef.cook();           // Chef nấu
waiter.serve();        // Waiter phục vụ
cashier.processBill(); // Cashier tính tiền

// ❌ BAD - Multiple Responsibilities
class SuperEmployee {
  cook() { }
  serve() { }
  processBill() { }
  cleanTable() { }
  // Một người làm hết! → Quá tải, dễ lỗi
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING với useLiveMode:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ✅ Refine's approach - Separated concerns:

// 1. useLiveMode - Resolve value ONLY
const liveMode = useLiveMode(propLiveMode);

// 2. useSubscription - Subscribe ONLY
useSubscription({ channel, onLiveEvent });

// 3. useInvalidate - Invalidate ONLY
const invalidate = useInvalidate();

// 4. useResourceSubscription - Orchestrate
useResourceSubscription({ liveMode, ... });
```

**Lợi ích:**
- **Testability:** Dễ test isolated
- **Reusability:** Reuse ở nhiều nơi
- **Maintainability:** Dễ fix bug
- **Understandability:** Dễ hiểu purpose

### Pattern 5: Null Coalescing Pattern (Mẫu Hợp nhất Null)

**Khái niệm:**
Sử dụng `??` operator để return first non-nullish value.

**Tại sao dùng:**
- Safe fallback mechanism
- Ngắn gọn hơn if-else
- Type-safe

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NULLISH COALESCING (??)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useLiveMode = (liveMode) => {
  const { liveMode: liveModeFromContext } = useContext(RefineContext);

  // ?? returns right side if left is null/undefined
  return liveMode ?? liveModeFromContext;
  //              ^^
  //              Nullish coalescing operator
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VS LOGICAL OR (||)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// WRONG: Using || (logical OR)
return liveMode || liveModeFromContext;
//              ^^
//              Problem: "off" is falsy!

// Examples:
liveMode = "off"
liveMode || context  // → context ❌ (wrong!)
// "off" is falsy → returns context instead

liveMode ?? context  // → "off" ✅ (correct!)
// "off" is not null/undefined → returns "off"

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPARISON TABLE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const context = "auto";

┌──────────────┬────────────┬────────────┬──────────┐
│ liveMode     │ liveMode?? │ liveMode|| │ Correct? │
├──────────────┼────────────┼────────────┼──────────┤
│ "auto"       │ "auto"     │ "auto"     │ ✅ Both  │
│ "manual"     │ "manual"   │ "manual"   │ ✅ Both  │
│ "off"        │ "off"      │ "auto"     │ ✅ ??    │
│ undefined    │ "auto"     │ "auto"     │ ✅ Both  │
│ null         │ "auto"     │ "auto"     │ ✅ Both  │
│ 0            │ 0          │ "auto"     │ ✅ ??    │
│ ""           │ ""         │ "auto"     │ ✅ ??    │
│ false        │ false      │ "auto"     │ ✅ ??    │
└──────────────┴────────────┴────────────┴──────────┘

// ?? is SAFER for string values like "off"!
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Default Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User settings
const userSettings = {
  volume: 0,        // 0 is valid!
  notifications: false,  // false is valid!
  theme: undefined  // Not set
};

const defaults = {
  volume: 50,
  notifications: true,
  theme: "light"
};

// ❌ WRONG - Using ||
const volume = userSettings.volume || defaults.volume;
//             0 || 50 = 50 ❌
// User wants 0 (mute) but gets 50!

const notifications = userSettings.notifications || defaults.notifications;
//                    false || true = true ❌
// User turned off but gets true!

// ✅ CORRECT - Using ??
const volume = userSettings.volume ?? defaults.volume;
//             0 ?? 50 = 0 ✅
// Respects user's choice of 0

const notifications = userSettings.notifications ?? defaults.notifications;
//                    false ?? true = false ✅
// Respects user's choice of false

const theme = userSettings.theme ?? defaults.theme;
//            undefined ?? "light" = "light" ✅
// Falls back to default when undefined

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG useLiveMode:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

return liveMode ?? liveModeFromContext;

// "off" ?? "auto" = "off" ✅
// undefined ?? "auto" = "auto" ✅
// "manual" ?? "auto" = "manual" ✅
```

**Lợi ích:**
- **Correctness:** Handles falsy values correctly
- **Type Safety:** TypeScript understands ?? better
- **Clarity:** Intention clear (null/undefined fallback)
- **Safety:** Prevents bugs with falsy values

## 4. Các tính năng chính

### 1. Three LiveMode Values

```typescript
type LiveMode = "auto" | "manual" | "off";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// "auto" - Automatic cache invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { data } = useList({
  resource: "posts",
  liveMode: "auto"
});

// When live event received:
// 1. Subscribe to WebSocket ✅
// 2. Invalidate cache automatically ✅
// 3. Refetch data ✅
// 4. UI updates ✅

// Use cases:
// • Real-time dashboards
// • Chat applications
// • Live notifications
// • Collaborative editing

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// "manual" - Manual control
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { data, refetch } = useList({
  resource: "posts",
  liveMode: "manual",
  onLiveEvent: (event) => {
    // Show notification
    toast.info(`New post: ${event.payload.title}`);

    // User decides when to refresh
    if (confirm("Refresh data?")) {
      refetch();
    }
  }
});

// When live event received:
// 1. Subscribe to WebSocket ✅
// 2. Call onLiveEvent callback ✅
// 3. NO automatic invalidation ❌
// 4. User controls refresh ✅

// Use cases:
// • User-triggered refresh
// • Show notification first
// • Batch updates
// • Prevent jarring UX

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// "off" - Disable live updates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { data } = useList({
  resource: "categories",  // Static data
  liveMode: "off"
});

// When live event received:
// 1. NO subscription ❌
// 2. NO callbacks ❌
// 3. No WebSocket connection ✅

// Use cases:
// • Static data (categories, countries)
// • Archive pages
// • Performance optimization
// • Development/testing
```

### 2. Prop Override Context

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Global configuration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

<Refine liveMode="auto">
  {/* Default: auto for all */}
</Refine>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Per-hook override
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PostList() {
  // Inherit from context ("auto")
  const { data: posts } = useList({
    resource: "posts"
    // liveMode: undefined → use context "auto"
  });

  // Override to "manual"
  const { data: comments } = useList({
    resource: "comments",
    liveMode: "manual"  // Override
  });

  // Override to "off"
  const { data: categories } = useList({
    resource: "categories",
    liveMode: "off"  // Override
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Resolution priority:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 1. Hook prop (highest)
useList({ liveMode: "off" })

// 2. Context value
<Refine liveMode="auto" />

// 3. Default (undefined → treated as "off")
```

### 3. Simple API

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook signature
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useLiveMode = (
  liveMode?: "auto" | "manual" | "off"
): "auto" | "manual" | "off" | undefined

// Input: optional liveMode
// Output: resolved liveMode

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage examples
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// In data hooks (internal)
function useList(props) {
  const liveMode = useLiveMode(props.liveMode);

  useResourceSubscription({
    liveMode,
    // ...
  });
}

// Direct usage (rare)
function CustomComponent({ liveMode: propLiveMode }) {
  const resolvedLiveMode = useLiveMode(propLiveMode);

  console.log("Current liveMode:", resolvedLiveMode);
}
```

## 5. Use Cases thực tế

### Use Case 1: Real-time Dashboard

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Admin dashboard với real-time metrics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global: enable live updates
<Refine
  liveMode="auto"
  liveProvider={liveProvider}
>
  <App />
</Refine>

// Dashboard component
function AdminDashboard() {
  // Auto-update metrics
  const { data: metrics } = useList({
    resource: "metrics"
    // liveMode = "auto" (from context)
  });

  // Auto-update active users
  const { data: activeUsers } = useList({
    resource: "active_users"
    // liveMode = "auto" (from context)
  });

  // Auto-update recent orders
  const { data: recentOrders } = useList({
    resource: "orders",
    filters: [{ field: "status", operator: "eq", value: "pending" }]
    // liveMode = "auto" (from context)
  });

  return (
    <Grid>
      <MetricsCard data={metrics} />
      {/* Updates automatically when metrics change */}

      <ActiveUsersWidget data={activeUsers} />
      {/* Updates automatically when users join/leave */}

      <RecentOrdersTable data={recentOrders} />
      {/* Updates automatically when new orders arrive */}
    </Grid>
  );
}

// WebSocket event flow:
// 1. New order created on server
// 2. Server publishes event to WebSocket
// 3. liveProvider receives event
// 4. useResourceSubscription invalidates cache
// 5. React Query refetches
// 6. Dashboard updates ✨
```

### Use Case 2: Chat Application

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Real-time chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChatRoom({ roomId }) {
  // Auto-update messages
  const { data: messages } = useList({
    resource: "messages",
    liveMode: "auto",  // Explicit auto
    filters: [
      { field: "roomId", operator: "eq", value: roomId }
    ]
  });

  // Auto-update typing indicators
  const { data: typingUsers } = useList({
    resource: "typing_users",
    liveMode: "auto",
    filters: [
      { field: "roomId", operator: "eq", value: roomId }
    ]
  });

  return (
    <div>
      <MessageList messages={messages} />
      {/* New messages appear instantly */}

      {typingUsers?.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}
      {/* "User is typing..." appears instantly */}
    </div>
  );
}
```

### Use Case 3: Manual Refresh với Notification

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: News feed với notification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NewsFeed() {
  const { data, refetch } = useList({
    resource: "articles",
    liveMode: "manual",  // Manual control
    onLiveEvent: (event) => {
      if (event.type === "created") {
        // Show notification
        toast.success(
          "New articles available!",
          {
            action: {
              label: "Refresh",
              onClick: () => refetch()
            }
          }
        );
      }
    }
  });

  return (
    <div>
      <ArticleList articles={data} />
      {/* User sees notification */}
      {/* User clicks "Refresh" button */}
      {/* Data updates */}
    </div>
  );
}

// Benefits:
// • User không bị "jarred" by sudden updates
// • User control khi nào update
// • Better UX for reading content
```

### Use Case 4: Mixed Mode Application

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: E-commerce với different sections
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global: auto (default)
<Refine liveMode="auto" liveProvider={liveProvider}>
  <App />
</Refine>

function EcommerceDashboard() {
  // AUTO: Real-time inventory
  const { data: inventory } = useList({
    resource: "inventory"
    // liveMode = "auto" → stock updates in real-time
  });

  // AUTO: Real-time orders
  const { data: orders } = useList({
    resource: "orders",
    filters: [{ field: "status", operator: "eq", value: "pending" }]
    // liveMode = "auto" → new orders appear immediately
  });

  // MANUAL: Products (notify user)
  const { data: products, refetch: refetchProducts } = useList({
    resource: "products",
    liveMode: "manual",  // Override to manual
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        showNotification("Products updated. Refresh?");
      }
    }
  });

  // OFF: Categories (static)
  const { data: categories } = useList({
    resource: "categories",
    liveMode: "off"  // Override to off
    // Categories rarely change, no need for live updates
  });

  return (
    <div>
      <InventoryWidget data={inventory} />
      {/* Auto-updates ✨ */}

      <OrdersTable data={orders} />
      {/* Auto-updates ✨ */}

      <ProductsGrid data={products} />
      {/* Manual refresh 🔄 */}

      <CategoryFilter categories={categories} />
      {/* Static 📌 */}
    </div>
  );
}
```

### Use Case 5: Performance Optimization

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Large table với pagination
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LargeDataTable() {
  const [page, setPage] = useState(1);

  const { data } = useList({
    resource: "transactions",  // 1M+ records
    pagination: { current: page, pageSize: 50 },
    liveMode: "off",  // Disable live updates
    // Lý do:
    // 1. Too many WebSocket connections (1000+ users)
    // 2. High-frequency updates (100+ events/sec)
    // 3. User chỉ quan tâm page hiện tại
    // 4. Manual refresh button thay thế
  });

  return (
    <div>
      <Table data={data} />
      <Pagination current={page} onChange={setPage} />
      <RefreshButton onClick={() => refetch()} />
    </div>
  );
}

// Benefits:
// • Reduce WebSocket connections
// • Lower server load
// • Better mobile performance
// • Lower battery usage
```

### Use Case 6: Development vs Production

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Different modes per environment
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const liveMode = process.env.NODE_ENV === "production"
  ? "auto"    // Production: enable live updates
  : "off";    // Development: disable (no WebSocket server)

<Refine liveMode={liveMode}>
  <App />
</Refine>

// Development:
// • liveMode = "off"
// • No WebSocket connections
// • Faster hot reload
// • Easier debugging

// Production:
// • liveMode = "auto"
// • Real-time updates
// • Better UX
```

## 6. Quyết định kiến trúc

### Quyết định 1: Tại sao dùng Nullish Coalescing (??) thay vì Logical OR (||)?

**Vấn đề:**
String "off" is falsy, `||` operator sẽ không hoạt động đúng.

**Các phương án:**

| Operator | Code | "off" behavior | Correct? |
|----------|------|----------------|----------|
| `\|\|` | `liveMode \|\| context` | Returns context ❌ | NO |
| `??` | `liveMode ?? context` | Returns "off" ✅ | YES |
| `if-else` | `if (liveMode !== undefined) return liveMode; else return context;` | Returns "off" ✅ | YES |

**Quyết định:** Dùng Nullish Coalescing (??)

**Lý do:**
- Handles "off" correctly
- Concise (1 line vs 3 lines if-else)
- Modern JavaScript/TypeScript feature
- Type-safe

### Quyết định 2: Override prop vs merge behaviors?

**Vấn đề:**
Nếu prop = "off" và context = "auto", behavior nào win?

**Các phương án:**

| Phương án | Behavior | Complexity | Flexibility |
|-----------|----------|------------|-------------|
| **Prop override** ✅ | Prop always wins | Simple | High |
| **Merge** | Combine behaviors | Complex | Medium |
| **Context only** | Ignore prop | Simple | Low |

**Quyết định:** Prop override

**Code:**
```typescript
return liveMode ?? liveModeFromContext;
//     ^^^^^^^^ (highest priority)
```

**Lý do:**
- Simple mental model
- Explicit control
- Follows React conventions (prop > context)
- Predictable behavior

### Quyết định 3: Return type - strict vs loose?

**Vấn đề:**
Có nên cho phép return `undefined`?

**Các phương án:**

| Return type | Code | Pros | Cons |
|-------------|------|------|------|
| `"auto" \| "manual" \| "off"` | Force non-null | Type-safe | Need default |
| `"auto" \| "manual" \| "off" \| undefined` ✅ | Allow undefined | Flexible | Need null checks |

**Quyết định:** Allow undefined

**Code:**
```typescript
export const useLiveMode = (
  liveMode?: "auto" | "manual" | "off"
): "auto" | "manual" | "off" | undefined
```

**Lý do:**
- Context có thể không provide liveMode
- Undefined được treat như "off" downstream
- Không force default khi không cần
- Truthful type representation

### Quyết định 4: Hook name - useLiveMode vs useResolvedLiveMode?

**Vấn đề:**
Hook name có nên reflect "resolve" behavior?

**Các phương án:**

| Name | Clarity | Brevity | Convention |
|------|---------|---------|------------|
| `useLiveMode` ✅ | Medium | High | ✅ |
| `useResolvedLiveMode` | High | Low | ❌ |
| `useGetLiveMode` | Medium | Medium | ❌ |

**Quyết định:** useLiveMode

**Lý do:**
- Concise
- Follows `useContext`, `useReducer` naming pattern
- "Resolve" is implementation detail
- User doesn't care about resolution logic

## 7. Common Pitfalls (Những lỗi hay gặp)

### Pitfall 1: Dùng Logical OR (||) thay vì Nullish Coalescing (??)

**Vấn đề:**
```typescript
// ❌ SAI
export const useLiveMode = (liveMode) => {
  const { liveMode: contextLiveMode } = useContext(RefineContext);
  return liveMode || contextLiveMode;
  //              ^^ Problem!
};

// Test:
useLiveMode("off")  // → Returns context instead of "off" ❌
// "off" is falsy → || returns right side
```

**Hậu quả:**
- User set liveMode="off" nhưng vẫn subscribe
- Unexpected WebSocket connections
- Performance issues

**Giải pháp:**
```typescript
// ✅ ĐÚNG
export const useLiveMode = (liveMode) => {
  const { liveMode: contextLiveMode } = useContext(RefineContext);
  return liveMode ?? contextLiveMode;
  //              ^^ Nullish coalescing
};

useLiveMode("off")  // → Returns "off" ✅
```

### Pitfall 2: Không hiểu priority của prop vs context

**Vấn đề:**
```typescript
// Context: "auto"
// Prop: "off"

// User expects:
const liveMode = useLiveMode("off");
// → Mong đợi "off"

// Nhưng nếu logic sai:
return liveModeFromContext ?? liveMode;  // ❌ WRONG ORDER
// → Returns "auto" (context wins)
```

**Hậu quả:**
- Prop override không hoạt động
- User confusion
- Cannot disable live updates per-component

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Prop first
return liveMode ?? liveModeFromContext;
//     ^^^^^^^^ (highest priority)

// Test cases:
useLiveMode("off")  // prop="off", context="auto" → "off" ✅
useLiveMode(undefined)  // prop=undefined, context="auto" → "auto" ✅
```

### Pitfall 3: Forget liveProvider setup

**Vấn đề:**
```typescript
// ❌ SAI - No liveProvider
<Refine liveMode="auto">
  <App />
</Refine>

// In component:
const { data } = useList({
  resource: "posts",
  liveMode: "auto"
});
// → liveMode = "auto" but no liveProvider!
// → No error, but subscription silently fails
```

**Hậu quả:**
- No live updates
- Silent failure
- User confusion

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Setup liveProvider
import { liveProvider } from "./liveProvider";

<Refine
  liveMode="auto"
  liveProvider={liveProvider}  // Required!
>
  <App />
</Refine>
```

### Pitfall 4: Set liveMode="auto" cho static data

**Vấn đề:**
```typescript
// ❌ BAD PRACTICE
const { data: categories } = useList({
  resource: "categories",
  liveMode: "auto"  // Categories rarely change!
});

// → Unnecessary WebSocket connection
// → Waste resources
```

**Hậu quả:**
- Performance overhead
- Unnecessary network traffic
- Battery drain on mobile

**Giải pháp:**
```typescript
// ✅ BETTER
const { data: categories } = useList({
  resource: "categories",
  liveMode: "off"  // Static data
});

// Or set context liveMode and override per-resource:
<Refine liveMode="auto">  {/* Default */}
  {/* Override for static resources */}
  <Resource name="categories" list={CategoriesList} />
</Refine>

function CategoriesList() {
  const { data } = useList({
    resource: "categories",
    liveMode: "off"  // Override
  });
}
```

### Pitfall 5: Type error với strict typing

**Vấn đề:**
```typescript
// ❌ TypeScript error
const liveMode: "auto" | "manual" | "off" = useLiveMode(undefined);
//    ^^^^^^^^ Type '"auto" | "manual" | "off" | undefined'
//             is not assignable to type '"auto" | "manual" | "off"
```

**Hậu quả:**
- TypeScript compilation error
- Need type assertion

**Giải pháp:**
```typescript
// ✅ OPTION 1: Allow undefined
const liveMode: "auto" | "manual" | "off" | undefined = useLiveMode(undefined);

// ✅ OPTION 2: Default value
const liveMode = useLiveMode(undefined) ?? "off";
//                                          ^^^^^ Default

// ✅ OPTION 3: Non-null assertion (if sure)
const liveMode = useLiveMode(undefined)!;
//                                      ^ Non-null assertion
```

### Pitfall 6: Calling useLiveMode outside React component

**Vấn đề:**
```typescript
// ❌ SAI - Outside component
const liveMode = useLiveMode("auto");  // Error!

function MyComponent() {
  return <div>{liveMode}</div>;
}
```

**Hậu quả:**
- "Hooks can only be called inside function components" error
- App crashes

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Inside component
function MyComponent() {
  const liveMode = useLiveMode("auto");  // ✅
  return <div>{liveMode}</div>;
}
```

## 8. Performance Considerations

### 1. Minimal Overhead

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLiveMode is extremely lightweight
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useLiveMode = (liveMode) => {
  const { liveMode: contextLiveMode } = useContext(RefineContext);
  return liveMode ?? contextLiveMode;
};

// Only 2 operations:
// 1. useContext (O(1) - instant)
// 2. Nullish coalescing (O(1) - instant)

// Total: ~0.001ms ⚡
```

### 2. No Re-renders

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLiveMode doesn't cause re-renders
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Component({ liveMode }) {
  const resolved = useLiveMode(liveMode);

  // Only re-renders when:
  // 1. liveMode prop changes
  // 2. RefineContext value changes

  // NOT affected by:
  // • Other components
  // • Other context consumers
  // • Live events
}
```

### 3. Disable Live Updates When Needed

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Performance optimization strategies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Strategy 1: Disable per-page
function ArchivePage() {
  const { data } = useList({
    resource: "archived_posts",
    liveMode: "off"  // Static archive
  });
}

// Strategy 2: Disable in background tabs
function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return isVisible;
}

function PostList() {
  const isVisible = usePageVisibility();

  const { data } = useList({
    resource: "posts",
    liveMode: isVisible ? "auto" : "off"
    // Disable when tab hidden
  });
}

// Strategy 3: Conditional based on data size
function LargeDataTable({ count }) {
  const liveMode = count > 10000 ? "off" : "auto";
  // Disable for large datasets

  const { data } = useList({
    resource: "records",
    liveMode
  });
}
```

### 4. Memory Usage

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLiveMode memory footprint
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Per call:
// • Context reference: 8 bytes
// • Return value (string): ~24 bytes
// • Total: ~32 bytes

// For 1000 components:
// • 1000 × 32 bytes = 32KB
// • Negligible! ✅
```

## 9. Testing

### Test 1: Prop Override Context

```typescript
import { renderHook } from "@testing-library/react";
import { TestWrapper } from "@test";
import { useLiveMode } from "./";

describe("useLiveMode", () => {
  it("should override context with prop value", () => {
    const { result } = renderHook(
      () => useLiveMode("off"),
      {
        wrapper: TestWrapper({
          refineProvider: {
            liveMode: "auto"  // Context = "auto"
          }
        })
      }
    );

    expect(result.current).toBe("off");  // Prop wins ✅
  });
});
```

### Test 2: Fallback to Context

```typescript
it("should fallback to context when prop is undefined", () => {
  const { result } = renderHook(
    () => useLiveMode(undefined),
    {
      wrapper: TestWrapper({
        refineProvider: {
          liveMode: "manual"
        }
      })
    }
  );

  expect(result.current).toBe("manual");  // Context value ✅
});
```

### Test 3: All Combinations

```typescript
it("should handle all combinations correctly", () => {
  const testCases = [
    // [prop, context, expected]
    ["auto", "off", "auto"],
    ["manual", "auto", "manual"],
    ["off", "auto", "off"],
    [undefined, "auto", "auto"],
    ["auto", undefined, "auto"],
    [undefined, undefined, undefined]
  ];

  testCases.forEach(([prop, context, expected]) => {
    const { result } = renderHook(
      () => useLiveMode(prop),
      {
        wrapper: TestWrapper({
          refineProvider: { liveMode: context }
        })
      }
    );

    expect(result.current).toBe(expected);
  });
});
```

### Test 4: Integration Test

```typescript
it("should integrate with useResourceSubscription", () => {
  const mockSubscribe = vi.fn();
  const mockUnsubscribe = vi.fn();

  const { result } = renderHook(
    () => {
      const liveMode = useLiveMode("auto");
      useResourceSubscription({
        channel: "posts",
        liveMode,
        resource: "posts",
        // ...
      });
      return liveMode;
    },
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: mockSubscribe,
          unsubscribe: mockUnsubscribe
        }
      })
    }
  );

  expect(result.current).toBe("auto");
  expect(mockSubscribe).toHaveBeenCalled();
});
```

## 10. Kết luận

`useLiveMode` là hook **đơn giản nhưng quan trọng** trong hệ thống real-time của Refine, cung cấp flexible configuration cho live updates.

### Điểm mạnh:

1. **Simple** - Chỉ 3 dòng code, dễ hiểu
2. **Flexible** - Prop override context
3. **Type-safe** - Full TypeScript support
4. **Performant** - Zero overhead
5. **Predictable** - Clear resolution priority

### Key Takeaways:

- **3 modes:** auto (tự động), manual (thủ công), off (tắt)
- **Priority:** prop > context > undefined
- **Use ??** not || (vì "off" is falsy)
- **Disable when not needed** (performance)
- **Setup liveProvider** required for live updates

### Pattern Summary:

| Pattern | Vai trò |
|---------|---------|
| **Default Value** | Fallback to context |
| **Context** | Global configuration |
| **Override** | Per-component control |
| **Single Responsibility** | Only resolve value |
| **Null Coalescing** | Safe fallback |

### Related Hooks:

- `useSubscription` - Low-level subscription
- `useResourceSubscription` - High-level with auto-invalidation
- `usePublish` - Publish live events
- `useList/useOne/useMany` - Data hooks consuming liveMode

---

**Đọc thêm:**
- Refine Live Provider: https://refine.dev/docs/api-reference/core/providers/live-provider/
- WebSocket Integration: https://refine.dev/docs/examples/live-provider/
