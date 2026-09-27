import type { RefObject } from "react";
import { formatSnapshotDate } from "../../lib/format";
import {
  RANKING_OPTIONS,
  RANKING_SCOPE_NOTE,
  getRankingOption,
  rankHotels,
  type RankingCriterion,
} from "../../lib/hotel-ranking";
import { getSearchStateContent } from "../../lib/hotel-search";
import type { SearchResultsState } from "../../types/hotel";
import { HotelCard } from "./HotelCard";

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

  if (state.status === "loading") {
    const content = getSearchStateContent("loading");
    return (
      <section className="search-state is-loading" role="status">
        <span className="state-mark" aria-hidden="true" />
        <div>
          <h3 ref={focusTargetRef} tabIndex={-1}>
            {content.title}
          </h3>
          <p>{content.message}</p>
        </div>
      </section>
    );
  }

  if (state.status === "empty") {
    const content = getSearchStateContent("empty");
    const coverage = state.coverage;
    return (
      <section className="search-state" role="status">
        <span className="state-code">EMPTY</span>
        <div>
          <h3 ref={focusTargetRef} tabIndex={-1}>
            {content.title}
          </h3>
          <p>
            “{state.query}”没有完全匹配该城市、日期和层级的快照。{content.message}
          </p>
          {coverage && (
            <>
              <p className="coverage-hint">
                “{state.query}”目前只有 {coverage.checkIn} 至 {coverage.checkOut}{" "}
                的示例快照。
              </p>
              <button
                className="text-button"
                onClick={() => onApplyCoverage(coverage)}
                type="button"
              >
                用这段日期重新搜索
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    const content = getSearchStateContent("error");
    return (
      <section className="search-state is-error" role="alert">
        <span className="state-code">ERROR</span>
        <div>
          <h3 ref={focusTargetRef} tabIndex={-1}>
            {content.title}
          </h3>
          <p>{state.message || content.message}</p>
          <button className="text-button" onClick={onRetry} type="button">
            重新查询
          </button>
        </div>
      </section>
    );
  }

  const newestSnapshot = state.hotels.reduce(
    (latest, hotel) =>
      hotel.updatedAt > latest ? hotel.updatedAt : latest,
    state.hotels[0].updatedAt,
  );
  const staleContent = getSearchStateContent("stale");
  const rankedHotels = rankHotels(state.hotels, rankingCriterion);
  const rankingOption = getRankingOption(rankingCriterion);

  return (
    <div className="results-block">
      <div className="results-toolbar">
        <div>
          <p className="step-label">SEARCH RESULTS</p>
          <h3 ref={focusTargetRef} tabIndex={-1}>
            {state.query} · {state.hotels.length} 家酒店快照
          </h3>
        </div>
        <p className={`data-notice ${state.status === "stale" ? "is-stale" : ""}`}>
          {state.status === "stale" ? "数据已过期" : "有限快照"} · 更新于{" "}
          {formatSnapshotDate(newestSnapshot)}
        </p>
      </div>

      {state.status === "stale" && (
        <div className="stale-warning" role="note">
          <strong>{staleContent.title}</strong>
          <span>{staleContent.message}</span>
        </div>
      )}

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

      <div className="hotel-grid">
        {rankedHotels.map(({ hotel, rank }) => (
          <HotelCard
            hotel={hotel}
            key={hotel.id}
            onToggle={onToggleHotel}
            rank={rank}
            rankingCriterion={rankingCriterion}
            selected={selectedHotelIds.includes(hotel.id)}
          />
        ))}
      </div>
    </div>
  );
}
