# 翻牌墙的音效：墙上每一片拍下去都发一声，时刻和轻重来自 sfx_events.ts 按画面同一套物理算出来的事件表。
#   声音原料：Freesound 上 ngruber 录的真翻牌机（CC0，#261244，audio/sfx/fs261244_ngruber.mp3）。
#   从录音里自动切出几十下干净的单片"嗒"，去底噪，每次随机挑一下、音高略变，按列放到左右声道。
#   两个版本：A 原声小翻牌（只有录音原样的脆响）；B 大翻牌（再叠一层降八度的同一下，更厚、更像车站大屏，加车站大厅的混响、
#   一点风声和 8:30 那段的雨声、雷声，见 rain_layer）。最后跟着画面渐黑一起收掉。
# 用法（先 npm run events 生成事件表）：python3 audio/make_sfx.py [A|B|both]
#   出：out/sound/开场前音效_A.wav / _B.wav（48 kHz 立体声，和画面一样长、从第 0 帧对齐）、分轨 stems_B/*.flac
import json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.ndimage import maximum_filter1d, minimum_filter1d, uniform_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SFX = os.path.join(ROOT, 'audio/sfx')                                       # 声音原料（全部是 Freesound CC0，出处见 audio/sfx/SOURCES.md）
SRC = os.path.join(SFX, 'fs261244_ngruber.mp3')
OUT = os.path.join(ROOT, 'out/sound')
FILES = {                                                                   # 雨声、雷声、水滴
    'rain_light_01': 'fs454130_kyles.mp3', 'rain_steady_01': 'fs486877_bitlab_coop.mp3', 'rain_heavy_01': 'fs171981_conleec.mp3',
    'thunder_03': 'fs683420_SholeColtis.mp3', 'thunder_04': 'fs795412_LukaCafuka.mp3', 'water_drip_02': 'fs727798_itinerantmonk108.mp3',
}
SR = 48000
RAIN_DB = -33                                                               # 雨最大时雨声的电平（RMS，dBFS，进限幅前）
rng = np.random.default_rng(20261027)


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def load2(path):
    """立体声（雨声、雷声这些环境声要保留左右）：2 × 采样数"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, 2).T


def stft_denoise(g, noise, over=1.8, floor=.06):
    """谱减去底噪（录音底下有约 -35 dB 的嘶声，几千下叠起来会变成一片沙沙声）"""
    f, t, Z = signal.stft(g, SR, nperseg=256, noverlap=192)
    mag = np.abs(Z)
    clean = np.maximum(mag - over * noise[:, None], floor * mag)
    _, y = signal.istft(clean * np.exp(1j * np.angle(Z)), SR, nperseg=256, noverlap=192)
    return y[:len(g)]


def cut_grains(x):
    """从录音里切单片的"嗒"：找起音（1 毫秒一格的高频能量跳变），30 毫秒内的几下算同一片，
    前后都空得够开的才要；再去掉太响、太闷、太尖的，均匀挑 48 下"""
    hp = np.diff(x, prepend=0)
    hop = SR // 1000
    e = np.sqrt(np.add.reduceat(hp ** 2, np.arange(0, len(hp), hop)) / hop)
    db = 20 * np.log10(e + 1e-7)
    base = np.median(db)
    on, last = [], -100
    for i in range(3, len(db) - 1):
        if db[i] > base + 18 and db[i] - db[i - 3:i].min() > 10 and i - last > 8:
            on.append(i); last = i
    cl = []
    for o in on:
        if cl and o - cl[-1][0] <= 35: cl[-1].append(o)
        else: cl.append([o])
    st = np.array([c[0] for c in cl])
    gap_a, gap_b = np.diff(st, append=10 ** 9), np.diff(st, prepend=-10 ** 9)
    # 底噪的样子：录音 74.5~82.5 秒那段没有翻牌
    _, _, Zn = signal.stft(x[int(74.5 * SR):int(82.5 * SR)], SR, nperseg=256, noverlap=192)
    noise = np.abs(Zn).mean(1)
    L, pre = int(.085 * SR), int(.003 * SR)
    fade = np.ones(L); fade[-int(.02 * SR):] = np.linspace(1, 0, int(.02 * SR)) ** 2
    out, feat = [], []
    for k in np.where((gap_a >= 75) & (gap_b >= 45))[0]:
        s = int(st[k] * SR / 1000) - pre
        g = x[s:s + L]
        if len(g) < L: continue
        g = stft_denoise(g, noise) * fade
        sp = np.abs(np.fft.rfft(g * np.hanning(L))); fr = np.fft.rfftfreq(L, 1 / SR)
        out.append(g); feat.append(((sp * fr).sum() / sp.sum(), np.abs(g).max()))
    feat = np.array(feat)
    lo_c, hi_c = np.percentile(feat[:, 0], [15, 85]); lo_p, hi_p = np.percentile(feat[:, 1], [15, 90])
    keep = [i for i in range(len(out)) if lo_c <= feat[i, 0] <= hi_c and lo_p <= feat[i, 1] <= hi_p]
    pick = [keep[int(j)] for j in np.linspace(0, len(keep) - 1, 48)]
    return [out[i] / np.abs(out[i]).max() for i in pick]


def repitch(g, r):
    """r < 1 变低变长（同一下慢放），r > 1 变高变短"""
    n = int(len(g) / r)
    return np.interp(np.arange(n) * r, np.arange(len(g)), g)


def bank(grains):
    """每一下备好几种：原样（略变音高）、闷一点的（回弹、风掀这种轻碰）、降八度的（B 版叠在下面加厚）"""
    lp_dull = signal.butter(2, 2600, 'low', fs=SR, output='sos')
    lp_big = signal.butter(2, 3200, 'low', fs=SR, output='sos')
    hp_big = signal.butter(2, 90, 'high', fs=SR, output='sos')
    B = {'tick': [], 'dull': [], 'big': []}
    for g in grains:
        for r in (.95, 1.0, 1.05):
            B['tick'].append(repitch(g, r))
        B['dull'].append(signal.sosfilt(lp_dull, repitch(g, .9)))
        for r in (.5, .56):
            b = signal.sosfilt(hp_big, signal.sosfilt(lp_big, repitch(g, r)))
            B['big'].append(b / np.abs(b).max())
    return B


def place(bus, g, t, gain, pan):
    """把一下放到立体声里：等功率声像，远的那边晚到一点点（最多 0.3 毫秒）"""
    i = int(round(t * SR))
    if i < 0 or i >= bus.shape[1]: return
    gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    d = int(abs(pan) * .0003 * SR)
    n = min(len(g), bus.shape[1] - i - d)
    if n <= 0: return
    if pan >= 0:
        bus[0, i + d:i + d + n] += gain * gl * g[:n]; bus[1, i:i + n] += gain * gr * g[:n]
    else:
        bus[0, i:i + n] += gain * gl * g[:n]; bus[1, i + d:i + d + n] += gain * gr * g[:n]


def hall_ir(rt60=1.1, length=1.6, seed=7):
    """车站大厅的混响：几下早期反射 + 越来越暗的指数衰减噪声（左右不相关）"""
    r = np.random.default_rng(seed)
    n = int(length * SR); t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for ch in range(2):
        tail = r.standard_normal(n) * np.exp(-6.9 * t / rt60)
        bright = signal.sosfilt(signal.butter(1, 5000, 'low', fs=SR, output='sos'), tail)
        dark = signal.sosfilt(signal.butter(1, 1200, 'low', fs=SR, output='sos'), tail)
        mix = np.clip(t / .5, 0, 1)
        ir[ch] = (1 - mix) * bright + mix * dark * 1.6
        ir[ch, :int(.018 * SR)] = 0                                             # 预延迟 18 毫秒
        for k in range(7):                                                      # 早期反射
            ir[ch, int(r.uniform(.019, .06) * SR)] += r.uniform(.25, .6) * (1 if r.random() > .5 else -1)
    return ir / np.sqrt((ir ** 2).sum(1)).max()


def compress(x, thr_db=-20, ratio=2.4, att=.003, rel=.16):
    """总线压缩：一整面墙一起翻的时候别一下冲太响，零零星星的几下也别太小"""
    env = np.sqrt(np.maximum(0, uniform_filter1d((x ** 2).max(0), int(.01 * SR))))
    lvl = 20 * np.log10(env + 1e-9)
    gr = np.minimum(0, (thr_db - lvl) * (1 - 1 / ratio))
    # 起得快、回得慢：在 1 毫秒一格上做
    blk = SR // 1000
    g = gr[::blk].copy()
    a, r_ = np.exp(-1 / (att * 1000)), np.exp(-1 / (rel * 1000))
    for i in range(1, len(g)):
        c = a if g[i] < g[i - 1] else r_
        g[i] = c * g[i - 1] + (1 - c) * g[i]
    g = np.interp(np.arange(x.shape[1]) / blk, np.arange(len(g)), g)
    return x * 10 ** (g / 20)


def limit(x, ceil=10 ** (-1 / 20)):
    look = int(.003 * SR)
    pk = maximum_filter1d(np.abs(x).max(0), 2 * look + 1)
    need = np.minimum(1, ceil / np.maximum(pk, 1e-9))
    g = uniform_filter1d(minimum_filter1d(need, 2 * look + 1), look)
    return np.clip(x * g, -ceil, ceil)


def follow(x, att, rel, fps=30):
    """包络跟随：往上走用 att 秒、往下走用 rel 秒（一阶）"""
    ca, cr = np.exp(-1 / (att * fps)), np.exp(-1 / (rel * fps))
    y, v = np.empty_like(x), 0.0
    for i, xi in enumerate(x):
        c = ca if xi > v else cr
        v = c * v + (1 - c) * xi
        y[i] = v
    return y


def air_layer(air, n):
    """风声：墙上的风多大，就有多大一片气流声。
    画面上一阵风说来就来、说停就停，九十多阵里大半是零点几秒的小风，起得几乎是瞬间；声音直接跟着走会一下冒出来、一下没了，很生硬。所以：
      · 起得慢、收得更慢：往上 0.45 秒、往下 2.2 秒；再倒着跟一遍，风声比牌翘起来早约 0.7 秒开始起（先听见风过来，牌才动）
      · 很小的风（< 0.06）不单独出声，零碎的几下并成一口软软的气
      · 质感：暗、中、亮三层气流按风大小换比例（风大才亮），上面一层慢慢起伏的阵风（0.1–0.5 Hz），风大时有一点飘忽的哨音
      · 左右：两半墙的差只让声像偏一些（±35%），两声道再互相渗一点，不会一边突然响"""
    a = np.clip(np.array(air), 0, 2)                                         # 每 2 帧一个（30 Hz），两列 = 左右两半墙
    t30 = np.arange(len(a)) / 30
    e = np.maximum(0, a.mean(1) - .06) / .94
    env30 = np.maximum(follow(e, .45, 2.2), .9 * follow(e[::-1], .45, .7)[::-1]) ** 1.2
    side30 = follow(np.abs(a[:, 0] - a[:, 1]), .5, 1.5) * np.sign(uniform_filter1d(a[:, 0] - a[:, 1], 45))
    side30 = np.clip(side30 / (a.mean(1).max() + 1e-6) * 2, -1, 1)
    up = lambda v: np.interp(np.arange(n) / SR, t30, v)
    env, side = up(env30), up(side30)
    k = np.clip(env, 0, 1.5)
    # 阵风：两条极慢的随机起伏（每声道各一条，略不同步）
    def lfo(seed):
        r = np.random.default_rng(seed).standard_normal(len(a))
        r = signal.sosfiltfilt(signal.butter(2, .45, 'low', fs=30, output='sos'), r)
        return up(r / (np.abs(r).max() + 1e-9))
    bands = {'dark': signal.butter(2, [70, 500], 'band', fs=SR, output='sos'), 'mid': signal.butter(2, [250, 1800], 'band', fs=SR, output='sos'),
             'bright': signal.butter(2, [900, 4500], 'band', fs=SR, output='sos')}
    whistle = [signal.butter(2, [f / 1.06, f * 1.06], 'band', fs=SR, output='sos') for f in (620, 780, 960, 1180)]
    wob = lfo(31)                                                            # 哨音在四个音高之间慢慢飘
    out = np.zeros((2, n))
    for ch in range(2):
        nz = lambda sos: (lambda y: y / np.sqrt((y ** 2).mean()))(signal.sosfilt(sos, rng.standard_normal(n)))
        layer = .9 * nz(bands['dark']) + (.35 + .45 * np.minimum(k, 1)) * nz(bands['mid']) + .3 * np.minimum(k, 1.2) ** 1.6 * nz(bands['bright'])
        pos = (wob + 1) * 1.5                                                # 0–3
        wh = sum(np.clip(1 - np.abs(pos - j), 0, 1) * nz(s) for j, s in enumerate(whistle))
        layer = layer + .12 * np.clip(k - .4, 0, 1) ** 2 * wh
        gust = 1 + .28 * lfo(17 + ch)
        pan = 1 + .35 * side * (1 if ch == 0 else -1)
        out[ch] = layer / 1.15 * env * gust * pan
    out = np.stack([.8 * out[0] + .2 * out[1], .8 * out[1] + .2 * out[0]])
    return out                                                               # 风 = 1（稳定时下片约翘 35°）时 RMS 约 1


def rain_layer(d, n):
    """雨声：从微雨到大雨、再到雨停，和风声都要衔接得不生硬。
    雨量和画面是同一条曲线（events.json 的 rain，1 = 最大），几个衔接的做法：
      · 声音比画面早约 1 秒、从听不见慢慢起来（先听见要下雨，再看见雨）；收的时候慢 1.5 秒
      · 三层按雨量交叉渐变（等功率）：零星的滴答（布篷上的雨点）→ 连成片的雨 → 哗哗的大雨；雨量到响度用 0.7 次方，小雨也听得见
      · 阵风：墙上左右两半的风差多少，雨声就往那边偏一点（跟着风扫过去）
      · 闪电先亮，雷声晚约半秒到：先一下脆的炸雷，紧跟着低沉的滚雷
      · 8:00 撑伞：伞一撑开，雨声滤掉高频变闷，再加一层雨点打在伞面上的声音，像钻到了伞底下；收伞时雨已经小了，再慢慢变回来
      · 雨停：最后剩几下零星的水滴，和后面"风把墙吹干"的风声叠两三秒，不留空档"""
    def src(name, start, dur):
        x = load2(os.path.join(SFX, FILES[name]))[:, int(start * SR):]
        x = np.tile(x, (1, int(dur * SR) // x.shape[1] + 1))[:, :int(dur * SR)]           # 不够长就接着从头放
        return x / np.sqrt((x ** 2).mean() + 1e-12)
    I30 = np.clip(np.array(d['rain']), 0, 1.3)
    t30 = np.arange(len(I30)) / 30
    lead = np.interp(t30 + 1.0, t30, I30, right=0)
    e30 = follow(np.maximum(lead, I30), .8, 1.5)
    up = lambda v: np.interp(np.arange(n) / SR, t30, v)
    on = np.where(e30 > .003)[0]
    if not len(on): return np.zeros((2, n)), np.zeros(n)
    a0, a1 = max(0, on[0] / 30 - 1), min(n / SR, on[-1] / 30 + 6)              # 只在有雨的这一段里算
    i0, i1 = int(a0 * SR), int(a1 * SR)
    m = i1 - i0
    tt = np.arange(i0, i1) / SR
    x = np.interp(tt, t30, e30)
    sm = lambda z: np.clip(z, 0, 1)
    gl = np.cos(sm((x - .12) / .5) * np.pi / 2)                                 # 滴答：小雨时最多，雨大了退掉
    gs = np.sin(sm((x - .06) / .4) * np.pi / 2) * (1 - .45 * sm((x - .6) / .4))  # 连成片的雨：中雨最多，大雨时还留着一点做底
    gh = np.sin(sm((x - .42) / .55) * np.pi / 2)                                # 哗哗：雨大了才起来
    norm = np.sqrt(gl ** 2 + gs ** 2 + gh ** 2) + 1e-9
    amp = x ** .7
    L, S, H = src('rain_light_01', 2, m / SR + .1), src('rain_steady_01', 20, m / SR + .1), src('rain_heavy_01', 5, m / SR + .1)
    L = signal.sosfilt(signal.butter(2, 600, 'high', fs=SR, output='sos'), L, axis=1)        # 滴答：去掉布篷的闷响，只留雨点
    bed = (gl * L[:, :m] + gs * S[:, :m] + gh * H[:, :m]) / norm * amp
    # 撑伞：0 → 1（撑开）→ 1 → 0（收好）
    u0, u1, u2, u3 = d['rainTimes']['umbrella']
    ease = lambda z: .5 - .5 * np.cos(np.pi * sm(z))
    u = ease((tt - u0) / (u1 - u0)) * (1 - ease((tt - u2) / (u3 - u2)))
    dull = signal.sosfilt(signal.butter(2, 700, 'low', fs=SR, output='sos'), bed, axis=1) * 1.35
    P = src('rain_light_01', 25, m / SR + .1)[:, :m]
    P = signal.sosfilt(signal.butter(2, [250, 6000], 'band', fs=SR, output='sos'), P, axis=1)
    bed = (1 - u) * bed + u * dull + .55 * u * amp * P
    # 压尖：素材里偶尔有一下比周围响好几 dB 的（几十毫秒），按 1 秒的平均电平压回去，雨声才是一整片
    m2 = (bed ** 2).mean(0)
    fast = np.sqrt(uniform_filter1d(m2, int(.02 * SR)) + 1e-12); slow = np.sqrt(uniform_filter1d(m2, SR) + 1e-12)
    bed = bed * uniform_filter1d(np.minimum(1, 1.5 * slow / fast), int(.01 * SR))
    # 阵风把雨往一边扫：左右两半墙的风差多少，就偏多少（最多 ±25%）
    a = np.clip(np.array(d['air']), 0, 2)
    side = np.clip(uniform_filter1d(a[:, 0] - a[:, 1], 30) / (a.mean(1).max() + 1e-6) * 2.5, -1, 1)
    sd = np.interp(tt, np.arange(len(side)) / 30, side)
    bed = np.stack([bed[0] * (1 + .25 * sd), bed[1] * (1 - .25 * sd)])
    # 雷：闪电后约半秒，先炸雷（Thunder 12），再接低沉的滚雷（Short Thunder Deep）
    T = d['rainTimes']['bolt']
    for name, dt, g in (('thunder_04', .5, 2.2), ('thunder_03', .8, 2.6)):
        th = load2(os.path.join(SFX, FILES[name])); th = th / (np.abs(th).max() + 1e-9)
        pk = int(np.argmax(uniform_filter1d(np.abs(th).max(0), int(.03 * SR))))           # 按最响的那一下对齐（素材前面有一段很轻的前奏）
        k = int((T + dt) * SR) - pk - i0
        if k < 0: th = th[:, -k:]; k = 0
        L_ = min(th.shape[1], m - k)
        if L_ > 0: bed[:, k:k + L_] += g * th[:, :L_]
    # 雨停：剩几下零星的水滴（陶碗滴水里取一段，去掉碗的低频共鸣），和后面的风叠在一起
    end = on[-1] / 30
    dr = src('water_drip_02', 8, 6.0)
    dr = signal.sosfilt(signal.butter(2, 900, 'high', fs=SR, output='sos'), dr, axis=1)
    k = int((end - 1.2) * SR) - i0; L_ = min(dr.shape[1], m - k)
    if L_ > 0:
        w = np.ones(L_); f1, f2 = int(.8 * SR), int(2.5 * SR); w[:f1] = np.linspace(0, 1, f1); w[-f2:] = np.linspace(1, 0, f2)
        bed[:, k:k + L_] += .22 * dr[:, :L_] * w
    out = np.zeros((2, n)); out[:, i0:i1] = bed
    duck = np.zeros(n); duck[i0:i1] = np.clip(x, 0, 1)
    return out, duck


def render(ver, d, B):
    ev, length, air = d['events'], d['len'], d['air']
    n = int(length * SR) + SR
    flap = np.zeros((2, n)); big = np.zeros((2, n))
    nt, nd, nb = len(B['tick']), len(B['dull']), len(B['big'])
    for (t, r, c, kind, v, last) in ev:
        pan = (c - 8) / 8 * .85
        t += rng.uniform(-.006, .006) - .02                                    # 早一帧：下片转过 150° 看着就已经落下了，声音跟眼睛走
        if kind == 0:                                                         # 翻下来拍响
            gain = rng.uniform(.8, 1.08)
            place(flap, B['tick'][rng.integers(nt)], t, gain, pan)
            if ver == 'B': place(big, B['big'][rng.integers(nb)], t + .001, gain * (.62 if last else .5), pan)
        elif kind == 1:                                                       # 回弹再碰一下
            if v < 1.5: continue
            place(flap, B['dull'][rng.integers(nd)], t, .85 * (v / 27) ** .8, pan)
        elif kind == 2:                                                       # 被风吹过头
            g = .75 * min(1, v / 27) ** .7
            place(flap, B['tick'][rng.integers(nt)], t, g, pan)
            if ver == 'B': place(big, B['big'][rng.integers(nb)], t, g * .5, pan)
        elif kind == 3:                                                       # 风掀起来又落回去
            if v < .8: continue
            g = .55 * min(1, v / 12) ** .9
            place(flap, B['dull'][rng.integers(nd)], t, g, pan)
            if ver == 'B': place(big, B['big'][rng.integers(nb)], t, g * .3, pan)
        elif kind == 4:                                                       # 卡住，顶一下
            place(flap, B['dull'][rng.integers(nd)], t, .3, pan)
    hp = signal.butter(2, 60, 'high', fs=SR, output='sos')
    dry = flap + (big if ver == 'B' else 0)
    dry = signal.sosfilt(hp, dry, axis=1)
    ir = hall_ir(1.1 if ver == 'B' else .45, 1.6 if ver == 'B' else .7)
    wet = np.stack([signal.oaconvolve(dry[ch], ir[ch])[:n] for ch in range(2)])
    mix = dry + (.32 if ver == 'B' else .14) * wet
    mix = mix * (10 ** (-24 / 20))                                             # 单独一下约 -24 dB
    mix = compress(mix)
    stems = {'翻牌': flap, '加厚': big, '混响': wet}
    if ver == 'B':
        rn, duck = rain_layer(d, n)
        rn = rn * 10 ** (RAIN_DB / 20)
        a = air_layer(air, n) * 10 ** (-34 / 20) * (1 - .5 * duck)             # 雨大了，风声往后让（两层沙沙声叠在一起会发糊）
        mix = mix + a + rn; stems['风声'] = a; stems['雨声'] = rn
    mix = limit(mix * 10 ** (4 / 20))
    # 最后跟着画面渐黑一起收掉（src/preshow/Preshow.tsx 的 FADE）
    f0, f1 = d.get('fade', [length, length])
    tt = np.arange(mix.shape[1]) / SR
    z = np.clip((tt - f0) / (f1 - f0), 0, 1)
    mix = mix * (1 - z * z * (3 - 2 * z))
    return mix[:, :int(length * SR)], stems


def write_wav(path, x):
    y = np.clip(x.T, -1, 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le' if path.endswith('.wav') else 'flac', path],
                   input=y.astype('<f8').tobytes(), check=True)


if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'both'
    d = json.load(open(os.path.join(OUT, 'events.json'), encoding='utf-8'))
    B = bank(cut_grains(load(SRC)))
    print('切出', len(B['tick']) // 3, '下')
    for ver in (['A', 'B'] if which == 'both' else [which]):
        mix, stems = render(ver, d, B)
        write_wav(os.path.join(OUT, f'开场前音效_{ver}.wav'), mix)
        if ver == 'B':
            os.makedirs(os.path.join(OUT, 'stems_B'), exist_ok=True)
            for k, s in stems.items():
                s = s[:, :mix.shape[1]]
                write_wav(os.path.join(OUT, 'stems_B', f'{k}.flac'), s / max(1e-9, np.abs(s).max()) * .9)
        pk = 20 * np.log10(np.abs(mix).max() + 1e-9)
        print(ver, '峰值', round(pk, 1), 'dB，长', round(mix.shape[1] / SR, 2), '秒')
