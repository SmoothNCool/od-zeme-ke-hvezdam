# Složí rozdělenou aplikaci do jedné stránky dist/vesmir.html.
# Je to jen pro náhled v Claudovi (artifact), kde musí být styly, skripty i data mapy v jednom souboru. Web se nasazuje rozdělený.
import io, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
read = lambda p: io.open(os.path.join(root, p), encoding='utf-8').read()

html = read('index.html')
css = read('css/app.css').replace('url(../tex/', 'url(tex/')  # ve složené stránce leží styly vedle složky tex
html = html.replace('<link rel="stylesheet" href="css/app.css">', '<style>\n' + css + '</style>')
# data mapy rovnou ve stránce, takže se nic nestahuje
html = html.replace('<script src="js/01-zaklad.js"></script>', '<script>window.GEO=' + read('data/geo.json') + ';</script>\n<script src="js/01-zaklad.js"></script>')
html = re.sub(r'<script src="((?:js|data)/[^"]+)"></script>', lambda m: '<script>\n' + read(m.group(1)) + '</script>', html)
assert 'src="js/' not in html and 'href="css/' not in html

os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
io.open(os.path.join(root, 'dist', 'vesmir.html'), 'w', encoding='utf-8', newline='\n').write(html)
print('dist/vesmir.html: %d kB' % (len(html.encode('utf-8')) // 1024))
