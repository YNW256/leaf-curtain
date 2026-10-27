# 一键出整片：事件表 → 音轨 → 分段渲染 → 拼整片。在仓库根目录跑：
#   python3 scripts/build.py                 1080p60，十段全渲，出 out/叶幕降临_1080p60.mp4
#   python3 scripts/build.py --uhd           4K60（--scale=2），出 out/叶幕降临_2160p60.mp4
#   --steps audio,render,assemble  只跑其中几步（默认全跑）；--segs 8 9 10  只重渲这几段；--conc 4  渲染并发
# 分段渲染：每段一个合成 Preshow-N。翻牌是连续的物理，改了第 n 段，第 n 段到结尾都要重渲（之前的段不受影响）。
# 音轨：翻牌声（含风雨）→ 车站环境声。
import argparse, os, shutil, subprocess, sys, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f'{ROOT}/out'
SEGS = 10
LEN = 605.5

ap = argparse.ArgumentParser()
ap.add_argument('--uhd', action='store_true')
ap.add_argument('--steps', default='audio,render,assemble')
ap.add_argument('--segs', nargs='*', type=int)
ap.add_argument('--conc', default='')
A = ap.parse_args()
steps = A.steps.split(',')
segs = A.segs or list(range(1, SEGS + 1))
TAG = '2160p60' if A.uhd else '1080p60'
PARTS = f'{OUT}/parts_{TAG}'
NICE = ['nice', '-n', '10']


def run(cmd, **kw):
    print('  $', ' '.join(cmd)[:160], flush=True)
    subprocess.run(cmd, cwd=ROOT, check=True, **kw)


def step(name):
    print(f'== {name}  {time.strftime("%H:%M:%S")}', flush=True)


if 'audio' in steps:
    step('音轨')
    run(NICE + ['npm', 'run', '--silent', 'events'])
    run(NICE + ['python3', 'audio/make_sfx.py', 'B'])
    run(NICE + ['python3', 'audio/make_bed.py'])

if 'render' in steps:  # 只打一次包，十段共用
    step(f'分段渲染 {TAG}：第 {segs} 段')
    os.makedirs(PARTS, exist_ok=True)
    B = f'{OUT}/_bundle'
    shutil.rmtree(B, ignore_errors=True)
    run(NICE + ['npx', 'remotion', 'bundle', 'src/index.ts', f'--out-dir={B}', '--log=error'])
    try:
        for n in segs:
            t = time.time()
            run(NICE + ['npx', 'remotion', 'render', B, f'Preshow-{n}', f'{PARTS}/seg{n}.mp4', f'--concurrency={A.conc or ("3" if A.uhd else "50%")}', '--log=error']
                + (['--scale=2'] if A.uhd else []))
            print(f'  第 {n} 段 {round(time.time() - t)} 秒', flush=True)
    finally:
        shutil.rmtree(B, ignore_errors=True)

if 'assemble' in steps:
    step(f'拼整片 {TAG}')
    missing = [n for n in range(1, SEGS + 1) if not os.path.exists(f'{PARTS}/seg{n}.mp4')]
    if missing: sys.exit(f'缺分段：{missing}')
    wav = next((f'{OUT}/sound/{n}.wav' for n in ['开场前音效_B_带车站底', '开场前音效_B']
                if os.path.exists(f'{OUT}/sound/{n}.wav')), None)
    if not wav: sys.exit('缺音轨，先跑 --steps audio')
    ins = sum([['-i', f'{PARTS}/seg{n}.mp4'] for n in range(1, SEGS + 1)], [])
    # 用 concat 滤镜拼（按分离器拼会把时长拼错）；Remotion 出的是全范围，拼的时候转成电视范围、标 bt709
    fc = ''.join(f'[{i}:v]' for i in range(SEGS)) + f'concat=n={SEGS}:v=1:a=0,scale=out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p[v]'
    out = f'{OUT}/叶幕降临_{TAG}.mp4'
    run(NICE + ['ffmpeg', '-v', 'error', '-y', *ins, '-i', wav, '-filter_complex', fc, '-map', '[v]', '-map', f'{SEGS}:a',
                '-c:v', 'libx264', '-preset', 'fast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '60',
                '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
                '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', out])
    p = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], capture_output=True, text=True).stdout.strip()
    print('  出片', out, '长', round(float(p), 2), '秒', '' if abs(float(p) - LEN) < .05 else f'（应该 {LEN}）')
