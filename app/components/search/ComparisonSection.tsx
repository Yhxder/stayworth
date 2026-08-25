import { formatCny, formatPoints } from "../../lib/format";
import { calculateCashValuePerTenThousand } from "../../lib/points";
import type { Hotel } from "../../types/hotel";

type ComparisonSectionProps = {
  hotels: Hotel[];
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
};

export function ComparisonSection({
  hotels,
  isOpen,
  onClose,
  onOpen,
}: ComparisonSectionProps) {
  const canCompare = hotels.length >= 2 && hotels.length <= 4;

  return (
    <>
      <aside className="comparison-tray" aria-live="polite">
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

      {isOpen && canCompare && (
        <section className="comparison-table-wrap" aria-label="酒店并排比较">
          <div className="comparison-heading">
            <div>
              <p className="step-label">COMPARISON</p>
              <h3>选择结果一览</h3>
            </div>
            <button className="text-button" onClick={onClose} type="button">
              收起
            </button>
          </div>
          <div
            className="comparison-columns"
            style={{
              gridTemplateColumns: `repeat(${hotels.length}, minmax(190px, 1fr))`,
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
                      <dt>现金</dt>
                      <dd>{formatCny(hotel.cashPrice)}</dd>
                    </div>
                    <div>
                      <dt>积分</dt>
                      <dd>{formatPoints(hotel.pointsRequired)} 分</dd>
                    </div>
                    <div>
                      <dt>每万分价值</dt>
                      <dd>{formatCny(value)}</dd>
                    </div>
                  </dl>
                  <small>
                    公式：{formatCny(hotel.cashPrice)} ÷{" "}
                    {formatPoints(hotel.pointsRequired)} × 10,000
                  </small>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
