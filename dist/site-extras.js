// MooJai shared extras: optional Supabase accounts and the bug-report button.
// Loaded by index.html (home) and reading.html after config.js. No dependencies.
//
// Accounts use Supabase Auth's REST API directly (email + password), so the site
// keeps zero runtime packages. When config.js has no Supabase values, the account
// button is not shown and no network request is made.
(function () {
  'use strict';
  const config = window.MOOJAI_CONFIG || {};
  const SUPABASE = (config.supabaseUrl || '').replace(/\/+$/, '');
  const ANON = config.supabaseAnonKey || '';
  const accountsEnabled = Boolean(SUPABASE && ANON);
  const SESSION_KEY = 'moojai-auth-v1';
  const recentErrors = [];
  let checkoutAttempt = null, checkoutPending = null;

  window.addEventListener('error', event => {
    recentErrors.push(String(event.message || 'Error').slice(0, 200) + (event.filename ? ` @ ${event.filename.split('/').pop()}:${event.lineno}` : ''));
    if (recentErrors.length > 5) recentErrors.shift();
  });
  window.addEventListener('unhandledrejection', event => {
    recentErrors.push('Unhandled: ' + String(event.reason && event.reason.message || event.reason).slice(0, 200));
    if (recentErrors.length > 5) recentErrors.shift();
  });

  // ---------- language ----------
  const strings = {
    th: {
      account: 'บัญชี', signIn: 'เข้าสู่ระบบ', signUp: 'สมัครสมาชิก', signOut: 'ออกจากระบบ',
      email: 'อีเมล', password: 'รหัสผ่าน', newPassword: 'รหัสผ่านใหม่', confirmPassword: 'ยืนยันรหัสผ่าน',
      passwordHint: 'อย่างน้อย 8 ตัวอักษร', forgot: 'ลืมรหัสผ่าน?', sendReset: 'ส่งลิงก์ตั้งรหัสผ่านใหม่',
      backToSignIn: 'กลับไปเข้าสู่ระบบ', haveAccount: 'มีบัญชีแล้ว?', noAccount: 'ยังไม่มีบัญชี?',
      signInTitle: 'ยินดีต้อนรับกลับ', signUpTitle: 'สร้างบัญชีมูใจ', resetTitle: 'ตั้งรหัสผ่านใหม่', updateTitle: 'ตั้งรหัสผ่านใหม่ของคุณ',
      accountIntro: 'บัญชีใช้เพื่อจดจำการ์ดและสิทธิ์ของคุณในอนาคต วันเกิดยังคงอยู่ในเบราว์เซอร์และไม่ถูกส่งไปพร้อมบัญชี',
      signedInAs: 'เข้าสู่ระบบด้วย', close: 'ปิด', working: 'กำลังดำเนินการ…', savePassword: 'บันทึกรหัสผ่าน',
      checkEmail: 'เราส่งอีเมลยืนยันให้แล้ว กรุณาเปิดลิงก์ในอีเมลเพื่อเปิดใช้บัญชี',
      resetSent: 'หากอีเมลนี้มีบัญชี เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว',
      passwordUpdated: 'บันทึกรหัสผ่านใหม่แล้ว', confirmed: 'ยืนยันอีเมลแล้ว ยินดีต้อนรับสู่มูใจ',
      mismatch: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน', tooShort: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร',
      badEmail: 'กรุณากรอกอีเมลให้ถูกต้อง', badLogin: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      network: 'เชื่อมต่อไม่ได้ กรุณาลองใหม่อีกครั้ง', generic: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
      exists: 'อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ', notConfirmed: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ',
      showPassword: 'แสดงรหัสผ่าน', hidePassword: 'ซ่อนรหัสผ่าน',
      bug: 'แจ้งปัญหา', bugTitle: 'พบปัญหาในเว็บไซต์?', bugIntro: 'เล่าสั้น ๆ ว่าเกิดอะไรขึ้น เราจะใช้ข้อมูลนี้แก้ไขให้ดีขึ้น',
      bugWhat: 'เกิดอะไรขึ้น?', bugWhatPh: 'เช่น กดปุ่มอ่านคำทำนายแล้วไม่มีอะไรเกิดขึ้น',
      bugSteps: 'ก่อนหน้านั้นคุณทำอะไร? (ไม่บังคับ)', bugStepsPh: 'เช่น เลือกเฉพาะวัน แล้วเปลี่ยนภาษาเป็น EN',
      bugContact: 'อีเมลสำหรับติดต่อกลับ (ไม่บังคับ)', bugTech: 'แนบข้อมูลเทคนิค (หน้าเว็บ เบราว์เซอร์ ขนาดจอ) ไม่รวมวันเกิด',
      bugSend: 'ส่งรายงาน', bugGithub: 'เปิดรายงานบน GitHub', bugCopy: 'คัดลอกรายงาน', bugEmail: 'ส่งทางอีเมล',
      bugSent: 'ส่งรายงานแล้ว ขอบคุณที่ช่วยให้มูใจดีขึ้น', bugCopied: 'คัดลอกรายงานแล้ว',
      bugNeedText: 'กรุณาเล่าสั้น ๆ ว่าเกิดอะไรขึ้น', bugFallback: 'ส่งไม่สำเร็จ ลองเปิดบน GitHub หรือคัดลอกรายงานแทน',
      bugPrivacy: 'รายงานไม่รวมวันเกิด เวลาเกิด หรือคำทำนายของคุณ'
    },
    en: {
      account: 'Account', signIn: 'Sign in', signUp: 'Create account', signOut: 'Sign out',
      email: 'Email', password: 'Password', newPassword: 'New password', confirmPassword: 'Confirm password',
      passwordHint: 'At least 8 characters', forgot: 'Forgot password?', sendReset: 'Send reset link',
      backToSignIn: 'Back to sign in', haveAccount: 'Already have an account?', noAccount: 'New to MooJai?',
      signInTitle: 'Welcome back', signUpTitle: 'Create your MooJai account', resetTitle: 'Reset your password', updateTitle: 'Choose a new password',
      accountIntro: 'An account will keep your charms and purchases. Your birth details stay in your browser and are never sent with your account.',
      signedInAs: 'Signed in as', close: 'Close', working: 'Working…', savePassword: 'Save password',
      checkEmail: 'Check your inbox. Open the link we sent to confirm your account.',
      resetSent: 'If that email has an account, a reset link is on its way.',
      passwordUpdated: 'Your new password is saved.', confirmed: 'Email confirmed. Welcome to MooJai.',
      mismatch: 'The passwords do not match.', tooShort: 'Use at least 8 characters.',
      badEmail: 'Enter a valid email address.', badLogin: 'That email or password is incorrect.',
      network: 'Could not connect. Please try again.', generic: 'Something went wrong. Please try again.',
      exists: 'That email already has an account. Try signing in.', notConfirmed: 'Please confirm your email before signing in.',
      showPassword: 'Show password', hidePassword: 'Hide password',
      bug: 'Report a problem', bugTitle: 'Something not working?', bugIntro: 'Tell us briefly what happened and we will use it to fix the site.',
      bugWhat: 'What happened?', bugWhatPh: 'e.g. I pressed Reveal my reading and nothing appeared',
      bugSteps: 'What were you doing just before? (optional)', bugStepsPh: 'e.g. I chose a specific day, then switched to Thai',
      bugContact: 'Email for a reply (optional)', bugTech: 'Include technical details (page, browser, screen size). Never includes birth details.',
      bugSend: 'Send report', bugGithub: 'Open on GitHub', bugCopy: 'Copy report', bugEmail: 'Send by email',
      bugSent: 'Report sent. Thank you for helping improve MooJai.', bugCopied: 'Report copied.',
      bugNeedText: 'Please describe what happened.', bugFallback: 'Could not send. Open it on GitHub or copy the report instead.',
      bugPrivacy: 'Reports never include your birth date, birth time or reading.'
    }
  };
  const lang = () => (document.documentElement.lang || 'en').toLowerCase().startsWith('th') ? 'th' : 'en';
  const t = key => strings[lang()][key] || strings.en[key] || key;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------- session ----------
  let session = null;
  function loadSession() {
    try { session = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { session = null; }
  }
  function saveSession(next) {
    session = next;
    try {
      if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      else localStorage.removeItem(SESSION_KEY);
    } catch { /* storage unavailable: session lives in memory only */ }
    renderAccountButton();
    document.dispatchEvent(new CustomEvent('moojai:auth', { detail: { user: next && next.user || null } }));
  }
  function toSession(data) {
    if (!data || !data.access_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at || Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600),
      user: data.user ? { id: data.user.id, email: data.user.email } : null
    };
  }

  async function authFetch(path, { method = 'POST', body, token } = {}) {
    let response;
    try {
      response = await fetch(SUPABASE + path, {
        method,
        headers: { apikey: ANON, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch { throw new Error(t('network')); }
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    if (!response.ok) {
      const raw = String(data.error_code || data.code || data.msg || data.error_description || data.message || data.error || '');
      let message = t('generic');
      if (/invalid.*(grant|credentials)|invalid_credentials/i.test(raw)) message = t('badLogin');
      else if (/already|user_already_exists|email_exists/i.test(raw)) message = t('exists');
      else if (/not.*confirmed|email_not_confirmed/i.test(raw)) message = t('notConfirmed');
      else if (/weak|password.*(short|length|characters)/i.test(raw)) message = t('tooShort');
      else if (/email.*invalid|validate email|invalid.*email/i.test(raw)) message = t('badEmail');
      const error = new Error(message); error.status = response.status; throw error;
    }
    return data;
  }
  const redirectTo = () => encodeURIComponent(location.origin + location.pathname);

  async function refreshIfNeeded() {
    if (!session) return null;
    if (session.expires_at - 60 > Date.now() / 1000) return session;
    try {
      const data = await authFetch('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: session.refresh_token } });
      saveSession(toSession(data));
    } catch (error) {
      if (error.status && error.status < 500) saveSession(null);
    }
    return session;
  }

  const api = {
    enabled: accountsEnabled,
    get user() { return session && session.user || null; },
    async getAccessToken() { const s = await refreshIfNeeded(); return s && s.access_token || null; },
    async signUp(email, password) {
      const data = await authFetch('/auth/v1/signup?redirect_to=' + redirectTo(), { body: { email, password } });
      const next = toSession(data);
      if (next) saveSession(next);
      return { needsConfirmation: !next };
    },
    async signIn(email, password) {
      const data = await authFetch('/auth/v1/token?grant_type=password', { body: { email, password } });
      saveSession(toSession(data));
    },
    async signOut() {
      const token = session && session.access_token;
      saveSession(null);
      if (token) { try { await authFetch('/auth/v1/logout', { token }); } catch { /* local sign-out already done */ } }
    },
    async resetPassword(email) {
      await authFetch('/auth/v1/recover?redirect_to=' + redirectTo(), { body: { email } });
    },
    async updatePassword(password) {
      const token = await api.getAccessToken();
      await authFetch('/auth/v1/user', { method: 'PUT', token, body: { password } });
    },
    get paymentsEnabled() { return accountsEnabled && config.payments?.enabled === true; },
    async startCheckout(productKey) {
      if (!api.paymentsEnabled || !Object.hasOwn(config.products || {}, productKey)) throw new Error('payments_unavailable');
      if (checkoutPending) return checkoutPending;
      checkoutPending = (async () => {
        const token = await api.getAccessToken();
        if (!token) { openAccount('signin'); return false; }
        if (!checkoutAttempt || checkoutAttempt.product !== productKey || checkoutAttempt.user !== api.user?.id) {
          checkoutAttempt = { product: productKey, user: api.user?.id, requestId: crypto.randomUUID(), language: lang() };
        }
        const data = await paymentRequest('create-checkout', { product: productKey, requestId: checkoutAttempt.requestId, language: checkoutAttempt.language }, token);
        let url; try { url = new URL(data.url); } catch { throw new Error('payment_service_unavailable'); }
        if (url.origin !== 'https://checkout.stripe.com') throw new Error('payment_service_unavailable');
        try { sessionStorage.setItem('moojai-checkout-v1', data.sessionId); } catch {}
        checkoutAttempt = null;
        location.assign(url.href);
        return true;
      })();
      try { return await checkoutPending; } finally { checkoutPending = null; }
    },
    async checkoutStatus(sessionId) {
      const token = await api.getAccessToken();
      if (!token) throw new Error('signin');
      return paymentRequest('checkout-status', { sessionId }, token);
    },
    async entitlements() {
      const token = await api.getAccessToken();
      if (!token) return [];
      const response = await fetch(SUPABASE + '/rest/v1/entitlements?select=product,granted_at', { headers: { apikey: ANON, Authorization: 'Bearer ' + token } });
      return response.ok ? response.json() : [];
    },
    open: mode => openAccount(mode)
  };
  window.MooJaiAccount = api;
  async function paymentRequest(name, body, token) {
    const response = await fetch(SUPABASE + '/functions/v1/' + name, {
      method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'payment_service_unavailable');
    return data;
  }

  // Supabase email links return here with tokens in the URL hash. Consume them
  // before the reading page's own hash router sees them.
  let pendingNotice = null, pendingMode = null;
  function consumeAuthHash() {
    if (!accountsEnabled || !/access_token=|error_description=/.test(location.hash)) return;
    const params = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname + location.search);
    if (params.get('error_description')) { pendingNotice = params.get('error_description'); pendingMode = 'signin'; return; }
    saveSession(toSession({
      access_token: params.get('access_token'), refresh_token: params.get('refresh_token'),
      expires_at: Number(params.get('expires_at')) || undefined, expires_in: params.get('expires_in')
    }));
    if (params.get('type') === 'recovery') pendingMode = 'update';
    else { pendingNotice = 'confirmed'; pendingMode = 'account'; }
  }

  async function loadUser() {
    const s = await refreshIfNeeded();
    if (!s || s.user && s.user.email) return;
    try {
      const user = await authFetch('/auth/v1/user', { method: 'GET', token: s.access_token });
      session.user = { id: user.id, email: user.email };
      saveSession(session);
    } catch { /* keep the token; the email shows once available */ }
  }

  // ---------- UI helpers ----------
  const icons = {
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    bug: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 9h8v6a4 4 0 0 1-8 0Z"/><path d="M9 9V7a3 3 0 0 1 6 0v2M4 13h4M16 13h4M5 7l3 2M19 7l-3 2M5 19l3-2M19 19l-3-2"/></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
  };
  function dialogShell(id, labelId) {
    const dialog = document.createElement('dialog');
    dialog.id = id;
    dialog.className = 'mj-dialog';
    dialog.setAttribute('aria-labelledby', labelId);
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    document.body.appendChild(dialog);
    return dialog;
  }
  function setStatus(form, message, kind) {
    const node = form.querySelector('.mj-status');
    node.textContent = message || '';
    node.dataset.kind = kind || '';
    node.hidden = !message;
  }
  function busy(form, on) {
    form.querySelectorAll('button, input, textarea').forEach(el => { el.disabled = on; });
    const submit = form.querySelector('[type=submit]');
    if (submit) {
      if (on) { submit.dataset.label = submit.textContent; submit.textContent = t('working'); }
      else if (submit.dataset.label) submit.textContent = submit.dataset.label;
    }
  }
  const validEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

  // ---------- account dialog ----------
  let accountButton, accountDialog;
  function renderAccountButton() {
    if (!accountButton) return;
    const user = api.user;
    accountButton.innerHTML = icons.user + `<span>${esc(user ? t('account') : t('signIn'))}</span>`;
    accountButton.setAttribute('aria-label', user ? `${t('account')}: ${user.email || ''}` : t('signIn'));
    accountButton.classList.toggle('is-signed-in', Boolean(user));
  }
  function passwordField(name, label, autocomplete, hint) {
    return `<label class="mj-field"><span>${esc(label)}</span><span class="mj-password"><input name="${name}" type="password" required minlength="8" autocomplete="${autocomplete}"${hint ? ` aria-describedby="${name}-hint"` : ''}><button type="button" class="mj-reveal" aria-label="${esc(t('showPassword'))}" aria-pressed="false">${icons.eye}</button></span>${hint ? `<small id="${name}-hint">${esc(hint)}</small>` : ''}</label>`;
  }
  function openAccount(mode) {
    if (!accountsEnabled) return;
    if (!mode) mode = api.user ? 'account' : 'signin';
    const titles = { signin: 'signInTitle', signup: 'signUpTitle', reset: 'resetTitle', update: 'updateTitle', account: 'account' };
    let body = '';
    if (mode === 'account') {
      body = `<p class="mj-lede">${esc(t('signedInAs'))}</p><p class="mj-email">${esc(api.user && api.user.email || '')}</p>
        <form class="mj-form" data-mode="account" novalidate><p class="mj-status" role="status" hidden></p>
        <button type="button" class="mj-primary" data-action="signout">${esc(t('signOut'))}</button>
        <button type="button" class="mj-link" data-action="update">${esc(t('updateTitle'))}</button></form>`;
    } else if (mode === 'update') {
      body = `<form class="mj-form" data-mode="update" novalidate>${passwordField('password', t('newPassword'), 'new-password', t('passwordHint'))}${passwordField('confirm', t('confirmPassword'), 'new-password')}
        <p class="mj-status" role="status" hidden></p><button type="submit" class="mj-primary">${esc(t('savePassword'))}</button></form>`;
    } else {
      body = `<p class="mj-lede">${esc(t('accountIntro'))}</p><form class="mj-form" data-mode="${mode}" novalidate>
        <label class="mj-field"><span>${esc(t('email'))}</span><input name="email" type="email" required autocomplete="email" inputmode="email" spellcheck="false"></label>
        ${mode === 'reset' ? '' : passwordField('password', t('password'), mode === 'signup' ? 'new-password' : 'current-password', mode === 'signup' ? t('passwordHint') : '')}
        ${mode === 'signup' ? passwordField('confirm', t('confirmPassword'), 'new-password') : ''}
        ${mode === 'signin' ? `<button type="button" class="mj-link mj-forgot" data-action="reset">${esc(t('forgot'))}</button>` : ''}
        <p class="mj-status" role="status" hidden></p>
        <button type="submit" class="mj-primary">${esc(t(mode === 'signin' ? 'signIn' : mode === 'signup' ? 'signUp' : 'sendReset'))}</button>
        <p class="mj-switch">${mode === 'signin' ? `${esc(t('noAccount'))} <button type="button" class="mj-link" data-action="signup">${esc(t('signUp'))}</button>`
          : `${mode === 'signup' ? esc(t('haveAccount')) + ' ' : ''}<button type="button" class="mj-link" data-action="signin">${esc(t(mode === 'signup' ? 'signIn' : 'backToSignIn'))}</button>`}</p></form>`;
    }
    accountDialog.innerHTML = `<button type="button" class="mj-close" aria-label="${esc(t('close'))}">×</button>
      <p class="mj-eyebrow">มูใจ · MooJai</p><h2 id="mj-account-title">${esc(t(titles[mode]))}</h2>${body}`;
    accountDialog.querySelector('.mj-close').addEventListener('click', () => accountDialog.close());
    accountDialog.querySelectorAll('.mj-reveal').forEach(button => button.addEventListener('click', () => {
      const input = button.previousElementSibling, show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', t(show ? 'hidePassword' : 'showPassword'));
    }));
    const form = accountDialog.querySelector('form');
    form.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', async () => {
      const action = button.dataset.action;
      if (action === 'signout') { await api.signOut(); accountDialog.close(); return; }
      openAccount(action);
    }));
    form.addEventListener('submit', event => submitAccount(event, form, mode));
    if (pendingNotice) {
      setStatus(form, pendingNotice === 'confirmed' ? t('confirmed') : pendingNotice, pendingNotice === 'confirmed' ? 'ok' : 'error');
      pendingNotice = null;
    }
    if (!accountDialog.open) accountDialog.showModal();
    const first = accountDialog.querySelector('input');
    if (first) first.focus();
  }
  async function submitAccount(event, form, mode) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const email = String(data.email || '').trim();
    if (mode !== 'update' && !validEmail(email)) return setStatus(form, t('badEmail'), 'error');
    if (mode !== 'reset') {
      if (String(data.password || '').length < 8) return setStatus(form, t('tooShort'), 'error');
      if ('confirm' in data && data.confirm !== data.password) return setStatus(form, t('mismatch'), 'error');
    }
    setStatus(form, '');
    busy(form, true);
    try {
      if (mode === 'signin') { await api.signIn(email, data.password); accountDialog.close(); }
      else if (mode === 'signup') {
        const result = await api.signUp(email, data.password);
        if (result.needsConfirmation) { busy(form, false); form.querySelectorAll('input,[type=submit]').forEach(i => { i.disabled = true; }); setStatus(form, t('checkEmail'), 'ok'); return; }
        accountDialog.close();
      } else if (mode === 'reset') { await api.resetPassword(email); busy(form, false); setStatus(form, t('resetSent'), 'ok'); return; }
      else if (mode === 'update') { await api.updatePassword(data.password); busy(form, false); form.reset(); setStatus(form, t('passwordUpdated'), 'ok'); return; }
    } catch (error) {
      busy(form, false);
      setStatus(form, error.message || t('generic'), 'error');
      return;
    }
    busy(form, false);
  }

  // ---------- bug report ----------
  let bugButton, bugDialog;
  function technicalDetails() {
    return [
      `Page: ${location.origin}${location.pathname}`,
      `Version: ${config.version || 'unknown'}`,
      `Language: ${lang()}`,
      `Viewport: ${innerWidth}×${innerHeight} @${devicePixelRatio || 1}x`,
      `Browser: ${navigator.userAgent}`,
      `Time: ${new Date().toISOString()}`,
      recentErrors.length ? `Recent errors:\n- ${recentErrors.join('\n- ')}` : 'Recent errors: none'
    ].join('\n');
  }
  function composeReport(data) {
    return `What happened:\n${data.what}\n\n` + (data.steps ? `Steps before:\n${data.steps}\n\n` : '') + (data.tech ? `Technical details:\n${technicalDetails()}` : '');
  }
  function openBug() {
    const githubAvailable = Boolean(config.githubRepo);
    bugDialog.innerHTML = `<button type="button" class="mj-close" aria-label="${esc(t('close'))}">×</button>
      <p class="mj-eyebrow">มูใจ · MooJai</p><h2 id="mj-bug-title">${esc(t('bugTitle'))}</h2><p class="mj-lede">${esc(t('bugIntro'))}</p>
      <form class="mj-form" novalidate>
        <label class="mj-field"><span>${esc(t('bugWhat'))}</span><textarea name="what" rows="3" maxlength="2000" required placeholder="${esc(t('bugWhatPh'))}"></textarea></label>
        <label class="mj-field"><span>${esc(t('bugSteps'))}</span><textarea name="steps" rows="2" maxlength="2000" placeholder="${esc(t('bugStepsPh'))}"></textarea></label>
        ${accountsEnabled ? `<label class="mj-field"><span>${esc(t('bugContact'))}</span><input name="contact" type="email" autocomplete="email" value="${esc(api.user && api.user.email || '')}"></label>` : ''}
        <label class="mj-check"><input type="checkbox" name="tech" checked><span>${esc(t('bugTech'))}</span></label>
        <p class="mj-status" role="status" hidden></p>
        <div class="mj-actions">
          ${accountsEnabled ? `<button type="submit" class="mj-primary">${esc(t('bugSend'))}</button>` : ''}
          ${githubAvailable ? `<button type="button" class="${accountsEnabled ? 'mj-secondary' : 'mj-primary'}" data-bug="github">${esc(t('bugGithub'))}</button>` : ''}
          ${config.supportEmail ? `<button type="button" class="mj-secondary" data-bug="email">${esc(t('bugEmail'))}</button>` : ''}
          <button type="button" class="mj-secondary" data-bug="copy">${esc(t('bugCopy'))}</button>
        </div>
        <p class="mj-fineprint">${esc(t('bugPrivacy'))}</p>
      </form>`;
    bugDialog.querySelector('.mj-close').addEventListener('click', () => bugDialog.close());
    const form = bugDialog.querySelector('form');
    const read = () => {
      const fd = new FormData(form);
      return { what: String(fd.get('what') || '').trim(), steps: String(fd.get('steps') || '').trim(), contact: String(fd.get('contact') || '').trim(), tech: fd.get('tech') === 'on' };
    };
    const requireReport = () => { const d = read(); if (!d.what) { setStatus(form, t('bugNeedText'), 'error'); form.querySelector('textarea').focus(); return null; } return d; };
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const d = requireReport(); if (!d) return;
      busy(form, true);
      try {
        const token = await api.getAccessToken();
        const response = await fetch(SUPABASE + '/rest/v1/bug_reports', {
          method: 'POST',
          headers: { apikey: ANON, Authorization: 'Bearer ' + (token || ANON), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ description: d.what, steps: d.steps || null, contact: d.contact || null, page: location.pathname, language: lang(), details: d.tech ? technicalDetails() : null })
        });
        if (!response.ok) throw new Error();
        busy(form, false);
        form.querySelectorAll('textarea,input,[type=submit]').forEach(el => { el.disabled = true; });
        setStatus(form, t('bugSent'), 'ok');
      } catch {
        busy(form, false);
        setStatus(form, t('bugFallback'), 'error');
      }
    });
    form.querySelectorAll('[data-bug]').forEach(button => button.addEventListener('click', async () => {
      const d = requireReport(); if (!d) return;
      const report = composeReport(d);
      const title = `[Bug] ${d.what.replace(/\s+/g, ' ').slice(0, 70)}`;
      if (button.dataset.bug === 'github') {
        const url = `https://github.com/${config.githubRepo}/issues/new?labels=bug&title=${encodeURIComponent(title)}&body=${encodeURIComponent(report.slice(0, 6000))}`;
        window.open(url, '_blank', 'noopener');
      } else if (button.dataset.bug === 'email') {
        location.href = `mailto:${config.supportEmail}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(report.slice(0, 1800))}`;
      } else {
        try { await navigator.clipboard.writeText(report); setStatus(form, t('bugCopied'), 'ok'); }
        catch { const area = form.querySelector('textarea'); area.value = report; area.select(); }
      }
    }));
    bugDialog.showModal();
    form.querySelector('textarea').focus();
  }
  function renderBugButton() {
    if (!bugButton) return;
    bugButton.innerHTML = icons.bug + `<span>${esc(t('bug'))}</span>`;
  }

  // ---------- mount ----------
  function mount() {
    loadSession();
    consumeAuthHash();
    const variant = document.body.dataset.theme === 'dark' || document.querySelector('link[href="collect.css"]') ? 'dark' : 'light';
    document.documentElement.classList.add('mj-' + variant);

    bugButton = document.createElement('button');
    bugButton.type = 'button';
    bugButton.className = 'mj-bug-button';
    bugButton.id = 'bug-report-button';
    bugButton.setAttribute('aria-haspopup', 'dialog');
    bugButton.addEventListener('click', openBug);
    document.body.appendChild(bugButton);
    bugDialog = dialogShell('bug-dialog', 'mj-bug-title');
    renderBugButton();

    if (accountsEnabled) {
      accountButton = document.createElement('button');
      accountButton.type = 'button';
      accountButton.className = 'mj-account-button';
      accountButton.id = 'account-button';
      accountButton.setAttribute('aria-haspopup', 'dialog');
      accountButton.addEventListener('click', () => openAccount());
      const slot = document.querySelector('.header-right') || document.querySelector('.site-header');
      const before = slot.querySelector('.menu-toggle, .header-draw');
      slot.insertBefore(accountButton, before || null);
      accountDialog = dialogShell('account-dialog', 'mj-account-title');
      renderAccountButton();
      loadUser();
      if (pendingMode) openAccount(pendingMode);
      const privacy = document.getElementById('privacy-dialog');
      if (privacy) {
        const note = document.createElement('p');
        note.className = 'mj-privacy-note';
        privacy.querySelector('.primary-button').before(note);
        const update = () => { note.textContent = lang() === 'th'
          ? 'บัญชีเป็นตัวเลือก หากสมัคร Supabase จะเก็บอีเมลและรหัสผ่านแบบเข้ารหัสเพื่อให้คุณเข้าสู่ระบบได้ วันเกิดไม่ถูกส่งไปพร้อมบัญชี'
          : 'Accounts are optional. If you create one, Supabase stores your email and a hashed password so you can sign in. Birth details are never sent with your account.'; };
        update();
        new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
      }
    }

    new MutationObserver(() => { renderBugButton(); renderAccountButton(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
