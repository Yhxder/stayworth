"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BookingPanel } from "./components/home/BookingPanel";
import type { BookingDraft } from "./components/home/BookingPanel";
import { HeroSection } from "./components/home/HeroSection";
import { IndexSection } from "./components/index/IndexSection";
import { RebateCalculator } from "./components/rebate/RebateCalculator";
import {
  ComparisonJumpButton,
  ComparisonSection,
  ComparisonTray,
} from "./components/search/ComparisonSection";
import { SearchResults } from "./components/search/SearchResults";
import { FloatingHeader } from "./components/shell/FloatingHeader";
import {
  ModuleSwitcher,
  type ModuleName,
} from "./components/shell/ModuleSwitcher";
import { TrustAndSources } from "./components/trust/TrustAndSources";
import { fetchHotelSnapshots } from "./lib/hotel-api";
import type { RankingCriterion } from "./lib/hotel-ranking";
import { getResultsState } from "./lib/hotel-search";
import { scrollToElement } from "./lib/scroll";
import { getDefaultStayDates } from "./lib/stay-dates";
import { createRebatePrefill } from "./lib/rebate-prefill";
import type {
  Hotel,
  RebatePrefill,
  SearchFilters,
  SearchResultsState,
} from "./types/hotel";

type SearchValidation = {
  field: "city" | "checkIn" | "checkOut";
  message: string;
} | null;

/**
 * 把视线与键盘焦点一起交给并排比较表。
 * 只滚动不聚焦的话，触发它的按钮（手机上会随比较表出现而消失）会把焦点
 * 交还给 body，键盘用户等于被丢回页面开头。
 */
function focusComparisonSection(section: HTMLElement | null) {
  scrollToElement(section, {
    clear: [".site-header", ".comparison-tray"],
  });
  section?.focus({ preventScroll: true });
}

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
  const [activeModule, setActiveModule] = useState<ModuleName>("comparison");
  const [filters, setFilters] = useState<SearchFilters>(() =>
    createInitialFilters(),
  );
  const [resultsState, setResultsState] =
    useState<SearchResultsState>({ status: "idle" });
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([]);
  const [rankingCriterion, setRankingCriterion] =
    useState<RankingCriterion>("value");
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonInView, setComparisonInView] = useState(false);
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
  const comparisonSection = useRef<HTMLElement>(null);
  const shouldScrollToComparison = useRef(false);

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
      availableHotels.filter((hotel) => selectedHotelIds.includes(hotel.id)),
    [availableHotels, selectedHotelIds],
  );

  const canCompare = selectedHotels.length >= 2 && selectedHotels.length <= 4;

  /**
   * 并排比较的跳转触发器：先打开比较表，再等它渲染完成后把视线带过去。
   * 已经打开时（例如从手机端的悬浮按钮回来）直接跳，不再改状态。
   */
  function goToComparison() {
    if (comparisonOpen) {
      focusComparisonSection(comparisonSection.current);
      return;
    }

    shouldScrollToComparison.current = true;
    setComparisonOpen(true);
  }

  useEffect(() => {
    if (!comparisonOpen || !shouldScrollToComparison.current) return;

    shouldScrollToComparison.current = false;
    focusComparisonSection(comparisonSection.current);
  }, [comparisonOpen]);

  /**
   * 比较表已经在视野里时，悬浮按钮让位：此时它唯一能做的就是把人带回原地。
   */
  useEffect(() => {
    const section = comparisonSection.current;

    if (!section || typeof IntersectionObserver === "undefined") {
      setComparisonInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setComparisonInView(entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(section);
    return () => observer.disconnect();
    // 切回「酒店对比」时比较表是重新挂载的，观察器要跟着重新接上
  }, [activeModule, comparisonOpen]);

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
      <FloatingHeader snapshotLabel="示例快照，非实时" />

      <HeroSection
        onOpenIndex={() => {
          setActiveModule("index");
          scrollToElement(document.getElementById("index-title"), {
            clear: [".site-header"],
          });
        }}
        onStart={() => {
          const field = document.getElementById("booking-destination");
          field?.focus({ preventScroll: true });
          scrollToElement(field, { block: "center" });
        }}
      />

      <div className="page-body">
        <section aria-labelledby="tools-title" className="tools-deck">
          <div className="tools-deck-head">
            <h2 id="tools-title">从一个城市和一段日期开始</h2>
            <p>
              挑 2 到 4 家并排比较现金价与积分价，也可以先算清回血后的真实成本。
            </p>
          </div>

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
        </section>

        <ModuleSwitcher
          activeModule={activeModule}
          onChange={setActiveModule}
        />

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
            在上方预订面板设置城市、日期和层级，再挑 2 到 4 家并排比较现金价与积分价。
          </p>
        </div>

        <ComparisonTray
          hotels={selectedHotels}
          onOpen={goToComparison}
        />
        {canCompare && !comparisonInView ? (
          <ComparisonJumpButton
            count={selectedHotels.length}
            onJump={goToComparison}
          />
        ) : null}
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
          onUseForRebate={useHotelForRebate}
          sectionRef={comparisonSection}
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
        <p>StayWorth 是独立项目，与 Marriott International 没有隶属关系。</p>
        <p>示例快照不是实时库存，不构成预订、兑换或税务建议。</p>
      </footer>
      </div>
    </main>
  );
}
