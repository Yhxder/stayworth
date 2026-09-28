import type { ReactNode } from "react";

export type InputFieldProps = {
  id: string;
  label: string;
  /** 标签下方的帮助文案，可选。 */
  hint?: ReactNode;
  /** 帮助文案的 id，供控件的 aria-describedby 引用。 */
  hintId?: string;
  /** 校验失败时描边转警示色，文字不改变颜色。 */
  invalid?: boolean;
  className?: string;
  /** 实际控件，调用方负责把 aria-invalid / aria-describedby 写在控件上。 */
  children: ReactNode;
};

/**
 * 高可用输入框外壳：标签在上、控件在玻璃槽内、帮助文案在下。
 * label 同时包住控件并写 htmlFor，屏幕阅读器读到的是完整字段名。
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
          className="liquid-edge liquid-field liquid-focusable"
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
