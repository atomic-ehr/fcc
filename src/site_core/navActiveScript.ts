// Client-side sidebar active-state marker. The sidebar HTML is identical on
// every page (it has no current-page context), so we resolve "which link is
// active" in the browser from location.pathname: highlight the matching link,
// expand all its ancestor <details> groups, and scroll it into view.
//
// Returns the script *body* (the renderer wraps it in <script>…</script>).
export default function navActiveScript(_ctx: Context, _opts?: Record<string, never>): string {
    return `(function(){
  // Normalise to a comparable key: basename, no query/hash, no .html, lowercased.
  // Clean-URL hosts strip .html; explicit hosts keep it — normalising both matches either.
  var norm = function(s){ return ((s||'').split('/').pop()||'').split('#')[0].split('?')[0].replace(/\\.html$/,'').toLowerCase() || 'index'; };
  var here = norm(location.pathname);
  var nav = document.getElementById('site-nav');
  if (!nav) return;
  var links = nav.querySelectorAll('a[href]');
  for (var i = 0; i < links.length; i++) {
    var base = norm(links[i].getAttribute('href'));
    if (base !== here) continue;
    var a = links[i];
    a.classList.add('nav-active');
    a.setAttribute('aria-current', 'page');
    var d = a.closest('details');
    while (d) { d.open = true; d = d.parentElement ? d.parentElement.closest('details') : null; }
    a.scrollIntoView({ block: 'center' });
    break;
  }
})();`;
}
