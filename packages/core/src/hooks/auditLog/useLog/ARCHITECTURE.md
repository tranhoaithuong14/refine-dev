# Kiến trúc và Design Patterns của useLog Hook

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
│  │  useLog ───→ Create/Rename audit logs           │  │
│  │               │                                  │  │
│  │               ▼                                  │  │
│  │  auditLogProvider.create()                       │  │
│  │  auditLogProvider.update()                       │  │
│  │               │                                  │  │
│  │               ▼                                  │  │
│  │  Database: Audit Logs Table                      │  │
│  │  - id, action, resource, author, timestamp...   │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Vai trò cụ thể:**

1. **Activity Tracker** - Ghi lại mọi hành động của user
2. **Compliance Tool** - Đáp ứng yêu cầu audit/compliance
3. **Security Monitor** - Theo dõi suspicious activities
4. **History Keeper** - Lưu lại lịch sử thay đổi

### 1.2 Audit Log Flow

```
┌──────────────────────────────────────────────────────────────┐
│                      AUDIT LOG FLOW                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 1: User performs action                                │
│  → Edit post #123                                            │
│  → Delete comment #456                                       │
│  → Create user "john@example.com"                            │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 2: Framework calls useLog automatically                │
│  const { log } = useLog();                                   │
│  log({                                                       │
│    action: "update",                                         │
│    resource: "posts",                                        │
│    meta: { id: 123 }                                         │
│  });                                                         │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 3: Check permissions                                   │
│  → Resource meta.audit configured?                           │
│  → Action allowed to be logged?                              │
│  → Yes: Continue                                             │
│  → No: Skip logging                                          │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 4: Get author identity                                 │
│  → useGetIdentity()                                          │
│  → Returns: { id: 1, name: "Admin User", ... }               │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 5: Call auditLogProvider.create()                      │
│  → Data: {                                                   │
│      action: "update",                                       │
│      resource: "posts",                                      │
│      meta: { id: 123 },                                      │
│      author: { id: 1, name: "Admin User" },                  │
│      timestamp: "2024-01-20T10:30:00Z"                      │
│    }                                                         │
│  → Insert into audit_logs table                              │
└──────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  STEP 6: Log entry created!                                  │
│  → Admins can review audit trail later                       │
│  → Compliance reports can be generated                       │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DESIGN PATTERNS - GIẢI THÍCH CHO NGƯỜI MỚI

> **Lưu ý:** Hook này KHÔNG được gọi trực tiếp - Framework tự động log!

---

### 2.1 Observer Pattern - Pattern "Quan Sát Viên"

#### 📹 VÍ DỤ ĐỜI THƯỜNG: Camera an ninh

```
Cửa hàng có camera:
- Khách vào → Camera tự động ghi hình
- Khách mua hàng → Camera ghi
- Khách ra → Camera ghi

Khách KHÔNG CẦN kích hoạt camera!
→ Camera tự động "observe" và record

useLog tương tự:
- User create post → Tự động log
- User edit comment → Tự động log
- User delete user → Tự động log

Developer KHÔNG CẦN gọi log()!
→ Framework tự động observe và log
```

**Observer** = Tự động react khi events xảy ra

#### ❌ Manual Logging (không tốt):

```typescript
// BAD - Developer phải remember to log everywhere

function useUpdate() {
  const update = async (params) => {
    // ... update logic

    // 😱 Phải nhớ log!
    const { log } = useLog();
    log({
      action: "update",
      resource: "posts",
      meta: { id: params.id },
    });

    // Nếu quên → Missing audit trail!
  };
}

// Vấn đề:
// - Dễ quên log
// - Duplicate code mọi nơi
// - Inconsistent logging
```

#### ✅ Automatic Logging (Observer):

```typescript
// GOOD - Framework tự động log

// Refine framework internally:
function useUpdate() {
  const { log } = useLog();

  const mutation = useMutation({
    mutationFn: async (params) => {
      // ... update logic
      const result = await dataProvider.update(params);

      // ✅ Framework tự động log!
      log({
        action: "update",
        resource: params.resource,
        meta: { id: params.id }
      });

      return result;
    }
  });
}

// Developer chỉ cần:
const { mutate } = useUpdate();
mutate({ resource: "posts", id: 123, values: {...} });
// → Audit log tự động created!
```

#### 💡 TẠI SAO quan trọng?

- ✅ Complete audit trail (không quên)
- ✅ Automatic (không cần manual)
- ✅ Consistent (mọi action đều logged)

---

### 2.2 Permission-Based Logging Pattern - Pattern "Log Theo Quyền"

#### 🔐 VÍ DỤ ĐỜI THƯỜNG: Camera phòng ban

```
Công ty có nhiều phòng:
- Phòng kế toán: Camera ON (sensitive data!)
- Phòng họp: Camera ON (important meetings)
- Phòng giải trí: Camera OFF (privacy)

Không phải mọi phòng đều cần camera!

useLog tương tự:
- Resource "payments": Log ON (financial!)
- Resource "users": Log ON (sensitive!)
- Resource "blogs": Log OFF (public content)

Không phải mọi resource đều cần audit!
```

**Permission-Based** = Selective logging

#### Configuration:

```typescript
// Resource definition
{
  name: "payments",
  meta: {
    audit: ["create", "update", "delete"] // Log these actions
    // "list" không có → Không log
  }
}

{
  name: "blogs",
  // Không có meta.audit → Không log gì cả
}
```

#### Implementation:

```typescript
const logPermissions = resource?.meta?.audit;

if (logPermissions) {
  // Check if action allowed to be logged
  if (!hasPermission(logPermissions, params.action)) {
    return; // Skip logging
  }
}

// Continue logging...
```

#### Why selective?

```
Benefits:
✅ Reduce noise (chỉ log important stuff)
✅ Database efficiency (ít records hơn)
✅ Privacy (không log công khai)
✅ Performance (fewer writes)
```

#### 💡 TẠI SAO quan trọng?

- ✅ Flexible (từng resource khác nhau)
- ✅ Scalable (không log mọi thứ)
- ✅ Privacy-compliant

---

### 2.3 Author Attribution Pattern - Pattern "Ghi Nhận Tác Giả"

#### ✍️ VÍ DỤ ĐỜI THƯỜNG: Chữ ký văn bản

```
Mọi văn bản quan trọng cần:
- Nội dung
- Người ký
- Thời gian

Audit log tương tự:
- Action (what?)
- Author (who?)
- Timestamp (when?)
```

**Author Attribution** = Ghi lại "ai" làm "gì"

#### Implementation:

```typescript
// Automatically get current user
const { data: identityData } = useGetIdentity({
  queryOptions: {
    enabled: !!auditLogContext?.create,
  },
});

// Include in log
return await auditLogContext.create?.({
  ...params,
  author: identityData, // ← Tự động thêm!
});
```

#### Log Entry Structure:

```typescript
{
  id: 1,
  action: "update",
  resource: "posts",
  meta: { id: 123, title: "New Title" },
  author: {
    id: 42,
    name: "John Doe",
    email: "john@example.com"
  },
  timestamp: "2024-01-20T10:30:00Z",
  previousData: { title: "Old Title" },
  newData: { title: "New Title" }
}
```

#### 💡 TẠI SAO quan trọng?

- ✅ Accountability (biết ai làm)
- ✅ Security (track bad actors)
- ✅ Compliance (audit requirements)

---

### 2.4 Dual-Purpose Pattern - Pattern "Hai Mục Đích"

#### 🔧 VÍ DỤ: Hook có 2 functions

```
useLog returns:
1. log() - Create new entries
2. rename() - Update log names

Two related but different purposes!
```

#### log() - Create Audit Entry:

```typescript
const { log } = useLog();

log({
  action: "create",
  resource: "posts",
  meta: { id: 123, title: "Hello World" },
});

// Creates new audit log entry
```

#### rename() - Update Log Name:

```typescript
const { rename } = useLog();

rename({
  id: auditLogId,
  name: "Payment Transaction #12345",
});

// Makes audit logs more readable
// Instead of generic "Update", show meaningful name
```

#### Why both?

```
log(): Main function (create audit trail)
rename(): Helper function (improve readability)

Most apps only use log()
Advanced apps use both
```

#### 💡 TẠI SAO quan trọng?

- ✅ Complete API (create + update)
- ✅ Flexibility
- ✅ Better UX (named logs easier to read)

---

### 2.5 Lazy Author Loading Pattern - Pattern "Load Tác Giả Khi Cần"

#### ⏰ VÍ DỤ: Just-in-time loading

```typescript
// Get identity upfront (eager)
const { data: identityData } = useGetIdentity();

// But only FETCH if logging is about to happen
if (isLoading && !!auditLogContext?.create) {
  authorData = await refetch(); // ← Fetch when needed!
}
```

**Lazy Loading** = Chỉ fetch khi thực sự cần

#### Why lazy?

```
Scenario: No audit log provider configured
→ Don't fetch identity (waste!)

Scenario: Audit provider exists
→ Fetch identity when creating log
```

#### 💡 TẠI SAO quan trọng?

- ✅ Performance (no unnecessary fetches)
- ✅ Efficient
- ✅ Conditional loading

---

## 📝 TÓM TẮT DESIGN PATTERNS

| Pattern                | Ví dụ đời thường | Giải quyết vấn đề gì | Trong useLog               |
| ---------------------- | ---------------- | -------------------- | -------------------------- |
| **Observer**           | Camera an ninh   | Auto-track events    | Framework auto-logs        |
| **Permission-Based**   | Camera phòng ban | Selective logging    | meta.audit config          |
| **Author Attribution** | Chữ ký văn bản   | Track "who"          | Auto-add author            |
| **Dual-Purpose**       | 2 tools in 1     | Create + Update      | log() + rename()           |
| **Lazy Loading**       | Load khi cần     | Efficient fetching   | Conditional identity fetch |

---

## 3. COMMON USE CASES

### 3.1 Configure Audit for Resource

```typescript
// Enable audit for sensitive resources
{
  name: "payments",
  list: "/payments",
  meta: {
    audit: ["create", "update", "delete"] // Log these actions
  }
}

// No audit for public content
{
  name: "blogs",
  list: "/blogs"
  // No meta.audit → không log
}
```

### 3.2 Custom Audit Provider

```typescript
const auditLogProvider = {
  create: async (params) => {
    // Save to database
    await db.auditLogs.create({
      action: params.action,
      resource: params.resource,
      author: params.author,
      meta: params.meta,
      timestamp: new Date(),
    });
  },

  update: async (params) => {
    // Update log name
    await db.auditLogs.update(params.id, {
      name: params.name,
    });
  },
};

<Refine auditLogProvider={auditLogProvider} />;
```

### 3.3 View Audit Trail

```typescript
// Query audit logs
const logs = await db.auditLogs
  .find({
    resource: "payments",
    author: { id: userId },
  })
  .sort({ timestamp: -1 });

// Display:
// "Admin User updated Payment #123 at 2024-01-20 10:30"
// "John Doe created Payment #456 at  2024-01-20 09:15"
```

---

## 4. AUDIT LOG BEST PRACTICES

### 4.1 What to Log

```
✅ DO LOG:
- Financial transactions
- User management (create/delete users)
- Permission changes
- Sensitive data access
- Configuration changes

❌ DON'T LOG:
- Public content reads
- UI state changes
- User preferences
- Non-sensitive data
```

### 4.2 Log Structure

```typescript
interface AuditLog {
  id: number;
  action: "create" | "update" | "delete" | "list";
  resource: string;
  author: {
    id: number;
    name: string;
    email: string;
  };
  meta: {
    id?: number;
    previousData?: any;
    newData?: any;
  };
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}
```

### 4.3 Retention Policy

```typescript
// Auto-delete old logs
cron.schedule("0 0 * * *", async () => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  await db.auditLogs.deleteMany({
    timestamp: { $lt: threeMonthsAgo },
  });
});
```

---

## 5. KẾT LUẬN

### Design Patterns Summary

- ✅ **Observer**: Auto-logging
- ✅ **Permission-Based**: Selective
- ✅ **Author Attribution**: Track who
- ✅ **Dual-Purpose**: Create + Update
- ✅ **Lazy Loading**: Efficient

### Key Features

1. **Automatic** - Framework calls it
2. **Selective** - Based on permissions
3. **Complete** - Includes author
4. **Flexible** - Configure per resource
5. **Compliant** - Meets audit requirements

### Khi nào dùng Audit Logs?

✅ **Nên dùng:**

- Financial systems
- Healthcare (HIPAA)
- Government apps
- Security-critical systems
- Compliance requirements

❌ **Không cần:**

- Simple blogs
- Public content sites
- Internal tools (no compliance)

### Remember

📹 **Framework auto-logs** - Developers không cần gọi
🔐 **Permission-based** - Configure per resource
✍️ **Auto-includes author** - From useGetIdentity
📊 **Two mutations**: log() + rename()
