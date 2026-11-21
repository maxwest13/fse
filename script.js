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
  const examples = {
    operations: ['01 / OPERATIONS', 'OPERATIONS, REIMAGINED.', 'When the way work gets done is the bottleneck, we map the actual operation and design tools and automation around the people running it.'],
    intelligence: ['02 / INTELLIGENCE', 'ANSWERS FROM COMPLEXITY.', 'We turn scattered information into usable knowledge, reporting, and better decisions. Not a dashboard for its own sake, but the visibility a team actually needs.'],
    systems: ['03 / CUSTOM SYSTEMS', 'BUILT TO FIT.', 'From internal tools to connected platforms, we engineer software that matches how a business truly operates. No preselected stack or one-size-fits-all template.']
  };
  const appDialog = $('#application-dialog');
  $$('.application-card').forEach(card => card.addEventListener('click', () => {
    const [kick,title,description] = examples[card.dataset.application];
    $('#application-kicker').textContent=kick;
    $('#application-title').textContent=title;
    $('#application-text').textContent=description;
    appDialog.showModal();
  }));
  const contactDialog = $('#contact-dialog');
  $('#contact-trigger')?.addEventListener('click',()=>contactDialog.showModal());
  // The splash CTA remains an anchor; this action opens the same form on reaching it.
  $$('.ticker-link').forEach(a => a.addEventListener('click', e => { e.preventDefault(); contactDialog.showModal(); }));
  $('#application-cta')?.addEventListener('click', e => { e.preventDefault(); appDialog.close(); contactDialog.showModal(); });
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
