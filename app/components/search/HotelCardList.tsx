import type { RefObject } from "react";
import {
  rankHotels,
  type RankingCriterion,
} from "../../lib/hotel-ranking";
import { getSearchStateContent } from "../../lib/hotel-search";
import type { SearchResultsState } from "../../types/hotel";
import { HotelCard } from "./HotelCard";
import { CityCatalogList } from "./CityCatalogList";

type HotelCardListProps = {
  state: SearchResultsState;
  rankingCriterion: RankingCriterion;
  selectedHotelIds: string[];
  focusTargetRef: RefObject<HTMLHeadingElement | null>;
  onApplyCoverage: (coverage: { checkIn: string; checkOut: string }) => void;
  onRetry: () => void;
  onToggleHotel: (hotelId: string) => void;
};

/** 骨架屏与最终卡片同形：先给占位，再替换（loading.md）。 */
function HotelCardSkeletons() {
  return (
    <div aria-hidden="true" className="hotel-grid">
      {[0, 1, 2].map((index) => (
        <div className="hotel-card" key={index}>
          <div className="hotel-photo">
            <span className="hotel-photo-skeleton" />
          </div>
          <div className="hotel-card-body">
            <span className="skeleton-line w-1/3" />
            <span className="skeleton-line mt-3 w-3/4" />
            <span className="skeleton-line mt-3 h-8 w-full" />
            <span className="skeleton-line mt-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 结果列表区的四种状态：加载中（骨架与最终形状一致）、空结果、加载失败、
 * 数据过期；每张卡片自己处理图片加载失败的回退（HotelImage）。
 */
export function HotelCardList({
  state,
  rankingCriterion,
  selectedHotelIds,
  focusTargetRef,
  onApplyCoverage,
  onRetry,
  onToggleHotel,
}: HotelCardListProps) {
  if (state.status === "idle") return null;

  if (state.status === "loading") {
    const content = getSearchStateContent("loading");
    return (
      <>
        <section className="search-state is-loading" role="status">
          <span aria-hidden="true" className="state-mark" />
          <div>
            <h3 ref={focusTargetRef} tabIndex={-1}>
              {content.title}
            </h3>
            <p>{content.message}</p>
          </div>
        </section>
        <div className="mt-6">
          <HotelCardSkeletons />
        </div>
      </>
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
            “{state.query}”没有完全匹配该城市、日期和层级的快照。
            {content.message}
          </p>
          {coverage ? (
            <>
              <p className="coverage-hint">
                “{state.query}”目前只有 {coverage.checkIn} 至 {coverage.checkOut}{" "}
                的示例快照。
              </p>
              <button
                className="text-button mt-3"
                onClick={() => onApplyCoverage(coverage)}
                type="button"
              >
                用这段日期重新搜索
              </button>
            </>
          ) : null}
          <CityCatalogList city={state.query} />
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
          <button className="text-button mt-3" onClick={onRetry} type="button">
            重新查询
          </button>
        </div>
      </section>
    );
  }

  const rankedHotels = rankHotels(state.hotels, rankingCriterion);
  const staleContent = getSearchStateContent("stale");

  return (
    <>
      {state.status === "stale" ? (
        <div className="stale-warning" role="note">
          <strong>{staleContent.title}</strong>
          <span>{staleContent.message}</span>
        </div>
      ) : null}

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
    </>
  );
}
