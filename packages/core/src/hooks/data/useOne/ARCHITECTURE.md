# Kiến trúc và Design Patterns của useOne Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          DATA FETCHING SYSTEM (READ)              │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useList  → Fetch list (multiple records)        │  │
│  │                                                   │  │
│  │  useOne ✅ (THIS HOOK - SINGLE RECORD!)          │  │
│  │    → Fetch single record by ID                   │  │
│  │         │                                         │  │
│  │         ├──→ GET /posts/123                      │  │
│  │         │     → { data: { id: 123, title: "..." }}│  │
│  │         │                                         │  │
│  │         ├──→ SMART CACHING:                      │  │
│  │         │     - React Query cache by ID          │  │
│  │         │     - Second fetch = instant! ⚡        │  │
│  │         │                                         │  │
│  │         ├──→ TYPE SAFETY:                        │  │
│  │         │     - Generic types (TQueryFnData)     │  │
│  │         │     - Autocomplete! ✅                  │  │
│  │         │                                         │  │
│  │         ├──→ REALTIME UPDATES:                   │  │
│  │         │     - Subscribe to record changes      │  │
│  │         │     - Auto-refresh! ✅                  │  │
│  │         │                                         │  │
│  │         └──→ SELECT TRANSFORM:                   │  │
│  │               - Pick only what you need          │  │
│  │               - Performance! ⚡                    │  │
│  │                                                   │  │
│  │  useMany → Fetch multiple specific records       │  │
│  │  useInfiniteList → Infinite scroll                │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Fetch SINGLE record by ID - The "detail page" hook**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│                  USEONE COMPLETE FLOW                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Component Renders                                   │
│  const { result, query } = useOne({                          │
│    resource: "posts",                                        │
│    id: 123                                                   │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Generate Query Key (Cache Key)                     │
│  keys()                                                      │
│    .data("default")                                          │
│    .resource("posts")                                        │
│    .action("one")                                            │
│    .id(123)                   // ← ID in cache key!          │
│    .params({ ...meta })                                      │
│    .get()                                                    │
│                                                              │
│  → Key: ["posts", "one", 123, { ...meta }]                  │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check Cache (React Query)                          │
│  Is key ["posts", "one", 123] in cache?                     │
│    ├─→ YES (cache hit) ✅                                    │
│    │     → Return cached data INSTANTLY ⚡                   │
│    │     → Background refetch (if stale)                    │
│    │                                                         │
│    └─→ NO (cache miss) ❌                                    │
│          → Proceed to fetch                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Execute Query Function                             │
│  dataProvider.getOne({                                       │
│    resource: "posts",                                        │
│    id: 123,                                                  │
│    meta: { ... }                                             │
│  })                                                          │
│                                                              │
│  → API Call: GET /posts/123                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Process Response                                   │
│  Server response:                                            │
│  {                                                           │
│    data: {                                                   │
│      id: 123,                                                │
│      title: "My Post",                                       │
│      content: "Lorem ipsum...",                              │
│      authorId: 5,                                            │
│      createdAt: "2024-01-01"                                 │
│    }                                                         │
│  }                                                           │
│                                                              │
│  If queryOptions.select provided:                           │
│    → Transform data: select(rawData)                        │
│    → Example: select only { id, title }                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Cache Data                                         │
│  Store in React Query cache:                                │
│  Key: ["posts", "one", 123]                                 │
│  Value: { data: { id: 123, title: "My Post", ... } }       │
│  Timestamp: 2024-01-01 10:00:00                             │
│  StaleTime: 5 minutes (configurable)                        │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 7: Return to Component                                │
│  result = {                                                  │
│    id: 123,                                                  │
│    title: "My Post",                                         │
│    content: "Lorem ipsum...",                                │
│    authorId: 5,                                              │
│    createdAt: "2024-01-01"                                   │
│  }                                                           │
│                                                              │
│  query = {                                                   │
│    isLoading: false,                                         │
│    isFetching: false,                                        │
│    refetch: fn,                                              │
│    ...                                                       │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 8: Realtime Subscription (Optional)                   │
│  If liveMode = "auto":                                       │
│    → Subscribe to "resources/posts/123" channel             │
│    → On event (updated/deleted):                            │
│        → Invalidate cache automatically                     │
│        → Refetch latest data                                │
│        → UI updates! ✅                                      │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useOne.ts: 2,338 dòng** - Extensive documentation on Generic Types!

---

### 2.1 Singleton Pattern - One ID, One Cache Entry

#### 🔑 VÍ DỤ ĐỜI THƯỜNG: Hotel Room Key

```
Hotel Management:

Room 101:
→ Only ONE key for Room 101
→ Guest checks in → Get key
→ Guest checks in again (same room) → Same key! ✅

useOne for Post #123:
→ Only ONE cache entry for ID 123
→ First fetch → Create cache
→ Second fetch → Same cache! ⚡
→ Different component, same ID → Same cache! ⚡
```

**Singleton Pattern** = One ID = One cache entry

#### Implementation:

```typescript
// Cache key includes ID
const queryKey = keys()
  .data(pickedDataProvider)
  .resource(identifier)
  .action("one")
  .id(id) // ← ID in cache key!
  .params({ ...meta })
  .get();

// Result: ["posts", "one", 123, {...}]

// ANY component fetching post #123 uses SAME cache:
// Component A: useOne({ resource: "posts", id: 123 })
// Component B: useOne({ resource: "posts", id: 123 })
// → Both use cache ["posts", "one", 123] ✅
// → ONE API call, TWO components updated! ⚡
```

#### Real Example - Master-Detail:

```tsx
// LIST PAGE - Shows all posts
function PostList() {
  const { result } = useList({ resource: "posts" });
  // → Fetches: [Post 1, Post 2, Post 3, ...]

  return (
    <div>
      {result.data.map((post) => (
        <Link to={`/posts/${post.id}`}>{post.title}</Link>
      ))}
    </div>
  );
}

// DETAIL PAGE - Shows single post
function PostDetail() {
  const { id } = useParams(); // URL: /posts/123

  const { result, query } = useOne({
    resource: "posts",
    id, // 123
  });
  // → Cache key: ["posts", "one", 123]
  // → First visit: API call
  // → Second visit (back button): Cache hit! ⚡

  return (
    <div>
      {query.isLoading && <div>Loading...</div>}
      {result && (
        <>
          <h1>{result.title}</h1>
          <p>{result.content}</p>
        </>
      )}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Deduplication** - Same ID = ONE cache entry
- ✅ **Performance** - Second fetch = instant!
- ✅ **Consistency** - All components see same data
- ✅ **Memory** - No duplicate cache for same ID

---

### 2.2 Generic Pattern - Type-Safe Single Record

#### 🎓 VÍ DỤ ĐỜI THƯỜNG: Custom Box

```
Generic Box Factory:

Box<Book>:
→ Box designed for Books
→ Put Book in → Get Book out ✅
→ Put Toy in → Type error! ❌

useOne<Post>:
→ Hook designed for Post
→ API returns Post → result: Post ✅
→ result.title → string (autocomplete!) ✅
→ result.age → Error! (doesn't exist) ❌
```

**Generic Pattern** = Type-safe data fetching

#### Implementation:

```typescript
// Define your data type
type Post = {
  id: number;
  title: string;
  content: string;
  authorId: number;
  views: number;
};

// Use with generic
const { result, query } = useOne<Post>({
  resource: "posts",
  id: 123,
});

// result has type: Post | undefined ✅
// IDE autocomplete works! ✅

if (result) {
  console.log(result.title); // string ✅
  console.log(result.views); // number ✅
  console.log(result.age); // ERROR! ❌ Property doesn't exist
}
```

#### Three Generic Parameters:

```typescript
export const useOne = <
  TQueryFnData extends BaseRecord = BaseRecord,  // Raw API data
  TError extends HttpError = HttpError,          // Error type
  TData extends BaseRecord = TQueryFnData,       // Transformed data
>({ ... }) => { ... }


// USAGE:
// 1. Basic (only TQueryFnData)
useOne<Post>({ ... })
// → TQueryFnData = Post
// → TError = HttpError (default)
// → TData = Post (default)


// 2. Custom error
type CustomError = HttpError & { errorCode: string };
useOne<Post, CustomError>({ ... })
// → TError = CustomError
// → error.errorCode available! ✅


// 3. With select transform
type PostTitle = { id: number; title: string };
useOne<Post, HttpError, PostTitle>({
  resource: "posts",
  id: 123,
  queryOptions: {
    select: (data) => ({
      data: {
        id: data.data.id,
        title: data.data.title
      }
    })
  }
})
// → result: PostTitle ✅
// → result.title: string ✅
// → result.content: ERROR! ❌ (doesn't exist after select)
```

#### Real Example:

```tsx
type Post = {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    name: string;
  };
};

function PostDetail() {
  const { id } = useParams();

  // Type-safe fetch! ✅
  const { result, query } = useOne<Post>({
    resource: "posts",
    id: Number(id),
  });

  if (query.isLoading) return <div>Loading...</div>;
  if (!result) return <div>Not found</div>;

  return (
    <div>
      {/* Autocomplete works! ✅ */}
      <h1>{result.title}</h1>
      <p>By {result.author.name}</p>

      {/* Type error! ❌ */}
      {/* <p>{result.age}</p> */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Type Safety** - Catch errors at compile time
- ✅ **Autocomplete** - IDE suggests properties
- ✅ **Refactoring** - Safe to rename fields
- ✅ **Documentation** - Types = documentation

---

### 2.3 Adapter Pattern - Unified getOne Interface

#### 🔌 VÍ DỤ ĐỜI THƯỜNG: Universal Power Adapter

```
Traveling abroad:

Country:
- USA: 110V, Type A plug
- UK: 230V, Type G plug
- EU: 230V, Type C plug

Universal Adapter:
→ Same interface: plug.fit()
→ Different voltage internally
→ Works everywhere! ✅

useOne.getOne():
→ Same interface: getOne({ resource, id })
→ REST: GET /posts/123
→ GraphQL: query { post(id: 123) {...} }
→ SOAP: <getPost><id>123</id></getPost>
→ Works with all backends! ✅
```

**Adapter Pattern** = Unified interface, different implementations

#### Implementation:

```typescript
// useOne calls dataProvider.getOne()
const { getOne } = dataProvider(pickedDataProvider);

const queryResponse = useQuery({
  queryFn: (context) => {
    return getOne<TQueryFnData>({
      resource: resource?.name ?? "",
      id: id!,
      meta: {
        ...combinedMeta,
        ...prepareQueryContext(context),
      },
    });
  },
});

// REST Data Provider:
const restDataProvider = {
  getOne: async ({ resource, id }) => {
    const url = `${API_URL}/${resource}/${id}`;
    const { data } = await axios.get(url);
    return { data };
    // GET /posts/123
  },
};

// GraphQL Data Provider:
const graphqlDataProvider = {
  getOne: async ({ resource, id }) => {
    const query = gql`
      query GetOne($id: ID!) {
        ${resource}(id: $id) {
          id
          title
          content
        }
      }
    `;
    const { data } = await client.query({ query, variables: { id } });
    return { data: data[resource] };
  },
};

// useOne works with BOTH! ✅
// Component doesn't know/care which provider!
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Flexibility** - Switch providers easily
- ✅ **Consistency** - Same interface everywhere
- ✅ **Testability** - Mock providers easily
- ✅ **Abstraction** - Hide backend complexity

---

### 2.4 Observer Pattern - Realtime Single Record Updates

#### 📡 VÍ DỤ ĐỜI THƯỜNG: Live Sports Score

```
Live Soccer Match:

Traditional (No Observer):
→ Refresh page to see score
→ Manual polling every 10 seconds
→ Outdated! ❌

Realtime (Observer):
→ Subscribe to match #123
→ Score changes → Auto-update! ⚡
→ Always live! ✅

useOne with liveMode:
→ Subscribe to "resources/posts/123"
→ Post updated → Auto-refresh! ⚡
→ Always current! ✅
```

**Observer Pattern** = Subscribe to record, auto-update on changes

#### Implementation:

```typescript
// Subscribe to specific record
useResourceSubscription({
  resource: identifier,
  types: ["updated", "deleted"], // Event types
  params: {
    id, // ← Subscribe to THIS ID only!
    meta: combinedMeta,
    subscriptionType: "useOne",
  },
  channel: `resources/${resource?.name}/${id}`, // ← ID-specific channel!
  enabled: isEnabled && !!id,
  liveMode,
  onLiveEvent,
  meta: {
    ...meta,
    dataProviderName: pickedDataProvider,
  },
});

// When post #123 is updated:
// 1. Event emitted: { type: "updated", id: 123 }
// 2. useOne receives event
// 3. Cache invalidated
// 4. Data refetched
// 5. UI updates! ✅
```

#### Live Modes:

```typescript
// MODE 1: Auto (default)
const { result } = useOne({
  resource: "posts",
  id: 123,
  liveMode: "auto", // ← Auto-refresh!
});

// Event flow:
// 1. User A updates post #123
// 2. User B's useOne receives event
// 3. Cache invalidated automatically
// 4. Post refetched
// 5. User B sees updated post! ✅

// MODE 2: Manual
const { result, query } = useOne({
  resource: "posts",
  id: 123,
  liveMode: "manual",
  onLiveEvent: (event) => {
    if (event.type === "updated") {
      query.refetch(); // ← Manual control
    }
  },
});

// MODE 3: Off
const { result } = useOne({
  resource: "posts",
  id: 123,
  liveMode: "off", // ← No subscriptions
});
```

#### Real Example - Collaborative Editing:

```tsx
function PostEditor() {
  const { id } = useParams();
  const [showToast, setShowToast] = useState(false);

  const { result, query } = useOne({
    resource: "posts",
    id,
    liveMode: "auto", // ← Realtime updates!
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    },
  });

  return (
    <div>
      {showToast && (
        <div className="toast">This post was updated by another user!</div>
      )}

      {result && (
        <>
          <h1>{result.title}</h1>
          <p>{result.content}</p>
        </>
      )}

      {/* User A edits post in another tab
          → Event triggered
          → User B's detail page auto-refreshes
          → User B sees updated content! ✅ */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Realtime** - Always fresh data
- ✅ **Collaborative** - Multi-user editing
- ✅ **Automatic** - No manual refresh
- ✅ **ID-specific** - Only relevant record updates

---

### 2.5 Select Pattern - Data Transformation and Optimization

#### 📦 VÍ DỤ ĐỜI THƯỜNG: Amazon Package Unpacking

```
Package Delivery:

Full Box (from warehouse):
→ Product + Bubble wrap + Box + Receipt + Ads
→ Heavy! Lots of stuff!

You only need:
→ The Product! ✅

Select Pattern:
→ Extract only what you need
→ Discard the rest
→ Lighter! Faster! ⚡

useOne select:
→ API returns: { id, title, content, authorId, tags[], meta{...} }
→ You only need: { id, title }
→ select extracts: { id, title } ✅
→ Less memory! Faster renders! ⚡
```

**Select Pattern** = Transform and optimize data

#### Implementation:

```typescript
type Post = {
  id: number;
  title: string;
  content: string;
  authorId: number;
  tags: string[];
  metadata: {
    views: number;
    likes: number;
    comments: number;
  };
};

type PostTitle = {
  id: number;
  title: string;
};

// Extract only title
const { result } = useOne<Post, HttpError, PostTitle>({
  resource: "posts",
  id: 123,
  queryOptions: {
    select: (data) => ({
      data: {
        id: data.data.id,
        title: data.data.title,
        // Discard: content, authorId, tags, metadata
      },
    }),
  },
});

// result: PostTitle ✅
// result = { id: 123, title: "My Post" }
// Smaller memory footprint! ⚡
// Faster renders! ⚡
```

#### Memoization:

```typescript
// ❌ WRONG - Creates new function every render
const { result } = useOne({
  queryOptions: {
    select: (data) => ({
      data: { title: data.data.title },
    }),
  },
});
// React Query re-runs select on every render! ❌

// ✅ CORRECT - Memoized with useCallback
const selectFn = useCallback(
  (data) => ({
    data: { title: data.data.title },
  }),
  [],
);

const { result } = useOne({
  queryOptions: {
    select: selectFn, // ← Stable reference! ✅
  },
});
// React Query only runs when data changes! ✅
```

#### Real Example - Complex Transform:

```tsx
type Post = {
  id: number;
  title: string;
  content: string;
  author: {
    id: number;
    name: string;
    email: string;
    avatar: string;
  };
  tags: string[];
  createdAt: string;
};

type PostViewModel = {
  id: number;
  title: string;
  authorName: string;
  tagCount: number;
  formattedDate: string;
};

function PostSummary() {
  const { id } = useParams();

  // Transform to view model
  const selectFn = useCallback(
    (data: GetOneResponse<Post>): GetOneResponse<PostViewModel> => {
      const post = data.data;
      return {
        data: {
          id: post.id,
          title: post.title,
          authorName: post.author.name, // ← Extract
          tagCount: post.tags.length, // ← Compute
          formattedDate: new Date(post.createdAt).toLocaleDateString(), // ← Transform
        },
      };
    },
    [],
  );

  const { result } = useOne<Post, HttpError, PostViewModel>({
    resource: "posts",
    id: Number(id),
    queryOptions: {
      select: selectFn,
    },
  });

  if (!result) return null;

  return (
    <div>
      <h1>{result.title}</h1>
      <p>By {result.authorName}</p>
      <p>{result.tagCount} tags</p>
      <p>Posted on {result.formattedDate}</p>

      {/* Original data (content, tags, author details) not in memory! ✅ */}
    </div>
  );
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Performance** - Smaller memory footprint
- ✅ **Optimization** - Only process what you need
- ✅ **Separation** - View logic separate from data
- ✅ **Type Safety** - Transform with types!

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern       | Ví dụ đời thường        | Giải quyết vấn đề gì | Trong useOne                   |
| ------------- | ----------------------- | -------------------- | ------------------------------ |
| **Singleton** | Hotel room key          | One ID = One cache   | Cache by ID, no duplicates     |
| **Generic**   | Custom box              | Type-safe fetching   | TQueryFnData, TData, TError    |
| **Adapter**   | Universal power adapter | Unified interface    | Works with any backend         |
| **Observer**  | Live sports score       | Realtime updates     | Auto-refresh on record changes |
| **Select**    | Package unpacking       | Data optimization    | Transform and reduce data      |

---

## 3. KEY FEATURES

### 3.1 Automatic Caching by ID

```typescript
// First fetch - Cache miss
const { result } = useOne({ resource: "posts", id: 123 });
// → API call: GET /posts/123
// → Cache: ["posts", "one", 123] = { data: {...} }

// Second fetch - Cache hit
const { result } = useOne({ resource: "posts", id: 123 });
// → NO API call! ✅
// → Return from cache ⚡
// → Background refetch (if stale)

// Different ID - Different cache
const { result } = useOne({ resource: "posts", id: 456 });
// → Cache: ["posts", "one", 456] = { data: {...} }
// → Separate from ID 123! ✅
```

### 3.2 ID Validation

```typescript
const { query } = useOne({
  resource: "posts",
  id: undefined, // ← No ID!
});

// query.enabled = false automatically! ✅
// No API call until ID is provided!

// Useful for:
const { id } = useParams();
const { query } = useOne({
  resource: "posts",
  id: id ? Number(id) : undefined,
});
// → Only fetches when ID exists! ✅
```

### 3.3 Record-Specific Realtime

```typescript
// Subscribe to SPECIFIC record
const { result } = useOne({
  resource: "posts",
  id: 123,
  liveMode: "auto",
});

// Event channel: "resources/posts/123"
// Only updates when THIS post changes! ✅

// Post #456 updated → No event for this hook! ✅
// Post #123 updated → Auto-refresh! ⚡
```

### 3.4 Error Handling

```typescript
const { query } = useOne({
  resource: "posts",
  id: 999, // ← Doesn't exist
  errorNotification: (error) => ({
    message: "Failed to load post",
    description: error.message, // "Not Found"
    type: "error",
  }),
});

// If 404:
// 1. checkError() called (logout if 401)
// 2. Error notification shown
// 3. query.error = { message: "Not Found", statusCode: 404 }
// 4. Component can handle: if (query.isError) {...}
```

---

## 4. COMMON USE CASES

### 4.1 Detail Page

```tsx
function PostDetail() {
  const { id } = useParams();

  const { result, query } = useOne({
    resource: "posts",
    id: id ? Number(id) : undefined,
  });

  if (query.isLoading) return <div>Loading...</div>;
  if (query.isError) return <div>Error: {query.error?.message}</div>;
  if (!result) return <div>Not found</div>;

  return (
    <div>
      <h1>{result.title}</h1>
      <p>{result.content}</p>
      <button onClick={() => query.refetch()}>Refresh</button>
    </div>
  );
}
```

### 4.2 Edit Form with Initial Values

```tsx
function PostEdit() {
  const { id } = useParams();

  const { result, query } = useOne({
    resource: "posts",
    id: Number(id),
  });

  if (query.isLoading) return <div>Loading...</div>;

  return (
    <Form
      initialValues={result} // ← Populate form!
      onFinish={(values) => {
        // Update post
      }}
    >
      <Input name="title" />
      <TextArea name="content" />
      <Button type="submit">Save</Button>
    </Form>
  );
}
```

### 4.3 Related Data Fetching

```tsx
type Post = {
  id: number;
  title: string;
  authorId: number;
};

type Author = {
  id: number;
  name: string;
  email: string;
};

function PostWithAuthor() {
  const { id } = useParams();

  // Fetch post
  const { result: post } = useOne<Post>({
    resource: "posts",
    id: Number(id),
  });

  // Fetch author (dependent on post)
  const { result: author } = useOne<Author>({
    resource: "users",
    id: post?.authorId,
    queryOptions: {
      enabled: !!post?.authorId, // ← Only fetch when authorId available!
    },
  });

  if (!post) return <div>Loading post...</div>;
  if (!author) return <div>Loading author...</div>;

  return (
    <div>
      <h1>{post.title}</h1>
      <p>
        By {author.name} ({author.email})
      </p>
    </div>
  );
}
```

### 4.4 Optimized with Select

```tsx
type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  images: string[];
  reviews: Review[];
  specifications: Spec[];
  // ... lots of data!
};

type ProductSummary = {
  id: number;
  name: string;
  price: number;
};

function ProductCard({ productId }: { productId: number }) {
  // Only fetch what we need!
  const selectFn = useCallback(
    (data: GetOneResponse<Product>): GetOneResponse<ProductSummary> => ({
      data: {
        id: data.data.id,
        name: data.data.name,
        price: data.data.price,
        // Discard: description, images, reviews, specs
      },
    }),
    [],
  );

  const { result } = useOne<Product, HttpError, ProductSummary>({
    resource: "products",
    id: productId,
    queryOptions: {
      select: selectFn,
    },
  });

  if (!result) return null;

  return (
    <div className="product-card">
      <h3>{result.name}</h3>
      <p>${result.price}</p>
    </div>
  );
}
```

### 4.5 Realtime Collaborative Detail

```tsx
function CollaborativePostDetail() {
  const { id } = useParams();
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const { result, query } = useOne({
    resource: "posts",
    id: Number(id),
    liveMode: "auto", // ← Realtime!
    onLiveEvent: (event) => {
      if (event.type === "updated") {
        setLastUpdate(new Date());
      }
    },
  });

  return (
    <div>
      {lastUpdate && (
        <div className="banner">
          Post updated {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {result && (
        <>
          <h1>{result.title}</h1>
          <p>{result.content}</p>
        </>
      )}

      {/* Another user edits → Auto-updates! ✅ */}
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why Include ID in Query Key?

**Answer:** Enable per-record caching

```typescript
// WITH ID in key (current):
keys().resource("posts").action("one").id(123);
// → ["posts", "one", 123]
// → Cache for post #123

keys().resource("posts").action("one").id(456);
// → ["posts", "one", 456]
// → Cache for post #456

// Different IDs = Different caches! ✅
// Navigate between posts = instant! ⚡

// WITHOUT ID in key (bad):
keys().resource("posts").action("one");
// → ["posts", "one"]
// → Same cache for ALL posts! ❌
// → Post #123 overwrites post #456! ❌
```

### 5.2 Why Validate ID Before Fetch?

**Answer:** Prevent unnecessary API calls

```typescript
// From useOne.ts:
const queryResponse = useQuery({
  enabled:
    typeof queryOptions?.enabled !== "undefined" ? queryOptions.enabled : !!id, // ← Only enable if ID exists!
});

// Benefits:
// 1. No API call before ID is available ✅
// 2. Useful for URL params that might be undefined
// 3. Prevents 400 errors (missing ID)
```

### 5.3 Why Subscribe to Specific Record?

**Answer:** Efficient, relevant updates only

```typescript
// Specific subscription:
channel: `resources/${resource?.name}/${id}`;
// → "resources/posts/123"
// → Only updates for post #123 ✅

// vs. General subscription:
channel: `resources/${resource?.name}`;
// → "resources/posts"
// → Updates for ALL posts ❌
// → Unnecessary refetches! ❌
```

---

## 6. COMMON PITFALLS

### 6.1 Not Checking if Result Exists

```typescript
// ❌ WRONG
const { result } = useOne({ resource: "posts", id: 123 });
return <h1>{result.title}</h1>;
// Runtime error if result is undefined! ❌

// ✅ CORRECT
const { result } = useOne({ resource: "posts", id: 123 });
if (!result) return <div>Loading...</div>;
return <h1>{result.title}</h1>;
```

### 6.2 Not Memoizing Select Function

```typescript
// ❌ WRONG
const { result } = useOne({
  queryOptions: {
    select: (data) => ({
      data: { title: data.data.title },
    }),
  },
});
// Creates new function every render! ❌

// ✅ CORRECT
const selectFn = useCallback(
  (data) => ({
    data: { title: data.data.title },
  }),
  [],
);

const { result } = useOne({
  queryOptions: { select: selectFn },
});
```

### 6.3 Fetching Without ID Validation

```typescript
// ❌ WRONG
const { id } = useParams();  // Might be undefined!
const { result } = useOne({
  resource: "posts",
  id: Number(id)  // NaN if id is undefined! ❌
});
// API call with id=NaN → 400 error! ❌

// ✅ CORRECT
const { id } = useParams(");
const { result, query } = useOne({
  resource: "posts",
  id: id ? Number(id) : undefined,
  queryOptions: {
    enabled: !!id  // ← Only fetch when ID exists!
  }
});
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Cache Lifetime

```typescript
const { result } = useOne({
  resource: "posts",
  id: 123,
  queryOptions: {
    staleTime: 5 * 60 * 1000, // 5 minutes fresh
    cacheTime: 10 * 60 * 1000, // 10 minutes in cache
  },
});

// Timeline:
// T0: Fetch → Cache for 10 min
// T0-T5: Data "fresh" → No refetch
// T5-T10: Data "stale" → Refetch on access
// T10+: Cache expired → Full refetch
```

### 7.2 Select Performance

```typescript
// GOOD - Extract only needed data
const selectFn = useCallback(
  (data) => ({
    data: {
      id: data.data.id,
      title: data.data.title,
    },
  }),
  [],
);

// Full API response: 10KB
// After select: 200 bytes ⚡
// 50x smaller in memory! ✅
```

---

## 8. TESTING

```typescript
describe("useOne", () => {
  it("should fetch single record by ID", async () => {
    const { result } = renderHook(
      () =>
        useOne({
          resource: "posts",
          id: 123,
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.result).toEqual({
        id: 123,
        title: "Test Post",
      });
    });

    expect(mockGetOne).toHaveBeenCalledWith({
      resource: "posts",
      id: 123,
      meta: expect.any(Object),
    });
  });

  it("should not fetch when id is undefined", () => {
    const { result } = renderHook(
      () =>
        useOne({
          resource: "posts",
          id: undefined,
        }),
      { wrapper },
    );

    expect(result.current.query.enabled).toBe(false);
    expect(mockGetOne).not.toHaveBeenCalled();
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Singleton**: One ID = One cache entry
- ✅ **Generic**: Type-safe single record
- ✅ **Adapter**: Unified getOne interface
- ✅ **Observer**: Realtime record updates
- ✅ **Select**: Data transformation

### Key Features

1. **ID-Based Caching** - Per-record cache
2. **Type Safety** - Generic types
3. **ID Validation** - Auto-disable without ID
4. **Realtime** - Record-specific updates
5. **Select Transform** - Optimize data

### Khi nào dùng useOne?

✅ **Nên dùng:**

- Fetch SINGLE record by ID
- Detail pages
- Edit forms (initial values)
- Related data fetching

❌ **Không dùng:**

- List view (use useList)
- Multiple specific IDs (use useMany)
- Infinite scroll (use useInfiniteList)

### Remember

✅ **2,338 lines** - Extensive generic documentation
🔑 **Singleton** - One ID, one cache
🎓 **Generic** - Type-safe (TQueryFnData, TData)
🔌 **Adapter** - Works with any backend
📡 **Observer** - Realtime single record
📦 **Select** - Extract only what you need

---

> 📚 **Best Practice**: Always specify **generic type** for autocomplete. **Validate ID** before fetching. Use **select** to optimize memory. Enable **liveMode** for collaborative apps. Always **check if result exists** before accessing properties!
