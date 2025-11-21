# KIẾN TRÚC: useResourceSubscription Hook

## 1. Vai trò trong hệ thống

`useResourceSubscription` là **hook cấp cao** kết hợp subscription với automatic cache invalidation. Nó là "cầu nối thông minh" giữa live events và React Query cache, tự động refetch data khi có thay đổi từ server.

### Vị trí trong kiến trúc:

```
┌─────────────────────────────────────────────────────────────┐
│           REFINE REAL-TIME SYSTEM ARCHITECTURE               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │            APPLICATION LAYER                        │     │
│  │                                                      │     │
│  │  useList() / useOne() / useMany()                  │     │
│  │  ↓                                                  │     │
│  │  liveMode="auto" | "manual" | "off"                │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│                     ▼                                         │
│  ┌─────────────────────────────────────────────────────┐     │
│  │       useResourceSubscription (THIS HOOK)           │     │
│  │                                                      │     │
│  │  ┌────────────────────────────────────────────┐    │     │
│  │  │  ORCHESTRATION LAYER                       │    │     │
│  │  │                                            │    │     │
│  │  │  1. Resolve liveMode (prop vs context)    │    │     │
│  │  │  2. Get resource & data provider          │    │     │
│  │  │  3. Subscribe to live events               │    │     │
│  │  │  4. Handle events → invalidate cache      │    │     │
│  │  │  5. Cleanup on unmount                     │    │     │
│  │  └────────────────────────────────────────────┘    │     │
│  └──────────────────┬───────────────────────────────────┘     │
│                     │                                         │
│     ┌───────────────┼───────────────┬──────────────┐         │
│     │               │               │              │         │
│     ▼               ▼               ▼              ▼         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │useLive  │  │useResource│ │useInvali-│  │useSubsc- │     │
│  │Mode()   │  │Params()   │ │date()    │  │ription() │     │
│  └─────────┘  └──────────┘  └──────────┘  └──────────┘     │
│      │              │              │              │          │
│      ▼              ▼              ▼              ▼          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            UNDERLYING SYSTEMS                       │    │
│  │                                                      │    │
│  │  • RefineContext (global config)                   │    │
│  │  • LiveContext (liveProvider)                      │    │
│  │  • React Query (cache management)                  │    │
│  │  • WebSocket (real-time communication)             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────────────────────────────────────────┘

FLOW DIAGRAM - EVENT TO UI UPDATE:

┌─────────────────────────────────────────────────────────────┐
│  SERVER EVENT                                                │
│  User A creates/updates/deletes resource                    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  WEBSOCKET → liveProvider.subscribe()                       │
│  Event received: { channel, type, payload, date }           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  useResourceSubscription CALLBACK                            │
│                                                               │
│  callback(event) {                                           │
│    // Step 1: Check liveMode                                │
│    if (liveMode === "auto") {                                │
│      invalidate({ resource, invalidates: ["resourceAll"] }) │
│    }                                                          │
│                                                               │
│    // Step 2: Call user callbacks                            │
│    onLiveEvent?.(event);           // Hook-level callback    │
│    onLiveEventContextCallback?.(event); // Global callback   │
│  }                                                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ liveMode="auto" │  │liveMode="manual"│
│                 │  │                 │
│ Auto invalidate │  │ Just callback   │
└────────┬────────┘  └────────┬────────┘
         │                    │
         ▼                    │
┌─────────────────────────────┤
│ useInvalidate()             │
│                             │
│ invalidate({                │
│   resource: "posts",        │
│   invalidates:["resourceAll"]│
│ })                          │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  REACT QUERY CACHE INVALIDATION                             │
│                                                               │
│  queryClient.invalidateQueries({                             │
│    queryKey: ["data", "default", "posts"],                  │
│    refetchType: "active"                                     │
│  })                                                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  AUTO REFETCH                                                │
│                                                               │
│  • useList()  → refetch list                                │
│  • useOne()   → refetch detail                              │
│  • useMany()  → refetch many                                │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  UI UPDATE ✨                                                │
│                                                               │
│  • User B sees new data                                      │
│  • Real-time collaboration achieved                          │
│  • No manual refresh needed                                  │
└─────────────────────────────────────────────────────────────┘
```

### Ví dụ thực tế:

Giống như hệ thống cập nhật bảng điểm trực tuyến:

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Live Score Board
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Traditional approach (manual refresh):
function ScoreBoard() {
  const [scores, setScores] = useState([]);

  // User phải nhấn refresh button
  const handleRefresh = () => {
    fetch('/api/scores').then(res => setScores(res.data));
  };

  return (
    <div>
      <button onClick={handleRefresh}>🔄 Refresh</button>
      <ScoreList scores={scores} />
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WITH useResourceSubscription (automatic):
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ScoreBoard() {
  const { data: scores } = useList({
    resource: "scores",
    liveMode: "auto"  // ← Magic happens here!
  });
  // → Internally calls useResourceSubscription
  // → Automatically updates when new scores arrive
  // → No refresh button needed!

  return <ScoreList scores={scores} />;
}

// Behind the scenes:
useResourceSubscription({
  channel: "resources/scores",
  types: ["*"],
  liveMode: "auto",
  onLiveEvent: (event) => {
    // Auto invalidate cache
    // → React Query refetches
    // → UI updates
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG REFINE:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// User A (Admin) approves a post
function ApproveButton({ postId }) {
  const { mutate } = useUpdate();

  const handleApprove = () => {
    mutate({
      resource: "posts",
      id: postId,
      values: { status: "approved" }
    });
    // Server publishes event
  };
}

// User B (Author) sees approval instantly
function PostList() {
  const { data } = useList({
    resource: "posts",
    liveMode: "auto"
  });
  // → useResourceSubscription subscribed
  // → Receives "updated" event
  // → Auto invalidates cache
  // → Refetches list
  // → Shows "approved" status ✨
}
```

## 2. Luồng hoạt động chi tiết

### Sơ đồ luồng đầy đủ:

```
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: COMPONENT MOUNT                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  function PostList() {                                       │
│    const { data } = useList({                                │
│      resource: "posts",                                      │
│      liveMode: "auto"                                        │
│    });                                                        │
│                                                               │
│    // Internally, useList calls:                             │
│    useResourceSubscription({                                 │
│      channel: "resources/posts",                             │
│      types: ["*"],                                           │
│      liveMode: "auto",                                       │
│      ...                                                      │
│    });                                                        │
│  }                                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: HOOK INITIALIZATION                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  export const useResourceSubscription = ({                   │
│    resource: resourceFromProp,                               │
│    params,                                                    │
│    channel,                                                   │
│    types,                                                     │
│    enabled = true,                                           │
│    liveMode: liveModeFromProp,                               │
│    onLiveEvent,                                              │
│    meta                                                       │
│  }: UseResourceSubscriptionProps): void => {                 │
│                                                               │
│    // 2.1: Get resource params                               │
│    const { resource, identifier } = useResourceParams({      │
│      resource: resourceFromProp                              │
│    });                                                        │
│    // → resource = { name: "posts", identifier: "posts" }    │
│                                                               │
│    // 2.2: Get LiveProvider from context                     │
│    const { liveProvider } = useContext(LiveContext);        │
│                                                               │
│    // 2.3: Get global liveMode & callback from context       │
│    const {                                                    │
│      liveMode: liveModeFromContext,                          │
│      onLiveEvent: onLiveEventContextCallback                 │
│    } = useContext<IRefineContext>(RefineContext);            │
│                                                               │
│    // 2.4: Resolve liveMode (prop > context)                 │
│    const liveMode = liveModeFromProp ?? liveModeFromContext; │
│    // → "auto"                                               │
│                                                               │
│    // 2.5: Get invalidate function                           │
│    const invalidate = useInvalidate();                       │
│                                                               │
│    // 2.6: Get data provider name                            │
│    const dataProviderName =                                  │
│      meta?.dataProviderName ?? resource?.meta?.dataProviderName;│
│  };                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3: USEEFFECT SETUP                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  useEffect(() => {                                           │
│    let subscription: any;                                    │
│                                                               │
│    // 3.1: Define callback function                          │
│    const callback = (event: LiveEvent) => {                  │
│      // Will be called when event received                   │
│    };                                                         │
│                                                               │
│    // 3.2: Check conditions                                  │
│    if (liveMode && liveMode !== "off" && enabled) {         │
│      // Subscribe!                                           │
│    }                                                          │
│                                                               │
│    // 3.3: Cleanup function                                  │
│    return () => {                                            │
│      if (subscription) {                                     │
│        liveProvider?.unsubscribe(subscription);              │
│      }                                                        │
│    };                                                         │
│  }, [enabled]);  // Re-run when enabled changes              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 4: DEFINE CALLBACK                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  const callback = (event: LiveEvent) => {                    │
│    // ════════════════════════════════════════════          │
│    // LOGIC 1: Auto-invalidate (if liveMode="auto")          │
│    // ════════════════════════════════════════════          │
│    if (liveMode === "auto") {                                │
│      invalidate({                                            │
│        resource: identifier,            // "posts"           │
│        dataProviderName,                // "default"         │
│        invalidates: ["resourceAll"],    // Invalidate all    │
│        invalidationFilters: {                                │
│          type: "active",               // Only active queries│
│          refetchType: "active"         // Only active queries│
│        },                                                     │
│        invalidationOptions: {                                │
│          cancelRefetch: false          // Don't cancel ongoing│
│        }                                                      │
│      });                                                      │
│    }                                                          │
│                                                               │
│    // ════════════════════════════════════════════          │
│    // LOGIC 2: Call user callbacks                           │
│    // ════════════════════════════════════════════          │
│    onLiveEvent?.(event);                 // Hook-level       │
│    onLiveEventContextCallback?.(event);  // Global-level     │
│  };                                                           │
│                                                               │
│  ⚠️ IMPORTANT:                                                │
│  • liveMode="auto" → invalidate + callbacks                  │
│  • liveMode="manual" → only callbacks (no invalidate)        │
│  • liveMode="off" → won't subscribe (this code won't run)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 5: SUBSCRIBE TO LIVEPROVIDER                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  if (liveMode && liveMode !== "off" && enabled) {           │
│    subscription = liveProvider?.subscribe({                  │
│      channel: "resources/posts",                             │
│      params: {                                               │
│        resource: resource?.name,      // "posts"             │
│        ...params,                     // Additional params   │
│        // e.g., ids, filters, sorters, subscriptionType      │
│      },                                                       │
│      types: ["*"],                    // All event types      │
│      callback,                        // Our callback         │
│      meta: {                                                  │
│        ...meta,                                              │
│        dataProviderName               // "default"           │
│      }                                                        │
│    });                                                        │
│  }                                                            │
│                                                               │
│  → liveProvider establishes WebSocket connection             │
│  → Server notes this client subscribed to "resources/posts"  │
│  → Future events on this channel will trigger callback       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 6: WAITING FOR EVENTS                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Component rendered with initial data                        │
│  Subscription active, waiting for events...                  │
│                                                               │
│  Meanwhile, user can interact with UI normally               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ (time passes...)
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 7: EVENT RECEIVED                                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Server sends event:                                         │
│  {                                                            │
│    channel: "resources/posts",                               │
│    type: "created",                                          │
│    payload: { ids: [456] },                                  │
│    date: new Date()                                          │
│  }                                                            │
│                                                               │
│  → liveProvider receives via WebSocket                       │
│  → Calls our callback function                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 8: CALLBACK EXECUTION                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  callback({                                                   │
│    channel: "resources/posts",                               │
│    type: "created",                                          │
│    payload: { ids: [456] }                                   │
│  })                                                           │
│                                                               │
│  ┌──────────────────────────────────────────────┐           │
│  │ if (liveMode === "auto") {                   │           │
│  │   // YES - it's "auto"                       │           │
│  │   invalidate({                               │           │
│  │     resource: "posts",                       │           │
│  │     invalidates: ["resourceAll"]             │           │
│  │   });                                         │           │
│  │ }                                             │           │
│  └──────────────────────────────────────────────┘           │
│                                                               │
│  → Cache invalidated                                         │
│  → React Query marks queries as stale                        │
│  → Active queries refetch                                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 9: REACT QUERY REFETCH                                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  queryClient.invalidateQueries({                             │
│    queryKey: ["data", "default", "posts"],                  │
│    refetchType: "active"                                     │
│  })                                                           │
│                                                               │
│  → useList query is active → refetches                       │
│  → GET /api/posts → returns 11 posts (including new one)    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 10: UI UPDATE                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  function PostList() {                                       │
│    const { data } = useList({ resource: "posts" });         │
│    // data updated: 10 posts → 11 posts                     │
│                                                               │
│    return <Table data={data} />;                             │
│    // Re-renders with new data ✨                            │
│  }                                                            │
│                                                               │
│  User sees new post without manual refresh! 🎉               │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
CLEANUP FLOW (Component Unmount)
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  COMPONENT UNMOUNT                                           │
│                                                               │
│  • User navigates away from PostList                         │
│  • Component unmounts                                        │
│  • useEffect cleanup function runs                           │
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
│  → Unsubscribes from "resources/posts" channel               │
│  → Closes WebSocket connection (if no other subscriptions)  │
│  → Prevents memory leaks                                     │
│  → No more events received for this component                │
└─────────────────────────────────────────────────────────────┘
```

## 3. Design Patterns được sử dụng

### Pattern 1: Orchestrator Pattern (Mẫu Điều phối)

**Khái niệm:**
Một component/hook orchestrate (điều phối) nhiều sub-hooks/services để hoàn thành task phức tạp.

**Tại sao dùng:**
- Subscription + invalidation là 2 concerns riêng biệt
- Cần coordinate giữa LiveProvider, React Query, Context
- Single interface cho user (hide complexity)

**Cách implement:**

```typescript
export const useResourceSubscription = ({
  // ... params
}: UseResourceSubscriptionProps): void => {

  // ════════════════════════════════════════════════════
  // ORCHESTRATE SUB-HOOKS
  // ════════════════════════════════════════════════════

  // 1. Resource management
  const { resource, identifier } = useResourceParams({
    resource: resourceFromProp
  });

  // 2. Live provider access
  const { liveProvider } = useContext(LiveContext);

  // 3. Global config access
  const {
    liveMode: liveModeFromContext,
    onLiveEvent: onLiveEventContextCallback
  } = useContext<IRefineContext>(RefineContext);

  // 4. LiveMode resolution
  const liveMode = liveModeFromProp ?? liveModeFromContext;

  // 5. Cache invalidation
  const invalidate = useInvalidate();

  // ════════════════════════════════════════════════════
  // COORDINATE LOGIC
  // ════════════════════════════════════════════════════

  useEffect(() => {
    const callback = (event: LiveEvent) => {
      // Coordinate: invalidation + callbacks
      if (liveMode === "auto") {
        invalidate({ ... });  // Sub-hook 1
      }

      onLiveEvent?.(event);              // User callback
      onLiveEventContextCallback?.(event);  // Global callback
    };

    // Coordinate: subscription
    if (liveMode && liveMode !== "off" && enabled) {
      subscription = liveProvider?.subscribe({ ... });
    }

    // Coordinate: cleanup
    return () => {
      liveProvider?.unsubscribe(subscription);
    };
  }, [enabled]);
};
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Travel Booking Orchestrator
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ WITHOUT ORCHESTRATOR (user does everything):
function BookTrip() {
  const flightService = useFlights();
  const hotelService = useHotels();
  const carService = useCars();
  const paymentService = usePayments();
  const emailService = useEmails();

  const handleBook = async () => {
    // User coordinates manually
    const flight = await flightService.book();
    if (!flight) return;

    const hotel = await hotelService.book();
    if (!hotel) {
      await flightService.cancel(flight.id);  // Rollback
      return;
    }

    const car = await carService.book();
    // ... complex coordination
  };
}

// ✅ WITH ORCHESTRATOR (hide complexity):
function BookTrip() {
  const { book } = useTravelOrchestrator();

  const handleBook = async () => {
    await book({
      flight: { from: "HAN", to: "SGN" },
      hotel: { name: "Hilton" },
      car: { type: "sedan" }
    });
    // Orchestrator handles:
    // • Booking order
    // • Error handling
    // • Rollback on failure
    // • Payment
    // • Email confirmation
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useResourceSubscription:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ WITHOUT: User coordinates manually
function PostList() {
  const liveProvider = useContext(LiveContext).liveProvider;
  const invalidate = useInvalidate();
  const liveMode = useLiveMode();

  useEffect(() => {
    if (liveMode !== "off") {
      const subscription = liveProvider?.subscribe({
        channel: "resources/posts",
        callback: (event) => {
          if (liveMode === "auto") {
            invalidate({ resource: "posts", ... });
          }
        }
      });

      return () => liveProvider?.unsubscribe(subscription);
    }
  }, []);
}

// ✅ WITH: Orchestrator handles everything
function PostList() {
  useResourceSubscription({
    channel: "resources/posts",
    liveMode: "auto",
    resource: "posts"
  });
  // Done! Orchestrator handles:
  // • Subscription
  // • Invalidation
  // • Cleanup
}
```

**Lợi ích:**
- **Simplicity:** User code simple
- **Abstraction:** Hide complexity
- **Reusability:** Used by all data hooks
- **Maintainability:** Change logic in one place

### Pattern 2: Strategy Pattern (Mẫu Chiến lược) - LiveMode

**Khái niệm:**
Different strategies (auto/manual/off) change behavior dynamically.

**Tại sao dùng:**
- 3 modes require different behaviors
- User can switch modes at runtime
- Each mode has distinct logic

**Cách implement:**

```typescript
const callback = (event: LiveEvent) => {
  // ════════════════════════════════════════════════════
  // STRATEGY PATTERN: Behavior changes based on liveMode
  // ════════════════════════════════════════════════════

  switch (liveMode) {
    case "auto":
      // Strategy 1: Auto invalidate
      invalidate({
        resource: identifier,
        dataProviderName,
        invalidates: ["resourceAll"],
        invalidationFilters: {
          type: "active",
          refetchType: "active"
        },
        invalidationOptions: { cancelRefetch: false }
      });
      onLiveEvent?.(event);
      onLiveEventContextCallback?.(event);
      break;

    case "manual":
      // Strategy 2: Only callbacks (no invalidate)
      onLiveEvent?.(event);
      onLiveEventContextCallback?.(event);
      break;

    case "off":
      // Strategy 3: Won't subscribe (this code won't run)
      break;
  }
};

// Condition check prevents subscription for "off"
if (liveMode && liveMode !== "off" && enabled) {
  subscription = liveProvider?.subscribe({ ... });
}
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Notification Settings
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class NotificationManager {
  handleNotification(event, mode) {
    switch (mode) {
      case "instant":
        // Strategy 1: Show immediately
        showToast(event.message);
        break;

      case "digest":
        // Strategy 2: Collect and show later
        addToDigest(event.message);
        break;

      case "off":
        // Strategy 3: Do nothing
        break;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useResourceSubscription:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// liveMode="auto" → Instant update
useResourceSubscription({
  liveMode: "auto",  // Like "instant" notifications
  // → Auto invalidate cache
  // → UI updates immediately
});

// liveMode="manual" → Collected for later
useResourceSubscription({
  liveMode: "manual",  // Like "digest" notifications
  onLiveEvent: (event) => {
    // Collect events
    // User decides when to apply
  }
});

// liveMode="off" → No notifications
useResourceSubscription({
  liveMode: "off",  // Like "off" notifications
  // → Won't subscribe
  // → No events received
});
```

**Lợi ích:**
- **Flexibility:** User controls behavior
- **Runtime Switching:** Change mode without remount
- **Clear Separation:** Each strategy isolated
- **Testability:** Test each strategy independently

### Pattern 3: Observer Pattern (Mẫu Quan sát) - Callbacks

**Khái niệm:**
Multiple observers (callbacks) can listen to same event.

**Tại sao dùng:**
- 2 levels of callbacks (hook-level + global-level)
- Decoupling between event source and handlers
- Multiple handlers for same event

**Cách implement:**

```typescript
const callback = (event: LiveEvent) => {
  if (liveMode === "auto") {
    invalidate({ ... });
  }

  // ════════════════════════════════════════════════════
  // OBSERVER PATTERN: Notify all observers
  // ════════════════════════════════════════════════════

  // Observer 1: Hook-level callback (specific)
  onLiveEvent?.(event);

  // Observer 2: Context-level callback (global)
  onLiveEventContextCallback?.(event);
};

// Observers register interest:
<Refine
  onLiveEvent={(event) => {
    // Global observer
    console.log("Global:", event);
  }}
>
  {/* ... */}
</Refine>

useResourceSubscription({
  onLiveEvent: (event) => {
    // Local observer
    console.log("Local:", event);
  }
});
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Email Subscription System
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class Newsletter {
  private subscribers: Function[] = [];

  subscribe(callback: Function) {
    this.subscribers.push(callback);
  }

  publish(article: Article) {
    // Notify ALL subscribers
    this.subscribers.forEach(callback => {
      callback(article);
    });
  }
}

// Subscriber 1: Email notification
newsletter.subscribe((article) => {
  sendEmail(article.title);
});

// Subscriber 2: SMS notification
newsletter.subscribe((article) => {
  sendSMS(article.title);
});

// Subscriber 3: Push notification
newsletter.subscribe((article) => {
  sendPush(article.title);
});

// Publish article → all 3 notified!
newsletter.publish({ title: "Breaking News" });

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useResourceSubscription:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global observer (analytics, logging, etc.)
<Refine
  onLiveEvent={(event) => {
    analytics.track("live_event", event);
    console.log("Global event:", event);
  }}
>
  {/* ... */}
</Refine>

// Local observer (component-specific)
function PostList() {
  const { data } = useList({
    resource: "posts",
    onLiveEvent: (event) => {
      if (event.type === "created") {
        showToast("New post!");
      }
    }
  });
}

// Event arrives → BOTH observers notified!
```

**Lợi ích:**
- **Multiple Handlers:** Many observers per event
- **Decoupling:** Observers don't know about each other
- **Extensibility:** Add observers easily
- **Global + Local:** Two levels of observation

### Pattern 4: Dependency Injection Pattern (Mẫu Tiêm phụ thuộc)

**Khái niệm:**
Dependencies (liveProvider, invalidate, etc.) injected via hooks/context thay vì hard-coded.

**Tại sao dùng:**
- Testability (mock dependencies)
- Flexibility (swap implementations)
- Inversion of Control

**Cách implement:**

```typescript
export const useResourceSubscription = ({
  // ...params
}: UseResourceSubscriptionProps): void => {

  // ════════════════════════════════════════════════════
  // DEPENDENCY INJECTION via Hooks/Context
  // ════════════════════════════════════════════════════

  // Dependency 1: LiveProvider (injected via Context)
  const { liveProvider } = useContext(LiveContext);
  //                        ^^^^^^^^^^^^^^^^^^^^^^^^
  //                        Not hard-coded!

  // Dependency 2: Global config (injected via Context)
  const {
    liveMode: liveModeFromContext,
    onLiveEvent: onLiveEventContextCallback
  } = useContext<IRefineContext>(RefineContext);

  // Dependency 3: Invalidate function (injected via Hook)
  const invalidate = useInvalidate();
  //                 ^^^^^^^^^^^^^^^^
  //                 Could be mocked in tests

  // Dependency 4: Resource params (injected via Hook)
  const { resource, identifier } = useResourceParams({
    resource: resourceFromProp
  });

  // Use dependencies
  useEffect(() => {
    subscription = liveProvider?.subscribe({ ... });
    return () => liveProvider?.unsubscribe(subscription);
  }, []);
};
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Payment Processing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ WITHOUT DI (hard-coded):
class OrderService {
  processPayment(order: Order) {
    const stripe = new Stripe("sk_live_xxx");  // Hard-coded!
    return stripe.charge(order.amount);
    // Problems:
    // • Can't test without real Stripe
    // • Can't switch to PayPal
    // • Tightly coupled
  }
}

// ✅ WITH DI (injected):
class OrderService {
  constructor(
    private paymentProvider: PaymentProvider  // Injected!
  ) {}

  processPayment(order: Order) {
    return this.paymentProvider.charge(order.amount);
    // Benefits:
    // • Can inject mock in tests
    // • Can inject different providers
    // • Loosely coupled
  }
}

// Usage:
const orderService = new OrderService(
  new StripeProvider()  // Inject Stripe
  // or new PayPalProvider()  // Or inject PayPal
  // or new MockProvider()     // Or inject mock
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useResourceSubscription:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Production: Real dependencies
<Refine
  liveProvider={ablyProvider}  // Real provider
>
  <App />
</Refine>

// Testing: Mock dependencies
<Refine
  liveProvider={mockLiveProvider}  // Mock provider
>
  <TestComponent />
</Refine>

// Hook uses injected dependencies
const { liveProvider } = useContext(LiveContext);
// → Production: real Ably
// → Test: mock
```

**Lợi ích:**
- **Testability:** Easy to mock
- **Flexibility:** Swap implementations
- **Decoupling:** No hard dependencies
- **Configurability:** Change via props/context

### Pattern 5: Cleanup Pattern (Mẫu Dọn dẹp)

**Khái niệm:**
useEffect cleanup function unsubscribes để prevent memory leaks.

**Tại sao dùng:**
- WebSocket connections persist
- Unsubscribe when component unmounts
- Prevent memory leaks và ghost events

**Cách implement:**

```typescript
useEffect(() => {
  let subscription: any;

  // ════════════════════════════════════════════════════
  // SETUP
  // ════════════════════════════════════════════════════

  const callback = (event: LiveEvent) => {
    // Handle event
  };

  if (liveMode && liveMode !== "off" && enabled) {
    subscription = liveProvider?.subscribe({
      channel,
      params,
      types,
      callback,
      meta
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

}, [enabled]);  // Re-run when enabled changes
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Event Listeners
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ WITHOUT CLEANUP (memory leak):
function Component() {
  useEffect(() => {
    const handleResize = () => console.log("resized");
    window.addEventListener("resize", handleResize);
    // ⚠️ No cleanup!
  }, []);

  // Problem:
  // • Component unmounts
  // • Listener still attached
  // • Re-mount → attach again
  // • Memory leak! 💥
}

// ✅ WITH CLEANUP (no leak):
function Component() {
  useEffect(() => {
    const handleResize = () => console.log("resized");
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // ✅ Cleanup on unmount
    };
  }, []);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: WebSocket
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ChatRoom({ roomId }) {
  useEffect(() => {
    // Connect
    const socket = io(`/chat/${roomId}`);
    socket.on("message", handleMessage);

    // Cleanup: Disconnect
    return () => {
      socket.disconnect();
      // ✅ Prevents:
      // • Memory leaks
      // • Ghost messages
      // • Stale connections
    };
  }, [roomId]);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useResourceSubscription:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

useEffect(() => {
  subscription = liveProvider?.subscribe({ ... });

  return () => {
    liveProvider?.unsubscribe(subscription);
    // ✅ Cleanup prevents:
    // • Memory leaks
    // • Events after unmount
    // • Stale subscriptions
  };
}, [enabled]);
```

**Lợi ích:**
- **No Memory Leaks:** Resources released
- **No Ghost Events:** No events after unmount
- **Clean State:** Predictable behavior
- **Performance:** Fewer active subscriptions

## 4. Các tính năng chính

### 1. Auto Invalidation (liveMode="auto")

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Auto-invalidate cache when events received
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PostList() {
  const { data } = useList({
    resource: "posts",
    liveMode: "auto"  // ← Auto mode
  });

  // Behind the scenes:
  useResourceSubscription({
    channel: "resources/posts",
    liveMode: "auto",
    // When event received:
    // 1. invalidate({ resource: "posts", invalidates: ["resourceAll"] })
    // 2. React Query refetches
    // 3. UI updates automatically ✨
  });

  return <Table data={data} />;
}

// Use cases:
// • Real-time dashboards
// • Collaborative editing
// • Live notifications
// • Chat applications
```

### 2. Manual Control (liveMode="manual")

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Receive events but don't auto-invalidate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PostList() {
  const { data, refetch } = useList({
    resource: "posts",
    liveMode: "manual",  // ← Manual mode
    onLiveEvent: (event) => {
      // Show notification
      toast.info(`New ${event.type} event`, {
        action: {
          label: "Refresh",
          onClick: () => refetch()  // Manual refetch
        }
      });
    }
  });

  return <Table data={data} />;
}

// Use cases:
// • User-triggered refresh
// • Prevent jarring UX (reading content)
// • Batch updates
// • Custom logic
```

### 3. Disabled Subscription (liveMode="off")

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// No subscription at all
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ArchivePage() {
  const { data } = useList({
    resource: "archived_posts",
    liveMode: "off"  // ← Disabled
  });

  // Behind the scenes:
  // if (liveMode !== "off") { subscribe(); }
  // → Condition false → no subscription ✅

  return <Table data={data} />;
}

// Use cases:
// • Static data (categories, countries)
// • Archive pages
// • Performance optimization
// • Development/testing
```

### 4. Two-Level Callbacks

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Hook-level + Global-level callbacks
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global callback (all events)
<Refine
  onLiveEvent={(event) => {
    // Global analytics
    analytics.track("live_event", {
      channel: event.channel,
      type: event.type
    });

    // Global logging
    console.log("Event:", event);
  }}
>
  <App />
</Refine>

// Hook-level callback (specific)
function PostList() {
  const { data } = useList({
    resource: "posts",
    onLiveEvent: (event) => {
      // Component-specific logic
      if (event.type === "created") {
        showConfetti();
      }
    }
  });
}

// Event arrives → BOTH callbacks called!
```

### 5. Granular Invalidation Control

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fine-grained control over invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Default: invalidate all resource queries
invalidate({
  resource: identifier,
  invalidates: ["resourceAll"],
  invalidationFilters: {
    type: "active",        // Only active queries
    refetchType: "active"  // Only active refetch
  },
  invalidationOptions: {
    cancelRefetch: false   // Don't cancel ongoing
  }
});

// Explanation:
// • invalidates: ["resourceAll"] → All queries for resource
// • type: "active" → Only currently active queries
// • refetchType: "active" → Only refetch active ones
// • cancelRefetch: false → Don't interrupt ongoing fetches
```

### 6. Automatic Cleanup

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Automatic unsubscribe on unmount
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PostList() {
  useResourceSubscription({
    channel: "resources/posts",
    liveMode: "auto"
  });

  // Component unmounts → cleanup runs automatically
  // → unsubscribe(subscription)
  // → No memory leaks ✅
  // → No events after unmount ✅

  return <div>...</div>;
}
```

## 5. Use Cases thực tế

### Use Case 1: Real-time Collaboration Dashboard

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Admin dashboard với multiple real-time widgets
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Global config
<Refine
  liveMode="auto"
  liveProvider={liveProvider}
  onLiveEvent={(event) => {
    // Global analytics
    analytics.track("live_event", event);
  }}
>
  <App />
</Refine>

function AdminDashboard() {
  // Widget 1: Recent Orders (auto-update)
  const { data: orders } = useList({
    resource: "orders",
    filters: [{ field: "status", operator: "eq", value: "pending" }],
    pagination: { current: 1, pageSize: 10 }
    // liveMode="auto" from context
    // → useResourceSubscription subscribed
    // → Auto-updates when new order
  });

  // Widget 2: Active Users (auto-update)
  const { data: activeUsers } = useList({
    resource: "active_users"
    // liveMode="auto" from context
    // → Auto-updates when users join/leave
  });

  // Widget 3: Revenue (manual update with notification)
  const { data: revenue, refetch } = useList({
    resource: "revenue",
    liveMode: "manual",  // Override to manual
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        toast.info("New sale!", {
          action: {
            label: "Refresh",
            onClick: () => refetch()
          }
        });
      }
    }
  });

  return (
    <Grid>
      <OrdersWidget data={orders} />
      <UsersWidget data={activeUsers} />
      <RevenueWidget data={revenue} />
    </Grid>
  );
}
```

### Use Case 2: Collaborative Document Editing

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Google Docs-like editor
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DocumentEditor({ documentId }) {
  const [localContent, setLocalContent] = useState("");
  const [cursors, setCursors] = useState({});

  // Fetch document
  const { data: document } = useOne({
    resource: "documents",
    id: documentId,
    liveMode: "manual",  // Don't auto-update (might overwrite local edits)
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        // Check if it's from another user
        if (event.payload.userId !== currentUser.id) {
          // Show notification
          toast.info(`${event.payload.userName} edited the document`, {
            action: {
              label: "Sync",
              onClick: () => {
                // Merge changes (simplified)
                setLocalContent(event.payload.content);
              }
            }
          });

          // Update other user's cursor
          setCursors(prev => ({
            ...prev,
            [event.payload.userId]: event.payload.cursor
          }));
        }
      }
    }
  });

  return (
    <Editor
      content={localContent}
      cursors={cursors}
      onChange={setLocalContent}
    />
  );
}
```

### Use Case 3: Live Notifications Center

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Notification center với real-time updates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function NotificationCenter() {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const { data: notifications } = useList({
    resource: "notifications",
    filters: [
      { field: "userId", operator: "eq", value: currentUser.id }
    ],
    sorters: [{ field: "createdAt", order: "desc" }],
    liveMode: "auto",  // Auto-update
    onLiveEvent: (event) => {
      if (event.type === "created") {
        // Show toast
        toast.info(event.payload.message, {
          icon: event.payload.icon
        });

        // Increment unread count
        setUnreadCount(prev => prev + 1);

        // Play sound
        playNotificationSound();
      }
    }
  });

  return (
    <div>
      <Badge count={unreadCount}>
        <BellIcon />
      </Badge>
      <NotificationList items={notifications} />
    </div>
  );
}
```

### Use Case 4: Live Inventory Management

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Warehouse inventory với real-time stock updates
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function InventoryList() {
  // Fetch inventory
  const { data: inventory } = useList({
    resource: "inventory",
    liveMode: "auto",  // Critical: stock must be accurate
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        const product = event.payload;

        // Alert if low stock
        if (product.stock < product.lowStockThreshold) {
          toast.warning(`Low stock alert: ${product.name}`, {
            duration: 10000,
            action: {
              label: "Reorder",
              onClick: () => openReorderModal(product.id)
            }
          });
        }

        // Alert if out of stock
        if (product.stock === 0) {
          toast.error(`Out of stock: ${product.name}`, {
            duration: Infinity  // Don't dismiss
          });
        }
      }
    }
  });

  return (
    <Table
      data={inventory}
      columns={[
        { field: "name", header: "Product" },
        { field: "stock", header: "Stock" },
        {
          field: "stock",
          header: "Status",
          render: (stock, record) => (
            <StockBadge
              stock={stock}
              threshold={record.lowStockThreshold}
            />
          )
        }
      ]}
    />
  );
}
```

### Use Case 5: Multi-Tab Sync

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Sync state across multiple browser tabs
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ShoppingCart() {
  const { data: cart } = useOne({
    resource: "carts",
    id: currentUser.id,
    liveMode: "auto",  // Auto-sync across tabs
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        // Tab 1: User adds item
        // Tab 2: Cart updates automatically ✨

        toast.success("Cart updated from another tab");
      }
    }
  });

  // Tab 1: Add to cart
  const handleAddItem = (item) => {
    mutate({
      resource: "carts",
      id: currentUser.id,
      values: {
        items: [...cart.items, item]
      }
    });
    // → Publishes event
    // → Tab 2 receives event
    // → Tab 2 auto-updates
  };

  return <CartView items={cart?.items} />;
}
```

### Use Case 6: Conditional Subscription

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Enable subscription based on user role
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OrderList() {
  const { user } = useAuth();

  // Admin → auto-update
  // Regular user → manual update
  const liveMode = user.role === "admin" ? "auto" : "manual";

  const { data: orders, refetch } = useList({
    resource: "orders",
    liveMode,
    onLiveEvent: (event) => {
      if (liveMode === "manual") {
        toast.info("New order available", {
          action: {
            label: "Load",
            onClick: () => refetch()
          }
        });
      }
    }
  });

  return <OrderTable data={orders} />;
}
```

## 6. Quyết định kiến trúc

### Quyết định 1: Tại sao invalidate "resourceAll" thay vì specific?

**Vấn đề:**
Khi receive event, invalidate cái gì?

**Các phương án:**

| Strategy | Invalidation | Pros | Cons |
|----------|--------------|------|------|
| **Specific** | Based on event.type | Efficient | Complex logic |
| **resourceAll** ✅ | All resource queries | Simple | Less efficient |

**Quyết định:** Invalidate "resourceAll"

**Code:**
```typescript
if (liveMode === "auto") {
  invalidate({
    resource: identifier,
    invalidates: ["resourceAll"],  // ✅ All queries
    // Not: ["list"] or ["detail"] based on event.type
  });
}
```

**Lý do:**
- Simple - no complex mapping
- Safe - ensures all data fresh
- Event types may not map 1:1 with invalidation strategies
- Performance acceptable (only refetch active queries)

### Quyết định 2: Tại sao useEffect dependency là `[enabled]`?

**Vấn đề:**
Dependencies cho useEffect?

**Các phương án:**

| Dependencies | Re-subscribe when | Pros | Cons |
|--------------|-------------------|------|------|
| `[]` | Never | Stable | Can't toggle |
| `[enabled]` ✅ | enabled changes | Controllable | May re-subscribe |
| `[liveMode, resource, ...]` | Any change | Most responsive | Too sensitive |

**Quyết định:** `[enabled]` only

**Code:**
```typescript
useEffect(() => {
  // ... subscription logic
}, [enabled]);  // ✅ Only enabled
```

**Lý do:**
- Control subscription on/off
- Other params (liveMode, resource) shouldn't cause re-subscribe
- Stable for most cases
- User can toggle with `enabled` prop

### Quyết định 3: Tại sao không return subscription object?

**Vấn đề:**
Hook có nên return subscription để user control?

**Các phương án:**

| Return value | User control | Simplicity |
|--------------|--------------|------------|
| `void` ✅ | ❌ Low | ✅ Simple |
| `{ unsubscribe }` | ✅ High | ⚠️ Complex |

**Quyết định:** Return void

**Code:**
```typescript
export const useResourceSubscription = ({
  // ...
}: UseResourceSubscriptionProps): void => {
  // ✅ Return nothing
};
```

**Lý do:**
- Auto-cleanup sufficient for 99% cases
- Simpler API
- Consistent with useEffect pattern
- Advanced users can use useSubscription directly

### Quyết định 4: Tại sao call both hook callback và context callback?

**Vấn đề:**
Có nên support 2 levels of callbacks?

**Các phương án:**

| Approach | Flexibility | Complexity |
|----------|-------------|------------|
| **Hook only** | Low | Low |
| **Context only** | Low | Low |
| **Both** ✅ | High | Medium |

**Quyết định:** Support both

**Code:**
```typescript
const callback = (event: LiveEvent) => {
  // ...

  onLiveEvent?.(event);                 // Hook-level
  onLiveEventContextCallback?.(event);  // Global-level
};
```

**Lý do:**
- Hook callback - component-specific logic
- Context callback - global analytics, logging
- Both useful in different scenarios
- Minimal complexity cost

## 7. Common Pitfalls (Những lỗi hay gặp)

### Pitfall 1: Forget to pass resource

**Vấn đề:**
```typescript
// ❌ SAI - No resource
useResourceSubscription({
  channel: "resources/posts",
  types: ["*"],
  liveMode: "auto"
  // ⚠️ Missing resource!
});
```

**Hậu quả:**
- Can't resolve resource params
- Can't get data provider name
- Invalidation may fail

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Include resource
useResourceSubscription({
  channel: "resources/posts",
  types: ["*"],
  liveMode: "auto",
  resource: "posts"  // ✅ Required
});
```

### Pitfall 2: Wrong channel name

**Vấn đề:**
```typescript
// ❌ SAI - Channel doesn't match resource
useResourceSubscription({
  channel: "posts",  // ⚠️ Wrong format
  resource: "posts",
  types: ["*"]
});

// Server publishes to "resources/posts"
// This subscription won't receive events!
```

**Hậu quả:**
- No events received
- Silent failure
- Real-time not working

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Match channel format
useResourceSubscription({
  channel: `resources/${resourceName}`,  // ✅ Correct format
  resource: resourceName,
  types: ["*"]
});

// Or use constant
const RESOURCE_CHANNEL = (name: string) => `resources/${name}`;

useResourceSubscription({
  channel: RESOURCE_CHANNEL("posts"),  // ✅ Consistent
  resource: "posts",
  types: ["*"]
});
```

### Pitfall 3: liveMode="auto" without liveProvider

**Vấn đề:**
```typescript
// ❌ SAI - No liveProvider
<Refine>
  <App />
</Refine>

// In component:
useResourceSubscription({
  liveMode: "auto",  // Won't work!
  resource: "posts",
  channel: "resources/posts",
  types: ["*"]
});
```

**Hậu quả:**
- No subscription (silent failure)
- No error message
- Confusing behavior

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Setup liveProvider
<Refine
  liveProvider={liveProvider}  // ✅ Required
>
  <App />
</Refine>
```

### Pitfall 4: Infinite re-subscription loop

**Vấn đề:**
```typescript
// ❌ SAI - Unstable dependency
function Component() {
  const params = {  // ⚠️ New object every render!
    subscriptionType: "useList"
  };

  useResourceSubscription({
    params,  // ← Causes re-subscription every render!
    // ...
  });
}
```

**Hậu quả:**
- Re-subscribe every render
- Performance issue
- Potential rate limiting

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Stable params
function Component() {
  const params = useMemo(() => ({
    subscriptionType: "useList"
  }), []);  // ✅ Memoized

  useResourceSubscription({
    params,
    // ...
  });
}

// Or don't use params as dependency
// (current implementation uses [enabled] only)
```

### Pitfall 5: Missing cleanup causing memory leak

**Vấn đề:**
```typescript
// ❌ SAI - Manual subscription without cleanup
function Component() {
  const { liveProvider } = useContext(LiveContext);

  useEffect(() => {
    const subscription = liveProvider?.subscribe({
      channel: "resources/posts",
      callback: (event) => { ... }
    });

    // ⚠️ No cleanup!
  }, []);

  // → Memory leak when component unmounts
}
```

**Hậu quả:**
- Subscription persists after unmount
- Memory leak
- Ghost events

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Always cleanup
function Component() {
  useResourceSubscription({
    // ...
  });
  // ✅ Built-in cleanup

  // Or manual:
  useEffect(() => {
    const subscription = liveProvider?.subscribe({ ... });

    return () => {
      liveProvider?.unsubscribe(subscription);  // ✅ Cleanup
    };
  }, []);
}
```

### Pitfall 6: Using in non-React component

**Vấn đề:**
```typescript
// ❌ SAI - Outside React component
const subscription = useResourceSubscription({
  channel: "resources/posts",
  types: ["*"]
});
// Error: Hooks can only be called inside function components
```

**Hậu quả:**
- React error
- App crashes

**Giải pháp:**
```typescript
// ✅ ĐÚNG - Inside React component
function MyComponent() {
  useResourceSubscription({
    channel: "resources/posts",
    types: ["*"]
  });

  return <div>...</div>;
}
```

## 8. Performance Considerations

### 1. Selective Invalidation

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Only refetch active queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

invalidate({
  resource: identifier,
  invalidates: ["resourceAll"],
  invalidationFilters: {
    type: "active",        // ✅ Only active
    refetchType: "active"  // ✅ Only active
  }
});

// Benefits:
// • Don't refetch background tabs
// • Don't refetch unmounted components
// • Better performance
```

### 2. Conditional Subscription

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Disable subscription when not needed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ArchiveList() {
  useResourceSubscription({
    channel: "resources/archived_posts",
    liveMode: "off",  // ✅ Disabled
    // No WebSocket connection
    // Lower server load
  });
}

// Or conditional:
const liveMode = isActive ? "auto" : "off";
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
    // ✅ Release resources
    // ✅ Close connections
    // ✅ No memory leaks
  };
}, [enabled]);
```

### 4. Batch Invalidations

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// React Query batches invalidations automatically
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Multiple events in short time:
callback(event1);  // invalidate()
callback(event2);  // invalidate()
callback(event3);  // invalidate()

// React Query batches → single refetch ✅
// Not 3 separate refetches ❌
```

## 9. Testing

### Test 1: Auto Invalidation

```typescript
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { TestWrapper } from "@test";
import { useResourceSubscription } from "./";

const invalidateMock = vi.fn();

describe("useResourceSubscription", () => {
  it("should auto-invalidate when liveMode is auto", () => {
    const onSubscribeMock = vi.fn(({ callback }) => {
      // Simulate event
      callback({ type: "created", payload: { ids: [1] } });
    });

    renderHook(
      () => useResourceSubscription({
        channel: "resources/posts",
        resource: "posts",
        types: ["*"],
        liveMode: "auto"
      }),
      {
        wrapper: TestWrapper({
          liveProvider: {
            subscribe: onSubscribeMock,
            unsubscribe: vi.fn()
          }
        })
      }
    );

    expect(onSubscribeMock).toHaveBeenCalled();
    expect(invalidateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: "posts",
        invalidates: ["resourceAll"]
      })
    );
  });
});
```

### Test 2: Manual Mode

```typescript
it("should NOT auto-invalidate when liveMode is manual", () => {
  const onLiveEventMock = vi.fn();
  const onSubscribeMock = vi.fn(({ callback }) => {
    callback({ type: "created" });
  });

  renderHook(
    () => useResourceSubscription({
      channel: "resources/posts",
      resource: "posts",
      types: ["*"],
      liveMode: "manual",  // ← Manual
      onLiveEvent: onLiveEventMock
    }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: onSubscribeMock,
          unsubscribe: vi.fn()
        }
      })
    }
  );

  expect(onSubscribeMock).toHaveBeenCalled();
  expect(invalidateMock).not.toHaveBeenCalled();  // ✅ No invalidate
  expect(onLiveEventMock).toHaveBeenCalled();     // ✅ Callback called
});
```

### Test 3: Cleanup

```typescript
it("should unsubscribe on unmount", () => {
  const subscription = {};
  const onSubscribeMock = vi.fn(() => subscription);
  const onUnsubscribeMock = vi.fn();

  const { unmount } = renderHook(
    () => useResourceSubscription({
      channel: "resources/posts",
      resource: "posts",
      types: ["*"]
    }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: onSubscribeMock,
          unsubscribe: onUnsubscribeMock
        }
      })
    }
  );

  expect(onSubscribeMock).toHaveBeenCalled();

  unmount();

  expect(onUnsubscribeMock).toHaveBeenCalledWith(subscription);
});
```

### Test 4: Disabled Mode

```typescript
it("should NOT subscribe when liveMode is off", () => {
  const onSubscribeMock = vi.fn();

  renderHook(
    () => useResourceSubscription({
      channel: "resources/posts",
      resource: "posts",
      types: ["*"],
      liveMode: "off"  // ← Off
    }),
    {
      wrapper: TestWrapper({
        liveProvider: {
          subscribe: onSubscribeMock,
          unsubscribe: vi.fn()
        }
      })
    }
  );

  expect(onSubscribeMock).not.toHaveBeenCalled();  // ✅ No subscription
});
```

## 10. Kết luận

`useResourceSubscription` là **hook cấp cao** kết hợp subscription với automatic cache invalidation, là "trái tim" của hệ thống real-time trong Refine.

### Điểm mạnh:

1. **Orchestrator** - Coordinates multiple concerns
2. **Auto-Invalidation** - No manual refetch needed
3. **Flexible Modes** - auto/manual/off
4. **Two-Level Callbacks** - Hook + Global
5. **Auto-Cleanup** - No memory leaks
6. **Integrated** - Used by all data hooks

### Key Takeaways:

- **3 modes:** auto (tự động), manual (thủ công), off (tắt)
- **Auto invalidates** với liveMode="auto"
- **Cleanup automatic** on unmount
- **Used internally** by useList/useOne/useMany
- **Setup liveProvider** required

### Pattern Summary:

| Pattern | Vai trò |
|---------|---------|
| **Orchestrator** | Coordinate sub-hooks |
| **Strategy** | Different behavior per liveMode |
| **Observer** | Two-level callbacks |
| **Dependency Injection** | Injected dependencies |
| **Cleanup** | Auto-unsubscribe |

### Related Hooks:

- `useLiveMode` - Resolve live mode
- `useInvalidate` - Cache invalidation
- `useSubscription` - Low-level subscription
- `usePublish` - Publish events
- `useList/useOne/useMany` - Data hooks using this

---

**Đọc thêm:**
- Refine Live Provider: https://refine.dev/docs/api-reference/core/providers/live-provider/
- React Query Invalidation: https://tanstack.com/query/latest/docs/guides/query-invalidation
