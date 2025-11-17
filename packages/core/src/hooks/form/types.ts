// ============================================================================
// PHẦN 1: IMPORT CÁC KIỂU DỮ LIỆU TỪ REACT VÀ CÁC THƯ VIỆN KHÁC
// ============================================================================

/**
 * 📚 GIẢI THÍCH CHO NGƯỜI MỚI VỀ FILE NÀY:
 *
 * File này CHỨA TOÀN BỘ ĐỊNH NGHĨA KIỂU DỮ LIỆU (TYPES) cho hook useForm.
 *
 * Trong TypeScript:
 * - "type" = định nghĩa kiểu dữ liệu (blueprint/bản thiết kế cho dữ liệu)
 * - Giống như vẽ bản đồ trước khi xây nhà - giúp TypeScript kiểm tra lỗi
 *
 * Tại sao cần file riêng cho types?
 * - Tách biệt logic và định nghĩa -> code dễ đọc hơn
 * - Nhiều file có thể import và dùng chung các types
 * - Dễ maintain (bảo trì) và mở rộng
 */

/**
 * 📖 IMPORT TYPE - Chỉ import để kiểm tra kiểu, không import code thực tế
 *
 * "import type" khác "import" thường:
 * - import type: Chỉ dùng cho TypeScript, sẽ bị xóa khi compile sang JavaScript
 * - import: Import cả code thực tế vào bundle cuối cùng
 */

// Import từ React - các kiểu dữ liệu của React
import type { Dispatch, SetStateAction } from "react";
// - Dispatch: Kiểu cho hàm dispatch (gửi action)
// - SetStateAction: Kiểu cho action khi set state

// Import từ TanStack Query (React Query) - thư viện quản lý state bất đồng bộ
import type {
  QueryObserverResult, // Kết quả từ query observer (theo dõi query)
  UseQueryOptions, // Options (tùy chọn) cho useQuery hook
} from "@tanstack/react-query";

// Import các kiểu từ hooks khác trong Refine
import type {
  OptimisticUpdateMapType, // Map để cấu hình optimistic update
  UseUpdateProps, // Props cho hook useUpdate
  UseUpdateReturnType, // Kiểu trả về của useUpdate
} from "../data/useUpdate";

import type {
  UseCreateProps, // Props cho hook useCreate
  UseCreateReturnType, // Kiểu trả về của useCreate
} from "../data/useCreate";

import type {
  UseLoadingOvertimeOptionsProps, // Props cho loading overtime
  UseLoadingOvertimeReturnType, // Kiểu trả về của loading overtime
} from "../useLoadingOvertime";

// Import các kiểu cơ bản từ data context
import type {
  BaseKey, // Kiểu cho ID (có thể là string | number)
  BaseRecord, // Kiểu cơ bản cho record (bản ghi) - là một object
  CreateResponse, // Response khi tạo mới
  GetOneResponse, // Response khi lấy 1 record
  HttpError, // Lỗi HTTP
  IQueryKeys, // Các keys cho query cache
  MetaQuery, // Metadata cho query
  MutationMode, // Chế độ mutation (pessimistic/optimistic/undoable)
  UpdateResponse, // Response khi update
} from "../../contexts/data/types";

import type { LiveModeProps } from "../../contexts/live/types";
// LiveModeProps: Props cho chế độ live (cập nhật realtime)

import type { SuccessErrorNotification } from "../../contexts/notification/types";
// SuccessErrorNotification: Kiểu cho thông báo thành công/lỗi

import type { Action } from "../../contexts/router/types";
// Action: Các action trong router (create, edit, show, list,...)

import type { MakeOptional } from "../../definitions/types";
// MakeOptional: Utility type để biến các field bắt buộc thành optional

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA CÁC KIỂU CƠ BẢN CHO FORM
// ============================================================================

/**
 * 📖 TYPESCRIPT - Extract Utility Type:
 *
 * Extract<T, U> = Lấy ra từ T những giá trị nằm trong U
 *
 * VD: type Action = "create" | "edit" | "show" | "list" | "clone"
 *     Extract<Action, "create" | "edit" | "clone">
 *     => Kết quả: "create" | "edit" | "clone"
 *
 * Tại sao dùng Extract?
 * - Đảm bảo FormAction chỉ chứa các giá trị hợp lệ từ Action
 * - Nếu Action thay đổi, FormAction tự động cập nhật
 */

/**
 * 🎯 FormAction - Các loại action mà form có thể thực hiện
 *
 * Form chỉ có 3 action:
 * - "create": Tạo mới record
 * - "edit": Chỉnh sửa record đã tồn tại
 * - "clone": Sao chép record (tạo mới từ record cũ)
 *
 * Lưu ý: Không có "show" và "list" vì đó là action để hiển thị, không phải form
 */
export type FormAction = Extract<Action, "create" | "edit" | "clone">;

/**
 * 🎯 RedirectAction - Nơi chuyển hướng sau khi submit form thành công
 *
 * Có thể redirect đến:
 * - "create": Trang tạo mới (ít dùng)
 * - "edit": Trang edit record vừa tạo/update
 * - "list": Danh sách records
 * - "show": Trang chi tiết record
 * - false: Không redirect (ở nguyên trang hiện tại)
 *
 * VD: Sau khi tạo mới post, redirect đến trang edit của post đó
 *     Sau khi edit post, redirect về danh sách posts
 */
export type RedirectAction =
  | Extract<Action, "create" | "edit" | "list" | "show">
  | false;

// ============================================================================
// PHẦN 3: AUTO-SAVE TYPES - KIỂU DỮ LIỆU CHO TÍNH NĂNG TỰ ĐỘNG LƯU
// ============================================================================

/**
 * 🤖 AutoSaveProps - Cấu hình cho tính năng auto-save (tự động lưu)
 *
 * Auto-save giúp tự động lưu form khi user ngừng gõ
 * Giống như Google Docs - gõ xong đợi 1-2 giây là tự động lưu
 *
 * @typeParam TVariables - Kiểu dữ liệu của form values
 */
export type AutoSaveProps<TVariables> = {
  /**
   * autoSave? - Dấu "?" nghĩa là optional (không bắt buộc)
   * Nếu không truyền autoSave, tính năng auto-save sẽ bị tắt
   */
  autoSave?: {
    /**
     * enabled - Bật/tắt auto-save
     * @type boolean
     * VD: enabled: true → Bật auto-save
     */
    enabled: boolean;

    /**
     * debounce? - Thời gian chờ (ms) trước khi auto-save
     * @type number
     * @default 1000 (1 giây)
     *
     * VD: debounce: 2000 → Đợi 2 giây sau khi user ngừng gõ mới auto-save
     *
     * Tại sao cần debounce?
     * - Tránh gọi API liên tục mỗi lần gõ phím → lãng phí tài nguyên
     * - Chờ user gõ xong câu mới lưu → trải nghiệm tốt hơn
     */
    debounce?: number;

    /**
     * onFinish? - Hàm xử lý values trước khi auto-save
     * @param values - Giá trị hiện tại của form
     * @returns Giá trị đã được xử lý
     *
     * VD: onFinish: (values) => ({ ...values, updatedAt: new Date() })
     *     → Thêm timestamp vào values trước khi lưu
     */
    onFinish?: (values: TVariables) => TVariables;

    /**
     * invalidateOnUnmount? - Làm mới cache khi component bị unmount
     * @type boolean
     * @default false
     *
     * Unmount = Component bị remove khỏi DOM (VD: đóng modal, chuyển trang)
     *
     * true → Xóa cache và fetch lại data từ server lần sau
     * false → Giữ cache, dùng data cũ
     */
    invalidateOnUnmount?: boolean;

    /**
     * invalidateOnClose? - Làm mới cache khi đóng form
     * @type boolean
     * @default false
     *
     * Tương tự invalidateOnUnmount nhưng chỉ khi đóng form
     */
    invalidateOnClose?: boolean;
  };
};

/**
 * 🔄 AutoSaveReturnType - Dữ liệu trả về liên quan đến auto-save
 *
 * Hook useForm sẽ trả về các giá trị này để component có thể:
 * - Hiển thị trạng thái auto-save (đang lưu, lưu thành công, lỗi)
 * - Gọi auto-save thủ công nếu cần
 *
 * @typeParam TData - Kiểu dữ liệu response từ server
 * @typeParam TError - Kiểu lỗi HTTP
 * @typeParam TVariables - Kiểu dữ liệu form values
 */
export type AutoSaveReturnType<
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
> = {
  /**
   * autoSaveProps - Props để truyền cho AutoSave indicator component
   *
   * 📖 Pick<Type, Keys> - Utility type lấy ra một số field từ Type
   *
   * VD: type User = { id: number, name: string, email: string }
   *     Pick<User, "name" | "email"> → { name: string, email: string }
   *
   * Ở đây lấy 3 fields từ mutation: data, error, status
   */
  autoSaveProps: Pick<
    UseUpdateReturnType<TData, TError, TVariables>["mutation"],
    "data" | "error" | "status"
  >;
  // data: Dữ liệu trả về nếu auto-save thành công
  // error: Lỗi nếu auto-save thất bại
  // status: Trạng thái ("idle" | "pending" | "success" | "error")

  /**
   * onFinishAutoSave - Hàm để gọi auto-save thủ công
   *
   * @param values - Dữ liệu form cần lưu
   * @returns Promise - Có thể await để đợi kết quả
   *
   * VD: await onFinishAutoSave(formValues)
   */
  onFinishAutoSave: (
    values: TVariables,
  ) => Promise<UpdateResponse<TData> | void>;
  // UpdateResponse<TData>: Response từ server khi update thành công
  // void: Không có giá trị trả về (khi optimistic mode)
};

/**
 * 🎨 AutoSaveIndicatorElements - Các React elements để hiển thị trạng thái auto-save
 *
 * 📖 Partial<Type> - Utility type biến tất cả fields thành optional
 *
 * VD: type User = { name: string, email: string }
 *     Partial<User> → { name?: string, email?: string }
 *
 * 📖 Record<Keys, Type> - Tạo object type với keys cho trước
 *
 * VD: Record<"success" | "error", string>
 *     → { success: string, error: string }
 *
 * Type này cho phép customize UI cho từng trạng thái:
 * - success: Hiển thị khi auto-save thành công (VD: ✓ Đã lưu)
 * - error: Hiển thị khi auto-save thất bại (VD: ✗ Lỗi)
 * - loading: Hiển thị khi đang auto-save (VD: ⟳ Đang lưu...)
 * - idle: Hiển thị khi không làm gì (VD: không hiện gì)
 */
export type AutoSaveIndicatorElements = Partial<
  Record<"success" | "error" | "loading" | "idle", React.ReactNode>
>;
// React.ReactNode: Bất kỳ thứ gì có thể render trong React
// (string, number, JSX element, null, undefined,...)

// ============================================================================
// PHẦN 4: ACTION PARAMS - THAM SỐ ACTION
// ============================================================================

/**
 * 🎬 ActionParams - Tham số để xác định loại form
 *
 * Chỉ có 1 field: action (create/edit/clone)
 */
export type ActionParams = {
  /**
   * action? - Loại action của form
   * @type FormAction ("create" | "edit" | "clone")
   * @default Đọc từ route, nếu không có thì dùng "create"
   *
   * VD: Nếu URL là /posts/123/edit → action tự động là "edit"
   *     Nếu URL là /posts/create → action tự động là "create"
   *     Nếu truyền action="clone" → override action từ URL
   */
  action?: FormAction;
};

// ============================================================================
// PHẦN 5: ACTION FORM PROPS - PROPS CHO FORM DỰA TRÊN ACTION
// ============================================================================

/**
 * 📝 ActionFormProps - Tất cả props cho form (QUAN TRỌNG NHẤT!)
 *
 * Type này chứa TẤT CẢ các props có thể truyền vào useForm hook
 * Đây là "bản thiết kế đầy đủ" cho form configuration
 *
 * Generic Types (Tham số kiểu):
 * @typeParam TQueryFnData - Dữ liệu thô từ API khi query (lấy data)
 * @typeParam TError - Kiểu lỗi HTTP
 * @typeParam TVariables - Dữ liệu gửi lên khi submit form
 * @typeParam TData - Dữ liệu đã xử lý từ TQueryFnData
 * @typeParam TResponse - Dữ liệu trả về từ mutation (create/update)
 * @typeParam TResponseError - Kiểu lỗi khi mutation thất bại
 */
type ActionFormProps<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
  TData extends BaseRecord = TQueryFnData,
  TResponse extends BaseRecord = TData,
  TResponseError extends HttpError = TError,
> = {
  /**
   * resource? - Tên resource để tương tác với API
   * @type string
   * @default Đọc từ route
   *
   * VD: resource="posts" → Gọi API đến /posts endpoint
   *
   * Tại sao optional?
   * - Thường đọc tự động từ URL
   * - Chỉ truyền khi muốn override hoặc khi không có trong URL
   */
  resource?: string;

  /**
   * id? - ID của record cần fetch (khi edit/clone)
   * @type BaseKey (string | number)
   * @default Đọc từ URL
   *
   * VD: Nếu URL là /posts/123/edit → id tự động là 123
   *     Nếu truyền id={456} → override, dùng 456
   */
  id?: BaseKey;

  /**
   * redirect? - Nơi chuyển hướng sau khi submit thành công
   * @type "show" | "edit" | "list" | "create" | false
   * @default "list"
   *
   * VD: redirect="edit" → Sau khi tạo mới, redirect đến trang edit
   *     redirect={false} → Không redirect, ở nguyên trang
   */
  redirect?: RedirectAction;

  /**
   * meta? - Metadata chung cho cả query và mutation
   * @type MetaQuery
   *
   * Metadata là dữ liệu bổ sung gửi kèm request
   * VD: meta={{ headers: { "X-Custom": "value" } }}
   *     meta={{ locale: "vi" }}
   */
  meta?: MetaQuery;

  /**
   * queryMeta? - Metadata riêng cho useOne query
   * @type MetaQuery
   *
   * Chỉ áp dụng cho query (fetch data khi edit/clone)
   * VD: queryMeta={{ fields: ["id", "name"] }} → Chỉ lấy 2 fields
   */
  queryMeta?: MetaQuery;

  /**
   * mutationMeta? - Metadata riêng cho mutation (create/update)
   * @type MetaQuery
   *
   * Chỉ áp dụng cho mutation (submit form)
   * VD: mutationMeta={{ notify: true }} → Bật notification
   */
  mutationMeta?: MetaQuery;

  /**
   * mutationMode? - Chế độ thực thi mutation
   * @type "pessimistic" | "optimistic" | "undoable"
   * @default "pessimistic"
   *
   * 3 chế độ:
   *
   * 1. PESSIMISTIC (Bi quan - Chờ server):
   *    - Đợi server response mới cập nhật UI
   *    - Redirect sau khi server confirm
   *    - An toàn nhưng chậm
   *
   * 2. OPTIMISTIC (Lạc quan - Cập nhật ngay):
   *    - Cập nhật UI ngay lập tức
   *    - Redirect ngay không đợi
   *    - Nhanh nhưng có thể cần rollback nếu lỗi
   *
   * 3. UNDOABLE (Có thể hoàn tác):
   *    - Cập nhật UI + hiện nút Undo
   *    - Gửi request sau vài giây nếu không undo
   *    - Redirect ngay
   *
   * Link doc: https://refine.dev/docs/advanced-tutorials/mutation-mode/
   */
  mutationMode?: MutationMode;

  /**
   * onMutationSuccess? - Callback khi mutation thành công
   * @param data - Response từ server
   * @param variables - Dữ liệu đã gửi lên
   * @param context - Context từ React Query
   * @param isAutoSave - Có phải auto-save không
   *
   * VD: onMutationSuccess: (data) => {
   *       console.log("Đã lưu:", data)
   *       showNotification("Lưu thành công!")
   *     }
   */
  onMutationSuccess?: (
    data: CreateResponse<TResponse> | UpdateResponse<TResponse>,
    variables: TVariables,
    context: any,
    isAutoSave?: boolean,
  ) => void;

  /**
   * onMutationError? - Callback khi mutation thất bại
   * @param error - Lỗi từ server
   * @param variables - Dữ liệu đã gửi lên
   * @param context - Context từ React Query
   * @param isAutoSave - Có phải auto-save không
   *
   * VD: onMutationError: (error) => {
   *       console.error("Lỗi:", error)
   *       showNotification("Lưu thất bại!")
   *     }
   */
  onMutationError?: (
    error: TResponseError,
    variables: TVariables,
    context: any,
    isAutoSave?: boolean,
  ) => void;

  /**
   * undoableTimeout? - Thời gian chờ undo (ms) khi mutationMode="undoable"
   * @type number
   * @default 5000 (5 giây)
   *
   * VD: undoableTimeout={3000} → Chờ 3 giây, nếu không undo thì gửi request
   */
  undoableTimeout?: number;

  /**
   * dataProviderName? - Tên data provider (khi có nhiều data sources)
   * @type string
   *
   * VD: Nếu app có 2 APIs (REST API + GraphQL)
   *     dataProviderName="graphql" → Dùng GraphQL provider
   */
  dataProviderName?: string;

  /**
   * invalidates? - Các queries cần làm mới (invalidate) sau mutation
   * @type Array<keyof IQueryKeys>
   * @default ["list", "many", "detail"]
   *
   * Sau khi create/update, cache của các queries này sẽ bị xóa
   * → Lần sau fetch sẽ lấy data mới từ server
   *
   * Các giá trị có thể:
   * - "all": Xóa tất cả cache
   * - "resourceAll": Xóa cache của resource này
   * - "list": Xóa cache của danh sách
   * - "many": Xóa cache của getMany
   * - "detail": Xóa cache của getOne
   * - false: Không xóa cache nào
   *
   * VD: invalidates={["list"]} → Chỉ làm mới danh sách
   */
  invalidates?: Array<keyof IQueryKeys>;

  /**
   * queryOptions? - Options cho React Query's useQuery (dùng trong edit mode)
   * @type UseQueryOptions
   *
   * 📖 MakeOptional - Biến một số field thành optional
   * Ở đây queryFn và queryKey là optional vì Refine tự generate
   *
   * Các options phổ biến:
   * - enabled: Bật/tắt query
   * - refetchOnWindowFocus: Fetch lại khi focus vào window
   * - staleTime: Thời gian data được coi là "tươi"
   * - cacheTime: Thời gian giữ cache
   *
   * VD: queryOptions={{ enabled: false }} → Tắt auto-fetch
   *     queryOptions={{ staleTime: 5000 }} → Cache valid trong 5s
   *
   * Link doc: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
   */
  queryOptions?: MakeOptional<
    UseQueryOptions<
      GetOneResponse<TQueryFnData>,
      TError,
      GetOneResponse<TData>
    >,
    "queryFn" | "queryKey"
  >;

  /**
   * createMutationOptions? - Options cho useCreate mutation
   * @type UseMutationOptions
   *
   * Chỉ áp dụng khi action là "create" hoặc "clone"
   *
   * VD: createMutationOptions={{ onSuccess: () => {} }}
   *
   * Link doc: https://tanstack.com/query/v5/docs/framework/react/reference/useMutation
   */
  createMutationOptions?: UseCreateProps<
    TResponse,
    TResponseError,
    TVariables
  >["mutationOptions"];

  /**
   * updateMutationOptions? - Options cho useUpdate mutation
   * @type UseMutationOptions
   *
   * Chỉ áp dụng khi action là "edit"
   *
   * VD: updateMutationOptions={{ onSuccess: () => {} }}
   */
  updateMutationOptions?: UseUpdateProps<
    TResponse,
    TResponseError,
    TVariables
  >["mutationOptions"];

  /**
   * optimisticUpdateMap? - Cấu hình cách update optimistic
   * @type OptimisticUpdateMapType
   * @default { list: true, many: true, detail: true }
   *
   * Khi mutationMode="optimistic", config này quyết định:
   * - Queries nào sẽ được update ngay lập tức (optimistic update)
   * - Queries nào chờ server response
   *
   * VD: optimisticUpdateMap={{ list: false, detail: true }}
   *     → Chi tiết update ngay, danh sách chờ server
   *
   * Link doc: https://refine.dev/docs/api-reference/core/hooks/data/useUpdateMany/#optimisticupdatemap
   */
  optimisticUpdateMap?: OptimisticUpdateMapType<TResponse, TVariables>;
} /**
 * 📖 TYPESCRIPT - Intersection Types với "&":
 *
 * Type A & B = Kết hợp A và B, object phải có tất cả props của cả 2
 *
 * VD: type A = { name: string }
 *     type B = { age: number }
 *     type C = A & B → { name: string, age: number }
 */ & SuccessErrorNotification<
  // Type này thêm các props:
  // - successNotification: Config cho notification thành công
  // - errorNotification: Config cho notification lỗi
  UpdateResponse<TResponse> | CreateResponse<TResponse>,
  TResponseError,
  { id: BaseKey; values: TVariables } | TVariables
> &
  ActionParams & // Thêm field: action
  LiveModeProps; // Thêm fields: liveMode, onLiveEvent, liveParams

// ============================================================================
// PHẦN 6: USE FORM PROPS - PROPS CHÍNH CHO HOOK USEFORM
// ============================================================================

/**
 * 🎯 UseFormProps - Props đầy đủ cho hook useForm
 *
 * Type này kết hợp TẤT CẢ props có thể từ:
 * - ActionFormProps: Resource, redirect, metadata, callbacks,...
 * - ActionParams: action
 * - LiveModeProps: Live mode config
 * - UseLoadingOvertimeOptionsProps: Overtime options
 * - AutoSaveProps: Auto-save config
 *
 * Đây là type được dùng trong khai báo hàm useForm:
 * export const useForm = <...>(props: UseFormProps<...>) => { ... }
 */
export type UseFormProps<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
  TData extends BaseRecord = TQueryFnData,
  TResponse extends BaseRecord = TData,
  TResponseError extends HttpError = TError,
> = ActionFormProps<
  TQueryFnData,
  TError,
  TVariables,
  TData,
  TResponse,
  TResponseError
> &
  ActionParams &
  LiveModeProps &
  UseLoadingOvertimeOptionsProps &
  AutoSaveProps<TVariables>;

// ============================================================================
// PHẦN 7: USE FORM RETURN TYPE - KIỂU DỮ LIỆU TRẢ VỀ CỦA USEFORM
// ============================================================================

/**
 * 🎁 UseFormReturnType - Dữ liệu trả về từ hook useForm
 *
 * Khi gọi useForm, bạn nhận được một object chứa:
 * - Dữ liệu: id, query result, mutation result
 * - Hàm: setId, onFinish, redirect, onFinishAutoSave
 * - Trạng thái: formLoading, overtime, autoSaveProps
 *
 * VD sử dụng:
 * const {
 *   formLoading,
 *   onFinish,
 *   query,
 *   mutation,
 * } = useForm({ resource: "posts" })
 */
export type UseFormReturnType<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
  TData extends BaseRecord = TQueryFnData,
  TResponse extends BaseRecord = TData,
  TResponseError extends HttpError = TError,
> = {
  /**
   * id? - ID của record hiện tại (khi edit/clone)
   * @type BaseKey | undefined
   *
   * undefined khi create (chưa có ID)
   * number | string khi edit/clone
   */
  id?: BaseKey;

  /**
   * setId - Hàm để set ID thủ công
   * @type Dispatch<SetStateAction<BaseKey | undefined>>
   *
   * 📖 Dispatch<SetStateAction<T>> - Kiểu của setState function
   *
   * VD: setId(123) → Set ID = 123
   *     setId(prevId => prevId + 1) → Set ID = ID cũ + 1
   *     setId(undefined) → Xóa ID
   */
  setId: Dispatch<SetStateAction<BaseKey | undefined>>;

  /**
   * query? - Kết quả của useOne query (khi edit/clone)
   * @type QueryObserverResult
   *
   * Chứa thông tin:
   * - data: Dữ liệu từ server
   * - isLoading: Đang fetch không
   * - isFetching: Đang fetch lại không
   * - error: Lỗi (nếu có)
   * - refetch: Hàm để fetch lại
   * - và nhiều fields khác
   *
   * undefined khi action="create" (không cần query)
   */
  query?: QueryObserverResult<GetOneResponse<TData>, TError>;

  /**
   * mutation - Object mutation từ React Query
   * @type UseUpdateReturnType["mutation"] | UseCreateReturnType["mutation"]
   *
   * 📖 Union type với "|" - Có thể là UpdateMutation HOẶC CreateMutation
   *
   * Tùy vào action:
   * - action="edit" → UpdateMutation
   * - action="create" hoặc "clone" → CreateMutation
   *
   * Chứa thông tin:
   * - data: Response từ server (nếu thành công)
   * - error: Lỗi (nếu thất bại)
   * - isPending: Đang submit không
   * - status: "idle" | "pending" | "success" | "error"
   * - và nhiều fields khác
   */
  mutation:
    | UseUpdateReturnType<TResponse, TResponseError, TVariables>["mutation"]
    | UseCreateReturnType<TResponse, TResponseError, TVariables>["mutation"];

  /**
   * formLoading - Trạng thái loading của form
   * @type boolean
   *
   * true khi:
   * - Query đang fetch data (edit/clone mode)
   * - Mutation đang submit
   *
   * false khi:
   * - Không có gì đang chạy
   *
   * VD: formLoading && <Spinner />
   */
  formLoading: boolean;

  /**
   * onFinish - Hàm chính để submit form
   * @param values - Dữ liệu form
   * @returns Promise - Có thể await
   *
   * Hàm này xử lý toàn bộ logic submit:
   * - Validate
   * - Gọi API (create hoặc update)
   * - Redirect
   * - Invalidate cache
   * - Show notification
   *
   * VD: const handleSubmit = () => {
   *       onFinish({ name: "John", email: "john@example.com" })
   *     }
   *
   * Hoặc với await:
   *     const data = await onFinish(values)
   */
  onFinish: (
    values: TVariables,
  ) => Promise<CreateResponse<TResponse> | UpdateResponse<TResponse> | void>;
  // void: Không có response (khi optimistic mode)

  /**
   * redirect - Hàm để redirect người dùng thủ công
   * @param redirect - Nơi muốn redirect đến
   * @param idFromFunction - ID của record (optional)
   * @param routeParams - Params bổ sung cho route
   *
   * VD: redirect("list") → Redirect đến danh sách
   *     redirect("edit", 123) → Redirect đến trang edit của record 123
   *     redirect("show", id, { tab: "details" }) → Redirect kèm params
   */
  redirect: (
    redirect: RedirectAction,
    idFromFunction?: BaseKey | undefined,
    routeParams?: Record<string, string | number>,
  ) => void;
} & UseLoadingOvertimeReturnType & // Thêm: elapsedTime
  AutoSaveReturnType<TResponse, TResponseError, TVariables>;
// Thêm: autoSaveProps, onFinishAutoSave

// ============================================================================
// PHẦN 8: FORM WITH SYNC WITH LOCATION PARAMS
// ============================================================================

/**
 * 🔗 FormWithSyncWithLocationParams - Params để đồng bộ form với URL
 *
 * Tính năng này cho phép:
 * - Lưu trạng thái form vào URL (query params)
 * - Khôi phục form từ URL khi reload
 * - Share link với filter/sort đã apply
 *
 * VD: URL: /posts?posts-list.search=hello&posts-list.page=2
 *     → Form tự động load với search="hello" và page=2
 */
export type FormWithSyncWithLocationParams = {
  /**
   * syncWithLocation? - Bật/tắt đồng bộ với URL
   * @type boolean | { key?: string, syncId?: boolean }
   *
   * 3 cách dùng:
   *
   * 1. syncWithLocation={true}
   *    → Bật đồng bộ với key mặc định: `${resource.name}-${action}`
   *    VD: Key = "posts-list"
   *
   * 2. syncWithLocation={{ key: "myForm" }}
   *    → Bật đồng bộ với custom key
   *    VD: URL sẽ có ?myForm.search=hello
   *
   * 3. syncWithLocation={{ syncId: true }}
   *    → Đồng bộ cả ID vào URL
   *    VD: URL sẽ có ?posts-edit.id=123
   *
   * false hoặc không truyền → Tắt đồng bộ
   */
  syncWithLocation?:
    | boolean
    | {
        /**
         * key? - Custom key cho query params
         * @default `${resource.name}-${action}`
         */
        key?: string;

        /**
         * syncId? - Có đồng bộ ID vào URL không
         * @default false
         */
        syncId?: boolean;
      };
};

// ============================================================================
// 🎉 KẾT THÚC FILE TYPES
// ============================================================================

/**
 * 🎊 CHÚC MỪNG BẠN ĐÃ HOÀN THÀNH!
 *
 * Bạn vừa tìm hiểu về tất cả kiểu dữ liệu (types) cho hook useForm.
 *
 * 📚 TÓM TẮT CÁC TYPE CHÍNH:
 *
 * 1️⃣ FormAction - 3 loại form: create, edit, clone
 * 2️⃣ RedirectAction - Nơi chuyển hướng sau submit
 * 3️⃣ AutoSaveProps - Config cho auto-save
 * 4️⃣ AutoSaveReturnType - Data trả về liên quan auto-save
 * 5️⃣ ActionParams - Tham số action
 * 6️⃣ UseFormProps - TẤT CẢ props truyền vào useForm
 * 7️⃣ UseFormReturnType - TẤT CẢ data useForm trả về
 * 8️⃣ FormWithSyncWithLocationParams - Config đồng bộ URL
 *
 * 🔑 ĐIỂM QUAN TRỌNG:
 *
 * ✅ Types giúp TypeScript kiểm tra lỗi trước khi chạy
 * ✅ Generic types (<T>) giúp code linh hoạt với nhiều kiểu data
 * ✅ Utility types (Pick, Partial, Extract) giúp tái sử dụng types
 * ✅ Union (|) và Intersection (&) giúp kết hợp types
 *
 * 💡 LỜI KHUYÊN:
 *
 * - Đọc lại nhiều lần để hiểu sâu hơn
 * - Thử nghiệm trong code editor để thấy autocomplete
 * - Hover chuột vào types để xem định nghĩa
 * - Đọc kèm file index.ts để thấy cách sử dụng thực tế
 *
 * 🚀 BƯỚC TIẾP THEO:
 *
 * 1. Đọc file index.ts để xem implementation
 * 2. Thử tạo một form đơn giản với useForm
 * 3. Thử nghiệm các props khác nhau
 * 4. Đọc docs chính thức: https://refine.dev/docs/data/hooks/use-form
 *
 * Chúc bạn học tốt! 📖✨
 */
