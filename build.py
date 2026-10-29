"""Developer-only packager. Players only need The-Fred-Verse.html, never Python."""
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parent

def build():
    html = (ROOT/'web/index.html').read_text()
    css = (ROOT/'web/style.css').read_text()
    html = html.replace('<link rel="stylesheet" href="style.css">', '<style>'+css+'</style>')
    scripts = []
    for name in ('core.js', 'session.js', 'game.js'):
        html = html.replace(f'<script defer src="{name}"></script>', '')
        source = (ROOT/'web'/name).read_text().replace('</script', '<\\/script')
        scripts.append('<script>\n'+source+'\n</script>')
    html = html.replace('</body>', '<script>globalThis.FRED_STANDALONE=true;</script>\n'+'\n'.join(scripts)+'\n</body>')
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
