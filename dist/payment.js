(() => {
  'use strict';
  const account = window.MooJaiAccount, ui = window.MooJaiUI;
  const params = new URLSearchParams(location.search);
  if (['th', 'en'].includes(params.get('lang'))) ui.setLanguage(params.get('lang'));
  const status = document.querySelector('#payment-status'), pay = document.querySelector('#pay-button');
  const retry = document.querySelector('#payment-retry'), back = document.querySelector('#payment-return');
  const messages = {
    ready: ['Choose your payment method on the next page. The total is ฿49.', 'เลือกวิธีชำระเงินในหน้าถัดไป ยอดรวม 49 บาท'],
    unavailable: ['Purchases are not open yet. You can still enjoy the free readings and charm preview.', 'ยังไม่เปิดรับชำระเงิน คุณยังอ่านฟรีและทดลองสะสมการ์ดได้'],
    opening: ['Opening secure checkout…', 'กำลังเปิดหน้าชำระเงิน…'],
    signin: ['Sign in to keep your purchase in your account, then continue.', 'เข้าสู่ระบบเพื่อบันทึกการซื้อไว้ในบัญชี แล้วดำเนินการต่อ'],
    checking: ['Checking your payment…', 'กำลังตรวจสอบการชำระเงิน…'],
    paid: ['Payment received: ฿49. Your purchase is recorded in your account.', 'ได้รับเงิน 49 บาทแล้ว บันทึกการซื้อในบัญชีของคุณแล้ว'],
    processing: ['Your payment is still being confirmed. Please check again before making another payment.', 'กำลังรอยืนยันการชำระเงิน กรุณาตรวจสอบอีกครั้งก่อนชำระซ้ำ'],
    awaiting_payment: ['Payment has not been confirmed. If you have already paid, check again shortly.', 'ยังไม่ได้รับการยืนยัน หากชำระแล้ว กรุณาตรวจสอบอีกครั้งในสักครู่'],
    expired: ['This checkout has expired. Check your banking app before starting another payment.', 'หน้าชำระเงินนี้หมดอายุแล้ว กรุณาตรวจสอบในแอปธนาคารก่อนชำระใหม่'],
    failed: ['The payment could not be completed. Check your banking app before trying again.', 'การชำระเงินไม่สำเร็จ กรุณาตรวจสอบในแอปธนาคารก่อนลองใหม่'],
    cancelled: ['Checkout was closed. If you paid, check your payment before starting again.', 'ปิดหน้าชำระเงินแล้ว หากชำระแล้ว กรุณาตรวจสอบรายการก่อนเริ่มใหม่'],
    error: ['We could not verify this payment. Try checking again; please do not pay twice.', 'ยังตรวจสอบการชำระเงินไม่ได้ กรุณาตรวจสอบอีกครั้ง และอย่าชำระซ้ำ'],
    checkoutError: ['Checkout could not open. Please try again.', 'เปิดหน้าชำระเงินไม่ได้ กรุณาลองอีกครั้ง']
  };
  let state = '', sessionId = params.get('session_id'), busy = false, polls = 0, timer;
  if (!sessionId && params.get('checkout') === 'cancelled') {
    try { sessionId = sessionStorage.getItem('moojai-checkout-v1'); } catch {}
  }
  function show(next) {
    state = next; status.dataset.state = next;
    status.textContent = messages[next][ui.language === 'th' ? 1 : 0];
    pay.hidden = Boolean(params.get('checkout') === 'success' || sessionId || next === 'paid');
    pay.disabled = busy || !account.paymentsEnabled;
    retry.hidden = !sessionId || !['signin', 'error', 'processing', 'awaiting_payment', 'expired', 'failed'].includes(next);
    retry.textContent = next === 'signin' ? ui.text('Sign in to check', 'เข้าสู่ระบบเพื่อตรวจสอบ') : ui.text('Check payment again', 'ตรวจสอบการชำระเงินอีกครั้ง');
    retry.disabled = busy; back.hidden = next !== 'paid';
  }
  async function check() {
    if (busy) return;
    clearTimeout(timer);
    if (!account.enabled) { show('unavailable'); return; }
    if (!account.user) { show('signin'); return; }
    const checkingUser = account.user.id;
    busy = true; show('checking');
    try {
      const result = await account.checkoutStatus(sessionId);
      if (account.user?.id !== checkingUser) throw new Error('signin');
      if (!['paid', 'processing', 'awaiting_payment', 'expired', 'failed'].includes(result.state)) throw new Error('invalid_status');
      busy = false; show(result.state);
      if (result.state === 'paid') { try { sessionStorage.removeItem('moojai-checkout-v1'); } catch {} }
      if (['processing', 'awaiting_payment'].includes(result.state) && ++polls < 6) timer = setTimeout(check, 3000);
    } catch (error) { busy = false; show(error.message === 'signin' ? 'signin' : 'error'); }
  }
  pay.onclick = async () => {
    if (busy) return;
    busy = true; show('opening');
    try { const opened = await account.startCheckout('cardWallpaper'); if (!opened) { busy = false; show('signin'); } }
    catch (error) { busy = false; show(error.message === 'signin' ? 'signin' : 'checkoutError'); if (error.message === 'signin') account.open('signin'); }
  };
  retry.onclick = () => { if (state === 'signin' || !account.user) account.open('signin'); else { polls = 0; check(); } };
  document.addEventListener('moojai:auth', () => { if (sessionId) check(); else if (!busy) show(account.paymentsEnabled ? 'ready' : 'unavailable'); });
  document.addEventListener('moojai:language', () => show(state));
  window.addEventListener('pagehide', () => clearTimeout(timer));
  // The word "success" in a URL is never sufficient to show a paid receipt.
  if (sessionId) check();
  else if (params.get('checkout') === 'success') show('error');
  else if (!account.paymentsEnabled) show('unavailable');
  else show(params.get('checkout') === 'cancelled' ? 'cancelled' : 'ready');
})();
