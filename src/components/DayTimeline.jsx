import { fmt } from "../helpers";
import ClassCard from "./ClassCard";

const PX = 1.5; // pixels per minute

// Classes laid out on a time axis; overlapping classes share the row side by side.
export default function DayTimeline({ list, colorOf, outReason, onPick }) {
  if (!list.length) return null;
  const start = Math.floor(Math.min(...list.map((c) => c.start_min)) / 60) * 60;
  const end = Math.ceil(Math.max(...list.map((c) => c.end_min)) / 60) * 60;

  // Group into clusters of overlapping classes, then assign lanes inside each cluster.
  const placed = [];
  let cluster = [], clusterEnd = -1, lanes = [];
  const flush = () => { cluster.forEach((p) => { p.n = lanes.length; }); cluster = []; lanes = []; };
  for (const c of list) {
    if (c.start_min >= clusterEnd) { flush(); clusterEnd = -1; }
    let lane = lanes.findIndex((e) => e <= c.start_min);
    if (lane < 0) { lane = lanes.length; lanes.push(0); }
    lanes[lane] = c.end_min;
    clusterEnd = Math.max(clusterEnd, c.end_min);
    const p = { c, lane, n: 1 };
    cluster.push(p); placed.push(p);
  }
  flush();

  const hours = [];
  for (let m = start; m <= end; m += 60) hours.push(m);

  return (
    <div className="timeline" style={{ height: (end - start) * PX + 12 }}>
      {hours.map((m) => (
        <div key={m} className="tl-hour" style={{ top: (m - start) * PX }}><span>{fmt(m)}</span></div>
      ))}
      <div className="tl-lanes">
        {placed.map(({ c, lane, n }) => (
          <div
            key={c.id}
            className="tl-slot"
            style={{
              top: (c.start_min - start) * PX,
              height: Math.max((c.end_min - c.start_min) * PX - 4, 64),
              left: `calc(${lane} * (100% / ${n}))`,
              width: `calc(100% / ${n} - 8px)`,
            }}
          >
            <ClassCard cls={c} colorOf={colorOf} outReason={outReason} onClick={onPick ? () => onPick(c) : undefined} />
          </div>
        ))}
      </div>
    </div>
  );
}
