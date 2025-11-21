# KIẾN TRÚC: useSubscription Hook

## 1. Vai trò trong hệ thống

`useSubscription` là **low-level hook** cung cấp direct access đến LiveProvider subscription API. Nó là "primitive building block" cho các hooks cấp cao hơn như `useResourceSubscription`.

### Vị trí trong kiến trúc:

```
┌─────────────────────────────────────────────────────────────┐
│         REFINE LIVE SYSTEM - HOOK HIERARCHY                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │          APPLICATION LAYER (High-Level)            │     │
│  │                                                      │     │
│  │  useList() / useOne() / useMany()                  │     │
│  │  ↓                                                  │     │
│  │  • Auto invalidation                               │     │
│  │  • Resource-aware                                  │     │
│  │  • liveMode configuration                          │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │      ORCHESTRATION LAYER (Mid-Level)                │     │
│  │                                                      │     │
│  │  useResourceSubscription()                          │     │
│  │  ↓                                                  │     │
│  │  • Orchestrates subscription + invalidation        │     │
│  │  • Resolves liveMode                               │     │
│  │  • Manages resource params                         │     │
│  │  • Calls useSubscription internally                │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │      PRIMITIVE LAYER (Low-Level) ← THIS HOOK       │     │
│  │                                                      │     │
│  │  useSubscription() ★                                │     │
│  │  ↓                                                  │     │
│  │  • Direct LiveProvider access                      │     │
│  │  • Simple subscribe/unsubscribe                    │     │
│  │  • No business logic                               │     │
│  │  • Building block for other hooks                  │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │         INFRASTRUCTURE LAYER                         │     │
│  │                                                      │     │
│  │  LiveProvider (WebSocket/Ably/Pusher/etc.)         │     │
│  │  ↓                                                  │     │
│  │  • subscribe() - Establish connection              │     │
│  │  • unsubscribe() - Close connection                │     │
│  │  • publish() - Send events                         │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

COMPARISON: useSubscription vs useResourceSubscription

┌─────────────────────────────────────────────────────────────┐
│  useSubscription (Low-Level) - THIS HOOK                    │
├─────────────────────────────────────────────────────────────┤
│  ✅ Direct LiveProvider access                               │
│  ✅ Simple, minimal API                                      │
│  ✅ Full control                                             │
│  ✅ No business logic                                        │
│  ❌ No auto-invalidation                                     │
│  ❌ No resource resolution                                   │
│  ❌ No liveMode handling                                     │
│                                                               │
│  Use when:                                                   │
│  • Need custom subscription logic                            │
│  • Don't want auto-invalidation                             │
│  • Subscribing to non-resource channels                      │
│  • Building custom hooks                                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  useResourceSubscription (High-Level)                        │
├─────────────────────────────────────────────────────────────┤
│  ✅ Auto-invalidation (liveMode="auto")                      │
│  ✅ Resource resolution                                      │
│  ✅ liveMode handling                                        │
│  ✅ Orchestrates multiple hooks                              │
│  ❌ Less control                                             │
│  ❌ Resource-specific                                        │
│                                                               │
│  Use when:                                                   │
│  • Want auto-invalidation                                    │
│  • Working with resources                                    │
│  • Standard CRUD operations                                  │
│  • Used by data hooks                                        │
└─────────────────────────────────────────────────────────────┘

FLOW DIAGRAM - Direct Subscription:

┌─────────────────────────────────────────────────────────────┐
│  COMPONENT                                                   │
│                                                               │
│  function CustomComponent() {                                │
│    useSubscription({                                         │
│      channel: "custom-channel",                              │
│      onLiveEvent: (event) => {                               │
│        // Custom logic here                                  │
│      }                                                        │
│    });                                                        │
│  }                                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  useSubscription                                             │
│                                                               │
│  • Get liveProvider from context                             │
│  • Call liveProvider.subscribe()                             │
│  • Return cleanup function                                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  LiveProvider.subscribe()                                    │
│                                                               │
│  • Establish WebSocket connection                            │
│  • Register callback for channel                             │
│  • Return subscription handle                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ (waiting for events...)
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  EVENT RECEIVED                                              │
│                                                               │
│  • LiveProvider receives event from server                   │
│  • Calls registered callback                                 │
│  • User's onLiveEvent executed                               │
└─────────────────────────────────────────────────────────────┘
```

### Ví dụ thực tế:

Giống như đăng ký kênh YouTube trực tiếp:

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: YouTube Subscription (Low-Level)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// useSubscription = Direct subscription
youtubeAPI.subscribe({
  channelId: "UCxxx",
  onNewVideo: (video) => {
    // You decide what to do
    console.log("New video:", video.title);
  },
});

// useResourceSubscription = Smart notification system
youtubeNotifications.enable({
  channelId: "UCxxx",
  mode: "auto",
  // Automatically:
  // • Shows notification
  // • Updates feed
  // • Marks as unread
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG REFINE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Low-level: useSubscription (full control)
function CustomComponent() {
  useSubscription({
    channel: "custom-notifications",
    onLiveEvent: (event) => {
      // You handle everything
      console.log("Event:", event);
      // No auto-invalidation
      // You decide what to do
    },
  });
}

// High-level: useResourceSubscription (auto-magic)
function PostList() {
  const { data } = useList({
    resource: "posts",
    liveMode: "auto",
  });
  // Automatically:
  // • Subscribes to "resources/posts"
  // • Invalidates cache on events
  // • Refetches data
  // • Updates UI
}
```

## 2. Luồng hoạt động chi tiết

### Sơ đồ luồng đầy đủ:

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: COMPONENT MOUNT                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  function NotificationCenter() {                             │
│    const [notifications, setNotifications] = useState([]);   │
│                                                               │
│    useSubscription({                                         │
│      channel: "user/notifications",                          │
│      types: ["new_notification"],                            │
│      onLiveEvent: (event) => {                               │
│        setNotifications(prev => [event.payload, ...prev]);   │
│      }                                                        │
│    });                                                        │
│                                                               │
│    return <NotificationList items={notifications} />;        │
│  }                                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: HOOK INITIALIZATION                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  export const useSubscription = ({                           │
│    params,                                                    │
│    channel,                                                   │
│    types = ["*"],     // Default: all event types            │
│    enabled = true,    // Default: enabled                    │
│    onLiveEvent,                                              │
│    meta                                                       │
│  }: UseSubscriptionProps): void => {                         │
│                                                               │
│    // 2.1: Get LiveProvider from context                     │
│    const { liveProvider } = useContext(LiveContext);        │
│    //                       ^^^^^^^^^^^^^^^^^^^^^^^^^^       │
│    //                       Injected dependency              │
│                                                               │
│    // 2.2: useEffect for subscription                        │
│    useEffect(() => {                                         │
│      // Subscription logic...                                │
│    }, [enabled]);  // Re-run when enabled changes            │
│  };                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3: USEEFFECT EXECUTION                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  useEffect(() => {                                           │
│    let subscription: any;                                    │
│                                                               │
│    // 3.1: Check if enabled                                  │
│    if (enabled) {                                            │
│      // Yes, proceed with subscription                       │
│    } else {                                                   │
│      // No, skip subscription                                │
│      return;                                                  │
│    }                                                          │
│                                                               │
│    // 3.2: Define cleanup function                           │
│    return () => {                                            │
│      if (subscription) {                                     │
│        liveProvider?.unsubscribe(subscription);              │
│      }                                                        │
│    };                                                         │
│  }, [enabled]);                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 4: CALL LIVEPROVIDER.SUBSCRIBE                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  if (enabled) {                                              │
│    subscription = liveProvider?.subscribe({                  │
│      // ════════════════════════════════════                │
│      // SUBSCRIPTION PARAMETERS                              │
│      // ════════════════════════════════════                │
│                                                               │
│      channel: "user/notifications",                          │
│      // WHERE to listen                                      │
│      // Channel name identifies the topic                    │
│                                                               │
│      params: {                                               │
│        // Optional: Additional params                        │
│        // Can include ids, filters, etc.                     │
│        userId: currentUser.id                                │
│      },                                                       │
│                                                               │
│      types: ["new_notification"],                            │
│      // WHAT to listen for                                   │
│      // Filter by event types                                │
│      // ["*"] = all types                                    │
│                                                               │
│      callback: onLiveEvent,                                  │
│      // HOW to handle events                                 │
│      // User's callback function                             │
│                                                               │
│      meta: {                                                  │
│        ...meta,                                              │
│        dataProviderName: meta?.dataProviderName ?? "default" │
│      }                                                        │
│      // Metadata for provider                                │
│    });                                                        │
│  }                                                            │
│                                                               │
│  // subscription = handle to unsubscribe later               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 5: LIVEPROVIDER ESTABLISHES CONNECTION                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  // LiveProvider implementation (example: Ably)              │
│  const liveProvider = {                                      │
│    subscribe: ({ channel, types, callback, params }) => {    │
│      // 5.1: Get or create channel                           │
│      const ablyChannel = ably.channels.get(channel);        │
│                                                               │
│      // 5.2: Subscribe to event types                        │
│      if (types.includes("*")) {                              │
│        // Subscribe to all events                            │
│        ablyChannel.subscribe(callback);                      │
│      } else {                                                 │
│        // Subscribe to specific types                        │
│        types.forEach(type => {                               │
│          ablyChannel.subscribe(type, callback);              │
│        });                                                    │
│      }                                                        │
│                                                               │
│      // 5.3: Return subscription handle                      │
│      return {                                                 │
│        channel: ablyChannel,                                 │
│        unsubscribe: () => ablyChannel.unsubscribe(callback)  │
│      };                                                       │
│    }                                                          │
│  };                                                           │
│                                                               │
│  → WebSocket connection established                          │
│  → Callback registered for channel                           │
│  → Waiting for events...                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (time passes...)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 6: EVENT RECEIVED FROM SERVER                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Server publishes event:                                     │
│  {                                                            │
│    channel: "user/notifications",                            │
│    type: "new_notification",                                 │
│    payload: {                                                │
│      id: "notif-123",                                        │
│      message: "New comment on your post",                    │
│      timestamp: "2024-01-20T10:30:00Z"                       │
│    },                                                         │
│    date: new Date()                                          │
│  }                                                            │
│                                                               │
│  → WebSocket receives event                                  │
│  → LiveProvider identifies subscribed channels               │
│  → Filters by event type                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 7: CALLBACK EXECUTION                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  onLiveEvent({                                               │
│    channel: "user/notifications",                            │
│    type: "new_notification",                                 │
│    payload: {                                                │
│      id: "notif-123",                                        │
│      message: "New comment on your post"                     │
│    }                                                          │
│  })                                                           │
│                                                               │
│  // User's callback function executes:                       │
│  (event) => {                                                │
│    setNotifications(prev => [event.payload, ...prev]);       │
│    // → State updated                                        │
│    // → Component re-renders                                 │
│    // → User sees new notification ✨                        │
│  }                                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 8: UI UPDATE                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  function NotificationCenter() {                             │
│    const [notifications, setNotifications] = useState([]);   │
│    // notifications updated → re-render                      │
│                                                               │
│    return (                                                   │
│      <NotificationList                                       │
│        items={notifications}  // New notification shown      │
│      />                                                       │
│    );                                                         │
│  }                                                            │
│                                                               │
│  ✅ User sees new notification                                │
│  ✅ No page refresh needed                                    │
│  ✅ Real-time update achieved                                 │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
CLEANUP FLOW (Component Unmount)
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  COMPONENT UNMOUNT                                           │
│                                                               │
│  • User navigates away                                       │
│  • Component removed from DOM                                │
│  • useEffect cleanup function executes                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CLEANUP FUNCTION                                            │
│                                                               │
│  return () => {                                              │
│    if (subscription) {                                       │
│      liveProvider?.unsubscribe(subscription);                │
│    }                                                          │
│  };                                                           │
│                                                               │
│  → Calls LiveProvider.unsubscribe()                          │
│  → Removes callback from channel                             │
│  → Closes WebSocket if no other subscriptions                │
│  → Prevents memory leaks                                     │
│  → No more events received                                   │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
ENABLED TOGGLE FLOW
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  ENABLED PROP CHANGES                                        │
│                                                               │
│  const [enabled, setEnabled] = useState(true);               │
│                                                               │
│  useSubscription({                                           │
│    channel: "notifications",                                 │
│    onLiveEvent: handleEvent,                                 │
│    enabled  // ← Dynamic value                               │
│  });                                                          │
│                                                               │
│  // User clicks "Pause notifications"                        │
│  setEnabled(false);                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  USEEFFECT RE-RUNS                                           │
│                                                               │
│  useEffect(() => {                                           │
│    // Cleanup previous subscription                          │
│    if (previousSubscription) {                               │
│      liveProvider?.unsubscribe(previousSubscription);        │
│    }                                                          │
│                                                               │
│    // New subscription based on new enabled value            │
│    if (enabled) {  // enabled = false                        │
│      // Skip subscription                                    │
│    }                                                          │
│  }, [enabled]);  // ← Dependency changed                     │
│                                                               │
│  → Previous subscription cleaned up                          │
│  → No new subscription created                               │
│  → No events received while paused                           │
└─────────────────────────────────────────────────────────────┘
```

## 3. Design Patterns được sử dụng

### Pattern 1: Primitive/Building Block Pattern (Mẫu Nguyên thủy)

**Khái niệm:**
Hook cung cấp minimal, low-level functionality làm building block cho higher-level hooks.

**Tại sao dùng:**

- Separation of concerns
- Reusability
- Flexibility for advanced users
- Foundation cho other hooks

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PRIMITIVE: useSubscription (low-level)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useSubscription = ({
  channel,
  onLiveEvent,
  types = ["*"],
  enabled = true,
  params,
  meta
}: UseSubscriptionProps): void => {
  const { liveProvider } = useContext(LiveContext);

  useEffect(() => {
    let subscription: any;

    if (enabled) {
      subscription = liveProvider?.subscribe({
        channel,
        params,
        types,
        callback: onLiveEvent,
        meta
      });
    }

    return () => {
      if (subscription) {
        liveProvider?.unsubscribe(subscription);
      }
    };
  }, [enabled]);
};

// ✅ Minimal
// ✅ No business logic
// ✅ Direct LiveProvider access
// ✅ Full control to user

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HIGHER-LEVEL: useResourceSubscription (built on primitive)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useResourceSubscription = ({
  resource,
  liveMode,
  ...rest
}: UseResourceSubscriptionProps): void => {
  const { identifier } = useResourceParams({ resource });
  const liveModeResolved = useLiveMode(liveMode);
  const invalidate = useInvalidate();

  // Build callback with business logic
  const callback = useCallback((event: LiveEvent) => {
    if (liveModeResolved === "auto") {
      invalidate({ resource: identifier, ... });
    }
    rest.onLiveEvent?.(event);
  }, [liveModeResolved, identifier]);

  // Use primitive internally!
  useSubscription({
    ...rest,
    onLiveEvent: callback,
    enabled: liveModeResolved !== "off"
  });
};

// ✅ Built on useSubscription primitive
// ✅ Adds business logic
// ✅ Resource-aware
// ✅ Auto-invalidation
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: HTML Elements (Primitives)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Primitive: <input />
<input
  type="text"
  value={value}
  onChange={handleChange}
/>
// ✅ Minimal
// ✅ Full control
// ✅ Low-level

// Higher-level: <TextField /> (built on input)
<TextField
  label="Username"
  value={username}
  onChange={setUsername}
  validation="required"
  error={errors.username}
/>
// ✅ Built on <input />
// ✅ Adds label, validation, error display
// ✅ High-level

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: React Hooks (Primitives)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Primitive: useState
const [count, setCount] = useState(0);
// ✅ Minimal
// ✅ General purpose

// Higher-level: useCounter (built on useState)
function useCounter(initial = 0) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + 1);
  const decrement = () => setCount(c => c - 1);
  const reset = () => setCount(initial);
  return { count, increment, decrement, reset };
}
// ✅ Built on useState
// ✅ Adds business logic

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI REFINE HOOKS:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Primitive: useSubscription
useSubscription({
  channel: "custom",
  onLiveEvent: (e) => { /* custom logic */ }
});
// ✅ Full control
// ✅ Any channel
// ✅ Any logic

// Higher-level: useResourceSubscription
// (used by useList/useOne/useMany)
// ✅ Built on useSubscription
// ✅ Resource-aware
// ✅ Auto-invalidation
```

**Lợi ích:**

- **Reusability:** Base cho other hooks
- **Flexibility:** Advanced users have full control
- **Separation:** Business logic separated
- **Testability:** Test primitive independently

### Pattern 2: Dependency Injection Pattern (Mẫu Tiêm phụ thuộc)

**Khái niệm:**
Hook receives dependencies via Context thay vì hard-coded.

**Tại sao dùng:**

- Testability (mock LiveProvider)
- Flexibility (different providers)
- Loose coupling

**Cách implement:**

```typescript
export const useSubscription = ({
  // ... params
}: UseSubscriptionProps): void => {

  // ════════════════════════════════════════════════════
  // DEPENDENCY INJECTION via Context
  // ════════════════════════════════════════════════════

  const { liveProvider } = useContext(LiveContext);
  //                        ^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                        Injected, not hard-coded!

  useEffect(() => {
    // Use injected dependency
    subscription = liveProvider?.subscribe({ ... });
    return () => liveProvider?.unsubscribe(subscription);
  }, [enabled]);
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INJECTION POINTS:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Production: Real LiveProvider
<Refine
  liveProvider={ablyProvider}  // ← Inject Ably
>
  <App />
</Refine>

// Testing: Mock LiveProvider
<Refine
  liveProvider={mockLiveProvider}  // ← Inject mock
>
  <TestComponent />
</Refine>

// Development: Different provider
<Refine
  liveProvider={socketIOProvider}  // ← Inject Socket.io
>
  <App />
</Refine>
```

**Lợi ích:**

- **Testability:** Easy to mock
- **Flexibility:** Swap providers
- **No hard coupling:** Provider-agnostic
- **Configuration:** Change via props

### Pattern 3: Cleanup Pattern (Mẫu Dọn dẹp)

**Khái niệm:**
useEffect cleanup function unsubscribes to prevent memory leaks.

**Tại sao dùng:**

- WebSocket connections persist
- Must cleanup on unmount
- Prevent memory leaks

**Cách implement:**

```typescript
useEffect(() => {
  let subscription: any;

  // ════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════

  if (enabled) {
    subscription = liveProvider?.subscribe({
      channel,
      params,
      types,
      callback: onLiveEvent,
      meta,
    });
  }

  // ════════════════════════════════════════════════════
  // CLEANUP PATTERN
  // ════════════════════════════════════════════════════

  return () => {
    if (subscription) {
      liveProvider?.unsubscribe(subscription);
      //             ^^^^^^^^^^^
      //             Release resources
    }
  };
}, [enabled]); // Re-run when enabled changes
```

**Lợi ích:**

- **No Memory Leaks:** Resources released
- **No Ghost Events:** No events after unmount
- **Clean State:** Predictable behavior
- **Performance:** Fewer active connections

### Pattern 4: Optional Chaining Pattern (Mẫu Chuỗi Tùy chọn)

**Khái niệm:**
Use `?.` to safely access liveProvider which may be undefined.

**Tại sao dùng:**

- liveProvider optional
- App works without liveProvider
- No crashes

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OPTIONAL CHAINING throughout
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const { liveProvider } = useContext(LiveContext);
//       ^^^^^^^^^^^^ may be undefined

// Safe subscription
subscription = liveProvider?.subscribe({ ... });
//                          ^^ Won't crash if undefined

// Safe unsubscription
liveProvider?.unsubscribe(subscription);
//           ^^ Won't crash if undefined

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIOS:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: No liveProvider (development)
<Refine>  {/* No liveProvider */}
  <App />
</Refine>

useSubscription({
  channel: "notifications",
  onLiveEvent: handleEvent
});
// → liveProvider is undefined
// → subscription is undefined (no crash)
// → cleanup does nothing (no crash)
// ✅ App works, just no live updates

// Scenario 2: With liveProvider (production)
<Refine liveProvider={ablyProvider}>
  <App />
</Refine>

useSubscription({
  channel: "notifications",
  onLiveEvent: handleEvent
});
// → liveProvider is function
// → subscription created
// → cleanup unsubscribes
// ✅ Live updates work
```

**Lợi ích:**

- **Safety:** No runtime errors
- **Graceful Degradation:** Works without provider
- **Flexibility:** Optional feature
- **Developer Experience:** No crashes

### Pattern 5: Default Parameters Pattern (Mẫu Tham số Mặc định)

**Khái niệm:**
Provide sensible defaults for optional parameters.

**Tại sao dùng:**

- Convenience
- Less boilerplate
- Better DX

**Cách implement:**

```typescript
export const useSubscription = ({
  params,
  channel,
  types = ["*"],     // ✅ Default: all types
  enabled = true,    // ✅ Default: enabled
  onLiveEvent,
  meta
}: UseSubscriptionProps): void => {

  // ════════════════════════════════════════════════════
  // DEFAULT PARAMETERS
  // ════════════════════════════════════════════════════

  // types = ["*"] → subscribe to all event types
  // No need to specify types every time

  // enabled = true → subscription active by default
  // Can disable with enabled={false}

  // dataProviderName defaults to "default"
  meta: {
    ...meta,
    dataProviderName: meta?.dataProviderName ?? "default"
    //                                           ^^^^^^^^^
    //                                           Default value
  }
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// USAGE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Minimal usage (use defaults)
useSubscription({
  channel: "notifications",
  onLiveEvent: handleEvent
  // types = ["*"] (default)
  // enabled = true (default)
});

// Override defaults
useSubscription({
  channel: "notifications",
  onLiveEvent: handleEvent,
  types: ["created", "updated"],  // Override
  enabled: false                   // Override
});
```

**Lợi ích:**

- **Convenience:** Less code to write
- **Common Case Optimized:** Defaults suit 80% cases
- **Still Flexible:** Can override when needed
- **Better DX:** Simpler API

## 4. Các tính năng chính

### 1. Direct LiveProvider Access

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Low-level access to LiveProvider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useSubscription({
  channel: "any-channel-name",
  types: ["any", "event", "types"],
  params: { any: "params" },
  onLiveEvent: (event) => {
    // Full control over event handling
    // No auto-invalidation
    // No resource resolution
    // Pure subscription
  },
});

// Use cases:
// • Custom channels (not resources)
// • Custom event handling
// • No auto-invalidation needed
// • Building custom hooks
```

### 2. Event Type Filtering

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Filter events by type
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// All events
useSubscription({
  channel: "posts",
  types: ["*"], // Default
  onLiveEvent: (event) => {
    // Receives all event types
  },
});

// Specific types only
useSubscription({
  channel: "posts",
  types: ["created", "deleted"],
  onLiveEvent: (event) => {
    // Only receives "created" and "deleted"
    // Ignores "updated", etc.
  },
});

// Custom types
useSubscription({
  channel: "workflow",
  types: ["approved", "rejected", "submitted"],
  onLiveEvent: (event) => {
    // Custom business event types
  },
});
```

### 3. Enable/Disable Control

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dynamic enable/disable
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NotificationCenter() {
  const [paused, setPaused] = useState(false);

  useSubscription({
    channel: "notifications",
    enabled: !paused, // Dynamic
    onLiveEvent: handleEvent,
  });

  return (
    <div>
      <button onClick={() => setPaused(!paused)}>
        {paused ? "Resume" : "Pause"} Notifications
      </button>
    </div>
  );
}

// Conditional subscription
const isAdmin = user.role === "admin";

useSubscription({
  channel: "admin-events",
  enabled: isAdmin, // Only for admins
  onLiveEvent: handleEvent,
});
```

### 4. Custom Parameters

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pass additional params to LiveProvider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useSubscription({
  channel: "user-activity",
  params: {
    userId: currentUser.id,
    organizationId: org.id,
    filters: [{ field: "type", operator: "eq", value: "login" }],
  },
  onLiveEvent: (event) => {
    // Filtered events based on params
  },
});

// LiveProvider can use params for:
// • Server-side filtering
// • Room/namespace selection
// • Authentication
// • Custom logic
```

### 5. Metadata Support

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Pass metadata to LiveProvider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useSubscription({
  channel: "posts",
  onLiveEvent: handleEvent,
  meta: {
    dataProviderName: "analytics",
    customField: "value",
    authToken: user.token,
  },
});

// Meta can include:
// • dataProviderName
// • Auth credentials
// • Custom fields
// • Provider-specific config
```

### 6. Automatic Cleanup

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auto-unsubscribe on unmount
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TemporaryComponent() {
  useSubscription({
    channel: "temp",
    onLiveEvent: handleEvent,
  });

  // Component unmounts → cleanup automatic
  // → unsubscribe() called
  // → No memory leaks
  // → No events after unmount

  return <div>...</div>;
}
```

## 5. Use Cases thực tế

### Use Case 1: Custom Notification System

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Custom notification center (non-resource)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Custom channel (not a resource)
  useSubscription({
    channel: `user/${currentUser.id}/notifications`,
    types: ["notification"],
    onLiveEvent: (event) => {
      const notification = event.payload;

      // Add to list
      setNotifications((prev) => [notification, ...prev]);

      // Increment unread
      setUnreadCount((prev) => prev + 1);

      // Show toast
      toast.info(notification.message, {
        icon: notification.icon,
        duration: 5000,
      });

      // Play sound
      playNotificationSound();

      // Browser notification
      if (Notification.permission === "granted") {
        new Notification(notification.title, {
          body: notification.message,
          icon: notification.icon,
        });
      }
    },
  });

  return (
    <div>
      <Badge count={unreadCount}>
        <BellIcon />
      </Badge>
      <NotificationList
        items={notifications}
        onMarkRead={(id) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
          );
          setUnreadCount((prev) => prev - 1);
        }}
      />
    </div>
  );
}
```

### Use Case 2: Live Chat

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Real-time chat
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChatRoom({ roomId }) {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);

  // Subscription 1: Messages
  useSubscription({
    channel: `chat/${roomId}/messages`,
    types: ["message"],
    onLiveEvent: (event) => {
      const message = event.payload;
      setMessages((prev) => [...prev, message]);

      // Auto-scroll to bottom
      scrollToBottom();
    },
  });

  // Subscription 2: Typing indicators
  useSubscription({
    channel: `chat/${roomId}/typing`,
    types: ["typing_start", "typing_stop"],
    onLiveEvent: (event) => {
      const { userId, type } = event.payload;

      if (type === "typing_start") {
        setTypingUsers((prev) => [...prev, userId]);
      } else {
        setTypingUsers((prev) => prev.filter((id) => id !== userId));
      }
    },
  });

  // Subscription 3: User presence
  useSubscription({
    channel: `chat/${roomId}/presence`,
    types: ["user_joined", "user_left"],
    onLiveEvent: (event) => {
      const { userId, userName, type } = event.payload;

      if (type === "user_joined") {
        toast.success(`${userName} joined the chat`);
      } else {
        toast.info(`${userName} left the chat`);
      }
    },
  });

  return (
    <div>
      <MessageList messages={messages} />
      {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
      <MessageInput roomId={roomId} />
    </div>
  );
}
```

### Use Case 3: Live Presence/Status

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Online/offline status tracking
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UserPresence() {
  const [onlineUsers, setOnlineUsers] = useState(new Map());

  useSubscription({
    channel: "presence",
    types: ["user_online", "user_offline", "heartbeat"],
    onLiveEvent: (event) => {
      const { userId, userName, status } = event.payload;

      setOnlineUsers((prev) => {
        const updated = new Map(prev);

        if (event.type === "user_online") {
          updated.set(userId, {
            userName,
            status: "online",
            lastSeen: new Date(),
          });
        } else if (event.type === "user_offline") {
          updated.delete(userId);
        } else if (event.type === "heartbeat") {
          if (updated.has(userId)) {
            updated.set(userId, {
              ...updated.get(userId),
              lastSeen: new Date(),
            });
          }
        }

        return updated;
      });
    },
  });

  // Cleanup stale users (no heartbeat for 60s)
  useEffect(() => {
    const interval = setInterval(() => {
      setOnlineUsers((prev) => {
        const updated = new Map(prev);
        const now = Date.now();

        updated.forEach((user, userId) => {
          if (now - user.lastSeen.getTime() > 60000) {
            updated.delete(userId);
          }
        });

        return updated;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h3>Online ({onlineUsers.size})</h3>
      {Array.from(onlineUsers.values()).map((user) => (
        <UserAvatar key={user.userId} {...user} />
      ))}
    </div>
  );
}
```

### Use Case 4: Live Progress Tracking

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Track long-running job progress
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ImportProgress({ jobId }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("pending");
  const [logs, setLogs] = useState([]);

  useSubscription({
    channel: `jobs/${jobId}`,
    types: ["progress", "log", "completed", "failed"],
    enabled: status !== "completed" && status !== "failed",
    onLiveEvent: (event) => {
      switch (event.type) {
        case "progress":
          setProgress(event.payload.percentage);
          break;

        case "log":
          setLogs((prev) => [...prev, event.payload.message]);
          break;

        case "completed":
          setStatus("completed");
          setProgress(100);
          toast.success("Import completed!");
          break;

        case "failed":
          setStatus("failed");
          toast.error(`Import failed: ${event.payload.error}`);
          break;
      }
    },
  });

  return (
    <div>
      <ProgressBar value={progress} />
      <Status status={status} />
      <LogViewer logs={logs} />
    </div>
  );
}
```

### Use Case 5: Multi-Channel Subscription

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Subscribe to multiple channels
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [activities, setActivities] = useState([]);

  // Channel 1: Metrics updates
  useSubscription({
    channel: "metrics",
    types: ["updated"],
    onLiveEvent: (event) => {
      setMetrics((prev) => ({
        ...prev,
        ...event.payload,
      }));
    },
  });

  // Channel 2: System alerts
  useSubscription({
    channel: "system/alerts",
    types: ["alert"],
    onLiveEvent: (event) => {
      const alert = event.payload;
      setAlerts((prev) => [alert, ...prev]);

      if (alert.severity === "critical") {
        playAlertSound();
      }
    },
  });

  // Channel 3: User activities
  useSubscription({
    channel: "activities",
    types: ["activity"],
    onLiveEvent: (event) => {
      setActivities((prev) => [event.payload, ...prev].slice(0, 10));
    },
  });

  return (
    <Grid>
      <MetricsWidget data={metrics} />
      <AlertsWidget alerts={alerts} />
      <ActivityFeed activities={activities} />
    </Grid>
  );
}
```

### Use Case 6: Conditional Subscription with Filters

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Subscribe only when conditions met
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PostList() {
  const [selectedTag, setSelectedTag] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useSubscription({
    channel: selectedTag ? `tags/${selectedTag}` : "posts/all",
    enabled: autoRefresh, // Can pause
    params: {
      tag: selectedTag,
      // Server uses this to filter events
    },
    types: ["created", "updated"],
    onLiveEvent: (event) => {
      // Only receive events for selected tag
      toast.info(`New post in ${selectedTag || "all"}`);
    },
  });

  return (
    <div>
      <TagFilter value={selectedTag} onChange={setSelectedTag} />
      <Switch
        checked={autoRefresh}
        onChange={setAutoRefresh}
        label="Auto-refresh"
      />
      <PostsGrid />
    </div>
  );
}
```

## 6. Quyết định kiến trúc

### Quyết định 1: Tại sao không auto-invalidate?

**Vấn đề:**
Hook có nên auto-invalidate như useResourceSubscription?

**Các phương án:**

| Approach               | Simplicity | Flexibility |
| ---------------------- | ---------- | ----------- |
| **No invalidation** ✅ | High       | High        |
| **Auto invalidation**  | Low        | Low         |

**Quyết định:** No auto-invalidation

**Lý do:**

- This is low-level primitive
- User has full control
- Different use cases need different logic
- useResourceSubscription provides auto-invalidation

### Quyết định 2: Default types = ["*"]?

**Vấn đề:**
Default value cho types parameter?

**Các phương án:**

| Default    | Pros       | Cons                        |
| ---------- | ---------- | --------------------------- |
| `[]`       | Explicit   | Verbose                     |
| `["*"]` ✅ | Convenient | May receive unwanted events |
| Required   | Explicit   | Verbose                     |

**Quyết định:** Default ["*"]

**Code:**

```typescript
types = ["*"]; // Default: all events
```

**Lý do:**

- Most common case
- Convenient for users
- Can override if needed
- Matches WebSocket conventions

### Quyết định 3: useEffect dependency = [enabled]?

**Vấn đề:**
Dependencies cho useEffect?

**Các phương án:**

| Dependencies            | Re-subscribe when | Stability |
| ----------------------- | ----------------- | --------- |
| `[]`                    | Never             | High      |
| `[enabled]` ✅          | enabled changes   | Medium    |
| `[channel, types, ...]` | Any change        | Low       |

**Quyết định:** [enabled] only

**Code:**

```typescript
useEffect(() => {
  // ...
}, [enabled]);
```

**Lý do:**

- Allow enable/disable toggle
- Other params shouldn't cause re-subscribe
- Stable for most cases
- Matches user expectations

### Quyết định 4: Return void?

**Vấn đề:**
Hook có nên return subscription handle?

**Các phương án:**

| Return         | User control | API simplicity |
| -------------- | ------------ | -------------- |
| `void` ✅      | Low          | High           |
| `subscription` | High         | Low            |

**Quyết định:** Return void

**Code:**

```typescript
export const useSubscription = (...): void => {
  // ✅ Return nothing
};
```

**Lý do:**

- Auto-cleanup sufficient
- Simpler API
- Consistent with React patterns
- Advanced users can fork if needed

## 7. Common Pitfalls (Những lỗi hay gặp)

### Pitfall 1: Missing channel parameter

**Vấn đề:**

```typescript
// ❌ SAI - No channel
useSubscription({
  onLiveEvent: handleEvent,
  // ⚠️ Missing channel!
});
```

**Hậu quả:**

- TypeScript error
- Runtime error
- No subscription

**Giải pháp:**

```typescript
// ✅ ĐÚNG - Include channel
useSubscription({
  channel: "notifications", // ✅ Required
  onLiveEvent: handleEvent,
});
```

### Pitfall 2: Unstable callback causing re-subscription

**Vấn đề:**

```typescript
// ❌ SAI - Inline function (new every render)
function Component() {
  useSubscription({
    channel: "notifications",
    onLiveEvent: (event) => {
      // ⚠️ New function every render!
      console.log(event);
    },
  });
}
```

**Hậu quả:**

- May cause issues in some implementations
- Performance overhead

**Giải pháp:**

```typescript
// ✅ ĐÚNG - useCallback
function Component() {
  const handleEvent = useCallback((event) => {
    console.log(event);
  }, []); // ✅ Stable

  useSubscription({
    channel: "notifications",
    onLiveEvent: handleEvent,
  });
}

// Or if dependencies needed:
const handleEvent = useCallback(
  (event) => {
    setState(event.payload);
  },
  [setState],
);
```

### Pitfall 3: Subscribing in render

**Vấn đề:**

```typescript
// ❌ SAI - Multiple subscriptions
function Component({ channels }) {
  channels.forEach((channel) => {
    useSubscription({
      // ⚠️ Violates Rules of Hooks!
      channel,
      onLiveEvent: handleEvent,
    });
  });
}
```

**Hậu quả:**

- React error: "Rendered more hooks than previous render"
- Unpredictable behavior

**Giải pháp:**

```typescript
// ✅ ĐÚNG - Fixed number of hooks
function Component({ channel }) {
  useSubscription({
    channel,
    onLiveEvent: handleEvent,
  });
}

// Or for multiple channels:
function Component({ channels }) {
  useEffect(() => {
    const subscriptions = channels.map((channel) =>
      liveProvider?.subscribe({
        channel,
        callback: handleEvent,
      }),
    );

    return () => {
      subscriptions.forEach((sub) => liveProvider?.unsubscribe(sub));
    };
  }, [channels]);
}
```

### Pitfall 4: Forgetting cleanup

**Vấn đề:**

```typescript
// ❌ SAI - Manual subscription without cleanup
function Component() {
  const { liveProvider } = useContext(LiveContext);

  useEffect(() => {
    liveProvider?.subscribe({
      channel: "notifications",
      callback: handleEvent,
    });
    // ⚠️ No cleanup!
  }, []);
}
```

**Hậu quả:**

- Memory leak
- Ghost events

**Giải pháp:**

```typescript
// ✅ ĐÚNG - Use useSubscription (built-in cleanup)
function Component() {
  useSubscription({
    channel: "notifications",
    onLiveEvent: handleEvent,
  });
  // ✅ Auto-cleanup
}
```

### Pitfall 5: Wrong channel name

**Vấn đề:**

```typescript
// ❌ SAI - Typo
useSubscription({
  channel: "notifcations", // ⚠️ Typo!
  onLiveEvent: handleEvent,
});

// Publisher sends to "notifications"
// This subscription won't receive events
```

**Hậu quả:**

- No events received
- Silent failure

**Giải pháp:**

```typescript
// ✅ ĐÚNG - Use constants
const CHANNELS = {
  NOTIFICATIONS: "notifications",
  MESSAGES: "messages",
} as const;

useSubscription({
  channel: CHANNELS.NOTIFICATIONS, // ✅ Type-safe
  onLiveEvent: handleEvent,
});
```

### Pitfall 6: Not handling all event types

**Vấn đề:**

```typescript
// ❌ SAI - Subscribes to all but only handles some
useSubscription({
  channel: "posts",
  types: ["*"], // All types
  onLiveEvent: (event) => {
    if (event.type === "created") {
      // Handle created
    }
    // ⚠️ What about updated, deleted, etc.?
  },
});
```

**Hậu quả:**

- Unexpected behavior
- Missed events

**Giải pháp:**

```typescript
// ✅ OPTION 1: Filter types
useSubscription({
  channel: "posts",
  types: ["created"], // ✅ Only created
  onLiveEvent: handleCreated,
});

// ✅ OPTION 2: Handle all types
useSubscription({
  channel: "posts",
  types: ["*"],
  onLiveEvent: (event) => {
    switch (event.type) {
      case "created":
        handleCreated(event);
        break;
      case "updated":
        handleUpdated(event);
        break;
      case "deleted":
        handleDeleted(event);
        break;
      default:
        console.warn("Unknown event type:", event.type);
    }
  },
});
```

## 8. Performance Considerations

### 1. Minimal Overhead

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSubscription is lightweight
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Only operations:
// 1. useContext (O(1))
// 2. useEffect setup
// 3. liveProvider.subscribe call

// No business logic
// No heavy computation
// Very fast ⚡
```

### 2. Conditional Subscription

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Only subscribe when needed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const [isActive, setIsActive] = useState(false);

useSubscription({
  channel: "notifications",
  enabled: isActive, // ✅ Only when active
  onLiveEvent: handleEvent,
});

// Benefits:
// • Fewer WebSocket connections
// • Lower server load
// • Better battery life (mobile)
```

### 3. Efficient Cleanup

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auto-cleanup prevents leaks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useEffect(() => {
  subscription = liveProvider?.subscribe({ ... });

  return () => {
    liveProvider?.unsubscribe(subscription);
    // ✅ Clean resources
    // ✅ Close connections
    // ✅ No memory leaks
  };
}, [enabled]);
```

### 4. Event Type Filtering

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Filter at subscription level (server-side)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ BAD: Client-side filtering
useSubscription({
  channel: "posts",
  types: ["*"], // Receive all events
  onLiveEvent: (event) => {
    if (event.type === "created") {
      // Filter in client
      // Handle
    }
    // Wasted bandwidth for other events
  },
});

// ✅ GOOD: Server-side filtering
useSubscription({
  channel: "posts",
  types: ["created"], // Only receive created
  onLiveEvent: handleCreated,
  // Less bandwidth
  // Less processing
});
```

## 9. Testing

### Test 1: Basic Subscription

```typescript
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { TestWrapper } from "@test";
import { useSubscription } from "./";

describe("useSubscription", () => {
  it("should subscribe to channel", () => {
    const mockSubscribe = vi.fn();
    const mockCallback = vi.fn();

    renderHook(
      () =>
        useSubscription({
          channel: "test-channel",
          onLiveEvent: mockCallback,
        }),
      {
        wrapper: TestWrapper({
          liveProvider: {
            subscribe: mockSubscribe,
            unsubscribe: vi.fn(),
          },
        }),
      },
    );

    expect(mockSubscribe).toHaveBeenCalledWith({
      channel: "test-channel",
      callback: mockCallback,
      params: undefined,
      types: ["*"],
      meta: { dataProviderName: "default" },
    });
  });
});
```

### Test 2: Event Filtering

```typescript
it("should filter by event types", () => {
  const mockSubscribe = vi.fn();

  renderHook(
    () =>
      useSubscription({
        channel: "test",
        types: ["created", "updated"],
        onLiveEvent: vi.fn(),
      }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: mockSubscribe,
          unsubscribe: vi.fn(),
        },
      }),
    },
  );

  expect(mockSubscribe).toHaveBeenCalledWith(
    expect.objectContaining({
      types: ["created", "updated"],
    }),
  );
});
```

### Test 3: Cleanup

```typescript
it("should unsubscribe on unmount", () => {
  const mockSubscription = {};
  const mockSubscribe = vi.fn(() => mockSubscription);
  const mockUnsubscribe = vi.fn();

  const { unmount } = renderHook(
    () =>
      useSubscription({
        channel: "test",
        onLiveEvent: vi.fn(),
      }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: mockSubscribe,
          unsubscribe: mockUnsubscribe,
        },
      }),
    },
  );

  unmount();

  expect(mockUnsubscribe).toHaveBeenCalledWith(mockSubscription);
});
```

### Test 4: Disabled Subscription

```typescript
it("should not subscribe when disabled", () => {
  const mockSubscribe = vi.fn();

  renderHook(
    () =>
      useSubscription({
        channel: "test",
        enabled: false,
        onLiveEvent: vi.fn(),
      }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: mockSubscribe,
          unsubscribe: vi.fn(),
        },
      }),
    },
  );

  expect(mockSubscribe).not.toHaveBeenCalled();
});
```

## 10. Kết luận

`useSubscription` là **low-level primitive hook** cung cấp direct access đến LiveProvider, là building block cho các hooks cấp cao hơn.

### Điểm mạnh:

1. **Simple** - Minimal, clean API
2. **Flexible** - Full control over events
3. **Primitive** - Building block for other hooks
4. **Direct Access** - No abstraction overhead
5. **Type-Safe** - Full TypeScript support
6. **Auto-Cleanup** - No memory leaks

### Key Takeaways:

- **Low-level** primitive hook
- **No auto-invalidation** (user controls)
- **Direct LiveProvider** access
- **Building block** for useResourceSubscription
- **Full control** over event handling
- **Use when** need custom logic

### Comparison Summary:

| Feature               | useSubscription | useResourceSubscription |
| --------------------- | --------------- | ----------------------- |
| **Level**             | Low-level       | High-level              |
| **Auto-invalidation** | ❌ No           | ✅ Yes (auto mode)      |
| **Resource-aware**    | ❌ No           | ✅ Yes                  |
| **liveMode handling** | ❌ No           | ✅ Yes                  |
| **Flexibility**       | ✅ High         | ⚠️ Medium               |
| **Use cases**         | Custom logic    | Standard CRUD           |

### Pattern Summary:

| Pattern                  | Vai trò                        |
| ------------------------ | ------------------------------ |
| **Primitive**            | Building block for other hooks |
| **Dependency Injection** | Testable, flexible             |
| **Cleanup**              | Auto-unsubscribe               |
| **Optional Chaining**    | Safe without provider          |
| **Default Parameters**   | Convenient API                 |

### Related Hooks:

- `useResourceSubscription` - High-level (built on this)
- `usePublish` - Publish events
- `useLiveMode` - Mode configuration
- `useList/useOne/useMany` - Use useResourceSubscription

---

**Đọc thêm:**

- Refine Live Provider: https://refine.dev/docs/api-reference/core/providers/live-provider/
- Building Custom Hooks: https://react.dev/learn/reusing-logic-with-custom-hooks
