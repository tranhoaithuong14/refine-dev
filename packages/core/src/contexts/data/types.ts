// ============================================================================
// 📚 DATA PROVIDER TYPES - KIỂU DỮ LIỆU CHO DATA PROVIDER
// ============================================================================

/**
 * 🎯 FILE NÀY LÀ GÌ?
 *
 * File này chứa TẤT CẢ các type definitions cho Data Provider của Refine.
 *
 * Data Provider là gì?
 * - Lớp trung gian giữa Refine và Backend API
 * - Giống "phiên dịch viên" giúp Refine giao tiếp với server
 * - Hỗ trợ REST API, GraphQL, và nhiều backend khác
 *
 * ⚠️ QUAN TRỌNG:
 * Nếu chưa hiểu TypeScript cơ bản (Generic, Extends, Union, etc.),
 * ĐỌC TRƯỚC file: packages/core/src/hooks/form/types.ts (dòng 82-680)
 */

import type { QueryFunctionContext, QueryKey } from "@tanstack/react-query";
import type { DocumentNode } from "graphql";

// ============================================================================
// PHẦN 1: UTILITY TYPES - CÁC TYPE TIỆN ÍCH CƠ BẢN
// ============================================================================

/**
 * 🎨 Prettify<T> - Làm đẹp type để dễ đọc trong IDE
 *
 * VẤN ĐỀ: Intersection (&) hiển thị khó đọc
 * type User = { name: string } & { age: number }
 * → IDE: { name: string } & { age: number } ❌
 *
 * GIẢI PHÁP: Prettify làm phẳng type
 * type User = Prettify<{ name: string } & { age: number }>
 * → IDE: { name: string; age: number } ✅
 *
 * CÁCH HOẠT ĐỘNG:
 * - [K in keyof T]: T[K] → Mapped Type lặp qua keys
 * - & {} → Trigger TypeScript "làm phẳng"
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * 🔑 BaseKey - Kiểu cho ID/Key của record
 *
 * BaseKey = string | number
 *
 * VD:
 * const id1: BaseKey = "abc123"  // ✅ string
 * const id2: BaseKey = 42        // ✅ number
 * const id3: BaseKey = true      // ❌ boolean không được
 *
 * TẠI SAO UNION?
 * - REST API: /users/1 (number)
 * - GraphQL/MongoDB: /users/507f1f77bcf86cd799439011 (string)
 */
export type BaseKey = string | number;

/**
 * 📦 BaseRecord - Type CƠ BẢN cho MỌI record
 *
 * ⭐ CỰC KỲ QUAN TRỌNG - Mọi data đều extends từ type này!
 *
 * CẤU TRÚC:
 * {
 *   id?: BaseKey;         // ID optional
 *   [key: string]: any;   // Cho phép BẤT KỲ thuộc tính nào
 * }
 *
 * GIẢI THÍCH:
 *
 * 1. id?: BaseKey
 *    - Optional (?) vì khi CREATE chưa có id
 *    - Có thể là string hoặc number
 *
 * 2. [key: string]: any
 *    - INDEX SIGNATURE
 *    - Cho phép thêm bất kỳ thuộc tính nào
 *    - key phải là string, value là any
 *
 * VD:
 * const user: BaseRecord = {
 *   id: 1,
 *   name: "John",
 *   age: 25
 * } // ✅ OK
 *
 * const newUser: BaseRecord = {
 *   name: "Jane"
 * } // ✅ OK - id optional
 *
 * TRONG CODE THẬT, NÊN ĐỊNH NGHĨA RÕ:
 * interface User extends BaseRecord {
 *   id: number;
 *   name: string;
 *   email: string;
 * }
 * → Type-safe + autocomplete!
 */
export type BaseRecord = {
  id?: BaseKey;
  [key: string]: any;
};

/**
 * 🏷️ BaseOption - Type cho option trong select/dropdown
 *
 * CẤU TRÚC:
 * {
 *   label: any;  // Nhãn hiển thị
 *   value: any;  // Giá trị thực
 * }
 *
 * VD:
 * const option1: BaseOption = {
 *   label: "Việt Nam",
 *   value: "VN"
 * }
 *
 * const option2: BaseOption = {
 *   label: "John Doe",
 *   value: 123
 * }
 *
 * DÙNG TRONG:
 * - Select component
 * - Dropdown menu
 * - Autocomplete
 * - Các form field cần chọn giá trị
 */
export type BaseOption = {
  label: any;
  value: any;
};

// ============================================================================
// PHẦN 2: GRAPHQL QUERY BUILDER TYPES
// ============================================================================

/**
 * 📋 Fields - Danh sách các field cần lấy từ GraphQL
 *
 * Fields = Array<string | object | NestedField>
 *
 * GIẢI THÍCH:
 * - Array: Mảng các field
 * - string: Tên field đơn giản
 * - object: Object tùy chỉnh
 * - NestedField: Field lồng nhau (có sub-fields)
 *
 * VD:
 * const fields: Fields = [
 *   "id",              // string - field đơn giản
 *   "name",            // string
 *   "email",           // string
 *   {                  // object - custom
 *     address: ["city", "country"]
 *   },
 *   {                  // NestedField - field lồng nhau
 *     operation: "posts",
 *     fields: ["id", "title"]
 *   }
 * ]
 *
 * → GraphQL query:
 * {
 *   id
 *   name
 *   email
 *   address {
 *     city
 *     country
 *   }
 *   posts {
 *     id
 *     title
 *   }
 * }
 */
export type Fields = Array<string | object | NestedField>;

/**
 * 🌳 NestedField - Field lồng nhau trong GraphQL query
 *
 * CẤU TRÚC:
 * {
 *   operation: string;              // Tên operation/field
 *   variables: QueryBuilderOptions[]; // Variables cho operation
 *   fields: Fields;                 // Sub-fields cần lấy
 * }
 *
 * VD: Lấy posts của user với phân trang
 * const nestedField: NestedField = {
 *   operation: "posts",
 *   variables: [{
 *     name: "limit",
 *     value: 10
 *   }],
 *   fields: ["id", "title", "content"]
 * }
 *
 * → GraphQL query:
 * {
 *   posts(limit: 10) {
 *     id
 *     title
 *     content
 *   }
 * }
 */
export type NestedField = {
  operation: string;
  variables: QueryBuilderOptions[];
  fields: Fields;
};

/**
 * ⚙️ VariableOptions - Options cho GraphQL variables
 *
 * UNION TYPE có 2 dạng:
 *
 * 1️⃣ DẠNG OBJECT CÓ CẤU TRÚC:
 * {
 *   type?: string;      // Kiểu GraphQL (VD: "Int", "String", "ID")
 *   name?: string;      // Tên variable
 *   value: any;         // Giá trị thực
 *   list?: boolean;     // Có phải array không?
 *   required?: boolean; // Có bắt buộc không?
 * }
 *
 * VD:
 * const var1: VariableOptions = {
 *   type: "ID",
 *   name: "id",
 *   value: 123,
 *   required: true
 * }
 * → GraphQL: query GetUser($id: ID!)
 *
 * const var2: VariableOptions = {
 *   type: "Int",
 *   name: "limit",
 *   value: 10,
 *   list: false,
 *   required: false
 * }
 * → GraphQL: query GetUsers($limit: Int)
 *
 * 2️⃣ DẠNG INDEX SIGNATURE:
 * { [k: string]: any }
 * → Object tùy ý, key là string, value là any
 *
 * VD:
 * const var3: VariableOptions = {
 *   customKey: "customValue",
 *   anotherKey: 123
 * }
 */
export type VariableOptions =
  | {
      type?: string;
      name?: string;
      value: any;
      list?: boolean;
      required?: boolean;
    }
  | { [k: string]: any };

/**
 * 🔧 QueryBuilderOptions - Options để build GraphQL query
 *
 * INTERFACE (không phải type) với các field optional:
 *
 * CẤU TRÚC:
 * {
 *   operation?: string;         // Tên operation (query/mutation)
 *   fields?: Fields;            // Fields cần lấy
 *   variables?: VariableOptions; // Variables cho query
 * }
 *
 * VD ĐẦY ĐỦ: Lấy user theo id
 * const queryOptions: QueryBuilderOptions = {
 *   operation: "getUser",
 *   fields: ["id", "name", "email", {
 *     operation: "posts",
 *     fields: ["id", "title"]
 *   }],
 *   variables: {
 *     type: "ID",
 *     name: "id",
 *     value: 123,
 *     required: true
 *   }
 * }
 *
 * → GraphQL query:
 * query GetUser($id: ID!) {
 *   getUser(id: $id) {
 *     id
 *     name
 *     email
 *     posts {
 *       id
 *       title
 *     }
 *   }
 * }
 *
 * TẠI SAO DÙNG INTERFACE?
 * - interface có thể extend
 * - Tốt hơn cho object types
 * - Dễ merge declarations
 */
export interface QueryBuilderOptions {
  operation?: string;
  fields?: Fields;
  variables?: VariableOptions;
}

// ============================================================================
// PHẦN 3: GRAPHQL OPTIONS
// ============================================================================

/**
 * 🔍 GraphQLQueryOptions - Options cho GraphQL queries/mutations
 *
 * Type này chứa các options đặc biệt cho GraphQL data providers.
 *
 * CẤU TRÚC:
 * {
 *   gqlQuery?: DocumentNode;      // GraphQL query
 *   gqlMutation?: DocumentNode;   // GraphQL mutation
 *   gqlVariables?: { [key: string]: any }; // Variables tùy chỉnh
 * }
 *
 * 📖 DocumentNode là gì?
 * - DocumentNode = AST (Abstract Syntax Tree) của GraphQL
 * - Được tạo bởi gql tag từ graphql-tag
 * - Là cách TypeScript hiểu GraphQL queries
 *
 * CÁCH DÙNG:
 * File này đã có ví dụ chi tiết bên dưới ↓
 */
export type GraphQLQueryOptions = {
  /**
   * @description GraphQL query to be used by data providers.
   * @optional
   * @example
   * ```tsx
   * import gql from 'graphql-tag'
   * import { useOne } from '@refinedev/core'
   *
   * const PRODUCT_QUERY = gql`
   *   query GetProduct($id: ID!) {
   *     product(id: $id) {
   *       id
   *       name
   *     }
   *   }
   * `
   *
   * useOne({
   *   id: 1,
   *   meta: { gqlQuery: PRODUCT_QUERY }
   * })
   * ```
   */
  gqlQuery?: DocumentNode;
  /**
   * @description GraphQL mutation to be used by data providers.
   * @optional
   * @example
   * ```tsx
   * import gql from 'graphql-tag'
   * import { useCreate } from '@refinedev/core'
   *
   * const PRODUCT_CREATE_MUTATION = gql`
   *   mutation CreateProduct($input: CreateOneProductInput!) {
   *     createProduct(input: $input) {
   *       id
   *       name
   *     }
   *   }
   * `
   * const { mutate } = useCreate()
   *
   * mutate({
   *   values: { name: "My Product" },
   *   meta: { gqlQuery: PRODUCT_QUERY }
   * })
   * ```
   */
  gqlMutation?: DocumentNode;

  /**
   * @description GraphQL Variables to be used for more advanced query filters by data providers. If filters correspond to table columns,
   *  these variables will not be presented in the initial filters selected and will not be reset or set by table column filtering.
   * @optional
   * @example
   * ```tsx
   * import gql from "graphql-tag";
   * import { useTable } from "@refinedev/antd";
   * import type { GetFieldsFromList } from "@refinedev/hasura";
   * import type { GetPostsQuery } from "graphql/types";
   *
   *    const POSTS_QUERY = gql`
   *      query GetPosts(
   *          $offset: Int!
   *          $limit: Int!
   *          $order_by: [posts_order_by!]
   *          $where: posts_bool_exp
   *      ) {
   *          posts(
   *              offset: $offset
   *              limit: $limit
   *              order_by: $order_by
   *              where: $where
   *          ) {
   *              id
   *              title
   *              category {
   *                  id
   *                  title
   *              }
   *          }
   *          posts_aggregate(where: $where) {
   *              aggregate {
   *                  count
   *              }
   *          }
   *      } `;
   *
   *
   *   export const PostList = () => {
   *     const { tableProps } = useTable<
   *       GetFieldsFromList<GetPostsQuery>
   *     >({
   *       meta: {
   *         gqlQuery: POSTS_QUERY,
   *         gqlVariables: {
   *           where: {
   *             _and: [
   *               {
   *                 title: {
   *                   _ilike: "%Updated%",
   *                 },
   *               },
   *               {
   *                 created_at: {
   *                   _gte: "2023-08-04T08:26:26.489116+00:00"
   *                 }
   *               }
   *             ],
   *           },
   *         },
   *       }
   *     });
   *    return ( <Table {...tableProps}/>);
   *  }
   *
   * ```
   */
  gqlVariables?: {
    [key: string]: any;
  };
};

/**
 * 🎯 MetaQuery - Metadata cho queries (QUAN TRỌNG!)
 *
 * MetaQuery = Tập hợp TẤT CẢ metadata có thể truyền vào query/mutation
 *
 * CẤU TRÚC (dùng Intersection &):
 * {
 *   [k: string]: any;                      // Cho phép thêm BẤT KỲ field nào
 *   queryContext?: Omit<...>;              // Context từ React Query
 * }
 * & QueryBuilderOptions                    // Options để build query
 * & GraphQLQueryOptions                    // Options cho GraphQL
 *
 * GIẢI THÍCH:
 *
 * 1. [k: string]: any
 *    - Index signature
 *    - Cho phép truyền BẤT KỲ metadata nào
 *    - Linh hoạt 100%
 *
 * 2. queryContext?: Omit<QueryFunctionContext, "meta">
 *    - Context từ React Query
 *    - Omit<T, K> = Bỏ field "meta" ra khỏi QueryFunctionContext
 *    - Tránh đệ quy vô hạn (meta trong meta)
 *
 * 3. & QueryBuilderOptions
 *    - Kế thừa: operation, fields, variables
 *
 * 4. & GraphQLQueryOptions
 *    - Kế thừa: gqlQuery, gqlMutation, gqlVariables
 *
 * VD SỬ DỤNG:
 * const meta: MetaQuery = {
 *   // Từ QueryBuilderOptions
 *   operation: "getUsers",
 *   fields: ["id", "name"],
 *
 *   // Từ GraphQLQueryOptions
 *   gqlQuery: MY_QUERY,
 *
 *   // Custom metadata
 *   headers: { "X-Custom": "value" },
 *   method: "GET",
 *   foo: "bar"
 * }
 *
 * DÙNG TRONG:
 * - useList({ meta })
 * - useOne({ meta })
 * - useCreate({ meta })
 * - useUpdate({ meta })
 * - useDelete({ meta })
 * → Truyền metadata xuống data provider!
 */
export type MetaQuery = {
  [k: string]: any;
  queryContext?: Omit<QueryFunctionContext, "meta">;
} & QueryBuilderOptions &
  GraphQLQueryOptions;

// ============================================================================
// PHẦN 4: PAGINATION, SORT & FILTER TYPES
// ============================================================================

/**
 * 📄 Pagination - Cấu hình phân trang
 *
 * INTERFACE với 3 fields optional:
 *
 * CẤU TRÚC:
 * {
 *   currentPage?: number;        // Trang hiện tại (default: 1)
 *   pageSize?: number;           // Số items mỗi trang (default: 10)
 *   mode?: "client" | "server" | "off"; // Chế độ phân trang
 * }
 *
 * GIẢI THÍCH MODE:
 *
 * 1. "server" (mặc định)
 *    - Phân trang phía SERVER
 *    - Mỗi lần đổi trang → Gọi API mới
 *    - Hiệu quả cho data lớn
 *    VD: Load trang 1 → API trả 10 items
 *        Load trang 2 → API trả 10 items khác
 *
 * 2. "client"
 *    - Phân trang phía CLIENT
 *    - Load TẤT CẢ data 1 lần → Phân trang ở browser
 *    - Tốt cho data nhỏ
 *    VD: Load 1 lần → API trả 100 items
 *        Trang 1: Hiển thị items 1-10
 *        Trang 2: Hiển thị items 11-20
 *        (Không gọi API!)
 *
 * 3. "off"
 *    - TẮT phân trang
 *    - Hiển thị TẤT CẢ data
 *
 * VD:
 * const pagination: Pagination = {
 *   currentPage: 1,
 *   pageSize: 20,
 *   mode: "server"
 * }
 *
 * useList({
 *   pagination
 * })
 */
export interface Pagination {
  /**
   * Initial page index
   * @default 1
   */
  currentPage?: number;
  /**
   * Initial number of items per page
   * @default 10
   */
  pageSize?: number;
  /**
   * Whether to use server side pagination or not.
   * @default "server"
   */
  mode?: "client" | "server" | "off";
}

/**
 * 🔑 IQueryKeys - Interface cho React Query cache keys
 *
 * React Query dùng keys để cache và quản lý data.
 * Interface này định nghĩa CHUẨN cho tất cả query keys trong Refine.
 *
 * CẤU TRÚC:
 * {
 *   all: QueryKey;                    // Key cho tất cả queries
 *   resourceAll: QueryKey;            // Key cho tất cả queries của resource
 *   list: (config?) => QueryKey;      // Key cho danh sách (có config)
 *   many: (ids?) => QueryKey;         // Key cho nhiều items
 *   detail: (id?) => QueryKey;        // Key cho 1 item
 *   logList: (meta?) => QueryKey;     // Key cho audit logs
 * }
 *
 * GIẢI THÍCH:
 *
 * QueryKey = Array bất kỳ
 * VD: ["posts"], ["posts", "list"], ["posts", "detail", 1]
 *
 * TẠI SAO CẦN QUERY KEYS?
 * - React Query dùng keys để cache data
 * - Key khác nhau = Cache khác nhau
 * - Invalidate key → Refetch data
 *
 * VD CÁCH DÙNG:
 *
 * const queryKeys = {
 *   all: ["posts"],
 *   resourceAll: ["posts", "all"],
 *   list: (config) => ["posts", "list", config],
 *   many: (ids) => ["posts", "many", ids],
 *   detail: (id) => ["posts", "detail", id],
 *   logList: (meta) => ["posts", "log", meta]
 * }
 *
 * // Dùng trong useQuery
 * useQuery(queryKeys.detail(1), ...)
 * → Cache key: ["posts", "detail", 1]
 *
 * useQuery(queryKeys.list({ currentPage: 1 }), ...)
 * → Cache key: ["posts", "list", { currentPage: 1 }]
 *
 * // Invalidate cache
 * queryClient.invalidateQueries(queryKeys.list())
 * → Xóa cache của tất cả list queries
 */
export interface IQueryKeys {
  all: QueryKey;
  resourceAll: QueryKey;
  list: (
    config?:
      | {
          pagination?: Required<Pagination>;
          hasPagination?: boolean;
          sorters?: CrudSort[];
          filters?: CrudFilter[];
        }
      | undefined,
  ) => QueryKey;
  many: (ids?: BaseKey[]) => QueryKey;
  detail: (id?: BaseKey) => QueryKey;
  logList: (meta?: Record<number | string, any>) => QueryKey;
}

// ============================================================================
// PHẦN 5: ERROR HANDLING TYPES
// ============================================================================

/**
 * ❌ ValidationErrors - Lỗi validation từ server
 *
 * INTERFACE với index signature:
 * [field: string]: string | string[] | boolean | { key: string; message: string }
 *
 * → Mỗi field có thể có nhiều dạng lỗi khác nhau
 *
 * GIẢI THÍCH CÁC DẠNG:
 *
 * 1️⃣ string - Lỗi đơn giản
 *    VD: { email: "Email không hợp lệ" }
 *
 * 2️⃣ string[] - Nhiều lỗi cho 1 field
 *    VD: { password: ["Quá ngắn", "Thiếu ký tự đặc biệt"] }
 *
 * 3️⃣ boolean - Flag có lỗi hay không
 *    VD: { terms: false } // Chưa đồng ý điều khoản
 *
 * 4️⃣ { key: string; message: string } - Lỗi có key i18n
 *    VD: { email: { key: "validation.email", message: "Invalid email" } }
 *
 * VD ĐẦY ĐỦ:
 * const errors: ValidationErrors = {
 *   email: "Email đã tồn tại",
 *   password: ["Quá ngắn", "Thiếu số"],
 *   terms: false,
 *   username: {
 *     key: "validation.username.taken",
 *     message: "Username is taken"
 *   }
 * }
 *
 * DÙNG TRONG:
 * - Form validation
 * - Server response errors
 * - Hiển thị lỗi cho user
 */
export interface ValidationErrors {
  [field: string]:
    | string
    | string[]
    | boolean
    | { key: string; message: string };
}

/**
 * 🚨 HttpError - Lỗi HTTP từ API (QUAN TRỌNG!)
 *
 * INTERFACE extends Record<string, any>:
 *
 * CẤU TRÚC:
 * {
 *   message: string;              // Thông báo lỗi
 *   statusCode: number;           // HTTP status code
 *   errors?: ValidationErrors;    // Chi tiết lỗi validation
 *   ...                           // Bất kỳ field nào khác
 * }
 *
 * GIẢI THÍCH:
 *
 * 1. extends Record<string, any>
 *    - Cho phép thêm BẤT KỲ field nào
 *    - Linh hoạt với mọi format lỗi từ server
 *
 * 2. message: string (bắt buộc)
 *    - Thông báo lỗi chính
 *    VD: "Unauthorized", "Not Found"
 *
 * 3. statusCode: number (bắt buộc)
 *    - HTTP status code
 *    VD: 400, 401, 403, 404, 500
 *
 * 4. errors?: ValidationErrors (optional)
 *    - Chi tiết lỗi từng field
 *    - Dùng khi 400 Bad Request
 *
 * VD 1: Lỗi 404
 * const error: HttpError = {
 *   message: "User not found",
 *   statusCode: 404
 * }
 *
 * VD 2: Lỗi 401
 * const error: HttpError = {
 *   message: "Unauthorized",
 *   statusCode: 401,
 *   detail: "Token expired"
 * }
 *
 * VD 3: Lỗi 400 với validation
 * const error: HttpError = {
 *   message: "Validation failed",
 *   statusCode: 400,
 *   errors: {
 *     email: "Email đã tồn tại",
 *     password: ["Quá ngắn", "Thiếu số"]
 *   }
 * }
 *
 * VD 4: Custom fields
 * const error: HttpError = {
 *   message: "Payment failed",
 *   statusCode: 402,
 *   paymentId: "pay_123",
 *   reason: "Insufficient funds"
 * }
 *
 * DÙNG TRONG:
 * - Data provider error handling
 * - useQuery/useMutation error
 * - Notification/Toast messages
 */
export interface HttpError extends Record<string, any> {
  message: string;
  statusCode: number;
  errors?: ValidationErrors;
}

/**
 * 🔄 RefineError - Alias cho HttpError
 *
 * Chỉ là tên khác của HttpError, dùng để tương thích backward.
 */
export type RefineError = HttpError;

/**
 * 🎭 MutationMode - Chế độ mutation (QUAN TRỌNG!)
 *
 * MutationMode = "pessimistic" | "optimistic" | "undoable"
 *
 * Quyết định KHI NÀO UI update sau khi user thao tác.
 *
 * GIẢI THÍCH 3 CHẾ ĐỘ:
 *
 * 1️⃣ "pessimistic" (mặc định) - Bi quan
 *    - Chờ server response → Mới update UI
 *    - An toàn nhất
 *    - Trải nghiệm chậm hơn
 *
 *    FLOW:
 *    User click Delete → Loading... → Server OK → UI update ✅
 *                                   → Server Error → Hiển thị lỗi ❌
 *
 *    VD: Xóa user
 *    Click Delete → Spinner quay → Server xóa xong → User biến mất
 *
 * 2️⃣ "optimistic" - Lạc quan
 *    - Update UI NGAY LẬP TỨC
 *    - Nếu server lỗi → Rollback lại
 *    - Trải nghiệm nhanh
 *    - Có thể gây nhầm lẫn nếu lỗi
 *
 *    FLOW:
 *    User click Delete → UI update ngay ✅ → Server processing...
 *                                         → Server OK: Giữ nguyên ✅
 *                                         → Server Error: Rollback + Lỗi ❌
 *
 *    VD: Like Facebook
 *    Click Like → Icon đỏ ngay → Server xử lý background
 *
 * 3️⃣ "undoable" - Có thể hoàn tác
 *    - Update UI ngay + Hiện nút UNDO
 *    - Delay vài giây trước khi gửi server
 *    - User có thể undo trong thời gian delay
 *    - Sau delay → Gửi server
 *
 *    FLOW:
 *    User click Delete → UI update + [UNDO button] → 5s delay...
 *                     → User click UNDO: Rollback ↩️
 *                     → Hết 5s: Gửi server → Server OK ✅
 *
 *    VD: Gmail Archive
 *    Archive email → Email biến mất + "Undo" banner 5s
 *                  → Click Undo: Email quay lại
 *                  → Không click: Sau 5s gửi server
 *
 * KHI NÀO DÙNG?
 * - pessimistic: Tác vụ quan trọng (payment, delete account)
 * - optimistic: Tác vụ thường xuyên (like, follow, vote)
 * - undoable: Tác vụ có thể undo (archive, move to trash)
 *
 * DÙNG TRONG:
 * useCreate({ mutationMode: "optimistic" })
 * useUpdate({ mutationMode: "undoable" })
 * useDelete({ mutationMode: "pessimistic" })
 */
export type MutationMode = "pessimistic" | "optimistic" | "undoable";

/**
 * 📊 QueryResponse<T> - Union của GetList và GetOne response
 *
 * QueryResponse = GetListResponse<T> | GetOneResponse<T>
 *
 * → Response có thể là:
 *   - GetListResponse: Danh sách records (data: T[], total: number)
 *   - GetOneResponse: 1 record (data: T)
 *
 * DÙNG TRONG:
 * - Type cho responses tổng quát
 * - Context queries
 */
export type QueryResponse<T = BaseRecord> =
  | GetListResponse<T>
  | GetOneResponse<T>;

/**
 * 📝 PreviousQuery<TData> - Tuple lưu query trước đó
 *
 * TUPLE TYPE: [QueryKey, TData | unknown]
 *
 * GIẢI THÍCH:
 * - Tuple = Array có độ dài cố định và type cụ thể cho từng phần tử
 * - [0]: QueryKey - Key của query
 * - [1]: TData | unknown - Data của query (hoặc unknown nếu chưa có)
 *
 * VD:
 * const prevQuery: PreviousQuery<User> = [
 *   ["users", "list"],           // QueryKey
 *   { data: [...], total: 100 }  // Data
 * ]
 *
 * DÙNG TRONG:
 * - Optimistic updates
 * - Rollback khi mutation fail
 * - Cache management
 */
export type PreviousQuery<TData> = [QueryKey, TData | unknown];

/**
 * 🔄 PrevContext<TData> - Context chứa các queries trước đó
 *
 * CẤU TRÚC:
 * {
 *   previousQueries: PreviousQuery<TData>[];  // Mảng các queries
 * }
 *
 * VD:
 * const prevContext: PrevContext<User> = {
 *   previousQueries: [
 *     [["users", "list"], { data: [...], total: 100 }],
 *     [["users", "detail", 1], { data: {...} }]
 *   ]
 * }
 *
 * DÙNG TRONG:
 * - Mutation context (onMutate)
 * - Lưu snapshot trước khi update
 * - Rollback nếu mutation fail
 *
 * FLOW:
 * 1. onMutate: Lưu previousQueries
 * 2. Mutation thành công: Xóa previousQueries
 * 3. Mutation fail: Rollback từ previousQueries
 */
export type PrevContext<TData> = {
  previousQueries: PreviousQuery<TData>[];
};

/**
 * 🎯 Context - Context chứa các queries (generic version)
 *
 * CẤU TRÚC:
 * {
 *   previousQueries: ContextQuery[];  // Mảng ContextQuery
 * }
 *
 * KHÁC VỚI PrevContext:
 * - PrevContext: Dùng PreviousQuery (tuple simple)
 * - Context: Dùng ContextQuery (object với query và queryKey riêng)
 *
 * VD:
 * const context: Context = {
 *   previousQueries: [
 *     {
 *       query: { data: [...], total: 100 },
 *       queryKey: ["users", "list"]
 *     },
 *     {
 *       query: { data: {...} },
 *       queryKey: ["users", "detail", 1]
 *     }
 *   ]
 * }
 */
export type Context = {
  previousQueries: ContextQuery[];
};

/**
 * 🔍 ContextQuery<T> - Query với key trong context
 *
 * CẤU TRÚC:
 * {
 *   query: QueryResponse<T>;  // Response (GetList hoặc GetOne)
 *   queryKey: QueryKey;       // Key của query
 * }
 *
 * GIẢI THÍCH:
 *
 * 1. query: QueryResponse<T>
 *    - Có thể là GetListResponse hoặc GetOneResponse
 *    - Chứa data thực tế
 *
 * 2. queryKey: QueryKey
 *    - Key để identify query
 *    - Dùng cho React Query cache
 *
 * VD 1: List query
 * const contextQuery: ContextQuery<User> = {
 *   query: {
 *     data: [
 *       { id: 1, name: "John" },
 *       { id: 2, name: "Jane" }
 *     ],
 *     total: 100
 *   },
 *   queryKey: ["users", "list", { page: 1 }]
 * }
 *
 * VD 2: Detail query
 * const contextQuery: ContextQuery<Post> = {
 *   query: {
 *     data: { id: 1, title: "Hello" }
 *   },
 *   queryKey: ["posts", "detail", 1]
 * }
 *
 * DÙNG TRONG:
 * - Mutation context
 * - Optimistic updates
 * - Query invalidation
 *
 * FLOW OPTIMISTIC UPDATE:
 * 1. onMutate: Snapshot current queries vào Context
 * 2. Optimistically update UI
 * 3. onError: Rollback từ Context.previousQueries
 * 4. onSuccess: Clear context
 */
export type ContextQuery<T = BaseRecord> = {
  query: QueryResponse<T>;
  queryKey: QueryKey;
};

// ============================================================================
// PHẦN 6: FILTER & SORT TYPES
// ============================================================================

/**
 * 🔍 CrudOperators - Toán tử lọc dữ liệu (CỰC KỲ QUAN TRỌNG!)
 *
 * Union Type gồm TẤT CẢ toán tử có thể dùng để filter data.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 📊 BẢNG TOÁN TỬ ĐẦY ĐỦ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ┌─────────────┬──────────────────────────────┬─────────────────────────┐
 * │ Toán tử     │ Mô tả                        │ Ví dụ                   │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ eq          │ Bằng (Equal)                 │ age eq 25               │
 * │ ne          │ Không bằng (Not Equal)       │ status ne "deleted"     │
 * │ lt          │ Nhỏ hơn (Less Than)          │ price lt 100            │
 * │ gt          │ Lớn hơn (Greater Than)       │ stock gt 0              │
 * │ lte         │ Nhỏ hơn hoặc bằng (<=)       │ age lte 30              │
 * │ gte         │ Lớn hơn hoặc bằng (>=)       │ score gte 50            │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ in          │ Nằm trong mảng               │ id in [1, 2, 3]         │
 * │ nin         │ Không nằm trong mảng         │ status nin ["draft"]    │
 * │ ina         │ In array (alias)             │ tags ina ["react"]      │
 * │ nina        │ Not in array (alias)         │ tags nina ["old"]       │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ contains    │ Chứa (không phân biệt hoa-  │ name contains "john"    │
 * │             │ thường)                      │ → "John", "Johnny"      │
 * │ ncontains   │ Không chứa                   │ title ncontains "test"  │
 * │ containss   │ Chứa (phân biệt hoa-thường)  │ name containss "John"   │
 * │             │                              │ → KHÔNG match "john"    │
 * │ ncontainss  │ Không chứa (case sensitive)  │ title ncontainss "Test" │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ startswith  │ Bắt đầu bằng (ignore case)   │ name startswith "a"     │
 * │ nstartswith │ Không bắt đầu bằng           │ email nstartswith "x"   │
 * │ startswiths │ Bắt đầu bằng (case sensitive)│ code startswiths "A"    │
 * │ nstartswiths│ Không bắt đầu (case sens.)   │ code nstartswiths "B"   │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ endswith    │ Kết thúc bằng (ignore case)  │ email endswith ".com"   │
 * │ nendswith   │ Không kết thúc bằng          │ file nendswith ".tmp"   │
 * │ endswiths   │ Kết thúc bằng (case sens.)   │ file endswiths ".PDF"   │
 * │ nendswiths  │ Không kết thúc (case sens.)  │ file nendswiths ".TMP"  │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ between     │ Nằm giữa 2 giá trị           │ age between [18, 65]    │
 * │ nbetween    │ Không nằm giữa               │ price nbetween [0, 10]  │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ null        │ Là null                      │ deletedAt null          │
 * │ nnull       │ Không null                   │ email nnull             │
 * ├─────────────┼──────────────────────────────┼─────────────────────────┤
 * │ or          │ HOẶC (logical OR)            │ Kết hợp nhiều điều kiện │
 * │ and         │ VÀ (logical AND)             │ Kết hợp nhiều điều kiện │
 * └─────────────┴──────────────────────────────┴─────────────────────────┘
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 💡 VÍ DỤ THỰC TẾ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * VD 1: Filter đơn giản
 * {
 *   field: "status",
 *   operator: "eq",
 *   value: "published"
 * }
 * → Lấy posts có status = "published"
 *
 * VD 2: Filter số
 * {
 *   field: "price",
 *   operator: "lte",
 *   value: 1000
 * }
 * → Lấy products có giá <= 1000
 *
 * VD 3: Filter mảng
 * {
 *   field: "id",
 *   operator: "in",
 *   value: [1, 2, 3, 5, 8]
 * }
 * → Lấy items có id trong danh sách
 *
 * VD 4: Filter text
 * {
 *   field: "title",
 *   operator: "contains",
 *   value: "react"
 * }
 * → Lấy posts có title chứa "react" (REACT, React, react đều OK)
 *
 * VD 5: Filter null
 * {
 *   field: "deletedAt",
 *   operator: "null",
 *   value: true
 * }
 * → Lấy items chưa bị xóa (deletedAt = null)
 *
 * VD 6: Filter between
 * {
 *   field: "createdAt",
 *   operator: "between",
 *   value: ["2024-01-01", "2024-12-31"]
 * }
 * → Lấy records tạo trong năm 2024
 *
 * VD 7: Kết hợp filters (OR)
 * [
 *   {
 *     operator: "or",
 *     value: [
 *       { field: "status", operator: "eq", value: "draft" },
 *       { field: "status", operator: "eq", value: "pending" }
 *     ]
 *   }
 * ]
 * → Lấy posts có status = "draft" HOẶC "pending"
 *
 * VD 8: Kết hợp filters (AND)
 * [
 *   { field: "category", operator: "eq", value: "tech" },
 *   { field: "published", operator: "eq", value: true },
 *   { field: "views", operator: "gte", value: 100 }
 * ]
 * → Lấy posts thuộc category "tech" VÀ đã published VÀ có >= 100 views
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 LƯU Ý QUAN TRỌNG
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. PHÂN BIỆT HOA-THƯỜNG:
 *    - Toán tử thường (contains, startswith, endswith): KHÔNG phân biệt
 *    - Toán tử có "s" cuối (containss, startswiths, endswiths): CÓ phân biệt
 *
 * 2. BACKEND SUPPORT:
 *    - Không phải backend nào cũng hỗ trợ TẤT CẢ operators
 *    - REST API đơn giản: Thường chỉ hỗ trợ eq, ne, in, contains
 *    - GraphQL/Hasura: Hỗ trợ đầy đủ
 *    → Kiểm tra data provider documentation!
 *
 * 3. CASE SENSITIVITY:
 *    - Tùy thuộc vào database
 *    - PostgreSQL: Mặc định case-sensitive
 *    - MySQL: Mặc định case-insensitive
 *    - MongoDB: Tùy collation
 *
 * DÙNG TRONG:
 * - useList({ filters: [...] })
 * - useTable({ filters: {...} })
 * - dataProvider.getList({ filters })
 */
export type CrudOperators =
  | "eq"
  | "ne"
  | "lt"
  | "gt"
  | "lte"
  | "gte"
  | "in"
  | "nin"
  | "ina"
  | "nina"
  | "contains"
  | "ncontains"
  | "containss"
  | "ncontainss"
  | "between"
  | "nbetween"
  | "null"
  | "nnull"
  | "startswith"
  | "nstartswith"
  | "startswiths"
  | "nstartswiths"
  | "endswith"
  | "nendswith"
  | "endswiths"
  | "nendswiths"
  | "or"
  | "and";

/**
 * ⬆️⬇️ SortOrder - Thứ tự sắp xếp
 *
 * SortOrder = "desc" | "asc" | null
 *
 * - "asc": Tăng dần (Ascending) - A→Z, 0→9, cũ→mới
 * - "desc": Giảm dần (Descending) - Z→A, 9→0, mới→cũ
 * - null: Không sắp xếp
 *
 * VD:
 * { field: "price", order: "asc" }  → Giá từ thấp đến cao
 * { field: "createdAt", order: "desc" } → Mới nhất trước
 */
export type SortOrder = "desc" | "asc" | null;

/**
 * 🔍 LogicalFilter - Filter logic thông thường
 *
 * CẤU TRÚC:
 * {
 *   field: string;     // Tên field cần filter
 *   operator: ...;     // Toán tử (KHÔNG bao gồm "or" và "and")
 *   value: any;        // Giá trị để so sánh
 * }
 *
 * GIẢI THÍCH operator:
 * Exclude<CrudOperators, "or" | "and">
 * → Lấy TẤT CẢ CrudOperators TRỪ "or" và "and"
 * → Chỉ còn: eq, ne, lt, gt, in, contains, ...
 *
 * VD 1: Filter bằng
 * {
 *   field: "status",
 *   operator: "eq",
 *   value: "published"
 * }
 *
 * VD 2: Filter lớn hơn
 * {
 *   field: "price",
 *   operator: "gt",
 *   value: 100
 * }
 *
 * VD 3: Filter chứa
 * {
 *   field: "title",
 *   operator: "contains",
 *   value: "react"
 * }
 */
export type LogicalFilter = {
  field: string;
  operator: Exclude<CrudOperators, "or" | "and">;
  value: any;
};

/**
 * 🔀 ConditionalFilter - Filter có điều kiện (OR/AND)
 *
 * CẤU TRÚC:
 * {
 *   key?: string;                        // Key tùy chọn (cho nested filters)
 *   operator: "or" | "and";              // CHỈ là "or" hoặc "and"
 *   value: (LogicalFilter | ConditionalFilter)[]; // Mảng filters
 * }
 *
 * GIẢI THÍCH operator:
 * Extract<CrudOperators, "or" | "and">
 * → Chỉ LẤY "or" và "and" từ CrudOperators
 *
 * GIẢI THÍCH value:
 * - Là MẢNG các filters
 * - Mỗi item có thể là LogicalFilter HOẶC ConditionalFilter
 * → Cho phép nested filters!
 *
 * VD 1: OR đơn giản
 * {
 *   operator: "or",
 *   value: [
 *     { field: "status", operator: "eq", value: "draft" },
 *     { field: "status", operator: "eq", value: "pending" }
 *   ]
 * }
 * → status = "draft" HOẶC status = "pending"
 *
 * VD 2: AND đơn giản
 * {
 *   operator: "and",
 *   value: [
 *     { field: "price", operator: "gte", value: 100 },
 *     { field: "price", operator: "lte", value: 1000 }
 *   ]
 * }
 * → price >= 100 VÀ price <= 1000
 *
 * VD 3: NESTED (OR trong AND)
 * {
 *   operator: "and",
 *   value: [
 *     { field: "category", operator: "eq", value: "tech" },
 *     {
 *       operator: "or",
 *       value: [
 *         { field: "status", operator: "eq", value: "draft" },
 *         { field: "status", operator: "eq", value: "pending" }
 *       ]
 *     }
 *   ]
 * }
 * → category = "tech" VÀ (status = "draft" HOẶC status = "pending")
 */
export type ConditionalFilter = {
  key?: string;
  operator: Extract<CrudOperators, "or" | "and">;
  value: (LogicalFilter | ConditionalFilter)[];
};

/**
 * 📋 CrudFilter - Union của LogicalFilter và ConditionalFilter
 *
 * CrudFilter = LogicalFilter | ConditionalFilter
 *
 * → Một filter có thể là:
 *   - LogicalFilter: Filter đơn giản (field, operator, value)
 *   - ConditionalFilter: Filter có điều kiện (or/and với nested filters)
 *
 * Đây là type chính để filter data trong Refine!
 */
export type CrudFilter = LogicalFilter | ConditionalFilter;

/**
 * ↕️ CrudSort - Cấu hình sắp xếp
 *
 * CẤU TRÚC:
 * {
 *   field: string;          // Field cần sắp xếp
 *   order: "asc" | "desc";  // Thứ tự
 * }
 *
 * VD 1: Sắp xếp theo giá tăng dần
 * {
 *   field: "price",
 *   order: "asc"
 * }
 *
 * VD 2: Sắp xếp theo ngày tạo giảm dần
 * {
 *   field: "createdAt",
 *   order: "desc"
 * }
 *
 * VD 3: Sắp xếp nhiều fields
 * [
 *   { field: "category", order: "asc" },
 *   { field: "price", order: "desc" }
 * ]
 * → Sắp xếp theo category A→Z, trong mỗi category sắp giá cao→thấp
 */
export type CrudSort = {
  field: string;
  order: "asc" | "desc";
};

/**
 * 📋 CrudFilters - Mảng các filters
 *
 * CrudFilters = CrudFilter[]
 *
 * VD:
 * const filters: CrudFilters = [
 *   { field: "status", operator: "eq", value: "published" },
 *   { field: "price", operator: "lte", value: 1000 }
 * ]
 */
export type CrudFilters = CrudFilter[];

/**
 * ↕️ CrudSorting - Mảng các sorts
 *
 * CrudSorting = CrudSort[]
 *
 * VD:
 * const sorters: CrudSorting = [
 *   { field: "createdAt", order: "desc" },
 *   { field: "title", order: "asc" }
 * ]
 */
export type CrudSorting = CrudSort[];

// ============================================================================
// PHẦN 7: RESPONSE TYPES - CÁC KIỂU RESPONSE TỪ API
// ============================================================================

/**
 * 📦 CustomResponse<TData> - Response tùy chỉnh
 *
 * INTERFACE với generic:
 * {
 *   data: TData;
 * }
 *
 * VD:
 * const response: CustomResponse<User> = {
 *   data: { id: 1, name: "John" }
 * }
 */
export interface CustomResponse<TData = BaseRecord> {
  data: TData;
}

/**
 * 📋 GetListResponse<TData> - Response cho getList (lấy danh sách)
 *
 * INTERFACE với generic (mặc định BaseRecord):
 *
 * CẤU TRÚC:
 * {
 *   data: TData[];          // Mảng records
 *   total: number;          // Tổng số records (cho pagination)
 *   [key: string]: any;     // Cho phép thêm fields tùy ý
 * }
 *
 * GIẢI THÍCH:
 *
 * 1. data: TData[]
 *    - Mảng các records
 *    - TData là kiểu của mỗi record
 *
 * 2. total: number (BẮT BUỘC!)
 *    - Tổng số records trong database
 *    - KHÔNG phải length của data array!
 *    - Dùng cho pagination
 *
 *    VD: Database có 100 users
 *        Page 1: data = 10 users, total = 100
 *        Page 2: data = 10 users, total = 100
 *        → total luôn là 100!
 *
 * 3. [key: string]: any
 *    - Index signature
 *    - Cho phép thêm fields khác
 *    VD: metadata, hasMore, nextCursor, ...
 *
 * VD 1: Response đơn giản
 * const response: GetListResponse<User> = {
 *   data: [
 *     { id: 1, name: "John" },
 *     { id: 2, name: "Jane" }
 *   ],
 *   total: 100  // Tổng 100 users trong DB
 * }
 *
 * VD 2: Response với metadata
 * const response: GetListResponse<Post> = {
 *   data: [...],
 *   total: 500,
 *   hasMore: true,
 *   nextPage: 3,
 *   fetchedAt: "2024-01-01"
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.getList()
 * - useList()
 * - useTable()
 */
export interface GetListResponse<TData = BaseRecord> {
  data: TData[];
  total: number;
  [key: string]: any;
}

/**
 * ➕ CreateResponse<TData> - Response cho create (tạo mới 1 record)
 *
 * CẤU TRÚC:
 * {
 *   data: TData;  // Record vừa tạo
 * }
 *
 * VD:
 * const response: CreateResponse<User> = {
 *   data: {
 *     id: 123,           // ID do server generate
 *     name: "John",
 *     createdAt: "..."   // Timestamp do server tạo
 *   }
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.create()
 * - useCreate()
 */
export interface CreateResponse<TData = BaseRecord> {
  data: TData;
}

/**
 * ➕➕ CreateManyResponse<TData> - Response cho createMany (tạo nhiều records)
 *
 * CẤU TRÚC:
 * {
 *   data: TData[];  // Mảng records vừa tạo
 * }
 *
 * VD:
 * const response: CreateManyResponse<User> = {
 *   data: [
 *     { id: 1, name: "John" },
 *     { id: 2, name: "Jane" },
 *     { id: 3, name: "Bob" }
 *   ]
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.createMany()
 * - useCreateMany()
 */
export interface CreateManyResponse<TData = BaseRecord> {
  data: TData[];
}

/**
 * ✏️ UpdateResponse<TData> - Response cho update (cập nhật 1 record)
 *
 * CẤU TRÚC:
 * {
 *   data: TData;  // Record sau khi update
 * }
 *
 * VD:
 * const response: UpdateResponse<User> = {
 *   data: {
 *     id: 1,
 *     name: "John Updated",  // Đã thay đổi
 *     updatedAt: "..."       // Timestamp mới
 *   }
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.update()
 * - useUpdate()
 */
export interface UpdateResponse<TData = BaseRecord> {
  data: TData;
}

/**
 * ✏️✏️ UpdateManyResponse<TData> - Response cho updateMany (update nhiều records)
 *
 * CẤU TRÚC:
 * {
 *   data: TData[];  // Mảng records sau khi update
 * }
 *
 * VD:
 * const response: UpdateManyResponse<User> = {
 *   data: [
 *     { id: 1, status: "active" },
 *     { id: 2, status: "active" },
 *     { id: 3, status: "active" }
 *   ]
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.updateMany()
 * - useUpdateMany()
 */
export interface UpdateManyResponse<TData = BaseRecord> {
  data: TData[];
}

/**
 * 🔍 GetOneResponse<TData> - Response cho getOne (lấy 1 record)
 *
 * CẤU TRÚC:
 * {
 *   data: TData;  // 1 record
 * }
 *
 * VD:
 * const response: GetOneResponse<User> = {
 *   data: {
 *     id: 1,
 *     name: "John",
 *     email: "john@test.com"
 *   }
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.getOne()
 * - useOne()
 * - useShow()
 */
export interface GetOneResponse<TData = BaseRecord> {
  data: TData;
}

/**
 * 🔍🔍 GetManyResponse<TData> - Response cho getMany (lấy nhiều records theo IDs)
 *
 * CẤU TRÚC:
 * {
 *   data: TData[];  // Mảng records
 * }
 *
 * VD:
 * // Request: getMany({ ids: [1, 3, 5] })
 * const response: GetManyResponse<User> = {
 *   data: [
 *     { id: 1, name: "John" },
 *     { id: 3, name: "Jane" },
 *     { id: 5, name: "Bob" }
 *   ]
 * }
 *
 * KHÁC VỚI GetListResponse:
 * - GetList: Lấy danh sách với pagination, filter, sort
 * - GetMany: Lấy nhiều records theo danh sách IDs cụ thể
 *
 * DÙNG TRONG:
 * - dataProvider.getMany()
 * - useMany()
 */
export interface GetManyResponse<TData = BaseRecord> {
  data: TData[];
}

/**
 * 🗑️ DeleteOneResponse<TData> - Response cho delete (xóa 1 record)
 *
 * CẤU TRÚC:
 * {
 *   data: TData;  // Record vừa xóa
 * }
 *
 * VD:
 * const response: DeleteOneResponse<User> = {
 *   data: {
 *     id: 1,
 *     name: "John"  // Thông tin record đã xóa
 *   }
 * }
 *
 * LƯU Ý:
 * - Một số API trả về record đã xóa
 * - Một số API chỉ trả về { success: true }
 * - Refine expect có field "data"
 *
 * DÙNG TRONG:
 * - dataProvider.deleteOne()
 * - useDelete()
 */
export interface DeleteOneResponse<TData = BaseRecord> {
  data: TData;
}

/**
 * 🗑️🗑️ DeleteManyResponse<TData> - Response cho deleteMany (xóa nhiều records)
 *
 * CẤU TRÚC:
 * {
 *   data: TData[];  // Mảng records vừa xóa
 * }
 *
 * VD:
 * const response: DeleteManyResponse<User> = {
 *   data: [
 *     { id: 1 },
 *     { id: 2 },
 *     { id: 3 }
 *   ]
 * }
 *
 * DÙNG TRONG:
 * - dataProvider.deleteMany()
 * - useDeleteMany()
 */
export interface DeleteManyResponse<TData = BaseRecord> {
  data: TData[];
}

// ============================================================================
// PHẦN 8: REQUEST PARAM TYPES - THAM SỐ GỬI VÀO DATA PROVIDER
// ============================================================================

/**
 * 📥 GetListParams - Tham số cho getList (lấy danh sách)
 *
 * {
 *   resource: string;          // Tên resource, VD: "posts"
 *   pagination?: Pagination;   // Phân trang (page/size hoặc cursor)
 *   sorters?: CrudSort[];      // Sắp xếp
 *   filters?: CrudFilter[];    // Bộ lọc tìm kiếm
 *   meta?: MetaQuery;          // Metadata tùy chỉnh (headers, gqlQuery,...)
 *   dataProviderName?: string; // Dùng multi-provider (tùy chọn)
 * }
 *
 * VD: dataProvider.getList({
 *   resource: "posts",
 *   pagination: { current: 1, pageSize: 10 },
 *   sorters: [{ field: "createdAt", order: "desc" }],
 *   filters: [{ field: "status", operator: "eq", value: "published" }],
 *   meta: { headers: { "X-Token": "abc" } }
 * });
 */
export interface GetListParams {
  resource: string;
  pagination?: Pagination;
  sorters?: CrudSort[];
  filters?: CrudFilter[];
  meta?: MetaQuery;
  dataProviderName?: string;
}

/**
 * 📥 GetManyParams - Tham số cho getMany (lấy nhiều record theo id)
 *
 * DÙNG KHI: Cần fetch nhiều id cụ thể trong 1 lần gọi.
 * VD: ids: [1, 2, 3] → 1 request thay vì 3.
 */
export interface GetManyParams {
  resource: string;
  ids: BaseKey[];
  meta?: MetaQuery;
  dataProviderName?: string;
}

/**
 * 📥 GetOneParams - Tham số cho getOne (lấy đúng 1 record)
 */
export interface GetOneParams {
  resource: string;
  id: BaseKey;
  meta?: MetaQuery;
}

/**
 * ✍️ CreateParams - Tham số cho create (tạo record)
 *
 * TVariables = payload gửi lên server.
 */
export interface CreateParams<TVariables = {}> {
  resource: string;
  variables: TVariables;
  meta?: MetaQuery;
}

/**
 * ✍️➕ CreateManyParams - Tham số cho createMany (tạo nhiều record)
 */
export interface CreateManyParams<TVariables = {}> {
  resource: string;
  variables: TVariables[];
  meta?: MetaQuery;
}

/**
 * 🛠 UpdateParams - Tham số cho update (cập nhật 1 record)
 *
 * LƯU Ý: id bắt buộc, variables chứa payload update.
 */
export interface UpdateParams<TVariables = {}> {
  resource: string;
  id: BaseKey;
  variables: TVariables;
  meta?: MetaQuery;
}

/**
 * 🛠🛠 UpdateManyParams - Tham số cho updateMany (cập nhật nhiều record)
 */
export interface UpdateManyParams<TVariables = {}> {
  resource: string;
  ids: BaseKey[];
  variables: TVariables;
  meta?: MetaQuery;
}

/**
 * 🗑 DeleteOneParams - Tham số cho deleteOne (xóa 1 record)
 *
 * variables?: payload thêm (soft delete flag, reason,...)
 */
export interface DeleteOneParams<TVariables = {}> {
  resource: string;
  id: BaseKey;
  variables?: TVariables;
  meta?: MetaQuery;
}

/**
 * 🗑🗑 DeleteManyParams - Tham số cho deleteMany (xóa nhiều record)
 */
export interface DeleteManyParams<TVariables = {}> {
  resource: string;
  ids: BaseKey[];
  variables?: TVariables;
  meta?: MetaQuery;
}

/**
 * 🌐 CustomParams - Gửi request tùy chỉnh (ngoài CRUD chuẩn)
 *
 * DÙNG KHI:
 * - Gọi endpoint đặc biệt (search, export, trigger job, upload,...)
 * - Cần kiểm soát method/payload/query/headers thủ công
 */
export interface CustomParams<TQuery = unknown, TPayload = unknown> {
  url: string;
  method: "get" | "delete" | "head" | "options" | "post" | "put" | "patch";
  sorters?: CrudSort[];
  filters?: CrudFilter[];
  payload?: TPayload;
  query?: TQuery;
  headers?: {};
  meta?: MetaQuery;
}

// ============================================================================
// PHẦN 9: DATA PROVIDER CONTRACT - HỢP ĐỒNG GIỮA REFINE VÀ BACKEND
// ============================================================================

/**
 * 🤝 DataProvider - Interface chuẩn mà mọi data provider phải implement.
 *
 * - Tất cả method return Promise.
 * - TData mặc định BaseRecord, override được theo resource.
 * - Hậu tố Many là OPTIONAL (?), implement nếu backend hỗ trợ.
 *
 * 🔤 GIẢI THÍCH GENERIC CHO MỖI METHOD:
 * - <TData extends BaseRecord = BaseRecord>: Kiểu record trả về. Nếu resource có shape riêng, truyền type đó (VD: Post, User).
 * - <TVariables = {}>: Payload gửi lên cho create/update/delete. Mặc định object rỗng, nên KHÔNG phải any.
 * - <TQuery = unknown, TPayload = unknown>: Payload/query cho custom; để linh hoạt với mọi endpoint đặc biệt.
 *
 * SƠ ĐỒ NHANH:
 * READ: getList, getMany?, getOne
 * CREATE: create, createMany?
 * UPDATE: update, updateMany?
 * DELETE: deleteOne, deleteMany?
 * CUSTOM: custom?
 * UTIL: getApiUrl
 */
export type DataProvider = {
  /**
   * 📥 getList<TData>
   * - TData: shape của mỗi record trong danh sách.
   * - Trả về GetListResponse<TData> (data: TData[], total: number).
   */
  getList: <TData extends BaseRecord = BaseRecord>(
    params: GetListParams,
  ) => Promise<GetListResponse<TData>>;

  /**
   * 📥 getMany?<TData>
   * - TData: shape record theo id (nhiều id cùng lúc).
   * - Dùng khi cần fetch dạng `ids: [...]` thay vì list/pagination.
   */
  getMany?: <TData extends BaseRecord = BaseRecord>(
    params: GetManyParams,
  ) => Promise<GetManyResponse<TData>>;

  /**
   * 📥 getOne<TData>
   * - TData: shape record duy nhất.
   * - Trả về GetOneResponse<TData> (data: TData).
   */
  getOne: <TData extends BaseRecord = BaseRecord>(
    params: GetOneParams,
  ) => Promise<GetOneResponse<TData>>;

  /**
   * ✍️ create<TData, TVariables>
   * - TData: record trả về sau khi tạo (có thể khác payload nếu server enrich).
   * - TVariables: payload gửi lên server (form values).
   */
  create: <TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: CreateParams<TVariables>,
  ) => Promise<CreateResponse<TData>>;

  /**
   * ✍️➕ createMany?<TData, TVariables>
   * - TData: shape từng record trả về.
   * - TVariables: payload cho mỗi phần tử trong mảng variables[].
   */
  createMany?: <TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: CreateManyParams<TVariables>,
  ) => Promise<CreateManyResponse<TData>>;

  /**
   * 🛠 update<TData, TVariables>
   * - TData: record sau cập nhật.
   * - TVariables: payload cập nhật (fields thay đổi).
   */
  update: <TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: UpdateParams<TVariables>,
  ) => Promise<UpdateResponse<TData>>;

  /**
   * 🛠🛠 updateMany?<TData, TVariables>
   * - TData: shape mỗi record sau cập nhật.
   * - TVariables: payload áp dụng cho tất cả ids[].
   */
  updateMany?: <TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: UpdateManyParams<TVariables>,
  ) => Promise<UpdateManyResponse<TData>>;

  /**
   * 🗑 deleteOne<TData, TVariables>
   * - TData: record bị xóa (nếu backend trả về).
   * - TVariables: payload tùy chọn (reason, softDelete flag,...).
   */
  deleteOne: <TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: DeleteOneParams<TVariables>,
  ) => Promise<DeleteOneResponse<TData>>;

  /**
   * 🗑🗑 deleteMany?<TData, TVariables>
   * - TData: shape mỗi record bị xóa.
   * - TVariables: payload áp dụng cho tất cả ids[].
   */
  deleteMany?: <TData extends BaseRecord = BaseRecord, TVariables = {}>(
    params: DeleteManyParams<TVariables>,
  ) => Promise<DeleteManyResponse<TData>>;

  getApiUrl: () => string;

  /**
   * 🌐 custom?<TData, TQuery, TPayload>
   * - TData: shape data trả về từ endpoint tùy chỉnh.
   * - TQuery: kiểu của query string/body GET (nếu có).
   * - TPayload: kiểu payload cho POST/PUT/PATCH/DELETE.
   *
   * Dùng khi endpoint không khớp CRUD mặc định (search nâng cao, export file, trigger job,...).
   */
  custom?: <
    TData extends BaseRecord = BaseRecord,
    TQuery = unknown,
    TPayload = unknown,
  >(
    params: CustomParams<TQuery, TPayload>,
  ) => Promise<CustomResponse<TData>>;
};

/**
 * 🔌 DataProviders - Registry nhiều provider (multi-backend)
 *
 * - field "default" bắt buộc.
 * - Các key khác là tên provider tùy ý (VD: "supabase", "localJson").
 */
export type DataProviders = {
  default: DataProvider;
  [key: string]: DataProvider;
};

export type IDataContext = DataProviders;

// Chấp nhận truyền 1 provider hoặc nhiều provider.
export type DataBindings = DataProvider | DataProviders;
