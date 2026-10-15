#!/usr/bin/env python3
"""Generates n8n/lead-magnet-services.json (importable n8n workflow) from the guide list in js/lead-magnet.js."""
import re, json, uuid, os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
js = open('js/lead-magnet.js').read()
G, _ = json.JSONDecoder().raw_decode(js[js.index('var GUIDES = ') + len('var GUIDES = '):])
SERVICES = {'entry': 'Mills Entry', 'permits': 'Mills Permits', 'customs': 'Mills Customs', 'projects': 'Mills Projects', 'marine': 'Mills Marine',
            'dangerous-goods': 'Mills Dangerous Goods', 'logistics': 'Mills Logistics', 'packaging': 'Mills Packaging',
            'insurance': 'Mills Insurance', 'time-critical': 'Mills Time Critical', 'advisory': 'Mills Advisory'}
cfg = {s: {'service': n, 'title': G[s]['title'], 'pdf': G[s]['pdf']} for s, n in SERVICES.items()}

code = '''// Mills lead magnet: validate, normalize and enrich one form submission.
// To add the 16 industry guides later, add their slugs to GUIDES below (same shape).
const SITE = 'https://themillsglobal.com/';
const GUIDES = %s;

const b = $input.first().json.body || {};
const clean = (v) => String(v == null ? '' : v).trim();
const guide = clean(b.guide);
const email = clean(b.email).toLowerCase();
const digits = clean(b.phone).replace(/\\D/g, '');
const g = GUIDES[guide];

let error = '';
if (clean(b.hp)) error = 'spam';
else if (!g) error = 'unknown guide: ' + guide;
else if (clean(b.name).length < 2) error = 'name';
else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) error = 'email';
else if (digits.length < 7 || digits.length > 15) error = 'phone';
else if (clean(b.company).length < 2) error = 'company';

const name = clean(b.name);
const FREE = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'proton.me', 'protonmail.com'];
const domain = email.split('@')[1] || '';
const fromAd = !!(clean(b.gclid) || clean(b.gbraid) || clean(b.wbraid));
// Hot = came from a Google ad, or used a company email address
const priority = (fromAd || (domain && !FREE.includes(domain))) ? 'Hot' : 'Normal';
return [{ json: {
  received_date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }),
  category: 'Service',
  priority,
  status: 'New',
  owner: '',
  notes: '',
  valid: !error,
  error,
  submitted_at: clean(b.submitted_at) || new Date().toISOString(),
  guide,
  service: g ? g.service : '',
  guide_title: g ? g.title : clean(b.guide_title),
  pdf_url: g ? SITE + g.pdf : '',
  name,
  first_name: name.split(/\\s+/).length > 1 ? name.split(/\\s+/)[0] : '',
  last_name: name.split(/\\s+/).length > 1 ? name.split(/\\s+/).slice(1).join(' ') : name,
  first_name_greeting: name.split(/\\s+/)[0],
  email,
  phone: clean(b.phone),
  company: clean(b.company),
  page: clean(b.page),
  gclid: clean(b.gclid), gbraid: clean(b.gbraid), wbraid: clean(b.wbraid),
  utm_source: clean(b.utm_source), utm_medium: clean(b.utm_medium), utm_campaign: clean(b.utm_campaign),
  utm_term: clean(b.utm_term), utm_content: clean(b.utm_content),
  lead_source: 'lead_magnet'
} }];''' % json.dumps(cfg, indent=2)

nid = lambda: str(uuid.uuid4())
webhook = {'parameters': {'httpMethod': 'POST', 'path': 'mills-lead-magnet', 'responseMode': 'responseNode',
           'options': {'allowedOrigins': 'https://themillsglobal.com,https://www.themillsglobal.com,https://themillsglobalcustomsbrokerage.github.io'}},
           'id': nid(), 'name': 'Webhook - lead magnet form', 'type': 'n8n-nodes-base.webhook', 'typeVersion': 2, 'position': [0, 0], 'webhookId': nid()}
codeN = {'parameters': {'jsCode': code}, 'id': nid(), 'name': 'Validate and normalize', 'type': 'n8n-nodes-base.code', 'typeVersion': 2, 'position': [240, 0]}
ifN = {'parameters': {'conditions': {'options': {'caseSensitive': True, 'leftValue': '', 'typeValidation': 'strict'},
       'conditions': [{'id': nid(), 'leftValue': '={{ $json.valid }}', 'rightValue': '', 'operator': {'type': 'boolean', 'operation': 'true', 'singleValue': True}}],
       'combinator': 'and'}, 'options': {}}, 'id': nid(), 'name': 'Valid submission?', 'type': 'n8n-nodes-base.if', 'typeVersion': 2.2, 'position': [480, 0]}
ok = {'parameters': {'respondWith': 'json', 'responseBody': '={{ JSON.stringify({ ok: true }) }}', 'options': {'responseCode': 200}},
      'id': nid(), 'name': 'Respond 200', 'type': 'n8n-nodes-base.respondToWebhook', 'typeVersion': 1.1, 'position': [720, -100]}
bad = {'parameters': {'respondWith': 'json', 'responseBody': '={{ JSON.stringify({ ok: false, error: $json.error }) }}', 'options': {'responseCode': 400}},
       'id': nid(), 'name': 'Respond 400', 'type': 'n8n-nodes-base.respondToWebhook', 'typeVersion': 1.1, 'position': [720, 160]}
cols = {k: '={{ $json.%s }}' % k for k in ['received_date', 'submitted_at', 'status', 'priority', 'owner', 'category', 'service', 'guide', 'guide_title', 'name', 'email', 'phone', 'company', 'page', 'lead_source', 'notes',
        'gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']}
sheet = {'parameters': {'operation': 'append', 'documentId': {'__rl': True, 'value': '', 'mode': 'id'}, 'sheetName': {'__rl': True, 'value': 'Leads', 'mode': 'name'},
         'columns': {'mappingMode': 'defineBelow', 'value': cols, 'matchingColumns': [], 'schema': []}, 'options': {}},
         'id': nid(), 'name': 'Log lead to Google Sheet', 'type': 'n8n-nodes-base.googleSheets', 'typeVersion': 4.5, 'position': [960, -220], 'onError': 'continueRegularOutput'}
leadmail = '''<p>Hi {{ $json.first_name_greeting }},</p>
<p>Thank you for your interest. Here is your free checklist: <strong>{{ $json.guide_title }}</strong>.</p>
<p><a href="{{ $json.pdf_url }}" style="display:inline-block;padding:12px 22px;background:#EA5C1F;color:#ffffff;border-radius:999px;text-decoration:none;font-weight:600">Download the checklist</a></p>
<p>If you would like help applying it to your shipment, reply to this email or call us on +63 917 712 9000.</p>
<p>The Mills Global<br>inquiry@themillsglobal.com</p>'''
mail1 = {'parameters': {'sendTo': '={{ $json.email }}', 'subject': '={{ $json.guide_title }} from The Mills Global', 'emailType': 'html', 'message': '=' + leadmail,
         'options': {'appendAttribution': False, 'senderName': 'The Mills Global', 'replyTo': 'inquiry@themillsglobal.com'}},
         'id': nid(), 'name': 'Email the checklist to the lead', 'type': 'n8n-nodes-base.gmail', 'typeVersion': 2.1, 'position': [960, 0], 'onError': 'continueRegularOutput'}
notif = '''<p><strong>New lead magnet download</strong></p>
<p>Service: {{ $json.service }}<br>Checklist: {{ $json.guide_title }}</p>
<p>Name: {{ $json.name }}<br>Company: {{ $json.company }}<br>Email: {{ $json.email }}<br>Phone: {{ $json.phone }}</p>
<p>Page: {{ $json.page }}<br>Ad source: {{ $json.utm_source }} / {{ $json.utm_campaign }} {{ $json.gclid ? '(gclid ' + $json.gclid + ')' : '' }}</p>'''
mail2 = {'parameters': {'sendTo': 'inquiry@themillsglobal.com', 'subject': '=New lead: {{ $json.service }} - {{ $json.company }}', 'emailType': 'html', 'message': '=' + notif,
         'options': {'appendAttribution': False}},
         'id': nid(), 'name': 'Notify the team', 'type': 'n8n-nodes-base.gmail', 'typeVersion': 2.1, 'position': [960, 220], 'onError': 'continueRegularOutput'}
desc = ('Lead magnet: {{ $json.guide_title }}\nService: {{ $json.service }}\nPriority: {{ $json.priority }}\nPage: {{ $json.page }}\n'
        'Ad source: {{ $json.utm_source }} / {{ $json.utm_medium }} / {{ $json.utm_campaign }}\nGCLID: {{ $json.gclid }}\nSubmitted: {{ $json.submitted_at }}')
zoho = {'parameters': {'resource': 'lead', 'operation': 'upsert', 'lastName': '={{ $json.last_name }}',
        'additionalFields': {'First_Name': '={{ $json.first_name }}', 'Company': '={{ $json.company }}', 'Email': '={{ $json.email }}', 'Phone': '={{ $json.phone }}',
                             'Lead_Source': 'Website', 'Lead_Status': 'Not Contacted', 'Description': '=' + desc}},
        'id': nid(), 'name': 'Create or update lead in Zoho CRM', 'type': 'n8n-nodes-base.zohoCrm', 'typeVersion': 1, 'position': [960, -440], 'onError': 'continueRegularOutput'}
note = {'parameters': {'content': '## Mills | Lead magnets: all 11 services\n**Webhook:** POST, form-urlencoded (what the site sends). The Respond nodes return JSON so the site sees a 200.\n**Setup:**\n1. Pick your Zoho CRM (OAuth2, your data center), Google Sheets and Gmail credentials on the four action nodes. The Sheet is an optional backup log: delete that node if you only want Zoho.\n2. In the Sheet node choose your spreadsheet: a tab named "Leads" whose first-row headers match the column names (see the list in the Sheet node). Turn on Data > Create a filter, or use filter views, to sort by status, priority or service.\n3. Activate, then copy the **Production URL** into js/lead-magnet.js (WEBHOOK_URL).\n**Test:** use the Test URL once, then switch to Production.', 'height': 320, 'width': 420, 'color': 5},
        'id': nid(), 'name': 'Setup notes', 'type': 'n8n-nodes-base.stickyNote', 'typeVersion': 1, 'position': [-20, -380]}
link = lambda n: {'node': n['name'], 'type': 'main', 'index': 0}
conn = {webhook['name']: {'main': [[link(codeN)]]}, codeN['name']: {'main': [[link(ifN)]]},
        ifN['name']: {'main': [[link(ok)], [link(bad)]]}, ok['name']: {'main': [[link(zoho), link(sheet), link(mail1), link(mail2)]]}}
wf = {'name': 'Mills | Lead magnet - all 11 services', 'nodes': [note, webhook, codeN, ifN, ok, bad, zoho, sheet, mail1, mail2], 'connections': conn,
      'active': False, 'settings': {'executionOrder': 'v1'}, 'pinData': {}, 'meta': {'templateCredsSetupCompleted': False}}
os.makedirs('n8n', exist_ok=True)
json.dump(wf, open('n8n/lead-magnet-services.json', 'w'), indent=2)
print('written', len(json.dumps(wf)), 'bytes;', len(cfg), 'services')
