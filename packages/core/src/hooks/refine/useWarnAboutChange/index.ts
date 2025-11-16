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
  // Giá trị cấu hình global: bật/tắt cảnh báo chưa lưu (set ở <Refine warnWhenUnsavedChanges />)
  warnWhenUnsavedChanges: IRefineContextOptions["warnWhenUnsavedChanges"];
  // Cờ runtime: app hiện tại có đang bật cảnh báo không (Boolean)
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
 *    - Nếu false: app không dùng tính năng cảnh báo.
 * 2. Lấy state warnWhen + setter setWarnWhen từ UnsavedWarnContext.
 *    - warnWhen thường được bật khi user bắt đầu sửa form.
 *    - Tắt khi user lưu thành công hoặc reset form.
 * 3. Trả về object để component/hook khác bật/tắt cảnh báo.
 *
 * 💡 Sử dụng (pseudo-code):
 * ```ts
 * const { warnWhenUnsavedChanges, setWarnWhen } = useWarnAboutChange();
 * // Khi user sửa form:
 * setWarnWhen(warnWhenUnsavedChanges);
 * // Khi lưu thành công:
 * setWarnWhen(false);
 * ```
 *
 * 📖 TypeScript Notes:
 * - NonNullable<T>: loại bỏ null/undefined khỏi type, đảm bảo hàm/biến luôn tồn tại.
 * - Fallback `?? (() => undefined)`: nếu context chưa cung cấp setWarnWhen, trả về hàm no-op để tránh lỗi runtime.
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
// - Lấy cấu hình warnWhenUnsavedChanges từ RefineContext (bật/tắt toàn cục).
// - Lấy state + setter từ UnsavedWarnContext để bật/tắt cảnh báo runtime.
// - Dùng setWarnWhen(true) khi form bị chỉnh sửa, setWarnWhen(false) sau khi đã lưu.
