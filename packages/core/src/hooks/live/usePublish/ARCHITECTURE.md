# KIẾN TRÚC: usePublish Hook

## 1. Vai trò trong hệ thống

`usePublish` là hook cung cấp function để **broadcast live events** đến các clients khác qua WebSocket/Real-time connection. Nó là nửa còn lại của hệ thống real-time (subscribe nhận, publish gửi).

### Vị trí trong kiến trúc:

```
┌─────────────────────────────────────────────────────────────┐
│              REFINE LIVE SYSTEM ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │                 CLIENT A (Publisher)                │     │
│  │                                                      │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  User Action (Create/Update/Delete)      │     │     │
│  │  └──────────────┬───────────────────────────┘     │     │
│  │                 │                                  │     │
│  │                 ▼                                  │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │  useCreate/useUpdate/useDelete Hook      │     │     │
│  │  │                                           │     │     │
│  │  │  onSuccess: () => {                      │     │     │
│  │  │    publish({                              │     │     │
│  │  │      channel: "resources/posts",         │     │     │
│  │  │      type: "created",                    │     │     │
│  │  │      payload: { ids: [123] }             │     │     │
│  │  │    });                                    │     │     │
│  │  │  }                                        │     │     │
│  │  └──────────────┬───────────────────────────┘     │     │
│  │                 │                                  │     │
│  │                 ▼                                  │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │         usePublish()                      │     │     │
│  │  │                                           │     │     │
│  │  │  const publish = usePublish();           │     │     │
│  │  │  return liveProvider?.publish;           │     │     │
│  │  └──────────────┬───────────────────────────┘     │     │
│  └─────────────────┼──────────────────────────────────┘     │
│                    │                                         │
│                    ▼                                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              LiveProvider (WebSocket)                │    │
│  │                                                       │    │
│  │  publish(event) {                                    │    │
│  │    websocket.send({                                  │    │
│  │      channel: event.channel,                         │    │
│  │      type: event.type,                               │    │
│  │      payload: event.payload                          │    │
│  │    });                                                │    │
│  │  }                                                    │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                     │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │          WebSocket Server / Message Broker           │     │
│  │                                                       │     │
│  │  • Ably                                              │     │
│  │  • Pusher                                            │     │
│  │  • Socket.io                                         │     │
│  │  • Redis Pub/Sub                                     │     │
│  │  • Custom WebSocket                                  │     │
│  └──────────────────────┬───────────────────────────────┘     │
│                         │                                     │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │      BROADCAST TO ALL SUBSCRIBERS                    │     │
│  └──┬──────────────────┬──────────────────┬────────────┘     │
│     │                  │                  │                   │
│     ▼                  ▼                  ▼                   │
│  ┌─────────┐     ┌──────────┐     ┌──────────┐             │
│  │Client B │     │Client C  │     │Client D  │             │
│  │         │     │          │     │          │             │
│  │Subscribe│     │Subscribe │     │Subscribe │             │
│  └────┬────┘     └─────┬────┘     └─────┬────┘             │
│       │                │                 │                   │
│       ▼                ▼                 ▼                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │   useResourceSubscription (Receivers)                │    │
│  │                                                       │    │
│  │   if (liveMode === "auto") {                         │    │
│  │     invalidate({ ... });  // Auto refresh           │    │
│  │   }                                                   │    │
│  │                                                       │    │
│  │   onLiveEvent(event);     // Callback                │    │
│  └─────────────────────────────────────────────────────┘    │
│                         │                                     │
│                         ▼                                     │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              UI AUTO-UPDATES                         │     │
│  │                                                       │     │
│  │  • PostList shows new post                           │     │
│  │  • Notifications appear                              │     │
│  │  • Counters increment                                │     │
│  └─────────────────────────────────────────────────────┘     │
│                                                               │
└───────────────────────────────────────────────────────────────┘

LUỒNG HOẠT ĐỘNG PUBLISHER → SUBSCRIBERS:

Client A (Publisher)                    Clients B,C,D (Subscribers)
     │                                           │
     │ 1. User creates post                      │
     ├─────► Backend API                         │
     │                                            │
     │ 2. Backend saves to DB                    │
     │       ✅ Success                           │
     │                                            │
     │ 3. publish({ type: "created" })           │
     ├─────► WebSocket Server                    │
     │                                            │
     │ 4. Server broadcasts to channel           │
     │       "resources/posts"                   │
     │                 │                          │
     │                 └──────────────────────►  │
     │                                            │
     │                          5. Receive event │
     │                          6. Invalidate    │
     │                          7. Refetch data  │
     │                          8. UI updates ✨ │
     │                                            │
```

### Ví dụ thực tế:

Giống như hệ thống thông báo Facebook:

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Facebook Like System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User A likes a post
function LikeButton({ postId }) {
  const handleLike = () => {
    // 1. Update server
    await api.likePost(postId);

    // 2. Broadcast to other users (usePublish equivalent)
    notificationSystem.broadcast({
      channel: `post/${postId}`,
      type: "liked",
      payload: { userId: currentUser.id }
    });
  };
}

// User B,C,D viewing the same post
function PostView({ postId }) {
  // Subscribe to likes (useSubscription equivalent)
  useEffect(() => {
    notificationSystem.subscribe(`post/${postId}`, (event) => {
      if (event.type === "liked") {
        // Update like count in real-time
        setLikes(prev => prev + 1);
      }
    });
  }, [postId]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG REFINE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User A creates a post
function CreatePost() {
  const { mutate } = useCreate();
  const publish = usePublish();

  const handleSubmit = (values) => {
    mutate(
      {
        resource: "posts",
        values
      },
      {
        onSuccess: (data) => {
          // Broadcast to other users
          publish?.({
            channel: "resources/posts",
            type: "created",
            payload: { ids: [data.data.id] },
            date: new Date()
          });
        }
      }
    );
  };
}

// User B,C,D viewing post list
function PostList() {
  const { data } = useList({
    resource: "posts",
    liveMode: "auto"  // Auto-subscribe & invalidate
  });
  // → Automatically sees new post from User A!
}
```

## 2. Luồng hoạt động chi tiết

### Sơ đồ luồng đầy đủ:

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: APP INITIALIZATION                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  <Refine                                                      │
│    liveProvider={{                                           │
│      subscribe: (options) => { ... },                        │
│      unsubscribe: (subscription) => { ... },                 │
│      publish: (event) => {         ← Implement this!         │
│        // Send event to WebSocket server                     │
│        websocket.send(JSON.stringify(event));                │
│      }                                                        │
│    }}                                                         │
│  >                                                            │
│    <App />                                                    │
│  </Refine>                                                    │
│                                                               │
│  → LiveContext.liveProvider.publish = publish function       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: COMPONENT RENDER                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  function CreatePost() {                                     │
│    const publish = usePublish();                             │
│    const { mutate } = useCreate();                           │
│                                                               │
│    // publish is now available                               │
│  }                                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3: usePublish HOOK EXECUTION                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  export const usePublish = () => {                           │
│    // 3.1: Get LiveProvider from context                     │
│    const { liveProvider } = useContext(LiveContext);        │
│                                                               │
│    // 3.2: Return publish function (or undefined)            │
│    return liveProvider?.publish;                             │
│  };                                                           │
│                                                               │
│  Result:                                                      │
│  • If liveProvider exists → return publish function ✅       │
│  • If no liveProvider → return undefined ✅                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 4: USER ACTION (Mutation)                              │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  const handleSubmit = (values) => {                          │
│    mutate(                                                    │
│      {                                                        │
│        resource: "posts",                                    │
│        values: {                                             │
│          title: "New Post",                                  │
│          content: "..."                                      │
│        }                                                      │
│      },                                                       │
│      {                                                        │
│        onSuccess: (data) => {                                │
│          // Mutation successful → move to BƯỚC 5             │
│        }                                                      │
│      }                                                        │
│    );                                                         │
│  };                                                           │
│                                                               │
│  User clicks "Submit" button                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 5: PUBLISH EVENT                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  onSuccess: (data) => {                                      │
│    // 5.1: Construct LiveEvent                               │
│    const event = {                                           │
│      channel: "resources/posts",                             │
│      type: "created",                                        │
│      payload: {                                              │
│        ids: [data.data.id]                                   │
│      },                                                       │
│      date: new Date(),                                       │
│      meta: {                                                 │
│        dataProviderName: "default"                           │
│      }                                                        │
│    };                                                         │
│                                                               │
│    // 5.2: Call publish (optional chaining for safety)       │
│    publish?.(event);                                         │
│  }                                                            │
│                                                               │
│  ⚠️ publish?.() uses optional chaining:                      │
│    • If publish exists → call it ✅                          │
│    • If publish is undefined → no-op (no error) ✅           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 6: LiveProvider IMPLEMENTATION                         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  // User's implementation                                    │
│  const liveProvider = {                                      │
│    publish: (event: LiveEvent) => {                          │
│      // Implementation depends on technology:                │
│                                                               │
│      // Option 1: Socket.io                                  │
│      socket.emit(event.channel, event);                      │
│                                                               │
│      // Option 2: Ably                                       │
│      const channel = ably.channels.get(event.channel);       │
│      channel.publish(event.type, event.payload);             │
│                                                               │
│      // Option 3: Pusher                                     │
│      pusher.trigger(event.channel, event.type, event);       │
│                                                               │
│      // Option 4: Custom WebSocket                           │
│      websocket.send(JSON.stringify(event));                  │
│                                                               │
│      // Option 5: HTTP endpoint (fallback)                   │
│      fetch('/api/broadcast', {                               │
│        method: 'POST',                                       │
│        body: JSON.stringify(event)                           │
│      });                                                      │
│    }                                                          │
│  };                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 7: SERVER BROADCAST                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Server receives event và broadcast đến tất cả clients       │
│  subscribe channel "resources/posts"                         │
│                                                               │
│  Server-side code (example với Socket.io):                   │
│                                                               │
│  io.on('connection', (socket) => {                           │
│    socket.on('resources/posts', (event) => {                 │
│      // Broadcast to all clients except sender              │
│      socket.broadcast.emit('resources/posts', event);        │
│                                                               │
│      // Or broadcast to all including sender                 │
│      io.emit('resources/posts', event);                      │
│                                                               │
│      // Or broadcast to specific room                        │
│      io.to('posts-room').emit('resources/posts', event);     │
│    });                                                        │
│  });                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 8: SUBSCRIBERS RECEIVE EVENT                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Other clients subscribed to "resources/posts" receive       │
│  the event via useResourceSubscription                       │
│                                                               │
│  useResourceSubscription({                                   │
│    channel: "resources/posts",                               │
│    liveMode: "auto",                                         │
│    onLiveEvent: (event) => {                                 │
│      console.log("Received:", event);                        │
│      // { type: "created", payload: { ids: [123] } }        │
│    }                                                          │
│  });                                                          │
│                                                               │
│  If liveMode = "auto":                                       │
│    → Automatically invalidate cache                          │
│    → Refetch data                                            │
│    → UI updates                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 9: COMPLETE FLOW                                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Publisher                          Subscribers              │
│                                                               │
│  1. Create post                    (Waiting...)              │
│  2. Save to DB ✅                                            │
│  3. publish(event) ────────►  4. Receive event              │
│                                5. Invalidate cache           │
│                                6. Refetch data               │
│                                7. UI shows new post ✨       │
│                                                               │
│  ✅ Real-time collaboration achieved!                        │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
EVENT STRUCTURE BREAKDOWN
═══════════════════════════════════════════════════════════════

publish({
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // channel: WHERE to broadcast
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  channel: "resources/posts",
  // Convention: "resources/{resourceName}"
  // Subscribers use this to filter events
  // Examples:
  //   "resources/posts"
  //   "resources/users"
  //   "resources/comments"
  //   "notifications"  (custom channel)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // type: WHAT happened
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  type: "created" | "updated" | "deleted" | "*" | string,
  // Standard types:
  //   "created" → useCreate
  //   "updated" → useUpdate/useUpdateMany
  //   "deleted" → useDelete/useDeleteMany
  //   "*"       → Match all events
  //   custom    → Custom events (e.g., "approved", "published")

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // payload: EVENT DATA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  payload: {
    ids: [123],  // IDs of affected records
    // ... any additional data
    title: "New Post",  // Optional: include changed data
    userId: 456         // Optional: who triggered
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // date: WHEN it happened
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  date: new Date(),
  // Timestamp for ordering events
  // Useful for conflict resolution

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // meta: METADATA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  meta: {
    dataProviderName: "default",  // Which data provider
    // ... any additional metadata
  }
});
```

## 3. Design Patterns được sử dụng

### Pattern 1: Accessor Pattern (Mẫu Truy cập)

**Khái niệm:**
Hook chỉ cung cấp access đến một function/value từ context, không thêm logic phức tạp.

**Tại sao dùng:**
- Single responsibility
- Simple API
- Encapsulation

**Cách implement:**

```typescript
export const usePublish = () => {
  const { liveProvider } = useContext(LiveContext);
  return liveProvider?.publish;
};

// Just an accessor - no additional logic
// Get from context → return directly
```

**So sánh với alternatives:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ❌ ALTERNATIVE 1: Direct context usage (bad)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const { liveProvider } = useContext(LiveContext);

  const handleSuccess = () => {
    liveProvider?.publish?.({ ... });
    //           ^^^^^^^^^ Too verbose, error-prone
  };
}

// Problems:
// • Verbose (liveProvider?.publish?)
// • Couples component to LiveContext
// • Hard to mock in tests
// • Not reusable

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ CURRENT APPROACH: Accessor hook (good)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const publish = usePublish();

  const handleSuccess = () => {
    publish?.({ ... });
    //      ^ Clean, simple
  };
}

// Benefits:
// • Concise
// • Decoupled from context implementation
// • Easy to mock (just mock usePublish)
// • Reusable
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Database connection accessor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Without accessor:
function UserService() {
  const { dbContext } = useContext(AppContext);
  const connection = dbContext?.pool?.connection;

  const getUser = () => {
    return connection?.query("SELECT * FROM users");
  };
}

// ✅ With accessor:
function useDB() {
  const { dbContext } = useContext(AppContext);
  return dbContext?.pool?.connection;
}

function UserService() {
  const db = useDB();  // Clean!

  const getUser = () => {
    return db?.query("SELECT * FROM users");
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING với usePublish:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Without usePublish:
function CreatePost() {
  const { liveProvider } = useContext(LiveContext);

  liveProvider?.publish?.({ ... });  // Verbose
}

// ✅ With usePublish:
function CreatePost() {
  const publish = usePublish();  // Clean!

  publish?.({ ... });
}
```

**Lợi ích:**
- **Simplicity:** Clean API
- **Encapsulation:** Hide context details
- **Testability:** Easy to mock
- **Reusability:** Use anywhere

### Pattern 2: Optional Chaining Pattern (Mẫu Chuỗi Tùy chọn)

**Khái niệm:**
Sử dụng `?.` operator để safely access properties/methods có thể undefined.

**Tại sao dùng:**
- liveProvider có thể không được setup
- publish function optional trong LiveProvider
- Prevent runtime errors

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IN usePublish:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const usePublish = () => {
  const { liveProvider } = useContext(LiveContext);
  return liveProvider?.publish;
  //                  ^^ Optional chaining
  // If liveProvider is null/undefined → return undefined (no error)
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IN CONSUMER CODE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const publish = usePublish();

publish?.({ ... });
//      ^^ Optional chaining
// If publish is undefined → no-op (no error)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SAFETY CHAIN:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Level 1: LiveContext may not have liveProvider
const { liveProvider } = useContext(LiveContext);
//       ^^^^^^^^^^^^ may be undefined

// Level 2: liveProvider may not have publish
return liveProvider?.publish;
//                  ^^ safe access

// Level 3: publish may be undefined
publish?.({ ... });
//      ^^ safe call

// All 3 levels protected! ✅
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Optional features
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ WITHOUT optional chaining (dangerous):
function trackEvent(eventName) {
  if (analytics) {
    if (analytics.track) {
      analytics.track(eventName);
    }
  }
}
// Verbose! 😫

// ✅ WITH optional chaining (safe & clean):
function trackEvent(eventName) {
  analytics?.track?.(eventName);
}
// Clean! 😊

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIOS:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: No liveProvider setup (development)
<Refine>  {/* No liveProvider */}
  <CreatePost />
</Refine>

const publish = usePublish();  // → undefined
publish?.({ ... });            // → no-op (no error) ✅

// Scenario 2: liveProvider without publish (subscribe-only)
<Refine
  liveProvider={{
    subscribe: () => {},
    unsubscribe: () => {}
    // No publish!
  }}
>
  <CreatePost />
</Refine>

const publish = usePublish();  // → undefined
publish?.({ ... });            // → no-op (no error) ✅

// Scenario 3: Full liveProvider
<Refine
  liveProvider={{
    subscribe: () => {},
    unsubscribe: () => {},
    publish: (event) => { ... }  // ✅ Has publish
  }}
>
  <CreatePost />
</Refine>

const publish = usePublish();  // → function
publish?.({ ... });            // → calls function ✅
```

**Lợi ích:**
- **Safety:** No runtime errors
- **Graceful Degradation:** Works without liveProvider
- **Developer Experience:** Không cần defensive checks
- **Flexibility:** Optional feature doesn't break app

### Pattern 3: Pub/Sub Pattern (Mẫu Xuất bản/Đăng ký)

**Khái niệm:**
Publishers gửi messages đến channels, subscribers nhận messages từ channels. Publishers không biết về subscribers và ngược lại.

**Tại sao dùng:**
- Decoupling giữa publishers và subscribers
- Scalability (many-to-many communication)
- Real-time updates

**Cách hoạt động:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PUBLISH (usePublish)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Publisher doesn't know who's listening
const publish = usePublish();

publish?.({
  channel: "resources/posts",  // Broadcast to channel
  type: "created",
  payload: { ids: [123] }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUBSCRIBE (useSubscription/useResourceSubscription)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Subscriber listens to channel
useSubscription({
  channel: "resources/posts",  // Same channel
  onLiveEvent: (event) => {
    console.log("Received:", event);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DECOUPLING:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────┐                  ┌─────────────┐
│ Publisher A │─────┐            │Subscriber 1 │
└─────────────┘     │            └─────────────┘
                    │                   ▲
┌─────────────┐     │                   │
│ Publisher B │─────┼───► Channel ──────┤
└─────────────┘     │                   │
                    │                   ▼
┌─────────────┐     │            ┌─────────────┐
│ Publisher C │─────┘            │Subscriber 2 │
└─────────────┘                  └─────────────┘

• Publishers không biết về subscribers
• Subscribers không biết về publishers
• Communication qua channel (message broker)
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: YouTube Notification System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// PUBLISHER: YouTuber uploads video
class YouTuber {
  uploadVideo(video) {
    // Save video to DB
    db.save(video);

    // Publish event (doesn't know about subscribers)
    notificationSystem.publish({
      channel: `channel/${this.channelId}`,
      type: "video_uploaded",
      payload: { videoId: video.id }
    });
  }
}

// SUBSCRIBERS: Fans subscribed to channel
class Fan {
  constructor(channelId) {
    // Subscribe to channel (doesn't know about publisher)
    notificationSystem.subscribe(`channel/${channelId}`, (event) => {
      if (event.type === "video_uploaded") {
        this.showNotification(`New video: ${event.payload.videoId}`);
      }
    });
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING với Refine:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// PUBLISHER: User creates post
function CreatePostPage() {
  const publish = usePublish();
  const { mutate } = useCreate();

  const handleSubmit = () => {
    mutate(values, {
      onSuccess: (data) => {
        // Publish event
        publish?.({
          channel: "resources/posts",
          type: "created",
          payload: { ids: [data.data.id] }
        });
      }
    });
  };
}

// SUBSCRIBER 1: Post list page
function PostListPage() {
  const { data } = useList({
    resource: "posts",
    liveMode: "auto"  // Auto-subscribe & invalidate
  });
}

// SUBSCRIBER 2: Dashboard widget
function RecentPostsWidget() {
  const { data } = useList({
    resource: "posts",
    liveMode: "auto",
    pagination: { current: 1, pageSize: 5 }
  });
}

// SUBSCRIBER 3: Notification center
function NotificationCenter() {
  useSubscription({
    channel: "resources/posts",
    onLiveEvent: (event) => {
      showToast(`New post created!`);
    }
  });
}

// All 3 subscribers receive the same event! ✅
// Publisher doesn't know about them! ✅
```

**Lợi ích:**
- **Decoupling:** Publishers và subscribers độc lập
- **Scalability:** Add/remove subscribers dễ dàng
- **Flexibility:** Multiple subscribers per channel
- **Real-time:** Instant communication

### Pattern 4: Event-Driven Architecture (Kiến trúc Hướng sự kiện)

**Khái niệm:**
Application logic triggered bởi events thay vì direct function calls.

**Tại sao dùng:**
- Loose coupling
- Asynchronous communication
- Easy to add new features (just subscribe to events)

**Cách hoạt động:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRADITIONAL ARCHITECTURE (Tight coupling)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createPost(data) {
  // 1. Save to DB
  const post = db.posts.create(data);

  // 2. Direct calls (tight coupling)
  invalidatePostList();
  sendEmailNotification(post);
  updateAnalytics(post);
  logAudit(post);
  // New requirement? Add more calls here!
}

// Problems:
// • createPost knows about all downstream systems
// • Hard to add new features
// • Synchronous (slow)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EVENT-DRIVEN ARCHITECTURE (Loose coupling)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createPost(data) {
  // 1. Save to DB
  const post = db.posts.create(data);

  // 2. Publish event (loose coupling)
  publish({
    channel: "resources/posts",
    type: "created",
    payload: { ids: [post.id] }
  });
  // Done! Don't care who's listening
}

// Event handlers (independent):

// Handler 1: Invalidate cache
useResourceSubscription({
  channel: "resources/posts",
  liveMode: "auto"
  // Auto invalidate
});

// Handler 2: Send email
useSubscription({
  channel: "resources/posts",
  onLiveEvent: (event) => {
    if (event.type === "created") {
      emailService.send({ ... });
    }
  }
});

// Handler 3: Analytics
useSubscription({
  channel: "resources/posts",
  onLiveEvent: (event) => {
    if (event.type === "created") {
      analytics.track("post_created");
    }
  }
});

// Handler 4: Audit log
useSubscription({
  channel: "resources/posts",
  onLiveEvent: (event) => {
    auditLog.write(event);
  }
});

// Benefits:
// • createPost doesn't know about handlers
// • Easy to add new handlers (just subscribe)
// • Asynchronous
// • Scalable
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: E-commerce Order System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Publisher: Create order
function CreateOrderPage() {
  const publish = usePublish();

  const handleCheckout = (order) => {
    // Save order
    const result = await api.createOrder(order);

    // Publish event
    publish?.({
      channel: "orders",
      type: "created",
      payload: {
        orderId: result.id,
        userId: order.userId,
        total: order.total
      }
    });
  };
}

// Subscriber 1: Inventory service (decrease stock)
useSubscription({
  channel: "orders",
  onLiveEvent: (event) => {
    if (event.type === "created") {
      inventoryService.decreaseStock(event.payload);
    }
  }
});

// Subscriber 2: Payment service (charge card)
useSubscription({
  channel: "orders",
  onLiveEvent: (event) => {
    if (event.type === "created") {
      paymentService.charge(event.payload);
    }
  }
});

// Subscriber 3: Email service (send confirmation)
useSubscription({
  channel: "orders",
  onLiveEvent: (event) => {
    if (event.type === "created") {
      emailService.sendOrderConfirmation(event.payload);
    }
  }
});

// Subscriber 4: Analytics (track revenue)
useSubscription({
  channel: "orders",
  onLiveEvent: (event) => {
    if (event.type === "created") {
      analytics.trackRevenue(event.payload.total);
    }
  }
});

// All services independent! ✅
// Easy to add new services! ✅
// No changes to CreateOrderPage needed! ✅
```

**Lợi ích:**
- **Loose Coupling:** Components độc lập
- **Extensibility:** Dễ thêm features mới
- **Scalability:** Distributed system
- **Maintainability:** Dễ debug, test

### Pattern 5: Facade Pattern (Mẫu Mặt tiền)

**Khái niệm:**
Cung cấp simple interface che giấu complex subsystem.

**Tại sao dùng:**
- WebSocket/live provider API phức tạp
- Different providers có different APIs
- User chỉ cần simple publish() function

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPLEX SUBSYSTEMS (Different WebSocket libraries)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Socket.io
socket.emit(channel, data);

// Ably
const channel = ably.channels.get(channelName);
channel.publish(eventName, data);

// Pusher
pusher.trigger(channel, event, data);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACADE: usePublish (Unified interface)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User code (same regardless of provider):
const publish = usePublish();

publish?.({
  channel: "resources/posts",
  type: "created",
  payload: { ... }
});

// Behind the scenes, liveProvider abstracts:
const liveProvider = {
  publish: (event) => {
    // Could be Socket.io:
    socket.emit(event.channel, event);

    // Could be Ably:
    ably.channels.get(event.channel).publish(event.type, event);

    // Could be Pusher:
    pusher.trigger(event.channel, event.type, event);

    // User doesn't care! ✅
  }
};
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Payment Gateway Facade
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// COMPLEX: Different payment APIs
// Stripe:
const paymentIntent = await stripe.paymentIntents.create({
  amount: 2000,
  currency: 'usd',
  payment_method: 'pm_xxx'
});

// PayPal:
const order = await paypal.orders.create({
  intent: 'CAPTURE',
  purchase_units: [{
    amount: { value: '20.00' }
  }]
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FACADE: Unified payment interface
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const paymentProvider = {
  charge: (amount, currency) => {
    switch (config.provider) {
      case 'stripe':
        return stripe.paymentIntents.create({ ... });
      case 'paypal':
        return paypal.orders.create({ ... });
    }
  }
};

function usePayment() {
  return paymentProvider.charge;
}

// User code (simple):
const charge = usePayment();
await charge(20, 'USD');  // Works with any provider!

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING với usePublish:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User code (simple):
const publish = usePublish();
publish?.({ channel, type, payload });

// Behind the scenes (complex):
// • Socket.io setup
// • Connection management
// • Retry logic
// • Error handling
// • Message serialization
// User doesn't need to know! ✅
```

**Lợi ích:**
- **Simplicity:** Simple API for users
- **Abstraction:** Hide complexity
- **Flexibility:** Swap providers easily
- **Consistency:** Same API across providers

## 4. Các tính năng chính

### 1. Simple API

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook signature - extremely simple
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const usePublish: () => ((event: LiveEvent) => void) | undefined

// Input: none
// Output: publish function or undefined

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Usage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const publish = usePublish();

publish?.({
  channel: string,
  type: "created" | "updated" | "deleted" | "*" | string,
  payload: { ids?: BaseKey[]; [key: string]: any },
  date: Date,
  meta?: { dataProviderName?: string; [key: string]: any }
});
```

### 2. Type-Safe Events

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LiveEvent type definition
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type LiveEvent = {
  channel: string;
  type: "deleted" | "updated" | "created" | "*" | string;
  payload: {
    ids?: BaseKey[];
    [x: string]: any;
  };
  date: Date;
  meta?: MetaQuery & {
    dataProviderName?: string;
  };
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TypeScript ensures correct usage
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

publish?.({
  channel: "resources/posts",  // ✅ string
  type: "created",             // ✅ valid type
  payload: { ids: [123] },     // ✅ correct structure
  date: new Date(),            // ✅ Date object
  meta: { dataProviderName: "default" }  // ✅ optional
});

// Type errors:
publish?.({
  channel: 123,  // ❌ Error: Type 'number' is not assignable to type 'string'
  type: "invalid",  // ⚠️ Warning: Not a standard type
  date: "2024-01-01"  // ❌ Error: Type 'string' is not assignable to type 'Date'
});
```

### 3. Optional Chaining Safety

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Safe to call even without liveProvider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const publish = usePublish();  // May be undefined

// Safe call - no error if undefined
publish?.({ ... });

// Equivalent to:
if (publish) {
  publish({ ... });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Scenarios
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: No liveProvider (development)
<Refine>
  <App />
</Refine>

const publish = usePublish();  // → undefined
publish?.({ ... });            // → no-op ✅

// Scenario 2: liveProvider without publish
<Refine
  liveProvider={{
    subscribe: () => {},
    unsubscribe: () => {}
  }}
>
  <App />
</Refine>

const publish = usePublish();  // → undefined
publish?.({ ... });            // → no-op ✅

// Scenario 3: Full liveProvider
<Refine
  liveProvider={{
    subscribe: () => {},
    unsubscribe: () => {},
    publish: (event) => { ... }
  }}
>
  <App />
</Refine>

const publish = usePublish();  // → function
publish?.({ ... });            // → executes ✅
```

### 4. Integrated with Mutation Hooks

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useCreate/useUpdate/useDelete automatically call usePublish
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Internal implementation in useCreate:
export const useCreate = () => {
  const publish = usePublish();  // Get publish function

  const mutation = useMutation({
    mutationFn: async ({ resource, values }) => {
      return dataProvider.create({ resource, variables: values });
    },
    onSuccess: (data, variables) => {
      // Auto-publish event
      publish?.({
        channel: `resources/${variables.resource}`,
        type: "created",
        payload: { ids: [data.data.id] },
        date: new Date()
      });
    }
  });

  return mutation;
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// User code - no need to manually publish!
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const { mutate } = useCreate();

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values
    });
    // publish() called automatically! ✅
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Custom publish (override behavior)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const { mutate } = useCreate();
  const publish = usePublish();

  const handleSubmit = (values) => {
    mutate(
      {
        resource: "posts",
        values
      },
      {
        onSuccess: (data) => {
          // Custom publish with additional data
          publish?.({
            channel: "resources/posts",
            type: "created",
            payload: {
              ids: [data.data.id],
              title: values.title,  // Include title
              authorId: currentUser.id  // Include author
            },
            date: new Date()
          });
        }
      }
    );
  };
}
```

## 5. Use Cases thực tế

### Use Case 1: Real-time Collaboration

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Google Docs-like collaboration
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DocumentEditor({ documentId }) {
  const publish = usePublish();
  const [content, setContent] = useState("");

  // Publish typing events
  const handleChange = (newContent) => {
    setContent(newContent);

    publish?.({
      channel: `documents/${documentId}`,
      type: "updated",
      payload: {
        ids: [documentId],
        content: newContent,
        userId: currentUser.id,
        cursor: editor.getCursorPosition()
      },
      date: new Date()
    });
  };

  // Subscribe to changes from other users
  useSubscription({
    channel: `documents/${documentId}`,
    onLiveEvent: (event) => {
      if (event.type === "updated" && event.payload.userId !== currentUser.id) {
        setContent(event.payload.content);
        // Show other user's cursor
        showCursor(event.payload.userId, event.payload.cursor);
      }
    }
  });

  return <Editor value={content} onChange={handleChange} />;
}
```

### Use Case 2: Live Notifications

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Social media notifications
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LikeButton({ postId }) {
  const publish = usePublish();
  const { mutate } = useUpdate();

  const handleLike = () => {
    mutate(
      {
        resource: "posts",
        id: postId,
        values: { likes: "increment" }
      },
      {
        onSuccess: () => {
          // Notify post author
          publish?.({
            channel: `users/${post.authorId}/notifications`,
            type: "liked",
            payload: {
              postId,
              likerId: currentUser.id,
              likerName: currentUser.name
            },
            date: new Date()
          });
        }
      }
    );
  };
}

// Post author receives notification
function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);

  useSubscription({
    channel: `users/${currentUser.id}/notifications`,
    onLiveEvent: (event) => {
      if (event.type === "liked") {
        setNotifications(prev => [
          {
            message: `${event.payload.likerName} liked your post`,
            time: event.date
          },
          ...prev
        ]);

        // Show toast
        toast.success(`${event.payload.likerName} liked your post!`);
      }
    }
  });

  return <NotificationList items={notifications} />;
}
```

### Use Case 3: Live Dashboard Updates

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Admin dashboard với real-time metrics
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OrderCreation() {
  const publish = usePublish();
  const { mutate } = useCreate();

  const handleCreateOrder = (values) => {
    mutate(
      {
        resource: "orders",
        values
      },
      {
        onSuccess: (data) => {
          // Publish to dashboard channel
          publish?.({
            channel: "dashboard/metrics",
            type: "order_created",
            payload: {
              orderId: data.data.id,
              amount: values.total,
              timestamp: new Date()
            },
            date: new Date()
          });
        }
      }
    );
  };
}

// Admin dashboard receives updates
function AdminDashboard() {
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    revenue: 0
  });

  useSubscription({
    channel: "dashboard/metrics",
    onLiveEvent: (event) => {
      if (event.type === "order_created") {
        setMetrics(prev => ({
          totalOrders: prev.totalOrders + 1,
          revenue: prev.revenue + event.payload.amount
        }));

        // Animate counter
        animateValue('totalOrders', prev.totalOrders, prev.totalOrders + 1);
      }
    }
  });

  return (
    <Dashboard>
      <MetricCard label="Total Orders" value={metrics.totalOrders} />
      <MetricCard label="Revenue" value={metrics.revenue} />
    </Dashboard>
  );
}
```

### Use Case 4: Multi-user Presence

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Show who's online
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UserPresence() {
  const publish = usePublish();

  useEffect(() => {
    // Announce presence
    publish?.({
      channel: "presence",
      type: "user_joined",
      payload: {
        userId: currentUser.id,
        userName: currentUser.name,
        avatar: currentUser.avatar
      },
      date: new Date()
    });

    // Heartbeat every 30s
    const interval = setInterval(() => {
      publish?.({
        channel: "presence",
        type: "heartbeat",
        payload: { userId: currentUser.id },
        date: new Date()
      });
    }, 30000);

    // Announce leaving
    return () => {
      clearInterval(interval);
      publish?.({
        channel: "presence",
        type: "user_left",
        payload: { userId: currentUser.id },
        date: new Date()
      });
    };
  }, []);
}

// Show online users
function OnlineUsers() {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useSubscription({
    channel: "presence",
    onLiveEvent: (event) => {
      switch (event.type) {
        case "user_joined":
          setOnlineUsers(prev => [...prev, event.payload]);
          break;
        case "user_left":
          setOnlineUsers(prev =>
            prev.filter(u => u.userId !== event.payload.userId)
          );
          break;
        case "heartbeat":
          // Update last seen
          setOnlineUsers(prev =>
            prev.map(u =>
              u.userId === event.payload.userId
                ? { ...u, lastSeen: event.date }
                : u
            )
          );
          break;
      }
    }
  });

  return (
    <div>
      <h3>Online ({onlineUsers.length})</h3>
      {onlineUsers.map(user => (
        <UserAvatar key={user.userId} {...user} />
      ))}
    </div>
  );
}
```

### Use Case 5: Custom Event Types

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Workflow approval system
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ApproveButton({ documentId }) {
  const publish = usePublish();
  const { mutate } = useUpdate();

  const handleApprove = () => {
    mutate(
      {
        resource: "documents",
        id: documentId,
        values: { status: "approved" }
      },
      {
        onSuccess: () => {
          // Custom event type: "approved"
          publish?.({
            channel: `documents/${documentId}`,
            type: "approved",  // Custom type!
            payload: {
              ids: [documentId],
              approvedBy: currentUser.id,
              approvedAt: new Date()
            },
            date: new Date()
          });
        }
      }
    );
  };
}

// Subscribers listen for custom event
useSubscription({
  channel: `documents/${documentId}`,
  types: ["approved", "rejected", "submitted"],  // Multiple custom types
  onLiveEvent: (event) => {
    switch (event.type) {
      case "approved":
        showNotification("Document approved!", "success");
        break;
      case "rejected":
        showNotification("Document rejected", "error");
        break;
      case "submitted":
        showNotification("Document submitted for review", "info");
        break;
    }
  }
});
```

### Use Case 6: Broadcast to Multiple Channels

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Broadcast event to multiple channels
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const publish = usePublish();
  const { mutate } = useCreate();

  const handleSubmit = (values) => {
    mutate(
      {
        resource: "posts",
        values
      },
      {
        onSuccess: (data) => {
          const postId = data.data.id;

          // Channel 1: Resource channel (for list updates)
          publish?.({
            channel: "resources/posts",
            type: "created",
            payload: { ids: [postId] },
            date: new Date()
          });

          // Channel 2: User's followers (for notifications)
          publish?.({
            channel: `users/${currentUser.id}/followers`,
            type: "new_post",
            payload: {
              postId,
              authorName: currentUser.name,
              title: values.title
            },
            date: new Date()
          });

          // Channel 3: Tag-specific channels
          values.tags.forEach(tag => {
            publish?.({
              channel: `tags/${tag}`,
              type: "new_post",
              payload: { postId, tag },
              date: new Date()
            });
          });
        }
      }
    );
  };
}
```

## 6. Quyết định kiến trúc

### Quyết định 1: Tại sao return function directly thay vì wrapper?

**Vấn đề:**
Có nên wrap publish function với additional logic?

**Các phương án:**

| Phương án | Code | Pros | Cons |
|-----------|------|------|------|
| **Direct return** ✅ | `return liveProvider?.publish` | Simple, no overhead | No custom logic |
| **Wrapper** | `return (event) => { /* logic */ liveProvider?.publish(event) }` | Can add logging, validation | Extra function call, complexity |

**Quyết định:** Direct return

**Code:**
```typescript
export const usePublish = () => {
  const { liveProvider } = useContext(LiveContext);
  return liveProvider?.publish;  // Direct return
};
```

**Lý do:**
- Simplicity - no unnecessary abstraction
- Performance - no extra function calls
- Flexibility - user can wrap if needed
- Trust liveProvider implementation

### Quyết định 2: Optional chaining (?.) vs explicit null check?

**Vấn đề:**
Cách handle undefined liveProvider?

**Các phương án:**

| Phương án | Code | Safety | Clarity |
|-----------|------|--------|---------|
| **Optional chaining** ✅ | `liveProvider?.publish` | ✅ Safe | ✅ Clean |
| **Explicit check** | `if (liveProvider) return liveProvider.publish` | ✅ Safe | ⚠️ Verbose |
| **Non-null assertion** | `liveProvider!.publish` | ❌ Unsafe | ✅ Clean |

**Quyết định:** Optional chaining

**Code:**
```typescript
return liveProvider?.publish;
//                  ^^ Optional chaining
```

**Lý do:**
- Safe - no runtime errors
- Concise - one line
- Modern JavaScript/TypeScript feature
- Consistent with codebase style

### Quyết định 3: Return type - strict function vs union with undefined?

**Vấn đề:**
Return type có nên include undefined?

**Các phương án:**

| Return type | Code | Type safety | Runtime safety |
|-------------|------|-------------|----------------|
| `(event: LiveEvent) => void` | Force non-null | ⚠️ Lie to TypeScript | ❌ May crash |
| `((event: LiveEvent) => void) \| undefined` ✅ | Allow undefined | ✅ Truthful | ✅ Safe |

**Quyết định:** Union with undefined

**Code:**
```typescript
export const usePublish: () =>
  | ((event: LiveEvent) => void)
  | undefined
```

**Lý do:**
- Truthful type - represents reality
- Forces users to use optional chaining
- Prevents runtime errors
- Better developer experience (IDE warnings)

### Quyết định 4: Separate hook vs direct context usage?

**Vấn đề:**
Có cần hook riêng hay dùng context trực tiếp?

**Các phương án:**

| Phương án | Code | Coupling | Reusability |
|-----------|------|----------|-------------|
| **Direct context** | `useContext(LiveContext).liveProvider?.publish` | High | Low |
| **Separate hook** ✅ | `usePublish()` | Low | High |

**Quyết định:** Separate hook

**Lý do:**
- Encapsulation - hide context details
- Reusability - use anywhere
- Testability - easy to mock
- Consistency - matches useSubscription pattern

## 7. Common Pitfalls (Những lỗi hay gặp)

### Pitfall 1: Forget optional chaining khi call publish

**Vấn đề:**
```typescript
// ❌ SAI - No optional chaining
const publish = usePublish();

publish({  // ⚠️ Error if publish is undefined!
  channel: "resources/posts",
  type: "created",
  payload: { ids: [123] }
});
```

**Hậu quả:**
- Runtime error: "Cannot read property '{}' of undefined"
- App crashes
- User sees error page

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Optional chaining
const publish = usePublish();

publish?.({  // ✅ Safe - no error if undefined
  channel: "resources/posts",
  type: "created",
  payload: { ids: [123] }
});
```

**Best Practice:**
- ALWAYS use `?.()` when calling publish
- TypeScript will warn if you forget
- Consider using ESLint rule to enforce

### Pitfall 2: Publish trong render (infinite loop)

**Vấn đề:**
```typescript
// ❌ SAI - Publish trong render
function Component() {
  const publish = usePublish();

  publish?.({  // ⚠️ NGUY HIỂM!
    channel: "resources/posts",
    type: "created",
    payload: { ids: [123] }
  });
  // → Chạy mỗi lần render
  // → Trigger subscribers
  // → Subscribers re-render
  // → Infinite loop! 💥

  return <div>...</div>;
}
```

**Hậu quả:**
- Infinite loop
- App hang/crash
- Network flooded with events
- Server overload

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Publish trong event handler
function Component() {
  const publish = usePublish();

  const handleClick = () => {
    publish?.({  // ✅ Only when user clicks
      channel: "resources/posts",
      type: "created",
      payload: { ids: [123] }
    });
  };

  return <button onClick={handleClick}>Publish</button>;
}

// ✅ ĐÚNG - Publish trong useEffect
function Component() {
  const publish = usePublish();

  useEffect(() => {
    publish?.({  // ✅ Only once on mount
      channel: "resources/posts",
      type: "created",
      payload: { ids: [123] }
    });
  }, []);  // Empty deps - run once

  return <div>...</div>;
}

// ✅ ĐÚNG - Publish trong mutation callback
function Component() {
  const publish = usePublish();
  const { mutate } = useCreate();

  const handleSubmit = () => {
    mutate(values, {
      onSuccess: () => {
        publish?.({  // ✅ Only after mutation success
          channel: "resources/posts",
          type: "created",
          payload: { ids: [123] }
        });
      }
    });
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Pitfall 3: Wrong channel name

**Vấn đề:**
```typescript
// ❌ SAI - Typo in channel name
const publish = usePublish();

publish?.({
  channel: "resource/posts",  // ⚠️ "resource" instead of "resources"
  type: "created",
  payload: { ids: [123] }
});

// Subscriber listening to different channel:
useSubscription({
  channel: "resources/posts",  // Correct channel
  onLiveEvent: (event) => {
    // Never receives event! ❌
  }
});
```

**Hậu quả:**
- Subscribers don't receive events
- Real-time updates not working
- Silent failure (no error)

**Giải pháp:**
```typescript
// ✅ OPTION 1: Use constants
const CHANNELS = {
  POSTS: "resources/posts",
  USERS: "resources/users",
  COMMENTS: "resources/comments"
} as const;

publish?.({
  channel: CHANNELS.POSTS,  // ✅ Type-safe
  type: "created",
  payload: { ids: [123] }
});

useSubscription({
  channel: CHANNELS.POSTS,  // ✅ Same constant
  onLiveEvent: (event) => { }
});

// ✅ OPTION 2: Helper function
const getResourceChannel = (resource: string) => `resources/${resource}`;

publish?.({
  channel: getResourceChannel("posts"),  // ✅ Consistent
  type: "created",
  payload: { ids: [123] }
});

useSubscription({
  channel: getResourceChannel("posts"),  // ✅ Same function
  onLiveEvent: (event) => { }
});
```

### Pitfall 4: Forget to include IDs trong payload

**Vấn đề:**
```typescript
// ❌ SAI - No IDs
publish?.({
  channel: "resources/posts",
  type: "created",
  payload: {}  // ⚠️ Empty payload!
});

// Subscriber doesn't know which records changed
useResourceSubscription({
  channel: "resources/posts",
  liveMode: "auto",
  onLiveEvent: (event) => {
    // event.payload.ids is undefined
    // Can't invalidate specific records
  }
});
```

**Hậu quả:**
- Subscribers can't identify affected records
- Must invalidate all data (performance issue)
- Inefficient cache updates

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Include IDs
publish?.({
  channel: "resources/posts",
  type: "created",
  payload: {
    ids: [123]  // ✅ Include affected IDs
  }
});

// ✅ BETTER - Include additional data
publish?.({
  channel: "resources/posts",
  type: "created",
  payload: {
    ids: [123],
    title: "New Post",  // Optional: useful for notifications
    authorId: 456       // Optional: for filtering
  }
});
```

### Pitfall 5: Publish before mutation success

**Vấn đề:**
```typescript
// ❌ SAI - Publish before mutation
const publish = usePublish();
const { mutate } = useCreate();

const handleSubmit = () => {
  // Publish BEFORE mutation
  publish?.({
    channel: "resources/posts",
    type: "created",
    payload: { ids: [null] }  // ⚠️ Don't have ID yet!
  });

  mutate({ resource: "posts", values });
  // What if mutation fails? ❌
};
```

**Hậu quả:**
- Subscribers receive event but record doesn't exist
- Inconsistent state
- Users see ghost data

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Publish AFTER mutation success
const publish = usePublish();
const { mutate } = useCreate();

const handleSubmit = () => {
  mutate(
    { resource: "posts", values },
    {
      onSuccess: (data) => {
        // Publish AFTER success
        publish?.({
          channel: "resources/posts",
          type: "created",
          payload: { ids: [data.data.id] }  // ✅ Have real ID
        });
      },
      onError: (error) => {
        // Don't publish if failed ✅
        console.error("Mutation failed:", error);
      }
    }
  );
};
```

### Pitfall 6: No liveProvider setup

**Vấn đề:**
```typescript
// ❌ SAI - No liveProvider
<Refine>
  <App />
</Refine>

// In component:
const publish = usePublish();  // → undefined
publish?.({ ... });            // → no-op (silent failure)
```

**Hậu quả:**
- No events published
- Real-time features not working
- Silent failure (confusing)

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Setup liveProvider
import { liveProvider } from "./liveProvider";

<Refine
  liveProvider={liveProvider}  // ✅ Required for live features
>
  <App />
</Refine>

// Now publish works:
const publish = usePublish();  // → function
publish?.({ ... });            // → publishes event ✅
```

## 8. Performance Considerations

### 1. Lightweight Hook

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// usePublish is extremely lightweight
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const usePublish = () => {
  const { liveProvider } = useContext(LiveContext);
  return liveProvider?.publish;
};

// Operations:
// 1. useContext - O(1)
// 2. Property access - O(1)
// Total: ~0.001ms ⚡
```

### 2. No Re-renders

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// usePublish doesn't cause re-renders
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function Component() {
  const publish = usePublish();
  // Only re-renders if LiveContext changes (rare)

  // Publishing event doesn't cause re-render
  const handleClick = () => {
    publish?.({ ... });  // No re-render ✅
  };
}
```

### 3. Throttle/Debounce High-Frequency Events

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Throttle rapid events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { throttle } from "lodash";

function DocumentEditor() {
  const publish = usePublish();

  // Throttle typing events
  const publishChange = useMemo(
    () => throttle((content) => {
      publish?.({
        channel: "documents/123",
        type: "updated",
        payload: { content }
      });
    }, 1000),  // Max 1 event per second
    []
  );

  const handleChange = (newContent) => {
    setContent(newContent);
    publishChange(newContent);
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Debounce for less critical events
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const publishChange = useMemo(
  () => debounce((content) => {
    publish?.({
      channel: "documents/123",
      type: "updated",
      payload: { content }
    });
  }, 2000),  // Wait 2s after typing stops
  []
);
```

### 4. Batch Events

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Batch multiple changes into single event
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BulkDelete({ selectedIds }) {
  const publish = usePublish();
  const { mutate } = useDeleteMany();

  const handleBulkDelete = () => {
    mutate(
      {
        resource: "posts",
        ids: selectedIds  // [1, 2, 3, 4, 5]
      },
      {
        onSuccess: () => {
          // Single event for multiple deletions
          publish?.({
            channel: "resources/posts",
            type: "deleted",
            payload: {
              ids: selectedIds  // ✅ Batch IDs
            }
          });
          // Better than 5 separate events! ⚡
        }
      }
    );
  };
}
```

### 5. Conditional Publishing

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Only publish when necessary
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UpdatePost({ id, field, value }) {
  const publish = usePublish();
  const { mutate } = useUpdate();

  const handleUpdate = () => {
    mutate(
      { resource: "posts", id, values: { [field]: value } },
      {
        onSuccess: () => {
          // Only publish for important changes
          const shouldPublish = [
            "title",
            "content",
            "status"
          ].includes(field);

          if (shouldPublish) {
            publish?.({
              channel: "resources/posts",
              type: "updated",
              payload: { ids: [id] }
            });
          }
          // Skip publishing for minor fields (views, clicks, etc.)
        }
      }
    );
  };
}
```

## 9. Testing

### Test 1: Basic Publish

```typescript
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { TestWrapper } from "@test";
import { usePublish } from "./";

describe("usePublish", () => {
  it("should return publish function from liveProvider", () => {
    const mockPublish = vi.fn();

    const { result } = renderHook(() => usePublish(), {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
          publish: mockPublish
        }
      })
    });

    expect(result.current).toBe(mockPublish);
  });
});
```

### Test 2: Publish Event

```typescript
it("should publish event with correct structure", () => {
  const mockPublish = vi.fn();

  const { result } = renderHook(() => usePublish(), {
    wrapper: TestWrapper({
      liveProvider: {
        subscribe: vi.fn(),
        unsubscribe: vi.fn(),
        publish: mockPublish
      }
    })
  });

  const event = {
    channel: "resources/posts",
    type: "created" as const,
    payload: { ids: [123] },
    date: new Date()
  };

  result.current?.(event);

  expect(mockPublish).toHaveBeenCalledWith(event);
  expect(mockPublish).toHaveBeenCalledTimes(1);
});
```

### Test 3: No LiveProvider

```typescript
it("should return undefined when no liveProvider", () => {
  const { result } = renderHook(() => usePublish(), {
    wrapper: TestWrapper({
      // No liveProvider
    })
  });

  expect(result.current).toBeUndefined();
});
```

### Test 4: Integration with useCreate

```typescript
it("should integrate with useCreate hook", async () => {
  const mockPublish = vi.fn();

  const { result } = renderHook(
    () => ({
      publish: usePublish(),
      create: useCreate()
    }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: vi.fn(),
          unsubscribe: vi.fn(),
          publish: mockPublish
        }
      })
    }
  );

  // Create a post
  result.current.create.mutate({
    resource: "posts",
    values: { title: "Test" }
  });

  await waitFor(() => {
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "resources/posts",
        type: "created"
      })
    );
  });
});
```

## 10. Kết luận

`usePublish` là hook **đơn giản nhưng mạnh mẽ** trong hệ thống real-time của Refine, cho phép broadcast events đến các clients khác.

### Điểm mạnh:

1. **Simple API** - Chỉ 1 function, dễ sử dụng
2. **Type-safe** - Full TypeScript support
3. **Safe** - Optional chaining prevents errors
4. **Integrated** - Works seamlessly với mutation hooks
5. **Flexible** - Support custom event types và channels

### Key Takeaways:

- **Publisher half** của Pub/Sub pattern
- **Always use `?.()`** when calling publish
- **Publish AFTER mutation success** (not before)
- **Include IDs** trong payload
- **Setup liveProvider** required
- **Throttle/debounce** high-frequency events

### Pattern Summary:

| Pattern | Vai trò |
|---------|---------|
| **Accessor** | Simple access to context value |
| **Optional Chaining** | Safe call even without provider |
| **Pub/Sub** | Decoupled communication |
| **Event-Driven** | Loose coupling architecture |
| **Façade** | Hide complex provider APIs |

### Related Hooks:

- `useLiveMode` - Configure live update mode
- `useSubscription` - Low-level subscription
- `useResourceSubscription` - High-level with auto-invalidation
- `useCreate/useUpdate/useDelete` - Auto-publish events

---

**Đọc thêm:**
- Refine Live Provider: https://refine.dev/docs/api-reference/core/providers/live-provider/
- Pub/Sub Pattern: https://en.wikipedia.org/wiki/Publish%E2%80%93subscribe_pattern
