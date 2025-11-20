// ============================================================================
// 🔌 HOOK: useDataProvider - DATA PROVIDER ACCESS
// ============================================================================

/**
 * **WHAT IS THIS HOOK FOR?**
 *
 * `useDataProvider` gives you access to data providers in your app.
 * It's especially powerful when you have MULTIPLE backends or APIs.
 *
 * **WHAT IS A DATA PROVIDER?**
 *
 * A data provider is an object that handles ALL data operations:
 * - getList - Fetch a list of resources (e.g., posts, users)
 * - getOne - Fetch a single resource by ID
 * - create - Create a new resource
 * - update - Update a resource
 * - deleteOne - Delete a resource
 * - And more...
 *
 * Think of it as an **adapter pattern** - it abstracts away HOW you fetch data
 * so Refine doesn't care if you use REST, GraphQL, Firebase, Supabase, etc.
 *
 * **WHY USE THIS HOOK?**
 *
 * ```typescript
 * // ❌ Without useDataProvider - Direct API calls everywhere:
 * function PostList() {
 *   const fetchPosts = async () => {
 *     const response = await fetch('/api/posts');  // ← Hardcoded!
 *     return response.json();
 *   };
 * }
 *
 * // ✅ With useDataProvider - Abstracted and flexible:
 * function PostList() {
 *   const dataProvider = useDataProvider();
 *   const provider = dataProvider();  // ← Gets default provider
 *   const posts = await provider.getList({ resource: 'posts' });
 * }
 * ```
 *
 * **MULTI-PROVIDER SUPPORT:**
 *
 * This hook's SUPERPOWER is handling multiple data providers!
 *
 * **Real-world scenario:**
 * Your app has 3 different backends:
 * - Main API (REST) → for posts, users
 * - Analytics API (GraphQL) → for metrics, dashboards
 * - Legacy API (SOAP) → for old customer data
 *
 * ```typescript
 * // Setup in <Refine> component:
 * <Refine
 *   dataProvider={{
 *     default: restProvider('https://api.example.com'),
 *     analytics: graphqlProvider('https://analytics.example.com'),
 *     legacy: soapProvider('https://legacy.example.com'),
 *   }}
 * />
 *
 * // Usage in components:
 * function Dashboard() {
 *   const dataProvider = useDataProvider();
 *
 *   // Get default provider (REST API)
 *   const mainAPI = dataProvider();
 *   const posts = await mainAPI.getList({ resource: 'posts' });
 *
 *   // Get analytics provider (GraphQL)
 *   const analyticsAPI = dataProvider('analytics');
 *   const metrics = await analyticsAPI.getList({ resource: 'metrics' });
 *
 *   // Get legacy provider (SOAP)
 *   const legacyAPI = dataProvider('legacy');
 *   const customers = await legacyAPI.getList({ resource: 'customers' });
 * }
 * ```
 *
 * **USE CASES:**
 *
 * 1. **Microservices Architecture:**
 *    - User service → dataProvider('users')
 *    - Product service → dataProvider('products')
 *    - Order service → dataProvider('orders')
 *
 * 2. **Multi-tenant Apps:**
 *    - Tenant A → dataProvider('tenantA')
 *    - Tenant B → dataProvider('tenantB')
 *
 * 3. **Migration Period:**
 *    - New API → dataProvider() // default
 *    - Old API → dataProvider('legacy')
 *
 * 4. **Different Data Sources:**
 *    - Database → dataProvider() // default REST
 *    - Real-time updates → dataProvider('websocket')
 *    - Cache → dataProvider('redis')
 *
 * **WHY USE CONTEXT API?**
 *
 * Data providers are configured at the ROOT of your app (<Refine> component)
 * but needed EVERYWHERE in your component tree.
 *
 * Context API allows:
 * - ✅ Avoid prop drilling through 10+ levels
 * - ✅ Global access from any component
 * - ✅ Single source of truth
 * - ✅ Easy to swap providers for testing
 *
 * **ARCHITECTURE:**
 *
 * ```
 * ┌─────────────────────────────────────────────┐
 * │  <Refine dataProvider={{...}} />            │
 * │  ↓ Stores providers in Context              │
 * └─────────────────────────────────────────────┘
 *                    ↓ via Context API
 * ┌─────────────────────────────────────────────┐
 * │  useDataProvider() hook                     │
 * │  - Reads from Context                       │
 * │  - Returns function to get provider by name │
 * │  - Validates provider exists                │
 * └─────────────────────────────────────────────┘
 *                    ↓ returns function
 * ┌─────────────────────────────────────────────┐
 * │  Your Component                             │
 * │  const dp = useDataProvider();              │
 * │  const api = dp('analytics');               │
 * │  const data = await api.getList({...});     │
 * └─────────────────────────────────────────────┘
 * ```
 *
 * **COMPARISON WITH OTHER HOOKS:**
 *
 * Most Refine hooks (useList, useCreate, useUpdate) use this hook internally!
 *
 * ```typescript
 * // High-level hooks (easier, more features):
 * const { data } = useList({ resource: 'posts' });  // ← Uses useDataProvider internally
 *
 * // Low-level hook (more control):
 * const dataProvider = useDataProvider();
 * const provider = dataProvider();
 * const data = await provider.getList({ resource: 'posts' });  // ← Manual control
 * ```
 *
 * You typically use high-level hooks, but useDataProvider is useful when:
 * - You need custom logic not covered by high-level hooks
 * - You're building your own abstraction layer
 * - You need to call methods not exposed by Refine hooks
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/data/useDataProvider} for more details.
 *
 * @returns A function that accepts an optional provider name and returns the DataProvider
 *
 * @example
 * ```typescript
 * // Get default provider
 * const dataProvider = useDataProvider();
 * const defaultProvider = dataProvider();
 * const posts = await defaultProvider.getList({ resource: 'posts' });
 *
 * // Get named provider
 * const analyticsProvider = dataProvider('analytics');
 * const metrics = await analyticsProvider.getList({ resource: 'metrics' });
 * ```
 */

import { useCallback, useContext } from "react";

import { DataContext } from "@contexts/data";
import { type DataProvider, IDataContext } from "../../contexts/data/types";

export const useDataProvider = (): ((
  /**
   * The name of the `data provider` you want to access
   */
  dataProviderName?: string,
) => DataProvider) => {
  // ==========================================================================
  // STEP 1: GET DATA PROVIDERS FROM CONTEXT
  // ==========================================================================

  /**
   * Read all data providers from Context.
   *
   * **WHY USE CONTEXT?**
   *
   * Data providers are configured once at app startup:
   * ```typescript
   * <Refine dataProvider={{ default: restAPI, analytics: graphqlAPI }} />
   * ```
   *
   * But they're needed everywhere in your component tree:
   * ```typescript
   * <App>
   *   <Dashboard>
   *     <PostList>  ← Needs dataProvider!
   *       <PostItem>  ← Needs dataProvider!
   *       </PostItem>
   *     </PostList>
   *   </Dashboard>
   * </App>
   * ```
   *
   * Without Context, you'd need prop drilling:
   * ```typescript
   * <App>
   *   <Dashboard dataProvider={...}>
   *     <PostList dataProvider={...}>
   *       <PostItem dataProvider={...}>  ← Passed through 3 levels!
   * ```
   *
   * With Context, any component can access it directly:
   * ```typescript
   * const context = useContext(DataContext);  // ← Direct access!
   * ```
   *
   * **CONTEXT STRUCTURE:**
   *
   * ```typescript
   * context = {
   *   default: restProvider,      // Default provider (required)
   *   analytics?: graphqlProvider, // Named provider (optional)
   *   legacy?: soapProvider,       // Named provider (optional)
   * }
   * ```
   */
  const context = useContext(DataContext);

  // ==========================================================================
  // STEP 2: CREATE THE PROVIDER GETTER FUNCTION
  // ==========================================================================

  /**
   * Create a memoized function that gets the appropriate data provider.
   *
   * **WHY USE useCallback?**
   *
   * ```typescript
   * // Without useCallback - NEW function created every render:
   * const handleDataProvider = (name) => { ... };  // ← New function each time
   *
   * // With useCallback - SAME function reused:
   * const handleDataProvider = useCallback((name) => { ... }, [context]);  // ← Reused!
   * ```
   *
   * This matters when:
   * - This function is passed as a prop to child components
   * - Child components use React.memo() for performance
   * - The function is used in useEffect dependencies
   *
   * **DEPENDENCY: [context]**
   *
   * The function is recreated ONLY when `context` changes.
   * Context changes when:
   * - App first loads (providers initialized)
   * - Data providers are dynamically updated (rare)
   *
   * In most apps, context is set once and never changes → function created once!
   *
   * @param dataProviderName - Optional name of the provider to get
   * @returns The requested DataProvider
   * @throws Error if provider not found or validation fails
   */
  const handleDataProvider = useCallback(
    (dataProviderName?: string) => {
      // ======================================================================
      // CASE 1: NAMED PROVIDER REQUESTED
      // ======================================================================

      /**
       * User is asking for a SPECIFIC provider by name.
       *
       * Example:
       * ```typescript
       * const analyticsAPI = dataProvider('analytics');
       * ```
       *
       * This happens when:
       * - You have multiple backends (REST + GraphQL + legacy)
       * - Microservices architecture (user-service, product-service)
       * - Multi-tenant apps (tenant1, tenant2)
       */
      if (dataProviderName) {
        /**
         * Try to get the named provider from context.
         *
         * **OPTIONAL CHAINING: context?.[dataProviderName]**
         *
         * This is the same as:
         * ```typescript
         * const dataProvider = context && context[dataProviderName];
         * ```
         *
         * It safely accesses the property even if context is undefined/null.
         *
         * Example context:
         * ```typescript
         * context = {
         *   default: restAPI,
         *   analytics: graphqlAPI,
         *   legacy: soapAPI
         * }
         * ```
         *
         * So `context?.['analytics']` returns `graphqlAPI`.
         */
        const dataProvider = context?.[dataProviderName];

        /**
         * **VALIDATION 1: Does the named provider exist?**
         *
         * If user asks for 'analytics' but you only configured 'default',
         * this will throw an error to help debug the issue.
         *
         * Common mistakes this catches:
         * - Typo: dataProvider('anlytics') instead of 'analytics'
         * - Forgot to configure: Missing provider in <Refine dataProvider={...} />
         * - Wrong name: Using 'graphql' when it's actually 'analytics'
         */
        if (!dataProvider) {
          throw new Error(`"${dataProviderName}" Data provider not found`);
        }

        /**
         * **VALIDATION 2: Multi-provider config requires a default!**
         *
         * If you have MULTIPLE providers, you MUST specify which is default:
         *
         * ✅ CORRECT:
         * ```typescript
         * <Refine
         *   dataProvider={{
         *     default: restAPI,      // ← Default specified
         *     analytics: graphqlAPI
         *   }}
         * />
         * ```
         *
         * ❌ WRONG:
         * ```typescript
         * <Refine
         *   dataProvider={{
         *     main: restAPI,        // ← No 'default' key!
         *     analytics: graphqlAPI
         *   }}
         * />
         * ```
         *
         * **WHY IS THIS REQUIRED?**
         *
         * Many Refine hooks (useList, useCreate, etc.) don't specify a provider name.
         * They rely on the DEFAULT provider:
         *
         * ```typescript
         * // This uses default provider internally
         * const { data } = useList({ resource: 'posts' });
         * ```
         *
         * Without a default, these hooks wouldn't know which provider to use!
         *
         * **LOGIC BREAKDOWN:**
         *
         * - `dataProvider` exists → User configured 'analytics' provider ✅
         * - `!context?.default` → But no default provider configured ❌
         * - Result: Throw error to force user to add default
         */
        if (dataProvider && !context?.default) {
          throw new Error(
            "If you have multiple data providers, you must provide default data provider property",
          );
        }

        /**
         * All validations passed! Return the named provider.
         *
         * Example:
         * ```typescript
         * const analyticsAPI = dataProvider('analytics');
         * // Returns: graphqlAPI
         * const metrics = await analyticsAPI.getList({ resource: 'metrics' });
         * ```
         */
        return context[dataProviderName];
      }

      // ======================================================================
      // CASE 2: DEFAULT PROVIDER REQUESTED
      // ======================================================================

      /**
       * No name provided → return the DEFAULT provider.
       *
       * Example:
       * ```typescript
       * const api = dataProvider();  // ← No argument
       * ```
       *
       * This is the most common use case. Most apps have a single backend,
       * so they just use the default provider everywhere.
       *
       * Config:
       * ```typescript
       * // Single provider setup:
       * <Refine dataProvider={restAPI} />
       *
       * // Or explicitly named 'default':
       * <Refine dataProvider={{ default: restAPI }} />
       * ```
       */
      if (context.default) {
        return context.default;
      }

      // ======================================================================
      // CASE 3: ERROR - NO DEFAULT PROVIDER
      // ======================================================================

      /**
       * If we reach here, user called `dataProvider()` without a name,
       * but there's no default provider configured!
       *
       * This happens when:
       * - User forgot to configure ANY provider
       * - User has multiple providers but none named 'default'
       *
       * Example mistake:
       * ```typescript
       * <Refine />  // ← No dataProvider at all!
       * ```
       *
       * Or:
       * ```typescript
       * <Refine dataProvider={{ analytics: graphqlAPI }} />  // ← No 'default' key!
       * ```
       *
       * The error message guides the user:
       * - If you want a SPECIFIC provider → pass the name
       * - If you want DEFAULT → configure it in <Refine>
       */
      throw new Error(
        `There is no "default" data provider. Please pass dataProviderName.`,
      );
    },
    [context],
  );

  // ==========================================================================
  // STEP 3: RETURN THE GETTER FUNCTION
  // ==========================================================================

  /**
   * Return the function so components can use it.
   *
   * **USAGE PATTERN:**
   *
   * ```typescript
   * function MyComponent() {
   *   const dataProvider = useDataProvider();  // ← Get the function
   *
   *   const defaultAPI = dataProvider();        // ← Call it (no args)
   *   const analyticsAPI = dataProvider('analytics');  // ← Call it (with name)
   *
   *   const posts = await defaultAPI.getList({ resource: 'posts' });
   *   const metrics = await analyticsAPI.getList({ resource: 'metrics' });
   * }
   * ```
   *
   * **WHY RETURN A FUNCTION?**
   *
   * Why not just return the provider directly?
   *
   * ```typescript
   * // ❌ If we returned provider directly:
   * const provider = useDataProvider();  // ← Which one? Default? Analytics?
   *
   * // ✅ By returning a function, we can choose:
   * const getProvider = useDataProvider();
   * const default = getProvider();          // ← Get default
   * const analytics = getProvider('analytics');  // ← Get named one
   * ```
   *
   * This pattern gives FLEXIBILITY - same hook works for single or multiple providers!
   */
  return handleDataProvider;
};
