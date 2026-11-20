(() => {
  'use strict';
  const account = window.MooJaiAccount, ui = window.MooJaiUI;
  const params = new URLSearchParams(location.search);
  if (['th', 'en'].includes(params.get('lang'))) ui.setLanguage(params.get('lang'));
  const status = document.querySelector('#payment-status'), pay = document.querySelector('#pay-button');
  const retry = document.querySelector('#payment-retry'), back = document.querySelector('#payment-return');
  const selector=document.querySelector('#bundle-card'),bundleImage=document.querySelector('#bundle-image');
  const choices=[...selector.options].map(option=>option.value);
  if(choices.includes(params.get('card')))selector.value=params.get('card');
  const selectedImage=()=>{bundleImage.src=`assets/cards/${selector.value}.webp`;bundleImage.alt=selector.selectedOptions[0].textContent;};
  selector.onchange=selectedImage;selectedImage();
  const messages = {
    ready: ['Choose your payment method on the next page. The total is ฿49.', 'เลือกวิธีชำระเงินในหน้าถัดไป ยอดรวม 49 บาท'],
    unavailable: ['Purchases are not open yet. You can still enjoy the free readings and charm preview.', 'ยังไม่เปิดรับชำระเงิน คุณยังอ่านฟรีและทดลองสะสมการ์ดได้'],
    opening: ['Opening secure checkout…', 'กำลังเปิดหน้าชำระเงิน…'],
    signin: ['Sign in to keep your purchase in your account, then continue.', 'เข้าสู่ระบบเพื่อบันทึกการซื้อไว้ในบัญชี แล้วดำเนินการต่อ'],
    checking: ['Checking your payment…', 'กำลังตรวจสอบการชำระเงิน…'],
    paid: ['Payment received: ฿49. Your card is in your collection. Download your files below.', 'ได้รับเงิน 49 บาทแล้ว การ์ดอยู่ในคลังของคุณ ดาวน์โหลดไฟล์ได้ด้านล่าง'],
    refunded: ['This purchase has been refunded. Its downloads are no longer available.', 'รายการนี้ได้รับเงินคืนแล้ว จึงไม่สามารถดาวน์โหลดไฟล์ได้'],
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
    selector.disabled=busy||Boolean(sessionId);
    document.querySelector('#paid-downloads').hidden=next!=='paid';
    document.querySelectorAll('.payment-methods,.payment-help').forEach(el=>el.hidden=['paid','refunded'].includes(next));
    document.querySelector('#payment-title').textContent=next==='paid'?ui.text('Your card is ready.','การ์ดของคุณพร้อมแล้ว'):ui.text('A little magic to keep.','เก็บความพิเศษไว้กับคุณ');
    document.querySelector('label[for=bundle-card]').textContent=next==='paid'?ui.text('Your Growth card','การ์ดหมวดเติบโตของคุณ'):ui.text('Choose your Growth card','เลือกการ์ดหมวดเติบโต');
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
      if (!['paid', 'processing', 'awaiting_payment', 'expired', 'failed','refunded'].includes(result.state)) throw new Error('invalid_status');
      busy = false; show(result.state);
      if (result.state === 'paid') {
        if(choices.includes(result.cardId)){selector.value=result.cardId;selectedImage();}
        renderDownloads(document.querySelector('#paid-downloads'),sessionId);
        try { sessionStorage.removeItem('moojai-checkout-v1');localStorage.setItem('moojai-collection-update-v1',JSON.stringify({userId:account.user.id,at:Date.now()})); } catch {}
        loadPurchases();
      }
      if (['processing', 'awaiting_payment'].includes(result.state) && ++polls < 6) timer = setTimeout(check, 3000);
    } catch (error) { busy = false; show(error.message === 'signin' ? 'signin' : 'error'); }
  }
  pay.onclick = async () => {
    if (busy) return;
    busy = true; show('opening');
    try { const opened = await account.startCheckout('cardWallpaper',selector.value); if (!opened) { busy = false; show('signin'); } }
    catch (error) { busy = false; show(error.message === 'signin' ? 'signin' : 'checkoutError'); if (error.message === 'signin') account.open('signin'); }
  };
  retry.onclick = () => { if (state === 'signin' || !account.user) account.open('signin'); else { polls = 0; check(); } };
  function renderDownloads(container,id){
    container.replaceChildren();
    for(const kind of ['card','wallpaper']){
      const button=document.createElement('button');button.type='button';button.className='outline-button';
      button.textContent=kind==='card'?ui.text('Download card','ดาวน์โหลดการ์ด'):ui.text('Download wallpaper','ดาวน์โหลดวอลเปเปอร์');
      button.onclick=async()=>{button.disabled=true;container.querySelector('.purchase-download-error')?.remove();try{await account.downloadPurchase(id,kind);}catch{const note=document.createElement('p');note.className='purchase-download-error';note.setAttribute('role','status');note.textContent=ui.text('Could not download. Sign in and try again.','ดาวน์โหลดไม่ได้ กรุณาเข้าสู่ระบบแล้วลองใหม่');container.append(note);}finally{button.disabled=false;}};
      container.append(button);
    }
  }
  async function loadPurchases(){
    const panel=document.querySelector('#purchase-history'),list=document.querySelector('#purchase-list');
    if(!account.enabled||!account.user){panel.hidden=true;list.replaceChildren();return;}
    const uid=account.user.id;
    try{const rows=(await account.purchases()).filter(row=>choices.includes(row.card_id)&&!(state==='paid'&&row.stripe_session_id===sessionId));if(account.user?.id!==uid)return;list.replaceChildren();panel.hidden=!rows.length;
      for(const row of rows){if(!choices.includes(row.card_id))continue;const item=document.createElement('div');item.className='purchase-row';const title=document.createElement('p');title.textContent=[...selector.options].find(o=>o.value===row.card_id).textContent+' · ฿49';item.append(title);const buttons=document.createElement('div');renderDownloads(buttons,row.stripe_session_id);item.append(buttons);list.append(item);}
    }catch{panel.hidden=true;}
  }
  document.addEventListener('moojai:auth', () => { if (sessionId) check(); else if (!busy) show(account.paymentsEnabled ? 'ready' : 'unavailable');loadPurchases(); });
  document.addEventListener('moojai:language', () => {show(state);selectedImage();if(state==='paid')renderDownloads(document.querySelector('#paid-downloads'),sessionId);loadPurchases();});
  window.addEventListener('pagehide', () => clearTimeout(timer));
  // The word "success" in a URL is never sufficient to show a paid receipt.
  if (sessionId) check();
  else if (params.get('checkout') === 'success') show('error');
  else if (!account.paymentsEnabled) show('unavailable');
  else show(params.get('checkout') === 'cancelled' ? 'cancelled' : 'ready');
  loadPurchases();
})();
