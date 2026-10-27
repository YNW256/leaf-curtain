// 开场前·第六段（300~368 秒 = 5:00 → 3:52）：5:00 纸飞机拉横幅 + 须弥大树生长 + 4:00 极客报时。
//   5:00 纸飞机（全屏）：一架整格对齐的白纸飞机从左往右飞过去，后面拖一串白牌横幅「还有五分钟」，横幅一节节上下起伏；身后的气流掀起一路下片。
//   大树（约 11 秒）：地面 → 种子 → 嫩芽顶着往上长成树干 → 枝条 → 树冠一片片长出来 → 开花 → 一阵大风把树吹散，叶子一串串往右飞走，墙也清空了。
//   4:00 报时（4:41 起）：从孤零零一个「2+2」开始，一张张白牌公式卡片流动着换、越来越多越难越快（公式墙）→ 占满一屏的压轴积分
//   → 整面墙在各种「四」之间乱翻 → 4:00 正好收成满屏大 4，「还有四分钟」，最后落到「第四届纳西妲生日会」。
import {P} from '../flap/windSim';
import {V} from '../theme';
import {FlapFace} from '../flap/FlapModule';
import {band as bandC} from './common';
import {COLS, Ctx, INKG, WHITE, animate, bigOn, cellOf, face, icon, jit, r01, sec, wave} from './engine';

const TREE = [
  '......LLLLL......',
  '....LLLLLLLLL....',
  '...LLLLLLLLLLL...',
  '..LLLBLLLLLBLLL..',
  '..LLLLBLTLBLLLL..',
  '....L.BBTBB.L....',
  '........T........',
];                                                          // 第 1~7 排；第 8 排是地面

export const seg6 = ({sc, rf, rounds, puffs, extra}: Ctx) => {
  const band = (msg: string, t: number) => bandC(sc, msg, t);

  // ── 5:00 纸飞机拉横幅（全屏）：整格的白纸飞机从左往右飞过去，后面拖一串白牌横幅「还有五分钟」，横幅一节节上下起伏 ──
  const PLANE = ['WW.....', '.WWWW..', '..WWWWW', '.WWW...', 'WW.....'];   // 机头朝右，第 2~6 排，机头在最右一列
  const BANNER = [...'还有五分钟'], T0 = sec(299.7), PSTEP = 9;
  const snaps: [number, Map<number, FlapFace>][] = [];
  for (let k = 0, hx = -1; hx - 9 - BANNER.length < COLS; k++, hx++) {
    const m = new Map<number, FlapFace>();
    PLANE.forEach((row, dr) => [...row].forEach((ch, dc) => { const c = hx - 6 + dc; if (ch === 'W' && c >= 0 && c < COLS) m.set(cellOf(2 + dr, c), face(' ', 'w')); }));
    BANNER.forEach((ch, j) => {
      const c = hx - 9 - (BANNER.length - 1 - j), r = 4 + Math.round(.8 * Math.sin(k * .6 - j * .5));   // 起伏小一点，相邻的字大多在同一排，读得通
      if (c >= 0 && c < COLS) m.set(cellOf(r, c), face(ch, 'w'));
    });
    snaps.push([T0 + k * PSTEP, m]);
  }
  animate(sc, snaps);
  const planeX = (t: number) => -1 + (t - T0) / PSTEP;
  extra.push((x, y, t) => {                                  // 飞机身后的气流
    if (t < T0 || t > T0 + snaps.length * PSTEP + 40) return 0;
    let w = 0;
    for (let k = 3; k <= 27; k += 4) w += 1.4 * Math.exp(-(((x - (planeX(t - k) - 4)) ** 2 + (y - 4.5) ** 2) / 2.2)) * Math.exp(-k / 12);
    return w;
  });

  // ── 须弥大树（约 11 秒，长了会拖，时间留给后面的公式墙）──
  for (let c = 0; c < COLS; c++) sc.set(8, c, sec(308.2) + Math.abs(c - 8) * 2, face(' ', 'w'));          // 地面
  sc.set(8, 8, sec(308.7), icon('dot', V.g, WHITE), true); rf.add(8.5, 8.5, sec(308.8), .7, 4, 16, .6, 50);   // 种子
  sc.set(7, 8, sec(309.1), icon('leaf', V.g, WHITE, -45)); rf.add(8.5, 7.5, sec(309.2), .6, 4, 16, .6, 50);     // 嫩芽
  // 嫩芽顶着往上长，长过的地方变成树干
  [6, 5, 4].forEach((r, i) => {
    const t = sec(309.4 + i * .3);
    sc.set(r, 8, t, icon('leaf', V.g, WHITE, -45 + i * 15)); sc.set(r + 1, 8, t + 2, face(' ', 'k'));
  });
  sc.set(8, 8, sec(309.6), face(' ', 'w'));                                           // 种子长进地里
  // 枝条：离树干越远越晚
  const cells: {r: number; c: number; ch: string}[] = [];
  TREE.forEach((row, i) => [...row].forEach((ch, c) => { if (ch !== '.') cells.push({r: i + 1, c, ch}); }));
  const branches = cells.filter((q) => q.ch === 'B');
  branches.forEach((q) => sc.set(q.r, q.c, sec(310.4) + (Math.abs(q.c - 8) - 1) * sec(.2) + (6 - q.r) * sec(.15), face(' ', 'k')));
  // 树冠：从枝头和树干顶往外一片片长出来
  const tips = [...branches, {r: 4, c: 8, ch: 'T'}];
  const canopy = cells.filter((q) => q.ch === 'L' || q.ch === 'W');
  canopy.forEach((q) => {
    const d = Math.min(...tips.map((b) => Math.hypot(q.r - b.r, q.c - b.c)));
    const t = sec(311.2) + d * sec(.24) + jit(q.r * 31 + q.c, 4);
    sc.set(q.r, q.c, t, icon('leaf', WHITE, V.g, -60 + r01(q.r * 13 + q.c * 7) * 120));
    rf.add(q.c + .5, q.r + .5, t + 8, .25, 2.5, 12, .5, 30);
  });
  // 微风里叶子轻轻晃一下，开花
  rounds.push({a: sec(312.6), b: sec(315.6), U: .3, lag: 3});
  const blooms = [[2, 6], [3, 11], [4, 3], [1, 8], [5, 13], [3, 7]];
  blooms.forEach(([r, c], i) => { const t = sec(313.2 + i * .3); sc.set(r, c, t, face('花', 'g'), true); rf.add(c + .5, r + .5, t + 8, .5, 3, 14, .55, 40); });
  // 一阵大风把树吹散（顺手把墙清空，交给公式墙）
  rounds.push({a: sec(315.6), b: sec(320.5), U: .7, lag: 2.6});
  puffs.push(P(-3, 3, sec(315.8), .7, 3, 2.2, 120), P(-3, 6, sec(316.1), .6, 3, 2.2, 120));
  [...cells, {r: 4, c: 8, ch: 'T'}].forEach((q) => sc.set(q.r, q.c, sec(316.1) + q.c * 2.6 + 10 + jit(q.r * 17 + q.c, 4), face(' ', 'g')));
  // 叶子一串串往右飞走：从树冠里挑一些格，被吹起来以后一格格往右（有的往上飘一格）
  canopy.filter((_, i) => i % 3 === 0).forEach((q, k) => {
    let t = sec(316.1) + q.c * 2.6 + 12 + jit(k * 13, 3), r = q.r;
    for (let c = q.c + 1; c <= 16; c++) {
      if (r01(k * 7 + c) < .25 && r > 1) r--;
      sc.set(r, c, t, icon('leaf', WHITE, V.g, -40 + r01(k + c) * 80), true, true); sc.set(r, c, t + 7, face(' ', 'g'), true, true);
      t += 4;
    }
  });
  for (let c = 0; c < COLS; c++) sc.set(8, c, sec(317.6) + c * 2.6 + jit(c * 5, 3), face(' ', 'g'));

  // ── 4:00 报时（4:41 起，全屏：顶上走秒 318.4~363 秒收起来）：从孤零零一个「2+2」开始，越来越多、越来越难，大 4 正好落在 4:00 ──
  //   一~三、公式墙（见下）
  //   四、压轴：60/π⁴ ∫₀^∞ x³/(eˣ−1) dx = 4 占满一屏
  //   五、整面墙在「四」「肆」「four」「vier」「quatre」…之间乱翻三下 → 4:00 正好收成满屏大 4，「还有四分钟」→「第四届纳西妲生日会」
  //   （所有式子都严格等于 4；方圆体里没有的 ∫ ∑ π ∞ ⌈⌉ 和分数线是照它粗圆的笔画画的，上下标是小字牌）
  const GLYPH: Record<string, 'int' | 'sum' | 'pi' | 'inf' | 'lceil' | 'rceil' | 'bar' | 'vbar'> = {int: 'int', sum: 'sum', pi: 'pi', inf: 'inf', lc: 'lceil', rc: 'rceil', bar: 'bar', vbar: 'vbar'};
  /** 公式写法：一个字一格；^x 上标、_x 下标（小字牌）；{int}{sum}{pi}{inf}{lc}{rc}{bar}{vbar} 是画出来的符号；空格 = 这格不动 */
  const fx = (src: string): (FlapFace | null)[] => {
    const out: (FlapFace | null)[] = [];
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '{') { const j = src.indexOf('}', i); out.push(icon(GLYPH[src.slice(i + 1, j)], WHITE, V.g)); i = j; }
      else if (ch === '^' || ch === '_') { out.push({k: 'char', ch: src[i + 1], bg: WHITE, ink: V.g, pos: ch === '^' ? 'sup' : 'sub'}); i++; }
      else out.push(ch === ' ' ? null : face(ch, 'w'));
    }
    return out;
  };
  const put = (r: number, c0: number, src: string, t: number, stagger = 1.5) => fx(src).forEach((f, i) => { if (f) sc.set(r, c0 + i, t + i * stagger, f, false, true); });
  const G = face(' ', 'g');
  // 一~三、公式墙（4:41 → 4:05）：「算一算这是几？」——式子一张张流动着换，不整屏擦掉马上又换。
  //   每个式子是一张白牌卡片（框里没字的格也是白的），四周至少空一格绿牌，谁也不挨着谁；不分固定格位。
  //   每次只换一张：到时候的（或者地方不够时最老的）那张翻回绿牌，新的一张翻在离上两次换的地方远一点的空地上——变化满屏跳，墙一直在动。
  //   先慢后快：开头只有一个「2+2」停 5 秒，每张来的间隔从约 2.8 秒一路缩到 0.33 秒；简单的越往后停得越短，复杂的（好几排）至少停 4 秒。
  //   这 41 秒算整分报时，顶上走秒收起来；卡片在第 0~6 排，第 7 排空着，不和底下白的广播条连成一片；底条带弹幕「算一算这是几？」。所有式子都严格等于 4
  type Card = {rows: [number, number, string][]; w: number; h: number};
  const card = (rows: [number, number, string][]): Card => ({rows, w: Math.max(...rows.map(([, dc, src]) => dc + fx(src).length)), h: Math.max(...rows.map(([dr]) => dr)) + 1});
  const one = (src: string) => card([[0, 0, src]]);
  const BAR = (n: number) => '{bar}'.repeat(n);
  const EASY = ['2+2', '2×2', '8÷2', '√16', '2^2', '3.999…', '1+3', '10−6'].map(one);
  const GEEK = ['{lc}{pi}{rc}', '3!−2!', 'log_216', '0b100', '|3+4i|−1', 'csc^2({pi}/6)', '{lc}√15{rc}', 'IV', '(2i)(−2i)', 'gcd(20,28)', 'log_381', '0x4',
    '5!/(5·3!)', '2(1+i)(1−i)', '−(1+i)^4', '√(12+√(12+…))', '16÷4'].map(one);
  // 好几排的：墙只有 15×7，三排高的同时最多放两张、每张要停 4 秒多，所以只挑这几张，按时间每隔约 2.5 秒来一张
  const MULTI: Card[] = [
    card([[0, 1, '{inf}'], [1, 1, '{sum}(3/4)^n=4'], [2, 0, 'n=0']]),                                                                                                 // 等比级数
    card([[0, 0, '_2'], [1, 0, '{int}x^3dx=4'], [2, 0, '^0']]),                                                                                                       // ∫₀² x³ dx
    card([[0, 0, '{vbar}31{vbar}'], [1, 0, '{vbar}22{vbar}=4']]),                                                                                                     // 行列式 |3 1; 2 2|
    card([[0, 3, '{pi}'], [1, 0, BAR(7) + '=4'], [2, 0, 'arctan1']]),                                                                                                 // π / arctan1
    card([[0, 0, '24'], [1, 0, BAR(2)], [2, 0, '{pi}^2'], [0, 4, '{inf}'], [1, 4, '{sum}'], [2, 3, 'n=1'], [0, 7, '1'], [1, 7, BAR(1)], [2, 7, 'n^2'], [1, 9, '=4']]),   // 巴塞尔
    card([[0, 1, '{inf}'], [1, 1, '{sum}'], [2, 0, 'n=1'], [0, 7, '4'], [1, 4, BAR(6) + '=4'], [2, 4, 'n(n+1)']]),                                                    // 裂项求和
    card([[0, 0, "y'=2y"], [1, 0, 'y(0)=1'], [2, 0, 'y(ln2)=4']]),                                                                                                    // 微分方程
    card([[0, 5, '1'], [1, 0, '3+' + BAR(7) + '=4'], [2, 6, '1'], [3, 2, '2−' + BAR(5)], [4, 5, '2−…']]),                                                             // 连分数
  ];
  // 最后那段闪得快：从这些短的里轮着挑
  const FAST = ['2+2', '2×2', '8÷2', '√16', '2^2', '1+3', '10−6', '12÷3', '16÷4', '0.5×8', 'IV', '0x4', '0b100', '3!−2!', '{lc}{pi}{rc}', 'log_216', '20÷5', '7−3'].map(one);
  const W0 = 318.9, W1 = 354.6;                                              // 公式墙（秒）
  type Live = {r: number; c: number; k: Card; tIn: number; tOut: number};
  const live: Live[] = [], recent: [number, number][] = [[3.5, 8.5]];
  const flip = (q: Live, t: number, out: boolean) => {
    const faces = new Map<number, FlapFace>();
    if (!out) q.k.rows.forEach(([dr, dc, src]) => fx(src).forEach((f, i) => { if (f) faces.set(cellOf(q.r + dr, q.c + dc + i), f); }));
    for (let r = q.r; r < q.r + q.k.h; r++) for (let c = q.c; c < q.c + q.k.w; c++)
      sc.set(r, c, t + (c - q.c) * 1.3 + (r - q.r) * 3 + jit(r * 13 + c * 7 + t, 1), out ? G : faces.get(cellOf(r, c)) ?? face(' ', 'w'), false, true);
  };
  // 先简单的；4:30 起每隔约 2.5 秒来一张好几排的，中间用一行的补空；一行的用完了就从 FAST 里轮着挑
  const ONES = [...EASY, ...GEEK], SEQ: Card[] = [];
  let t = W0, n = 0, nextMulti = 330, oi = 0, mi = 0;
  const retry = new Map<Card, number>();
  while (t < W1) {
    if (SEQ.length <= n) SEQ.push(t >= nextMulti && mi < MULTI.length ? (nextMulti = t + 2.5, MULTI[mi++]) : oi < ONES.length ? ONES[oi++] : FAST[(n * 7) % FAST.length]);
    const k = SEQ[n];
    const complex = k.h > 1;
    const life = n === 0 ? 5.5 : complex ? Math.max(4.5, 8.5 * .97 ** n) : Math.max(2.6, 8 * .95 ** n);
    // 每个能放的位置：挡在这里的卡片（框连一格边距相交、还亮着的）越少越好、越老越好；只挡得住亮够了的（简单的 1.2 秒、好几排的 3 秒）
    let best: {r: number; c: number; hit: Live[]; score: number} | null = null;
    for (let r = 0; r + k.h - 1 <= 6; r++) for (let c = 1; c + k.w - 1 <= 15; c++) {
      const hit = live.filter((q) => q.tOut + .5 > t && !(r + k.h + 1 <= q.r || q.r + q.k.h + 1 <= r || c + k.w + 1 <= q.c || q.c + q.k.w + 1 <= c));
      if (hit.some((q) => t - q.tIn < (q.k.h > 1 ? 2.5 : 1.0))) continue;
      const cy = r + k.h / 2, cx = c + k.w / 2;
      const spread = n === 0 ? -Math.hypot(cx - 8.5, cy - 3.5) : Math.min(...recent.slice(-2).map(([y, x]) => Math.hypot(cx - x, (cy - y) * 1.4)));
      const score = -6 * hit.length - hit.reduce((a, q) => a + (q.k.h > 1 ? 3 : 0) - .3 * (t - q.tIn), 0) + spread + 2.2 * r01(n * 3.1 + r * 1.7 + c * .37);
      if (!best || score > best.score) best = {r, c, hit, score};
    }
    // 放不下（挡路的卡片都还没亮够）：这张往后挪两位，先放下一张；同一张最多挪三次
    if (!best && k.h > 1 && (retry.get(k) ?? 0) < 4) { retry.set(k, (retry.get(k) ?? 0) + 1); SEQ.splice(n, 1); mi--; nextMulti = t + .6; continue; }   // 好几排的这会儿放不下：先放一行的，0.6 秒后再试
    if (best) {
      best.hit.sort((a, b) => a.tIn - b.tIn).forEach((q, i) => { q.tOut = Math.min(q.tOut, t - .45 - i * .25); });
      const q: Live = {r: best.r, c: best.c, k, tIn: t, tOut: Math.min(t + life, W1 + .6)};
      live.push(q);
      recent.push([q.r + k.h / 2, q.c + k.w / 2]);
      rf.add(q.c + k.w / 2, q.r + k.h / 2, sec(t) + 6, complex ? .6 : .35, complex ? 7 : 4, 18, .6, 40);
    }
    t += n === 0 ? 3.4 : Math.max(.3, 2.6 * .92 ** n);
    n++;
  }
  // 翻上来、翻回去都算好以后，按时刻先后写进剧本（被挤掉的卡片翻回去的时刻提前了，先后写错会把新卡片的格子吃掉）
  live.flatMap((q) => [[q.tIn, q, false], ...(q.tOut < W1 + .6 ? [[q.tOut, q, true]] : [])] as [number, Live, boolean][])
    .sort((a, b) => a[0] - b[0]).forEach(([tt, q, out]) => flip(q, sec(tt), out));
  band('算一算这是几？', sec(319.4));
  band('弹幕报出答案！', sec(333.0));
  band('你算出来了吗？', sec(346.0));
  wave(sc, sec(355.2), () => G, {speed: 1.3, rows: [0, 7]});
  // 四、压轴：60/π⁴ ∫₀^∞ x³/(eˣ−1) dx = 4
  const MONSTER: [number, number, string][] = [
    [0, 2, '60'], [0, 6, '{inf}'], [0, 9, 'x^3'],
    [1, 2, '{bar}{bar}'], [1, 6, '{int}'], [1, 8, '{bar}{bar}{bar}{bar}'], [1, 12, 'dx=4'],
    [2, 2, '{pi}^4'], [2, 6, '^0'], [2, 8, 'e^x−1'],
  ];
  MONSTER.forEach(([dr, dc, src]) => put(3 + dr, dc, src, sec(355.7) + dc * 3, 1.5));                  // 停够两秒多
  rf.add(8.5, 4.5, sec(356.4), 1.4, 15, 36);
  // 五、整面墙在各种「四」之间乱翻三下
  const WORDS = ['四', '肆', 'four', 'vier', 'quatre', 'cuatro', 'quattro', 'IV', '4', '2+2', '2×2', '√16'];
  [358.9, 359.25, 359.6].forEach((s0, k) => {
    for (let r = 0; r <= 7; r++) {
      let c = Math.floor(r01(k * 31 + r * 7) * 2);
      const row: (FlapFace | null)[] = Array(COLS).fill(null);
      while (c < COLS) {
        const w = fx(WORDS[Math.floor(r01(k * 13 + r * 5 + c * 3.1) * WORDS.length)]);
        if (c + w.length > COLS) break;
        w.forEach((f, i) => { row[c + i] = f; });
        c += w.length + 1;
      }
      row.forEach((f, c2) => sc.set(r, c2, sec(s0) + jit(k * 17 + r * 7 + c2, 3) + 3, f ?? G, false, true));
    }
  });
  // 4:00 正好：收成满屏的大 4
  for (let r = 0; r <= 7; r++) for (let c = 0; c < COLS; c++) sc.set(r, c, sec(360) + Math.hypot(c + .5 - 8.5, (r + .5 - 4) * 1.1) * 1.2, bigOn('4', r, c, 0, 5) ? face(' ', 'w') : G, false, true);
  rf.add(8.5, 4, sec(360.2), 1.6, 15, 40);
  band('还有四分钟', sec(360.3));
  // 落到我们自己的四
  wave(sc, sec(362.6), () => G, {speed: 1.5, rows: [1, 7]});
  sc.center(4, '第四届纳西妲生日会', 'w', sec(363.1), {roll: 2, stagger: 2.5});
  rf.add(8.5, 4.5, sec(363.5), 1.2, 14, 38);
  sc.fill(8, 0, 16, 'g', sec(365.6), .8);
};
