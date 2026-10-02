/**
 * 首屏背景的星点与连线。
 *
 * 用固定种子的线性同余发生器生成坐标，服务端与客户端算出的永远是同一组，
 * 不会出现水合不一致；只用 SVG 画，没有动画，成本可以忽略。
 */

const VIEW_WIDTH = 1440;
const VIEW_HEIGHT = 820;
const DOT_COUNT = 52;
const LINK_DISTANCE = 148;

function buildSky() {
  let seed = 20261002;
  const next = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  const dots = Array.from({ length: DOT_COUNT }, () => ({
    x: next() * VIEW_WIDTH,
    y: next() * VIEW_HEIGHT,
    r: 0.7 + next() * 1.5,
  }));

  const links: Array<[number, number, number]> = [];
  for (let i = 0; i < dots.length; i += 1) {
    for (let j = i + 1; j < dots.length; j += 1) {
      const distance = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
      if (distance < LINK_DISTANCE) links.push([i, j, distance]);
    }
  }

  return { dots, links };
}

const SKY = buildSky();

/**
 * 带标签的高亮节点。窄屏没有地球，这层节点网格就是首屏的背景，
 * 和 caylet.com 移动端那组 SWIFT / ITIN / CHASE 标签是同一个作用。
 *
 * 坐标要落在窄屏实际取景的横向区间里：viewBox 被 slice 裁切后，
 * 窄屏只看得见 x ≈ 511–929 这一段。
 */
const NODES = [
  { label: "香港", x: 600, y: 80 },
  { label: "东京", x: 880, y: 96 },
  { label: "新加坡", x: 560, y: 700 },
  { label: "伦敦", x: 872, y: 760 },
];

/** 星空底纹：越远的连线越淡。 */
export function HeroSky() {
  return (
    <svg
      aria-hidden="true"
      className="hero-sky"
      preserveAspectRatio="xMidYMid slice"
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
    >
      <g className="hero-sky-links">
        {SKY.links.map(([from, to, distance]) => {
          const a = SKY.dots[from];
          const b = SKY.dots[to];
          return (
            <line
              key={`${from}-${to}`}
              strokeOpacity={(1 - distance / LINK_DISTANCE) * 0.55}
              x1={a.x}
              x2={b.x}
              y1={a.y}
              y2={b.y}
            />
          );
        })}
      </g>
      <g className="hero-sky-dots">
        {SKY.dots.map((dot, index) => (
          <circle
            cx={dot.x}
            cy={dot.y}
            key={index}
            r={dot.r}
            style={{ opacity: 0.35 + (dot.r - 0.7) * 0.4 }}
          />
        ))}
      </g>
      <g className="hero-sky-nodes">
        {NODES.map((node) => (
          <g key={node.label}>
            <circle cx={node.x - 22} cy={node.y - 4} r={3.4} />
            <text textAnchor="middle" x={node.x + 8} y={node.y}>
              {node.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}
