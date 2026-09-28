"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { InputField } from "../ui/InputField";
import { SurfaceCard } from "../ui/SurfaceCard";
import type { SearchFilters, TierFilter } from "../../types/hotel";
import { cityPanel } from "../../data/city-panel.ts";

/**
 * 覆盖范围提示由面板生成，避免加城市后文案忘记同步。
 * 面板里每个城市都能用中文名、英文名或代号搜索（服务端按三者匹配）。
 */
const cityHint =
  `已接入每日采样：${cityPanel.slice(0, 6).map((city) => city.nameZh).join(" / ")}` +
  ` 等 ${cityPanel.length} 个城市，输入中文名、英文名或代号均可`;

const tierOptions: TierFilter[] = [
  "全部等级",
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
];

const travelerOptions = ["1 位旅客", "2 位旅客", "3 位旅客", "4 位及以上"];

export type BookingDraft = {
  /** 当前快照不区分入住人数，这里先如实记录用户意图。 */
  travelers: number;
  /** true 表示这次更关心积分兑换那一侧。 */
  usePoints: boolean;
};

type BookingPanelProps = {
  filters: SearchFilters;
  invalidField: "city" | "checkIn" | "checkOut" | null;
  validationError: string;
  isLoading: boolean;
  onFiltersChange: (filters: SearchFilters) => void;
  onSearch: (filters: SearchFilters, draft: BookingDraft) => void;
};

/**
 * 嵌入式预订面板（内容层，近实心高对比面板，不用玻璃）。
 *
 * 排版照 iOS「嵌入式分组」：字段没有四周硬边框，只有底色与圆角，
 * Label 在上（0.75rem）、Value 在下（1.125rem 粗体），聚焦时整行加深。
 * 字段顺序仍是旅行直觉顺序，开关与主操作单独成行，不为了视觉节奏打乱填写习惯。
 *
 * 状态归属：行程字段由页面级 useState 持有、面板回写，结果区与空状态共用同一份条件；
 * 出行人数与积分开关属于面板自己的状态。
 */
export function BookingPanel({
  filters,
  invalidField,
  validationError,
  isLoading,
  onFiltersChange,
  onSearch,
}: BookingPanelProps) {
  const [travelers, setTravelers] = useState(2);
  const [usePoints, setUsePoints] = useState(true);

  function update(patch: Partial<SearchFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (validationError) return;
    onSearch(filters, { travelers, usePoints });
  }

  return (
    <SurfaceCard
      as="form"
      className="booking-panel"
      noValidate
      onSubmit={handleSubmit}
      tone="panel"
    >
      <div className="booking-head">
        <h2 className="booking-title">预订条件</h2>
        <p className="booking-note">
          快照不区分入住人数，人数只记录出行规模，不参与价格筛选。
        </p>
      </div>

      <div className="search-form">
        <InputField
          className="booking-field"
          hint={cityHint}
          hintId="city-search-hint"
          id="booking-destination"
          invalid={invalidField === "city"}
          label="城市或目的地"
        >
          <input
            aria-describedby={
              invalidField === "city"
                ? "city-search-hint search-validation-error"
                : "city-search-hint"
            }
            aria-invalid={invalidField === "city" || undefined}
            id="booking-destination"
            onChange={(event) => update({ city: event.target.value })}
            placeholder="例如：香港 / Hong Kong"
            type="text"
            value={filters.city}
          />
        </InputField>

        <InputField
          className="booking-field"
          id="booking-check-in"
          invalid={invalidField === "checkIn"}
          label="入住日期"
        >
          <input
            aria-describedby={
              invalidField === "checkIn" ? "search-validation-error" : undefined
            }
            aria-invalid={invalidField === "checkIn" || undefined}
            id="booking-check-in"
            onChange={(event) => update({ checkIn: event.target.value })}
            type="date"
            value={filters.checkIn}
          />
        </InputField>

        <InputField
          className="booking-field"
          id="booking-check-out"
          invalid={invalidField === "checkOut"}
          label="退房日期"
        >
          <input
            aria-describedby={
              invalidField === "checkOut" ? "search-validation-error" : undefined
            }
            aria-invalid={invalidField === "checkOut" || undefined}
            id="booking-check-out"
            onChange={(event) => update({ checkOut: event.target.value })}
            type="date"
            value={filters.checkOut}
          />
        </InputField>

        <InputField
          className="booking-field"
          controlType="select"
          id="booking-tier"
          label="品牌层级"
        >
          <select
            id="booking-tier"
            onChange={(event) =>
              update({ tier: event.target.value as TierFilter })
            }
            value={filters.tier}
          >
            {tierOptions.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </InputField>

        <InputField
          className="booking-field"
          controlType="select"
          id="booking-travelers"
          label="出行人数"
        >
          <select
            id="booking-travelers"
            onChange={(event) => setTravelers(Number(event.target.value))}
            value={travelers}
          >
            {travelerOptions.map((option, index) => (
              <option key={option} value={index + 1}>
                {option}
              </option>
            ))}
          </select>
        </InputField>

        <label className="booking-toggle" htmlFor="booking-use-points">
          <input
            checked={usePoints}
            id="booking-use-points"
            onChange={(event) => setUsePoints(event.target.checked)}
            role="switch"
            type="checkbox"
          />
          <span className="booking-toggle-text">
            <strong>使用万豪旅享家 Bonvoy 积分（Points）兑换</strong>
            <small>
              {usePoints
                ? "结果优先按每万分兑换价值排序"
                : "结果优先按现金总价排序"}
            </small>
          </span>
        </label>

        <button
          aria-label="搜索匹配酒店"
          className="primary-button search-button booking-submit"
          disabled={Boolean(validationError) || isLoading}
          type="submit"
        >
          {isLoading ? "正在查询…" : "搜索匹配酒店"}
        </button>
      </div>

      {validationError ? (
        <p className="validation-message" id="search-validation-error" role="alert">
          {validationError}
        </p>
      ) : null}

      <p className="booking-foot">
        价格来自人工维护的示例快照，不是实时库存；每一行都会显示来源与快照日期。
      </p>
    </SurfaceCard>
  );
}
