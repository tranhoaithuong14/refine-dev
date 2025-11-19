// ============================================================================
// 📚 ACCESS CONTROL CONTEXT - GIẢI THÍCH CHO NGƯỜI MỚI
// ============================================================================
//
// File này định nghĩa một "kênh phát sóng" quyền hạn (Access Control) cho toàn bộ app.
// Context = cách React cho phép chuyền dữ liệu xuống sâu mà không phải truyền props qua từng component.
// Người dùng refine có thể đăng ký logic kiểm tra quyền (user được phép xem, tạo, sửa, xóa).
// Context này sẽ lưu các hàm, options cần thiết để mọi nút, trang có thể hỏi: "user được làm hành động này không?"
//
// Các comment dưới đây sẽ giải thích từng khái niệm.

import React, { type PropsWithChildren } from "react";
// import React: cần để dùng createContext, JSX (<Provider>...</Provider>), v.v.
// PropsWithChildren là utility của React/TypeScript: nó thêm prop "children" (các element con)
// vào kiểu props bạn truyền vào. Nghĩa là component sẽ có sẵn children mà không phải tự định nghĩa.

// import type: chỉ import "type" (chỉ dùng cho kiểm tra type, không ảnh hưởng bundle runtime).
// Điều này giúp tree-shaking tốt hơn và tránh import thực thi không cần thiết.
import type {
  IAccessControlContext,
  IAccessControlContextReturnType,
} from "./types";
// IAccessControlContext: suy luận dựa vào code => có thể chứa { can, options }.
// IAccessControlContextReturnType: type của giá trị context cung cấp cho consumer.
// Dù chưa mở file types.ts, ta đoán: can = hàm check quyền, options = config (buttons, queryOptions...).

// ----------------------------------------------------------------------------
// createContext: tạo ra Context object.
// Generic <IAccessControlContextReturnType> nói với TypeScript "giá trị context sẽ có hình dạng như type này".
// Chúng ta cung cấp "default value" (fallback) cho trường hợp component không nằm trong Provider.
// Ở đây default value chỉ có options.buttons (enableAccessControl + hideIfUnauthorized).
// ----------------------------------------------------------------------------
export const AccessControlContext =
  React.createContext<IAccessControlContextReturnType>({
    options: {
      buttons: { enableAccessControl: true, hideIfUnauthorized: false },
    },
  });

// ----------------------------------------------------------------------------
// AccessControlContextProvider: Component bọc app để cung cấp giá trị context cho cây con.
// React.FC<Props> = Function Component.
// PropsWithChildren<IAccessControlContext> nghĩa là:
//   - Props gốc: IAccessControlContext (suy luận: có can, options, v.v.)
//   - Tự động thêm props.children (JSX con) nhờ PropsWithChildren.
// Khi render <AccessControlContextProvider>...</AccessControlContextProvider>,
// mọi component con có thể truy cập context bằng useContext(AccessControlContext).
// ----------------------------------------------------------------------------
export const AccessControlContextProvider: React.FC<
  PropsWithChildren<IAccessControlContext>
> = ({ can, children, options }) => {
  // Destructuring props: thay vì props.can, props.children, props.options,
  // ta tách trực tiếp trong tham số. Đây chỉ là cú pháp JS/TS tiện lợi.

  return (
    // Context.Provider là "anten" phát sóng giá trị context.
    // value={...} = dữ liệu mà các component con nhận được khi gọi useContext.
    <AccessControlContext.Provider
      value={{
        can,
        // can: suy luận là hàm kiểm tra quyền, ví dụ can({ resource: "posts", action: "edit" }).
        // object options: đoạn logic dưới đảm bảo dù options có truyền hay không,
        // ta luôn có cấu trúc buttons + queryOptions đúng chuẩn và giá trị mặc định an toàn.
        options: options
          ? {
              // Nếu người dùng truyền options: dùng spread để copy mọi field.
              ...options,
              buttons: {
                // Ép enableAccessControl luôn true: có nghĩa là hệ thống access control được bật.
                // (Người dùng có thể tắt? Ở đây ta đảm bảo provider cấp ra true để tránh nút bỏ qua check.)
                enableAccessControl: true,
                // hideIfUnauthorized=false => mặc định không ẩn button khi user không có quyền,
                // thay vào đó có thể disable hoặc hiển thị message. Người dùng có thể override bằng options.buttons.
                hideIfUnauthorized: false,
                // ...options.buttons: nếu user truyền { hideIfUnauthorized: true } sẽ override giá trị trên.
                ...options.buttons,
              },
            }
          : {
              // Nếu options không được truyền: cung cấp default object.
              buttons: {
                enableAccessControl: true,
                hideIfUnauthorized: false,
              },
              // queryOptions: undefined → Placeholder cho các config fetch quyền (nếu có).
              // Giữ undefined để consumer biết "chưa cấu hình".
              queryOptions: undefined,
            },
      }}
    >
      {
        // children: tất cả element con bọc bên trong Provider.
        // React sẽ render {children} ở đây để component của bạn hiển thị ra UI.
        // Ví dụ:
        // <AccessControlContextProvider ...>
        //   <App />  // Đây chính là children.
        // </AccessControlContextProvider>
      }
      {children}
    </AccessControlContext.Provider>
  );
};
