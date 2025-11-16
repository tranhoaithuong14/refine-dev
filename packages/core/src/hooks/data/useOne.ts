// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// Import useEffect từ React để xử lý side effects
import { useEffect } from "react";

// Import công cụ DevTools của Refine (dùng để debug và monitor)
import { getXRay } from "@refinedev/devtools-internal";

// ============================================================================
// IMPORT TỪ TANSTACK REACT QUERY (THƯ VIỆN QUẢN LÝ SERVER STATE)
// ============================================================================

/**
 * 📚 TANSTACK REACT QUERY:
 *
 * React Query là thư viện mạnh mẽ để quản lý "server state" (dữ liệu từ server)
 * Nó giải quyết các vấn đề:
 * - Caching (lưu cache dữ liệu)
 * - Synchronizing (đồng bộ dữ liệu với server)
 * - Updating (cập nhật dữ liệu)
 * - Refetching (fetch lại dữ liệu khi cần)
 * - Background updates (cập nhật ngầm)
 * - Stale data (dữ liệu cũ)
 *
 * So với việc dùng useState + useEffect thủ công thì React Query:
 * - Tự động cache dữ liệu
 * - Tự động refetch khi cần
 * - Quản lý loading/error states
 * - Deduplication (gộp các request giống nhau)
 * - And much more...
 */
import {
  type QueryObserverResult, // Type cho kết quả của query
  type UseQueryOptions, // Type cho options của useQuery
  useQuery, // Hook chính để fetch dữ liệu
} from "@tanstack/react-query";

// Import các helper functions từ Refine
import { pickDataProvider, prepareQueryContext } from "@definitions";

// Import các hooks từ Refine
import {
  useDataProvider, // Hook để lấy data provider
  useHandleNotification, // Hook để xử lý notification
  useKeys, // Hook để tạo query keys
  useMeta, // Hook để lấy metadata (đã học ở hook #1)
  useOnError, // Hook để xử lý error
  useResourceParams, // Hook để lấy resource params
  useResourceSubscription, // Hook để subscribe realtime updates
  useTranslate, // Hook để translate (đa ngôn ngữ)
} from "@hooks";

// ============================================================================
// PHẦN 2: IMPORT CÁC KIỂU DỮ LIỆU (TYPES)
// ============================================================================

import type {
  BaseKey, // Type cho ID (string | number)
  BaseRecord, // Type cơ bản cho 1 record (object)
  GetOneResponse, // Type cho response của getOne API
  HttpError, // Type cho HTTP error
  MetaQuery, // Type cho metadata
  Prettify, // Utility type để format type đẹp hơn
} from "../../contexts/data/types";

import type { LiveModeProps } from "../../contexts/live/types";
import type { SuccessErrorNotification } from "../../contexts/notification/types";

import {
  type UseLoadingOvertimeOptionsProps,
  type UseLoadingOvertimeReturnType,
  useLoadingOvertime,
} from "../useLoadingOvertime";

// ============================================================================
// PHẦN 3: ĐỊNH NGHĨA TYPES CHO HOOK USEONE
// ============================================================================

/**
 * 📖 TYPESCRIPT - Type Definitions:
 *
 * Định nghĩa type cho props và return value giúp:
 * - IDE autocomplete (gợi ý code tự động)
 * - Type checking (kiểm tra kiểu khi compile)
 * - Self-documenting (code tự giải thích)
 */

// Type cho props (tham số đầu vào) của useOne hook
export type UseOneProps<TQueryFnData, TError, TData> = {
  /**
   * Tên resource để tương tác với API
   * VD: "posts", "users", "products"
   */
  resource?: string;

  /**
   * ID của item cần lấy từ resource
   * VD: 1, "abc-123", 42
   * @type [`BaseKey`](/docs/api-reference/core/interfaceReferences/#basekey)
   */
  id?: BaseKey;

  /**
   * ⚙️ OPTIONS CHO REACT QUERY - TÙY CHỈNH BEHAVIOR CỦA QUERY
   *
   * ============================================================================
   * 📚 GIỚI THIỆU:
   * ============================================================================
   *
   * queryOptions cho phép bạn tùy chỉnh cách useQuery hoạt động.
   * Đây là một object chứa rất nhiều options để control:
   * - Khi nào query chạy
   * - Bao lâu data được cache
   * - Có tự động refetch không
   * - Xử lý errors như thế nào
   * - Transform data trước khi trả về
   * - ...và nhiều hơn nữa!
   *
   * ============================================================================
   * 🎯 CÁC OPTIONS PHỔ BIẾN:
   * ============================================================================
   *
   * 1. enabled: boolean
   *    - true: Query sẽ chạy tự động
   *    - false: Query bị tắt (không fetch)
   *    VD: enabled: !!id  // Chỉ fetch khi có id
   *
   * 2. refetchOnWindowFocus: boolean
   *    - true: Tự động refetch khi user quay lại tab/window
   *    - false: Không refetch
   *    VD: refetchOnWindowFocus: false
   *
   * 3. staleTime: number (milliseconds)
   *    - Thời gian data được coi là "fresh" (mới)
   *    - Trong thời gian này, không refetch
   *    VD: staleTime: 5 * 60 * 1000  // 5 phút
   *
   * 4. cacheTime: number (milliseconds)
   *    - Thời gian giữ data trong cache sau khi không dùng nữa
   *    VD: cacheTime: 10 * 60 * 1000  // 10 phút
   *
   * 5. retry: number | boolean
   *    - Số lần retry khi request bị lỗi
   *    VD: retry: 3  // Retry 3 lần
   *
   * 6. retryDelay: number | (retryCount) => number
   *    - Delay giữa các lần retry
   *    VD: retryDelay: 1000  // Chờ 1 giây
   *
   * 7. select: (data) => transformedData
   *    - Transform/filter data trước khi trả về component
   *    VD: select: (data) => data.data.title  // Chỉ lấy title
   *
   * 8. onSuccess: (data) => void
   *    - Callback chạy khi query thành công
   *    VD: onSuccess: (data) => console.log("Success!", data)
   *
   * 9. onError: (error) => void
   *    - Callback chạy khi query bị lỗi
   *    VD: onError: (error) => alert("Lỗi: " + error.message)
   *
   * 10. onSettled: (data, error) => void
   *     - Callback luôn chạy (dù success hay error)
   *     VD: onSettled: () => console.log("Query đã xong!")
   *
   * 11. refetchInterval: number | false
   *     - Tự động refetch theo interval (polling)
   *     VD: refetchInterval: 5000  // Refetch mỗi 5 giây
   *
   * 12. keepPreviousData: boolean
   *     - Giữ data cũ khi đang fetch data mới
   *     - Tránh UI bị "nhảy" khi refetch
   *     VD: keepPreviousData: true
   *
   * 📖 Xem thêm: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
   *
   * ============================================================================
   * 💡 VÍ DỤ SỬ DỤNG:
   * ============================================================================
   *
   * ```typescript
   * const { query, result } = useOne({
   *   resource: "posts",
   *   id: 1,
   *   queryOptions: {
   *     // Chỉ fetch khi có id
   *     enabled: !!id,
   *
   *     // Data "fresh" trong 5 phút
   *     staleTime: 5 * 60 * 1000,
   *
   *     // Không refetch khi focus window
   *     refetchOnWindowFocus: false,
   *
   *     // Retry 3 lần nếu lỗi
   *     retry: 3,
   *
   *     // Chỉ lấy title từ response
   *     select: (data) => ({
   *       data: {
   *         title: data.data.title
   *       }
   *     }),
   *
   *     // Log khi thành công
   *     onSuccess: (data) => {
   *       console.log("Đã tải xong:", data);
   *     },
   *
   *     // Alert khi lỗi
   *     onError: (error) => {
   *       alert("Có lỗi xảy ra!");
   *     }
   *   }
   * });
   * ```
   *
   * ============================================================================
   * 🔧 TYPESCRIPT - PHÂN TÍCH TYPE DEFINITION (PHẦN QUAN TRỌNG!)
   * ============================================================================
   */

  /**
   * 📖 TYPESCRIPT - CHI TIẾT TYPE CỦA queryOptions:
   *
   * Đây là một type definition phức tạp, hãy phân tích từng phần!
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 1: HIỂU CẤU TRÚC TỔNG QUÁT                                     │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * queryOptions có cấu trúc:
   *
   *   queryOptions?: PHẦN_A & PHẦN_B
   *                    ^        ^
   *                    |        |
   *           Omit<...>   Intersection  {...}
   *           (loại bỏ)      Type (&)   (thêm lại)
   *
   * - Dấu ? nghĩa là OPTIONAL (có thể có hoặc không)
   * - PHẦN_A: Lấy tất cả options từ UseQueryOptions, NHƯNG loại bỏ queryKey và queryFn
   * - Dấu & là INTERSECTION TYPE (gộp 2 types lại)
   * - PHẦN_B: Thêm lại queryKey và queryFn (nhưng là OPTIONAL)
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 2: HIỂU "Omit<...>" - UTILITY TYPE                            │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 📚 OMIT UTILITY TYPE:
   *
   * Omit<Type, Keys> nghĩa là "lấy Type nhưng BỎ ĐI các keys được chỉ định"
   *
   * VÍ DỤ ĐƠN GIẢN:
   * ```typescript
   * type Person = {
   *   name: string;
   *   age: number;
   *   email: string;
   * };
   *
   * // Lấy Person nhưng bỏ đi email
   * type PersonWithoutEmail = Omit<Person, "email">;
   * // Kết quả:
   * // {
   * //   name: string;
   * //   age: number;
   * // }
   *
   * // Có thể bỏ nhiều keys:
   * type OnlyName = Omit<Person, "age" | "email">;
   * // Kết quả:
   * // {
   * //   name: string;
   * // }
   * ```
   *
   * TRONG CODE NÀY:
   * ```typescript
   * Omit<
   *   UseQueryOptions<...>,
   *   "queryKey" | "queryFn"
   * >
   * ```
   * Nghĩa là: Lấy TẤT CẢ options từ UseQueryOptions, NHƯNG loại bỏ:
   * - queryKey
   * - queryFn
   *
   * TẠI SAO LẠI BỎ? 🤔
   * Vì useOne hook đã tự động tạo queryKey và queryFn cho bạn rồi!
   * Bạn không cần (và không nên) tự định nghĩa chúng trong hầu hết trường hợp.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 3: HIỂU "UseQueryOptions<...>" - GENERIC TYPE                 │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 📚 GENERIC TYPE PARAMETERS:
   *
   * UseQueryOptions nhận 3 generic parameters:
   * ```typescript
   * UseQueryOptions<TQueryFnData, TError, TData>
   *                     ^           ^       ^
   *                     |           |       |
   *                     |           |       Data sau khi transform (select)
   *                     |           |
   *                     |           Error type
   *                     |
   *                     Data thô từ API
   * ```
   *
   * TRONG CODE NÀY:
   * ```typescript
   * UseQueryOptions<
   *   GetOneResponse<TQueryFnData>,  // Data thô từ API
   *   TError,                         // Error type
   *   GetOneResponse<TData>           // Data sau transform
   * >
   * ```
   *
   * GIẢI THÍCH CỤ THỂ:
   *
   * 1. TQueryFnData:
   *    - Dữ liệu GỐC từ API (chưa transform)
   *    - VD: { data: { id: 1, title: "Hello" } }
   *
   * 2. TError:
   *    - Kiểu lỗi có thể xảy ra
   *    - VD: HttpError (có statusCode, message,...)
   *
   * 3. TData:
   *    - Dữ liệu SAU KHI transform bởi select function
   *    - VD: Nếu select: (data) => data.data.title
   *         Thì TData = string
   *
   * 4. GetOneResponse<T>:
   *    - Wrapper type cho response từ getOne API
   *    - Cấu trúc: { data: T }
   *    - VD: GetOneResponse<Post> = { data: Post }
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 4: HIỂU INTERSECTION TYPE (&)                                  │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 📚 INTERSECTION TYPE (&):
   *
   * Type A & Type B nghĩa là "GỘP tất cả properties của A VÀ B"
   *
   * VÍ DỤ ĐƠN GIẢN:
   * ```typescript
   * type Person = {
   *   name: string;
   *   age: number;
   * };
   *
   * type Employee = {
   *   company: string;
   *   salary: number;
   * };
   *
   * // Gộp Person và Employee
   * type EmployeePerson = Person & Employee;
   * // Kết quả:
   * // {
   * //   name: string;
   * //   age: number;
   * //   company: string;
   * //   salary: number;
   * // }
   * ```
   *
   * TRONG CODE NÀY:
   * ```typescript
   * Omit<UseQueryOptions<...>, "queryKey" | "queryFn"> & { queryKey?: ..., queryFn?: ... }
   *                    ^                                  ^
   *                    |                                  |
   *                  PHẦN A                             PHẦN B
   *                (tất cả options                  (queryKey và queryFn
   *                 trừ queryKey,                    nhưng OPTIONAL)
   *                 queryFn)
   * ```
   *
   * KẾT QUẢ SAU KHI GỘP:
   * - enabled? (từ PHẦN A)
   * - staleTime? (từ PHẦN A)
   * - retry? (từ PHẦN A)
   * - onSuccess? (từ PHẦN A)
   * - ...tất cả options khác (từ PHẦN A)
   * - queryKey? (từ PHẦN B - OPTIONAL)
   * - queryFn? (từ PHẦN B - OPTIONAL)
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 5: HIỂU INDEXED ACCESS TYPE (["queryKey"])                     │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 📚 INDEXED ACCESS TYPE:
   *
   * Type["key"] nghĩa là "LẤY type của property 'key' từ Type"
   *
   * VÍ DỤ ĐƠN GIẢN:
   * ```typescript
   * type Person = {
   *   name: string;
   *   age: number;
   *   address: {
   *     city: string;
   *     street: string;
   *   };
   * };
   *
   * type NameType = Person["name"];
   * // Kết quả: string
   *
   * type AgeType = Person["age"];
   * // Kết quả: number
   *
   * type AddressType = Person["address"];
   * // Kết quả: { city: string; street: string; }
   * ```
   *
   * TRONG CODE NÀY:
   * ```typescript
   * queryKey?: UseQueryOptions<...>["queryKey"];
   * ```
   * Nghĩa là:
   * - Lấy TYPE của property "queryKey" từ UseQueryOptions
   * - Gán nó cho property "queryKey" của object này
   * - Thêm dấu ? để làm nó OPTIONAL
   *
   * TẠI SAO LÀM VẬY? 🤔
   * Để đảm bảo type của queryKey CHÍNH XÁC giống với type trong UseQueryOptions!
   * Nếu React Query thay đổi type của queryKey trong tương lai, code này vẫn đúng.
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 6: TẠI SAO CẦN CẤU TRÚC PHỨC TẠP NÀY? 🤔                      │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * ❓ CÂU HỎI: Tại sao không đơn giản là:
   * ```typescript
   * queryOptions?: UseQueryOptions<...>
   * ```
   *
   * ✅ TRẢ LỜI:
   *
   * Vì useOne hook đã TỰ ĐỘNG tạo queryKey và queryFn!
   *
   * 1. DEFAULT BEHAVIOR (không truyền queryOptions):
   *    ```typescript
   *    const { query, result } = useOne({
   *      resource: "posts",
   *      id: 1
   *    });
   *    // Hook tự động tạo:
   *    // queryKey: ['data', 'default', 'posts', 'one', '1', {}]
   *    // queryFn: () => dataProvider.getOne({ resource: "posts", id: 1 })
   *    ```
   *
   * 2. OVERRIDE MỘT PHẦN (truyền queryOptions):
   *    ```typescript
   *    const { query, result } = useOne({
   *      resource: "posts",
   *      id: 1,
   *      queryOptions: {
   *        staleTime: 5000,  // ✅ OK - Thêm staleTime
   *        enabled: !!id,    // ✅ OK - Thêm enabled
   *      }
   *    });
   *    // Hook vẫn tự tạo queryKey và queryFn, chỉ thêm staleTime và enabled
   *    ```
   *
   * 3. ADVANCED - OVERRIDE CẢ queryKey và queryFn (hiếm khi cần):
   *    ```typescript
   *    const { query, result } = useOne({
   *      resource: "posts",
   *      id: 1,
   *      queryOptions: {
   *        queryKey: ['custom', 'key'],  // ✅ OK - Override queryKey (nếu cần)
   *        queryFn: async () => {        // ✅ OK - Override queryFn (nếu cần)
   *          // Custom logic
   *          return customAPI.getData();
   *        }
   *      }
   *    });
   *    ```
   *
   * NẾU KHÔNG DÙNG Omit:
   * - TypeScript sẽ BẮT BUỘC phải truyền queryKey và queryFn (vì chúng required trong UseQueryOptions)
   * - User sẽ phải viết lại queryKey và queryFn mỗi lần dùng useOne
   * - Mất đi sự tiện lợi của hook!
   *
   * VỚI Omit:
   * - queryKey và queryFn trở thành OPTIONAL
   * - User chỉ cần truyền khi thực sự muốn override
   * - 99% trường hợp chỉ cần truyền enabled, staleTime, retry,...
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 7: TÓM TẮT - ĐỌC TYPE NÀY NHƯ THẾ NÀO?                        │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * ```typescript
   * queryOptions?: Omit<UseQueryOptions<...>, "queryKey" | "queryFn"> & {...}
   * ```
   *
   * ĐỌC THÀNH TIẾNG VIỆT:
   *
   * "queryOptions là một property OPTIONAL (?), với type là:
   *  - Lấy TẤT CẢ properties từ UseQueryOptions
   *  - NHƯNG loại bỏ (Omit) queryKey và queryFn
   *  - SAU ĐÓ gộp (&) với một object mới
   *  - Object mới này chứa queryKey và queryFn, nhưng cả 2 đều OPTIONAL"
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ BƯỚC 8: VÍ DỤ THỰC TẾ - TYPE CHECKING                              │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * ```typescript
   * // ✅ ĐÚNG - Không truyền gì cả
   * useOne({ resource: "posts", id: 1 });
   *
   * // ✅ ĐÚNG - Truyền staleTime
   * useOne({
   *   resource: "posts",
   *   id: 1,
   *   queryOptions: { staleTime: 5000 }
   * });
   *
   * // ✅ ĐÚNG - Truyền enabled
   * useOne({
   *   resource: "posts",
   *   id: 1,
   *   queryOptions: { enabled: !!id }
   * });
   *
   * // ✅ ĐÚNG - Override queryKey (advanced)
   * useOne({
   *   resource: "posts",
   *   id: 1,
   *   queryOptions: {
   *     queryKey: ['my', 'custom', 'key']
   *   }
   * });
   *
   * // ❌ SAI - Truyền property không tồn tại
   * useOne({
   *   resource: "posts",
   *   id: 1,
   *   queryOptions: { unknownProp: 123 }  // Error: unknownProp không tồn tại!
   * });
   *
   * // ❌ SAI - Type không đúng
   * useOne({
   *   resource: "posts",
   *   id: 1,
   *   queryOptions: { enabled: "yes" }  // Error: enabled phải là boolean!
   * });
   * ```
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ 🎓 TỔNG KẾT - KIẾN THỨC TYPESCRIPT ĐÃ HỌC:                         │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 1. ✅ Optional Properties (?):
   *    - Thêm ? sau tên property để làm nó optional
   *    - VD: name?: string
   *
   * 2. ✅ Omit<Type, Keys>:
   *    - Utility type để loại bỏ properties khỏi một type
   *    - VD: Omit<Person, "age">
   *
   * 3. ✅ Intersection Type (A & B):
   *    - Gộp tất cả properties của 2 types
   *    - VD: Person & Employee
   *
   * 4. ✅ Generic Types:
   *    - Type nhận tham số (type parameters)
   *    - VD: UseQueryOptions<TData, TError>
   *
   * 5. ✅ Indexed Access Type:
   *    - Lấy type của một property từ type khác
   *    - VD: Person["name"] -> string
   *
   * 6. ✅ Type Composition:
   *    - Kết hợp nhiều techniques để tạo type phức tạp
   *    - VD: Omit<...> & {...}
   *
   * 👏 Chúc mừng! Bạn vừa học một trong những type definitions phức tạp nhất!
   */
  queryOptions?: Omit<
    UseQueryOptions<
      GetOneResponse<TQueryFnData>,
      TError,
      GetOneResponse<TData>
    >,
    "queryKey" | "queryFn"
  > & {
    // Cho phép override queryKey và queryFn (optional) nếu cần custom logic
    queryKey?: UseQueryOptions<
      GetOneResponse<TQueryFnData>,
      TError,
      GetOneResponse<TData>
    >["queryKey"];
    queryFn?: UseQueryOptions<
      GetOneResponse<TQueryFnData>,
      TError,
      GetOneResponse<TData>
    >["queryFn"];
  };

  /**
   * Metadata cho dataProvider
   * Thông tin bổ sung gửi kèm request
   */
  meta?: MetaQuery;

  /**
   * Nếu có nhiều dataProvider, chỉ định cái nào sẽ dùng
   * @default "default"
   */
  dataProviderName?: string;
} & SuccessErrorNotification<
  GetOneResponse<TData>,
  TError,
  Prettify<{ id?: BaseKey } & MetaQuery>
> &
  LiveModeProps &
  UseLoadingOvertimeOptionsProps;

// Type cho return value (giá trị trả về) của useOne hook
export type UseOneReturnType<TData, TError> = {
  query: QueryObserverResult<GetOneResponse<TData>, TError>; // Object query từ React Query
  result: TData | undefined; // Dữ liệu đã unwrap (lấy ra)
} & UseLoadingOvertimeReturnType;

// ============================================================================
// PHẦN 4: KHAI BÁO HOOK USEONE
// ============================================================================

/**
 * 📚 HOOK USEONE - Lấy 1 bản ghi từ API
 *
 * 🎯 CHỨC NĂNG:
 * `useOne` là phiên bản customize của `useQuery` từ React Query
 * Dùng để lấy 1 item duy nhất từ một resource.
 *
 * 🔧 HOẠT ĐỘNG:
 * - Sử dụng method `getOne` từ dataProvider
 * - Tự động cache kết quả
 * - Tự động refetch khi cần
 * - Xử lý loading/error states
 * - Hỗ trợ realtime updates (live mode)
 * - Hiển thị notifications
 *
 * 💡 VÍ DỤ SỬ DỤNG:
 * ```typescript
 * const { query, result } = useOne({
 *   resource: "posts",
 *   id: 1
 * });
 *
 * if (query.isLoading) return <Loading />;
 * if (query.isError) return <Error />;
 * return <div>{result.title}</div>;
 * ```
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/data/useOne} - Tài liệu
 *
 * @typeParam TQueryFnData - Dữ liệu thô từ API. Extends {@link BaseRecord}
 * @typeParam TError - Kiểu lỗi custom. Extends {@link HttpError}
 * @typeParam TData - Dữ liệu sau khi transform bởi `select`. Defaults to `TQueryFnData`
 */

export const useOne = <
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TData extends BaseRecord = TQueryFnData,
>({
  resource: resourceFromProp,
  id,
  queryOptions,
  successNotification,
  errorNotification,
  meta,
  liveMode,
  onLiveEvent,
  liveParams,
  dataProviderName,
  overtimeOptions,
}: UseOneProps<TQueryFnData, TError, TData>): UseOneReturnType<TData, TError> &
  UseLoadingOvertimeReturnType => {
  // ============================================================================
  // PHẦN 5: KHỞI TẠO - LẤY CÁC DEPENDENCIES
  // ============================================================================

  /**
   * 🔍 LẤY RESOURCE PARAMS:
   *
   * useResourceParams giúp lấy thông tin về resource
   * - resources: danh sách tất cả resources
   * - resource: resource object hiện tại
   * - identifier: tên resource dạng string
   */
  const { resources, resource, identifier } = useResourceParams({
    resource: resourceFromProp,
  });

  // Lấy data provider function
  const dataProvider = useDataProvider();

  // Lấy hàm translate để dịch messages (i18n)
  const translate = useTranslate();

  // Lấy hàm checkError để xử lý errors
  const { mutate: checkError } = useOnError();

  // Lấy hàm để hiển thị notifications
  const handleNotification = useHandleNotification();

  // Lấy hàm getMeta (đã học ở hook #1)
  const getMeta = useMeta();

  // Lấy hàm tạo query keys
  const { keys } = useKeys();

  // ============================================================================
  // PHẦN 6: CHUẨN BỊ DỮ LIỆU
  // ============================================================================

  // Lưu meta để dùng sau
  const preferredMeta = meta;

  // Pick data provider phù hợp (nếu có nhiều data providers)
  const pickedDataProvider = pickDataProvider(
    identifier,
    dataProviderName,
    resources,
  );

  // Lấy hàm getOne từ data provider
  // getOne là function để fetch 1 record từ API
  const { getOne } = dataProvider(pickedDataProvider);

  // Kết hợp metadata từ nhiều nguồn
  const combinedMeta = getMeta({ resource, meta: preferredMeta });

  // ============================================================================
  // PHẦN 7: XÁC ĐỊNH ENABLED (QUERY CÓ CHẠY HAY KHÔNG)
  // ============================================================================

  /**
   * 📖 REACT QUERY - Enabled Option:
   *
   * enabled = true  -> Query sẽ chạy
   * enabled = false -> Query bị tắt (không fetch)
   *
   * Điều kiện để query chạy:
   * 1. Nếu user truyền queryOptions.enabled, dùng giá trị đó
   * 2. Nếu không, query chỉ chạy khi:
   *    - resource.name đã định nghĩa (có resource)
   *    - id đã định nghĩa (biết lấy record nào)
   *
   * VD: useOne({ id: undefined }) -> query không chạy vì thiếu ID
   */
  const isEnabled =
    typeof queryOptions?.enabled !== "undefined"
      ? queryOptions?.enabled === true // User tự định nghĩa enabled
      : typeof resource?.name !== "undefined" && typeof id !== "undefined"; // Auto detect

  // ============================================================================
  // PHẦN 8: SUBSCRIBE REALTIME UPDATES (LIVE MODE)
  // ============================================================================

  /**
   * 📡 REALTIME SUBSCRIPTION:
   *
   * useResourceSubscription subscribe các events realtime từ server
   * Khi có thay đổi (create/update/delete), hook sẽ tự động refetch data
   *
   * VD: User A chỉnh sửa post #1
   *     -> Server emit event
   *     -> User B (đang xem post #1) tự động nhận update
   */
  useResourceSubscription({
    resource: identifier,
    types: ["*"], // Subscribe tất cả types (create, update, delete, etc.)
    channel: `resources/${resource?.name}`,
    params: {
      ids: id ? [id] : [],
      id: id,
      meta: combinedMeta,
      subscriptionType: "useOne",
      ...liveParams,
    },
    enabled: isEnabled,
    liveMode,
    onLiveEvent,
    meta: {
      ...meta,
      dataProviderName: pickedDataProvider,
    },
  });

  // ============================================================================
  // PHẦN 9: GỌI USEQUERY - FETCH DỮ LIỆU (CORE LOGIC)
  // ============================================================================

  /**
   * 🚀 REACT QUERY - useQuery Hook:
   *
   * Đây là nơi CHÍNH để fetch dữ liệu!
   *
   * useQuery nhận 2 tham số quan trọng:
   * 1. queryKey: Unique key để identify query này
   * 2. queryFn: Function để fetch data (async function)
   *
   * React Query sẽ:
   * - Cache kết quả theo queryKey
   * - Tự động refetch khi cần
   * - Quản lý loading/error/success states
   * - Deduplicate requests (gộp requests giống nhau)
   */
  const queryResponse = useQuery<
    GetOneResponse<TQueryFnData>,
    TError,
    GetOneResponse<TData>
  >({
    // ============================================================================
    // QUERY KEY - Unique identifier cho query này
    // ============================================================================

    /**
     * 📖 QUERY KEY:
     *
     * Query key là array dùng để identify query
     * React Query dùng nó để:
     * - Cache data
     * - Invalidate (làm mới) cache
     * - Refetch data
     * - Share data giữa các components
     *
     * Cấu trúc key: ['data', 'default', 'posts', 'one', '1', { ... }]
     *                  ^       ^         ^        ^     ^      ^
     *                  |       |         |        |     |      |
     *                  |       |         |        |     |      metadata
     *                  |       |         |        |     id
     *                  |       |         |        action type
     *                  |       |         resource name
     *                  |       data provider name
     *                  scope
     *
     * Khi queryKey thay đổi -> React Query fetch lại data
     */
    queryKey: keys()
      .data(pickedDataProvider) // Scope: data queries
      .resource(identifier ?? "") // Resource name
      .action("one") // Action type: lấy 1 record
      .id(id ?? "") // ID của record
      .params({
        // Params/metadata
        ...(preferredMeta || {}),
      })
      .get(), // Build và return key array

    // ============================================================================
    // QUERY FUNCTION - Hàm để fetch data
    // ============================================================================

    /**
     * 📖 QUERY FUNCTION:
     *
     * queryFn là async function trả về data
     * React Query sẽ gọi function này để fetch data
     *
     * Context chứa thông tin như:
     * - queryKey: key của query
     * - signal: AbortSignal để cancel request
     * - meta: metadata
     */
    queryFn: (context) =>
      getOne<TQueryFnData>({
        resource: resource?.name ?? "",
        id: id!, // Non-null assertion (!) vì enabled đã check id !== undefined
        meta: {
          ...combinedMeta,
          ...prepareQueryContext(context as any),
        },
      }),

    // ============================================================================
    // SPREAD USER OPTIONS
    // ============================================================================

    // Spread các options user truyền vào
    // VD: staleTime, cacheTime, retry, select, onSuccess, onError,...
    ...queryOptions,

    // Override enabled với giá trị đã tính toán
    enabled: isEnabled,

    // Metadata cho DevTools
    meta: {
      ...queryOptions?.meta,
      ...getXRay("useOne", resource?.name),
    },
  });

  // ============================================================================
  // PHẦN 10: XỬ LÝ SUCCESS - HIỂN THỊ NOTIFICATION
  // ============================================================================

  /**
   * 📖 REACT HOOK - useEffect:
   *
   * useEffect này chạy khi query thành công
   * Hiển thị notification nếu user config
   */
  useEffect(() => {
    if (queryResponse.isSuccess && queryResponse.data) {
      // Tính toán notification config
      // successNotification có thể là:
      // - Object: { message: "...", description: "..." }
      // - Function: (data, params, identifier) => ({ ... })
      // - false: không hiện notification
      const notificationConfig =
        typeof successNotification === "function"
          ? successNotification(
              queryResponse.data,
              {
                id,
                ...combinedMeta,
              },
              identifier,
            )
          : successNotification;

      // Hiển thị notification
      handleNotification(notificationConfig);
    }
  }, [
    // Dependencies: chỉ chạy lại khi các giá trị này thay đổi
    queryResponse.isSuccess,
    queryResponse.data,
    successNotification,
  ]);

  // ============================================================================
  // PHẦN 11: XỬ LÝ ERROR - HIỂN THỊ NOTIFICATION LỖI
  // ============================================================================

  /**
   * 📖 ERROR HANDLING:
   *
   * useEffect này chạy khi query bị lỗi
   * Hiển thị error notification
   */
  useEffect(() => {
    if (queryResponse.isError && queryResponse.error) {
      // Gọi hàm checkError để xử lý error
      // (VD: logout nếu 401, redirect nếu 403,...)
      checkError(queryResponse.error);

      // Tính toán error notification config
      const notificationConfig =
        typeof errorNotification === "function"
          ? errorNotification(
              queryResponse.error,
              {
                id,
                ...combinedMeta,
              },
              identifier,
            )
          : errorNotification;

      // Hiển thị error notification với fallback message
      handleNotification(notificationConfig, {
        key: `${id}-${identifier}-getOne-notification`,
        message: translate(
          "notifications.error",
          { statusCode: queryResponse.error.statusCode },
          `Error (status code: ${queryResponse.error.statusCode})`,
        ),
        description: queryResponse.error.message,
        type: "error",
      });
    }
  }, [
    // Dependencies
    queryResponse.isError,
    queryResponse.error?.message,
  ]);

  // ============================================================================
  // PHẦN 12: THEO DÕI OVERTIME (LOADING QUÁ LÂU)
  // ============================================================================

  /**
   * 📊 LOADING OVERTIME:
   *
   * Theo dõi thời gian loading để hiển thị warning nếu quá lâu
   * VD: Nếu loading > 5s, hiện message "Đang tải lâu hơn bình thường..."
   */
  const { elapsedTime } = useLoadingOvertime({
    ...overtimeOptions,
    isLoading: queryResponse.isFetching,
  });

  // ============================================================================
  // PHẦN 13: RETURN KẾT QUẢ
  // ============================================================================

  /**
   * 📦 RETURN VALUE:
   *
   * Return object với 3 fields:
   * 1. query: Full query result từ React Query
   *    - isLoading, isError, isSuccess: boolean flags
   *    - data: dữ liệu (wrapped trong GetOneResponse)
   *    - error: error object (nếu có)
   *    - refetch: hàm để refetch
   *    - ...và nhiều fields khác từ React Query
   *
   * 2. result: Data đã unwrap (lấy ra từ response.data)
   *    - Dễ dùng hơn: dùng result.title thay vì query.data?.data?.title
   *
   * 3. overtime: Thông tin về thời gian loading
   */
  return {
    query: queryResponse,
    result: queryResponse.data?.data, // Unwrap: GetOneResponse<T> -> T
    overtime: { elapsedTime },
  };
};

// ============================================================================
// 🎉 KẾT THÚC FILE
// ============================================================================
//
// 📚 TÓM TẮT HOOK USEONE:
//
// 1. ✅ Fetch 1 record từ API sử dụng React Query
// 2. ✅ Tự động cache kết quả
// 3. ✅ Tự động refetch khi cần
// 4. ✅ Hỗ trợ realtime updates (live mode)
// 5. ✅ Hiển thị notifications (success/error)
// 6. ✅ Xử lý loading/error states
// 7. ✅ Theo dõi overtime (loading quá lâu)
// 8. ✅ Query key intelligent caching
//
// 📖 CÁC KHÁI NIỆM ĐÃ HỌC:
// - React Query: useQuery, queryKey, queryFn, caching
// - Query states: isLoading, isError, isSuccess
// - Query options: enabled, refetchOnWindowFocus, staleTime, etc.
// - useEffect dependencies array
// - Error handling và notifications
// - Realtime subscriptions
// - Type-safe API với TypeScript generics
//
// 🎯 SO SÁNH VỚI CÁCH TRUYỀN THỐNG:
//
// ❌ Cách cũ (useState + useEffect):
// ```typescript
// const [data, setData] = useState(null);
// const [loading, setLoading] = useState(false);
// const [error, setError] = useState(null);
//
// useEffect(() => {
//   setLoading(true);
//   fetch(`/api/posts/${id}`)
//     .then(res => res.json())
//     .then(data => setData(data))
//     .catch(err => setError(err))
//     .finally(() => setLoading(false));
// }, [id]);
// ```
// Vấn đề:
// - Không có caching
// - Phải tự quản lý loading/error
// - Không tự động refetch
// - Race conditions
// - Duplicate requests
//
// ✅ Cách mới (useOne):
// ```typescript
// const { query, result } = useOne({
//   resource: "posts",
//   id: id
// });
// ```
// Lợi ích:
// - Tự động cache
// - Tự động quản lý states
// - Tự động refetch
// - Deduplicate requests
// - Realtime updates
// - Type-safe
//
// 👏 Chúc mừng! Bạn vừa hiểu cách fetch dữ liệu với React Query!
// Hook tiếp theo sẽ là useCreate - tạo mới dữ liệu! 🚀
// ============================================================================
