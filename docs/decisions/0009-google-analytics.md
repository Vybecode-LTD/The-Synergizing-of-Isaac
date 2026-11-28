# 0009 — Google Analytics through Tag Manager, with EU/UK consent off by default

Date: 2026-11-28. Status: decided by the owner (the container id, and "EU/UK off by default" over "track
everyone" or a cookie banner); built in PR #15.

## Decision

1. Google Tag Manager container `GTM-KQ7CJK9M` loads on every production page except `/admin`, from
   `web/public/analytics.js`. The server adds the tag (`api/app/main.py`, `ANALYTICS_TAG`), so local runs,
   CI's browser test and any non-production deploy never count as visits. What the container fires (the
   GA4 tag and its settings) is configured in Tag Manager, not in this repository.
2. **Consent Mode, no banner.** Before Tag Manager loads, the default consent is: in the European Economic
   Area, the UK and Switzerland, everything denied (no analytics cookie; Google receives only cookieless
   signals); everywhere else, analytics granted. Advertising storage, ad user data and ad personalisation
   are denied everywhere: the site has no ads.
3. The About page says what is collected (pages and their addresses, which in the builder hold the build;
   rough location; device and browser; a random ID in a cookie) and the EU/UK/CH difference.

## How it fits the CSP

The CSP still forbids inline scripts and eval. It allows the hosts Google documents for its tag:
`https://*.googletagmanager.com` for scripts, and `https://*.google-analytics.com`,
`https://*.analytics.google.com`, `https://*.googletagmanager.com` for beacons and pixels. So Tag Manager
"Custom HTML" tags and "Custom JavaScript" variables will not run. If the GA4 property turns on Google
signals, Google may also call `*.g.doubleclick.net` or `www.google.com`, which the CSP refuses; add those
hosts only if that is wanted.

## Revisit

If a banner is ever added, it calls `gtag("consent", "update", {...})`; the defaults above stay as they are.
