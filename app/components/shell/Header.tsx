import { ThemeToggle } from "../theme/ThemeToggle";

type HeaderProps = {
  /** 数据状态徽标：说明这一屏的价格来自什么口径。 */
  snapshotLabel: string;
};

/**
 * 吸顶栏：功能层唯一的常驻玻璃面（materials.md › Liquid Glass）。
 *
 * 依据 layout.md › Visual hierarchy：「Differentiate controls from content …
 * use a scroll edge effect to visually elevate controls above content」，
 * 所以这里不画 border-bottom，改用下方 28px 的渐隐边缘带（见 .site-header-edge），
 * 由 CSS 滚动驱动动画控制强度，不用 window 滚动监听。
 */
export function Header({ snapshotLabel }: HeaderProps) {
  return (
    <>
      <header className="glass-functional fluid-edge site-header">
        <a aria-label="StayWorth 首页" className="wordmark" href="#top">
          <span className="wordmark-mark">SW</span>
          <span>
            <strong>StayWorth</strong>
            <small>Marriott points decision</small>
          </span>
        </a>
        <div className="flex items-center gap-2">
          <span className="prototype-badge">{snapshotLabel}</span>
          <ThemeToggle />
        </div>
      </header>
      <div aria-hidden="true" className="site-header-edge" />
    </>
  );
}
