// 开场前·第五段（238~300 秒 = 6:02 → 5:00）：6:00 撕日历 + 贪吃蛇 + 蛇吃掉时钟 → 断电 → 重启。
//   撕日历（全屏：顶上走秒收起来，那一排当日历的墨绿装订条「距开演」）：一页白的日历（主题绿大字 7）。6:00 那一刻，从右上角往左下角"撕"掉——
//   一格格翻成下一页的 6，撕下来的那页变成一道白影往右上飞走，撕的地方有一阵小风。停一会儿，日历从下往上收掉。
//   贪吃蛇：白色的蛇（蛇头是白牌上的绿箭头，指着往哪走）在墙上找叶子吃，越吃越长；它真的会找路（最短路、不撞自己）。
//   底下白条记「长度 03」，长到 10、20 闪一下；全段有两片金叶子（墨绿牌白叶），吃到以后三秒里走得快一半，底条报「加速！」。
//   最后一片叶子长在了顶上的时钟里——蛇钻进时钟那一排，一路把时钟吃掉。
//   故障：时钟被吃的那一下，墙上乱闪一阵乱码；断电：从蛇头开始，一圈圈飞快地全墙变暗（墨绿），黑一会儿；重启：一排排自检，再一阵风把墙吹醒，时钟回来。
import {P} from '../flap/windSim';
import {V} from '../theme';
import {COLS, Ctx, INKG, WHITE, cellOf, digitOn, face, icon, jit, r01, sec} from './engine';
import {band} from './common';

const STEP = 12;                                            // 蛇每 12 帧走一格（每秒 5 格）

export const seg5 = ({sc, rf, puffs}: Ctx) => {
  // ── 撕日历 ──
  const page = (d: string, t: number, order: (r: number, c: number) => number) => {
    for (let r = 0; r <= 8; r++) for (let c = 5; c <= 11; c++) {
      const f = r === 0 ? face(c >= 7 && c <= 9 ? '距开演'[c - 7] : ' ', 'k') : digitOn(d, r, c, 2, 6) ? face(' ', 'g') : face(' ', 'w');   // 顶上那排（走秒收起来了）当墨绿装订条，白纸，绿字
      sc.set(r, c, t + order(r, c), f);
    }
  };
  page('7', sec(238.9), (r, c) => (c - 5) * 2 + r * 2 + jit(r * 7 + c, 1.5));
  page('6', sec(240), (r, c) => ((11 - c) + (r - 1)) * 3.2 + jit(r * 9 + c, 1.5));             // 从右上角撕到左下角
  puffs.push(P(12.5, .5, sec(239.9), 1.0, 1.6, 1.4, 50, {sp: -.9, vy: .05}));
  // 撕下来的那页：一块 2×2 的白往右上飞走，飞过的格子白一下
  const FLY: [number, number][] = [[3, 12], [3, 13], [2, 14], [2, 15], [1, 16], [1, 17]];
  FLY.forEach(([r, c], k) => {
    const t = sec(240.25) + k * 5;
    for (const [dr, dc] of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
      const rr = r + dr, cc = c + dc; if (cc > 16 || rr < 1) continue;
      sc.set(rr, cc, t + jit(rr * 7 + cc + k, 1), face(' ', 'w'), true, true); sc.set(rr, cc, t + 9 + jit(rr * 5 + cc + k, 1), face(' ', 'g'), true, true);
    }
  });
  for (let r = 8; r >= 0; r--) sc.fill(r, 5, 11, 'g', sec(241.6) + (8 - r) * 4, 1.2);   // 撕完停一秒多就收

  // ── 贪吃蛇 ──
  const R0 = 1, R1 = 7, C0 = 1, C1 = 15;                             // 场地第 1~7 排，第 8 排是计分条
  const BODY = face(' ', 'w'), FOOD = icon('leaf', V.g, WHITE, -25), GOLD = icon('leaf', INKG, WHITE, -25), EMPTY = face(' ', 'g');
  const headTo = (dr: number, dc: number) => icon('arrow', WHITE, V.g, dc > 0 ? 0 : dc < 0 ? 180 : dr > 0 ? 90 : -90);   // 蛇头：白牌上一个绿箭头，指着往哪走
  let snake: [number, number][] = [[4, 5], [4, 4], [4, 3]];
  let t = sec(243.6);
  snake.forEach(([r, c], i) => sc.set(r, c, t + i * 4, i ? BODY : headTo(0, 1)));
  const pad2 = (n: number) => String(n).padStart(2, '0');
  sc.fill(8, 0, 16, 'w', sec(243.3), .6);
  sc.center(8, `长度 ${pad2(3)}`, 'w', sec(243.7), {roll: 1});
  let eaten = 0, boostUntil = -1, golden = false;
  /** 底条换一句：先整条清空再写（不然短句两头会留下上一句的字，「长度 05」→「长加速！5」） */
  const say = (msg: string, st: 'w' | 'k', t: number) => { sc.fill(8, 0, 16, 'w', t - 2, .4); sc.center(8, msg, st, t, {roll: 1}); };
  const key = (r: number, c: number) => r * 100 + c;
  const inField = (r: number, c: number, top: number) => r >= top && r <= R1 && c >= C0 && c <= C1;
  let seed = 1;
  const placeFood = (): [number, number] => {
    for (;;) {
      const r = R0 + Math.floor(r01(seed++ * 3.3) * (R1 - R0 + 1)), c = C0 + Math.floor(r01(seed++ * 5.9) * (C1 - C0 + 1));
      if (!snake.some(([a, b]) => a === r && b === c) && Math.hypot(r - snake[0][0], c - snake[0][1]) > 3) return [r, c];
    }
  };
  let food = placeFood();
  sc.set(food[0], food[1], t + 20, FOOD);
  t += sec(.6);
  const DIRS: [number, number][] = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  /** 从蛇头到目标的最短路（不穿过身体；尾巴这一步会挪开，可以走） */
  const path = (goal: [number, number], top: number) => {
    const body = new Set(snake.slice(0, -1).map(([r, c]) => key(r, c)));
    const prev = new Map<number, number>(), q: [number, number][] = [snake[0]];
    prev.set(key(...snake[0]), -1);
    while (q.length) {
      const [r, c] = q.shift()!;
      if (r === goal[0] && c === goal[1]) break;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc, k = key(nr, nc);
        if (!inField(nr, nc, top) || body.has(k) || prev.has(k)) continue;
        prev.set(k, key(r, c)); q.push([nr, nc]);
      }
    }
    if (!prev.has(key(...goal))) return null;
    let k = key(...goal), last = k;
    while (prev.get(k) !== -1) { last = k; k = prev.get(k)!; }
    return [Math.floor(last / 100), last % 100] as [number, number];
  };
  /** 没路时：往能走得最开的那边走 */
  const roomy = (top: number) => {
    const body = new Set(snake.slice(0, -1).map(([r, c]) => key(r, c)));
    let best: [number, number] | null = null, bestN = -1;
    for (const [dr, dc] of DIRS) {
      const nr = snake[0][0] + dr, nc = snake[0][1] + dc;
      if (!inField(nr, nc, top) || body.has(key(nr, nc))) continue;
      const seen = new Set([key(nr, nc)]), q = [[nr, nc]];
      while (q.length) { const [r, c] = q.shift()!; for (const [a, b] of DIRS) { const k = key(r + a, c + b); if (inField(r + a, c + b, top) && !body.has(k) && !seen.has(k)) { seen.add(k); q.push([r + a, c + b]); } } }
      if (seen.size > bestN) { bestN = seen.size; best = [nr, nc]; }
    }
    return best;
  };
  const step = (to: [number, number], grow: boolean) => {
    const [hr, hc] = snake[0];
    sc.set(hr, hc, t, BODY, false, true);
    snake.unshift(to);
    sc.set(to[0], to[1], t, headTo(to[0] - hr, to[1] - hc), true, true);
    if (!grow) { const [tr, tc] = snake.pop()!; sc.set(tr, tc, t, EMPTY, false, true); }
    t += t < boostUntil ? 8 : STEP;                                  // 吃了金叶子：三秒里走得快一半
  };
  const END = sec(290);                                          // 蛇玩到 290 秒，断电只黑两秒多
  while (t < END) {
    const nx = path(food, R0) ?? roomy(R0);
    if (!nx) break;
    const eat = nx[0] === food[0] && nx[1] === food[1];
    step(nx, eat);
    if (eat) {
      rf.add(nx[1] + .5, nx[0] + .5, t, golden ? 1.1 : .6, golden ? 8 : 3.5, golden ? 26 : 14, .6, 45);
      const len = snake.length;
      if (golden) {                                                   // 金叶子：加速，底条报「加速！」，加速完再报长度
        boostUntil = t + sec(3);
        say('加速！', 'w', t + 4);
        say(`长度 ${pad2(len)}`, 'w', boostUntil + 6);
      } else if (len % 10 === 0) {                                    // 长到 10、20：计分条闪一下
        say(`长度 ${pad2(len)}`, 'k', t + 4);
        say(`长度 ${pad2(len)}`, 'w', t + 34);
      } else say(`长度 ${pad2(len)}`, 'w', t + 4);
      eaten++; golden = eaten === 3 || eaten === 9;                   // 全段只有两片金叶子（墨绿牌白叶）
      food = placeFood(); sc.set(food[0], food[1], t + 6, golden ? GOLD : FOOD, false, true);
    }
  }
  // 最后一片叶子长在时钟里（第 0 排正中）：蛇钻上去，沿着时钟一路吃过去
  sc.set(food[0], food[1], t, EMPTY, false, true);
  const clockStop = Math.floor(t / 60);                            // 从这一秒起时钟不再走（要被吃了）
  const clockLeaf: [number, number] = [0, 8];
  sc.set(0, 8, t + 4, icon('leaf', WHITE, V.g, -25), true, true);
  for (let guard = 0; guard < 60; guard++) {
    const nx = path(clockLeaf, 0) ?? roomy(0);
    if (!nx) break;
    step(nx, nx[0] === 0 && nx[1] === 8);
    if (nx[0] === 0 && nx[1] === 8) break;
  }
  for (let c = 9; c <= 15; c++) step([0, c], false);              // 往右一路把时钟吃掉
  const blackout = t + 6;
  // 故障：断电前半秒，墙上一格格乱闪乱码
  const GLITCH = '#@%&?!*/<>01ERR';
  for (let k = 0; k < 34; k++) {
    const r = 1 + Math.floor(r01(k * 3.7 + 1) * 8), c = Math.floor(r01(k * 5.3 + 2) * COLS);
    sc.set(r, c, blackout - 34 + k + jit(k, 1), face(GLITCH[Math.floor(r01(k * 7.1) * GLITCH.length)], r01(k * 1.9) < .5 ? 'w' : 'g'), true, true);
  }

  // ── 断电：从蛇头开始一圈圈变暗；重启：一排排自检，一阵风吹醒，时钟回来（时钟在 Preshow 里接着排） ──
  const [hr, hc] = snake[0];
  for (let r = 0; r <= 8; r++) for (let c = 0; c < COLS; c++) sc.set(r, c, blackout + Math.hypot(r - hr, c - hc) * 1.6, face(' ', 'k'), false, true);
  rf.add(hc + .5, hr + .5, blackout, 1.6, 16, 30);
  const boot = Math.max(blackout + sec(2.2), sec(295.6));
  for (let r = 0; r <= 8; r++) { sc.fill(r, 0, 16, 'w', boot + r * 5, .4); sc.fill(r, 0, 16, 'k', boot + 30 + r * 5, .4); }
  for (let r = 1; r <= 8; r++) for (let c = 0; c < COLS; c++) sc.set(r, c, boot + sec(1.4) + c * 2.5 + 8 + jit(cellOf(r, c), 3), face(' ', 'g'));
  band(sc, '刚才谁拔了电源？！', boot + sec(2.3));                     // 无厘头小句子，5:00 纸飞机飞到一半收掉
  sc.fill(8, 0, 16, 'g', Math.max(boot + sec(5.2), sec(300.8)), .8);
  return {clockStop, clockBack: Math.ceil((boot + sec(1.4)) / 60), blackout, boot};   // 时钟停走、重新出来的秒
};
