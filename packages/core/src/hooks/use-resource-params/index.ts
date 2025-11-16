// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN VÀ MODULES
// ============================================================================

// Import React và useContext hook
import React, { useContext } from "react";

// Import ResourceContext - Context chứa danh sách tất cả resources
import { ResourceContext } from "@contexts/resource";

// Import các hooks helper
import { useId } from "./use-id"; // Hook để lấy ID từ URL
import { useAction } from "./use-action"; // Hook để lấy action từ URL

// Import types
import type { BaseKey } from "../../contexts/data/types";
import type { IResourceItem } from "../../contexts/resource/types";
import type { Action } from "../../contexts/router/types";
import type { FormAction } from "../form/types";
import { type SelectReturnType, useResource } from "./use-resource";

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA TYPES
// ============================================================================

/**
 * 📚 TYPE PROPS - Tham số đầu vào cho hook
 */
type Props = {
  /**
   * 📌 id: ID của record (tùy chọn)
   * Nếu truyền vào, sẽ dùng ID này
   * Nếu không, sẽ lấy từ URL
   */
  id?: BaseKey;

  /**
   * 📌 resource: Tên resource (tùy chọn)
   * Nếu truyền vào, sẽ dùng resource này (kể cả nếu không được định nghĩa trong <Refine/>)
   * Nếu không, sẽ lấy từ URL
   */
  resource?: string;

  /**
   * 📌 action: Action (tùy chọn)
   * VD: "list", "show", "edit", "create", "clone"
   * Nếu truyền vào, sẽ dùng action này
   * Nếu không, sẽ lấy từ URL
   */
  action?: Action;
};

/**
 * 📚 TYPE RESOURCE PARAMS - Kết quả trả về từ hook
 */
type ResourceParams = {
  /**
   * 📌 id: ID của record hiện tại
   */
  id?: BaseKey;

  /**
   * 📌 setId: Hàm để set ID
   * Giống như setState trong useState
   */
  setId: React.Dispatch<React.SetStateAction<BaseKey | undefined>>;

  /**
   * 📌 resource: Object chứa thông tin resource
   */
  resource?: IResourceItem;

  /**
   * 📌 resources: Danh sách TẤT CẢ resources
   */
  resources: IResourceItem[];

  /**
   * 📌 action: Action hiện tại
   * VD: "list", "show", "edit", "create", "clone"
   */
  action?: Action;

  /**
   * 📌 identifier: Tên identifier của resource
   * VD: "posts", "users"
   */
  identifier?: string;

  /**
   * 📌 formAction: Action cho form (chỉ có 3 giá trị)
   * "create" | "edit" | "clone"
   *
   * 💡 TẠI SAO CẦN FORMACTION?
   *
   * Action có nhiều giá trị: "list", "show", "edit", "create", "clone"
   * Nhưng form chỉ quan tâm đến 3 actions: create, edit, clone
   * formAction convert action thành 1 trong 3 giá trị này
   */
  formAction: FormAction;

  /**
   * 📌 select: Hàm để lấy thông tin resource theo tên
   *
   * VD: select("posts") => { resource: {...}, identifier: "posts" }
   */
  select: <T extends boolean = true>(
    resourceName: string,
    force?: T,
  ) => SelectReturnType<T>;
};

// ============================================================================
// PHẦN 3: KHAI BÁO HOOK USERESOURCEPARAMS
// ============================================================================

/**
 * 📚 HOOK USERESOURCEPARAMS - Quản lý resource, action và id
 *
 * 🎯 CHỨC NĂNG:
 *
 * Hook này là "bộ não" quản lý 3 thông tin quan trọng nhất trong Refine:
 * 1. **resource**: Resource nào đang được sử dụng? (VD: "posts", "users")
 * 2. **action**: Đang làm gì với resource? (VD: "edit", "create")
 * 3. **id**: ID của record nào? (VD: 123)
 *
 * Hook này TỰ ĐỘNG INFER (suy luận) các giá trị này từ:
 * - Props (nếu user truyền vào)
 * - URL/Route (nếu không có props)
 *
 * 💡 VÍ DỤ:
 *
 * URL: /posts/123/edit
 * => resource: "posts", id: "123", action: "edit", formAction: "edit"
 *
 * URL: /posts/create
 * => resource: "posts", id: undefined, action: "create", formAction: "create"
 *
 * 🔄 LOGIC INFERENCE:
 *
 * **Resource:**
 * - Nếu truyền props.resource => dùng props.resource
 * - Nếu không => lấy từ URL
 *
 * **ID:**
 * - Nếu truyền props.id => dùng props.id
 * - Nếu không:
 *   - Nếu props.resource KHÁC resource từ URL => id = undefined
 *   - Nếu props.resource GIỐNG resource từ URL => lấy id từ URL
 *
 * **Action:**
 * - Nếu truyền props.action => dùng props.action
 * - Nếu không => lấy từ URL
 *
 * **FormAction:**
 * - Nếu props.resource KHÁC resource từ URL VÀ KHÔNG có props.action => "create"
 * - Nếu action là "edit" hoặc "clone" => giữ nguyên
 * - Còn lại => "create"
 *
 * @see {@link https://refine.dev/docs/api-reference/core/hooks/resource/useResourceParams} - Docs
 *
 * @internal - Hook nội bộ, thường không dùng trực tiếp
 */
export function useResourceParams(props?: Props): ResourceParams {
  // ============================================================================
  // PHẦN 4: LẤY DANH SÁCH RESOURCES TỪ CONTEXT
  // ============================================================================

  /**
   * 📚 RESOURCE CONTEXT - Lấy danh sách tất cả resources
   *
   * ResourceContext chứa danh sách resources được định nghĩa trong <Refine>:
   *
   * <Refine
   *   resources={[
   *     { name: "posts", ... },
   *     { name: "users", ... },
   *   ]}
   * />
   */
  const { resources } = useContext(ResourceContext);

  // ============================================================================
  // PHẦN 5: INFER (SUY LUẬN) RESOURCE TỪ URL
  // ============================================================================

  /**
   * 📚 USE RESOURCE - Hook để lấy resource từ URL
   *
   * Hook này tự động phân tích URL và trả về:
   * - select: Hàm để lấy thông tin resource theo tên
   * - identifier: Tên resource từ URL (VD: "posts")
   * - resource: Object chứa thông tin resource
   *
   * VD: URL = /posts/123/edit
   * => identifier = "posts", resource = { name: "posts", ... }
   */
  const {
    select, // Hàm để select resource
    identifier: inferredIdentifier, // Identifier từ URL
    resource: inferredResource, // Resource object từ URL
  } = useResource();

  // ============================================================================
  // PHẦN 6: XÁC ĐỊNH RESOURCE CẦN KIỂM TRA
  // ============================================================================

  /**
   * 📚 RESOURCE TO CHECK - Xác định resource nào cần kiểm tra
   *
   * Logic:
   * - Nếu user truyền props.resource => dùng props.resource
   * - Nếu không => dùng inferredIdentifier (từ URL)
   *
   * 📖 NULLISH COALESCING (??):
   * a ?? b = nếu a là null/undefined, trả về b, ngược lại trả về a
   */
  const resourceToCheck = props?.resource ?? inferredIdentifier;

  /**
   * 📚 SELECT RESOURCE - Lấy thông tin resource
   *
   * Nếu có resourceToCheck:
   * - Gọi select(resourceToCheck, true) để lấy thông tin
   * - force=true nghĩa là bắt buộc phải tìm được (không throw error nếu không tìm thấy)
   *
   * Nếu không có resourceToCheck:
   * - Destructure từ object rỗng => identifier và resource = undefined
   *
   * 📖 TERNARY OPERATOR:
   * điều_kiện ? giá_trị_nếu_true : giá_trị_nếu_false
   */
  const { identifier = undefined, resource = undefined } = resourceToCheck
    ? select(resourceToCheck, true)
    : {};

  // ============================================================================
  // PHẦN 7: KIỂM TRA XEM RESOURCE CÓ GIỐNG NHAU KHÔNG
  // ============================================================================

  /**
   * 📚 IS SAME RESOURCE - Kiểm tra resource có giống nhau không
   *
   * 💡 TẠI SAO CẦN KIỂM TRA?
   *
   * Tình huống:
   * - URL hiện tại: /posts/123/edit (resource từ URL = "posts")
   * - User truyền props: resource="users" (resource từ props = "users")
   * - => isSameResource = false
   *
   * Khi isSameResource = false:
   * - ID từ URL KHÔNG HỢP LỆ (vì đang ở route posts nhưng muốn dùng resource users)
   * - Phải set id = undefined hoặc dùng props.id
   *
   * Khi isSameResource = true:
   * - ID từ URL HỢP LỆ
   * - Có thể dùng ID từ URL
   */
  const isSameResource = inferredIdentifier === identifier;

  // ============================================================================
  // PHẦN 8: LẤY ID VÀ ACTION TỪ URL
  // ============================================================================

  /**
   * 📚 INFERRED ID - Lấy ID từ URL
   *
   * Hook useId() tự động parse URL và lấy ID
   * VD: /posts/123/edit => inferredId = "123"
   */
  const inferredId = useId();

  /**
   * 📚 ACTION - Lấy action (ưu tiên props, fallback URL)
   *
   * Hook useAction() nhận props.action
   * - Nếu có props.action => dùng props.action
   * - Nếu không => lấy action từ URL
   *
   * VD: /posts/123/edit => action = "edit"
   */
  const action = useAction(props?.action);

  // ============================================================================
  // PHẦN 9: XÁC ĐỊNH DEFAULT ID
  // ============================================================================

  /**
   * 📚 DEFAULT ID - Xác định ID mặc định
   *
   * 🔄 LOGIC:
   *
   * 1. Nếu isSameResource = false (resource khác nhau):
   *    => Chỉ dùng props.id
   *    => KHÔNG dùng inferredId (vì ID từ URL không hợp lệ)
   *
   * 2. Nếu isSameResource = true (resource giống nhau):
   *    => Ưu tiên props.id
   *    => Fallback về inferredId (ID từ URL)
   *
   * 📖 REACT - useMemo:
   *
   * useMemo(() => value, [deps])
   * Ghi nhớ giá trị value, chỉ tính toán lại khi deps thay đổi
   *
   * Dùng useMemo ở đây để tránh tính toán lại mỗi lần render
   */
  const defaultId = React.useMemo(() => {
    // Nếu resource khác nhau, chỉ dùng props.id
    if (!isSameResource) return props?.id;

    // Nếu resource giống nhau, ưu tiên props.id, fallback inferredId
    return props?.id ?? inferredId;
  }, [isSameResource, props?.id, inferredId]);

  // ============================================================================
  // PHẦN 10: QUẢN LÝ STATE CỦA ID
  // ============================================================================

  /**
   * 📚 ID STATE - State để lưu trữ ID hiện tại
   *
   * 📖 REACT - useState:
   *
   * useState(initialValue) tạo state với giá trị ban đầu
   * Trả về: [giá_trị, hàm_để_set_giá_trị]
   *
   * Dùng state để:
   * - Lưu trữ ID hiện tại
   * - Cho phép user thay đổi ID bằng setId()
   */
  const [id, setId] = React.useState<BaseKey | undefined>(defaultId);

  /**
   * 📚 SYNC ID WITH DEFAULT ID - Đồng bộ ID với defaultId
   *
   * 💡 TẠI SAO CẦN ĐỒNG BỘ?
   *
   * Khi defaultId thay đổi (VD: user navigate sang page khác):
   * - State id cần được update theo
   * - Không thể dùng useEffect vì cần update NGAY LẬP TỨC
   *
   * 📖 USEMEMO VỚI SIDE EFFECT:
   *
   * Thông thường useMemo chỉ nên dùng để tính toán giá trị
   * Nhưng ở đây dùng để sync state (side effect)
   *
   * Pattern này hơi "hack" nhưng đảm bảo update ngay trong render phase
   */
  React.useMemo(() => setId(defaultId), [defaultId]);

  // ============================================================================
  // PHẦN 11: XÁC ĐỊNH FORM ACTION
  // ============================================================================

  /**
   * 📚 FORM ACTION - Action cho form
   *
   * 🎯 MUC ĐÍCH:
   *
   * Form chỉ quan tâm đến 3 actions: "create", "edit", "clone"
   * Cần convert action (có thể là "list", "show", v.v.) thành 1 trong 3 giá trị này
   *
   * 🔄 LOGIC:
   *
   * 1. Nếu resource khác nhau VÀ KHÔNG có props.action:
   *    => formAction = "create"
   *    VD: URL = /posts/123/edit, props.resource = "users"
   *        => Đang ở route posts nhưng muốn dùng resource users
   *        => Coi như tạo mới user (không edit)
   *
   * 2. Nếu action = "edit" hoặc "clone":
   *    => formAction = action (giữ nguyên)
   *
   * 3. Còn lại:
   *    => formAction = "create"
   *    VD: action = "list", "show" => formAction = "create"
   *
   * 📖 REACT - useMemo:
   *
   * Dùng useMemo để cache kết quả, tránh tính toán lại mỗi lần render
   */
  const formAction = React.useMemo(() => {
    // Case 1: Resource khác nhau và không có props.action
    if (!isSameResource && !props?.action) {
      return "create";
    }

    // Case 2: Action là edit hoặc clone
    if (action === "edit" || action === "clone") {
      return action;
    }

    // Case 3: Default = create
    return "create";
  }, [action, isSameResource, props?.action]);

  // ============================================================================
  // PHẦN 12: RETURN KẾT QUẢ
  // ============================================================================

  /**
   * 📚 RETURN OBJECT - Trả về tất cả thông tin cần thiết
   *
   * Object này chứa:
   * - id, setId: ID hiện tại và hàm để set ID
   * - resource: Resource object (ưu tiên resource đã select, fallback inferredResource)
   * - resources: Danh sách tất cả resources
   * - action: Action hiện tại
   * - identifier: Identifier của resource
   * - formAction: Action cho form (create/edit/clone)
   * - select: Hàm để select resource theo tên
   */
  return {
    id,
    setId,
    resource: resource || inferredResource, // Ưu tiên resource đã select
    resources,
    action,
    identifier,
    formAction,
    select,
  };
}

// ============================================================================
// 🎉 KẾT THÚC FILE
// ============================================================================
//
// 📚 TÓM TẮT HOOK USERESOURCEPARAMS:
//
// 1. ✅ Quản lý 3 thông tin quan trọng: resource, action, id
// 2. ✅ Tự động infer (suy luận) từ props hoặc URL
// 3. ✅ Logic phức tạp để xử lý các trường hợp edge case:
//    - Custom resource khác với resource từ URL
//    - ID có hợp lệ hay không dựa vào resource
//    - Convert action thành formAction
// 4. ✅ Cung cấp setId để user có thể thay đổi ID động
// 5. ✅ Cung cấp select function để lấy thông tin resource
//
// 📖 CÁC KHÁI NIỆM ĐÃ HỌC:
// - Resource inference: Suy luận resource từ props/URL
// - ID inference: Suy luận ID từ props/URL
// - Action inference: Suy luận action từ props/URL
// - isSameResource: Kiểm tra resource có khớp với URL
// - formAction: Convert action thành action cho form
// - useState: Quản lý state của ID
// - useMemo: Cache giá trị và side effects
// - useContext: Lấy resources từ context
//
// 🔄 FLOW HOẠT ĐỘNG:
//
// 1. Lấy resources từ context
// 2. Infer resource, id, action từ URL
// 3. Lấy resource, id, action từ props (nếu có)
// 4. Merge và xác định giá trị cuối cùng theo logic:
//    - Resource: props > URL
//    - ID: props > URL (nếu isSameResource = true)
//    - Action: props > URL
//    - formAction: Logic phức tạp dựa vào action và isSameResource
// 5. Return tất cả thông tin
//
// 💡 VÍ DỤ THỰC TẾ:
//
// ```typescript
// // Scenario 1: Không truyền props, lấy từ URL
// // URL: /posts/123/edit
// const params = useResourceParams();
// // => { resource: "posts", id: "123", action: "edit", formAction: "edit" }
//
// // Scenario 2: Truyền custom resource
// // URL: /posts/123/edit
// const params = useResourceParams({ resource: "users" });
// // => { resource: "users", id: undefined, action: "edit", formAction: "create" }
// // ID = undefined vì resource khác nhau
// // formAction = "create" vì resource khác nhau
//
// // Scenario 3: Truyền custom ID
// // URL: /posts/123/edit
// const params = useResourceParams({ id: 456 });
// // => { resource: "posts", id: 456, action: "edit", formAction: "edit" }
//
// // Scenario 4: Truyền custom action
// // URL: /posts/123/edit
// const params = useResourceParams({ action: "clone" });
// // => { resource: "posts", id: "123", action: "clone", formAction: "clone" }
// ```
//
// 🎯 USE CASES:
//
// Hook này được dùng trong:
// - useForm: Để xác định resource, id, action cho form
// - useTable: Để xác định resource cho table
// - useShow: Để xác định resource và id cho detail page
// - Và nhiều hooks khác...
//
// 👏 Chúc mừng! Bạn vừa hiểu cách Refine quản lý routing và resources!
// Hook tiếp theo sẽ đơn giản hơn! 🚀
// ============================================================================
