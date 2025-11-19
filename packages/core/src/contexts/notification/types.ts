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

export type OpenNotificationParams = {
  key?: string;
  message: string;
  type: "success" | "error" | "progress";
  description?: string;
  cancelMutation?: () => void;
  undoableTimeout?: number;
};

export interface INotificationContext {
  open?: (params: OpenNotificationParams) => void;
  close?: (key: string) => void;
}

export type NotificationProvider = Required<INotificationContext>;
