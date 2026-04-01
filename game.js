/* BlockPop – game.js v5 (Infinite + Level Mode, No Ads) */
(function(){
"use strict";

/* ===== CONSTANTS ===== */
const G=10,MIN=3,COLORS=5,LIFT=50;
const COLOR_HEX=["#ef4444","#3b82f6","#22c55e","#f59e0b","#a855f7"];
const COLOR_NAME=["Red","Blue","Green","Yellow","Purple"];
const PU_COST={hammer:50,bomb:100,shuffle:80};
const LEVELS_PER_PAGE=20;

/* ===== LEVEL GENERATION ===== */
const LEVELS=(function(){
  const L=[];
  for(let i=1;i<=100;i++){
    const tier=i<=10?0:i<=25?1:i<=50?2:i<=75?3:4;
    const isScore=i%3===0;
    const reward=Math.floor(5+i*0.6+(tier*3));
    if(isScore){
      /* Score-based levels */
      let t;
      if(tier===0)t=150+i*40;
      else if(tier===1)t=500+(i-10)*80;
      else if(tier===2)t=1700+(i-25)*100;
      else if(tier===3)t=4200+(i-50)*140;
      else t=7700+(i-75)*200;
      L.push({id:i,type:'score',target:Math.round(t/50)*50,reward});
    }else{
      /* Color-based levels */
      const c1=(i*3+1)%COLORS;let c2=(i*7+3)%COLORS;if(c2===c1)c2=(c2+1)%COLORS;
      const useTwoColors=i>12;
      let t1;
      if(tier===0)t1=4+i*2;
      else if(tier===1)t1=15+Math.floor((i-10)*1.5);
      else if(tier===2)t1=30+Math.floor((i-25)*1.2);
      else if(tier===3)t1=55+Math.floor((i-50)*1.3);
      else t1=80+Math.floor((i-75)*1.5);
      const targets={};
      targets[c1]=Math.min(t1,130);
      if(useTwoColors){targets[c2]=Math.min(Math.max(3,Math.floor(t1*0.55)),100)}
      L.push({id:i,type:'colors',targets,reward});
    }
  }
  return L;
})();

/* ===== STATE ===== */
let grid=[],score=0,best=0,coins=0,combo=0;
let pieces=[],activePU=null,gameActive=false;
let cellSize=0,brdRect=null;
/* Level mode state */
let gameMode='infinite'; /* 'infinite' | 'level' */
let currentLevelId=0,currentLevel=null;
let lvlColorCleared={}; /* {colorIndex: count} */
let lvlCompleted=[],lvlUnlocked=1; /* persisted */
let lvlPage=0;

/* ===== DOM REFS ===== */
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const brd=$('#brd'),tray=$('#tray'),fx=$('#fx'),popups=$('#popups');
const hSc=$('#h-sc'),hBest=$('#h-best'),hCoin=$('#h-coin');
const comboTag=$('#combo-tag');
const puOverlay=$('#pu-overlay');
const lvlHud=$('#lvl-hud');
const screens={start:$('#s-start'),tut:$('#s-tut'),mode:$('#s-mode'),
  lvlSel:$('#s-lvl-sel'),lvlGoal:$('#s-lvl-goal'),game:$('#s-game'),
  over:$('#s-over'),pause:$('#s-pause'),lvlWin:$('#s-lvl-win'),lvlFail:$('#s-lvl-fail')};

/* ===== AUDIO ===== */
let audioCtx=null;
function ensureAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)()}
function playTone(f,d,t,v){try{ensureAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=t||'sine';o.frequency.value=f;g.gain.setValueAtTime(v||.15,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+d);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+d)}catch(e){}}
function sfxPlace(){playTone(520,.12,'triangle',.12)}
function sfxPop(){playTone(880,.18,'sine',.13)}
function sfxLine(){playTone(660,.25,'square',.1);setTimeout(()=>playTone(880,.2,'square',.1),80)}
function sfxCombo(){playTone(1100,.15,'sine',.15)}
function sfxGameOver(){playTone(220,.4,'sawtooth',.1);setTimeout(()=>playTone(165,.5,'sawtooth',.1),200)}
function sfxRotate(){playTone(700,.08,'triangle',.1)}
function sfxPowerUp(){playTone(1200,.1,'sine',.12);setTimeout(()=>playTone(1500,.15,'sine',.12),60)}
function sfxWin(){playTone(660,.15,'sine',.12);setTimeout(()=>playTone(880,.15,'sine',.12),100);setTimeout(()=>playTone(1100,.25,'sine',.12),200)}

/* ===== PERSISTENCE ===== */
function loadSave(){
  best=parseInt(localStorage.getItem('bp_best'))||0;
  coins=parseInt(localStorage.getItem('bp_coins'))||0;
  try{
    const d=JSON.parse(localStorage.getItem('bp_lvl'));
    if(d){lvlCompleted=d.c||[];lvlUnlocked=d.u||1;}
  }catch(e){}
}
function saveBest(){localStorage.setItem('bp_best',best)}
function saveCoins(){localStorage.setItem('bp_coins',coins)}
function saveLvl(){localStorage.setItem('bp_lvl',JSON.stringify({c:lvlCompleted,u:lvlUnlocked}))}
function updateHUD(){
  hSc.textContent=score;hBest.textContent=best;hCoin.textContent=coins;
  $('#home-coins').textContent=coins;$('#home-best').textContent=best;
}

loadSave();updateHUD();

/* ===== BUTTON WIRING ===== */
$('#b-play').onclick=()=>showScreen('mode');
$('#b-how').onclick=()=>showScreen('tut');
$('#b-tut-ok').onclick=()=>showScreen('start');
$('#b-mode-back').onclick=()=>showScreen('start');
$('#b-infinite').onclick=()=>{gameMode='infinite';startGame()};
$('#b-levels').onclick=()=>{gameMode='level';showLevelSelect()};
$('#b-lvl-back').onclick=()=>showScreen('mode');
$('#b-goal-back').onclick=()=>showLevelSelect();
$('#b-lvl-start').onclick=()=>startLevelGame();
$('#b-menu').onclick=()=>{if(gameActive)showScreen('pause')};
$('#b-resume').onclick=()=>showScreen('game');
$('#b-redo').onclick=()=>{if(gameMode==='level')startLevelGame();else startGame()};
$('#b-quit').onclick=()=>{gameActive=false;if(gameMode==='level')showLevelSelect();else showScreen('start')};
$('#b-retry').onclick=()=>startGame();
$('#b-home2').onclick=()=>showScreen('start');
$('#b-next-lvl').onclick=()=>goNextLevel();
$('#b-win-sel').onclick=()=>showLevelSelect();
$('#b-retry-lvl').onclick=()=>startLevelGame();
$('#b-fail-sel').onclick=()=>showLevelSelect();
$$('.pu-btn').forEach(b=>b.onclick=()=>activatePU(b.dataset.pu));

/* Page nav */
$('#b-pg-prev').onclick=()=>{if(lvlPage>0){lvlPage--;renderLevelGrid()}};
$('#b-pg-next').onclick=()=>{const maxP=Math.ceil(LEVELS.length/LEVELS_PER_PAGE)-1;if(lvlPage<maxP){lvlPage++;renderLevelGrid()}};

/* ===== SCREEN NAV ===== */
function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.remove('active'));
  screens[name].classList.add('active');
  if(name==='game')cancelPU();
}

/* ===== BOARD ===== */
function buildBoard(){
  brd.innerHTML='';grid=[];
  for(let r=0;r<G;r++){grid[r]=[];for(let c=0;c<G;c++){
    grid[r][c]=-1;
    const d=document.createElement('div');d.className='cell';d.dataset.r=r;d.dataset.c=c;brd.appendChild(d);
  }}
}
function cellAt(r,c){return brd.children[r*G+c]}
function refreshBoard(){
  for(let r=0;r<G;r++)for(let c=0;c<G;c++){
    const el=cellAt(r,c),v=grid[r][c];
    el.className='cell'+(v>=0?' filled c'+v:'');
  }
}
function measureBoard(){brdRect=brd.getBoundingClientRect();cellSize=brdRect.width/G}

/* ===== PIECES ===== */
const TEMPLATES=[
  [[0,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[0,2],[0,3]],[[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[1,0]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[1,1]],[[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0]],[[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1],[2,1]],[[0,1],[1,0],[1,1],[2,0]],
  [[0,0],[0,1],[0,2],[1,1]],
  [[0,0]],[[0,0],[0,1]],[[0,0],[1,0]],
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],[[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
];
function randColor(){return Math.floor(Math.random()*COLORS)}
function randTemplate(){return TEMPLATES[Math.floor(Math.random()*TEMPLATES.length)]}

function makePiece(){
  for(let a=0;a<50;a++){
    const t=randTemplate(),uni=t.length<3||Math.random()<0.5,bc=randColor();
    const cells=t.map(([dr,dc])=>({dr,dc,col:uni?bc:randColor()}));
    if(!pieceHasMatch(cells))return{cells,rotation:0};
  }
  const t=randTemplate(),cols=[...Array(COLORS).keys()];
  return{cells:t.map(([dr,dc],i)=>({dr,dc,col:cols[i%COLORS]})),rotation:0};
}

function pieceHasMatch(cells){
  if(cells.length<MIN)return false;
  const ps=new Set(cells.map(c=>c.dr+','+c.dc)),ca={};
  cells.forEach(c=>{ca[c.dr+','+c.dc]=c.col});
  const vis=new Set();
  for(const c of cells){
    const k=c.dr+','+c.dc;if(vis.has(k))continue;
    const col=c.col,grp=[],q=[k];vis.add(k);
    while(q.length){const cur=q.shift();grp.push(cur);const[cr,cc]=cur.split(',').map(Number);
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nk=(cr+dr)+','+(cc+dc);
        if(!vis.has(nk)&&ps.has(nk)&&ca[nk]===col){vis.add(nk);q.push(nk)}}}
    if(grp.length>=MIN)return true;
  }
  return false;
}

function spawnPieces(){
  pieces=[];tray.innerHTML='';
  for(let i=0;i<3;i++){const p=makePiece();pieces.push(p);tray.appendChild(renderPiece(p,i))}
}

const ROTATE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';

function renderPiece(p,idx){
  const maxR=Math.max(...p.cells.map(c=>c.dr))+1,maxC=Math.max(...p.cells.map(c=>c.dc))+1;
  const sz=Math.max(Math.min(Math.floor((tray.clientWidth/3-24)/Math.max(maxR,maxC)),26),14);
  const el=document.createElement('div');el.className='piece';el.dataset.idx=idx;
  el.style.gridTemplateColumns=`repeat(${maxC},${sz}px)`;el.style.gridTemplateRows=`repeat(${maxR},${sz}px)`;
  const set=new Set(p.cells.map(c=>c.dr+','+c.dc));
  for(let r=0;r<maxR;r++)for(let c=0;c<maxC;c++){
    const d=document.createElement('div');d.className='pc';
    if(set.has(r+','+c)){const cell=p.cells.find(x=>x.dr===r&&x.dc===c);d.classList.add('filled','c'+cell.col)}
    else d.style.visibility='hidden';el.appendChild(d);
  }
  const hint=document.createElement('div');hint.className='rotate-hint';hint.innerHTML=ROTATE_SVG;el.appendChild(hint);
  el.addEventListener('pointerdown',e=>onPieceDown(e,idx));
  el.addEventListener('click',e=>{if(!el._dragged)rotatePiece(idx)});
  return el;
}

function reRenderTray(){
  tray.innerHTML='';pieces.forEach((p,i)=>{if(p)tray.appendChild(renderPiece(p,i))});
  if(pieces.every(p=>!p))spawnPieces();
}

/* ===== DRAG & DROP (improved precision) ===== */
let ghostCells=[];
function onPieceDown(e,idx){
  if(!gameActive||activePU)return;
  const p=pieces[idx];if(!p)return;
  e.preventDefault();
  const el=tray.children[Array.from(tray.children).findIndex(c=>parseInt(c.dataset.idx)===idx)];
  if(!el)return;
  el._dragged=false;
  const startX=e.clientX,startY=e.clientY;
  let moved=false;
  const maxR=Math.max(...p.cells.map(c=>c.dr))+1,maxC=Math.max(...p.cells.map(c=>c.dc))+1;
  const sz=cellSize;
  const clone=document.createElement('div');clone.className='piece dragging';
  clone.style.gridTemplateColumns=`repeat(${maxC},${sz}px)`;clone.style.gridTemplateRows=`repeat(${maxR},${sz}px)`;
  const set=new Set(p.cells.map(c=>c.dr+','+c.dc));
  for(let r=0;r<maxR;r++)for(let c=0;c<maxC;c++){
    const d=document.createElement('div');d.className='pc';
    if(set.has(r+','+c)){const cell=p.cells.find(x=>x.dr===r&&x.dc===c);d.classList.add('filled','c'+cell.col)}
    else d.style.visibility='hidden';clone.appendChild(d);
  }
  const halfW=(maxC*sz)/2,halfH=(maxR*sz)/2;

  function placeClone(cx,cy){clone.style.left=(cx-halfW)+'px';clone.style.top=(cy-halfH-LIFT)+'px'}

  function getGridPos(cx,cy){
    measureBoard();
    const bx=cx-brdRect.left,by=(cy-LIFT)-brdRect.top;
    const centerDr=p.cells.reduce((s,c)=>s+c.dr,0)/p.cells.length;
    const centerDc=p.cells.reduce((s,c)=>s+c.dc,0)/p.cells.length;
    /* Snap to nearest half-cell for better precision */
    let gr=Math.round(by/cellSize-centerDr);
    let gc=Math.round(bx/cellSize-centerDc);
    /* Clamp to keep piece mostly on board */
    const minR=Math.min(...p.cells.map(c=>c.dr)),minC=Math.min(...p.cells.map(c=>c.dc));
    gr=Math.max(-minR,Math.min(G-maxR+minR,gr));
    gc=Math.max(-minC,Math.min(G-maxC+minC,gc));
    return{gr,gc};
  }

  function canPlace(gr,gc){
    return p.cells.every(({dr,dc})=>{const r=gr+dr,c=gc+dc;return r>=0&&r<G&&c>=0&&c<G&&grid[r][c]<0});
  }

  function showGhost(cx,cy){
    clearGhost();
    const{gr,gc}=getGridPos(cx,cy);
    const ok=canPlace(gr,gc);
    p.cells.forEach(({dr,dc})=>{const r=gr+dr,c=gc+dc;
      if(r>=0&&r<G&&c>=0&&c<G){const el2=cellAt(r,c);el2.classList.add(ok?'ghost':'ghost-bad');ghostCells.push(el2)}
    });
  }

  function clearGhost(){ghostCells.forEach(e2=>{e2.classList.remove('ghost','ghost-bad')});ghostCells=[]}

  function onMove(e2){
    if(!moved){const dx=e2.clientX-startX,dy=e2.clientY-startY;
      if(Math.abs(dx)<5&&Math.abs(dy)<5)return;
      moved=true;el._dragged=true;document.body.appendChild(clone);el.style.opacity='0.3';
    }
    placeClone(e2.clientX,e2.clientY);showGhost(e2.clientX,e2.clientY);
  }

  function onUp(e2){
    document.removeEventListener('pointermove',onMove);
    document.removeEventListener('pointerup',onUp);
    clearGhost();if(!moved)return;
    clone.remove();el.style.opacity='';
    const{gr,gc}=getGridPos(e2.clientX,e2.clientY);
    if(canPlace(gr,gc)){
      p.cells.forEach(({dr,dc,col})=>{grid[gr+dr][gc+dc]=col});
      pieces[idx]=null;refreshBoard();sfxPlace();addScore(p.cells.length);combo=0;
      runClears(()=>{reRenderTray();checkEnd()});
    }
  }
  document.addEventListener('pointermove',onMove);
  document.addEventListener('pointerup',onUp);
}

/* ===== ROTATION ===== */
function rotatePiece(idx){
  const p=pieces[idx];if(!p)return;sfxRotate();
  const maxR=Math.max(...p.cells.map(c=>c.dr))+1;
  p.cells=p.cells.map(({dr,dc,col})=>({dr:dc,dc:maxR-1-dr,col}));
  p.rotation=(p.rotation+1)%4;
  const minR=Math.min(...p.cells.map(c=>c.dr)),minC=Math.min(...p.cells.map(c=>c.dc));
  p.cells.forEach(c=>{c.dr-=minR;c.dc-=minC});
  reRenderTray();
}

/* ===== CLEARING ===== */
function floodGroups(){
  const vis=Array.from({length:G},()=>Array(G).fill(false)),groups=[];
  for(let r=0;r<G;r++)for(let c=0;c<G;c++){
    if(vis[r][c]||grid[r][c]<0)continue;const col=grid[r][c];
    const grp=[],q=[[r,c]];vis[r][c]=true;
    while(q.length){const[cr,cc]=q.shift();grp.push({idx:cr*G+cc,col});
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){const nr=cr+dr,nc=cc+dc;
        if(nr>=0&&nr<G&&nc>=0&&nc<G&&!vis[nr][nc]&&grid[nr][nc]===col){vis[nr][nc]=true;q.push([nr,nc])}}}
    if(grp.length>=MIN)groups.push(grp);
  }
  return groups;
}

function findClears(){
  const colorGroups=floodGroups(),clearSet=new Set(),clearedColors={};
  for(const g of colorGroups){
    for(const{idx,col}of g){clearSet.add(idx);clearedColors[col]=(clearedColors[col]||0)+1}
  }
  let lineCount=0;
  for(let r=0;r<G;r++){if(grid[r].every(v=>v>=0)){lineCount++;for(let c=0;c<G;c++){
    const col=grid[r][c];if(col>=0)clearedColors[col]=(clearedColors[col]||0)+(clearSet.has(r*G+c)?0:1);
    clearSet.add(r*G+c)}}}
  for(let c=0;c<G;c++){let full=true;for(let r=0;r<G;r++)if(grid[r][c]<0){full=false;break}
    if(full){lineCount++;for(let r=0;r<G;r++){
      const col=grid[r][c];if(col>=0)clearedColors[col]=(clearedColors[col]||0)+(clearSet.has(r*G+c)?0:1);
      clearSet.add(r*G+c)}}}
  return{clearSet,lineCount,clearedColors};
}

function runClears(cb){
  const{clearSet,lineCount,clearedColors}=findClears();
  if(clearSet.size===0){cb&&cb();return}
  combo++;
  const pts=clearSet.size*10+(lineCount*100)+(combo>1?(combo-1)*50:0);
  addScore(pts);

  /* Track colors for level mode */
  if(gameMode==='level'){
    for(const col in clearedColors){lvlColorCleared[col]=(lvlColorCleared[col]||0)+clearedColors[col]}
    updateLvlHud();
  }

  if(combo>1){comboTag.textContent='COMBO x'+combo;comboTag.classList.add('show');setTimeout(()=>comboTag.classList.remove('show'),900);sfxCombo()}
  if(lineCount>0)sfxLine();else sfxPop();
  clearSet.forEach(k=>{const r=Math.floor(k/G),c=k%G;cellAt(r,c).classList.add('pop-flash');spawnParticles(r,c,grid[r][c])});
  showScoreFloat(clearSet,pts);

  setTimeout(()=>{
    clearSet.forEach(k=>{const r=Math.floor(k/G),c=k%G;grid[r][c]=-1});
    refreshBoard();
    /* Check level goal after each clear cascade */
    if(gameMode==='level'&&checkLevelGoal()){return}
    runClears(cb);
  },300);
}

/* ===== POWER-UPS ===== */
function activatePU(type){
  if(!gameActive)return;
  if(activePU===type){cancelPU();return}
  if(coins<PU_COST[type]){showPopup('Not enough coins!');return}
  if(type==='shuffle'){coins-=PU_COST[type];saveCoins();updateHUD();updatePUButtons();sfxPowerUp();spawnPieces();showPopup('Shuffled!');return}
  activePU=type;puOverlay.classList.remove('hide');
  $$('.pu-btn').forEach(b=>b.classList.toggle('active-pu',b.dataset.pu===type));
  puOverlay.onclick=e=>handlePUClick(e);
}
function cancelPU(){activePU=null;puOverlay.classList.add('hide');puOverlay.onclick=null;$$('.pu-btn').forEach(b=>b.classList.remove('active-pu'))}
function handlePUClick(e){
  measureBoard();const x=e.clientX-brdRect.left,y=e.clientY-brdRect.top;
  const r=Math.floor(y/cellSize),c=Math.floor(x/cellSize);
  if(r<0||r>=G||c<0||c>=G){cancelPU();return}
  if(activePU==='hammer'){
    if(grid[r][c]<0){cancelPU();return}
    coins-=PU_COST.hammer;saveCoins();sfxPowerUp();spawnParticles(r,c,grid[r][c]);
    grid[r][c]=-1;refreshBoard();updateHUD();updatePUButtons();cancelPU();combo=0;runClears(()=>checkEnd());
  }else if(activePU==='bomb'){
    coins-=PU_COST.bomb;saveCoins();sfxPowerUp();
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<G&&nc>=0&&nc<G&&grid[nr][nc]>=0){spawnParticles(nr,nc,grid[nr][nc]);grid[nr][nc]=-1}}
    refreshBoard();updateHUD();updatePUButtons();cancelPU();combo=0;runClears(()=>checkEnd());
  }
}
function updatePUButtons(){$$('.pu-btn').forEach(b=>{b.disabled=coins<PU_COST[b.dataset.pu]})}

/* ===== SCORING ===== */
function addScore(pts){score+=pts;if(gameMode==='infinite'&&score>best){best=score;saveBest()}updateHUD();updatePUButtons();if(gameMode==='level')updateLvlHud()}
function earnCoins(amount){coins+=amount;saveCoins();return amount}

/* ===== LEVEL UI ===== */
function showLevelSelect(){
  /* Set page to show current unlocked level */
  lvlPage=Math.floor((lvlUnlocked-1)/LEVELS_PER_PAGE);
  renderLevelGrid();
  showScreen('lvlSel');
}

function renderLevelGrid(){
  const grid=$('#lvl-grid');grid.innerHTML='';
  const start=lvlPage*LEVELS_PER_PAGE;
  const end=Math.min(start+LEVELS_PER_PAGE,100);
  for(let i=start+1;i<=end;i++){
    const btn=document.createElement('div');btn.className='lvl-cell';btn.textContent=i;
    if(lvlCompleted.includes(i))btn.classList.add('done');
    else if(i===lvlUnlocked)btn.classList.add('current');
    else if(i>lvlUnlocked)btn.classList.add('locked');
    if(i<=lvlUnlocked){btn.onclick=()=>showLevelGoal(i)}
    grid.appendChild(btn);
  }
  const maxP=Math.ceil(100/LEVELS_PER_PAGE);
  $('#pg-info').textContent=(lvlPage+1)+' / '+maxP;
  $('#b-pg-prev').disabled=lvlPage<=0;
  $('#b-pg-next').disabled=lvlPage>=maxP-1;
}

function showLevelGoal(id){
  currentLevelId=id;
  const lvl=LEVELS[id-1];if(!lvl)return;
  $('#goal-num').textContent=id;
  const body=$('#goal-body');body.innerHTML='';
  if(lvl.type==='score'){
    const row=document.createElement('div');row.className='goal-row';
    row.innerHTML='<span class="goal-score-ico">🎯</span> Reach <b>'+lvl.target+'</b> points';
    body.appendChild(row);
  }else{
    for(const ci in lvl.targets){
      const row=document.createElement('div');row.className='goal-row';
      row.innerHTML='<span class="goal-dot c'+ci+'"></span> Clear <b>'+lvl.targets[ci]+'</b> '+COLOR_NAME[ci];
      body.appendChild(row);
    }
  }
  const rw=document.createElement('div');rw.className='goal-row';
  rw.innerHTML='<span class="coin-ico">★</span> Reward: <b>'+lvl.reward+'</b> coins';
  rw.style.marginTop='8px';rw.style.fontSize='14px';rw.style.color='rgba(255,255,255,.5)';
  body.appendChild(rw);
  showScreen('lvlGoal');
}

function setupLvlHud(){
  lvlHud.innerHTML='';lvlHud.classList.add('show');
  const lbl=document.createElement('span');lbl.className='lvl-hud-label';
  lbl.textContent='Lv.'+currentLevelId;lvlHud.appendChild(lbl);
  if(currentLevel.type==='score'){
    const item=document.createElement('div');item.className='lvl-prog-item';
    item.innerHTML='<span class="goal-score-ico" style="font-size:14px">🎯</span>'+
      '<div class="lvl-prog-bar"><div class="lvl-prog-fill" id="lp-score" style="width:0%"></div></div>'+
      '<span class="lvl-prog-text" id="lp-score-t">0/'+currentLevel.target+'</span>';
    lvlHud.appendChild(item);
  }else{
    for(const ci in currentLevel.targets){
      const item=document.createElement('div');item.className='lvl-prog-item';
      item.innerHTML='<span class="lvl-prog-dot c'+ci+'"></span>'+
        '<div class="lvl-prog-bar"><div class="lvl-prog-fill" id="lp-c'+ci+'" style="width:0%"></div></div>'+
        '<span class="lvl-prog-text" id="lp-t'+ci+'">0/'+currentLevel.targets[ci]+'</span>';
      lvlHud.appendChild(item);
    }
  }
}

function updateLvlHud(){
  if(!currentLevel)return;
  if(currentLevel.type==='score'){
    const pct=Math.min(100,score/currentLevel.target*100);
    const bar=$('#lp-score');if(bar){bar.style.width=pct+'%';if(pct>=100)bar.classList.add('done')}
    const txt=$('#lp-score-t');if(txt)txt.textContent=Math.min(score,currentLevel.target)+'/'+currentLevel.target;
  }else{
    for(const ci in currentLevel.targets){
      const cur=lvlColorCleared[ci]||0,tgt=currentLevel.targets[ci];
      const pct=Math.min(100,cur/tgt*100);
      const bar=$('#lp-c'+ci);if(bar){bar.style.width=pct+'%';if(pct>=100)bar.classList.add('done')}
      const txt=$('#lp-t'+ci);if(txt)txt.textContent=Math.min(cur,tgt)+'/'+tgt;
    }
  }
}

/* ===== GAME FLOW ===== */
function canPlaceAny(){
  for(const p of pieces){if(!p)continue;
    for(let r=0;r<G;r++)for(let c=0;c<G;c++){
      if(p.cells.every(({dr,dc})=>{const nr=r+dr,nc=c+dc;return nr>=0&&nr<G&&nc>=0&&nc<G&&grid[nr][nc]<0}))return true;
    }}
  return false;
}

function checkEnd(){
  if(!gameActive)return;
  const remaining=pieces.filter(p=>p);
  if(remaining.length===0)return;
  if(!canPlaceAny()){
    gameActive=false;
    if(gameMode==='level'){onLevelFail()}
    else{onInfiniteOver()}
  }
}

function onInfiniteOver(){
  const earned=earnCoins(Math.floor(score/10));
  sfxGameOver();
  setTimeout(()=>{
    $('#o-sc').textContent=score;$('#o-earn').textContent=earned;$('#o-best').textContent=best;
    $('#o-new').style.display=score>=best?'inline-block':'none';
    updateHUD();showScreen('over');
  },400);
}

function onLevelFail(){
  sfxGameOver();
  setTimeout(()=>{
    let desc='Goal not reached.';
    if(currentLevel.type==='score')desc='Score: '+score+' / '+currentLevel.target;
    else{const parts=[];for(const ci in currentLevel.targets){parts.push(COLOR_NAME[ci]+': '+(lvlColorCleared[ci]||0)+'/'+currentLevel.targets[ci])}desc=parts.join(', ')}
    $('#fail-desc').textContent=desc;
    showScreen('lvlFail');
  },400);
}

function checkLevelGoal(){
  if(!currentLevel||!gameActive)return false;
  let met=false;
  if(currentLevel.type==='score'){met=score>=currentLevel.target}
  else{met=true;for(const ci in currentLevel.targets){if((lvlColorCleared[ci]||0)<currentLevel.targets[ci]){met=false;break}}}
  if(met){
    gameActive=false;
    const reward=currentLevel.reward||10;
    earnCoins(reward);
    if(!lvlCompleted.includes(currentLevelId)){lvlCompleted.push(currentLevelId);if(currentLevelId>=lvlUnlocked)lvlUnlocked=currentLevelId+1;saveLvl()}
    sfxWin();
    setTimeout(()=>{
      const stars=score>=(currentLevel.target||0)*2?3:score>=(currentLevel.target||0)*1.3?2:1;
      $('#win-stars').textContent='⭐'.repeat(stars);
      $('#win-sc-v').textContent=score;$('#win-coins-v').textContent=reward;
      if(currentLevelId>=100)$('#b-next-lvl').style.display='none';else $('#b-next-lvl').style.display='';
      updateHUD();showScreen('lvlWin');
    },400);
    return true;
  }
  return false;
}

function startGame(){
  gameMode='infinite';buildBoard();score=0;combo=0;gameActive=true;
  lvlHud.classList.remove('show');lvlHud.innerHTML='';
  updateHUD();showScreen('game');
  requestAnimationFrame(()=>{measureBoard();spawnPieces();updatePUButtons()});
}

function startLevelGame(){
  currentLevel=LEVELS[currentLevelId-1];if(!currentLevel)return;
  buildBoard();score=0;combo=0;gameActive=true;lvlColorCleared={};
  setupLvlHud();updateHUD();showScreen('game');
  requestAnimationFrame(()=>{measureBoard();spawnPieces();updatePUButtons()});
}

function goNextLevel(){
  currentLevelId++;
  if(currentLevelId>100){showLevelSelect();return}
  showLevelGoal(currentLevelId);
}

window.addEventListener('resize',()=>{if(gameActive)measureBoard()});

/* ===== FX ===== */
function spawnParticles(r,c,col){
  measureBoard();const cx=c*cellSize+cellSize/2,cy=r*cellSize+cellSize/2;
  for(let i=0;i<6;i++){const p=document.createElement('div');p.className='particle';
    p.style.background=COLOR_HEX[col]||'#fff';p.style.left=cx+'px';p.style.top=cy+'px';
    const a=Math.random()*Math.PI*2,d=20+Math.random()*30;
    p.style.setProperty('--tx',Math.cos(a)*d+'px');p.style.setProperty('--ty',Math.sin(a)*d+'px');
    fx.appendChild(p);setTimeout(()=>p.remove(),600);
  }
}
function showScoreFloat(clearSet,pts){
  let sR=0,sC=0,n=clearSet.size;clearSet.forEach(k=>{sR+=Math.floor(k/G);sC+=k%G});
  const el=document.createElement('div');el.className='score-float';el.textContent='+'+pts;
  el.style.left=(sC/n*cellSize+cellSize/2)+'px';el.style.top=(sR/n*cellSize)+'px';
  fx.appendChild(el);setTimeout(()=>el.remove(),900);
}
function showPopup(msg){const el=document.createElement('div');el.className='popup-msg';el.textContent=msg;popups.appendChild(el);setTimeout(()=>el.remove(),1000)}

})();
