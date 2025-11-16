// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// React hook useCallback để "ghi nhớ" (memoize) hàm,
// giúp hàm không bị tạo mới mỗi lần component render
import { useCallback } from "react";

// Các utilities từ TanStack React Query
// - useQueryClient: lấy queryClient để thao tác với cache (invalidate, refetch, v.v.)
// - InvalidateOptions / InvalidateQueryFilters: kiểu dữ liệu mô tả cách invalidation hoạt động
import {
  type InvalidateOptions,
  type InvalidateQueryFilters,
  useQueryClient,
} from "@tanstack/react-query";

// Helper chọn data provider phù hợp (khi app có nhiều data provider)
import { pickDataProvider } from "@definitions";

// Custom hooks của Refine
import { useKeys, useResourceParams } from "@hooks";

// ========================================================================
// PHẦN 2: IMPORT TYPES (KIỂU DỮ LIỆU) - TYPESCRIPT
// ========================================================================

// BaseKey: kiểu ID (string | number)
// IQueryKeys: liệt kê các nhóm query mà Refine dùng (list, many, detail,...)
import type { BaseKey, IQueryKeys } from "../../contexts/data/types";

// ========================================================================
// PHẦN 3: ĐỊNH NGHĨA TYPE CHO THAM SỐ CỦA HOOK
// ========================================================================

/**
 * 📚 USEINVALIDATE PROP - Tham số truyền vào hàm invalidate mà hook trả về
 *
 * Ý tưởng: Sau khi create/update/delete, chúng ta cần "dọn dẹp" cache
 * để React Query refetch dữ liệu mới nhất.
 */
export type UseInvalidateProp = {
  /**
   * Tên resource (VD: "posts", "users")
   * Nếu không truyền, hook sẽ cố lấy từ context (useResourceParams)
   */
  resource?: string;

  /**
   * ID của record cụ thể (dùng khi invalidate detail)
   * Có kiểu BaseKey = string | number
   */
  id?: BaseKey;

  /**
   * Tên data provider (nếu app có nhiều provider)
   * Nếu không truyền => dùng provider mặc định được pick bởi pickDataProvider
   */
  dataProviderName?: string;

  /**
   * Danh sách các nhóm query cần invalidate
   * Ví dụ: ["list", "many", "detail"]
   * - Nếu truyền `false` => không invalidate gì cả (useCase: user muốn tắt)
   */
  invalidates: Array<keyof IQueryKeys> | false;

  /**
   * invalidationFilters: mô tả "đối tượng" query nào sẽ bị invalidate
   * - type: "all" | "active" | "inactive" | ...
   * - refetchType: "none" | "active" | "all"
   * Nếu không truyền => mặc định { type: "all", refetchType: "active" }
   */
  invalidationFilters?: InvalidateQueryFilters;

  /**
   * invalidationOptions: option cho invalidateQueries
   * - cancelRefetch: hủy các refetch đang chờ?
   * - ... (các option khác của React Query)
   * Nếu không truyền => mặc định { cancelRefetch: false }
   */
  invalidationOptions?: InvalidateOptions;
};

// ============================================================================
// PHẦN 4: HOOK USEINVALIDATE - TRẢ VỀ HÀM LÀM MỚI CACHE
// ============================================================================

/**
 * 📚 HOOK USEINVALIDATE
 *
 * 🎯 MỤC TIÊU:
 * Trả về một HÀM `invalidate` giúp bạn xóa cache của React Query
 * cho một resource cụ thể. Sau khi cache bị invalidate, React Query
 * sẽ tự động refetch để lấy dữ liệu mới nhất.
 *
 * 🔄 LUỒNG HOẠT ĐỘNG:
 * 1. Xác định data provider (dp) cho resource
 * 2. Tạo queryKey dựa trên resource + provider (dùng useKeys)
 * 3. Với mỗi loại `invalidates` được yêu cầu, gọi queryClient.invalidateQueries
 *
 * 💡 VÍ DỤ SỬ DỤNG:
 * ```ts
 * const invalidate = useInvalidate();
 *
 * // Invalidate danh sách và chi tiết của post có id=1
 * await invalidate({
 *   resource: "posts",
 *   invalidates: ["list", "detail"],
 *   id: 1,
 * });
 * ```
 */
export const useInvalidate = (): ((
  props: UseInvalidateProp,
) => Promise<void>) => {
  // Lấy danh sách resource từ context (Provider đã cung cấp)
  const { resources } = useResourceParams();

  // Lấy queryClient từ React Query để thao tác với cache
  const queryClient = useQueryClient();

  // Lấy factory tạo query keys chuẩn hóa
  const { keys } = useKeys();

  // useCallback để tạo hàm invalidate ổn định (không tạo mới mỗi render)
  const invalidate = useCallback(
    async ({
      resource,
      dataProviderName,
      invalidates,
      id,
      invalidationFilters = { type: "all", refetchType: "active" }, // Giá trị mặc định nếu user không truyền
      invalidationOptions = { cancelRefetch: false }, // Giá trị mặc định nếu user không truyền
    }: UseInvalidateProp) => {
      // Nếu user set invalidates = false => không làm gì cả
      if (invalidates === false) {
        return;
      }

      // Chọn data provider phù hợp dựa trên resource + dataProviderName
      const dp = pickDataProvider(resource, dataProviderName, resources);

      // Tạo queryKey gốc cho resource này. keys() là factory,
      // .data(dp) xác định provider, .resource(resource) xác định resource.
      const queryKey = keys()
        .data(dp)
        .resource(resource ?? "");

      // Promise.all để chạy invalidate song song cho từng loại key
      await Promise.all(
        invalidates.map((key) => {
          switch (key) {
            /**
             * "all": invalidate toàn bộ queries liên quan đến data provider này.
             * Hữu ích khi bạn muốn chắc chắn cache hoàn toàn được refresh.
             */
            case "all":
              return queryClient.invalidateQueries({
                queryKey: keys().data(dp).get(),
                ...invalidationFilters,
                ...invalidationOptions,
              });

            /**
             * "list": chỉ invalidate danh sách (useList)
             */
            case "list":
              return queryClient.invalidateQueries({
                queryKey: queryKey.action("list").get(),
                ...invalidationFilters,
                ...invalidationOptions,
              });

            /**
             * "many": invalidate cho các query lấy nhiều record (useMany)
             */
            case "many":
              return queryClient.invalidateQueries({
                queryKey: queryKey.action("many").get(),
                ...invalidationFilters,
                ...invalidationOptions,
              });

            /**
             * "resourceAll": invalidate TẤT CẢ queries của resource này
             * (bao gồm list, detail, many, v.v.) nhưng không động tới resource khác
             */
            case "resourceAll":
              return queryClient.invalidateQueries({
                queryKey: queryKey.get(),
                ...invalidationFilters,
                ...invalidationOptions,
              });

            /**
             * "detail": invalidate query chi tiết (useOne) của record cụ thể
             * Cần truyền id để build queryKey chính xác
             */
            case "detail":
              return queryClient.invalidateQueries({
                queryKey: queryKey
                  .action("one")
                  .id(id || "") // Nếu không có id => dùng chuỗi rỗng (tránh undefined)
                  .get(),
                ...invalidationFilters,
                ...invalidationOptions,
              });

            default:
              // Nếu key không khớp các case trên, không làm gì (keep type safety)
              return;
          }
        }),
      );

      // Hàm async nhưng không cần trả về giá trị -> undefined
      return;
    },
    [], // Dependency array trống: hàm sẽ không đổi giữa các render (an toàn vì bên trong không dùng prop/state thay đổi)
  );

  // Hook trả về hàm invalidate cho user sử dụng
  return invalidate;
};

// ============================================================================
// 🎉 TÓM TẮT NHANH CHO NGƯỜI MỚI
// ============================================================================
// - useInvalidate trả về một hàm để xóa cache của React Query.
// - Bạn chỉ định các nhóm query muốn invalidate thông qua `invalidates`.
// - Hook tự động chọn đúng data provider và queryKey dựa trên resource.
// - Sau khi invalidate, React Query sẽ refetch để đồng bộ dữ liệu mới nhất.
