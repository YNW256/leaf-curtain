// 开场前·第一段（0~90 秒 = 10:00 → 8:30）：开站、出发大屏、9:00 猫报时。
//   开站：墙是暗的（墨绿）→ 一排排自检（翻白再翻回）→「自检中」「草元素充足」→ 一阵风从左边吹过来，把墙一路吹醒（翻成主题绿）
//   → 站名「须弥站 / SUMERU STATION」→ 顶上一排白的倒计时开始走（在 Preshow.tsx 里统一排）。
//   时刻表（见 common.ts 的 CHAPTERS）：表头 车次 / 节目 / 状态，按主线的城市分章翻页；广播每 6 秒换一句。
//   9:00 整分报时（全屏，约 8 秒）：一道白光从正中荡开把大屏收掉，像钟敲九下，每敲一下铺上几格「喵」、荡开一圈涟漪，
//   九下铺成一个满屏的大 9；底下「还有九分钟」；白光再荡一次，大屏回来。第一班的「检票」白牌一闪一闪。
//   环境层：开站那阵风、中间一阵微风、后面一阵风——把一片特别轻的"状态"牌吹到上面去，露出藏在后面的「喵」，风过去它自己落回来；
//   翻第三页时有一格卡住，顶了两下才翻过去。
import {P} from '../flap/windSim';
import {COLS, Ctx, bigOn, cellOf, face, same, sec, wave} from './engine';
import {TICKER, TICKER2, band, bands, page, ticker} from './common';

export const seg1 = ({sc, rf, rounds, puffs}: Ctx) => {
  // 开站：一排排自检
  for (let r = 0; r < 9; r++) { sc.fill(r, 0, 16, 'w', sec(1.5 + r * .2), .6); sc.fill(r, 0, 16, 'k', sec(2.25 + r * .2), .6); }
  sc.center(4, '自检中', 'k', sec(4.0), {roll: 2});
  sc.center(4, '草元素充足', 'k', sec(5.5), {roll: 2});
  // 一阵风从左边吹过来，吹到哪里哪里醒（翻成主题绿）
  for (let r = 0; r < 9; r++) for (let c = 0; c < COLS; c++) sc.set(r, c, sec(7.0) + c * 3 + 10 + (r * 41 + c * 13) % 7, face(' ', 'g'));
  sc.center(3, '须弥站', 'w', sec(9.6), {roll: 2, stagger: 3});
  sc.text(5, 1, 'SUMERU  STATION', 'g', sec(9.9), {roll: 2});
  wave(sc, sec(12.8), same(sc, sec(12.7)), {dir: [1, .35], speed: 2.4, rows: [2, 6], hold: 7});      // 一道高光从左往右扫过站名
  // 出发大屏：时刻表按主线的城市分章翻页（须弥 + 北京、重庆、上海、成都四页在 9:00 前，黄山 + 大合唱、再回第一页在 9:00 后）
  sc.fill(3, 0, 16, 'g', sec(16)); sc.fill(5, 0, 16, 'g', sec(16.2));
  bands(sc, sec(16.4));
  page(sc, 0, sec(17.5));
  // 第一班（01 须弥号《夙愿》）的「检票」一闪一闪（要写在后几页之前，后面的页才会把它翻掉）
  const blink = (t0: number, n: number) => { for (let i = 0; i < n; i++) [...'检票'].forEach((ch, k) => { sc.set(2, 14 + k, t0 + i * sec(1.2) + k * 2, face(ch, 'g'), true, true); sc.set(2, 14 + k, t0 + i * sec(1.2) + sec(.6) + k * 2, face(ch, 'w'), true, true); }); };
  blink(sec(19.3), 6);
  page(sc, 1, sec(27.5)); page(sc, 2, sec(37.5), new Map([[8, 8]])); page(sc, 3, sec(47.5));
  sc.stuck(4, 8, sec(37.5) + 8 + 8 + 2 * 1.4 + 8, sec(1.4));                       // 翻第三页时，第 4 排节目第 3 格卡住
  [17, 23, 29, 35, 41, 47, 53].forEach((s, i) => ticker(sc, TICKER[i], sec(s)));
  // 9:00 猫报时（全屏：顶上走秒收起来）：白光从正中荡开收掉大屏 → 像钟敲九下，每敲一下铺上几格「喵」，九下铺成一个满屏的大 9
  //   → 底条「还有九分钟」→ 白光再荡一次，大屏回来
  wave(sc, sec(58.5), () => face(' ', 'g'), {speed: 2.2, rows: [0, 8]});
  const NINE: [number, number][] = [];
  for (let r = 0; r <= 7; r++) for (let c = 5; c <= 11; c++) if (bigOn('9', r, c, 0, 5)) NINE.push([r, c]);
  const ang = ([r, c]: [number, number]) => (Math.PI / 2 - Math.atan2(c - 8, -(r - 2)) + Math.PI * 4) % (Math.PI * 2);   // 从右边起、往上绕过顶、往左往下，像手写 9
  const loop = NINE.filter(([r]) => r <= 4).sort((a, b) => ang(a) - ang(b));                                                         // 先绕圈
  const tail = NINE.filter(([r]) => r > 4).sort((a, b) => a[0] - b[0] || b[1] - a[1]);                                                  // 再往下
  const order = [...loop, ...tail], per = Math.ceil(order.length / 9);
  for (let i = 0; i < 9; i++) {
    const t = sec(59.6 + i * .42), batch = order.slice(i * per, (i + 1) * per);
    batch.forEach(([r, c], k) => sc.set(r, c, t + k * 2, face('喵', 'w'), true, true));
    const [mr, mc] = batch[Math.floor(batch.length / 2)] ?? [4, 8];
    rf.add(mc + .5, mr + .5, t + 6, .9 + i * .06, 11, 40);
  }
  rf.add(8.5, 4, sec(63.5), 1.4, 15, 40);
  band(sc, '还有九分钟', sec(63.6));
  wave(sc, sec(64.9), () => face(' ', 'g'), {speed: 2.2, rows: [0, 7]});
  bands(sc, sec(66.0));
  page(sc, 4, sec(66.4)); page(sc, 0, sec(78.4)); blink(sec(80.2), 6);
  [66.9, 72.5, 78.5, 84.5].forEach((s, i) => ticker(sc, TICKER2[i], sec(s)));
  // 那一格：第 5 排状态的第二格（"正点"的"点"）下片特别轻，后面藏着一只"喵"
  sc.light.set(cellOf(5, 15), {k: 2.6, from: sec(71), to: sec(79), behind: face('喵', 'w')});
  // 风：开站那阵（强）、中间一阵微风、后面一阵（有一团只落在"那一格"上的猛风）
  rounds.push({a: sec(6.8), b: sec(12.5), U: .75, lag: 3}, {a: sec(28), b: sec(48), U: .3, lag: 3}, {a: sec(71.5), b: sec(77.5), U: .5, lag: 2.8});
  puffs.push(
    P(-3, 2.4, sec(7.2), .8, 2.8, 1.8, 120), P(-3, 6.4, sec(7.5), .7, 3, 2, 120, {vy: -.004}),
    P(-3, 4, sec(31), .35, 3, 2.2, 140),
    P(-3, 3, sec(72), .6, 2.8, 1.8, 110), P(15.2, 5.5, sec(73.2), 1.8, 1.2, .8, 18, {front: .35, sp: .8}),
  );
};
