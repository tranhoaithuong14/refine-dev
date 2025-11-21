# KIẾN TRÚC: useInvalidate Hook

## 1. Vai trò trong hệ thống

`useInvalidate` là hook quản lý **cache invalidation** (vô hiệu hóa cache) cho React Query trong Refine. Nó đảm bảo dữ liệu luôn đồng bộ sau các thao tác mutation (create/update/delete).

### Vị trí trong kiến trúc:

```
┌─────────────────────────────────────────────────────────────┐
│                    REFINE APPLICATION                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   useCreate  │    │  useUpdate   │    │  useDelete   │  │
│  │              │    │              │    │              │  │
│  │  Mutation    │    │  Mutation    │    │  Mutation    │  │
│  │  Operations  │    │  Operations  │    │  Operations  │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                   │                   │            │
│         └───────────────────┼───────────────────┘            │
│                             │                                │
│                    SUCCESS CALLBACK                          │
│                             │                                │
│                             ▼                                │
│                  ┌──────────────────────┐                    │
│                  │   useInvalidate()    │◄─────────┐        │
│                  │                      │          │        │
│                  │  Cache Invalidation  │          │        │
│                  │  Strategy Controller │          │        │
│                  └──────────┬───────────┘          │        │
│                             │                      │        │
│              ┌──────────────┼──────────────┐       │        │
│              │              │              │       │        │
│              ▼              ▼              ▼       │        │
│         ┌────────┐    ┌─────────┐   ┌──────────┐  │        │
│         │  list  │    │ detail  │   │   many   │  │        │
│         └────────┘    └─────────┘   └──────────┘  │        │
│              │              │              │       │        │
│              └──────────────┼──────────────┘       │        │
│                             │                      │        │
│                             ▼                      │        │
│                  ┌──────────────────────┐          │        │
│                  │   React Query        │          │        │
│                  │   queryClient        │──────────┘        │
│                  │                      │                   │
│                  │  .invalidateQueries()│                   │
│                  └──────────┬───────────┘                   │
│                             │                               │
│                             ▼                               │
│                    CACHE INVALIDATED                        │
│                             │                               │
│                             ▼                               │
│                  ┌──────────────────────┐                   │
│                  │  Auto Refetch Data   │                   │
│                  │                      │                   │
│                  │  • useList refetch   │                   │
│                  │  • useOne refetch    │                   │
│                  │  • useMany refetch   │                   │
│                  └──────────────────────┘                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘

LUỒNG HOẠT ĐỘNG:
1. User thực hiện mutation (create/update/delete)
2. Mutation success → gọi useInvalidate
3. useInvalidate xác định chiến lược invalidation
4. Gọi queryClient.invalidateQueries với query keys phù hợp
5. React Query tự động refetch các queries đang active
6. UI cập nhật với dữ liệu mới nhất
```

### Ví dụ thực tế:

Hãy tưởng tượng bạn quản lý cửa hàng sách:

```typescript
// Khi thêm sách mới
const { mutate } = useCreate();

mutate(
  {
    resource: "books",
    values: { title: "Clean Code", price: 250000 }
  },
  {
    onSuccess: () => {
      // Invalidate danh sách để hiển thị sách mới
      invalidate({
        resource: "books",
        invalidates: ["list"]
      });
    }
  }
);

// Khi cập nhật giá sách
const { mutate: updateBook } = useUpdate();

updateBook(
  {
    resource: "books",
    id: "123",
    values: { price: 200000 }
  },
  {
    onSuccess: () => {
      // Invalidate cả chi tiết lẫn danh sách
      invalidate({
        resource: "books",
        invalidates: ["detail", "list"],
        id: "123"
      });
    }
  }
);

// Khi xóa sách
const { mutate: deleteBook } = useDelete();

deleteBook(
  {
    resource: "books",
    id: "123"
  },
  {
    onSuccess: () => {
      // Xóa toàn bộ cache của resource này
      invalidate({
        resource: "books",
        invalidates: ["resourceAll"]
      });
    }
  }
);
```

## 2. Luồng hoạt động chi tiết

### Sơ đồ luồng đầy đủ:

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                               │
│         (Create/Update/Delete trong component)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 1: MUTATION EXECUTION                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  const { mutate } = useCreate();                             │
│  mutate(                                                      │
│    { resource: "posts", values: {...} },                     │
│    {                                                          │
│      onSuccess: (data) => {                                  │
│        // Mutation thành công                                │
│      }                                                        │
│    }                                                          │
│  );                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 2: CALL useInvalidate                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  const invalidate = useInvalidate();                         │
│                                                               │
│  invalidate({                                                │
│    resource: "posts",                  // Resource name      │
│    dataProviderName: "default",        // Data provider      │
│    invalidates: ["list", "detail"],    // Strategies         │
│    id: "123"                           // Optional ID        │
│  });                                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 3: VALIDATE & SETUP                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  // 3.1: Kiểm tra invalidates                                │
│  if (invalidates === false) return;                          │
│  if (invalidates.length === 0) return;                       │
│                                                               │
│  // 3.2: Lấy query keys generator                            │
│  const { keys, preferLegacyKeys } = useKeys();               │
│                                                               │
│  // 3.3: Xác định data provider                              │
│  const dataProvider = pickDataProvider(                      │
│    resource?.identifier,                                     │
│    dataProviderName,                                         │
│    dataProviders                                             │
│  );                                                           │
│                                                               │
│  // 3.4: Lấy queryClient từ React Query                      │
│  const queryClient = useQueryClient();                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 4: STRATEGY SELECTION                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  Duyệt qua từng invalidation type:                           │
│                                                               │
│  for (const key of invalidates) {                            │
│    switch (key) {                                            │
│      case "all":         // Strategy 1                       │
│      case "list":        // Strategy 2                       │
│      case "many":        // Strategy 3                       │
│      case "detail":      // Strategy 4                       │
│      case "resourceAll": // Strategy 5                       │
│    }                                                          │
│  }                                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬───────────┐
         │             │             │           │
         ▼             ▼             ▼           ▼
┌─────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐
│  Strategy 1 │ │Strategy 2 │ │Strategy 3│ │Strategy 4│
│    "all"    │ │  "list"   │ │  "many"  │ │ "detail" │
└─────────────┘ └───────────┘ └──────────┘ └──────────┘

═══════════════════════════════════════════════════════════════
STRATEGY 1: "all" - Invalidate toàn bộ data provider
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Invalidate ALL queries của data provider này                │
│                                                               │
│  const queryKey = keys()                                     │
│    .data(dataProviderName)                                   │
│    .get(preferLegacyKeys);                                   │
│                                                               │
│  // Result: ["data", "default"]                              │
│                                                               │
│  await queryClient.invalidateQueries({                       │
│    queryKey,                                                 │
│    refetchType: "active",                                    │
│    type: "all"                                               │
│  });                                                          │
│                                                               │
│  ⚠️ CỰC MẠNH - Invalidate mọi query của provider này         │
│  ✅ Dùng khi: Thay đổi ảnh hưởng toàn bộ hệ thống            │
│  ❌ Tránh dùng: Khi chỉ update 1 record                      │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
STRATEGY 2: "list" - Invalidate list queries
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Invalidate useList queries của resource                     │
│                                                               │
│  const queryKey = keys()                                     │
│    .data(dataProviderName)                                   │
│    .resource(resource.identifier)                            │
│    .action("list")                                           │
│    .get(preferLegacyKeys);                                   │
│                                                               │
│  // Result: ["data", "default", "posts", "list"]             │
│                                                               │
│  await queryClient.invalidateQueries({                       │
│    queryKey,                                                 │
│    refetchType: "active",                                    │
│    type: "all"                                               │
│  });                                                          │
│                                                               │
│  ✅ Dùng khi:                                                 │
│    - Thêm record mới (create)                                │
│    - Xóa record (delete)                                     │
│    - Update ảnh hưởng đến danh sách (status, order)         │
│                                                               │
│  📝 Note: Invalidate MỌI list query (mọi filter/sort/page)  │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
STRATEGY 3: "many" - Invalidate many queries
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Invalidate useMany queries của resource                     │
│                                                               │
│  const queryKey = keys()                                     │
│    .data(dataProviderName)                                   │
│    .resource(resource.identifier)                            │
│    .action("many")                                           │
│    .get(preferLegacyKeys);                                   │
│                                                               │
│  // Result: ["data", "default", "posts", "many"]             │
│                                                               │
│  await queryClient.invalidateQueries({                       │
│    queryKey,                                                 │
│    refetchType: "active",                                    │
│    type: "all"                                               │
│  });                                                          │
│                                                               │
│  ✅ Dùng khi:                                                 │
│    - Update/delete record xuất hiện trong useMany           │
│    - Bulk update nhiều records                               │
│                                                               │
│  📝 Note: useMany dùng để lấy nhiều records theo IDs         │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
STRATEGY 4: "detail" - Invalidate specific detail query
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Invalidate useOne query của 1 record cụ thể                 │
│                                                               │
│  ⚠️ YÊU CẦU: id parameter phải được truyền                    │
│                                                               │
│  if (id) {                                                   │
│    const queryKey = keys()                                   │
│      .data(dataProviderName)                                 │
│      .resource(resource.identifier)                          │
│      .action("one")                                          │
│      .id(id)                                                 │
│      .get(preferLegacyKeys);                                 │
│                                                               │
│    // Result: ["data", "default", "posts", "one", "123"]     │
│                                                               │
│    await queryClient.invalidateQueries({                     │
│      queryKey,                                               │
│      refetchType: "active",                                  │
│      type: "all"                                             │
│    });                                                        │
│  }                                                            │
│                                                               │
│  ✅ Dùng khi:                                                 │
│    - Update 1 record cụ thể                                  │
│    - Cần refetch detail page                                 │
│                                                               │
│  ❌ Bỏ qua nếu: Không có id (create mới chưa có id)          │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
STRATEGY 5: "resourceAll" - Invalidate all queries của resource
═══════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│  Invalidate MỌI query của resource này (không phân biệt      │
│  list/detail/many)                                            │
│                                                               │
│  const queryKey = keys()                                     │
│    .data(dataProviderName)                                   │
│    .resource(resource.identifier)                            │
│    .get(preferLegacyKeys);                                   │
│                                                               │
│  // Result: ["data", "default", "posts"]                     │
│                                                               │
│  await queryClient.invalidateQueries({                       │
│    queryKey,                                                 │
│    refetchType: "active",                                    │
│    type: "all"                                               │
│  });                                                          │
│                                                               │
│  ✅ Dùng khi:                                                 │
│    - Delete record (ảnh hưởng mọi query)                     │
│    - Bulk update                                             │
│    - Import/Export data                                      │
│                                                               │
│  ⚠️ MẠNH hơn "list"+"detail"+"many" riêng lẻ                 │
└─────────────────────────────────────────────────────────────┘

                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 5: PARALLEL EXECUTION                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  await Promise.all([                                         │
│    queryClient.invalidateQueries({ queryKey: listKey }),     │
│    queryClient.invalidateQueries({ queryKey: detailKey }),   │
│    queryClient.invalidateQueries({ queryKey: manyKey })      │
│  ]);                                                          │
│                                                               │
│  ⚡ Tất cả invalidations chạy song song                       │
│  ✅ Performance tốt hơn chạy tuần tự                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 6: REACT QUERY AUTO REFETCH                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  React Query tự động:                                        │
│                                                               │
│  1. Đánh dấu queries là "stale" (cũ)                         │
│  2. Refetch các queries đang "active"                        │
│     (refetchType: "active")                                  │
│  3. Background queries không refetch ngay                    │
│  4. Queries sẽ refetch khi component mount lại               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BƯỚC 7: UI UPDATE                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                               │
│  • useList() nhận data mới → render lại table                │
│  • useOne() nhận data mới → update detail page               │
│  • useMany() nhận data mới → update related items            │
│                                                               │
│  ✅ User thấy dữ liệu mới nhất                                │
│  ✅ Không cần manual refetch                                  │
│  ✅ Tự động đồng bộ UI                                        │
└─────────────────────────────────────────────────────────────┘
```

## 3. Design Patterns được sử dụng

### Pattern 1: Command Pattern (Mẫu Lệnh)

**Khái niệm:**
Đóng gói request thành object độc lập chứa toàn bộ thông tin về request đó.

**Tại sao dùng:**
- Tách logic invalidation ra khỏi mutation hooks
- Có thể queue, log, undo invalidation commands
- Dễ test từng loại invalidation riêng biệt

**Cách implement:**

```typescript
// Command interface
export type UseInvalidateProp = {
  resource: string;                           // Target resource
  dataProviderName?: string;                  // Which provider
  invalidates: Array<keyof IQueryKeys>;       // Strategies
  id?: BaseKey;                               // Optional ID
};

// Command executor
export const useInvalidate = (): ((
  props: UseInvalidateProp
) => Promise<void>) => {
  const queryClient = useQueryClient();

  // Return command executor function
  return useCallback(async (command: UseInvalidateProp) => {
    // Execute command
    const { resource, invalidates, id } = command;

    // Each strategy là một command cụ thể
    for (const strategy of invalidates) {
      await executeInvalidationCommand(strategy, resource, id);
    }
  }, []);
};
```

**Ví dụ thực tế:**

Giống như bạn đặt món ăn ở nhà hàng:

```typescript
// ❌ KHÔNG DÙNG COMMAND PATTERN:
// Phải trực tiếp nói với từng bộ phận
function orderFood() {
  kitchen.cookDish("Pho");
  cashier.processBill(50000);
  waiter.serveDish("Pho");
}

// ✅ DÙNG COMMAND PATTERN:
// Tạo phiếu order - ai cũng hiểu
const order = {
  dish: "Pho",
  price: 50000,
  table: 5
};

orderSystem.execute(order);
// Hệ thống tự phân phối cho đúng bộ phận

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG useInvalidate:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Không dùng Command:
function afterCreatePost() {
  queryClient.invalidateQueries(["data", "default", "posts", "list"]);
  queryClient.invalidateQueries(["data", "default", "posts", "many"]);
  // Phải nhớ chính xác query keys
  // Dễ sai, khó maintain
}

// ✅ Dùng Command:
const invalidateCommand = {
  resource: "posts",
  invalidates: ["list", "many"]
};

invalidate(invalidateCommand);
// Tự động tạo đúng query keys
// Dễ đọc, dễ maintain
```

**Lợi ích:**
- **Decoupling:** Mutation hooks không cần biết chi tiết invalidation
- **Flexibility:** Dễ thêm strategy mới (chỉ cần thêm case)
- **Testability:** Test từng command riêng biệt
- **Consistency:** Query keys luôn đúng format

### Pattern 2: Strategy Pattern (Mẫu Chiến lược)

**Khái niệm:**
Định nghĩa một họ các thuật toán, đóng gói từng thuật toán và làm chúng có thể thay thế cho nhau.

**Tại sao dùng:**
- 5 loại invalidation khác nhau (all/list/many/detail/resourceAll)
- Mỗi loại có cách tạo query key riêng
- Có thể kết hợp nhiều strategies trong 1 lần gọi

**Cách implement:**

```typescript
// Strategy Interface
type InvalidationStrategy = keyof IQueryKeys;

// Context chứa strategies
const invalidate = useCallback(async ({
  invalidates,  // Array of strategies
  resource,
  id
}: UseInvalidateProp) => {

  // Execute từng strategy
  for (const strategy of invalidates) {
    switch (strategy) {
      case "all":
        await executeAllStrategy();
        break;
      case "list":
        await executeListStrategy();
        break;
      case "many":
        await executeManyStrategy();
        break;
      case "detail":
        await executeDetailStrategy(id);
        break;
      case "resourceAll":
        await executeResourceAllStrategy();
        break;
    }
  }
}, []);

// Concrete Strategies
const executeListStrategy = async () => {
  const queryKey = keys()
    .data(dataProviderName)
    .resource(resource.identifier)
    .action("list")
    .get(preferLegacyKeys);

  await queryClient.invalidateQueries({ queryKey });
};

const executeDetailStrategy = async (id?: BaseKey) => {
  if (!id) return; // Guard clause

  const queryKey = keys()
    .data(dataProviderName)
    .resource(resource.identifier)
    .action("one")
    .id(id)
    .get(preferLegacyKeys);

  await queryClient.invalidateQueries({ queryKey });
};
```

**Ví dụ thực tế:**

Giống như chiến lược dọn dẹp nhà:

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Chiến lược dọn dẹp
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const cleaningStrategies = {
  // Strategy 1: Dọn toàn bộ nhà
  all: () => {
    cleanLivingRoom();
    cleanBedroom();
    cleanKitchen();
    cleanBathroom();
  },

  // Strategy 2: Chỉ dọn phòng khách
  livingRoom: () => {
    cleanLivingRoom();
  },

  // Strategy 3: Dọn phòng ngủ cụ thể
  bedroom: (roomId) => {
    if (roomId) {
      cleanSpecificBedroom(roomId);
    }
  }
};

// Kết hợp strategies
clean({
  strategies: ["livingRoom", "bedroom"],
  roomId: "master"
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG useInvalidate:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: Thêm post mới
invalidate({
  resource: "posts",
  invalidates: ["list"]  // Chỉ cần refetch list
});

// Scenario 2: Cập nhật post
invalidate({
  resource: "posts",
  invalidates: ["list", "detail"],  // Refetch list + detail
  id: "123"
});

// Scenario 3: Xóa post
invalidate({
  resource: "posts",
  invalidates: ["resourceAll"]  // Refetch mọi thứ
});

// Scenario 4: Import nhiều posts
invalidate({
  resource: "posts",
  invalidates: ["all"]  // Refetch toàn bộ data provider
});
```

**Lợi ích:**
- **Flexibility:** Kết hợp strategies linh hoạt
- **Granularity:** Control chính xác cái gì cần invalidate
- **Performance:** Chỉ invalidate những gì cần thiết
- **Extensibility:** Dễ thêm strategy mới

### Pattern 3: Observer Pattern (Mẫu Quan sát)

**Khái niệm:**
Khi object (subject) thay đổi state, tất cả dependents (observers) được notify và update tự động.

**Tại sao dùng:**
- React Query tự động notify observers khi cache invalidated
- Component không cần biết khi nào data thay đổi
- Decoupling giữa mutation và UI update

**Cách hoạt động:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REACT QUERY OBSERVER SYSTEM
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Subject: QueryClient
const queryClient = useQueryClient();

// Observers: Components sử dụng queries
function PostList() {
  const { data } = useList({ resource: "posts" });
  // Component này là observer cho query "posts/list"
  return <Table data={data} />;
}

function PostDetail({ id }) {
  const { data } = useOne({ resource: "posts", id });
  // Component này là observer cho query "posts/detail/123"
  return <Detail data={data} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// INVALIDATION TRIGGERS OBSERVERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();

  const handleCreate = () => {
    mutate(
      { resource: "posts", values: {...} },
      {
        onSuccess: () => {
          // SUBJECT thay đổi state
          invalidate({
            resource: "posts",
            invalidates: ["list"]
          });

          // ⚡ React Query tự động:
          // 1. Đánh dấu cache là stale
          // 2. Notify tất cả observers
          // 3. Trigger refetch cho active observers
        }
      }
    );
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLOW:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────┐
│  1. REGISTER OBSERVERS                         │
│                                                │
│  <PostList />    ──┐                          │
│  <PostDetail />  ──┼──► QueryClient           │
│  <PostCard />    ──┘     (Subject)            │
│                                                │
│  Mỗi component subscribe vào query key        │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│  2. MUTATION SUCCESS                           │
│                                                │
│  invalidate({                                 │
│    resource: "posts",                         │
│    invalidates: ["list", "detail"]            │
│  });                                          │
│                                                │
│  Subject (QueryClient) state changed          │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│  3. NOTIFY OBSERVERS                           │
│                                                │
│  QueryClient.invalidateQueries()               │
│                                                │
│  Đánh dấu queries là stale:                    │
│  - ["data", "default", "posts", "list"]       │
│  - ["data", "default", "posts", "one", "123"] │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│  4. OBSERVERS AUTO UPDATE                      │
│                                                │
│  PostList     → refetch()    → new data       │
│  PostDetail   → refetch()    → new data       │
│  PostCard     → (inactive)   → skip           │
│                                                │
│  ✅ UI tự động cập nhật                        │
└────────────────────────────────────────────────┘
```

**Ví dụ thực tế:**

Giống như bảng tin Facebook:

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Hệ thống notification Facebook
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Subject: Post
const post = {
  id: "123",
  likes: 0,
  comments: []
};

// Observers: Users đang xem post
const observers = [
  { user: "Alice", device: "mobile" },
  { user: "Bob", device: "desktop" },
  { user: "Charlie", device: "tablet" }
];

// Action: Someone likes the post
function likePost(postId) {
  // 1. Update post (Subject thay đổi)
  post.likes += 1;

  // 2. Notify ALL observers
  notifyObservers(observers, {
    type: "POST_LIKED",
    postId: postId,
    newCount: post.likes
  });

  // 3. Observers tự động update UI
  // Alice's mobile → shows "1 like"
  // Bob's desktop → shows "1 like"
  // Charlie không online → skip
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useInvalidate:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Subject: React Query Cache
const cache = {
  "posts/list": [...],
  "posts/detail/123": {...}
};

// Observers: React components
const components = [
  <PostList />,      // Observe "posts/list"
  <PostDetail />,    // Observe "posts/detail/123"
  <RelatedPosts />   // Observe "posts/many"
];

// Action: Create new post
function createPost() {
  mutate(values, {
    onSuccess: () => {
      // 1. Invalidate cache (Subject thay đổi)
      invalidate({
        resource: "posts",
        invalidates: ["list"]
      });

      // 2. React Query notify observers
      // 3. Components tự động refetch
      // PostList → refetch → show new post
      // PostDetail → không bị ảnh hưởng
    }
  });
}
```

**Lợi ích:**
- **Automatic Updates:** UI tự động sync với data
- **Loose Coupling:** Components không biết về nhau
- **Declarative:** Component chỉ cần declare data cần thiết
- **Efficient:** Chỉ update observers đang active

### Pattern 4: Null Object Pattern (Mẫu Đối tượng Rỗng)

**Khái niệm:**
Thay vì return `null` hoặc `undefined`, return một object có hành vi mặc định (no-op).

**Tại sao dùng:**
- Tránh null checks
- Graceful degradation khi không có i18nProvider hoặc resources
- Code clean hơn, ít defensive programming

**Cách implement:**

```typescript
export const useInvalidate = (): ((
  props: UseInvalidateProp
) => Promise<void>) => {
  const queryClient = useQueryClient();
  const { resources } = useResource();

  return useCallback(async ({
    resource: resourceName,
    invalidates,
    ...rest
  }: UseInvalidateProp) => {

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NULL OBJECT PATTERN 1: Empty invalidation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    // Nếu invalidates = false hoặc empty array
    if (invalidates === false) {
      return; // No-op - không làm gì
    }

    if (invalidates.length === 0) {
      return; // No-op - không làm gì
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NULL OBJECT PATTERN 2: Missing resource
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const resource = resources?.find(
      r => r.name === resourceName || r.identifier === resourceName
    );

    // Nếu không tìm thấy resource
    if (!resource) {
      console.warn(`Resource "${resourceName}" not found`);
      return; // No-op - không crash
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NULL OBJECT PATTERN 3: Missing ID for detail
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    for (const key of invalidates) {
      switch (key) {
        case "detail":
          // Nếu không có id, skip - không crash
          if (id) {
            const queryKey = keys()
              .data(dataProviderName)
              .resource(resource.identifier)
              .action("one")
              .id(id)
              .get(preferLegacyKeys);

            await queryClient.invalidateQueries({ queryKey });
          }
          // Nếu !id → no-op, tiếp tục xử lý strategies khác
          break;

        // ... other cases
      }
    }
  }, []);
};
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ❌ KHÔNG DÙNG NULL OBJECT PATTERN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getUserName(user) {
  if (user === null) {
    return "Guest";
  }
  if (user.name === null) {
    return "Unknown";
  }
  return user.name;
}

const name1 = getUserName(null);        // "Guest"
const name2 = getUserName({});          // "Unknown"
const name3 = getUserName({ name: "Alice" }); // "Alice"

// Code đầy null checks, khó đọc

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ DÙNG NULL OBJECT PATTERN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const NULL_USER = { name: "Guest" }; // Null Object

function getUserName(user = NULL_USER) {
  return user.name;
}

const name1 = getUserName();              // "Guest"
const name2 = getUserName({ name: "Alice" }); // "Alice"

// Code clean hơn, ít checks hơn

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TRONG useInvalidate:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: No invalidation needed
invalidate({
  resource: "posts",
  invalidates: false  // Null Object - no-op
});
// → Không crash, không làm gì

// Scenario 2: Empty invalidation array
invalidate({
  resource: "posts",
  invalidates: []  // Null Object - no-op
});
// → Không crash, không làm gì

// Scenario 3: Detail without ID
invalidate({
  resource: "posts",
  invalidates: ["list", "detail"]  // Missing id
  // id: undefined
});
// → Invalidate "list", skip "detail" - no crash

// Scenario 4: Wrong resource name
invalidate({
  resource: "nonexistent",
  invalidates: ["list"]
});
// → Warn, no-op - no crash
```

**Lợi ích:**
- **No Crashes:** Graceful degradation
- **Clean Code:** Ít null/undefined checks
- **Fail-Safe:** System vẫn hoạt động dù thiếu data
- **Better UX:** Không bị white screen of death

### Pattern 5: Façade Pattern (Mẫu Mặt tiền)

**Khái niệm:**
Cung cấp interface đơn giản cho một subsystem phức tạp.

**Tại sao dùng:**
- React Query API phức tạp (invalidateQueries, refetchQueries, setQueryData...)
- Query key generation phức tạp (useKeys hook)
- Data provider selection logic phức tạp
- → Cần interface đơn giản, dễ dùng

**Cách implement:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPLEX SUBSYSTEMS (Hệ thống phức tạp)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Subsystem 1: React Query
import { useQueryClient } from "@tanstack/react-query";

// Subsystem 2: Query Keys
import { useKeys } from "@refinedev/core";

// Subsystem 3: Data Provider
import { pickDataProvider, useDataProvider } from "...";

// Subsystem 4: Resources
import { useResource } from "...";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FAÇADE: useInvalidate (Interface đơn giản)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const useInvalidate = () => {
  // Kết nối với các subsystems
  const queryClient = useQueryClient();
  const { keys, preferLegacyKeys } = useKeys();
  const { resources } = useResource();
  const dataProvider = useDataProvider();

  // Return simple interface
  return useCallback(async ({
    resource,
    invalidates,
    id,
    dataProviderName
  }: UseInvalidateProp) => {

    // Hide complexity:
    // ✅ Tự động find resource
    // ✅ Tự động pick data provider
    // ✅ Tự động generate query keys
    // ✅ Tự động call invalidateQueries

    // User chỉ cần gọi đơn giản:
    // invalidate({ resource: "posts", invalidates: ["list"] })

  }, []);
};
```

**So sánh trước và sau Façade:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ❌ KHÔNG DÙNG FAÇADE - User phải tự làm mọi thứ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MyComponent() {
  const { mutate } = useCreate();
  const queryClient = useQueryClient();
  const { keys, preferLegacyKeys } = useKeys();
  const { resources } = useResource();
  const dataProviders = useDataProvider();

  const handleCreate = () => {
    mutate(values, {
      onSuccess: () => {
        // Phải tự find resource
        const resource = resources.find(r => r.name === "posts");

        // Phải tự pick provider
        const provider = pickDataProvider(
          resource?.identifier,
          undefined,
          dataProviders
        );

        // Phải tự generate query key
        const listKey = keys()
          .data(provider?.name)
          .resource(resource?.identifier)
          .action("list")
          .get(preferLegacyKeys);

        const detailKey = keys()
          .data(provider?.name)
          .resource(resource?.identifier)
          .action("one")
          .id("123")
          .get(preferLegacyKeys);

        // Phải tự call invalidateQueries
        queryClient.invalidateQueries({
          queryKey: listKey,
          refetchType: "active",
          type: "all"
        });

        queryClient.invalidateQueries({
          queryKey: detailKey,
          refetchType: "active",
          type: "all"
        });
      }
    });
  };
}

// 😱 TOO COMPLEX! 20+ dòng code chỉ để invalidate!

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ DÙNG FAÇADE - Interface đơn giản
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MyComponent() {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();

  const handleCreate = () => {
    mutate(values, {
      onSuccess: () => {
        invalidate({
          resource: "posts",
          invalidates: ["list", "detail"],
          id: "123"
        });
      }
    });
  };
}

// 😊 SIMPLE! Chỉ 5 dòng - dễ đọc, dễ maintain
```

**Ví dụ thực tế:**

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VD: Điều khiển Smart Home
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ KHÔNG DÙNG FAÇADE:
function leaveHome() {
  lights.turnOff();
  airConditioner.turnOff();
  securitySystem.arm();
  door.lock();
  camera.startRecording();
  thermostat.setTemperature(25);
}
// Phải nhớ 6 bước, dễ quên

// ✅ DÙNG FAÇADE:
smartHome.activateAwayMode();
// Chỉ 1 lệnh - tự động làm mọi thứ

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAPPING VỚI useInvalidate:
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ❌ Không Façade: Phải tự orchestrate
queryClient.invalidateQueries({ queryKey: [...] });
queryClient.invalidateQueries({ queryKey: [...] });
queryClient.invalidateQueries({ queryKey: [...] });

// ✅ Có Façade: Một lệnh đơn giản
invalidate({
  resource: "posts",
  invalidates: ["list", "detail", "many"]
});
```

**Lợi ích:**
- **Simplicity:** API đơn giản, dễ học
- **Abstraction:** Che giấu complexity
- **Consistency:** Query keys luôn đúng format
- **Maintenance:** Thay đổi implementation không ảnh hưởng API

## 4. Các tính năng chính

### 1. Invalidation Strategies

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY 1: "list" - Invalidate list queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

invalidate({
  resource: "posts",
  invalidates: ["list"]
});

// Invalidates:
// ✅ All list queries với mọi filters/sorts/pagination
// ❌ Không ảnh hưởng detail/many queries

// Use cases:
// • Sau khi create record mới
// • Sau khi delete record
// • Sau khi update ảnh hưởng sorting/filtering

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY 2: "detail" - Invalidate specific detail
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

invalidate({
  resource: "posts",
  invalidates: ["detail"],
  id: "123"  // ⚠️ Required!
});

// Invalidates:
// ✅ Chỉ detail query của post #123
// ❌ Không ảnh hưởng posts khác

// Use cases:
// • Sau khi update 1 record cụ thể
// • Sau khi cần refresh detail page

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY 3: "many" - Invalidate many queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

invalidate({
  resource: "posts",
  invalidates: ["many"]
});

// Invalidates:
// ✅ All useMany queries (getMany với array of IDs)
// ❌ Không ảnh hưởng list/detail

// Use cases:
// • Sau bulk update
// • Sau khi update record xuất hiện trong useMany

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY 4: "resourceAll" - Invalidate all resource queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

invalidate({
  resource: "posts",
  invalidates: ["resourceAll"]
});

// Invalidates:
// ✅ Tất cả list queries
// ✅ Tất cả detail queries
// ✅ Tất cả many queries
// ✅ Mọi query liên quan đến "posts"

// Use cases:
// • Sau khi delete record
// • Sau import/export
// • Khi cần force refresh toàn bộ

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// STRATEGY 5: "all" - Invalidate toàn bộ data provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

invalidate({
  resource: "posts",  // Vẫn cần resource để xác định provider
  invalidates: ["all"]
});

// Invalidates:
// ✅ Tất cả queries của data provider này
// ✅ Mọi resources (posts, users, comments...)
// ⚠️ CỰC MẠNH - dùng cẩn thận!

// Use cases:
// • Sau khi user logout/login (đổi permissions)
// • Sau khi switch tenant trong multi-tenant app
// • Sau khi có major system change
```

### 2. Multi Data Provider Support

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: App có nhiều backends
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Setup multiple providers
<Refine
  dataProvider={{
    default: restProvider("https://api.example.com"),
    analytics: graphqlProvider("https://analytics.example.com"),
    legacy: soapProvider("https://legacy.example.com")
  }}
/>

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Invalidate specific provider
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Provider 1: Default REST API
invalidate({
  resource: "posts",
  dataProviderName: "default",
  invalidates: ["list"]
});
// → Invalidates: ["data", "default", "posts", "list"]

// Provider 2: Analytics GraphQL
invalidate({
  resource: "metrics",
  dataProviderName: "analytics",
  invalidates: ["all"]
});
// → Invalidates: ["data", "analytics"]

// Provider 3: Auto-detect từ resource meta
<Resource
  name="oldData"
  meta={{ dataProviderName: "legacy" }}
/>

invalidate({
  resource: "oldData",
  // dataProviderName tự động = "legacy" từ meta
  invalidates: ["list"]
});
```

### 3. Flexible Combinations

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Kết hợp nhiều strategies
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Example 1: Update post
invalidate({
  resource: "posts",
  invalidates: ["list", "detail"],  // Cả 2
  id: "123"
});
// → Refetch list + detail của post #123

// Example 2: Bulk update
invalidate({
  resource: "posts",
  invalidates: ["list", "many"]
});
// → Refetch list + many queries

// Example 3: Delete post
invalidate({
  resource: "posts",
  invalidates: ["resourceAll"]  // Chỉ 1 là đủ
});
// → Refetch mọi query của posts

// Example 4: System-wide refresh
invalidate({
  resource: "posts",
  invalidates: ["all"]  // Nuclear option
});
// → Refetch MỌI query của data provider
```

### 4. Conditional Invalidation

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Disable invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: Optimistic update - không cần invalidate
const { mutate } = useUpdate({
  mutationOptions: {
    onSuccess: () => {
      invalidate({
        resource: "posts",
        invalidates: false  // ❌ Không invalidate
      });
    }
  }
});

// Scenario 2: Background update - silent
invalidate({
  resource: "posts",
  invalidates: []  // ❌ Empty array = no-op
});

// Scenario 3: Conditional based on data
const { mutate } = useUpdate();

mutate(values, {
  onSuccess: (data) => {
    invalidate({
      resource: "posts",
      invalidates: data.shouldRefresh
        ? ["list", "detail"]  // ✅ Có invalidation
        : false               // ❌ Không invalidation
    });
  }
});
```

### 5. Query Key Management

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Automatic query key generation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// useInvalidate tự động generate keys:

// "list" strategy
keys()
  .data("default")         // Data provider name
  .resource("posts")        // Resource identifier
  .action("list")          // Action type
  .get(preferLegacyKeys);
// → ["data", "default", "posts", "list"]

// "detail" strategy
keys()
  .data("default")
  .resource("posts")
  .action("one")
  .id("123")               // Specific ID
  .get(preferLegacyKeys);
// → ["data", "default", "posts", "one", "123"]

// "many" strategy
keys()
  .data("default")
  .resource("posts")
  .action("many")
  .get(preferLegacyKeys);
// → ["data", "default", "posts", "many"]

// "resourceAll" strategy
keys()
  .data("default")
  .resource("posts")       // No action - match all
  .get(preferLegacyKeys);
// → ["data", "default", "posts"]

// "all" strategy
keys()
  .data("default")         // Only provider - match all
  .get(preferLegacyKeys);
// → ["data", "default"]
```

## 5. Use Cases thực tế

### Use Case 1: CRUD Operations

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE: Thêm record mới
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function CreatePost() {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();

  const handleSubmit = (values) => {
    mutate(
      {
        resource: "posts",
        values
      },
      {
        onSuccess: () => {
          // ✅ Invalidate list để hiển thị post mới
          invalidate({
            resource: "posts",
            invalidates: ["list"]
          });

          // ❌ KHÔNG cần invalidate "detail" vì chưa có ID
          // ❌ KHÔNG cần invalidate "many"
        }
      }
    );
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE: Cập nhật record
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function EditPost({ id }) {
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  const handleSubmit = (values) => {
    mutate(
      {
        resource: "posts",
        id,
        values
      },
      {
        onSuccess: () => {
          // ✅ Invalidate detail của post này
          // ✅ Invalidate list nếu update ảnh hưởng sorting/filtering
          invalidate({
            resource: "posts",
            invalidates: ["detail", "list"],
            id
          });
        }
      }
    );
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE: Xóa record
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DeletePost({ id }) {
  const { mutate } = useDelete();
  const invalidate = useInvalidate();

  const handleDelete = () => {
    mutate(
      {
        resource: "posts",
        id
      },
      {
        onSuccess: () => {
          // ✅ Invalidate toàn bộ resource
          // Vì delete ảnh hưởng list/detail/many
          invalidate({
            resource: "posts",
            invalidates: ["resourceAll"]
          });
        }
      }
    );
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BULK UPDATE: Cập nhật nhiều records
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function BulkUpdatePosts({ ids }) {
  const { mutate } = useUpdateMany();
  const invalidate = useInvalidate();

  const handleBulkUpdate = (values) => {
    mutate(
      {
        resource: "posts",
        ids,
        values
      },
      {
        onSuccess: () => {
          // ✅ Invalidate list + many
          invalidate({
            resource: "posts",
            invalidates: ["list", "many"]
          });

          // Hoặc đơn giản hơn:
          invalidate({
            resource: "posts",
            invalidates: ["resourceAll"]
          });
        }
      }
    );
  };
}
```

### Use Case 2: Related Resources

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Update post cũng cần update comments
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UpdatePostStatus({ postId }) {
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  const handlePublish = () => {
    mutate(
      {
        resource: "posts",
        id: postId,
        values: { status: "published" }
      },
      {
        onSuccess: () => {
          // Invalidate posts
          invalidate({
            resource: "posts",
            invalidates: ["detail", "list"],
            id: postId
          });

          // Invalidate related comments
          invalidate({
            resource: "comments",
            invalidates: ["list"]
            // Comments list có thể filter by post status
          });

          // Invalidate author stats
          invalidate({
            resource: "users",
            invalidates: ["detail"],
            id: authorId
            // Author stats thay đổi khi post published
          });
        }
      }
    );
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENARIO: Delete post cascade
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function DeletePostWithComments({ postId }) {
  const { mutate } = useDelete();
  const invalidate = useInvalidate();

  const handleDelete = () => {
    mutate(
      {
        resource: "posts",
        id: postId
      },
      {
        onSuccess: () => {
          // Invalidate tất cả related resources
          Promise.all([
            invalidate({
              resource: "posts",
              invalidates: ["resourceAll"]
            }),
            invalidate({
              resource: "comments",
              invalidates: ["list"]
            }),
            invalidate({
              resource: "tags",
              invalidates: ["many"]
            })
          ]);
        }
      }
    );
  };
}
```

### Use Case 3: Optimistic Updates

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Optimistic update with rollback
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function LikePost({ postId }) {
  const queryClient = useQueryClient();
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  const handleLike = () => {
    const queryKey = ["data", "default", "posts", "one", postId];

    // 1. Optimistically update cache
    queryClient.setQueryData(queryKey, (old) => ({
      ...old,
      likes: (old?.likes || 0) + 1
    }));

    // 2. Send mutation
    mutate(
      {
        resource: "posts",
        id: postId,
        values: { likes: "increment" }
      },
      {
        onSuccess: () => {
          // ✅ Server confirmed - invalidate to get fresh data
          invalidate({
            resource: "posts",
            invalidates: ["detail"],
            id: postId
          });
        },

        onError: () => {
          // ❌ Server failed - rollback optimistic update
          invalidate({
            resource: "posts",
            invalidates: ["detail"],
            id: postId
          });
        }
      }
    );
  };
}
```

### Use Case 4: Import/Export

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Import CSV with batch invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ImportPosts() {
  const { handleChange, isLoading } = useImport({
    resource: "posts",
    batchSize: 100,
    onFinish: ({ succeeded, errored }) => {
      if (succeeded.length > 0) {
        // Invalidate sau khi import
        invalidate({
          resource: "posts",
          invalidates: ["resourceAll"]
          // Import nhiều → invalidate toàn bộ
        });

        // Notification
        notification.success({
          message: `Imported ${succeeded.length} posts`
        });
      }
    }
  });

  return <input {...inputProps} />;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Export không cần invalidate
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function ExportPosts() {
  const { triggerExport, isLoading } = useExport({
    resource: "posts"
  });

  // ❌ KHÔNG cần invalidate sau export
  // Vì export chỉ đọc dữ liệu, không thay đổi

  return <Button onClick={triggerExport}>Export</Button>;
}
```

### Use Case 5: Real-time Updates

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WebSocket + Invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useRealtimePosts() {
  const invalidate = useInvalidate();

  useEffect(() => {
    // Subscribe to WebSocket
    const socket = io("wss://api.example.com");

    socket.on("post:created", () => {
      invalidate({
        resource: "posts",
        invalidates: ["list"]
      });
    });

    socket.on("post:updated", ({ id }) => {
      invalidate({
        resource: "posts",
        invalidates: ["detail", "list"],
        id
      });
    });

    socket.on("post:deleted", () => {
      invalidate({
        resource: "posts",
        invalidates: ["resourceAll"]
      });
    });

    return () => socket.disconnect();
  }, []);
}

// Usage
function PostList() {
  useRealtimePosts(); // Auto invalidate on realtime events

  const { data } = useList({ resource: "posts" });
  // → Auto refetch khi có realtime update
}
```

### Use Case 6: Multi-tenant Applications

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Switch tenant → invalidate all
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function TenantSwitcher() {
  const invalidate = useInvalidate();
  const [currentTenant, setCurrentTenant] = useState("tenant1");

  const handleSwitchTenant = (newTenant) => {
    setCurrentTenant(newTenant);

    // ⚠️ Invalidate MỌI data vì đổi tenant
    invalidate({
      resource: "posts", // Chỉ cần 1 resource để xác định provider
      invalidates: ["all"]
      // → Xóa cache của mọi resources
    });

    // Hoặc invalidate từng resource riêng lẻ:
    Promise.all([
      invalidate({ resource: "posts", invalidates: ["resourceAll"] }),
      invalidate({ resource: "users", invalidates: ["resourceAll"] }),
      invalidate({ resource: "orders", invalidates: ["resourceAll"] })
    ]);
  };
}
```

## 6. Quyết định kiến trúc

### Quyết định 1: Tại sao dùng React Query thay vì state riêng?

**Vấn đề:**
Cache invalidation phức tạp - cần track queries, refetch, sync state...

**Các phương án:**

| Phương án | Ưu điểm | Nhược điểm |
|-----------|---------|------------|
| **Custom state** | - Full control<br>- Không depend library | - Phải tự implement cache<br>- Tự manage refetch<br>- Tự track dependencies |
| **Redux** | - Predictable state<br>- DevTools | - Boilerplate nhiều<br>- Phải manual invalidate |
| **React Query** ✅ | - Built-in cache<br>- Auto refetch<br>- Observer pattern<br>- Proven solution | - Depend external library |

**Quyết định:** Dùng React Query

**Lý do:**
- React Query đã solve cache invalidation cực tốt
- Observer pattern tự động notify components
- `invalidateQueries` API mạnh mẽ, flexible
- Refine đã dùng React Query → integration tự nhiên

### Quyết định 2: Invalidation strategies - hardcode hay configurable?

**Vấn đề:**
Cần bao nhiêu loại invalidation strategy?

**Các phương án:**

| Phương án | Ưu điểm | Nhược điểm |
|-----------|---------|------------|
| **Chỉ 1 strategy ("all")** | - Đơn giản<br>- Không sai | - Performance kém<br>- Invalidate quá nhiều |
| **Tự do truyền query keys** | - Flexibility tối đa | - Dễ sai query key<br>- Không consistent |
| **5 strategies cố định** ✅ | - Cover 99% use cases<br>- Type-safe<br>- Consistent | - Không flexible 100% |

**Quyết định:** 5 strategies cố định (all/list/many/detail/resourceAll)

**Lý do:**
- Cover mọi CRUD operations
- Type-safe với `keyof IQueryKeys`
- Consistent với hooks khác (useList/useOne/useMany)
- Có thể combine strategies cho flexibility

### Quyết định 3: Parallel hay Sequential invalidation?

**Vấn đề:**
Khi có nhiều strategies, invalidate như thế nào?

**Các phương án:**

| Phương án | Code | Performance |
|-----------|------|-------------|
| **Sequential** | `for...of` với `await` | Chậm (100ms + 100ms + 100ms = 300ms) |
| **Parallel** ✅ | `Promise.all()` | Nhanh (max 100ms) |

**Quyết định:** Parallel với Promise.all

**Code:**
```typescript
// ✅ Current implementation
const promises = invalidates.map(key => {
  // Generate query key
  const queryKey = getQueryKeyForStrategy(key);

  // Return promise
  return queryClient.invalidateQueries({ queryKey });
});

await Promise.all(promises);

// ❌ Alternative: Sequential
for (const key of invalidates) {
  const queryKey = getQueryKeyForStrategy(key);
  await queryClient.invalidateQueries({ queryKey });
}
```

**Lý do:**
- Faster execution (parallel)
- Strategies độc lập nhau
- React Query handle race conditions tốt

### Quyết định 4: refetchType = "active" hay "all"?

**Vấn đề:**
Khi invalidate, refetch queries nào?

**Các phương án:**

| refetchType | Hành vi | Performance | UX |
|-------------|---------|-------------|-----|
| **"none"** | Chỉ đánh dấu stale | ⚡ Fastest | ❌ Kém (phải manual refetch) |
| **"active"** ✅ | Refetch queries đang active | ⚡ Fast | ✅ Tốt (auto update) |
| **"all"** | Refetch mọi queries | 🐌 Slow | ✅ Tốt nhưng overkill |
| **"inactive"** | Chỉ refetch inactive | ⚡ Medium | ❌ Kém |

**Quyết định:** refetchType = "active"

**Code:**
```typescript
await queryClient.invalidateQueries({
  queryKey,
  refetchType: "active",  // ✅ Chỉ refetch active queries
  type: "all"
});
```

**Lý do:**
- Balance giữa performance và UX
- Active queries = user đang xem → cần fresh data
- Inactive queries = background → refetch khi mount lại
- Tiết kiệm network requests

### Quyết định 5: Null Object Pattern cho edge cases

**Vấn đề:**
Xử lý edge cases như thế nào (no resource, no id, empty invalidates)?

**Các phương án:**

| Phương án | Code | UX |
|-----------|------|-----|
| **Throw error** | `throw new Error("No resource")` | ❌ Crash app |
| **Return undefined** | `return undefined` | ❌ Phải null check |
| **Null Object** ✅ | `if (!resource) return;` | ✅ Graceful degradation |

**Quyết định:** Null Object Pattern

**Code:**
```typescript
// Early returns cho edge cases
if (invalidates === false) return;
if (invalidates.length === 0) return;
if (!resource) {
  console.warn(`Resource "${resourceName}" not found`);
  return;
}

// Detail strategy - skip nếu không có id
if (key === "detail" && !id) {
  continue; // Skip strategy này, xử lý strategies khác
}
```

**Lý do:**
- App không crash dù có lỗi
- Developer-friendly (warn thay vì throw)
- Flexible (có thể invalidate một phần)

## 7. Common Pitfalls (Những lỗi hay gặp)

### Pitfall 1: Quên invalidate sau mutation

**Vấn đề:**
```typescript
// ❌ SAI: Không invalidate sau create
function CreatePost() {
  const { mutate } = useCreate();

  const handleSubmit = (values) => {
    mutate({
      resource: "posts",
      values
    });
    // → User không thấy post mới trong list!
  };
}
```

**Hậu quả:**
- UI không update
- User thấy stale data
- Phải manual refresh page

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Luôn invalidate sau mutation
function CreatePost() {
  const { mutate } = useCreate();
  const invalidate = useInvalidate();

  const handleSubmit = (values) => {
    mutate(
      {
        resource: "posts",
        values
      },
      {
        onSuccess: () => {
          invalidate({
            resource: "posts",
            invalidates: ["list"]
          });
        }
      }
    );
  };
}
```

**Best Practice:**
- **LUÔN invalidate** sau create/update/delete
- Dùng `onSuccess` callback
- Chọn strategy phù hợp

### Pitfall 2: Invalidate quá nhiều ("all" abuse)

**Vấn đề:**
```typescript
// ❌ SAI: Dùng "all" cho mọi thứ
function UpdatePost({ id }) {
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  const handleUpdate = (values) => {
    mutate(
      { resource: "posts", id, values },
      {
        onSuccess: () => {
          invalidate({
            resource: "posts",
            invalidates: ["all"]  // ⚠️ TOO MUCH!
          });
        }
      }
    );
  };
}
```

**Hậu quả:**
- Invalidate users/comments/orders/... không cần thiết
- Network overhead (refetch mọi thứ)
- Performance kém
- Battery drain trên mobile

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Dùng strategy cụ thể
invalidate({
  resource: "posts",
  invalidates: ["detail", "list"],  // Chỉ cần thiết
  id
});

// Hoặc nếu chỉ update detail:
invalidate({
  resource: "posts",
  invalidates: ["detail"],
  id
});
```

**Best Practice:**
- "all" chỉ dùng khi **thực sự cần** (logout, switch tenant)
- Ưu tiên "list"/"detail"/"many" cho operations thông thường
- "resourceAll" cho delete/bulk operations

### Pitfall 3: Quên truyền ID cho "detail" strategy

**Vấn đề:**
```typescript
// ❌ SAI: Không truyền id
function UpdatePost({ id }) {
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  const handleUpdate = (values) => {
    mutate(
      { resource: "posts", id, values },
      {
        onSuccess: () => {
          invalidate({
            resource: "posts",
            invalidates: ["detail"]
            // ⚠️ MISSING: id
          });
        }
      }
    );
  };
}
```

**Hậu quả:**
- "detail" strategy bị skip (có guard clause `if (!id)`)
- Detail page không update
- Chỉ có list update (nếu có)

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Luôn truyền id cho "detail"
invalidate({
  resource: "posts",
  invalidates: ["detail"],
  id  // ✅ Required cho "detail" strategy
});
```

**Best Practice:**
- "detail" strategy **BẮT BUỘC** có `id`
- Check component có access đến `id` không
- Nếu không có `id` (create), dùng "list" thay vì "detail"

### Pitfall 4: Invalidate sai resource

**Vấn đề:**
```typescript
// ❌ SAI: Resource name không khớp
<Resource name="blog-posts" />

function UpdatePost() {
  invalidate({
    resource: "posts",  // ⚠️ SAI - phải là "blog-posts"
    invalidates: ["list"]
  });
}
```

**Hậu quả:**
- Không tìm thấy resource
- Invalidation bị skip
- UI không update

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Dùng đúng resource name
invalidate({
  resource: "blog-posts",  // ✅ Khớp với <Resource name="..." />
  invalidates: ["list"]
});

// Hoặc dùng useResource hook
const { resource } = useResource();

invalidate({
  resource: resource?.name,  // ✅ Auto-detect từ route
  invalidates: ["list"]
});
```

**Best Practice:**
- Dùng `useResource()` để auto-detect resource
- Copy resource name từ `<Resource name="..." />`
- Test invalidation trong DevTools

### Pitfall 5: Race condition với optimistic updates

**Vấn đề:**
```typescript
// ❌ SAI: Invalidate trước khi mutation complete
function LikePost({ postId }) {
  const queryClient = useQueryClient();
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  const handleLike = () => {
    // 1. Optimistic update
    queryClient.setQueryData([...], (old) => ({
      ...old,
      likes: old.likes + 1
    }));

    // 2. Invalidate NGAY LẬP TỨC
    invalidate({
      resource: "posts",
      invalidates: ["detail"],
      id: postId
    });
    // ⚠️ Refetch ngay → ghi đè optimistic update!

    // 3. Mutation
    mutate({ resource: "posts", id: postId, ... });
  };
}
```

**Hậu quả:**
- Optimistic update bị ghi đè
- UI flash (hiện 1 → 0 → 1)
- Bad UX

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Invalidate SAU mutation
const handleLike = () => {
  // 1. Optimistic update
  queryClient.setQueryData([...], (old) => ({
    ...old,
    likes: old.likes + 1
  }));

  // 2. Mutation
  mutate(
    { resource: "posts", id: postId, ... },
    {
      // 3. Invalidate TRONG onSuccess
      onSuccess: () => {
        invalidate({
          resource: "posts",
          invalidates: ["detail"],
          id: postId
        });
      },

      // 4. Rollback trong onError
      onError: () => {
        invalidate({
          resource: "posts",
          invalidates: ["detail"],
          id: postId
        });
      }
    }
  );
};
```

**Best Practice:**
- Invalidate **SAU** mutation (trong `onSuccess`)
- Có rollback plan (trong `onError`)
- Test với slow network (DevTools throttling)

### Pitfall 6: Quên await khi cần sequential

**Vấn đề:**
```typescript
// ❌ SAI: Không await invalidate
async function deletePostAndRedirect({ id }) {
  await deletePost(id);

  invalidate({
    resource: "posts",
    invalidates: ["list"]
  });
  // ⚠️ KHÔNG await → redirect trước khi invalidate xong

  navigate("/posts");
  // → User thấy post cũ vẫn còn trong list!
}
```

**Hậu quả:**
- Navigate trước khi cache invalidated
- List page hiển thị stale data
- User confused

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Await invalidate nếu cần sequential
async function deletePostAndRedirect({ id }) {
  await deletePost(id);

  await invalidate({
    resource: "posts",
    invalidates: ["list"]
  });
  // ✅ Đợi invalidate xong

  navigate("/posts");
  // → User thấy list đã update
}
```

**Best Practice:**
- **Await** nếu logic depend vào invalidation
- Không await nếu fire-and-forget OK
- Consider UX (loading state vs instant feedback)

### Pitfall 7: Invalidate trong render

**Vấn đề:**
```typescript
// ❌ SAI: Gọi invalidate trong render
function PostList() {
  const invalidate = useInvalidate();

  // ⚠️ NGUY HIỂM: Chạy mỗi lần render
  invalidate({
    resource: "posts",
    invalidates: ["list"]
  });
  // → Infinite loop: render → invalidate → refetch → render → ...

  const { data } = useList({ resource: "posts" });
  return <Table data={data} />;
}
```

**Hậu quả:**
- Infinite loop
- App crash
- Network flooded với requests

**Giải pháp:**
```typescript
// ✅ ĐÚNG: Gọi trong event handler hoặc useEffect
function PostList() {
  const invalidate = useInvalidate();
  const { data } = useList({ resource: "posts" });

  // Option 1: Trong event handler
  const handleRefresh = () => {
    invalidate({
      resource: "posts",
      invalidates: ["list"]
    });
  };

  // Option 2: Trong useEffect với dependencies
  useEffect(() => {
    // Chỉ chạy khi socket event
    socket.on("post:updated", () => {
      invalidate({
        resource: "posts",
        invalidates: ["list"]
      });
    });
  }, []); // Empty deps = chỉ chạy 1 lần

  return (
    <>
      <Button onClick={handleRefresh}>Refresh</Button>
      <Table data={data} />
    </>
  );
}
```

**Best Practice:**
- **KHÔNG BAO GIỜ** gọi invalidate trong render
- Dùng event handlers (onClick, onSuccess, etc.)
- Dùng useEffect với dependencies cẩn thận

## 8. Performance Considerations

### 1. Granular Invalidation

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ❌ BAD: Over-invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UpdatePostTitle({ id }) {
  const { mutate } = useUpdate();

  mutate(values, {
    onSuccess: () => {
      invalidate({
        resource: "posts",
        invalidates: ["all"]  // ⚠️ Invalidates EVERYTHING!
      });
      // → Refetch users, comments, orders...
      // → 10+ unnecessary requests
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ GOOD: Minimal invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UpdatePostTitle({ id }) {
  const { mutate } = useUpdate();

  mutate(values, {
    onSuccess: () => {
      invalidate({
        resource: "posts",
        invalidates: ["detail"],  // ✅ Only this post
        id
      });
      // → 1 request
      // → 10x faster
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BEST PRACTICE: Analyze impact
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UpdatePost({ id, field, value }) {
  const { mutate } = useUpdate();

  mutate({ id, values: { [field]: value } }, {
    onSuccess: () => {
      // Analyze: field này ảnh hưởng gì?

      // Case 1: Chỉ affect detail
      if (field === "content") {
        invalidate({
          resource: "posts",
          invalidates: ["detail"],
          id
        });
      }

      // Case 2: Affect list (sorting/filtering)
      if (field === "title" || field === "publishedAt") {
        invalidate({
          resource: "posts",
          invalidates: ["detail", "list"],
          id
        });
      }

      // Case 3: Affect related resources
      if (field === "status") {
        invalidate({
          resource: "posts",
          invalidates: ["detail", "list"],
          id
        });
        invalidate({
          resource: "comments",
          invalidates: ["list"]
        });
      }
    }
  });
}
```

### 2. Batch Invalidations

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ❌ BAD: Multiple sequential calls
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updateRelatedResources() {
  await invalidate({ resource: "posts", invalidates: ["list"] });
  // Wait 100ms
  await invalidate({ resource: "comments", invalidates: ["list"] });
  // Wait 100ms
  await invalidate({ resource: "tags", invalidates: ["list"] });
  // Total: 300ms
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ GOOD: Parallel execution
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updateRelatedResources() {
  await Promise.all([
    invalidate({ resource: "posts", invalidates: ["list"] }),
    invalidate({ resource: "comments", invalidates: ["list"] }),
    invalidate({ resource: "tags", invalidates: ["list"] })
  ]);
  // Total: max(100ms) = 100ms
  // 3x faster! ⚡
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BETTER: Combine strategies khi có thể
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function updatePost() {
  // Thay vì 2 calls:
  // invalidate({ resource: "posts", invalidates: ["list"] });
  // invalidate({ resource: "posts", invalidates: ["detail"], id });

  // ✅ Combine thành 1 call:
  invalidate({
    resource: "posts",
    invalidates: ["list", "detail"],
    id
  });
  // → Ít overhead hơn
}
```

### 3. Conditional Invalidation

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Smart invalidation based on conditions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UpdatePost({ id, oldStatus, newStatus }) {
  const { mutate } = useUpdate();

  mutate(values, {
    onSuccess: () => {
      // Base invalidation
      const strategies = ["detail"];

      // Conditional: Nếu status thay đổi → affect list
      if (oldStatus !== newStatus) {
        strategies.push("list");
      }

      // Conditional: Nếu publish → affect comments
      const shouldInvalidateComments =
        oldStatus === "draft" && newStatus === "published";

      invalidate({
        resource: "posts",
        invalidates: strategies,
        id
      });

      if (shouldInvalidateComments) {
        invalidate({
          resource: "comments",
          invalidates: ["list"]
        });
      }
    }
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Skip invalidation cho no-op mutations
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AutoSave({ id, oldData, newData }) {
  const { mutate } = useUpdate();

  // Check if data actually changed
  const hasChanges = !isEqual(oldData, newData);

  if (!hasChanges) {
    return; // ✅ Skip mutation + invalidation
  }

  mutate(values, {
    onSuccess: () => {
      invalidate({
        resource: "posts",
        invalidates: ["detail"],
        id
      });
    }
  });
}
```

### 4. Debounce/Throttle Invalidations

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Debounce invalidation cho auto-save
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function AutoSavePost({ id }) {
  const { mutate } = useUpdate();
  const invalidate = useInvalidate();

  // Debounce invalidation
  const debouncedInvalidate = useMemo(
    () => debounce(() => {
      invalidate({
        resource: "posts",
        invalidates: ["detail"],
        id
      });
    }, 2000), // 2s debounce
    [id]
  );

  const handleChange = (newValue) => {
    // Optimistic update
    queryClient.setQueryData([...], newValue);

    // Mutation
    mutate({ id, values: newValue });

    // Debounced invalidation
    debouncedInvalidate();
    // → Chỉ invalidate sau 2s idle
    // → Tránh spam requests khi typing
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Throttle invalidation cho realtime
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function useRealtimePosts() {
  const invalidate = useInvalidate();

  // Throttle invalidation
  const throttledInvalidate = useMemo(
    () => throttle(() => {
      invalidate({
        resource: "posts",
        invalidates: ["list"]
      });
    }, 5000), // Max 1 invalidation per 5s
    []
  );

  useEffect(() => {
    socket.on("post:updated", () => {
      throttledInvalidate();
      // → Nếu 100 updates/s chỉ invalidate 1 lần/5s
      // → Prevent refetch storm
    });
  }, []);
}
```

### 5. Cache Time vs Invalidation

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Balance giữa cache time và invalidation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Scenario 1: Data ít thay đổi
const { data } = useList({
  resource: "categories",
  queryOptions: {
    cacheTime: 30 * 60 * 1000,  // 30 phút
    staleTime: 5 * 60 * 1000     // 5 phút
  }
});
// → Giảm số lần invalidate cần thiết

// Scenario 2: Data thay đổi liên tục
const { data } = useList({
  resource: "notifications",
  queryOptions: {
    cacheTime: 0,        // Không cache
    staleTime: 0         // Luôn stale
  }
});
// → Hoặc dùng polling thay vì invalidate

// Scenario 3: Balance
const { data } = useList({
  resource: "posts",
  queryOptions: {
    cacheTime: 5 * 60 * 1000,   // 5 phút
    staleTime: 1 * 60 * 1000    // 1 phút
  }
});
// → Invalidate khi cần, cache giúp performance
```

### 6. Monitor Invalidation Performance

```typescript
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Wrapper để track performance
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const useInvalidateWithMetrics = () => {
  const invalidate = useInvalidate();

  return useCallback(async (props) => {
    const start = performance.now();

    await invalidate(props);

    const duration = performance.now() - start;

    // Log slow invalidations
    if (duration > 100) {
      console.warn(`Slow invalidation (${duration}ms):`, props);
    }

    // Send to analytics
    analytics.track("cache_invalidation", {
      resource: props.resource,
      strategies: props.invalidates,
      duration
    });
  }, [invalidate]);
};

// Usage
const invalidate = useInvalidateWithMetrics();
```

**Performance Checklist:**
- ✅ Dùng strategy cụ thể (tránh "all")
- ✅ Combine strategies khi có thể
- ✅ Parallel execution với Promise.all
- ✅ Conditional invalidation
- ✅ Debounce/throttle cho high-frequency
- ✅ Balance cache time vs invalidation frequency
- ✅ Monitor và optimize slow invalidations

## 9. Testing

### Test 1: Basic Invalidation

```typescript
import { renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useInvalidate } from "./";

// Mock React Query
const mockInvalidateQueries = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries
  })
}));

describe("useInvalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should invalidate list queries", async () => {
    const { result } = renderHook(() => useInvalidate(), {
      wrapper: TestWrapper({})
    });

    await result.current({
      resource: "posts",
      invalidates: ["list"]
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["data", "default", "posts", "list"]
      })
    );
  });

  it("should invalidate detail query with id", async () => {
    const { result } = renderHook(() => useInvalidate());

    await result.current({
      resource: "posts",
      invalidates: ["detail"],
      id: "123"
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: ["data", "default", "posts", "one", "123"]
      })
    );
  });

  it("should skip detail invalidation without id", async () => {
    const { result } = renderHook(() => useInvalidate());

    await result.current({
      resource: "posts",
      invalidates: ["detail"]
      // Missing id
    });

    // Không gọi invalidateQueries vì không có id
    expect(mockInvalidateQueries).not.toHaveBeenCalled();
  });
});
```

### Test 2: Multiple Strategies

```typescript
it("should invalidate multiple strategies", async () => {
  const { result } = renderHook(() => useInvalidate());

  await result.current({
    resource: "posts",
    invalidates: ["list", "detail", "many"],
    id: "123"
  });

  // Expect 3 calls
  expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);

  // List
  expect(mockInvalidateQueries).toHaveBeenCalledWith(
    expect.objectContaining({
      queryKey: ["data", "default", "posts", "list"]
    })
  );

  // Detail
  expect(mockInvalidateQueries).toHaveBeenCalledWith(
    expect.objectContaining({
      queryKey: ["data", "default", "posts", "one", "123"]
    })
  );

  // Many
  expect(mockInvalidateQueries).toHaveBeenCalledWith(
    expect.objectContaining({
      queryKey: ["data", "default", "posts", "many"]
    })
  );
});
```

### Test 3: Edge Cases

```typescript
it("should not invalidate when invalidates is false", async () => {
  const { result } = renderHook(() => useInvalidate());

  await result.current({
    resource: "posts",
    invalidates: false
  });

  expect(mockInvalidateQueries).not.toHaveBeenCalled();
});

it("should not invalidate when invalidates is empty array", async () => {
  const { result } = renderHook(() => useInvalidate());

  await result.current({
    resource: "posts",
    invalidates: []
  });

  expect(mockInvalidateQueries).not.toHaveBeenCalled();
});

it("should handle missing resource gracefully", async () => {
  const { result } = renderHook(() => useInvalidate());

  // Không throw error
  await expect(
    result.current({
      resource: "nonexistent",
      invalidates: ["list"]
    })
  ).resolves.not.toThrow();
});
```

### Test 4: Integration Tests

```typescript
describe("useInvalidate integration", () => {
  it("should refetch queries after invalidation", async () => {
    const { result: listResult } = renderHook(
      () => useList({ resource: "posts" })
    );

    const { result: invalidateResult } = renderHook(
      () => useInvalidate()
    );

    // Initial data
    expect(listResult.current.data?.data).toHaveLength(5);

    // Create new post
    await createPost({ title: "New Post" });

    // Invalidate
    await invalidateResult.current({
      resource: "posts",
      invalidates: ["list"]
    });

    // Wait for refetch
    await waitFor(() => {
      expect(listResult.current.data?.data).toHaveLength(6);
    });
  });
});
```

## 10. Kết luận

`useInvalidate` là hook **cực kỳ quan trọng** trong hệ sinh thái Refine, đảm bảo UI luôn đồng bộ với backend sau mutations.

### Điểm mạnh:

1. **Simple API** - Interface đơn giản, dễ sử dụng
2. **Flexible Strategies** - 5 strategies cover mọi use cases
3. **Type-Safe** - TypeScript đảm bảo không sai strategy
4. **Performant** - Parallel execution, granular control
5. **Reliable** - Built trên React Query proven solution

### Key Takeaways:

- **LUÔN invalidate** sau mutation (create/update/delete)
- **Chọn strategy phù hợp** - đừng abuse "all"
- **Await khi cần** sequential logic
- **Test invalidation** - đừng quên test edge cases
- **Monitor performance** - track slow invalidations

### Pattern Summary:

| Pattern | Vai trò |
|---------|---------|
| **Command** | Đóng gói invalidation requests |
| **Strategy** | 5 strategies linh hoạt |
| **Observer** | React Query auto-notify components |
| **Null Object** | Graceful degradation |
| **Façade** | Simple API che giấu complexity |

### Related Hooks:

- `useList` - List queries được invalidate
- `useOne` - Detail queries được invalidate
- `useMany` - Many queries được invalidate
- `useCreate/useUpdate/useDelete` - Trigger invalidation
- `useKeys` - Generate query keys

---

**Đọc thêm:**
- React Query Invalidation: https://tanstack.com/query/latest/docs/guides/query-invalidation
- Refine Data Hooks: https://refine.dev/docs/api-reference/core/hooks/data/
