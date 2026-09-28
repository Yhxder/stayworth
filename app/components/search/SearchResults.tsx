import type { RefObject } from "react";
import { formatSnapshotDate } from "../../lib/format";
import {
  RANKING_OPTIONS,
  RANKING_SCOPE_NOTE,
  getRankingOption,
  type RankingCriterion,
} from "../../lib/hotel-ranking";
import type { SearchResultsState } from "../../types/hotel";
import { HotelCardList } from "./HotelCardList";

type SearchResultsProps = {
  focusTargetRef: RefObject<HTMLHeadingElement | null>;
  state: SearchResultsState;
  rankingCriterion: RankingCriterion;
  selectedHotelIds: string[];
  onApplyCoverage: (coverage: { checkIn: string; checkOut: string }) => void;
  onRankingCriterionChange: (criterion: RankingCriterion) => void;
  onRetry: () => void;
  onToggleHotel: (hotelId: string) => void;
};

/**
 * 结果区：工具条与排序控件在这里，卡片与四种状态交给 HotelCardList。
 * 焦点管理保持在同一个地方：查询结束后焦点落到结果标题（tabIndex=-1）。
 */
export function SearchResults({
  focusTargetRef,
  state,
  rankingCriterion,
  selectedHotelIds,
  onApplyCoverage,
  onRankingCriterionChange,
  onRetry,
  onToggleHotel,
}: SearchResultsProps) {
  if (state.status === "idle") return null;

  if (state.status === "loading" || state.status === "empty" || state.status === "error") {
    return (
      <HotelCardList
        focusTargetRef={focusTargetRef}
        onApplyCoverage={onApplyCoverage}
        onRetry={onRetry}
        onToggleHotel={onToggleHotel}
        rankingCriterion={rankingCriterion}
        selectedHotelIds={selectedHotelIds}
        state={state}
      />
    );
  }

  const newestSnapshot = state.hotels.reduce(
    (latest, hotel) => (hotel.updatedAt > latest ? hotel.updatedAt : latest),
    state.hotels[0].updatedAt,
  );
  const rankingOption = getRankingOption(rankingCriterion);

  return (
    <div className="results-block">
      <div className="results-toolbar">
        <div>
          <h3 ref={focusTargetRef} tabIndex={-1}>
            {state.query} · {state.hotels.length} 家酒店快照
          </h3>
        </div>
        <p
          className={`data-notice ${state.status === "stale" ? "is-stale" : ""}`}
        >
          {state.status === "stale" ? "数据已过期" : "有限快照"} · 更新于{" "}
          {formatSnapshotDate(newestSnapshot)}
        </p>
      </div>

      <fieldset className="ranking-toolbar">
        <legend>排序口径</legend>
        <div className="ranking-options">
          {RANKING_OPTIONS.map((option) => (
            <label
              className={rankingCriterion === option.id ? "is-active" : ""}
              key={option.id}
            >
              <input
                checked={rankingCriterion === option.id}
                name="ranking-criterion"
                onChange={() => onRankingCriterionChange(option.id)}
                type="radio"
                value={option.id}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
        <p className="ranking-hint">{rankingOption.hint}</p>
      </fieldset>
      <p className="ranking-scope">
        {RANKING_SCOPE_NOTE} 当前共比较 {state.hotels.length} 家。
      </p>

      <HotelCardList
        focusTargetRef={focusTargetRef}
        onApplyCoverage={onApplyCoverage}
        onRetry={onRetry}
        onToggleHotel={onToggleHotel}
        rankingCriterion={rankingCriterion}
        selectedHotelIds={selectedHotelIds}
        state={state}
      />
    </div>
  );
}
