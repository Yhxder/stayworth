"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { SurfaceCard } from "../ui/SurfaceCard";
import { InputField } from "../ui/InputField";
import type { SearchFilters, TierFilter } from "../../types/hotel";

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
 * 流体玻璃预订面板。
 *
 * 字段顺序固定为旅行直觉顺序（目的地、入住、退房、品牌层级、人数、积分开关），
 * 不为了视觉节奏打乱操作习惯。
 *
 * 状态归属：行程字段（目的地、入住、退房、品牌层级）由页面级 useState 统一持有，
 * 面板每次输入都回写这份状态，这样结果区、空状态和「用这段日期重新搜索」永远
 * 指向同一份条件，不会出现面板显示旧日期而结果用新日期的错位。出行人数与积分
 * 兑换开关只影响本次提交，作为面板自己的 useState 状态。
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
      </div>

      <div className="search-form">
        <InputField
          className="booking-field"
          hint="当前支持香港 / Hong Kong / HK 与上海 / Shanghai / SHA"
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

        <InputField className="booking-field" id="booking-tier" label="品牌层级">
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

        <label
          className="booking-toggle field-control"
          htmlFor="booking-use-points"
        >
          <input
            checked={usePoints}
            id="booking-use-points"
            onChange={(event) => setUsePoints(event.target.checked)}
            role="switch"
            type="checkbox"
          />
          <span className="booking-toggle-text">
            <strong>Bonvoy 积分兑换</strong>
            <small>{usePoints ? "优先按每万分兑换价值排序" : "优先按现金总价排序"}</small>
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
        价格来自人工维护的示例快照，不是实时库存；示例快照不区分入住人数，人数这项先记录你的出行规模。
      </p>
    </SurfaceCard>
  );
}
