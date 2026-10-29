"""Developer-only packager. Players only need The-Fred-Verse.html, never Python."""
from pathlib import Path
import argparse
import base64
import json

ROOT = Path(__file__).resolve().parent

def build():
    html = (ROOT/'web/index.html').read_text()
    css = (ROOT/'web/style.css').read_text()
    font = base64.b64encode((ROOT/'web/assets/fonts/PixelifySans.ttf').read_bytes()).decode()
    css = css.replace("url('assets/fonts/PixelifySans.ttf')", "url('data:font/ttf;base64,"+font+"')")
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>'+css+'</style>')
    scripts = []
    for name in ('core.js', 'session.js', 'art.js', 'game.js'):
        html = html.replace(f'<script defer src="{name}"></script>', '')
        source = (ROOT/'web'/name).read_text().replace('</script', '<\\/script')
        scripts.append('<script>\n'+source+'\n</script>')
    atlas = json.loads((ROOT/'web/assets/fred-atlas.json').read_text())
    atlas['image'] = 'data:image/png;base64,'+base64.b64encode((ROOT/'web/assets/fred-atlas-prepared.png').read_bytes()).decode()
    boot = '<script>globalThis.FRED_STANDALONE=true;globalThis.FRED_ATLAS_SOURCE='+json.dumps(atlas,separators=(',',':'))+';</script>\n'
    license_text = '\n'.join(line.rstrip() for line in (ROOT/'web/assets/fonts/OFL.txt').read_text().splitlines())+'\n'
    boot = '<script type="text/plain" id="font-license">'+license_text+'</script>\n'+boot
    html = html.replace('</body>', boot+'\n'.join(scripts)+'\n</body>')
    return html

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    content = build()
    for name in ('The-Fred-Verse.html', 'index.html'):
        path = ROOT/name
        if args.check:
            if not path.exists() or path.read_text() != content:
                raise SystemExit(f'{name} is stale. Run python build.py.')
        else:
            path.write_text(content)
    print('Standalone HTML matches source.' if args.check else 'Built The-Fred-Verse.html and index.html.')
