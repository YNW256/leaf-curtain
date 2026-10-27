// 开场前·第七段（368~428 秒 = 3:52 → 3:00 后）：俄罗斯方块 + 3:00 列车报时。
//   俄罗斯方块：中间 10 列 × 8 排是一块白的屏幕（像掌机），方块是主题绿；左边竖着白牌「俄罗斯方块」，右边白牌记消了几行。
//   方块从上面落下来：先转好方向、横着挪到位置，再一格格落下。每块方块身上都印着字——满一排时整排翻成墨绿底白字，
//   正好是一句诗（每句 10 个字、四字加六字），停一下让人读完再消掉；八句消完这局就结束，整首诗一行行铺满白屏幕（正好 10 × 8）。
//   "玩家"是真的会玩：每块都把所有方向和位置试一遍，挑最平、洞最少、能消行的那个。
//   3:00 列车报时：底下铺一条虚线轨道，一列高铁从左边开进来，车厢上一节一个字「距开演还有三分钟」，停一下再开走。
import {V} from '../theme';
import {Ctx, WHITE, face, icon, jit, r01, sec} from './engine';

const FC0 = 4, FW = 10, FR0 = 1, FH = 8;                     // 场地：第 4~13 列、第 1~8 排
const SHAPES: Record<string, [number, number][]> = {
  I: [[0, 0], [0, 1], [0, 2], [0, 3]], O: [[0, 0], [0, 1], [1, 0], [1, 1]], T: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S: [[0, 1], [0, 2], [1, 0], [1, 1]], Z: [[0, 0], [0, 1], [1, 1], [1, 2]], J: [[0, 0], [1, 0], [1, 1], [1, 2]], L: [[0, 2], [1, 0], [1, 1], [1, 2]],
};
const rotate = (b: [number, number][]) => { const r = b.map(([y, x]) => [x, -y] as [number, number]); const my = Math.min(...r.map((p) => p[0])), mx = Math.min(...r.map((p) => p[1])); return r.map(([y, x]) => [y - my, x - mx] as [number, number]); };
const rotations = (k: string) => { const out: [number, number][][] = [SHAPES[k]]; for (let i = 0; i < 3; i++) out.push(rotate(out[out.length - 1])); return out.filter((b, i) => out.findIndex((o) => JSON.stringify(o) === JSON.stringify(b)) === i); };

export const seg7 = ({sc, rf}: Ctx) => {
  const W = face(' ', 'w'), G = face(' ', 'g'), K = face(' ', 'k');
  const PIECE = G, EMPTY = W;                               // 白屏幕上的绿方块
  // 先把上一段的大 4 和广播收掉
  for (let r = 1; r <= 8; r++) sc.fill(r, 0, 16, 'g', sec(367.9) + r * 2, .8);
  // 白屏幕从中间亮起来，两边的白牌字
  for (let r = FR0; r < FR0 + FH; r++) for (let c = FC0; c < FC0 + FW; c++) sc.set(r, c, sec(368.3) + Math.hypot(c + .5 - 9, (r + .5 - 5) * 1.2) * 2.4, EMPTY, false, true);
  [...'俄罗斯方块'].forEach((ch, i) => sc.text(2 + i, 1, ch, 'w', sec(368.8) + i * 4, {roll: 2}));
  sc.text(2, 15, '消', 'w', sec(369)); sc.text(3, 15, '行', 'w', sec(369.1)); sc.text(5, 15, '0', 'w', sec(369.3)); sc.text(6, 15, '0', 'w', sec(369.4));

  // 整局先在后台模拟一遍（不往墙上写），记下每消一行时这一行的 10 个小方块各是谁；把那一句诗按列分给它们；
  // 再正式玩一遍（和模拟的一模一样），每块方块落下来时身上就带着字。满一行先整行翻成墨绿底白字（正好是一句诗），停一下让人读完，再消掉。
  // 诗（十有十一写的）：前六句由纳西妲的六个命之座化来（取前四字和第六字），后两句写这场活动
  const POEM = ['心识蕴藏播种三千世界', '正等善见立根万物之源', '熏习成就沁芽轮回无底', '比量现行舒茎梳智净理',
    '妙谛破愚飘叶除暗归明', '大辩圆成结实觉忆悟果', '旅叶知微共赴行相之约', '千夜浮梦同赏一弯仰月'];
  const FILL = '旅叶知微';
  const charOf = new Map<number, string>();                          // 小方块编号（第几块 × 4 + 第几格）→ 印的字
  const play = (render: boolean) => {
    const grid: number[][] = Array.from({length: FH}, () => Array(FW).fill(-1));   // -1 = 空，否则是小方块编号
    const occ = (y: number, x: number) => grid[y][x] >= 0;
    const fits = (b: [number, number][], y: number, x: number) => b.every(([dy, dx]) => y + dy >= 0 && y + dy < FH && x + dx >= 0 && x + dx < FW && !occ(y + dy, x + dx));
    const dropY = (b: [number, number][], x: number) => { let y = 0; if (!fits(b, 0, x)) return -1; while (fits(b, y + 1, x)) y++; return y; };
    const score = (b: [number, number][], y: number, x: number) => {
      const g = grid.map((row) => row.map((v) => v >= 0)); b.forEach(([dy, dx]) => { g[y + dy][x + dx] = true; });
      const lines = g.filter((row) => row.every(Boolean)).length;
      const kept = g.filter((row) => !row.every(Boolean)); while (kept.length < FH) kept.unshift(Array(FW).fill(false));
      const hts = Array.from({length: FW}, (_, c) => { const r = kept.findIndex((row) => row[c]); return r < 0 ? 0 : FH - r; });
      let holes = 0; for (let c = 0; c < FW; c++) { let seen = false; for (let r = 0; r < FH; r++) { if (kept[r][c]) seen = true; else if (seen) holes++; } }
      const bump = hts.slice(1).reduce((a, h, i) => a + Math.abs(h - hts[i]), 0);
      return -.51 * hts.reduce((a, h) => a + h, 0) + .76 * lines - .36 * holes - .18 * bump;
    };
    const faceOf = (id: number, st: 'g' | 'k' = 'g') => face(charOf.get(id) ?? FILL[id % FILL.length], st);
    const put = (y: number, x: number, f: typeof W, tt: number) => { if (render) sc.set(FR0 + y, FC0 + x, tt, f, false, true); };
    const bag: string[] = [];
    let t = sec(370), lines = 0, n = 0;
    while (t < sec(411) && lines < POEM.length) {
      if (!bag.length) { const ks = Object.keys(SHAPES); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(r01(n * 3.1 + i * 7.7) * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; } bag.push(...ks); }
      const k = bag.shift()!, pid = n; n++;
      let best: {b: [number, number][]; x: number; y: number; s: number} | null = null;
      for (const b of rotations(k)) for (let x = 0; x < FW; x++) { const y = dropY(b, x); if (y < 0) continue; const sc0 = score(b, y, x); if (!best || sc0 > best.s) best = {b, x, y, s: sc0}; }
      if (!best) break;
      // 出现在顶上中间，横着挪过去，再一格格落下（每一格身上的字跟着走）
      const w = Math.max(...best.b.map((q) => q[1])) + 1;
      let x = Math.floor((FW - w) / 2), y = 0;
      const at = (yy: number, xx: number) => best!.b.map(([dy, dx], q) => [yy + dy, xx + dx, pid * 4 + q] as [number, number, number]);
      let cur = at(y, x);
      cur.forEach(([a, b, id]) => put(a, b, faceOf(id), t)); t += 8;
      const move = (ny: number, nx: number, dt: number) => {
        const next = at(ny, nx), nk = new Set(next.map(([a, b]) => a * 100 + b));
        cur.filter(([a, b]) => !nk.has(a * 100 + b)).forEach(([a, b]) => put(a, b, EMPTY, t));
        next.forEach(([a, b, id]) => put(a, b, faceOf(id), t));
        cur = next; y = ny; x = nx; t += dt;
      };
      while (x !== best.x) move(y, x + Math.sign(best.x - x), 6);
      while (y < best.y) move(y + 1, x, 6);
      cur.forEach(([a, b, id]) => { grid[a][b] = id; });
      if (render) rf.add(FC0 + x + w / 2, FR0 + y + 1, t, .45, 3.5, 14, .6, 40);
      // 消行：满的那几排先整排翻成墨绿底白字（一句诗），停一秒让人读完，再消掉、上面的往下落
      const full = grid.map((row, i) => (row.every((v) => v >= 0) ? i : -1)).filter((i) => i >= 0);
      if (full.length) {
        full.forEach((i) => {
          if (!render && lines < POEM.length) grid[i].forEach((id, c) => charOf.set(id, POEM[lines][c]));
          if (render) grid[i].forEach((id, c) => put(i, c, faceOf(id, 'k'), t + c * 2));
          lines++;
        });
        if (render) rf.add(FC0 + 5, FR0 + full[0] + .5, t + 10, .7, 8, 28);
        t += sec(1.25);
        const before = grid.map((row) => [...row]);
        const kept = grid.filter((_, i) => !full.includes(i)); while (kept.length < FH) kept.unshift(Array(FW).fill(-1));
        kept.forEach((row, i) => { grid[i] = row; });
        for (let r = 0; r < FH; r++) for (let c = 0; c < FW; c++) if (full.includes(r) || before[r][c] !== grid[r][c]) put(r, c, grid[r][c] >= 0 ? faceOf(grid[r][c]) : EMPTY, t + (FH - r) * 2);
        if (render) { rf.add(FC0 + 5, FR0 + full[0] + .5, t, .9, 9, 30); const cnt = String(lines).padStart(2, '0'); sc.text(5, 15, cnt[0], 'w', t + 4); sc.text(6, 15, cnt[1], 'w', t + 6); }
        t += sec(.3);
      }
      t += 6;
    }
    return t;
  };
  play(false);                                                       // 先模拟，分好字
  const t = play(true);                                              // 再正式玩
  void PIECE;
  // 通关：剩下的方块收掉，整首诗一行行铺满白屏幕（场地正好 10 列 × 8 排 = 八句 × 十个字）
  const done = t + sec(.6);
  for (let r = 0; r < FH; r++) for (let c = 0; c < FW; c++) sc.set(FR0 + r, FC0 + c, done + (FH - r) * 2 + c, EMPTY, false, true);
  POEM.forEach((line, i) => sc.text(FR0 + i, FC0, line, 'w', done + sec(.8 + i * .45), {roll: 1, stagger: 1.5}));
  rf.add(FC0 + 5, FR0 + 4, done + sec(4.4), 1.2, 12, 40);
  // 收掉：场地从下往上、两边的字
  for (let r = FH - 1; r >= 0; r--) for (let c = 0; c < FW; c++) sc.set(FR0 + r, FC0 + c, Math.max(done + sec(7.5), sec(413.5)) + (FH - r) * 4 + jit(r * 17 + c, 2), G);
  for (let r = 1; r <= 8; r++) for (const c of [1, 15]) sc.set(r, c, Math.max(t + sec(1.6), sec(415)) + r * 3, G);

  // ── 3:00 列车报时 ──
  for (let c = 0; c <= 16; c += 2) sc.set(6, c, sec(418.6) + c * 3, W);                    // 虚线轨道
  const cars = [...'距开演还有三分钟'];
  const TRAIN = cars.length + 1;
  const draw = (head: number, tt: number, prevHead: number | null) => {
    for (let i = 0; i < TRAIN; i++) {
      const c = head - i; if (c < 0 || c > 16) continue;
      const f = i === 0 ? icon('train', V.g, WHITE) : face(cars[cars.length - i], 'w');          // 车头后面一节是「钟」，最后一节是「距」
      sc.set(5, c, tt, f, false, true);
    }
    if (prevHead !== null) { const tail = prevHead - TRAIN + 1; if (tail >= 0 && tail <= 16 && tail < head - TRAIN + 1) sc.set(5, tail, tt, G, false, true); }
  };
  let tt = sec(420.2);
  for (let h = 0; h <= 12; h++) { draw(h, tt, h ? h - 1 : null); tt += 6; }        // 车头停在第 12 列：整列车占 4~12 列，正好居中
  tt += sec(3);
  for (let h = 13; h <= 16 + TRAIN; h++) { draw(h, tt, h - 1); tt += 6; }
  for (let c = 0; c <= 16; c += 2) sc.set(6, c, tt + 10 + c * 2, G);
};

