/* BlockPop – game.js v4 (No Ads, Coins-Only Power-ups) */
(function(){
"use strict";

/* ===== CONSTANTS ===== */
const G=10, MIN=3, COLORS=5, LIFT=60;
const COLOR_HEX=["#ef4444","#3b82f6","#22c55e","#f59e0b","#a855f7"];
const PU_COST={hammer:50,bomb:100,shuffle:80};

/* ===== PIECE TEMPLATES ===== */
const TEMPLATES=[
  [[0,0],[0,1],[0,2]],
  [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[0,2],[0,3]],
  [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[1,0]],
  [[0,0],[0,1],[1,1]],
  [[0,0],[1,0],[1,1]],
  [[0,1],[1,0],[1,1]],
  [[0,0],[0,1],[0,2],[1,0]],
  [[0,0],[0,1],[0,2],[1,2]],
  [[0,0],[1,0],[1,1],[2,1]],
  [[0,1],[1,0],[1,1],[2,0]],
  [[0,0],[0,1],[0,2],[1,1]],
  [[0,0]],
  [[0,0],[0,1]],
  [[0,0],[1,0]],
  [[0,0],[0,1],[0,2],[1,0],[1,1],[1,2]],
  [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1]],
  [[0,0],[0,1],[0,2],[0,3],[0,4]],
];

/* ===== STATE ===== */
let grid=[], score=0, best=0, coins=0, combo=0;
let pieces=[], activePU=null, gameActive=false;
let cellSize=0, brdRect=null;

/* ===== DOM REFS ===== */
const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const brd=$('#brd'), tray=$('#tray'), fx=$('#fx'), popups=$('#popups');
const hSc=$('#h-sc'), hBest=$('#h-best'), hCoin=$('#h-coin');
const comboTag=$('#combo-tag');
const puOverlay=$('#pu-overlay');
const screens={start:$('#s-start'),tut:$('#s-tut'),game:$('#s-game'),over:$('#s-over'),pause:$('#s-pause')};

/* ===== AUDIO ===== */
let audioCtx=null;
function ensureAudio(){if(!audioCtx)audioCtx=new(window.AudioContext||window.webkitAudioContext)()}
function playTone(freq,dur,type,vol){
  try{ensureAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();
  o.type=type||'sine';o.frequency.value=freq;g.gain.setValueAtTime(vol||.15,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);
  o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+dur);}catch(e){}
}
function sfxPlace(){playTone(520,.12,'triangle',.12)}
function sfxPop(){playTone(880,.18,'sine',.13)}
function sfxLine(){playTone(660,.25,'square',.1);setTimeout(()=>playTone(880,.2,'square',.1),80)}
function sfxCombo(){playTone(1100,.15,'sine',.15)}
function sfxGameOver(){playTone(220,.4,'sawtooth',.1);setTimeout(()=>playTone(165,.5,'sawtooth',.1),200)}
function sfxRotate(){playTone(700,.08,'triangle',.1)}
function sfxPowerUp(){playTone(1200,.1,'sine',.12);setTimeout(()=>playTone(1500,.15,'sine',.12),60)}

/* ===== INIT ===== */
function loadSave(){
  best=parseInt(localStorage.getItem('bp_best'))||0;
  coins=parseInt(localStorage.getItem('bp_coins'))||0;
}
function saveBest(){localStorage.setItem('bp_best',best)}
function saveCoins(){localStorage.setItem('bp_coins',coins)}
function updateHUD(){
  hSc.textContent=score;hBest.textContent=best;hCoin.textContent=coins;
  $('#home-coins').textContent=coins;$('#home-best').textContent=best;
}

loadSave();updateHUD();

/* Button wiring */
$('#b-play').onclick=()=>startGame();
$('#b-how').onclick=()=>showScreen('tut');
$('#b-tut-ok').onclick=()=>showScreen('start');
$('#b-menu').onclick=()=>{if(gameActive)showScreen('pause')};
$('#b-resume').onclick=()=>showScreen('game');
$('#b-redo').onclick=()=>startGame();
$('#b-quit').onclick=()=>{gameActive=false;showScreen('start')};
$('#b-retry').onclick=()=>startGame();
$('#b-home2').onclick=()=>showScreen('start');

/* Power-up buttons */
$$('.pu-btn').forEach(b=>b.onclick=()=>activatePU(b.dataset.pu));

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
function measureBoard(){
  brdRect=brd.getBoundingClientRect();
  cellSize=brdRect.width/G;
}

/* ===== PIECES ===== */
function randColor(){return Math.floor(Math.random()*COLORS)}
function randTemplate(){return TEMPLATES[Math.floor(Math.random()*TEMPLATES.length)]}

function makePiece(){
  for(let attempt=0;attempt<50;attempt++){
    const tmpl=randTemplate();
    const uniform=tmpl.length<3||Math.random()<0.5;
    const baseCol=randColor();
    const cells=tmpl.map(([dr,dc])=>({dr,dc,col:uniform?baseCol:randColor()}));
    if(!pieceHasMatch(cells))return{cells,rotation:0};
  }
  /* fallback: all different colors guaranteed */
  const tmpl=randTemplate();
  const cols=[...Array(COLORS).keys()];
  const cells=tmpl.map(([dr,dc],i)=>({dr,dc,col:cols[i%COLORS]}));
  return{cells,rotation:0};
}

/* Check if a piece's cells contain a connected group of >=MIN same-color */
function pieceHasMatch(cells){
  if(cells.length<MIN)return false;
  const posSet=new Set(cells.map(c=>c.dr+','+c.dc));
  const colorAt={};
  cells.forEach(c=>{colorAt[c.dr+','+c.dc]=c.col});
  const visited=new Set();
  for(const c of cells){
    const key=c.dr+','+c.dc;
    if(visited.has(key))continue;
    const col=c.col;
    const group=[];const q=[key];visited.add(key);
    while(q.length){
      const cur=q.shift();group.push(cur);
      const[cr,cc]=cur.split(',').map(Number);
      for(const[ddr,ddc]of[[0,1],[0,-1],[1,0],[-1,0]]){
        const nk=(cr+ddr)+','+(cc+ddc);
        if(!visited.has(nk)&&posSet.has(nk)&&colorAt[nk]===col){
          visited.add(nk);q.push(nk);
        }
      }
    }
    if(group.length>=MIN)return true;
  }
  return false;
}

function spawnPieces(){
  pieces=[];tray.innerHTML='';
  for(let i=0;i<3;i++){
    const p=makePiece();pieces.push(p);
    tray.appendChild(renderPiece(p,i));
  }
}

/* SVG rotation icon */
const ROTATE_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';

function renderPiece(p,idx){
  const maxR=Math.max(...p.cells.map(c=>c.dr))+1;
  const maxC=Math.max(...p.cells.map(c=>c.dc))+1;
  const sz=Math.max(Math.min(Math.floor((tray.clientWidth/3-24)/Math.max(maxR,maxC)),26),14);
  const el=document.createElement('div');
  el.className='piece';el.dataset.idx=idx;
  el.style.gridTemplateColumns=`repeat(${maxC},${sz}px)`;
  el.style.gridTemplateRows=`repeat(${maxR},${sz}px)`;
  const set=new Set(p.cells.map(c=>c.dr+','+c.dc));
  for(let r=0;r<maxR;r++)for(let c=0;c<maxC;c++){
    const d=document.createElement('div');d.className='pc';
    if(set.has(r+','+c)){const cell=p.cells.find(x=>x.dr===r&&x.dc===c);d.classList.add('filled','c'+cell.col)}
    else d.style.visibility='hidden';
    el.appendChild(d);
  }
  /* rotation icon indicator */
  const hint=document.createElement('div');hint.className='rotate-hint';
  hint.innerHTML=ROTATE_SVG;
  el.appendChild(hint);
  /* events */
  el.addEventListener('pointerdown',e=>onPieceDown(e,idx));
  el.addEventListener('click',e=>{if(!el._dragged)rotatePiece(idx)});
  return el;
}

function reRenderTray(){
  tray.innerHTML='';
  pieces.forEach((p,i)=>{if(p)tray.appendChild(renderPiece(p,i))});
  if(pieces.every(p=>!p))spawnPieces();
}

/* ===== DRAG & DROP ===== */
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

  const maxR=Math.max(...p.cells.map(c=>c.dr))+1;
  const maxC=Math.max(...p.cells.map(c=>c.dc))+1;
  const sz=cellSize;
  const clone=document.createElement('div');
  clone.className='piece dragging';
  clone.style.gridTemplateColumns=`repeat(${maxC},${sz}px)`;
  clone.style.gridTemplateRows=`repeat(${maxR},${sz}px)`;
  const set=new Set(p.cells.map(c=>c.dr+','+c.dc));
  for(let r=0;r<maxR;r++)for(let c=0;c<maxC;c++){
    const d=document.createElement('div');d.className='pc';
    if(set.has(r+','+c)){const cell=p.cells.find(x=>x.dr===r&&x.dc===c);d.classList.add('filled','c'+cell.col)}
    else d.style.visibility='hidden';
    clone.appendChild(d);
  }

  const halfW=(maxC*sz)/2, halfH=(maxR*sz)/2;

  function placeClone(cx,cy){
    clone.style.left=(cx-halfW)+'px';
    clone.style.top=(cy-halfH-LIFT)+'px';
  }

  function getGridPos(cx,cy){
    measureBoard();
    const bx=cx-brdRect.left, by=(cy-LIFT)-brdRect.top;
    const centerDr=p.cells.reduce((s,c)=>s+c.dr,0)/p.cells.length;
    const centerDc=p.cells.reduce((s,c)=>s+c.dc,0)/p.cells.length;
    const gr=Math.round(by/cellSize-centerDr);
    const gc=Math.round(bx/cellSize-centerDc);
    return{gr,gc};
  }

  function canPlace(gr,gc){
    return p.cells.every(({dr,dc})=>{
      const r=gr+dr,c=gc+dc;
      return r>=0&&r<G&&c>=0&&c<G&&grid[r][c]<0;
    });
  }

  function showGhost(cx,cy){
    clearGhost();
    const{gr,gc}=getGridPos(cx,cy);
    const ok=canPlace(gr,gc);
    p.cells.forEach(({dr,dc})=>{
      const r=gr+dr,c=gc+dc;
      if(r>=0&&r<G&&c>=0&&c<G){
        const el2=cellAt(r,c);el2.classList.add(ok?'ghost':'ghost-bad');ghostCells.push(el2);
      }
    });
  }

  function clearGhost(){ghostCells.forEach(e2=>{e2.classList.remove('ghost','ghost-bad')});ghostCells=[]}

  function onMove(e2){
    if(!moved){
      const dx=e2.clientX-startX,dy=e2.clientY-startY;
      if(Math.abs(dx)<5&&Math.abs(dy)<5)return;
      moved=true;el._dragged=true;
      document.body.appendChild(clone);el.style.opacity='0.3';
    }
    placeClone(e2.clientX,e2.clientY);
    showGhost(e2.clientX,e2.clientY);
  }

  function onUp(e2){
    document.removeEventListener('pointermove',onMove);
    document.removeEventListener('pointerup',onUp);
    clearGhost();
    if(!moved)return;
    clone.remove();el.style.opacity='';
    const{gr,gc}=getGridPos(e2.clientX,e2.clientY);
    if(canPlace(gr,gc)){
      p.cells.forEach(({dr,dc,col})=>{grid[gr+dr][gc+dc]=col});
      pieces[idx]=null;
      refreshBoard();sfxPlace();
      addScore(p.cells.length);
      combo=0;
      runClears(()=>{
        reRenderTray();
        checkGameOver();
      });
    }
  }

  document.addEventListener('pointermove',onMove);
  document.addEventListener('pointerup',onUp);
}

/* ===== ROTATION ===== */
function rotatePiece(idx){
  const p=pieces[idx];if(!p)return;
  sfxRotate();
  const maxR=Math.max(...p.cells.map(c=>c.dr))+1;
  p.cells=p.cells.map(({dr,dc,col})=>({dr:dc,dc:maxR-1-dr,col}));
  p.rotation=(p.rotation+1)%4;
  const minR=Math.min(...p.cells.map(c=>c.dr));
  const minC=Math.min(...p.cells.map(c=>c.dc));
  p.cells.forEach(c=>{c.dr-=minR;c.dc-=minC});
  reRenderTray();
}

/* ===== CLEARING ===== */
function floodGroups(){
  const visited=Array.from({length:G},()=>Array(G).fill(false));
  const groups=[];
  for(let r=0;r<G;r++)for(let c=0;c<G;c++){
    if(visited[r][c]||grid[r][c]<0)continue;
    const col=grid[r][c];
    const group=[];const q=[[r,c]];visited[r][c]=true;
    while(q.length){
      const[cr,cc]=q.shift();group.push(cr*G+cc);
      for(const[dr,dc]of[[0,1],[0,-1],[1,0],[-1,0]]){
        const nr=cr+dr,nc=cc+dc;
        if(nr>=0&&nr<G&&nc>=0&&nc<G&&!visited[nr][nc]&&grid[nr][nc]===col){
          visited[nr][nc]=true;q.push([nr,nc]);
        }
      }
    }
    if(group.length>=MIN)groups.push(group);
  }
  return groups;
}

function findClears(){
  const colorGroups=floodGroups();
  const clearSet=new Set();
  for(const g of colorGroups)for(const k of g)clearSet.add(k);

  let lineCount=0;
  for(let r=0;r<G;r++){
    if(grid[r].every(v=>v>=0)){lineCount++;for(let c=0;c<G;c++)clearSet.add(r*G+c)}
  }
  for(let c=0;c<G;c++){
    let full=true;for(let r=0;r<G;r++)if(grid[r][c]<0){full=false;break}
    if(full){lineCount++;for(let r=0;r<G;r++)clearSet.add(r*G+c)}
  }
  return{clearSet,colorGroups,lineCount};
}

function runClears(cb){
  const{clearSet,lineCount}=findClears();
  if(clearSet.size===0){cb&&cb();return}
  combo++;
  const pts=clearSet.size*10+(lineCount*100)+(combo>1?(combo-1)*50:0);
  addScore(pts);

  if(combo>1){comboTag.textContent='COMBO x'+combo;comboTag.classList.add('show');
    setTimeout(()=>comboTag.classList.remove('show'),900);sfxCombo();}

  if(lineCount>0)sfxLine();else sfxPop();

  clearSet.forEach(k=>{
    const r=Math.floor(k/G),c=k%G;
    const el=cellAt(r,c);el.classList.add('pop-flash');
    spawnParticles(r,c,grid[r][c]);
  });
  showScoreFloat(clearSet,pts);

  setTimeout(()=>{
    clearSet.forEach(k=>{const r=Math.floor(k/G),c=k%G;grid[r][c]=-1});
    refreshBoard();
    runClears(cb);
  },300);
}

/* ===== POWER-UPS (coins only) ===== */
function activatePU(type){
  if(!gameActive)return;
  if(activePU===type){cancelPU();return}
  if(coins<PU_COST[type]){
    showPopup('Not enough coins!');
    return;
  }
  if(type==='shuffle'){
    coins-=PU_COST[type];saveCoins();updateHUD();updatePUButtons();sfxPowerUp();
    spawnPieces();showPopup('Shuffled!');return;
  }
  activePU=type;
  puOverlay.classList.remove('hide');
  $$('.pu-btn').forEach(b=>b.classList.toggle('active-pu',b.dataset.pu===type));
  puOverlay.onclick=e=>handlePUClick(e);
}

function cancelPU(){
  activePU=null;
  puOverlay.classList.add('hide');
  puOverlay.onclick=null;
  $$('.pu-btn').forEach(b=>b.classList.remove('active-pu'));
}

function handlePUClick(e){
  measureBoard();
  const x=e.clientX-brdRect.left, y=e.clientY-brdRect.top;
  const r=Math.floor(y/cellSize), c=Math.floor(x/cellSize);
  if(r<0||r>=G||c<0||c>=G){cancelPU();return}

  if(activePU==='hammer'){
    if(grid[r][c]<0){cancelPU();return}
    coins-=PU_COST.hammer;saveCoins();
    sfxPowerUp();
    spawnParticles(r,c,grid[r][c]);
    grid[r][c]=-1;refreshBoard();updateHUD();updatePUButtons();
    cancelPU();
    combo=0;runClears(()=>checkGameOver());
  }else if(activePU==='bomb'){
    coins-=PU_COST.bomb;saveCoins();
    sfxPowerUp();
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      const nr=r+dr,nc=c+dc;
      if(nr>=0&&nr<G&&nc>=0&&nc<G&&grid[nr][nc]>=0){
        spawnParticles(nr,nc,grid[nr][nc]);grid[nr][nc]=-1;
      }
    }
    refreshBoard();updateHUD();updatePUButtons();
    cancelPU();
    combo=0;runClears(()=>checkGameOver());
  }
}

function updatePUButtons(){
  $$('.pu-btn').forEach(b=>{
    const canAfford=coins>=PU_COST[b.dataset.pu];
    b.disabled=!canAfford;
  });
}

/* ===== SCORING & COINS ===== */
function addScore(pts){
  score+=pts;
  if(score>best){best=score;saveBest()}
  updateHUD();updatePUButtons();
}

function earnCoins(){
  const earned=Math.floor(score/10);
  coins+=earned;saveCoins();
  return earned;
}

/* ===== GAME OVER ===== */
function canPlaceAny(){
  for(const p of pieces){
    if(!p)continue;
    for(let r=0;r<G;r++)for(let c=0;c<G;c++){
      if(p.cells.every(({dr,dc})=>{const nr=r+dr,nc=c+dc;return nr>=0&&nr<G&&nc>=0&&nc<G&&grid[nr][nc]<0}))return true;
    }
  }
  return false;
}

function checkGameOver(){
  if(!gameActive)return;
  const remaining=pieces.filter(p=>p);
  if(remaining.length===0)return;
  if(!canPlaceAny()){
    gameActive=false;
    const earned=earnCoins();
    sfxGameOver();
    setTimeout(()=>{
      $('#o-sc').textContent=score;
      $('#o-earn').textContent=earned;
      $('#o-best').textContent=best;
      $('#o-new').style.display=score>=best?'inline-block':'none';
      updateHUD();
      showScreen('over');
    },400);
  }
}

function startGame(){
  buildBoard();
  score=0;combo=0;gameActive=true;
  updateHUD();
  showScreen('game');
  requestAnimationFrame(()=>{measureBoard();spawnPieces();updatePUButtons()});
}

window.addEventListener('resize',()=>{if(gameActive)measureBoard()});

/* ===== FX ===== */
function spawnParticles(r,c,col){
  measureBoard();
  const cx=c*cellSize+cellSize/2;
  const cy=r*cellSize+cellSize/2;
  for(let i=0;i<6;i++){
    const p=document.createElement('div');p.className='particle';
    p.style.background=COLOR_HEX[col]||'#fff';
    p.style.left=cx+'px';p.style.top=cy+'px';
    const angle=Math.random()*Math.PI*2,dist=20+Math.random()*30;
    p.style.setProperty('--tx',Math.cos(angle)*dist+'px');
    p.style.setProperty('--ty',Math.sin(angle)*dist+'px');
    fx.appendChild(p);
    setTimeout(()=>p.remove(),600);
  }
}

function showScoreFloat(clearSet,pts){
  let sumR=0,sumC=0,n=clearSet.size;
  clearSet.forEach(k=>{sumR+=Math.floor(k/G);sumC+=k%G});
  const cr=sumR/n,cc=sumC/n;
  const el=document.createElement('div');el.className='score-float';
  el.textContent='+'+pts;
  el.style.left=(cc*cellSize+cellSize/2)+'px';
  el.style.top=(cr*cellSize)+'px';
  fx.appendChild(el);
  setTimeout(()=>el.remove(),900);
}

function showPopup(msg){
  const el=document.createElement('div');el.className='popup-msg';el.textContent=msg;
  popups.appendChild(el);setTimeout(()=>el.remove(),1000);
}

})();
