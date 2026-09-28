import type { ReactNode } from "react";

export type InputFieldProps = {
  id: string;
  label: string;
  /** 标签下方的帮助文案，可选。 */
  hint?: ReactNode;
  /** 帮助文案的 id，供控件的 aria-describedby 引用。 */
  hintId?: string;
  /** 校验失败时只换描边与底色，文字颜色不变。 */
  invalid?: boolean;
  className?: string;
  /** 实际控件，调用方负责把 aria-invalid / aria-describedby 写在控件上。 */
  children: ReactNode;
};

/**
 * 表单字段外壳：标签在上、控件在下、帮助文案在末。
 * label 同时包住控件并写 htmlFor，屏幕阅读器读到的是完整字段名；
 * 错误文案由调用方用 role="alert" 渲染并就近放置（writing.md：错误贴近问题位置）。
 */
export function InputField({
  id,
  label,
  hint,
  hintId,
  invalid = false,
  className = "",
  children,
}: InputFieldProps) {
  return (
    <div className={`field-block ${className}`.trim()}>
      <label className="field-block" htmlFor={id}>
        <span className="field-label">{label}</span>
        <span
          className="field-control"
          data-invalid={invalid ? "true" : undefined}
        >
          {children}
        </span>
      </label>
      {hint ? (
        <small className="field-hint" id={hintId}>
          {hint}
        </small>
      ) : null}
    </div>
  );
}
