// ============================================================================
// 🔐 HOOK: usePermissions - PERMISSION/AUTHORIZATION MANAGEMENT
// ============================================================================

/**
 * **WHAT IS THIS HOOK FOR?**
 *
 * `usePermissions` fetches and manages user permissions (authorization) in your app.
 * It tells you WHAT a user can do, not WHO they are.
 *
 * **AUTHENTICATION vs AUTHORIZATION:**
 *
 * - **Authentication** = WHO you are (login, identity verification)
 *   - "Are you John Doe?"
 *   - Handled by: useLogin, useLogout, useGetIdentity
 *
 * - **Authorization** = WHAT you can do (permissions, access control)
 *   - "Can you edit posts?"
 *   - Handled by: usePermissions ← THIS HOOK!
 *
 * **REAL-WORLD ANALOGY:**
 *
 * Think of a company building:
 * - **Authentication** = Your employee ID badge (proves WHO you are)
 * - **Authorization** = Which floors/rooms your badge can access (WHAT you can do)
 *
 * You might be authenticated (valid employee) but not authorized
 * (can't access the executive floor).
 *
 * **COMMON USE CASES:**
 *
 * 1. **Role-Based Access Control (RBAC):**
 *    ```typescript
 *    const { data: permissions } = usePermissions();
 *    // permissions = ['admin', 'editor']
 *
 *    if (permissions?.includes('admin')) {
 *      return <AdminPanel />;
 *    }
 *    ```
 *
 * 2. **Feature Flags:**
 *    ```typescript
 *    const { data: permissions } = usePermissions();
 *    // permissions = { canExport: true, canDelete: false }
 *
 *    {permissions?.canDelete && <DeleteButton />}
 *    ```
 *
 * 3. **Resource-Level Permissions:**
 *    ```typescript
 *    const { data: permissions } = usePermissions({ params: { resource: 'posts' } });
 *    // permissions = { canEdit: true, canPublish: false }
 *
 *    {permissions?.canEdit && <EditButton />}
 *    ```
 *
 * 4. **Dynamic UI:**
 *    ```typescript
 *    const { data: permissions } = usePermissions();
 *
 *    return (
 *      <Menu>
 *        {permissions?.includes('view_posts') && <MenuItem>Posts</MenuItem>}
 *        {permissions?.includes('view_users') && <MenuItem>Users</MenuItem>}
 *        {permissions?.includes('view_analytics') && <MenuItem>Analytics</MenuItem>}
 *      </Menu>
 *    );
 *    ```
 *
 * **HOW IT WORKS:**
 *
 * ```
 * Component calls usePermissions()
 *         ↓
 * React Query fetches permissions
 *         ↓
 * Calls authProvider.getPermissions()  ← YOUR CODE
 *         ↓
 * Returns permission data (any format you want)
 *         ↓
 * Hook returns { data, isLoading, error, ... }
 *         ↓
 * Component uses permissions to show/hide features
 * ```
 *
 * **EXAMPLE FULL FLOW:**
 *
 * ```typescript
 * // 1. Define authProvider
 * const authProvider = {
 *   getPermissions: async (params) => {
 *     const user = await getCurrentUser();
 *     return user.roles;  // ['admin', 'editor']
 *   }
 * };
 *
 * // 2. Use in component
 * function PostList() {
 *   const { data: roles, isLoading } = usePermissions();
 *
 *   if (isLoading) return <Loading />;
 *
 *   return (
 *     <div>
 *       <PostTable />
 *       {roles?.includes('admin') && <DeleteAllButton />}
 *     </div>
 *   );
 * }
 * ```
 *
 * **PERMISSION FORMATS:**
 *
 * You can return permissions in ANY format that fits your needs:
 *
 * ```typescript
 * // Array of roles
 * getPermissions: () => ['admin', 'editor']
 *
 * // Object with boolean flags
 * getPermissions: () => ({ canEdit: true, canDelete: false })
 *
 * // Nested object by resource
 * getPermissions: () => ({
 *   posts: { canEdit: true, canDelete: true },
 *   users: { canEdit: false, canDelete: false }
 * })
 *
 * // Array of permission strings
 * getPermissions: () => ['posts.edit', 'posts.delete', 'users.view']
 *
 * // Complex permission object
 * getPermissions: () => ({
 *   role: 'editor',
 *   permissions: ['posts.edit'],
 *   restrictions: { maxPosts: 100 }
 * })
 * ```
 *
 * **WHY USE REACT QUERY?**
 *
 * Same reasons as other hooks:
 * - **Caching** - Fetches once, reuses across components
 * - **Loading states** - Know when permissions are being fetched
 * - **Error handling** - Catch permission fetch failures
 * - **Refetch** - Update permissions when needed
 * - **DevTools** - Debug permission states
 *
 * Without React Query, every component would fetch permissions separately!
 *
 * **ADVANCED: PARAMS USAGE**
 *
 * The `params` option lets you customize permission queries:
 *
 * ```typescript
 * // Get permissions for specific resource
 * const { data } = usePermissions({
 *   params: { resource: 'posts' }
 * });
 *
 * // Get permissions for specific action
 * const { data } = usePermissions({
 *   params: { action: 'delete', resource: 'posts' }
 * });
 *
 * // Backend receives these params and can return different permissions
 * authProvider.getPermissions = async (params) => {
 *   if (params?.resource === 'posts') {
 *     return { canEdit: true, canDelete: true };
 *   }
 *   if (params?.resource === 'users') {
 *     return { canEdit: false, canDelete: false };
 *   }
 * };
 * ```
 *
 * **COMPARISON WITH AUTHORIZATION LIBRARIES:**
 *
 * This hook is simpler than libraries like CASL, Casbin, or AccessControl.
 * It just FETCHES permissions - YOU decide how to use them.
 *
 * ```typescript
 * // usePermissions (simple, flexible)
 * const { data: perms } = usePermissions();
 * if (perms?.includes('admin')) { ... }
 *
 * // vs CASL (complex, feature-rich)
 * const ability = useAbility();
 * if (ability.can('delete', 'Post')) { ... }
 * ```
 *
 * You can combine usePermissions WITH authorization libraries:
 *
 * ```typescript
 * const { data: permissions } = usePermissions();
 * const ability = useMemo(() => createAbility(permissions), [permissions]);
 * ```
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/auth/usePermissions} for more details.
 *
 * @typeParam TData - The shape of permission data returned
 * @typeParam TParams - Custom params to pass to getPermissions
 *
 * @param options - React Query options (enabled, refetchInterval, etc.)
 * @param params - Custom params passed to authProvider.getPermissions()
 *
 * @returns React Query result with permission data
 *
 * @example
 * ```typescript
 * // Basic usage
 * const { data: permissions, isLoading } = usePermissions();
 *
 * // With params
 * const { data } = usePermissions({ params: { resource: 'posts' } });
 *
 * // With TypeScript
 * const { data } = usePermissions<string[]>();  // permissions is string[]
 * const { data } = usePermissions<{ canEdit: boolean }>();  // permissions is object
 * ```
 */

import { getXRay } from "@refinedev/devtools-internal";
import {
  type UseQueryOptions,
  type UseQueryResult,
  useQuery,
} from "@tanstack/react-query";

import { useAuthProviderContext } from "@contexts/auth";
import { useKeys } from "@hooks/useKeys";
import type { PermissionResponse } from "../../../contexts/auth/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Props for usePermissions hook.
 *
 * @typeParam TData - The shape of permission data (default: any)
 * @typeParam TParams - Custom params object (default: Record<string, any>)
 */
export type UsePermissionsProps<
  TData = PermissionResponse,
  TParams extends Record<string, any> = Record<string, any>,
> = {
  /**
   * React Query options to customize the query behavior.
   *
   * **COMMON OPTIONS:**
   *
   * ```typescript
   * usePermissions({
   *   options: {
   *     enabled: isLoggedIn,           // Only fetch if logged in
   *     refetchInterval: 60000,        // Refetch every minute
   *     staleTime: 5 * 60 * 1000,      // Consider fresh for 5 minutes
   *     retry: 3,                      // Retry 3 times on error
   *     onSuccess: (data) => { ... },  // Callback on success
   *     onError: (error) => { ... },   // Callback on error
   *   }
   * });
   * ```
   *
   * **USE CASES:**
   *
   * - `enabled: false` - Don't fetch until some condition (e.g., user logged in)
   * - `refetchInterval` - Keep permissions up-to-date
   * - `staleTime` - Reduce unnecessary refetches
   */
  options?: UseQueryOptions<TData>;

  /**
   * Custom parameters passed to authProvider.getPermissions().
   *
   * **WHY USE PARAMS?**
   *
   * Different contexts may need different permissions:
   *
   * ```typescript
   * // Global permissions
   * const { data } = usePermissions();
   *
   * // Resource-specific permissions
   * const { data } = usePermissions({
   *   params: { resource: 'posts' }
   * });
   *
   * // Action-specific permissions
   * const { data } = usePermissions({
   *   params: { action: 'delete', resource: 'posts' }
   * });
   * ```
   *
   * **BACKEND USAGE:**
   *
   * ```typescript
   * authProvider.getPermissions = async (params) => {
   *   // params = { resource: 'posts', action: 'delete' }
   *   const user = getCurrentUser();
   *
   *   if (params?.resource === 'posts') {
   *     return {
   *       canEdit: user.role === 'editor' || user.role === 'admin',
   *       canDelete: user.role === 'admin',
   *     };
   *   }
   *
   *   return user.globalPermissions;
   * };
   * ```
   */
  params?: TParams;
};

/**
 * Return type for usePermissions hook.
 *
 * **SYNTAX EXPLANATION:**
 *
 * ```typescript
 * export type UsePermissionsReturnType<TData = PermissionResponse> =
 *   UseQueryResult<TData, unknown>;
 * ```
 *
 * **BREAKING IT DOWN:**
 *
 * 1. **`export type`** - Định nghĩa một type và export ra ngoài
 *
 * 2. **`UsePermissionsReturnType`** - Tên của type (đặt cho dễ đọc)
 *
 * 3. **`<TData = PermissionResponse>`** - Generic parameter với default
 *    - `TData` = Tên generic (kiểu dữ liệu của permissions)
 *    - `= PermissionResponse` = Default type nếu không chỉ định
 *
 * 4. **`= UseQueryResult<TData, unknown>`** - Gán type từ React Query
 *    - `UseQueryResult` = Type có sẵn từ React Query
 *    - `<TData, unknown>` = Truyền generics vào UseQueryResult
 *      - `TData` = Kiểu của data (permissions)
 *      - `unknown` = Kiểu của error (không quan tâm cụ thể)
 *
 * **WHAT IS THIS DOING?**
 *
 * Tạo một "alias" (tên gọi khác) cho type của React Query:
 *
 * ```typescript
 * // Thay vì viết:
 * const result: UseQueryResult<string[], unknown> = usePermissions();
 *
 * // Có thể viết ngắn hơn:
 * const result: UsePermissionsReturnType<string[]> = usePermissions();
 * ```
 *
 * **WHY CREATE THIS TYPE?**
 *
 * 1. **Tên dễ đọc:** `UsePermissionsReturnType` rõ ràng hơn `UseQueryResult`
 * 2. **Consistency:** Tất cả Refine hooks đều có ReturnType riêng
 * 3. **Encapsulation:** Ẩn đi React Query implementation details
 * 4. **Future-proof:** Có thể thay đổi internal implementation sau
 *
 * **REAL-WORLD COMPARISON:**
 *
 * ```typescript
 * // Giống như tạo nickname:
 * type MyName = "Nguyễn Văn A";  // Tên thật dài
 * type Nick = MyName;            // Nickname ngắn
 *
 * // Trong code:
 * type FullType = UseQueryResult<PermissionResponse, unknown>;  // Dài
 * type ShortType = UsePermissionsReturnType;                    // Ngắn, rõ ràng
 * ```
 *
 * **WHAT IS UseQueryResult?**
 *
 * `UseQueryResult` is a React Query type that includes ALL properties returned by useQuery:
 *
 * ```typescript
 * UseQueryResult<TData, TError> = {
 *   data: TData | undefined;           // Permission data
 *   isLoading: boolean;                // Initial loading
 *   isFetching: boolean;               // Any fetch (including refetch)
 *   isError: boolean;                  // Has error
 *   isSuccess: boolean;                // Fetch succeeded
 *   error: TError | null;              // Error object
 *   refetch: () => Promise<...>;       // Manual refetch function
 *   status: 'idle' | 'loading' | 'error' | 'success';  // Status
 *   fetchStatus: 'idle' | 'fetching' | 'paused';       // Fetch status
 *   dataUpdatedAt: number;             // Timestamp of last update
 *   // ... and many more properties
 * }
 * ```
 *
 * **GENERICS EXPLAINED:**
 *
 * ```typescript
 * UseQueryResult<TData, unknown>
 *                ^^^^^  ^^^^^^^
 *                │      └─ Error type (unknown = bất kỳ)
 *                └─ Data type (permissions)
 * ```
 *
 * Examples:
 * ```typescript
 * // Example 1: String array permissions
 * UseQueryResult<string[], unknown>
 * // → data: string[] | undefined
 *
 * // Example 2: Object permissions
 * UseQueryResult<{ canEdit: boolean }, unknown>
 * // → data: { canEdit: boolean } | undefined
 *
 * // Example 3: Our type (with default)
 * UsePermissionsReturnType             // Uses default: PermissionResponse
 * UsePermissionsReturnType<string[]>   // Override: string[]
 * ```
 *
 * **USAGE:**
 *
 * This is a standard React Query result with:
 * - `data` - The permission data (or undefined if loading/error)
 * - `isLoading` - True while fetching permissions
 * - `isError` - True if fetch failed
 * - `error` - Error object if fetch failed
 * - `refetch` - Function to manually refetch permissions
 * - And more React Query properties...
 *
 * **COMMON PATTERNS:**
 *
 * ```typescript
 * // Pattern 1: Loading state
 * const { data, isLoading } = usePermissions();
 * if (isLoading) return <Loading />;
 *
 * // Pattern 2: Error handling
 * const { data, isError, error } = usePermissions();
 * if (isError) return <Error message={error.message} />;
 *
 * // Pattern 3: Optional chaining (safe access)
 * const { data } = usePermissions();
 * {data?.includes('admin') && <AdminPanel />}
 *
 * // Pattern 4: Manual refetch
 * const { data, refetch } = usePermissions();
 * <button onClick={() => refetch()}>Refresh Permissions</button>
 * ```
 *
 * **TYPE FLOW VISUALIZATION:**
 *
 * ```
 * usePermissions<string[]>()
 *        ↓
 * Returns: UsePermissionsReturnType<string[]>
 *        ↓
 * Which is: UseQueryResult<string[], unknown>
 *        ↓
 * So you get: {
 *   data: string[] | undefined,
 *   isLoading: boolean,
 *   isError: boolean,
 *   ...
 * }
 * ```
 */
export type UsePermissionsReturnType<TData = PermissionResponse> =
  UseQueryResult<TData, unknown>;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * `usePermissions` calls `getPermissions` method from {@link https://refine.dev/docs/api-reference/core/providers/auth-provider `authProvider`} under the hood.
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/auth/usePermissions} for more details.
 *
 * @typeParam TData - Result data of the query
 *
 */
export function usePermissions<
  TData = any,
  TParams extends Record<string, any> = Record<string, any>,
>({
  options,
  params,
}: UsePermissionsProps<TData, TParams> = {}): UsePermissionsReturnType<TData> {
  // ==========================================================================
  // STEP 1: GET DEPENDENCIES
  // ==========================================================================

  /**
   * Get getPermissions function from authProvider.
   *
   * This is YOUR function defined in authProvider:
   * ```typescript
   * const authProvider = {
   *   getPermissions: async (params) => {
   *     // Your logic to fetch/calculate permissions
   *     const user = await getCurrentUser();
   *     return user.roles;
   *   }
   * };
   * ```
   */
  const { getPermissions } = useAuthProviderContext();

  /**
   * Get query key generator for React Query.
   *
   * Keys are used to identify this query in React Query's cache:
   * ["auth", "action", "permissions"]
   *
   * This ensures all usePermissions() calls share the same cache!
   */
  const { keys } = useKeys();

  // ==========================================================================
  // STEP 2: CREATE THE REACT QUERY
  // ==========================================================================

  /**
   * Create React Query to fetch permissions.
   *
   * **QUERY CONFIGURATION:**
   *
   * - **queryKey**: Cache key for this query
   * - **queryFn**: Function to fetch permissions (YOUR authProvider.getPermissions)
   * - **enabled**: Only run if getPermissions exists
   * - **...options**: User-provided options (refetchInterval, etc.)
   * - **meta**: DevTools metadata
   */
  const queryResponse = useQuery<TData>({
    /**
     * Query key for caching.
     *
     * All usePermissions() calls use the same key → they share cache!
     *
     * Example:
     * ```typescript
     * // Component A
     * usePermissions();  // Fetches from API
     *
     * // Component B (same page)
     * usePermissions();  // Uses cached data!
     * ```
     */
    queryKey: keys().auth().action("permissions").get(),

    /**
     * Query function - calls YOUR authProvider.getPermissions.
     *
     * **CONDITIONAL QUERY:**
     *
     * ```typescript
     * getPermissions
     *   ? () => getPermissions(params)  // ← Call YOUR function
     *   : () => Promise.resolve(undefined)  // ← No-op if not configured
     * ```
     *
     * **WHY THE TERNARY?**
     *
     * If authProvider doesn't have getPermissions, this provides a fallback
     * that returns undefined instead of crashing.
     *
     * **TYPE CASTING:**
     *
     * `as (params?: unknown) => Promise<TData>`
     *
     * TypeScript doesn't know which branch the ternary takes,
     * so we cast to the expected function signature.
     *
     * **PARAMS USAGE:**
     *
     * The params from usePermissions({ params: { resource: 'posts' } })
     * are passed directly to YOUR getPermissions function:
     *
     * ```typescript
     * authProvider.getPermissions = async (params) => {
     *   console.log(params);  // { resource: 'posts' }
     * };
     * ```
     */
    queryFn: (getPermissions
      ? () => getPermissions(params)
      : () => Promise.resolve(undefined)) as (
      params?: unknown,
    ) => Promise<TData>,

    /**
     * Only enable query if getPermissions exists.
     *
     * **WHY?**
     *
     * ```typescript
     * enabled: !!getPermissions
     * ```
     *
     * - `!!` converts to boolean (double negation)
     * - If getPermissions is undefined → enabled: false → query won't run
     * - If getPermissions is a function → enabled: true → query runs
     *
     * **BENEFIT:**
     *
     * If you don't configure authProvider.getPermissions,
     * the query won't run at all (no unnecessary API calls).
     *
     * **EXAMPLE:**
     *
     * ```typescript
     * // authProvider without getPermissions
     * const authProvider = {
     *   login: () => { ... },
     *   logout: () => { ... },
     *   // No getPermissions!
     * };
     *
     * // usePermissions won't make any API calls
     * const { data } = usePermissions();  // data = undefined, query disabled
     * ```
     */
    enabled: !!getPermissions,

    /**
     * Spread user-provided options.
     *
     * This allows customization:
     * ```typescript
     * usePermissions({
     *   options: {
     *     refetchInterval: 60000,  // Refetch every minute
     *     staleTime: 300000,       // Fresh for 5 minutes
     *   }
     * });
     * ```
     *
     * Options are spread AFTER our defaults, so they override:
     * - Our queryKey, queryFn, enabled stay
     * - User can add refetchInterval, onSuccess, etc.
     */
    ...options,

    /**
     * Metadata for DevTools and debugging.
     *
     * **SPREAD ORDER:**
     *
     * ```typescript
     * meta: {
     *   ...options?.meta,        // User-provided meta (first)
     *   ...getXRay("usePermissions"),  // DevTools meta (second, overrides)
     * }
     * ```
     *
     * This ensures DevTools tracking is always added,
     * but users can still provide their own meta.
     */
    meta: {
      ...options?.meta,
      ...getXRay("usePermissions"),
    },
  });

  // ==========================================================================
  // STEP 3: RETURN THE QUERY RESULT
  // ==========================================================================

  /**
   * Return React Query result.
   *
   * **WHAT YOU GET:**
   *
   * ```typescript
   * const {
   *   data,           // Permission data (undefined if loading/error)
   *   isLoading,      // True during initial fetch
   *   isFetching,     // True during any fetch (including refetch)
   *   isError,        // True if fetch failed
   *   error,          // Error object if failed
   *   refetch,        // Function to manually refetch
   *   isSuccess,      // True if fetch succeeded
   *   // ... and more React Query properties
   * } = usePermissions();
   * ```
   *
   * **USAGE PATTERNS:**
   *
   * ```typescript
   * // 1. Simple permission check
   * const { data: perms } = usePermissions();
   * {perms?.includes('admin') && <AdminPanel />}
   *
   * // 2. With loading state
   * const { data, isLoading } = usePermissions();
   * if (isLoading) return <Spinner />;
   * return <div>{data?.map(...)}</div>;
   *
   * // 3. Conditional render
   * const { data } = usePermissions<{ canEdit: boolean }>();
   * {data?.canEdit && <EditButton />}
   *
   * // 4. Manual refetch
   * const { refetch } = usePermissions();
   * <button onClick={() => refetch()}>Refresh</button>
   * ```
   */
  return queryResponse;
}
