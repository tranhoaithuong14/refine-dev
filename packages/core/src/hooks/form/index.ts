// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// Import thư viện React - thư viện chính để xây dựng giao diện người dùng
import React from "react";

// Import công cụ cảnh báo - chỉ hiển thị cảnh báo 1 lần để tránh spam console
import warnOnce from "warn-once";

// Import các custom hooks (hooks tự định nghĩa) từ thư mục @hooks
// Hooks là các hàm đặc biệt trong React cho phép bạn "hook vào" các tính năng của React
import {
  useMeta, // Hook để lấy metadata (thông tin bổ sung)
  useOne, // Hook để lấy 1 bản ghi từ API
  useCreate, // Hook để tạo mới dữ liệu
  useUpdate, // Hook để cập nhật dữ liệu
  useResourceParams, // Hook để lấy thông tin resource (nguồn dữ liệu)
  useInvalidate, // Hook để làm mới cache dữ liệu
  useMutationMode, // Hook để lấy chế độ mutation (thay đổi dữ liệu)
  useRefineOptions, // Hook để lấy cấu hình của Refine
  useLoadingOvertime, // Hook để theo dõi thời gian loading
  useWarnAboutChange, // Hook để cảnh báo khi có thay đổi chưa lưu
  useRedirectionAfterSubmission, // Hook để xử lý chuyển hướng sau khi submit form
} from "@hooks";

// Import các hàm helper (hàm hỗ trợ)
import {
  redirectPage, // Hàm xử lý logic chuyển hướng trang
  asyncDebounce, // Hàm trì hoãn thực thi để tránh gọi API liên tục (dùng cho auto-save)
  deferExecution, // Hàm trì hoãn thực thi một hành động
} from "@definitions/helpers";

// ============================================================================
// PHẦN 2: IMPORT CÁC KIỂU DỮ LIỆU (TYPES) - ĐẶC TRƯNG CỦA TYPESCRIPT
// ============================================================================

// Từ khóa "type" trong TypeScript dùng để định nghĩa kiểu dữ liệu
// "import type" nghĩa là chỉ import để dùng cho việc kiểm tra kiểu, không import code thực tế
import type { UpdateParams } from "../data/useUpdate";
import type { UseCreateParams } from "../data/useCreate";
import type { UseFormProps, UseFormReturnType } from "./types";
import type {
  BaseKey, // Kiểu dữ liệu cho ID (có thể là string hoặc number)
  BaseRecord, // Kiểu dữ liệu cơ bản cho 1 bản ghi (record) - là 1 object
  CreateResponse, // Kiểu dữ liệu cho response khi tạo mới
  HttpError, // Kiểu dữ liệu cho lỗi HTTP
  UpdateResponse, // Kiểu dữ liệu cho response khi cập nhật
} from "../../contexts/data/types";

// ============================================================================
// PHẦN 3: EXPORT (XUẤT) CÁC KIỂU DỮ LIỆU ĐỂ CÁC FILE KHÁC SỬ DỤNG
// ============================================================================

// "export" nghĩa là cho phép các file khác import và sử dụng các type này
export type {
  ActionParams, // Tham số cho các action (hành động)
  UseFormProps, // Props (thuộc tính) của hook useForm
  UseFormReturnType, // Kiểu dữ liệu trả về của useForm
  AutoSaveIndicatorElements, // Các phần tử hiển thị trạng thái auto-save
  AutoSaveProps, // Props cho tính năng auto-save
  AutoSaveReturnType, // Kiểu dữ liệu trả về của auto-save
  FormAction, // Loại action của form (create/edit/clone)
  RedirectAction, // Loại redirect (chuyển hướng)
  FormWithSyncWithLocationParams, // Tham số để đồng bộ form với URL
} from "./types";

// ============================================================================
// PHẦN 4: KHAI BÁO HÀM USEFORM - HOOK CHÍNH
// ============================================================================

/**
 * 📚 GIẢI THÍCH CHO NGƯỜI MỚI:
 *
 * Hook này là "trung tâm điều phối" cho các form trong Refine.
 * Nó giúp bạn tạo mới, chỉnh sửa, và sao chép dữ liệu một cách dễ dàng.
 *
 * Các tính năng chính:
 * - Tự động gọi API để lấy dữ liệu khi edit/clone
 * - Xử lý việc tạo mới hoặc cập nhật dữ liệu
 * - Tự động chuyển hướng sau khi submit
 * - Hỗ trợ auto-save (tự động lưu)
 * - Cảnh báo khi rời trang mà chưa lưu
 * - Làm mới cache dữ liệu sau khi thay đổi
 *
 * @see {@link https://refine.dev/docs/data/hooks/use-form} - Tài liệu chi tiết
 *
 * 📖 GIẢI THÍCH CÁC THAM SỐ GENERIC (TYPESCRIPT):
 * Generic giống như "biến kiểu dữ liệu" - cho phép hook này làm việc với nhiều loại dữ liệu khác nhau
 *
 * @typeParam TQueryFnData - Dữ liệu thô trả về từ API khi query (lấy dữ liệu)
 *                           VD: { id: 1, name: "John", email: "john@example.com" }
 *
 * @typeParam TError - Kiểu dữ liệu cho lỗi HTTP
 *                     VD: { statusCode: 404, message: "Not found" }
 *
 * @typeParam TVariables - Dữ liệu gửi lên khi submit form
 *                         VD: { name: "John", email: "john@example.com" }
 *
 * @typeParam TData - Dữ liệu sau khi đã xử lý/transform (mặc định giống TQueryFnData)
 *                    VD: có thể chỉ lấy một số field cần thiết từ TQueryFnData
 *
 * @typeParam TResponse - Dữ liệu trả về từ mutation (create/update)
 *                        VD: { id: 1, name: "John", createdAt: "2024-01-01" }
 *
 * @typeParam TResponseError - Kiểu lỗi khi mutation thất bại (mặc định giống TError)
 */

// "export const" nghĩa là tạo một hằng số và cho phép các file khác import
// Dấu "=" ở đây gán một hàm cho biến useForm
export const useForm = <
  // Đây là phần khai báo Generic Types - cho phép hook này linh hoạt với nhiều kiểu dữ liệu
  // "extends" nghĩa là kiểu này phải kế thừa/tuân theo một kiểu cơ bản
  // Dấu "=" là giá trị mặc định nếu không truyền vào
  TQueryFnData extends BaseRecord = BaseRecord, // Dữ liệu query phải là object, mặc định là BaseRecord
  TError extends HttpError = HttpError, // Lỗi phải là HttpError
  TVariables = {}, // Biến form, mặc định là object rỗng
  TData extends BaseRecord = TQueryFnData, // Dữ liệu đã xử lý, mặc định giống dữ liệu query
  TResponse extends BaseRecord = TData, // Response từ mutation, mặc định giống TData
  TResponseError extends HttpError = TError, // Lỗi mutation, mặc định giống TError
>(
  // Tham số đầu vào của hook - là 1 object chứa các cấu hình
  // Dấu "= {}" nghĩa là nếu không truyền gì vào, mặc định là object rỗng
  props: UseFormProps<
    TQueryFnData,
    TError,
    TVariables,
    TData,
    TResponse,
    TResponseError
  > = {},
): UseFormReturnType<
  // Đây là kiểu dữ liệu mà hook này sẽ trả về
  // UseFormReturnType định nghĩa cấu trúc của object được return
  TQueryFnData,
  TError,
  TVariables,
  TData,
  TResponse,
  TResponseError
> => {
  // Dấu "=> {" bắt đầu phần thân hàm (function body)
  // ============================================================================
  // PHẦN 5: GỌI CÁC HOOKS VÀ THIẾT LẬP BAN ĐẦU
  // ============================================================================

  // 📌 LƯU Ý: Trong React, hooks phải được gọi ở đầu component/hook và không được gọi trong if/loop

  // Lấy hàm để get metadata (thông tin bổ sung như params, filters,...)
  const getMeta = useMeta();

  // Lấy hàm để invalidate (làm mới) cache - xóa dữ liệu cũ để fetch lại từ server
  const invalidate = useInvalidate();

  // Destructuring (tách) object để lấy giá trị redirect mặc định từ cấu hình
  // Syntax "{ redirect: defaultRedirect }" nghĩa là lấy field "redirect" và đổi tên thành "defaultRedirect"
  const { redirect: defaultRedirect } = useRefineOptions();

  /**
   * 🧠 useMutationMode - Hook lấy "chiến lược" cập nhật dữ liệu mặc định cho toàn app
   *
   * React Query/Refine hỗ trợ 3 mutation mode chính:
   * - pessimistic: UI đợi server phản hồi rồi mới cập nhật (an toàn, nhưng chậm cảm giác)
   * - optimistic: UI cập nhật ngay lập tức, nếu server lỗi thì rollback lại (trải nghiệm tốt hơn, cần cẩn thận xử lý lỗi)
   * - undoable: UI cập nhật ngay, nhưng cho phép user undo trong một khoảng thời gian ngắn
   *
   * useMutationMode trả về một object { mutationMode } lấy từ context Refine (cấu hình global).
   * Ở đây dùng destructuring với alias:
   *   const { mutationMode: defaultMutationMode } = useMutationMode();
   * - "mutationMode: defaultMutationMode" nghĩa là lấy field mutationMode và đổi tên thành defaultMutationMode
   *   để phân biệt với mutationMode của riêng form (có thể được truyền qua props).
   */
  const { mutationMode: defaultMutationMode } = useMutationMode();

  // Lấy hàm để bật/tắt cảnh báo khi user rời trang mà chưa lưu thay đổi
  const { setWarnWhen } = useWarnAboutChange();

  // Lấy hàm xử lý redirect sau khi submit form thành công
  const handleSubmitWithRedirect = useRedirectionAfterSubmission();

  // Lấy metadata từ props (nếu user truyền vào)
  const pickedMeta = props.meta;

  // Xác định mutation mode: ưu tiên từ props, nếu không có thì dùng mặc định
  // Toán tử "??" (nullish coalescing) = lấy giá trị bên phải nếu bên trái là null/undefined
  const mutationMode = props.mutationMode ?? defaultMutationMode;

  // ============================================================================
  // PHẦN 6: LẤY THÔNG TIN RESOURCE VÀ ACTION
  // ============================================================================

  // useResourceParams là một hook giúp lấy/xử lý thông tin về resource và action
  // Nó tự động lấy từ URL hoặc từ props
  const {
    id, // ID của record đang edit/clone (VD: 123)
    setId, // Hàm để set ID (thay đổi ID)
    resource, // Object chứa thông tin resource (VD: { name: "posts", ... })
    identifier, // Tên của resource dạng string (VD: "posts")
    formAction: action, // Action hiện tại: "create" | "edit" | "clone"
  } = useResourceParams({
    resource: props.resource, // Resource từ props (nếu có)
    id: props.id, // ID từ props (nếu có)
    action: props.action, // Action từ props (nếu có)
  });

  // ============================================================================
  // PHẦN 7: QUẢN LÝ STATE (TRẠNG THÁI) VỚI USESTATE
  // ============================================================================

  // 📖 REACT HOOK - useState:
  // useState là hook để tạo state (trạng thái) trong functional component
  // Syntax: const [giáTrị, hàmĐểThayĐổiGiáTrị] = React.useState(giáTrịBanĐầu)
  //
  // State là dữ liệu có thể thay đổi và khi thay đổi sẽ làm component re-render (vẽ lại)
  // Khác với biến thường (const/let), khi state thay đổi React sẽ cập nhật UI tự động

  // State để theo dõi xem đã auto-save chưa
  // false = chưa auto-save, true = đã auto-save ít nhất 1 lần
  const [autosaved, setAutosaved] = React.useState(false);

  // ============================================================================
  // PHẦN 8: XÁC ĐỊNH LOẠI ACTION (BOOLEAN FLAGS)
  // ============================================================================

  // Tạo các biến boolean để dễ kiểm tra action hiện tại là gì
  const isEdit = action === "edit"; // true nếu đang edit record
  const isClone = action === "clone"; // true nếu đang clone (sao chép) record
  const isCreate = action === "create"; // true nếu đang tạo mới record

  // ============================================================================
  // PHẦN 9: KẾT HỢP METADATA
  // ============================================================================

  // Gọi hàm getMeta để kết hợp metadata từ nhiều nguồn
  // Metadata thường chứa thông tin như: filters, sorters, pagination, custom params,...
  const combinedMeta = getMeta({
    resource, // Resource hiện tại
    meta: pickedMeta, // Meta từ props (nếu có)
  });

  // ============================================================================
  // PHẦN 10: VALIDATION (KIỂM TRA) ĐIỀU KIỆN
  // ============================================================================

  // Kiểm tra xem ID có bắt buộc không
  // ID bắt buộc khi: (đang edit HOẶC clone) VÀ đã truyền resource từ props
  const isIdRequired = (isEdit || isClone) && Boolean(props.resource);

  // Kiểm tra xem ID đã được định nghĩa chưa
  // typeof kiểm tra kiểu dữ liệu, !== "undefined" nghĩa là khác undefined
  const isIdDefined = typeof props.id !== "undefined";

  // Kiểm tra xem query có bị disabled (vô hiệu hóa) không
  // Optional chaining "?." = nếu queryOptions là null/undefined thì không lỗi, trả về undefined
  const isQueryDisabled = props.queryOptions?.enabled === false;

  /**
   * 📢 CẢNH BÁO TRONG CHẾ ĐỘ DEVELOPMENT
   *
   * Khi user truyền custom resource qua props, ID sẽ không tự động lấy từ URL
   * để tránh request sai. Trong trường hợp này, ID phải được truyền qua props.
   * Nếu thiếu ID, một cảnh báo sẽ hiện trong console (chỉ hiện 1 lần)
   */
  warnOnce(
    // Điều kiện hiện cảnh báo: ID bắt buộc NHƯNG chưa định nghĩa VÀ query không bị disabled
    isIdRequired && !isIdDefined && !isQueryDisabled,
    // Nội dung cảnh báo
    idWarningMessage(action, identifier, id),
  );

  // ============================================================================
  // PHẦN 11: XÁC ĐỊNH REDIRECT (CHUYỂN HƯỚNG) SAU KHI SUBMIT
  // ============================================================================

  /**
   * Xác định action để redirect sau khi submit form thành công
   *
   * VD: Sau khi tạo mới một post, redirect đến trang "edit" của post đó
   *     Sau khi edit một post, redirect đến trang "list" của posts
   */
  const redirectAction = redirectPage({
    redirectFromProps: props.redirect, // Redirect từ props (ưu tiên cao nhất)
    action, // Action hiện tại
    redirectOptions: defaultRedirect, // Redirect mặc định từ config
  });

  /**
   * 📚 HÀM REDIRECT - Dùng để chuyển hướng người dùng
   *
   * Hàm này sẽ được return cho user để họ có thể gọi thủ công
   * Đồng thời cũng được dùng nội bộ để redirect tự động sau khi submit
   */
  const redirect: UseFormReturnType["redirect"] = (
    // Tham số 1: Nơi muốn redirect đến
    // Giá trị mặc định: nếu đang edit thì về "list", nếu đang create thì đến "edit"
    redirect = isEdit ? "list" : "edit",

    // Tham số 2: ID của record (dùng khi redirect đến trang detail/edit)
    // Giá trị mặc định: ID hiện tại
    redirectId = id,

    // Tham số 3: Các params bổ sung cho route (URL parameters)
    // Giá trị mặc định: object rỗng
    routeParams = {},
  ) => {
    // Gọi hàm xử lý redirect với các thông tin cần thiết
    handleSubmitWithRedirect({
      redirect: redirect, // Nơi redirect đến
      resource, // Resource hiện tại
      id: redirectId, // ID của record
      meta: { ...pickedMeta, ...routeParams }, // Spread operator "..." để merge 2 objects
    });
  };

  // ============================================================================
  // PHẦN 12: QUERY DỮ LIỆU (CHỈ KHI EDIT/CLONE)
  // ============================================================================

  /**
   * 📖 USEONE HOOK - Lấy 1 bản ghi từ API
   *
   * Hook này sử dụng React Query để fetch dữ liệu và cache
   * Chỉ chạy khi đang edit hoặc clone (không chạy khi create)
   */
  const queryResult = useOne<TQueryFnData, TError, TData>({
    resource: identifier, // Tên resource (VD: "posts")
    id, // ID của record cần lấy

    queryOptions: {
      // Spread operator để giữ lại các options user truyền vào
      ...props.queryOptions,

      // enabled = điều kiện để query có chạy hay không
      // Query chỉ chạy khi:
      // 1. KHÔNG phải action create (vì create không cần lấy dữ liệu cũ)
      // 2. ID đã được định nghĩa (id !== undefined)
      // 3. User không tắt query thủ công (queryOptions.enabled !== false)
      enabled:
        !isCreate && id !== undefined && (props.queryOptions?.enabled ?? true),
    },

    // Live mode - cập nhật realtime khi có thay đổi từ server
    liveMode: props.liveMode,
    onLiveEvent: props.onLiveEvent,
    liveParams: props.liveParams,

    // Metadata cho query
    meta: { ...combinedMeta, ...props.queryMeta },

    // Tên data provider (nếu có nhiều data sources)
    dataProviderName: props.dataProviderName,

    // Tắt tính năng overtime (theo dõi thời gian loading)
    overtimeOptions: { enabled: false },
  });

  // ============================================================================
  // PHẦN 13: MUTATIONS (THAY ĐỔI DỮ LIỆU) - CREATE VÀ UPDATE
  // ============================================================================

  /**
   * 📖 USECREATE HOOK - Tạo mới dữ liệu
   *
   * Mutation trong React Query là các operation thay đổi dữ liệu (POST, PUT, DELETE)
   * Hook này chuẩn bị sẵn hàm để gọi API tạo mới, nhưng chưa thực thi
   */
  const createMutation = useCreate<TResponse, TResponseError, TVariables>({
    mutationOptions: props.createMutationOptions, // Options user truyền vào
    overtimeOptions: { enabled: false }, // Tắt overtime tracking
  });

  /**
   * 📖 USEUPDATE HOOK - Cập nhật dữ liệu
   *
   * Tương tự useCreate nhưng dùng để update record đã tồn tại
   */
  const updateMutation = useUpdate<TResponse, TResponseError, TVariables>({
    mutationOptions: props.updateMutationOptions, // Options user truyền vào
    overtimeOptions: { enabled: false }, // Tắt overtime tracking
  });

  // ============================================================================
  // PHẦN 14: XÁC ĐỊNH MUTATION VÀ TRẠNG THÁI LOADING
  // ============================================================================

  // Chọn mutation phù hợp dựa vào action hiện tại
  // Nếu đang edit -> dùng updateMutation, nếu không (create/clone) -> dùng createMutation
  const mutationResult = isEdit ? updateMutation : createMutation;

  // Kiểm tra xem mutation có đang pending (đang xử lý) không
  const isMutationLoading = mutationResult.mutation.isPending;

  // Form loading = mutation đang chạy HOẶC query đang fetch dữ liệu
  // Toán tử "||" (OR) = true nếu một trong hai điều kiện đúng
  const formLoading = isMutationLoading || queryResult.query.isFetching;

  // ============================================================================
  // PHẦN 15: THEO DÕI THỜI GIAN LOADING
  // ============================================================================

  // Hook để theo dõi thời gian loading (để hiển thị cảnh báo nếu loading quá lâu)
  const { elapsedTime } = useLoadingOvertime({
    ...props.overtimeOptions, // Spread các options user truyền vào
    isLoading: formLoading, // Trạng thái loading hiện tại
  });

  // ============================================================================
  // PHẦN 16: USEEFFECT - INVALIDATE CACHE KHI UNMOUNT
  // ============================================================================

  /**
   * 📖 REACT HOOK - useEffect:
   *
   * useEffect cho phép bạn thực hiện "side effects" (tác dụng phụ) trong component
   * Side effects là những thao tác ảnh hưởng bên ngoài component như:
   * - Gọi API
   * - Subscribe/unsubscribe events
   * - Thao tác DOM
   * - Set timers
   *
   * Syntax: useEffect(() => { code... }, [dependencies])
   * - Hàm callback chạy sau khi component render
   * - Array dependencies: khi các giá trị này thay đổi, effect sẽ chạy lại
   * - Return một function: function này sẽ chạy khi cleanup (component unmount hoặc trước khi effect chạy lại)
   */
  React.useEffect(() => {
    // Return một cleanup function
    // Function này chạy khi:
    // 1. Component bị unmount (remove khỏi DOM)
    // 2. Trước khi effect chạy lại (nếu dependencies thay đổi)
    return () => {
      // Kiểm tra các điều kiện để invalidate cache
      if (
        props.autoSave?.invalidateOnUnmount && // User bật tính năng invalidate khi unmount
        autosaved && // Đã auto-save ít nhất 1 lần
        identifier && // Có identifier (tên resource)
        typeof id !== "undefined" // Có ID
      ) {
        // Gọi hàm invalidate để làm mới cache
        // Điều này đảm bảo dữ liệu được fetch lại từ server lần sau
        invalidate({
          id, // ID của record
          invalidates: props.invalidates || ["list", "many", "detail"], // Các queries cần invalidate
          dataProviderName: props.dataProviderName, // Data provider name
          resource: identifier, // Resource name
        });
      }
    };
  }, [
    // Dependencies: effect chỉ chạy lại khi các giá trị này thay đổi
    props.autoSave?.invalidateOnUnmount,
    autosaved,
  ]);

  // ============================================================================
  // PHẦN 17: HÀM ONFINISH - XỬ LÝ SUBMIT FORM (QUAN TRỌNG NHẤT)
  // ============================================================================

  /**
   * 📚 HÀM ONFINISH - Hàm chính để xử lý khi user submit form
   *
   * Đây là hàm QUAN TRỌNG NHẤT trong hook này!
   * Nó xử lý toàn bộ logic khi submit form:
   * - Validate dữ liệu
   * - Gọi API create/update
   * - Xử lý redirect
   * - Invalidate cache
   * - Hiển thị notification
   * - Xử lý auto-save
   *
   * @param values - Dữ liệu từ form (VD: { name: "John", email: "john@example.com" })
   * @param isAutosave - Có phải là auto-save không (mặc định: false)
   * @returns Promise - Trả về promise để có thể await
   */
  const onFinish = async (
    // Tham số 1: Dữ liệu form
    values: TVariables,

    // Tham số 2: Object chứa config, có destructuring để lấy isAutosave
    // Giá trị mặc định là object rỗng {}
    { isAutosave = false }: { isAutosave?: boolean } = {},
  ) => {
    // Kiểm tra xem mutation mode có phải pessimistic không
    // Pessimistic = chờ server response mới cập nhật UI và redirect
    const isPessimistic = mutationMode === "pessimistic";

    // Tắt cảnh báo "bạn có muốn rời trang?" khi form đang submit
    // Vì dữ liệu đã được submit rồi nên không cần cảnh báo nữa
    setWarnWhen(false);

    // Định nghĩa hàm redirect sau khi submit thành công
    // Hàm này sẽ được gọi ở nhiều chỗ trong code bên dưới
    const onSuccessRedirect = (id?: BaseKey) => redirect(redirectAction, id);

    // ============================================================================
    // TẠO PROMISE ĐỂ XỬ LÝ BẤT ĐỒNG BỘ (ASYNCHRONOUS)
    // ============================================================================

    /**
     * 📖 JAVASCRIPT - Promise:
     *
     * Promise là object đại diện cho một giá trị có thể chưa có ngay
     * Được dùng để xử lý các tác vụ bất đồng bộ (async) như gọi API
     *
     * 3 trạng thái của Promise:
     * - pending: Đang chờ (chưa có kết quả)
     * - fulfilled: Thành công (resolve được gọi)
     * - rejected: Thất bại (reject được gọi)
     *
     * Syntax: new Promise((resolve, reject) => { ... })
     * - resolve(value): gọi khi thành công, trả về value
     * - reject(error): gọi khi thất bại, trả về error
     */
    const submissionPromise = new Promise<
      // Generic type: Promise này có thể trả về 1 trong 3 kiểu:
      // - CreateResponse<TResponse>: Response khi create
      // - UpdateResponse<TResponse>: Response khi update
      // - void: Không trả về gì (khi optimistic mode)
      CreateResponse<TResponse> | UpdateResponse<TResponse> | void
    >((resolve, reject) => {
      // ============================================================================
      // VALIDATION - KIỂM TRA CÁC ĐIỀU KIỆN BẮT BUỘC
      // ============================================================================

      // ❌ Reject (từ chối) nếu thiếu resource
      if (!resource) return reject(missingResourceError);

      // 📝 LƯU Ý: Dòng này bị comment out vì trong một số trường hợp đặc biệt,
      //           có thể edit mà không cần ID (edit toàn bộ resource)
      // if (isEdit && !id) return reject(missingIdError);

      // ❌ Reject nếu đang clone nhưng không có ID
      // (Clone cần ID để biết clone record nào)
      if (isClone && !id) return reject(missingIdError);

      // ❌ Reject nếu không có dữ liệu values
      if (!values) return reject(missingValuesError);

      // ❌ Reject nếu auto-save nhưng không phải action edit
      // (Auto-save chỉ có ý nghĩa khi edit, không có nghĩa khi create)
      if (isAutosave && !isEdit) return reject(autosaveOnNonEditError);

      // ============================================================================
      // XỬ LÝ OPTIMISTIC/UNDOABLE MODE
      // ============================================================================

      /**
       * 📖 MUTATION MODES:
       *
       * 1. PESSIMISTIC (Bi quan):
       *    - Đợi server phản hồi mới cập nhật UI
       *    - An toàn nhưng chậm
       *    - Redirect sau khi server confirm
       *
       * 2. OPTIMISTIC (Lạc quan):
       *    - Cập nhật UI ngay lập tức
       *    - Nhanh nhưng có thể cần rollback nếu lỗi
       *    - Redirect ngay không đợi server
       *
       * 3. UNDOABLE (Có thể hoàn tác):
       *    - Cập nhật UI ngay + hiển thị nút Undo trong vài giây
       *    - Gửi request lên server sau vài giây nếu user không undo
       *    - Redirect ngay không đợi server
       */
      if (!isPessimistic && !isAutosave) {
        // Nếu KHÔNG phải pessimistic VÀ KHÔNG phải auto-save
        // => Là optimistic hoặc undoable mode

        // Trì hoãn (defer) việc redirect để đảm bảo setWarnWhen(false) đã được thực thi
        // setWarnWhen(false) chặn redirect cho đến khi được set thành false
        // Nếu redirect chạy trước khi giá trị được set đúng, nó sẽ bị block
        deferExecution(() => onSuccessRedirect());

        // Resolve promise ngay lập tức (không đợi server response)
        resolve();
      }

      // ============================================================================
      // CHUẨN BỊ BIẾN (VARIABLES) CHO MUTATION
      // ============================================================================

      /**
       * 📖 TYPESCRIPT - Union Types với "|":
       *
       * Kiểu "A | B" nghĩa là giá trị có thể là kiểu A HOẶC kiểu B
       * Ở đây variables có thể là UpdateParams HOẶC UseCreateParams
       * tùy thuộc vào action là edit hay create
       */
      const variables:
        | UpdateParams<TResponse, TResponseError, TVariables>
        | UseCreateParams<TResponse, TResponseError, TVariables> = {
        // Dữ liệu từ form
        values,

        // Tên resource, ưu tiên identifier, nếu không có thì dùng resource.name
        // Toán tử "??" (nullish coalescing) = lấy bên phải nếu bên trái là null/undefined
        resource: identifier ?? resource.name,

        // Merge metadata từ nhiều nguồn
        meta: { ...combinedMeta, ...props.mutationMeta },

        // Tên data provider (nếu có nhiều data sources)
        dataProviderName: props.dataProviderName,

        // Invalidates: Các queries cần làm mới sau mutation
        // Nếu là auto-save -> không invalidate (để tránh re-fetch liên tục)
        // Nếu không phải auto-save -> invalidate theo config
        invalidates: isAutosave ? [] : props.invalidates,

        // Notifications: Hiển thị thông báo thành công/lỗi
        // Nếu là auto-save -> không hiện notification (để tránh spam)
        // Ternary operator: điều_kiện ? giá_trị_nếu_true : giá_trị_nếu_false
        successNotification: isAutosave ? false : props.successNotification,
        errorNotification: isAutosave ? false : props.errorNotification,

        // ============================================================================
        // CÁC BIẾN ĐẶC BIỆT CHỈ CHO UPDATE (KHI EDIT)
        // ============================================================================

        /**
         * 📖 TYPESCRIPT - Conditional Spread:
         *
         * ...(điều_kiện ? { props } : {})
         * Nếu điều kiện đúng: spread các props vào object
         * Nếu điều kiện sai: spread object rỗng (không thêm gì cả)
         */
        ...(isEdit
          ? {
              // Chỉ khi edit mới cần các fields này:
              id: id ?? "", // ID của record đang edit
              mutationMode, // Chế độ mutation
              undoableTimeout: props.undoableTimeout, // Thời gian chờ undo (milliseconds)
              optimisticUpdateMap: props.optimisticUpdateMap, // Map để update optimistic
            }
          : {}), // Nếu không phải edit, spread object rỗng
      };

      // ============================================================================
      // LẤY HÀM MUTATEASYNC VÀ THỰC THI MUTATION
      // ============================================================================

      // Lấy hàm mutateAsync từ mutation phù hợp (update hoặc create)
      // mutateAsync là phiên bản async của mutate, trả về Promise
      const { mutateAsync } = isEdit ? updateMutation : createMutation;

      /**
       * 📖 TYPESCRIPT - Type Assertion với "as":
       *
       * "variables as any" ép kiểu variables thành "any"
       * Điều này bỏ qua type checking của TypeScript
       * Dùng khi bạn chắc chắn kiểu đúng nhưng TypeScript không suy luận được
       */
      mutateAsync(variables as any, {
        // ============================================================================
        // CALLBACK FUNCTIONS - Hàm được gọi khi mutation hoàn thành
        // ============================================================================

        /**
         * onSuccess: Được gọi khi mutation thành công
         *
         * Nếu user truyền props.onMutationSuccess vào, ta sẽ gọi nó
         * Callback này KHÔNG ảnh hưởng đến submission promise
         * (nghĩa là dù callback có lỗi cũng không làm promise reject)
         */
        onSuccess: props.onMutationSuccess
          ? (data, _, context) => {
              // Optional chaining "?." để gọi hàm nếu nó tồn tại
              props.onMutationSuccess?.(data, values, context, isAutosave);
            }
          : undefined, // Nếu user không truyền callback, set là undefined

        /**
         * onError: Được gọi khi mutation thất bại
         *
         * Tương tự onSuccess nhưng cho trường hợp lỗi
         */
        onError: props.onMutationError
          ? (error: TResponseError, _, context) => {
              props.onMutationError?.(error, values, context, isAutosave);
            }
          : undefined,
      })
        // ============================================================================
        // XỬ LÝ KẾT QUẢ VỚI .THEN() VÀ .CATCH()
        // ============================================================================

        /**
         * 📖 JAVASCRIPT - Promise.then():
         *
         * .then() nhận một callback được gọi khi promise resolve (thành công)
         * Callback nhận data trả về từ promise
         */
        .then((data) => {
          // Nếu là pessimistic mode VÀ KHÔNG phải auto-save
          if (isPessimistic && !isAutosave) {
            // Redirect SAU KHI server đã confirm thành công
            // Lấy ID từ response để redirect đến trang detail/edit của record mới/đã update
            deferExecution(() => onSuccessRedirect(data?.data?.id));
          }

          // Nếu là auto-save, đánh dấu là đã auto-save
          if (isAutosave) {
            setAutosaved(true);
          }

          // Resolve promise chính với data từ server
          resolve(data);
        })

        /**
         * 📖 JAVASCRIPT - Promise.catch():
         *
         * .catch() nhận một callback được gọi khi promise reject (thất bại)
         * Callback nhận error object
         */
        .catch(reject); // Nếu mutation lỗi, reject promise chính luôn
    });

    // Trả về promise để caller có thể await hoặc .then()
    // VD: await onFinish(values) hoặc onFinish(values).then(...)
    return submissionPromise;
  };

  // ============================================================================
  // PHẦN 18: USEREF - LƯU TRỮ REFERENCE CỦA HÀM ONFINISH
  // ============================================================================

  /**
   * 📖 REACT HOOK - useRef:
   *
   * useRef tạo một "hộp" (reference) để lưu trữ giá trị MÀ KHÔNG gây re-render
   * Khác với useState, khi thay đổi giá trị trong ref, component KHÔNG re-render
   *
   * Cú pháp: const ref = useRef(giáTrịBanĐầu)
   * Truy cập giá trị: ref.current
   *
   * Dùng useRef khi:
   * - Lưu giá trị mà không cần re-render khi nó thay đổi
   * - Lưu reference đến DOM element
   * - Lưu giá trị cần persist qua nhiều lần render
   */
  const onFinishRef = React.useRef(onFinish);

  // useEffect để cập nhật ref mỗi khi onFinish thay đổi
  // Tại sao cần ref? Vì onFinishAutoSave (bên dưới) cần dùng onFinish
  // nhưng không muốn tạo lại onFinishAutoSave mỗi khi onFinish thay đổi
  React.useEffect(() => {
    onFinishRef.current = onFinish; // Cập nhật ref với onFinish mới nhất
  }, [onFinish]); // Chạy lại khi onFinish thay đổi

  // ============================================================================
  // PHẦN 19: USEMEMO - TẠO HÀM AUTO-SAVE VỚI DEBOUNCE
  // ============================================================================

  /**
   * 📖 REACT HOOK - useMemo:
   *
   * useMemo "ghi nhớ" (memoize) kết quả của một phép tính tốn kém
   * Chỉ tính toán lại khi dependencies thay đổi
   *
   * Cú pháp: useMemo(() => giáTrịCanTính, [dependencies])
   *
   * Lợi ích:
   * - Tránh tính toán lại những giá trị phức tạp/tốn kém
   * - Giữ nguyên reference của object/function qua nhiều lần render
   *   (quan trọng cho performance optimization)
   */
  const onFinishAutoSave = React.useMemo(
    () =>
      /**
       * 📖 DEBOUNCE:
       *
       * Debounce = trì hoãn thực thi hàm cho đến khi user "ngừng gõ" trong X milliseconds
       *
       * VD: User gõ "Hello"
       * - Gõ 'H': đợi 1000ms
       * - Gõ 'e' (trước khi hết 1000ms): hủy timer cũ, đợi 1000ms mới
       * - Gõ 'l': hủy timer, đợi 1000ms mới
       * - Gõ 'l': hủy timer, đợi 1000ms mới
       * - Gõ 'o': hủy timer, đợi 1000ms mới
       * - (Ngừng gõ)
       * - Sau 1000ms: GỌI HÀM với "Hello"
       *
       * Mục đích: Tránh gọi API liên tục mỗi lần gõ phím
       */
      asyncDebounce(
        // Hàm cần debounce - sử dụng ref để lấy onFinish mới nhất
        (values: TVariables) =>
          onFinishRef.current(values, { isAutosave: true }),

        // Thời gian debounce (milliseconds)
        // Lấy từ props, nếu không có thì mặc định 1000ms (1 giây)
        props.autoSave?.debounce ?? 1000,

        // Message khi hủy debounce
        "Cancelled by debounce",
      ),
    // Dependencies: chỉ tạo lại hàm debounce khi debounce time thay đổi
    [props.autoSave?.debounce],
  );

  // ============================================================================
  // PHẦN 20: CLEANUP AUTO-SAVE KHI UNMOUNT
  // ============================================================================

  // useEffect để cleanup (hủy) hàm debounce khi component unmount
  React.useEffect(() => {
    // Return cleanup function
    return () => {
      // Hủy các debounce đang chờ (nếu có)
      // Điều này quan trọng để tránh:
      // 1. Memory leaks (rò rỉ bộ nhớ)
      // 2. Gọi API sau khi component đã bị unmount
      onFinishAutoSave.cancel();
    };
  }, [onFinishAutoSave]); // Chạy lại khi onFinishAutoSave thay đổi

  // ============================================================================
  // PHẦN 21: CHUẨN BỊ DỮ LIỆU TRẢ VỀ
  // ============================================================================

  // Object chứa thông tin về thời gian loading
  const overtime = {
    elapsedTime, // Thời gian đã trôi qua kể từ khi bắt đầu loading
  };

  // Object chứa các props liên quan đến auto-save
  // Các thông tin này từ updateMutation vì auto-save chỉ hoạt động khi edit
  const autoSaveProps = {
    status: updateMutation.mutation.status, // Trạng thái: idle, pending, success, error
    data: updateMutation.mutation.data, // Dữ liệu trả về (nếu thành công)
    error: updateMutation.mutation.error, // Lỗi (nếu thất bại)
  };

  // ============================================================================
  // PHẦN 22: RETURN - TRẢ VỀ CÁC GIÁTRỊ VÀ HÀM CHO USER SỬ DỤNG
  // ============================================================================

  /**
   * 📚 KẾT THÚC HOOK - Return object chứa tất cả giá trị và hàm cần thiết
   *
   * User sẽ sử dụng hook như sau:
   *
   * const {
   *   onFinish,           // Hàm submit form
   *   onFinishAutoSave,   // Hàm auto-save
   *   formLoading,        // Trạng thái loading
   *   mutation,           // Object mutation từ React Query
   *   query,              // Object query từ React Query
   *   ...
   * } = useForm({ ... })
   */
  return {
    onFinish, // Hàm xử lý khi submit form
    onFinishAutoSave, // Hàm xử lý auto-save (đã có debounce)
    formLoading, // Boolean: form có đang loading không
    mutation: mutationResult.mutation, // Mutation object từ React Query
    query: queryResult.query, // Query object từ React Query
    autoSaveProps, // Props cho auto-save indicator component
    id, // ID của record hiện tại
    setId, // Hàm để set ID
    redirect, // Hàm để redirect người dùng
    overtime, // Object chứa thông tin overtime
  };
};

// ============================================================================
// PHẦN 23: ERROR OBJECTS - CÁC OBJECT LỖI ĐỂ THROW KHI CẦN
// ============================================================================

/**
 * 📖 JAVASCRIPT - Error Object:
 *
 * new Error(message) tạo một object lỗi với message (thông báo lỗi)
 * Các Error objects này được dùng để reject Promise trong hàm onFinish
 *
 * Lợi ích của việc định nghĩa error trước:
 * - Code dễ đọc hơn
 * - Tái sử dụng message
 * - Dễ dàng thay đổi message ở một chỗ
 */

// Lỗi khi thiếu resource
const missingResourceError = new Error(
  "[useForm]: `resource` is not defined or not matched but is required",
);

// Lỗi khi thiếu ID trong action edit hoặc clone
const missingIdError = new Error(
  "[useForm]: `id` is not defined but is required in edit and clone actions",
);

// Lỗi khi thiếu values (dữ liệu form)
const missingValuesError = new Error(
  "[useForm]: `values` is not provided but is required",
);

// Lỗi khi dùng auto-save với action không phải edit
const autosaveOnNonEditError = new Error(
  "[useForm]: `autoSave` is only allowed in edit action",
);

// ============================================================================
// PHẦN 24: WARNING MESSAGE FUNCTION - HÀM TẠO MESSAGE CẢNH BÁO
// ============================================================================

/**
 * 📖 JAVASCRIPT - Arrow Function với Template Literals:
 *
 * Arrow function: (params) => returnValue
 * Template literals: `string with ${variable}`
 *
 * Hàm này tạo ra message cảnh báo động dựa vào các tham số truyền vào
 */
const idWarningMessage = (action?: string, identifier?: string, id?: BaseKey) =>
  // Template literal với backticks (`) cho phép multiline string và interpolation
  `[useForm]: action: "${action}", resource: "${identifier}", id: ${id}

If you don't use the \`setId\` method to set the \`id\`, you should pass the \`id\` prop to \`useForm\`. Otherwise, \`useForm\` will not be able to infer the \`id\` from the current URL with custom resource provided.

See https://refine.dev/docs/data/hooks/use-form/#id-`;

// ============================================================================
// 🎉 KẾT THÚC FILE
// ============================================================================
// Bạn vừa hoàn thành việc đọc một trong những hooks phức tạp nhất của Refine!
//
// Tóm tắt những gì hook này làm:
// 1. ✅ Quản lý state của form (loading, data, error)
// 2. ✅ Tự động fetch dữ liệu khi edit/clone
// 3. ✅ Xử lý submit form (create/update)
// 4. ✅ Hỗ trợ 3 mutation modes (pessimistic/optimistic/undoable)
// 5. ✅ Auto-save với debounce
// 6. ✅ Cảnh báo khi rời trang chưa lưu
// 7. ✅ Tự động redirect sau submit
// 8. ✅ Invalidate cache để làm mới dữ liệu
// 9. ✅ Hiển thị notification
// 10. ✅ Và nhiều tính năng khác...
//
// 📚 Các khái niệm React/TypeScript đã học:
// - React Hooks: useState, useEffect, useRef, useMemo
// - TypeScript: Generics, Union Types, Type Assertion, Optional Chaining
// - JavaScript: Promises, async/await, Arrow Functions, Destructuring, Spread Operator
// - Design Patterns: Debounce, Memoization, Cleanup Functions
//
// 👏 Chúc mừng bạn đã hoàn thành! Hãy thử đọc lại code và xem bạn hiểu được bao nhiêu.
// ============================================================================
