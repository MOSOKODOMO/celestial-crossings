(() => {
  'use strict';
  const dialog = document.querySelector('#reveal-dialog');
  const details = document.querySelector('#reveal-details');
  const status = document.querySelector('#reveal-status');
  const skip = document.querySelector('#skip-reveal');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = null;

  // Decoration is deterministic and never consumes the draw engine's randomness.
  document.querySelector('#reveal-dust').innerHTML = Array.from({length:36}, (_, i) => {
    const angle = i * 2.39996;
    const radius = 110 + (i % 7) * 22;
    return `<span style="--x:${Math.cos(angle)*radius}px;--y:${Math.sin(angle)*radius}px;--delay:${(i%9)*-.31}s;--size:${i%5===0?4:2}px"></span>`;
  }).join('');

  function cancel() {
    if (active) active.timers.forEach(clearTimeout);
    active = null;
  }

  function finish() {
    if (!active || !dialog.open) return;
    const onReveal = active.onReveal;
    const restoreFocus = document.activeElement === skip;
    cancel();
    dialog.dataset.phase = 'revealed';
    dialog.setAttribute('aria-labelledby', 'reveal-title');
    details.inert = false;
    details.removeAttribute('aria-hidden');
    status.hidden = true;
    skip.hidden = true;
    // Only move focus if the control holding it is about to disappear.
    if (restoreFocus) document.querySelector('#keep-card').focus({preventScroll:true});
    if (onReveal) onReveal();
  }

  function open({cinematic = false, onReveal} = {}) {
    cancel();
    dialog.classList.toggle('cinematic', cinematic);
    dialog.classList.remove('art-unavailable');
    dialog.dataset.phase = cinematic ? 'loading' : 'revealed';
    const animate = cinematic && !motion.matches;
    details.inert = animate;
    details.toggleAttribute('aria-hidden', animate);
    if (animate) details.setAttribute('aria-hidden', 'true');
    status.hidden = !animate;
    skip.hidden = !animate;
    dialog.setAttribute('aria-labelledby', animate ? 'reveal-status' : 'reveal-title');
    dialog.showModal();
    if (!cinematic) return;
    const run = {timers:[], onReveal};
    active = run;
    const later = (fn, delay) => run.timers.push(window.setTimeout(() => {
      if (active === run) fn();
    }, delay));
    const art = document.querySelector('#revealed-card img');
    art.addEventListener('error', () => {
      if (dialog.open && art.isConnected) dialog.classList.add('art-unavailable');
    }, {once:true});
    if (art.complete && !art.naturalWidth) dialog.classList.add('art-unavailable');
    if (!animate) { finish(); return; }
    let started = false;
    const start = () => {
      if (active !== run || started) return;
      started = true;
      dialog.dataset.phase = 'playing';
      later(finish, 3400);
    };
    // Give uncached artwork a head start; slow/broken images cannot block closing or skipping.
    later(start, 450);
    art.decode().catch(() => {}).then(start);
  }

  skip.addEventListener('click', finish);
  dialog.addEventListener('close', () => {
    cancel();
    dialog.dataset.phase = 'idle';
    details.inert = false;
    details.removeAttribute('aria-hidden');
  });
  motion.addEventListener('change', event => { if (event.matches) finish(); });
  window.CharmReveal = {open};
})();
