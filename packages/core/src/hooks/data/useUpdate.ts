// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// Import công cụ XRay cho debugging và monitoring
import { getXRay } from "@refinedev/devtools-internal";

// Import các types và hooks từ React Query (TanStack Query)
import {
  type UseMutationOptions, // Type cho options của useMutation
  type MutateOptions, // Type cho options khi gọi mutate()
  useMutation, // Hook chính để tạo mutations
  useQueryClient, // Hook để truy cập query client (quản lý cache)
} from "@tanstack/react-query";

// Import helper để chọn data provider
import { pickDataProvider } from "@definitions/helpers";

// Import các hooks từ Refine
import {
  useCancelNotification, // Hook để hủy notification (dùng cho undoable mode)
  useDataProvider, // Hook để lấy data provider
  useHandleNotification, // Hook để hiển thị notifications
  useInvalidate, // Hook để xóa cache
  useKeys, // Hook để tạo query keys
  useLog, // Hook để ghi log
  useMeta, // Hook để lấy metadata
  useMutationMode, // Hook để lấy mutation mode
  useOnError, // Hook để xử lý lỗi global
  usePublish, // Hook để publish events
  useRefineContext, // Hook để lấy Refine context
  useResourceParams, // Hook để lấy resource params
  useTranslate, // Hook để dịch ngôn ngữ
} from "@hooks";

// Import các types
import type {
  BaseKey, // Type cho ID (string | number)
  BaseRecord, // Type cơ bản cho record
  GetListResponse, // Type cho response của useList
  GetManyResponse, // Type cho response của useMany
  GetOneResponse, // Type cho response của useOne
  HttpError, // Type cho HTTP errors
  IQueryKeys, // Type cho query keys
  MetaQuery, // Type cho metadata
  MutationMode, // Type cho mutation mode ("pessimistic" | "optimistic" | "undoable")
  PrevContext as UpdateContext, // Type cho context (chứa previous queries)
  PreviousQuery, // Type cho previous query
  UpdateResponse, // Type cho response khi update
} from "../../contexts/data/types";

// Import type cho mutation result
import type { UseMutationResult } from "../../definitions/types";

// Import type cho notifications
import type { SuccessErrorNotification } from "../../contexts/notification/types";

// Import action types cho undoable queue
import { ActionTypes } from "../../contexts/undoableQueue/types";

// Import hook và types cho loading overtime
import {
  type UseLoadingOvertimeOptionsProps,
  type UseLoadingOvertimeReturnType,
  useLoadingOvertime,
} from "../useLoadingOvertime";

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA TYPES
// ============================================================================

/**
 * 📚 TYPE OPTIMISTIC UPDATE MAP - Cấu hình cho optimistic updates
 *
 * 💡 OPTIMISTIC UPDATE LÀ GÌ?
 *
 * Optimistic update = Cập nhật UI NGAY LẬP TỨC trước khi server phản hồi
 * Giúp UI phản hồi nhanh, không phải đợi server
 *
 * VD:
 * User click "Like" button:
 * 1. Pessimistic: Đợi server confirm (chậm, nhưng an toàn)
 * 2. Optimistic: Hiện "Liked" ngay lập tức (nhanh, nhưng có thể phải rollback nếu lỗi)
 *
 * Map này cho phép config cách update cache cho từng loại query:
 * - list: useList queries
 * - many: useMany queries
 * - detail: useOne queries
 */
export type OptimisticUpdateMapType<TData, TVariables> = {
  /**
   * 📌 list: Cấu hình update cho useList queries
   *
   * Có 2 options:
   * 1. boolean (true/false):
   *    - true: Tự động update list bằng cách merge values vào record
   *    - false: Không update list
   * 2. function: Custom logic để update list
   */
  list?:
    | ((
        previous: GetListResponse<TData> | null | undefined, // Cache cũ
        values: TVariables, // Giá trị mới
        id: BaseKey, // ID của record
      ) => GetListResponse<TData> | null)
    | boolean;

  /**
   * 📌 many: Cấu hình update cho useMany queries
   * Tương tự list
   */
  many?:
    | ((
        previous: GetManyResponse<TData> | null | undefined,
        values: TVariables,
        id: BaseKey,
      ) => GetManyResponse<TData> | null)
    | boolean;

  /**
   * 📌 detail: Cấu hình update cho useOne queries
   * Tương tự list
   */
  detail?:
    | ((
        previous: GetOneResponse<TData> | null | undefined,
        values: TVariables,
        id: BaseKey,
      ) => GetOneResponse<TData> | null)
    | boolean;
};

/**
 * 📚 TYPE UPDATE PARAMS - Tham số cho mutation
 */
export type UpdateParams<TData, TError, TVariables> = {
  /**
   * 📌 resource: Tên resource (VD: "posts", "users")
   */
  resource?: string;

  /**
   * 📌 id: ID của record cần update (BẮT BUỘC)
   * Đây là điểm khác biệt chính với useCreate
   */
  id?: BaseKey;

  /**
   * 📌 mutationMode: Chế độ mutation
   *
   * 3 chế độ:
   * 1. "pessimistic": Đợi server response mới update UI
   * 2. "optimistic": Update UI ngay, rollback nếu lỗi
   * 3. "undoable": Update UI ngay, cho phép undo trong vài giây
   */
  mutationMode?: MutationMode;

  /**
   * 📌 undoableTimeout: Thời gian (ms) để undo khi mutationMode = "undoable"
   * VD: 5000 = 5 giây để user có thể click "Undo"
   */
  undoableTimeout?: number;

  /**
   * 📌 onCancel: Callback nhận hàm để cancel mutation (dùng cho undoable mode)
   *
   * VD:
   * onCancel: (cancelMutation) => {
   *   // Lưu hàm cancelMutation vào state
   *   // Gọi nó khi user click "Undo" button
   * }
   */
  onCancel?: (cancelMutation: () => void) => void;

  /**
   * 📌 values: Dữ liệu để update (BẮT BUỘC)
   * VD: { title: "Updated Title", content: "New content" }
   */
  values?: TVariables;

  /**
   * 📌 meta: Metadata bổ sung
   */
  meta?: MetaQuery;

  /**
   * 📌 dataProviderName: Tên data provider
   */
  dataProviderName?: string;

  /**
   * 📌 invalidates: Các queries cần invalidate sau khi update
   * Mặc định: ["list", "many", "detail"]
   */
  invalidates?: Array<keyof IQueryKeys>;

  /**
   * 📌 optimisticUpdateMap: Custom logic cho optimistic updates
   * Mặc định: { list: true, many: true, detail: true }
   */
  optimisticUpdateMap?: OptimisticUpdateMapType<TData, TVariables>;
} & SuccessErrorNotification<
  UpdateResponse<TData>,
  TError,
  { id: BaseKey; values: TVariables }
>;

/**
 * 📚 TYPE UPDATE RETURN TYPE - Kết quả trả về
 */
export type UseUpdateReturnType<
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
> = UseMutationResult<
  UpdateResponse<TData>,
  TError,
  UpdateParams<TData, TError, TVariables>,
  UpdateContext<TData>
> &
  UseLoadingOvertimeReturnType;

/**
 * 📚 TYPE UPDATE PROPS - Props truyền vào hook
 */
export type UseUpdateProps<
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
> = {
  /**
   * 📌 mutationOptions: Options cho useMutation
   * Omit<..., "mutationFn" | "onMutate"> = loại bỏ mutationFn và onMutate
   * (vì 2 fields này đã được hook tự động tạo)
   */
  mutationOptions?: Omit<
    UseMutationOptions<
      UpdateResponse<TData>,
      TError,
      UpdateParams<TData, TError, TVariables>,
      UpdateContext<TData>
    >,
    "mutationFn" | "onMutate"
  >;
} & UseLoadingOvertimeOptionsProps &
  UpdateParams<TData, TError, TVariables>;

// ============================================================================
// PHẦN 3: KHAI BÁO HOOK USEUPDATE
// ============================================================================

/**
 * 📚 HOOK USEUPDATE - Cập nhật dữ liệu với React Query Mutations
 *
 * 🎯 CHỨC NĂNG:
 * Hook này dùng để CẬP NHẬT (UPDATE) dữ liệu trên server.
 * Nó tương tự useCreate nhưng phức tạp hơn vì hỗ trợ:
 * - Optimistic updates (cập nhật UI trước khi server phản hồi)
 * - Undoable mode (cho phép undo)
 * - Rollback (khôi phục cache cũ nếu update lỗi)
 *
 * 💡 VÍ DỤ SỬ DỤNG:
 * ```typescript
 * const { mutate } = useUpdate();
 *
 * mutate({
 *   resource: "posts",
 *   id: 1,
 *   values: { title: "Updated Title" }
 * });
 * ```
 *
 * 🔄 FLOW HOẠT ĐỘNG:
 * 1. onMutate: Cập nhật cache optimistically (nếu optimistic/undoable mode)
 * 2. mutationFn: Gọi API để update
 * 3. onSuccess: Hiển thị notification, invalidate cache, ghi log
 * 4. onError: Rollback cache, hiển thị error notification
 * 5. onSettled: Cleanup (chạy sau onSuccess/onError)
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/data/useUpdate} - Docs
 *
 * @typeParam TData - Kiểu dữ liệu của record
 * @typeParam TError - Kiểu dữ liệu của error
 * @typeParam TVariables - Kiểu dữ liệu của values (input)
 */
export const useUpdate = <
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
>({
  id: idFromProps,
  resource: resourceFromProps,
  values: valuesFromProps,
  dataProviderName: dataProviderNameFromProps,
  successNotification: successNotificationFromProps,
  errorNotification: errorNotificationFromProps,
  meta: metaFromProps,
  mutationMode: mutationModeFromProps,
  undoableTimeout: undoableTimeoutFromProps,
  onCancel: onCancelFromProps,
  optimisticUpdateMap: optimisticUpdateMapFromProps,
  invalidates: invalidatesFromProps,
  mutationOptions,
  overtimeOptions,
}: UseUpdateProps<TData, TError, TVariables> = {}): UseUpdateReturnType<
  TData,
  TError,
  TVariables
> => {
  // ============================================================================
  // PHẦN 4: KHỞI TẠO CÁC HOOKS VÀ DEPENDENCIES
  // ============================================================================

  // Lấy resources và hàm select
  const { resources, select } = useResourceParams({
    resource: resourceFromProps,
  });

  /**
   * 📚 QUERY CLIENT - Quản lý cache của React Query
   *
   * 💡 QUERY CLIENT LÀ GÌ?
   *
   * Query Client là "bộ não" của React Query, quản lý toàn bộ cache:
   * - Lưu trữ data từ các queries
   * - Invalidate (xóa) cache
   * - Update cache (optimistic updates)
   * - Get/Set query data
   *
   * Trong useUpdate, ta dùng queryClient để:
   * 1. Lấy cache cũ trước khi update (cho rollback)
   * 2. Update cache optimistically
   * 3. Rollback cache nếu update lỗi
   */
  const queryClient = useQueryClient();

  // Lấy data provider
  const dataProvider = useDataProvider();

  // Lấy mutation mode và undoable timeout từ context
  const {
    mutationMode: mutationModeContext,
    undoableTimeout: undoableTimeoutContext,
  } = useMutationMode();

  // Lấy các hooks khác
  const { mutate: checkError } = useOnError();
  const translate = useTranslate();
  const publish = usePublish();
  const { log } = useLog();
  const { notificationDispatch } = useCancelNotification();
  const handleNotification = useHandleNotification();
  const invalidateStore = useInvalidate();
  const getMeta = useMeta();
  const {
    options: { textTransformers },
  } = useRefineContext();
  const { keys } = useKeys();

  // ============================================================================
  // PHẦN 5: TẠO MUTATION VỚI USEMUTATION
  // ============================================================================

  const mutationResult = useMutation<
    UpdateResponse<TData>,
    TError,
    UpdateParams<TData, TError, TVariables>,
    UpdateContext<TData> // Context chứa previousQueries để rollback
  >({
    // ========================================================================
    // mutationFn: Hàm chính để thực hiện update
    // ========================================================================

    /**
     * 📚 MUTATION FUNCTION - Hàm gọi API update
     *
     * Function này xử lý 2 modes:
     * 1. Pessimistic/Optimistic: Gọi API ngay lập tức
     * 2. Undoable: Trì hoãn việc gọi API, cho phép user undo
     */
    mutationFn: ({
      id = idFromProps,
      values = valuesFromProps,
      resource: resourceName = resourceFromProps,
      mutationMode = mutationModeFromProps,
      undoableTimeout = undoableTimeoutFromProps,
      onCancel = onCancelFromProps,
      meta = metaFromProps,
      dataProviderName = dataProviderNameFromProps,
    }) => {
      // ======================================================================
      // BƯỚC 1: Validation
      // ======================================================================

      if (typeof id === "undefined") throw missingIdError;
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      // ======================================================================
      // BƯỚC 2: Lấy resource config và metadata
      // ======================================================================

      const { resource, identifier } = select(resourceName);

      const combinedMeta = getMeta({
        resource,
        meta: meta,
      });

      // Xác định mutation mode: ưu tiên từ params, nếu không có thì dùng context
      const mutationModePropOrContext = mutationMode ?? mutationModeContext;

      const undoableTimeoutPropOrContext =
        undoableTimeout ?? undoableTimeoutContext;

      // ======================================================================
      // BƯỚC 3: Xử lý PESSIMISTIC và OPTIMISTIC mode
      // ======================================================================

      /**
       * 📖 PESSIMISTIC/OPTIMISTIC MODE:
       *
       * Nếu KHÔNG phải undoable mode:
       * - Gọi API ngay lập tức và return promise
       * - onMutate sẽ xử lý optimistic update (nếu optimistic mode)
       */
      if (!(mutationModePropOrContext === "undoable")) {
        return dataProvider(
          pickDataProvider(identifier, dataProviderName, resources),
        ).update<TData, TVariables>({
          resource: resource.name,
          id,
          variables: values,
          meta: combinedMeta,
        });
      }

      // ======================================================================
      // BƯỚC 4: Xử lý UNDOABLE mode
      // ======================================================================

      /**
       * 📚 UNDOABLE MODE - Cho phép hoàn tác
       *
       * 💡 UNDOABLE MODE HOẠT ĐỘNG NHƯ THẾ NÀO?
       *
       * 1. User click "Update"
       * 2. UI cập nhật ngay (optimistic)
       * 3. Hiển thị notification với nút "Undo" trong X giây
       * 4. Nếu user click "Undo": Hủy mutation, rollback UI
       * 5. Nếu user KHÔNG click "Undo": Gọi API sau X giây
       *
       * VD: Gmail's "Undo Send" feature
       */
      const updatePromise = new Promise<UpdateResponse<TData>>(
        (resolve, reject) => {
          /**
           * 📚 DO MUTATION - Hàm thực hiện mutation
           *
           * Hàm này sẽ được gọi SAU khi timeout hết
           * (nếu user không click Undo)
           */
          const doMutation = () => {
            dataProvider(
              pickDataProvider(identifier, dataProviderName, resources),
            )
              .update<TData, TVariables>({
                resource: resource.name,
                id,
                variables: values,
                meta: combinedMeta,
              })
              .then((result) => resolve(result))
              .catch((err) => reject(err));
          };

          /**
           * 📚 CANCEL MUTATION - Hàm hủy mutation
           *
           * Hàm này sẽ được gọi khi user click "Undo"
           * Reject promise với message đặc biệt để phân biệt với lỗi thật
           */
          const cancelMutation = () => {
            reject({ message: "mutationCancelled" });
          };

          // Nếu user cung cấp onCancel callback, gọi nó với cancelMutation
          // User có thể lưu hàm này để gắn vào nút "Undo" custom
          if (onCancel) {
            onCancel(cancelMutation);
          }

          /**
           * 📚 NOTIFICATION DISPATCH - Thêm mutation vào undoable queue
           *
           * 💡 UNDOABLE QUEUE LÀ GÌ?
           *
           * Là một queue (hàng đợi) chứa các mutations đang chờ:
           * - Mỗi mutation có countdown timer (VD: 5 giây)
           * - UI hiển thị notification "Updating... Undo"
           * - Khi hết timeout, gọi doMutation()
           * - Nếu user click Undo, gọi cancelMutation()
           */
          notificationDispatch({
            type: ActionTypes.ADD, // Thêm vào queue
            payload: {
              id: id, // ID của mutation (để track)
              resource: identifier, // Resource name
              cancelMutation: cancelMutation, // Hàm để cancel
              doMutation: doMutation, // Hàm để thực thi
              seconds: undoableTimeoutPropOrContext, // Timeout (ms)
              isSilent: !!onCancel, // Nếu có onCancel custom, không hiện notification mặc định
            },
          });
        },
      );
      return updatePromise;
    },

    // ========================================================================
    // onMutate: Callback chạy TRƯỚC khi mutation thực thi
    // ========================================================================

    /**
     * 📚 ON MUTATE - Optimistic Updates
     *
     * 🎯 CHỨC NĂNG:
     * Callback này chạy TRƯỚC khi gọi API
     * Dùng để cập nhật cache optimistically (UI phản hồi nhanh)
     *
     * 🔄 FLOW:
     * 1. Cancel các queries đang fetch (tránh conflict)
     * 2. Lưu lại cache cũ (để rollback nếu lỗi)
     * 3. Update cache với giá trị mới
     * 4. Return context chứa cache cũ
     *
     * @returns Context chứa previousQueries để rollback
     */
    onMutate: async ({
      resource: resourceName = resourceFromProps,
      id = idFromProps,
      mutationMode = mutationModeFromProps,
      values = valuesFromProps,
      dataProviderName = dataProviderNameFromProps,
      meta = metaFromProps,
      optimisticUpdateMap = optimisticUpdateMapFromProps ?? {
        list: true,
        many: true,
        detail: true,
      },
    }) => {
      // ======================================================================
      // BƯỚC 1: Validation
      // ======================================================================

      if (typeof id === "undefined") throw missingIdError;
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      const { identifier } = select(resourceName);

      // Tách các field đặc biệt ra khỏi meta
      const { gqlMutation: _, gqlQuery: __, ...preferredMeta } = meta ?? {};

      // ======================================================================
      // BƯỚC 2: Tạo query keys cho resource
      // ======================================================================

      /**
       * 📚 RESOURCE KEYS - Keys cho tất cả queries của resource
       *
       * VD: resourceKeys.get() = ["data", "default", "posts"]
       * Dùng để match tất cả queries liên quan đến posts
       */
      const resourceKeys = keys()
        .data(pickDataProvider(identifier, dataProviderName, resources))
        .resource(identifier);

      // ======================================================================
      // BƯỚC 3: Lưu lại cache cũ (previous queries)
      // ======================================================================

      /**
       * 📚 GET QUERIES DATA - Lấy tất cả queries data
       *
       * queryClient.getQueriesData() trả về array of [queryKey, data]
       * Lưu lại để rollback nếu mutation lỗi
       *
       * VD:
       * [
       *   [["data", "default", "posts", "list"], { data: [...], total: 10 }],
       *   [["data", "default", "posts", "one", "1"], { data: {...} }],
       * ]
       */
      const previousQueries: PreviousQuery<TData>[] =
        queryClient.getQueriesData({
          queryKey: resourceKeys.get(),
        });

      // Xác định mutation mode
      const mutationModePropOrContext = mutationMode ?? mutationModeContext;

      // ======================================================================
      // BƯỚC 4: Cancel các queries đang fetch
      // ======================================================================

      /**
       * 📚 CANCEL QUERIES - Hủy các queries đang fetch
       *
       * 💡 TẠI SAO PHẢI CANCEL?
       *
       * Tránh race condition:
       * 1. User update record
       * 2. Optimistic update cache
       * 3. Query đang fetch data cũ từ server
       * 4. Query complete => ghi đè cache mới bằng data cũ
       * 5. UI hiển thị sai!
       *
       * Cancel queries để đảm bảo không bị ghi đè
       */
      await queryClient.cancelQueries({
        queryKey: resourceKeys.get(),
      });

      // ======================================================================
      // BƯỚC 5: Optimistic Updates (nếu không phải pessimistic mode)
      // ======================================================================

      /**
       * 📖 OPTIMISTIC/UNDOABLE MODE:
       *
       * Nếu KHÔNG phải pessimistic mode:
       * Update cache ngay lập tức để UI phản hồi nhanh
       */
      if (mutationModePropOrContext !== "pessimistic") {
        // ====================================================================
        // UPDATE LIST CACHE
        // ====================================================================

        /**
         * 📚 OPTIMISTIC UPDATE - LIST
         *
         * Update cache của useList queries
         * VD: Danh sách posts đang hiển thị
         */
        if (optimisticUpdateMap.list) {
          queryClient.setQueriesData(
            {
              queryKey: resourceKeys
                .action("list")
                .params(preferredMeta ?? {})
                .get(),
            },
            (previous?: GetListResponse<TData> | null) => {
              // Nếu user cung cấp custom function, dùng nó
              if (typeof optimisticUpdateMap.list === "function") {
                return optimisticUpdateMap.list(previous, values, id);
              }

              // Nếu không có cache cũ, return null
              if (!previous) {
                return null;
              }

              /**
               * 📚 UPDATE LOGIC - Merge values vào record
               *
               * Tìm record có ID matching và merge values mới vào
               */
              const data = previous.data.map((record: TData) => {
                if (record.id?.toString() === id?.toString()) {
                  return {
                    id,
                    ...record, // Giữ lại fields cũ
                    ...values, // Ghi đè bằng values mới
                  } as unknown as TData;
                }
                return record;
              });

              return {
                ...previous,
                data,
              };
            },
          );
        }

        // ====================================================================
        // UPDATE MANY CACHE
        // ====================================================================

        /**
         * 📚 OPTIMISTIC UPDATE - MANY
         *
         * Tương tự list, nhưng cho useMany queries
         */
        if (optimisticUpdateMap.many) {
          queryClient.setQueriesData(
            {
              queryKey: resourceKeys.action("many").get(),
            },
            (previous?: GetManyResponse<TData> | null) => {
              if (typeof optimisticUpdateMap.many === "function") {
                return optimisticUpdateMap.many(previous, values, id);
              }

              if (!previous) {
                return null;
              }

              const data = previous.data.map((record: TData) => {
                if (record.id?.toString() === id?.toString()) {
                  record = {
                    id,
                    ...record,
                    ...values,
                  } as unknown as TData;
                }
                return record;
              });
              return {
                ...previous,
                data,
              };
            },
          );
        }

        // ====================================================================
        // UPDATE DETAIL CACHE
        // ====================================================================

        /**
         * 📚 OPTIMISTIC UPDATE - DETAIL
         *
         * Update cache của useOne query cho record này
         */
        if (optimisticUpdateMap.detail) {
          queryClient.setQueriesData(
            {
              queryKey: resourceKeys
                .action("one")
                .id(id)
                .params(preferredMeta ?? {})
                .get(),
            },
            (previous?: GetOneResponse<TData> | null) => {
              if (typeof optimisticUpdateMap.detail === "function") {
                return optimisticUpdateMap.detail(previous, values, id);
              }

              if (!previous) {
                return null;
              }

              return {
                ...previous,
                data: {
                  ...previous.data,
                  ...values,
                },
              };
            },
          );
        }
      }

      // ======================================================================
      // BƯỚC 6: Return context chứa previous queries
      // ======================================================================

      /**
       * 📚 RETURN CONTEXT - Để rollback nếu lỗi
       *
       * Context này sẽ được truyền vào onSuccess, onError, onSettled
       * Dùng để rollback cache trong onError nếu mutation thất bại
       */
      return {
        previousQueries,
      };
    },

    // ========================================================================
    // onSettled: Callback chạy SAU onSuccess/onError
    // ========================================================================

    /**
     * 📚 ON SETTLED - Cleanup sau mutation
     *
     * 🎯 CHỨC NĂNG:
     * Callback này LUÔN LUÔN chạy sau khi mutation hoàn thành
     * (bất kể thành công hay lỗi)
     *
     * Nhiệm vụ:
     * 1. Invalidate cache (để refetch data mới từ server)
     * 2. Remove mutation khỏi undoable queue
     * 3. Gọi custom onSettled callback
     */
    onSettled: (data, error, variables, context) => {
      const {
        id = idFromProps,
        resource: resourceName = resourceFromProps,
        dataProviderName = dataProviderNameFromProps,
        invalidates = invalidatesFromProps ?? ["list", "many", "detail"],
      } = variables;

      if (typeof id === "undefined") throw missingIdError;
      if (!resourceName) throw missingResourceError;

      const { identifier } = select(resourceName);

      // ======================================================================
      // INVALIDATE CACHE
      // ======================================================================

      /**
       * 📚 INVALIDATE - Làm mới cache
       *
       * 💡 TẠI SAO CẦN INVALIDATE?
       *
       * Optimistic update chỉ update cache LOCAL
       * Cần invalidate để fetch lại data THẬT từ server
       *
       * VD:
       * 1. User update title: "Old" -> "New"
       * 2. Optimistic update: Cache = "New"
       * 3. Server response: title = "New Title" (khác với "New")
       * 4. Invalidate => Refetch => Cache = "New Title" (đúng)
       */
      invalidateStore({
        resource: identifier,
        dataProviderName: pickDataProvider(
          identifier,
          dataProviderName,
          resources,
        ),
        invalidates,
        id,
      });

      // ======================================================================
      // REMOVE FROM UNDOABLE QUEUE
      // ======================================================================

      /**
       * 📚 REMOVE NOTIFICATION - Xóa khỏi undoable queue
       *
       * Sau khi mutation hoàn thành (thành công hoặc lỗi)
       * Xóa nó khỏi queue và ẩn notification "Undo"
       */
      notificationDispatch({
        type: ActionTypes.REMOVE,
        payload: { id, resource: identifier },
      });

      // Gọi custom onSettled callback
      mutationOptions?.onSettled?.(data, error, variables, context);
    },

    // ========================================================================
    // onSuccess: Callback khi mutation thành công
    // ========================================================================

    /**
     * 📚 ON SUCCESS - Xử lý khi update thành công
     *
     * Nhiệm vụ:
     * 1. Hiển thị notification "Successfully updated"
     * 2. Publish event cho realtime
     * 3. Ghi log
     * 4. Gọi custom onSuccess callback
     */
    onSuccess: (data, variables, context) => {
      const {
        id = idFromProps,
        resource: resourceName = resourceFromProps,
        successNotification = successNotificationFromProps,
        dataProviderName: dataProviderNameFromProp = dataProviderNameFromProps,
        values = valuesFromProps,
        meta = metaFromProps,
      } = variables;

      if (typeof id === "undefined") throw missingIdError;
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      const { resource, identifier } = select(resourceName);
      const resourceSingular = textTransformers.singular(identifier);

      const dataProviderName = pickDataProvider(
        identifier,
        dataProviderNameFromProp,
        resources,
      );

      const combinedMeta = getMeta({
        resource,
        meta,
      });

      // ======================================================================
      // HIỂN THỊ NOTIFICATION
      // ======================================================================

      const notificationConfig =
        typeof successNotification === "function"
          ? successNotification(data, { id, values }, identifier)
          : successNotification;

      handleNotification(notificationConfig, {
        key: `${id}-${identifier}-notification`,
        description: translate("notifications.success", "Successful"),
        message: translate(
          "notifications.editSuccess",
          {
            resource: translate(
              `${identifier}.${identifier}`,
              resourceSingular,
            ),
          },
          `Successfully updated ${resourceSingular}`,
        ),
        type: "success",
      });

      // ======================================================================
      // PUBLISH EVENT
      // ======================================================================

      /**
       * 📚 PUBLISH EVENT - Phát sóng event "updated"
       *
       * Cho realtime subscribers biết record này đã được update
       */
      publish?.({
        channel: `resources/${resource.name}`,
        type: "updated", // Event type = "updated" (khác với "created")
        payload: {
          ids: data.data?.id ? [data.data.id] : undefined,
        },
        date: new Date(),
        meta: {
          ...combinedMeta,
          dataProviderName,
        },
      });

      // ======================================================================
      // LẤY PREVIOUS DATA (để ghi log)
      // ======================================================================

      /**
       * 📚 PREVIOUS DATA - Dữ liệu trước khi update
       *
       * Lấy data cũ từ cache để so sánh với data mới trong log
       * Giúp audit trail biết fields nào đã thay đổi
       */
      let previousData: any;
      if (context) {
        const resourceKeys = keys()
          .data(pickDataProvider(identifier, dataProviderName, resources))
          .resource(identifier);

        const queryData = queryClient.getQueryData<UpdateResponse<TData>>(
          resourceKeys.action("one").id(id).get(),
        );

        // Chỉ lấy các fields có trong values
        previousData = Object.keys(values || {}).reduce<any>((acc, item) => {
          acc[item] = queryData?.data?.[item];
          return acc;
        }, {});
      }

      // ======================================================================
      // GHI LOG
      // ======================================================================

      /**
       * 📚 AUDIT LOG - Ghi lại hành động update
       *
       * Bao gồm cả previousData để biết giá trị cũ
       */
      const {
        fields: _fields,
        operation: _operation,
        variables: _variables,
        ...rest
      } = combinedMeta || {};

      log?.mutate({
        action: "update",
        resource: resource.name,
        data: values,
        previousData, // Giá trị cũ (trước khi update)
        meta: {
          ...rest,
          dataProviderName,
          id,
        },
      });

      // Gọi custom onSuccess callback
      mutationOptions?.onSuccess?.(data, variables, context);
    },

    // ========================================================================
    // onError: Callback khi mutation bị lỗi
    // ========================================================================

    /**
     * 📚 ON ERROR - Xử lý khi update thất bại
     *
     * Nhiệm vụ:
     * 1. ROLLBACK cache về trạng thái cũ (từ context.previousQueries)
     * 2. Hiển thị notification lỗi
     * 3. Gọi custom onError callback
     */
    onError: (err: TError, variables, context) => {
      const {
        id = idFromProps,
        resource: resourceName = resourceFromProps,
        errorNotification = errorNotificationFromProps,
        values = valuesFromProps,
      } = variables;

      if (typeof id === "undefined") throw missingIdError;
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      const { identifier } = select(resourceName);

      // ======================================================================
      // ROLLBACK CACHE
      // ======================================================================

      /**
       * 📚 ROLLBACK - Khôi phục cache cũ
       *
       * 💡 TẠI SAO CẦN ROLLBACK?
       *
       * Tình huống:
       * 1. User update post (optimistic)
       * 2. Cache được update ngay => UI hiển thị data mới
       * 3. Server trả về lỗi (VD: validation error)
       * 4. Phải rollback cache => UI hiển thị lại data cũ (đúng)
       *
       * Rollback bằng cách set lại cache từ previousQueries
       */
      if (context?.previousQueries) {
        for (const query of context.previousQueries) {
          queryClient.setQueryData(query[0], query[1]);
        }
      }

      // ======================================================================
      // HIỂN THỊ ERROR NOTIFICATION
      // ======================================================================

      /**
       * 📖 CHECK IF CANCELLED:
       *
       * Nếu error.message === "mutationCancelled"
       * => User click Undo (undoable mode)
       * => Không hiển thị error notification
       */
      if (err.message !== "mutationCancelled") {
        checkError?.(err);

        const resourceSingular = textTransformers.singular(identifier);

        const notificationConfig =
          typeof errorNotification === "function"
            ? errorNotification(err, { id, values }, identifier)
            : errorNotification;

        handleNotification(notificationConfig, {
          key: `${id}-${identifier}-notification`,
          message: translate(
            "notifications.editError",
            {
              resource: translate(
                `${identifier}.${identifier}`,
                resourceSingular,
              ),
              statusCode: err.statusCode,
            },
            `Error when updating ${resourceSingular} (status code: ${err.statusCode})`,
          ),
          description: err.message,
          type: "error",
        });
      }

      // Gọi custom onError callback
      mutationOptions?.onError?.(err, variables, context);
    },

    // Mutation key
    mutationKey: keys().data().mutation("update").get(),

    // Merge với custom mutation options
    ...mutationOptions,

    // Meta cho DevTools
    meta: {
      ...mutationOptions?.meta,
      ...getXRay("useUpdate"),
    },
  });

  // ============================================================================
  // PHẦN 6: XỬ LÝ MUTATION RESULT VÀ RETURN
  // ============================================================================

  const { mutate, mutateAsync } = mutationResult;

  // Theo dõi loading overtime
  const { elapsedTime } = useLoadingOvertime({
    ...overtimeOptions,
    isLoading: mutationResult.isPending,
  });

  /**
   * 📚 WRAPPER FUNCTIONS - Làm variables optional
   */
  const handleMutation = (
    variables?: UpdateParams<TData, TError, TVariables>,
    options?: MutateOptions<
      UpdateResponse<TData>,
      TError,
      UpdateParams<TData, TError, TVariables>,
      UpdateContext<TData>
    >,
  ) => {
    return mutate(variables || {}, options);
  };

  const handleMutateAsync = (
    variables?: UpdateParams<TData, TError, TVariables>,
    options?: MutateOptions<
      UpdateResponse<TData>,
      TError,
      UpdateParams<TData, TError, TVariables>,
      UpdateContext<TData>
    >,
  ) => {
    return mutateAsync(variables || {}, options);
  };

  return {
    mutation: mutationResult,
    mutate: handleMutation,
    mutateAsync: handleMutateAsync,
    overtime: { elapsedTime },
  };
};

// ============================================================================
// PHẦN 7: ERROR CONSTANTS
// ============================================================================

const missingResourceError = new Error(
  "[useUpdate]: `resource` is not defined or not matched but is required",
);

const missingIdError = new Error(
  "[useUpdate]: `id` is not defined but is required in edit and clone actions",
);

const missingValuesError = new Error(
  "[useUpdate]: `values` is not provided but is required",
);

// ============================================================================
// 🎉 KẾT THÚC FILE
// ============================================================================
//
// 📚 TÓM TẮT HOOK USEUPDATE:
//
// 1. ✅ Dùng để CẬP NHẬT dữ liệu (PUT/PATCH request)
// 2. ✅ Hỗ trợ 3 mutation modes:
//    - Pessimistic: Đợi server => an toàn nhưng chậm
//    - Optimistic: Update UI ngay => nhanh, rollback nếu lỗi
//    - Undoable: Update UI ngay + cho phép Undo => UX tốt nhất
// 3. ✅ Optimistic updates: Cập nhật cache trước khi server phản hồi
// 4. ✅ Rollback: Khôi phục cache cũ nếu update lỗi
// 5. ✅ Callbacks lifecycle:
//    - onMutate: Chạy TRƯỚC mutation (setup optimistic updates)
//    - onSuccess: Chạy khi thành công
//    - onError: Chạy khi lỗi (rollback cache)
//    - onSettled: Chạy sau onSuccess/onError (cleanup)
//
// 📖 CÁC KHÁI NIỆM ĐÃ HỌC:
// - Optimistic updates: Update UI trước khi server phản hồi
// - Rollback: Khôi phục cache cũ khi lỗi
// - Undoable mode: Cho phép user undo
// - Query Client: Quản lý cache của React Query
// - onMutate callback: Setup trước khi mutation chạy
// - onSettled callback: Cleanup sau mutation
// - Previous queries: Lưu cache cũ để rollback
// - Race condition: Conflict giữa optimistic update và query fetch
//
// 🔄 SO SÁNH USECREATE vs USEUPDATE:
//
// ┌────────────────┬────────────────┬────────────────────┐
// │                │ useCreate      │ useUpdate          │
// ├────────────────┼────────────────┼────────────────────┤
// │ HTTP Method    │ POST           │ PUT/PATCH          │
// │ Cần ID?        │ Không          │ Có (bắt buộc)      │
// │ Optimistic     │ Không          │ Có                 │
// │ Undoable       │ Không          │ Có                 │
// │ Rollback       │ Không          │ Có                 │
// │ onMutate       │ Không          │ Có                 │
// │ Use case       │ Tạo mới        │ Chỉnh sửa          │
// └────────────────┴────────────────┴────────────────────┘
//
// 💡 VÍ DỤ THỰC TẾ:
//
// ```typescript
// import { useUpdate } from "@refinedev/core";
//
// function EditPostForm({ postId }) {
//   const { mutate, isPending } = useUpdate();
//
//   const handleSubmit = (values) => {
//     mutate({
//       resource: "posts",
//       id: postId,
//       values: {
//         title: values.title,
//         content: values.content,
//       },
//       mutationMode: "optimistic", // Update UI ngay
//       // hoặc
//       mutationMode: "undoable",   // Cho phép Undo
//       undoableTimeout: 5000,      // 5 giây để Undo
//     });
//   };
//
//   return <form onSubmit={handleSubmit}>...</form>;
// }
// ```
//
// 👏 Chúc mừng! Bạn vừa hiểu cách update dữ liệu với Optimistic Updates!
// Hook tiếp theo sẽ là useResourceParams - quản lý resource và routing! 🚀
// ============================================================================
