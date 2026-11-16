/* DH website stats. Add to a client site with:
     <script defer src="https://app.dhwebsiteservices.co.uk/t.js" data-site="SITE_KEY"></script>
   Counts page views and where visitors came from. No cookies, nothing stored
   in the browser, no personal data. Call window.dhEnquiry() when a contact
   form is sent (forms with data-dh-enquiry are counted automatically). */
(function () {
  var s = document.currentScript, k = s && s.getAttribute('data-site')
  if (!k || navigator.doNotTrack === '1' || /^(localhost|127\.)/.test(location.hostname)) return
  var api = s.src.replace(/\/t\.js.*$/, '/api/hit')
  function send(d) {
    d.k = k
    var b = JSON.stringify(d)
    if (!(navigator.sendBeacon && navigator.sendBeacon(api, new Blob([b], { type: 'text/plain' })))) {
      try { fetch(api, { method: 'POST', body: b, keepalive: true, headers: { 'content-type': 'text/plain' } }) } catch (e) {}
    }
  }
  var last
  function view() { if (location.pathname === last) return; last = location.pathname; send({ p: location.pathname, r: document.referrer }) }
  window.dhEnquiry = function () { send({ e: 'enquiry' }) }
  document.addEventListener('submit', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-dh-enquiry')) window.dhEnquiry() }, true)
  var push = history.pushState
  history.pushState = function () { push.apply(this, arguments); setTimeout(view, 0) }
  addEventListener('popstate', view)
  view()
})()
