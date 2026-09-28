import { BrandLogo } from "./BrandLogo";

type FloatingHeaderProps = {
  /** 数据状态徽标：说明这一屏的价格来自什么口径。 */
  snapshotLabel: string;
};

/**
 * 悬浮玻璃岛（功能层）。
 *
 * 形态依据提示词：脱离文档流固定在视口顶部居中（`fixed top-16`），
 * 最大宽度 `max-w-7xl`、左右各留 16px 物理缩进、Apple 连续大圆角，
 * 岛体是毛玻璃 + 1px 折射高光 + 多层环境阴影。
 *
 * 岛内控件不再叠玻璃：快照徽标与三态外观都是实体微色块，
 * 这样"玻璃只出现在岛的壳体上"，岛内文字对比度不受背景穿透影响。
 * 内容从岛的下方穿过（页面用 `--header-height` 预留起点），
 * 折射渐隐由岛体自身的 backdrop-blur 完成，不铺整幅底色。
 *
 * 岛内只放"这一屏的数据从哪来"：品牌与快照徽标。外观切换属于偏好，
 * 不是任务控件，按 HIG 收在页脚，不占首屏的主控件位。
 */
export function FloatingHeader({ snapshotLabel }: FloatingHeaderProps) {
  return (
    <header className="glass-functional fluid-edge site-header">
      <BrandLogo />
      <span className="prototype-badge">{snapshotLabel}</span>
    </header>
  );
}
