// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// Import hook để lấy meta context (ngữ cảnh metadata) từ Provider
// Context trong React là cách để chia sẻ dữ liệu giữa các component mà không cần truyền props
import { useMetaContext } from "@contexts/metaContext";

// Import hàm helper để "làm sạch" resource - loại bỏ các field không cần thiết
import { sanitizeResource } from "@definitions/helpers/sanitize-resource";

// Import hook để lấy thông tin đã parse (phân tích) từ URL
// VD: /posts?page=1&sort=name -> { params: { page: 1, sort: 'name' } }
import { useParsed } from "@hooks/router";

// ============================================================================
// PHẦN 2: IMPORT CÁC KIỂU DỮ LIỆU (TYPES)
// ============================================================================

// Import type cho MetaQuery - kiểu dữ liệu cho metadata query
import type { MetaQuery } from "../../contexts/data/types";

// Import type cho IResourceItem - kiểu dữ liệu cho 1 resource item
import type { IResourceItem } from "../../contexts/resource/types";

// ============================================================================
// PHẦN 3: KHAI BÁO HOOK USEMETA
// ============================================================================

/**
 * 📚 HOOK USEMETA - Lấy và kết hợp metadata từ nhiều nguồn
 *
 * 🎯 CHỨC NĂNG:
 * Hook này trả về một HÀM để lấy metadata.
 * Metadata là thông tin bổ sung được gửi kèm khi gọi API.
 *
 * 📦 METADATA ĐƯỢC KẾT HỢP TỪ 4 NGUỒN:
 * 1. Resource meta: Metadata định nghĩa trong resource config
 * 2. Hook meta: Metadata được truyền vào hook (qua props)
 * 3. Query params: Các params từ URL (VD: ?filter=active)
 * 4. MetaContext: Metadata từ context (VD: tenantId cho multi-tenancy)
 *
 * 💡 VÍ DỤ SỬ DỤNG:
 * ```typescript
 * const getMeta = useMeta();
 * const meta = getMeta({
 *   resource: myResource,
 *   meta: { customField: "value" }
 * });
 * // Kết quả: { ...resourceMeta, ...urlParams, customField: "value", tenantId: "..." }
 * ```
 *
 * @internal - Đánh dấu đây là API nội bộ (internal), không dùng trực tiếp từ bên ngoài
 */
export const useMeta = () => {
  // ============================================================================
  // PHẦN 4: LẤY DỮ LIỆU TỪ CÁC HOOKS KHÁC
  // ============================================================================

  /**
   * 📖 DESTRUCTURING ASSIGNMENT:
   *
   * const { params } = useParsed()
   * Nghĩa là: Gọi useParsed() và lấy field "params" từ object trả về
   *
   * Tương đương với:
   * const result = useParsed()
   * const params = result.params
   */

  // Lấy params từ URL đã được parse
  // VD: URL = "/posts?page=2&sort=name"
  //     => params = { page: "2", sort: "name", ... }
  const { params } = useParsed();

  // Lấy metadata context từ Provider (nếu có)
  // VD: Trong multi-tenancy app, context có thể chứa tenantId
  const metaContext = useMetaContext();

  // ============================================================================
  // PHẦN 5: ĐỊNH NGHĨA HÀM GETMETAFN - HÀM CHÍNH ĐỂ LẤY META
  // ============================================================================

  /**
   * 📚 HÀM GETMETAFN - Kết hợp metadata từ nhiều nguồn
   *
   * @param resource - Resource item (tùy chọn)
   * @param meta - Metadata từ props (tùy chọn)
   * @returns Object chứa tất cả metadata đã được kết hợp
   *
   * 📖 TYPESCRIPT - Tham số với giá trị mặc định:
   * = {} ở cuối nghĩa là nếu không truyền gì vào, tham số sẽ là object rỗng
   */
  const getMetaFn = ({
    resource, // Resource item (object chứa thông tin resource)
    meta: metaFromProp, // Đổi tên "meta" thành "metaFromProp" để tránh nhầm lẫn
  }: {
    resource?: IResourceItem; // "?" nghĩa là optional (có thể có hoặc không)
    meta?: MetaQuery; // Tương tự, meta cũng là optional
  } = {}) => {
    // ============================================================================
    // BƯỚC 1: LẤY METADATA TỪ RESOURCE
    // ============================================================================

    /**
     * 📖 NULLISH COALESCING OPERATOR (??):
     *
     * sanitizeResource(resource) ?? { meta: {} }
     * Nghĩa là: Nếu sanitizeResource(resource) trả về null/undefined,
     *           thì dùng { meta: {} } làm giá trị mặc định
     *
     * 📖 OPTIONAL CHAINING VÀ DESTRUCTURING:
     * const { meta } = ... ?? { meta: {} }
     * Lấy field "meta" từ object, nếu không có thì meta = {}
     */
    const { meta } = sanitizeResource(resource) ?? { meta: {} };

    // ============================================================================
    // BƯỚC 2: LOẠI BỎ CÁC FIELDS KHÔNG PHẢI METADATA TỪ PARAMS
    // ============================================================================

    /**
     * 📖 JAVASCRIPT - Destructuring với Rest Operator:
     *
     * const { a, b, ...rest } = { a: 1, b: 2, c: 3, d: 4 }
     * Kết quả:
     * - a = 1
     * - b = 2
     * - rest = { c: 3, d: 4 }  (phần còn lại)
     *
     * Dấu gạch dưới "_" trước tên biến là quy ước để đánh dấu:
     * "biến này được tách ra nhưng không sử dụng"
     */

    // Tách các field đặc biệt ra và lấy phần còn lại làm additionalParams
    // filters, sorters, currentPage, pageSize là các field của Refine,
    // không phải là metadata tùy chỉnh của user
    const {
      filters: _filters, // Tách ra nhưng không dùng (nên có "_")
      sorters: _sorters, // Tách ra nhưng không dùng
      currentPage: _currentPage, // Tách ra nhưng không dùng
      pageSize: _pageSize, // Tách ra nhưng không dùng
      ...additionalParams // Tất cả params còn lại (đây mới là metadata)
    } = params ?? {}; // Nếu params là null/undefined, dùng {} mặc định

    // ============================================================================
    // BƯỚC 3: KẾT HỢP TẤT CẢ METADATA
    // ============================================================================

    /**
     * 📖 TYPESCRIPT - Record Type:
     *
     * Record<string, unknown>
     * Nghĩa là: Object với:
     * - Key (khóa) là string
     * - Value (giá trị) có thể là bất kỳ kiểu gì (unknown)
     *
     * VD: { name: "John", age: 25, active: true }
     *
     * 📖 SPREAD OPERATOR (...):
     * Thứ tự spread rất quan trọng!
     * Giá trị ở sau sẽ ghi đè giá trị ở trước nếu cùng key
     */

    // Tạo object kết quả bằng cách merge (gộp) 3 nguồn metadata
    const result: Record<string, unknown> = {
      ...meta, // 1. Meta từ resource (độ ưu tiên thấp nhất)
      ...additionalParams, // 2. Params từ URL (ghi đè lên resource meta)
      ...metaFromProp, // 3. Meta từ props (độ ưu tiên cao nhất - ghi đè tất cả)
    };

    // ============================================================================
    // BƯỚC 4: THÊM TENANTID NẾU CÓ (CHO MULTI-TENANCY)
    // ============================================================================

    /**
     * 🏢 MULTI-TENANCY:
     *
     * Multi-tenancy là kiến trúc cho phép một ứng dụng phục vụ nhiều tenant (khách hàng)
     * Mỗi tenant có dữ liệu riêng, tách biệt với nhau
     *
     * VD: Shopify cho phép nhiều shop, mỗi shop là một tenant
     *
     * TenantId được thêm vào metadata để server biết đang thao tác với tenant nào
     */

    // Nếu có MultiTenancyProvider và có tenantId, thêm vào result
    if (metaContext?.tenantId) {
      // Bracket notation để set property
      // result["tenantId"] tương đương result.tenantId = ...
      result["tenantId"] = metaContext.tenantId;
    }

    // Trả về object metadata đã được kết hợp hoàn chỉnh
    return result;
  };

  // ============================================================================
  // PHẦN 6: RETURN HÀM GETMETAFN CHO USER SỬ DỤNG
  // ============================================================================

  /**
   * 📚 KẾT THÚC HOOK:
   *
   * Hook này không trả về data trực tiếp, mà trả về một HÀM
   * User sẽ gọi hàm đó khi cần lấy metadata
   *
   * Cách sử dụng:
   * ```typescript
   * const getMeta = useMeta();  // Lấy hàm
   * const meta = getMeta({      // Gọi hàm để lấy metadata
   *   resource: myResource,
   *   meta: { customField: "value" }
   * });
   * ```
   *
   * 🎯 LỢI ÍCH:
   * - Linh hoạt: có thể gọi hàm nhiều lần với tham số khác nhau
   * - Lazy: chỉ tính toán khi cần (không tính ngay khi component render)
   */
  return getMetaFn;
};

// ============================================================================
// 🎉 KẾT THÚC FILE
// ============================================================================
//
// 📚 TÓM TẮT HOOK USEMETA:
//
// 1. ✅ Lấy metadata từ 4 nguồn:
//    - Resource config
//    - URL params (loại bỏ filters/sorters/pagination)
//    - Props truyền vào
//    - Context (tenantId cho multi-tenancy)
//
// 2. ✅ Kết hợp metadata theo thứ tự ưu tiên:
//    Resource < URL params < Props < Context
//
// 3. ✅ Trả về HÀM (không phải data) để linh hoạt
//
// 📖 CÁC KHÁI NIỆM ĐÃ HỌC:
// - Destructuring với Rest operator (...)
// - Spread operator để merge objects
// - Optional chaining (?.)
// - Nullish coalescing (??)
// - TypeScript: Record type, Optional parameters
// - React: Custom hooks, Context
// - Pattern: Returning function from hook
//
// 👏 Chúc mừng! Bạn vừa hoàn thành hook đầu tiên!
// Sẵn sàng cho hook tiếp theo chưa? 😊
// ============================================================================
