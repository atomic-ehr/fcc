// Hash ↔ tab sync, so profile-page tabs are deep-linkable like IG-Publisher's
// (`…#tabs-diff`, `…#tabs-defn`, …). Tab buttons carry data-tab="<anchor>" and,
// when clicked, write the anchor to location.hash (see profileTabs). This
// script drives the reverse: on load and on hashchange it finds the matching
// button and clicks it — first clicking its data-tab-parent so a deep link to
// an inner Formal-Views tab also activates the enclosing top-level tab.
//
// Runs on `load` (after Datastar has wired the buttons' click handlers).
// Returns the script body; the renderer wraps it in <script>.
export default function tabHashScript(_ctx: Context, _opts?: Record<string, never>): string {
    return `(function(){
  function activate(anchor){
    if(!anchor) return;
    var btn = document.querySelector('[data-tab="'+anchor.replace(/"/g,'')+'"]');
    if(!btn) return;
    var parent = btn.getAttribute('data-tab-parent');
    if(parent){ var pb = document.querySelector('[data-tab="'+parent+'"]'); if(pb) pb.click(); }
    btn.click();
  }
  function fromHash(){ activate((location.hash || '').slice(1)); }
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('load', fromHash);
})();`;
}
