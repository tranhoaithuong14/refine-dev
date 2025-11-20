import { useEffect } from "react";

import { getXRay } from "@refinedev/devtools-internal";
import { useMemo } from "react";
import {
  type QueryObserverResult,
  type UseQueryOptions,
  useQuery,
} from "@tanstack/react-query";

import {
  handlePaginationParams,
  pickDataProvider,
  prepareQueryContext,
} from "@definitions/helpers";
import {
  useDataProvider,
  useHandleNotification,
  useKeys,
  useMeta,
  useOnError,
  useResourceParams,
  useResourceSubscription,
  useTranslate,
} from "@hooks";

import type {
  BaseRecord,
  CrudFilter,
  CrudSort,
  GetListResponse,
  HttpError,
  MetaQuery,
  Pagination,
  Prettify,
} from "../../contexts/data/types";
import type { LiveModeProps } from "../../contexts/live/types";
import type { SuccessErrorNotification } from "../../contexts/notification/types";
import {
  type UseLoadingOvertimeOptionsProps,
  type UseLoadingOvertimeReturnType,
  useLoadingOvertime,
} from "../useLoadingOvertime";
import type { MakeOptional } from "../../definitions/types/index";

export type BaseListProps = {
  /**
   * Pagination properties
   */
  pagination?: Pagination;
  /**
   * Sorter parameters
   */
  sorters?: CrudSort[];
  /**
   * Filter parameters
   */
  filters?: CrudFilter[];
  /**
   * Meta data query for `dataProvider`
   */
  meta?: MetaQuery;
  /**
   * If there is more than one `dataProvider`, you should use the `dataProviderName` that you will use
   */
  dataProviderName?: string;
};

export type UseListQueryOptions<TQueryFnData, TError, TData> = MakeOptional<
  UseQueryOptions<
    GetListResponse<TQueryFnData>,
    TError,
    GetListResponse<TData>
  >,
  "queryKey" | "queryFn"
>;

export type UseListProps<TQueryFnData, TError, TData> = {
  /**
   * Resource name for API data interactions
   */
  resource?: string;

  /**
   * Tanstack Query's [useQuery](https://tanstack.com/query/v5/docs/framework/react/reference/useQuery) options
   */
  queryOptions?: UseListQueryOptions<TQueryFnData, TError, TData>;
} & BaseListProps &
  SuccessErrorNotification<
    GetListResponse<TData>,
    TError,
    Prettify<BaseListProps>
  > &
  LiveModeProps &
  UseLoadingOvertimeOptionsProps;

export type UseListReturnType<TData, TError> = {
  query: QueryObserverResult<GetListResponse<TData>, TError>;
  result: {
    data: TData[];
    total: number | undefined;
  };
} & UseLoadingOvertimeReturnType;

const EMPTY_ARRAY = Object.freeze([]) as [];

/**
 * `useList` is a modified version of `react-query`'s {@link https://tanstack.com/query/v5/docs/framework/react/guides/queries `useQuery`} used for retrieving items from a `resource` with pagination, sort, and filter configurations.
 *
 * It uses the `getList` method as the query function from the `dataProvider` which is passed to `<Refine>`.
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/data/useList} for more details.
 *
 * @typeParam TQueryFnData - Result data returned by the query function. Extends {@link https://refine.dev/docs/api-reference/core/interfaceReferences#baserecord `BaseRecord`}
 * @typeParam TError - Custom error object that extends {@link https://refine.dev/docs/api-reference/core/interfaceReferences#httperror `HttpError`}
 * @typeParam TData - Result data returned by the `select` function. Extends {@link https://refine.dev/docs/api-reference/core/interfaceReferences#baserecord `BaseRecord`}. Defaults to `TQueryFnData`
 *
 */

export const useList = <
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TData extends BaseRecord = TQueryFnData,
>({
  resource: resourceFromProp,
  filters,
  pagination,
  sorters,
  queryOptions,
  successNotification,
  errorNotification,
  meta,
  liveMode,
  onLiveEvent,
  liveParams,
  dataProviderName,
  overtimeOptions,
}: UseListProps<TQueryFnData, TError, TData> = {}): UseListReturnType<
  TData,
  TError
> &
  UseLoadingOvertimeReturnType => {
  // 🧭 BƯỚC 1: LẤY THÔNG TIN RESOURCE & PROVIDER
  // - useResourceParams: resolve resource theo prop hoặc URL (context refine).
  // - pickDataProvider: chọn provider theo prop → resource.meta.dataProviderName → "default".
  const { resources, resource, identifier } = useResourceParams({
    resource: resourceFromProp,
  });

  const dataProvider = useDataProvider();
  const translate = useTranslate();
  const { mutate: checkError } = useOnError();
  const handleNotification = useHandleNotification();
  const getMeta = useMeta();
  const { keys } = useKeys();

  const pickedDataProvider = pickDataProvider(
    identifier,
    dataProviderName,
    resources,
  );
  const preferredMeta = meta;
  const prefferedFilters = filters;
  const prefferedSorters = sorters;
  const prefferedPagination = handlePaginationParams({
    pagination,
  });
  const isServerPagination = prefferedPagination.mode === "server";

  // 🧱 BƯỚC 2: BUILD META (thông tin phụ đi kèm request)
  // - useMeta merge meta từ resource definition + prop meta.
  // - combinedMeta được forward xuống dataProvider.
  const combinedMeta = getMeta({ resource, meta: preferredMeta });

  // 🔔 Notification payload: được dùng cho success/error notification callbacks.
  const notificationValues = {
    meta: combinedMeta,
    filters: prefferedFilters,
    hasPagination: isServerPagination,
    pagination: prefferedPagination,
    sorters: prefferedSorters,
  };

  // 🚦 BƯỚC 2.5: BẬT/TẮT QUERY
  // - Nếu queryOptions.enabled undefined → mặc định true.
  // - Bạn có thể tắt tạm bằng enabled=false (vd: chờ có filter mới fetch).
  const isEnabled =
    queryOptions?.enabled === undefined || queryOptions?.enabled === true;

  const { getList } = dataProvider(pickedDataProvider);

  // 📡 BƯỚC 3: ĐĂNG KÝ REALTIME (nếu liveMode không tắt)
  // - liveMode="auto": khi có event → invalidate cache để refetch.
  // - liveMode="manual": chỉ gọi onLiveEvent; bạn tự refetch.
  // - liveMode="off": bỏ qua.
  // - channel: resources/<resourceName> để tách kênh theo resource.
  // - params: gửi filters/sorters/pagination/meta để server biết bối cảnh subscription.
  useResourceSubscription({
    resource: identifier,
    types: ["*"],
    params: {
      meta: combinedMeta,
      pagination: prefferedPagination,
      hasPagination: isServerPagination,
      sorters: prefferedSorters,
      filters: prefferedFilters,
      subscriptionType: "useList",
      ...liveParams,
    },
    channel: `resources/${resource?.name}`,
    enabled: isEnabled,
    liveMode,
    onLiveEvent,
    meta: {
      ...meta,
      dataProviderName: pickedDataProvider,
    },
  });

  // Memoize the select function to prevent it from running multiple times
  // Note: If queryOptions.select is not memoized by the user, this will still
  // re-run on every render. Users should wrap their select function in useCallback.
  // 🧠 BƯỚC 3: CHUẨN BỊ SELECT + CLIENT PAGINATION
  // - Nếu mode="client": slice dữ liệu trên client theo currentPage/pageSize.
  // - Sau đó mới chạy queryOptions.select (nếu có).
  const memoizedSelect = useMemo(() => {
    return (rawData: GetListResponse<TQueryFnData>): GetListResponse<TData> => {
      let data = rawData;

      if (prefferedPagination.mode === "client") {
        data = {
          ...data,
          data: data.data.slice(
            (prefferedPagination.currentPage - 1) *
              prefferedPagination.pageSize,
            prefferedPagination.currentPage * prefferedPagination.pageSize,
          ),
          total: data.total,
        };
      }

      if (queryOptions?.select) {
        return queryOptions?.select?.(data);
      }

      return data as unknown as GetListResponse<TData>;
    };
  }, [
    prefferedPagination.currentPage,
    prefferedPagination.pageSize,
    prefferedPagination.mode,
    queryOptions?.select,
  ]);

  // 🔄 BƯỚC 4: CHẠY useQuery (TanStack)
  // - queryKey: dùng helper keys() để ổn định cache/invalidate.
  // - queryFn: gọi dataProvider.getList với meta + context (queryKey, signal) để provider có thể abort.
  // - enabled: tự động tắt nếu không resolve được resource.
  const queryResponse = useQuery<
    GetListResponse<TQueryFnData>,
    TError,
    GetListResponse<TData>
  >({
    queryKey: keys()
      .data(pickedDataProvider)
      .resource(identifier ?? "")
      .action("list")
      .params({
        ...(preferredMeta || {}), // meta góp phần tạo cache-key nếu bạn truyền (vd locale)
        filters: prefferedFilters,
        ...(isServerPagination && {
          pagination: prefferedPagination, // chỉ thêm vào key khi server-mode để phân trang
        }),
        ...(sorters && {
          sorters,
        }),
      })
      .get(),
    queryFn: (context) => {
      const meta = {
        ...combinedMeta,
        ...prepareQueryContext(context), // thêm queryKey + signal để provider cancel được request khi abort
      };
      return getList<TQueryFnData>({
        resource: resource?.name ?? "",
        pagination: prefferedPagination,
        filters: prefferedFilters,
        sorters: prefferedSorters,
        meta,
      });
    },
    ...queryOptions,
    enabled:
      typeof queryOptions?.enabled !== "undefined"
        ? queryOptions?.enabled
        : !!resource?.name,
    select: memoizedSelect,
    meta: {
      ...queryOptions?.meta,
      ...getXRay("useList", resource?.name),
    },
  });

  // ✅ BƯỚC 5: HANDLE SUCCESS (effect ngoài useQuery để không block render)
  // - Nếu có successNotification: gọi useHandleNotification.
  useEffect(() => {
    if (queryResponse.isSuccess && queryResponse.data) {
      const notificationConfig =
        typeof successNotification === "function"
          ? successNotification(
              queryResponse.data,
              notificationValues,
              identifier,
            )
          : successNotification;

      handleNotification(notificationConfig);
        }
  }, [queryResponse.isSuccess, queryResponse.data, successNotification]);

  // ❌ BƯỚC 6: HANDLE ERROR (3-layer từ COMPLETE_ERROR_HANDLING_SYSTEM.md)
  // - Layer 1: checkError (useOnError) xử lý auth errors (401/403).
  // - Layer 2: handleNotification hiển thị toast + message fallback.
  useEffect(() => {
    if (queryResponse.isError && queryResponse.error) {
      checkError(queryResponse.error);

      const notificationConfig =
        typeof errorNotification === "function"
          ? errorNotification(
              queryResponse.error,
              notificationValues,
              identifier,
            )
          : errorNotification;

      handleNotification(notificationConfig, {
        key: `${identifier}-useList-notification`,
        message: translate(
          "notifications.error",
          { statusCode: queryResponse.error.statusCode },
          `Error (status code: ${queryResponse.error.statusCode})`,
        ),
        description: queryResponse.error.message,
        type: "error",
      });
    }
  }, [queryResponse.isError, queryResponse.error?.message]);

  // ⏱️ BƯỚC 7: ĐO THỜI GIAN LOADING (overtime)
  // - Dùng isFetching để đo xem request có quá lâu không (phục vụ UX/logging).
  const { elapsedTime } = useLoadingOvertime({
    ...overtimeOptions,
    isLoading: queryResponse.isFetching,
  });

  return {
    query: queryResponse,
    result: {
      data: queryResponse?.data?.data || EMPTY_ARRAY, // luôn trả mảng để tránh undefined checks ở UI
      total: queryResponse?.data?.total, // có thể undefined nếu provider không trả
    },
    overtime: { elapsedTime },
  };
};
