/**
 * 品牌区：SW 标记 + 主副标题。
 * 副标题保持 0.75rem（12px 无障碍下限），对比度由 `--label-tertiary` 保证。
 */
export function BrandLogo() {
  return (
    <a aria-label="StayWorth 首页" className="wordmark" href="#top">
      <span className="wordmark-mark">SW</span>
      <span>
        <strong>StayWorth</strong>
        <small>Marriott points decision</small>
      </span>
    </a>
  );
}
