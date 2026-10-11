"""One-off SEO/AEO pass over the root pages: social meta, alt text, ARIA labels on
image slots, industry FAQs (visible + FAQPage JSON-LD), home/location structured data."""
import re, glob, json, html
SITE = 'https://themillsglobal.com/'
OG_IMG = SITE + 'assets/images/hero-ocean.jpg'

PROC = {'discovery': 'Mills team reviewing shipment documents and cargo details during discovery',
        'mapping': 'Mapping tariff classification, customs value and permits for a Philippine import',
        'readiness': 'Preparing import documents and permits so cargo is ready for customs clearance',
        'plan': 'Planning the customs clearance and delivery schedule for a shipment',
        'coordination': 'Coordinating customs release, port handling and delivery to the consignee'}
PEX = {'marine': 'Cargo vessel at a Philippine port, supported by Mills Marine', 'customs': 'Customs brokerage and clearance of containerized cargo in the Philippines',
       'entry': 'Import entry processing for cargo arriving in the Philippines', 'permits': 'Import permits and agency clearances for Philippine shipments',
       'projects': 'Project cargo and heavy equipment moved into the Philippines', 'dangerous-goods': 'Dangerous goods cargo handled to Philippine import rules',
       'logistics': 'Freight logistics and trucking from Philippine port to warehouse', 'packaging': 'Export packaging and crating for international shipments',
       'insurance': 'Marine cargo insurance for shipments to and from the Philippines', 'time-critical': 'Time-critical air freight cleared quickly through Philippine customs',
       'advisory': 'Trade advisory and customs compliance consultation in the Philippines'}

IND = {  # slug: (short noun phrase, agencies hedge)
 'agriculture': ('agricultural, plant, animal and fisheries products', 'the Bureau of Plant Industry, the Bureau of Animal Industry and BFAR'),
 'automotive': ('vehicles, heavy equipment and special-purpose vehicles', 'the Bureau of Customs and the other agencies that regulate vehicle imports'),
 'aviation': ('aircraft parts and aerospace cargo', 'the Bureau of Customs and aviation authorities such as CAAP'),
 'chemicals': ('chemicals and controlled materials', 'the Bureau of Customs and environmental and chemical-control authorities such as DENR-EMB'),
 'cold-chain': ('temperature-sensitive and cold chain cargo', 'the FDA, the Bureau of Animal Industry and other food and health regulators'),
 'construction': ('construction and infrastructure materials and equipment', 'the Bureau of Customs and standards bodies such as DTI-BPS'),
 'data-centers': ('data center and digital infrastructure equipment', 'the Bureau of Customs and the agencies that govern IT and telecom equipment'),
 'electronics-telecom': ('electronics, telecom and IT hardware', 'the Bureau of Customs and regulators such as the NTC'),
 'food-beverage': ('food, beverage and FMCG products', 'the FDA, the Bureau of Customs and other food-safety regulators'),
 'freight-forwarders': ('freight forwarder and logistics provider shipments', 'the Bureau of Customs and the permitting agencies that apply to each consignee'),
 'healthcare': ('pharmaceuticals, medical devices and healthcare products', 'the FDA and the Bureau of Customs'),
 'manufacturing': ('manufacturing inputs and industrial machinery', 'the Bureau of Customs and investment zone authorities such as PEZA'),
 'marine': ('vessels, yachts and marine equipment', 'the Bureau of Customs and maritime authorities such as MARINA'),
 'mining': ('mining equipment, minerals and industrial materials', 'the Bureau of Customs and bodies such as DENR-MGB'),
 'renewable-energy': ('renewable energy and power equipment', 'the Bureau of Customs and energy authorities such as the DOE'),
 'retail': ('retail, consumer goods and e-commerce shipments', 'the Bureau of Customs, the DTI and product-specific regulators'),
}

def esc(s): return html.escape(s, quote=True)
def strip(s): return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()

def faq_html(qas):
    items = ''.join(f'''        <div class="faq-item">
          <button class="faq-question" type="button" aria-expanded="false">
            <span>{esc(q)}</span>
            <svg class="faq-question__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <div class="faq-answer">
            <p>{esc(a)}</p>
          </div>
        </div>

''' for q, a in qas)
    return f'''  <section class="section section--dark" id="faq">
    <div class="container">
      <div class="services-intro">
        <p class="section__eyebrow animate-in">Common Questions</p>
        <h2 class="services-intro__heading animate-in" data-delay="1">Answers before you have to ask.</h2>
      </div>
      <div class="faq-list">
{items}      </div>
    </div>
  </section>

'''

def ld(obj): return '  <script type="application/ld+json">\n' + json.dumps(obj, indent=2, ensure_ascii=False) + '\n  </script>\n'

def industry_qas(noun, ag):
    return [
     (f'What do I need to import {noun} into the Philippines?',
      f'Requirements depend on the product, its tariff classification and the agencies that regulate it, which can include {ag}. The Mills reviews the product and transaction first, maps the permits and clearances that apply, then prepares the documents and coordinates entry before the cargo ships.'),
     (f'Can The Mills handle customs clearance for {noun}?',
      f'Yes. The Mills is a Philippine customs broker that prepares and files the entry, coordinates examination and release, and keeps the documents consistent so {noun} shipments are cleared with fewer surprises at the port.'),
     (f'How early should I contact a customs broker before shipping {noun}?',
      'Before the cargo ships. Classification, permits and document mismatches are far cheaper to fix at the planning stage than after arrival, when storage and demurrage charges can already be running.'),
     (f'Does The Mills arrange permits and agency clearances for {noun}?',
      f'The Mills coordinates the permits and clearances that apply to your cargo, including those handled by {ag}, depending on the product. Final requirements follow the current rules of each agency, so we confirm them against your actual shipment.'),
    ]

def add_meta(h, f):
    if 'og:title' in h: return h
    t = re.search(r'<title>(.*?)</title>', h, re.S).group(1)
    d = re.search(r'<meta name="description" content="(.*?)"', h)
    d = d.group(1) if d else ''
    url = SITE + ('' if f == 'index.html' else f)
    tags = f'''  <meta property="og:type" content="website">
  <meta property="og:site_name" content="The Mills Global">
  <meta property="og:locale" content="en_PH">
  <meta property="og:title" content="{t}">
  <meta property="og:description" content="{d}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{OG_IMG}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{t}">
  <meta name="twitter:description" content="{d}">
  <meta name="twitter:image" content="{OG_IMG}">
'''
    h = re.sub(r'(<meta name="description"[^>]*>\n)', lambda m: m.group(1) + tags, h, 1)
    if 'rel="canonical"' not in h:
        h = h.replace(tags, tags + f'  <link rel="canonical" href="{url}">\n', 1)
    return h

ORG = {"@context": "https://schema.org", "@type": ["Organization", "ProfessionalService"], "name": "The Mills Global",
       "url": SITE, "logo": SITE + "assets/images/brand/mills-logo-horizontal-navy.png",
       "description": "Philippine customs brokerage and trade execution: customs clearance, import permits, project cargo, dangerous goods, marine, logistics and advisory.",
       "areaServed": "PH", "email": "inquiry@themillsglobal.com", "telephone": "+63 917 712 9000",
       "address": [{"@type": "PostalAddress", "streetAddress": "Level 24 Philippine Stock Exchange Tower, 5th Ave. cor. 28th St., BGC", "addressLocality": "Taguig City", "addressCountry": "PH"},
                   {"@type": "PostalAddress", "streetAddress": "Suite 301, 303 Escolta Street, Brgy. 29 Binondo", "addressLocality": "Manila", "postalCode": "1006", "addressCountry": "PH"}]}

HOME_FAQ = [
 ('What does a customs broker in the Philippines do?', 'A customs broker prepares and files import and export entries with the Bureau of Customs, classifies goods, computes duties and taxes, secures the required permits, and coordinates examination and release so the cargo can move.'),
 ('What services does The Mills Global offer?', 'The Mills Global offers customs brokerage and clearance, import permits, project cargo, marine services, dangerous goods handling, logistics, packaging, cargo insurance, time-critical freight and trade advisory.'),
 ('Which industries does The Mills Global serve?', 'The Mills serves data centers, renewable energy, construction, manufacturing, automotive, healthcare, food and beverage, agriculture, chemicals, electronics and telecom, marine, aviation, retail, cold chain, mining and freight forwarders.'),
 ('How do I start importing into the Philippines?', 'Tell The Mills what you are importing before it ships. We review the product, confirm classification and permits, and map the plan, so the shipment arrives ready for clearance.'),
 ('Where is The Mills Global located?', 'The Mills Global has offices in BGC, Taguig City and Binondo, Manila, and works with partners in major ports and trade cities worldwide.'),
]

def faq_ld(qas):
    return {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qas]}

for f in sorted(glob.glob('*.html')):
    h = open(f).read(); o = h
    h = add_meta(h, f)
    name = f[:-5]
    # --- alt text
    def alt_proc(m):
        src = m.group(1); k = re.search(r'process-(\w+)\.jpg', src); pe = re.search(r'pexels-([\w-]+)\.jpg', src)
        a = PROC.get(k.group(1)) if k else (PEX.get(pe.group(1)) if pe else None)
        return m.group(0) if not a else m.group(0).replace('alt=""', f'alt="{esc(a)}"')
    h = re.sub(r'<img src="([^"]+)" alt=""[^>]*>', alt_proc, h)
    # --- image slots: expose to assistive tech / crawlers
    h1 = strip(re.search(r'<h1[^>]*>(.*?)</h1>', h, re.S).group(1)) if '<h1' in h else name
    topic = h1
    def slot(m):
        tag = m.group(0)
        img = re.search(r'data-img="([^"]+)"', tag).group(1)
        base = re.sub(r'\.\w+$', '', img.split('/')[-1]).replace('-', ' ')
        label = f'{topic}: {base}' if 'cargo/' not in img else f'{topic}: cargo handled by The Mills Global'
        return tag.replace('aria-hidden="true"', f'role="img" aria-label="{esc(label)}"')
    h = re.sub(r'<div class="img-slot[^>]*aria-hidden="true"[^>]*>', slot, h)
    # --- industry FAQ
    m = re.match(r'industries-([\w-]+)$', name)
    if m and m.group(1) in IND and 'FAQPage' not in h:
        noun, ag = IND[m.group(1)]
        qas = industry_qas(noun, ag)
        h = h.replace('  <!-- ============================================ -->\n  <!-- CTA ', faq_html(qas) + '  <!-- ============================================ -->\n  <!-- CTA ', 1)
        h = h.replace('</head>', ld(faq_ld(qas)) + '</head>', 1)
    if name == 'index' and 'FAQPage' not in h:
        h = h.replace('</head>', ld(ORG) + ld(faq_ld(HOME_FAQ)) + '</head>', 1)
        h = h.replace('  <!-- ============================================ -->\n  <!-- CTA ', faq_html(HOME_FAQ) + '  <!-- ============================================ -->\n  <!-- CTA ', 1)
    if name in ('location', 'about', 'contact') and '"Organization"' not in h:
        h = h.replace('</head>', ld(ORG) + '</head>', 1)
    if h != o: open(f, 'w').write(h); print('updated', f)
