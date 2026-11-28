// Google Tag Manager for isaac.toys (owner, 2026-11-28). A file of its own because the site's CSP forbids inline
// scripts; the server adds it to pages in production only, never to /admin (api/app/main.py).
//
// Consent Mode first, before Tag Manager loads: visitors in the European Economic Area, the UK and Switzerland
// get no analytics cookie (there is no banner to change that, so Google receives only cookieless signals for
// them); everyone else is counted normally. Google's advertising features are off everywhere: the site has no ads.
(function () {
  var CONTAINER = "GTM-KQ7CJK9M";
  var EEA_UK_CH = [
    "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU",
    "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
  ];

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    region: EEA_UK_CH,
  });
  gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  gtag("js", new Date());

  // Tag Manager's own start event: without it the container's page-view triggers never fire.
  window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
  var loader = document.createElement("script");
  loader.async = true;
  loader.src = "https://www.googletagmanager.com/gtm.js?id=" + CONTAINER;
  document.head.appendChild(loader);
})();
