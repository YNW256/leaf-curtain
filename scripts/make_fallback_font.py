# 方圆体缺字的后备字体：动画里用到的字（src/preshow 里的字 + 乘客名单）里方圆体没有的，从一款圆体字体里截出来，
# 做成一个小字库 public/fonts/FangYuanFallback.ttf，再把这些字记进 src/data/fallback_chars.json。
# Preshow 渲染时用它补字（只补这几个字，方圆体有的字照常用方圆体）。名单改了以后重跑一遍：
#   python3 scripts/make_fallback_font.py [字体文件 [TTC 里第几个字体]]
# 不给字体文件时，在 macOS 上找系统下载的「圆体-简 粗」（Yuanti SC Bold）。截出来的字库只在本机渲染用，不要提交、不要分发
# （系统字体的许可不允许再分发；.gitignore 已经排除了它）。示例名单的字方圆体都有，不需要跑这一步。
import glob, json, os, re, sys
from fontTools.ttLib import TTFont, TTCollection
from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FY = TTFont(os.path.join(ROOT, 'public/fonts/AlimamaFangYuanTiVF-Thin.ttf')).getBestCmap()
OUT_FONT = os.path.join(ROOT, 'public/fonts/FangYuanFallback.ttf')
OUT_CHARS = os.path.join(ROOT, 'src/data/fallback_chars.json')

text = ''
for f in glob.glob(os.path.join(ROOT, 'src/preshow/*.ts*')):
    text += ''.join(a + b for a, b in re.findall(r"'([^'\n]*)'|`([^`]*)`", open(f, encoding='utf-8').read()))
for o in json.load(open(os.path.join(ROOT, 'src/data/crew.json'), encoding='utf-8')):
    text += o['name'] + o['label']
need = sorted(set(c for c in text if ord(c) > 0x2000 and ord(c) not in FY and not c.isspace()))
if not need:
    json.dump([], open(OUT_CHARS, 'w', encoding='utf-8'))
    sys.exit('方圆体字都全，不需要后备字体')

if len(sys.argv) > 1:
    path, idx = sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 0
    font = TTFont(path, fontNumber=idx) if path.lower().endswith('.ttc') else TTFont(path)
else:
    ttc = glob.glob('/System/Library/AssetsV2/com_apple_MobileAsset_Font*/*/AssetData/Yuanti.ttc')
    if not ttc: sys.exit('缺这些字：' + ''.join(need) + '。没找到系统的圆体，请给一个字体文件：python3 scripts/make_fallback_font.py <字体>')
    idx = next(i for i, f in enumerate(TTCollection(ttc[0]).fonts) if f['name'].getDebugName(4) == 'Yuanti SC Bold')
    font = TTFont(ttc[0], fontNumber=idx)
have = font.getBestCmap()
lost = [c for c in need if ord(c) not in have]
need = [c for c in need if ord(c) in have]

opts = subset.Options(); opts.layout_features = []; opts.name_IDs = ['*']; opts.notdef_outline = True
sub = subset.Subsetter(opts); sub.populate(unicodes=[ord(c) for c in need]); sub.subset(font)
# 和方圆体混排时的矫正：圆体字面比方圆体大约 5%、还偏下约 55 单位，混排显大、往下坠——统一缩到 0.95 并上提，x' = .95x + 25，y' = .95y + 70。
# 换了别的字体，这组数要按那款字重新量
S, DX, DY = .95, 25, 70
if 'glyf' in font:
    gs = font.getGlyphSet()
    glyf, hmtx = font['glyf'], font['hmtx']
    for name in font.getGlyphOrder():
        if name == '.notdef' or glyf[name].numberOfContours == 0:
            continue
        pen = TTGlyphPen(gs)
        gs[name].draw(TransformPen(pen, (S, 0, 0, S, DX, DY)))
        g = pen.glyph(); g.recalcBounds(glyf); glyf[name] = g
        hmtx[name] = (hmtx[name][0], g.xMin)
font.save(OUT_FONT)
json.dump(need, open(OUT_CHARS, 'w', encoding='utf-8'), ensure_ascii=False)
print('补了', ''.join(need), len(need), '个字', ('；这款字体里也没有：' + ''.join(lost)) if lost else '')
