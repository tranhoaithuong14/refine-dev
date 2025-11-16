// ============================================================================
// PHẦN 1: IMPORT CÁC THƯ VIỆN/HÀM HỖ TRỢ
// ============================================================================

// React + useEffect để xử lý side effects (subscribes, set values)
import React, { useEffect } from "react";

// lodash/get, lodash/has: đọc giá trị nested và kiểm tra tồn tại theo "path"
import get from "lodash/get";
import has from "lodash/has";

// react-hook-form: thư viện form phổ biến, tối ưu render & validation
import {
  useForm as useHookForm, // hook chính của react-hook-form
  type UseFormProps as UseHookFormProps, // type props cho useForm của RHF
  type UseFormReturn, // type kết quả trả về từ useForm của RHF
  type FieldValues, // type generic cho value của form
  type UseFormHandleSubmit, // type hàm handleSubmit
  type Path, // type cho string path an toàn với FieldValues
} from "react-hook-form";

// refine core: cung cấp hook useForm Core (data fetching/mutation), i18n, context,...
import {
  type BaseRecord,
  type HttpError,
  useForm as useFormCore, // hook form của refine (xử lý CRUD, metadata, redirect,...)
  useWarnAboutChange, // cảnh báo rời trang khi chưa lưu
  type UseFormProps as UseFormCoreProps,
  type UseFormReturnType as UseFormReturnTypeCore,
  useTranslate, // i18n
  useRefineContext, // lấy global options
  flattenObjectKeys, // helper flatten object -> paths
} from "@refinedev/core";

// ============================================================================
// PHẦN 2: ĐỊNH NGHĨA TYPES (TYPESCRIPT)
// ============================================================================

/**
 * UseFormReturnType - kết quả trả về của hook useForm (phiên bản refine + RHF)
 *
 * Kết hợp:
 * - UseFormReturn từ react-hook-form (control, register, handleSubmit,...)
 * - refineCore: kết quả từ useForm của refine core (query, onFinish,...)
 * - saveButtonProps: props chuẩn cho nút Save (disabled + onClick)
 *
 * 📖 Các type generic:
 * - Cú pháp generic: `<T extends Something = Default>` nghĩa là:
 *   + `extends Something`: ràng buộc kiểu (không được vượt quá Something)
 *   + `= Default`: giá trị mặc định nếu không truyền
 * - TQueryFnData: dữ liệu thô từ API
 * - TError: loại lỗi HTTP
 * - TVariables: shape của form values (extends FieldValues của RHF)
 * - TContext: context của RHF (optional)
 * - TData/TResponse/TResponseError: alias cho dữ liệu trả về sau mutation
 *
 * 📖 Intersection type (`&`):
 * - `UseFormReturn<TVariables, TContext> & { ... }` gộp hai kiểu thành một
 * - Giống như merge object types: có toàn bộ field của RHF + field thêm của refine
 */
export type UseFormReturnType<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables extends FieldValues = FieldValues,
  TContext extends object = {},
  TData extends BaseRecord = TQueryFnData,
  TResponse extends BaseRecord = TData,
  TResponseError extends HttpError = TError,
> = UseFormReturn<TVariables, TContext> & {
  refineCore: UseFormReturnTypeCore<
    TQueryFnData,
    TError,
    TVariables,
    TData,
    TResponse,
    TResponseError
  >;
  saveButtonProps: {
    disabled: boolean;
    onClick: (e: React.BaseSyntheticEvent) => void;
  };
};

/**
 * UseFormProps - props truyền vào hook
 *
 * Bao gồm:
 * - refineCoreProps: config cho useForm core của refine (fetch, mutation, redirect,...)
 * - warnWhenUnsavedChanges: bật cảnh báo rời trang khi chưa lưu
 * - disableServerSideValidation: tắt mapping lỗi server -> form
 * - UseHookFormProps: tất cả props native của react-hook-form (defaultValues, resolver,...)
 *
 * 📖 Intersection type (`&`) lần nữa:
 * - `{ ...customProps } & UseHookFormProps<TVariables, TContext>`
 * - Nghĩa là: kiểu cuối cùng bao gồm cả customProps lẫn toàn bộ props của RHF
 */
export type UseFormProps<
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables extends FieldValues = FieldValues,
  TContext extends object = {},
  TData extends BaseRecord = TQueryFnData,
  TResponse extends BaseRecord = TData,
  TResponseError extends HttpError = TError,
> = {
  /**
   * Cấu hình cho useForm core của refine
   * @type UseFormCoreProps<TQueryFnData, TError, TVariables, TData, TResponse, TResponseError>
   */
  refineCoreProps?: UseFormCoreProps<
    TQueryFnData,
    TError,
    TVariables,
    TData,
    TResponse,
    TResponseError
  >;
  /**
   * Bật cảnh báo "chưa lưu" khi rời trang
   * @default false (hoặc lấy từ RefineProvider nếu set)
   */
  warnWhenUnsavedChanges?: boolean;
  /**
   * Tắt mapping lỗi server -> setError của react-hook-form
   * @default false
   * @see {@link https://refine.dev/docs/advanced-tutorials/forms/server-side-form-validation/}
   */
  disableServerSideValidation?: boolean;
} & UseHookFormProps<TVariables, TContext>;

// ============================================================================
// PHẦN 3: KHAI BÁO HOOK USEFORM (PHIÊN BẢN REACT-HOOK-FORM + REFINE)
// ============================================================================

/**
 * 📚 useForm (gói @refinedev/react-hook-form)
 *
 * 🎯 Mục tiêu:
 * - Kết hợp sức mạnh của React Hook Form (quản lý state/validation ở client) với useForm core của refine (fetch, mutation, redirect, invalidate).
 * - Giữ API quen thuộc của RHF, đồng thời tự động xử lý CRUD, auto-save, cảnh báo chưa lưu, mapping lỗi server.
 *
 * 🔧 Cách dùng nhanh:
 * ```tsx
 * const {
 *   register,
 *   handleSubmit,
 *   formState: { errors },
 *   refineCore: { onFinish, formLoading },
 * } = useForm({ refineCoreProps: { resource: "posts" } });
 *
 * <form onSubmit={handleSubmit((values) => onFinish(values))}>
 *   <input {...register("title")} />
 *   {errors.title?.message}
 * </form>
 * ```
 *
 * 📖 Giải thích các generic (TQueryFnData, TError, TVariables, TContext, TData, TResponse, TResponseError):
 * - TQueryFnData: dữ liệu thô từ API khi fetch (getOne)
 * - TError: type lỗi HTTP
 * - TVariables: shape của form values (phải extends FieldValues của RHF)
 * - TContext: context type của RHF (dùng cho resolver)
 * - TData/TResponse: dữ liệu sau khi mutate (có thể transform)
 * - TResponseError: lỗi trả về từ mutate
 */
export const useForm = <
  TQueryFnData extends BaseRecord = BaseRecord,
  TError extends HttpError = HttpError,
  TVariables extends FieldValues = FieldValues,
  TContext extends object = {},
  TData extends BaseRecord = TQueryFnData,
  TResponse extends BaseRecord = TData,
  TResponseError extends HttpError = TError,
>({
  // Props tùy chỉnh cho refine core
  refineCoreProps,
  // Bật cảnh báo chưa lưu (ưu tiên props > RefineProvider)
  warnWhenUnsavedChanges: warnWhenUnsavedChangesProp,
  // Tắt mapping lỗi server => setError (ưu tiên props > RefineProvider)
  disableServerSideValidation: disableServerSideValidationProp = false,
  // Các props còn lại truyền thẳng cho react-hook-form
  ...rest
}: UseFormProps<
  TQueryFnData,
  TError,
  TVariables,
  TContext,
  TData,
  TResponse,
  TResponseError
> = {}): UseFormReturnType<
  TQueryFnData,
  TError,
  TVariables,
  TContext,
  TData,
  TResponse,
  TResponseError
> => {
  /**
   * 📖 TypeScript function signature:
   * - `({ ...rest }: UseFormProps<...> = {})`:
   *   + destructuring props
   *   + thêm giá trị mặc định = {} để tránh undefined
   * - `): UseFormReturnType<...> => { ... }`:
   *   + phần sau dấu `):` là type của giá trị trả về (annotation)
   */
  // ============================================================================
  // PHẦN 3A: GIẢI THÍCH NGẮN VỀ 2 LỚP HOOK ĐƯỢC GHÉP LẠI
  // ============================================================================
  /**
   * useForm ở đây GHÉP 2 hook:
   * - react-hook-form (RHF): quản lý state form ở client, register/control, validation tại client
   * - refine useForm core: lo phần server (fetch dữ liệu edit/clone, call create/update API, redirect, invalidate cache)
   *
   * Mục tiêu: Dùng API quen thuộc của RHF nhưng vẫn tận dụng tiện ích từ refine (CRUD, metadata, notification,...)
   *
   * Cấu trúc kết quả trả về:
   * - Tất cả field từ RHF (control, register, errors,...)
   * - refineCore: chứa query, onFinish, formLoading, onFinishAutoSave
   * - saveButtonProps: props tiện dụng cho nút Save (disabled + onClick)
   */
  // ============================================================================
  // PHẦN 3: LẤY OPTIONS TỪ CONTEXT + KHAI BÁO HOOK PHỤ TRỢ
  // ============================================================================

  // Context refine chứa global options (disableServerSideValidation,...)
  const { options } = useRefineContext();
  const disableServerSideValidation =
    options?.disableServerSideValidation || disableServerSideValidationProp;
  /**
   * 🔧 Ưu tiên giá trị:
   * - Nếu props.disableServerSideValidation được truyền => dùng props
   * - Nếu không => dùng options từ RefineProvider (global)
   * - Cả hai false => bật mapping lỗi server -> form
   *
   * 📖 Optional chaining (options?.disableServerSideValidation):
   * - Tránh lỗi nếu options hoặc field không tồn tại (undefined/null)
   */

  // Hook dịch i18n
  const translate = useTranslate();

  // Hook cảnh báo chưa lưu (lấy config từ RefineProvider)
  const { warnWhenUnsavedChanges: warnWhenUnsavedChangesRefine, setWarnWhen } =
    useWarnAboutChange();
  const warnWhenUnsavedChanges =
    warnWhenUnsavedChangesProp ?? warnWhenUnsavedChangesRefine;
  // Nullish coalescing (??): ưu tiên props, fallback context

  // ============================================================================
  // PHẦN 4: KHỞI TẠO REACT-HOOK-FORM
  // ============================================================================

  // useHookFormResult chứa control, register, handleSubmit,...
  // rest: các props của RHF truyền từ caller (defaultValues, resolver,...)
  // 📖 rest parameter ({ ...rest }): gom các prop còn lại thành một object.
  const useHookFormResult = useHookForm<TVariables, TContext>({
    ...rest,
  });

  const {
    watch,
    setValue,
    getValues,
    handleSubmit: handleSubmitReactHookForm,
    setError,
  } = useHookFormResult;
  /**
   * 📌 Các hàm quan trọng từ RHF:
   * - watch: subscribe thay đổi values (dùng cho auto-save, cảnh báo)
   * - setValue: ghi giá trị vào form (dùng để set data fetch về)
   * - getValues: lấy current values (để biết field nào đã register)
   * - handleSubmitReactHookForm: wrapper validate + onSubmit của RHF
   * - setError: đẩy lỗi vào form (dùng map lỗi server)
   *
   * 📖 Path<TVariables>:
   * - Path là utility type của RHF để đảm bảo string path khớp với keys của TVariables
   * - Giúp tránh gõ sai tên field khi setError/setValue (type-safe)
   */

  // ============================================================================
  // PHẦN 5: KHỞI TẠO useForm CORE CỦA REFINE (CRUD, INVALIDATE, REDIRECT,...)
  // ============================================================================

  const useFormCoreResult = useFormCore<
    TQueryFnData,
    TError,
    TVariables,
    TData,
    TResponse,
    TResponseError
  >({
    ...refineCoreProps,
    // Map lỗi server -> setError (RHF) trừ khi tắt bằng disableServerSideValidation
    onMutationError: (error, _variables, _context) => {
      if (disableServerSideValidation) {
        refineCoreProps?.onMutationError?.(error, _variables, _context);
        return;
      }

      const errors = error?.errors;

      /**
       * 🚧 MAPPING LỖI SERVER -> FORM
       * error.errors dự kiến là object: { [fieldPath]: message | string[] | boolean | { key, message } }
       * - fieldPath có thể là path nested (vd: "author.email")
       * - Chỉ setError nếu field đã có trong form (đã register), tránh lỗi warn của RHF.
       */
      for (const key in errors) {
        // Khi key không tồn tại trong form, setError sẽ không hoạt động -> bỏ qua
        const isKeyInVariables = Object.keys(
          flattenObjectKeys(_variables),
        ).includes(key);

        if (!isKeyInVariables) {
          continue;
        }

        const fieldError = errors[key];

        let newError = "";

        // Kiểu mảng: join thành string
        if (Array.isArray(fieldError)) {
          newError = fieldError.join(" ");
        }

        // Kiểu string: dùng trực tiếp
        if (typeof fieldError === "string") {
          newError = fieldError;
        }

        // Kiểu boolean true: thông báo generic
        if (typeof fieldError === "boolean" && fieldError) {
          newError = "Field is not valid.";
        }

        // Kiểu object có key: dùng translate để i18n
        if (typeof fieldError === "object" && "key" in fieldError) {
          const translatedMessage = translate(
            fieldError.key,
            fieldError.message,
          );

          newError = translatedMessage;
        }

        setError(key as Path<TVariables>, {
          message: newError,
        });
      }

      refineCoreProps?.onMutationError?.(error, _variables, _context);
    },
  });

  // Destructuring lấy các utility quan trọng từ refine core
  const { query, onFinish, formLoading, onFinishAutoSave } = useFormCoreResult;
  /**
   * 📖 Destructuring với alias/cùng tên:
   * - query: kết quả từ useQuery (getOne/getList tùy action)
   * - onFinish: hàm call mutation create/update/clone
   * - formLoading: cờ loading tổng (fetch + mutation)
   * - onFinishAutoSave: biến thể của onFinish dùng cho auto-save
   */

  // ============================================================================
  // PHẦN 6: ĐỒNG BỘ DỮ LIỆU FETCH ĐƯỢC VÀO REACT-HOOK-FORM
  // ============================================================================

  useEffect(() => {
    const data = query?.data?.data;
    if (!data) return;

    /**
     * 📌 Ý tưởng: Khi edit/clone, dữ liệu fetch từ server cần đổ vào form.
     *
     * - getValues() của RHF trả về giá trị hiện có (bao gồm defaultValues)
     * - flattenObjectKeys sẽ chuyển object thành dạng { "author.email": "...", ... }
     *   => giúp biết các path nào đã được register trong form.
     *
     * Vì RHF chỉ set được giá trị cho field đã register, chúng ta chỉ set những path đã có.
     *
     * 📖 Optional chaining (?.):
     * - query?.data?.data: nếu query hoặc data undefined/null -> bỏ qua, tránh lỗi runtime.
     */
    const registeredFields = Object.keys(flattenObjectKeys(getValues()));

    /**
     * Duyệt từng path đã register, lấy giá trị tương ứng từ data trả về
     * - has(data, path): kiểm tra path tồn tại trong object nested
     * - get(data, path): lấy giá trị tại path (có thể undefined hoặc null)
     */
    registeredFields.forEach((path) => {
      const hasValue = has(data, path);
      const dataValue = get(data, path);

      /**
       * Đặt giá trị vào form nếu server có trả về field đó
       * - Kể cả khi null (muốn reset trường)
       * - Nếu không có, giữ nguyên giá trị hiện tại của form
       *
       * 📖 Type assertion `as Path<TVariables>`:
       * - Giúp TypeScript hiểu string path này hợp lệ với TVariables.
       * - Dùng khi chúng ta chắc chắn path đến từ registeredFields (an toàn).
       */
      if (hasValue) {
        setValue(path as Path<TVariables>, dataValue);
      }
    });
  }, [query?.data, setValue, getValues]);

  // ============================================================================
  // PHẦN 7: THEO DÕI THAY ĐỔI FORM (watch) ĐỂ AUTO-SAVE / CẢNH BÁO
  // ============================================================================

  useEffect(() => {
    /**
     * watch() của RHF trả về subscription.
     * Mỗi khi type === "change" (user nhập), gọi onValuesChange để:
     * - Bật cảnh báo chưa lưu
     * - Nếu bật autoSave: gọi onFinishAutoSave
     */
    const subscription = watch((values: any, { type }: { type?: any }) => {
      if (type === "change") {
        onValuesChange(values);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onValuesChange = (changeValues: TVariables) => {
    /**
     * 🔔 setWarnWhen(true) làm gì?
     * - Kích hoạt cờ "có thay đổi chưa lưu" trong UnsavedWarnContext.
     * - Nếu user rời trang (đi link khác/đóng tab) và warnWhenUnsavedChanges=true,
     *   refine sẽ hiển thị modal xác nhận để tránh mất dữ liệu.
     */
    if (warnWhenUnsavedChanges) {
      setWarnWhen(true);
    }

    /**
     * 💾 Auto-save:
     * - Nếu enable, ta tắt cảnh báo (setWarnWhen(false)) để không làm phiền user
     *   trong lúc auto-save chạy.
     * - onFinishProps: callback transform trước khi gửi lên server (nếu user cấu hình),
     *   mặc định trả về chính values.
     */
    if (refineCoreProps?.autoSave?.enabled) {
      setWarnWhen(false);

      const onFinishProps =
        refineCoreProps.autoSave?.onFinish ?? ((values: TVariables) => values);

      /**
       * onFinishAutoSave: hàm của refine core
       * - nhận payload (đã transform)
       * - trả Promise -> có catch để nuốt lỗi, tránh crash luồng watch
       */
      return onFinishAutoSave(onFinishProps(changeValues)).catch(
        (error) => error,
      );
    }

    // Nếu không auto-save, chỉ trả về values (có thể dùng ở nơi khác nếu cần)
    return changeValues;
  };

  // ============================================================================
  // PHẦN 8: BỌC HANDLE SUBMIT ĐỂ TẮT CẢNH BÁO TRƯỚC KHI SUBMIT
  // ============================================================================

  const handleSubmit: UseFormHandleSubmit<TVariables> =
    (onValid, onInvalid) => async (e) => {
      // Khi user nhấn submit, tắt cảnh báo rời trang để không hiện modal
      setWarnWhen(false);
      return handleSubmitReactHookForm(onValid, onInvalid)(e);
    };

  // ============================================================================
  // PHẦN 9: PROP CHUẨN CHO NÚT SAVE
  // ============================================================================

  const saveButtonProps = {
    disabled: formLoading,
    onClick: (e: React.BaseSyntheticEvent) => {
      // onFinish của refine core trả Promise, nên catch để không propagate lỗi lên event handler
      handleSubmit(
        (v) => onFinish(v).catch(() => {}),
        () => false,
      )(e);
    },
  };

  // ============================================================================
  // PHẦN 10: GIÁ TRỊ TRẢ VỀ
  // ============================================================================

  return {
    ...useHookFormResult,
    handleSubmit,
    refineCore: useFormCoreResult,
    saveButtonProps,
  };
};

// ============================================================================
// 🎉 TÓM TẮT HOOK USEFORM (REACT-HOOK-FORM + REFINE)
// ============================================================================
// 1) Kết hợp RHF (state/validation client) với refine core (fetch/mutate/redirect/invalidate).
// 2) Tự động map lỗi server -> setError của RHF (có thể tắt bằng disableServerSideValidation).
// 3) Đồng bộ data fetch vào form qua setValue chỉ cho field đã register.
// 4) Watch thay đổi để bật cảnh báo chưa lưu và hỗ trợ auto-save nếu cấu hình.
// 5) Trả về saveButtonProps tiện dụng + handleSubmit đã bọc setWarnWhen(false).
