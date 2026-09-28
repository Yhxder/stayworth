import { formatCurrencyAmount } from "../../lib/currencies";
import { formatPoints, formatSnapshotDate } from "../../lib/format";
import {
  getRankingOption,
  type RankingCriterion,
} from "../../lib/hotel-ranking";
import {
  calculateCashValuePerTenThousand,
  calculatePointsPerCurrencyUnit,
} from "../../lib/points";
import type { Hotel } from "../../types/hotel";
import { HotelImage } from "./HotelImage";

type HotelCardProps = {
  hotel: Hotel;
  rank: number;
  rankingCriterion: RankingCriterion;
  selected: boolean;
  onToggle: (hotelId: string) => void;
};

/**
 * 酒店卡片：内容层标准材料，不用玻璃。
 * 真实官图承载「这是哪家酒店」，等宽数字承载「值不值」，
 * 卡片底部标明图片来源与快照日期，与全站数据诚实原则一致。
 */
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
      <div className="hotel-photo">
        <HotelImage
          imagePath={hotel.imagePath ?? null}
          nameZh={hotel.nameZh}
          priority={rank === 1}
        />
      </div>

      <div className="hotel-card-body">
        <div className="card-topline">
          <span>{rankingOption.label}</span>
          <span>{hotel.tier}</span>
        </div>

        <p className="rank-chip">
          <span className="rank-number">#{rank}</span>
          本次查询排名
        </p>

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
            {formatCurrencyAmount(valuePerTenThousand, hotel.currency)}
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
          {selected ? "已加入比较" : "加入比较"}
        </button>

        <p className="field-hint mt-3">
          {hotel.imagePath
            ? "图片来自万豪官方图库，经本站代理加载。"
            : "官方图库暂无这家酒店的图片。"}
          价格快照：{hotel.sourceLabel}，更新于{" "}
          {formatSnapshotDate(hotel.updatedAt)}
        </p>
      </div>
    </article>
  );
}
