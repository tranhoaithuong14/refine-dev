// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN
// ============================================================================

// React context chứa cấu hình toàn cục được truyền bởi <Refine> (RefineProvider)
import { RefineContext } from "@contexts/refine";
import React from "react";

// ============================================================================
// PHẦN 2: HOOK USEREFINEOPTIONS
// ============================================================================

/**
 * 📚 HOOK USEREFINEOPTIONS
 *
 * 🎯 MỤC TIÊU:
 * - Lấy ra object `options` từ RefineContext. Đây là cấu hình toàn cục cho app Refine.
 * - Các option phổ biến: redirect, mutationMode, syncWithLocation, warnWhenUnsavedChanges, liveMode,...
 *
 * 💡 CÁCH HOẠT ĐỘNG:
 * - Dùng React.useContext(RefineContext) để truy cập context.
 * - Destructuring lấy field `options`.
 * - Trả về options để các hook/ component khác dùng.
 *
 * @returns IRefineContextOptions (object cấu hình)
 *
 * 📖 React Context 101:
 * - Context cho phép chia sẻ dữ liệu global (theme, user, config) mà không cần truyền props xuyên suốt.
 * - useContext(Context) sẽ lấy giá trị gần nhất từ Provider bao quanh component.
 */
export const useRefineOptions = () => {
  // Lấy object options từ RefineContext
  const { options } = React.useContext(RefineContext);

  // Trả về options để dùng trong hook khác (vd: useForm, useCreate,...)
  return options;
};

// ============================================================================
// 🎉 TÓM TẮT NHANH
// ============================================================================
// - useRefineOptions: đọc cấu hình global từ RefineContext.
// - Sử dụng React.useContext để truy cập Provider.
// - Dùng khi cần các giá trị như redirect, mutationMode, syncWithLocation,...
