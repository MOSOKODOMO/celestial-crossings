(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.FortuneEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DAY=86400000;
  const EPOCH=Date.UTC(2026,10,2);
  const mod=(n,d)=>((n%d)+d)%d;
  function parseDate(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');
    const [year,month,day]=value.split('-').map(Number);
    if(year<1||year>9999) throw new Error('INVALID_DATE');
    const date=new Date(0);date.setUTCFullYear(year,month-1,day);date.setUTCHours(0,0,0,0);
    if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day) throw new Error('INVALID_DATE');
    return date;
  }
  const iso=date=>date.toISOString().slice(0,10);
  function todayISO(now=new Date()){
    // Use the laptop's local calendar date, not the date at UTC midnight.
    return `${String(now.getFullYear()).padStart(4,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  }
  function birthDateFromParts(day,month,year,era='ce'){
    if(!/^\d{1,2}$/.test(String(day))||!/^\d{1,2}$/.test(String(month))||!/^\d{4}$/.test(String(year))||!['ce','be'].includes(era))throw new Error('INVALID_DATE');
    const gregorian=Number(year)-(era==='be'?543:0);
    const value=`${String(gregorian).padStart(4,'0')}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    parseDate(value);
    return value;
  }
  function weekStart(value){const date=parseDate(value);date.setUTCDate(date.getUTCDate()-mod(date.getUTCDay()+6,7));return date;}
  function birthBand(value){
    const date=parseDate(value),month=date.getUTCMonth(),day=date.getUTCDate();
    const normalized=Date.UTC(2001,month,month===1&&day===29?28:day);
    const ordinal=Math.round((normalized-Date.UTC(2001,0,1))/DAY)+1;
    return Math.min(52,Math.floor((ordinal-1)/7)+1);
  }
  function bandRange(number){
    if(!Number.isInteger(number)||number<1||number>52) throw new Error('INVALID_BAND');
    const first=new Date(Date.UTC(2001,0,1)+(number-1)*7*DAY);
    const last=new Date(Date.UTC(2001,0,1)+(number===52?364:number*7-1)*DAY);
    return {start:iso(first).slice(5),end:iso(last).slice(5)};
  }
  function timeBand(profile){
    if(profile.timeMode==='unknown') return 6;
    if(profile.timeMode==='approximate'){
      const n=Number(profile.timeWindow);
      if(profile.timeWindow===''||profile.timeWindow==null||!Number.isInteger(n)||n<0||n>5) throw new Error('INVALID_TIME_WINDOW');
      return n;
    }
    if(profile.timeMode!=='exact'||typeof profile.birthTime!=='string'||!/^\d{2}:\d{2}$/.test(profile.birthTime)) throw new Error('INVALID_TIME');
    const [h,m]=profile.birthTime.split(':').map(Number);
    if(h>23||m>59) throw new Error('INVALID_TIME');
    return Math.floor((h*60+m)/240);
  }
  function hash(value){
    let x=2166136261;
    for(let i=0;i<value.length;i++){x^=value.charCodeAt(i);x=Math.imul(x,16777619);}
    x^=x>>>16;x=Math.imul(x,0x85ebca6b);x^=x>>>13;x=Math.imul(x,0xc2b2ae35);x^=x>>>16;
    return x>>>0;
  }
  function candidates(library,domain,phase){
    const pool=library.domains[domain]?.filter(item=>item.phase===phase);
    if(!pool||pool.length!==4) throw new Error('INVALID_CONTENT_POOL');
    return pool;
  }
  function futureStory(library,birthDate,today){
    const birth=parseDate(birthDate),now=parseDate(today),bank=library.futureStories;
    if(birth>now)throw new Error('FUTURE_BIRTH_DATE');
    const age=now.getUTCFullYear()-birth.getUTCFullYear()-(today.slice(5)<birthDate.slice(5)?1:0);
    // The story depends on the birthday and age, never the reading mode, week, or language.
    const seed=`${bank.version}|${birthDate}`;
    const stages=[['career',22,2,7],['family',28,5,7],['wealth',38,9,11],['legacy',55,14,9]];
    const chapters=stages.map(([theme,minimum,offset,spread])=>{
      const startAge=Math.max(minimum+hash(`${seed}|${theme}|age`)%spread,age+offset);
      const pool=bank.chapters[theme==='family'&&startAge>42?'connection':theme];
      const record=pool[hash(`${seed}|${theme}|text`)%pool.length];
      return {...record,theme,startAge,endAge:startAge+3};
    }).sort((a,b)=>a.startAge-b.startAge);
    return {version:bank.version,intro:bank.intro,note:bank.note,age,chapters};
  }
  function read(library,profile,options={}){
    const birthday=parseDate(profile.birthDate),readingDate=parseDate(profile.readingDate);
    const today=parseDate(options.today??todayISO());
    if(birthday>today) throw new Error('FUTURE_BIRTH_DATE');
    if(readingDate<birthday) throw new Error('READING_BEFORE_BIRTH');
    if(readingDate<today) throw new Error('PAST_READING_DATE');
    const mode=profile.readingMode??'week';
    if(!['week','day'].includes(mode)) throw new Error('INVALID_READING_MODE');
    const occasion=mode==='day'?(profile.occasion??'general'):'general';
    const support=mode==='day'?(profile.support??'balanced'):'balanced';
    const context=library.guidance.occasions.find(item=>item.id===occasion);
    if(!context) throw new Error('INVALID_OCCASION');
    if(!library.guidance.supports.some(item=>item.id===support)) throw new Error('INVALID_SUPPORT');
    const band=birthBand(profile.birthDate),window=timeBand(profile),monday=weekStart(profile.readingDate);
    // Local demo gate. A production service must verify purchase entitlements server-side.
    const freeWeekLimit=weekStart(iso(today)).getTime()+7*DAY;
    if(mode==='week'&&monday.getTime()>freeWeekLimit&&options.customWeekUnlocked!==true) throw new Error('CUSTOM_WEEK_LOCKED');
    const week=Math.round((monday.getTime()-EPOCH)/(7*DAY));
    const index=mod(band-1+week,52);
    const core=library.cores[index];
    if(!core) throw new Error('MISSING_CORE');
    const seed=`${library.contentVersion}|${profile.birthDate}|${window}|${iso(monday)}`+(mode==='day'?`|day|${profile.readingDate}`:'');
    const parts=Object.fromEntries(Object.keys(library.domains).map(domain=>{
      const pool=candidates(library,domain,core.phase);
      return [domain,pool[hash(`${seed}|${domain}`)%pool.length]];
    }));
    const weekEnd=iso(new Date(monday.getTime()+6*DAY));
    const guidance=mode==='day'?{title:context.title,goal:context.goal,outlook:context.outlooks[core.phase],...context.advice[support]}:library.guidance.weekly[core.phase];
    return {core,parts,mode,occasion,support,guidance,guidanceVersion:library.guidance.version,future:futureStory(library,profile.birthDate,iso(today)),
      periodStart:mode==='day'?profile.readingDate:iso(monday<today?today:monday),periodEnd:mode==='day'?profile.readingDate:weekEnd,
      birthBand:band,weekday:library.weekdays[birthday.getUTCDay()],timeBand:library.timeBands[window],timeMode:profile.timeMode,weekStart:iso(monday),weekEnd,readingDate:profile.readingDate,contentVersion:library.contentVersion};
  }
  function example(library,core){
    const themeIndex=Math.floor((core.number-1)/4);
    return {core,parts:Object.fromEntries(Object.keys(library.domains).map((domain,i)=>[domain,candidates(library,domain,core.phase)[(themeIndex+i)%4]]))};
  }
  return {parseDate,todayISO,birthDateFromParts,weekStart,birthBand,bandRange,timeBand,hash,futureStory,read,example};
});
