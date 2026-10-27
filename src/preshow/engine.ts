// 开场前动画（翻牌墙）的公用部分：墙的尺寸和三色、怎么往墙上写字（剧本）、每一格怎么翻、风怎么吹。
// 一段动画 = 一份剧本（每格在什么时刻翻成什么）+ 一个风场（每格吹到多大的风）；最后每格交给物理去算：
//   翻 = flipCurve（硬杆倒下来、拍下去、轻轻晃几下）；风 = simRod（风推下片）；风太大把轻的片吹过头 = overTops。
import {V} from '../theme';
import {FlapFace, Flip, Gust} from '../flap/FlapModule';
import {flipCurve, overTops, simRod, windAngles} from '../flap/flapRod';
import {P} from '../flap/windSim';
import type {Puff, Round} from '../flap/windSim';

export const FPS = 60;
/** 墙比画面宽：17 列、左右各切掉半格，第 8 列在画面正中（单数宽的字才放得正） */
export const COLS = 17, ROWS = 9, T = 120, FR = 4, X0 = -T / 2;
export const WHITE = '#f4f9e4', INKG = '#1f2f07';          // 白、墨绿（主题绿是 V.g）。墨绿压得很暗、只做点缀（断电、延误、树干这类）
export const HOUSING = '#1b2905';                           // 机壳（格子之间的缝）
const GAP = 6;                                              // 同一格两次翻至少隔几帧（字鼓一次只掉一片）

export const sec = (s: number) => Math.round(s * FPS);
export const r01 = (k: number) => { const x = Math.sin(k * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const jit = (k: number, a: number) => (r01(k) - .5) * 2 * a;

/** 三种牌：g 主题绿底白字、w 白底绿字、k 墨绿底白字 */
export type Style = 'g' | 'w' | 'k';
export const face = (ch: string, st: Style = 'g'): FlapFace =>
  st === 'g' ? {k: 'char', ch, bg: V.g, ink: WHITE} : st === 'w' ? {k: 'char', ch, bg: WHITE, ink: V.g} : {k: 'char', ch, bg: INKG, ink: WHITE};
const keyOf = (f: FlapFace) => (f.k === 'char' ? `${f.ch}|${f.bg}|${f.pos ?? ''}` : f.k === 'icon' ? `i:${f.icon}|${f.bg}|${f.rot ?? 0}` : f.k);

const POOL_CJK = '旅叶知微梦花书猫月糖曲渝山城须弥站点车票路风';
const POOL_LAT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const POOL_NUM = '0123456789';
const poolOf = (ch: string) => (/[0-9]/.test(ch) ? POOL_NUM : /[A-Z]/.test(ch) ? POOL_LAT : POOL_CJK);

export const cellOf = (r: number, c: number) => r * COLS + c;

/** 剧本：每格一串 [松开的时刻（帧）, 翻到哪一面] */
export class Script {
  init: FlapFace[];
  ch = new Map<number, [number, FlapFace][]>();
  gusts = new Map<number, Gust[]>();
  /** 下片特别轻的格子（会被风吹过头）：k 是多轻（只在 from~to 帧之间这么轻），behind 是吹上去以后露出来的那一面 */
  light = new Map<number, {k: number; from: number; to: number; behind: FlapFace}>();
  constructor(first: FlapFace) { this.init = Array.from({length: COLS * ROWS}, () => first); }

  /** 某格在 t 帧翻成 f；force：和现在一样也要翻（整行"翻一下"）；exact：就在这一帧，不往后挪（雨点这类自己算好时刻的） */
  set(r: number, c: number, t: number, f: FlapFace, force = false, exact = false) {
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const cell = cellOf(r, c);
    const list = this.ch.get(cell) ?? [];
    // 后写的指令要排在前面写的后面：每格的时刻都有一点随机，先清空、再写字时，字不能因为随机跑到清空前面去
    const near = exact ? [] : list.filter(([tt]) => tt > t && tt - t < 20);
    if (near.length) t = Math.max(...near.map(([tt]) => tt)) + 1;
    const cur = this.faceAt(cell, t);
    if (!force && keyOf(cur) === keyOf(f)) return;
    list.push([t, f]); list.sort((a, b) => a[0] - b[0]);
    this.ch.set(cell, list);
  }
  /** t 帧之前最后排给这格的那一面 */
  faceAt(cell: number, t: number) {
    let f = this.init[cell];
    for (const [tt, ff] of this.ch.get(cell) ?? []) if (tt <= t) f = ff;
    return f;
  }
  /** 一行字：从第 c0 列起，每列晚 stagger 帧；roll：落定前字鼓最多先滚几张（每格随机） */
  text(r: number, c0: number, str: string, st: Style, t: number, o: {stagger?: number; roll?: number; delay?: Map<number, number>} = {}) {
    [...str].forEach((ch, i) => {
      const c = c0 + i, k = r * 41 + c * 13 + t;
      let tt = t + i * (o.stagger ?? 1.4) + jit(k, 1.5) + (o.delay?.get(c) ?? 0);
      const target = face(ch, st);
      // 已经是这个字就不翻——但要看"稍后"那一刻（同一格可能刚排了先清空、时刻因为随机落在这一笔后面一点）
      if (keyOf(this.faceAt(cellOf(r, c), tt + 20)) === keyOf(target)) return;
      const n = Math.floor(r01(k * 3.7) * ((o.roll ?? 0) + 1));
      const pool = poolOf(ch === ' ' ? 'A' : ch);
      for (let q = 0; q < n && ch !== ' '; q++) { this.set(r, c, tt, face(pool[Math.floor(r01(k * 13 + q * 7) * pool.length)], st)); tt += GAP + 1; }
      this.set(r, c, tt, target);
    });
  }
  /** 一行里第 c0~c1 列都翻成空白（某种牌） */
  fill(r: number, c0: number, c1: number, st: Style, t: number, stagger = 1.2) {
    for (let c = c0; c <= c1; c++) this.set(r, c, t + (c - c0) * stagger + jit(r * 41 + c * 13 + t, 1.5), face(' ', st));
  }
  /** 字放在第 r 行正中（单数宽才正；双数宽会偏右半格） */
  center(r: number, str: string, st: Style, t: number, o: {stagger?: number; roll?: number} = {}) {
    this.text(r, 8 - Math.floor([...str].length / 2), str, st, t, o);
  }
  /** 卡住：这一格本来 t 帧要翻的，顶了两下没翻过去，晚 wait 帧才翻 */
  stuck(r: number, c: number, t: number, wait: number) {
    const cell = cellOf(r, c);
    const list = this.ch.get(cell) ?? [];
    for (const e of list) if (e[0] >= t - 2 && e[0] < t + 60) e[0] += wait;
    this.gusts.set(cell, [...(this.gusts.get(cell) ?? []), {at: t, amp: 11, dur: 16}, {at: t + 22, amp: 15, dur: 16}, {at: t + wait - 20, amp: 9, dur: 14}]);
  }
}

/** 一圈空气涟漪：t0 时从 (cx, cy) 荡开，R(t) = Rmax(1 − e^(−t/τ))，越走越慢、越远越弱；fade 帧左右散掉 */
export const ring = (cx: number, cy: number, t0: number, A: number, Rmax = 15, tau = 42, sig = .95, fade = 160) => (x: number, y: number, t: number) => {
  const e = t - t0; if (e < 0) return 0;
  const d = Math.hypot(x - cx, (y - cy) * 1.1), R = Rmax * (1 - Math.exp(-e / tau));
  return A * Math.exp(-(((d - R) / sig) ** 2)) / (1 + d / 5) * Math.exp(-e / fade);
};

/** 很多圈涟漪（比如雨点）：按格子和时间分好，只算够得着这一格、还没散掉的那几圈 */
export class RingField {
  private bins: {t0: number; f: (x: number, y: number, t: number) => number}[][] = Array.from({length: COLS * ROWS}, () => []);
  private sorted = true;
  add(cx: number, cy: number, t0: number, A: number, Rmax = 15, tau = 42, sig = .95, fade = 160) {
    const f = ring(cx, cy, t0, A, Rmax, tau, sig, fade), reach = Rmax + 2.5;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (Math.hypot(c + .5 - cx, (r + .5 - cy) * 1.1) <= reach) this.bins[cellOf(r, c)].push({t0, f});
    this.sorted = false;
  }
  eval(x: number, y: number, t: number) {
    if (!this.sorted) { this.bins.forEach((b) => b.sort((a, q) => a.t0 - q.t0)); this.sorted = true; }
    const list = this.bins[cellOf(Math.floor(y), Math.floor(x))];
    if (!list || !list.length) return 0;
    let lo = 0, hi = list.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].t0 < t - 400) lo = m + 1; else hi = m; }
    let w = 0;
    for (let i = lo; i < list.length && list[i].t0 <= t; i++) w += list[i].f(x, y, t);
    return w;
  }
}

export type Tile = {faces: FlapFace[]; flips: Flip[]; gusts: Gust[]; windL: number[]; behind?: FlapFace};

/** 剧本 + 风 → 每格的翻和下片的摆。simFrom：下片的摆从第几帧开始算（只渲后面一段时，之前的不用算） */
export const build = (sc: Script, len: number, wind: (x: number, y: number, t: number) => number, simFrom = 0): Tile[] =>
  Array.from({length: COLS * ROWS}, (_, cell) => {
    const r = Math.floor(cell / COLS), c = cell % COLS, seed = r * 41 + c * 13;
    // 排好的翻：同一格两次至少隔 GAP 帧；每片推力、松开角度略不同
    const planned: {flip: Flip; face: FlapFace}[] = [];
    let last = -99;
    (sc.ch.get(cell) ?? []).forEach(([t, f], i) => {
      const at = Math.max(Math.round(t), last + GAP);
      planned.push({flip: {at: at - 4, curve: flipCurve(.05 + .03 * r01(seed + i * 7.3), 6 + 4 * r01(seed * 3.1 + i))}, face: f}); last = at;
    });
    const busy = planned.map((p) => [p.flip.at, p.flip.at + p.flip.curve!.length] as [number, number]);
    const lt = sc.light.get(cell);
    const k0 = .93 + .14 * r01(seed * 1.7);
    const th = simRod((t) => wind(c + .5, r + .5, t), len, lt ? (f) => (f >= lt.from && f <= lt.to ? lt.k : k0) : k0, busy, simFrom);
    // 吹过头：只给特别轻的那几格，而且只算它轻的那段时间（别的时候被大风吹得再高也不翻过去，比如 1:00 风吹出来的数字）
    const ots = lt ? overTops(th).filter((o) => o.up >= lt.from - 30 && o.up <= lt.to + 60) : [];
    const events: {flip: Flip; face: (cur: FlapFace) => FlapFace}[] = [
      ...planned.map((p) => ({flip: p.flip, face: () => p.face})),
      ...ots.flatMap((o) => {
        let before: FlapFace = sc.init[cell];
        return [
          {flip: {at: o.up, rev: true, curve: o.upCurve}, face: (cur: FlapFace) => { before = cur; return lt!.behind; }},
          {flip: {at: o.down, curve: o.downCurve}, face: () => before},
        ];
      }),
    ].sort((a, b) => a.flip.at - b.flip.at);
    const faces: FlapFace[] = [sc.init[cell]]; const flips: Flip[] = [];
    for (const e of events) { faces.push(e.face(faces[faces.length - 1])); flips.push(e.flip); }
    return {faces, flips, gusts: sc.gusts.get(cell) ?? [], windL: windAngles(th, ots), behind: lt?.behind};
  });

// ── 下面是各段都会用到的小工具 ──

/** 一段动画能动的东西：剧本、涟漪、风（平均风的"轮"、阵风的"团"、别的风） */
export type Ctx = {sc: Script; rf: RingField; rounds: Round[]; puffs: Puff[]; extra: ((x: number, y: number, t: number) => number)[]};

/** 印着小图形的牌。叶子一律用 sleaf（吉祥物「妲猫猫」贴纸里那片） */
export const icon = (name: 'leaf' | 'plane' | 'dot' | 'drop' | 'train' | 'arrow' | 'flag' | 'int' | 'sum' | 'pi' | 'inf' | 'lceil' | 'rceil' | 'bar' | 'vbar', bg: string, ink: string, rot = 0): FlapFace => ({k: 'icon', icon: name === 'leaf' ? 'sleaf' : name, bg, ink, rot});

/** 5×7 的大数字（每个"像素"是一格） */
export const DIGITS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
};
/** 大数字 d 是否点亮 (r, c)：左上角在 (r0, c0) */
export const digitOn = (d: string, r: number, c: number, r0: number, c0: number) => {
  const y = r - r0, x = c - c0; return y >= 0 && y < 7 && x >= 0 && x < 5 && DIGITS[d][y][x] === '1';
};

/** 一串时刻的画面（每格印什么）写进剧本：画面变了才翻；离开的格子翻回 rest（默认主题绿空白） */
export const animate = (sc: Script, frames: [number, Map<number, FlapFace>][], rest: FlapFace = face(' ', 'g'), keepLast = false) => {
  let prev = new Map<number, FlapFace>();
  for (const [t, cur] of frames) {
    for (const cell of new Set([...prev.keys(), ...cur.keys()])) {
      const a = prev.get(cell), b = cur.get(cell);
      if ((a ? keyOf(a) : 'R') === (b ? keyOf(b) : 'R')) continue;
      sc.set(Math.floor(cell / COLS), cell % COLS, t + jit(cell * 7 + t, 1.2), b ?? rest, false, true);
    }
    prev = cur;
  }
  if (!keepLast) for (const cell of prev.keys()) sc.set(Math.floor(cell / COLS), cell % COLS, frames[frames.length - 1][0] + 8, rest, false, true);
};

/** 一道白光扫过去：每格先翻白、停 hold 帧、再翻成 to(r, c)。先后按到 (cx, cy) 的距离；给了 dir 就按这个方向推过去。
 *  speed = 每格晚几帧。拿来换场比一排排收掉有冲击力；to 给"原来那一面"就是一道高光扫过 */
export const wave = (sc: Script, t0: number, to: (r: number, c: number) => FlapFace,
  o: {cx?: number; cy?: number; dir?: [number, number]; speed?: number; hold?: number; rows?: [number, number]; cols?: [number, number]; flash?: FlapFace; skip?: (r: number, c: number) => boolean} = {}) => {
  const {cx = 8.5, cy = 4.5, speed = 3, hold = 8, rows = [1, 8], cols = [0, COLS - 1], flash = face(' ', 'w')} = o;
  const cells: [number, number, number][] = [];
  for (let r = rows[0]; r <= rows[1]; r++) for (let c = cols[0]; c <= cols[1]; c++) if (!o.skip?.(r, c))
    cells.push([r, c, o.dir ? (c + .5) * o.dir[0] + (r + .5) * o.dir[1] * 1.1 : Math.hypot(c + .5 - cx, (r + .5 - cy) * 1.1)]);
  const d0 = Math.min(...cells.map((q) => q[2]));
  const target = cells.map(([r, c]) => to(r, c));                         // 先把"翻回哪一面"取好，再往剧本里写
  cells.forEach(([r, c, d], i) => {
    const t = t0 + (d - d0) * speed + jit(r * 37 + c * 11 + t0, 1.2);
    sc.set(r, c, t, flash, true, true); sc.set(r, c, t + hold, target[i], true, true);
  });
  return t0 + (Math.max(...cells.map((q) => q[2])) - d0) * speed + hold;   // 最后一格翻完的时刻
};
/** 当前这一面（拿来给 wave 当 to：高光扫过、翻回原样） */
export const same = (sc: Script, t: number) => (r: number, c: number) => sc.faceAt(cellOf(r, c), t);

/** 整分报时用的粗大数字：7 宽 × 8 高、笔画两格粗（第 0~7 排，第 8 排留给底条）。7 是老虎机用的 5 宽版 */
export const BIG: Record<string, string[]> = {
  '1': ['0001100', '0011100', '0111100', '0001100', '0001100', '0001100', '0001100', '0111111'],
  '2': ['0111110', '1111111', '1100011', '0000110', '0001100', '0011000', '1111111', '1111111'],
  '4': ['0001110', '0011110', '0110110', '1100110', '1111111', '1111111', '0000110', '0000110'],
  '9': ['0111110', '1111111', '1100011', '1111111', '0111111', '0000011', '1111111', '0111110'],
  '7': ['11111', '11111', '00011', '00110', '00110', '01100', '01100', '01100'],
};
/** 大数字 d 是否点亮 (r, c)：左上角在 (r0, c0) */
export const bigOn = (d: string, r: number, c: number, r0: number, c0: number) => {
  const g = BIG[d], y = r - r0, x = c - c0; return y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] === '1';
};

/** 被风吹翻：这一格的下片在 tUp~tDown 之间特别轻（k 倍受风），tUp 时一小团猛风正好打在它上面，把它吹过头、贴在上面露出背面 behind；
 *  tDown 以后恢复原来的重量，风托不住了，自己落回来。整场每格最多一次（Script.light 一格只记一段） */
export const blowOver = (sc: Script, puffs: Puff[], r: number, c: number, tUp: number, tDown: number, behind: FlapFace, k = 2.8) => {
  sc.light.set(cellOf(r, c), {k, from: tUp - 8, to: tDown, behind});
  puffs.push(P(c + .3, r + .5, tUp, 2.2, 1.4, 1.0, 40, {front: .35, sp: .15}));   // 走得慢、在这一格上多推一会儿：越过竖直那一下要一直有劲，才翻得到顶
};
