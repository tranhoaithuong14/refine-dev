// ============================================================================
// 📚 DATA CONTEXT PROVIDER - HƯỚNG DẪN CHO NGƯỜI MỚI
// ============================================================================
//
// 🧭 Bối cảnh:
// - Đây là nơi Refine "chia sẻ" data provider (cách kết nối backend) cho toàn app.
// - Dùng React Context để truyền data provider xuống mọi component mà không cần props.
//
// 👶 Dành cho người mới React/TypeScript:
// - React = thư viện UI. Component là hàm trả về JSX (HTML trong JS).
//   Ví dụ:
//     const Button: React.FC<{ label: string }> = ({ label }) => <button>{label}</button>;
//     // Dùng: <Button label="Lưu" />
// - React Context = "kênh phát sóng" giá trị toàn cục (ở đây là data provider).
//   Ví dụ mini:
//     const CountContext = React.createContext(0);
//     const App = () => (
//       <CountContext.Provider value={5}>
//         <Child />  // Child gọi useContext(CountContext) sẽ nhận 5
//       </CountContext.Provider>
//     );
// - Provider = "anten" phát sóng giá trị cho cây component con.
// - PropsWithChildren = kiểu React thêm thuộc tính "children" (nội dung con) vào props.
//   Ví dụ: type CardProps = PropsWithChildren<{ title: string }>;
// - Generic <T> trong TypeScript = "biến kiểu" (chi tiết xem types.ts trong hooks/form).
//   Ví dụ: function wrap<T>(value: T): T[] { return [value]; }
//
// 🌐 Business logic:
// - Nếu bạn truyền 1 data provider duy nhất (có các method getList, getOne,...), mã sẽ tự
//   bọc nó thành dạng { default: provider }.
// - Nếu bạn truyền nhiều provider (object có key "default" + các key khác), mã dùng trực tiếp.
// - Giá trị này được đưa vào React Context để các hook khác (useList, useOne,...) sử dụng.
//
// 🔗 Tài liệu tham khảo:
// - React Context: https://react.dev/reference/react/useContext
// - Data Provider Refine: https://refine.dev/docs/data/data-provider

import React, { type PropsWithChildren } from "react";

import type { DataProvider, DataProviders, IDataContext } from "./types";

// 📥 Import React:
// - "React" được dùng để tạo context và JSX (thẻ <DataContext.Provider>).
// - "PropsWithChildren" là utility type thêm sẵn prop "children".
//   Ví dụ: type P = PropsWithChildren<{ title: string }>;
//   const Card: React.FC<P> = ({ title, children }) => <div>{title}{children}</div>;

// ----------------------------------------------------------------------------
// ✅ defaultDataProvider - Giá trị mặc định khi chưa truyền provider thực sự.
// - Chiều khóa: "default" để khớp với interface DataProviders.
// - {} as DataProvider: ép kiểu tạm thời (sẽ bị thay thế khi ứng dụng truyền provider thật).
// ----------------------------------------------------------------------------
export const defaultDataProvider: DataProviders = {
  default: {} as DataProvider,
};

// ----------------------------------------------------------------------------
// 📡 DataContext - React Context chứa DataProviders
// - createContext(defaultValue): Truyền giá trị mặc định nếu không có Provider.
// ----------------------------------------------------------------------------
export const DataContext =
  React.createContext<IDataContext>(defaultDataProvider);

// ----------------------------------------------------------------------------
// 🔌 Props type cho DataContextProvider
// - dataProvider?: có thể là 1 provider (DataProvider) hoặc nhiều (DataProviders).
// - PropsWithChildren: tự động thêm prop "children" (JSX con) cho component.
// ----------------------------------------------------------------------------
type Props = PropsWithChildren<{
  dataProvider?: DataProvider | DataProviders;
}>;

// ----------------------------------------------------------------------------
// 🏗️ DataContextProvider - Component bọc ứng dụng để cung cấp data provider
// - Dùng React.FC<Props>:
//   * React.FC = React Function Component (component dạng hàm).
//   * Tự thêm kiểu cho props, đồng thời đảm bảo component nhận "children".
//   * <Props> là Generic: truyền kiểu props đã định nghĩa ở trên.
// ----------------------------------------------------------------------------
export const DataContextProvider: React.FC<Props> = ({
  children,
  dataProvider,
}) => {
  // Bắt đầu với giá trị mặc định
  let providerValue = defaultDataProvider;

  // Nếu có truyền dataProvider:
  // - Trường hợp 1: Không có key "default" nhưng có các method CRUD → coi như 1 provider đơn.
  //   Ví dụ: dataProvider = { getList: ..., getOne: ... }
  //   → Chuyển thành { default: dataProvider }
  // - Trường hợp 2: Đã có key "default" (multi-provider) → dùng trực tiếp.
  if (dataProvider) {
    if (
      !("default" in dataProvider) &&
      ("getList" in dataProvider || "getOne" in dataProvider)
    ) {
      providerValue = {
        default: dataProvider,
      };
    } else {
      providerValue = dataProvider;
    }
  }

  // React component phải return JSX.
  // <DataContext.Provider> là "anten" phát sóng providerValue cho toàn bộ cây con.
  // {children} là nội dung con được render bên trong Provider.
  //
  // Ví dụ dùng trong ứng dụng:
  //   const myDataProvider: DataProvider = { getList: async () => {...}, getOne: async () => {...}, ... };
  //   const App = () => (
  //     <DataContextProvider dataProvider={myDataProvider}>
  //       <Page />   // Bên trong Page, gọi useContext(DataContext) hoặc các hook refine sẽ lấy được myDataProvider
  //     </DataContextProvider>
  //   );
  //
  // Nếu có nhiều provider:
  //   const providers: DataProviders = {
  //     default: restProvider,
  //     analytics: analyticsProvider,
  //   };
  //   <DataContextProvider dataProvider={providers}>...</DataContextProvider>
  return (
    <DataContext.Provider value={providerValue}>
      {children}
    </DataContext.Provider>
  );
};
