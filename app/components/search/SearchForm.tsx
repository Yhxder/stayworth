"use client";

import type { FormEvent } from "react";
import type { SearchFilters, TierFilter } from "../../types/hotel";

const tierOptions: TierFilter[] = [
  "全部等级",
  "Luxury",
  "Premium",
  "Select",
  "Longer Stays",
  "Collections",
];

type SearchFormProps = {
  filters: SearchFilters;
  validationError: string;
  isLoading: boolean;
  onChange: (filters: SearchFilters) => void;
  onSearch: () => void;
};

export function SearchForm({
  filters,
  validationError,
  isLoading,
  onChange,
  onSearch,
}: SearchFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validationError) onSearch();
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <label>
        <span>城市或目的地</span>
        <input
          onChange={(event) =>
            onChange({ ...filters, city: event.target.value })
          }
          placeholder="例如：香港 / Hong Kong"
          value={filters.city}
        />
        <small>当前支持香港 / Hong Kong / HK 与上海 / Shanghai / SHA</small>
      </label>
      <label>
        <span>入住日期</span>
        <input
          onChange={(event) =>
            onChange({ ...filters, checkIn: event.target.value })
          }
          type="date"
          value={filters.checkIn}
        />
      </label>
      <label>
        <span>退房日期</span>
        <input
          onChange={(event) =>
            onChange({ ...filters, checkOut: event.target.value })
          }
          type="date"
          value={filters.checkOut}
        />
      </label>
      <label>
        <span>品牌层级</span>
        <select
          onChange={(event) =>
            onChange({
              ...filters,
              tier: event.target.value as TierFilter,
            })
          }
          value={filters.tier}
        >
          {tierOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </label>
      <button
        aria-label="搜索匹配酒店"
        className="primary-button search-button"
        disabled={Boolean(validationError) || isLoading}
        type="submit"
      >
        {isLoading ? "正在查询…" : "搜索匹配酒店"}
      </button>
      {validationError && (
        <p className="validation-message" role="alert">
          {validationError}
        </p>
      )}
    </form>
  );
}
