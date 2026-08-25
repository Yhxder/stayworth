import { formatCny, formatPoints } from "../../lib/format";
import {
  calculateCashValuePerTenThousand,
  calculatePointsPerCurrencyUnit,
} from "../../lib/points";
import type { Hotel } from "../../types/hotel";

type HotelCardProps = {
  hotel: Hotel;
  selected: boolean;
  onToggle: (hotelId: string) => void;
};

export function HotelCard({ hotel, selected, onToggle }: HotelCardProps) {
  const valuePerTenThousand = calculateCashValuePerTenThousand(
    hotel.cashPrice,
    hotel.pointsRequired,
  );
  const pointsPerYuan = calculatePointsPerCurrencyUnit(
    hotel.cashPrice,
    hotel.pointsRequired,
  );

  return (
    <article className={`hotel-card ${selected ? "is-selected" : ""}`}>
      <div className="card-topline">
        <span>{hotel.sourceLabel}</span>
        <span>{hotel.tier}</span>
      </div>
      <div className="hotel-placeholder" aria-hidden="true">
        <span>HOTEL</span>
      </div>
      <div className="hotel-copy">
        <p className="brand-label">{hotel.brand}</p>
        <h4>{hotel.nameZh}</h4>
        <p>{hotel.nameEn}</p>
        <p className="district">{hotel.district}</p>
      </div>
      <dl className="price-pair">
        <div>
          <dt>现金总价</dt>
          <dd>{formatCny(hotel.cashPrice)}</dd>
        </div>
        <div>
          <dt>积分总价</dt>
          <dd>{formatPoints(hotel.pointsRequired)} 分</dd>
        </div>
      </dl>
      <div className="value-box">
        <span>每万分兑换价值</span>
        <strong>{formatCny(valuePerTenThousand)} / 万分</strong>
        <small>需要 {pointsPerYuan} 分兑换 ¥1 的现金房价</small>
      </div>
      <button
        aria-label={`选择${hotel.nameZh}进行比较`}
        aria-pressed={selected}
        className="select-button"
        onClick={() => onToggle(hotel.id)}
        type="button"
      >
        {selected ? "✓ 已加入比较" : "+ 加入比较"}
      </button>
    </article>
  );
}
