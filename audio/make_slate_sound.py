# 应急垫片的翻牌声（60 秒一圈、首尾无缝）：借开场前的 make_sfx.py（B 版：真翻牌 + 加厚 + 车站混响 + 风声，不要雨），
#   按 out/slate/events.json 配出剧本 0~72 秒，取第 10~70 秒，第 70 秒以后的混响尾巴叠回开头（下一圈接上时不断）。
# 用法（先 npm run slate-events）：python3 audio/make_slate_sound.py → out/slate/翻牌一圈.wav
import importlib.util, json, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('make_sfx', os.path.join(HERE, 'make_sfx.py'))
ms = importlib.util.module_from_spec(spec); spec.loader.exec_module(ms)
ms.rain_layer = lambda d, n: (np.zeros((2, n)), np.zeros(n))      # 垫片不下雨
SR = ms.SR
OUT = os.path.join(ms.ROOT, 'out/slate')

if __name__ == '__main__':
    d = json.load(open(os.path.join(OUT, 'events.json'), encoding='utf-8'))
    B = ms.bank(ms.cut_grains(ms.load(ms.SRC)))
    mix, _ = ms.render('B', d, B)
    a, b = 10 * SR, 70 * SR
    loop = mix[:, a:b].copy()
    tail = mix[:, b:]
    loop[:, :tail.shape[1]] += tail
    ms.write_wav(os.path.join(OUT, '翻牌一圈.wav'), loop)
    print('一圈', loop.shape[1] / SR, '秒，峰值', round(20 * np.log10(np.abs(loop).max() + 1e-9), 1), 'dB')
