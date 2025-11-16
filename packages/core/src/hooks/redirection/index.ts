// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ HOOK
// ============================================================================

import { useCallback } from "react";

// Hook điều hướng của Refine: cung cấp hàm show, edit, list, create
import { useNavigation } from "@hooks";

// ========================================================================
// PHẦN 2: IMPORT TYPES (TYPESCRIPT)
// ========================================================================

import type { BaseKey, MetaQuery } from "../../contexts/data/types";
import type { IResourceItem } from "../../contexts/resource/types";
import type { RedirectAction } from "../form/types";

// ========================================================================
// PHẦN 3: TYPE CHO HOOK USREDIRECTIONAFTERSUBMISSION
// ========================================================================

export type UseRedirectionAfterSubmissionType = () => (options: {
  redirect: RedirectAction; // "show" | "edit" | "list" | "create" | false
  resource?: IResourceItem; // Resource hiện tại (tên + metadata route)
  id?: BaseKey; // ID record (cần cho show/edit)
  meta?: MetaQuery; // Metadata gửi kèm khi điều hướng
}) => void;

// ========================================================================
// PHẦN 4: HOOK USREDIRECTIONAFTERSUBMISSION
// ========================================================================

/**
 * 📚 useRedirectionAfterSubmission
 *
 * 🎯 Mục tiêu:
 * - Sau khi submit form (create/edit/clone), xác định trang cần chuyển tới.
 * - Dựa trên action redirect (show/edit/list/create/false) và resource hiện tại.
 *
 * 🔄 Cách hoạt động:
 * 1. Lấy hàm điều hướng (show, edit, list, create) từ useNavigation.
 * 2. Trả về hàm handleSubmitWithRedirect nhận { redirect, resource, id, meta }.
 * 3. Tùy theo redirect:
 *    - "show": chuyển tới trang chi tiết (cần id và resource.show phải tồn tại)
 *    - "edit": chuyển tới trang edit (cần id và resource.edit)
 *    - "create": mở trang create nếu resource hỗ trợ create
 *    - default/list: quay về list
 *    - false: không làm gì (return undefined)
 *
 * 💡 Lưu ý:
 * - resource.show/edit/create được check để chắc chắn resource có route tương ứng.
 * - meta được forward vào navigation để giữ query params/metadata khi cần.
 */
export const useRedirectionAfterSubmission: UseRedirectionAfterSubmissionType =
  () => {
    // Lấy các hàm điều hướng (đã được Refine cấu hình sẵn)
    const { show, edit, list, create } = useNavigation();

    // useCallback để tránh tạo mới hàm ở mỗi render
    const handleSubmitWithRedirect = useCallback(
      ({
        redirect,
        resource,
        id,
        meta = {},
      }: {
        redirect: RedirectAction;
        resource?: IResourceItem;
        id?: BaseKey;
        meta?: MetaQuery;
      }) => {
        // Nếu redirect=false hoặc không có resource => không điều hướng
        if (redirect && resource) {
          // Đi tới trang show (chi tiết) nếu resource hỗ trợ show và có id
          if (!!resource.show && redirect === "show" && id) {
            return show(resource, id, undefined, meta);
          }

          // Đi tới trang edit nếu resource hỗ trợ edit và có id
          if (!!resource.edit && redirect === "edit" && id) {
            return edit(resource, id, undefined, meta);
          }

          // Đi tới trang create nếu resource hỗ trợ create
          if (!!resource.create && redirect === "create") {
            return create(resource, undefined, meta);
          }

          // Mặc định quay về list
          return list(resource, "push", meta);
        }
        return;
      },
      [],
    );

    // Trả về hàm để dùng sau khi submit
    return handleSubmitWithRedirect;
  };

// ============================================================================
// 🎉 TÓM TẮT NHANH
// ============================================================================
// - Hook trả về hàm điều hướng sau submit dựa trên redirect action.
// - Ưu tiên show/edit/create nếu resource hỗ trợ; mặc định quay về list.
// - Cho phép kèm meta để giữ context khi điều hướng.
