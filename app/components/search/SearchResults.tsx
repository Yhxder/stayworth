import type { RefObject } from "react";
import { formatSnapshotDate } from "../../lib/format";
import { getSearchStateContent } from "../../lib/hotel-search";
import type { SearchResultsState } from "../../types/hotel";
import { HotelCard } from "./HotelCard";

type SearchResultsProps = {
  focusTargetRef: RefObject<HTMLHeadingElement | null>;
  state: SearchResultsState;
  selectedHotelIds: string[];
  onRetry: () => void;
  onToggleHotel: (hotelId: string) => void;
};

export function SearchResults({
  focusTargetRef,
  state,
  selectedHotelIds,
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

      <div className="hotel-grid">
        {state.hotels.map((hotel) => (
          <HotelCard
            hotel={hotel}
            key={hotel.id}
            onToggle={onToggleHotel}
            selected={selectedHotelIds.includes(hotel.id)}
          />
        ))}
      </div>
    </div>
  );
}
