/**
 * 明暗主题：默认跟随系统，用户可在页头三态切换里覆盖。
 *
 * dark-mode.md 反对应用内独立的「外观开关」，正确形态是跟随系统的
 * `prefers-color-scheme`，只给一个可选的覆盖入口。所以：
 * - 默认（"system"）= 不写 `data-theme`，由 CSS 的 color-scheme 决定；
 * - 覆盖（"light" / "dark"）= 写 `data-theme`，选择存 localStorage；
 * - 首屏不闪：`app/layout.tsx` 的内联脚本在样式生效前就把属性写好。
 */

export const THEME_STORAGE_KEY = "stayworth-theme";

export type ThemePreference = "system" | "light" | "dark";

export const THEME_OPTIONS: ReadonlyArray<{
  id: ThemePreference;
  label: string;
}> = [
  { id: "system", label: "跟随系统" },
  { id: "light", label: "浅色" },
  { id: "dark", label: "深色" },
];

/** 与 CSS 的 --surface-canvas 保持一致，用于浏览器界面色。 */
const CANVAS_COLOR: Record<"light" | "dark", string> = {
  light: "#f4f5f7",
  dark: "#08090c",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

const listeners = new Set<() => void>();

/** 外观是外部系统（localStorage + 系统偏好），用订阅的方式读，不用 effect 同步。 */
export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // 隐私模式下写不进去也不影响本次切换
  }

  for (const listener of listeners) listener();

  const followsSystem = preference === "system";
  const systemIsDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = followsSystem
    ? systemIsDark
      ? "dark"
      : "light"
    : preference;

  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.setAttribute("content", CANVAS_COLOR[resolved]);
  }
}

/** 内联脚本：在任何绘制之前把已保存的覆盖写进 <html>，消除首屏闪白闪黑。 */
export const THEME_INLINE_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(p==="light"||p==="dark"){document.documentElement.setAttribute("data-theme",p)}}catch(e){}})();`;
