// ============================================================================
// PHẦN 1: IMPORT CÁC HOOKS
// ============================================================================
import { useDataProvider, useResourceParams } from "@hooks";

// ============================================================================
// PHẦN 2: KHAI BÁO HOOK USEAPIURL
// ============================================================================

/**
 * 📚 GIẢI THÍCH CHO NGƯỜI MỚI:
 *
 * Hook này giúp bạn lấy URL của API từ Data Provider.
 *
 * Data Provider là nơi cấu hình cách ứng dụng giao tiếp với API (backend).
 * Mỗi Data Provider sẽ có một hàm `getApiUrl` để trả về base URL của API.
 *
 * Hook này hữu ích khi bạn cần biết URL gốc của API để thực hiện các request thủ công
 * hoặc hiển thị thông tin.
 *
 * @param dataProviderName - Tên của Data Provider (nếu bạn dùng nhiều Data Provider)
 * @returns string - URL của API
 */
export const useApiUrl = (dataProviderName?: string): string => {
  // ============================================================================
  // PHẦN 3: LẤY DATA PROVIDER VÀ RESOURCE
  // ============================================================================

  // Lấy hàm để truy cập các Data Provider đã đăng ký
  const dataProvider = useDataProvider();

  // Lấy thông tin resource hiện tại từ URL hoặc context
  const { resource } = useResourceParams();

  // ============================================================================
  // PHẦN 4: LẤY API URL
  // ============================================================================

  // Lấy hàm getApiUrl từ Data Provider cụ thể
  // Ưu tiên:
  // 1. dataProviderName truyền vào hook
  // 2. dataProviderName được định nghĩa trong meta của resource
  // 3. Data Provider mặc định (nếu không có 2 cái trên)
  const { getApiUrl } = dataProvider(
    dataProviderName ?? resource?.meta?.dataProviderName,
  );

  // Gọi hàm và trả về URL
  return getApiUrl();
};
