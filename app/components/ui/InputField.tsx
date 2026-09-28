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
  /** 下拉字段需要自己画箭头，原生箭头在嵌入式行里会画出浅色底。 */
  controlType?: "text" | "select";
  className?: string;
  /** 实际控件，调用方负责把 aria-invalid / aria-describedby 写在控件上。 */
  children: ReactNode;
};

/**
 * 嵌入式分组字段行（iOS Settings 风格）：Label over Value。
 *
 * 字段本身没有四周硬边框，只有底色与圆角；聚焦或点按时整行加深。
 * label 同时包住控件并写 htmlFor，屏幕阅读器读到的是完整字段名；
 * 错误文案由调用方用 role="alert" 渲染并就近放置（writing.md：错误贴近问题位置）。
 */
export function InputField({
  id,
  label,
  hint,
  hintId,
  invalid = false,
  controlType = "text",
  className = "",
  children,
}: InputFieldProps) {
  return (
    <div className={`field-block ${className}`.trim()}>
      <label
        className="field-row"
        data-invalid={invalid ? "true" : undefined}
        htmlFor={id}
      >
        <span className="field-label">{label}</span>
        <span className="field-control">
          {children}
          {controlType === "select" ? (
            <span aria-hidden="true" className="field-chevron" />
          ) : null}
        </span>
        {hint ? (
          <small className="field-hint" id={hintId}>
            {hint}
          </small>
        ) : null}
      </label>
    </div>
  );
}
