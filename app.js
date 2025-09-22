/* Tetris PWA — pezzaliAPP (MIT)
   Features: 10x20 board, 7-bag random, SRS-like rotation, hold, soft/hard drop,
   levels, scoring, pause, mobile buttons, offline via service worker. */
const W = 10, H = 20;
const TILE = 30;
const GRAVITY_MS = [800, 700, 600, 500, 430, 370, 320, 280, 250, 220, 200, 180, 160, 140, 120, 100, 85, 75, 65, 55];
const SCORE = { single:100, double:300, triple:500, tetris:800, soft:1, hard:2, dropLine:0 };
const COLORS = {
  I:'#63e6ff', O:'#ffd43b', T:'#845ef7', S:'#51cf66', Z:'#ff6b6b', J:'#4dabf7', L:'#ffa94d', X:'#2b2f57'
};
const SHAPES = {
  I:[[0,1],[1,1],[2,1],[3,1]],
  J:[[0,0],[0,1],[1,1],[2,1]],
  L:[[2,0],[0,1],[1,1],[2,1]],
  O:[[1,0],[2,0],[1,1],[2,1]],
  S:[[1,0],[2,0],[0,1],[1,1]],
  Z:[[0,0],[1,0],[1,1],[2,1]],
  T:[[1,0],[0,1],[1,1],[2,1]]
};
const KICKS = { // basic SRS kicks (subset)
  I: [[[0,0],[ -2,0],[+1,0],[ -2,-1],[+1,+2]], [[0,0],[ -1,0],[+2,0],[ -1,+2],[+2,-1]]],
  J: [[[0,0],[ -1,0],[ -1,+1],[0,-2],[ -1,-2]], [[0,0],[ +1,0],[ +1,-1],[0,+2],[ +1,+2]]]
};

const rand = (n)=>Math.floor(Math.random()*n);

class Bag7 {
  constructor(){ this.bag=[]; }
  next(){
    if(!this.bag.length){
      this.bag = ['I','J','L','O','S','T','Z'].sort(()=>Math.random()-0.5);
    }
    return this.bag.pop();
  }
}

class Piece {
  constructor(type){
    this.type = type;
    this.color = COLORS[type];
    this.cells = SHAPES[type].map(([x,y])=>({x, y}));
    this.x = 3; this.y = 0; this.r = 0;
    this.locked = false;
    this.swapped = false;
  }
  clone(){ const p = new Piece(this.type); p.cells = this.cells.map(c=>({x:c.x,y:c.y})); p.x=this.x; p.y=this.y; p.r=this.r; return p; }
}

class Game {
  constructor(){
    this.board = Array.from({length:H},()=>Array(W).fill(0));
    this.ctx = document.getElementById('board').getContext('2d');
    this.nctx = document.getElementById('next').getContext('2d');
    this.hctx = document.getElementById('hold').getContext('2d');
    this.score=0; this.lines=0; this.level=1;
    this.bag = new Bag7();
    this.queue = [this.bag.next(), this.bag.next(), this.bag.next()];
    this.hold = null; this.holdUsed = false;
    this.curr = new Piece(this.bag.next());
    this.running=false; this.paused=false;
    this.dropTimer=0; this.last=0;
    this.bind();
    this.drawAll();
  }
  bind(){
    document.addEventListener('keydown', e=>{
      if (this.overlayVisible()) return;
      if (e.code==='ArrowLeft'){ this.move(-1); }
      else if (e.code==='ArrowRight'){ this.move(1); }
      else if (e.code==='ArrowDown'){ this.softDrop(); }
      else if (e.code==='Space'){ e.preventDefault(); this.hardDrop(); }
      else if (e.code==='KeyZ'){ this.rotate(-1); }
      else if (e.code==='KeyX'){ this.rotate(+1); }
      else if (e.code==='KeyC'){ this.doHold(); }
      else if (e.code==='KeyP'){ this.togglePause(); }
      else if (e.code==='KeyR'){ this.restart(); }
    });
    // Buttons
    const $ = id=>document.getElementById(id);
    $('btnLeft').onclick = ()=>this.move(-1);
    $('btnRight').onclick = ()=>this.move(1);
    $('btnDown').onclick = ()=>this.softDrop();
    $('btnDrop').onclick = ()=>this.hardDrop();
    $('btnRotate').onclick = ()=>this.rotate(1);
    $('btnPause').onclick = ()=>this.togglePause();
    $('btnRestart').onclick = ()=>this.restart();
    $('overlayBtn').onclick = ()=>this.start();
  }
  overlayVisible(){ return !document.getElementById('overlay').classList.contains('hidden'); }
  start(){
    document.getElementById('overlay').classList.add('hidden');
    this.running=true; this.paused=false; this.loop(0);
  }
  togglePause(){
    if (!this.running) return;
    this.paused = !this.paused;
    const o = document.getElementById('overlay');
    const t = document.getElementById('overlayTitle');
    const p = document.getElementById('overlayText');
    const b = document.getElementById('overlayBtn');
    if (this.paused){
      t.textContent = 'Pausa';
      p.innerHTML = 'Premi <strong>P</strong> o il bottone per riprendere.';
      b.textContent = 'Riprendi';
      o.classList.remove('hidden');
    } else {
      o.classList.add('hidden');
      this.loop(0);
    }
  }
  restart(){
    this.board = Array.from({length:H},()=>Array(W).fill(0));
    this.score=0; this.lines=0; this.level=1;
    this.bag = new Bag7();
    this.queue = [this.bag.next(), this.bag.next(), this.bag.next()];
    this.hold = null; this.holdUsed=false;
    this.curr = new Piece(this.bag.next());
    this.updateHud();
    const o = document.getElementById('overlay');
    const t = document.getElementById('overlayTitle');
    const p = document.getElementById('overlayText');
    const b = document.getElementById('overlayBtn');
    t.textContent='Tetris — PWA';
    p.innerHTML='Premi <strong>R</strong> o il bottone per iniziare.';
    b.textContent='Gioca';
    o.classList.remove('hidden');
    this.running=false;
    this.drawAll();
  }
  loop(ts){
    if(!this.running || this.paused) return;
    const delta = ts - this.last; this.last = ts;
    this.dropTimer += delta;
    const speed = GRAVITY_MS[Math.min(this.level-1, GRAVITY_MS.length-1)];
    if (this.dropTimer >= speed){
      this.dropTimer = 0;
      if (!this.moveDown()){ // lock
        this.lockPiece();
        const cleared = this.clearLines();
        if (cleared>0){
          const pts = [SCORE.single,SCORE.double,SCORE.triple,SCORE.tetris][cleared-1]||0;
          this.score += pts * this.level;
          this.lines += cleared;
          this.level = 1 + Math.floor(this.lines/10);
          this.updateHud();
        }
        if (!this.spawn()){
          this.gameOver();
          return;
        }
      }
    }
    this.drawAll();
    requestAnimationFrame((t)=>this.loop(t));
  }
  gameOver(){
    this.running=false;
    const o = document.getElementById('overlay');
    const t = document.getElementById('overlayTitle');
    const p = document.getElementById('overlayText');
    const b = document.getElementById('overlayBtn');
    t.textContent='Game Over';
    p.innerHTML=`Punteggio: <strong>${this.score}</strong> — Linee: <strong>${this.lines}</strong><br>Premi <strong>R</strong> o il bottone per ricominciare.`;
    b.textContent='Rigioca';
    o.classList.remove('hidden');
  }
  updateHud(){
    document.getElementById('score').textContent = this.score;
    document.getElementById('lines').textContent = this.lines;
    document.getElementById('level').textContent = this.level;
    this.drawMini(this.nctx, this.queue[0]);
    this.drawMini(this.hctx, this.hold);
  }
  spawn(){
    const t = this.queue.shift();
    this.queue.push(this.bag.next());
    this.curr = new Piece(t);
    this.holdUsed=false;
    if (!this.valid(this.curr, 0, 0)) return false;
    this.updateHud();
    return true;
  }
  doHold(){
    if (this.holdUsed) return;
    if (!this.hold){
      this.hold = this.curr.type;
      this.spawn();
    } else {
      const tmp = this.hold;
      this.hold = this.curr.type;
      this.curr = new Piece(tmp);
      this.curr.x = 3; this.curr.y = 0;
      if (!this.valid(this.curr,0,0)){ // if invalid, revert
        const t2 = this.hold; this.hold = this.curr.type; this.curr = new Piece(t2);
      }
    }
    this.holdUsed = true;
    this.updateHud();
  }
  move(dir){
    if (this.valid(this.curr, dir, 0)){ this.curr.x += dir; }
  }
  softDrop(){
    if (this.valid(this.curr, 0, 1)){ this.curr.y += 1; this.score += SCORE.soft; this.updateHud(); }
  }
  hardDrop(){
    let d=0;
    while (this.valid(this.curr,0,1)){ this.curr.y++; d++; }
    if (d>0){ this.score += d * SCORE.hard; this.updateHud(); }
    this.lockPiece();
    const cleared = this.clearLines();
    if (cleared>0){
      const pts = [SCORE.single,SCORE.double,SCORE.triple,SCORE.tetris][cleared-1]||0;
      this.score += pts * this.level; this.lines += cleared;
      this.level = 1 + Math.floor(this.lines/10);
      this.updateHud();
    }
    if (!this.spawn()){ this.gameOver(); }
  }
  rotate(dir){
    const p = this.curr.clone();
    // rotate 90°
    p.cells = p.cells.map(({x,y})=>({x: dir>0 ? (2 - y) : y, y: dir>0 ? x : (2 - x)}));
    // basic wall kicks
    const kicks = [[0,0],[1,0],[-1,0],[0,-1],[0,1],[2,0],[-2,0]];
    for (const [kx,ky] of kicks){
      if (this.valid(p, kx, ky)){ this.curr = p; this.curr.x += kx; this.curr.y += ky; return; }
    }
  }
  moveDown(){ if (this.valid(this.curr,0,1)){ this.curr.y++; return true; } return false; }
  lockPiece(){
    for (const {x,y} of this.curr.cells){
      const gx = this.curr.x + x, gy = this.curr.y + y;
      if (gy>=0 && gy<H && gx>=0 && gx<W){
        this.board[gy][gx] = this.curr.type;
      }
    }
  }
  clearLines(){
    let cleared=0;
    for (let y=H-1; y>=0; y--){
      if (this.board[y].every(v=>v)){
        this.board.splice(y,1);
        this.board.unshift(Array(W).fill(0));
        cleared++; y++;
      }
    }
    return cleared;
  }
  valid(p, dx, dy){
    for (const {x,y} of p.cells){
      const nx = p.x + x + dx;
      const ny = p.y + y + dy;
      if (nx<0 || nx>=W || ny>=H) return false;
      if (ny>=0 && this.board[ny][nx]) return false;
    }
    return true;
  }
  drawAll(){
    // board
    const ctx = this.ctx;
    ctx.clearRect(0,0, W*TILE, H*TILE);
    // grid
    ctx.fillStyle = '#0e1429';
    ctx.fillRect(0,0,W*TILE,H*TILE);
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    for (let x=0;x<=W;x++){ ctx.beginPath(); ctx.moveTo(x*TILE,0); ctx.lineTo(x*TILE,H*TILE); ctx.stroke(); }
    for (let y=0;y<=H;y++){ ctx.beginPath(); ctx.moveTo(0,y*TILE); ctx.lineTo(W*TILE,y*TILE); ctx.stroke(); }
    // placed
    for (let y=0;y<H;y++){
      for (let x=0;x<W;x++){
        const t = this.board[y][x];
        if (t){ this.drawTile(ctx,x,y,COLORS[t]); }
      }
    }
    // ghost
    const g = this.curr.clone();
    while (this.valid(g,0,1)) g.y++;
    this.drawPiece(g, true);
    // current
    this.drawPiece(this.curr, false);
  }
  drawPiece(p, ghost=false){
    const ctx = this.ctx;
    for (const {x,y} of p.cells){
      const gx = p.x + x, gy = p.y + y;
      if (gy<0) continue;
      this.drawTile(ctx,gx,gy, COLORS[p.type], ghost);
    }
  }
  drawTile(ctx,x,y,color,ghost=false){
    const px = x*TILE, py = y*TILE;
    ctx.save();
    if (ghost){
      ctx.globalAlpha = .25;
      ctx.fillStyle = color;
      ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(px+1,py+1,TILE-2,TILE-2);
      // glossy top
      ctx.globalAlpha=.2; ctx.fillStyle='#fff';
      ctx.fillRect(px+1,py+1,TILE-2,6);
    }
    ctx.restore();
  }
  drawMini(ctx, type){
    ctx.clearRect(0,0,120,120);
    if (!type) return;
    const cells = SHAPES[type];
    const color = COLORS[type];
    // normalize to top-left
    let minx = Math.min(...cells.map(c=>c[0]));
    let miny = Math.min(...cells.map(c=>c[1]));
    const norm = cells.map(([x,y])=>[x-minx,y-miny]);
    const size = 24;
    // center
    const offx = (120 - 4*size)/2;
    const offy = (120 - 4*size)/2;
    ctx.fillStyle='#0e1429'; ctx.fillRect(0,0,120,120);
    for (const [x,y] of norm){
      ctx.fillStyle=color;
      ctx.fillRect(offx + x*size + 2, offy + y*size + 2, size-4, size-4);
    }
  }
}

const game = new Game();
document.getElementById('overlay').classList.remove('hidden');
document.getElementById('installHint').hidden = false;
