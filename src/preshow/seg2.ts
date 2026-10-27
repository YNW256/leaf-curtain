// 开场前·第二段（90~150 秒 = 8:30 → 7:30）：下雨。
//   先是零星几滴：雨点打到哪一格，那一格就翻出一颗水滴、荡开一小圈涟漪（把周围的下片轻轻掀一下），过两三秒水滴"干了"翻回去。
//   大屏换成「沿途天气」：沿途六站的天气一级级变（微雨 → 小雨 → 中雨 → 大雨 → 暴雨）；广播「雨天路滑 注意脚下」。
//   雨量是一条连续往上涨的曲线（上限约每秒 28 滴）；雨大了水滴会顺着往下淌两三格。满墙都是水滴和交错的小涟漪；雨到最大时大屏被"冲"掉。
//   一道闪电从上劈到底（一串格子飞快翻白再翻回），整面墙跟着从落点闪白两下，落地处荡开一圈很大的雷声涟漪；雷声把落点附近几格吹翻、贴在上面，再一格格落回来。
//   8:00 整分报时（重庆话，全屏）：一把折叠伞撑开（白，用满九排）：一小捆 → 伞杆咔咔伸长 → 伞骨张开 → 伞面上「莫慌哈」，雨点打在伞上；
//   伞从两边往里收起来以后，底下才出「还有八分钟」。雨慢慢小了、停了；一阵风从左边吹过来，把墙上的水滴一路吹干。
//   放晴：一轮白太阳从底下一排排升到正中（没有脸，只有光），一批批短光束从太阳往外射到墙边、每批转半格（像在转、在往外喷），
//   光经过的格子下片被掀一下反光；底下「放晴啦」；最后太阳化成一道大白光，换到下一段。
import {P} from '../flap/windSim';
import {V} from '../theme';
import {FlapFace} from '../flap/FlapModule';
import {COLS, Ctx, WHITE, animate, blowOver, cellOf, face, icon, jit, r01, same, sec, wave} from './engine';
import {band, ticker} from './common';

/** 每秒下几滴：一条连续的曲线（一级级跳着涨会显得不自然），上限约 28 滴。
 *  零星几滴 → 越来越密 → 约 8:08 到顶，顶上有阵雨的起伏 → 撑伞前后慢慢小下去 → 收伞以后很快停 */
export const RAIN_PEAK = 28;
/** 音效要跟的几个时刻（秒）：闪电劈下来；伞开始撑、撑满、开始收、收好 */
export const RAIN_TIMES = {bolt: 112.05, umbrella: [121.5, 123.0, 124.6, 125.6]};
export const rate = (s: number) => {
  if (s < 90) return 0;
  if (s < 112) return .6 + (RAIN_PEAK - .6) * ((s - 90) / 22) ** 1.7;
  if (s < 119) return RAIN_PEAK * (1 + .16 * Math.sin((s - 112) * 1.9) * Math.sin((s - 112) * .7 + .4));
  if (s < 126) return RAIN_PEAK - (RAIN_PEAK - 7) * ((s - 119) / 7) ** .8;
  if (s < 129.5) return 7 - 6.5 * (s - 126) / 3.5;
  if (s < 130.5) return .5;
  return 0;
};
const BOLT: [number, number][] = [[1, 11], [2, 11], [2, 10], [3, 10], [4, 10], [4, 9], [5, 9], [6, 9], [6, 8], [7, 8], [8, 8]];
/** 雷声把这几格吹翻（背面是「轰」「隆」「哇」） */
const THUNDER: [number, number, string][] = [[6, 6, '轰'], [5, 11, '隆'], [7, 12, '哇']];
/** 字和伞柄：雨点不打 */
const ANNOUNCE: [number, number][] = [[3, 7], [3, 8], [3, 9], [6, 8], [7, 8], [7, 6], [8, 6], [8, 7], [8, 8]];
const HOOK: [number, number][] = [[7, 6], [8, 6], [8, 7], [8, 8]];
const SCALLOP = 'WW.WW.WWW.WW.WW';                                      // 伞沿：伞骨尖垂下来，伞骨之间凹进去（第 1~15 列）
/**
 * 折叠伞的样子：tip 是伞尖在第几排；s 是伞骨张开了多少（0 收着、1 撑满）。伞面从伞尖往下长 H 排，第 y 排半宽 w(y)：
 * 收着时是贴着伞杆的细长条，张开一点是细长的倒 V（帐篷），撑满是矮而宽的圆顶——帐篷和圆顶按 s 混合，按伞骨角度一帧帧算，不用几张图硬切。
 */
const umbrella = (tip: number, s: number, text: boolean) => {
  const m = new Map<number, FlapFace>(), W = face(' ', 'w');
  for (let r = Math.max(0, Math.ceil(tip)); r <= 7; r++) m.set(cellOf(r, 8), W);           // 伞杆
  HOOK.forEach(([r, c]) => m.set(cellOf(r, c), W));                                          // 伞柄的钩
  const H = 5.6 - s, Wd = .55 + 7 * s, blend = Math.min(1, s);
  for (let r = 0; r <= 6; r++) for (let c = 1; c <= 15; c++) {
    const y = r + .5 - tip; if (y <= 0 || y > H + .01) continue;
    const u = y / H, w = Wd * ((1 - blend) * u + blend * Math.sqrt(Math.max(0, 1 - (1 - u) ** 2)));
    if (Math.abs(c + .5 - 8.5) <= w + .3) m.set(cellOf(r, c), W);
  }
  if (s > .9) [...SCALLOP].forEach((ch, i) => { if (ch === 'W') m.set(cellOf(Math.round(tip + H + .4), 1 + i), W); });
  if (text) [...'莫慌哈'].forEach((ch, i) => m.set(cellOf(3, 7 + i), face(ch, 'w')));
  return m;
};

export const seg2 = ({sc, rf, rounds, puffs}: Ctx) => {
  // 时刻表换成「沿途天气」：表头墨绿「沿途天气」，第 2~7 排是沿途六站，右边一列天气跟着雨量一级级变：
  //   微雨 → 小雨 → 中雨 → 大雨 → 暴雨（大雨、暴雨是墨绿牌）。各站在随机的时刻变，有的跳一级。只讲天气、不讲班次，免得观众以为节目延误
  sc.fill(1, 0, 16, 'k', sec(90.3), 1); sc.text(1, 1, '沿途天气', 'k', sec(90.5), {roll: 1});
  const ALONG = ['须弥', '北京', '重庆', '上海', '成都', '黄山'];
  ALONG.forEach((st, i) => { const r = 2 + i, t = sec(90.6) + i * 5; sc.fill(r, 1, 15, 'g', t, .8); sc.text(r, 1, st, 'w', t + 4, {roll: 1}); });
  const STAGES: [string, 'g' | 'k', number, number][] = [['微雨', 'g', 91.4, 93.4], ['小雨', 'g', 93.8, 97.2], ['中雨', 'g', 97.6, 101.0], ['大雨', 'k', 101.4, 104.4], ['暴雨', 'k', 104.8, 107.4]];
  for (let r = 2; r <= 7; r++) STAGES.forEach(([w, st, a, b], k) => {
    if (k > 0 && k < 4 && r01(r * 3.3 + k * 1.7) < .25) return;                   // 有的站跳一级
    const t = sec(a + r01(r * 7.1 + k * 2.9) * (b - a));
    [...w].forEach((ch, i) => sc.set(r, 14 + i, t + i * 3, face(ch, st)));
  });
  ticker(sc, '雨天路滑 注意脚下', sec(92.5));
  // 雨到最大，大屏从上往下被冲掉
  for (let r = 1; r <= 8; r++) sc.fill(r, 0, 16, 'g', sec(108.4) + (r - 1) * 20, .9);
  // 闪电：一串格子飞快翻白再翻回；雷声的冲击把落点附近几格吹翻、贴在上面，再一格一格落回来（不做"短路变暗"）
  BOLT.forEach(([r, c], i) => { sc.set(r, c, sec(112) + i, face(' ', 'w'), true); sc.set(r, c, sec(112.5) + i * 1.5, face(' ', 'g'), true); });
  rf.add(8.5, 8.5, sec(112.7), 2.0, 16, 38);
  THUNDER.forEach(([r, c, ch], i) => blowOver(sc, puffs, r, c, sec(112.85 + i * .15), sec(114.8 + i * 1.1), face(ch, 'w'), 4));   // 这几格不跟着闪白（翻的时候风推不动它）

  // 8:00 重庆话报时：折叠伞。一小捆 → 伞杆"咔、咔"两下伸长 → 伞骨张开（细长条 → 倒 V → 圆顶），撑满时伞面抖两下、一圈涟漪
  //   →「莫慌哈」→ 收伞倒着来：先合拢、再缩杆 → 底下才出「还有八分钟」
  const U: [number, Map<number, FlapFace>][] = [];
  const at = (s: number, m: Map<number, FlapFace>) => U.push([sec(s), m]);
  at(120.2, umbrella(4, 0, false)); at(120.75, umbrella(2, 0, false)); at(121.2, umbrella(0, 0, false));
  for (let k = 1; k <= 14; k++) at(121.5 + k * .08, umbrella(0, (k / 14) ** 1.8, false));      // 先慢后快：推伞的滑块越推越快，最后一下撑满
  at(123.0, umbrella(0, 1, true));
  at(124.6, umbrella(0, 1, false));
  for (let k = 1; k <= 10; k++) at(124.7 + k * .07, umbrella(0, 1 - k / 10, false));
  at(125.6, umbrella(2, 0, false)); at(125.85, umbrella(4, 0, false)); at(126.1, new Map());
  animate(sc, U, face(' ', 'g'), true);
  [120.75, 121.2].forEach((s) => rf.add(8.5, 1, sec(s) + 2, .5, 4, 14, .6, 40));          // 咔、咔
  const open = umbrella(0, 1, false);
  open.forEach((_, cell) => sc.gusts.set(cell, [...(sc.gusts.get(cell) ?? []), {at: sec(122.7), amp: 10, dur: 14}, {at: sec(122.95), amp: 6, dur: 12}]));   // 撑满时伞面抖两下
  rf.add(8.5, 2, sec(122.7), 1.1, 14, 36);
  band(sc, '还有八分钟', sec(126.0));
  sc.fill(8, 0, 16, 'g', sec(128.2), 1);

  // 雨点：最后才排（要知道每格"没被淋"时是什么样，水滴干了翻回那一面）
  const base = new Map([...sc.ch.entries()].map(([k, v]) => [k, [...v]] as const));
  const baseAt = (cell: number, t: number) => { let f = sc.init[cell]; for (const [tt, ff] of base.get(cell) ?? []) if (tt <= t) f = ff; return f; };
  const busyUntil = new Map<number, number>();
  for (let f = sec(90); f < sec(130.5); f++) {
    const s = f / 60;
    if (r01(f * 1.37 + 5) > rate(s) / 60) continue;
    const r = 1 + Math.floor(r01(f * 2.11 + 7) * 8), c = Math.floor(r01(f * 3.07 + 11) * COLS), cell = cellOf(r, c);
    if ((busyUntil.get(cell) ?? -1) > f) continue;
    if (s > 119.5 && s < 126.4 && ANNOUNCE.some(([rr, cc]) => rr === r && cc === c)) continue;
    if (s > 111.5 && s < 119 && ([...BOLT, ...THUNDER] as [number, number][]).some(([rr, cc]) => rr === r && cc === c)) continue;
    const under = baseAt(cell, f - 7);
    if ((r === 8 || s < 108.4) && under.k === 'char' && under.ch !== ' ') continue;   // 不盖底条广播的字；大屏被冲掉以前也不盖站名和天气
    const bg = under.k === 'char' ? under.bg ?? V.g : V.g;
    const mark: FlapFace = icon('drop', bg, bg === WHITE ? V.g : WHITE);
    const dry = sec(s < 100 ? 1.6 + r01(f * .7) * 1.6 : 2.5 + r01(f * .7) * 2);
    const amp = .45 + .25 * Math.min(1, rate(s) / RAIN_PEAK);                 // 雨越大，每一滴砸得越重
    sc.set(r, c, f - 7, mark, true, true);
    // 雨大了，有的水滴不停在落点：顺着往下淌两三格（每 6 帧走一格，跟着风往右偏一点），淌过的格子马上干，停下的那格才慢慢干
    const runs = rate(s) > 12 && r01(f * 4.7 + 2) < .35 ? 2 + Math.floor(r01(f * 6.1) * 2) : 0;
    let rr = r, cc = c, tt = f;
    for (let k = 0; k < runs; k++) {
      const nr = rr + 1, nc = cc + (k % 2 === 1 ? 1 : 0), ncell = cellOf(nr, nc);
      if (nr > 7 || nc >= COLS || (busyUntil.get(ncell) ?? -1) > tt + 6) break;
      if (s > 119.5 && s < 126.4 && ANNOUNCE.some(([a, b]) => a === nr && b === nc)) break;
      const nb = baseAt(ncell, tt + 6), nbg = nb.k === 'char' ? nb.bg ?? V.g : V.g;
      sc.set(nr, nc, tt + 6, icon('drop', nbg, nbg === WHITE ? V.g : WHITE), true, true);
      sc.set(rr, cc, tt + 12, baseAt(cellOf(rr, cc), tt + 12), false, true);
      busyUntil.set(cellOf(rr, cc), tt + 22);
      rr = nr; cc = nc; tt += 6;
    }
    sc.set(rr, cc, tt + dry, baseAt(cellOf(rr, cc), tt + dry), false, true);
    busyUntil.set(cellOf(rr, cc), tt + dry + 10);
    rf.add(c + .5 + jit(f, .2), r + .5 + jit(f * 3, .2), f, amp, 3.2, 14, .55, 45);
  }

  // 闪电那一下：整面墙从落点闪白两下（很快）。闪完翻回原样——闪电那一列翻回绿（它这时候自己也是白的，不能照抄）
  const isBolt = (r: number, c: number) => BOLT.some(([rr, cc]) => rr === r && cc === c);
  [sec(112.05), sec(112.42)].forEach((t) => { const now = same(sc, t - 1); wave(sc, t, (r, c) => (isBolt(r, c) ? face(' ', 'g') : now(r, c)), {cx: 8.5, cy: 8.5, speed: .7, hold: 5, skip: (r, c) => THUNDER.some(([rr, cc]) => rr === r && cc === c)}); });

  // 风吹干：从左边吹过来，吹到哪里水滴干到哪里
  for (let r = 1; r <= 8; r++) for (let c = 0; c < COLS; c++) sc.set(r, c, sec(131.0) + c * 3 + 12 + jit(r * 41 + c * 13, 4), face(' ', 'g'));
  rounds.push({a: sec(99), b: sec(128), U: .22, lag: 3}, {a: sec(131.0), b: sec(138.5), U: .6, lag: 3});
  puffs.push(P(-3, 3, sec(131.3), .5, 3, 2, 110), P(-3, 6, sec(131.7), .45, 3, 2, 110));

  // 放晴：白太阳从底下升到正中 → 光芒交替 → 三圈白光往外荡 → 化成一道大白光
  const CX = 8, CY = 4;
  const disc = (cy: number) => {                                          // 5×5 切掉四个角的圆
    const m = new Map<number, FlapFace>();
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const r = cy + dy; if ((Math.abs(dy) === 2 && Math.abs(dx) === 2) || r < 1 || r > 8) continue;
      m.set(cellOf(r, CX + dx), face(' ', 'w'));
    }
    return m;
  };
  animate(sc, [9, 8, 7, 6, 5, 4].map((cy, k) => [sec(133.0) + k * 11, disc(cy)] as [number, Map<number, FlapFace>]), face(' ', 'g'), true);
  // 光：一批批短光束从太阳往外射到墙边（每束两三格长的白，一格格往外飞），每批比上一批转半格的角度，像在转、在往外喷；
  //   光束经过的格子下片被轻轻掀一下、借着翻起来反光；太阳跟着每批光呼吸一下（四个切角亮一下）。
  //   不画从中心铺满全屏、一白一绿相间的长放射条（会像旭日旗），只有一束束飞出去的短光
  const SUNC = new Set(disc(CY).keys()), BEAMS = 12;
  [134.4, 135.1, 135.8, 136.5, 137.2].forEach((p, k) => {
    for (let b = 0; b < BEAMS; b++) {
      const ang = ((b + (k % 2) * .5) / BEAMS) * Math.PI * 2, hit = new Set<number>();
      for (let d = 3; d < 12; d += .5) {
        const r = Math.floor(CY + .5 + Math.sin(ang) * d / 1.1), c = Math.floor(CX + .5 + Math.cos(ang) * d);
        if (r < 1 || r > 7 || c < 0 || c >= COLS) break;
        const cell = cellOf(r, c); if (SUNC.has(cell) || hit.has(cell)) continue; hit.add(cell);
        const t = sec(p) + (d - 3) * 2.2;
        sc.set(r, c, t, face(' ', 'w'), true, true); sc.set(r, c, t + 8, face(' ', 'g'), true, true);
        sc.gusts.set(cell, [...(sc.gusts.get(cell) ?? []), {at: t + 2, amp: 9, dur: 12}]);
      }
    }
    [[CY - 2, CX - 2], [CY - 2, CX + 2], [CY + 2, CX - 2], [CY + 2, CX + 2]].forEach(([r, c]) => { sc.set(r, c, sec(p) - 4, face(' ', 'w'), true, true); sc.set(r, c, sec(p) + 8, face(' ', 'g'), true, true); });
    rf.add(CX + .5, CY + .5, sec(p), .7, 10, 30);
  });
  band(sc, '放晴啦', sec(134.8));
  wave(sc, sec(139.2), () => face(' ', 'g'), {cx: CX + .5, cy: CY + .5, speed: 1.6, hold: 8});   // 太阳化成一道大白光
};
