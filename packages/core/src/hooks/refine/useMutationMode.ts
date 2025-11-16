// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ KIỂU DỮ LIỆU
// ============================================================================

// useContext: React hook để lấy dữ liệu từ Context (RefineContext)
import { useContext } from "react";

// Context chứa cấu hình toàn cục của Refine (mutationMode, undoableTimeout, v.v.)
import { RefineContext } from "@contexts/refine";

// Type của options trong RefineContext (dùng để lấy kiểu trả về chuẩn)
import type { IRefineContextOptions } from "../../contexts/refine/types";

// MutationMode là union type: "pessimistic" | "optimistic" | "undoable"
import type { MutationMode } from "../../contexts/data/types";

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA TYPE CHO HOOK USEMUTATIONMODE
// ============================================================================

/**
 * UseMutationModeType mô tả kiểu của hook:
 * - Nhận vào optional preferredMutationMode và preferredUndoableTimeout (có thể được truyền để override)
 * - Trả về object có 2 field: mutationMode, undoableTimeout
 *
 * 📖 TypeScript: Kiểu hàm (Function Type)
 * (param1?: Type, param2?: Type) => ReturnType
 */
type UseMutationModeType = (
  preferredMutationMode?: MutationMode,
  preferredUndoableTimeout?: number,
) => {
  mutationMode: IRefineContextOptions["mutationMode"];
  undoableTimeout: IRefineContextOptions["undoableTimeout"];
};

// ============================================================================
// PHẦN 3: GIỚI THIỆU VỀ MUTATION MODE (CHO NGƯỜI MỚI)
// ============================================================================

/**
 * 📚 Mutation Mode là gì?
 * Đây là "chiến lược" ứng xử của UI khi bạn chạy mutations (create/update/delete).
 *
 * Có 3 chế độ:
 * - pessimistic: UI CHỜ server phản hồi mới cập nhật (an toàn nhưng cảm giác chậm)
 * - optimistic: UI cập nhật NGAY lập tức, nếu server lỗi thì rollback (trải nghiệm nhanh)
 * - undoable: UI cập nhật ngay và cho phép user UNDO trong vài giây (trung hòa trải nghiệm)
 *
 * Hook này giúp:
 * - Lấy mutationMode & undoableTimeout từ RefineContext (cấu hình global)
 * - Cho phép override bằng tham số preferredMutationMode / preferredUndoableTimeout
 *
 * @see {@link https://refine.dev/docs/guides-and-concepts/mutation-mode}
 */
export const useMutationMode: UseMutationModeType = (
  preferredMutationMode?: MutationMode,
  preferredUndoableTimeout?: number,
) => {
  // Lấy giá trị mặc định từ Context (được cung cấp ở RefineProvider)
  const { mutationMode, undoableTimeout } = useContext(RefineContext);

  /**
   * 📖 Toán tử Nullish Coalescing (??):
   * preferredMutationMode ?? mutationMode
   * - Nếu preferredMutationMode khác null/undefined => dùng nó (override)
   * - Nếu không => dùng giá trị mặc định từ context
   *
   * Tương tự với undoableTimeout.
   */
  return {
    mutationMode: preferredMutationMode ?? mutationMode,
    undoableTimeout: preferredUndoableTimeout ?? undoableTimeout,
  };
};

// ============================================================================
// 🎉 TÓM TẮT NHANH
// ============================================================================
// - Hook lấy mutationMode & undoableTimeout từ RefineContext, có thể override bằng tham số.
// - MutationMode có 3 kiểu: pessimistic | optimistic | undoable.
// - Dùng nullish coalescing (??) để chọn giá trị ưu tiên (tham số > context).
