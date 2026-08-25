"use client";

import { useMemo, useState } from "react";
import { RebateCalculator } from "./components/rebate/RebateCalculator";
import { ComparisonSection } from "./components/search/ComparisonSection";
import { SearchForm } from "./components/search/SearchForm";
import { SearchResults } from "./components/search/SearchResults";
import { prototypeHotels } from "./data/prototype-hotels";
import {
  filterPrototypeHotels,
  getResultsState,
} from "./lib/hotel-search";
import type {
  SearchFilters,
  SearchResultsState,
} from "./types/hotel";

type ModuleName = "comparison" | "rebate";

const initialFilters: SearchFilters = {
  city: "香港",
  checkIn: "2026-08-15",
  checkOut: "2026-08-16",
  tier: "全部等级",
};

function waitForPrototypeSearch() {
  return new Promise((resolve) => window.setTimeout(resolve, 350));
}

export default function Home() {
  const [activeModule, setActiveModule] =
    useState<ModuleName>("comparison");
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [resultsState, setResultsState] = useState<SearchResultsState>(() =>
    getResultsState(prototypeHotels, initialFilters.city),
  );
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([
    "cyberport",
    "jw-hong-kong",
  ]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const selectedHotels = useMemo(
    () =>
      prototypeHotels.filter((hotel) =>
        selectedHotelIds.includes(hotel.id),
      ),
    [selectedHotelIds],
  );

  const searchError =
    filters.city.trim().length === 0
      ? "请输入城市或目的地。"
      : filters.checkOut <= filters.checkIn
        ? "退房日期必须晚于入住日期。"
        : "";

  async function handleSearch() {
    if (searchError || resultsState.status === "loading") return;

    const submittedFilters = { ...filters };
    setResultsState({
      status: "loading",
      query: submittedFilters.city,
    });
    setComparisonOpen(false);

    try {
      await waitForPrototypeSearch();
      const matchedHotels = filterPrototypeHotels(
        prototypeHotels,
        submittedFilters,
      );

      setSelectedHotelIds((current) =>
        current.filter((hotelId) =>
          matchedHotels.some((hotel) => hotel.id === hotelId),
        ),
      );
      setResultsState(
        getResultsState(matchedHotels, submittedFilters.city),
      );
    } catch {
      setSelectedHotelIds([]);
      setResultsState({
        status: "error",
        query: submittedFilters.city,
        message: "原型数据读取失败，请重新查询。",
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

  return (
    <main className="prototype-shell">
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="StayWorth 首页">
          <span className="wordmark-mark">SW</span>
          <span>
            <strong>StayWorth</strong>
            <small>Marriott decision prototype</small>
          </span>
        </a>
        <span className="prototype-badge">LOW-FI · v0.1</span>
      </header>

      <section className="intro" id="top">
        <p className="eyebrow">先做正确的决定，再谈精美的界面</p>
        <h1>这次入住，现金和积分哪个更值？</h1>
        <p className="intro-copy">
          使用模拟数据验证搜索、比较和回血计算流程。低保真原型只关注信息和操作，
          不代表最终视觉设计。
        </p>
      </section>

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
      </nav>

      <section
        aria-labelledby="comparison-title"
        className="module-panel"
        hidden={activeModule !== "comparison"}
      >
        <div className="section-heading">
          <div>
            <p className="step-label">MODULE 01</p>
            <h2 id="comparison-title">搜索并比较酒店</h2>
          </div>
          <p>先筛选，再选择 2–4 家酒店并排比较。</p>
        </div>

        <SearchForm
          filters={filters}
          isLoading={resultsState.status === "loading"}
          onChange={setFilters}
          onSearch={handleSearch}
          validationError={searchError}
        />
        <SearchResults
          onRetry={handleSearch}
          onToggleHotel={toggleHotel}
          selectedHotelIds={selectedHotelIds}
          state={resultsState}
        />
        <ComparisonSection
          hotels={selectedHotels}
          isOpen={comparisonOpen}
          onClose={() => setComparisonOpen(false)}
          onOpen={() => setComparisonOpen(true)}
        />
      </section>

      <RebateCalculator hidden={activeModule !== "rebate"} />

      <footer>
        <p>
          StayWorth 低保真原型 · 数据仅用于验证产品流程，不构成预订或兑换建议。
        </p>
        <p>Independent project · Not affiliated with Marriott International.</p>
      </footer>
    </main>
  );
}
