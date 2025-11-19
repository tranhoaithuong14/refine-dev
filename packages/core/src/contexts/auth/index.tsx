// ============================================================================
// 🔐 AUTH CONTEXT PROVIDER - HƯỚNG DẪN CHO NGƯỜI MỚI
// ============================================================================
//
// 🧭 Bối cảnh:
// - Đây là nơi Refine phát sóng auth provider (login/logout/check...) cho toàn app bằng React Context.
// - Tương tự DataContext ở data layer, nhưng dành riêng cho xác thực người dùng.
//
// 👶 Nhắc nhanh React/TypeScript:
// - React Context = kênh chia sẻ giá trị toàn cục; Provider = “anten” phát sóng giá trị xuống cây con.
// - PropsWithChildren<T> = thêm sẵn prop "children" cho kiểu props T.
// - React.FC<Props> = Function Component, nhận props kiểu Props và tự thêm children.
// - JSX = cú pháp HTML trong JS, ví dụ: <AuthProviderContext.Provider value={...}>{children}</AuthProviderContext.Provider>
//
// 🎯 Business logic & lý do thiết kế:
// - Auth provider là “cấu hình” ít thay đổi (các hàm login/logout/check...). Context phù hợp vì phát 1 lần, hook khác dễ truy cập.
// - Handler (handleLogin...) bọc authProvider.* để luôn trả về Promise resolved/rejected có kiểm soát, tránh error rơi tự do.
// - Nếu có nhiều subtree cần auth provider khác, có thể lồng thêm Provider và truyền authProvider khác.
// - So với truyền props xuống từng component, Context ngắn gọn hơn; so với global singleton, Context dễ test và override theo scope.
// - Phù hợp vì auth provider thay đổi hiếm khi/ có chủ đích (VD: chuyển sang chế độ demo/guest). Nếu thay đổi liên tục,
//   bạn có thể bọc subtree khác bằng Provider mới; Context không phù hợp cho giá trị đổi mỗi render.
//
// 🔗 Tài liệu: https://react.dev/reference/react/useContext

import React, { type PropsWithChildren } from "react";

import type { IAuthContext } from "./types";

// ----------------------------------------------------------------------------
// 📡 AuthProviderContext - Context chia sẻ Partial<IAuthContext>
// - Partial<IAuthContext>: cho phép thiếu một số method (optional) thay vì bắt buộc đủ.
// ----------------------------------------------------------------------------
export const AuthProviderContext = React.createContext<Partial<IAuthContext>>(
  {},
);

// ----------------------------------------------------------------------------
// 🏗️ AuthProviderContextProvider - “anten” phát auth provider xuống cây con
// - Props: toàn bộ IAuthContext + children (nhờ PropsWithChildren).
// - isProvided: flag cho biết app đã cấu hình auth provider hay chưa.
// ----------------------------------------------------------------------------
export const AuthProviderContextProvider: React.FC<
  PropsWithChildren<IAuthContext>
> = ({ children, isProvided, ...authProvider }) => {
  // Mỗi handler bọc hàm gốc để:
  // - try/catch: log cảnh báo nếu provider ném lỗi không được xử lý.
  // - luôn trả Promise.resolve/reject rõ ràng (Refine kỳ vọng Promise).
  // - chấp nhận params: unknown (do người dùng định nghĩa).

  const handleLogin = async (params: unknown) => {
    try {
      const result = await authProvider.login?.(params);

      return result;
    } catch (error) {
      console.warn(
        "Unhandled Error in login: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error);
    }
  };

  const handleRegister = async (params: unknown) => {
    try {
      const result = await authProvider.register?.(params);

      return result;
    } catch (error) {
      console.warn(
        "Unhandled Error in register: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error);
    }
  };

  const handleLogout = async (params: unknown) => {
    try {
      const result = await authProvider.logout?.(params);

      return result;
    } catch (error) {
      console.warn(
        "Unhandled Error in logout: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error);
    }
  };

  const handleCheck = async (params: unknown) => {
    try {
      const result = await authProvider.check?.(params);

      return Promise.resolve(result);
    } catch (error) {
      console.warn(
        "Unhandled Error in check: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error);
    }
  };

  const handleForgotPassword = async (params: unknown) => {
    try {
      const result = await authProvider.forgotPassword?.(params);

      return Promise.resolve(result);
    } catch (error) {
      console.warn(
        "Unhandled Error in forgotPassword: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error);
    }
  };

  const handleUpdatePassword = async (params: unknown) => {
    try {
      const result = await authProvider.updatePassword?.(params);
      return Promise.resolve(result);
    } catch (error) {
      console.warn(
        "Unhandled Error in updatePassword: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error);
    }
  };

  return (
    <AuthProviderContext.Provider
      value={{
        ...authProvider,
        // Ghi đè các method bằng version đã bọc try/catch để an toàn hơn
        login: handleLogin as IAuthContext["login"],
        logout: handleLogout as IAuthContext["logout"],
        check: handleCheck as IAuthContext["check"],
        register: handleRegister as IAuthContext["register"],
        forgotPassword: handleForgotPassword as IAuthContext["forgotPassword"],
        updatePassword: handleUpdatePassword as IAuthContext["updatePassword"],
        isProvided,
      }}
    >
      {children}
    </AuthProviderContext.Provider>
  );
};

// ----------------------------------------------------------------------------
// 🎣 useAuthProviderContext - Hook tiện lợi để đọc Context
// - Dùng trong component/hook khác: const auth = useAuthProviderContext();
// - Nếu ngoài Provider, giá trị rỗng {} (vì default trong createContext).
// ----------------------------------------------------------------------------
export const useAuthProviderContext = () => {
  const context = React.useContext(AuthProviderContext);

  return context;
};
