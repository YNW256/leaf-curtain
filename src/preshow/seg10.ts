// 开场前·第十段（548~605.5 秒 = 0:52 → 开演后 5.5 秒）：最后一分钟 + 结尾（画面停稳、叶子飞完就翻回待机并渐黑）。
//   两个大数字倒数秒（52、51……），只翻要变的格子；每到整十秒荡开一圈涟漪。底下：「零食准备好了吗」→「弹幕刷起来」→「一起倒数吧」。
//   最后十秒：换成正中一个大数字 9、8……1，每一秒一圈涟漪，一圈比一圈大；底下「「旅叶知微」号即将发车」。
//   3、2、1：3 和 1 整面墙反过来（白底绿字），2 翻回绿底白字——一秒一闪。
//   0：一阵最大的风从左边吹过来，吹到哪里哪里翻成最后的画面——顶上「开演啦」、「旅 叶 知 微」「纳西妲生日快乐」、最底下白条上「10·27」。
//   其中「快」那一格卡住了，顶了两下，大家都翻好了在等它，它最后才翻过去。画面停稳后，从正中往四面八方飞出一圈叶子。
import {P} from '../flap/windSim';
import {band} from './common';
import {V} from '../theme';
import {COLS, Ctx, Style, WHITE, digitOn, face, icon, jit, r01, sec} from './engine';

export const seg10 = ({sc, rf, rounds, puffs}: Ctx) => {
  const W = face(' ', 'w'), G = face(' ', 'g');
  for (let r = 0; r <= 7; r++) sc.fill(r, 0, 16, 'g', sec(547.4) + r * 2, .8);         // 连顶上一排（1:00 的大 1 占到了第 0 排）一起收掉
  band(sc, '零食准备好了吗', sec(548.2));
  // 两位数倒数（52 → 10）
  const two = (n: number) => (r: number, c: number) => digitOn(String(Math.floor(n / 10)), r, c, 1, 3) || digitOn(String(n % 10), r, c, 1, 9);
  const one = (n: number) => (r: number, c: number) => digitOn(String(n), r, c, 1, 6);
  const inv = (rem: number) => rem === 3 || rem === 1;                       // 3 和 1 整面墙反过来
  let prev: (r: number, c: number) => boolean = () => false, prevInv = false;
  for (let s = 548; s <= 599; s++) {
    const rem = 600 - s;
    const cur = rem >= 10 ? two(rem) : one(rem), iv = inv(rem);
    const c0 = iv || prevInv ? 0 : 2, c1 = iv || prevInv ? 16 : 14;
    for (let r = 1; r <= 7; r++) for (let c = c0; c <= c1; c++) {
      const was = prev(r, c) !== prevInv, now = cur(r, c) !== iv;           // true = 白
      if (was !== now) sc.set(r, c, sec(s) + (iv !== prevInv ? Math.hypot(c + .5 - 8.5, (r + .5 - 4.5) * 1.1) * 1.4 : (c - 2) * 1.2 + r), now ? W : G, false, true);
    }
    prev = cur; prevInv = iv;
    if (rem % 10 === 0 && rem >= 10) rf.add(8.5, 4.5, sec(s) + 8, 1.3, 14, 40);
    if (rem < 10) rf.add(8.5, 4.5, sec(s) + 8, .9 + (9 - rem) * .14, 12 + (9 - rem) * .5, 38);
  }
  band(sc, '弹幕刷起来', sec(566));
  band(sc, '一起倒数吧', sec(580));
  band(sc, '「旅叶知微」号即将发车', sec(590));

  // 0：最大的一阵风把墙吹成最后的画面
  rounds.push({a: sec(599.7), b: sec(604.5), U: 1.0, lag: 2.4});
  puffs.push(P(-3, 2.5, sec(600), .8, 3, 2.2, 120), P(-3, 6.5, sec(600.2), .8, 3, 2.2, 120));
  rf.add(8.5, 4.5, sec(600.1), 2.4, 18, 40);
  const LAYOUT: [number, string, Style][] = [[0, '开演啦', 'w'], [3, '旅 叶 知 微', 'w'], [5, '纳西妲生日快乐', 'g'], [8, '10·27', 'w']];
  const finalAt = (r: number, c: number) => {
    const row = LAYOUT.find(([rr]) => rr === r);
    const base: Style = r === 0 || r === 8 ? 'w' : 'g';
    if (!row) return face(' ', base);
    const [, txt, st] = row, chars = [...txt], c0 = 8 - Math.floor(chars.length / 2), ch = chars[c - c0];
    return ch === undefined ? face(' ', base) : face(ch, ch === ' ' ? base : st);
  };
  for (let r = 0; r <= 8; r++) for (let c = 0; c < COLS; c++) {
    const at = sec(600) + c * 2.4 + 10 + jit(r * 41 + c * 13, 4);
    const f = finalAt(r, c);
    if (f.k === 'char' && f.ch !== ' ') {
      const n = 1 + Math.floor(r01(r * 7 + c * 3) * 2);                           // 落定前字鼓先滚一两张
      for (let q = 0; q < n; q++) sc.set(r, c, at + q * 7, face('旅叶知微梦花书月糖星'[Math.floor(r01(r * 31 + c * 17 + q) * 10)], f.bg === '#f4f9e4' ? 'w' : f.bg === '#3f5f06' ? 'k' : 'g'), true, true);
      sc.set(r, c, at + n * 7, f, true, true);
    } else sc.set(r, c, at, f, true, true);
  }
  sc.stuck(5, 10, sec(600) + 10 * 2.4 + 10 - 6, sec(1.6));                     // 「快」那一格卡住，大家等它
  // 停稳后：从正中往四面八方飞出一圈叶子（只走空白的绿格，飞过就翻回去）
  const BURST = sec(603.0);
  rf.add(8.5, 4.5, BURST, 1.6, 16, 42);
  for (let k = 0; k < 18; k++) {
    const a = (k / 18) * Math.PI * 2 + jit(k * 3, .12);
    for (let d = 1.6, n = 0; d < 11; d += 1, n++) {
      const r = Math.floor(4.5 + Math.sin(a) * d / 1.1), c = Math.floor(8.5 + Math.cos(a) * d);
      if (r < 1 || r > 7 || c < 0 || c >= COLS) break;
      const f = finalAt(r, c);
      if (f.k === 'char' && f.ch !== ' ') continue;                              // 不压字
      const t = BURST + n * 4 + jit(k * 11 + n, 1.5);
      sc.set(r, c, t, icon('leaf', WHITE, V.g, (a * 180) / Math.PI), true, true); sc.set(r, c, t + 8, f, true, true);
    }
  }
  // 叶子飞完，整面墙从正中往外一下翻回开场时的待机样子（墨绿空牌），同时画面渐黑（渐黑在 Preshow.tsx 的 FADE），接直播开场曲开头的黑屏
  const IDLE = sec(603.55);
  for (let r = 0; r <= 8; r++) for (let c = 0; c < COLS; c++)
    sc.set(r, c, IDLE + Math.hypot(c + .5 - 8.5, (r + .5 - 4.5) * 1.1) * 2.6 + jit(r * 23 + c * 5, 1.5), face(' ', 'k'), false, true);
};
