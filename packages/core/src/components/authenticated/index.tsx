// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ HOOK CẦN DÙNG
// ============================================================================

import React from "react";
import { useActiveAuthProvider } from "@definitions/index";
import { useGo, useIsAuthenticated, useParsed } from "@hooks";
import type { GoConfig } from "../../contexts/router/types";

export type AuthCheckParams = any;

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA PROP TYPES
// ============================================================================
export type AuthenticatedProps = {
  /**
   * Unique key to identify the component.
   * This is required if you have multiple `Authenticated` components at the same level.
   * @required
   */
  key: React.Key;
  /**
   * Whether to redirect user if not logged in or not.
   * If not set, user will be redirected to `redirectTo` property of the `check` function's response.
   * If set to a string, user will be redirected to that string.
   *
   * This property only works if `fallback` is **not set**.
   */
  redirectOnFail?: string | true;
  /**
   * Whether to append current path to search params of the redirect url at `to` property.
   *
   * By default, `to` parameter is used by successful invocations of the `useLogin` hook.
   * If `to` present, it will be used as the redirect url after successful login.
   */
  appendCurrentPathToQuery?: boolean;
  /**
   * Content to show if user is not logged in.
   */
  fallback?: React.ReactNode;
  /**
   * Content to show while checking whether user is logged in or not.
   */
  loading?: React.ReactNode;
  /**
   * Content to show if user is logged in.
   */
  children?: React.ReactNode;
  /**
   * optional params to be passed to the Auth Provider's check method via the useIsAuthenticated hook.
   */
  params?: AuthCheckParams;
};

// ============================================================================
// PHẦN 3: COMPONENT CHÍNH
// ============================================================================
/**
 * 📚 `<Authenticated>` là phiên bản component của hook `useAuthenticated`.
 *   - Đặt component này bao quanh phần UI cần bảo vệ.
 *   - Nếu user chưa đăng nhập → hiển thị fallback hoặc redirect.
 *   - Nếu hệ thống chưa cấu hình auth provider → component cho qua (không chặn).
 *
 * 💡 Yêu cầu `key` duy nhất khi bạn dùng nhiều `<Authenticated>` ngang hàng.
 * React sẽ unmount + remount khi key đổi giúp tránh rò rỉ state (vd fallback render sai).
 *
 * 🧩 Ví dụ cơ bản:
 * ```tsx
 * // Nếu chưa đăng nhập: sẽ redirect sang trang login (do authProvider.check trả redirectTo)
 * <Authenticated key="dashboard">
 *   <Dashboard />
 * </Authenticated>
 * ```
 *
 * 🧩 Ví dụ kèm fallback (không redirect):
 * ```tsx
 * <Authenticated
 *   key="public"
 *   redirectOnFail={false} // tắt redirect
 *   fallback={<LoginForm />} // hiển thị form login nội tuyến
 * >
 *   <SecretContent />
 * </Authenticated>
 * ```
 *
 * 🧩 Ví dụ redirect tùy chỉnh và giữ lại đường dẫn hiện tại:
 * ```tsx
 * <Authenticated
 *   key="settings"
 *   redirectOnFail="/login"
 *   appendCurrentPathToQuery // thêm ?to=/settings vào URL để login xong quay lại
 * >
 *   <SettingsPage />
 * </Authenticated>
 * ```
 */
export function Authenticated({
  redirectOnFail = true,
  appendCurrentPathToQuery = true,
  children,
  fallback: fallbackContent,
  loading: loadingContent,
  params,
}: AuthenticatedProps): React.JSX.Element | null {
  // ============================================================================
  // BƯỚC 1: LẤY NGỮ CẢNH (CONTEXT)
  // ============================================================================
  // 🔌 useActiveAuthProvider: kiểm tra trong <Refine> có cấu hình authProvider không.
  // 🧭 useParsed: đọc thông tin URL hiện tại (pathname, query params) theo router refine.
  // 🚦 useGo: hàm điều hướng thống nhất (thay cho useNavigate của từng router).
  const activeAuthProvider = useActiveAuthProvider();
  const hasAuthProvider = Boolean(activeAuthProvider?.isProvided);
  const parsed = useParsed();
  const go = useGo();

  // ============================================================================
  // BƯỚC 2: GỌI HOOK CHECK AUTH
  // ============================================================================
  // useIsAuthenticated: gọi authProvider.check(params) → trả { authenticated, redirectTo }.
  // - isFetching: đang gọi API check.
  // - authenticated: boolean kết quả.
  // - redirectTo: server gợi ý URL login/redirect khi chưa auth.
  const {
    isFetching,
    data: {
      authenticated: isAuthenticatedStatus,
      redirectTo: authenticatedRedirect,
    } = {},
  } = useIsAuthenticated({
    params,
  });

  // isFetching: trạng thái đang gọi check() của auth provider.
  // isAuthenticatedStatus: kết quả check() trả về { authenticated, redirectTo }.
  const isAuthenticated = hasAuthProvider ? isAuthenticatedStatus : true;
  // Không có auth provider => coi như luôn authenticated để tránh chặn app khi chưa cấu hình auth.
  if (!hasAuthProvider) {
    return <>{children ?? null}</>;
  }

  // Đang gọi check auth (loading) => show loading UI nếu có (hoặc nothing).
  if (isFetching) {
    return <>{loadingContent ?? null}</>;
  }

  // Đã đăng nhập => render children.
  if (isAuthenticated) {
    return <>{children ?? null}</>;
  }

  // ============================================================================
  // BƯỚC 3: XỬ LÝ KHI CHƯA AUTHENTICATED
  // ============================================================================
  // 3.1 Nếu dev truyền fallback → render fallback (ví dụ <LoginForm /> inline)
  if (typeof fallbackContent !== "undefined") {
    return <>{fallbackContent ?? null}</>;
  }

  // 3.2 Không có fallback → tính toán redirect phù hợp.
  // redirectOnFail:
  //   - true (default)   → dùng redirectTo từ authProvider.check (server quyết định).
  //   - string           → luôn redirect đến URL đó.
  //   - undefined/false  → không redirect (sẽ return null).
  const appliedRedirect =
    typeof redirectOnFail === "string"
      ? redirectOnFail
      : (authenticatedRedirect as string | undefined);

  // Lưu pathname hiện tại (bỏ query/hash) để dùng làm param `to`, giúp quay lại sau khi login thành công.
  const pathname = `${parsed.pathname}`.replace(/(\?.*|#.*)$/, "");

  if (appliedRedirect) {
    // `to` query param: đường dẫn sẽ quay lại sau login.
    // Ưu tiên param `to` có sẵn trên URL; nếu không, build từ pathname hiện tại (giữ query nếu có).
    // Ví dụ: đang ở /settings?tab=profile → to="/settings?tab=profile"
    // Login thành công: useLogin sẽ điều hướng về to (nếu backend không override).
    const queryToValue: string | undefined = parsed.params?.to
      ? parsed.params.to
      : go({
          to: pathname,
          options: { keepQuery: true },
          type: "path",
        });

    return (
      <Redirect
        config={{
          to: appliedRedirect,
          query:
            appendCurrentPathToQuery && (queryToValue ?? "").length > 1
              ? {
                  // Khi appendCurrentPathToQuery=true → thêm ?to=<path hiện tại> vào URL login.
                  // Login thành công → useLogin sẽ đọc param `to` này để điều hướng ngược lại.
                  to: queryToValue,
                }
              : undefined,
          type: "replace",
        }}
      />
    );
  }

  return null;
}

const Redirect = ({ config }: { config: GoConfig }) => {
  const go = useGo();

  // Component nhỏ này trigger điều hướng bằng hook go() trong effect (chạy một lần, giống "imperative redirect").
  React.useEffect(() => {
    go(config);
  }, [go, config]);

  return null;
};
