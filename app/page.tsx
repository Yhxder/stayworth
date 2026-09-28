"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookingPanel } from "./components/home/BookingPanel";
import type { BookingDraft } from "./components/home/BookingPanel";
import { HeroSection } from "./components/home/HeroSection";
import { RebateCalculator } from "./components/rebate/RebateCalculator";
import { IndexSection } from "./components/index/IndexSection";
import { ComparisonSection } from "./components/search/ComparisonSection";
import { SearchResults } from "./components/search/SearchResults";
import { TrustAndSources } from "./components/trust/TrustAndSources";
import { fetchHotelSnapshots } from "./lib/hotel-api";
import type { RankingCriterion } from "./lib/hotel-ranking";
import { getResultsState } from "./lib/hotel-search";
import { getDefaultStayDates } from "./lib/stay-dates";
import { createRebatePrefill } from "./lib/rebate-prefill";
import type {
  Hotel,
  RebatePrefill,
  SearchFilters,
  SearchResultsState,
} from "./types/hotel";

type ModuleName = "comparison" | "rebate" | "index";

type SearchValidation = {
  field: "city" | "checkIn" | "checkOut";
  message: string;
} | null;

function createInitialFilters(now?: Date): SearchFilters {
  const stayDates = getDefaultStayDates(now);

  return {
    city: "香港",
    checkIn: stayDates.checkIn,
    checkOut: stayDates.checkOut,
    tier: "全部等级",
  };
}

function validateSearchFilters(filters: SearchFilters): SearchValidation {
  if (filters.city.trim().length === 0) {
    return { field: "city", message: "请输入城市或目的地。" };
  }

  if (!filters.checkIn) {
    return { field: "checkIn", message: "请选择入住日期。" };
  }

  if (!filters.checkOut) {
    return { field: "checkOut", message: "请选择退房日期。" };
  }

  if (filters.checkOut <= filters.checkIn) {
    return { field: "checkOut", message: "退房日期必须晚于入住日期。" };
  }

  return null;
}

export default function Home() {
  const [activeModule, setActiveModule] =
    useState<ModuleName>("comparison");
  const [filters, setFilters] = useState<SearchFilters>(() =>
    createInitialFilters(),
  );
  const [resultsState, setResultsState] =
    useState<SearchResultsState>({ status: "idle" });
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([]);
  const [rankingCriterion, setRankingCriterion] =
    useState<RankingCriterion>("value");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [rebatePrefill, setRebatePrefill] =
    useState<RebatePrefill | null>(null);
  const [resultStayDates, setResultStayDates] = useState<{
    checkIn: string;
    checkOut: string;
  } | null>(null);
  const requestSequence = useRef(0);
  const rebatePrefillSequence = useRef(0);
  const resultsFocusTarget = useRef<HTMLHeadingElement>(null);
  const shouldFocusResults = useRef(false);

  useEffect(() => {
    if (
      shouldFocusResults.current &&
      resultsState.status !== "idle" &&
      resultsState.status !== "loading"
    ) {
      resultsFocusTarget.current?.focus();
      shouldFocusResults.current = false;
    }
  }, [resultsState]);

  const availableHotels = useMemo(
    () =>
      resultsState.status === "success" || resultsState.status === "stale"
        ? resultsState.hotels
        : [],
    [resultsState],
  );

  const selectedHotels = useMemo(
    () =>
      availableHotels.filter((hotel) =>
        selectedHotelIds.includes(hotel.id),
      ),
    [availableHotels, selectedHotelIds],
  );

  const searchValidation = validateSearchFilters(filters);
  const searchError = searchValidation?.message ?? "";

  async function handleSearch(
    nextFilters: SearchFilters = filters,
    draft?: BookingDraft,
  ) {
    if (
      validateSearchFilters(nextFilters) ||
      resultsState.status === "loading"
    ) {
      return;
    }

    // 预订面板的积分开关决定结果区先按哪一口径排序：积分优先看兑换价值，
    // 否则先看现金总价。
    if (draft) {
      setRankingCriterion(draft.usePoints ? "value" : "cash");
    }

    const submittedFilters = { ...nextFilters };
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    shouldFocusResults.current = true;
    setResultsState({
      status: "loading",
      query: submittedFilters.city,
    });
    setSelectedHotelIds([]);
    setResultStayDates(null);
    setComparisonOpen(false);

    try {
      const payload = await fetchHotelSnapshots(submittedFilters);
      if (requestId !== requestSequence.current) return;

      if (payload.status === "empty") {
        setResultsState({
          status: "empty",
          query: submittedFilters.city,
          coverage: payload.coverage,
        });
      } else {
        setResultStayDates({
          checkIn: submittedFilters.checkIn,
          checkOut: submittedFilters.checkOut,
        });
        setResultsState(getResultsState(payload.hotels, submittedFilters.city));
      }
    } catch (error) {
      if (requestId !== requestSequence.current) return;
      setResultsState({
        status: "error",
        query: submittedFilters.city,
        message:
          error instanceof Error
            ? error.message
            : "酒店数据查询失败，请重新查询。",
      });
    }
  }

  function toggleHotel(hotelId: string) {
    setSelectedHotelIds((current) => {
      if (current.includes(hotelId)) {
        return current.filter((id) => id !== hotelId);
      }

      if (current.length >= 4) return current;
      return [...current, hotelId];
    });
  }

  function applyCoverage(coverage: { checkIn: string; checkOut: string }) {
    const nextFilters: SearchFilters = {
      ...filters,
      checkIn: coverage.checkIn,
      checkOut: coverage.checkOut,
    };

    setFilters(nextFilters);
    void handleSearch(nextFilters);
  }

  function useHotelForRebate(hotel: Hotel) {
    if (!resultStayDates) return;

    const nextRevision = rebatePrefillSequence.current + 1;
    rebatePrefillSequence.current = nextRevision;
    setRebatePrefill(
      createRebatePrefill(
        hotel,
        resultStayDates.checkIn,
        resultStayDates.checkOut,
        nextRevision,
      ),
    );
    setActiveModule("rebate");
  }

  return (
    <main className="prototype-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="StayWorth 首页">
          <span className="wordmark-mark">SW</span>
          <span>
            <strong>StayWorth</strong>
            <small>Marriott points decision</small>
          </span>
        </a>
        <span className="prototype-badge">示例快照 · 非实时</span>
      </header>

      <HeroSection>
        <BookingPanel
          filters={filters}
          invalidField={searchValidation?.field ?? null}
          isLoading={resultsState.status === "loading"}
          onFiltersChange={setFilters}
          onSearch={(nextFilters, draft) => {
            void handleSearch(nextFilters, draft);
          }}
          validationError={searchError}
        />
      </HeroSection>

      <nav className="module-switcher" aria-label="主要功能">
        <button
          aria-label="切换到酒店对比模块"
          aria-pressed={activeModule === "comparison"}
          className={activeModule === "comparison" ? "is-active" : ""}
          onClick={() => setActiveModule("comparison")}
          type="button"
        >
          <span>01</span>
          酒店对比
          <small>现金价 vs 积分价</small>
        </button>
        <button
          aria-label="切换到积分回血模块"
          aria-pressed={activeModule === "rebate"}
          className={activeModule === "rebate" ? "is-active" : ""}
          onClick={() => setActiveModule("rebate")}
          type="button"
        >
          <span>02</span>
          积分回血
          <small>计算真实入住成本</small>
        </button>
        <button
          aria-label="切换到每万分参考价值模块"
          aria-pressed={activeModule === "index"}
          className={activeModule === "index" ? "is-active" : ""}
          onClick={() => setActiveModule("index")}
          type="button"
        >
          <span>03</span>
          每万分参考价值
          <small>StayWorth Index</small>
        </button>
      </nav>

      <section
        aria-labelledby="comparison-title"
        className="module-panel"
        hidden={activeModule !== "comparison"}
      >
        <div className="section-heading">
          <div>
            <h2 id="comparison-title">酒店对比</h2>
          </div>
          <p>
            在上方预订面板设置城市、日期和层级，再挑 2 到 4 家并排比较。
          </p>
        </div>

        <SearchResults
          focusTargetRef={resultsFocusTarget}
          onApplyCoverage={applyCoverage}
          onRankingCriterionChange={setRankingCriterion}
          onRetry={() => {
            void handleSearch();
          }}
          onToggleHotel={toggleHotel}
          rankingCriterion={rankingCriterion}
          selectedHotelIds={selectedHotelIds}
          state={resultsState}
        />
        <ComparisonSection
          hotels={selectedHotels}
          isOpen={comparisonOpen}
          onClose={() => setComparisonOpen(false)}
          onOpen={() => setComparisonOpen(true)}
          onUseForRebate={useHotelForRebate}
        />
      </section>

      <RebateCalculator
        hidden={activeModule !== "rebate"}
        key={rebatePrefill?.revision ?? "manual"}
        onOpenIndex={() => setActiveModule("index")}
        prefill={rebatePrefill}
      />

      <IndexSection hidden={activeModule !== "index"} />

      <TrustAndSources />

      <footer>
        <p>
          StayWorth 独立项目 · 示例快照不构成预订或兑换建议。
        </p>
        <p>Independent project · Not affiliated with Marriott International.</p>
      </footer>
    </main>
  );
}
