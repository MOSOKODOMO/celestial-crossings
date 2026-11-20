const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const E = require('../dist/collect-engine.js');
const W = require('../dist/world-core.js');
const root = path.join(__dirname, '..');
const A='aaaaaaaa-1111-4111-8111-111111111111', B='bbbbbbbb-2222-4222-8222-222222222222', C='cccccccc-3333-4333-8333-333333333333';
let pg;
test.before(async () => {
  pg = new PGlite();
  await pg.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    grant usage on schema auth to authenticated, service_role;
    create schema realtime; create table realtime.messages(topic text, extension text, payload jsonb);
    alter table realtime.messages enable row level security;
    create function realtime.topic() returns text language sql stable as $$select current_setting('realtime.topic',true)$$;
    grant usage on schema realtime to authenticated;
    grant select, insert on realtime.messages to authenticated;
  `);
  await pg.exec(fs.readFileSync(path.join(root,'supabase/schema.sql'),'utf8'));
  await pg.exec(fs.readFileSync(path.join(root,'supabase/world.sql'),'utf8'));
  await pg.exec(fs.readFileSync(path.join(root,'supabase/world.sql'),'utf8')); // repeatable setup
  await pg.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261120221939_paid_card_bundles.sql'),'utf8'));
  await pg.exec(fs.readFileSync(path.join(root,'supabase/migrations/20261120222050_account_access_hardening.sql'),'utf8'));
  await pg.query('insert into auth.users(id) values ($1),($2),($3)',[A,B,C]);
});
test.after(async()=>pg?.close());
async function as(role,id,work){
  await pg.exec(`set role ${role}`);
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);
  try{return await work();}finally{await pg.exec('reset role');}
}
test('browser and Edge rule copies are byte-identical',()=>{
  for(const file of ['collect-engine.js','world-core.js'])assert.deepEqual(fs.readFileSync(path.join(root,'dist',file)),fs.readFileSync(path.join(root,'supabase/functions/_shared',file)));
});
test('payment records are idempotent and only readable by their owner',async()=>{
  const insert=()=>pg.query("insert into public.entitlements(user_id,product,stripe_session_id,amount_total,currency) values($1,'cardWallpaper','cs_test_database',4900,'thb') on conflict(stripe_session_id) do nothing",[A]);
  await as('service_role',null,async()=>{await insert();await insert();assert.equal((await pg.query('select count(*)::int n from public.entitlements')).rows[0].n,1);});
  await as('authenticated',A,async()=>{assert.equal((await pg.query('select * from public.entitlements')).rows.length,1);await assert.rejects(insert(),/permission denied/);});
  await as('authenticated',B,async()=>{assert.equal((await pg.query('select * from public.entitlements')).rows.length,0);await assert.rejects(pg.query('delete from public.entitlements'),/permission denied/);});
  await as('anon',null,async()=>{await assert.rejects(pg.query('select * from public.entitlements'),/permission denied/);});
});
test('bundle fulfillment grants one exact card, retries do not duplicate it, and refund removes only the purchased copy',async()=>{
  await as('service_role',null,async()=>{
    const grant=()=>pg.query("select public.fulfill_card_bundle($1,'cs_test_bundle','pi_bundle','growth-SR') as result",[C]);
    await grant();assert.equal((await grant()).rows[0].result.replayed,true);
    await assert.rejects(pg.query("select public.fulfill_card_bundle($1,'cs_test_bundle','pi_bundle','growth-C')",[C]),/purchase_mismatch/);
    assert.equal((await pg.query("select quantity from public.charm_collection where user_id=$1 and card_id='growth-SR'",[C])).rows[0].quantity,1);
    await pg.query("update public.charm_collection set quantity=2 where user_id=$1 and card_id='growth-SR'",[C]);
    await pg.query("select public.revoke_card_bundle('pi_bundle')");await pg.query("select public.revoke_card_bundle('pi_bundle')");
    assert.equal((await pg.query("select quantity from public.charm_collection where user_id=$1 and card_id='growth-SR'",[C])).rows[0].quantity,1);
    assert.equal((await grant()).rows[0].result.revoked,true);
    await pg.query("select public.revoke_card_bundle('pi_before')");
    assert.equal((await pg.query("select public.fulfill_card_bundle($1,'cs_test_earlyrefund','pi_before','growth-C') result",[C])).rows[0].result.revoked,true);
    assert.equal((await pg.query("select * from public.entitlements where payment_intent_id='pi_before'")).rows.length,0);
  });
  await as('authenticated',B,async()=>{await assert.rejects(pg.query("select public.fulfill_card_bundle($1,'cs_fake','pi_fake','growth-SSR')",[B]),/permission denied/);});
});
test('draw RPC atomically grants one card and replays a request without spending twice',async()=>{
  const out=E.draw(E.initialState(),()=>.5),request=crypto.randomUUID();
  const commit=()=>pg.query('select public.commit_draw($1,$2,$3,$4,$5,$6) result',[A,request,0,out.state,out.result,5]);
  await as('service_role',null,async()=>{
    const first=(await commit()).rows[0].result;const second=(await commit()).rows[0].result;
    assert.deepEqual(first.result,second.result);assert.equal(second.replayed,true);
    assert.equal((await pg.query('select quantity from public.charm_collection where user_id=$1',[A])).rows[0].quantity,1);
    assert.equal((await pg.query('select free_draws_used from public.draw_state where user_id=$1',[A])).rows[0].free_draws_used,1);
    const next=E.draw(out.state,()=>.2);
    await assert.rejects(pg.query('select public.commit_draw($1,$2,0,$3,$4,5)',[A,crypto.randomUUID(),next.state,next.result]),/version_conflict/);
    assert.equal((await pg.query('select count(*)::int n from public.draw_history where user_id=$1',[A])).rows[0].n,1);
  });
});
test('allowance rejection rolls back state, collection, audit and roster together',async()=>{
  await as('service_role',null,async()=>{
    const row=(await pg.query('select state,version from public.draw_state where user_id=$1',[A])).rows[0],out=E.draw(row.state,()=>.7);
    await assert.rejects(pg.query('select public.commit_draw($1,$2,$3,$4,$5,1)',[A,crypto.randomUUID(),row.version,out.state,out.result]),/daily_limit/);
    assert.equal((await pg.query('select version from public.draw_state where user_id=$1',[A])).rows[0].version,1);
    assert.equal((await pg.query('select sum(quantity)::int n from public.charm_collection where user_id=$1',[A])).rows[0].n,1);
  });
});
test('RLS prevents inventory writes, reads of another inventory, and forged reports',async()=>{
  await as('authenticated',B,async()=>{
    assert.equal((await pg.query('select * from public.charm_collection')).rows.length,0);
    await assert.rejects(pg.query('insert into public.charm_collection(user_id,card_id,quantity) values($1,\'love-SSR\',1)',[B]),/permission denied/);
    await assert.rejects(pg.query('select public.commit_draw($1,$2,0,$3,$4,5)',[B,crypto.randomUUID(),E.initialState(),{}]),/permission denied/);
    assert.ok((await pg.query('select card_ids from public.world_roster where user_id=$1',[A])).rows[0].card_ids.length);
    await assert.rejects(pg.query('update public.world_roster_data set card_ids=\'{love-SSR}\''),/permission denied/);
    await assert.rejects(pg.query('insert into public.chat_reports(reporter_id,reported_id,reason,messages) values($1,$2,\'scam\',\'[]\')',[A,B]),/row-level security/);
    await pg.query('insert into public.chat_reports(reporter_id,reported_id,reason,messages) values($1,$2,\'scam\',\'[]\')',[B,A]);
    await assert.rejects(pg.query('select * from public.chat_reports'),/permission denied/);
  });
  await as('anon',null,async()=>await assert.rejects(pg.query('select * from public.world_roster'),/permission denied/));
});
test('private topics bind senders to their account and room; shared lobby allows presence only',async()=>{
  await as('authenticated',A,()=>pg.query("select public.world_join('Mali')"));
  await as('authenticated',B,async()=>{
    await pg.query("select public.world_join('Bua')");
    async function allowed(topic,writing,kind){return(await pg.query('select moojai_private.world_topic_allowed($1,$2,$3) ok',[topic,writing,kind])).rows[0].ok;}
    assert.equal(await allowed(`world:lobby-1:${B}`,true,'broadcast'),true);
    assert.equal(await allowed(`world:lobby-1:${A}`,true,'broadcast'),false);
    assert.equal(await allowed(`world:lobby-1:${A}`,false,'broadcast'),true);
    assert.equal(await allowed('world:lobby-1',true,'presence'),true);
    assert.equal(await allowed('world:lobby-1',true,'broadcast'),false);
    assert.equal(await allowed(`world:lobby-2:${B}`,true,'broadcast'),false);
    assert.equal((await pg.query('select * from public.world_members()')).rows.length,2);
    await pg.query("select set_config('realtime.topic',$1,false)",[`world:lobby-1:${A}`]);
    await assert.rejects(pg.query("insert into realtime.messages(topic,extension) values('ignored','broadcast')"),/row-level security/);
  });
});
test('the 41st active account gets lobby 2',async()=>{
  for(let i=3;i<=41;i++){
    const id=`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`;
    await pg.query('insert into auth.users(id) values($1)',[id]);
    const room=await as('authenticated',id,async()=>(await pg.query("select public.world_join('Visitor') room")).rows[0].room.room);
    assert.equal(room,i<=40?1:2);
  }
});
test('stardust action retries are idempotent and browser roles cannot change the ledger',async()=>{
  const ledger=W.claimVisit(W.freshLedger(),new Date('2026-11-20T12:00:00Z')).ledger,request=crypto.randomUUID();
  await as('service_role',null,async()=>{
    const call=()=>pg.query('select public.commit_world_action($1,$2,0,$3) result',[A,request,{ledger,gained:3}]);
    await call();await call();
    assert.equal((await pg.query('select version from public.world_state where user_id=$1',[A])).rows[0].version,1);
  });
  await as('authenticated',A,async()=>{
    await assert.rejects(pg.query("update public.world_state set ledger='{}'"),/permission denied/);
    await assert.rejects(pg.query('select public.commit_world_action($1,$2,1,$3)',[A,crypto.randomUUID(),{ledger}]),/permission denied/);
  });
});
test('server orchestration retries conflicts and preserves the ten-draw intention lock',async()=>{
  const {drawForUser}=await import('../supabase/functions/_shared/draw-service.mjs');
  let state=E.initialState(),version=0,conflict=true,commits=0;
  const db=async(path,body)=>{
    if(path.startsWith('draw_history'))return[];
    if(path.startsWith('draw_state'))return[{state,version}];
    if(conflict){conflict=false;throw new Error('version_conflict');}
    assert.equal(body.p_version,version);commits++;state=body.p_state;version++;
    return{state,result:body.p_result};
  };
  await drawForUser({engine:E,db,userId:A,requestId:crypto.randomUUID(),preferences:['love','career']});
  assert.equal(commits,1);assert.equal(state.total,1);
  await assert.rejects(drawForUser({engine:E,db,userId:A,requestId:crypto.randomUUID(),preferences:['growth','wealth']}),/preferences_locked/);
});
test('a failed lotus insert rolls back its stardust debit',async()=>{
  await as('service_role',null,async()=>{
    const before=(await pg.query('select ledger,version from public.world_state where user_id=$1',[A])).rows[0];
    const bad={ledger:{...before.ledger,earned:40,spent:25},lotus:{key:crypto.randomUUID(),x:999,z:52,expires:Date.now()+3600000}};
    await assert.rejects(pg.query('select public.commit_world_action($1,$2,$3,$4)',[A,crypto.randomUUID(),before.version,bad]),/check constraint/);
    const after=(await pg.query('select ledger,version from public.world_state where user_id=$1',[A])).rows[0];
    assert.deepEqual(after,before);
  });
});
test('forged pet claims fail closed, including followers and mismatched sender identity',()=>{
  const state={id:A,name:'Mali',x:1180,y:1060,pet:'love-SSR',followers:['career-C','wealth-SSR']};
  assert.equal(W.authorizeState(state,B,['love-SSR']),null);
  const safe=W.authorizeState(state,A,['career-C']);assert.equal(safe.pet,null);assert.deepEqual(safe.followers,['career-C']);
  assert.equal(W.authorizeState(state,A,null).pet,null);
});
