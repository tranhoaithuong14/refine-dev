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

export interface INotificationContext {
  open?: (params: OpenNotificationParams) => void;
  close?: (key: string) => void;
}

export type NotificationProvider = Required<INotificationContext>;
