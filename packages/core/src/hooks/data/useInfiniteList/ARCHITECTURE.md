# Kiến trúc và Design Patterns của useInfiniteList Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │          INFINITE SCROLLING SYSTEM                │  │
│  ├───────────────────────────────────────────────────┤  │
│  │                                                   │  │
│  │  useInfiniteList ✅ (THIS HOOK)                   │  │
│  │    → Infinite scroll / Load more pattern         │  │
│  │         │                                         │  │
│  │         ├──→ LOADS DATA IN PAGES:                │  │
│  │         │     Page 1: Posts 1-10                 │  │
│  │         │     Page 2: Posts 11-20                │  │
│  │         │     Page 3: Posts 21-30                │  │
│  │         │     ... (infinite)                     │  │
│  │         │                                         │  │
│  │         ├──→ Two Loading Strategies:             │  │
│  │         │     1. Scroll to bottom → Load more ⬇️ │  │
│  │         │     2. Click "Load More" button 🔘     │  │
│  │         │                                         │  │
│  │         ├──→ Auto Page Management:               │  │
│  │         │     - fetchNextPage() → Page 2, 3, ... │  │
│  │         │     - hasNextPage → More data?         │  │
│  │         │     - isFetchingNextPage → Loading?    │  │
│  │         │                                         │  │
│  │         ├──→ Smart Caching:                      │  │
│  │         │     - All pages cached together        │  │
│  │         │     - Navigate back → No refetch       │  │
│  │         │     - Stale-while-revalidate           │  │
│  │         │                                         │  │
│  │         └──→ Filters/Sorts Apply to ALL Pages    │  │
│  │                                                   │  │
│  │  Companion hook:                                 │  │
│  │    - useList → Regular pagination              │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Hook này có mục đích:**

> **Load data in infinite pages (infinite scroll or "load more" button) with automatic page management, smart caching, and filters/sorts support**

### 1.2 Complete Flow

```
┌──────────────────────────────────────────────────────────────┐
│            USEINFINITELIST COMPLETE FLOW                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Initial Load (Page 1)                              │
│  const { result, query } = useInfiniteList({                │
│    resource: "posts",                                        │
│    pagination: { pageSize: 10 }                             │
│  });                                                         │
│                                                              │
│  → Fetches: Posts 1-10                                      │
│  → result.data.pages[0] = { data: [Post 1-10], total: 100 } │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: User Scrolls to Bottom (or clicks "Load More")     │
│  query.fetchNextPage();                                      │
│                                                              │
│  → Fetches: Posts 11-20 (Page 2)                            │
│  → result.data.pages[1] = { data: [Post 11-20], total: 100 }│
│                                                              │
│  → DOM shows: Post 1-20 (Page 1 + Page 2) ✅                │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: User Continues Scrolling                           │
│  query.fetchNextPage(); → Page 3 (Posts 21-30)              │
│  query.fetchNextPage(); → Page 4 (Posts 31-40)              │
│  query.fetchNextPage(); → Page 5 (Posts 41-50)              │
│                                                              │
│  → result.data.pages = [Page1, Page2, Page3, Page4, Page5]  │
│  → DOM shows: Post 1-50 (all 5 pages) ✅                    │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Auto Page Detection                                │
│  result.hasNextPage → true (more data available)            │
│  result.hasNextPage → false (reached end, total = 100)      │
│                                                              │
│  → Smart "Load More" button:                                │
│    {hasNextPage && <button>Load More</button>}              │
│    {!hasNextPage && <div>No more posts</div>}               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: User Navigates Away and Returns                    │
│  - Navigate to /post/1 (detail page)                        │
│  - Click back to /posts (list page)                         │
│                                                              │
│  → Cache hit! All 5 pages still cached! ✅                  │
│  → NO refetch! Instant display! ⚡                           │
│  → User sees Post 1-50 immediately! ✅                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **File useInfiniteList.ts: 359 dòng** - Infinite scroll with React Query!

---

### 2.1 Iterator Pattern - Page-by-Page Data Loading

#### 📖 VÍ DỤ ĐỜI THƯỜNG: Reading a Book

```
Reading a Long Book (1000 pages):

DON'T read all at once:
→ Load all 1000 pages into memory ❌
→ Slow! Memory intensive!

DO read page by page (iterator):
→ Read page 1 → Turn page
→ Read page 2 → Turn page
→ Read page 3 → Turn page
→ ... (continue as needed)
→ Fast! Memory efficient! ✅

useInfiniteList = Reading page by page!
→ Load page 1 (posts 1-10)
→ Scroll down → Load page 2 (posts 11-20)
→ Scroll down → Load page 3 (posts 21-30)
→ ... (infinite)
```

**Iterator Pattern** = Access elements sequentially without loading all at once

#### Implementation:

```typescript
// From useInfiniteList.ts (lines 229-286)

const queryResponse = useInfiniteQuery({
  queryKey: keys()
    .data(pickedDataProvider)
    .resource(identifier)
    .action("infinite")  // ← Special key for infinite queries
    .params({...})
    .get(),

  // Query function - called for EACH page
  queryFn: (context) => {
    const paginationProperties = {
      ...prefferedPagination,
      // PAGE NUMBER from context! 📄
      currentPage: context.pageParam ?? prefferedPagination.currentPage
      // ↑ Page 1, then Page 2, then Page 3, ...
    };

    return getList({
      resource: resource?.name || "",
      pagination: paginationProperties,
      filters: prefferedFilters,
      sorters: prefferedSorters,
      meta
    });
  },

  // Start from page 1
  initialPageParam: prefferedPagination.currentPage,

  // How to get next page number
  getNextPageParam: (lastPage) => getNextPageParam(lastPage),
  // ↑ If page 1 loaded, next is page 2
  // ↑ If page 2 loaded, next is page 3
  // ↑ If no more data, returns undefined (stop)

  // How to get previous page (for bi-directional scroll)
  getPreviousPageParam: (lastPage) => getPreviousPageParam(lastPage)
});

// Result structure:
// {
//   data: {
//     pages: [
//       { data: [Post 1-10], total: 100 },  // ← Page 1
//       { data: [Post 11-20], total: 100 }, // ← Page 2
//       { data: [Post 21-30], total: 100 }  // ← Page 3
//     ],
//     pageParams: [1, 2, 3] // ← Page numbers
//   },
//   hasNextPage: true,  // ← More data available?
//   fetchNextPage: fn   // ← Load next page
// }
```

#### Visual Iterator Flow:

```
INITIAL STATE:
┌─────────────────────────────┐
│ Pages Loaded: []            │
│ Current View: Empty         │
└─────────────────────────────┘


ITERATION 1 (Page 1):
queryFn({ pageParam: 1 })
    ↓
Fetch: GET /posts?page=1&pageSize=10
    ↓
┌─────────────────────────────┐
│ Pages Loaded: [Page 1]      │
│ Current View: Posts 1-10    │
└─────────────────────────────┘


ITERATION 2 (Page 2):
User scrolls → fetchNextPage()
queryFn({ pageParam: 2 })
    ↓
Fetch: GET /posts?page=2&pageSize=10
    ↓
┌─────────────────────────────┐
│ Pages Loaded: [Page 1, Page 2] │
│ Current View: Posts 1-20    │
└─────────────────────────────┘


ITERATION 3 (Page 3):
User scrolls → fetchNextPage()
queryFn({ pageParam: 3 })
    ↓
Fetch: GET /posts?page=3&pageSize=10
    ↓
┌─────────────────────────────┐
│ Pages Loaded: [Page 1, 2, 3]│
│ Current View: Posts 1-30    │
└─────────────────────────────┘

... continues infinitely!
```

#### Real Example:

```tsx
function InfinitePostList() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: {
      pageSize: 10, // 10 posts per page
      currentPage: 1, // Start from page 1
    },
  });

  // Flatten all pages into single array
  const allPosts = result.data?.pages.flatMap((page) => page.data) || [];

  return (
    <div>
      {/* Render all posts from all loaded pages */}
      {allPosts.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
        </div>
      ))}

      {/* Load more button (iterator trigger) */}
      {result.hasNextPage && (
        <button
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}

      {/* End of list */}
      {!result.hasNextPage && <div>No more posts</div>}
    </div>
  );
}

// Flow:
// 1. Initial render: Shows posts 1-10 ✅
// 2. Click "Load More": Shows posts 1-20 ✅ (added page 2)
// 3. Click "Load More": Shows posts 1-30 ✅ (added page 3)
// ... (infinite iterations!)
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Memory Efficient** - Load only what's needed
- ✅ **Fast Initial Load** - Don't wait for all data
- ✅ **Scalable** - Works with millions of items
- ✅ **Better UX** - Progressive loading

---

### 2.2 Lazy Loading Pattern - On-Demand Data Fetching

#### 🚀 VÍ DỤ ĐỜI THƯỜNG: Streaming Video

```
YouTube Video:

DON'T download entire 2-hour video:
→ Download all 10GB upfront ❌
→ Wait 10 minutes before playing!
→ Bad UX! ❌

DO stream on demand (lazy load):
→ Download first 10 seconds → Play
→ User watches → Download next 10 seconds
→ User watches → Download next 10 seconds
→ Only download what's watched! ✅

useInfiniteList = YouTube streaming!
→ Load page 1 (first 10 posts) → Show
→ User scrolls → Load page 2
→ User scrolls → Load page 3
→ Only load what's viewed! ✅
```

**Lazy Loading** = Don't load until needed

#### Implementation:

```typescript
// Initial load - ONLY page 1:
const { result, query } = useInfiniteList({
  resource: "posts",
  pagination: { pageSize: 10 },
});
// ↑ Only fetches page 1 (10 posts)!
// NOT all 1000 posts! ✅

// Lazy load page 2 (only when user triggers):
<button onClick={() => query.fetchNextPage()}>Load More</button>;
// ↑ Page 2 fetched ONLY when clicked!
// Not loaded upfront! ✅

// Lazy load with scroll observer:
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && result.hasNextPage) {
      query.fetchNextPage();
      // ↑ Fetch ONLY when user scrolls to bottom!
    }
  });

  observer.observe(loaderRef.current);
}, []);
```

#### Performance Comparison:

```
Scenario: 1000 posts total

EAGER LOADING (useList with pagination):
Page 1:
→ Fetch: Posts 1-10
→ Time: 100ms
→ Memory: 10 posts

User clicks page 2:
→ Fetch: Posts 11-20
→ Time: 100ms
→ Memory: 10 posts (page 1 discarded)

User clicks page 3:
→ Fetch: Posts 21-30
→ Time: 100ms
→ Memory: 10 posts (page 2 discarded)

Total fetches: 3
Total data in memory: 10 posts (only current page)


LAZY LOADING (useInfiniteList):
Initial:
→ Fetch: Posts 1-10
→ Time: 100ms
→ Memory: 10 posts

User scrolls:
→ Fetch: Posts 11-20
→ Time: 100ms
→ Memory: 20 posts (page 1 + page 2 KEPT!)

User scrolls:
→ Fetch: Posts 21-30
→ Time: 100ms
→ Memory: 30 posts (all 3 pages KEPT!)

Total fetches: 3
Total data in memory: 30 posts (cumulative)

Benefits:
- Single scrollable list (better UX) ✅
- All data accessible (scroll back up) ✅
- No pagination buttons (cleaner UI) ✅
```

#### Real Example - Infinite Scroll:

```tsx
function InfiniteScrollPosts() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 20 },
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  // Lazy loading trigger (scroll observer)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // When loader element becomes visible
        if (
          entries[0].isIntersecting &&
          result.hasNextPage &&
          !query.isFetchingNextPage
        ) {
          query.fetchNextPage();
          // ↑ Lazy load next page! ✅
        }
      },
      { threshold: 0.5 }, // Trigger when 50% visible
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [result.hasNextPage, query.isFetchingNextPage]);

  const allPosts = result.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div>
      {allPosts.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}

      {/* Invisible loader element at bottom */}
      <div ref={loaderRef} style={{ height: 20 }}>
        {query.isFetchingNextPage && "Loading more..."}
      </div>

      {!result.hasNextPage && "No more posts"}
    </div>
  );

  // User experience:
  // 1. Scroll down → Loader visible → Auto-fetch! ✅
  // 2. New posts appear → Keep scrolling
  // 3. Seamless infinite scroll! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **On-Demand** - Fetch only when needed
- ✅ **Fast Initial** - Quick first render
- ✅ **Resource Efficient** - Save bandwidth
- ✅ **Better UX** - Progressive loading

---

### 2.3 Accumulator Pattern - Cumulative Data Collection

#### 🗂️ VÍ DỤ ĐỜI THƯỜNG: Building Photo Album

```
Adding Photos to Album:

Start: Album has 0 photos
Add batch 1: Album has 10 photos ✅
Add batch 2: Album has 20 photos ✅ (10 + 10)
Add batch 3: Album has 30 photos ✅ (20 + 10)
Add batch 4: Album has 40 photos ✅ (30 + 10)

Don't remove old photos!
Keep accumulating! ✅

useInfiniteList = Photo album!
Page 1: 10 posts
Page 2: 20 posts (10 + 10) ✅
Page 3: 30 posts (20 + 10) ✅
... (accumulate infinitely)
```

**Accumulator Pattern** = Keep adding to existing data

#### Implementation:

```typescript
// React Query's useInfiniteQuery automatically accumulates:
const queryResponse = useInfiniteQuery({
  // ... config
});

// Result structure (accumulator):
queryResponse.data = {
  pages: [
    // Page 1 (kept!) ✅
    { data: [Post 1-10], total: 100 },

    // Page 2 (added, page 1 kept!) ✅
    { data: [Post 11-20], total: 100 },

    // Page 3 (added, page 1&2 kept!) ✅
    { data: [Post 21-30], total: 100 }
  ],
  pageParams: [1, 2, 3]
};

// Access accumulated data:
const allPosts = queryResponse.data.pages.flatMap(page => page.data);
// ↑ [Post 1, 2, 3, ..., 30] (all 3 pages combined!)
```

#### Accumulation Lifecycle:

```typescript
// STEP 1: Initial render (Page 1)
fetchPage(1)
    ↓
pages = [
  { data: [Post 1-10] }
]
// ↑ 1 page, 10 posts total


// STEP 2: User triggers fetchNextPage() (Page 2)
fetchPage(2)
    ↓
pages = [
  { data: [Post 1-10] },   // ← Page 1 KEPT! ✅
  { data: [Post 11-20] }   // ← Page 2 ADDED! ✅
]
// ↑ 2 pages, 20 posts total


// STEP 3: User triggers fetchNextPage() (Page 3)
fetchPage(3)
    ↓
pages = [
  { data: [Post 1-10] },   // ← Page 1 KEPT! ✅
  { data: [Post 11-20] },  // ← Page 2 KEPT! ✅
  { data: [Post 21-30] }   // ← Page 3 ADDED! ✅
]
// ↑ 3 pages, 30 posts total


// User can scroll UP and see posts 1-10 again! ✅
// No refetch needed! Data already accumulated! ✅
```

#### Real Example - Accumulated Display:

```tsx
function AccumulatedPostList() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 10 },
  });

  // Accumulate all pages
  const allPosts = result.data?.pages.flatMap((page) => page.data) || [];

  // Calculate statistics
  const totalLoaded = allPosts.length;
  const totalAvailable = result.data?.pages[0]?.total || 0;
  const pagesLoaded = result.data?.pages.length || 0;

  return (
    <div>
      <div>
        Showing {totalLoaded} of {totalAvailable} posts ({pagesLoaded} pages
        loaded)
      </div>

      {/* Display ALL accumulated posts */}
      {allPosts.map((post, index) => (
        <div key={post.id}>
          <div>#{index + 1}</div> {/* Global index */}
          <h3>{post.title}</h3>
        </div>
      ))}

      {/* Load more accumulates! */}
      {result.hasNextPage && (
        <button onClick={() => query.fetchNextPage()}>
          Load 10 More (Current: {totalLoaded})
        </button>
      )}
    </div>
  );

  // Example flow:
  // Initial: Showing 10 of 100 posts (1 pages loaded)
  // After click: Showing 20 of 100 posts (2 pages loaded) ✅
  // After click: Showing 30 of 100 posts (3 pages loaded) ✅
  // ... (accumulates infinitely!)
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **No Data Loss** - All pages kept in memory
- ✅ **Scroll Back** - Can navigate to previous items
- ✅ **Better UX** - Seamless infinite list
- ✅ **State Preserved** - No refetch on scroll up

---

### 2.4 Pagination Abstraction Pattern - Hide Page Complexity

#### 🎬 VÍ DỤ ĐỜI THƯỜNG: Netflix Scrolling

```
Netflix Movie List:

YOU SEE:
→ Smooth scrolling list
→ Movies keep appearing
→ No page numbers
→ No "next/previous" buttons
→ Just scroll! ✅

BEHIND THE SCENES:
→ Page 1: Movies 1-20
→ Page 2: Movies 21-40
→ Page 3: Movies 41-60
→ React Query manages pages
→ You don't care about pages! ✅

useInfiniteList = Netflix scrolling!
User: Just scroll
Hook: Manages pages automatically
```

**Pagination Abstraction** = Hide page complexity from user

#### Implementation:

```typescript
// USER CODE (simple):
const { result, query } = useInfiniteList({
  resource: "posts",
  pagination: { pageSize: 10 },
});

// User doesn't deal with:
// ❌ currentPage state
// ❌ setCurrentPage()
// ❌ Page calculations
// ❌ Page number tracking

// Just:
const allPosts = result.data?.pages.flatMap((p) => p.data);
query.fetchNextPage(); // ← That's it! ✅

// HOOK HANDLES (behind the scenes):
// ✅ Track current page (1, 2, 3, ...)
// ✅ Calculate next page number
// ✅ Manage page params
// ✅ Accumulate pages
// ✅ Detect end of data
// ✅ Cache all pages
```

#### Abstraction Comparison:

```tsx
// WITHOUT ABSTRACTION (manual pagination):
function ManualPagination() {
  const [currentPage, setCurrentPage] = useState(1);
  const [allData, setAllData] = useState([]);

  const { data } = useList({
    resource: "posts",
    pagination: { current: currentPage, pageSize: 10 },
  });

  useEffect(() => {
    if (data) {
      setAllData((prev) => [...prev, ...data.data]);
      // ↑ Manual accumulation! 😰
    }
  }, [data]);

  const loadMore = () => {
    setCurrentPage((prev) => prev + 1);
    // ↑ Manual page management! 😰
  };

  // Complex! Manual! Error-prone! ❌
}

// WITH ABSTRACTION (useInfiniteList):
function AutoPagination() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 10 },
  });

  const allPosts = result.data?.pages.flatMap((p) => p.data) || [];

  const loadMore = () => {
    query.fetchNextPage();
    // ↑ Hook handles everything! ✅
  };

  // Simple! Automatic! Reliable! ✅
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Simplicity** - User code is clean
- ✅ **Reliability** - No manual page math
- ✅ **Less Bugs** - Framework handles complexity
- ✅ **Better DX** - Developer experience improved

---

### 2.5 Cache Retention Pattern - Keep All Pages Cached

#### 💾 VÍ DỤ ĐỜI THƯỜNG: Web Browser Tabs

```
Browser Tabs:

Tab 1: Reddit (loaded, scrolled down)
Tab 2: Twitter (loaded, scrolled down)

Switch to Tab 2 → Tab 1 stays in memory ✅
Switch back to Tab 1 → Instant! No reload! ⚡

useInfiniteList does the same:
- Load posts page 1, 2, 3
- Navigate to detail page
- Navigate back to list
→ All 3 pages still cached! ✅
→ Instant display! No refetch! ⚡
```

**Cache Retention** = Keep all pages in cache after loading

#### Implementation:

```typescript
// React Query caches ALL pages together:
queryKey: keys()
  .data(pickedDataProvider)
  .resource(identifier)
  .action("infinite") // ← Unique key for infinite query
  .params({...})
  .get()

// Cache structure:
// Key: ["posts", "infinite", { filters, sorters, ... }]
// Value: {
//   pages: [Page1, Page2, Page3],
//   pageParams: [1, 2, 3]
// }
// ↑ ALL pages cached together! ✅


// When user returns:
// 1. Same filters/sorters → Cache hit! ✅
// 2. All pages restored instantly! ⚡
// 3. No API calls! ✅
```

#### Cache Lifecycle:

```
USER JOURNEY:

1. User visits /posts
   → useInfiniteList called
   → Fetch page 1 (cache miss)
   → Cache: [Page 1]

2. User scrolls → Load more
   → fetchNextPage()
   → Fetch page 2
   → Cache: [Page 1, Page 2]

3. User scrolls → Load more
   → fetchNextPage()
   → Fetch page 3
   → Cache: [Page 1, Page 2, Page 3]

4. User clicks post → Navigate to /posts/123
   → Cache: [Page 1, Page 2, Page 3] (KEPT! ✅)

5. User clicks back → Navigate to /posts
   → useInfiniteList called
   → Cache hit! All 3 pages! ✅
   → Display posts 1-30 INSTANTLY! ⚡
   → NO API calls! ✅


BENEFITS:
- Instant navigation back ⚡
- Saved bandwidth 💰
- Better UX ✅
- Fresh data still possible (stale-while-revalidate)
```

#### Real Example - Cache Demonstration:

```tsx
function PostListWithCache() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 10 },
    queryOptions: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      // ↑ Cache fresh for 5 min!
    },
  });

  const allPosts = result.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div>
      <div>Cache status: {query.isFetching ? "Fetching" : "From cache ✅"}</div>

      {allPosts.map((post) => (
        <Link key={post.id} to={`/posts/${post.id}`}>
          <div>{post.title}</div>
        </Link>
      ))}

      {result.hasNextPage && (
        <button onClick={() => query.fetchNextPage()}>Load More</button>
      )}
    </div>
  );

  // User flow:
  // 1. Load page 1, 2, 3 (3 API calls)
  // 2. Click post → Detail page
  // 3. Click back → List page
  // 4. Display: From cache ✅ (0 API calls!)
  // 5. All 30 posts shown INSTANTLY! ⚡
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ **Instant Back** - No refetch on return
- ✅ **Bandwidth** - Save unnecessary requests
- ✅ **Better UX** - Instant page loads
- ✅ **Scroll Position** - Can be preserved

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                    | Ví dụ đời thường          | Giải quyết vấn đề gì   | Trong useInfiniteList                |
| -------------------------- | ------------------------- | ---------------------- | ------------------------------------ |
| **Iterator**               | Reading book page by page | Sequential data access | Load pages 1, 2, 3, ... sequentially |
| **Lazy Loading**           | YouTube streaming         | On-demand fetching     | Fetch only when user scrolls/clicks  |
| **Accumulator**            | Building photo album      | Cumulative data        | Keep all pages, don't discard        |
| **Pagination Abstraction** | Netflix scrolling         | Hide complexity        | Auto page management                 |
| **Cache Retention**        | Browser tabs              | Keep data in memory    | All pages cached together            |

---

## 3. KEY FEATURES

### 3.1 Infinite Scroll Support

```tsx
// Auto-fetch on scroll
const { result, query } = useInfiniteList({
  resource: "posts",
  pagination: { pageSize: 20 },
});

// Intersection Observer
const loaderRef = useRef(null);
useEffect(() => {
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && result.hasNextPage) {
      query.fetchNextPage(); // ← Auto-fetch!
    }
  });
  observer.observe(loaderRef.current);
}, []);
```

### 3.2 "Load More" Button

```tsx
// Manual load more
function LoadMorePosts() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 10 },
  });

  return (
    <div>
      {result.data?.pages
        .flatMap((p) => p.data)
        .map((post) => (
          <div key={post.id}>{post.title}</div>
        ))}

      {result.hasNextPage && (
        <button
          onClick={() => query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
}
```

### 3.3 Bidirectional Scrolling

```tsx
// Load previous pages too
const { result, query } = useInfiniteList({
  resource: "posts",
  pagination: { pageSize: 10 }
});

// Load older posts
<button onClick={() => query.fetchPreviousPage()}>
  Load Previous
</button>

// Load newer posts
<button onClick={() => query.fetchNextPage()}>
  Load Next
</button>
```

### 3.4 Filters & Sorts

```tsx
// Filters/sorts apply to ALL pages
const { result } = useInfiniteList({
  resource: "posts",
  pagination: { pageSize: 10 },
  filters: [{ field: "status", operator: "eq", value: "published" }],
  sorters: [{ field: "createdAt", order: "desc" }],
});

// All pages are filtered and sorted! ✅
```

### 3.5 Smart hasNextPage Detection

```typescript
// Auto-detects when no more data
result.hasNextPage;
// → true: More data available
// → false: Reached end

// Based on:
// - Current page count
// - Total items
// - Page size
// Example: 30 items loaded, 30 total → hasNextPage = false
```

---

## 4. COMMON USE CASES

### 4.1 Social Media Feed

```tsx
function SocialFeed() {
  const { result, query } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 20 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const loaderRef = useRef<HTMLDivElement>(null);

  // Auto-load on scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && result.hasNextPage) {
        query.fetchNextPage();
      }
    });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => observer.disconnect();
  }, [result.hasNextPage]);

  const allPosts = result.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div>
      {allPosts.map((post) => (
        <div key={post.id} className="feed-item">
          <h3>{post.title}</h3>
          <p>{post.content}</p>
        </div>
      ))}

      <div ref={loaderRef} style={{ height: 20 }}>
        {query.isFetchingNextPage && "Loading more posts..."}
      </div>

      {!result.hasNextPage && <div>You're all caught up!</div>}
    </div>
  );
}
```

### 4.2 Product Catalog

```tsx
function ProductCatalog() {
  const [category, setCategory] = useState("electronics");

  const { result, query } = useInfiniteList({
    resource: "products",
    pagination: { pageSize: 12 },
    filters: [{ field: "category", operator: "eq", value: category }],
    sorters: [{ field: "price", order: "asc" }],
  });

  const allProducts = result.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div>
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="electronics">Electronics</option>
        <option value="clothing">Clothing</option>
        <option value="books">Books</option>
      </select>

      <div className="product-grid">
        {allProducts.map((product) => (
          <div key={product.id} className="product-card">
            <img src={product.image} alt={product.name} />
            <h3>{product.name}</h3>
            <p>${product.price}</p>
          </div>
        ))}
      </div>

      {result.hasNextPage && (
        <button onClick={() => query.fetchNextPage()}>
          Show More Products
        </button>
      )}
    </div>
  );
}
```

### 4.3 Chat Message History

```tsx
function ChatHistory({ conversationId }) {
  const { result, query } = useInfiniteList({
    resource: "messages",
    pagination: { pageSize: 50 },
    filters: [
      { field: "conversationId", operator: "eq", value: conversationId },
    ],
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const messages = result.data?.pages.flatMap((p) => p.data) || [];

  return (
    <div>
      {/* Load older messages */}
      {result.hasPreviousPage && (
        <button onClick={() => query.fetchPreviousPage()}>
          Load Older Messages
        </button>
      )}

      {/* Messages (reverse order for chat) */}
      {messages.reverse().map((msg) => (
        <div key={msg.id} className="message">
          <div>{msg.sender}</div>
          <div>{msg.content}</div>
        </div>
      ))}
    </div>
  );
}
```

### 4.4 Search Results

```tsx
function SearchResults() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 500);

  const { result, query: infiniteQuery } = useInfiniteList({
    resource: "posts",
    pagination: { pageSize: 15 },
    filters: debouncedQuery
      ? [{ field: "title", operator: "contains", value: debouncedQuery }]
      : [],
  });

  const results = result.data?.pages.flatMap((p) => p.data) || [];
  const total = result.data?.pages[0]?.total || 0;

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search posts..."
      />

      <div>Found {total} results</div>

      {results.map((post) => (
        <div key={post.id}>
          <h3>{post.title}</h3>
        </div>
      ))}

      {result.hasNextPage && (
        <button onClick={() => infiniteQuery.fetchNextPage()}>
          Load More Results
        </button>
      )}
    </div>
  );
}
```

### 4.5 Notification Center

```tsx
function NotificationCenter() {
  const { result, query } = useInfiniteList({
    resource: "notifications",
    pagination: { pageSize: 10 },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  const notifications = result.data?.pages.flatMap((p) => p.data) || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = () => {
    // Mark all as read logic...
  };

  return (
    <div>
      <div>
        <h2>Notifications ({unreadCount} unread)</h2>
        <button onClick={handleMarkAllRead}>Mark All as Read</button>
      </div>

      {notifications.map((notif) => (
        <div key={notif.id} className={notif.read ? "read" : "unread"}>
          <div>{notif.message}</div>
          <div>{notif.createdAt}</div>
        </div>
      ))}

      {result.hasNextPage && (
        <button onClick={() => query.fetchNextPage()}>
          Load Older Notifications
        </button>
      )}
    </div>
  );
}
```

---

## 5. ARCHITECTURE DECISIONS

### 5.1 Why useInfiniteQuery Instead of Manual Page Management?

**Answer:** React Query handles complexity automatically

```typescript
// MANUAL (complex):
// - Track current page
// - Accumulate data manually
// - Calculate next page
// - Handle cache manually
// - Detect end manually

// useInfiniteQuery (simple):
// - Auto page tracking ✅
// - Auto accumulation ✅
// - Auto next page calc ✅
// - Auto caching ✅
// - Auto end detection ✅
```

### 5.2 Why Keep All Pages in Cache?

**Answer:** Better UX for scroll-back and navigation

```typescript
// Scenario: User loads 5 pages, scrolls to bottom

// OPTION 1: Discard old pages
// - Memory: Low ✅
// - Scroll up: Refetch required ❌
// - Navigate back: Refetch required ❌

// OPTION 2: Keep all pages (chosen) ✅
// - Memory: Higher (acceptable)
// - Scroll up: Instant! ✅
// - Navigate back: Instant! ✅
// - Better UX! ✅
```

### 5.3 Why Separate "infinite" Action in Query Key?

**Answer:** Different cache for infinite vs regular list

```typescript
// Regular list (pagination):
keys().data().resource("posts").action("list").get();
// → ["posts", "list", {...}]

// Infinite list:
keys().data().resource("posts").action("infinite").get();
// → ["posts", "infinite", {...}]

// Different keys → Different caches ✅
// No conflicts! ✅
```

---

## 6. COMMON PITFALLS

### 6.1 Not Flattening Pages

```tsx
// ❌ WRONG - Showing pages structure
<div>
  {result.data?.pages.map((page) => (
    <div key={page.pagination.currentPage}>
      {page.data.map((post) => (
        <div>{post.title}</div>
      ))}
    </div>
  ))}
</div>;
// Weird nested structure! ❌

// ✅ CORRECT - Flatten pages
const allPosts = result.data?.pages.flatMap((p) => p.data) || [];
<div>
  {allPosts.map((post) => (
    <div key={post.id}>{post.title}</div>
  ))}
</div>;
```

### 6.2 Missing Intersection Observer Cleanup

```tsx
// ❌ WRONG - Memory leak
useEffect(() => {
  const observer = new IntersectionObserver(...);
  observer.observe(loaderRef.current);
  // No cleanup! ❌
}, []);

// ✅ CORRECT - Cleanup observer
useEffect(() => {
  const observer = new IntersectionObserver(...);
  if (loaderRef.current) {
    observer.observe(loaderRef.current);
  }

  return () => observer.disconnect(); // ← Cleanup! ✅
}, []);
```

### 6.3 Not Checking hasNextPage

```tsx
// ❌ WRONG - Always showing button
<button onClick={() => query.fetchNextPage()}>Load More</button>;
// Button shows even when no more data! ❌

// ✅ CORRECT - Check hasNextPage
{
  result.hasNextPage && (
    <button onClick={() => query.fetchNextPage()}>Load More</button>
  );
}
{
  !result.hasNextPage && <div>No more data</div>;
}
```

### 6.4 Forgetting Loading State

```tsx
// ❌ WRONG - No loading indicator
<button onClick={() => query.fetchNextPage()}>
  Load More
</button>

// ✅ CORRECT - Show loading
<button
  onClick={() => query.fetchNextPage()}
  disabled={query.isFetchingNextPage}
>
  {query.isFetchingNextPage ? "Loading..." : "Load More"}
</button>
```

---

## 7. PERFORMANCE CONSIDERATIONS

### 7.1 Infinite List vs Regular Pagination

```
Scenario: 1000 items

INFINITE LIST:
- Initial: 20 items (fast ⚡)
- Memory: Grows with scrolling
- Navigation: Instant (cached) ✅
- Use case: Feeds, social media


REGULAR PAGINATION:
- Initial: 20 items (fast ⚡)
- Memory: Constant (20 items)
- Navigation: Requires refetch ⏳
- Use case: Search, data tables
```

### 7.2 Page Size Optimization

```typescript
// Too small (inefficient):
pagination: {
  pageSize: 5;
}
// → Many API calls ❌
// → Frequent loading states ❌

// Too large (slow):
pagination: {
  pageSize: 100;
}
// → Slow initial load ❌
// → Large payload ❌

// Optimal (balanced):
pagination: {
  pageSize: 20;
}
// → Reasonable API calls ✅
// → Fast initial load ✅
```

---

## 8. TESTING

### 8.1 Test Initial Load

```typescript
describe("useInfiniteList", () => {
  it("should load first page", async () => {
    const { result } = renderHook(() =>
      useInfiniteList({
        resource: "posts",
        pagination: { pageSize: 10 },
      }),
    );

    await waitFor(() => {
      expect(result.current.result.data?.pages).toHaveLength(1);
    });

    const firstPage = result.current.result.data?.pages[0];
    expect(firstPage?.data).toHaveLength(10);
  });
});
```

### 8.2 Test fetchNextPage

```typescript
describe("useInfiniteList - fetchNextPage", () => {
  it("should load next page", async () => {
    const { result } = renderHook(() =>
      useInfiniteList({
        resource: "posts",
        pagination: { pageSize: 10 },
      }),
    );

    // Wait for first page
    await waitFor(() => {
      expect(result.current.result.data?.pages).toHaveLength(1);
    });

    // Load next page
    act(() => {
      result.current.query.fetchNextPage();
    });

    await waitFor(() => {
      expect(result.current.result.data?.pages).toHaveLength(2);
    });

    const allData = result.current.result.data?.pages.flatMap((p) => p.data);
    expect(allData).toHaveLength(20); // 2 pages × 10 items
  });
});
```

---

## 9. KẾT LUẬN

### Design Patterns Summary

- ✅ **Iterator**: Load pages sequentially (1, 2, 3, ...)
- ✅ **Lazy Loading**: Fetch on-demand (scroll/click)
- ✅ **Accumulator**: Keep all pages (cumulative)
- ✅ **Pagination Abstraction**: Auto page management
- ✅ **Cache Retention**: All pages cached together

### Key Features

1. **Infinite Scroll** - Auto-load on scroll
2. **Load More** - Manual trigger
3. **Bidirectional** - Load previous/next
4. **Filters & Sorts** - Apply to all pages
5. **Smart Detection** - hasNextPage auto-calculated

### Khi nào dùng useInfiniteList?

✅ **Nên dùng:**

- Social media feeds
- Product catalogs
- Chat message history
- Search results
- Notification centers
- Any infinite scroll UI

❌ **Không dùng:**

- Data tables (use useList with pagination)
- Small datasets (< 100 items)
- Need page numbers (use useList)
- Memory critical (use regular pagination)

### Remember

✅ **359 lines** - Infinite scroll foundation
📖 **Iterator** - Page-by-page loading
🚀 **Lazy** - On-demand fetching
🗂️ **Accumulator** - Cumulative data
🎬 **Abstraction** - Hide page complexity
💾 **Cache** - All pages retained

### Best Practices

1. **Flatten pages** - Use `flatMap` for display
2. **Check hasNextPage** - Don't show button when no more data
3. **Handle loading** - Show isFetchingNextPage state
4. **Cleanup observers** - Disconnect on unmount
5. **Optimize pageSize** - Balance between calls and load time

---

> 📚 **Best Practice**: Use **useInfiniteList** for social feeds and infinite scroll UIs. Use **intersection observer** for auto-loading. Keep **pageSize around 20** for balance. Always **flatten pages** before rendering. **Cache retention** provides instant navigation back!
