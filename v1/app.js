// Simple tournament manager for 12 players, 3 tables, 3 rounds.
(function(){
  const MAX = 12;
  let players = [];
  let currentRound = 1;
  let swapModal, swapSelect, swapConfirm, swapCancel, swapTargetId = null;
  let roundsAssignments = []; // array of arrays: roundsAssignments[roundIndex][playerId] = tableIndex

  const el = id => document.getElementById(id);

  function init(){
    const namesDiv = el('names');
    for(let i=0;i<MAX;i++){
      const wrapper = document.createElement('div'); wrapper.className='nameInput';
      const label = document.createElement('label'); label.textContent = `Jugador ${i+1}`;
      const input = document.createElement('input'); input.type = 'text'; input.placeholder = `Nom jugador ${i+1}`; input.dataset.idx = i;
      const chk = document.createElement('input'); chk.type='checkbox'; chk.title='Rol especial'; chk.dataset.idx=i;
      const chkLabel = document.createElement('label'); chkLabel.style.fontSize='0.8rem'; chkLabel.appendChild(chk); chkLabel.append(' Rol esp.');
      wrapper.appendChild(label); wrapper.appendChild(input); wrapper.appendChild(chkLabel);
      namesDiv.appendChild(wrapper);
    }

    el('assignBtn').addEventListener('click', assignRandom);
    el('startBtn').addEventListener('click', startTournament);
    el('nextRound').addEventListener('click', ()=>{ if(currentRound<3){ currentRound++; renderRound(); } });
    el('prevRound').addEventListener('click', ()=>{ if(currentRound>1){ currentRound--; renderRound(); } });
    el('saveScores').addEventListener('click', saveScores);

    // modal elements for swap
    swapModal = document.getElementById('swapModal');
    swapSelect = document.getElementById('swapSelect');
    swapConfirm = document.getElementById('swapConfirm');
    swapCancel = document.getElementById('swapCancel');
    console.debug('modal elems', {swapModal, swapSelect, swapConfirm, swapCancel});
    swapCancel.addEventListener('click', ()=>{ closeSwapModal(); });
    swapConfirm.addEventListener('click', ()=>{
      const sel = swapSelect.value;
      if(sel==='') return; const otherId = parseInt(sel,10);
      const a = players.find(p=>p.id===swapTargetId);
      const b = players.find(p=>p.id===otherId);
      if(!a||!b){ alert('Selecció invàlida'); closeSwapModal(); return; }
      [a.number,b.number] = [b.number,a.number];
      // update initial round assignment and clear subsequent rounds
      roundsAssignments[0] = players.map(p=>Math.floor((p.number-1)/4));
      roundsAssignments[1] = null; roundsAssignments[2] = null;
      persist(); closeSwapModal(); renderRound();
    });

    // try load from storage
    const stored = localStorage.getItem('tournament_state');
    if(stored){
      try{
        const s = JSON.parse(stored);
        players = s.players || [];
        currentRound = s.currentRound || 1;
        roundsAssignments = s.roundsAssignments || null;
        if(players.length===MAX){
          // ensure initial round exists
          if(!roundsAssignments || !roundsAssignments[0]) roundsAssignments = [players.map(p=>Math.floor((p.number-1)/4)), null, null];
          showControls(); renderRound(); renderLeaderboard();
        }
      }catch(e){}
    }
  }

  function readInputs(){
    const names = Array.from(document.querySelectorAll('#names input[type="text"]')).map(i=>i.value.trim());
    const checks = Array.from(document.querySelectorAll('#names input[type="checkbox"]')).map(c=>c.checked);
    return {names,checks};
  }

  function assignRandom(){
    const nameEls = Array.from(document.querySelectorAll('#names input[type="text"]'));
    const names = nameEls.map(i=>i.value.trim()||`Jugador ${parseInt(i.dataset.idx)+1}`);
    const checks = Array.from(document.querySelectorAll('#names input[type="checkbox"]')).map(c=>c.checked);
    // prepare players array
    players = names.map((n,i)=>({id:i,name:n,number:null,isSpecial:checks[i],scores:[null,null,null]}));

    // assign random unique numbers 1..12
    let nums = Array.from({length:MAX},(_,i)=>i+1);
    function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } }

    // Ensure special players (if any) are assigned to 3 different initial tables (1..3)
    const specialIndexes = players.map((p,i)=>p.isSpecial?i:-1).filter(i=>i!==-1);
    let attempts=0; do{
      attempts++;
      shuffle(nums);
      for(let i=0;i<MAX;i++) players[i].number = nums[i];
      const tableOf = n => Math.floor((n-1)/4); // 0,1,2
      const tables = new Set(specialIndexes.map(si=>tableOf(players[si].number)));
      if(specialIndexes.length<3 || tables.size===3) break;
    }while(attempts<2000);

    // build initial round assignment (round 1) from numbers
    roundsAssignments = [];
    roundsAssignments[0] = players.map(p=>Math.floor((p.number-1)/4));
    roundsAssignments[1] = null;
    roundsAssignments[2] = null;

    persist();
    alert('Números assignats aleatòriament. Revisa i, si cal, intercanvia manualment.');
    renderLeaderboard();
  }

  function startTournament(){
    // read inputs and assign default numbers if none
    if(!players || players.length!==MAX) assignRandom();
    currentRound = 1;
    showControls();
    renderRound();
    renderLeaderboard();
  }

  function showControls(){
    el('setup').classList.add('hidden');
    el('controls').classList.remove('hidden');
    el('tables').classList.remove('hidden');
    el('summary').classList.remove('hidden');
  }

  // Build pair history (unordered pairs) from previous rounds
  function buildPairHistory(upToRoundIndex){
    const set = new Set();
    for(let r=0;r<=upToRoundIndex;r++){
      const assign = roundsAssignments[r];
      if(!assign) continue;
      // for each table, collect players
      for(let t=0;t<3;t++){
        const mem = [];
        for(let pid=0;pid<players.length;pid++) if(assign[pid]===t) mem.push(pid);
        for(let i=0;i<mem.length;i++) for(let j=i+1;j<mem.length;j++){
          const a = Math.min(mem[i],mem[j]); const b = Math.max(mem[i],mem[j]);
          set.add(a+"-"+b);
        }
      }
    }
    return set;
  }

  function computeAssignmentForRound(roundIdx){
    if(roundIdx===0) return roundsAssignments[0];
    const prev = roundsAssignments[roundIdx-1];
    if(!prev) return null;
    const pairHistory = buildPairHistory(roundIdx-1);

    const assigned = Array(players.length).fill(-1);
    const tableMembers = [[],[],[]];
    const tableCounts = [0,0,0];

    // order players: try specials first to reduce branching
    const order = [...Array(players.length).keys()].sort((a,b)=>{ return (players[b].isSpecial?1:0) - (players[a].isSpecial?1:0); });

    function canPlace(pid,t){
      if(t===prev[pid]) return false; // must change table from previous round
      if(tableCounts[t]>=4) return false;
      // specials must be in distinct tables
      if(players[pid].isSpecial){
        for(const q of tableMembers[t]) if(players[q].isSpecial) return false;
      }
      // no repeated pairings
      for(const q of tableMembers[t]){
        const a = Math.min(pid,q), b = Math.max(pid,q);
        if(pairHistory.has(a+"-"+b)) return false;
      }
      return true;
    }

    function dfs(idx){
      if(idx===order.length){
        // ensure specials occupy distinct tables
        const seen = new Set();
        for(let pid=0;pid<players.length;pid++) if(players[pid].isSpecial){ const t=assigned[pid]; if(seen.has(t)) return false; seen.add(t); }
        return true;
      }
      const pid = order[idx];
      for(let t=0;t<3;t++){
        if(!canPlace(pid,t)) continue;
        assigned[pid]=t; tableMembers[t].push(pid); tableCounts[t]++;
        if(dfs(idx+1)) return true;
        // backtrack
        assigned[pid]=-1; tableMembers[t].pop(); tableCounts[t]--;
      }
      return false;
    }

    const ok = dfs(0);
    return ok?assigned:null;
  }

  function renderRound(){
    el('roundLabel').textContent = `Ronda ${currentRound}`;
    const container = el('tableContainer'); container.innerHTML='';
    // ensure assignment for this round exists
    const rIdx = currentRound-1;
    if(!roundsAssignments[rIdx]){
      const ass = computeAssignmentForRound(rIdx);
      if(!ass){ alert('No s\'ha pogut generar una assignació que compleixi les restriccions. Revisa les condicions.'); return; }
      roundsAssignments[rIdx]=ass;
      persist();
    }
    const tables = [[],[],[]];
    players.forEach(p=>{ const t = roundsAssignments[rIdx][p.id]; tables[t].push(p); });

    for(let t=0;t<3;t++){
      const wrap = document.createElement('div'); wrap.className='table';
      wrap.innerHTML = `<h3>Taula ${t+1}</h3>`;
      // sort by number for consistent ordering
      tables[t].sort((a,b)=>a.number-b.number);
      tables[t].forEach(p=>{
        const tpl = document.getElementById('seatTpl');
        const node = tpl.content.cloneNode(true);
        const seat = node.querySelector('.seat');
        const badge = seat.querySelector('.badge');
        const name = seat.querySelector('.name');
        const meta = seat.querySelector('.meta');
        const scoreInput = seat.querySelector('.score');
        const swapBtn = seat.querySelector('.swap');

        // symbol and color from number groups
        const n = p.number;
        let shape='square', color='red', sym='';
        if(n<=4){ shape='square'; color='red'; sym='■'; }
        else if(n<=8){ shape='circle'; color='blue'; sym='●'; }
        else { shape='pentagon'; color='green'; sym='⬟'; }
        badge.className = `badge ${shape} ${color}`;
        badge.textContent = n;
        name.textContent = p.name + (p.isSpecial? ' ★':'');
        meta.textContent = `${sym} Posició ${n}`;
        const existing = p.scores[currentRound-1];
        scoreInput.value = existing!=null?existing:'';

        swapBtn.addEventListener('click', ()=>{ doSwap(p.id); });

        wrap.appendChild(node);
      });
      container.appendChild(wrap);
    }
    renderLeaderboard();
  }

  function doSwap(playerId){
    console.debug('doSwap called for', playerId);
    // open modal and populate select with other players
    swapTargetId = playerId;
    swapSelect.innerHTML = '';
    const placeholder = document.createElement('option'); placeholder.value=''; placeholder.textContent='-- tria un jugador --';
    swapSelect.appendChild(placeholder);
    players.forEach(p=>{
      if(p.id===playerId) return;
      const opt = document.createElement('option'); opt.value = p.id; opt.textContent = `${p.name} (nº ${p.number})`;
      swapSelect.appendChild(opt);
    });
    if(swapModal){
      swapModal.classList.remove('hidden');
      swapSelect.focus();
      console.debug('swap modal opened');
    } else {
      console.warn('swapModal element missing');
    }
  }

  function closeSwapModal(){ swapModal.classList.add('hidden'); swapTargetId = null; swapSelect.innerHTML=''; }

  function saveScores(){
    // read score inputs for current DOM
    const seats = Array.from(document.querySelectorAll('.table'));
    seats.forEach(tbl=>{
      const scoreEls = tbl.querySelectorAll('.seat');
      scoreEls.forEach(seat=>{
        const name = seat.querySelector('.name').textContent.replace(' ★','');
        const input = seat.querySelector('.score');
        const val = input.value.trim();
        const p = players.find(x=>x.name===name);
        if(p){ p.scores[currentRound-1] = val===''?null:parseFloat(val); }
      });
    });
    persist(); renderLeaderboard();
    alert('Puntuacions guardades per la ronda ' + currentRound);
  }

  function renderLeaderboard(){
    const tbody = el('leaderboard').querySelector('tbody'); tbody.innerHTML='';
    players.forEach(p=>{ p.total = p.scores.reduce((s,v)=>s+(v==null?0:v),0); });
    const sorted = [...players].sort((a,b)=>b.total - a.total);
    sorted.forEach(p=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.name}${p.isSpecial? ' ★':''}</td><td>${p.total.toFixed(2)}</td><td>${display(p.scores[0])}</td><td>${display(p.scores[1])}</td><td>${display(p.scores[2])}</td>`;
      tbody.appendChild(tr);
    });
  }

  function display(v){ return v==null?'-':v; }

  function persist(){
    localStorage.setItem('tournament_state', JSON.stringify({players,currentRound, roundsAssignments}));
  }

  window.addEventListener('load', init);
})();
