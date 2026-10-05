const C=window.EF_CONFIG||{};const online=!!(C.SUPABASE_URL&&C.SUPABASE_ANON_KEY&&window.supabase);const sb=online?supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY):null;const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];let current=null,joinReturnView='tournaments';
function toast(x){const t=$('#toast');t.textContent=x;t.classList.add('show');clearTimeout(window._toast);window._toast=setTimeout(()=>t.classList.remove('show'),2400)}
function view(id){$$('.view').forEach(x=>x.classList.remove('active'));$('#'+id)?.classList.add('active');scrollTo(0,0);if(id==='tournaments')renderPublic();if(id==='admin')renderAdmin()};window.view=view;$$('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));$('#createBtn').onclick=()=>view('create');$('#createBtn2').onclick=()=>view('create');$('#adminNav').onclick=()=>view('admin');
const theme=localStorage.getItem('easyFootballTheme')||'dark';if(theme==='light')document.body.classList.add('light');function updateThemeIcon(){$('#theme').textContent=document.body.classList.contains('light')?'☀':'☾'}updateThemeIcon();$('#theme').onclick=()=>{document.body.classList.toggle('light');localStorage.setItem('easyFootballTheme',document.body.classList.contains('light')?'light':'dark');updateThemeIcon()};
function slug(s){return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Math.random().toString(36).slice(2,7)}function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}async function user(){if(!online)return null;return (await sb.auth.getUser()).data?.user||null}
async function getTournament(id){if(!online)return null;const {data,error}=await sb.from('tournaments').select('*').eq('id',id).single();if(error)return null;const [p,m,s]=await Promise.all([sb.from('players').select('*').eq('tournament_id',id).order('joined_at'),sb.from('matches').select('*').eq('tournament_id',id).order('stage').order('round_no').order('position'),sb.from('match_submissions').select('*').eq('tournament_id',id).order('created_at',{ascending:false})]);return {...data,players:p.data||[],matches:m.data||[],submissions:s.data||[]}}
async function createTournament(e){e.preventDefault();const d={name:$('#name').value.trim(),format:$('#format').value,match_minutes:+$('#minutes').value,group_size:+$('#groupSize').value,max_players:+$('#maxPlayers').value,is_public:$('#public').checked};const u=await user();if(!u){toast('Sign in from Admin first');view('admin');return}const {data:t,error}=await sb.from('tournaments').insert({...d,slug:slug(d.name),admin_id:u.id}).select().single();if(error){toast(error.message);return}current=await getTournament(t.id);e.target.reset();$('#maxPlayers').value=8;$('#groupSize').value=4;$('#minutes').value=10;$('#public').checked=true;openManage(t.id)}$('#createForm').onsubmit=createTournament;
async function publicTournaments(){const {data}=await sb.from('tournaments').select('*').eq('is_public',true).order('created_at',{ascending:false});return data||[]}async function renderPublic(){const list=await publicTournaments();$('#publicList').innerHTML=list.map(t=>`<article class="card"><span class="badge">${esc(t.format.toUpperCase())}</span><h3>${esc(t.name)}</h3><p>${esc(t.status)} · ${esc(t.match_minutes)} min · max ${t.max_players} players</p><div class="row"><button class="primary" onclick="openJoin('${t.id}')">Open</button><button class="ghost" onclick="share('${t.id}')">Share</button></div></article>`).join('');$('#publicEmpty').classList.toggle('hidden',!list.length)}
async function openJoin(id,ret='tournaments'){joinReturnView=ret;current=await getTournament(id);if(!current){toast('Tournament not found');return}const full=current.players.length>=current.max_players;const started=current.status!=='open';const matches=[...current.matches].sort((a,b)=>a.stage.localeCompare(b.stage)||a.round_no-b.round_no||a.position-b.position).map(m=>{const sub=current.submissions.find(s=>s.match_id===m.id&&s.status==='pending');const active=m.status==='scheduled'&&m.home_player_id&&m.away_player_id;return `<div class="panel"><div class="match"><div><b>${esc(matchName(m.home_player_id))}</b></div><div class="score">${m.status==='confirmed'?m.home_score+' - '+m.away_score:'VS'}</div><div><b>${esc(matchName(m.away_player_id))}</b></div></div><div class="actions-row"><span class="status">${esc(roundTitle(m))} · ${esc(m.status)}</span>${m.status==='scheduled'&&m.deadline_at?`<span class="hint">⏰ ${esc(timeLeft(m.deadline_at))}</span>`:''}</div>${m.status==='confirmed'?`<div class="status">✅ ${esc(matchName(m.winner_player_id))} advanced</div>`:m.status==='waiting'?'<div class="notice">Waiting for the previous match winner.</div>':sub?'<div class="notice">Result submitted — awaiting admin review.</div>':current.status==='live'&&active?`<button class="primary" onclick="submitPublicResult('${m.id}')">Submit score + screenshot proof</button>`:''}</div>`}).join('');view('join');$('#joinContent').innerHTML=`<div class="title"><div><small>TOURNAMENT</small><h2>${esc(current.name)}</h2></div><button class="ghost" onclick="backFromJoin()">← Back</button></div><div class="panel"><span class="badge">${esc(current.format.toUpperCase())}</span><p>${current.players.length} / ${current.max_players} players · ${current.status}</p>${started?'<div class="notice">This tournament has started. The player list is locked.</div>':full?'<div class="notice">This tournament is full.</div>':`<form id="joinForm" class="form"><label>Your player name<input id="joinName" maxlength="40" required placeholder="eFootball name"></label><button class="primary">Join tournament</button></form>`}</div>${current.matches.length?`<div class="title"><div><small>FIXTURES</small><h2>Matches & results</h2></div></div>${matches}`:''}`;if(!started&&!full)$('#joinForm').onsubmit=async e=>{e.preventDefault();const name=$('#joinName').value.trim();if(current.players.length>=current.max_players)return toast('Tournament is full');const {error}=await sb.from('players').insert({tournament_id:id,name});if(error){toast(error.message);return}toast('Joined tournament');await openJoin(id,ret)}}
async function share(id){const url=location.origin+location.pathname+'#join='+id;try{await navigator.clipboard.writeText(url);toast('Tournament link copied')}catch{prompt('Copy this link',url)}}
async function openManage(id){current=await getTournament(id);if(!current){toast('Tournament not found');return}view('manage');renderManage('overview')}
function renderManage(tab){if(!current)return;const tabs=['overview','players','matches','standings','bracket'];$('#manageContent').innerHTML=`<div class="title"><div><small>ADMIN CONTROL</small><h2>${esc(current.name)}</h2></div><div class="actions-row"><button class="ghost" onclick="share('${current.id}')">🔗 Share</button><button class="ghost" onclick="view('admin')">← Admin</button></div></div><div class="tabs">${tabs.map(x=>`<button class="tab ${tab===x?'active':''}" onclick="renderManage('${x}')">${x[0].toUpperCase()+x.slice(1)}</button>`).join('')}</div><div id="manageBody"></div>`;const b=$('#manageBody');if(tab==='overview')renderOverview(b);if(tab==='players')renderPlayers(b);if(tab==='matches')renderMatches(b);if(tab==='standings')renderStandings(b);if(tab==='bracket')renderBracket(b)}
function renderOverview(b){let action='';if(current.status==='open')action=`<button class="primary" onclick="startTournament()">▶ Start tournament</button>`;else if(current.status==='live')action=`<span class="status">LIVE</span>`;else action=`<span class="status">COMPLETED</span>`;const champ=current.champion_player_id?current.players.find(p=>p.id===current.champion_player_id):null;b.innerHTML=`<div class="panel"><h3>Tournament control</h3><p class="hint">${current.status==='open'?'Add players, then start. Starting locks the player list.':current.status==='live'?'Play the generated fixtures and confirm every result.':'This tournament is finished.'}</p><div class="actions-row">${action}<button class="ghost" onclick="openJoin('${current.id}','manage')">Player view</button></div></div><div class="panel"><b>${current.players.length}</b> / <b>${current.max_players}</b> players · <b>${current.matches.length}</b> matches · <b>${current.status}</b></div>${champ?`<div class="champion">🏆<h2>${esc(champ.name)}</h2><p>Champion</p></div>`:''}`}
function renderPlayers(b){const locked=current.status!=='open';b.innerHTML=`<div class="panel"><h3>Players (${current.players.length}/${current.max_players})</h3>${locked?'<div class="notice">Player list is locked because the tournament has started.</div>':current.players.length>=current.max_players?'<div class="notice">Player limit reached.</div>':`<form id="addPlayer" class="two"><input id="pname" required maxlength="40" placeholder="Player name"><button class="primary">Add player</button></form>`}</div><div class="panel">${current.players.map((p,i)=>`<div class="match"><div>${i+1}. ${esc(p.name)}</div><div class="hint">${p.id.slice(0,6)}</div></div>`).join('')}</div>`;if(!locked&&current.players.length<current.max_players)$('#addPlayer').onsubmit=async e=>{e.preventDefault();const name=$('#pname').value.trim();if(current.players.length>=current.max_players)return toast('Player limit reached');const {error}=await sb.from('players').insert({tournament_id:current.id,name});if(error){toast(error.message);return}current=await getTournament(current.id);renderManage('players')}}
function matchName(id){return current.players.find(p=>p.id===id)?.name||'TBD'}
function roundTitle(m){return m.round_label||(m.stage==='knockout'?(m.round_no===1?'Knockout Round 1':'Knockout Round '+m.round_no):m.stage)}
function timeLeft(deadline){if(!deadline)return '';const ms=new Date(deadline).getTime()-Date.now();if(ms<=0)return 'Deadline passed';const d=Math.floor(ms/86400000),h=Math.floor(ms%86400000/3600000),min=Math.floor(ms%3600000/60000);return (d?d+'d ':'')+h+'h '+min+'m left'}
function renderMatches(b){
  if(!current.matches.length){b.innerHTML='<div class="empty">No fixtures yet. Start the tournament to generate them.</div>';return}
  const ms=[...current.matches].sort((a,b)=>a.stage.localeCompare(b.stage)||a.round_no-b.round_no||a.position-b.position);
  const cards=ms.map(m=>{
    const pending=current.submissions.find(s=>s.match_id===m.id&&s.status==='pending');
    const deadline=m.status==='scheduled'&&m.deadline_at?timeLeft(m.deadline_at):'';
    const isKO=m.stage==='knockout';
    return `<div class="panel match">
      <div class="team"><b>${esc(matchName(m.home_player_id))}</b></div>
      <div class="score">${m.status==='confirmed'?m.home_score+' - '+m.away_score:'VS'}</div>
      <div class="team"><b>${esc(matchName(m.away_player_id))}</b></div>
      <div style="grid-column:1/-1">
        <div class="actions-row"><span class="status">${esc(roundTitle(m))} · ${esc(m.status)}</span>${deadline?`<span class="hint">⏰ ${esc(deadline)}</span>`:''}</div>
        ${m.status==='confirmed'?`<div class="status">✅ ${esc(matchName(m.winner_player_id))} advanced</div>`:''}
        ${m.status==='waiting'?'<div class="notice">Waiting for the previous match winner.</div>':''}
        ${m.status==='scheduled'&&m.deadline_at&&new Date(m.deadline_at).getTime()<Date.now()?'<div class="notice">⏰ Deadline passed — extend the deadline to accept another result.</div>':''}
        ${m.status==='scheduled'?`<div class="actions-row" style="margin-top:10px"><button class="ghost" onclick="extendDeadline('${m.id}')">⏰ Extend 24h</button></div>`:''}
        ${pending?`<div class="panel" style="margin-top:10px"><b>Pending result</b><p>${esc(pending.submitter_name)} · ${pending.home_score} - ${pending.away_score}</p><a class="ghost" href="${esc(pending.proof_url)}" target="_blank" rel="noopener">View screenshot proof</a><div class="actions-row" style="margin-top:10px"><button class="primary" onclick="confirmSubmission('${pending.id}')">Confirm result</button><button class="danger-btn" onclick="rejectSubmission('${pending.id}')">Reject result</button></div></div>`:''}
      </div>
    </div>`
  }).join('');
  b.innerHTML=`<div class="panel"><h3>Matches & results</h3><p class="hint">${current.format==='knockout'?'Knockout winners advance into their exact bracket slots automatically.':'Submit and confirm every result to progress the tournament.'}</p></div>${cards}`;
}
function calcStandings(players,matches){const s={};players.forEach(p=>s[p.id]={p,w:0,d:0,l:0,gf:0,ga:0,pts:0});matches.filter(m=>m.status==='confirmed'&&m.stage!=='knockout').forEach(m=>{let h=s[m.home_player_id],a=s[m.away_player_id];if(!h||!a)return;h.gf+=m.home_score;h.ga+=m.away_score;a.gf+=m.away_score;a.ga+=m.home_score;if(m.home_score>m.away_score){h.w++;h.pts+=3;a.l++}else if(m.home_score<m.away_score){a.w++;a.pts+=3;h.l++}else{h.d++;a.d++;h.pts++;a.pts++}});return Object.values(s).sort((a,b)=>b.pts-a.pts||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf)}function renderStandings(b){const rows=calcStandings(current.players,current.matches).map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.p.name)}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td>${x.gf}-${x.ga}</td><td><b>${x.pts}</b></td></tr>`).join('');b.innerHTML=`<div class="panel"><table class="table"><thead><tr><th>#</th><th>Player</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table></div>`}
function renderBracket(b){const ks=current.matches.filter(m=>m.stage==='knockout');if(!ks.length){b.innerHTML='<div class="empty">Knockout bracket will appear here after the tournament starts.</div>';return}
 const max=Math.max(...ks.map(m=>m.round_no));let rounds='';for(let r=1;r<=max;r++){const ms=ks.filter(m=>m.round_no===r).sort((a,b)=>a.position-b.position);rounds+=`<div class="round"><h4>${esc(roundTitle(ms[0]||{round_no:r,stage:'knockout'}).replace(/ - Match.*$/,''))}</h4>${ms.map(m=>`<div class="fixture"><strong>${esc(roundTitle(m))}</strong><div>${esc(matchName(m.home_player_id))} ${m.status==='confirmed'?m.home_score:''}</div><div>${esc(matchName(m.away_player_id))} ${m.status==='confirmed'?m.away_score:''}</div><small>${m.status==='confirmed'?`🏆 ${esc(matchName(m.winner_player_id))} advances`:m.home_player_id&&m.away_player_id?'⏳ '+esc(timeLeft(m.deadline_at)):'Waiting for opponent'}</small></div>`).join('')}</div>`}b.innerHTML=`<div class="panel"><h3>Knockout bracket</h3><div class="bracket"><div class="bracket-grid">${rounds}</div></div></div>`}
function roundRobin(ids,stage,groupNo=null){const rows=[];for(let i=0;i<ids.length;i++)for(let j=i+1;j<ids.length;j++)rows.push({stage,group_no:groupNo,round_no:1,position:rows.length+1,home_player_id:ids[i],away_player_id:ids[j],status:'scheduled'});return rows}
function knockoutLabel(matchCount,position){
  if(matchCount===1)return 'Final';
  if(matchCount===2)return 'Semi-Final '+position;
  if(matchCount===4)return 'Quarter-Final '+position;
  if(matchCount===8)return 'Round of 16 - Match '+position;
  return 'Knockout Round - Match '+position;
}
function deadlineForNow(){return new Date(Date.now()+24*60*60*1000).toISOString()}
function makeKnockoutRows(ids,round,totalRounds){
  const rows=[];
  const count=Math.ceil(ids.length/2);
  for(let i=0;i<ids.length;i+=2){
    const a=ids[i]||null,b=ids[i+1]||null,pos=i/2+1;
    rows.push({stage:'knockout',round_no:round,position:pos,home_player_id:a,away_player_id:b,status:a&&b?'scheduled':'waiting',round_label:knockoutLabel(count,pos),deadline_at:a&&b?deadlineForNow():null});
  }
  return rows;
}
async function insertMatches(rows){
  const clean=rows.map(x=>({...x,tournament_id:current.id}));
  const {data,error}=await sb.from('matches').insert(clean).select();
  if(error){toast(error.message);return false}
  return data||true;
}
async function createFullKnockoutBracket(ids){
  const n=ids.length;
  let matchCount=n/2, round=1, allRows=[];
  while(matchCount>=1){
    const rows=[];
    for(let pos=1;pos<=matchCount;pos++){
      const a=round===1?ids[(pos-1)*2]:null;
      const bb=round===1?ids[(pos-1)*2+1]:null;
      rows.push({stage:'knockout',round_no:round,position:pos,home_player_id:a||null,away_player_id:bb||null,status:a&&bb?'scheduled':'waiting',round_label:knockoutLabel(matchCount,pos),deadline_at:a&&bb?deadlineForNow():null});
    }
    allRows.push(rows);
    if(matchCount===1)break;
    matchCount=Math.floor(matchCount/2);round++;
  }
  for(const rows of allRows){if(!await insertMatches(rows))return false;}
  current=await getTournament(current.id);
  for(let r=1;r<allRows.length;r++){
    const prev=current.matches.filter(m=>m.stage==='knockout'&&m.round_no===r).sort((a,b)=>a.position-b.position);
    const next=current.matches.filter(m=>m.stage==='knockout'&&m.round_no===r+1).sort((a,b)=>a.position-b.position);
    for(let i=0;i<prev.length;i++){
      const nm=next[Math.floor(i/2)];
      if(nm)await sb.from('matches').update({next_match_id:nm.id,next_slot:i%2+1}).eq('id',prev[i].id);
    }
  }
  current=await getTournament(current.id);
  return true;
}
async function startTournament(){
  if(current.status!=='open')return;
  if(current.players.length<2){toast('Add at least 2 players');return}
  if(!confirm('Start tournament? Players will be locked and fixtures generated.'))return;
  let rows=[];const ids=current.players.map(p=>p.id);
  if(current.format==='league')rows=roundRobin(ids,'league');
  else if(current.format==='groups'||current.format==='hybrid'){
    if(ids.length<4){toast('Groups need at least 4 players');return}
    const size=Math.max(2,Math.min(8,current.group_size||4));let groupNo=1;
    for(let i=0;i<ids.length;i+=size)rows.push(...roundRobin(ids.slice(i,i+size),'group',groupNo++));
    if(current.format==='hybrid' && ids.length<4){toast('Hybrid needs at least 4 players');return}
  }else{
    if((ids.length&(ids.length-1))!==0){toast('Knockout needs 2, 4, 8, 16... players');return}
    const ok=await createFullKnockoutBracket(ids);
    if(!ok)return;
    const {error}=await sb.from('tournaments').update({status:'live',started_at:new Date().toISOString()}).eq('id',current.id);
    if(error){toast(error.message);return}
    current=await getTournament(current.id);toast('Knockout bracket created!');renderManage('overview');return;
  }
  if(rows.length&&!await insertMatches(rows))return;
  const {error}=await sb.from('tournaments').update({status:'live',started_at:new Date().toISOString()}).eq('id',current.id);
  if(error){toast(error.message);return}
  current=await getTournament(current.id);toast('Tournament started!');renderManage('overview');
}
async function advanceWinner(m,winner){
  if(m.stage!=='knockout'||!m.next_match_id||!winner)return;
  const next=current.matches.find(x=>x.id===m.next_match_id);
  if(!next)return;
  const field=m.next_slot===1?'home_player_id':'away_player_id';
  const patch={};patch[field]=winner;
  const other=m.next_slot===1?next.away_player_id:next.home_player_id;
  if(other){patch.status='scheduled';patch.deadline_at=next.deadline_at||deadlineForNow()}
  else{patch.status='waiting';patch.deadline_at=null}
  const {error}=await sb.from('matches').update(patch).eq('id',next.id);
  if(error){toast('Winner could not advance: '+error.message);return}
  current=await getTournament(current.id);
}
async function advanceAfterConfirmation(m){
  if(m.stage==='knockout'){
    if(m.next_match_id){await advanceWinner(m,m.winner_player_id);}
    else{
      await sb.from('tournaments').update({status:'completed',completed_at:new Date().toISOString(),champion_player_id:m.winner_player_id}).eq('id',current.id);
      current=await getTournament(current.id);
      toast('🏆 Champion crowned!');return;
    }
  }else if(m.stage==='group'&&current.format==='hybrid'){
    const groupMatches=current.matches.filter(x=>x.stage==='group');
    if(groupMatches.length&&groupMatches.every(x=>x.status==='confirmed'))await startHybridKnockout();
  }else if(m.stage==='league'){
    const league=current.matches.filter(x=>x.stage==='league');
    if(league.length&&league.every(x=>x.status==='confirmed')){
      const s=calcStandings(current.players,current.matches);if(s.length)await sb.from('tournaments').update({status:'completed',completed_at:new Date().toISOString(),champion_player_id:s[0].p.id}).eq('id',current.id);
    }
  }else if(m.stage==='group'&&current.format==='groups'){
    const group=current.matches.filter(x=>x.stage==='group');
    if(group.length&&group.every(x=>x.status==='confirmed')){const s=calcStandings(current.players,current.matches);await sb.from('tournaments').update({status:'completed',completed_at:new Date().toISOString(),champion_player_id:s[0]?.p.id||null}).eq('id',current.id);}
  }
}
async function extendDeadline(matchId){
  const u=await user();if(!u)return toast('Admin sign in required');
  const m=current.matches.find(x=>x.id===matchId);if(!m||m.status!=='scheduled')return toast('Match is not scheduled');
  const {error}=await sb.from('matches').update({deadline_at:deadlineForNow()}).eq('id',matchId);
  if(error)return toast(error.message);current=await getTournament(current.id);toast('Deadline extended by 24 hours');renderManage('matches');
}
async function submitPublicResult(matchId){const m=current.matches.find(x=>x.id===matchId);if(!m||m.status!=='scheduled')return toast('This match is not accepting results');if(m.deadline_at&&new Date(m.deadline_at).getTime()<Date.now())return toast('Match deadline has passed. Ask the admin to extend it.');if(current.submissions.some(s=>s.match_id===matchId&&s.status==='pending'))return toast('A result is already waiting for admin review');const old=document.getElementById('resultProofModal');if(old)old.remove();const modal=document.createElement('div');modal.id='resultProofModal';modal.className='modal-backdrop';modal.innerHTML=`<form id="proofForm" class="panel proof-modal"><div class="title"><div><small>MATCH RESULT</small><h2>${esc(matchName(m.home_player_id))} vs ${esc(matchName(m.away_player_id))}</h2></div><button type="button" class="ghost" id="closeProof">✕</button></div><label>Your eFootball name<input id="proofName" maxlength="40" required placeholder="Name"></label><div class="two"><label>${esc(matchName(m.home_player_id))} score<input id="proofHome" type="number" min="0" max="99" required></label><label>${esc(matchName(m.away_player_id))} score<input id="proofAway" type="number" min="0" max="99" required></label></div><label>Screenshot proof (PNG, JPG or WebP, max 8MB)<input id="proofFile" type="file" accept="image/png,image/jpeg,image/webp" required></label><p class="hint">Make sure the screenshot clearly shows the final match score.</p><button class="primary big" type="submit">Submit result for admin review</button></form>`;document.body.appendChild(modal);$('#closeProof').onclick=()=>modal.remove();$('#proofForm').onsubmit=async e=>{e.preventDefault();const name=$('#proofName').value.trim(),hs=Number($('#proofHome').value),as=Number($('#proofAway').value),file=$('#proofFile').files[0];if(!name||!file)return toast('Enter your name and attach a screenshot');if(!['image/png','image/jpeg','image/webp'].includes(file.type))return toast('Use a PNG, JPG or WebP image');if(file.size>8*1024*1024)return toast('Screenshot must be 8MB or smaller');if(m.stage==='knockout'&&hs===as)return toast('Knockout matches need a winner.');const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');const path=`${current.id}/${matchId}/${Date.now()}_${safe}`;const {error:uploadError}=await sb.storage.from('match-proofs').upload(path,file,{contentType:file.type,upsert:false});if(uploadError)return toast('Screenshot upload failed: '+uploadError.message);const {data:pub}=sb.storage.from('match-proofs').getPublicUrl(path);const {error}=await sb.from('match_submissions').insert({tournament_id:current.id,match_id:matchId,submitter_name:name,home_score:hs,away_score:as,proof_url:pub.publicUrl,status:'pending'});if(error){toast('Result could not be saved: '+error.message);return}modal.remove();toast('Result and screenshot submitted for admin review');await openJoin(current.id,joinReturnView)}}
async function confirmSubmission(submissionId){const u=await user();if(!u)return toast('Admin sign in required');const sub=current.submissions.find(s=>s.id===submissionId);if(!sub||sub.status!=='pending')return toast('Submission is no longer pending');const m=current.matches.find(x=>x.id===sub.match_id);if(!m)return toast('Match not found');const winner=sub.home_score===sub.away_score?null:(sub.home_score>sub.away_score?m.home_player_id:m.away_player_id);if(m.stage==='knockout'&&!winner)return toast('Knockout match needs a winner');const {error:updateMatchError}=await sb.from('matches').update({home_score:sub.home_score,away_score:sub.away_score,status:'confirmed',winner_player_id:winner,confirmed_at:new Date().toISOString()}).eq('id',m.id);if(updateMatchError)return toast(updateMatchError.message);const {error:reviewError}=await sb.from('match_submissions').update({status:'confirmed',reviewed_at:new Date().toISOString()}).eq('id',sub.id);if(reviewError)return toast(reviewError.message);await advanceAfterConfirmation({...m,home_score:sub.home_score,away_score:sub.away_score,winner_player_id:winner,status:'confirmed'});current=await getTournament(current.id);toast('Result confirmed');renderManage('matches')}async function rejectSubmission(submissionId){const u=await user();if(!u)return toast('Admin sign in required');const {error}=await sb.from('match_submissions').update({status:'rejected',reviewed_at:new Date().toISOString()}).eq('id',submissionId).eq('status','pending');if(error)return toast(error.message);current=await getTournament(current.id);toast('Submission rejected');renderManage('matches')}
async function advanceAfterConfirmation(m){if(m.stage==='knockout'){current=await getTournament(current.id);const created=await buildNextKnockoutRound(m.round_no);if(created===null&&current.matches.some(x=>x.stage==='knockout'&&x.round_no===m.round_no&&x.status==='confirmed'))toast('🏆 Knockout champion crowned!');else if(created?.length)toast('➡️ Next knockout round created');}else if((m.stage==='group')&&current.format==='hybrid'){const groupMatches=current.matches.filter(x=>x.stage==='group');if(groupMatches.length&&groupMatches.every(x=>x.status==='confirmed'))await startHybridKnockout()}else if(m.stage==='league'){const league=current.matches.filter(x=>x.stage==='league');if(league.length&&league.every(x=>x.status==='confirmed')){const s=calcStandings(current.players,current.matches);if(s.length)await sb.from('tournaments').update({status:'completed',completed_at:new Date().toISOString(),champion_player_id:s[0].p.id}).eq('id',current.id)}}else if(m.stage==='group'&&current.format==='groups'){const group=current.matches.filter(x=>x.stage==='group');if(group.length&&group.every(x=>x.status==='confirmed')){const s=calcStandings(current.players,current.matches);await sb.from('tournaments').update({status:'completed',completed_at:new Date().toISOString(),champion_player_id:s[0]?.p.id||null}).eq('id',current.id)}}}
async function startHybridKnockout(){const existing=current.matches.some(x=>x.stage==='knockout');if(existing)return;const groups=[...new Set(current.matches.filter(x=>x.stage==='group').map(x=>x.group_no))].sort((a,b)=>a-b);let qualified=[];for(const g of groups){const ids=new Set();current.matches.filter(x=>x.stage==='group'&&x.group_no===g).forEach(m=>{ids.add(m.home_player_id);ids.add(m.away_player_id)});const ps=current.players.filter(p=>ids.has(p.id));const fake={...current,matches:current.matches.filter(x=>x.group_no===g&&x.stage==='group'),players:ps};qualified.push(...calcStandings(fake.players,fake.matches).slice(0,2).map(x=>x.p.id))}if(qualified.length<2)return;const rows=makeKnockoutRows(qualified,1);if(rows.length){await insertMatches(rows);toast('Group stage complete — knockout started!')}}
async function renderAdmin(){const box=$('#adminContent');const u=await user();if(!u){$('#loginBtn').textContent='Sign in';$('#loginBtn').onclick=()=>{};box.innerHTML='<div class="panel"><h3>Admin sign in</h3><p class="hint">Sign in with the admin email and password you created in Supabase.</p><label>Email<input id="email" type="email" autocomplete="email" placeholder="your@email.com" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--line);padding:12px;border-radius:10px"></label><label>Password<input id="password" type="password" autocomplete="current-password" placeholder="Your password" style="width:100%;background:var(--bg);color:var(--text);border:1px solid var(--line);padding:12px;border-radius:10px"></label><button class="primary" id="emailLogin" style="margin-top:10px">Sign in</button></div>';$('#emailLogin').onclick=async()=>{const email=$('#email').value.trim();const password=$('#password').value;if(!email||!password)return toast('Enter your email and password');const {error}=await sb.auth.signInWithPassword({email,password});toast(error?error.message:'Signed in successfully');if(!error)renderAdmin()};return}$('#loginBtn').textContent='Sign out';$('#loginBtn').onclick=async()=>{await sb.auth.signOut();renderAdmin()};const {data:list,error}=await sb.from('tournaments').select('*').eq('admin_id',u.id).order('created_at',{ascending:false});if(error){box.innerHTML=`<div class="notice">${esc(error.message)}</div>`;return}box.innerHTML=`<div class="actions-row" style="margin-bottom:14px"><button class="primary" onclick="view('create')">＋ Create tournament</button></div>${(list||[]).map(t=>`<div class="panel"><div><span class="badge">${esc(t.format.toUpperCase())}</span><h3>${esc(t.name)}</h3><div class="hint">${esc(t.status)} · max ${t.max_players} · ${t.is_public?'Public':'Private'}</div></div><div class="actions-row"><button class="ghost" onclick="openManage('${t.id}')">Manage</button><button class="danger-btn" onclick="deleteTournament('${t.id}')">Delete</button></div></div>`).join('')||'<div class="empty">You have no tournaments yet.</div>'}`}
async function deleteTournament(id){if(!confirm('Delete this tournament permanently?'))return;const u=await user();if(!u)return toast('Sign in first');const {error}=await sb.from('tournaments').delete().eq('id',id).eq('admin_id',u.id);if(error){toast(error.message);return}current=null;toast('Tournament deleted');renderAdmin();view('admin')}
window.openJoin=openJoin;window.backFromJoin=backFromJoin;window.openManage=openManage;window.renderManage=renderManage;window.submitPublicResult=submitPublicResult;window.confirmSubmission=confirmSubmission;window.rejectSubmission=rejectSubmission;window.share=share;window.deleteTournament=deleteTournament;window.startTournament=startTournament;window.extendDeadline=extendDeadline;
if(online)sb.auth.onAuthStateChange(()=>setTimeout(()=>{if($('#admin').classList.contains('active'))renderAdmin()},100));(async()=>{if(location.hash.startsWith('#join='))await openJoin(location.hash.slice(6));else renderPublic()})();
let efRefreshTimer=null;
function startAutoRefresh(){clearInterval(efRefreshTimer);efRefreshTimer=setInterval(async()=>{if(!current)return;const active=['join','manage'].some(id=>$('#'+id)?.classList.contains('active'));if(!active)return;const id=current.id;current=await getTournament(id);if($('#join').classList.contains('active'))await openJoin(id,joinReturnView);else if($('#manage').classList.contains('active'))renderManage('matches');},15000)}
startAutoRefresh();
