// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// Import hàm helper để chọn data provider phù hợp
import { pickDataProvider } from "@definitions/helpers";

// Import công cụ XRay cho debugging và monitoring
import { getXRay } from "@refinedev/devtools-internal";

// ============================================================================
// 🪝 WHAT ARE REACT HOOKS? - HOOKS LÀ GÌ?
// ============================================================================

/**
 * ❓ QUESTION: "Vậy hook là một function hả?"
 *
 * ✅ YES! A hook IS a function, but a SPECIAL kind of function with specific rules.
 *
 * **DEFINITION:**
 * A React Hook is a JavaScript function that:
 * 1. Lets you "hook into" React features (state, lifecycle, context, etc.)
 * 2. Can only be called inside React components or other custom hooks
 * 3. Must follow specific naming conventions and rules
 *
 * **HOOK vs REGULAR FUNCTION:**
 *
 * ┌────────────────────┬─────────────────┬──────────────────────────┐
 * │                    │ Regular Function│ React Hook               │
 * ├────────────────────┼─────────────────┼──────────────────────────┤
 * │ Is it a function?  │ Yes             │ Yes                      │
 * │ Naming convention  │ Any name        │ MUST start with "use"    │
 * │ Where to call?     │ Anywhere        │ Only in components/hooks │
 * │ Can use state?     │ No              │ Yes (with useState)      │
 * │ Can use effects?   │ No              │ Yes (with useEffect)     │
 * │ Order matters?     │ No              │ YES - must be consistent │
 * └────────────────────┴─────────────────┴──────────────────────────┘
 *
 * **EXAMPLE - REGULAR FUNCTION:**
 *
 * ```typescript
 * // This is NOT a hook - just a regular helper function
 * function formatDate(date: Date): string {
 *   return date.toISOString();
 * }
 *
 * // Can call anywhere
 * const result = formatDate(new Date());
 * ```
 *
 * **EXAMPLE - REACT HOOK:**
 *
 * ```typescript
 * // This IS a hook - starts with "use" and uses React features
 * function useCurrentTime() {
 *   const [time, setTime] = useState(new Date());  // ← Uses React state
 *
 *   useEffect(() => {  // ← Uses React effect
 *     const timer = setInterval(() => setTime(new Date()), 1000);
 *     return () => clearInterval(timer);
 *   }, []);
 *
 *   return time;
 * }
 *
 * // Can ONLY call inside components or other hooks
 * function MyComponent() {
 *   const time = useCurrentTime();  // ✅ Valid - inside component
 *   return <div>{time.toISOString()}</div>;
 * }
 *
 * // ❌ CANNOT call outside components
 * const globalTime = useCurrentTime();  // ❌ Error! Not in a component
 * ```
 *
 * **WHY THE NAME "HOOK"?**
 *
 * The word "hook" means to "attach" or "connect" something.
 * React Hooks let you "hook into" (connect to) React's internal features:
 *
 * - `useState` → hooks into state management
 * - `useEffect` → hooks into component lifecycle
 * - `useContext` → hooks into React context
 * - `useCreate` (this file) → hooks into data mutation + notifications + caching
 *
 * **THE RULES OF HOOKS:**
 *
 * React Hooks have strict rules that MUST be followed:
 *
 * 1. ✅ **Only call hooks at the TOP LEVEL**
 *    - Don't call inside loops, conditions, or nested functions
 *
 * ```typescript
 * function MyComponent() {
 *   // ✅ CORRECT - at top level
 *   const [count, setCount] = useState(0);
 *
 *   if (someCondition) {
 *     const [name, setName] = useState("");  // ❌ WRONG - inside condition
 *   }
 *
 *   for (let i = 0; i < 10; i++) {
 *     const value = useState(i);  // ❌ WRONG - inside loop
 *   }
 * }
 * ```
 *
 * 2. ✅ **Only call hooks from React functions**
 *    - Call from React components (function components)
 *    - Call from custom hooks (functions starting with "use")
 *
 * ```typescript
 * // ✅ CORRECT - calling from component
 * function MyComponent() {
 *   const { mutate } = useCreate();
 *   return <button onClick={() => mutate({...})}>Create</button>;
 * }
 *
 * // ✅ CORRECT - calling from custom hook
 * function useMyCustomHook() {
 *   const { mutate } = useCreate();
 *   return { createPost: mutate };
 * }
 *
 * // ❌ WRONG - calling from regular function
 * function regularFunction() {
 *   const { mutate } = useCreate();  // ❌ Error!
 * }
 *
 * // ❌ WRONG - calling outside any function
 * const { mutate } = useCreate();  // ❌ Error!
 * ```
 *
 * 3. ✅ **Use the "use" prefix for custom hooks**
 *
 * ```typescript
 * // ✅ CORRECT - starts with "use"
 * function useUserData() { ... }
 * function useCreate() { ... }
 *
 * // ❌ WRONG - doesn't start with "use" but uses hooks inside
 * function getUserData() {
 *   const [data] = useState();  // ❌ Breaks rules!
 * }
 * ```
 *
 * **TYPES OF HOOKS:**
 *
 * 1. **Built-in React Hooks** (from React library)
 *    - useState, useEffect, useContext, useRef, useMemo, useCallback, etc.
 *
 * 2. **Third-party Hooks** (from libraries)
 *    - useMutation (React Query) ← this file uses it
 *    - useQuery (React Query)
 *
 * 3. **Custom Hooks** (you create them)
 *    - useCreate ← THIS FILE! 🎯
 *    - useUpdate, useDelete, etc.
 *
 * **THIS FILE (useCreate) IS A CUSTOM HOOK THAT:**
 *
 * ```typescript
 * export const useCreate = (...) => {
 *   // Uses other hooks inside
 *   const dataProvider = useDataProvider();      // ← Hook
 *   const invalidateStore = useInvalidate();     // ← Hook
 *   const translate = useTranslate();            // ← Hook
 *   const mutation = useMutation({ ... });       // ← Hook
 *
 *   // Returns data and functions
 *   return {
 *     mutate: mutation.mutate,
 *     isPending: mutation.isPending,
 *     // ... more properties
 *   };
 * };
 * ```
 *
 * **SUMMARY:**
 *
 * - ✅ Hooks ARE functions
 * - ✅ But they're SPECIAL functions with rules
 * - ✅ They let you use React features without classes
 * - ✅ They must start with "use"
 * - ✅ They can only be called in components or other hooks
 * - ✅ `useCreate` is a custom hook that wraps `useMutation` and adds Refine features
 *
 * Before hooks (React < 16.8), you needed class components for state.
 * With hooks (React >= 16.8), you can use state in function components! 🎉
 */

// ============================================================================
// 📚 REACT QUERY MUTATIONS - KHÁI NIỆM QUAN TRỌNG
// ============================================================================

/**
 * 🔄 QUERY vs MUTATION - Sự khác biệt:
 *
 * ┌─────────────────┬──────────────────┬─────────────────┐
 * │                 │ QUERY (useQuery) │ MUTATION        │
 * ├─────────────────┼──────────────────┼─────────────────┤
 * │ Mục đích        │ ĐỌC dữ liệu      │ GHI dữ liệu     │
 * │ HTTP Methods    │ GET              │ POST/PUT/DELETE │
 * │ Caching         │ Có tự động       │ Không cache     │
 * │ Refetch         │ Có thể refetch   │ Không refetch   │
 * │ Khi nào dùng    │ Fetch data       │ Create/Update   │
 * └─────────────────┴──────────────────┴─────────────────┘
 *
 * VÍ DỤ:
 * - useQuery: Lấy danh sách posts, lấy chi tiết 1 post
 * - useMutation: Tạo post mới, sửa post, xóa post
 */

// Import các types và hook useMutation từ React Query
import {
  type UseMutationOptions, // Type cho options của useMutation
  type MutateOptions, // Type cho options khi gọi mutate()
  useMutation, // Hook chính để tạo mutations
} from "@tanstack/react-query";

// Import tất cả các hooks cần thiết từ Refine
import {
  useDataProvider, // Hook để lấy data provider (API client)
  useHandleNotification, // Hook để hiển thị thông báo thành công/lỗi
  useInvalidate, // Hook để xóa cache (invalidate queries)
  useKeys, // Hook để tạo query keys
  useLog, // Hook để ghi log (audit trail)
  useMeta, // Hook để lấy metadata (đã học ở Hook #1)
  useOnError, // Hook để xử lý lỗi global
  usePublish, // Hook để publish events (realtime)
  useRefineContext, // Hook để lấy Refine context
  useResourceParams, // Hook để lấy resource params
  useTranslate, // Hook để dịch ngôn ngữ (i18n)
} from "@hooks";

// Import các types cho dữ liệu
import type {
  BaseRecord, // Type cơ bản cho 1 record (bản ghi)
  CreateResponse, // Type cho response khi tạo mới
  HttpError, // Type cho HTTP errors
  IQueryKeys, // Type cho query keys
  MetaQuery, // Type cho metadata
} from "../../contexts/data/types";

// Import type cho mutation result
import type { UseMutationResult } from "../../definitions/types";

// Import type cho notifications
import type { SuccessErrorNotification } from "../../contexts/notification/types";

// Import hook và types cho loading overtime (theo dõi thời gian loading)
import {
  type UseLoadingOvertimeOptionsProps,
  type UseLoadingOvertimeReturnType,
  useLoadingOvertime,
} from "../useLoadingOvertime";

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA CÁC TYPES (KIỂU DỮ LIỆU)
// ============================================================================

/**
 * 📚 TYPE USECREATE PARAMS - Tham số cho mutation
 *
 * Đây là object chứa tất cả thông tin cần thiết để tạo mới 1 record
 */
export type UseCreateParams<TData, TError, TVariables> = {
  /**
   * 📌 resource: Tên resource (VD: "posts", "users")
   * Tương đương với tên bảng trong database hoặc endpoint API
   */
  resource?: string;

  /**
   * 📌 values: Dữ liệu để tạo mới
   * VD: { title: "New Post", content: "Hello World" }
   */
  values?: TVariables;

  /**
   * 📌 meta: Metadata bổ sung
   * VD: { headers: { "X-Custom": "value" } }
   */
  meta?: MetaQuery;

  /**
   * 📌 dataProviderName: Tên data provider nếu có nhiều provider
   * VD: "default", "graphql", "rest"
   */
  dataProviderName?: string;

  /**
   * 📌 invalidates: Các queries cần invalidate (xóa cache) sau khi tạo xong
   * VD: ["list", "many"] - xóa cache của useList và useMany
   *
   * 💡 TẠI SAO CẦN INVALIDATE?
   * Khi tạo mới 1 post, danh sách posts (useList) vẫn cache cũ.
   * Phải invalidate để useList refetch và hiển thị post mới.
   */
  invalidates?: Array<keyof IQueryKeys>;
} & SuccessErrorNotification<CreateResponse<TData>, TError, TVariables>;
// "&" nghĩa là kết hợp (merge) với type SuccessErrorNotification
// Type này chứa successNotification và errorNotification callbacks

/**
 * 📚 TYPE USECREATE RETURN TYPE - Kết quả trả về từ hook
 *
 * Đây là type cho object mà useCreate() trả về
 */
export type UseCreateReturnType<
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
> = UseMutationResult<
  CreateResponse<TData>, // Kiểu dữ liệu response khi thành công
  TError, // Kiểu dữ liệu error
  UseCreateParams<TData, TError, TVariables>, // Kiểu dữ liệu params
  unknown // Context type (dùng cho optimistic updates)
>;

/**
 * 📚 TYPE USECREATE PROPS - Props truyền vào hook
 *
 * Đây là type cho object config khi gọi useCreate()
 */
export type UseCreateProps<
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
> = {
  /**
   * 📌 mutationOptions: Options cho useMutation của React Query
   * Omit<..., "mutationFn"> nghĩa là loại bỏ field "mutationFn"
   * (vì mutationFn đã được hook tự động tạo)
   */
  mutationOptions?: Omit<
    UseMutationOptions<
      CreateResponse<TData>,
      TError,
      UseCreateParams<TData, TError, TVariables>,
      unknown
    >,
    "mutationFn"
  >;
} & UseLoadingOvertimeOptionsProps &
  UseCreateParams<TData, TError, TVariables>;

// ============================================================================
// PHẦN 3: KHAI BÁO HOOK USECREATE
// ============================================================================

/**
 * 📚 HOOK USECREATE - Tạo mới dữ liệu với React Query Mutations
 *
 * 🎯 CHỨC NĂNG:
 * Hook này dùng để TẠO MỚI (CREATE) dữ liệu trên server.
 * Nó bọc (wrap) useMutation của React Query và tự động xử lý:
 * - Gọi API create
 * - Hiển thị notifications
 * - Invalidate caches
 * - Publish events cho realtime
 * - Ghi logs
 *
 * 💡 VÍ DỤ SỬ DỤNG:
 * ```typescript
 * const { mutate } = useCreate();
 *
 * mutate({
 *   resource: "posts",
 *   values: { title: "New Post", content: "Hello" }
 * });
 *
 * // Hoặc với async/await:
 * const { mutateAsync } = useCreate();
 * const result = await mutateAsync({
 *   resource: "posts",
 *   values: { title: "New Post" }
 * });
 * ```
 *
 * 🔄 FLOW HOẠT ĐỘNG:
 * 1. User gọi mutate() với values
 * 2. Hook gọi dataProvider.create() để POST lên server
 * 3. Nếu thành công:
 *    - Hiển thị notification "Successfully created"
 *    - Invalidate queries (để refetch data mới)
 *    - Publish event cho realtime subscribers
 *    - Ghi log
 * 4. Nếu lỗi:
 *    - Hiển thị notification "Error creating"
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/data/useCreate} - Docs
 *
 * @typeParam TData - Kiểu dữ liệu của record được tạo
 * @typeParam TError - Kiểu dữ liệu của error
 * @typeParam TVariables - Kiểu dữ liệu của values (input)
 */

// ============================================================================
// 📖 EXPLAINING TYPESCRIPT FUNCTION SIGNATURE SYNTAX
// ============================================================================

/**
 * The next code block (lines 217-236) looks confusing if you're new to TypeScript.
 * Let's break it down piece by piece!
 *
 * **THE COMPLETE STRUCTURE:**
 *
 * ```typescript
 * export const functionName = <
 *   GenericParams     // ← Part 1: Generic type parameters
 * >(
 *   parameters        // ← Part 2: Function parameters
 * ): ReturnType => {  // ← Part 3: Return type
 *   // function body
 * };
 * ```
 *
 * **BREAKING DOWN OUR ACTUAL CODE:**
 *
 * ```typescript
 * export const useCreate = <              // ← Part 1.1: Function name
 *   TData extends BaseRecord = BaseRecord, // ← Part 1.2: Generic parameter 1
 *   TError extends HttpError = HttpError,  // ← Part 1.3: Generic parameter 2
 *   TVariables = {},                       // ← Part 1.4: Generic parameter 3
 * >(                                       // ← Part 1.5: Close generics, open params
 *   {                                      // ← Part 2.1: Start destructuring params
 *     resource: resourceFromProps,
 *     values: valuesFromProps,
 *     // ... more params
 *   }: UseCreateProps<TData, TError, TVariables> = {}  // ← Part 2.2: Type + default
 * ): UseCreateReturnType<                 // ← Part 3.1: Return type starts
 *   TData,
 *   TError,
 *   TVariables
 * > & UseLoadingOvertimeReturnType => {   // ← Part 3.2: Return type ends, body starts
 *   // function body
 * };
 * ```
 *
 * **PART 1: GENERIC TYPE PARAMETERS <...>**
 *
 * ```typescript
 * <TData extends BaseRecord = BaseRecord, ...>
 * ```
 *
 * This is like function parameters, but for TYPES instead of values.
 *
 * Syntax: `TypeName extends Constraint = DefaultType`
 *
 * - `TData`: Name of the generic type (by convention starts with T)
 * - `extends BaseRecord`: Constraint - TData must be a BaseRecord or subtype
 * - `= BaseRecord`: Default value - if user doesn't specify, use BaseRecord
 *
 * **ANALOGY WITH REGULAR FUNCTION PARAMETERS:**
 *
 * ```typescript
 * // Regular function parameter with default
 * function greet(name: string = "Guest") { }
 *              // ^^^^           ^^^^^^^
 *              // param name     default value
 *
 * // Generic type parameter with default
 * function process<TData extends BaseRecord = BaseRecord>() { }
 *                // ^^^^^                     ^^^^^^^^^^
 *                // type param name           default type
 * ```
 *
 * **WHY USE GENERICS?**
 *
 * Without generics:
 * ```typescript
 * const { mutate } = useCreate();
 * const result = await mutate({ ... });
 * result.data // ← TypeScript doesn't know what type this is
 * ```
 *
 * With generics:
 * ```typescript
 * interface Post { id: number; title: string; }
 * const { mutate } = useCreate<Post>();
 * const result = await mutate({ ... });
 * result.data // ← TypeScript knows this is Post!
 * result.data.title // ← Autocomplete works! ✅
 * result.data.age // ← Error: Property 'age' does not exist ❌
 * ```
 *
 * **PART 2: FUNCTION PARAMETERS**
 *
 * ```typescript
 * }: UseCreateProps<TData, TError, TVariables> = {}
 *    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^    ^^
 *    Type annotation                           Default value
 * ```
 *
 * This has THREE parts:
 *
 * A. The destructured parameter: `{ resource: resourceFromProps, ... }`
 * B. The type annotation: `: UseCreateProps<TData, TError, TVariables>`
 * C. The default value: `= {}`
 *
 * **Let's simplify to understand:**
 *
 * ```typescript
 * // Simple version - no destructuring
 * function example(props: UseCreateProps = {}) { }
 *                 // ^^^^^                  ^^
 *                 // param name             default value
 *
 * // With destructuring
 * function example({ resource }: UseCreateProps = {}) { }
 *                 // ^^^^^^^^^^  ^^^^^^^^^^^^^^^  ^^
 *                 // destructure type annotation  default value
 * ```
 *
 * **WHY DEFAULT = {} ?**
 *
 * This allows calling the hook with NO arguments:
 *
 * ```typescript
 * const { mutate } = useCreate();  // ← Works! Uses {} as default
 * const { mutate } = useCreate({ resource: "posts" });  // ← Also works!
 * ```
 *
 * Without `= {}`, you'd HAVE to pass an argument (even if empty):
 * ```typescript
 * const { mutate } = useCreate();    // ❌ Error: Expected 1 argument
 * const { mutate } = useCreate({});  // ✅ Required to pass empty object
 * ```
 *
 * **PART 3: RETURN TYPE**
 *
 * ```typescript
 * ): UseCreateReturnType<TData, TError, TVariables> & UseLoadingOvertimeReturnType
 *    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *    This is the return type
 * ```
 *
 * After the closing `)` of parameters, before `=>`, you specify the return type.
 *
 * The `&` means "intersection type" - combine two types:
 *
 * ```typescript
 * Type A & Type B = {
 *   ...all properties from Type A,
 *   ...all properties from Type B
 * }
 * ```
 *
 * So the hook returns an object that has:
 * - All properties from UseCreateReturnType (mutate, mutateAsync, isPending, etc.)
 * - All properties from UseLoadingOvertimeReturnType (elapsedTime)
 *
 * **SIMPLIFIED COMPARISON:**
 *
 * ```typescript
 * // JavaScript - simple function
 * const greet = (name = "Guest") => {
 *   return `Hello ${name}`;
 * };
 *
 * // TypeScript - with types
 * const greet = (name: string = "Guest"): string => {
 *   //           ^^^^              ^^^^^    ^^^^^^
 *   //           type              default  return type
 *   return `Hello ${name}`;
 * };
 *
 * // TypeScript - with generics + complex types
 * const greet = <TName extends string = string>(
 *   name: TName = "Guest" as TName
 * ): { message: string; input: TName } => {
 *   return { message: `Hello ${name}`, input: name };
 * };
 * ```
 *
 * **READING THE FULL SIGNATURE LINE BY LINE:**
 *
 * ```typescript
 * 217: export const useCreate = <           // 1. Declare function with generics
 * 218:   TData extends BaseRecord = BaseRecord,    // 2. Generic param 1
 * 219:   TError extends HttpError = HttpError,     // 3. Generic param 2
 * 220:   TVariables = {},                           // 4. Generic param 3
 * 221: >(                                          // 5. Close generics, open params
 * 222-230: { resource: ..., values: ..., }        // 6. Destructured parameters
 * 231: }: UseCreateProps<...> = {}                 // 7. Parameter type + default
 * 231: ): UseCreateReturnType<...>                 // 8. Return type starts
 * 232-234:   TData, TError, TVariables             // 9. Return type generic args
 * 235: > & UseLoadingOvertimeReturnType            // 10. Return type intersection
 * 236: => {                                        // 11. Arrow function body starts
 * ```
 *
 * **IN SUMMARY:**
 *
 * The syntax looks complex because it combines:
 * 1. ✅ Generic type parameters (for type safety)
 * 2. ✅ Destructured parameters (for cleaner code)
 * 3. ✅ Type annotations (for TypeScript checking)
 * 4. ✅ Default values (for optional arguments)
 * 5. ✅ Return type annotation (for type safety)
 * 6. ✅ Intersection types (to combine multiple return types)
 *
 * Once you understand each piece, it becomes readable! 🎉
 */

export const useCreate = <
  TData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables = {},
>({
  resource: resourceFromProps,
  values: valuesFromProps,
  dataProviderName: dataProviderNameFromProps,
  successNotification: successNotificationFromProps,
  errorNotification: errorNotificationFromProps,
  invalidates: invalidatesFromProps,
  meta: metaFromProps,
  mutationOptions,
  overtimeOptions,
}: UseCreateProps<TData, TError, TVariables> = {}): UseCreateReturnType<
  TData,
  TError,
  TVariables
> &
  UseLoadingOvertimeReturnType => {
  // ============================================================================
  // PHẦN 4: KHỞI TẠO CÁC HOOKS VÀ DEPENDENCIES
  // ============================================================================

  /**
   * 📖 EXPLAINING THE "FROMPROPS" PATTERN & DESTRUCTURING WITH RENAMING:
   *
   * **JAVASCRIPT/TYPESCRIPT SYNTAX EXPLANATION:**
   *
   * When you see this at line 222:
   * ```typescript
   * ({
   *   resource: resourceFromProps,
   *   values: valuesFromProps,
   *   ...
   * }: UseCreateProps<...> = {})
   * ```
   *
   * This is called "DESTRUCTURING WITH RENAMING" (or "destructuring assignment with aliasing")
   *
   * **HOW IT WORKS:**
   *
   * Normal destructuring (without renaming):
   * ```typescript
   * const { resource, values } = props;
   * // Creates variables: resource, values
   * ```
   *
   * Destructuring WITH renaming:
   * ```typescript
   * const { resource: resourceFromProps, values: valuesFromProps } = props;
   * // Creates variables: resourceFromProps, valuesFromProps
   * // NOT resource, NOT values
   * ```
   *
   * **SYNTAX BREAKDOWN:**
   * ```
   * { propertyName: newVariableName }
   *   ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^
   *   Property in    New variable name
   *   the object     to use in code
   * ```
   *
   * **WHY YOU CAN'T FIND "resourceFromProps" IN THE OBJECT:**
   *
   * When you call useCreate like this:
   * ```typescript
   * useCreate({
   *   resource: "posts",  // ← This is the property name in the object
   *   values: { ... }
   * })
   * ```
   *
   * The parameter destructuring extracts it:
   * ```typescript
   * { resource: resourceFromProps } = { resource: "posts" }
   * //          ^^^^^^^^^^^^^^^^^^
   * //          This is just a NEW variable name
   * //          The actual property is still "resource"
   * ```
   *
   * So:
   * - In the object you pass: property is named `resource`
   * - In the function body: variable is named `resourceFromProps`
   *
   * **WHY USE THIS PATTERN?**
   *
   * This hook allows overriding values when calling mutate():
   *
   * ```typescript
   * // Step 1: Initialize hook with default resource
   * const { mutate } = useCreate({
   *   resource: "posts"  // ← resourceFromProps = "posts"
   * });
   *
   * // Step 2: Can override when calling mutate
   * mutate({
   *   resource: "users",  // ← Override! Use "users" instead of "posts"
   *   values: { name: "John" }
   * });
   * ```
   *
   * The code later does:
   * ```typescript
   * mutationFn: ({
   *   resource: resourceName = resourceFromProps,  // Use resourceFromProps as default
   *   // If mutate() doesn't pass resource, use resourceFromProps
   *   // If mutate() passes resource, use that instead
   * })
   * ```
   *
   * **ANOTHER EXAMPLE TO CLARIFY:**
   *
   * ```typescript
   * // Without renaming:
   * function greet({ name }) {
   *   console.log(name); // Use "name" directly
   * }
   * greet({ name: "Alice" });
   *
   * // With renaming:
   * function greetRenamed({ name: userName }) {
   *   console.log(userName);  // Use "userName" instead
   *   // console.log(name);   // ❌ ERROR: "name" is not defined
   * }
   * greetRenamed({ name: "Alice" });
   * ```
   *
   * **IN SUMMARY:**
   * - `resource: resourceFromProps` means:
   *   + Extract the `resource` property from the object
   *   + Store it in a variable named `resourceFromProps`
   * - You search for "resourceFromProps" in the object and don't find it because
   *   it's NOT in the object - it's the NEW variable name created by destructuring
   * - The actual property in the object is just called `resource`
   */

  // Hook để kiểm tra và xử lý lỗi global
  const { mutate: checkError } = useOnError();

  // Hook để lấy data provider (API client)
  // VD: dataProvider("default").create({ resource: "posts", variables: {...} })
  const dataProvider = useDataProvider();

  // Hook để invalidate (xóa cache) queries
  // Sau khi tạo xong, phải xóa cache để fetch lại data mới
  const invalidateStore = useInvalidate();

  // Hook để lấy resources và hàm select resource
  const { resources, select } = useResourceParams();

  // Hook để dịch đa ngôn ngữ (i18n - internationalization)
  const translate = useTranslate();

  // Hook để publish events (cho realtime subscriptions)
  const publish = usePublish();

  // Hook để ghi log (audit trail)
  const { log } = useLog();

  // Hook để xử lý notifications (hiển thị toast/alert)
  const handleNotification = useHandleNotification();

  // Hook để lấy metadata (đã học ở Hook #1)
  const getMeta = useMeta();

  // Lấy text transformers từ Refine context
  // VD: singular("posts") => "post", plural("post") => "posts"
  const {
    options: { textTransformers },
  } = useRefineContext();

  // Hook để tạo query keys
  const { keys } = useKeys();

  // ============================================================================
  // PHẦN 5: TẠO MUTATION VỚI USEMUTATION
  // ============================================================================

  /**
   * 📚 USEMUTATION - Hook chính của React Query cho mutations
   *
   * Cấu trúc:
   * useMutation({
   *   mutationFn: (variables) => Promise,  // Hàm thực hiện mutation
   *   onSuccess: (data, variables) => {}, // Callback khi thành công
   *   onError: (error, variables) => {},  // Callback khi lỗi
   *   mutationKey: [...],                 // Key để tracking mutation
   * })
   *
   * 🔄 SO SÁNH VỚI USEQUERY:
   *
   * useQuery({
   *   queryKey: [...],         // Dùng để cache
   *   queryFn: () => Promise,  // Fetch data
   *   enabled: true,           // Tự động fetch
   * })
   *
   * useMutation({
   *   mutationFn: (vars) => Promise,  // Không tự động chạy
   *   onSuccess: ...,                 // Có callbacks
   * })
   *
   * Khác biệt:
   * - Query tự động chạy, Mutation phải gọi mutate() thủ công
   * - Query cache data, Mutation không cache
   * - Query dùng queryKey để cache, Mutation dùng mutationKey để track
   */
  const mutationResult = useMutation<
    CreateResponse<TData>, // Type của data trả về khi thành công
    TError, // Type của error
    UseCreateParams<TData, TError, TVariables>, // Type của variables (input)
    unknown // Type của context (cho optimistic updates)
  >({
    // ========================================================================
    // mutationFn: Hàm chính để thực hiện mutation
    // ========================================================================

    /**
     * 📚 MUTATION FUNCTION - Hàm gọi API create
     *
     * Hàm này sẽ được gọi khi user gọi mutate({ ... })
     * Nó nhận variables và gọi dataProvider.create()
     *
     * @param variables - Object chứa resource, values, meta, dataProviderName
     * @returns Promise<CreateResponse<TData>> - Promise trả về data đã tạo
     */
    mutationFn: ({
      resource: resourceName = resourceFromProps,
      values = valuesFromProps,
      meta = metaFromProps,
      dataProviderName = dataProviderNameFromProps,
    }: UseCreateParams<TData, TError, TVariables>) => {
      // ======================================================================
      // BƯỚC 1: Validation - Kiểm tra dữ liệu đầu vào
      // ======================================================================

      /**
       * 📖 ERROR HANDLING - Ném lỗi nếu thiếu dữ liệu bắt buộc
       *
       * throw: Từ khóa để ném (throw) 1 error
       * Khi throw error, function sẽ dừng ngay lập tức
       * Error sẽ được catch bởi onError callback
       */

      // Kiểm tra values (dữ liệu tạo mới) có tồn tại không
      if (!values) throw missingValuesError;

      // Kiểm tra resourceName (tên resource) có tồn tại không
      if (!resourceName) throw missingResourceError;

      // ======================================================================
      // BƯỚC 2: Lấy thông tin resource
      // ======================================================================

      /**
       * 📚 SELECT RESOURCE - Lấy resource config
       *
       * select(resourceName) trả về:
       * - resource: Object chứa config của resource
       * - identifier: Tên identifier (thường giống resourceName)
       */
      const { resource, identifier } = select(resourceName);

      // ======================================================================
      // BƯỚC 3: Kết hợp metadata
      // ======================================================================

      /**
       * 📚 COMBINE META - Gộp metadata từ nhiều nguồn
       *
       * getMeta() đã học ở Hook #1
       * Nó kết hợp meta từ: resource + URL params + props + context
       */
      const combinedMeta = getMeta({
        resource,
        meta,
      });

      // ======================================================================
      // BƯỚC 4: Gọi dataProvider.create() để POST lên server
      // ======================================================================

      /**
       * 📚 DATA PROVIDER CREATE - Gọi API để tạo mới
       *
       * Flow:
       * 1. dataProvider(name) - Lấy data provider cụ thể
       * 2. .create<TData, TVariables>({ ... }) - Gọi method create
       * 3. Trả về Promise<CreateResponse<TData>>
       *
       * VD:
       * dataProvider("default").create({
       *   resource: "posts",
       *   variables: { title: "New Post", content: "Hello" },
       *   meta: { headers: {...} }
       * })
       * => POST /posts với body { title: "New Post", content: "Hello" }
       * => Trả về { data: { id: 1, title: "New Post", ... } }
       */
      return dataProvider(
        pickDataProvider(identifier, dataProviderName, resources),
      ).create<TData, TVariables>({
        resource: resource.name,
        variables: values,
        meta: combinedMeta,
      });
    },

    // ========================================================================
    // onSuccess: Callback khi mutation thành công
    // ========================================================================

    /**
     * 📚 ON SUCCESS CALLBACK - Xử lý khi tạo mới thành công
     *
     * Callback này chạy sau khi mutationFn resolve thành công
     * Nhiệm vụ:
     * 1. Hiển thị notification "Successfully created"
     * 2. Invalidate queries (xóa cache để refetch)
     * 3. Publish event cho realtime
     * 4. Ghi log
     * 5. Gọi custom onSuccess callback nếu có
     *
     * @param data - Dữ liệu trả về từ mutationFn (CreateResponse)
     * @param variables - Variables đã truyền vào mutationFn
     * @param context - Context (dùng cho optimistic updates)
     */
    onSuccess: (data, variables, context) => {
      // ======================================================================
      // BƯỚC 1: Lấy lại các giá trị từ variables
      // ======================================================================

      /**
       * 📖 DESTRUCTURING VARIABLES:
       *
       * Lấy các giá trị từ variables (có thể đã override khi gọi mutate)
       * Fallback về giá trị từ props nếu không có trong variables
       */
      const {
        resource: resourceName = resourceFromProps,
        successNotification:
          successNotificationFromProp = successNotificationFromProps,
        dataProviderName: dataProviderNameFromProp = dataProviderNameFromProps,
        invalidates = invalidatesFromProps ?? ["list", "many"], // Mặc định invalidate list và many
        values = valuesFromProps,
        meta = metaFromProps,
      } = variables;

      // Validation lại (đề phòng)
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      // ======================================================================
      // BƯỚC 2: Chuẩn bị thông tin resource
      // ======================================================================

      // Lấy resource config
      const { resource, identifier } = select(resourceName);

      // Chuyển tên resource sang dạng số ít (singular)
      // VD: "posts" => "post", "users" => "user"
      const resourceSingular = textTransformers.singular(identifier);

      // Lấy tên data provider
      const dataProviderName = pickDataProvider(
        identifier,
        dataProviderNameFromProp,
        resources,
      );

      // Kết hợp metadata
      const combinedMeta = getMeta({
        resource,
        meta,
      });

      // ======================================================================
      // BƯỚC 3: Hiển thị notification thành công
      // ======================================================================

      /**
       * 📚 NOTIFICATION CONFIG - Cấu hình thông báo
       *
       * successNotificationFromProp có thể là:
       * 1. undefined - Dùng notification mặc định
       * 2. false - Không hiển thị notification
       * 3. Object - Custom notification config
       * 4. Function - Function trả về notification config
       */
      const notificationConfig =
        typeof successNotificationFromProp === "function"
          ? successNotificationFromProp(data, values, identifier)
          : successNotificationFromProp;

      /**
       * 📚 HANDLE NOTIFICATION - Hiển thị thông báo
       *
       * handleNotification nhận 2 tham số:
       * 1. config - Config từ user (có thể undefined/false/object)
       * 2. defaultConfig - Config mặc định
       *
       * Nếu config = false, không hiển thị gì
       * Nếu config = undefined, dùng defaultConfig
       * Nếu config = object, merge với defaultConfig
       */
      handleNotification(notificationConfig, {
        key: `create-${identifier}-notification`,
        message: translate(
          "notifications.createSuccess",
          {
            resource: translate(
              `${identifier}.${identifier}`,
              resourceSingular,
            ),
          },
          `Successfully created ${resourceSingular}`,
        ),
        description: translate("notifications.success", "Success"),
        type: "success",
      });

      // ======================================================================
      // BƯỚC 4: Invalidate queries (xóa cache)
      // ======================================================================

      /**
       * 📚 INVALIDATE STORE - Xóa cache của queries
       *
       * 💡 TẠI SAO CẦN INVALIDATE?
       *
       * Tình huống:
       * 1. User fetch danh sách posts => useList cache 10 posts
       * 2. User tạo post mới => useCreate tạo post thứ 11
       * 3. Danh sách vẫn hiển thị 10 posts (vì cache cũ)
       * 4. Phải invalidate useList để nó refetch => 11 posts
       *
       * invalidatesFromProps mặc định là ["list", "many"]
       * Nghĩa là: xóa cache của useList và useMany queries
       *
       * 🔄 FLOW:
       * invalidateStore({ invalidates: ["list"] })
       * => queryClient.invalidateQueries(["data", "default", "posts", "list"])
       * => useList tự động refetch
       * => UI update với data mới
       */
      invalidateStore({
        resource: identifier,
        dataProviderName,
        invalidates,
      });

      // ======================================================================
      // BƯỚC 5: Publish event cho realtime
      // ======================================================================

      /**
       * 📚 PUBLISH EVENT - Phát sóng event cho realtime subscribers
       *
       * 💡 REALTIME UPDATES:
       *
       * Khi 1 user tạo post mới, các user khác cũng cần biết.
       * publish() phát event "created" đến channel "resources/posts"
       * Các component subscribe channel này sẽ nhận event và update UI.
       *
       * VD:
       * - User A tạo post mới => publish({ type: "created" })
       * - User B đang xem danh sách posts => nhận event => refetch
       */
      publish?.({
        channel: `resources/${resource.name}`, // Channel theo resource
        type: "created", // Event type
        payload: {
          ids: data?.data?.id ? [data.data.id] : undefined, // ID của record mới tạo
        },
        date: new Date(),
        meta: {
          ...combinedMeta,
          dataProviderName,
        },
      });

      // ======================================================================
      // BƯỚC 6: Ghi log (audit trail)
      // ======================================================================

      /**
       * 📚 AUDIT LOG - Ghi lại hành động create
       *
       * 💡 AUDIT TRAIL:
       *
       * Audit trail là nhật ký ghi lại tất cả hành động trong hệ thống:
       * - Ai (user) làm gì (action) lúc nào (timestamp)
       * - Dùng để tracking, debugging, security
       *
       * VD:
       * {
       *   action: "create",
       *   resource: "posts",
       *   data: { title: "New Post" },
       *   meta: { id: 1, author: "John" }
       * }
       */

      // Tách các field đặc biệt ra khỏi meta
      const {
        fields: _fields,
        operation: _operation,
        variables: _variables,
        ...rest
      } = combinedMeta || {};

      // Ghi log
      log?.mutate({
        action: "create",
        resource: resource.name,
        data: values,
        meta: {
          ...rest,
          dataProviderName,
          id: data?.data?.id ?? undefined, // ID của record vừa tạo
        },
      });

      // ======================================================================
      // BƯỚC 7: Gọi custom onSuccess callback nếu có
      // ======================================================================

      /**
       * 📖 OPTIONAL CHAINING + OPTIONAL CALL:
       *
       * mutationOptions?.onSuccess?.(...)
       *
       * Giải thích:
       * - mutationOptions? - Nếu mutationOptions undefined, dừng
       * - .onSuccess? - Nếu onSuccess undefined, dừng
       * - (...) - Gọi function với tham số
       *
       * Tương đương với:
       * if (mutationOptions && mutationOptions.onSuccess) {
       *   mutationOptions.onSuccess(data, variables, context);
       * }
       */
      mutationOptions?.onSuccess?.(data, variables, context);
    },

    // ========================================================================
    // onError: Callback khi mutation bị lỗi
    // ========================================================================

    /**
     * 📚 ON ERROR CALLBACK - Xử lý khi tạo mới thất bại
     *
     * Callback này chạy khi mutationFn throw error hoặc reject
     * Nhiệm vụ:
     * 1. Kiểm tra error (checkError)
     * 2. Hiển thị notification lỗi
     * 3. Gọi custom onError callback nếu có
     *
     * @param err - Error object
     * @param variables - Variables đã truyền vào mutationFn
     * @param context - Context
     */
    onError: (err: TError, variables, context) => {
      // Lấy các giá trị từ variables
      const {
        resource: resourceName = resourceFromProps,
        errorNotification:
          errorNotificationFromProp = errorNotificationFromProps,
        values = valuesFromProps,
      } = variables;

      // Validation
      if (!values) throw missingValuesError;
      if (!resourceName) throw missingResourceError;

      // ======================================================================
      // 🔍 MULTI-LAYER ERROR HANDLING - Xử lý lỗi đa tầng
      // ======================================================================

      /**
       * ❓ QUESTION: "Tất cả lỗi đều được xử lý ở đây?"
       *
       * ✅ YES! Đây là nơi TẤT CẢ lỗi được xử lý theo 3 LAYERS:
       *
       * LAYER 1: Auth Error Check (useOnError)
       * LAYER 2: Notification (useHandleNotification)
       * LAYER 3: Custom Callback (optional)
       *
       * **WHY 3 LAYERS?**
       * - Different errors need different handling
       * - Separation of concerns
       * - Flexible and extensible
       */

      // ======================================================================
      // LAYER 1: 🔐 AUTH ERROR CHECK (useOnError)
      // ======================================================================

      /**
       * Check if this is an AUTH ERROR (401, 403, token expired)
       *
       * **WHAT HAPPENS HERE:**
       * - Calls authProvider.onError(err)
       * - If 401 → logout & redirect to login
       * - If 403 → redirect to access denied
       * - Other errors → do nothing (continue to next layers)
       *
       * **IMPORTANT:**
       * - This ONLY handles authentication/authorization errors
       * - Validation errors (400) → SKIP
       * - Server errors (500) → SKIP
       * - Network errors → SKIP
       *
       * **EXAMPLE:**
       * ```typescript
       * // Error: { status: 401, message: "Token expired" }
       * checkError(err);  // ← Triggers logout & redirect
       * // User redirected to /login, code below NOT executed
       *
       * // Error: { status: 400, message: "Title is required" }
       * checkError(err);  // ← Does nothing (not auth error)
       * // Continues to LAYER 2 & 3
       * ```
       */
      checkError(err);

      // ======================================================================
      // LAYER 2: 📢 NOTIFICATION (useHandleNotification)
      // ======================================================================

      /**
       * Show error notification to user (toast/alert)
       *
       * **WHAT HAPPENS HERE:**
       * - Shows user-friendly error message
       * - Translates error message (i18n)
       * - Displays toast notification
       *
       * **APPLIES TO:**
       * - Validation errors (400) → "Validation failed"
       * - Server errors (500) → "Server error occurred"
       * - Network errors → "Network error, please try again"
       * - Business logic errors → Custom messages
       *
       * **NOTE:**
       * If LAYER 1 triggered logout (401), user is already redirected,
       * so this notification may not be visible. But for safety, we still
       * handle it in case authProvider.onError returns { logout: false }.
       */

      // Lấy resource config
      const { identifier } = select(resourceName);

      // Chuyển sang dạng số ít
      const resourceSingular = textTransformers.singular(identifier);

      // Chuẩn bị notification config
      const notificationConfig =
        typeof errorNotificationFromProp === "function"
          ? errorNotificationFromProp(err, values, identifier)
          : errorNotificationFromProp;

      // Hiển thị notification lỗi
      handleNotification(notificationConfig, {
        key: `create-${identifier}-notification`,
        description: err.message, // Nội dung lỗi
        message: translate(
          "notifications.createError",
          {
            resource: translate(
              `${identifier}.${identifier}`,
              resourceSingular,
            ),
            statusCode: err.statusCode,
          },
          `There was an error creating ${resourceSingular} (status code: ${err.statusCode})`,
        ),
        type: "error",
      });

      // ======================================================================
      // LAYER 3: 🎯 CUSTOM CALLBACK (optional)
      // ======================================================================

      /**
       * Execute user's custom onError callback if provided
       *
       * **WHAT HAPPENS HERE:**
       * - User can provide custom error handling logic
       * - Access to full error, variables, and context
       * - Can override or extend default behavior
       *
       * **EXAMPLE USAGE:**
       * ```typescript
       * const { mutate: createPost } = useCreate();
       *
       * createPost({
       *   resource: "posts",
       *   values: { title: "New Post" },
       *   onError: (error, variables, context) => {
       *     // Custom error handling
       *     console.log("Creation failed:", error);
       *
       *     // Send to error tracking service
       *     Sentry.captureException(error);
       *
       *     // Show custom modal
       *     showModal({ type: "error", message: error.message });
       *
       *     // Retry logic
       *     if (error.status === 503) {
       *       setTimeout(() => retry(), 5000);
       *     }
       *   }
       * });
       * ```
       */
      mutationOptions?.onError?.(err, variables, context);

      // ======================================================================
      // SUMMARY - ERROR FLOW:
      // ======================================================================

      /**
       * Complete error flow:
       *
       * API Error
       *    ↓
       * onError callback (THIS FUNCTION)
       *    ↓
       * LAYER 1: checkError(err)
       *    ├─ If 401/403 → logout & redirect (STOP HERE)
       *    └─ Other errors → continue
       *    ↓
       * LAYER 2: handleNotification(...)
       *    └─ Show error toast to user
       *    ↓
       * LAYER 3: mutationOptions?.onError?.(...)
       *    └─ Execute custom error handling
       *
       * **EXAMPLES:**
       *
       * Error 401 (Token Expired):
       *   LAYER 1: ✅ Logout & redirect to /login
       *   LAYER 2: ⚠️  Show notification (may not be visible due to redirect)
       *   LAYER 3: ❌ Not executed (user redirected)
       *
       * Error 400 (Validation Failed):
       *   LAYER 1: ⏭️  Skip (not auth error)
       *   LAYER 2: ✅ Show "Validation failed" toast
       *   LAYER 3: ✅ Execute custom callback (if provided)
       *
       * Error 500 (Server Error):
       *   LAYER 1: ⏭️  Skip (not auth error)
       *   LAYER 2: ✅ Show "Server error" toast
       *   LAYER 3: ✅ Execute custom callback (if provided)
       */
    },

    // ========================================================================
    // mutationKey: Key để tracking mutation
    // ========================================================================

    /**
     * 📚 MUTATION KEY - Key để identify mutation
     *
     * Mutation key giúp:
     * 1. DevTools tracking mutations
     * 2. Cancel mutations nếu cần
     * 3. Debugging
     *
     * Key structure: ["data", "mutation", "create"]
     */
    mutationKey: keys().data().mutation("create").get(),

    // Merge với custom mutation options từ props
    ...mutationOptions,

    // Meta cho DevTools
    meta: {
      ...mutationOptions?.meta,
      ...getXRay("useCreate"),
    },
  });

  // ============================================================================
  // PHẦN 6: XỬ LÝ MUTATION RESULT
  // ============================================================================

  /**
   * 📚 DESTRUCTURE MUTATION RESULT
   *
   * useMutation trả về:
   * - mutate: Function để trigger mutation
   * - mutateAsync: Async version của mutate (trả về Promise)
   * - isPending: Boolean - mutation đang chạy
   * - isError: Boolean - mutation bị lỗi
   * - isSuccess: Boolean - mutation thành công
   * - data: Dữ liệu trả về (khi success)
   * - error: Error object (khi error)
   * - reset: Function để reset mutation state
   * ... và nhiều fields khác
   */
  const { mutate, mutateAsync, ...mutation } = mutationResult;

  // ============================================================================
  // PHẦN 7: THEO DÕI LOADING OVERTIME
  // ============================================================================

  /**
   * 📚 USE LOADING OVERTIME - Theo dõi thời gian loading
   *
   * Hook này track thời gian mutation đang chạy
   * Hữu ích để:
   * 1. Hiển thị warning nếu mutation chạy quá lâu
   * 2. UX: "Still loading... this is taking longer than usual"
   */
  const { elapsedTime } = useLoadingOvertime({
    ...overtimeOptions,
    isLoading: mutation.isPending, // isPending = true khi mutation đang chạy
  });

  // ============================================================================
  // PHẦN 8: TẠO HELPER FUNCTIONS
  // ============================================================================

  /**
   * 📚 HANDLE MUTATION - Wrapper cho mutate()
   *
   * 💡 TẠI SAO CẦN WRAPPER?
   *
   * mutate() của React Query yêu cầu variables LUÔN LUÔN phải truyền vào.
   * Nhưng trong Refine, user có thể config sẵn trong hook:
   *
   * const { mutate } = useCreate({
   *   resource: "posts",
   *   values: { title: "Default" }
   * });
   *
   * mutate();  // Không truyền gì => Dùng values từ props
   *
   * Wrapper này cho phép variables là optional.
   *
   * @param variables - Variables (optional)
   * @param options - Mutate options (callbacks, etc.)
   */
  const handleMutation = (
    variables?: UseCreateParams<TData, TError, TVariables>,
    options?: MutateOptions<
      CreateResponse<TData>,
      TError,
      UseCreateParams<TData, TError, TVariables>,
      unknown
    >,
  ) => {
    return mutate(variables || {}, options);
  };

  /**
   * 📚 HANDLE MUTATE ASYNC - Wrapper cho mutateAsync()
   *
   * Tương tự handleMutation nhưng cho async version.
   * mutateAsync() trả về Promise nên có thể dùng với async/await.
   *
   * VD:
   * try {
   *   const result = await mutateAsync({ resource: "posts", values: {...} });
   *   console.log("Created:", result.data);
   * } catch (error) {
   *   console.error("Error:", error);
   * }
   */
  const handleMutateAsync = (
    variables?: UseCreateParams<TData, TError, TVariables>,
    options?: MutateOptions<
      CreateResponse<TData>,
      TError,
      UseCreateParams<TData, TError, TVariables>,
      unknown
    >,
  ) => {
    return mutateAsync(variables || {}, options);
  };

  // ============================================================================
  // PHẦN 9: RETURN KẾT QUẢ
  // ============================================================================

  /**
   * 📚 RETURN OBJECT - Kết quả trả về cho user
   *
   * Hook trả về object chứa:
   * 1. mutation: Full mutation result từ useMutation
   * 2. mutate: Function để trigger mutation (với variables optional)
   * 3. mutateAsync: Async version
   * 4. overtime: Object chứa elapsedTime
   */
  return {
    mutation: mutationResult,
    mutate: handleMutation,
    mutateAsync: handleMutateAsync,
    overtime: { elapsedTime },
  };
};

// ============================================================================
// PHẦN 10: ERROR CONSTANTS
// ============================================================================

/**
 * 📚 ERROR CONSTANTS - Các lỗi được định nghĩa sẵn
 *
 * Tạo error objects để throw khi validation fail
 * Giúp error messages nhất quán
 */

const missingResourceError = new Error(
  "[useCreate]: `resource` is not defined or not matched but is required",
);

const missingValuesError = new Error(
  "[useCreate]: `values` is not provided but is required",
);

// ============================================================================
// 🎉 KẾT THÚC FILE
// ============================================================================
//
// 📚 TÓM TẮT HOOK USECREATE:
//
// 1. ✅ Dùng để TẠO MỚI dữ liệu (POST request)
// 2. ✅ Bọc useMutation của React Query với nhiều tính năng:
//    - Notifications tự động
//    - Cache invalidation
//    - Realtime events
//    - Audit logging
// 3. ✅ Flow hoạt động:
//    mutate() => mutationFn (API call) => onSuccess/onError => UI updates
// 4. ✅ Khác biệt với useOne (Query):
//    - useOne: Tự động fetch, cache data
//    - useCreate: Phải gọi mutate() thủ công, không cache
//
// 📖 CÁC KHÁI NIỆM ĐÃ HỌC:
// - React Query Mutations (useMutation)
// - Mutation flow: mutationFn -> onSuccess/onError
// - Cache invalidation pattern
// - Realtime events (publish/subscribe)
// - Audit logging
// - Error handling
// - TypeScript: Generics, Omit type
// - Pattern: Wrapper functions to make params optional
//
// 🔄 SO SÁNH QUERY vs MUTATION:
//
// ┌──────────────┬───────────────────┬────────────────────┐
// │              │ useOne (Query)    │ useCreate (Mutation)
// ├──────────────┼───────────────────┼────────────────────┤
// │ Mục đích     │ ĐỌC dữ liệu       │ TẠO dữ liệu        │
// │ Hook         │ useQuery          │ useMutation        │
// │ Trigger      │ Tự động           │ Gọi mutate() thủ công
// │ Caching      │ Có                │ Không              │
// │ Kết quả      │ { data, isLoading }│ { mutate, isPending }
// │ Use case     │ GET /posts/1      │ POST /posts        │
// └──────────────┴───────────────────┴────────────────────┘
//
// 💡 VÍ DỤ THỰC TẾ:
//
// ```typescript
// import { useCreate } from "@refinedev/core";
//
// function CreatePostForm() {
//   const { mutate, isPending } = useCreate();
//
//   const handleSubmit = (values) => {
//     mutate({
//       resource: "posts",
//       values: {
//         title: values.title,
//         content: values.content,
//       },
//       successNotification: {
//         message: "Post created successfully!",
//         type: "success",
//       },
//     });
//   };
//
//   return <form onSubmit={handleSubmit}>...</form>;
// }
// ```
//
// 👏 Chúc mừng! Bạn vừa hiểu cách tạo mới dữ liệu với Mutations!
// Hook tiếp theo sẽ là useUpdate - cập nhật dữ liệu! 🚀
// ============================================================================
