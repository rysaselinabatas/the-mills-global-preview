#!/usr/bin/env python3
"""
Builds the Blog / News content from the two CSV files in content/.

  content/articles.csv   evergreen guides and explainers
  content/news.csv       time-sensitive news and BOC issuances

To publish something new: add a row to the matching CSV (same columns as the
Webflow export), then run   python3 tools/build-content.py   and push.

It writes:
  articles/<slug>.html, news/<slug>.html   one static, SEO-friendly page per post
  content/posts.json                       the index the Blog page filters and searches
  blog.html                                (listing section only)
  learning-pavilion.html                   (guide / article cards only)
  assets/images/blog/*.jpg                 card and cover images (downloaded once)

Needs Python 3 and Pillow. Standard library only otherwise.
"""
import csv, io, json, math, os, re, subprocess, sys, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from html import escape, unescape

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
csv.field_size_limit(10 ** 9)

SITE = 'https://themillsglobal.com'
IMG_DIR = 'assets/images/blog'
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs('articles', exist_ok=True)
os.makedirs('news', exist_ok=True)

# Posts that should not be published (reason noted). Remove a slug here to publish it.
HIDE = {
    'trump-urges-ukraine-to-negotiate-drops-ceasefire-demand-after-putin-talks': 'not related to trade or customs',
    'ad-interlim-cyber-intelligence-section': 'body text is about a CHED memorandum, not the BOC section',
}

ARTICLE_CATS = {
    'duties-taxes-fees': 'Duties, Taxes & Fees', 'compliance-regulations': 'Compliance & Regulations',
    'customs-procedures': 'Customs Procedures', 'importation-guides': 'Importation Guides',
    'industry-guides': 'Industry Guides', 'trade-strategy': 'Trade Strategy',
    'accreditation-registration': 'Accreditation & Registration', 'documentation': 'Documentation',
    'tariff-classification': 'Tariff & Classification', 'import-permits-agencies': 'Import Permits & Agencies',
    '': 'Trade Agreements',
}
NEWS_CATS = {
    'news-updates': 'Market News', 'cmc': 'BOC Issuances', 'cao': 'BOC Issuances', 'cmo': 'BOC Issuances',
    'compliance-regulations': 'Compliance & Regulations', 'industry-guides': 'Industry', 'customs-procedures': 'Customs',
    'duties-taxes-fees': 'Duties, Taxes & Fees', '': 'Market News',
}
FALLBACK_IMG = {
    'Duties, Taxes & Fees': 'assets/images/pexels-customs.jpg', 'Compliance & Regulations': 'assets/images/pexels-permits.jpg',
    'Customs Procedures': 'assets/images/pexels-customs.jpg', 'Customs': 'assets/images/pexels-customs.jpg',
    'Importation Guides': 'assets/images/pexels-entry.jpg', 'Industry Guides': 'assets/images/pexels-logistics.jpg',
    'Industry': 'assets/images/pexels-logistics.jpg', 'Trade Strategy': 'assets/images/pexels-advisory.jpg',
    'Accreditation & Registration': 'assets/images/pexels-entry.jpg', 'Documentation': 'assets/images/pexels-permits.jpg',
    'Tariff & Classification': 'assets/images/pexels-customs.jpg', 'Import Permits & Agencies': 'assets/images/pexels-permits.jpg',
    'Trade Agreements': 'assets/images/pexels-advisory.jpg', 'Market News': 'assets/images/pexels-marine.jpg',
    'BOC Issuances': 'assets/images/pexels-customs.jpg',
}
# links in old bodies that point at slugs which do not exist
ALIASES = {
    'import-documentation-checklist': 'import-documentation-checklist-philippines',
    'import-duties-and-taxes-in-the-philippines-explained': 'import-duties-taxes-philippines',
    'import-permits-government-agencies-philippines': 'import-permits-philippines',
    'understanding-tariff-classification-in-the-philippines': 'tariff-classification-philippines',
    'understanding-duties-taxes-and-fees-in-importation': 'duties-vs-taxes-vs-fees-philippines',
}
SERVICE_LINKS = {'/services/trucking': 'services-mills-logistics.html'}


def slugify(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def clean_text(t):
    t = unescape(t or '')
    t = t.replace('�', ' - ').replace('‍', '')
    t = re.sub(r'(?<![\w])\?(?=\d)', '₱', t)          # lost peso signs in the export
    t = t.replace('—', ' - ').replace('–', '-')
    return re.sub(r'[ \t]{2,}', ' ', t).strip()


def parse_date(s):
    m = re.search(r'([A-Z][a-z]{2}) (\d{1,2}) (\d{4})', s or '')
    return datetime.strptime(' '.join(m.groups()), '%b %d %Y') if m else datetime(2025, 1, 1)


def read_csv(path, kind):
    raw = open(path, 'rb').read().decode('utf-8', errors='replace')
    rows = list(csv.DictReader(io.StringIO(raw)))
    posts = []
    for r in rows:
        if r.get('Draft') == 'true' or r.get('Archived') == 'true':
            continue
        slug = r['Slug'].strip()
        if slug in HIDE or not slug:
            continue
        label_map = ARTICLE_CATS if kind == 'article' else NEWS_CATS
        cat = (r.get('Category') or '').strip() or label_map.get((r.get('Post category') or '').strip(), 'Market News' if kind == 'news' else 'Trade Agreements')
        d = parse_date(r.get('Publish date') or r.get('Published On'))
        posts.append({
            'type': kind, 'slug': slug, 'title': clean_text(r['Name']), 'summary': clean_text(r['Summary']),
            'cat': cat, 'catSlug': slugify(cat), 'date': d.strftime('%Y-%m-%d'), 'dateLabel': d.strftime('%b %-d, %Y'),
            'body': r['Post body'], 'imgUrl': (r.get('Post Image') or r.get('Card image') or r.get('Card image') or '').strip() or (r.get('Card image') or '').strip(),
            'acronym': (r.get('Acronym') or '').strip(), 'featured': r.get('Featured post') == 'true',
        })
    return posts


# ---------------------------------------------------------------- images
def fetch_image(p):
    out = f"{IMG_DIR}/{p['type']}-{p['slug'][:90]}.jpg"
    p['img'] = out
    if os.path.exists(out):
        return
    url = p['imgUrl']
    if os.environ.get('SKIP_FETCH') or not url:
        p['img'] = FALLBACK_IMG.get(p['cat'], 'assets/images/pexels-entry.jpg'); return
    try:
        q = urllib.parse.quote(urllib.parse.unquote(url), safe=":/?&=%()")
        req = urllib.request.Request(q, headers={'User-Agent': 'Mozilla/5.0'})
        data = None
        time.sleep(1.2)   # the image CDN rate-limits bursts
        for attempt in range(5):
            try:
                data = urllib.request.urlopen(req, timeout=40).read()
                break
            except Exception:
                if attempt == 4: raise
                time.sleep(6 * (attempt + 1))
        tmp = '/tmp/_post_' + slugify(p['slug'])[:60]
        open(tmp, 'wb').write(data)
        from PIL import Image
        try:
            im = Image.open(tmp).convert('RGB')
        except Exception:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, tmp + '.png'], check=True)
            im = Image.open(tmp + '.png').convert('RGB')
        if im.width > 1200:
            im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        im.save(out, 'JPEG', quality=82, optimize=True, progressive=True)
    except Exception as e:
        print('  image failed for', p['slug'][:50], '->', type(e).__name__, getattr(e, 'code', ''), url[-60:])
        p['img'] = FALLBACK_IMG.get(p['cat'], 'assets/images/pexels-entry.jpg')


# ---------------------------------------------------------------- body
def clean_body(p, slugs):
    b = p['body']
    b = re.sub(r'\s+id=""', '', b)
    b = b.replace('‍', '').replace('&zwj;', '')
    b = re.sub(r'<p>\s*(&nbsp;|\s)*</p>', '', b)
    b = re.sub(r'<h[1]\b', '<h2', b); b = re.sub(r'</h1>', '</h2>', b)
    b = re.sub(r'<h[456]\b', '<h3', b); b = re.sub(r'</h[456]>', '</h3>', b)
    b = re.sub(r'<h([23])[^>]*>\s*<strong[^>]*>(.*?)</strong>\s*</h\1>', r'<h\1>\2</h\1>', b, flags=re.S)
    b = re.sub(r'<(h[23])\s[^>]*>', r'<\1>', b)

    def fix_link(m):
        href = m.group(1)
        inner = m.group(2)
        if href.startswith('/articles/'):
            s = href[len('/articles/'):].split('#')[0].strip('/')
            s = ALIASES.get(s, s)
            if s in slugs:
                return f'<a href="{s}.html">{inner}</a>' if p['type'] == 'article' else f'<a href="../articles/{s}.html">{inner}</a>'
            return inner
        if href in SERVICE_LINKS:
            return f'<a href="../{SERVICE_LINKS[href]}">{inner}</a>'
        if href.startswith('http'):
            return f'<a href="{href}" target="_blank" rel="noopener noreferrer">{inner}</a>'
        if href.startswith('/'):
            return inner
        return m.group(0)
    b = re.sub(r'<a\s[^>]*?href="([^"]*)"[^>]*>(.*?)</a>', fix_link, b, flags=re.S)
    # number headings so the contents list can link to them
    seen = {}
    def add_id(m):
        text = re.sub(r'<[^>]+>', '', m.group(2))
        sid = slugify(text)[:60] or 'section'
        seen[sid] = seen.get(sid, 0) + 1
        if seen[sid] > 1: sid += f'-{seen[sid]}'
        return f'<{m.group(1)} id="{sid}">{m.group(2)}</{m.group(1)}>'
    b = re.sub(r'<(h[23])>(.*?)</\1>', add_id, b, flags=re.S)
    b = clean_text_html(b)
    return b


def clean_text_html(h):
    h = h.replace('—', ' - ').replace('–', '-').replace('�', ' - ')
    h = re.sub(r'(?<![\w/])\?(?=\d{2,})', '₱', h)
    return h


def read_mins(body):
    words = len(re.sub(r'<[^>]+>', ' ', body).split())
    return max(1, math.ceil(words / 210))


def toc(body):
    items = re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body, flags=re.S)
    if len(items) < 3:
        return ''
    lis = ''.join(f'<li><a href="#{i}">{re.sub(r"<[^>]+>", "", t)}</a></li>' for i, t in items[:14])
    return f'<div class="post-toc"><p class="post-toc__title">On this page</p><ol>{lis}</ol></div>'


# ---------------------------------------------------------------- page chrome (copied from about.html)
def chrome():
    s = open('about.html').read()
    nav = s[s.index('<nav'):s.index('</nav>') + 6]
    foot = s[s.index('<footer class="footer">'):s.index('</footer>') + 9]
    nav = nav.replace('class="nav scrolled"', 'class="nav"')
    def rel(m):
        attr, val = m.group(1), m.group(2)
        if re.match(r'(https?:|#|mailto:|tel:|/|data:)', val):
            return m.group(0)
        return f'{attr}="../{val}"'
    nav = re.sub(r'(href|src)="([^"]*)"', rel, nav)
    foot = re.sub(r'(href|src)="([^"]*)"', rel, foot)
    return nav, foot


NAV, FOOT = chrome()
HEAD_SCRIPTS = '''  <script src="../js/loader.js?v=6"></script>'''
TAIL_SCRIPTS = '''  <script src="../js/vendor/lenis.min.js"></script>
  <script src="../js/smooth.js?v=1"></script>
  <script src="../js/cursor.js?v=1"></script>
  <script src="../js/analytics.js"></script>
  <script src="../js/animations.js"></script>'''
GTM_NOSCRIPT = '''  <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-K3QFNL94" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>'''
PHONE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>'
CAL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'


def card(p, prefix=''):
    url = f"{prefix}{'articles' if p['type'] == 'article' else 'news'}/{p['slug']}.html"
    badge = '<span class="content-card__badge">News</span>' if p['type'] == 'news' else ''
    return f'''<a href="{url}" class="content-card" data-type="{p['type']}" data-cat="{p['catSlug']}">
          <div class="content-card__image"><img src="{prefix}{p['img']}" alt="{escape(p['title'])}" loading="lazy"></div>
          <div class="content-card__body">
            {badge}
            <p class="content-card__tag">{escape(p['cat'])}</p>
            <h3 class="content-card__title">{escape(p['title'])}</h3>
            <p class="content-card__excerpt">{escape(p['summary'])}</p>
            <p class="content-card__meta">{p['dateLabel']} &middot; {p['mins']} min read</p>
          </div>
        </a>'''


def post_page(p, posts):
    kind_dir = 'articles' if p['type'] == 'article' else 'news'
    kind_label = 'Article' if p['type'] == 'article' else 'News'
    same = [q for q in posts if q is not p and q['catSlug'] == p['catSlug'] and q['type'] == p['type']]
    more = [q for q in posts if q is not p and q['type'] == p['type'] and q not in same]
    related = (same + more)[:3]
    cover = '../' + p['img']
    desc = escape(p['summary'] or p['title'])
    ld = json.dumps({
        '@context': 'https://schema.org', '@type': 'NewsArticle' if p['type'] == 'news' else 'Article',
        'headline': p['title'], 'description': p['summary'], 'datePublished': p['date'], 'image': f"{SITE}/{p['img']}",
        'author': {'@type': 'Organization', 'name': 'The Mills Global Customs Brokerage Inc.'},
        'publisher': {'@type': 'Organization', 'name': 'The Mills Global Customs Brokerage Inc.'},
        'mainEntityOfPage': f"{SITE}/{kind_dir}/{p['slug']}",
    })
    rel_cards = '\n        '.join(card(q, '../') for q in related)
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <!-- Draft/preview build - remove this once the site is ready to go fully live -->
  <meta name="robots" content="noindex, nofollow">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
{HEAD_SCRIPTS}
  <title>{escape(p['title'])} | The Mills Global</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{SITE}/{kind_dir}/{p['slug']}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{escape(p['title'])}">
  <meta property="og:description" content="{desc}">
  <meta property="og:image" content="{SITE}/{p['img']}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="../css/base.css?v=4">
  <link rel="stylesheet" href="../css/sections.css?v=3">
  <link rel="stylesheet" href="../css/service-page.css?v=3">
  <link rel="stylesheet" href="../css/content.css?v=3">
  <script type="application/ld+json">{ld}</script>
</head>
<body>
  <!-- Google Tag Manager (noscript) -->
{GTM_NOSCRIPT}
  <!-- End Google Tag Manager (noscript) -->

  {NAV}

  <header class="service-hero post-hero" style="background-image: url('{cover}'); min-height: 56vh;">
    <div class="container">
      <div class="service-hero__inner">
        <p class="service-breadcrumb"><a href="../index.html">Home</a><span>/</span><a href="../blog.html">Blog</a><span>/</span><span>{escape(p['cat'])}</span></p>
        <p class="section__eyebrow service-hero__eyebrow">{kind_label} &middot; {escape(p['cat'])}</p>
        <h1 class="service-hero__title post-hero__title">{escape(p['title'])}</h1>
        <p class="post-hero__meta">{p['dateLabel']} &middot; {p['mins']} min read</p>
      </div>
    </div>
  </header>

  <section class="section section--paper">
    <div class="container">
      <div class="post-layout">
        <article class="article-body post-body">
{p['bodyHtml']}
        </article>
        <aside class="post-aside">
          {toc(p['bodyHtml'])}
          <div class="post-cta">
            <p class="post-cta__title">Need this applied to your shipment?</p>
            <p class="post-cta__text">Tell The Mills what you are importing before you ship it.</p>
            <div class="post-cta__buttons">
              <a href="tel:+639177129000" class="btn-primary" data-ga="cta_call_now" data-ga-label="post-aside">{PHONE} Call Now</a>
              <a href="../book-a-call.html" class="btn-secondary" data-ga="cta_book_consultation" data-ga-label="post-aside">{CAL} Book a Consultation</a>
            </div>
          </div>
          <a class="post-checklists" href="../learning-pavilion.html#resources">Free readiness checklists &rarr;</a>
        </aside>
      </div>
    </div>
  </section>

  <section class="section section--dark">
    <div class="container">
      <div class="services-intro">
        <p class="section__eyebrow">Keep Reading</p>
        <h2 class="services-intro__heading">More {kind_label.lower()}s from The Mills.</h2>
      </div>
      <div class="content-grid">
        {rel_cards}
      </div>
      <a href="../blog.html" class="btn-secondary" style="margin-top: var(--space-xl);">View all articles and news</a>
    </div>
  </section>

  {FOOT}

  <!-- Scripts -->
{TAIL_SCRIPTS}
</body>
</html>
'''


def main():
    articles = read_csv('content/articles.csv', 'article')
    news = read_csv('content/news.csv', 'news')
    posts = articles + news
    print(f'{len(articles)} articles, {len(news)} news ({len(HIDE)} hidden)')
    with ThreadPoolExecutor(1) as ex:
        list(ex.map(fetch_image, posts))
    slugs = {p['slug'] for p in articles}
    for p in posts:
        p['bodyHtml'] = clean_body(p, slugs)
        p['mins'] = read_mins(p['bodyHtml'])
    posts.sort(key=lambda p: (p['date'], p['title']), reverse=True)

    for p in posts:
        d = 'articles' if p['type'] == 'article' else 'news'
        open(f"{d}/{p['slug']}.html", 'w').write(post_page(p, posts))

    index = [{'t': p['type'], 's': p['slug'], 'title': p['title'], 'summary': p['summary'], 'cat': p['cat'],
              'catSlug': p['catSlug'], 'date': p['date'], 'dateLabel': p['dateLabel'], 'mins': p['mins'], 'img': p['img'],
              'url': f"{'articles' if p['type'] == 'article' else 'news'}/{p['slug']}.html"} for p in posts]
    json.dump(index, open('content/posts.json', 'w'), ensure_ascii=False, indent=1)

    # category counts for the filters
    cats = {}
    for p in posts:
        cats.setdefault((p['type'], p['catSlug']), [p['cat'], 0])[1] += 1

    # blog.html listing section
    b = open('blog.html').read()
    a = b.index('</header>') + len('</header>')
    e = b.index('<footer class="footer">')
    first = '\n\n        '.join(card(p) for p in posts[:12])
    listing = f'''

  <section class="section section--paper" id="posts">
    <div class="container">
      <div class="blog-tools">
        <div class="content-filters" role="group" aria-label="Show">
          <button type="button" class="content-filter is-active" data-type="all" aria-pressed="true">All <span class="content-filter__count">{len(posts)}</span></button>
          <button type="button" class="content-filter" data-type="article" aria-pressed="false">Articles <span class="content-filter__count">{len(articles)}</span></button>
          <button type="button" class="content-filter" data-type="news" aria-pressed="false">News <span class="content-filter__count">{len(news)}</span></button>
        </div>
        <label class="resource-search">
          <span class="sr-only">Search articles and news</span>
          <input type="search" id="postSearch" placeholder="Search articles and news" autocomplete="off">
        </label>
      </div>
      <div class="content-filters blog-cats" id="postCats" role="group" aria-label="Category"></div>
      <p class="resource-status" id="postStatus" aria-live="polite"></p>
      <h2 class="sr-only">Latest Philippine customs guides and news</h2>
      <div class="content-grid" id="postGrid">
        {first}
      </div>
      <p class="resource-empty" id="postEmpty" hidden>Nothing matches that search. Try a different word or clear the filters.</p>
      <div class="blog-more"><button type="button" class="btn-secondary" id="postMore" hidden>Load more</button></div>
    </div>
  </section>

  '''
    b = b[:a] + listing + b[e:]
    b = re.sub(r'<h1 class="service-hero__title">.*?</h1>', '<h1 class="service-hero__title">Philippine Trade &amp; Customs: Guides and News</h1>', b, count=1, flags=re.S)
    b = re.sub(r'<p class="service-hero__subtitle">.*?</p>', '<p class="service-hero__subtitle">Practical guides on permits, customs, duties and compliance, plus the latest news from the Bureau of Customs and Philippine trade.</p>', b, count=1, flags=re.S)
    if 'js/blog.js' not in b:
        b = b.replace('  <script src="js/animations.js"></script>', '  <script src="js/animations.js"></script>\n  <script src="js/blog.js"></script>', 1)
    if 'css/lead-magnet.css' not in b:
        pass
    open('blog.html', 'w').write(b)

    # learning pavilion cards
    lp = open('learning-pavilion.html').read()
    def fill(lp, marker, items):
        i = lp.index(marker)
        gi = lp.index('<div class="content-grid">', i)
        ge = gi
        d = 0
        for m in re.finditer(r'<div\b|</div>', lp[gi:]):
            d += 1 if m.group() != '</div>' else -1
            if d == 0:
                ge = gi + m.end(); break
        cards = '\n        '.join(card(q) for q in items)
        return lp[:gi] + f'<div class="content-grid">\n        {cards}\n      </div>' + lp[ge:]
    guides = [p for p in articles if p['cat'] in ('Importation Guides', 'Industry Guides')]
    guides.sort(key=lambda p: p['date'], reverse=True)
    latest = sorted(articles, key=lambda p: p['date'], reverse=True)
    if '<!-- GUIDES & PLAYBOOKS' in lp: lp = fill(lp, '<!-- GUIDES & PLAYBOOKS', guides[:3])
    if '<!-- LATEST ARTICLES' in lp: lp = fill(lp, '<!-- LATEST ARTICLES', latest[:3])
    open('learning-pavilion.html', 'w').write(lp)

    # report
    broken = set()
    for p in posts:
        for m in re.finditer(r'href="([^"]+\.html)"', p['bodyHtml']):
            t = m.group(1)
            if t.startswith('../'): ok = os.path.exists(t[3:])
            else: ok = os.path.exists(('articles/' if p['type'] == 'article' else 'news/') + t)
            if not ok: broken.add(t)
    print('pages written:', len(posts), '| broken internal links:', sorted(broken) or 'none')


if __name__ == '__main__':
    main()
