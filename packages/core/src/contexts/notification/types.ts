export type SuccessErrorNotification<
  TData = unknown,
  TError = unknown,
  TVariables = unknown,
> = {
  /**
   * Success notification configuration to be displayed when the mutation is successful.
   *
   * It supports 3 types of values:
   * 1. **Object**: Static configuration (e.g., `{ message: "Success", type: "success" }`).
   * 2. **Boolean (`false`)**: Disables the notification.
   * 3. **Function**: Dynamic configuration based on the response data, input values, or resource name.
   *
   * @default Default success message from Refine.
   *
   * @example
   * // 1. Object - Static message
   * successNotification: {
   *   message: "Post created",
   *   description: "The post has been successfully created.",
   *   type: "success",
   * }
   *
   * @example
   * // 2. Boolean - Disable notification
   * successNotification: false
   *
   * @example
   * // 3. Function - Dynamic message based on response
   * successNotification: (data, values, resource) => ({
   *   message: `Post ${data.title} created`,
   *   description: "Success",
   *   type: "success",
   * })
   */
  successNotification?:
    | OpenNotificationParams
    | false
    | ((
        data?: TData,
        values?: TVariables,
        resource?: string,
      ) => OpenNotificationParams | false | undefined);
  /**
   * Error notification configuration to be displayed when the mutation fails.
   *
   * It supports 3 types of values:
   * 1. **Object**: Static configuration (e.g., `{ message: "Error", type: "error" }`).
   * 2. **Boolean (`false`)**: Disables the notification.
   * 3. **Function**: Dynamic configuration based on the error, input values, or resource name.
   *
   * @default Default error message from Refine.
   *
   * @example
   * // 1. Object - Static message
   * errorNotification: {
   *   message: "Error",
   *   description: "Something went wrong",
   *   type: "error",
   * }
   *
   * @example
   * // 2. Boolean - Disable notification
   * errorNotification: false
   *
   * @example
   * // 3. Function - Dynamic message based on error
   * errorNotification: (error, values, resource) => ({
   *   message: `Error: ${error.message}`,
   *   description: "Please try again",
   *   type: "error",
   * })
   */
  errorNotification?:
    | OpenNotificationParams
    | false
    | ((
        error?: TError,
        values?: TVariables,
        resource?: string,
      ) => OpenNotificationParams | false | undefined);
};

/**
 * Parameters for opening a notification in Refine.
 *
 * This type defines the structure for notification configurations used throughout the framework.
 * It's used by the notification provider to display messages to users.
 *
 * @example
 * // Basic success notification
 * const params: OpenNotificationParams = {
 *   message: "Operation successful",
 *   type: "success",
 * };
 *
 * @example
 * // Detailed error notification
 * const params: OpenNotificationParams = {
 *   key: "create-post-error",
 *   message: "Failed to create post",
 *   description: "Please check your input and try again",
 *   type: "error",
 * };
 *
 * @example
 * // Undoable notification with progress
 * const params: OpenNotificationParams = {
 *   key: "delete-post",
 *   message: "Post will be deleted",
 *   type: "progress",
 *   undoableTimeout: 5000,
 *   cancelMutation: () => console.log("Deletion cancelled"),
 * };
 */
export type OpenNotificationParams = {
  /**
   * Unique identifier for the notification.
   * Used to manage notification lifecycle (e.g., closing specific notifications).
   *
   * @optional
   */
  key?: string;
  /**
   * The main message text to display in the notification.
   *
   * @required
   */
  message: string;
  /**
   * The type of notification, which determines the visual style and icon.
   * - `"success"`: Indicates a successful operation (e.g., create, update).
   * - `"error"`: Indicates a failed operation.
   * - `"progress"`: Indicates an ongoing undoable operation.
   *
   * @required
   */
  type: "success" | "error" | "progress";
  /**
   * Additional details or context for the notification.
   * Typically displayed below the main message.
   *
   * @optional
   */
  description?: string;
  /**
   * Callback function to cancel an undoable mutation.
   * Used with `type: "progress"` for operations that can be undone.
   *
   * @optional
   */
  cancelMutation?: () => void;
  /**
   * Timeout duration (in milliseconds) for undoable operations.
   * After this time, the mutation will be executed automatically.
   *
   * @optional
   * @default 5000
   */
  undoableTimeout?: number;
};

/**
 * Interface that defines methods to manage notifications in Refine.
 *
 * **TYPESCRIPT SYNTAX EXPLANATION:**
 * - `interface`: Like a "blueprint" that describes the structure of an object
 * - `?`: Question mark after property name means the property is "optional" (not required)
 * - `(params: Type) => void`: This is how to write a function type in TypeScript
 *   + `params: Type` - input parameter with its data type
 *   + `=> void` - this function returns nothing (void = empty)
 *
 * **PURPOSE:**
 * This interface is used as a React context so components can
 * call notifications from anywhere in the application.
 *
 * @example
 * // How to use in a component
 * import { useNotification } from "@refinedev/core";
 *
 * function MyComponent() {
 *   const { open, close } = useNotification();
 *
 *   const handleClick = () => {
 *     // Open a notification
 *     open?.({
 *       message: "Saved successfully!",
 *       type: "success",
 *     });
 *
 *     // Close notification after 3 seconds
 *     setTimeout(() => {
 *       close?.("notification-key");
 *     }, 3000);
 *   };
 *
 *   return <button onClick={handleClick}>Save</button>;
 * }
 *
 * @example
 * // Why use ?. when calling functions?
 * // Because open and close are optional (?), they might be undefined
 * // Use ?. (optional chaining) to avoid errors when they haven't been defined
 * open?.({ message: "Hello" });  // Safe - no error if open is undefined
 * open({ message: "Hello" });    // Dangerous - will error if open is undefined
 */
export interface INotificationContext {
  /**
   * Method to display a new notification.
   *
   * **SYNTAX:**
   * ```typescript
   * (params: OpenNotificationParams) => void
   * ```
   * - Takes an object params of type OpenNotificationParams
   * - Returns nothing (void)
   *
   * @param params - Configuration for the notification (message, type, description, etc.)
   * @returns Nothing
   *
   * @optional
   *
   * @example
   * open({
   *   key: "my-notification",
   *   message: "Post created",
   *   type: "success",
   *   description: "Your post has been saved successfully"
   * });
   */
  open?: (params: OpenNotificationParams) => void;

  /**
   * Method to close a currently displayed notification.
   *
   * **SYNTAX:**
   * ```typescript
   * (key: string) => void
   * ```
   * - Takes a string which is the notification's key
   * - Returns nothing (void)
   *
   * @param key - Key (ID) of the notification to close
   * @returns Nothing
   *
   * @optional
   *
   * @example
   * // Close notification with key "my-notification"
   * close("my-notification");
   */
  close?: (key: string) => void;
}

/**
 * Type representing a notification provider - requires all methods to be implemented.
 *
 * **TYPESCRIPT SYNTAX EXPLANATION:**
 * - `Required<Type>`: This is a "Utility Type" in TypeScript
 * - It converts all optional properties (with ?) to required (mandatory)
 *
 * **COMPARISON:**
 * ```typescript
 * // INotificationContext - properties are optional
 * interface INotificationContext {
 *   open?: (...) => void;   // May or may not exist
 *   close?: (...) => void;  // May or may not exist
 * }
 *
 * // Required<INotificationContext> - all are mandatory
 * type NotificationProvider = {
 *   open: (...) => void;    // MUST have
 *   close: (...) => void;   // MUST have
 * }
 * ```
 *
 * **WHY DO WE NEED BOTH?**
 * - `INotificationContext`: For consumers (users) - they're not sure if context has been set up → use optional
 * - `NotificationProvider`: For provider implementation - must implement everything → use required
 *
 * @example
 * // When creating a notification provider, MUST implement both open and close
 * import { NotificationProvider } from "@refinedev/core";
 *
 * const notificationProvider: NotificationProvider = {
 *   open: (params) => {
 *     // Logic to display notification
 *     console.log("Opening notification:", params.message);
 *   },
 *   close: (key) => {
 *     // Logic to close notification
 *     console.log("Closing notification:", key);
 *   },
 *   // ❌ CANNOT miss open or close - will get TypeScript error
 * };
 *
 * @example
 * // Example with Ant Design
 * import { notification } from "antd";
 * import { NotificationProvider } from "@refinedev/core";
 *
 * export const notificationProvider: NotificationProvider = {
 *   open: (params) => {
 *     notification[params.type]({
 *       message: params.message,
 *       description: params.description,
 *       key: params.key,
 *     });
 *   },
 *   close: (key) => {
 *     notification.close(key);
 *   },
 * };
 */
export type NotificationProvider = Required<INotificationContext>;
