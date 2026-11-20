/* Shared MooJai identity, locale and progressive motion. No personal data is stored here. */
(() => {
  'use strict';
  const paths = {
    heart:'<path d="M20.4 4.6a5.5 5.5 0 0 0-7.8 0L12 5.2l-.6-.6a5.5 5.5 0 0 0-7.8 7.8L12 21l8.4-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
    coin:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 4 16 4 16 0V6M4 12v6c0 4 16 4 16 0v-6"/>',
    leaf:'<path d="M20 3C9 2 3 6 4 13s12 10 16-10ZM3 21 16 8"/>',
    stars:'<path d="m8 3 2.2 5.8L16 11l-5.8 2.2L8 19l-2.2-5.8L0 11l5.8-2.2L8 3Zm11-1 1.4 3.6L24 7l-3.6 1.4L19 12l-1.4-3.6L14 7l3.6-1.4L19 2"/>',
    moon:'<path d="M20.5 15.5A9 9 0 0 1 8.5 3a9 9 0 1 0 12 12.5Z"/><path d="m18 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>',
    cards:'<rect x="7" y="3" width="13" height="18" rx="2"/><path d="m5 5-3 1 3 16 3-1m5.5-14 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>',
    paw:'<ellipse cx="6" cy="7" rx="2" ry="3"/><ellipse cx="12" cy="5" rx="2" ry="3"/><ellipse cx="18" cy="7" rx="2" ry="3"/><path d="M6 14c-5 6 0 9 4 6a4 4 0 0 1 4 0c4 3 9 0 4-6-4-6-8-6-12 0Z"/>',
    book:'<path d="M12 5C8 2 4 3 2 4v16c3-1 6-2 10 1 4-3 7-2 10-1V4c-2-1-6-2-10 1v16"/>',
    map:'<path d="m9 4-7 3v15l7-3 6 3 7-3V4l-7 3-6-3Zm0 0v15m6-12v15"/>',
    chat:'<path d="M21 11a9 8 0 0 1-9 8H8l-6 3 2-6a8 8 0 0 1-1-5 9 8 0 0 1 18 0Z"/><path d="M7 11h.01M12 11h.01M17 11h.01"/>',
    gear:'<path d="m10 2-1 3-3 1-3-1-2 4 2 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-2-2v-3l2-2-2-4-3 1-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>', back:'<path d="M20 12H4m6-6-6 6 6 6"/>', down:'<path d="m6 9 6 6 6-6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',
    check:'<path d="m5 12 4 4L19 6"/>', lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/>', download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    bowl:'<path d="M3 11h18c0 7-4 10-9 10S3 18 3 11Zm3 0 2-7h8l2 7"/>', rest:'<path d="M3 8v14m18-9v9M3 18h18M3 13h18v5M6 9h5v4M15 3h5l-5 5h5"/>', people:'<circle cx="9" cy="7" r="3"/><path d="M2 21v-4a7 7 0 0 1 14 0v4M17 4a3 3 0 0 1 0 6m2 4c2 1 3 3 3 7"/>', info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>'
  };
  const icon = name => `<svg class="mj-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.stars}</svg>`;
  const mark = '<svg class="mj-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M27 3A21 21 0 1 0 45 34 19 19 0 0 1 27 3Z" fill="currentColor"/><path d="m37 8 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="currentColor"/></svg>';
  const brand = `${mark}<span class="mj-wordmark"><span lang="th">มูใจ</span><small>MooJai</small></span>`;
  let language='th'; try { const saved=localStorage.getItem('moojai-language-v1');language=(saved||JSON.parse(localStorage.getItem('moojai-world-v1')||'null')?.language)==='en'?'en':'th'; } catch {}
  const text=(en,th)=>language==='th'?th:en;
  const header=document.querySelector('[data-site-header]');
  if(header){
    const active=document.body.dataset.experience;
    header.className='site-header mj-header';
    header.innerHTML=`<a class="brand mj-brand" href="./" aria-label="MooJai home">${brand}</a><nav class="main-nav" id="main-nav" aria-label="Main navigation">${[['home','./','Discover','รู้จักมูใจ'],['reading','reading.html','Readings','คำอ่าน'],['charms','charms.html#collection','My charms','การ์ดของฉัน'],['world','world.html','Pet World','โลกมูใจ']].map(([id,url,en,th])=>`<a href="${url}" ${id===active?'aria-current="page"':''}><span data-en="${en}" data-th="${th}">${en}</span></a>`).join('')}</nav><div class="mj-header-actions header-right"><div class="language-switch" role="group" aria-label="Language"><button type="button" data-locale="th" data-language="th">ไทย</button><span>/</span><button type="button" data-locale="en" data-language="en">EN</button></div>${active==='home'?'<a class="gold-button sticky-start" href="reading.html" hidden><span data-en="Start reading" data-th="เริ่มคำอ่าน">Start reading</span>'+icon('arrow')+'</a>':''}<button type="button" class="menu-toggle" aria-controls="main-nav" aria-expanded="false" aria-label="Menu">${icon('menu')}</button></div>`;
    const paymentConfig=window.MOOJAI_CONFIG;
    if(paymentConfig?.payments?.enabled&&paymentConfig.supabaseUrl&&paymentConfig.supabaseAnonKey){
      const shop=document.createElement('a');shop.href='payment.html';
      shop.innerHTML='<span data-en="Shop" data-th="ร้านค้า">Shop</span>';
      if(active==='payment')shop.setAttribute('aria-current','page');
      header.querySelector('nav').appendChild(shop);
    }
    const toggle=header.querySelector('.menu-toggle');
    const close=()=>{header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');};
    toggle.onclick=()=>{const open=header.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',String(open));};
    header.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&header.classList.contains('menu-open')){close();toggle.focus();}});
    document.addEventListener('click',e=>{if(!header.contains(e.target))close();});
  }
  function apply(){
    document.documentElement.lang=language;
    document.querySelectorAll('[data-en][data-th]').forEach(n=>n.textContent=n.dataset[language]);
    document.querySelectorAll('[data-locale]').forEach(n=>n.setAttribute('aria-pressed',String(n.dataset.locale===language)));
    document.querySelectorAll('[data-icon]').forEach(n=>n.innerHTML=icon(n.dataset.icon));
    document.querySelectorAll('[data-brand]').forEach(n=>n.innerHTML=brand);
  }
  function setLanguage(next){if(!['en','th'].includes(next))return;language=next;try{localStorage.setItem('moojai-language-v1',next);}catch{}apply();document.dispatchEvent(new CustomEvent('moojai:language',{detail:next}));}
  window.MooJaiUI={icon,mark,brand,text,get language(){return language;},setLanguage,apply};
  document.querySelectorAll('[data-locale]').forEach(b=>b.onclick=()=>setLanguage(b.dataset.locale));apply();
  const heroCTA=document.querySelector('.hero-cta'),sticky=document.querySelector('.sticky-start');
  if(heroCTA&&sticky&&'IntersectionObserver' in window){new IntersectionObserver(([entry])=>{sticky.hidden=entry.isIntersecting||entry.boundingClientRect.top>0;},{rootMargin:'-90px 0px 0px 0px'}).observe(heroCTA);}
  // Observe only as an enhancement: no-JS / unsupported browsers retain visible content.
  if('IntersectionObserver' in window&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');observer.unobserve(e.target);} }),{threshold:.08});document.querySelectorAll('[data-reveal]').forEach(n=>{n.classList.add('reveal-ready');observer.observe(n);});}
  // Preserve old shared links after separating the homepage from the collector.
  if(document.body.dataset.experience==='home'&&['#ritual','#deck','#collection'].includes(location.hash))location.replace('charms.html'+location.hash);
})();
