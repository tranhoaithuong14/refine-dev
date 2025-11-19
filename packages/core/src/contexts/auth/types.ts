// ============================================================================
// 🔐 AUTH TYPES - GIẢI THÍCH CHO NGƯỜI MỚI
// ============================================================================
//
// 🧭 Bối cảnh & triết lý:
// - Auth provider nên LUÔN resolve Promise và trả thông tin để app tự quyết định redirect/logout,
//   thay vì throw/reject khiến luồng hook khó kiểm soát.
// - check/onError trả về authenticated + redirectTo + logout + error để mọi trường hợp (login bắt buộc,
//   trang optional, không redirect, redirect khác /login, chỉ logout...) đều xử lý được.
// - Các type dưới đây mô tả contract đó.
//
// 📚 Nhắc nhanh TypeScript:
// - Promise<T>: kết quả bất đồng bộ, luôn dùng trong các method auth.
// - unknown vs any:
//   * any: “tắt” kiểm tra kiểu, dùng ở đâu cũng không báo lỗi → tiện nhưng mất an toàn.
//   * unknown: an toàn hơn, buộc phải kiểm tra/ep kiểu trước khi dùng; phù hợp khi muốn chặn lỗi runtime.
//   Trong file này, params dùng any để không ép schema; nếu muốn an toàn hơn, bạn có thể chuyển sang unknown + parse.
// - Partial<T>: biến mọi field thành optional (dùng ở IAuthContext).
//
// 📜 Ghi chú lịch sử thiết kế (gốc):
/**
 * @author aliemir
 *
 * In the current internal structure, sometimes we pass params and args from one function to another,
 * like in case of `check` (formerly `checkAuth`) function, we pass the reject value to `useLogout` hook,
 * which handles the redirect after logout.
 *
 * These actions should be separated,
 *
 * Apps can exist with an optional auth,
 * or do not redirect after logout,
 * or do the redirect but not log out,
 * or do the redirect to a different page than `/login`.
 *
 * To cover all those cases, we should return more information from auth functions.
 *
 * Let's say, they should always resolve, even if user is not authenticated,
 * but have the proper information to handle the situation.
 *
 * like `authenticated: false`, `redirect: '/login'` and `logout: true`
 * which will inform refine that user is not authenticated and should be redirected to `/login` and logout.
 * In some cases, redirect might need to be transferred to other hooks (like `useLogout` hook),
 * but these cases can be handled internally.
 *
 * If the response from `check` is `{ authenticated: false, logout: false, redirect: "/not-authenticated" }`,
 * then the user will be redirected to `/not-authenticated` without logging out.
 *
 * If the response from `check` is `{ authenticated: false, logout: true, redirect: false }`,
 * then the user will be logged out without redirecting.
 *
 * Same goes for `onError` function, it should always resolve.
 */

import type { RefineError } from "../data/types";

// ----------------------------------------------------------------------------
// 🧾 CheckResponse - Kết quả của authProvider.check
// - authenticated: boolean (bắt buộc) → user đã đăng nhập?
// - redirectTo?: string → URL chuyển hướng ("/login", "/not-authenticated", ...).
// - logout?: boolean → có logout hay không.
// - error?: RefineError | Error → lỗi gốc (server/token...).
// Ví dụ: { authenticated: false, redirectTo: "/login", logout: true }
// ----------------------------------------------------------------------------

export type CheckResponse = {
  authenticated: boolean;
  redirectTo?: string;
  logout?: boolean;
  error?: RefineError | Error;
};

// ----------------------------------------------------------------------------
// 🧾 OnErrorResponse - Kết quả khi authProvider.onError xử lý lỗi
// - redirectTo?: string → điều hướng (VD: /login).
// - logout?: boolean → có cần logout không.
// - error?: Error gốc.
// ----------------------------------------------------------------------------
export type OnErrorResponse = {
  redirectTo?: string;
  logout?: boolean;
  error?: RefineError | Error;
};

// ----------------------------------------------------------------------------
// 🔔 SuccessNotificationResponse - Thông báo thành công
// ----------------------------------------------------------------------------
export type SuccessNotificationResponse = {
  message: string;
  description?: string;
};

// ----------------------------------------------------------------------------
// 🧾 AuthActionResponse - Response chung cho login/logout/register/forgot/update
// - success: boolean → thao tác thành công?
// - redirectTo?: string → điều hướng sau hành động.
// - error?: Error (nếu có).
// - successNotification?: thông báo tuỳ chỉnh.
// - [key: string]: unknown → payload bổ sung (token, profile,...).
// ----------------------------------------------------------------------------
export type AuthActionResponse = {
  success: boolean;
  redirectTo?: string;
  error?: RefineError | Error;
  [key: string]: unknown;
  successNotification?: SuccessNotificationResponse;
};

// ----------------------------------------------------------------------------
// PermissionResponse / IdentityResponse - để implementer tự định nghĩa (role, ACL, user profile,...)
// ----------------------------------------------------------------------------
export type PermissionResponse = unknown;

export type IdentityResponse = unknown;

// ----------------------------------------------------------------------------
// 🔌 AuthProvider - Hợp đồng cho auth provider
// - login/logout/check/onError: bắt buộc (luôn Promise).
// - register/forgotPassword/updatePassword/getPermissions/getIdentity: optional.
// - params: any để không bó buộc backend; người dùng tự định nghĩa schema.
// ----------------------------------------------------------------------------
export type AuthProvider = {
  login: (params: any) => Promise<AuthActionResponse>;
  logout: (params: any) => Promise<AuthActionResponse>;
  check: (params?: any) => Promise<CheckResponse>;
  onError: (error: any) => Promise<OnErrorResponse>;
  register?: (params: any) => Promise<AuthActionResponse>;
  forgotPassword?: (params: any) => Promise<AuthActionResponse>;
  updatePassword?: (params: any) => Promise<AuthActionResponse>;
  getPermissions?: (
    params?: Record<string, any>,
  ) => Promise<PermissionResponse>;
  getIdentity?: (params?: any) => Promise<IdentityResponse>;
};

// ----------------------------------------------------------------------------
// 📡 IAuthContext - Dùng cho React Context (xem index.tsx)
// - extends Partial<AuthProvider>: mọi method optional, người dùng tự implement.
// - isProvided: flag bật/tắt auth (nếu false, hook auth có thể bỏ qua).
// ----------------------------------------------------------------------------
export interface IAuthContext extends Partial<AuthProvider> {
  isProvided: boolean;
}

// ----------------------------------------------------------------------------
// 📦 Các kiểu trả về chuẩn hoá cho hooks
// - Áp dụng cho các hook auth (useLogin, useLogout, useRegister, useForgotPassword, useUpdatePassword).
// - Ý nghĩa giá trị:
//   * void: hành động mặc định tiếp tục (VD: redirect theo cấu hình).
//   * false: chặn hành động mặc định (thường để không redirect).
//   * string: URL để redirect tùy chỉnh.
//   * object (chỉ ở login): payload bổ sung (token, user metadata, ...).
// - Refine đọc kết quả này để quyết định redirect hay dừng lại.
// ----------------------------------------------------------------------------
export type TLogoutData = void | false | string;
export type TLoginData = void | false | string | object;
export type TRegisterData = void | false | string;
export type TForgotPasswordData = void | false | string;
export type TUpdatePasswordData = void | false | string;
