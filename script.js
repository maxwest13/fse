(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  $('#year').textContent = new Date().getFullYear();
  const menuButton = $('#menu-toggle');
  const nav = $('#site-links');
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
  });
  $$('#site-links a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  }));

  // Every process stage is displayed in full; no accordion needed.

  // The visual face is never a static mockup: these tiles are accessible buttons.
  $$('.tool-card').forEach(card => card.addEventListener('click', () => {
    const was = card.getAttribute('aria-pressed') === 'true';
    $$('.tool-card').forEach(other => {other.classList.remove('is-flipped');other.setAttribute('aria-pressed','false')});
    if (!was) {card.classList.add('is-flipped');card.setAttribute('aria-pressed','true');}
  }));
  const contactDialog = $('#contact-dialog');
  let lastAutomaticRequest = '';
  $$('.application-card[data-case-study]').forEach(card => card.addEventListener('click', () => {
    const caseId = card.dataset.caseStudy;
    const message = $('#inquiry-form textarea[name="message"]');
    // A request from a confidential case-study panel arrives at the same form.
    // Do not overwrite an existing message someone may already have typed.
    if (message && (!message.value.trim() || message.value === lastAutomaticRequest)) {
      lastAutomaticRequest = `I'd like to request information about CASE STUDY / ${caseId}.`;
      message.value = lastAutomaticRequest;
    }
    if (!contactDialog.open) contactDialog.showModal();
  }));
  $('#contact-trigger')?.addEventListener('click',()=>contactDialog.showModal());
  // The splash CTA remains an anchor; this action opens the same form on reaching it.
  $$('.ticker-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); contactDialog.showModal(); }));
  $$('[data-close-dialog]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
  $$('dialog').forEach(dlg=>dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()}));

  const form=$('#inquiry-form');
  form?.addEventListener('submit', e=>{
    // A local HTML preview cannot deliver a Netlify form.
    if (location.protocol==='file:' || (location.hostname==='localhost' || location.hostname==='127.0.0.1')) {
      e.preventDefault();
      const note=$('#form-note');note.textContent='Local preview only. This form will accept submissions after deployment to Netlify.';note.classList.add('is-warning');
    }
  });
})();
