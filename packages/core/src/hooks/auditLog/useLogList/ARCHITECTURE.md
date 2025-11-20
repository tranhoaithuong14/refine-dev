# Kiến trúc và Design Patterns của useLogList Hook

## 1. VAI TRÒ TRONG HỆ THỐNG

### 1.1 Vị trí trong Refine Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    REFINE FRAMEWORK                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │          AUDIT LOG SYSTEM                        │  │
│  ├──────────────────────────────────────────────────┤  │
│  │                                                  │  │
│  │  useLog ───→ Create/Update logs                 │  │
│  │                                                  │  │
│  │  useLogList ───→ Query/Display logs ✅          │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  auditLogProvider.get()                          │  │
│  │         │                                        │  │
│  │         ▼                                        │  │
│  │  Database: SELECT * FROM audit_logs              │  │
│  │           WHERE resource = 'payments'            │  │
│  │           ORDER BY timestamp DESC                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Audit Log Viewer** - Hiển thị danh sách audit logs
2. **Filter Manager** - Filter theo resource, action, author
3. **Compliance Reporter** - Generate audit reports
4. **Activity Monitor** - Track user activities

### 1.2 Complete Audit Trail Flow

```
┌──────────────────────────────────────────────────────────────┐
│                   AUDIT TRAIL VIEWING FLOW                   │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: Admin wants to view audit logs                      │
│  → Navigate to /audit-logs                                   │
│  → View activity history                                     │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Call useLogList with filters                        │
│  const { data } = useLogList({                               │
│    resource: "payments",                                     │
│    action: "delete",                                         │
│    author: { id: userId }                                    │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check React Query cache                             │
│  Cache key: ["audit", "payments", "list", {...meta}]        │
│  → Hit? Return cached logs                                   │
│  → Miss? Fetch from provider                                 │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Call auditLogProvider.get()                         │
│  → Query database with filters                               │
│  → SQL: SELECT * FROM audit_logs                             │
│         WHERE resource = 'payments'                          │
│         AND action = 'delete'                                │
│         AND author_id = 42                                   │
│         ORDER BY timestamp DESC                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Return filtered results                             │
│  [                                                           │
│    {                                                         │
│      id: 1,                                                  │
│      action: "delete",                                       │
│      resource: "payments",                                   │
│      author: { id: 42, name: "Admin" },                      │
│      timestamp: "2024-01-20T10:30:00Z"                      │
│    },                                                        │
│    ...                                                       │
│  ]                                                           │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Display in UI                                       │
│  <Table>                                                     │
│    "Admin deleted Payment #123 at 10:30 AM"                 │
│    "Admin deleted Payment #456 at 09:15 AM"                 │
│  </Table>                                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này là PUBLIC API - developers dùng để hiển thị audit trail!

---

### 2.1 Query Pattern (via React Query)

_(Tương tự useCan, usePermissions - đã giải thích)_

#### 📡 VÍ DỤ: Cached log queries

```
Component A: useLogList({ resource: "payments" })
→ Fetch from API → Cache results

Component B: useLogList({ resource: "payments" })
→ Cache hit! (instant) ✅

→ 2 components = 1 API call!
```

---

### 2.2 Filter Pattern - Pattern "Lọc Dữ Liệu"

#### 🔍 VÍ DỤ ĐỜI THƯỜNG: Tìm kiếm sách thư viện

```
Thư viện có 10,000 cuốn sách:

❌ BAD - Lấy tất cả:
Librarian: Lấy tất cả sách
→ 10,000 cuốn (quá nhiều!)
→ Tìm mãi không ra!

✅ GOOD - Filter:
You: "Sách về Programming, tác giả Martin Fowler"
→ 5 cuốn (perfect!)
→ Dễ tìm!
```

**Filter Pattern** = Narrow down results với criteria

#### ❌ KHÔNG có Filter:

```typescript
// BAD - Lấy tất cả logs

const { data: allLogs } = useLogList({
  resource: "all", // 😱 Hàng triệu records!
});

// Client-side filtering (slow!)
const paymentLogs = allLogs?.filter(
  (log) => log.resource === "payments" && log.action === "delete",
);

// Vấn đề:
// - Load quá nhiều data
// - Slow (filter on client)
// - Memory issues
```

#### ✅ CÓ Filter Pattern:

```typescript
// GOOD - Server-side filtering

const { data: paymentLogs } = useLogList({
  resource: "payments", // ← Filter 1
  action: "delete", // ← Filter 2
  author: { id: 42 }, // ← Filter 3
  meta: {
    dateFrom: "2024-01-01",
    dateTo: "2024-01-31",
  },
});

// Server queries chỉ cần thiết:
// SELECT * FROM audit_logs
// WHERE resource = 'payments'
//   AND action = 'delete'
//   AND author_id = 42
//   AND timestamp BETWEEN '2024-01-01' AND '2024-01-31'
// → Fast, efficient!
```

#### Filter Options:

```typescript
interface UseLogProps {
  resource: string; // Required: which resource
  action?: string; // Optional: which action (create/update/delete)
  author?: object; // Optional: which user
  meta?: object; // Optional: custom filters (date range, etc.)
}
```

#### Real-world Examples:

```typescript
// Example 1: All payment activities
const { data } = useLogList({
  resource: "payments",
});

// Example 2: Only deletions
const { data } = useLogList({
  resource: "users",
  action: "delete",
});

// Example 3: Specific user's activities
const { data } = useLogList({
  resource: "posts",
  author: { id: currentUserId },
});

// Example 4: Date range
const { data } = useLogList({
  resource: "orders",
  meta: {
    startDate: "2024-01-01",
    endDate: "2024-01-31",
  },
});
```

#### 💡 TẠI SAO quan trọng?

- ✅ Fast (server-side filtering)
- ✅ Efficient (only needed data)
- ✅ Scalable (handles millions of logs)

---

### 2.3 Default Value Pattern - Pattern "Giá Trị Mặc Định"

#### 🛡️ VÍ DỤ: No audit provider

```typescript
// If no auditLogProvider configured:
get === undefined

// Hook returns empty array (safe default):
queryFn: () => get?.(...) ?? Promise.resolve([])
//                          ↑↑ Fallback to []

// Component renders empty list (no crash!)
```

**Default Value** = Safe fallback when missing

#### 💡 TẠI SAO quan trọng?

- ✅ No crashes
- ✅ Works during development (no provider needed)
- ✅ Graceful degradation

---

### 2.4 Pagination Support Pattern

#### 📄 VÍ DỤ ĐỜI THƯỜNG: Danh bạ điện thoại

```
Danh bạ có 1,000 contacts:

❌ BAD - Show all:
→ 1,000 names on one screen
→ Lag, hard to navigate!

✅ GOOD - Pagination:
Page 1: 1-20
Page 2: 21-40
...
→ Fast, easy to navigate!
```

**Pagination** = Load data incrementally

#### Implementation:

```typescript
const { data, isLoading } = useLogList({
  resource: "payments",
  meta: {
    current: page,        // Current page (1, 2, 3...)
    pageSize: 50,         // Logs per page
  },
  queryOptions: {
    keepPreviousData: true // Smooth page transitions
  }
});

// Backend returns:
{
  data: [...logs],
  total: 500,
  current: 1,
  pageSize: 50
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Performance (load less data)
- ✅ UX (faster rendering)
- ✅ Scalable (millions of logs)

---

### 2.5 Sorting/Ordering Pattern

#### 📊 VÍ DỤ: Sắp xếp logs

```typescript
const { data } = useLogList({
  resource: "users",
  meta: {
    sorters: [
      { field: "timestamp", order: "desc" }, // Newest first
    ],
  },
});

// Most recent activities on top
// → Easy to see what just happened
```

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern           | Ví dụ đời thường   | Giải quyết vấn đề gì    | Trong useLogList       |
| ----------------- | ------------------ | ----------------------- | ---------------------- |
| **Query**         | Cached search      | Cache results           | React Query            |
| **Filter**        | Tìm sách thư viện  | Narrow down data        | resource/action/author |
| **Default Value** | Safe fallback      | Handle missing provider | Return []              |
| **Pagination**    | Danh bạ điện thoại | Load incrementally      | meta.current/pageSize  |
| **Sorting**       | Sắp xếp            | Order results           | meta.sorters           |

---

## 3. COMMON USE CASES

### 3.1 Audit Log Dashboard

```typescript
function AuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLogList({
    resource: "all", // All resources
    meta: {
      current: page,
      pageSize: 50,
    },
  });

  return (
    <div>
      <h1>Audit Trail</h1>
      {isLoading ? (
        <Skeleton />
      ) : (
        <>
          <Table data={data.data} />
          <Pagination current={page} total={data.total} onChange={setPage} />
        </>
      )}
    </div>
  );
}
```

### 3.2 Resource-Specific Activity Log

```typescript
function PostActivityLog({ postId }) {
  const { data } = useLogList({
    resource: "posts",
    meta: {
      filters: [{ field: "id", value: postId }],
    },
  });

  return (
    <Timeline>
      {data?.map((log) => (
        <Event key={log.id}>
          {log.author.name} {log.action}ed this post at{" "}
          {formatDate(log.timestamp)}
        </Event>
      ))}
    </Timeline>
  );
}
```

### 3.3 User Activity Tracking

```typescript
function UserActivityLog({ userId }) {
  const { data } = useLogList({
    resource: "all",
    author: { id: userId },
    meta: {
      sorters: [{ field: "timestamp", order: "desc" }],
    },
  });

  return (
    <List>
      {data?.map((log) => (
        <Item>
          {log.action} {log.resource} #{log.meta.id}- {formatDate(log.timestamp)}
        </Item>
      ))}
    </List>
  );
}
```

### 3.4 Compliance Report

```typescript
function ComplianceReport() {
  const { data } = useLogList({
    resource: "payments",
    meta: {
      dateFrom: "2024-01-01",
      dateTo: "2024-12-31",
    },
  });

  const exportToCSV = () => {
    const csv = data
      .map(
        (log) =>
          `${log.timestamp},${log.author.name},${log.action},${log.resource}`,
      )
      .join("\n");

    download(csv, "audit-report-2024.csv");
  };

  return (
    <div>
      <h1>Annual Audit Report</h1>
      <Table data={data} />
      <button onClick={exportToCSV}>Export CSV</button>
    </div>
  );
}
```

---

## 4. AUDIT LOG PROVIDER IMPLEMENTATION

### 4.1 Basic Provider

```typescript
const auditLogProvider = {
  get: async (params) => {
    const { resource, action, author, meta } = params;

    // Build query
    let query = db.auditLogs.find({});

    if (resource) query = query.where({ resource });
    if (action) query = query.where({ action });
    if (author) query = query.where({ "author.id": author.id });

    // Pagination
    if (meta?.current && meta?.pageSize) {
      const skip = (meta.current - 1) * meta.pageSize;
      query = query.skip(skip).limit(meta.pageSize);
    }

    // Sorting
    if (meta?.sorters) {
      meta.sorters.forEach((sorter) => {
        query = query.sort({ [sorter.field]: sorter.order });
      });
    }

    const data = await query.exec();
    const total = await db.auditLogs.countDocuments({});

    return { data, total };
  },
};
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Query**: Cached with React Query
- ✅ **Filter**: Server-side filtering
- ✅ **Default Value**: Safe fallbacks
- ✅ **Pagination**: Efficient loading
- ✅ **Sorting**: Ordered results

### Key Features

1. **PUBLIC API** - Developers dùng trực tiếp
2. **Filtered** - Resource/action/author filters
3. **Cached** - Fast with React Query
4. **Paginated** - Handles large datasets
5. **Flexible** - Custom meta filters

### Khi nào dùng useLogList?

✅ **Nên dùng:**

- Audit trail dashboard
- Activity logs
- Compliance reports
- Security monitoring
- User activity tracking

❌ **Không dùng:**

- Creating logs (use useLog)
- Real-time monitoring (use websockets)

### Remember

✅ **PUBLIC API** - Dùng để view logs
🔍 **Server-side filtering** - Efficient
📄 **Pagination support** - Large datasets
📊 **Sorting support** - Custom order
💾 **Cached** - React Query optimization
