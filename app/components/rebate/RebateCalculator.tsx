"use client";

import { useState } from "react";
import {
  BRAND_RULE_REFERENCE_DATE,
  BRAND_RULE_SOURCE_URL,
  getMarriottBrandRule,
  marriottBrandRules,
} from "../../lib/brand-points";
import {
  CARD_RULE_REFERENCE_DATE,
  NO_CARD_ID,
  getMarriottCard,
  marriottCards,
} from "../../lib/cards";
import {
  EXCHANGE_RATE_REFERENCE_DATE,
  EXCHANGE_RATE_SOURCE_URL,
  convertCurrencyAmount,
  currencyOptions,
  type CurrencyCode,
  formatCurrencyAmount,
  getCurrencyConfig,
} from "../../lib/currencies";
import { formatPoints } from "../../lib/format";
import {
  CALCULATOR_LIMITS,
  parseNumericInput,
} from "../../lib/numeric-input";
import { calculateRebateEstimate } from "../../lib/points";

const memberTiers = {
  Member: { label: "普通会员", bonusRate: 0 },
  Silver: { label: "银卡 · 10% 加成", bonusRate: 0.1 },
  Gold: { label: "金卡 · 25% 加成", bonusRate: 0.25 },
  Platinum: { label: "白金卡 · 50% 加成", bonusRate: 0.5 },
  Titanium: { label: "钛金卡 · 75% 加成", bonusRate: 0.75 },
  Ambassador: { label: "大使 · 75% 加成", bonusRate: 0.75 },
} as const;

type MemberTier = keyof typeof memberTiers;

type RebateCalculatorProps = {
  hidden?: boolean;
};

export function RebateCalculator({ hidden = false }: RebateCalculatorProps) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>("CNY");
  const [cashPriceInput, setCashPriceInput] = useState("1235");
  const [ineligibleSpendInput, setIneligibleSpendInput] = useState("235");
  const [nightsInput, setNightsInput] = useState("1");
  const [exchangeRateInput, setExchangeRateInput] = useState(
    String(getCurrencyConfig("CNY").unitsPerUsd),
  );
  const [brandId, setBrandId] = useState("le-meridien");
  const [memberTier, setMemberTier] = useState<MemberTier>("Platinum");
  const [cardId, setCardId] = useState("us-amex-brilliant");
  const [includeCardStayBonus, setIncludeCardStayBonus] = useState(false);
  const [welcomePointsInput, setWelcomePointsInput] = useState("1000");
  const [promotionalPointsInput, setPromotionalPointsInput] = useState("0");
  const [pointValuationInput, setPointValuationInput] = useState("400");

  const cashPrice = parseNumericInput(cashPriceInput);
  const ineligibleSpend = parseNumericInput(ineligibleSpendInput);
  const nights = parseNumericInput(nightsInput);
  const exchangeRate = parseNumericInput(exchangeRateInput);
  const welcomePoints = parseNumericInput(welcomePointsInput);
  const promotionalPoints = parseNumericInput(promotionalPointsInput);
  const pointValuation = parseNumericInput(pointValuationInput);
  const selectedBrand = getMarriottBrandRule(brandId);
  const selectedCard = getMarriottCard(cardId);
  const cardCurrencyUnitsPerUsd = selectedCard
    ? getCurrencyConfig(selectedCard.earningCurrency).unitsPerUsd
    : 1;

  const calculatorError =
    !Number.isFinite(cashPrice) || cashPrice <= 0
      ? "请输入大于 0 的现金总价。"
      : cashPrice > CALCULATOR_LIMITS.cashPrice.max
        ? "现金总价不能超过 100,000,000。"
        : !Number.isFinite(ineligibleSpend) || ineligibleSpend < 0
          ? "请输入不小于 0 的不计分金额。"
          : ineligibleSpend > CALCULATOR_LIMITS.ineligibleSpend.max
            ? "不计分金额不能超过 100,000,000。"
            : ineligibleSpend > cashPrice
              ? "不计分金额不能高于现金总价。"
              : !Number.isInteger(nights) || nights <= 0
                ? "请输入大于 0 的整数晚数。"
                : nights > CALCULATOR_LIMITS.nights.max
                  ? "入住晚数不能超过 365 晚。"
                  : !Number.isFinite(exchangeRate) || exchangeRate <= 0
                    ? "请输入大于 0 的汇率。"
                    : exchangeRate > CALCULATOR_LIMITS.exchangeRate.max
                      ? "汇率不能超过 1,000,000。"
                      : !Number.isFinite(welcomePoints) || welcomePoints < 0
                        ? "请输入不小于 0 的欢迎积分。"
                        : welcomePoints > CALCULATOR_LIMITS.points.max
                          ? "欢迎积分不能超过 100,000,000。"
                          : !Number.isFinite(promotionalPoints) ||
                              promotionalPoints < 0
                            ? "请输入不小于 0 的活动积分。"
                            : promotionalPoints > CALCULATOR_LIMITS.points.max
                              ? "活动积分不能超过 100,000,000。"
                              : !Number.isFinite(pointValuation) ||
                                  pointValuation <= 0
                                ? "请输入大于 0 的每万分价值。"
                                : pointValuation >
                                    CALCULATOR_LIMITS.pointValuation.max
                                  ? "每万分价值不能超过 1,000,000。"
                                  : "";

  const rebateResult = calculatorError
    ? null
    : calculateRebateEstimate({
        cashPrice,
        ineligibleSpend,
        nights,
        exchangeRate,
        baseRate: selectedBrand.baseRate,
        eliteBonusRate: selectedBrand.eliteBonusEligible
          ? memberTiers[memberTier].bonusRate
          : 0,
        cardPointsPerCurrencyUnit:
          selectedCard?.pointsPerCurrencyUnit ?? 0,
        cardCurrencyUnitsPerUsd,
        cardStayBonusPoints: includeCardStayBonus
          ? (selectedCard?.stayBonusPoints ?? 0)
          : 0,
        welcomePoints,
        promotionalPoints,
        valuePerTenThousand: pointValuation,
      });

  function handleCurrencyChange(nextCurrency: CurrencyCode) {
    const currentPointValuation = parseNumericInput(pointValuationInput);

    if (Number.isFinite(currentPointValuation)) {
      setPointValuationInput(
        String(
          convertCurrencyAmount(
            currentPointValuation,
            currencyCode,
            nextCurrency,
          ),
        ),
      );
    }
    setCurrencyCode(nextCurrency);
    setExchangeRateInput(
      String(getCurrencyConfig(nextCurrency).unitsPerUsd),
    );
  }

  return (
    <section
      aria-labelledby="rebate-title"
      className="module-panel"
      hidden={hidden}
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
                <small>不改写酒店价格；每万分价值会按参考汇率换算</small>
              </label>
              <label>
                <span>现金总价（{currencyCode}）</span>
                <input
                  max={CALCULATOR_LIMITS.cashPrice.max}
                  min={CALCULATOR_LIMITS.cashPrice.min}
                  onChange={(event) => setCashPriceInput(event.target.value)}
                  type="number"
                  value={cashPriceInput}
                />
              </label>
              <label>
                <span>不计分金额（{currencyCode}）</span>
                <input
                  max={CALCULATOR_LIMITS.ineligibleSpend.max}
                  min={CALCULATOR_LIMITS.ineligibleSpend.min}
                  onChange={(event) =>
                    setIneligibleSpendInput(event.target.value)
                  }
                  type="number"
                  value={ineligibleSpendInput}
                />
                <small>例如多数税费、服务费和第三方费用</small>
              </label>
              <label>
                <span>入住晚数</span>
                <input
                  max={CALCULATOR_LIMITS.nights.max}
                  min={CALCULATOR_LIMITS.nights.min}
                  onChange={(event) => setNightsInput(event.target.value)}
                  step="1"
                  type="number"
                  value={nightsInput}
                />
              </label>
              <label>
                <span>1 美元约等于多少 {currencyCode}</span>
                <input
                  max={CALCULATOR_LIMITS.exchangeRate.max}
                  min={CALCULATOR_LIMITS.exchangeRate.min}
                  onChange={(event) =>
                    setExchangeRateInput(event.target.value)
                  }
                  step="0.0001"
                  type="number"
                  value={exchangeRateInput}
                />
                <small>参考值可以按实际账单汇率修改</small>
              </label>
              <label>
                <span>酒店品牌</span>
                <select
                  onChange={(event) => setBrandId(event.target.value)}
                  value={brandId}
                >
                  {marriottBrandRules.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <small>
                  系统自动应用 {selectedBrand.baseRate}× 基础积分规则
                  {!selectedBrand.eliteBonusEligible && "，且不计算等级加成"}
                </small>
              </label>
            </div>
            <div className="brand-reference" role="note">
              <div>
                <strong>
                  {selectedBrand.name} · 自动 {selectedBrand.baseRate}×
                </strong>
                <span>
                  {selectedBrand.note ?? "会员等级加成会根据该品牌的基础积分计算。"}
                </span>
              </div>
              <a href={BRAND_RULE_SOURCE_URL} rel="noreferrer" target="_blank">
                查看 Marriott 官方规则
              </a>
              <small>品牌规则核对日期：{BRAND_RULE_REFERENCE_DATE}</small>
            </div>
            <div className="rate-reference" role="note">
              <strong>参考汇率日期：{EXCHANGE_RATE_REFERENCE_DATE}</strong>
              <span>
                非实时数据 · 1 USD ≈ {exchangeRateInput || "—"} {currencyCode}{" "}
                · 可手动修改
              </span>
              <a href={EXCHANGE_RATE_SOURCE_URL} rel="noreferrer" target="_blank">
                查看欧洲央行来源
              </a>
            </div>
            <div className="price-integration-note" role="note">
              <strong>实时房价尚未接入</strong>
              <span>
                未来的正式数据会拆成税前房费、税费及服务费、税后总价和币种，再自动填入计算器。当前仍需手动输入，避免把未经授权的万豪页面抓取伪装成稳定接口。
              </span>
              <a
                href="https://www.marriott.com/marriott/affiliateprogramfaq.mi"
                rel="noreferrer"
                target="_blank"
              >
                查看万豪官方合作渠道
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
                <span>信用卡选择</span>
                <select
                  onChange={(event) => {
                    setCardId(event.target.value);
                    setIncludeCardStayBonus(false);
                  }}
                  value={cardId}
                >
                  <option value={NO_CARD_ID}>不使用万豪联名信用卡</option>
                  {marriottCards.map((card) => (
                    <option key={card.id} value={card.id}>
                      {card.optionLabel}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>欢迎积分</span>
                <input
                  max={CALCULATOR_LIMITS.points.max}
                  min={CALCULATOR_LIMITS.points.min}
                  onChange={(event) =>
                    setWelcomePointsInput(event.target.value)
                  }
                  type="number"
                  value={welcomePointsInput}
                />
              </label>
              <label>
                <span>额外活动积分</span>
                <input
                  max={CALCULATOR_LIMITS.points.max}
                  min={CALCULATOR_LIMITS.points.min}
                  onChange={(event) =>
                    setPromotionalPointsInput(event.target.value)
                  }
                  type="number"
                  value={promotionalPointsInput}
                />
              </label>
              <label>
                <span>每万分价值（{currencyCode}）</span>
                <input
                  max={CALCULATOR_LIMITS.pointValuation.max}
                  min={CALCULATOR_LIMITS.pointValuation.min}
                  onChange={(event) =>
                    setPointValuationInput(event.target.value)
                  }
                  type="number"
                  value={pointValuationInput}
                />
              </label>
            </div>
            <div className="card-reference" role="note">
              {selectedCard ? (
                <>
                  <div>
                    <strong>
                      {selectedCard.segment} · {selectedCard.earningDescription}
                    </strong>
                    <span>{selectedCard.note}</span>
                    <small>
                      信用卡积分按发卡国家的计分币种换算；跨币种交易仅为参考估算，实际以发卡行入账为准。
                    </small>
                    {selectedCard.stayBonusPoints > 0 && (
                      <label className="card-bonus-confirmation">
                        <input
                          checked={includeCardStayBonus}
                          onChange={(event) =>
                            setIncludeCardStayBonus(event.target.checked)
                          }
                          type="checkbox"
                        />
                        <span>
                          本次符合万豪直接预订的付费入住条件，计入{" "}
                          {formatPoints(selectedCard.stayBonusPoints)} 分
                        </span>
                      </label>
                    )}
                  </div>
                  <a href={selectedCard.sourceUrl} rel="noreferrer" target="_blank">
                    查看官方规则
                  </a>
                </>
              ) : (
                <div>
                  <strong>未计入信用卡积分</strong>
                  <span>仅计算酒店基础积分、会员等级加成及手动填写的额外积分。</span>
                </div>
              )}
              <small>卡片规则核对日期：{CARD_RULE_REFERENCE_DATE}</small>
            </div>
          </div>
        </form>

        <aside className="calculation-result" aria-live="polite">
          <p className="step-label">ESTIMATED RESULT</p>
          <h3>
            {rebateResult?.isNetReturn ? "预计净回报" : "预计有效入住成本"}
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
                  {formatCurrencyAmount(rebateResult.rebateValue, currencyCode)}
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
  );
}
