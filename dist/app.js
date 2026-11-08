(() => {
  'use strict';
  const lib=globalThis.FortuneLibrary,engine=globalThis.FortuneEngine;
  const app=document.querySelector('.app'),form=document.getElementById('birth-form');
  const fields=form.elements;
  let language='th',page='reading',category='cores',reading=null,submittedProfile=null,weeklyChoice='this';
  const i18n={
    th:{local:'เฉพาะเครื่องนี้',navReading:'อ่านคำทำนาย',navLibrary:'คลังเรื่องราว',navPlan:'แผนและกติกา',eyebrow:'ต้นแบบคำทำนาย · ฉบับภาษาไทย',headline:'ดวงของคุณ ในจังหวะนี้',intro:'ภาพรวมหนึ่งเรื่อง พร้อมคำอ่านด้านการงาน ความรัก โอกาส และสิ่งที่ควรระวัง',profileHeading:'เริ่มจากวันเกิดของคุณ',exampleLabel:'ข้อมูลตัวอย่าง · แก้ไขได้',birthDate:'วันเดือนปีเกิด',calendarHint:'กรอกปีคริสต์ศักราช (ค.ศ.)',timeMode:'ข้อมูลเวลาเกิด',exact:'ทราบเวลา',approximate:'ทราบเพียงช่วงเวลา',unknown:'ไม่ทราบเวลา',birthTime:'เวลาเกิดตามนาฬิกาท้องถิ่น',timeWindow:'ช่วงเวลาโดยประมาณ',readingDate:'วันที่อยากดูคำอ่าน',weekHint:'คำอ่านเดียวกันตลอดสัปดาห์ จันทร์–อาทิตย์',readButton:'เปิดคำทำนาย',privacy:'ข้อมูลอยู่ในหน้านี้ ไม่บันทึกวันเกิดและไม่ส่งออกไปยังบริการภายนอก',scope:'กติกาทดลองสำหรับทดสอบเนื้อหา ยังไม่ใช่การผูกดวงโหราศาสตร์ไทย',libraryEyebrow:'ต้นฉบับทุกบท · ไทย / ENGLISH',libraryHeading:'คลังเรื่องราวที่นำมาประกอบกัน',libraryIntro:'อ่านครบทั้ง 52 ชุดตัวอย่าง หรือแยกดูบทเฉพาะด้านที่ใช้สลับกันได้',searchLabel:'ค้นหาชื่อ เนื้อหา หรือรหัส',phaseFilter:'ทิศทางของเรื่อง',allPhases:'ทุกทิศทาง',catalogue:'อ่าน / พิมพ์ฉบับสองภาษา',expandAll:'เปิดทุกบทในหน้านี้',downloadLibrary:'ดาวน์โหลดคลังเรื่อง JSON',work:'การงาน',love:'ความรัก',luck:'โชคและโอกาส',caution:'สิ่งที่ควรระวัง',cores:'ภาพรวม',weekdays:'ข้อคิดตามวัน',timeBands:'ข้อคิดตามเวลา',stale:'ข้อมูลเปลี่ยนแล้ว — กดเปิดคำทำนายเพื่อใช้ข้อมูลใหม่',ready:'คำอ่านสำหรับสัปดาห์',unknownNote:'ไม่เดาเวลาเกิด ระบบจะเว้นรายละเอียดจากช่วงเวลา',knownNote:'เดโมใช้ช่วงละ 4 ชั่วโมง ยังไม่ใช้ตำแหน่งดาวหรือความละเอียดระดับนาที',saved:'บันทึกคำอ่านเป็นข้อความ',print:'พิมพ์คำอ่าน',method:'ดูวิธีประกอบคำอ่าน',nuance:'ข้อคิดประกอบเฉพาะโปรไฟล์',nuanceNote:'ข้อความประกอบแต่งขึ้นสำหรับเดโม ไม่ใช่คุณสมบัติที่ยืนยันจากวันหรือเวลาเกิด',birthBand:'ช่วงวันเกิด',coreId:'แกนเรื่อง',unknownLabel:'ไม่ทราบเวลาเกิด',readingDraft:'ต้นฉบับเพื่อทดลองประสบการณ์ ยังไม่ผ่านการตรวจรับรองวิธีคำนวณโดยผู้เชี่ยวชาญโหราศาสตร์ไทย',count:'บท',of:'จาก',exampleTopics:'ตัวอย่างบทประกอบที่เข้ากับภาพรวมนี้',noResults:'ไม่พบเรื่องที่ตรงกับคำค้น ลองเปลี่ยนคำหรือเลือกทุกทิศทาง',errors:{INVALID_DATE:'กรุณาตรวจสอบวันเดือนปีให้ถูกต้อง',FUTURE_BIRTH_DATE:'วันเกิดต้องไม่อยู่ในอนาคต',READING_BEFORE_BIRTH:'วันที่อ่านต้องไม่อยู่ก่อนวันเกิด',INVALID_TIME:'กรุณากรอกเวลาเกิดให้ถูกต้อง',INVALID_TIME_WINDOW:'กรุณาเลือกช่วงเวลาเกิด',DEFAULT:'ไม่สามารถสร้างคำอ่านได้ กรุณาตรวจสอบข้อมูลอีกครั้ง'}},
    en:{local:'On this laptop',navReading:'Your reading',navLibrary:'Story library',navPlan:'Plan & rules',eyebrow:'FORTUNE CONTENT DEMO · THAI EDITION',headline:'Your next chapter.',intro:'One overall direction, with separate readings for work, love, opportunity and what to watch.',profileHeading:'Begin with your birth details',exampleLabel:'Example profile · editable',birthDate:'Date of birth',calendarHint:'Use a Common Era (CE) year',timeMode:'What birth time do you know?',exact:'Exact clock time',approximate:'Approximate window',unknown:'Time unknown',birthTime:'Local clock time at birth',timeWindow:'Approximate time window',readingDate:'Date of the reading',weekHint:'One consistent reading, Monday to Sunday',readButton:'Reveal my reading',privacy:'Birth details stay on this page. They are not stored or sent to external services.',scope:'An editorial selection demo. Traditional Thai chart calculations are not connected.',libraryEyebrow:'EVERY PASSAGE · THAI / ENGLISH',libraryHeading:'A library designed to combine.',libraryIntro:'Browse all 52 complete example readings, or inspect each reusable topic passage.',searchLabel:'Search a title, passage or ID',phaseFilter:'Overall condition',allPhases:'All conditions',catalogue:'Read / print bilingual catalogue',expandAll:'Expand every visible entry',downloadLibrary:'Download story library JSON',work:'Work',love:'Love',luck:'Luck & opportunity',caution:'What to watch',cores:'Overall',weekdays:'Weekday notes',timeBands:'Time notes',stale:'Details changed — reveal again to use the new profile.',ready:'Your reading for',unknownNote:'No birth time is invented. Time-specific interpretation is omitted.',knownNote:'The demo uses four-hour windows, without planetary positions or minute-level claims.',saved:'Save reading as text',print:'Print reading',method:'How this reading was assembled',nuance:'A reflection for this profile',nuanceNote:'These are original demo prompts, not verified traits associated with a birthday or birth time.',birthBand:'Birthday band',coreId:'Core story',unknownLabel:'Birth time unknown',readingDraft:'Editorial draft for testing. A Thai practitioner has not yet reviewed or validated the calculation method.',count:'entries',of:'of',exampleTopics:'Compatible example topic passages',noResults:'No matching passages. Try another search or all conditions.',errors:{INVALID_DATE:'Check that the date is valid.',FUTURE_BIRTH_DATE:'A birth date cannot be in the future.',READING_BEFORE_BIRTH:'The reading date must not be before the birth date.',INVALID_TIME:'Enter a valid birth time.',INVALID_TIME_WINDOW:'Choose a valid birth-time window.',DEFAULT:'The reading could not be assembled. Please check the inputs.'}}
  };
  const t=key=>i18n[language][key];
  i18n.th.dateLimitHint='เลือกได้ตั้งแต่วันนี้เป็นต้นไป';
  i18n.en.dateLimitHint='Choose today or a future date.';
  i18n.th.errors.PAST_READING_DATE='กรุณาเลือกวันนี้หรือวันในอนาคต ไม่สามารถดูคำอ่านย้อนหลังได้';
  i18n.en.errors.PAST_READING_DATE='Choose today or a future date. Past readings are not available.';
  Object.assign(i18n.th,{
    readingMode:'อยากดูดวงแบบไหน?',weekMode:'ภาพรวมสัปดาห์',dayMode:'เจาะจงวัน',weekModeHint:'มองจังหวะข้างหน้า',dayModeHint:'เตรียมใจให้วันสำคัญ',thisWeek:'สัปดาห์นี้',nextWeek:'สัปดาห์หน้า',
    weekDate:'เลือกวันในสัปดาห์ที่อยากดู',dayDate:'วันที่อยากดูคำทำนาย',weekPeriodNote:'นับสัปดาห์จันทร์–อาทิตย์ หากเลือกสัปดาห์นี้ จะอ่านเฉพาะวันนี้เป็นต้นไป',dayPeriodNote:'คำอ่านสำหรับวันที่เลือก พร้อมคำแนะนำให้เข้ากับเรื่องของคุณ',
    occasionLabel:'วันนั้นมีเรื่องอะไรในใจ?',supportLabel:'อยากได้คำแนะนำด้านไหนเป็นพิเศษ?',contextHint:'เลือกได้ตามใจ เพื่อปรับคำแนะนำให้เข้ากับสิ่งที่คุณกำลังเตรียมตัว',
    weekReady:'ภาพรวมสัปดาห์',dayReady:'คำอ่านประจำวันที่',weekTheme:'ธีมประจำสัปดาห์',weekGuidance:'ตั้งหลักสำหรับสัปดาห์ที่เลือก',dayGuidance:'มุมมองสำหรับวันของคุณ',goalLabel:'สิ่งที่ตั้งใจได้',watchLabel:'สิ่งที่ควรเผื่อใจ',planLabel:'หนึ่งก้าวที่ทำได้',
    contextSource:'คำแนะนำส่วนนี้ปรับตามเรื่องและสิ่งที่คุณเลือก ไม่ได้ใช้ทำนายผลสัมภาษณ์หรือความรู้สึกของอีกฝ่าย',
    methodModes:'ภาพรวมใช้ธีมเดียวกันตลอดสัปดาห์ โหมดเจาะจงวันใช้วันที่เลือกช่วยเลือกบทเฉพาะด้าน ภายในธีมเดิม การเลือกเรื่องหรือคำแนะนำจะปรับเฉพาะส่วนเตรียมตัว ไม่เปลี่ยนผลไพ่ กติกานี้เป็นงานเขียนสำหรับเดโม',
    periodSelected:'ช่วงที่อ่าน',expired:'วันเปลี่ยนแล้ว — เลือกวันนี้หรือวันข้างหน้า แล้วเปิดคำทำนายอีกครั้ง'
  });
  Object.assign(i18n.th,{customWeek:'เลือกสัปดาห์เอง',customWeekHint:'สำหรับสัปดาห์อื่นในอนาคต',paidLock:'ล็อก · ชำระเงิน',paidFeature:'คำอ่านแบบชำระเงิน',customWeekTitle:'ปลดล็อกคำอ่านเฉพาะสัปดาห์',customWeekDescription:'เลือกสัปดาห์ในอนาคตที่สำคัญกับคุณ พร้อมภาพรวมการงาน ความรัก โอกาส และสิ่งที่ควรระวัง',paymentUnavailable:'เดโมนี้ยังไม่เปิดให้ชำระเงิน ฟีเจอร์นี้จึงยังล็อกอยู่ คุณอ่านสัปดาห์นี้และสัปดาห์หน้าได้ฟรี',backToFree:'กลับไปอ่านฟรี'});
  Object.assign(i18n.en,{
    readingMode:'How would you like to look ahead?',weekMode:'Weekly outlook',dayMode:'A specific day',weekModeHint:'See the bigger picture',dayModeHint:'Prepare for a day that matters',thisWeek:'This week',nextWeek:'Next week',
    weekDate:'Choose a day in the week',dayDate:'Date you want to explore',weekPeriodNote:'Weeks run Monday–Sunday. For this week, the outlook covers today onwards.',dayPeriodNote:'A reading for your chosen day, with guidance for the occasion.',
    occasionLabel:'What is on your mind that day?',supportLabel:'What would help you most?',contextHint:'Choose what feels useful. Your choices shape the preparation advice.',
    weekReady:'Weekly outlook',dayReady:'Reading for',weekTheme:'Theme of the week',weekGuidance:'Your focus for the week',dayGuidance:'A perspective for your day',goalLabel:'A useful intention',watchLabel:'What to keep in mind',planLabel:'One step you can take',
    contextSource:'This advice reflects your choices. It does not predict a hiring decision or another person’s feelings.',
    methodModes:'Both modes share a weekly theme. The specific-day mode uses the chosen date to select topic passages within that theme. Occasion and support choices adjust preparation advice without rerolling the cards. These are editorial demo rules.',
    periodSelected:'Reading period',expired:'The day has changed — choose today or a future date and reveal your reading again.'
  });
  Object.assign(i18n.en,{customWeek:'Choose a week',customWeekHint:'For another future week',paidLock:'Locked · Paid',paidFeature:'PAID READING',customWeekTitle:'Unlock a specific week',customWeekDescription:'Choose a future week that matters to you, with an overview of work, love, opportunity and what to watch.',paymentUnavailable:'Purchasing is not available in this demo yet, so this feature stays locked. This week and next week are free.',backToFree:'Back to free readings'});
  Object.assign(i18n.th,{
    navReading:'คำทำนาย',navPlan:'วิธีการอ่าน',heroEyebrow:'พื้นที่เล็ก ๆ สำหรับทบทวนใจ',heroTitle:'ดวงของคุณ',heroTitleSecond:'ในจังหวะนี้',heroDescription:'คำอ่านเรื่องงาน ความรัก และโอกาส พร้อมก้าวต่อไปที่คุณเลือกได้',symbolicArt:'ภาพประกอบเชิงสัญลักษณ์',startFree:'เริ่มอ่านฟรี',sampleReading:'ดูตัวอย่างคำอ่าน',noSignup:'ไม่ต้องสมัครสมาชิก · ไม่ต้องใช้บัตร',profileHeading:'เริ่มคำอ่านของคุณ',profileIntro:'เริ่มต้นด้วยวันและเวลาเกิดของคุณ',birthDate:'วันเกิด',timeMode:'เวลาเกิด',calendarHint:'ใช้ปีคริสต์ศักราช (ค.ศ.)',weekMode:'รายสัปดาห์',dayMode:'เฉพาะวัน',readButton:'อ่านคำทำนาย',customWeek:'เลือกสัปดาห์อื่น',comingSoon:'เร็ว ๆ นี้',free:'ฟรี',freeNoSignup:'ฟรี · ไม่ต้องสมัครสมาชิก',opportunity:'โอกาส',footerNote:'เพื่อการสะท้อนใจและความบันเทิง',privacyLink:'ข้อมูลและความเป็นส่วนตัว',close:'ปิด',skipToForm:'ข้ามไปที่แบบฟอร์ม',downloadLibrary:'คลังเรื่อง JSON',privacy:'วันเกิดอยู่ในเบราว์เซอร์ของคุณ ไม่บันทึกหรือส่งไปยังเซิร์ฟเวอร์',privacyDetails:'วันเกิดและเวลาเกิดใช้สร้างคำอ่านในเบราว์เซอร์เท่านั้น ไม่มีบัญชีผู้ใช้ คุกกี้ติดตาม หรือการบันทึกโปรไฟล์ เมื่อโหลดหน้าใหม่ข้อมูลจะหายไป การบันทึกคำอ่านเป็นการดาวน์โหลดลงอุปกรณ์ของคุณ GitHub Pages เป็นผู้ให้บริการเว็บไซต์และอาจเก็บข้อมูลคำขอทั่วไป เช่น IP ตามนโยบายของ GitHub แต่แอปไม่ส่งวันเกิดหรือเวลาเกิดไปด้วย',customWeekTitle:'คำอ่านเฉพาะสัปดาห์'
  });
  Object.assign(i18n.en,{
    navReading:'Your reading',navPlan:'How it works',heroEyebrow:'A little space to reflect',heroTitle:'Your next chapter.',heroTitleSecond:'At your own pace.',heroDescription:'A perspective on work, love and opportunity. A next step that is yours to choose.',symbolicArt:'Symbolic illustration',startFree:'Start a free reading',sampleReading:'See a sample reading',noSignup:'No account. No card required.',profileHeading:'Begin your reading',profileIntro:'Start with your birth date and time.',birthDate:'Date of birth',timeMode:'Birth time',calendarHint:'Use a Common Era (CE) year',weekMode:'Weekly',dayMode:'A specific day',readButton:'Reveal my reading',customWeek:'Choose another week',comingSoon:'Coming soon',free:'Free',freeNoSignup:'Free · No account needed',opportunity:'Opportunity',footerNote:'For reflection and entertainment',privacyLink:'About your privacy',close:'Close',skipToForm:'Skip to reading form',downloadLibrary:'Story library JSON',privacy:'Your birth details stay in your browser. They are not saved or sent to a server.',privacyDetails:'Your birth date and time are used only in your browser. There are no accounts, tracking cookies or saved profiles. Reloading clears your details. Saving a reading explicitly downloads a file to your device. GitHub Pages hosts this site and may record ordinary request data, such as IP addresses, under GitHub’s privacy policy; the app does not send your birth date or time with these requests.',customWeekTitle:'A reading for a specific week'
  });
  i18n.th.errors.CUSTOM_WEEK_LOCKED='คำอ่านสัปดาห์อื่นต้องปลดล็อกด้วยการชำระเงิน กรุณาเลือกสัปดาห์นี้หรือสัปดาห์หน้า';
  i18n.en.errors.CUSTOM_WEEK_LOCKED='Other weekly readings require a paid unlock. Choose this week or next week.';
  for(const locale of ['th','en'])for(const code of ['INVALID_READING_MODE','INVALID_OCCASION','INVALID_SUPPORT'])i18n[locale].errors[code]=i18n[locale].errors.DEFAULT;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const txt=entry=>entry[language];
  const phaseLabel=phase=>lib.phases.find(item=>item.id===phase)?.[language]||'';
  const dateLabel=iso=>new Intl.DateTimeFormat(language==='th'?'th-TH':'en-GB',{day:'numeric',month:'short',year:'numeric',calendar:'gregory',timeZone:'UTC'}).format(engine.parseDate(iso));
  const rangeLabel=number=>{const range=engine.bandRange(number);const fmt=value=>new Intl.DateTimeFormat(language==='th'?'th-TH':'en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(engine.parseDate('2001-'+value));return fmt(range.start)+' – '+fmt(range.end);};
  function profile(){const day=fields.readingMode.value==='day';return {birthDate:fields.birthDate.value,birthTime:fields.birthTime.value,timeMode:fields.timeMode.value,timeWindow:fields.timeWindow.value,readingDate:day?fields.readingDate.value:shortcutDate(weeklyChoice),readingMode:fields.readingMode.value,occasion:day?fields.occasion.value:'general',support:day?fields.support.value:'balanced'};}
  function periodLabel(result){return result.mode==='day'?`${t('dayReady')} ${dateLabel(result.readingDate)}`:`${t('weekReady')} · ${dateLabel(result.periodStart)} – ${dateLabel(result.periodEnd)}`;}
  function guidanceHTML(){
    const g=reading.guidance;
    return `<section class="guidance-panel" aria-labelledby="guidance-title"><p class="eyebrow">${t(reading.mode==='day'?'dayGuidance':'weekGuidance')}</p><h3 id="guidance-title">${esc(txt(g.title))}</h3>${g.outlook?`<p class="context-outlook">${esc(txt(g.outlook))}</p>`:''}<dl>${[['goal','goalLabel'],['watch','watchLabel'],['plan','planLabel']].map(([key,label])=>`<div><dt>${t(label)}</dt><dd>${esc(txt(g[key]))}</dd></div>`).join('')}</dl>${reading.mode==='day'?`<small>${t('contextSource')}</small>`:''}</section>`;
  }
  function domainHTML(domain,item){return `<section class="domain-section"><div class="domain-heading"><h3>${t(domain)}</h3><span class="record-id">${item.id}</span></div><h4 class="domain-title">${esc(txt(item.title))}</h4><p>${esc(txt(item.text))}</p></section>`;}
  function timeInfoLabel(){return reading.timeBand.index===6?t('unknownLabel'):`${txt(reading.timeBand.title)} · ${t(reading.timeMode)}`;}
  function renderReading(animate=false){
    if(!reading) return;
    document.getElementById('results').hidden=false;
    const {core,parts}=reading;
    const timeInfo=timeInfoLabel();
    document.getElementById('reading-status').className='reading-status';
    document.getElementById('reading-status').textContent=periodLabel(reading);
    document.getElementById('reading-result').innerHTML=`
      <p class="result-period">${esc(periodLabel(reading))}</p>
      <div class="reading-cover${animate?' just-read':''}"><div class="number-card" aria-label="${t('coreId')} ${core.number}"><span class="card-kicker">CELESTIAL</span><span class="card-number">${String(core.number).padStart(2,'0')}</span><span class="card-bottom">${phaseLabel(core.phase)}<br>${core.id}</span></div><div class="cover-copy"><span class="phase-label">${t('weekTheme')} · ${phaseLabel(core.phase)} · ${esc(txt(core.themeTitle))}</span><h2>${esc(txt(core.title))}</h2><p class="fortune-text">${esc(txt(core.text))}</p><p class="reading-period">${dateLabel(submittedProfile.birthDate)} · ${esc(txt(reading.weekday.title))}<br>${esc(timeInfo)}</p></div></div>
      ${guidanceHTML()}
      <div class="domain-grid">${Object.entries(parts).map(([domain,item])=>domainHTML(domain,item)).join('')}</div>
      <div class="nuance-panel"><h3>${t('nuance')}</h3><p>${esc(txt(reading.weekday.text))}</p>${reading.timeBand.index===6?'':`<p>${esc(txt(reading.timeBand.text))}</p>`}<small>${reading.timeBand.index===6?t('unknownNote'):t('nuanceNote')}</small></div>
      <div class="result-actions"><button class="secondary-button" type="button" id="save-reading">${t('saved')}</button><button class="text-button" type="button" id="print-reading">${t('print')}</button></div>
      <details class="method-details"><summary>${t('method')}</summary><p>${t('birthBand')} ${reading.birthBand} (${rangeLabel(reading.birthBand)}) → ${t('coreId')} ${core.id}<br>${Object.entries(parts).map(([domain,item])=>`${t(domain)}: ${item.id}`).join(' · ')}<br><code>${reading.weekStart} · ${reading.mode} · ${reading.weekday.id} · ${reading.timeBand.id} · ${reading.contentVersion} · ${reading.guidanceVersion}</code></p><p>${t('methodModes')}</p></details>
      <p class="reading-disclaimer">${t('readingDraft')}</p>`;
    document.getElementById('save-reading').addEventListener('click',downloadReading);
    document.getElementById('print-reading').addEventListener('click',()=>window.print());
  }
  function downloadReading(){
    const lines=[`CELESTIAL CROSSINGS · ${reading.contentVersion}`,periodLabel(reading),`${dateLabel(submittedProfile.birthDate)} · ${txt(reading.weekday.title)} · ${timeInfoLabel()}`];
    if(reading.timeBand.index===6)lines.push(t('unknownNote'));
    lines.push('',`${t('weekTheme')}: ${reading.core.id} — ${txt(reading.core.title)}`,txt(reading.core.text),'',txt(reading.guidance.title));
    if(reading.guidance.outlook)lines.push(txt(reading.guidance.outlook));
    for(const [key,label] of [['goal','goalLabel'],['watch','watchLabel'],['plan','planLabel']])lines.push(`${t(label)}: ${txt(reading.guidance[key])}`);
    lines.push('');
    Object.entries(reading.parts).forEach(([domain,item])=>lines.push(`${t(domain)} — ${txt(item.title)} (${item.id})`,txt(item.text),''));
    lines.push(t('nuance'),txt(reading.weekday.text));
    if(reading.timeBand.index!==6) lines.push(txt(reading.timeBand.text));
    lines.push('',t('readingDraft'));
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`fortune-${reading.mode}-${reading.periodStart}-${reading.core.id}-${language}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function updateTimeFields(){
    const mode=fields.timeMode.value;
    document.getElementById('exact-time-field').hidden=mode!=='exact';
    document.getElementById('approximate-time-field').hidden=mode!=='approximate';
    fields.birthTime.disabled=mode!=='exact';fields.birthTime.required=mode==='exact';
    fields.timeWindow.disabled=mode!=='approximate';
    document.getElementById('time-note').textContent=t(mode==='unknown'?'unknownNote':'knownNote');
  }
  function updateDateConfirmations(){
    for(const [name,id] of [['birthDate','birth-date-confirm'],['readingDate','reading-date-confirm']]){
      const target=document.getElementById(id);
      try{target.textContent=(language==='th'?'วันที่เลือก: ':'Selected date: ')+dateLabel(fields[name].value);}
      catch{target.textContent='';}
    }
    const start=shortcutDate(weeklyChoice),end=engine.weekStart(start);end.setUTCDate(end.getUTCDate()+6);
    document.getElementById('week-period-confirm').textContent=`${t('periodSelected')}: ${dateLabel(start)} – ${dateLabel(end.toISOString().slice(0,10))}`;
    document.querySelectorAll('[data-week]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.week===weeklyChoice)));
  }
  function shortcutDate(which){
    const today=engine.todayISO();if(which==='this')return today;
    const date=engine.weekStart(today);date.setUTCDate(date.getUTCDate()+7);return date.toISOString().slice(0,10);
  }
  function updateReadingFields(){
    const day=fields.readingMode.value==='day';
    document.getElementById('weekly-options').hidden=day;
    document.getElementById('week-shortcuts').setAttribute('aria-label',t('weekMode'));
    document.getElementById('day-context').hidden=!day;
    document.getElementById('reading-date-field').hidden=!day;
    fields.readingDate.disabled=!day;fields.readingDate.required=day;
    fields.occasion.disabled=!day;fields.support.disabled=!day;
    document.getElementById('reading-date-label').textContent=t('dayDate');
    document.getElementById('period-note').textContent=t(day?'dayPeriodNote':'weekPeriodNote');
    updateDateConfirmations();
  }
  function translateContextOptions(){
    for(const [name,items] of [['occasion',lib.guidance.occasions],['support',lib.guidance.supports]]){
      const selected=fields[name].value;
      fields[name].innerHTML=items.map(item=>`<option value="${item.id}">${esc(txt(item.title))}</option>`).join('');
      if(items.some(item=>item.id===selected))fields[name].value=selected;
    }
  }
  function refreshDateLimits(){
    const today=engine.todayISO();
    fields.readingDate.min=today;
    fields.birthDate.max=today;
    fields.readingDate.setCustomValidity(fields.readingDate.value&&fields.readingDate.value<today?i18n[language].errors.PAST_READING_DATE:'');
    return today;
  }
  function runReading(animate){
    const error=document.getElementById('form-error');error.hidden=true;
    try {const today=refreshDateLimits(),next=profile();reading=engine.read(lib,next,{today});submittedProfile={...next};renderReading(animate);if(animate){const result=document.getElementById('results');result.scrollIntoView({behavior:'instant',block:'start'});result.focus({preventScroll:true});}}
    catch(e){error.textContent=i18n[language].errors[e.message]||i18n[language].errors.DEFAULT;error.hidden=false;}
  }
  function records(){return category==='cores'?lib.cores:category==='weekdays'?lib.weekdays:category==='timeBands'?lib.timeBands:lib.domains[category];}
  function renderLibrary(){
    const counts={cores:52,work:16,love:16,luck:16,caution:16,weekdays:7,timeBands:7};
    document.getElementById('library-categories').innerHTML=Object.entries(counts).map(([name,count])=>`<button type="button" data-category="${name}" aria-pressed="${category===name}">${t(name)} <span>${count}</span></button>`).join('');
    document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.category;renderLibrary();}));
    const filter=document.getElementById('phase-filter');
    filter.disabled=category==='weekdays'||category==='timeBands';
    const query=document.getElementById('library-search').value.trim().toLocaleLowerCase();
    const all=records(),filtered=all.filter(record=>(filter.disabled||filter.value==='all'||record.phase===filter.value)&&(!query||JSON.stringify([record.id,record.title,record.text,record.themeTitle]).toLocaleLowerCase().includes(query)));
    document.getElementById('library-count').textContent=`${filtered.length} ${t('of')} ${all.length} ${t('count')}`;
    document.getElementById('library-list').innerHTML=filtered.map(record=>{
      const isCore=category==='cores',example=isCore?engine.example(lib,record):null;
      return `<details class="library-item" data-record-id="${record.id}"><summary><span class="library-number">${isCore?String(record.number).padStart(2,'0'):record.id.replace('Caution','!')}</span><span><span class="summary-title">${esc(txt(record.title))}</span><span class="summary-sub">${record.id}${record.phase?' · '+phaseLabel(record.phase):''}${isCore?' · '+rangeLabel(record.number):''}</span></span></summary><div class="library-content"><p>${esc(txt(record.text))}</p>${isCore?`<p class="example-heading">${t('exampleTopics')}</p><div class="domain-grid">${Object.entries(example.parts).map(([domain,item])=>domainHTML(domain,item)).join('')}</div>`:''}</div></details>`;
    }).join('')||`<p class="empty-state">${t('noResults')}</p>`;
  }
  function renderPlan(){
    const th=language==='th';
    document.getElementById('plan-page').innerHTML=`
      <div class="page-heading"><p class="eyebrow">52 + 64 + 14 · ${th?'โครงสร้างที่ขยายต่อได้':'A REUSABLE CONTENT SYSTEM'}</p><h1>${th?'52 แกนเรื่อง ให้คำอ่านที่หลากหลาย':'52 core fortunes, with room for variety.'}</h1><p class="lede">${th?'เริ่มจากคลังเนื้อหาที่อ่านและตรวจได้ ก่อนเชื่อมกับวิธีคำนวณโหราศาสตร์ไทยที่ผ่านการทบทวน':'Begin with readable, reviewable content. Connect it to a documented Thai calculation method after review.'}</p></div>
      <div class="plan-grid"><div>
      <section class="plan-section"><h2>${th?'โครงสร้างที่แนะนำ':'The recommended structure'}</h2><table class="plan-table"><thead><tr><th>${th?'ส่วน':'Layer'}</th><th>${th?'จำนวน':'Count'}</th><th>${th?'หน้าที่':'Purpose'}</th></tr></thead><tbody><tr><td>${th?'ภาพรวม':'Overall'}</td><td>52</td><td>${th?'13 ธีม × 4 ทิศทาง':'13 themes × 4 conditions'}</td></tr><tr><td>${th?'การงาน / ความรัก / โอกาส / คำเตือน':'Work / love / opportunity / caution'}</td><td>16 × 4</td><td>${th?'แต่ละด้านมี 4 บทต่อทิศทาง':'4 compatible passages per condition, in each domain'}</td></tr><tr><td>${th?'ข้อคิดตามวันเกิด':'Weekday reflections'}</td><td>7</td><td>${th?'เพิ่มมุมมองตามวันปฏิทิน':'A short reflection for the civil weekday'}</td></tr><tr><td>${th?'ข้อคิดตามเวลา':'Time reflections'}</td><td>6 + 1</td><td>${th?'6 ช่วงเวลา และกรณีไม่ทราบ':'6 windows plus the unknown-time case'}</td></tr></tbody></table><div class="callout">${th?'รวม 116 บทหลัก + 14 ข้อความประกอบ แต่ละแกนเรื่องเลือกได้ 4 × 4 × 4 × 4 = 256 ชุดบทประกอบ จึงมี 13,312 ชุดผสมเชิงโครงสร้าง ก่อนเพิ่มข้อคิดตามวันและเวลา ไม่ได้หมายความว่าทุกคนจะได้ข้อความไม่ซ้ำกัน':'116 main passages + 14 short modifiers. Each core can combine 4 × 4 × 4 × 4 = 256 compatible topic sets: 13,312 structurally possible main readings, before weekday/time notes. This does not guarantee a unique reading for every person.'}</div></section>
      <section class="plan-section"><h2>${th?'52 ช่วง ครอบคลุมทุกวันอย่างไร':'How 52 bands cover every birthday'}</h2><ul><li>${th?'ช่วง 1 เริ่ม 1–7 มกราคม จากนั้นแบ่งครั้งละ 7 วันตามปฏิทินปกติ':'Band 1 is January 1–7, followed by consecutive seven-day bands on a non-leap calendar.'}</li><li>${th?'ช่วง 52 ยาว 8 วัน คือ 24–31 ธันวาคม เพื่อไม่ให้วันสุดท้ายของปีตกหล่น':'Band 52 covers December 24–31, eight days, so the final day is not omitted.'}</li><li>${th?'29 กุมภาพันธ์ใช้ช่วงเดียวกับ 28 กุมภาพันธ์ แต่ยังใช้วันเกิดจริงในการหาวันในสัปดาห์และเลือกบท':'February 29 shares February 28’s band. Its actual date is retained for the weekday and topic selection.'}</li><li>${th?'ไม่ใช้เลขสัปดาห์ ISO จึงไม่มีปัญหาสัปดาห์ที่ 53 หรือสัปดาห์ข้ามปี':'These are not ISO week numbers, avoiding week 53 and cross-year birthday-week ambiguity.'}</li></ul><p>${th?'เลขช่วงวันเกิดเป็นเพียงจุดตั้งต้น ไม่ใช่คำทำนายตลอดชีวิต วันที่อ่านจะเลื่อนแกนเรื่องตามสัปดาห์ปัจจุบัน':'The birthday band is an anchor, not a lifetime prediction. The reading week rotates the active core story.'}</p></section>
      <section class="plan-section"><h2>${th?'สิ่งที่ควรทำให้ถูกต้อง':'What accuracy means at this stage'}</h2><p>${th?'ตรวจได้: วันที่มีอยู่จริง ปีอธิกสุรทิน การครอบคลุมทุกวัน ขอบเขตช่วงเวลา ความสม่ำเสมอของผล และความสอดคล้องของภาษาไทยกับอังกฤษ':'Verifiable now: valid dates, leap years, coverage of every birthday, time boundaries, consistent outputs and Thai–English meaning.'}</p><p>${th?'ยังรับรองไม่ได้: ความแม่นยำของเหตุการณ์อนาคต หรือการอ้างว่าระบบ 52 ช่วงนี้เป็นตำราไทยดั้งเดิม เนื้อหาทั้งหมดเป็นงานเขียนต้นฉบับเพื่อทดสอบประสบการณ์':'Not established: predictive accuracy or a claim that this 52-band system is a traditional Thai text. All passages are original drafts for testing the experience.'}</p><p>${th?'ก่อนใช้คำว่า “คำนวณดวงไทย” ต้องเลือกสำนัก วิธีผูกดวง เวลาเริ่มวัน ปฏิทิน และการปรับเขตเวลาอย่างชัดเจน แล้วเทียบกับดวงตัวอย่างที่ผู้เชี่ยวชาญตรวจแล้ว':'Before calling this a Thai chart calculator, document the school, chart method, day boundary, calendar and timezone handling, then compare with practitioner-reviewed reference charts.'}</p></section>
      </div><div>
      <section class="plan-section"><h2>${th?'กติกาของเดโมนี้':'The demo’s selection rules'}</h2><ol><li>${th?'วันและเดือนเกิดเลือกช่วงพื้นฐาน 1–52':'Birth month and day select the base band, 1–52.'}</li><li>${th?'สัปดาห์ที่อ่านหมุนแกนเรื่อง โดยใช้วันจันทร์ 2 พฤศจิกายน 2026 เป็นจุดเริ่มรอบ เลขแกนเรื่องวนกลับหลัง 52 สัปดาห์':'The reading week rotates the core, anchored at Monday, November 2, 2026. Core IDs repeat after 52 weeks.'}</li><li>${th?'วันเดือนปีเกิดเต็ม ช่วงเวลา และสัปดาห์ที่อ่าน เลือกบทของแต่ละด้านอย่างอิสระ ภายในทิศทางเดียวกับภาพรวม':'The full birth date, time window and reading week independently select each domain’s passage within the overall condition.'}</li><li>${th?'ใช้ช่วงเวลา 4 ชั่วโมง 6 ช่วง ไม่แกล้งสร้างความแตกต่างจากนาทีเกิดที่ยังไม่ได้นำไปคำนวณจริง':'Six four-hour windows are used. Minute differences within one window do not imply additional precision.'}</li><li>${th?'ไม่ทราบเวลา: ไม่ใส่เวลาเที่ยงหรือเที่ยงคืนแทน และไม่แสดงข้อคิดเฉพาะช่วงเวลา':'Unknown time: no invented noon or midnight, and no time-specific reflection.'}</li><li>${th?'ใช้วันปฏิทินตามที่กรอก ยังไม่ใช้กติกาเริ่มวันแบบโหราศาสตร์ไทยหรือพิกัดสถานที่เกิด':'The entered civil date is used. Thai astrological day boundaries and birth-location coordinates are not yet applied.'}</li><li>${th?'กดซ้ำด้วยข้อมูลเดิมได้ผลเดิม การเปลี่ยนภาษาคงรหัสเรื่องเดิมทั้งหมด':'Repeated reveals with the same profile return the same result. Switching language preserves every story ID.'}</li></ol></section>
      <section class="plan-section"><h2>${th?'แผนพัฒนาทีละขั้น':'A staged build plan'}</h2><p><span class="step-tag">01</span><strong>${th?'เดโมเนื้อหา — ทำแล้ว':'Content demo — ready'}</strong><br>${th?'เลขแทนภาพไพ่ คลังสองภาษา คำอ่าน 5 ด้าน และทดสอบวันเกิด/เวลาได้ในเครื่อง':'Numbered cards, bilingual library, five-part readings and local birth-date/time testing.'}</p><p><span class="step-tag">02</span><strong>${th?'ตรวจเนื้อหาและวิธีไทย':'Thai editorial and method review'}</strong><br>${th?'ทบทวนทั้ง 116 บทกับผู้เชี่ยวชาญไทย ปรับความหมายและกติกาก่อนใช้ตำแหน่งดาวจริง':'Review all 116 passages and the selected Thai method with a practitioner; resolve meaning and conventions before chart integration.'}</p><p><span class="step-tag">03</span><strong>${th?'เชื่อมผังดวง':'Connect chart calculations'}</strong><br>${th?'ใช้วัน เวลา สถานที่เกิด และตำแหน่งดาวเลือกธีมและทิศทาง แทนกติกาแบ่งสัปดาห์เดิม พร้อมรองรับ พ.ศ. และเวลาที่ไม่แน่ชัด':'Use birth date, time, place and chart features to select themes and conditions, replacing the week-band selector. Support Buddhist Era dates and uncertainty.'}</p><p><span class="step-tag">04</span><strong>${th?'ทดสอบกับผู้อ่านจริง':'Test the reading experience'}</strong><br>${th?'ดูความชัด ความซ้ำ ความสอดคล้อง และภาษา ไม่ใช้ความรู้สึกว่าตรงเป็นหลักฐานยืนยันความแม่นยำ':'Review clarity, repetition, coherence and language. Perceived resonance is not proof of predictive accuracy.'}</p><p><span class="step-tag">05</span><strong>${th?'คำอ่านฉบับเต็มและเครดิตภายหลัง':'Full readings and credits later'}</strong><br>${th?'ค่อยเพิ่มคำอ่านรายเดือนและคำถามต่อยอด อ่านฟรีผ่านเว็บไซต์ได้แล้ว ระบบชำระเงินและเครดิตยังไม่เปิดให้บริการ':'Add monthly readings and focused follow-ups later. Free readings are available on the website. Payments and credits are not connected.'}</p></section>
      <section class="plan-section source-list"><h2>${th?'แหล่งอ้างอิง':'Sources'}</h2><p>${th?'แหล่งเหล่านี้อธิบายปฏิทินและความต่างของวิธีโหราศาสตร์ ไม่ใช่แหล่งที่มาหรือผู้รับรองข้อความทำนายที่แต่งขึ้น':'These sources inform calendar handling and the distinction between astrology methods. They do not supply or endorse the original predictions.'}</p>${lib.provenance.sources.map(s=>`<p><a href="${s.url}" target="_blank" rel="noopener">${esc(s.title)}</a></p>`).join('')}</section>
      </div></div>`;
    document.getElementById('plan-page').insertAdjacentHTML('beforeend',`<section class="plan-section"><h2>${th?'คำอ่านรายวัน รายสัปดาห์ และคำแนะนำตามเรื่องที่เลือก':'Daily readings, weekly outlooks and context'}</h2><p>${th?'ภาพรวมสัปดาห์: อ่านสัปดาห์นี้หรือสัปดาห์หน้าได้ฟรี โดยไม่ต้องเลือกวันที่ ตัวเลือกสัปดาห์อื่นต้องชำระเงินและยังล็อกอยู่ในเดโม ช่วงที่แสดงเริ่มไม่ก่อนวันนี้และสิ้นสุดวันอาทิตย์':'Weekly outlook: this week and next week are free, with no date picker. Choosing another week is a paid option and stays locked in the demo. The displayed period starts no earlier than today and ends on Sunday.'}</p><p>${th?'เจาะจงวัน: ใช้ธีมเดียวกับสัปดาห์นั้น แต่เลือกบทเฉพาะด้านด้วยวันที่อ่านเพิ่มเข้ามา จึงมีรายละเอียดรายวันที่ต่างกันได้ ข้อความอาจซ้ำได้ เพราะเป็นคลังเนื้อหาจำกัด':'Specific day: retains the weekly theme and adds the chosen date to topic selection. Daily details can differ; a finite content library still allows repetition.'}</p><p>${th?'เลือกเรื่องวันทั่วไป สัมภาษณ์งาน หรือนัดเดต และเลือกสิ่งที่อยากได้รับความช่วยเหลือได้ คำแนะนำจะสะท้อนบริบทนั้น การเลือกเรื่องไม่เปลี่ยนไพ่หรืออ้างว่ารู้ความคิดของคุณ':'Choose an ordinary day, interview or date, and the kind of support you would find useful. The advice reflects those choices without rerolling the cards or claiming to infer your thoughts.'}</p><p>${th?'รูปแบบคำแนะนำประกอบด้วยเป้าหมายที่ตั้งใจได้ อุปสรรคที่ควรนึกถึง และแผน “ถ้า…ให้…” ได้แรงบันดาลใจจากการวางแผนเป้าหมายใน WOOP แต่ข้อความชุดนี้ไม่ได้ผ่านการทดสอบเป็นโปรแกรมทางจิตวิทยา และไม่ได้เพิ่มความแม่นยำในการทำนายอนาคต':'The advice pairs a useful intention with a possible obstacle and an if–then action. This is inspired by goal planning in WOOP; the copy is not a tested psychological intervention or evidence of better fortune-telling accuracy.'} <a href="${lib.guidance.source.url}" target="_blank" rel="noopener">WOOP: Practice</a></p><p>${th?'เนื้อหาเพิ่ม: มุมมองรายวัน 12 บท (3 เรื่อง × 4 ทิศทาง), คำแนะนำ 12 คู่ (3 เรื่อง × 4 ความต้องการ) และแนวทางรายสัปดาห์ 4 ชุด อ่านได้ทั้งสองภาษาในฉบับพิมพ์และ JSON':'Additional copy: 12 day perspectives (3 occasions × 4 conditions), 12 advice pairs (3 occasions × 4 support choices) and 4 weekly plans. All are available in both languages in the printable catalogue and JSON.'}</p></section>`);
  }
  function closeMenu(){document.querySelector('.site-header').classList.remove('menu-open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');}
  function setPage(next){page=['reading','library','plan'].includes(next)?next:'reading';document.querySelectorAll('.page').forEach(section=>section.hidden=section.id!==page+'-page');document.querySelectorAll('[data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});closeMenu();if(page==='library')renderLibrary();if(page==='plan')renderPlan();}
  function translate(){
    document.documentElement.lang=language;
    document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n));
    document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
    document.querySelector('.menu-toggle').setAttribute('aria-label',language==='th'?'เปิดหรือปิดเมนู':'Toggle navigation');
    document.getElementById('hero-card').alt=language==='th'?'พระจันทร์ทรงม้าขาวใต้แสงจันทร์ ภาพประกอบศิลปะไทย':'Phra Chan on a white horse under the moon, an original Thai-inspired illustration';
    const filter=document.getElementById('phase-filter'),selected=filter.value;
    filter.innerHTML=`<option value="all">${t('allPhases')}</option>`+lib.phases.map(p=>`<option value="${p.id}">${p[language]}</option>`).join('');filter.value=selected||'all';
    document.getElementById('library-search').placeholder=language==='th'?'เช่น โอกาส ความรัก C01':'Try opportunity, love or C01';
    translateContextOptions();refreshDateLimits();updateTimeFields();updateReadingFields();renderReading();renderLibrary();renderPlan();markIfStale();
  }
  function markIfStale(){
    if(!submittedProfile||!reading)return;
    const status=document.getElementById('reading-status'),stale=JSON.stringify(profile())!==JSON.stringify(submittedProfile),expired=reading.periodStart<engine.todayISO();
    status.classList.toggle('is-stale',stale||expired);
    status.textContent=expired?t('expired'):stale?t('stale'):periodLabel(reading);
  }
  form.addEventListener('submit',event=>{event.preventDefault();refreshDateLimits();if(form.reportValidity())runReading(true);});
  form.addEventListener('input',()=>{document.getElementById('form-error').hidden=true;document.getElementById('example-notice').hidden=true;refreshDateLimits();updateDateConfirmations();markIfStale();});
  fields.timeMode.addEventListener('change',()=>{updateTimeFields();markIfStale();});
  document.querySelectorAll('[name=readingMode]').forEach(input=>input.addEventListener('change',()=>{updateReadingFields();markIfStale();}));
  document.querySelectorAll('[data-week]').forEach(button=>button.addEventListener('click',()=>{weeklyChoice=button.dataset.week;refreshDateLimits();updateDateConfirmations();markIfStale();}));
  const premiumDialog=document.getElementById('custom-week-dialog');
  document.getElementById('custom-week-locked').addEventListener('click',()=>premiumDialog.showModal());
  document.getElementById('close-custom-week').addEventListener('click',()=>premiumDialog.close());
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>{language=button.dataset.language;translate();}));
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.page;setPage(button.dataset.page);window.scrollTo({top:0,behavior:'instant'});}));
  document.querySelector('.menu-toggle').addEventListener('click',event=>{const open=document.querySelector('.site-header').classList.toggle('menu-open');event.currentTarget.setAttribute('aria-expanded',String(open));});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.site-header').classList.contains('menu-open')){closeMenu();document.querySelector('.menu-toggle').focus();}});
  document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
  document.querySelectorAll('.start-reading').forEach(button=>button.addEventListener('click',()=>{const start=document.getElementById('start');start.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});start.focus({preventScroll:true});}));
  document.getElementById('sample-reading').addEventListener('click',()=>{fields.birthDate.value='1995-06-12';fields.timeMode.value='exact';fields.birthTime.value='08:30';fields.timeWindow.value='2';fields.readingMode.value='week';weeklyChoice='this';document.getElementById('example-notice').hidden=false;updateTimeFields();updateReadingFields();runReading(true);});
  const privacyDialog=document.getElementById('privacy-dialog');
  document.getElementById('privacy-button').addEventListener('click',()=>privacyDialog.showModal());
  document.getElementById('close-privacy').addEventListener('click',()=>privacyDialog.close());
  document.getElementById('library-search').addEventListener('input',renderLibrary);
  document.getElementById('phase-filter').addEventListener('change',renderLibrary);
  document.getElementById('expand-all').addEventListener('click',()=>document.querySelectorAll('#library-list details').forEach(details=>details.open=true));
  window.addEventListener('hashchange',()=>setPage(location.hash.slice(1)));
  function refreshCalendar(){refreshDateLimits();updateDateConfirmations();markIfStale();}
  window.addEventListener('focus',refreshCalendar);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCalendar();});
  setInterval(refreshCalendar,60000);
  fields.readingDate.value=refreshDateLimits();
  translateContextOptions();updateTimeFields();updateReadingFields();translate();setPage(location.hash.slice(1));
})();
