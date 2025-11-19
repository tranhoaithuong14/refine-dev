// ============================================================================
// 🔐 HOOK: useOnError - ERROR HANDLING & AUTHENTICATION
// ============================================================================

/**
 * **WHAT IS THIS HOOK FOR?**
 *
 * `useOnError` is a React hook that handles errors in your application,
 * especially authentication-related errors like:
 * - 401 Unauthorized (user not logged in)
 * - 403 Forbidden (user doesn't have permission)
 * - Token expired
 * - Session timeout
 *
 * **HOW IT WORKS:**
 *
 * When an error occurs (e.g., API returns 401):
 * 1. You call `checkError(error)` from this hook
 * 2. It calls your authProvider's `onError` method
 * 3. authProvider decides what to do:
 *    - Logout the user? (e.g., for 401)
 *    - Redirect to login page?
 *    - Just show an error message?
 * 4. Hook automatically handles the logout/redirect
 *
 * **EXAMPLE USAGE:**
 *
 * ```typescript
 * function MyComponent() {
 *   const { mutate: checkError } = useOnError();
 *
 *   const fetchData = async () => {
 *     try {
 *       const response = await fetch("/api/data");
 *       if (!response.ok) {
 *         // Check if it's an auth error (401, 403, etc.)
 *         checkError(response);
 *       }
 *     } catch (error) {
 *       checkError(error);
 *     }
 *   };
 *
 *   return <button onClick={fetchData}>Fetch Data</button>;
 * }
 * ```
 *
 * **REAL-WORLD SCENARIO:**
 *
 * User is logged in and browsing your app:
 * 1. Their session expires after 1 hour
 * 2. They try to update a post → API returns 401
 * 3. `checkError(error)` is called automatically
 * 4. authProvider.onError sees 401 → returns { logout: true }
 * 5. useOnError automatically logs them out and redirects to login
 *
 * **AUTH PROVIDER EXAMPLE:**
 *
 * ```typescript
 * const authProvider = {
 *   // ... other methods
 *
 *   onError: async (error) => {
 *     if (error.statusCode === 401) {
 *       // Unauthorized - logout user
 *       return {
 *         logout: true,
 *         redirectTo: "/login",
 *       };
 *     }
 *
 *     if (error.statusCode === 403) {
 *       // Forbidden - redirect to access denied page
 *       return {
 *         logout: false,
 *         redirectTo: "/access-denied",
 *       };
 *     }
 *
 *     // Other errors - do nothing special
 *     return {};
 *   },
 * };
 * ```
 */

// ============================================================================
// IMPORTS
// ============================================================================

// DevTools integration for debugging
import { getXRay } from "@refinedev/devtools-internal";

// React Query mutation hook
import { type UseMutationResult, useMutation } from "@tanstack/react-query";

// Refine hooks and contexts
import { useAuthProviderContext } from "@contexts/auth";
import { useGo, useLogout } from "@hooks";
import { useKeys } from "@hooks/useKeys";

// TypeScript types
import type { OnErrorResponse } from "../../../contexts/auth/types";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Return type for useOnError hook.
 *
 * This is a React Query mutation that returns:
 * - `mutate: (error) => void` - Call this to check an error
 * - `mutateAsync: (error) => Promise` - Async version
 * - `isPending: boolean` - Is the check in progress?
 * - `isError: boolean` - Did the check itself fail?
 * - `isSuccess: boolean` - Did the check succeed?
 *
 * **Generic Parameters:**
 * - TData: OnErrorResponse - What onError returns ({ logout?, redirectTo? })
 * - TError: unknown - Error type (if onError itself throws)
 * - TVariables: unknown - Input to mutate() (the error object)
 * - TContext: unknown - Context for optimistic updates (not used here)
 */
export type UseOnErrorReturnType = UseMutationResult<
  OnErrorResponse, // What authProvider.onError returns
  unknown, // Error type
  unknown, // Variables type (the error passed to checkError)
  unknown // Context type
>;

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * `useOnError` calls the `checkError` method from the authProvider under the hood.
 *
 * **WHEN TO USE:**
 * - After API calls that might return auth errors (401, 403)
 * - When you need to check if a user is still authenticated
 * - To handle token expiration gracefully
 *
 * **WHAT IT DOES:**
 * 1. Calls authProvider.onError(error)
 * 2. If onError returns { logout: true } → logs out user
 * 3. If onError returns { redirectTo: "/path" } → navigates to path
 *
 * **FLOW DIAGRAM:**
 *
 * ```
 * API Error (401) → checkError(error) → authProvider.onError(error)
 *                                              ↓
 *                                    Returns { logout: true, redirectTo: "/login" }
 *                                              ↓
 *                        useLogout() called → User logged out
 *                                              ↓
 *                        useGo() called → Navigate to /login
 * ```
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/auth/useCheckError} for more details.
 *
 * @returns Mutation object with `mutate` function to check errors
 *
 * @example
 * ```typescript
 * const { mutate: checkError } = useOnError();
 *
 * try {
 *   const data = await apiCall();
 * } catch (error) {
 *   checkError(error); // Automatically handles auth errors
 * }
 * ```
 */
export function useOnError(): UseOnErrorReturnType {
  // ============================================================================
  // STEP 1: INITIALIZE HOOKS AND DEPENDENCIES
  // ============================================================================

  /**
   * useGo - Hook for navigation (redirect user to different pages)
   *
   * Example: go({ to: "/login", type: "replace" })
   */
  const go = useGo();

  /**
   * Get the onError function from authProvider
   *
   * This is the function YOU provide in your authProvider config:
   * ```typescript
   * const authProvider = {
   *   onError: async (error) => {
   *     // Your custom error handling logic
   *   }
   * }
   * ```
   */
  const { onError: onErrorFromContext } = useAuthProviderContext();

  /**
   * useKeys - Hook to generate query/mutation keys for React Query
   *
   * Keys are used to identify this mutation in React Query's cache:
   * ["auth", "action", "onError"]
   */
  const { keys } = useKeys();

  /**
   * useLogout - Hook to logout the user
   *
   * Returns a mutate function that:
   * 1. Clears auth tokens/cookies
   * 2. Resets state
   * 3. Redirects to login/home
   */
  const { mutate: logout } = useLogout();

  // ============================================================================
  // STEP 2: CREATE THE MUTATION
  // ============================================================================

  /**
   * Create a React Query mutation for error checking.
   *
   * **MUTATION CONFIGURATION:**
   *
   * This uses conditional logic:
   * - If authProvider has onError → use it with custom logic
   * - If NO onError → use a no-op function (does nothing)
   */
  const mutation = useMutation<OnErrorResponse, unknown, unknown, unknown>({
    /**
     * Mutation key for React Query tracking
     *
     * Key: ["auth", "action", "onError"]
     */
    mutationKey: keys().auth().action("onError").get(),

    /**
     * CONDITIONAL SPREAD: onErrorFromContext ? {...} : {...}
     *
     * **JAVASCRIPT/TYPESCRIPT SYNTAX EXPLANATION:**
     *
     * This pattern uses:
     * 1. Ternary operator: condition ? valueIfTrue : valueIfFalse
     * 2. Spread operator: ...object (spreads object properties)
     *
     * Combined:
     * ```typescript
     * {
     *   fixed: "value",
     *   ...(condition ? { a: 1, b: 2 } : { c: 3 }),
     * }
     * ```
     *
     * If condition is true:
     * ```typescript
     * { fixed: "value", a: 1, b: 2 }
     * ```
     *
     * If condition is false:
     * ```typescript
     * { fixed: "value", c: 3 }
     * ```
     *
     * **IN OUR CASE:**
     *
     * If authProvider has onError:
     * ```typescript
     * {
     *   mutationKey: [...],
     *   mutationFn: onErrorFromContext,
     *   onSuccess: ({ logout: shouldLogout, redirectTo }) => { ... }
     * }
     * ```
     *
     * If authProvider does NOT have onError:
     * ```typescript
     * {
     *   mutationKey: [...],
     *   mutationFn: () => ({})  // No-op function
     * }
     * ```
     */
    ...(onErrorFromContext
      ? {
          // ====================================================================
          // CASE 1: authProvider HAS onError method
          // ====================================================================

          /**
           * mutationFn: The function to execute when checkError() is called
           *
           * This is YOUR authProvider.onError function.
           * It receives the error and returns:
           * - { logout: true } → should logout
           * - { redirectTo: "/path" } → where to redirect
           * - {} → do nothing special
           */
          mutationFn: onErrorFromContext,

          /**
           * onSuccess: Called after authProvider.onError succeeds
           *
           * @param logout - Should we logout the user? (from authProvider)
           * @param redirectTo - Where to redirect? (from authProvider)
           *
           * **DESTRUCTURING WITH RENAMING:**
           * `{ logout: shouldLogout }` means:
           * - Extract the `logout` property
           * - Rename it to `shouldLogout` in this function
           * - Why rename? To avoid confusion with logout() function
           */
          onSuccess: ({ logout: shouldLogout, redirectTo }) => {
            // ==================================================================
            // OPTION 1: Logout the user
            // ==================================================================

            /**
             * If authProvider said "logout: true"
             *
             * Example:
             * authProvider.onError() returned: { logout: true, redirectTo: "/login" }
             */
            if (shouldLogout) {
              /**
               * Call useLogout to logout the user
               *
               * This will:
               * 1. Clear authentication tokens
               * 2. Clear user state
               * 3. Redirect to redirectPath (or default login page)
               */
              logout({ redirectPath: redirectTo });

              /**
               * Return early - don't execute code below
               *
               * If we logout, we don't need to manually redirect
               * because logout() will handle the redirect
               */
              return;
            }

            // ==================================================================
            // OPTION 2: Just redirect (without logout)
            // ==================================================================

            /**
             * If authProvider said "redirectTo: /path" but NOT logout
             *
             * Example:
             * authProvider.onError() returned: { redirectTo: "/access-denied" }
             *
             * This is useful for
             * - 403 Forbidden errors (user logged in but no permission)
             * - Maintenance mode
             * - Feature not available
             */
            if (redirectTo) {
              /**
               * Navigate to the specified path
               *
               * type: "replace" means:
               * - Replace current history entry (can't go back)
               * - vs type: "push" (can go back with browser back button)
               */
              go({ to: redirectTo, type: "replace" });

              return;
            }

            // ==================================================================
            // OPTION 3: Do nothing
            // ==================================================================

            /**
             * If neither logout nor redirectTo is set:
             * authProvider.onError() returned: {}
             *
             * This means "the error is not critical, just log it or show a toast"
             * The mutation completes without any special action.
             */
          },
        }
      : {
          // ====================================================================
          // CASE 2: authProvider does NOT have onError method
          // ====================================================================

          /**
           * No-op mutation function
           *
           * Does nothing - just returns an empty object
           * Cast to Promise<OnErrorResponse> to satisfy TypeScript
           *
           * Why? If authProvider doesn't provide onError,
           * we don't want to break the app - just silently do nothing
           */
          mutationFn: () => ({}) as Promise<OnErrorResponse>,
        }),

    /**
     * Meta data for DevTools
     *
     * getXRay("useOnError") adds metadata for the Refine DevTools
     * to track and debug this mutation
     */
    meta: {
      ...getXRay("useOnError"),
    },
  });

  // ============================================================================
  // STEP 3: RETURN THE MUTATION
  // ============================================================================

  /**
   * Return the mutation object
   *
   * The spread operator (...mutation) returns all properties:
   * - mutate: (error) => void
   * - mutateAsync: (error) => Promise<OnErrorResponse>
   * - isPending: boolean
   * - isSuccess: boolean
   * - isError: boolean
   * - data: OnErrorResponse | undefined
   * - error: unknown | undefined
   * - reset: () => void
   * - ... and more
   */
  return {
    ...mutation,
  };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * **EXAMPLE 1: Manual Error Checking**
 *
 * ```typescript
 * import { useOnError } from "@refinedev/core";
 *
 * function MyComponent() {
 *   const { mutate: checkError } = useOnError();
 *
 *   const handleAction = async () => {
 *     try {
 *       await fetch("/api/sensitive-data");
 *     } catch (error) {
 *       // Check if it's an auth error that needs special handling
 *       checkError(error);
 *     }
 *   };
 *
 *   return <button onClick={handleAction}>Fetch Data</button>;
 * }
 * ```
 *
 * **EXAMPLE 2: Automatic Error Checking (in data hooks)**
 *
 * Note: Most Refine data hooks (useCreate, useUpdate, etc.) automatically
 * call checkError on failures, so you usually don't need to manually use
 * useOnError in your components!
 *
 * ```typescript
 * // Inside useCreate hook (already implemented)
 * const { mutate: checkError } = useOnError();
 *
 * const mutation = useMutation({
 *   mutationFn: createData,
 *   onError: (error) => {
 *     checkError(error); // Automatically checks auth errors
 *     // ... show notification
 *   }
 * });
 * ```
 *
 * **EXAMPLE 3: Custom Auth Provider with onError**
 *
 * ```typescript
 * const authProvider = {
 *   login: async ({ email, password }) => { ... },
 *   logout: async () => { ... },
 *   check: async () => { ... },
 *
 *   // This is what useOnError calls!
 *   onError: async (error) => {
 *     console.log("Error occurred:", error);
 *
 *     // Check error status code
 *     if (error?.statusCode === 401) {
 *       // User not authenticated
 *       return {
 *         logout: true,
 *         redirectTo: "/login",
 *       };
 *     }
 *
 *     if (error?.statusCode === 403) {
 *       // User authenticated but forbidden
 *       return {
 *         logout: false,
 *         redirectTo: "/access-denied",
 *       };
 *     }
 *
 *     if (error?.message?.includes("Token expired")) {
 *       // Token expired - logout and redirect
 *       return {
 *         logout: true,
 *         redirectTo: "/login?expired=true",
 *       };
 *     }
 *
 *     // Other errors - just log, don't logout or redirect
 *     return {};
 *   },
 * };
 * ```
 */
