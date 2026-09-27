import { formatCurrencyAmount } from "../../lib/currencies";
import { formatPoints } from "../../lib/format";
import {
  getRankingOption,
  type RankingCriterion,
} from "../../lib/hotel-ranking";
import {
  calculateCashValuePerTenThousand,
  calculatePointsPerCurrencyUnit,
} from "../../lib/points";
import type { Hotel } from "../../types/hotel";

type HotelCardProps = {
  hotel: Hotel;
  rank: number;
  rankingCriterion: RankingCriterion;
  selected: boolean;
  onToggle: (hotelId: string) => void;
};

export function HotelCard({
  hotel,
  rank,
  rankingCriterion,
  selected,
  onToggle,
}: HotelCardProps) {
  const valuePerTenThousand = calculateCashValuePerTenThousand(
    hotel.cashPrice,
    hotel.pointsRequired,
  );
  const pointsPerYuan = calculatePointsPerCurrencyUnit(
    hotel.cashPrice,
    hotel.pointsRequired,
  );
  const rankingOption = getRankingOption(rankingCriterion);

  return (
    <article
      className={`hotel-card ${selected ? "is-selected" : ""} ${
        rank === 1 ? "is-top-ranked" : ""
      }`}
    >
      <div className="card-topline">
        <span>{hotel.sourceLabel}</span>
        <span>{hotel.tier}</span>
      </div>
      <p className="rank-chip">
        <span className="rank-number">#{rank}</span>
        {rankingOption.label}
      </p>
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
          <dd>{formatCurrencyAmount(hotel.cashPrice, hotel.currency)}</dd>
        </div>
        <div>
          <dt>积分总价</dt>
          <dd>{formatPoints(hotel.pointsRequired)} 分</dd>
        </div>
      </dl>
      <div className="value-box">
        <span>每万分兑换价值</span>
        <strong>
          {formatCurrencyAmount(valuePerTenThousand, hotel.currency)} / 万分
        </strong>
        <small>
          需要 {pointsPerYuan} 分兑换 1 {hotel.currency} 的现金房价
        </small>
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
