"use client";

import { useSyncExternalStore } from "react";
import {
  THEME_OPTIONS,
  applyTheme,
  readThemePreference,
  subscribeTheme,
  type ThemePreference,
} from "../../lib/theme";

/**
 * 三态主题切换：跟随系统 / 浅色 / 深色。
 * 状态不只靠颜色表达（每个选项都有文字），按钮带 aria-pressed，
 * 触控目标 44×28（桌面 ≥28px，移动由 .theme-toggle 撑到 44px 高）。
 */
export function ThemeToggle() {
  // 首屏由内联脚本处理；控件状态直接来自外部存储，避免 effect 里 setState
  const preference = useSyncExternalStore<ThemePreference>(
    subscribeTheme,
    readThemePreference,
    () => "system",
  );

  function choose(next: ThemePreference) {
    applyTheme(next);
  }

  return (
    <div aria-label="外观" className="theme-toggle" role="group">
      {THEME_OPTIONS.map((option) => (
        <button
          aria-pressed={preference === option.id}
          key={option.id}
          onClick={() => choose(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
