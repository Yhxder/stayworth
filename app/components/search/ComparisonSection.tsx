import { formatCurrencyAmount } from "../../lib/currencies";
import { formatPoints } from "../../lib/format";
import { calculateCashValuePerTenThousand } from "../../lib/points";
import type { Hotel } from "../../types/hotel";

type ComparisonSectionProps = {
  hotels: Hotel[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  onUseForRebate: (hotel: Hotel) => void;
};

type ComparisonTrayProps = {
  hotels: Hotel[];
  onOpen: () => void;
};

/**
 * 比较托盘：功能层玻璃（materials.md › Liquid Glass 允许的两个位置之一）。
 *
 * 位置依据 layout.md › Desktop「Avoid placing controls or critical information
 * at the bottom of a window」：桌面吸在吸顶栏下方，移动端回到单手可达的底部
 * （两套位置由 CSS 断点切换，DOM 只有一份）。放在列表之前，桌面吸顶才能在
 * 滚动卡片时一直可见。
 */
export function ComparisonTray({ hotels, onOpen }: ComparisonTrayProps) {
  const canCompare = hotels.length >= 2 && hotels.length <= 4;

  return (
    <aside
      aria-live="polite"
      className="comparison-tray fluid-edge glass-functional"
    >
      <div>
        <p>
          已选择 <strong>{hotels.length}</strong> / 4 家
        </p>
        <span>
          {hotels.length
            ? hotels.map((hotel) => hotel.nameZh).join("、")
            : "请选择至少两家酒店"}
        </span>
      </div>
      <button
        className="primary-button"
        disabled={!canCompare}
        onClick={onOpen}
        type="button"
      >
        并排比较
      </button>
    </aside>
  );
}

/** 并排比较结果：内容层标准材料，表格本身是数据，不用玻璃。 */
export function ComparisonSection({
  hotels,
  isOpen,
  onClose,
  onUseForRebate,
}: Omit<ComparisonSectionProps, "onOpen">) {
  const canCompare = hotels.length >= 2 && hotels.length <= 4;

  if (!isOpen || !canCompare) return null;

  return (
    <section aria-label="酒店并排比较" className="comparison-table-wrap">
      <div className="comparison-heading">
        <div>
          <h3>选择结果一览</h3>
        </div>
        <button className="text-button" onClick={onClose} type="button">
          收起
        </button>
      </div>
      <div
        className="comparison-columns"
        style={{
          gridTemplateColumns: `repeat(${hotels.length}, minmax(200px, 1fr))`,
        }}
      >
        {hotels.map((hotel) => {
          const value = calculateCashValuePerTenThousand(
            hotel.cashPrice,
            hotel.pointsRequired,
          );

          return (
            <article key={hotel.id}>
              <p>{hotel.tier}</p>
              <h4>{hotel.nameZh}</h4>
              <dl>
                <div>
                  <dt>现金总价</dt>
                  <dd>
                    {formatCurrencyAmount(hotel.cashPrice, hotel.currency)}
                  </dd>
                </div>
                <div>
                  <dt>积分总价</dt>
                  <dd>{formatPoints(hotel.pointsRequired)} 分</dd>
                </div>
                <div>
                  <dt>每万分兑换价值</dt>
                  <dd>{formatCurrencyAmount(value, hotel.currency)}</dd>
                </div>
              </dl>
              <small>
                公式：{formatCurrencyAmount(hotel.cashPrice, hotel.currency)} ÷{" "}
                {formatPoints(hotel.pointsRequired)} × 10,000
              </small>
              <button
                className="use-rebate-button"
                onClick={() => onUseForRebate(hotel)}
                type="button"
              >
                带入回血计算器
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
