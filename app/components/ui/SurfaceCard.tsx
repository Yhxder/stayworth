import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type SurfaceTone = "panel" | "card" | "sunken";

/**
 * 内容层的标准材料容器（materials.md › Standard materials）。
 *
 * 名字从 GlassCard 改成 SurfaceCard 是刻意的：HIG 明确禁止在内容层使用
 * Liquid Glass，卡片、面板、表单容器只能是近实心表面加 1px 发丝线。
 */
const toneClass: Record<SurfaceTone, string> = {
  panel: "surface-panel",
  card: "surface-card",
  sunken: "surface-sunken",
};

export type SurfaceCardProps<T extends ElementType = "div"> = {
  /** 渲染成哪个元素，默认 div；表单、aside、section 都可以复用。 */
  as?: T;
  /** 层级：结果面板 20px / 卡片 16px / 内嵌区。 */
  tone?: SurfaceTone;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function SurfaceCard<T extends ElementType = "div">({
  as,
  tone = "card",
  className = "",
  children,
  ...rest
}: SurfaceCardProps<T>) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag className={`${toneClass[tone]} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
