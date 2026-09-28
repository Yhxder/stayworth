import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type GlassTone = "panel" | "card" | "quiet";

/**
 * Liquid Glass 是 Apple 平台材料，网页端只能近似实现：这里用 backdrop-filter
 * 加 1px 渐变描边、内高光和多层阴影来模拟玻璃边缘折射，不是官方实现。
 */
const toneClass: Record<GlassTone, string> = {
  panel: "liquid-panel",
  card: "liquid-card",
  quiet: "liquid-quiet",
};

export type GlassCardProps<T extends ElementType = "div"> = {
  /** 渲染成哪个元素，默认 div；表单、aside、section 都可以复用。 */
  as?: T;
  /** 材质档位：面板 0.82 / 卡片 0.72 / 次级 0.66，全部不低于 0.6。 */
  tone?: GlassTone;
  /** 悬停抬升，只用在可点击或需要强调的容器上。 */
  elevated?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function GlassCard<T extends ElementType = "div">({
  as,
  tone = "card",
  elevated = false,
  className = "",
  children,
  ...rest
}: GlassCardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  const classes = [
    "liquid-edge rounded-glass",
    toneClass[tone],
    elevated ? "liquid-raise" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
