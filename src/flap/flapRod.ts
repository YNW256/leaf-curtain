// 下片 = 一根挂在中轴上的硬杆（一端固定的复摆）。不 import 别的文件，方便单独拿 node 跑着调。
// 角度 θ：0 = 垂直挂着、靠在后面那摞片上；往观众这边翘为正；约 176° = 被吹到上面、靠在上面那摞片的前面。
// 单位：弧度、帧（60 fps）。
//   重力：均匀的板绕一端转，θ'' = −(3g / 2L)·sin θ。下片长约 6 cm → 小角度来回一次约 0.4 秒（24 帧）。
//        自然落下是"起手慢、越落越快、到最低点最快"，然后拍在后面那摞片上。
//   风：板受的风力 ∝ 相对风速²；板越翘，迎风的分量越小（×cos²θ）——稳定的风只能把它吹到一个角度，
//        翘得多高看风多大；风忽大忽小它就跟着扑。板自己在动时相对风速变小（自带阻尼）。
//        翘到接近水平时，板伸进了外面更快、更乱的风里，还会被往上掀（迎风分量不低于 .5）；
//        所以一阵够猛、够久的风能把轻一点的片吹过 90°，过了 90° 风又把它往上推，靠住上面那摞片。
//   挡位：落回 0° 拍在后面那摞片上，弹一下（恢复系数 .25）；冲到顶上靠住（恢复系数 .15）。
//   在顶上：重力几乎为零（不稳定平衡），风一小，它先停一下，再越落越快地落回来。

export const ROD = {w0sq: .068, kw: .058, b: .3, gMin: .5, fric: .02, top: 176 * Math.PI / 180, eBottom: .25, eTop: .15};

/** 逐帧的 θ（度）。wind(t)：t 帧时吹在这片上的风（1 = 强风，稳定时约翘 35°）；k：这片轻重（越大越容易吹起，可以随帧变）；
 *  busy：在翻的时段（不吹、摆归零）；start：从第几帧开始算（之前当作静止，只渲后面一段时省时间） */
export const simRod = (wind: (t: number) => number, frames: number, k: number | ((f: number) => number) = 1, busy: [number, number][] = [], start = 0) => {
  const out: number[] = [];
  let a = 0, w = 0;
  const SUB = 8, dt = 1 / SUB;
  for (let f = 0; f < frames; f++) {
    if (f < start || busy.some(([b0, b1]) => f >= b0 && f <= b1)) { a = w = 0; out.push(0); continue; }
    const kk = typeof k === 'number' ? k : k(f);
    for (let s = 0; s < SUB; s++) {
      const W = wind(f + s * dt);
      const vr = W * Math.max(ROD.gMin, Math.abs(Math.cos(a))) - ROD.b * w;
      const acc = kk * ROD.kw * vr * Math.abs(vr) - ROD.w0sq * Math.sin(a) - ROD.fric * w;
      w += acc * dt; a += w * dt;
      if (a < 0) { a = 0; w = w < -.01 ? -w * ROD.eBottom : 0; }
      if (a > ROD.top) { a = ROD.top; w = w > .01 ? -w * ROD.eTop : 0; }
    }
    out.push(a * 180 / Math.PI);
  }
  return out;
};

/**
 * 正面怎么画：θ 不到 90° 时就是下片被吹起的角度；吹过 90° 的那一段换成两次"翻"——往上（倒翻，到顶靠住）、
 * 落回（正翻，含回弹），角度都用物理算出来的。up/down 是两次翻开始的帧，end 是落回后停稳的帧。
 * 过了 90° 又没上到顶就掉回来的（极少），不算，正面按 89° 画。
 */
export type OverTop = {up: number; upCurve: number[]; down: number; downCurve: number[]; end: number};
export const overTops = (th: number[]): OverTop[] => {
  const S = 180 / (ROD.top * 180 / Math.PI);          // 物理里顶上靠住是 176°，正面按 180° 画
  const out: OverTop[] = [];
  let i = 0;
  while (i < th.length) {
    if (th[i] <= 89) { i++; continue; }
    const up = i;
    let top = up;
    while (top < th.length && th[top] < 175.5 && th[top] > 80) top++;
    if (top >= th.length || th[top] <= 80) { i = top + 1; continue; }
    let down = top + 2;
    while (down < th.length && th[down] >= 175) down++;
    let end = Math.min(th.length - 1, down + 20);
    while (end < th.length - 6 && !th.slice(end, end + 6).every((x) => x < .5)) end++;
    out.push({up, upCurve: [...th.slice(up, top + 1).map((x) => x * S), 180], down, downCurve: th.slice(down, end).map((x) => 180 - x * S), end});
    i = end;
  }
  return out;
};

/** 下片被吹起的角度（正面用）：吹过头那几段由两次"翻"来画，这里归零 */
export const windAngles = (th: number[], ots: OverTop[]) =>
  th.map((x, f) => (ots.some((o) => f >= o.up && f < o.end) ? 0 : Math.min(89, x)));

/**
 * 一次正常的翻（翻牌模块的角度约定：0 立着、180 垂下，回弹时略小于 180）：卡扣松开前上片先往前轻轻一顶；
 * 松开时它已经被字鼓带过了一点（from 度）、还带着一点推力（push）；之后就是同一根硬杆在重力下倒下来——
 * 起手慢、越落越快，拍在下面那摞片上。拍得越重损失越多：第一下只弹起十几度，后面几下碰得轻、弹得相对多，
 * 下片就这样轻轻地晃几下（约一秒）才停。
 */
const bounceE = (v: number) => .15 + .6 * Math.exp(-v / .12);
const FLIP_CACHE = new Map<string, number[]>();
export const flipCurve = (push = .06, from = 8) => {
  const key = `${push.toFixed(3)}|${from.toFixed(1)}`;
  if (FLIP_CACHE.has(key)) return FLIP_CACHE.get(key)!;
  const out = [-1.2, -2.6, -2.2, -.8];
  let a = from * Math.PI / 180, w = push, calm = 0, hit = false;
  for (let f = 0; f < 150; f++) {
    for (let s = 0; s < 8; s++) {
      w += (ROD.w0sq * Math.sin(a) - (hit ? .015 : ROD.fric) * w) / 8; a += w / 8;
      if (a > Math.PI) { a = Math.PI; hit = true; w = w > .003 ? -w * bounceE(w) : 0; }
    }
    out.push(a * 180 / Math.PI);
    if (hit && Math.PI - a < .004 && Math.abs(w) < .003) { if (++calm > 2) break; } else calm = 0;
  }
  out.push(180);
  FLIP_CACHE.set(key, out);
  return out;
};
