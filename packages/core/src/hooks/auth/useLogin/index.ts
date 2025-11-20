// ============================================================================
// 🔐 useLogin Hook - GIẢI THÍCH CHO NGƯỜI MỚI
// ============================================================================
//
// Hook này giúp bạn gọi authProvider.login theo cách chuẩn hoá của refine.
// Nó kết hợp React Query (useMutation) với context auth để gửi request và xử lý kết quả (redirect, notify, invalidate cache).
//
// Đọc comment từng phần để hiểu rõ luồng.

import React from "react";

import { getXRay } from "@refinedev/devtools-internal";
// getXRay: helper nội bộ để thu thập metadata phục vụ devtools (hiển thị trace).
import {
  type UseMutationOptions,
  type UseMutationResult,
  useMutation,
} from "@tanstack/react-query";
// useMutation: hook từ React Query để chạy mutation (POST/PUT/DELETE).
// UseMutationOptions/Result: type mô tả cấu hình và kết quả mutation.

import { useAuthProviderContext } from "@contexts/auth";
// useAuthProviderContext: hook đọc context auth (được set trong AuthProviderContextProvider).
// Lấy ra hàm login đã bọc try/catch trong context.
import { useGo, useKeys, useNotification, useParsed } from "@hooks";
// useGo: hook điều hướng (push/replace route).
// useKeys: tạo key chuẩn cho React Query (giúp cache/invalidate dễ dàng).
// useNotification: giúp mở/đóng thông báo (toast).
// useParsed: parse URL hiện tại (query params như ?to=/dashboard).

import type {
  AuthActionResponse,
  SuccessNotificationResponse,
} from "../../../contexts/auth/types";
// AuthActionResponse: kết quả chuẩn hoá cho login/logout/register (success, redirectTo, error...).
// SuccessNotificationResponse: cấu trúc thông báo thành công (message + description).
import type { RefineError } from "../../../contexts/data/types";
import type { OpenNotificationParams } from "../../../contexts/notification/types";
import { useInvalidateAuthStore } from "../useInvalidateAuthStore";
// useInvalidateAuthStore: hook nội bộ để refresh cache/identity sau khi login/logout.

// ----------------------------------------------------------------------------
// UseLoginProps: kiểu props mà hook nhận vào (generic TVariables = shape của form login)
// - mutationOptions: cho phép người dùng truyền cấu hình React Query (onSuccess, retry, meta,...)
//   nhưng Omit "mutationFn" để hook tự định nghĩa hàm register (loginFromContext).
// ----------------------------------------------------------------------------
export type UseLoginProps<TVariables> = {
  mutationOptions?: Omit<
    UseMutationOptions<
      AuthActionResponse,
      Error | RefineError,
      TVariables,
      unknown
    >,
    "mutationFn"
  >;
};

// ----------------------------------------------------------------------------
// UseLoginReturnType: type của giá trị hook trả về (UseMutationResult từ React Query)
// ----------------------------------------------------------------------------
export type UseLoginReturnType<TVariables> = UseMutationResult<
  AuthActionResponse,
  Error | RefineError,
  TVariables,
  unknown
>;

/**
 * `useLogin` calls `login` method from {@link https://refine.dev/docs/api-reference/core/providers/auth-provider `authProvider`} under the hood.
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/auth/useLogin} for more details.
 *
 * @typeParam TData - Result data of the query
 * @typeParam TVariables - Values for mutation function. default `{}`
 *
 */
export function useLogin<TVariables = {}>({
  mutationOptions,
}: UseLoginProps<TVariables> = {}): UseLoginReturnType<TVariables> {
  // mutationOptions default = {}, TVariables default = {} (form values là object rỗng).

  const invalidateAuthStore = useInvalidateAuthStore();
  // Sau khi login thành công, cần invalidate cache identity/token => hook này làm việc đó.
  const go = useGo();
  // Điều hướng (redirect) sau login.
  const parsed = useParsed();
  // Lấy params từ URL hiện tại (ví dụ ?to=/admin/dashboard).

  const { close, open } = useNotification();
  // close/open: thao tác với notification center.
  const { login: loginFromContext } = useAuthProviderContext();
  // Lấy hàm login do AuthProvider cung cấp (đã bọc try/catch).
  const { keys } = useKeys();
  // keys(): helper tạo query/mutation key chuẩn cho React Query.

  const to = parsed.params?.to;
  // Nếu URL có param ?to=..., sau login sẽ redirect tới đó.

  const mutation = useMutation<
    AuthActionResponse,
    Error | RefineError,
    TVariables,
    unknown
  >({
    mutationKey: keys().auth().action("login").get(),
    // mutationKey: giúp React Query phân biệt các mutation khác nhau → cần thiết cho devtools/cache.
    mutationFn: loginFromContext,
    // mutationFn: chính là authProvider.login (lấy từ context).
    onSuccess: async ({ success, redirectTo, error, successNotification }) => {
      // Hàm này chạy sau khi loginFromContext resolve.
      // destructuring kết quả AuthActionResponse: success, redirectTo, error, successNotification.

      if (success) {
        close?.("login-error");
        // Nếu từng có notification lỗi login, đóng lại để tránh chồng chéo.

        if (successNotification) {
          open?.(buildSuccessNotification(successNotification));
          // Nếu authProvider trả successNotification, hiển thị toast thành công.
        }
      }

      if (error || !success) {
        open?.(buildNotification(error));
        // Dù backend có trả success=false hay error có giá trị, mở thông báo lỗi chung.
      }

      if (success) {
        if (to) {
          go({ to: to, type: "replace" });
        } else if (redirectTo) {
          go({ to: redirectTo, type: "replace" });
          // Redirect logic ưu tiên query param ?to, nếu không có thì dùng redirectTo từ backend.
        }
      }

      setTimeout(() => {
        invalidateAuthStore();
      }, 32);
      // invalidateAuthStore sau một tick (~32ms) để đảm bảo state/cookie đã cập nhật xong
      // (tránh race condition giữa navigate và invalidate).
    },
    onError: (error: any) => {
      open?.(buildNotification(error));
      // Nếu mutation throw exception (network, unexpected), hiển thị notification lỗi.
    },
    ...mutationOptions,
    meta: {
      ...mutationOptions?.meta,
      ...getXRay("useLogin"),
    },
  });

  return {
    ...mutation,
  };
}

const buildNotification = (
  error?: Error | RefineError,
): OpenNotificationParams => {
  return {
    message: error?.name || "Login Error",
    description: error?.message || "Invalid credentials",
    key: "login-error",
    type: "error",
  };
};

const buildSuccessNotification = (
  successNotification: SuccessNotificationResponse,
): OpenNotificationParams => {
  return {
    message: successNotification.message,
    description: successNotification.description,
    key: "login-success",
    type: "success",
  };
};
