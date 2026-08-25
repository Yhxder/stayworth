const moneyFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 2,
});

const integerFormatter = new Intl.NumberFormat("zh-CN", {
  maximumFractionDigits: 0,
});

export function formatCny(value: number) {
  return `¥${moneyFormatter.format(value)}`;
}

export function formatPoints(value: number) {
  return integerFormatter.format(value);
}

export function formatSnapshotDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeZone: "Asia/Shanghai",
  }).format(new Date(value));
}
