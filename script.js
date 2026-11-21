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

  // Only one process stage expands at a time.
  const phases = [
    ['01 / EMBED', 'We work inside your organization to understand its people, workflows, technologies, and constraints before proposing a solution.'],
    ['02 / DIAGNOSE', 'We identify bottlenecks, wasted effort, disconnected information, and overlooked opportunities. The right question comes before the right tool.'],
    ['03 / BUILD', 'We design and engineer the right intervention, from workflow automation and custom software to decision systems and new infrastructure.'],
    ['04 / DEPLOY', 'We put the work into real environments, test with actual users, measure what changes, and improve what needs improving.']
  ];
  const processDetail = $('#process-expanded');
  function selectProcess(i) {
    const chosen = $(`[data-process="${i}"]`);
    const isOpen = chosen?.getAttribute('aria-pressed') === 'true';
    $$('.process-tile').forEach((btn) => { btn.classList.remove('is-active'); btn.setAttribute('aria-pressed', 'false'); });
    if (isOpen) { processDetail.hidden = true; return; }
    chosen.classList.add('is-active'); chosen.setAttribute('aria-pressed', 'true');
    $('#process-index').textContent = phases[i][0];
    $('#process-description').textContent = phases[i][1];
    processDetail.hidden = false;
  }
  $$('.process-tile').forEach(el => el.addEventListener('click', () => selectProcess(Number(el.dataset.process))));
  $('#close-process')?.addEventListener('click', () => { processDetail.hidden = true; $$('.process-tile').forEach(b=>{b.classList.remove('is-active');b.setAttribute('aria-pressed','false')}) });

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
