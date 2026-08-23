"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  EXCHANGE_RATE_REFERENCE_DATE,
  EXCHANGE_RATE_SOURCE_URL,
  convertCurrencyAmount,
  currencyOptions,
  type CurrencyCode,
  formatCurrencyAmount,
  getCurrencyConfig,
} from "./lib/currencies";
import {
  calculateCashValuePerTenThousand,
  calculatePointsPerCurrencyUnit,
  calculateRebateEstimate,
} from "./lib/points";

type ModuleName = "comparison" | "rebate";
type PortfolioTier =
  | "Luxury"
  | "Premium"
  | "Select"
  | "Longer Stays"
  | "Collections";

type Hotel = {
  id: string;
  nameZh: string;
  nameEn: string;
  brand: string;
  tier: PortfolioTier;
  district: string;
  cashPrice: number;
  pointsRequired: number;
  source: "你的真实入住" | "原型模拟数据";
};

const hotels: Hotel[] = [
  {
    id: "cyberport",
    nameZh: "香港数码港艾美酒店",
    nameEn: "Le Méridien Hong Kong, Cyberport",
    brand: "Le Méridien",
    tier: "Premium",
    district: "香港岛 · 数码港",
    cashPrice: 1235,
    pointsRequired: 37000,
    source: "你的真实入住",
  },
  {
    id: "jw-hong-kong",
    nameZh: "香港 JW 万豪酒店",
    nameEn: "JW Marriott Hotel Hong Kong",
    brand: "JW Marriott",
    tier: "Luxury",
    district: "香港岛 · 金钟",
    cashPrice: 2280,
    pointsRequired: 52000,
    source: "原型模拟数据",
  },
  {
    id: "sheraton-hong-kong",
    nameZh: "香港喜来登酒店",
    nameEn: "Sheraton Hong Kong Hotel & Towers",
    brand: "Sheraton",
    tier: "Premium",
    district: "九龙 · 尖沙咀",
    cashPrice: 1680,
    pointsRequired: 48000,
    source: "原型模拟数据",
  },
  {
    id: "courtyard-hong-kong",
    nameZh: "香港万怡酒店",
    nameEn: "Courtyard by Marriott Hong Kong",
    brand: "Courtyard",
    tier: "Select",
    district: "香港岛 · 西营盘",
    cashPrice: 1120,
    pointsRequired: 32000,
    source: "原型模拟数据",
  },
];

const tierOptions: Array<PortfolioTier | "全部等级"> = [
  "全部等级",
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
];

const memberTiers = {
  Member: { label: "普通会员", bonusRate: 0 },
  Silver: { label: "银卡 · 10% 加成", bonusRate: 0.1 },
  Gold: { label: "金卡 · 25% 加成", bonusRate: 0.25 },
  Platinum: { label: "白金卡 · 50% 加成", bonusRate: 0.5 },
  Titanium: { label: "钛金卡 · 75% 加成", bonusRate: 0.75 },
  Ambassador: { label: "大使 · 75% 加成", bonusRate: 0.75 },
} as const;

type MemberTier = keyof typeof memberTiers;

const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return `¥${moneyFormatter.format(value)}`;
}

function formatPoints(value: number) {
  return integerFormatter.format(value);
}

export default function Home() {
  const [activeModule, setActiveModule] =
    useState<ModuleName>("comparison");
  const [city, setCity] = useState("香港");
  const [checkIn, setCheckIn] = useState("2026-08-15");
  const [checkOut, setCheckOut] = useState("2026-08-16");
  const [tier, setTier] = useState<(typeof tierOptions)[number]>("全部等级");
  const [hasSearched, setHasSearched] = useState(true);
  const [selectedHotelIds, setSelectedHotelIds] = useState<string[]>([
    "cyberport",
    "jw-hong-kong",
  ]);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("CNY");
  const [cashPrice, setCashPrice] = useState(1235);
  const [ineligibleSpend, setIneligibleSpend] = useState(235);
  const [nights, setNights] = useState(1);
  const [exchangeRate, setExchangeRate] = useState(
    getCurrencyConfig("CNY").unitsPerUsd,
  );
  const [baseRate, setBaseRate] = useState(10);
  const [memberTier, setMemberTier] = useState<MemberTier>("Platinum");
  const [cardMultiplier, setCardMultiplier] = useState(6);
  const [welcomePoints, setWelcomePoints] = useState(1000);
  const [promotionalPoints, setPromotionalPoints] = useState(0);
  const [pointValuation, setPointValuation] = useState(400);

  const filteredHotels = useMemo(() => {
    if (tier === "全部等级") return hotels;
    return hotels.filter((hotel) => hotel.tier === tier);
  }, [tier]);

  const selectedHotels = useMemo(
    () => hotels.filter((hotel) => selectedHotelIds.includes(hotel.id)),
    [selectedHotelIds],
  );

  const searchError =
    city.trim().length === 0
      ? "请输入城市或目的地。"
      : checkOut <= checkIn
        ? "退房日期必须晚于入住日期。"
        : "";

  const calculatorError =
    !Number.isFinite(cashPrice) || cashPrice <= 0
      ? "现金总价必须大于 0。"
      : !Number.isFinite(ineligibleSpend) || ineligibleSpend < 0
        ? "不计分金额不能小于 0。"
        : ineligibleSpend > cashPrice
          ? "不计分金额不能高于现金总价。"
          : !Number.isInteger(nights) || nights <= 0
            ? "入住晚数必须是大于 0 的整数。"
            : !Number.isFinite(exchangeRate) || exchangeRate <= 0
              ? "汇率必须大于 0。"
              : !Number.isFinite(cardMultiplier) || cardMultiplier < 0
                ? "信用卡倍率不能小于 0。"
                : !Number.isFinite(welcomePoints) || welcomePoints < 0
                  ? "欢迎积分不能小于 0。"
                  : !Number.isFinite(promotionalPoints) ||
                      promotionalPoints < 0
                    ? "活动积分不能小于 0。"
                    : !Number.isFinite(pointValuation) ||
                        pointValuation <= 0
                      ? "每万分价值必须大于 0。"
                      : "";

  const rebateResult = calculatorError
    ? null
    : calculateRebateEstimate({
        cashPrice,
        ineligibleSpend,
        nights,
        exchangeRate,
        baseRate,
        eliteBonusRate: memberTiers[memberTier].bonusRate,
        cardMultiplier,
        welcomePoints,
        promotionalPoints,
        valuePerTenThousand: pointValuation,
      });

  function handleCurrencyChange(nextCurrency: CurrencyCode) {
    setPointValuation((currentValue) =>
      convertCurrencyAmount(currentValue, currencyCode, nextCurrency),
    );
    setCurrencyCode(nextCurrency);
    setExchangeRate(getCurrencyConfig(nextCurrency).unitsPerUsd);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchError) return;
    setHasSearched(true);
    setComparisonOpen(false);
    setSelectedHotelIds((current) =>
      current.filter((hotelId) =>
        filteredHotels.some((hotel) => hotel.id === hotelId),
      ),
    );
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

  const canCompare =
    selectedHotelIds.length >= 2 && selectedHotelIds.length <= 4;

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

        <form className="search-form" onSubmit={handleSearch}>
          <label>
            <span>城市或目的地</span>
            <input
              onChange={(event) => setCity(event.target.value)}
              placeholder="例如：香港 / Hong Kong"
              value={city}
            />
            <small>未来支持中英文、别名和拼写容错</small>
          </label>
          <label>
            <span>入住日期</span>
            <input
              onChange={(event) => setCheckIn(event.target.value)}
              type="date"
              value={checkIn}
            />
          </label>
          <label>
            <span>退房日期</span>
            <input
              onChange={(event) => setCheckOut(event.target.value)}
              type="date"
              value={checkOut}
            />
          </label>
          <label>
            <span>品牌层级</span>
            <select
              onChange={(event) =>
                setTier(event.target.value as (typeof tierOptions)[number])
              }
              value={tier}
            >
              {tierOptions.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <button
            aria-label="搜索匹配酒店"
            className="primary-button search-button"
            disabled={Boolean(searchError)}
            type="submit"
          >
            搜索匹配酒店
          </button>
          {searchError && (
            <p className="validation-message" role="alert">
              {searchError}
            </p>
          )}
        </form>

        {hasSearched && (
          <div className="results-block">
            <div className="results-toolbar">
              <div>
                <p className="step-label">SEARCH RESULTS</p>
                <h3>
                  {city || "全部目的地"} · {filteredHotels.length} 家示例酒店
                </h3>
              </div>
              <p className="data-notice">原型模拟数据 · 非实时价格</p>
            </div>

            <div className="hotel-grid">
              {filteredHotels.map((hotel) => {
                const selected = selectedHotelIds.includes(hotel.id);
                const valuePerTenThousand =
                  calculateCashValuePerTenThousand(
                    hotel.cashPrice,
                    hotel.pointsRequired,
                  );
                const pointsPerYuan = calculatePointsPerCurrencyUnit(
                  hotel.cashPrice,
                  hotel.pointsRequired,
                );

                return (
                  <article
                    className={`hotel-card ${selected ? "is-selected" : ""}`}
                    key={hotel.id}
                  >
                    <div className="card-topline">
                      <span>{hotel.source}</span>
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
                        <dd>{formatMoney(hotel.cashPrice)}</dd>
                      </div>
                      <div>
                        <dt>积分总价</dt>
                        <dd>{formatPoints(hotel.pointsRequired)} 分</dd>
                      </div>
                    </dl>
                    <div className="value-box">
                      <span>每万分兑换价值</span>
                      <strong>
                        {formatMoney(valuePerTenThousand)} / 万分
                      </strong>
                      <small>
                        需要 {pointsPerYuan} 分兑换 ¥1 的现金房价
                      </small>
                    </div>
                    <button
                      aria-label={`选择${hotel.nameZh}进行比较`}
                      aria-pressed={selected}
                      className="select-button"
                      onClick={() => toggleHotel(hotel.id)}
                      type="button"
                    >
                      {selected ? "✓ 已加入比较" : "+ 加入比较"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <aside className="comparison-tray" aria-live="polite">
          <div>
            <p>
              已选择 <strong>{selectedHotelIds.length}</strong> / 4 家
            </p>
            <span>
              {selectedHotels.length
                ? selectedHotels.map((hotel) => hotel.nameZh).join("、")
                : "请选择至少两家酒店"}
            </span>
          </div>
          <button
            className="primary-button"
            disabled={!canCompare}
            onClick={() => setComparisonOpen(true)}
            type="button"
          >
            并排比较
          </button>
        </aside>

        {comparisonOpen && (
          <section className="comparison-table-wrap" aria-label="酒店并排比较">
            <div className="comparison-heading">
              <div>
                <p className="step-label">COMPARISON</p>
                <h3>选择结果一览</h3>
              </div>
              <button
                className="text-button"
                onClick={() => setComparisonOpen(false)}
                type="button"
              >
                收起
              </button>
            </div>
            <div
              className="comparison-columns"
              style={{
                gridTemplateColumns: `repeat(${selectedHotels.length}, minmax(190px, 1fr))`,
              }}
            >
              {selectedHotels.map((hotel) => {
                const value = calculateCashValuePerTenThousand(
                  hotel.cashPrice,
                  hotel.pointsRequired,
                );

                return (
                  <article key={hotel.id}>
                    <p>{hotel.tier}</p>
                    <h4>{hotel.nameZh}</h4>
                    <dl>
                      <div>
                        <dt>现金</dt>
                        <dd>{formatMoney(hotel.cashPrice)}</dd>
                      </div>
                      <div>
                        <dt>积分</dt>
                        <dd>{formatPoints(hotel.pointsRequired)} 分</dd>
                      </div>
                      <div>
                        <dt>每万分价值</dt>
                        <dd>{formatMoney(value)}</dd>
                      </div>
                    </dl>
                    <small>
                      公式：{formatMoney(hotel.cashPrice)} ÷{" "}
                      {formatPoints(hotel.pointsRequired)} × 10,000
                    </small>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>

      <section
        aria-labelledby="rebate-title"
        className="module-panel"
        hidden={activeModule !== "rebate"}
      >
        <div className="section-heading">
          <div>
            <p className="step-label">MODULE 02</p>
            <h2 id="rebate-title">积分回血计算器</h2>
          </div>
          <p>先估算能赚多少分，再换算入住后的真实成本。</p>
        </div>

        <div className="calculator-layout">
          <form className="calculator-form">
            <div className="form-section">
              <div className="form-section-title">
                <span>1</span>
                <h3>输入现金入住信息</h3>
              </div>
              <div className="field-grid">
                <label>
                  <span>结算币种</span>
                  <select
                    onChange={(event) =>
                      handleCurrencyChange(event.target.value as CurrencyCode)
                    }
                    value={currencyCode}
                  >
                    {currencyOptions.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.label} · {currency.code}
                      </option>
                    ))}
                  </select>
                  <small>
                    不改写酒店价格；每万分价值会按参考汇率换算
                  </small>
                </label>
                <label>
                  <span>现金总价（{currencyCode}）</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setCashPrice(Number(event.target.value))
                    }
                    type="number"
                    value={cashPrice}
                  />
                </label>
                <label>
                  <span>不计分金额（{currencyCode}）</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setIneligibleSpend(Number(event.target.value))
                    }
                    type="number"
                    value={ineligibleSpend}
                  />
                  <small>例如多数税费、服务费和第三方费用</small>
                </label>
                <label>
                  <span>入住晚数</span>
                  <input
                    min="1"
                    onChange={(event) => setNights(Number(event.target.value))}
                    step="1"
                    type="number"
                    value={nights}
                  />
                </label>
                <label>
                  <span>1 美元约等于多少 {currencyCode}</span>
                  <input
                    min="0.0001"
                    onChange={(event) =>
                      setExchangeRate(Number(event.target.value))
                    }
                    step="0.0001"
                    type="number"
                    value={exchangeRate}
                  />
                  <small>参考值可以按实际账单汇率修改</small>
                </label>
                <label>
                  <span>品牌基础积分倍率</span>
                  <select
                    onChange={(event) => setBaseRate(Number(event.target.value))}
                    value={baseRate}
                  >
                    <option value={10}>常规万豪品牌 · 10×（含艾美）</option>
                    <option value={5}>部分长住及精选品牌 · 5×</option>
                    <option value={4}>StudioRes · 4×</option>
                  </select>
                </label>
              </div>
              <div className="rate-reference" role="note">
                <strong>参考汇率日期：{EXCHANGE_RATE_REFERENCE_DATE}</strong>
                <span>
                  非实时数据 · 1 USD ≈ {exchangeRate} {currencyCode} · 可手动修改
                </span>
                <a
                  href={EXCHANGE_RATE_SOURCE_URL}
                  rel="noreferrer"
                  target="_blank"
                >
                  查看欧洲央行来源
                </a>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-title">
                <span>2</span>
                <h3>加入信用卡与活动</h3>
              </div>
              <div className="field-grid">
                <label>
                  <span>会员等级</span>
                  <select
                    onChange={(event) =>
                      setMemberTier(event.target.value as MemberTier)
                    }
                    value={memberTier}
                  >
                    {Object.entries(memberTiers).map(([value, config]) => (
                      <option key={value} value={value}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>信用卡倍率（Brilliant 为 6×）</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setCardMultiplier(Number(event.target.value))
                    }
                    step="0.1"
                    type="number"
                    value={cardMultiplier}
                  />
                </label>
                <label>
                  <span>欢迎积分</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setWelcomePoints(Number(event.target.value))
                    }
                    type="number"
                    value={welcomePoints}
                  />
                </label>
                <label>
                  <span>额外活动积分</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setPromotionalPoints(Number(event.target.value))
                    }
                    type="number"
                    value={promotionalPoints}
                  />
                </label>
                <label>
                  <span>每万分价值（{currencyCode}）</span>
                  <input
                    min="1"
                    onChange={(event) =>
                      setPointValuation(Number(event.target.value))
                    }
                    type="number"
                    value={pointValuation}
                  />
                </label>
              </div>
            </div>
          </form>

          <aside className="calculation-result" aria-live="polite">
            <p className="step-label">ESTIMATED RESULT</p>
            <h3>
              {rebateResult?.isNetReturn
                ? "预计净回报"
                : "预计有效入住成本"}
            </h3>
            {calculatorError || !rebateResult ? (
              <div className="calculator-error" role="alert">
                <strong>暂时无法计算</strong>
                <p>{calculatorError || "请输入有效的计算数据。"}</p>
              </div>
            ) : (
              <>
                <strong>
                  {formatCurrencyAmount(
                    Math.abs(rebateResult.netStayCost),
                    currencyCode,
                  )}
                </strong>
                <p>
                  {rebateResult.isNetReturn
                    ? `积分估值比现金总价高 ${formatCurrencyAmount(
                        Math.abs(rebateResult.netStayCost),
                        currencyCode,
                      )}`
                    : `现金价 ${formatCurrencyAmount(
                        cashPrice,
                        currencyCode,
                      )} − 积分回血 ${formatCurrencyAmount(
                        rebateResult.rebateValue,
                        currencyCode,
                      )}`}
                </p>

                <dl className="result-metrics">
                  <div>
                    <dt>合资格消费</dt>
                    <dd>
                      {formatCurrencyAmount(
                        rebateResult.eligibleSpend,
                        currencyCode,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>每晚有效成本</dt>
                    <dd>
                      {formatCurrencyAmount(
                        rebateResult.netCostPerNight,
                        currencyCode,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>回血比例</dt>
                    <dd>{rebateResult.rebatePercentage}%</dd>
                  </div>
                </dl>

                <dl className="breakdown-list">
                  <div>
                    <dt>基础积分</dt>
                    <dd>{formatPoints(rebateResult.basePoints)}</dd>
                  </div>
                  <div>
                    <dt>会员等级加成</dt>
                    <dd>{formatPoints(rebateResult.eliteBonusPoints)}</dd>
                  </div>
                  <div>
                    <dt>信用卡积分</dt>
                    <dd>{formatPoints(rebateResult.cardPoints)}</dd>
                  </div>
                  <div>
                    <dt>欢迎积分</dt>
                    <dd>{formatPoints(rebateResult.welcomePoints)}</dd>
                  </div>
                  <div>
                    <dt>活动积分</dt>
                    <dd>{formatPoints(rebateResult.promotionalPoints)}</dd>
                  </div>
                  <div className="total-row">
                    <dt>预计赚取总积分</dt>
                    <dd>{formatPoints(rebateResult.totalPoints)} 分</dd>
                  </div>
                </dl>

                <div className="formula-card">
                  <span>计算方法</span>
                  <code>
                    {formatPoints(rebateResult.totalPoints)} ÷ 10,000 ×{" "}
                    {formatCurrencyAmount(pointValuation, currencyCode)} ={" "}
                    {formatCurrencyAmount(
                      rebateResult.rebateValue,
                      currencyCode,
                    )}
                  </code>
                </div>
                <small className="refund-disclaimer">
                  积分回血不是现金退款；入住时仍需支付完整现金总价。不同品牌、税费、汇率和促销规则会影响最终入账积分。
                </small>
              </>
            )}
          </aside>
        </div>

        <section className="index-placeholder">
          <div>
            <p className="step-label">FUTURE DATA MODULE</p>
            <h3>StayWorth Index · 每万分参考价</h3>
            <p>
              未来将基于多个代表城市与酒店，展示每日中位数、波动区间、样本量和更新时间。
            </p>
          </div>
          <span>研究中</span>
        </section>
      </section>

      <footer>
        <p>
          StayWorth 低保真原型 · 数据仅用于验证产品流程，不构成预订或兑换建议。
        </p>
        <p>Independent project · Not affiliated with Marriott International.</p>
      </footer>
    </main>
  );
}
