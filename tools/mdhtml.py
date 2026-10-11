"""Tiny dependency-free Markdown <-> HTML converters for the blog CMS.

Supports what the posts use: paragraphs, ## / ### headings, bullet and numbered
lists (nested by indentation), **bold**, *italic*, links, images, block quotes.
"""
import re
from html import escape, unescape
from html.parser import HTMLParser

# ------------------------------------------------------------ HTML -> Markdown
class _H2M(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out = []          # finished blocks
        self.buf = []          # inline buffer for the current block
        self.lists = []        # stack of ['ul'|'ol', counter]
        self.href = []
        self.in_li = False

    def _flush(self, prefix=''):
        t = ''.join(self.buf)
        t = re.sub(r'[ \t\r\n]+', ' ', t).strip()
        self.buf = []
        return t

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote'):
            self.buf = []
        elif tag in ('ul', 'ol'):
            if self.in_li and ''.join(self.buf).strip():
                self._emit_li()
            self.lists.append([tag, 0])
        elif tag == 'li':
            self.buf = []; self.in_li = True
            self.lists[-1][1] += 1
        elif tag in ('strong', 'b'):
            self.buf.append('**')
        elif tag in ('em', 'i'):
            self.buf.append('*')
        elif tag == 'a':
            self.href.append(a.get('href', ''))
            self.buf.append('[')
        elif tag == 'br':
            self.buf.append(' ')
        elif tag == 'img':
            self.buf.append(f"![{a.get('alt', '')}]({a.get('src', '')})")

    def _emit_li(self):
        t = self._flush()
        if not t:
            return
        depth = len(self.lists) - 1
        kind, n = self.lists[-1]
        mark = f'{n}.' if kind == 'ol' else '-'
        self.out.append(('li', '    ' * depth + f'{mark} {t}'))

    def handle_endtag(self, tag):
        if tag in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
            level = '##' if tag in ('h1', 'h2') else '###'
            t = self._flush()
            t = re.sub(r'^\*\*(.*)\*\*$', r'\1', t)
            if t: self.out.append(('blk', f'{level} {t}'))
        elif tag == 'p':
            t = self._flush()
            if t: self.out.append(('blk', t))
        elif tag == 'blockquote':
            t = self._flush()
            if t: self.out.append(('blk', '> ' + t))
        elif tag == 'li':
            self._emit_li(); self.in_li = False
        elif tag in ('ul', 'ol'):
            self.lists.pop()
            self.out.append(('end', ''))
        elif tag in ('strong', 'b'):
            self.buf.append('**')
        elif tag in ('em', 'i'):
            self.buf.append('*')
        elif tag == 'a':
            self.buf.append(f"]({self.href.pop() if self.href else ''})")

    def handle_data(self, data):
        d = data.replace('\\', '\\\\')
        d = re.sub(r'([*_\[\]`])', r'\\\1', d)
        self.buf.append(d)


def html_to_md(html):
    html = html.replace('\u200d', '').replace('&zwj;', '')
    p = _H2M()
    p.feed(html)
    lines, prev = [], None
    for kind, text in p.out:
        if kind == 'end':
            prev = 'end'; continue
        if kind == 'li':
            if prev not in ('li',) and lines: lines.append('')
            lines.append(text)
        else:
            if lines: lines.append('')
            lines.append(text)
        prev = kind
    md = '\n'.join(lines)
    md = re.sub(r'(?<!\S)\*\*[ \t]*\*\*(?!\S)', '', md)
    md = re.sub(r'\*\*([^*\n]*?)([ \t]+)\*\*', r'**\1**\2', md)
    return md.strip() + '\n'


# ------------------------------------------------------------ Markdown -> HTML
def _inline(t):
    t = t.replace('\\\\', '\x00')
    esc = {}
    def stash(m):
        esc[len(esc)] = m.group(1); return f'\x01{len(esc) - 1}\x02'
    t = re.sub(r'\\([\\`*_{}\[\]()#+\-.!|])', stash, t)
    t = escape(t, quote=False)
    t = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)(?:\s+&quot;[^)]*&quot;)?\)', lambda m: f'<img src="{m.group(2)}" alt="{m.group(1)}" loading="lazy">', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', lambda m: f'<a href="{m.group(2)}">{m.group(1)}</a>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', t)
    t = re.sub(r'(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])', r'<em>\1</em>', t)
    t = re.sub(r'(?<![\w_])_(?!\s)(.+?)(?<!\s)_(?![\w_])', r'<em>\1</em>', t)
    t = re.sub(r'\x01(\d+)\x02', lambda m: escape(esc[int(m.group(1))], quote=False), t)
    return t.replace('\x00', '\\')


def md_to_html(md):
    lines = md.replace('\r\n', '\n').split('\n')
    out, i, n = [], 0, len(lines)
    def indent(s): return len(s) - len(s.lstrip(' '))
    LI = re.compile(r'^(\s*)([-*+]|\d+[.)])\s+(.*)$')

    def parse_list(i, base):
        m = LI.match(lines[i]); kind = 'ol' if m.group(2)[0].isdigit() else 'ul'
        html = [f'<{kind}>']
        while i < n:
            m = LI.match(lines[i])
            if not m or indent(lines[i]) < base: break
            if indent(lines[i]) > base:
                sub, i = parse_list(i, indent(lines[i]))
                html[-1] = html[-1][:-5] + sub + '</li>' if html[-1].endswith('</li>') else html[-1]
                continue
            html.append(f'<li>{_inline(m.group(3))}</li>'); i += 1
        html.append(f'</{kind}>')
        return ''.join(html), i

    while i < n:
        ln = lines[i]
        if not ln.strip():
            i += 1; continue
        m = re.match(r'^(#{1,6})\s+(.*?)\s*#*\s*$', ln)
        if m:
            lvl = 'h2' if len(m.group(1)) <= 2 else 'h3'
            out.append(f'<{lvl}>{_inline(m.group(2))}</{lvl}>'); i += 1; continue
        if LI.match(ln):
            html, i = parse_list(i, indent(ln)); out.append(html); continue
        if ln.startswith('>'):
            buf = []
            while i < n and lines[i].startswith('>'):
                buf.append(lines[i].lstrip('> ').strip()); i += 1
            out.append(f'<blockquote><p>{_inline(" ".join(buf))}</p></blockquote>'); continue
        if re.match(r'^(-{3,}|\*{3,})\s*$', ln):
            out.append('<hr>'); i += 1; continue
        buf = []
        while i < n and lines[i].strip() and not LI.match(lines[i]) and not re.match(r'^#{1,6}\s', lines[i]) and not lines[i].startswith('>'):
            buf.append(lines[i].strip()); i += 1
        out.append(f'<p>{_inline(" ".join(buf))}</p>')
    return '\n'.join(out)
