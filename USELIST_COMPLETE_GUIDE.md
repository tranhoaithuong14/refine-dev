# 📘 HƯỚNG DẪN HOÀN CHỈNH VỀ useList HOOK

> **TL;DR:** `useList` là wrapper của React Query `useQuery` để lấy danh sách bản ghi với pagination, filter, sorter, notifications, realtime và đo "loading overtime". Nó chạy `dataProvider.getList`, tự động merge `meta`, chọn đúng provider, và xử lý error/success theo 3 layers.

---

## 📋 MỤC LỤC

1. [Vấn Đề Ban Đầu - Tại Sao Cần useList?](#1-vấn-đề-ban-đầu---tại-sao-cần-uselist)
2. [Nền Tảng: React Query + Data Provider](#2-nền-tảng-react-query--data-provider)
3. [useList Hook - Tổng Quan & API](#3-uselist-hook---tổng-quan--api)
4. [Kiến Trúc Nội Bộ](#4-kiến-trúc-nội-bộ)
5. [Luồng Hoạt Động Chi Tiết](#5-luồng-hoạt-động-chi-tiết)
6. [Pagination, Filter, Sorter](#6-pagination-filter-sorter)
7. [Tương Tác Với React Query](#7-tương-tác-với-react-query)
8. [Error & Notification Flow](#8-error--notification-flow)
9. [Live Mode & Realtime](#9-live-mode--realtime)
10. [Option Cheat Sheet](#10-option-cheat-sheet)
11. [Ví Dụ Thực Tế](#11-ví-dụ-thực-tế)
12. [Best Practices](#12-best-practices)
13. [Tóm Tắt](#13-tóm-tắt)

---

## 1. VẤN ĐỀ BAN ĐẦU - TẠI SAO CẦN useList?

### 1.1. Cách Cũ - Fetch Thủ Công

```typescript
function LegacyPostList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/posts?page=${page}&pageSize=10`);
        const body = await res.json();
        setData(body.data);
      } catch (e) {
        setError("Failed to fetch");
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [page]);

  // Tự handle cache, sort, filter, notifications, realtime ⇒ rất nhiều boilerplate
}
```

### 1.2. Nỗi Đau

- Phải quản lý `loading`, `error`, `cache key`, refetch bằng tay.
- Pagination/sort/filter dễ sai khi đổi API hoặc đổi backend (REST ⇄ GraphQL).
- Không có retry, không có invalidate tự động, không gắn với hệ thống notification/error chung.
- Không có realtime và không đo được request lâu bất thường.

### 1.3. Cách Mới - Dùng useList

```typescript
function PostList() {
  const [page, setPage] = useState(1);
  const { query, result, overtime } = useList({
    resource: "posts",
    pagination: { currentPage: page, pageSize: 10, mode: "server" },
    sorters: [{ field: "createdAt", order: "desc" }],
  });

  if (query.isLoading) return <Skeleton />;
  if (query.isError) return <ErrorState message={query.error.message} />;

  return (
    <>
      <div>{overtime.elapsedTime ? "Đang tải lâu..." : null}</div>
      {result.data.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
      <Pagination total={result.total} onChange={setPage} />
    </>
  );
}
```

✅ **Ít code hơn** · ✅ **Cache + retry + dedupe** · ✅ **Notification + error handling 3 layers** · ✅ **Realtime + overtime**

---

## 2. NỀN TẢNG: REACT QUERY + DATA PROVIDER

- **React Query** quản lý server state (cache, dedupe, retry, staleTime, gcTime).
- **Data Provider** là abstraction của Refine (`dataProvider.getList`) giúp đổi backend mà không đổi UI (xem `USEDATAPROVIDER_COMPLETE_GUIDE.md`).
- `useList` = cầu nối: nó xây `queryKey`, gọi `getList`, merge `meta`, chèn abort `signal`, và trả về `QueryObserverResult`.

---

## 3. useList HOOK - TỔNG QUAN & API

```typescript
const { query, result, overtime } = useList<TQueryFnData, TError, TData>({
  resource,          // optional - lấy từ context nếu không truyền
  filters, sorters,  // CrudFilter[], CrudSort[]
  pagination,        // { currentPage, pageSize, mode: "server" | "client" }
  meta,              // MetaQuery - forward xuống dataProvider
  dataProviderName,  // chọn provider nếu multi
  queryOptions,      // UseQueryOptions override (TanStack Query)
  successNotification, errorNotification, // tùy biến
  liveMode, liveParams, onLiveEvent,      // realtime
  overtimeOptions,   // cấu hình đo thời gian loading
});
```

- **`query`**: object từ `useQuery` (status, refetch, error, data...).
- **`result`**: `{ data: TData[]; total?: number }` với default `[]`.
- **`overtime`**: `{ elapsedTime?: number }` nếu bật đo thời gian chờ.

---

## 4. KIẾN TRÚC NỘI BỘ

```
UI Component
   │
   ▼
useList (packages/core/src/hooks/data/useList.ts)
   ├─ useResourceParams → resolve resource & identifier
   ├─ pickDataProvider  → chọn provider theo prop/meta/context
   ├─ handlePaginationParams → default page=1, size=10, mode="server"
   ├─ useResourceSubscription → subscribe realtime (liveMode)
   ├─ useQuery (TanStack) → queryFn = dataProvider.getList
   │     └─ prepareQueryContext: forward queryKey + abort signal vào meta
   ├─ useOnError + useHandleNotification → 3-layer error/success handling
   └─ useLoadingOvertime → đo thời gian isFetching
```

- `getXRay("useList", resource?.name)` thêm meta cho devtools nội bộ.
- `memoizedSelect` xử lý client-side pagination + wrap `queryOptions.select` để tránh re-run không cần thiết.

---

## 5. LUỒNG HOẠT ĐỘNG CHI TIẾT

1) **Resolve resource**: `useResourceParams` lấy `resource`, `identifier`, `resources` từ context (matching `resource` prop nếu có).
2) **Chọn data provider**: `pickDataProvider(identifier, dataProviderName, resources)` ⇒ ưu tiên prop, sau đó meta của resource, cuối cùng `"default"`.
3) **Normalize inputs**:
   - `handlePaginationParams` ⇒ `{ currentPage=1, pageSize=10, mode="server" }`.
   - `filters/sorters` giữ nguyên; `meta` được merge qua `useMeta`.
4) **Đăng ký realtime**: `useResourceSubscription` với `types: ["*"]`, `channel: resources/${resource?.name}`, pass `filters/sorters/pagination/meta` + `liveParams`. Nếu `liveMode="auto"` ⇒ invalidates cache khi nhận event.
5) **Chạy useQuery**:
   - `queryKey`: `["data", provider, resource, "list", params]` (params gồm filters + pagination server + sorters + meta).
   - `queryFn`: gọi `dataProvider(picked).getList({ resource, pagination, filters, sorters, meta: combinedMeta + queryContext })`.
   - `enabled`: dùng `queryOptions.enabled` hoặc `!!resource?.name`.
6) **Client-side pagination** (nếu `mode="client"`): slice `data.data` theo `currentPage/pageSize` trước khi apply `select`.
7) **Success effect**: nếu `query.isSuccess` ⇒ gọi `successNotification` (function/object) qua `useHandleNotification`.
8) **Error effect**: nếu `query.isError` ⇒ `checkError` (Layer 1) rồi `handleNotification` (Layer 2) với fallback translate `notifications.error`.
9) **Loading overtime**: `useLoadingOvertime({ isLoading: query.isFetching, ...overtimeOptions })` ⇒ trả `elapsedTime`.

---

## 6. PAGINATION, FILTER, SORTER

- **Default**: `currentPage=1`, `pageSize=10`, `mode="server"`.
- **Server mode**: pagination tham gia `queryKey` ⇒ thay đổi page/size sẽ refetch từ server.
- **Client mode**:
  - `queryKey` **không** include pagination ⇒ chỉ fetch một lần, các trang sau slice từ cache.
  - Logic slice (simplified):

    ```typescript
    if (pagination.mode === "client") {
      data = {
        ...raw,
        data: raw.data.slice((page-1)*pageSize, page*pageSize),
      };
    }
    ```

  - Dùng cho dataset nhỏ hoặc API trả all records.
- **Filters/Sorters**: pass thẳng xuống `getList`; filter structure = `CrudFilter[]`, sorter structure = `{ field, order }[]`.
- **`total`**: trả về `data.total` (có thể undefined nếu provider không trả).

---

## 7. TƯƠNG TÁC VỚI REACT QUERY

- **queryKey builder**: `keys().data(pickedDataProvider).resource(identifier).action("list").params({...})` ⇒ nhất quán cho cache & invalidation.
- **queryFn meta**: merge `combinedMeta` + `prepareQueryContext` (`queryKey`, `signal` enumerable) ⇒ provider có thể abort request khi query bị cancel.
- **enabled**: mặc định `true` nếu có `resource?.name`; có thể override `queryOptions.enabled`.
- **select**:
  - `memoizedSelect` wrap `queryOptions.select` và tự slice nếu `mode="client"`.
  - Nếu tự truyền `select`, hãy `useCallback` để tránh regenerate function liên tục (comment trong code).
- **queryOptions**: có thể set `staleTime`, `gcTime`, `retry`, `refetchOnWindowFocus`, `meta`...; `meta` được merge thêm `getXRay` cho devtools.

---

## 8. ERROR & NOTIFICATION FLOW

- **Layer 1**: `useOnError().mutate` (`checkError`) chỉ xử lý auth errors (401/403). Xem `COMPLETE_ERROR_HANDLING_SYSTEM.md`.
- **Layer 2**: `useHandleNotification` hiển thị notification:
  - `successNotification`: object hoặc function `(data, values, identifier) => Notification`.
  - `errorNotification`: object hoặc function `(error, values, identifier) => Notification`.
  - Fallback error message: `translate("notifications.error", { statusCode })`.
- **Layer 3**: callbacks trong `queryOptions` (`onError`, `onSuccess`, `onSettled`) nếu bạn cung cấp.

---

## 9. LIVE MODE & REALTIME

- Prop `liveMode` (inherit từ `<Refine liveMode>` nếu không truyền):
  - `"off"`: không subscribe.
  - `"auto"`: subscribe và tự `invalidate` `"resourceAll"` khi có event.
  - `"manual"`: subscribe và chỉ gọi callback, bạn tự refetch.
- `useResourceSubscription` config trong `useList`:
  - `channel: resources/<resourceName>`
  - `types: ["*"]` (create/update/delete/custom...)
  - `params`: `meta`, `filters`, `sorters`, `pagination`, `subscriptionType: "useList"`, `...liveParams`
  - `onLiveEvent`: callback prop + callback từ context đều được gọi.
- `dataProviderName` được forward vào `meta` để liveProvider chọn đúng source.

---

## 10. OPTION CHEAT SHEET

- **resource**: tên resource; nếu bỏ trống sẽ lấy từ URL/context.
- **pagination**: `{ currentPage, pageSize, mode }` · default `{1, 10, "server"}`.
- **filters / sorters**: mảng `CrudFilter` / `CrudSort` (giữ nguyên format của dataProvider).
- **meta**: object bất kỳ, merge với `resource.meta` và `prepareQueryContext`.
- **dataProviderName**: chọn provider khi multi-tenant.
- **queryOptions**: TanStack `UseQueryOptions` cho `getList` (trừ `queryKey/queryFn` đã bị override).
- **successNotification / errorNotification**: object hoặc function.
- **liveMode / liveParams / onLiveEvent**: realtime control.
- **overtimeOptions**: cấu hình `useLoadingOvertime` (`enabled`, `interval`, `onInterval`).

---

## 11. VÍ DỤ THỰC TẾ

```typescript
import { useMemo, useState } from "react";
import { useList } from "@refinedev/core";

export const PostTable = () => {
  const [page, setPage] = useState(1);
  const filters = useMemo(
    () => [{ field: "status", operator: "eq", value: "published" }],
    [],
  );

  const { query, result, overtime } = useList({
    resource: "posts",
    pagination: { currentPage: page, pageSize: 20, mode: "server" },
    sorters: [{ field: "createdAt", order: "desc" }],
    filters,
    meta: { populate: ["author"] }, // forward xuống dataProvider
    liveMode: "auto",
    overtimeOptions: {
      onInterval: (ms) => {
        if (ms >= 3000) console.log("List is slow", ms);
      },
    },
  });

  if (query.isFetching && overtime.elapsedTime && overtime.elapsedTime > 2000) {
    return <SlowState />;
  }

  return (
    <>
      {result.data.map((post) => (
        <div key={post.id}>{post.title}</div>
      ))}
      <Pagination
        current={page}
        total={result.total}
        onChange={(next) => setPage(next)}
      />
    </>
  );
};
```

---

## 12. BEST PRACTICES

- Dùng `mode="client"` chỉ khi dataset nhỏ hoặc API trả đủ dữ liệu; còn lại ưu tiên server pagination.
- Memoize `filters`, `sorters`, `queryOptions.select` với `useMemo/useCallback` để tránh regen `queryKey/select`.
- Set `queryOptions.staleTime` phù hợp để tối ưu refetch (dashboard ⇒ cao, list realtime ⇒ thấp).
- Truyền `meta` rõ ràng (field, populate, locale, currency...) thay vì encode vào URL thủ công.
- Kết hợp `liveMode="auto"` + `queryOptions.refetchOnWindowFocus=false` để tránh refetch dư thừa nhưng vẫn realtime.
- Tận dụng `overtimeOptions` để log hoặc hiển thị "Slow network" khi `elapsedTime` vượt ngưỡng.

---

## 13. TÓM TẮT

- `useList` wrap `useQuery` + `dataProvider.getList` với pagination/filter/sort/meta chuẩn hóa.
- Tích hợp sẵn **realtime**, **notifications**, **auth error handling**, **loading overtime**.
- Cấu trúc `queryKey` + `prepareQueryContext` giúp cache ổn định và hỗ trợ abort request.
- Thao tác chính: chọn resource/provider → normalize input → subscribe live → chạy `useQuery` → handle success/error → expose `query`, `result`, `overtime`.
