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

/**
 * ============================================================================
 * 🎓 BÀI GIẢNG: GENERIC TYPES TRONG TYPESCRIPT
 * ============================================================================
 *
 * Generic là một trong những tính năng QUAN TRỌNG NHẤT của TypeScript!
 * Hãy học kỹ phần này vì nó xuất hiện ở mọi nơi trong code TypeScript.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 1: GENERIC LÀ GÌ? 🤔                                           │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 📚 ĐỊNH NGHĨA:
 *
 * Generic Types (hay Generics) là cách để tạo ra các COMPONENT (function,
 * class, interface, type) có thể hoạt động với NHIỀU KIỂU DỮ LIỆU khác nhau,
 * mà vẫn giữ được TYPE SAFETY (an toàn kiểu).
 *
 * Hãy nghĩ về Generic như một "BIẾN CHO TYPE":
 * - Biến thông thường: const x = 5  (x chứa giá trị)
 * - Generic: type Box<T> = { value: T }  (T chứa kiểu dữ liệu)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 2: TẠI SAO CẦN GENERIC? 🎯                                     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ❌ VẤN ĐỀ KHÔNG DÙNG GENERIC:
 *
 * Giả sử bạn muốn tạo một function để lấy item đầu tiên trong array.
 *
 * CÁCH 1: Dùng type cụ thể (BAD!)
 * ```typescript
 * function getFirstNumber(arr: number[]): number {
 *   return arr[0];
 * }
 *
 * function getFirstString(arr: string[]): string {
 *   return arr[0];
 * }
 *
 * function getFirstBoolean(arr: boolean[]): boolean {
 *   return arr[0];
 * }
 *
 * // Phải viết lại function cho MỖI type! 😱
 * // Nếu có 100 types -> phải viết 100 functions!
 * ```
 *
 * CÁCH 2: Dùng any (BAD!)
 * ```typescript
 * function getFirst(arr: any[]): any {
 *   return arr[0];
 * }
 *
 * const numbers = [1, 2, 3];
 * const first = getFirst(numbers);
 * // first có type là any -> mất type safety! 😱
 * // TypeScript không biết first là number
 * // Có thể gọi first.toUpperCase() mà không bị lỗi compile!
 * ```
 *
 * ✅ GIẢI PHÁP: DÙNG GENERIC!
 * ```typescript
 * function getFirst<T>(arr: T[]): T {
 *   return arr[0];
 * }
 *
 * const numbers = [1, 2, 3];
 * const first = getFirst(numbers);
 * // TypeScript tự suy luận: T = number
 * // first có type là number ✅
 *
 * const strings = ["a", "b", "c"];
 * const firstStr = getFirst(strings);
 * // TypeScript tự suy luận: T = string
 * // firstStr có type là string ✅
 *
 * // MỘT function cho TẤT CẢ types!
 * // VẪN GIỮ ĐƯỢC type safety!
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 3: CÚ PHÁP GENERIC 📝                                          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 🔤 CÚ PHÁP CƠ BẢN:
 *
 * ```typescript
 * function functionName<T>(param: T): T {
 *                      ^        ^     ^
 *                      |        |     |
 *              Khai báo  Dùng   Return
 *              generic   trong  type
 *              parameter param
 * }
 * ```
 *
 * - <T>: Khai báo generic parameter (tên T là convention, có thể đặt tên khác)
 * - T: Sử dụng generic parameter như một type
 *
 * 📌 QUY ƯỚC ĐẶT TÊN:
 *
 * - T (Type): Generic parameter chung nhất
 * - K (Key): Thường dùng cho object keys
 * - V (Value): Thường dùng cho values
 * - E (Element): Thường dùng cho array elements
 * - R (Return): Thường dùng cho return types
 *
 * Trong Refine:
 * - TData: Type của data
 * - TError: Type của error
 * - TQueryFnData: Type của data thô từ query function
 * - TVariables: Type của variables
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 4: VÍ DỤ TỪ ĐƠN GIẢN ĐẾN PHỨC TẠP 📚                          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════
 * VÍ DỤ 1: Generic Function - Cơ bản nhất
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * // Generic function: identity (trả về chính nó)
 * function identity<T>(value: T): T {
 *   return value;
 * }
 *
 * // SỬ DỤNG:
 * const num = identity(42);
 * // TypeScript suy luận: T = number
 * // num: number = 42
 *
 * const str = identity("hello");
 * // TypeScript suy luận: T = string
 * // str: string = "hello"
 *
 * const obj = identity({ name: "John" });
 * // TypeScript suy luận: T = { name: string }
 * // obj: { name: string } = { name: "John" }
 *
 * // HOẶC CHỈ ĐỊNH TYPE RÕ RÀNG:
 * const num2 = identity<number>(42);
 * const str2 = identity<string>("hello");
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * VÍ DỤ 2: Generic với Array
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * // Reverse array
 * function reverseArray<T>(arr: T[]): T[] {
 *   return arr.reverse();
 * }
 *
 * const numbers = [1, 2, 3];
 * const reversed = reverseArray(numbers);
 * // reversed: number[] = [3, 2, 1]
 *
 * const strings = ["a", "b", "c"];
 * const reversedStr = reverseArray(strings);
 * // reversedStr: string[] = ["c", "b", "a"]
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * VÍ DỤ 3: Generic Type với Object
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * // Box chứa một giá trị bất kỳ
 * type Box<T> = {
 *   value: T;
 * };
 *
 * // SỬ DỤNG:
 * const numberBox: Box<number> = { value: 42 };
 * // numberBox.value có type là number
 *
 * const stringBox: Box<string> = { value: "hello" };
 * // stringBox.value có type là string
 *
 * const personBox: Box<{ name: string; age: number }> = {
 *   value: { name: "John", age: 30 }
 * };
 * // personBox.value có type là { name: string; age: number }
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * VÍ DỤ 4: Generic với NHIỀU Parameters
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * // Pair chứa 2 giá trị khác type
 * type Pair<T, U> = {
 *   first: T;
 *   second: U;
 * };
 *
 * // SỬ DỤNG:
 * const pair1: Pair<number, string> = {
 *   first: 42,      // number
 *   second: "hello" // string
 * };
 *
 * const pair2: Pair<string, boolean> = {
 *   first: "yes",  // string
 *   second: true   // boolean
 * };
 *
 * // Function với nhiều generic parameters
 * function createPair<T, U>(first: T, second: U): Pair<T, U> {
 *   return { first, second };
 * }
 *
 * const pair3 = createPair(1, "one");
 * // TypeScript suy luận: T = number, U = string
 * // pair3: Pair<number, string>
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * VÍ DỤ 5: Generic với Constraints (Ràng buộc)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * // T phải có property 'length'
 * function getLength<T extends { length: number }>(item: T): number {
 *   return item.length;
 * }
 *
 * // ✅ OK - string có length
 * const len1 = getLength("hello");  // 5
 *
 * // ✅ OK - array có length
 * const len2 = getLength([1, 2, 3]);  // 3
 *
 * // ❌ ERROR - number không có length
 * // const len3 = getLength(42);  // Type error!
 *
 * // extends BaseRecord nghĩa là T phải là BaseRecord hoặc subtype của nó
 * function processRecord<T extends BaseRecord>(record: T): T {
 *   // record chắc chắn có các properties của BaseRecord
 *   return record;
 * }
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * VÍ DỤ 6: Generic với Default Type
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * // T có default type là string
 * type Container<T = string> = {
 *   value: T;
 * };
 *
 * // Không chỉ định T -> dùng default (string)
 * const container1: Container = { value: "hello" };
 * // container1.value: string
 *
 * // Chỉ định T = number
 * const container2: Container<number> = { value: 42 };
 * // container2.value: number
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 5: GENERIC TRONG FILE useOne.ts - PHÂN TÍCH CHI TIẾT 🔍       │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * File useOne.ts sử dụng NHIỀU generic parameters. Hãy phân tích TỪNG CÁI:
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔷 GENERIC 1: BaseRecord
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * type BaseRecord = Record<string, any>;
 * ```
 *
 * GIẢI THÍCH:
 * - BaseRecord là type cơ bản cho MỌI record (bản ghi) trong Refine
 * - Record<string, any> nghĩa là: object với keys là string, values là any
 * - VD: { id: 1, name: "John", age: 30 }
 *
 * TẠI SAO CẦN?
 * - Đảm bảo data từ API luôn là object (không phải string, number, array...)
 * - Có thể mở rộng với properties bất kỳ
 *
 * VÍ DỤ:
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 *   content: string;
 * }
 *
 * // Post extends BaseRecord ✅
 * // Vì Post là object với keys là string
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔷 GENERIC 2: HttpError
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * type HttpError = {
 *   message: string;
 *   statusCode: number;
 * }
 * ```
 *
 * GIẢI THÍCH:
 * - HttpError là type cho lỗi HTTP
 * - Chứa message (thông báo lỗi) và statusCode (404, 500,...)
 *
 * TẠI SAO CẦN?
 * - Đảm bảo error object luôn có cấu trúc nhất định
 * - Có thể mở rộng với properties khác (errors, data,...)
 *
 * VÍ DỤ:
 * ```typescript
 * const error: HttpError = {
 *   message: "Not Found",
 *   statusCode: 404
 * };
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔷 GENERIC 3: GetOneResponse<T>
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * type GetOneResponse<TData = BaseRecord> = {
 *   data: TData;
 * }
 * ```
 *
 * GIẢI THÍCH:
 * - GetOneResponse là WRAPPER type cho response từ getOne API
 * - Nhận generic parameter TData (type của data bên trong)
 * - Default type của TData là BaseRecord
 *
 * TẠI SAO CẦN?
 * - API response luôn có cấu trúc { data: ... }
 * - TData cho phép specify type cụ thể của data
 *
 * VÍ DỤ:
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 * };
 *
 * // Response khi fetch một Post
 * type PostResponse = GetOneResponse<Post>;
 * // Kết quả:
 * // {
 * //   data: {
 * //     id: number;
 * //     title: string;
 * //   }
 * // }
 *
 * const response: PostResponse = {
 *   data: {
 *     id: 1,
 *     title: "Hello World"
 *   }
 * };
 *
 * response.data.id      // number ✅
 * response.data.title   // string ✅
 * response.data.age     // ERROR! ❌ (không có property age)
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔷 GENERIC 4-6: Hook Definition - TQueryFnData, TError, TData
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * export const useOne = <
 *   TQueryFnData extends BaseRecord = BaseRecord,
 *   TError extends HttpError = HttpError,
 *   TData extends BaseRecord = TQueryFnData,
 * >({ ... }) => { ... }
 * ```
 *
 * Đây là 3 GENERIC PARAMETERS chính của hook useOne!
 *
 * ─────────────────────────────────────────────────────────────────────
 * 🔸 TQueryFnData: Type của dữ liệu THÔ từ API
 * ─────────────────────────────────────────────────────────────────────
 *
 * GIẢI THÍCH:
 * - TQueryFnData là type của data TRƯỚC KHI transform
 * - extends BaseRecord: Phải là object
 * - Default = BaseRecord: Nếu không specify, dùng BaseRecord
 *
 * KHI NÀO DÙNG?
 * - Khi bạn muốn type-safe cho data từ API
 * - Khi bạn biết cấu trúc của data từ API
 *
 * VÍ DỤ:
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 *   content: string;
 * };
 *
 * const { query, result } = useOne<Post>({
 *   resource: "posts",
 *   id: 1
 * });
 *
 * // query.data có type: GetOneResponse<Post> | undefined
 * // query.data.data có type: Post
 * // query.data.data.title có type: string ✅
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────
 * 🔸 TError: Type của lỗi
 * ─────────────────────────────────────────────────────────────────────
 *
 * GIẢI THÍCH:
 * - TError là type của error object
 * - extends HttpError: Phải có message và statusCode
 * - Default = HttpError: Nếu không specify, dùng HttpError
 *
 * KHI NÀO DÙNG?
 * - Khi bạn có custom error type
 * - Khi API trả về error với cấu trúc khác
 *
 * VÍ DỤ:
 * ```typescript
 * type CustomError = HttpError & {
 *   errorCode: string;
 *   errors: string[];
 * };
 *
 * const { query, result } = useOne<Post, CustomError>({
 *   resource: "posts",
 *   id: 1
 * });
 *
 * // query.error có type: CustomError | null
 * if (query.error) {
 *   console.log(query.error.message);      // string ✅
 *   console.log(query.error.statusCode);   // number ✅
 *   console.log(query.error.errorCode);    // string ✅
 *   console.log(query.error.errors);       // string[] ✅
 * }
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────
 * 🔸 TData: Type của dữ liệu SAU KHI transform (select)
 * ─────────────────────────────────────────────────────────────────────
 *
 * GIẢI THÍCH:
 * - TData là type của data SAU KHI qua select function
 * - extends BaseRecord: Phải là object
 * - Default = TQueryFnData: Nếu không select, type giống TQueryFnData
 *
 * KHI NÀO DÙNG?
 * - Khi bạn dùng select để transform data
 * - Khi bạn chỉ cần một phần của data
 *
 * VÍ DỤ:
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 *   content: string;
 * };
 *
 * type PostTitle = {
 *   title: string;
 * };
 *
 * const { query, result } = useOne<Post, HttpError, PostTitle>({
 *   resource: "posts",
 *   id: 1,
 *   queryOptions: {
 *     select: (data) => ({
 *       data: {
 *         title: data.data.title
 *       }
 *     })
 *   }
 * });
 *
 * // result có type: PostTitle | undefined
 * // result.title có type: string ✅
 * // result.content  ❌ ERROR! (không có property này sau khi select)
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * 🔷 TÓM TẮT: 3 GENERIC PARAMETERS VÀ FLOW DỮ LIỆU
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```
 *                API RESPONSE
 *                     │
 *                     │ Type: GetOneResponse<TQueryFnData>
 *                     │ Data: { data: { id: 1, title: "...", content: "..." } }
 *                     ▼
 *              TQueryFnData
 *              (Data thô từ API)
 *                     │
 *                     │ Type: Post = { id, title, content }
 *                     │
 *                     ▼
 *          [SELECT FUNCTION (optional)]
 *                     │
 *                     │ Transform: (data) => ({ data: { title: data.data.title } })
 *                     │
 *                     ▼
 *                  TData
 *           (Data sau transform)
 *                     │
 *                     │ Type: PostTitle = { title }
 *                     │
 *                     ▼
 *                 RESULT
 *          (Data trả về component)
 *                     │
 *                     │ result.title ✅
 *                     │ result.content ❌ (không tồn tại)
 *                     ▼
 *               COMPONENT
 * ```
 *
 * FLOW CHI TIẾT:
 *
 * 1️⃣ API trả về data:
 *    Type: GetOneResponse<TQueryFnData>
 *    Value: { data: { id: 1, title: "Hello", content: "World" } }
 *
 * 2️⃣ React Query cache data với type TQueryFnData
 *
 * 3️⃣ Nếu có select function:
 *    - Input: GetOneResponse<TQueryFnData>
 *    - Output: GetOneResponse<TData>
 *    - Transform data theo logic của select
 *
 * 4️⃣ Hook trả về result:
 *    - Type: TData | undefined
 *    - Value: { title: "Hello" } (nếu có select)
 *           hoặc { id: 1, title: "Hello", content: "World" } (nếu không select)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 6: VÍ DỤ THỰC TẾ - SỬ DỤNG useOne VỚI GENERIC 💡              │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CASE 1: Không chỉ định generic (dùng default)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * const { query, result } = useOne({
 *   resource: "posts",
 *   id: 1
 * });
 *
 * // TQueryFnData = BaseRecord (default)
 * // TError = HttpError (default)
 * // TData = BaseRecord (default)
 *
 * // result có type: BaseRecord | undefined
 * // result có thể access bất kỳ property nào, nhưng type là any
 * console.log(result?.id);       // any
 * console.log(result?.title);    // any
 * console.log(result?.anything); // any - không có type safety! ⚠️
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CASE 2: Chỉ định TQueryFnData (khuyến khích!)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 *   content: string;
 *   authorId: number;
 * };
 *
 * const { query, result } = useOne<Post>({
 *   resource: "posts",
 *   id: 1
 * });
 *
 * // TQueryFnData = Post
 * // TError = HttpError (default)
 * // TData = Post (default = TQueryFnData)
 *
 * // result có type: Post | undefined
 * console.log(result?.id);       // number ✅
 * console.log(result?.title);    // string ✅
 * console.log(result?.content);  // string ✅
 * console.log(result?.age);      // ERROR! ❌ Property 'age' doesn't exist
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CASE 3: Chỉ định TQueryFnData + TError (custom error)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 * };
 *
 * type MyError = HttpError & {
 *   timestamp: Date;
 *   requestId: string;
 * };
 *
 * const { query, result } = useOne<Post, MyError>({
 *   resource: "posts",
 *   id: 1,
 *   errorNotification: (error, params, identifier) => {
 *     // error có type: MyError ✅
 *     console.log(error.message);     // string
 *     console.log(error.statusCode);  // number
 *     console.log(error.timestamp);   // Date ✅
 *     console.log(error.requestId);   // string ✅
 *
 *     return {
 *       message: `Error at ${error.timestamp}: ${error.message}`,
 *       description: `Request ID: ${error.requestId}`
 *     };
 *   }
 * });
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════
 * CASE 4: Chỉ định cả 3 generics (với select transform)
 * ═══════════════════════════════════════════════════════════════════════
 *
 * ```typescript
 * type Post = {
 *   id: number;
 *   title: string;
 *   content: string;
 *   authorId: number;
 *   createdAt: string;
 * };
 *
 * type PostPreview = {
 *   id: number;
 *   title: string;
 * };
 *
 * const { query, result } = useOne<Post, HttpError, PostPreview>({
 *   resource: "posts",
 *   id: 1,
 *   queryOptions: {
 *     select: (data) => ({
 *       // data có type: GetOneResponse<Post>
 *       // data.data có type: Post
 *       data: {
 *         id: data.data.id,       // number
 *         title: data.data.title  // string
 *       }
 *       // Return type: GetOneResponse<PostPreview>
 *     })
 *   }
 * });
 *
 * // result có type: PostPreview | undefined ✅
 * console.log(result?.id);       // number ✅
 * console.log(result?.title);    // string ✅
 * console.log(result?.content);  // ERROR! ❌ (không có sau khi select)
 * console.log(result?.authorId); // ERROR! ❌ (không có sau khi select)
 * ```
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ PHẦN 7: LỢI ÍCH CỦA GENERIC 🎉                                      │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * ✅ TYPE SAFETY:
 * - Catch lỗi ngay khi compile, không phải chờ runtime
 * - IDE autocomplete chính xác
 *
 * ✅ REUSABILITY:
 * - Một hook/function cho nhiều types
 * - Không cần copy-paste code
 *
 * ✅ MAINTAINABILITY:
 * - Dễ refactor
 * - Code tự document (type = documentation)
 *
 * ✅ DEVELOPER EXPERIENCE:
 * - IDE suggestions chính xác
 * - Giảm bugs
 * - Tăng confidence khi code
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 🎓 TỔNG KẾT - NHỮNG ĐIỀU CẦN NHỚ                                    │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * 1. ✅ Generic = "Biến cho Type"
 *    - Cho phép component hoạt động với nhiều types
 *
 * 2. ✅ Cú pháp: <T>
 *    - T là convention, có thể đặt tên khác
 *    - Có thể có nhiều generic: <T, U, V>
 *
 * 3. ✅ Constraints: <T extends SomeType>
 *    - Giới hạn T phải là subtype của SomeType
 *
 * 4. ✅ Default type: <T = DefaultType>
 *    - Nếu không specify T, dùng DefaultType
 *
 * 5. ✅ Trong useOne:
 *    - TQueryFnData: Data thô từ API
 *    - TError: Type của error
 *    - TData: Data sau transform (select)
 *
 * 6. ✅ Best practice:
 *    - LUÔN specify ít nhất TQueryFnData
 *    - Dùng TData khi có select
 *    - Dùng TError khi có custom error type
 *
 * 👏 Chúc mừng! Bạn đã hiểu Generic Types - một trong những khái niệm
 *    quan trọng nhất của TypeScript!
 */

// ═══════════════════════════════════════════════════════════════════════
// 📌 TYPE DEFINITIONS CHO useOne HOOK
// ═══════════════════════════════════════════════════════════════════════

/**
 * 🔷 UseOneProps<TQueryFnData, TError, TData>
 *
 * Type cho PROPS (tham số đầu vào) của useOne hook
 *
 * GENERIC PARAMETERS:
 * - TQueryFnData: Type của data thô từ API (extends BaseRecord)
 * - TError: Type của error (extends HttpError)
 * - TData: Type của data sau transform (extends BaseRecord)
 *
 * VÍ DỤ:
 * ```typescript
 * type Post = { id: number; title: string };
 *
 * const props: UseOneProps<Post, HttpError, Post> = {
 *   resource: "posts",
 *   id: 1
 * };
 * ```
 */
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
   * ============================================================================
   * 🤔 TẠI SAO PHẢI DÙNG useEffect ĐỂ XỬ LÝ NOTIFICATION?
   * ============================================================================
   *
   * ❓ CÂU HỎI: Tại sao không xử lý notification trực tiếp trong useQuery?
   *
   * ❌ CÁCH SAI (không thể làm như này):
   * ```typescript
   * const queryResponse = useQuery({...});
   *
   * // ❌ SAI - Không thể làm như này!
   * if (queryResponse.isSuccess) {
   *   handleNotification(...);  // Code này chạy MỖI LẦN component render!
   * }
   * ```
   *
   * 🔴 VẤN ĐỀ NẾU KHÔNG DÙNG useEffect:
   *
   * 1. CODE CHẠY MỖI LẦN RENDER:
   *    - Component render rất nhiều lần (khi state thay đổi, props thay đổi,...)
   *    - Code xử lý notification sẽ chạy mỗi lần render
   *    - User sẽ thấy notification bị hiện NHIỀU LẦN!
   *
   * 2. KHÔNG KIỂM SOÁT ĐƯỢC TIMING:
   *    - Không biết KHI NÀO nên hiện notification
   *    - Không biết query đã thành công CHƯA
   *    - Có thể hiện notification khi query còn đang loading!
   *
   * ✅ GIẢI PHÁP: DÙNG useEffect
   *
   * useEffect giúp:
   * - Chỉ chạy code KHI CẦN THIẾT (khi dependencies thay đổi)
   * - "Theo dõi" (watch) sự thay đổi của query state
   * - Hiện notification đúng 1 lần khi query thành công
   *
   * ============================================================================
   * 📚 KIẾN THỨC: useEffect HOOK
   * ============================================================================
   *
   * 🎯 CÚ PHÁP:
   * ```typescript
   * useEffect(() => {
   *   // Code trong này gọi là "effect function"
   *   // Chạy SAU KHI component render xong
   * }, [dep1, dep2, ...]);
   *    ^
   *    |
   *    Dependencies array (mảng phụ thuộc)
   * ```
   *
   * 🔧 CÁCH HOẠT ĐỘNG:
   *
   * 1. Component render lần đầu:
   *    - React render JSX
   *    - SAU ĐÓ chạy useEffect
   *
   * 2. Dependencies thay đổi:
   *    - React so sánh giá trị cũ vs mới
   *    - Nếu KHÁC -> chạy lại useEffect
   *    - Nếu GIỐNG -> không chạy
   *
   * 3. Component unmount (bị xóa):
   *    - Chạy cleanup function (nếu có)
   *
   * 💡 VÍ DỤ ĐƠN GIẢN:
   * ```typescript
   * function Counter() {
   *   const [count, setCount] = useState(0);
   *
   *   // useEffect này chạy MỖI KHI count thay đổi
   *   useEffect(() => {
   *     console.log("Count changed to:", count);
   *   }, [count]);
   *   //  ^
   *   //  Dependency: count
   *   //  Khi count thay đổi -> useEffect chạy lại
   *
   *   return <button onClick={() => setCount(count + 1)}>{count}</button>;
   * }
   * ```
   *
   * FLOW:
   * 1. Render lần đầu: count = 0 -> useEffect chạy -> log "Count changed to: 0"
   * 2. Click button: count = 1 -> re-render -> useEffect chạy -> log "Count changed to: 1"
   * 3. Click button: count = 2 -> re-render -> useEffect chạy -> log "Count changed to: 2"
   *
   * ============================================================================
   * 🎬 FLOW HOẠT ĐỘNG TRONG useOne HOOK
   * ============================================================================
   *
   * Hãy xem timeline chi tiết:
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ T0: Component mount - Render lần đầu                                │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 1. useOne hook được gọi
   * 2. useQuery bắt đầu fetch data
   * 3. queryResponse = {
   *      isLoading: true,
   *      isSuccess: false,  ← FALSE
   *      isError: false,
   *      data: undefined
   *    }
   * 4. Component render với loading state
   * 5. useEffect chạy:
   *    - Check: queryResponse.isSuccess = false
   *    - Không làm gì cả (vì if condition = false)
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ T1: Query thành công (sau 2 giây)                                   │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 1. API trả về data
   * 2. React Query cập nhật queryResponse:
   *    queryResponse = {
   *      isLoading: false,
   *      isSuccess: true,   ← CHANGED! (false -> true)
   *      isError: false,
   *      data: { data: {...} }  ← CHANGED! (undefined -> {...})
   *    }
   * 3. Component re-render (vì queryResponse thay đổi)
   * 4. useEffect chạy lại (vì dependencies thay đổi):
   *    - queryResponse.isSuccess đổi từ false -> true ✅
   *    - queryResponse.data đổi từ undefined -> {...} ✅
   * 5. useEffect chạy code trong if:
   *    - Tính toán notificationConfig
   *    - Gọi handleNotification()
   *    - User thấy notification "Tải thành công!" 🎉
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ T2: Component re-render vì lý do khác (vd: props thay đổi)          │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 1. Component re-render
   * 2. queryResponse vẫn giống cũ:
   *    queryResponse = {
   *      isSuccess: true,   ← KHÔNG ĐỔI
   *      data: { data: {...} }  ← KHÔNG ĐỔI
   *    }
   * 3. useEffect KHÔNG chạy (vì dependencies không đổi) ✅
   * 4. Notification KHÔNG bị hiện lại 👍
   *
   * ============================================================================
   * 🔍 PHÂN TÍCH DEPENDENCIES ARRAY
   * ============================================================================
   *
   * Dependencies trong useEffect này:
   * ```typescript
   * [
   *   queryResponse.isSuccess,    // Boolean: false -> true khi query thành công
   *   queryResponse.data,         // Object: undefined -> {...} khi có data
   *   successNotification,        // Function/Object từ user
   * ]
   * ```
   *
   * TẠI SAO CẦN MỖI DEPENDENCY?
   *
   * 1. queryResponse.isSuccess:
   *    - Theo dõi KHI NÀO query thành công
   *    - Khi đổi từ false -> true -> useEffect chạy
   *
   * 2. queryResponse.data:
   *    - Theo dõi data từ API
   *    - Nếu refetch và data thay đổi -> có thể hiện notification mới
   *
   * 3. successNotification:
   *    - Nếu user thay đổi config notification
   *    - useEffect chạy lại để áp dụng config mới
   *
   * ❓ ĐIỀU GÌ XẢY RA NẾU BỎ DEPENDENCIES?
   *
   * A. Nếu dependencies = []:
   * ```typescript
   * useEffect(() => {
   *   if (queryResponse.isSuccess && queryResponse.data) {
   *     handleNotification(...);
   *   }
   * }, []);  // ❌ SAI - Empty array
   * ```
   * - useEffect CHỈ chạy 1 lần khi component mount
   * - Lúc đó queryResponse.isSuccess = false
   * - Notification sẽ KHÔNG BAO GIỜ hiện! 🔴
   *
   * B. Nếu không có dependencies array:
   * ```typescript
   * useEffect(() => {
   *   if (queryResponse.isSuccess && queryResponse.data) {
   *     handleNotification(...);
   *   }
   * });  // ❌ SAI - No dependencies
   * ```
   * - useEffect chạy SAU MỖI LẦN RENDER
   * - Notification sẽ bị hiện NHIỀU LẦN! 🔴
   *
   * ============================================================================
   * 💡 SO SÁNH VỚI CÁCH KHÁC
   * ============================================================================
   *
   * CÁCH 1: Dùng useEffect (CÁCH HIỆN TẠI) ✅
   * ```typescript
   * const queryResponse = useQuery({...});
   *
   * useEffect(() => {
   *   if (queryResponse.isSuccess && queryResponse.data) {
   *     handleNotification(...);
   *   }
   * }, [queryResponse.isSuccess, queryResponse.data]);
   * ```
   *
   * ƯU ĐIỂM:
   * + Kiểm soát chính xác KHI NÀO notification hiện
   * + Có thể thêm logic phức tạp
   * + Dễ debug
   * + Notification chỉ hiện 1 lần khi query thành công
   *
   * NHƯỢC ĐIỂM:
   * - Code dài hơn chút
   *
   * ---
   *
   * CÁCH 2: Dùng onSuccess callback trong queryOptions ⚠️
   * ```typescript
   * const queryResponse = useQuery({
   *   queryKey: [...],
   *   queryFn: async () => {...},
   *   onSuccess: (data) => {
   *     handleNotification(...);  // Callback của React Query
   *   }
   * });
   * ```
   *
   * ƯU ĐIỂM:
   * + Code ngắn gọn
   * + Built-in feature của React Query
   *
   * NHƯỢC ĐIỂM:
   * - onSuccess có thể bị deprecated trong tương lai (React Query v5 khuyến khích dùng useEffect)
   * - Khó access các biến bên ngoài
   * - Callback chạy TRƯỚC khi component re-render (có thể gây issue)
   *
   * LÝ DO REFINE CHỌN CÁCH 1:
   * - Refine muốn kiểm soát tốt hơn
   * - Có logic phức tạp (check successNotification là function hay object)
   * - Tương thích tốt với tất cả versions của React Query
   * - Dễ maintain và debug
   *
   * ============================================================================
   * 📖 CODE THỰC TẾ DƯỚI ĐÂY
   * ============================================================================
   */

  /**
   * 🎯 useEffect #1: Xử lý SUCCESS notification
   *
   * CHỨC NĂNG:
   * - Theo dõi khi query thành công
   * - Hiện notification success nếu user config
   *
   * KHI NÀO CHẠY:
   * - Khi queryResponse.isSuccess đổi từ false -> true
   * - Khi queryResponse.data thay đổi (refetch)
   * - Khi successNotification config thay đổi
   *
   * FLOW:
   * 1. Check if query thành công (isSuccess = true và có data)
   * 2. Tính toán notification config:
   *    - Nếu successNotification là function -> gọi function
   *    - Nếu là object -> dùng trực tiếp
   *    - Nếu là false -> không hiện notification
   * 3. Gọi handleNotification để hiện notification
   */
  useEffect(() => {
    // ========================================================================
    // STEP 1: Kiểm tra điều kiện
    // ========================================================================
    //
    // Chỉ chạy khi:
    // - queryResponse.isSuccess = true (query đã thành công)
    // - queryResponse.data có giá trị (có data từ API)
    //
    if (queryResponse.isSuccess && queryResponse.data) {
      // ======================================================================
      // STEP 2: Tính toán notification config
      // ======================================================================
      //
      // successNotification có thể là:
      //
      // 1. Object:
      //    { message: "Tải thành công!", description: "..." }
      //
      // 2. Function:
      //    (data, params, identifier) => ({
      //      message: `Đã tải ${data.data.title}`,
      //      description: "..."
      //    })
      //
      // 3. false:
      //    Không hiện notification
      //
      const notificationConfig =
        typeof successNotification === "function"
          ? // Nếu là function -> gọi function với data, params, identifier
            successNotification(
              queryResponse.data, // Data từ API
              {
                id, // ID của record
                ...combinedMeta, // Metadata
              },
              identifier, // Resource identifier
            )
          : // Nếu không phải function -> dùng trực tiếp (object hoặc false)
            successNotification;

      // ======================================================================
      // STEP 3: Hiển thị notification
      // ======================================================================
      //
      // handleNotification sẽ:
      // - Nếu notificationConfig = false -> không hiện gì
      // - Nếu notificationConfig = object -> hiện notification
      //
      handleNotification(notificationConfig);
    }
  }, [
    // ==========================================================================
    // DEPENDENCIES ARRAY - Mảng phụ thuộc
    // ==========================================================================
    //
    // useEffect chỉ chạy lại KHI một trong các giá trị này THAY ĐỔI:
    //

    // 1. queryResponse.isSuccess
    //    - false khi đang loading
    //    - true khi query thành công
    //    - Khi đổi false -> true -> useEffect chạy -> hiện notification
    queryResponse.isSuccess,

    // 2. queryResponse.data
    //    - undefined khi đang loading
    //    - {...} khi có data
    //    - Nếu refetch và data thay đổi -> useEffect chạy lại
    queryResponse.data,

    // 3. successNotification
    //    - Config từ user
    //    - Nếu user đổi config -> useEffect chạy lại với config mới
    successNotification,

    // NOTE: Không cần thêm handleNotification, id, combinedMeta, identifier
    // vào dependencies vì:
    // - handleNotification là stable function (không đổi)
    // - id, combinedMeta, identifier đã được track qua successNotification
  ]);

  // ============================================================================
  // PHẦN 11: XỬ LÝ ERROR - HIỂN THỊ NOTIFICATION LỖI
  // ============================================================================

  /**
   * 🎯 useEffect #2: Xử lý ERROR notification
   *
   * ============================================================================
   * ❓ TẠI SAO CẦN useEffect THỨ 2?
   * ============================================================================
   *
   * CÂU HỎI: Tại sao không gộp chung với useEffect success ở trên?
   *
   * TRẢ LỜI: Vì SUCCESS và ERROR có DEPENDENCIES KHÁC NHAU!
   *
   * - Success useEffect theo dõi: isSuccess, data, successNotification
   * - Error useEffect theo dõi: isError, error.message, errorNotification
   *
   * Nếu gộp chung:
   * - Dependencies sẽ dài và khó quản lý
   * - Khó debug (không biết useEffect chạy vì success hay error)
   * - Performance kém hơn (useEffect chạy khi không cần thiết)
   *
   * ============================================================================
   * 🎬 FLOW HOẠT ĐỘNG KHI CÓ LỖI
   * ============================================================================
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ T0: Component mount - Render lần đầu                                │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 1. useOne hook được gọi
   * 2. useQuery bắt đầu fetch data
   * 3. queryResponse = {
   *      isLoading: true,
   *      isSuccess: false,
   *      isError: false,  ← FALSE
   *      error: null
   *    }
   * 4. Component render với loading state
   * 5. useEffect #2 chạy:
   *    - Check: queryResponse.isError = false
   *    - Không làm gì cả
   *
   * ┌─────────────────────────────────────────────────────────────────────┐
   * │ T1: Query bị lỗi (sau 2 giây)                                       │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 1. API trả về lỗi (VD: 404 Not Found)
   * 2. React Query cập nhật queryResponse:
   *    queryResponse = {
   *      isLoading: false,
   *      isSuccess: false,
   *      isError: true,  ← CHANGED! (false -> true)
   *      error: {  ← CHANGED! (null -> {...})
   *        message: "Not Found",
   *        statusCode: 404
   *      }
   *    }
   * 3. Component re-render (vì queryResponse thay đổi)
   * 4. useEffect #2 chạy lại (vì dependencies thay đổi):
   *    - queryResponse.isError đổi từ false -> true ✅
   *    - queryResponse.error.message đổi từ null -> "Not Found" ✅
   * 5. useEffect chạy code trong if:
   *    - Gọi checkError (có thể logout, redirect,...)
   *    - Tính toán error notificationConfig
   *    - Gọi handleNotification
   *    - User thấy error notification "Lỗi: Not Found" 🔴
   *
   * ============================================================================
   * CHỨC NĂNG:
   * ============================================================================
   *
   * - Theo dõi khi query bị lỗi
   * - Xử lý error (logout nếu 401, redirect nếu 403,...)
   * - Hiện error notification
   *
   * KHI NÀO CHẠY:
   * - Khi queryResponse.isError đổi từ false -> true
   * - Khi queryResponse.error.message thay đổi
   *
   * FLOW:
   * 1. Check if query bị lỗi (isError = true và có error)
   * 2. Gọi checkError để xử lý error
   * 3. Tính toán error notification config
   * 4. Hiện error notification với fallback message
   */
  useEffect(() => {
    // ========================================================================
    // STEP 1: Kiểm tra điều kiện
    // ========================================================================
    //
    // Chỉ chạy khi:
    // - queryResponse.isError = true (query bị lỗi)
    // - queryResponse.error có giá trị (có error object)
    //
    if (queryResponse.isError && queryResponse.error) {
      // ======================================================================
      // STEP 2: Xử lý error (checkError)
      // ======================================================================
      //
      // checkError là hàm từ useOnError hook
      // Xử lý các error đặc biệt:
      //
      // - 401 Unauthorized -> Logout user, redirect to login
      // - 403 Forbidden -> Show "Bạn không có quyền" message
      // - 404 Not Found -> (thường chỉ hiện notification)
      // - 500 Server Error -> (thường chỉ hiện notification)
      //
      // VÍ DỤ:
      // if (error.statusCode === 401) {
      //   localStorage.removeItem("token");
      //   window.location.href = "/login";
      // }
      //
      checkError(queryResponse.error);

      // ======================================================================
      // STEP 3: Tính toán error notification config
      // ======================================================================
      //
      // errorNotification có thể là:
      //
      // 1. Object:
      //    { message: "Lỗi!", description: "Không tìm thấy dữ liệu" }
      //
      // 2. Function:
      //    (error, params, identifier) => ({
      //      message: `Lỗi ${error.statusCode}`,
      //      description: error.message
      //    })
      //
      // 3. false:
      //    Không hiện notification (silent error)
      //
      const notificationConfig =
        typeof errorNotification === "function"
          ? // Nếu là function -> gọi function với error, params, identifier
            errorNotification(
              queryResponse.error, // Error object từ API
              {
                id, // ID của record
                ...combinedMeta, // Metadata
              },
              identifier, // Resource identifier
            )
          : // Nếu không phải function -> dùng trực tiếp (object hoặc false)
            errorNotification;

      // ======================================================================
      // STEP 4: Hiển thị error notification
      // ======================================================================
      //
      // handleNotification nhận 2 params:
      //
      // 1. notificationConfig: Config từ user (có thể false)
      // 2. fallback: Default notification nếu user không config
      //
      // LOGIC:
      // - Nếu notificationConfig = false -> không hiện gì
      // - Nếu notificationConfig = object -> dùng config đó
      // - Nếu notificationConfig = undefined -> dùng fallback
      //
      // VÍ DỤ FALLBACK:
      // {
      //   key: "1-posts-getOne-notification",  // Unique key (tránh duplicate)
      //   message: "Lỗi (status code: 404)",   // Translated message
      //   description: "Not Found",             // Error message từ API
      //   type: "error"                         // Type: success/error/warning/info
      // }
      //
      handleNotification(notificationConfig, {
        key: `${id}-${identifier}-getOne-notification`, // Unique key
        message: translate(
          "notifications.error", // i18n key
          { statusCode: queryResponse.error.statusCode }, // Params
          `Error (status code: ${queryResponse.error.statusCode})`, // Fallback
        ),
        description: queryResponse.error.message, // Error message
        type: "error", // Notification type
      });
    }
  }, [
    // ==========================================================================
    // DEPENDENCIES ARRAY - Mảng phụ thuộc
    // ==========================================================================
    //
    // useEffect chỉ chạy lại KHI một trong các giá trị này THAY ĐỔI:
    //

    // 1. queryResponse.isError
    //    - false khi đang loading hoặc thành công
    //    - true khi query bị lỗi
    //    - Khi đổi false -> true -> useEffect chạy -> hiện error notification
    queryResponse.isError,

    // 2. queryResponse.error?.message
    //    - undefined khi không có lỗi
    //    - "Not Found", "Server Error",... khi có lỗi
    //    - Nếu retry và error message thay đổi -> useEffect chạy lại
    //
    // NOTE: Dùng optional chaining (?.) vì error có thể null
    queryResponse.error?.message,

    // NOTE: Không cần thêm errorNotification vào dependencies
    // Vì đã được bao gồm qua isError và error.message
    // (Error notification chỉ hiện khi có error)
    //
    // NOTE: Không cần thêm checkError, handleNotification, translate,...
    // Vì đây là stable functions (không đổi)
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
