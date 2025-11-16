// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN
// ============================================================================

// useEffect, useState: React hooks để quản lý state và side-effects
import { useEffect, useState } from "react";
// Hook custom của Refine để đọc RefineContext (lấy options cấu hình)
import { useRefineContext } from "..";

// ============================================================================
// PHẦN 2: KHAI BÁO TYPES (TYPESCRIPT)
// ============================================================================

// Type option được lấy từ RefineContext (bắt buộc có interval, còn lại optional)
export type UseLoadingOvertimeRefineContext = Omit<
  UseLoadingOvertimeCoreProps,
  "isLoading" | "interval"
> &
  Required<Pick<UseLoadingOvertimeCoreProps, "interval">>;

// Props cho component/hook khác: cho phép pass overtimeOptions (cấu hình)
export type UseLoadingOvertimeOptionsProps = {
  overtimeOptions?: UseLoadingOvertimeCoreOptions;
};

// Return type khi gộp vào hooks khác (theo pattern Refine)
export type UseLoadingOvertimeReturnType = {
  overtime: {
    elapsedTime?: number;
  };
};

// Core options: cùng với props hook, nhưng bỏ isLoading (vì isLoading bắt buộc)
type UseLoadingOvertimeCoreOptions = Omit<
  UseLoadingOvertimeCoreProps,
  "isLoading"
>;

// Return type của hook chính
type UseLoadingOvertimeCoreReturnType = {
  elapsedTime?: number;
};

// Props chính của hook
export type UseLoadingOvertimeCoreProps = {
  /**
   * Bật/tắt tính năng đo thời gian. Nếu false => elapsedTime sẽ là undefined.
   * @default true
   */
  enabled?: boolean;

  /**
   * Trạng thái loading hiện tại. Phải truyền để hook biết khi nào cần tính thời gian.
   */
  isLoading: boolean;

  /**
   * Độ dài mỗi chu kỳ tính (ms). Sau mỗi interval, hàm onInterval sẽ được gọi.
   * Nếu không truyền, dùng giá trị trong RefineProvider (options.overtime.interval).
   * @default 1000 (1 giây)
   */
  interval?: number;

  /**
   * Callback khi thời gian chờ vượt qua từng interval.
   * @param elapsedInterval Thời gian đã trôi qua (ms)
   * Nếu không truyền, dùng onInterval từ RefineProvider (options.overtime.onInterval).
   */
  onInterval?: (elapsedInterval: number) => void;
};

// ============================================================================
// PHẦN 3: HOOK USELOADINGOVERTIME
// ============================================================================

/**
 * 📚 useLoadingOvertime
 *
 * 🎯 Mục tiêu: Theo dõi "thời gian loading" và báo về mỗi khi vượt qua một khoảng thời gian (interval).
 *
 * 🔄 Cách hoạt động:
 * 1. Lấy cấu hình mặc định từ RefineContext (options.overtime).
 * 2. Cho phép override bằng props (enabled, interval, onInterval).
 * 3. Khi isLoading=true, khởi chạy setInterval để tăng elapsedTime.
 * 4. Gọi onInterval mỗi lần elapsedTime thay đổi (mỗi interval).
 * 5. Khi isLoading=false hoặc unmount: clearInterval + reset elapsedTime.
 *
 * 📦 Giá trị trả về:
 * - elapsedTime: số ms đã trôi qua kể từ lúc loading (undefined nếu disabled hoặc chưa loading).
 *
 * 💡 Ứng dụng:
 * - Hiển thị skeleton hoặc tooltip "đang xử lý lâu..." sau 2-3 giây.
 * - Gửi log/telemetry khi API quá lâu.
 */
export const useLoadingOvertime = ({
  enabled: enabledProp,
  isLoading,
  interval: intervalProp,
  onInterval: onIntervalProp,
}: UseLoadingOvertimeCoreProps): UseLoadingOvertimeCoreReturnType => {
  // State lưu thời gian đã trôi qua (ms)
  const [elapsedTime, setElapsedTime] = useState<number | undefined>(undefined);

  // Lấy options từ RefineContext (do <Refine> cung cấp)
  const { options } = useRefineContext();
  const { overtime } = options;

  // Chọn giá trị ưu tiên: props override context (nullish coalescing ??)
  const interval = intervalProp ?? overtime.interval;
  const onInterval = onIntervalProp ?? overtime?.onInterval;
  const enabled =
    typeof enabledProp !== "undefined"
      ? enabledProp
      : typeof overtime.enabled !== "undefined"
        ? overtime.enabled
        : true; // default fallback

  // Side-effect: Bắt đầu đếm thời gian khi loading + enabled
  useEffect(() => {
    let intervalFn: ReturnType<typeof setInterval>;

    if (enabled && isLoading) {
      intervalFn = setInterval(() => {
        // Tăng elapsedTime sau mỗi interval
        setElapsedTime((prevElapsedTime) => {
          if (prevElapsedTime === undefined) {
            return interval;
          }

          return prevElapsedTime + interval;
        });
      }, interval);
    }

    // Cleanup khi isLoading false hoặc component unmount
    return () => {
      if (typeof intervalFn !== "undefined") {
        clearInterval(intervalFn);
      }
      // Reset elapsedTime về undefined (không tính tiếp)
      setElapsedTime(undefined);
    };
  }, [isLoading, interval, enabled]);

  // Side-effect: Gọi callback mỗi khi elapsedTime thay đổi
  useEffect(() => {
    if (onInterval && elapsedTime) {
      onInterval(elapsedTime);
    }
  }, [elapsedTime]);

  // Trả về elapsedTime cho component/hook khác dùng
  return {
    elapsedTime,
  };
};
