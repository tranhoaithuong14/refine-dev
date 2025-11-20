# 📘 HƯỚNG DẪN HOÀN CHỈNH VỀ useList HOOK

> **TL;DR:** `useList` là wrapper của TanStack Query `useQuery` để lấy danh sách với pagination/filter/sorter, chọn đúng data provider, merge meta, đăng ký realtime, đo thời gian loading, và xử lý thông báo + lỗi theo 3 layers. Bạn hầu như không phải viết thêm boilerplate.

---

## 📋 MỤC LỤC

1. [Bối Cảnh & Nỗi Đau](#1-bối-cảnh--nỗi-đau)
2. [useList Giải Quyết Gì?](#2-uselist-giải-quyết-gì)
3. [Tổng Quan API](#3-tổng-quan-api)
4. [Các Mảnh Ghép Nền Tảng](#4-các-mảnh-ghép-nền-tảng)
5. [Sơ Đồ Luồng Dữ Liệu](#5-sơ-đồ-luồng-dữ-liệu)
6. [Phân Tích Source Code](#6-phân-tích-source-code)
7. [Pagination - Server vs Client](#7-pagination---server-vs-client)
8. [Filters, Sorters & Meta](#8-filters-sorters--meta)
9. [Query Key & React Query Integration](#9-query-key--react-query-integration)
10. [Error & Notification System (3 Layers)](#10-error--notification-system-3-layers)
11. [Live Mode & Realtime Invalidations](#11-live-mode--realtime-invalidations)
12. [Loading Overtime](#12-loading-overtime)
13. [Option Cheat Sheet](#13-option-cheat-sheet)
14. [Ví Dụ Từ A-Z](#14-ví-dụ-từ-a-z)
15. [Patterns / Anti-Patterns](#15-patterns--anti-patterns)
16. [FAQ Nhanh](#16-faq-nhanh)
17. [Tóm Tắt](#17-tóm-tắt)

---

## 1. BỐI CẢNH & NỖI ĐAU

### 1.1. Manual Fetching (Trước Khi Có useList)

```typescript
function LegacyList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/posts?page=${page}&pageSize=10`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((res) => setData(res.data))
      .catch(() => setError("Failed"))
      .finally(() => setLoading(false));
  }, [page]);

  // Chưa có cache, retry, notifications, realtime, abort signal...
}
```

### 1.2. Nỗi Đau Khi Làm Thủ Công

- ❌ Phải tự quản lý `loading/error`.
- ❌ Không có cache key, dễ fetch lại thừa.
- ❌ Khi đổi backend (REST → GraphQL) phải sửa khắp nơi.
- ❌ Không có retry/dedup/stale time của React Query.
- ❌ Không có thông báo, không có logout khi 401/403.
- ❌ Không có realtime/invalidations, không đo request lâu.

### 1.3. Với useList (Ngắn Gọn)

```typescript
const { query, result, overtime } = useList({
  resource: "posts",
  pagination: { currentPage: 1, pageSize: 10 },
  sorters: [{ field: "createdAt", order: "desc" }],
});
```

✅ Ít code · ✅ Cache + retry + dedupe · ✅ Notifications + auth error handling · ✅ Realtime · ✅ Loading overtime

---

## 2. useList GIẢI QUYẾT GÌ?

| Vấn đề | Cách dùng useList |
| --- | --- |
| Cache & dedupe | `queryKey` ổn định qua `keys()`; React Query lo cache/dedup. |
| Pagination/filter/sorter | Chuẩn hóa qua `handlePaginationParams`, tham gia `queryKey`. |
| Đa data provider | `pickDataProvider` chọn từ prop/meta/context. |
| Meta forwarding | `useMeta` merge meta từ resource + props; `prepareQueryContext` thêm `queryKey` + `signal` để provider abort được. |
| Notifications | `successNotification` / `errorNotification` chạy tự động. |
| Auth errors | `checkError` (Layer 1) logout/redirect nếu 401/403. |
| Realtime | `useResourceSubscription` đăng ký `liveMode`, auto invalidate khi `"auto"`. |
| Performance | `useLoadingOvertime` đo thời gian `isFetching`. |

---

## 3. TỔNG QUAN API

```typescript
const { query, result, overtime } = useList<TQueryFnData, TError, TData>({
  resource?: string;
  filters?: CrudFilter[];
  sorters?: CrudSort[];
  pagination?: { currentPage?: number; pageSize?: number; mode?: "server" | "client" };
  meta?: MetaQuery;
  dataProviderName?: string;
  queryOptions?: UseListQueryOptions<TQueryFnData, TError, TData>; // override từ React Query
  successNotification?: SuccessErrorNotification["successNotification"];
  errorNotification?: SuccessErrorNotification["errorNotification"];
  liveMode?: LiveModeProps["liveMode"];
  liveParams?: LiveModeProps["liveParams"];
  onLiveEvent?: LiveModeProps["onLiveEvent"];
  overtimeOptions?: UseLoadingOvertimeOptionsProps["overtimeOptions"];
});
```

- **`query`**: full `QueryObserverResult` (status, data, error, refetch, isFetching...).
- **`result`**: `{ data: TData[]; total?: number }` với fallback `[]`.
- **`overtime`**: `{ elapsedTime?: number }` (ms) nếu bật `useLoadingOvertime`.

---

## 4. CÁC MẢNH GHÉP NỀN TẢNG

- **useResourceParams**: resolve `resource`, `identifier` từ prop hoặc route context.
- **pickDataProvider**: chọn provider theo thứ tự ưu tiên: `dataProviderName` prop → `resource.meta.dataProviderName` → `"default"`.
- **handlePaginationParams**: mặc định `currentPage=1`, `pageSize=10`, `mode="server"`.
- **useMeta**: merge meta từ resource + prop.
- **prepareQueryContext**: expose `queryKey` + lazy getter `signal` → dataProvider có thể hủy request khi cancel.
- **useResourceSubscription**: đăng ký live events (`liveMode`).
- **useHandleNotification** + **useOnError**: 3-layer error/success system (xem `COMPLETE_ERROR_HANDLING_SYSTEM.md`).
- **useLoadingOvertime**: đo thời gian `isFetching` để hiển thị "slow state" hoặc log.

---

## 5. SƠ ĐỒ LUỒNG DỮ LIỆU

```
Component
  │ props: resource, filters, sorters, pagination, meta, ...
  ▼
useList
  ├─ useResourceParams → { resource, identifier }
  ├─ pickDataProvider → { pickedDataProvider }
  ├─ handlePaginationParams → normalized pagination
  ├─ useMeta → combinedMeta (merge meta + resource meta)
  ├─ useResourceSubscription (liveMode) → subscribe channel: resources/<name>
  ├─ useQuery
  │    ├─ queryKey: keys().data(picked).resource(identifier).action("list").params(...)
  │    ├─ queryFn: dataProvider(picked).getList({ ... })
  │    └─ select: memoized select + client-side pagination slice
  ├─ useEffect success → handleNotification(successNotification)
  ├─ useEffect error   → checkError(auth) + handleNotification(errorNotification)
  └─ useLoadingOvertime → { elapsedTime }
  ▼
Return { query, result, overtime }
```

---

## 6. PHÂN TÍCH SOURCE CODE

**File:** `packages/core/src/hooks/data/useList.ts`

| Đoạn | Ý chính |
| --- | --- |
| `useResourceParams` | Lấy resource từ prop hoặc context; trả `resource`, `identifier`, `resources`. |
| `pickDataProvider` | Chọn provider; giúp multi-provider hoạt động liền mạch. |
| `handlePaginationParams` | Chuẩn hóa pagination; `mode` default `"server"`. |
| `combinedMeta` | `useMeta({ resource, meta })` merge meta từ resource config. |
| `useResourceSubscription` | Đăng ký realtime `types: ["*"]`, `channel: resources/<name>`, pass filters/sorters/pagination/meta. |
| `memoizedSelect` | Thực hiện client-side pagination nếu `mode="client"` rồi mới chạy `queryOptions.select`; memo bằng `useMemo` để tránh re-run. |
| `useQuery` | `queryKey` chuẩn; `queryFn` gọi `dataProvider.getList` với `prepareQueryContext` để forward `queryKey` + `signal` vào meta. |
| Success effect | Nếu `query.isSuccess`, dựng `notificationConfig` (function/object) → `handleNotification`. |
| Error effect | Nếu `query.isError`, gọi `checkError` (auth layer) → `handleNotification` với fallback `translate("notifications.error")`. |
| Loading overtime | `useLoadingOvertime({ isLoading: queryResponse.isFetching, ... })` trả `elapsedTime`. |

Pseudo (rút gọn):

```typescript
const queryResponse = useQuery({
  queryKey: keys().data(picked).resource(identifier).action("list").params(...).get(),
  queryFn: (ctx) => getList({ resource, pagination, filters, sorters, meta: { ...combinedMeta, ...prepareQueryContext(ctx) } }),
  select: memoizedSelect,
  enabled: queryOptions?.enabled ?? !!resource?.name,
  ...queryOptions,
});
```

---

## 7. PAGINATION - SERVER VS CLIENT

### 7.1. Server Mode (Default)

- Pagination nằm trong `queryKey` ⇒ mỗi trang là cache entry riêng.
- `getList` nhận `{ pagination: { currentPage, pageSize } }`.
- Dùng cho dataset lớn hoặc API hỗ trợ server pagination.

### 7.2. Client Mode

- `queryKey` **không** chứa pagination ⇒ fetch 1 lần, slice trên client.
- Slice logic:

```typescript
data: raw.data.slice(
  (currentPage - 1) * pageSize,
  currentPage * pageSize,
);
```

- Dùng khi API trả toàn bộ dataset hoặc số lượng nhỏ.
- Lưu ý: `total` vẫn lấy từ response; nếu provider không trả `total`, UI nên phòng thủ.

### 7.3. Thay Đổi PageSize/Page

- Server mode: thay đổi page/pageSize → cache key khác → refetch.
- Client mode: thay đổi chỉ ảnh hưởng slice, không refetch.

---

## 8. FILTERS, SORTERS & META

- **Filters** (`CrudFilter[]`): định dạng chuẩn của refine, ví dụ:

```typescript
[{ field: "status", operator: "eq", value: "published" }]
```

- **Sorters** (`CrudSort[]`):

```typescript
[{ field: "createdAt", order: "desc" }]
```

- **Meta** (`MetaQuery`): object tùy ý, ví dụ cho REST/GraphQL:
  - REST: `{ headers: { Authorization: "..." }, params: { locale: "vi" } }`
  - GraphQL: `{ fields: ["id", "title", "author { id name }"] }`
- Meta được merge: `combinedMeta = useMeta({ resource, meta })` và thêm `prepareQueryContext(context)` (`queryKey`, `signal`).
- `notificationValues` truyền `meta`, `filters`, `sorters`, `pagination` sang notification callbacks.

---

## 9. QUERY KEY & REACT QUERY INTEGRATION

- **Key shape** (khái niệm): `["data", <provider>, <resource>, "list", params]`
- Tạo bằng helper:

```typescript
keys()
  .data(pickedDataProvider)
  .resource(identifier ?? "")
  .action("list")
  .params({ ... })
  .get();
```

- **Params trong key**:
  - `filters`
  - `pagination` (chỉ khi server mode)
  - `sorters`
  - `meta` (nếu có)
- **enabled**: mặc định `!!resource?.name`. Có thể chủ động tắt bằng `queryOptions.enabled = false`.
- **select**: wrap bởi `memoizedSelect` (đã client-slice). Nếu tự truyền `select`, nên `useCallback` để tránh re-render gây refetch.
- **meta** của React Query: merge `queryOptions.meta` + `getXRay("useList", resource?.name)` để devtools biết nguồn query.

---

## 10. ERROR & NOTIFICATION SYSTEM (3 LAYERS)

Theo `COMPLETE_ERROR_HANDLING_SYSTEM.md`:

1. **Layer 1 - Auth errors**: `checkError(queryResponse.error)` → logout/redirect nếu 401/403.
2. **Layer 2 - Notifications**: `handleNotification` với:
   - `errorNotification` (function/object) hoặc fallback `translate("notifications.error", { statusCode })`.
   - `successNotification` (function/object) nếu query success.
3. **Layer 3 - Custom callbacks**: `queryOptions.onError/onSuccess/onSettled`.

Thứ tự: tanstack onError/onSuccess chạy → effects trong `useEffect` xử lý layer 1/2 (nằm ngoài `useQuery`). Vì vậy bạn vẫn có thể thêm logic riêng mà không ảnh hưởng hệ thống mặc định.

---

## 11. LIVE MODE & REALTIME INVALIDATIONS

- **liveMode values**:
  - `"off"`: không subscribe.
  - `"manual"`: subscribe, chỉ gọi `onLiveEvent`, bạn tự refetch.
  - `"auto"`: subscribe và `invalidate({ invalidates: ["resourceAll"], refetch active })` khi có event.
- **Subscription config**:
  - `channel: resources/<resourceName>`
  - `types: ["*"]`
  - `params`: `filters`, `sorters`, `pagination`, `subscriptionType: "useList"`, `...liveParams`
  - `meta`: forward `dataProviderName` để liveProvider biết nguồn.
- **Khi nào nên "manual"**: khi bạn muốn debounce refetch, hoặc tự hợp nhất data (optimistic merge).
- **Khi nào nên "auto"**: list realtime (chat, dashboard metric) hoặc multi-user editing.

---

## 12. LOADING OVERTIME

- Hook: `useLoadingOvertime({ isLoading: query.isFetching, ...overtimeOptions })`.
- `elapsedTime` tăng mỗi `interval` ms (default 1000ms từ `<Refine options.overtime>`).
- Ứng dụng:
  - Hiện banner "Network chậm" sau 3s.
  - Ghi log/telemetry khi API chậm.
  - Show skeleton nâng cao khi `elapsedTime > threshold`.

Ví dụ:

```typescript
const { overtime } = useList({
  resource: "orders",
  overtimeOptions: {
    onInterval: (ms) => ms >= 3000 && console.warn("Slow list", ms),
  },
});
```

---

## 13. OPTION CHEAT SHEET

- `resource`: ưu tiên prop → route context.
- `pagination`: `{ currentPage?: number; pageSize?: number; mode?: "server" | "client" }` (default `{1,10,"server"}`).
- `filters`: mảng `CrudFilter`.
- `sorters`: mảng `CrudSort`.
- `meta`: object bất kỳ, merge với `resource.meta`.
- `dataProviderName`: tên provider; bỏ trống = "default" hoặc lấy từ resource meta.
- `queryOptions`: `UseQueryOptions` ngoại trừ `queryKey/queryFn` (đã bị override); bạn vẫn tùy biến `staleTime`, `retry`, `select`, `gcTime`, `refetchOnWindowFocus`, ...
- `successNotification/errorNotification`: object hoặc function.
- `liveMode/liveParams/onLiveEvent`: điều khiển realtime.
- `overtimeOptions`: `{ enabled?, interval?, onInterval? }`.

---

## 14. VÍ DỤ TỪ A-Z

### 14.1. Server Pagination + Sort + Filter

```typescript
const { query, result } = useList({
  resource: "posts",
  pagination: { currentPage: page, pageSize: 20, mode: "server" },
  sorters: [{ field: "createdAt", order: "desc" }],
  filters: [{ field: "status", operator: "eq", value: "published" }],
  meta: { populate: ["author"] },
});
```

### 14.2. Client Pagination (Dataset Nhỏ)

```typescript
const { result } = useList({
  resource: "countries",
  pagination: { currentPage: page, pageSize: 50, mode: "client" },
  queryOptions: { staleTime: Infinity }, // giữ cache mãi, không refetch
});
```

### 14.3. Multi Data Provider

```typescript
const { result: usData } = useList({ resource: "customers", dataProviderName: "us" });
const { result: euData } = useList({ resource: "customers", dataProviderName: "eu" });
```

### 14.4. Custom Query Options (Retry + StaleTime)

```typescript
useList({
  resource: "orders",
  queryOptions: {
    retry: 1,
    staleTime: 30_000,
    select: (res) => ({ ...res, data: res.data.filter((o) => o.paid) }),
  },
});
```

### 14.5. Live Mode Auto

```typescript
useList({
  resource: "messages",
  liveMode: "auto",
  liveParams: { channel: "room-123" }, // merge vào params của subscription
  onLiveEvent: (event) => console.log("live event", event),
});
```

### 14.6. Loading Overtime Banner

```typescript
const { query, overtime } = useList({ resource: "logs" });

if (query.isFetching && overtime.elapsedTime && overtime.elapsedTime > 2500) {
  return <SlowBanner />;
}
```

---

## 15. PATTERNS / ANTI-PATTERNS

**Nên:**
- Memo hóa `filters`, `sorters`, `select` (`useMemo/useCallback`) để tránh đổi `queryKey` không cần thiết.
- Dùng `mode="client"` chỉ khi dataset nhỏ hoặc API trả toàn bộ kết quả.
- Truyền `meta` rõ ràng thay vì encode vào URL string.
- Kết hợp `liveMode="auto"` cho list realtime, hoặc `"manual"` khi muốn kiểm soát refetch.

**Không nên:**
- Không thêm pagination vào `meta` thủ công; `handlePaginationParams` đã làm.
- Không mutate trực tiếp `query.data`; hãy dùng `queryClient.setQueryData` nếu cần.
- Không bỏ `resource` trống nếu không có route context (sẽ `enabled=false`).
- Không lạm dụng `retry` cao với API không ổn định → nên log và hiển thị thông báo phù hợp.

---

## 16. FAQ NHANH

- **Tại sao `select` chạy nhiều lần?**: Memoized nhưng phụ thuộc vào `queryOptions.select` reference; hãy `useCallback`.
- **Tại sao page đổi nhưng không refetch?**: Kiểm tra `pagination.mode`; nếu `"client"` thì chỉ slice, không fetch mới.
- **Cần total nhưng provider không trả?**: `result.total` sẽ là `undefined`; UI nên phòng thủ hoặc custom provider trả `total`.
- **Cách abort request?**: `prepareQueryContext` forward `signal`; provider cần hỗ trợ `signal` (fetch, axios cancel token...).
- **Khi nào query disabled?**: `enabled` default `!!resource?.name`; nếu resource không resolve, query không chạy.

---

## 17. TÓM TẮT

- `useList` = `useQuery` + dataProvider.getList + pagination/filter/sorter chuẩn hóa.
- Tích hợp sẵn: chọn đúng provider, merge meta, realtime subscription, notifications, auth-error handling, loading overtime.
- QueryKey ổn định qua `keys()`; meta có `queryKey` + `signal` giúp provider abort khi cancel.
- Hai mode pagination: server (fetch mỗi trang) vs client (fetch một lần, slice).
- Hãy memo hóa inputs, dùng liveMode hợp lý, và tận dụng `queryOptions` để tinh chỉnh cache/refetch.

---

## 18. HỢP ĐỒNG DATA PROVIDER (getList)

**File tham chiếu:** `packages/core/src/hooks/data/useList.ts` (call-site), `packages/core/src/contexts/data/types.ts` (types).

- **Kỳ vọng input**:
  - `resource`: bắt buộc, string.
  - `pagination`: `{ currentPage: number; pageSize: number; mode: "server" | "client" }` (server mode được forward; client mode chủ yếu cho slicing).
  - `filters`: `CrudFilter[]` (provider tự map sang query string/GraphQL).
  - `sorters`: `CrudSort[]`.
  - `meta`: hợp nhất từ `useMeta` + `prepareQueryContext`.
- **Kỳ vọng output**: `Promise<{ data: TQueryFnData[]; total?: number }>`
  - `data`: mảng record.
  - `total`: nên trả với server pagination để UI tính trang; với client mode, `total` có thể bằng `data.length`.
- **`prepareQueryContext` side-effect**:
  - Thêm `queryKey` và `signal` vào `meta`. Provider nên forward `signal` vào fetch/axios để abort khi component unmount hoặc query bị cancel.
- **Đa provider**:
  - `pickDataProvider` chọn tên; Refine sẽ gọi `dataProvider(name).getList`.
  - Bạn có thể gắn `meta.dataProviderName` vào resource để tự động dùng provider khác.

---

## 19. ĐỘ SÂU KIẾN TRÚC: TIMELINE SỰ KIỆN

### 19.1. Khi mount component

```
Mount
  → useResourceParams → resolve resource
  → pickDataProvider
  → handlePaginationParams + merge meta
  → useResourceSubscription (nếu liveMode ≠ "off")
  → useQuery executes
       ↳ builds queryKey
       ↳ queryFn calls getList(meta includes signal)
```

### 19.2. Khi đổi `filters/sorters/pagination` (server mode)

```
State change → queryKey mới → React Query:
  - Nếu cache hit & not stale → phục vụ cache, có thể refetch nền
  - Nếu stale/miss → gọi queryFn mới
```

### 19.3. Khi đổi `filters/sorters/pagination` (client mode)

```
State change → queryKey KHÔNG đổi (pagination bỏ qua) → data slice client
```

### 19.4. Khi nhận live event (liveMode="auto")

```
liveProvider.subscribe → callback(event)
  → invalidate({ invalidates: ["resourceAll"], refetch active })
  → React Query refetch các query key liên quan resource/provider
```

### 19.5. Khi query error

```
queryResponse.isError → useEffect:
  → checkError(error) (auth layer)
  → handleNotification(errorNotification || fallback translate)
  → queryOptions.onError (nếu có)
```

### 19.6. Khi query success

```
queryResponse.isSuccess → useEffect:
  → handleNotification(successNotification if provided)
  → queryOptions.onSuccess (nếu có)
```

---

## 20. THỰC ĐƠN QUERY KEY (CỤ THỂ HÓA)

### 20.1. Server mode example

```typescript
keys()
  .data("default")
  .resource("posts")
  .action("list")
  .params({
    filters: [{ field: "status", operator: "eq", value: "published" }],
    pagination: { currentPage: 2, pageSize: 10, mode: "server" },
    sorters: [{ field: "createdAt", order: "desc" }],
    meta: { populate: ["author"] },
  })
  .get();
// Shape: ["data","default","posts","list", {filters:..., pagination:..., sorters:..., meta:...}]
```

### 20.2. Client mode example

```typescript
// pagination bị bỏ qua trong params
["data","default","countries","list", { filters:[], sorters:[], meta: {} }]
```

### 20.3. Vì sao quan trọng?

- Ổn định cache giữa các hook (`useList`, `useInfiniteList`) nếu chia sẻ params.
- Invalidations: `useInvalidate` dùng cùng key builder để xác định query cần refetch.
- Devtools: `getXRay("useList", resource?.name)` gắn meta giúp debug.

---

## 21. SELECT & CLIENT PAGINATION – CẠM BẪY

- `memoizedSelect` đã chèn slicing trước khi gọi `queryOptions.select`.
- Nếu bạn muốn lọc/sort thêm trong `select`, hãy nhớ:
  - Với client mode: bạn đang thao tác trên subset đã slice.
  - Với server mode: bạn thao tác trên dữ liệu trang hiện tại từ server.
- Luôn `useCallback` cho `select` để tránh recreate gây rerun/invalidate.
- Nếu `select` trả object mới mỗi lần, React Query sẽ xem là thay đổi → có thể re-render nhiều.

---

## 22. THÔNG BÁO & I18N: CHI TIẾT

- **`notificationValues`** được build với:
  - `meta: combinedMeta`
  - `filters: prefferedFilters`
  - `sorters: prefferedSorters`
  - `hasPagination: isServerPagination`
  - `pagination: prefferedPagination`
- **Success**:
  - Nếu `successNotification` là function → `(data, notificationValues, identifier)` → object.
  - Nếu là object → dùng trực tiếp.
  - Nếu undefined → không hiện thông báo, trừ khi bạn tự cấu hình ngoài.
- **Error**:
  - Fallback message: `translate("notifications.error", { statusCode }, "Error (status code: ...)")`
  - Fallback description: `queryResponse.error.message`
- Có thể override `translate` bằng i18n provider để đa ngôn ngữ.

---

## 23. LIVE MODE: BẢN CHẤT INVALIDATION

- `invalidate` được gọi với:

```typescript
invalidate({
  resource: identifier,
  dataProviderName,
  invalidates: ["resourceAll"],
  invalidationFilters: { type: "active", refetchType: "active" },
  invalidationOptions: { cancelRefetch: false },
});
```

- Nghĩa là: chỉ refetch các query đang **active** thuộc resource/provider đó, và không hủy refetch đang chạy.
- Với `liveMode="manual"`: bạn nhận `event` và tự gọi `query.refetch()` nếu muốn.

---

## 24. TƯƠNG TÁC VỚI HOOK KHÁC

- **`useTable`**: nội bộ cũng dùng `useList` (hoặc `useInfiniteList` tùy config). Nếu bạn cần toàn quyền, dùng `useList` trực tiếp rồi truyền data vào bảng custom.
- **`useInfiniteList`**: chia trang theo cursor/offset; vẫn dùng `getList` nhưng khác `queryKey` & pagination. Quy tắc filter/sorter/meta tương tự.
- **`useSelect`**: cũng gọi `getList` nhưng map sang options (`label`/`value`). Khi cần adapter riêng, xem `useSelect` source.
- **`useDataProvider`**: bạn có thể gọi thẳng `dataProvider().getList` khi cần bỏ qua React Query (ít khi cần).

---

## 25. TEST & DEBUG

- **Unit test data provider**: đảm bảo `getList` trả đúng shape `{ data, total }`.
- **Abort test**: hủy component sớm và kiểm tra provider có nhận `signal` không (nếu dùng fetch/axios).
- **Query devtools**: bật React Query Devtools để xem `queryKey`, trạng thái refetch, stale.
- **Live provider**: log `onLiveEvent` để chắc chắn event đang đến; kiểm tra `channel`, `types`, `params`.
- **Notification**: stub `useHandleNotification` khi test component để tránh toast thật.

---

## 26. CHECKLIST TRIỂN KHAI

- [ ] Resource định nghĩa trong `<Refine resources>` hoặc passed prop.
- [ ] `dataProvider` có `getList` và trả `{ data, total }`.
- [ ] Chọn `mode="server"` cho dataset lớn; `"client"` cho dataset nhỏ/one-shot.
- [ ] Memo hóa `filters/sorters/select`.
- [ ] Cân nhắc `queryOptions.staleTime/gcTime/retry`.
- [ ] Đặt `liveMode` phù hợp; nếu `"auto"` → xác minh liveProvider hoạt động.
- [ ] Bật `overtimeOptions` nếu cần monitor request chậm.

---

## 27. MINI PLAYBOOK (SCENARIOS)

- **Dashboard nhiều widget**: đặt `staleTime` cao (30-60s), `refetchOnWindowFocus=false`; kết hợp `liveMode="auto"` cho widget realtime.
- **Danh sách dài với search**: server mode + debounce input → set `enabled=false` khi chuỗi tìm kiếm trống; bật `keepPreviousData` trong `queryOptions` để giữ UI ổn định khi đổi trang.
- **Offline-first**: set `retry: false`, `networkMode: "offlineFirst"` (TanStack option), và hiển thị `overtime` để báo chậm.
- **Locale đa ngôn ngữ**: truyền `meta: { locale }` và thêm `locale` vào `queryKey` (nằm trong `meta`) để cache theo locale.
