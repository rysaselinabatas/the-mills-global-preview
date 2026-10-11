# Analytics setup (GA4 through Google Tag Manager)

The site pushes events into the dataLayer. GTM forwards them to GA4.

## 1. Import the GTM tag (one time)
1. GTM, container `GTM-K3QFNL94`: Admin, Import Container.
2. Choose `gtm/mills-ga4-events.json`, pick your workspace, choose **Merge** and **Rename conflicting tags, triggers and variables**.
3. Open the tag **GA4 Event - Mills site events** and replace `G-XXXXXXXXXX` with the GA4 measurement ID (GA4 Admin, Data streams).
4. Preview the live site in GTM, click a Call Now button, and confirm the tag fires.
5. Publish the container.

## 2. Events the site sends
| Event | When |
|---|---|
| `call_click` | any tel: link (Call Now) |
| `email_click` | any mailto: link (Email Us) |
| `book_consult_click` | Book a Consultation button or a link to the Book a Call page |
| `book_call_scheduled` | Cal.com confirms a booking |
| `generate_lead` | lead magnet or contact form submitted |
| `lead_magnet_open`, `lead_magnet_dismiss`, `lead_magnet_download`, `lead_magnet_error` | popup lifecycle |
| `lp_filter`, `lp_search` | Learning Pavilion filters and search |

Every click event carries `cta_location` (hero, overview, core-support, how-it-works, typical-cargo, regulatory-focus, connected-services, home-services, home-why, home-stats, nav, footer, book_call_section, contact_section, other) and `page_type` (home, service, industry, ...).

## 3. GA4 settings (one time)
- Admin, Custom definitions, Create custom dimension (scope **Event**) for each: `cta_location`, `page_type`, `guide`, `trigger`, `lead_source`, `filter_value`.
- Admin, Events, mark as **key events**: `call_click`, `email_click`, `book_consult_click`, `book_call_scheduled`, `generate_lead`.
- Check Admin, DebugView (or add `?ga_debug=1` to a page URL and watch the browser console).

## 4. Reading it
Explore, Free form: rows `cta_location`, columns `Event name`, values `Event count`. Add `page_type` as a filter to compare service pages, industry pages and the home page.

## 5. Ad conversions (Google Ads, LinkedIn)
Set in `js/analytics.js`: `ADS_CONVERSIONS` and `LINKEDIN_CONVERSIONS`. Only `phone` (Phone Click - Contact Us) and LinkedIn `book_click` are filled in so far.
