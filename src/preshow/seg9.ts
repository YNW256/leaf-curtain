// 开场前·第九段（527~548 秒 = 1:13 → 0:52）：最后召集 + 关门 + 1:00 报时（全屏）。
//   「最 后 召 集 / LAST CALL」闪两下，底条「没时间解释了快上车」；「车门即将关闭啦」——两扇白门从左右两边一格格合上，
//   "咔"一圈涟漪，再打开收掉。
//   1:00 报时（全屏）：一阵风从左往右吹过，被吹起来的下片刚好组成一个满屏的 1——颜色一格都不换，只靠下片翘起来的明暗；
//   风停，数字落下去就不见了。底下「还有一分钟」（风吹出来的字比翻白牌淡，所以这句要留着）。
import {band} from './common';
import {Ctx, bigOn, face, jit, sec} from './engine';

export const seg9 = ({sc, rf, rounds, extra}: Ctx) => {
  for (let r = 1; r <= 8; r++) sc.fill(r, 0, 16, 'g', sec(527.3) + r * 2, .8);

  // ── 最后召集 ──
  const L = 527.8;
  sc.center(3, '最 后 召 集', 'w', sec(L), {roll: 2, stagger: 3});
  sc.center(5, 'LAST CALL', 'g', sec(L + .4), {roll: 2, stagger: 2});
  band(sc, '没时间解释了快上车', sec(L + .6));
  for (let i = 0; i < 2; i++) {
    const t = sec(L + 2.0 + i * 1.6);
    [...'最 后 召 集'].forEach((ch, k) => { if (ch !== ' ') sc.set(3, 5 + k, t + k * 2, face(ch, 'w'), true); });
  }
  sc.fill(3, 5, 11, 'g', sec(L + 4.9), 1.5); sc.fill(5, 4, 12, 'g', sec(L + 5.1), 1.5);

  // ── 车门即将关闭：两扇白门从两边一格格合上，"咔"一下，再打开收掉 ──
  const D = 533.6;
  band(sc, '车门即将关闭啦', sec(D - .4));
  for (let c = 0; c <= 8; c++) for (let r = 1; r <= 7; r++) {
    const t = sec(D) + c * 5 + jit(r * 7 + c, 1);
    sc.set(r, c, t, face(' ', 'w'), false, true); sc.set(r, 16 - c, t, face(' ', 'w'), false, true);
  }
  rf.add(8.5, 4, sec(D) + 46, 1.6, 15, 36);                                       // 咔
  for (let c = 8; c >= 0; c--) for (let r = 1; r <= 7; r++) {
    const t = sec(D + 1.6) + (8 - c) * 4 + jit(r * 5 + c, 1);
    sc.set(r, c, t, face(' ', 'g'), false, true); sc.set(r, 16 - c, t, face(' ', 'g'), false, true);
  }
  sc.fill(8, 0, 16, 'g', sec(D + 3.4), .8);

  // ── 1:00 报时（全屏）：风吹出一个满屏的 1（第 0~7 排，第 5~11 列），1:00 那一刻正好吹全 ──
  const W0 = sec(539.5), HOLD = sec(3.4);
  extra.push((x, y, t) => {
    if (t < W0 - 10 || t > W0 + HOLD + sec(2)) return 0;
    const c = Math.floor(x), r = Math.floor(y);
    if (!bigOn('1', r, c, 0, 5)) return 0;
    const arrive = W0 + (c - 5) * 6, leave = arrive + HOLD;
    const on = Math.min(1, Math.max(0, (t - arrive) / 10)) * (1 - Math.min(1, Math.max(0, (t - leave) / 16)));
    return 2.1 * on * (1 + .12 * Math.sin(t * .9 + r * 1.7 + c));
  });
  rounds.push({a: sec(539.3), b: sec(544.4), U: .16, lag: 3});                     // 周围一点微风
  rf.add(8.5, 4, W0 + HOLD + sec(.9), .4, 10, 40);
  band(sc, '还有一分钟', sec(540.6));
};
