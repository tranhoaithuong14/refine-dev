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
// - unknown: kiểu “an toàn” nhất trong TS, buộc bạn kiểm tra/convert trước khi dùng. Ở đây params: unknown vì người dùng tự quyết định shape.
// - Promise: đối tượng đại diện cho giá trị bất đồng bộ. Promise.resolve(x) chuẩn hóa x thành Promise; Promise.reject(err) trả về Promise ở trạng thái rejected.
//   * Ví dụ rejected: Promise.reject(new Error("Bad")); // có state "rejected" + reason = Error("Bad"). Khi await sẽ throw error này.
// - as: type assertion (ép kiểu) cho TS biết giá trị phù hợp type mong đợi, không đổi runtime.
//   * "signature" = dạng hàm/kiểu tham số + kiểu trả về. VD: type LoginSig = (p: LoginParams) => Promise<void>.
//   * Ví dụ: const f = (x: unknown) => x; const g = f as (x: number) => number; // nói với TS rằng f tuân thủ chữ ký (signature) đó.
// - optional chaining (?.): gọi hàm/đọc property nếu tồn tại, nếu không sẽ trả undefined thay vì throw.
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
// - Partial<IAuthContext>: Utility type của TypeScript biến T thành tất cả optional.
//   Tức là các hàm login/logout/check... có thể có hoặc không, tránh TS báo lỗi.
// - IAuthContext: interface định nghĩa hợp đồng auth của Refine (login, logout, check,
//   register, forgotPassword, updatePassword, isProvided). Xem ./types.ts để biết chi tiết.
//   Ví dụ tối giản IAuthContext: {
//     login: (params) => Promise.resolve(),
//     logout: () => Promise.resolve(),
//     check: () => Promise.resolve({ authenticated: true }),
//     isProvided: true
//   }
// ----------------------------------------------------------------------------
export const AuthProviderContext = React.createContext<Partial<IAuthContext>>(
  {},
);

// ----------------------------------------------------------------------------
// 🏗️ AuthProviderContextProvider - “anten” phát auth provider xuống cây con
// - Props: toàn bộ IAuthContext + children (nhờ PropsWithChildren).
// - isProvided: flag cho biết app đã cấu hình auth provider hay chưa.
//   + Nếu isProvided=false, Refine hiểu chưa có auth provider → có thể bỏ qua auth hooks.
// - Vì sao dùng cả PropsWithChildren lẫn React.FC?
//   * React.FC tự động cho phép prop children?: ReactNode.
//   * PropsWithChildren<IAuthContext> cũng thêm children vào IAuthContext.
//   * Dùng kết hợp để đảm bảo TypeScript hiểu rõ children tồn tại, dù một trong hai đã đủ; cách này thiên về “tường minh” cho người đọc mới.
// - Vì sao chỉ cung cấp các method này (login/logout/check/register/forgotPassword/updatePassword/isProvided)?
//   * Đây là hợp đồng tối thiểu Refine cần để giải quyết 3 nhóm nghiệp vụ:
//     1) Phiên đăng nhập: login, logout, register (tạo tài khoản mới).
//     2) Kiểm tra trạng thái: check (xác định authenticated & hướng xử lý), isProvided (cờ bật/tắt auth).
//     3) Quên/đổi mật khẩu: forgotPassword, updatePassword.
//   * Các phương thức khác (getPermissions, getIdentity, onError, ...) nằm trong IAuthContext (types.ts) và được spread từ authProvider.
//     Provider này không ghi đè chúng vì không cần bọc try/catch bổ sung — chúng đã optional và được giữ nguyên nếu có.
//   * Hữu hạn để tránh buộc người dùng phải implement nhiều hàm không cần thiết; các hook khác của Refine chỉ gọi những hàm này cho luồng auth mặc định.
// ----------------------------------------------------------------------------
export const AuthProviderContextProvider: React.FC<
  PropsWithChildren<IAuthContext>
> = ({ children, isProvided, ...authProvider }) => {
  // Mỗi handler bọc hàm gốc để:
  // - try/catch: log cảnh báo nếu provider ném lỗi không được xử lý.
  // - luôn trả Promise.resolve/reject rõ ràng (Refine kỳ vọng Promise).
  // - chấp nhận params: unknown (do người dùng định nghĩa).
  // - Nếu authProvider không implement method đó, dấu ? sẽ bỏ qua (optional chaining).

  const handleLogin = async (params: unknown) => {
    try {
      const result = await authProvider.login?.(params);

      return result;
    } catch (error) {
      console.warn(
        "Unhandled Error in login: refine always expects a resolved promise.",
        error,
      );
      // Promise.reject: tạo Promise ở trạng thái "rejected", thuộc tính quan trọng: [[PromiseState]]="rejected", [[PromiseResult]]=error.
      // Khi caller await, error sẽ bị throw; khi caller .catch, error sẽ được truyền vào callback catch.
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
      return Promise.reject(error); // Chuẩn hóa thành Promise rejected với reason=error (thường là Error instance).
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
      return Promise.reject(error); // rejected Promise; await sẽ throw, .catch sẽ nhận error.
    }
  };

  // --- Lý do dùng Promise.resolve ở check/forgotPassword/updatePassword ---
  // Một số provider có thể trả về giá trị non-promise; Promise.resolve(result) giúp
  // chuẩn hóa thành Promise, giữ API ổn định cho toàn bộ hook Refine.

  const handleCheck = async (params: unknown) => {
    try {
      const result = await authProvider.check?.(params);

      return Promise.resolve(result); // Promise.resolve: đảm bảo trả Promise kể cả khi provider trả sync value.
    } catch (error) {
      console.warn(
        "Unhandled Error in check: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error); // rejected Promise với reason=error.
    }
  };

  const handleForgotPassword = async (params: unknown) => {
    try {
      const result = await authProvider.forgotPassword?.(params);

      return Promise.resolve(result); // Chuẩn hóa thành Promise resolved.
    } catch (error) {
      console.warn(
        "Unhandled Error in forgotPassword: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error); // reason=error.
    }
  };

  const handleUpdatePassword = async (params: unknown) => {
    try {
      const result = await authProvider.updatePassword?.(params);
      return Promise.resolve(result); // Chuẩn hóa: luôn Promise.
    } catch (error) {
      console.warn(
        "Unhandled Error in updatePassword: refine always expects a resolved promise.",
        error,
      );
      return Promise.reject(error); // reason=error.
    }
  };

  return (
    <AuthProviderContext.Provider
      value={{
        ...authProvider,
        // Ghi đè các method bằng version đã bọc try/catch để an toàn hơn
        // "as" ép kiểu cho TS hiểu đúng "chữ ký" hàm (tham số + kiểu trả về) trùng với IAuthContext.
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
// - Ví dụ dùng:
//   const Profile = () => {
//     const { check, logout } = useAuthProviderContext();
//     React.useEffect(() => { check?.(); }, [check]);
//     return <button onClick={() => logout?.()}>Thoát</button>;
//   };
// ----------------------------------------------------------------------------
export const useAuthProviderContext = () => {
  const context = React.useContext(AuthProviderContext);

  return context;
};
