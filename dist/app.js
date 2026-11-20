(() => {
  'use strict';
  const lib=globalThis.FortuneLibrary,engine=globalThis.FortuneEngine;
  const app=document.querySelector('.app'),form=document.getElementById('birth-form');
  const fields=form.elements;
  let language=window.MooJaiUI?.language||'th',page='reading',category='cores',reading=null,submittedProfile=null,weeklyChoice='this';
  const i18n={
    th:{local:'เฉพาะเครื่องนี้',navReading:'อ่านคำทำนาย',navWorld:'โลกมูใจ',navLibrary:'คลังเรื่องราว',navPlan:'แผนและกติกา',eyebrow:'ต้นแบบคำทำนาย · ฉบับภาษาไทย',headline:'ดวงของคุณ ในจังหวะนี้',intro:'ภาพรวมหนึ่งเรื่อง พร้อมคำอ่านด้านการงาน ความรัก โอกาส และสิ่งที่ควรระวัง',profileHeading:'เริ่มจากวันเกิดของคุณ',exampleLabel:'ข้อมูลตัวอย่าง · แก้ไขได้',birthDate:'วันเดือนปีเกิด',calendarHint:'กรอกปีคริสต์ศักราช (ค.ศ.)',timeMode:'ข้อมูลเวลาเกิด',exact:'ทราบเวลา',approximate:'ทราบเพียงช่วงเวลา',unknown:'ไม่ทราบเวลา',birthTime:'เวลาเกิดตามนาฬิกาท้องถิ่น',timeWindow:'ช่วงเวลาโดยประมาณ',readingDate:'วันที่อยากดูคำอ่าน',weekHint:'คำอ่านเดียวกันตลอดสัปดาห์ จันทร์–อาทิตย์',readButton:'เปิดคำทำนาย',privacy:'ข้อมูลอยู่ในหน้านี้ ไม่บันทึกวันเกิดและไม่ส่งออกไปยังบริการภายนอก',scope:'กติกาทดลองสำหรับทดสอบเนื้อหา ยังไม่ใช่การผูกดวงโหราศาสตร์ไทย',libraryEyebrow:'ต้นฉบับทุกบท · ไทย / ENGLISH',libraryHeading:'คลังเรื่องราวที่นำมาประกอบกัน',libraryIntro:'อ่านครบทั้ง 52 ชุดตัวอย่าง หรือแยกดูบทเฉพาะด้านที่ใช้สลับกันได้',searchLabel:'ค้นหาชื่อ เนื้อหา หรือรหัส',phaseFilter:'ทิศทางของเรื่อง',allPhases:'ทุกทิศทาง',catalogue:'อ่าน / พิมพ์ฉบับสองภาษา',expandAll:'เปิดทุกบทในหน้านี้',downloadLibrary:'ดาวน์โหลดคลังเรื่อง JSON',work:'การงาน',love:'ความรัก',luck:'โชคและโอกาส',caution:'สิ่งที่ควรระวัง',cores:'ภาพรวม',weekdays:'ข้อคิดตามวัน',timeBands:'ข้อคิดตามเวลา',stale:'ข้อมูลเปลี่ยนแล้ว — กดเปิดคำทำนายเพื่อใช้ข้อมูลใหม่',ready:'คำอ่านสำหรับสัปดาห์',unknownNote:'ไม่เดาเวลาเกิด ระบบจะเว้นรายละเอียดจากช่วงเวลา',knownNote:'เดโมใช้ช่วงละ 4 ชั่วโมง ยังไม่ใช้ตำแหน่งดาวหรือความละเอียดระดับนาที',saved:'บันทึกคำอ่านเป็นข้อความ',print:'พิมพ์คำอ่าน',method:'ดูวิธีประกอบคำอ่าน',nuance:'ข้อคิดประกอบเฉพาะโปรไฟล์',nuanceNote:'ข้อความประกอบแต่งขึ้นสำหรับเดโม ไม่ใช่คุณสมบัติที่ยืนยันจากวันหรือเวลาเกิด',birthBand:'ช่วงวันเกิด',coreId:'แกนเรื่อง',unknownLabel:'ไม่ทราบเวลาเกิด',readingDraft:'ต้นฉบับเพื่อทดลองประสบการณ์ ยังไม่ผ่านการตรวจรับรองวิธีคำนวณโดยผู้เชี่ยวชาญโหราศาสตร์ไทย',count:'บท',of:'จาก',exampleTopics:'ตัวอย่างบทประกอบที่เข้ากับภาพรวมนี้',noResults:'ไม่พบเรื่องที่ตรงกับคำค้น ลองเปลี่ยนคำหรือเลือกทุกทิศทาง',errors:{INVALID_DATE:'กรุณาตรวจสอบวันเดือนปีให้ถูกต้อง',FUTURE_BIRTH_DATE:'วันเกิดต้องไม่อยู่ในอนาคต',READING_BEFORE_BIRTH:'วันที่อ่านต้องไม่อยู่ก่อนวันเกิด',INVALID_TIME:'กรุณากรอกเวลาเกิดให้ถูกต้อง',INVALID_TIME_WINDOW:'กรุณาเลือกช่วงเวลาเกิด',DEFAULT:'ไม่สามารถสร้างคำอ่านได้ กรุณาตรวจสอบข้อมูลอีกครั้ง'}},
    en:{local:'On this laptop',navReading:'Your reading',navWorld:'Pet world',navLibrary:'Story library',navPlan:'Plan & rules',eyebrow:'FORTUNE CONTENT DEMO · THAI EDITION',headline:'Your next chapter.',intro:'One overall direction, with separate readings for work, love, opportunity and what to watch.',profileHeading:'Begin with your birth details',exampleLabel:'Example profile · editable',birthDate:'Date of birth',calendarHint:'Use a Common Era (CE) year',timeMode:'What birth time do you know?',exact:'Exact clock time',approximate:'Approximate window',unknown:'Time unknown',birthTime:'Local clock time at birth',timeWindow:'Approximate time window',readingDate:'Date of the reading',weekHint:'One consistent reading, Monday to Sunday',readButton:'Reveal my reading',privacy:'Birth details stay on this page. They are not stored or sent to external services.',scope:'An editorial selection demo. Traditional Thai chart calculations are not connected.',libraryEyebrow:'EVERY PASSAGE · THAI / ENGLISH',libraryHeading:'A library designed to combine.',libraryIntro:'Browse all 52 complete example readings, or inspect each reusable topic passage.',searchLabel:'Search a title, passage or ID',phaseFilter:'Overall condition',allPhases:'All conditions',catalogue:'Read / print bilingual catalogue',expandAll:'Expand every visible entry',downloadLibrary:'Download story library JSON',work:'Work',love:'Love',luck:'Luck & opportunity',caution:'What to watch',cores:'Overall',weekdays:'Weekday notes',timeBands:'Time notes',stale:'Details changed — reveal again to use the new profile.',ready:'Your reading for',unknownNote:'No birth time is invented. Time-specific interpretation is omitted.',knownNote:'The demo uses four-hour windows, without planetary positions or minute-level claims.',saved:'Save reading as text',print:'Print reading',method:'How this reading was assembled',nuance:'A reflection for this profile',nuanceNote:'These are original demo prompts, not verified traits associated with a birthday or birth time.',birthBand:'Birthday band',coreId:'Core story',unknownLabel:'Birth time unknown',readingDraft:'Editorial draft for testing. A Thai practitioner has not yet reviewed or validated the calculation method.',count:'entries',of:'of',exampleTopics:'Compatible example topic passages',noResults:'No matching passages. Try another search or all conditions.',errors:{INVALID_DATE:'Check that the date is valid.',FUTURE_BIRTH_DATE:'A birth date cannot be in the future.',READING_BEFORE_BIRTH:'The reading date must not be before the birth date.',INVALID_TIME:'Enter a valid birth time.',INVALID_TIME_WINDOW:'Choose a valid birth-time window.',DEFAULT:'The reading could not be assembled. Please check the inputs.'}}
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
    navReading:'คำทำนาย',navPlan:'วิธีการอ่าน',navCharms:'การ์ดมูใจ',navNew:'ใหม่',footerCharms:'สุ่มการ์ดมูใจ',heroEyebrow:'พื้นที่เล็ก ๆ สำหรับทบทวนใจ',heroTitle:'ดวงของคุณ',heroTitleSecond:'ในจังหวะนี้',heroDescription:'คำอ่านเรื่องงาน ความรัก และโอกาส พร้อมก้าวต่อไปที่คุณเลือกได้',symbolicArt:'ภาพประกอบเชิงสัญลักษณ์',startFree:'เริ่มอ่านฟรี',sampleReading:'ดูตัวอย่างคำอ่าน',noSignup:'ไม่ต้องสมัครสมาชิก · ไม่ต้องใช้บัตร',profileHeading:'เริ่มคำอ่านของคุณ',profileIntro:'เริ่มต้นด้วยวันและเวลาเกิดของคุณ',birthDate:'วันเกิด',timeMode:'เวลาเกิด',calendarHint:'ใช้ปีคริสต์ศักราช (ค.ศ.)',weekMode:'รายสัปดาห์',dayMode:'เฉพาะวัน',readButton:'อ่านคำทำนาย',customWeek:'เลือกสัปดาห์อื่น',comingSoon:'เร็ว ๆ นี้',free:'ฟรี',freeNoSignup:'ฟรี · ไม่ต้องสมัครสมาชิก',opportunity:'โอกาส',footerNote:'เพื่อการสะท้อนใจและความบันเทิง',privacyLink:'ข้อมูลและความเป็นส่วนตัว',close:'ปิด',skipToForm:'ข้ามไปที่แบบฟอร์ม',downloadLibrary:'คลังเรื่อง JSON',privacy:'วันเกิดอยู่ในเบราว์เซอร์ของคุณ ไม่บันทึกหรือส่งไปยังเซิร์ฟเวอร์',privacyDetails:'วันเกิดและเวลาเกิดใช้สร้างคำอ่านในเบราว์เซอร์เท่านั้น ไม่ต้องมีบัญชีผู้ใช้ ไม่มีคุกกี้ติดตาม และไม่บันทึกวันเกิดในโปรไฟล์ เมื่อโหลดหน้าใหม่ข้อมูลจะหายไป การบันทึกคำอ่านเป็นการดาวน์โหลดลงอุปกรณ์ของคุณ GitHub Pages เป็นผู้ให้บริการเว็บไซต์และอาจเก็บข้อมูลคำขอทั่วไป เช่น IP ตามนโยบายของ GitHub แต่แอปไม่ส่งวันเกิดหรือเวลาเกิดไปด้วย',customWeekTitle:'คำอ่านเฉพาะสัปดาห์'
  });
  Object.assign(i18n.en,{
    navReading:'Your reading',navPlan:'How it works',navCharms:'Card charms',navNew:'New',footerCharms:'Find a card charm',heroEyebrow:'A little space to reflect',heroTitle:'Your next chapter.',heroTitleSecond:'At your own pace.',heroDescription:'A perspective on work, love and opportunity. A next step that is yours to choose.',symbolicArt:'Symbolic illustration',startFree:'Start a free reading',sampleReading:'See a sample reading',noSignup:'No account. No card required.',profileHeading:'Begin your reading',profileIntro:'Start with your birth date and time.',birthDate:'Date of birth',timeMode:'Birth time',calendarHint:'Use a Common Era (CE) year',weekMode:'Weekly',dayMode:'A specific day',readButton:'Reveal my reading',customWeek:'Choose another week',comingSoon:'Coming soon',free:'Free',freeNoSignup:'Free · No account needed',opportunity:'Opportunity',footerNote:'For reflection and entertainment',privacyLink:'About your privacy',close:'Close',skipToForm:'Skip to reading form',downloadLibrary:'Story library JSON',privacy:'Your birth details stay in your browser. They are not saved or sent to a server.',privacyDetails:'Your birth date and time are used only in your browser. No account is needed, there are no tracking cookies, and birth details are never saved to a profile. Reloading clears your details. Saving a reading explicitly downloads a file to your device. GitHub Pages hosts this site and may record ordinary request data, such as IP addresses, under GitHub’s privacy policy; the app does not send your birth date or time with these requests.',customWeekTitle:'A reading for a specific week'
  });
  i18n.th.errors.CUSTOM_WEEK_LOCKED='คำอ่านสัปดาห์อื่นต้องปลดล็อกด้วยการชำระเงิน กรุณาเลือกสัปดาห์นี้หรือสัปดาห์หน้า';
  i18n.en.errors.CUSTOM_WEEK_LOCKED='Other weekly readings require a paid unlock. Choose this week or next week.';
  for(const locale of ['th','en'])for(const code of ['INVALID_READING_MODE','INVALID_OCCASION','INVALID_SUPPORT'])i18n[locale].errors[code]=i18n[locale].errors.DEFAULT;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  Object.assign(i18n.th,{
    birthDay:'วัน',birthMonth:'เดือน',chooseMonth:'เลือกเดือน',yearCE:'ปี (ค.ศ.)',yearBE:'ปี (พ.ศ.)',yearFormat:'รูปแบบปี',commonEra:'ค.ศ.',buddhistEra:'พ.ศ.',
    calendarHint:'พิมพ์วันและปีเกิดได้เลย ไม่ต้องเลื่อนปฏิทิน',
    profileIntro:'กรอกวัน เดือน และปีเกิด แล้วเปิดเรื่องราวของคุณ',
    futureEyebrow:'เรื่องราวที่อาจรออยู่',futureTitle:'บทต่อไปของชีวิตคุณ',futureAges:'ช่วงอายุ',futureYears:'ปี',
    futureCareer:'งานและเส้นทางใหม่',futureFamily:'ความรักและครอบครัว',futureWealth:'ความฝันเรื่องความมั่งคั่ง',futureLegacy:'อิสระและสิ่งที่ส่งต่อ',
    futureTeaser:'พร้อมเรื่องราวอนาคตของคุณ · ครอบครัว งาน และความฝันเรื่องเงิน',
    futureMethod:'เรื่องราวอนาคตเป็นงานเขียนสมมติ เลือกจากวันเกิดและปรับช่วงอายุให้อยู่ข้างหน้า ไม่เปลี่ยนตามสัปดาห์หรือภาษา และไม่ได้คำนวณเหตุการณ์จริงในชีวิต'
  });
  Object.assign(i18n.en,{
    birthDay:'Day',birthMonth:'Month',chooseMonth:'Month',yearCE:'Year (CE)',yearBE:'Year (BE)',yearFormat:'Year format',commonEra:'CE',buddhistEra:'Thai BE',
    calendarHint:'Type your day and year. No calendar scrolling needed.',
    profileIntro:'Enter your day, month and birth year to begin your story.',
    futureEyebrow:'A glimpse of what could be',futureTitle:'Your future, in chapters',futureAges:'Around ages',futureYears:'',
    futureCareer:'Work & new beginnings',futureFamily:'Love & family',futureWealth:'A dream of prosperity',futureLegacy:'Freedom & legacy',
    futureTeaser:'Includes your future story · family, work and dreams of prosperity',
    futureMethod:'Future chapters are fictional passages selected from your birthday, with age windows placed ahead of your current age. They stay consistent across weeks and languages and do not calculate real life events.'
  });
  let sampleBackup=null;
  const ui=window.MooJaiUI, say=(en,th)=>language==='th'?th:en;
  Object.assign(i18n.en,{profileHeading:'A moment for you.',profileIntro:'Choose a week or day that matters. Your birth details stay on this page.',saved:'Download reading',libraryHeading:'A little room to explore.',libraryIntro:'Browse the original stories behind your readings.',exampleLabel:'Sample reading · Your own details are kept until you return.',navLibrary:'Story library'});
  Object.assign(i18n.th,{profileHeading:'ช่วงเวลาสำหรับคุณ',profileIntro:'เลือกสัปดาห์หรือวันที่มีความหมาย วันเกิดของคุณอยู่เฉพาะในหน้านี้',saved:'ดาวน์โหลดคำอ่าน',libraryHeading:'พื้นที่เล็ก ๆ ให้ค้นพบ',libraryIntro:'สำรวจเรื่องราวต้นฉบับที่ใช้ประกอบคำอ่าน',exampleLabel:'คำอ่านตัวอย่าง · เก็บข้อมูลเดิมไว้ให้กลับมาแก้ไขได้'});
  const sampleButton=document.getElementById('sample-reading');
  const tools=document.createElement('div');tools.className='reader-tools';
  tools.innerHTML='<span>'+ui.icon('lock')+' <span data-en="Free · No account needed" data-th="ฟรี · ไม่ต้องสมัครสมาชิก"></span></span>';
  tools.append(sampleButton);document.getElementById('birth-form').before(tools);
  // Put the period choice ahead of birth details, matching the visitor's first decision.
  const dates=document.createElement('div');dates.className='period-choices';
  for(const selector of ['.reading-mode-field','#weekly-options','#reading-date-field','#period-note','#day-context'])dates.append(document.querySelector(selector));
  form.prepend(dates);ui.apply();
  const txt=entry=>entry[language];
  const phaseLabel=phase=>lib.phases.find(item=>item.id===phase)?.[language]||'';
  const dateLabel=iso=>new Intl.DateTimeFormat(language==='th'?'th-TH':'en-GB',{day:'numeric',month:'short',year:'numeric',calendar:'gregory',timeZone:'UTC'}).format(engine.parseDate(iso));
  const rangeLabel=number=>{const range=engine.bandRange(number);const fmt=value=>new Intl.DateTimeFormat(language==='th'?'th-TH':'en-GB',{day:'numeric',month:'short',timeZone:'UTC'}).format(engine.parseDate('2001-'+value));return fmt(range.start)+' – '+fmt(range.end);};
  function profile(){const day=fields.readingMode.value==='day';return {birthDate:fields.birthDate.value,birthTime:fields.birthTime.value,timeMode:fields.timeMode.value,timeWindow:fields.timeWindow.value,readingDate:day?fields.readingDate.value:shortcutDate(weeklyChoice),readingMode:fields.readingMode.value,occasion:day?fields.occasion.value:'general',support:day?fields.support.value:'balanced'};}
  function periodLabel(result){return result.mode==='day'?`${t('dayReady')} ${dateLabel(result.readingDate)}`:`${t('weekReady')} · ${dateLabel(result.periodStart)} – ${dateLabel(result.periodEnd)}`;}
  function guidanceHTML(){
    const g=reading.guidance;
    return `<section class="guidance-panel" aria-labelledby="guidance-title"><p class="eyebrow">${t(reading.mode==='day'?'dayGuidance':'weekGuidance')}</p><h3 id="guidance-title">${esc(txt(g.title))}</h3>${g.outlook?`<p class="context-outlook">${esc(txt(g.outlook))}</p>`:''}<dl class="next-action"><div><dt>${t('planLabel')}</dt><dd>${esc(txt(g.plan))}</dd></div></dl><details class="guidance-extra"><summary>${say('A little more context','มุมมองประกอบเพิ่มเติม')}</summary><dl>${[['goal','goalLabel'],['watch','watchLabel']].map(([key,label])=>`<div><dt>${t(label)}</dt><dd>${esc(txt(g[key]))}</dd></div>`).join('')}</dl>${reading.mode==='day'?`<small>${t('contextSource')}</small>`:''}</details></section>`;
  }
  function domainHTML(domain,item){return `<details class="domain-section" ${domain==='work'?'open':''}><summary>${ui.icon({work:'sun',love:'heart',luck:'stars',caution:'info'}[domain])}<h3>${t(domain)}</h3><span class="record-id">${item.id}</span></summary><h4 class="domain-title">${esc(txt(item.title))}</h4><p>${esc(txt(item.text))}</p></details>`;}
  function timeInfoLabel(){return reading.timeBand.index===6?t('unknownLabel'):`${txt(reading.timeBand.title)} · ${t(reading.timeMode)}`;}
  function futureAgeLabel(chapter){return `${t('futureAges')} ${chapter.startAge}–${chapter.endAge}${language==='th'?' ปี':''}`;}
  function futureStoryHTML(){
    const story=reading.future;
    return `<section class="future-story" aria-labelledby="future-title"><p class="eyebrow">${t('futureEyebrow')}</p><h2 id="future-title">${t('futureTitle')}</h2><p class="future-intro">${esc(txt(story.intro))}</p><p class="future-note">${esc(txt(story.note))}</p><ol class="future-timeline">${story.chapters.map(chapter=>`<li data-story-id="${chapter.id}"><div class="future-age">${futureAgeLabel(chapter)}</div><div class="future-chapter"><p class="future-theme">${t('future'+chapter.theme[0].toUpperCase()+chapter.theme.slice(1))}</p><h3>${esc(txt(chapter.title))}</h3><p>${esc(txt(chapter.text))}</p></div></li>`).join('')}</ol></section>`;
  }
  function renderReading(animate=false){
    if(!reading) return;
    document.getElementById('results').hidden=false;
    const {core,parts}=reading;
    const timeInfo=timeInfoLabel();
    document.getElementById('reading-status').className='reading-status';
    document.getElementById('reading-status').textContent=periodLabel(reading);
    document.getElementById('reading-result').innerHTML=`
      <p class="result-period">${esc(periodLabel(reading))}</p>
      <div class="result-topline"><h2>${say(reading.mode==='day'?'Your day, in perspective.':'Your week, in perspective.','มองช่วงเวลาของคุณให้ชัดขึ้น')}</h2><button type="button" id="edit-details">${say('Edit details','แก้ไขข้อมูล')}</button></div>
      ${sampleBackup?`<p class="example-notice">${say('You are viewing a sample reading.','คุณกำลังดูคำอ่านตัวอย่าง')}</p>`:''}
      <div class="reading-cover${animate?' just-read':''}"><div class="number-card" aria-label="${t('coreId')} ${core.number}">${ui.mark}<span class="card-kicker">MooJai</span><span class="card-number">${String(core.number).padStart(2,'0')}</span><span class="card-bottom">${phaseLabel(core.phase)}<br>${core.id}</span></div><div class="cover-copy"><span class="phase-label">${t('weekTheme')} · ${phaseLabel(core.phase)} · ${esc(txt(core.themeTitle))}</span><h2>${esc(txt(core.title))}</h2><p class="fortune-text">${esc(txt(core.text))}</p><p class="reading-period">${dateLabel(submittedProfile.birthDate)} · ${esc(txt(reading.weekday.title))}<br>${esc(timeInfo)}</p></div></div>
      ${guidanceHTML()}
      <div class="domain-grid">${Object.entries(parts).map(([domain,item])=>domainHTML(domain,item)).join('')}</div>
      <details class="optional-reading"><summary>${ui.icon("book")}${say("Imagine a future chapter","ลองนึกภาพบทต่อไป")}</summary>${futureStoryHTML()}</details>
      <details class="optional-reading"><summary>${ui.icon("moon")}${say("A little more to reflect on","ข้อคิดเพิ่มเติม")}</summary><div class="nuance-panel"><h3>${t('nuance')}</h3><p>${esc(txt(reading.weekday.text))}</p>${reading.timeBand.index===6?'':`<p>${esc(txt(reading.timeBand.text))}</p>`}<small>${reading.timeBand.index===6?t('unknownNote'):t('nuanceNote')}</small></div></details>
      <div class="result-actions"><button class="secondary-button" type="button" id="save-reading">${ui.icon("download")}${t('saved')}</button><button class="text-button" type="button" id="print-reading">${t('print')}</button></div>
      <label class="export-choice"><input type="checkbox" id="include-birth-details">${say('Include my birth details in the download','รวมข้อมูลวันเกิดในไฟล์ดาวน์โหลด')}</label><p id="export-status" class="export-status" role="status"></p>
      <details class="method-details"><summary>${t('method')}</summary><p>${t('birthBand')} ${reading.birthBand} (${rangeLabel(reading.birthBand)}) → ${t('coreId')} ${core.id}<br>${Object.entries(parts).map(([domain,item])=>`${t(domain)}: ${item.id}`).join(' · ')}<br><code>${reading.weekStart} · ${reading.mode} · ${reading.weekday.id} · ${reading.timeBand.id} · ${reading.contentVersion} · ${reading.guidanceVersion}</code></p><p>${t('methodModes')}</p></details>
      <p class="reading-disclaimer">${t('readingDraft')}</p>
      <section class="reading-next"><h3>${say('Carry the moment with you.','เก็บช่วงเวลานี้ไว้กับคุณ')}</h3><p>${say('Explore a symbolic card charm and meet its companion. The draw is separate from your reading. Download your reading before leaving if you want to keep it.','สำรวจการ์ดเชิงสัญลักษณ์และพบน้องคู่ใจ การสุ่มแยกจากคำอ่านนี้ หากอยากเก็บคำอ่านไว้ กรุณาดาวน์โหลดก่อนออกจากหน้า')}</p><a class="primary-button" href="charms.html#ritual">${say('Reveal a charm','เปิดการ์ดมูใจ')}${ui.icon('arrow')}</a><a class="finish-link" href="./">${say('Finish for now','พักไว้เท่านี้ก่อน')}</a></section>`;
    document.querySelector('.method-details').insertAdjacentHTML('beforeend',`<p>${t('futureMethod')}</p>`);
    document.getElementById('edit-details').onclick=()=>{if(sampleBackup)restoreProfile();const start=document.getElementById('start');start.scrollIntoView({behavior:'instant'});start.focus({preventScroll:true});};
    document.getElementById('save-reading').addEventListener('click',downloadReading);
    document.getElementById('print-reading').addEventListener('click',()=>window.print());
  }
  function downloadReading(){
    const lines=[`มูใจ / MooJai · ${reading.contentVersion}`,periodLabel(reading)];
    if(document.getElementById('include-birth-details').checked)lines.push(`${dateLabel(submittedProfile.birthDate)} · ${txt(reading.weekday.title)} · ${timeInfoLabel()}`);
    if(reading.timeBand.index===6)lines.push(t('unknownNote'));
    lines.push('',`${t('weekTheme')}: ${reading.core.id} — ${txt(reading.core.title)}`,txt(reading.core.text),'',txt(reading.guidance.title));
    if(reading.guidance.outlook)lines.push(txt(reading.guidance.outlook));
    for(const [key,label] of [['goal','goalLabel'],['watch','watchLabel'],['plan','planLabel']])lines.push(`${t(label)}: ${txt(reading.guidance[key])}`);
    lines.push('',t('futureTitle'),txt(reading.future.note),txt(reading.future.intro));
    for(const chapter of reading.future.chapters)lines.push('',`${futureAgeLabel(chapter)} — ${txt(chapter.title)}`,txt(chapter.text));
    lines.push('');
    Object.entries(reading.parts).forEach(([domain,item])=>lines.push(`${t(domain)} — ${txt(item.title)} (${item.id})`,txt(item.text),''));
    lines.push(t('nuance'),txt(reading.weekday.text));
    if(reading.timeBand.index!==6) lines.push(txt(reading.timeBand.text));
    lines.push('',t('readingDraft'));
    const url=URL.createObjectURL(new Blob(['\ufeff'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download=`fortune-${reading.mode}-${reading.periodStart}-${reading.core.id}-${language}.txt`;a.click();document.getElementById('export-status').textContent=say('Download started. Check your device’s downloads.','เริ่มดาวน์โหลดแล้ว ตรวจสอบโฟลเดอร์ดาวน์โหลดของคุณ');setTimeout(()=>URL.revokeObjectURL(url),2000);
  }
  function updateTimeFields(){
    const mode=fields.timeMode.value;
    document.getElementById('exact-time-field').hidden=mode!=='exact';
    document.getElementById('approximate-time-field').hidden=mode!=='approximate';
    fields.birthTime.disabled=mode!=='exact';fields.birthTime.required=mode==='exact';
    fields.timeWindow.disabled=mode!=='approximate';
    document.getElementById('time-note').textContent=t(mode==='unknown'?'unknownNote':'knownNote');
  }
  function translateBirthFields(){
    const month=fields.birthMonth.value;
    const formatter=new Intl.DateTimeFormat(language==='th'?'th-TH':'en-GB',{month:'long',timeZone:'UTC'});
    fields.birthMonth.innerHTML=`<option value="">${t('chooseMonth')}</option>`+Array.from({length:12},(_,i)=>`<option value="${i+1}">${formatter.format(new Date(Date.UTC(2000,i,1)))}</option>`).join('');
    fields.birthMonth.value=month;
    document.getElementById('birth-year-label').textContent=t(fields.birthEra.value==='be'?'yearBE':'yearCE');
    fields.birthYear.placeholder=fields.birthEra.value==='be'?'2538':'1995';
  }
  function syncBirthDate(){
    fields.birthDate.value='';
    let message='';
    const complete=fields.birthDay.value&&fields.birthMonth.value&&fields.birthYear.value.length===4;
    if(complete){
      try{
        const value=engine.birthDateFromParts(fields.birthDay.value,fields.birthMonth.value,fields.birthYear.value,fields.birthEra.value);
        if(value>engine.todayISO())throw new Error('FUTURE_BIRTH_DATE');
        fields.birthDate.value=value;
      }catch(error){message=i18n[language].errors[error.message]||i18n[language].errors.INVALID_DATE;}
    }
    fields.birthYear.setCustomValidity(message);
    fields.birthYear.setAttribute('aria-invalid',String(Boolean(message)));
    const error=document.getElementById('birth-date-error');error.textContent=message;error.hidden=!message;
  }
  function setBirthDate(value){
    const [year,month,day]=value.split('-');
    fields.birthDay.value=String(Number(day));fields.birthMonth.value=String(Number(month));
    fields.birthYear.value=String(Number(year)+(fields.birthEra.value==='be'?543:0)).padStart(4,'0');
    syncBirthDate();updateDateConfirmations();
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
    syncBirthDate();
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
    document.getElementById('plan-page').innerHTML=`<div class="method-summary"><div class="page-heading"><p class="eyebrow">MOOJAI · ${say('HOW IT WORKS','วิธีการอ่าน')}</p><h1>${say('A perspective. Not a promise.','มุมมองหนึ่ง ไม่ใช่คำยืนยันอนาคต')}</h1><p class="lede">${say('A little space to reflect on what matters and choose a next step of your own.','พื้นที่เล็ก ๆ ให้ทบทวนสิ่งสำคัญ แล้วเลือกก้าวต่อไปด้วยตัวคุณเอง')}</p></div>
    <details open><summary>${say('What is a reading?','คำอ่านคืออะไร?')}</summary><p>${say('Original Thai and English stories are selected using your birth date, an optional time window and your reading period. It is an editorial reflection for entertainment, not a traditional birth chart or a validated prediction.','คัดเลือกงานเขียนไทยและอังกฤษตามวันเกิด ช่วงเวลาเกิดที่เลือก และช่วงที่อ่าน เป็นมุมมองเพื่อความบันเทิง ไม่ใช่การผูกดวงดั้งเดิมหรือคำทำนายที่ผ่านการรับรอง')}</p></details>
    <details><summary>${say('Why can readings repeat?','ทำไมคำอ่านจึงอาจซ้ำกัน?')}</summary><p>${say('The same details and period return the same reading. Both reading modes share a weekly theme; the specific day adds variation in the topic passages. Our story library is finite, so different people can receive the same passages.','ข้อมูลและช่วงเวลาเดิมได้คำอ่านเดิม ทั้งสองโหมดใช้ธีมรายสัปดาห์ร่วมกัน โหมดเฉพาะวันเพิ่มความต่างในบทแต่ละด้าน คลังเรื่องมีจำกัด คนต่างกันจึงอาจได้บทเดียวกัน')}</p></details>
    <details><summary>${say('What if I do not know my birth time?','ไม่ทราบเวลาเกิดได้ไหม?')}</summary><p>${say('Leave the time unknown. We do not invent a time for you. Known times use six four-hour windows, without claiming minute-level precision. CE and Buddhist Era years are both supported.','เลือกไม่ทราบเวลาได้ เราไม่สมมติเวลาให้ เวลาเกิดแบ่งเป็นหกช่วง ช่วงละสี่ชั่วโมง โดยไม่อ้างความละเอียดระดับนาที กรอกปีได้ทั้ง ค.ศ. และ พ.ศ.')}</p></details>
    <details><summary>${say('Are charms connected to my reading?','การ์ดเกี่ยวกับคำอ่านอย่างไร?')}</summary><p>${say('The activities are separate. Your reading does not determine a collectible card. Charms are random draws with published rarity odds and a category preference promise. Duplicates are possible. A drawn charm becomes a companion in Pet World.','ทั้งสองกิจกรรมแยกจากกัน คำอ่านไม่กำหนดการ์ดสะสม การ์ดสุ่มตามโอกาสความหายากและกติกาหมวดที่เลือก อาจได้การ์ดซ้ำ การ์ดที่สุ่มได้จะเป็นน้องคู่ใจในโลกมูใจ')}</p><a href="charms.html">${say('Explore the charms','สำรวจการ์ด')}</a></details>
    <details><summary>${say('What stays private?','ข้อมูลไหนเป็นส่วนตัว?')}</summary><p>${t('privacyDetails')}</p></details>
    <details><summary>${say('Explore the original stories','สำรวจเรื่องราวต้นฉบับ')}</summary><p>${say('Browse 52 core stories, four banks of 16 topic passages and supporting reflections. These texts are original editorial drafts; practitioner review and traditional chart integration are not connected.','อ่าน 52 แกนเรื่อง คลังบทเฉพาะด้านสี่ชุด ชุดละ 16 บท และข้อคิดประกอบ เป็นงานเขียนต้นฉบับ ยังไม่ได้เชื่อมวิธีผูกดวงดั้งเดิมหรือผ่านการตรวจรับรองโดยผู้เชี่ยวชาญ')}</p><a href="fortune-library-th-en.html" target="_blank" rel="noopener">${say('Read the bilingual catalogue','อ่านฉบับสองภาษา')}</a> · <a href="fortune-library.json" download>JSON</a></details></div>`;
  }
  function closeMenu(){document.querySelector('.site-header').classList.remove('menu-open');document.querySelector('.menu-toggle').setAttribute('aria-expanded','false');}
  function setPage(next){page=['reading','library','plan'].includes(next)?next:'reading';document.querySelectorAll('.page').forEach(section=>section.hidden=section.id!==page+'-page');document.querySelectorAll('[data-page]').forEach(button=>{if(button.dataset.page===page)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});closeMenu();if(page==='library')renderLibrary();if(page==='plan')renderPlan();}
  function translate(){
    document.documentElement.lang=language;
    document.querySelectorAll('[data-i18n]').forEach(node=>node.textContent=t(node.dataset.i18n));
    document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
    document.querySelector('.menu-toggle').setAttribute('aria-label',language==='th'?'เปิดหรือปิดเมนู':'Toggle navigation');
    if(document.getElementById('hero-card'))document.getElementById('hero-card').alt=language==='th'?'พระจันทร์ทรงม้าขาวใต้แสงจันทร์ ภาพประกอบศิลปะไทย':'Phra Chan on a white horse under the moon, an original Thai-inspired illustration';
    const filter=document.getElementById('phase-filter'),selected=filter.value;
    filter.innerHTML=`<option value="all">${t('allPhases')}</option>`+lib.phases.map(p=>`<option value="${p.id}">${p[language]}</option>`).join('');filter.value=selected||'all';
    document.getElementById('library-search').placeholder=language==='th'?'เช่น โอกาส ความรัก C01':'Try opportunity, love or C01';
    translateBirthFields();translateContextOptions();refreshDateLimits();updateTimeFields();updateReadingFields();renderReading();renderLibrary();renderPlan();markIfStale();
  }
  function markIfStale(){
    if(!submittedProfile||!reading)return;
    const status=document.getElementById('reading-status'),stale=JSON.stringify(profile())!==JSON.stringify(submittedProfile),expired=reading.periodStart<engine.todayISO();
    status.classList.toggle('is-stale',stale||expired);
    status.textContent=expired?t('expired'):stale?t('stale'):periodLabel(reading);
  }
  form.addEventListener('submit',event=>{event.preventDefault();refreshDateLimits();if(form.reportValidity()){if(sampleBackup&&JSON.stringify(profile())!==JSON.stringify(submittedProfile)){sampleBackup=null;document.getElementById("example-notice").hidden=true;}runReading(true);}});
  form.addEventListener('input',event=>{if(event.target===fields.birthEra)return;document.getElementById('form-error').hidden=true;document.getElementById('example-notice').hidden=true;refreshDateLimits();updateDateConfirmations();markIfStale();});
  fields.birthEra.addEventListener('change',()=>{
    // Preserve the entered birthday when changing calendars; never guess the era from a year.
    const selectedDate=fields.birthDate.value;
    if(selectedDate)setBirthDate(selectedDate);
    document.getElementById('form-error').hidden=true;
    translateBirthFields();refreshDateLimits();updateDateConfirmations();markIfStale();
  });
  fields.timeMode.addEventListener('change',()=>{updateTimeFields();markIfStale();});
  document.querySelectorAll('[name=readingMode]').forEach(input=>input.addEventListener('change',()=>{updateReadingFields();markIfStale();}));
  document.querySelectorAll('[data-week]').forEach(button=>button.addEventListener('click',()=>{weeklyChoice=button.dataset.week;refreshDateLimits();updateDateConfirmations();markIfStale();}));
  const premiumDialog=document.getElementById('custom-week-dialog');
  document.getElementById('custom-week-locked').addEventListener('click',()=>premiumDialog.showModal());
  document.getElementById('close-custom-week').addEventListener('click',()=>premiumDialog.close());
  document.addEventListener('moojai:language',event=>{language=event.detail;translate();});
  document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>{location.hash=button.dataset.page;setPage(button.dataset.page);window.scrollTo({top:0,behavior:'instant'});}));
  document.querySelectorAll('.start-reading').forEach(button=>button.addEventListener('click',()=>{const start=document.getElementById('start');start.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});start.focus({preventScroll:true});}));
  function restoreProfile(){
    if(!sampleBackup)return;
    const saved=sampleBackup;sampleBackup=null;
    for(const [name,value] of Object.entries(saved.values)){const field=fields.namedItem(name);if(field)field.value=value;}
    weeklyChoice=saved.week;reading=saved.reading;submittedProfile=saved.submitted;
    document.getElementById('example-notice').hidden=true;
    document.getElementById('results').hidden=!reading;
    syncBirthDate();updateTimeFields();updateReadingFields();renderReading();markIfStale();
  }
  document.getElementById('restore-profile').onclick=restoreProfile;
  document.getElementById('sample-reading').addEventListener('click',()=>{
    if(!sampleBackup)sampleBackup={values:Object.fromEntries([...new Set([...fields].filter(f=>f.name).map(f=>f.name))].map(name=>[name,fields.namedItem(name).value])),week:weeklyChoice,reading,submitted:submittedProfile};setBirthDate('1995-06-12');fields.timeMode.value='exact';fields.birthTime.value='08:30';fields.timeWindow.value='2';fields.readingMode.value='week';weeklyChoice='this';document.getElementById('example-notice').hidden=false;updateTimeFields();updateReadingFields();runReading(true);});
  let printDetails=[];
  window.addEventListener('beforeprint',()=>{printDetails=[...document.querySelectorAll('#reading-result details:not([open])')];printDetails.forEach(d=>d.open=true);});
  window.addEventListener('afterprint',()=>{printDetails.forEach(d=>d.open=false);printDetails=[];});
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
  if(location.hash==='#privacy')document.getElementById('privacy-dialog').showModal();
})();
