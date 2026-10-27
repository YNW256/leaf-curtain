# 车站环境声垫底：一段无缝循环，很轻地铺在翻牌声底下。
#   原料：Freesound habbis92「EustonStation_ST」（CC0，#256626，audio/sfx/fs256626_habbis92.mp3），伦敦尤斯顿站大厅。
#   开头 6 秒有一下明显的响动，8 秒以后一直是均匀的大厅人声嗡嗡，没有单独突出的广播 → 循环取 8–72 秒，首尾 3 秒等功率交叉淡化接上，
#   接缝处电平和质感都连着（不相关的噪声用等功率曲线，交叉中间不塌）。
#   出：out/sound/车站底_无缝循环.wav（一段，首尾相接无缝，要放更久可以直接循环）
#       out/sound/开场前音效_B_带车站底.wav（开场前音效_B 加上铺满整场的车站底，开头 3 秒淡入，最后跟着画面渐黑收掉）
# 用法：python3 audio/make_bed.py [相对 B 版的响度，默认 -20 LU（几乎只听得见翻牌声），要更响写 -16]；B 版重做以后再跑一次这个
import json, os, re, subprocess, sys
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'audio/sfx/fs256626_habbis92.mp3')
OUT = os.path.join(ROOT, 'out/sound')
SR = 48000
A, B, XF = 8.0, 72.0, 3.0              # 循环区间和交叉淡化（秒）
REL = float(sys.argv[1]) if len(sys.argv) > 1 else -20.0


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, 2).T


def write_wav(path, x):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f64le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', path],
                   input=np.clip(x.T, -1, 1).astype('<f8').tobytes(), check=True)


def lufs(path):
    r = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1])


def loop_unit(x):
    """x[A:B] 首尾接成一圈：尾巴 XF 秒淡出、同时开头 XF 秒淡入叠在上面，长度 B − A − XF"""
    seg = x[:, int(A * SR):int(B * SR)]
    f = int(XF * SR)
    th = np.linspace(0, np.pi / 2, f)
    unit = seg[:, f:].copy()
    unit[:, -f:] = seg[:, -f:] * np.cos(th) + seg[:, :f] * np.sin(th)
    return unit


if __name__ == '__main__':
    x = load(SRC)
    # 放在翻牌声后面：去掉 70 Hz 以下的闷响，9 kHz 以上轻轻收掉（不和翻牌的脆响抢）
    x = signal.sosfiltfilt(signal.butter(2, 70, 'high', fs=SR, output='sos'), x, axis=1)
    x = signal.sosfiltfilt(signal.butter(2, 9000, 'low', fs=SR, output='sos'), x, axis=1)
    unit = loop_unit(x)
    unit = unit / np.abs(unit).max() * .5
    write_wav(os.path.join(OUT, '车站底_无缝循环.wav'), unit)
    # 铺满开场前的长度，开头淡入、结尾淡出
    fx = load(os.path.join(OUT, '开场前音效_B.wav'))
    n = fx.shape[1]
    bed = np.tile(unit, (1, n // unit.shape[1] + 1))[:, :n]
    fi = int(3 * SR)
    bed[:, :fi] *= np.linspace(0, 1, fi) ** 2
    # 结尾跟着画面渐黑一起收（时刻在 events.json 的 fade 里）
    f0, f1 = json.load(open(os.path.join(OUT, 'events.json'), encoding='utf-8')).get('fade', [n / SR - 4, n / SR])
    z = np.clip((np.arange(n) / SR - f0) / (f1 - f0), 0, 1)
    bed *= 1 - z * z * (3 - 2 * z)
    tmp = os.path.join(OUT, '_bed_tmp.wav')
    write_wav(tmp, bed)
    gain = 10 ** ((lufs(os.path.join(OUT, '开场前音效_B.wav')) + REL - lufs(tmp)) / 20)
    os.remove(tmp)
    mix = fx + bed * gain
    pk = np.abs(mix).max()
    if pk > 10 ** (-1 / 20):
        mix *= 10 ** (-1 / 20) / pk
    write_wav(os.path.join(OUT, '开场前音效_B_带车站底.wav'), mix)
    print('循环一段', round(unit.shape[1] / SR, 2), '秒；车站底比 B 版低', -REL, 'LU，增益', round(20 * np.log10(gain), 1), 'dB；峰值', round(20 * np.log10(np.abs(mix).max()), 1), 'dB')
