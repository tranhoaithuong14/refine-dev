// ============================================================================
// 📚 ACCESS CONTROL TYPES - GIẢI THÍCH CHO NGƯỜI MỚI
// ============================================================================
//
// File này mô tả toàn bộ type liên quan đến access control trong refine.
// TypeScript cho phép ta định nghĩa “hình dạng dữ liệu” (giống bản thiết kế).
// Khi mọi thành phần dùng chung các type này, chúng ta tránh sai sót và có autocomplete tốt hơn.

import type { UseQueryOptions } from "@tanstack/react-query";
// UseQueryOptions: cấu hình cho hook useQuery (TanStack Query) – dùng để fetch quyền từ server.

import type { BaseKey } from "../data/types";
import type { IResourceItem } from "../resource/types";
import type { MakeOptional } from "../../definitions/types/index";
// MakeOptional<T, K>: utility biến các field K trong T thành optional (không bắt buộc).

// ----------------------------------------------------------------------------
// ITreeResource: mở rộng IResourceItem với cấu trúc cây (children)
// ----------------------------------------------------------------------------
type ITreeResource = IResourceItem & {
  key?: string;
  children: ITreeResource[];
};

// ----------------------------------------------------------------------------
// CanResponse: format thực tế mà backend trả về (có thể chứa field tùy chỉnh)
// ----------------------------------------------------------------------------
export type CanResponse = {
  can: boolean;
  reason?: string;
  [key: string]: unknown;
  // [key: string]: unknown cho phép backend trả thêm metadata (ví dụ: requiredRole: "admin")
};

// ----------------------------------------------------------------------------
// CanParams: tham số gửi vào hàm can(). Người dùng truyền resource/action/params
// ----------------------------------------------------------------------------
export type CanParams = {
  /**
   * Resource name for API data interactions
   */
  resource?: string;
  /**
   * Intended action on resource
   */
  action: string;
  /**
   * Parameters associated with the resource
   * @type {
   *   resource?: [IResourceItem](https://refine.dev/docs/api-reference/core/interfaceReferences/#canparams),
   *   id?: [BaseKey](https://refine.dev/docs/api-reference/core/interfaceReferences/#basekey), [key: string]: any
   * }
   */
  params?: {
    resource?: IResourceItem & { children?: ITreeResource[] };
    id?: BaseKey;
    [key: string]: any;
  };
};

// ----------------------------------------------------------------------------
// CanReturnType: kết quả chuẩn hoá mà refine mong đợi từ can()
// ----------------------------------------------------------------------------
export type CanReturnType = {
  can: boolean;
  reason?: string;
};

// ----------------------------------------------------------------------------
// CanFunction: chữ ký của hàm kiểm tra quyền.
// - Nhận CanParams
// - Trả Promise<CanReturnType>
// ----------------------------------------------------------------------------
export type CanFunction = ({
  resource,
  action,
  params,
}: CanParams) => Promise<CanReturnType>;

// ----------------------------------------------------------------------------
// AccessControlOptions: cấu hình bổ sung cho context
// - buttons: config UI (enableAccessControl, hideIfUnauthorized)
// - queryOptions: cấu hình useQuery khi fetch quyền (được MakeOptional bỏ queryFn/queryKey)
// ----------------------------------------------------------------------------
type AccessControlOptions = {
  buttons?: {
    enableAccessControl?: boolean;
    hideIfUnauthorized?: boolean;
  };
  queryOptions?: MakeOptional<
    UseQueryOptions<CanReturnType>,
    "queryFn" | "queryKey"
  >;
};

// ----------------------------------------------------------------------------
// IAccessControlContext: props mà Provider nhận vào (hàm can + options)
// ----------------------------------------------------------------------------
export interface IAccessControlContext {
  can?: CanFunction;
  options?: AccessControlOptions;
}

// ----------------------------------------------------------------------------
// IAccessControlContextReturnType: giá trị mà context phát ra cho consumer
// - can?: CanFunction
// - options: buttons (bắt buộc có enable/hide), queryOptions optional
// ----------------------------------------------------------------------------
export type IAccessControlContextReturnType = {
  can?: CanFunction;
  options: {
    buttons: {
      enableAccessControl: boolean;
      hideIfUnauthorized: boolean;
    };
    queryOptions?: MakeOptional<
      UseQueryOptions<CanReturnType>,
      "queryFn" | "queryKey"
    >;
  };
};

// ----------------------------------------------------------------------------
// AccessControlProvider: interface cho các provider tùy chỉnh (cấu hình ban đầu)
// ----------------------------------------------------------------------------
export type AccessControlProvider = {
  can: CanFunction;
  options?: AccessControlOptions;
};
