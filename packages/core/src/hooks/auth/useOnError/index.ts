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
   * **❓ WHY USE REACT QUERY FOR ERROR CHECKING?**
   *
   * You might wonder: "Why not just call authProvider.onError() directly?"
   *
   * React Query provides critical infrastructure:
   *
   * 1. **State Management:**
   *    - `isPending` - Know when error check is in progress
   *    - `isSuccess` - Know when check completed
   *    - `isError` - Know if check itself failed
   *
   * 2. **Error Handling:**
   *    - If authProvider.onError throws an error, React Query catches it
   *    - Provides retry logic if needed
   *
   * 3. **DevTools Integration:**
   *    - Track all auth operations in React Query DevTools
   *    - Debug mutation history and states
   *
   * 4. **Consistency:**
   *    - All Refine operations (useCreate, useUpdate, useLogout, etc.) use React Query
   *    - Same API pattern across the framework
   *
   * **❓ WHY IS authProvider.onError ASYNC?**
   *
   * Simple examples only check `error.status`, but real-world apps need async:
   *
   * **Use Case 1: Token Refresh**
   * ```typescript
   * onError: async (error) => {
   *   if (error.status === 401) {
   *     // ← ASYNC: Call API to refresh token
   *     const newToken = await refreshToken();
   *     if (newToken) return {}; // No logout needed
   *     return { logout: true }; // Refresh failed
   *   }
   * }
   * ```
   *
   * **Use Case 2: Error Logging**
   * ```typescript
   * onError: async (error) => {
   *   // ← ASYNC: Send error to logging service
   *   await logErrorToServer(error);
   *   return { logout: error.status === 401 };
   * }
   * ```
   *
   * **Use Case 3: Permission Check**
   * ```typescript
   * onError: async (error) => {
   *   if (error.status === 403) {
   *     // ← ASYNC: Fetch latest permissions from server
   *     const canRetry = await checkUserPermission();
   *     return canRetry ? {} : { redirectTo: '/forbidden' };
   *   }
   * }
   * ```
   *
   * **Use Case 4: User Confirmation**
   * ```typescript
   * onError: async (error) => {
   *   if (error.status === 401) {
   *     // ← ASYNC: Show dialog and wait for user response
   *     const confirmed = await showDialog('Session expired. Logout?');
   *     return confirmed ? { logout: true } : {};
   *   }
   * }
   * ```
   *
   * **ARCHITECTURE PATTERN:**
   *
   * This follows the **Strategy Pattern**:
   * - Framework provides infrastructure (React Query wrapper)
   * - You provide business logic (authProvider.onError)
   * - Framework executes your logic and handles results automatically
   *
   * ```
   * ┌─────────────────────────────────────────────┐
   * │  YOU: Define onError in authProvider        │
   * │  ↓ (Your business logic - sync or async)    │
   * └─────────────────────────────────────────────┘
   *                    ↓ injected via context
   * ┌─────────────────────────────────────────────┐
   * │  REFINE: Wraps in React Query mutation      │
   * │  - Adds state management (loading, success) │
   * │  - Handles logout/redirect automatically    │
   * │  - Integrates DevTools                      │
   * └─────────────────────────────────────────────┘
   *                    ↓ exports hook
   * ┌─────────────────────────────────────────────┐
   * │  YOUR COMPONENTS: Use simple API            │
   * │  const { mutate: checkError } = useOnError()│
   * │  checkError(error); ← Just call it!         │
   * └─────────────────────────────────────────────┘
   * ```
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
           * mutationFn: The CORE business logic to execute when checkError() is called
           *
           * **WHAT IS mutationFn?**
           *
           * In React Query, `mutationFn` is the ACTUAL FUNCTION that executes your logic.
           * Everything else (isPending, isSuccess, etc.) are just wrappers around it.
           *
           * **THE FLOW:**
           *
           * ```typescript
           * checkError(error)
           *     ↓
           * React Query calls: mutationFn(error)
           *     ↓
           * Which is: onErrorFromContext(error)
           *     ↓
           * Which is: authProvider.onError(error)  ← YOUR CODE RUNS HERE!
           *     ↓
           * Returns: { logout?: boolean, redirectTo?: string }
           *     ↓
           * onSuccess handler processes the result
           * ```
           *
           * **WHY NOT CALL IT DIRECTLY?**
           *
           * ```typescript
           * // ❌ Without React Query:
           * const checkError = (error) => {
           *   const result = onErrorFromContext(error);
           *   // Now what? No loading state, no error handling...
           * };
           *
           * // ✅ With React Query:
           * const mutation = useMutation({
           *   mutationFn: onErrorFromContext  // ← Pass the function reference
           * });
           * // Now you get: isPending, isSuccess, isError, retry, DevTools, etc.
           * ```
           *
           * **SYNTAX NOTE:**
           *
           * ```typescript
           * mutationFn: onErrorFromContext      // ✅ Pass function reference
           * mutationFn: onErrorFromContext()    // ❌ Call it NOW (wrong!)
           * ```
           *
           * No `()` = pass the function (React Query calls it later)
           * With `()` = call it now and pass the result (not what we want)
           *
           * **WHERE DOES onErrorFromContext COME FROM?**
           *
           * From line 200: `const { onError: onErrorFromContext } = useAuthProviderContext();`
           *
           * This gets YOUR authProvider.onError function:
           * ```typescript
           * const authProvider = {
           *   onError: async (error) => {  // ← This function!
           *     if (error.status === 401) return { logout: true };
           *     return {};
           *   }
           * };
           * ```
           *
           * **REAL-WORLD EXAMPLE:**
           *
           * ```typescript
           * // 1. You define:
           * const authProvider = {
           *   onError: async (error) => {
           *     console.log("Checking:", error);
           *     if (error.status === 401) {
           *       const refreshed = await tryRefreshToken();
           *       return refreshed ? {} : { logout: true };
           *     }
           *     return {};
           *   }
           * };
           *
           * // 2. You use:
           * const { mutate: checkError, isPending } = useOnError();
           * checkError(myError);  // ← Triggers YOUR authProvider.onError
           *
           * // 3. Behind the scenes:
           * // React Query calls: authProvider.onError(myError)
           * // Logs: "Checking: myError"
           * // Tries to refresh token
           * // Returns result → onSuccess processes it
           * ```
           *
           * **SUMMARY:**
           *
           * - `mutationFn` = The function React Query will execute
           * - `onErrorFromContext` = Reference to YOUR authProvider.onError
           * - When mutation runs → YOUR logic executes with React Query's infrastructure
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
   * **❓ QUESTION: "Tôi không thấy hàm checkError ở đâu cả?"**
   *
   * ✅ ANSWER: Đúng vậy! KHÔNG CÓ hàm tên `checkError` trong code này!
   *
   * **SO WHY DOES THIS WORK?**
   *
   * ```typescript
   * const { mutate: checkError } = useOnError();
   * ```
   *
   * This is DESTRUCTURING WITH RENAMING again! Let me explain the full chain:
   *
   * **THE COMPLETE FLOW:**
   *
   * Step 1: `useMutation` (from React Query) returns an object like this:
   * ```typescript
   * {
   *   mutate: function(error) { ... },      // ← The actual function!
   *   mutateAsync: async function(error) { ... },
   *   isPending: false,
   *   isSuccess: false,
   *   isError: false,
   *   data: undefined,
   *   error: undefined,
   *   reset: function() { ... },
   *   // ... more properties
   * }
   * ```
   *
   * Step 2: We store that in `mutation` variable (line 233):
   * ```typescript
   * const mutation = useMutation({ ... });
   * ```
   *
   * Step 3: We return it with spread operator (line 604-606):
   * ```typescript
   * return {
   *   ...mutation,  // Spreads ALL properties from mutation object
   * };
   * ```
   *
   * This is the SAME as writing:
   * ```typescript
   * return {
   *   mutate: mutation.mutate,
   *   mutateAsync: mutation.mutateAsync,
   *   isPending: mutation.isPending,
   *   isSuccess: mutation.isSuccess,
   *   // ... all other properties
   * };
   * ```
   *
   * Step 4: When you call `useOnError()`, you get that object back:
   * ```typescript
   * const result = useOnError();
   * // result = {
   * //   mutate: function(error) { ... },
   * //   mutateAsync: function(error) { ... },
   * //   isPending: false,
   * //   ...
   * // }
   * ```
   *
   * Step 5: You destructure with renaming:
   * ```typescript
   * const { mutate: checkError } = useOnError();
   * //      ^^^^^^  ^^^^^^^^^^
   * //      Extract  Rename to
   * //      mutate   checkError
   * ```
   *
   * **VISUAL BREAKDOWN:**
   *
   * ```
   * useOnError() returns:
   * {
   *   mutate: [Function],  ← This is the function you want!
   *   isPending: false,
   *   ...
   * }
   *
   * Destructure:
   * const { mutate } = useOnError();
   * //      ^^^^^^
   * //      Now you have `mutate` variable
   *
   * Destructure WITH rename:
   * const { mutate: checkError } = useOnError();
   * //      ^^^^^^  ^^^^^^^^^^
   * //      Extract  Give it a new name
   * //
   * //      Now you have `checkError` variable (NOT `mutate`)
   * ```
   *
   * **WHY RENAME mutate TO checkError?**
   *
   * 1. **Better readability** - `checkError(error)` is clearer than `mutate(error)`
   * 2. **Semantic naming** - the function checks errors, so call it checkError!
   * 3. **Avoid confusion** - many hooks have `mutate`, renaming helps distinguish them
   *
   * **COMPARISON WITH OTHER HOOKS:**
   *
   * ```typescript
   * // All these hooks return { mutate, ... }
   * // We rename mutate to match what it does:
   *
   * const { mutate: createPost } = useCreate();
   * const { mutate: updatePost } = useUpdate();
   * const { mutate: deletePost } = useDelete();
   * const { mutate: checkError } = useOnError();  // ← This one!
   * const { mutate: logout } = useLogout();
   * ```
   *
   * **ANOTHER ANALOGY:**
   *
   * Think of it like renaming a tool based on its use:
   *
   * ```typescript
   * // The store sells a generic "tool"
   * const store = {
   *   tool: screwdriver  // Generic name
   * };
   *
   * // You buy it and rename based on YOUR use case
   * const { tool: screwdriver } = store;  // For screws
   * const { tool: pokeStick } = store;    // For poking
   * const { tool: opener } = store;       // For opening
   *
   * // Same tool, different names based on context!
   * ```
   *
   * **SIMPLIFIED EXAMPLE:**
   *
   * ```typescript
   * // Function that returns an object
   * function getUser() {
   *   return {
   *     name: "Alice",
   *     age: 30,
   *     email: "alice@example.com"
   *   };
   * }
   *
   * // Destructure WITHOUT rename
   * const { name } = getUser();
   * console.log(name);  // "Alice"
   *
   * // Destructure WITH rename
   * const { name: userName } = getUser();
   * console.log(userName);  // "Alice"
   * console.log(name);      // ❌ Error: name is not defined
   *
   * // Similarly:
   * const { mutate } = useOnError();
   * console.log(mutate);  // [Function]
   *
   * const { mutate: checkError } = useOnError();
   * console.log(checkError);  // [Function] - SAME function
   * console.log(mutate);      // ❌ Error: mutate is not defined
   * ```
   *
   * **WHERE DOES THE ACTUAL FUNCTION LOGIC COME FROM?**
   *
   * The `mutate` function is created by React Query's `useMutation` hook.
   * When you call `mutate(error)`, React Query internally:
   *
   * 1. Calls the `mutationFn` you provided (line 468 or 572)
   * 2. Tracks the mutation state (pending, success, error)
   * 3. Calls `onSuccess` if successful (line 482)
   * 4. Updates all the properties (isPending, data, error, etc.)
   *
   * So the actual logic is:
   * - **mutationFn** (line 468): YOUR authProvider.onError
   * - **onSuccess** (line 482): Handles logout/redirect
   * - **mutate wrapper**: Created by React Query (invisible to you)
   *
   * **COMPLETE TRACE:**
   *
   * ```typescript
   * // 1. You write:
   * const { mutate: checkError } = useOnError();
   * checkError(someError);
   *
   * // 2. Which calls:
   * mutation.mutate(someError);
   *
   * // 3. React Query internally does:
   * const result = await mutationFn(someError);  // Your authProvider.onError
   * onSuccess(result);                           // Handle logout/redirect
   * updateState({ isPending: false, data: result, isSuccess: true });
   *
   * // 4. Which executes:
   * authProvider.onError(someError)
   * // Returns: { logout: true, redirectTo: "/login" }
   *
   * // 5. Then onSuccess runs:
   * if (result.logout) {
   *   logout({ redirectPath: result.redirectTo });
   * }
   * ```
   *
   * **SUMMARY:**
   *
   * - ❌ There is NO function called `checkError` in this code
   * - ✅ There IS a property called `mutate` (from useMutation)
   * - ✅ You RENAME it to `checkError` when destructuring
   * - ✅ `checkError` and `mutate` are the SAME function
   * - ✅ The actual logic is in `mutationFn` (authProvider.onError)
   * - ✅ React Query wraps it and provides the `mutate` function
   *
   * **It's like buying a product called "Multi-tool" and calling it "Screwdriver"
   * because that's how YOU use it!** 🔧
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
