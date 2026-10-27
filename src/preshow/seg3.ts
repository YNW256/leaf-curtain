// 开场前·第三段（140~182 秒 = 7:40 → 6:58）：扫雷 + 7:00 老虎机报时（约 4 秒：7:02 开转，7:00 正好停出 777）。
//   扫雷：雷 = 这次生日会所有的城市（主线五站 + 线下各会场，共 15 个），按经纬度的先后埋，所以会挨在一起（京津、渝蓉、穗深……）。
//   不复述画面：底条只有游戏自己的「扫雷？剩余「15」」，插一面旗少一个。
//   "玩家"是照一局真的推理走的（扫雷求解器验过：前面都推得出来，中间两次是真的二选一）。二选一的时候犹豫：两格轮流被按下去、弹起来；
//   第一次蒙对；最后剩一个雷，卡在渝和旁边一格之间，蒙错了——炸开，整面墙一抖，所有的雷翻出来，是一个个城市的简称，成了一张地图；
//   数字收掉，只剩城市；主线五站按站序（京 → 渝 → 沪 → 蓉 → 黄）亮一下，「下一站 北京站」。
//   7:00 老虎机报时（全屏）：三个滚轮一起滚字鼓，从左到右一个个停下（最后一个吊一下胃口），"咔"一下一圈涟漪，
//   停出「777」中大奖——三个 7 闪两下，底条「还有七分钟」。
import {band} from './common';
import {COLS, Ctx, INKG, WHITE, bigOn, cellOf, face, icon, jit, r01, sec, wave} from './engine';

/** 15 个城市雷（第 1~7 排、第 1~15 列）：一个字的简称 */
const CITY: Record<string, [number, number]> = {
  京: [1, 8], 哈: [1, 14], 津: [2, 9], 青: [2, 14], 西: [3, 4], 汉: [4, 8], 宁: [4, 11], 沪: [4, 13],
  蓉: [5, 1], 长: [5, 3], 黄: [5, 10], 杭: [5, 12], 渝: [6, 2], 穗: [6, 6], 深: [7, 7],
};
const ROUTE = ['京', '渝', '沪', '蓉', '黄'];                 // 主线站序
/** 这一局怎么走：c 点开，f 插旗，g 二选一（先给安全的那格、再给雷）。最后一次二选一蒙错 */
type Act = ['c', number, number] | ['f', number, number] | ['g', number, number, number, number];
const PLAY: Act[] = [['c', 4, 15], ['f', 4, 13], ['c', 3, 13], ['f', 5, 12], ['c', 4, 12], ['c', 5, 11], ['f', 5, 10], ['c', 5, 8], ['c', 5, 9], ['c', 2, 13], ['c', 5, 7],
  ['g', 6, 7, 7, 7], ['f', 7, 7], ['g', 2, 15, 2, 14], ['f', 2, 14], ['c', 2, 12], ['f', 1, 14], ['c', 1, 15], ['f', 4, 11], ['c', 4, 10], ['c', 3, 9], ['c', 4, 9], ['f', 2, 9],
  ['c', 1, 9], ['f', 4, 8], ['c', 2, 8], ['c', 3, 8], ['f', 1, 8], ['c', 1, 7], ['c', 2, 7], ['c', 3, 7], ['c', 1, 6], ['f', 3, 4], ['c', 4, 4], ['c', 5, 4], ['f', 5, 3],
  ['c', 5, 2], ['f', 5, 1], ['c', 6, 3], ['c', 6, 4], ['c', 6, 5], ['f', 6, 6], ['c', 7, 3], ['c', 7, 4], ['c', 7, 6], ['g', 7, 2, 6, 2]];
const R0 = 1, R1 = 7, C0 = 1, C1 = 15;

export const seg3 = ({sc, rf}: Ctx) => {
  const G = face(' ', 'g'), HIDDEN = face(' ', 'w'), FLAG = icon('flag', WHITE, INKG), PRESS = face(' ', 'k');
  const cityAt = (r: number, c: number) => Object.keys(CITY).find((k) => CITY[k][0] === r && CITY[k][1] === c);
  const isMine = (r: number, c: number) => cityAt(r, c) !== undefined;
  const num = (r: number, c: number) => { let n = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && isMine(r + dr, c + dc)) n++; return n; };
  const inField = (r: number, c: number) => r >= R0 && r <= R1 && c >= C0 && c <= C1;
  const hop = (r: number, c: number, at: number, amp = 10) => { const cell = cellOf(r, c); sc.gusts.set(cell, [...(sc.gusts.get(cell) ?? []), {at, amp, dur: 10}]); };
  const shown = (r: number, c: number) => { const n = num(r, c); return n ? face(String(n), 'g') : G; };
  const revealed = new Set<number>();
  const count = (n: number, t: number) => sc.center(8, `扫雷？剩余「${String(n).padStart(2, '0')}」`, 'w', t, {roll: 1});

  // 场地：整面墙从中间往外翻成白牌；底条「扫雷？剩余「15」」
  const T0 = 140.3;
  for (let r = R0; r <= R1; r++) for (let c = C0; c <= C1; c++) sc.set(r, c, sec(T0) + Math.hypot(c + .5 - 8.5, (r + .5 - 4.5) * 1.1) * 2.2 + jit(r * 7 + c, 1), HIDDEN, false, true);
  sc.fill(8, 0, 16, 'w', sec(T0 + .4), .8);
  count(15, sec(T0 + .7));

  // 点一下：先跳一下，再翻开；点在空地上就一圈圈自动翻开
  const click = (r: number, c: number, t: number) => {
    hop(r, c, t - 8);
    const q: [number, number, number][] = [[r, c, 0]], seen = new Set([cellOf(r, c)]);
    while (q.length) {
      const [rr, cc, d] = q.shift()!;
      revealed.add(cellOf(rr, cc));
      sc.set(rr, cc, t + d * 3.5 + (d ? jit(rr * 13 + cc, 1) : 0), shown(rr, cc), false, true);
      if (num(rr, cc)) continue;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const nr = rr + dr, nc = cc + dc, k = cellOf(nr, nc);
        if (!inField(nr, nc) || isMine(nr, nc) || seen.has(k) || revealed.has(k)) continue;
        seen.add(k); q.push([nr, nc, d + 1]);
      }
    }
    rf.add(c + .5, r + .5, t + 2, num(r, c) ? .4 : .9, num(r, c) ? 3 : 12, num(r, c) ? 12 : 40, .6, 40);
  };
  /** 犹豫：两格轮流被按下去（墨绿）又弹起来，n 下 */
  const hesitate = (a: [number, number], b: [number, number], t: number, n: number, gap = 22) => {
    for (let i = 0; i < n; i++) {
      const [r, c] = i % 2 ? b : a, tt = t + i * gap;
      hop(r, c, tt - 4, 8); sc.set(r, c, tt, PRESS, true, true); sc.set(r, c, tt + 12, HIDDEN, true, true);
    }
    return t + n * gap;
  };

  // 照着这一局走：推理的步子快（插旗、点开），二选一慢（犹豫）
  let t = sec(T0 + 1.6), left = 15, guesses = 0;
  let boom: [number, number] = [6, 2];
  for (const a of PLAY) {
    if (a[0] === 'c') { click(a[1], a[2], t); t += a === PLAY[0] ? sec(.9) : sec(.36); }
    else if (a[0] === 'f') { hop(a[1], a[2], t - 6); sc.set(a[1], a[2], t, FLAG, false, true); left--; count(left, t + 4); t += sec(.32); }
    else {
      guesses++;
      const safe: [number, number] = [a[1], a[2]], mine: [number, number] = [a[3], a[4]];
      const last = a === PLAY[PLAY.length - 1];
      t += sec(.3);
      t = hesitate(safe, mine, t, last ? 6 : 4, last ? 26 : 20) + sec(last ? .5 : .25);   // 最后一次犹豫得更久
      if (!last) { click(safe[0], safe[1], t); rf.add(safe[1] + .5, safe[0] + .5, t + 4, .6, 5, 18, .6, 40); t += sec(.6); }   // 蒙对了，松一口气
      else boom = mine;
    }
  }

  // 蒙错了：点中渝那一格——翻成墨绿的「渝」，整面墙抖一下、闪一下
  const [BR, BC] = boom, T = t;
  hop(BR, BC, T - 10, 12); sc.set(BR, BC, T, face(cityAt(BR, BC)!, 'k'), true, true);
  for (let r = R0; r <= R1; r++) for (let c = 0; c < COLS; c++) {
    const cell = cellOf(r, c); sc.gusts.set(cell, [...(sc.gusts.get(cell) ?? []), {at: T + 4 + Math.hypot(c - BC, r - BR) * 1.2, amp: 12, dur: 12}]);
  }
  rf.add(BC + .5, BR + .5, T + 4, 1.8, 16, 36);
  // 所有的雷从炸点往外一个个翻出来：是城市的简称
  const others = Object.keys(CITY).filter((k) => k !== cityAt(BR, BC)).sort((x, y) => Math.hypot(CITY[x][0] - BR, CITY[x][1] - BC) - Math.hypot(CITY[y][0] - BR, CITY[y][1] - BC));
  others.forEach((k, i) => { const [r, c] = CITY[k], tt = T + sec(.6) + i * 7; sc.set(r, c, tt, face(k, 'w'), true, true); rf.add(c + .5, r + .5, tt + 4, .5, 4, 16, .6, 40); });
  // 数字收掉，只剩城市（一张地图）；炸开的那一格也翻回白
  const T2 = T + sec(.6) + others.length * 7 + sec(.5);
  for (let r = R0; r <= R1; r++) for (let c = C0; c <= C1; c++) if (!isMine(r, c)) sc.set(r, c, T2 + Math.hypot(c - BC, (r - BR) * 1.1) * 2.4 + jit(r * 11 + c, 1.5), G, false, true);
  sc.set(BR, BC, T2 + 10, face(cityAt(BR, BC)!, 'w'), true, true);
  sc.fill(8, 0, 16, 'w', T2 + 6, .6);
  // 主线五站按站序亮一下
  const T3 = T2 + sec(1.4);
  ROUTE.forEach((k, i) => {
    const [r, c] = CITY[k], tt = T3 + sec(i * .55);
    hop(r, c, tt - 4, 10); sc.set(r, c, tt, face(k, 'k'), true, true); sc.set(r, c, tt + sec(.9), face(k, 'w'), true, true);
    rf.add(c + .5, r + .5, tt + 4, .7, 6, 20, .6, 40);
  });
  band(sc, '下一站 北京站', T3 + sec(ROUTE.length * .55 + .3));
  // 收掉，给 7:00 腾地方
  wave(sc, Math.max(T3 + sec(ROUTE.length * .55 + 2.6), sec(176.4)), () => G, {speed: 1.6, rows: [R0, 8]});
  void r01;

  // ── 7:00 老虎机（全屏）：三个滚轮（第 0~4、6~10、12~16 列），从左到右停下，停出 777 ──
  sc.fill(8, 0, 16, 'w', sec(177.6), .6);
  const POOL = '旅叶知微梦花书猫月糖曲渝山城须弥站车票风雨星灯';
  const REELS = [0, 6, 12], STOPS = [178.8, 179.25, 180.0];        // 最后一个滚轮正好在 7:00 停
  REELS.forEach((c0, k) => {
    for (let c = c0; c < c0 + 5; c++) for (let r = 0; r <= 7; r++) {
      const stop = sec(STOPS[k]) + (c - c0) * 1.5;
      let tt = sec(177.8) + c * 1.5 + r * 1.2 + jit(r * 41 + c * 13, 2);
      for (let q = 0; tt < stop - 8; q++) { sc.set(r, c, tt, face(POOL[Math.floor(r01(r * 31 + c * 17 + q * 7.3) * POOL.length)], 'g')); tt += 12; }
      sc.set(r, c, Math.max(stop, tt), bigOn('7', r, c, 0, c0) ? face(' ', 'w') : G);
    }
    rf.add(c0 + 2.5, 4, sec(STOPS[k]) + 10, .8, 6, 26, .6, 40);            // 咔
  });
  // 中大奖：三个 7 闪两下（翻成墨绿再翻回白），一圈大涟漪
  const sevens: [number, number][] = [];
  REELS.forEach((c0) => { for (let r = 0; r <= 7; r++) for (let c = c0; c < c0 + 5; c++) if (bigOn('7', r, c, 0, c0)) sevens.push([r, c]); });
  [180.45, 181.05].forEach((s) => sevens.forEach(([r, c]) => {
    const tt = sec(s) + Math.abs(c - 8) * 1.2;
    sc.set(r, c, tt, face(' ', 'k'), true, true); sc.set(r, c, tt + 14, face(' ', 'w'), true, true);
  }));
  rf.add(8.5, 4, sec(180.5), 1.6, 16, 40);
  sc.center(8, '还有七分钟', 'w', sec(180.7), {roll: 1, stagger: 3});
};
