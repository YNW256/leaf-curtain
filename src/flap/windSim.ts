// 整面墙的风场。不 import 别的文件，方便单独拿 node 跑着调。
// 这里只管"每一格吹到多大的风"；下片翘多高、怎么扑、怎么拍回去，全交给每片自己的摆（flapRod.ts）。
//
// 风速分三层，都被平均风带着往右走（同一阵风先打到左边的牌，再按距离晚一点打到右边——相邻的牌动作相似、
// 时间错开一点，这就是麦浪；走着走着图案慢慢变形，离得远的就不一样了）：
//   面：平均风，一轮一轮来，整面墙都有，渐起渐落（左边先到）。只够让牌小小地扑。
//   块：几团几格大小的阵风，顺着风往右走（跟平均风一起走），边走边散；这里的牌翘得高。
//   抖：一两格大小的小涡，被风带着走，所以每一格上的风一直在快速地忽大忽小（周期和下片的摆差不多），
//       牌才会扑起来、拍回去，而不是一直翘着。
// 风力 ∝ 风速²：弱风几乎吹不动、强风才明显，所以块会比面突出很多。

const sstep = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** 一轮平均风：a 帧起、b 帧落，强度 U；lag：每往右一格晚到几帧 */
export type Round = {a: number; b: number; U: number; lag: number};

/** 一团阵风：t0 时在 (x0, y0)，之后跟着风走（快慢倍数 sp）、上下漂 vy；A 强度，L 沿风向长、W 横向宽（格），
 *  front：前沿陡的程度（越小越陡），life 帧后散完 */
export type Puff = {x0: number; y0: number; t0: number; sp: number; vy: number; A: number; L: number; W: number; front: number; life: number};
export const P = (x0: number, y0: number, t0: number, A: number, L: number, W: number, life: number, o: Partial<Puff> = {}): Puff =>
  ({x0, y0, t0, A, L, W, life, sp: 1.1, vy: 0, front: .6, ...o});

/** 小涡：几道不同方向、不同长短（1.8~6 格）的波叠起来，被风带着走，自己也慢慢变；输出约 −1~1 */
const TURB = [
  {k: 2 * Math.PI / 1.9, ang: .3, ph: .4, nu: .07, a: .22},
  {k: 2 * Math.PI / 2.4, ang: -.6, ph: 2.1, nu: .05, a: .24},
  {k: 2 * Math.PI / 3.1, ang: 1.1, ph: 4.0, nu: .04, a: .2},
  {k: 2 * Math.PI / 4.2, ang: -1.3, ph: 1.2, nu: .03, a: .16},
  {k: 2 * Math.PI / 6, ang: .2, ph: 5.3, nu: .02, a: .14},
  {k: 2 * Math.PI / 2.8, ang: 2.4, ph: 3.3, nu: .06, a: .14},
];
const INTENSITY = .45;          // 小涡让风忽大忽小的幅度（相对当地的风）

/** 按一组"轮"和"团"做一个风场：(x, y) 处 t 帧的风速（1 = 强风，下片稳定时约翘 35°）。frames：最长用到第几帧 */
export const makeWind = (rounds: Round[], puffs: Puff[], frames = 600) => {
  const mean = (x: number, t: number) =>
    rounds.reduce((s, rd) => { const tt = t - x * rd.lag; return s + rd.U * sstep(rd.a, rd.a + 45, tt) * (1 - sstep(rd.b - 50, rd.b, tt)); }, 0);
  // 风把东西带着走的速度（格/帧）：风越大走得越快。X(t) = 从头到 t 一共带走了多远
  const conv = (t: number) => .14 + .22 * Math.max(mean(0, t), mean(7, t));
  const N = frames * 4;
  const XS = (() => { const a = [0]; for (let i = 1; i <= N; i++) a.push(a[i - 1] + conv(i / 4) / 4); return a; })();
  const X = (t: number) => { const u = Math.max(0, Math.min(N - .001, t * 4)), i = Math.floor(u); return XS[i] + (XS[i + 1] - XS[i]) * (u - i); };
  const turb = (x: number, y: number, t: number) => {
    const xs = x - X(t);
    return TURB.reduce((s, w) => s + w.a * Math.sin(w.k * (xs * Math.cos(w.ang) + y * Math.sin(w.ang)) + w.ph + w.nu * t), 0) / .65;
  };
  return (x: number, y: number, t: number) => {
    let w = mean(x, t);
    for (const p of puffs) {
      const age = t - p.t0;
      if (age < 0 || age > p.life) continue;
      const cx = p.x0 + (X(t) - X(p.t0)) * p.sp, cy = p.y0 + p.vy * age;
      const u = x - cx, v = y - cy;
      const spread = 1 + .006 * age;
      const shape = Math.exp(-((u / (p.L * spread * (u > 0 ? p.front : 1.1))) ** 2) - (v / (p.W * spread)) ** 2);
      w += p.A * shape * sstep(0, Math.min(14, p.life * .3), age) * (1 - sstep(p.life * .5, p.life, age)) / Math.sqrt(spread);
    }
    return Math.max(0, w * (1 + INTENSITY * turb(x, y, t)));
  };
};

