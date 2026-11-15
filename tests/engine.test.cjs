const test=require('node:test');
const assert=require('node:assert/strict');
const lib=require('../content/library.cjs');
const engine=require('../dist/engine.js');
const base={birthDate:'1995-06-12',birthTime:'08:30',timeMode:'exact',timeWindow:'2',readingDate:'2026-11-04'};
const read=(profile,options={today:'2026-11-02'})=>engine.read(lib,profile,options);
const ids=r=>[r.core.id,...Object.values(r.parts).map(p=>p.id),r.weekday.id,r.timeBand.id];

test('direct birthday entry supports CE and BE without silently repairing invalid dates',()=>{
  assert.equal(engine.birthDateFromParts('29','2','2000','ce'),'2000-02-29');
  assert.equal(engine.birthDateFromParts('29','2','2543','be'),'2000-02-29');
  assert.equal(engine.birthDateFromParts('12','6','2538','be'),'1995-06-12');
  for(const parts of [['31','4','1995'],['29','2','1900'],['0','1','1995'],['1','13','1995'],['1','1','95'],['1','1','0000'],['1','1','0543','be'],['1','1','1995','bad']])assert.throws(()=>engine.birthDateFromParts(...parts),/INVALID_DATE/);
});

test('future stories stay stable across reading modes, time choices, and future reading dates',()=>{
  const future=read(base).future;
  for(const changes of [{readingDate:'2026-11-11'},{readingMode:'day',readingDate:'2027-05-01'},{timeMode:'unknown'},{birthTime:'22:00'}])assert.deepEqual(read({...base,...changes}).future,future);
  assert.equal(future.chapters.length,4);
  assert.deepEqual(new Set(future.chapters.map(c=>c.theme)),new Set(['career','family','wealth','legacy']));
  assert.match(future.note.en,/imagined.*entertainment/i);
});

test('future chapters are bilingual, age-aware, varied, and never put a milestone in the past',()=>{
  const stories=new Set();
  for(const birthDate of ['2026-11-04','2012-02-29','1995-06-12','1980-01-01','1960-12-31','1926-11-04']){
    const future=engine.futureStory(lib,birthDate,'2026-11-04');
    for(const chapter of future.chapters){
      assert.ok(chapter.startAge>future.age);assert.ok(chapter.endAge>chapter.startAge);
      assert.ok(chapter.title.th&&chapter.title.en&&chapter.text.en.length>100);assert.match(chapter.text.th,/[ก-๙]/);
    }
    const family=future.chapters.find(c=>c.theme==='family');
    if(future.age>42)assert.match(family.id,/^FN/);
    else assert.ok(family.startAge>=28);
    stories.add(future.chapters.map(c=>c.id).join('|'));
  }
  assert.ok(stories.size>=3);
  assert.equal(engine.futureStory(lib,'2000-02-29','2026-02-28').age,25);
  assert.equal(engine.futureStory(lib,'2000-02-29','2026-03-01').age,26);
  assert.throws(()=>engine.futureStory(lib,'2027-01-01','2026-11-04'),/FUTURE_BIRTH_DATE/);
});
test('bilingual editorial inventory is complete and every phase has four domain options',()=>{
  assert.equal(lib.cores.length,52);assert.equal(Object.values(lib.domains).flat().length,64);assert.equal(lib.weekdays.length,7);assert.equal(lib.timeBands.length,7);
  const all=[...lib.cores,...Object.values(lib.domains).flat(),...lib.weekdays,...lib.timeBands];
  assert.equal(new Set(all.map(r=>r.id)).size,130);
  for(const record of all){assert.ok(record.title.th&&record.title.en);assert.ok(record.text.th.length>20&&record.text.en.length>20);assert.match(record.text.th,/[ก-๙]/);assert.ok(!record.text.th.includes('TODO'));}
  for(const domain of Object.values(lib.domains))for(const phase of lib.phases)assert.equal(domain.filter(item=>item.phase===phase.id).length,4);
  for(const domain of Object.values(lib.domains))assert.equal(new Set(domain.map(r=>r.text.th)).size,16);
  assert.equal(new Set(lib.cores.map(r=>r.text.th)).size,52);
});
test('all days in ordinary and leap years map to one of 52 exhaustive bands',()=>{
  for(const year of [1900,2000,2025,2026,2028,2100]){
    const counts=Array(52).fill(0);let date=new Date(Date.UTC(year,0,1));
    while(date.getUTCFullYear()===year){const band=engine.birthBand(date.toISOString().slice(0,10));assert.ok(band>=1&&band<=52);counts[band-1]++;date.setUTCDate(date.getUTCDate()+1);}
    assert.ok(counts.every(count=>count>=7));assert.equal(counts[51],8);
  }
  assert.equal(engine.birthBand('2026-01-01'),1);assert.equal(engine.birthBand('2026-01-07'),1);assert.equal(engine.birthBand('2026-01-08'),2);
  assert.equal(engine.birthBand('2026-12-31'),52);assert.equal(engine.birthBand('2000-02-29'),engine.birthBand('2000-02-28'));
  for(const day of ['2026-03-01','2026-12-24'])assert.equal(engine.birthBand(day),engine.birthBand(day.replace('2026','2028')));
});
test('date validation rejects invalid and future birthdays without changing legitimate dates',()=>{
  for(const date of ['1900-02-29','2026-02-29','2026-04-31','2026-00-12','2026-13-01','bad','0000-01-01'])assert.throws(()=>engine.parseDate(date),/INVALID_DATE/);
  assert.equal(engine.parseDate('2000-02-29').getUTCDay(),2);
  assert.throws(()=>read({...base,birthDate:'2027-01-01'},{today:'2026-11-04'}),/FUTURE_BIRTH_DATE/);
  assert.throws(()=>read({...base,readingDate:'1990-01-01'}),/READING_BEFORE_BIRTH/);
});
test('reading dates allow today and the future but reject past days, even in the same week',()=>{
  const options={today:'2026-11-04'};
  assert.throws(()=>read({...base,readingDate:'2026-11-03'},options),/PAST_READING_DATE/);
  for(const date of ['2026-11-04','2026-11-05','2027-01-01'])assert.equal(read({...base,readingMode:'day',readingDate:date},options).readingDate,date);
  assert.throws(()=>read(base,{today:'2026-11-05'}),/PAST_READING_DATE/);
  for(const [today,yesterday] of [['2027-01-01','2026-12-31'],['2028-03-01','2028-02-29']]){
    assert.throws(()=>read({...base,readingDate:yesterday},{today}),/PAST_READING_DATE/);
    assert.equal(read({...base,readingDate:today},{today}).readingDate,today);
  }
});
test('today uses the local calendar and the default engine path also rejects yesterday',()=>{
  assert.equal(engine.todayISO(new Date(2026,10,4,0,1)),'2026-11-04');
  assert.equal(engine.todayISO(new Date(2026,10,4,23,59)),'2026-11-04');
  const today=engine.todayISO(),yesterday=engine.parseDate(today);yesterday.setUTCDate(yesterday.getUTCDate()-1);
  assert.throws(()=>engine.read(lib,{...base,readingDate:yesterday.toISOString().slice(0,10)}),/PAST_READING_DATE/);
  assert.equal(engine.read(lib,{...base,readingDate:today}).readingDate,today);
});
test('all 1440 minutes fit six windows, and unknown time is not midnight',()=>{
  for(let minute=0;minute<1440;minute++)assert.equal(engine.timeBand({...base,birthTime:`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`}),Math.floor(minute/240));
  assert.equal(engine.timeBand({...base,timeMode:'unknown',birthTime:''}),6);
  assert.equal(engine.timeBand({...base,timeMode:'approximate',timeWindow:'2',birthTime:''}),2);
  for(const time of ['24:00','12:60','-1:00','0:00',''])assert.throws(()=>engine.timeBand({...base,birthTime:time}),/INVALID_TIME/);
  assert.throws(()=>engine.timeBand({...base,timeMode:'approximate',timeWindow:''}),/INVALID_TIME_WINDOW/);
});
test('readings are stable throughout a week and change on the next Monday',()=>{
  const first=read({...base,readingDate:'2026-11-02'});
  for(const day of ['03','04','05','06','07','08'])assert.deepEqual(ids(read({...base,readingDate:`2026-11-${day}`})),ids(first));
  assert.notEqual(read({...base,readingDate:'2026-11-09'}).core.id,first.core.id);
  assert.deepEqual(ids(read(base)),ids(read(base)));
  assert.deepEqual(ids(read({...base,birthTime:'09:59'})),ids(read(base)));
  assert.deepEqual(ids(read({...base,timeMode:'approximate',timeWindow:'2'})),ids(read(base)));
  assert.equal(read({...base,readingDate:'2027-01-01'},{today:'2026-12-31'}).weekStart,'2026-12-28');
});
test('nearby birthdays share direction but time/day details provide variety',()=>{
  const directions=new Set(),combinations=new Set();
  for(const day of [12,13,14,15,16,17])for(let window=0;window<6;window++){
    const r=read({...base,birthDate:`1995-06-${day}`,birthTime:`${String(window*4).padStart(2,'0')}:00`});
    directions.add(r.core.id);combinations.add(Object.values(r.parts).map(p=>p.id).join('|'));
  }
  assert.equal(directions.size,1);assert.ok(combinations.size>20,`Only ${combinations.size} different topic sets`);
});
test('52 examples and a broad sweep stay coherent and reach every topic passage',()=>{
  const seen=new Set();
  for(const core of lib.cores){const sample=engine.example(lib,core);for(const p of Object.values(sample.parts))assert.equal(p.phase,core.phase);}
  for(let offset=0;offset<365;offset++)for(let window=0;window<6;window++){
    const birthday=new Date(Date.UTC(1996,0,1)+offset*86400000).toISOString().slice(0,10);
    const r=read({...base,birthDate:birthday,birthTime:`${String(window*4).padStart(2,'0')}:00`});
    for(const p of Object.values(r.parts)){assert.equal(p.phase,r.core.phase);seen.add(p.id);}
  }
  assert.equal(seen.size,64);
});
test('weekly periods exclude past days and future weeks retain Monday–Sunday boundaries',()=>{
  for(const [today,date,start,end] of [
    ['2026-11-04','2026-11-04','2026-11-04','2026-11-08'],
    ['2026-11-04','2026-11-07','2026-11-04','2026-11-08'],
    ['2026-11-08','2026-11-08','2026-11-08','2026-11-08'],
    ['2026-11-04','2026-11-11','2026-11-09','2026-11-15'],
    ['2026-12-31','2027-01-01','2026-12-31','2027-01-03'],
    ['2028-02-28','2028-02-29','2028-02-28','2028-03-05']
  ]){
    const r=read({...base,readingMode:'week',readingDate:date},{today});
    assert.equal(r.periodStart,start);assert.equal(r.periodEnd,end);assert.ok(r.periodStart>=today);
  }
});
test('specific-day readings keep the weekly theme but vary day details and stay reproducible',()=>{
  const weekly=read(base),daily=[];
  for(const day of ['04','05','06','07','08']){
    const profile={...base,readingDate:`2026-11-${day}`,readingMode:'day'};
    const r=read(profile);daily.push(Object.values(r.parts).map(p=>p.id).join('|'));
    assert.equal(r.core.id,weekly.core.id);assert.deepEqual(r,read(profile));
    assert.equal(r.periodStart,profile.readingDate);assert.equal(r.periodEnd,profile.readingDate);
    for(const part of Object.values(r.parts))assert.equal(part.phase,r.core.phase);
  }
  assert.ok(new Set(daily).size>=3);
  assert.notDeepEqual(ids(read({...base,readingMode:'day'})),ids(weekly));
  for(const readingMode of ['week','day'])assert.throws(()=>read({...base,readingMode,readingDate:'2026-11-03'},{today:'2026-11-04'}),/PAST_READING_DATE/);
});
test('occasion and support choices adapt advice without rerolling the reading',()=>{
  const generic=read({...base,readingMode:'day'}),advice=new Set();
  for(const occasion of lib.guidance.occasions)for(const support of lib.guidance.supports){
    const r=read({...base,readingMode:'day',occasion:occasion.id,support:support.id});
    assert.deepEqual(ids(r),ids(generic));
    assert.deepEqual(r.guidance.title,occasion.title);assert.deepEqual(r.guidance.outlook,occasion.outlooks[r.core.phase]);
    assert.deepEqual(r.guidance.plan,occasion.advice[support.id].plan);advice.add(r.guidance.plan.th);
  }
  assert.equal(advice.size,12);
  assert.deepEqual(read({...base,readingMode:'week',occasion:'date',support:'confidence'}),read({...base,readingMode:'week'}));
  for(const [property,value,code] of [['readingMode','month','INVALID_READING_MODE'],['occasion','bad','INVALID_OCCASION'],['support','bad','INVALID_SUPPORT']]){
    assert.throws(()=>read({...base,readingMode:'day',[property]:value}),new RegExp(code));
  }
});
test('all day and weekly guidance has complete Thai/English copy for each condition',()=>{
  const bilingual=value=>{assert.ok(value.th.length>4&&value.en.length>4);assert.match(value.th,/[ก-๙]/);};
  assert.equal(lib.guidance.occasions.length,3);assert.equal(lib.guidance.supports.length,4);
  for(const occasion of lib.guidance.occasions){
    bilingual(occasion.title);bilingual(occasion.goal);
    for(const phase of lib.phases)bilingual(occasion.outlooks[phase.id]);
    for(const support of lib.guidance.supports){bilingual(occasion.advice[support.id].watch);bilingual(occasion.advice[support.id].plan);assert.match(occasion.advice[support.id].plan.en,/^If /);}
  }
  for(const phase of lib.phases)for(const field of ['title','goal','watch','plan'])bilingual(lib.guidance.weekly[phase.id][field]);
});
test('other weeks stay locked without an explicit entitlement while day readings remain available',()=>{
  const options={today:'2026-11-04'};
  for(const date of ['2026-11-04','2026-11-08','2026-11-09','2026-11-15'])assert.doesNotThrow(()=>read({...base,readingDate:date},options));
  for(const date of ['2026-11-16','2027-02-01']){
    assert.throws(()=>read({...base,readingDate:date},options),/CUSTOM_WEEK_LOCKED/);
    assert.throws(()=>read({...base,readingDate:date,customWeekUnlocked:true},options),/CUSTOM_WEEK_LOCKED/);
    assert.throws(()=>read({...base,readingDate:date},{...options,customWeekUnlocked:'true'}),/CUSTOM_WEEK_LOCKED/);
    assert.equal(read({...base,readingDate:date},{...options,customWeekUnlocked:true}).readingDate,date);
    assert.equal(read({...base,readingMode:'day',readingDate:date},options).readingDate,date);
  }
  assert.throws(()=>read({...base,readingDate:'2026-11-03'},{...options,customWeekUnlocked:true}),/PAST_READING_DATE/);
  assert.throws(()=>read({...base,readingDate:'2026-11-16'},{today:'2026-11-08'}),/CUSTOM_WEEK_LOCKED/);
  assert.doesNotThrow(()=>read({...base,readingDate:'2026-11-16'},{today:'2026-11-09'}));
});
test('unknown birth time is its own reading state, never a midnight stand-in',()=>{
  let differs=0;
  for(let offset=0;offset<120;offset++){
    const birthDate=new Date(Date.UTC(1990,0,1)+offset*86400000).toISOString().slice(0,10);
    const unknown=read({...base,birthDate,timeMode:'unknown',birthTime:''}),midnight=read({...base,birthDate,birthTime:'00:00'});
    assert.equal(unknown.timeBand.id,'TU');assert.equal(unknown.timeBand.index,6);assert.equal(midnight.timeBand.id,'T0');
    assert.equal(unknown.core.id,midnight.core.id);
    if(Object.values(unknown.parts).map(p=>p.id).join()!==Object.values(midnight.parts).map(p=>p.id).join())differs++;
    // A stray clock value left in a hidden field must not leak into an unknown-time reading.
    assert.deepEqual(ids(read({...base,birthDate,timeMode:'unknown',birthTime:'00:00'})),ids(unknown));
  }
  assert.ok(differs>60,`unknown and midnight topic sets matched too often (${differs}/120 differ)`);
});
test('February 29 shares the February 28 band but keeps its own weekday and topic seed',()=>{
  const leap=read({...base,birthDate:'2000-02-29'}),feb28=read({...base,birthDate:'2000-02-28'});
  assert.equal(leap.birthBand,feb28.birthBand);assert.equal(leap.core.id,feb28.core.id);
  assert.equal(leap.weekday.id,'D2');assert.equal(feb28.weekday.id,'D1');
});
