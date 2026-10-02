export type ModuleName = "comparison" | "rebate" | "index";

const MODULES: Array<{
  id: ModuleName;
  label: string;
  hint: string;
  ariaLabel: string;
}> = [
  {
    id: "comparison",
    label: "酒店对比",
    hint: "现金价与积分价逐家对照",
    ariaLabel: "切换到酒店对比模块",
  },
  {
    id: "rebate",
    label: "积分回血",
    hint: "估算入住后赚回多少积分",
    ariaLabel: "切换到积分回血模块",
  },
  {
    id: "index",
    label: "每万分兑换价值",
    hint: "市场参考中位数与区间",
    ariaLabel: "切换到每万分兑换价值模块",
  },
];

type ModuleSwitcherProps = {
  activeModule: ModuleName;
  onChange: (module: ModuleName) => void;
};

/** 三个工具模块的切换条。 */
export function ModuleSwitcher({
  activeModule,
  onChange,
}: ModuleSwitcherProps) {
  return (
    <nav aria-label="主要功能" className="module-switcher">
      {MODULES.map((module) => (
        <button
          aria-label={module.ariaLabel}
          aria-pressed={activeModule === module.id}
          className={activeModule === module.id ? "is-active" : ""}
          key={module.id}
          onClick={() => onChange(module.id)}
          type="button"
        >
          <strong>{module.label}</strong>
          <small>{module.hint}</small>
        </button>
      ))}
    </nav>
  );
}
