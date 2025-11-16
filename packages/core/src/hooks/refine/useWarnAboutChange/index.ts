// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ TYPES
// ============================================================================

import { useContext } from "react";

// Context toàn cục của Refine: chứa cấu hình warnWhenUnsavedChanges
import { RefineContext } from "@contexts/refine";
// Context chuyên cho tính năng cảnh báo "chưa lưu"
import { UnsavedWarnContext } from "@contexts/unsavedWarn";

// TypeScript types cho 2 context trên
import type { IRefineContextOptions } from "../../../contexts/refine/types";
import type { IUnsavedWarnContext } from "../../../contexts/unsavedWarn/types";

// ============================================================================
// PHẦN 2: KIỂU TRẢ VỀ CỦA HOOK
// ============================================================================

type UseWarnAboutChangeType = () => {
  // Giá trị cấu hình global: bật/tắt cảnh báo chưa lưu
  warnWhenUnsavedChanges: IRefineContextOptions["warnWhenUnsavedChanges"];
  // Cờ hiện tại: có đang bật cảnh báo hay không (Boolean)
  warnWhen: NonNullable<IUnsavedWarnContext["warnWhen"]>;
  // Hàm bật/tắt cảnh báo
  setWarnWhen: NonNullable<IUnsavedWarnContext["setWarnWhen"]>;
};

// ============================================================================
// PHẦN 3: HOOK USEWARNABOUTCHANGE
// ============================================================================

/**
 * 📚 useWarnAboutChange
 *
 * 🎯 Mục tiêu:
 * - Quản lý cảnh báo "Bạn có thay đổi chưa lưu, có chắc muốn rời đi?"
 * - Kết hợp cấu hình global (warnWhenUnsavedChanges) và state runtime (warnWhen).
 *
 * 🔄 Hoạt động:
 * 1. Lấy cấu hình warnWhenUnsavedChanges từ RefineContext (do <Refine> cung cấp).
 * 2. Lấy state warnWhen và setter setWarnWhen từ UnsavedWarnContext.
 * 3. Trả về object để component/hook khác bật/tắt cảnh báo.
 *
 * 💡 Sử dụng:
 * - Gọi setWarnWhen(true) sau khi người dùng chỉnh sửa form.
 * - Gọi setWarnWhen(false) sau khi lưu thành công hoặc bỏ thay đổi.
 *
 * @see {@link https://refine.dev/docs/api-reference/core/components/refine-config#warnwhenunsavedchanges}
 */
export const useWarnAboutChange: UseWarnAboutChangeType = () => {
  const { warnWhenUnsavedChanges } = useContext(RefineContext);

  const { warnWhen, setWarnWhen } = useContext(UnsavedWarnContext);

  return {
    warnWhenUnsavedChanges,
    warnWhen: Boolean(warnWhen), // Ép về boolean để tránh undefined/null
    setWarnWhen: setWarnWhen ?? (() => undefined), // Fallback no-op nếu context chưa cung cấp
  };
};

// ============================================================================
// 🎉 TÓM TẮT NHANH
// ============================================================================
// - Lấy cấu hình warnWhenUnsavedChanges từ RefineContext.
// - Lấy state + setter từ UnsavedWarnContext để bật/tắt cảnh báo runtime.
// - Dùng setWarnWhen(true) khi form bị chỉnh sửa, setWarnWhen(false) sau khi đã lưu.
