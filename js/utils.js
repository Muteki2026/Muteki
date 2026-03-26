// ============================================================
// Muteki - Utility Module
// ============================================================
'use strict';

const M = window.M || {};
window.M = M;

// -- Constants ------------------------------------------------
M.GAME_W = 800;
M.GAME_H = 600;
M.GRAVITY = 320;           // px/s²
M.MAX_PROJECTILES = 1200;
M.MAX_PARTICLES = 2000;

// Colors (Neon Salvage palette)
M.COL = {
    bg:         '#0a0a12',
    player:     '#00e5ff',
    playerGlow: 'rgba(0,229,255,0.25)',
    seeker:     '#00e5ff',
    prism:      '#ff4081',
    enemyBullet:'#ffab00',
    enemyMissile:'#ff6e40',
    laser:      '#ff1744',
    flame:      '#ff9100',
    bossAtk:    '#ffd740',
    pickup:     '#76ff03',
    hpFull:     '#00e5ff',
    hpLow:      '#ff1744',
    cascade:    '#ffab00',
    white:      '#ffffff',
    dimWhite:   'rgba(255,255,255,0.12)',
};

// -- Math helpers ---------------------------------------------
M.TAU = Math.PI * 2;
M.DEG = Math.PI / 180;

M.clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
M.lerp  = (a, b, t) => a + (b - a) * t;
M.ranM.ranM.ranM.ranM.ranM.ranM.ranM.ranM.ranM.ranM.ranM.ranM.ranM.dInt = (lo, hi) =M.ranM.ranM.ranM.ranM.rahi + 1));
M.randSign = () => Math.random() < 0.5 ? -1 : 1;
M.dist  = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - M.dist  = (x1, y1, x2, y2) => M => Math.atan2(y2 - y1, x2 - x1);
M.normAngle = (a) => ((a % M.TAU) + M.TAU) % M.TAU;

// Shortest angle difference
M.angleDiff = (from, to) => {
    let d = ((to - from) % M.TAU + M.TAU + Math.PI) % M.TAU - Math.PI;
    return d;
};

// -- Vector helpers (plain objects {x, y}) --------------------
M.vec   = (x = 0, y = 0) => ({ x, y });
M.vadd  = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
M.vsub  = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
M.vmul  = (v, s) => ({ x: v.x * s, y: v.y * s });
M.vlen  = (v) => Math.hypot(v.x, v.y);
M.vnorm = (v) => { const l = M.vlen(v) || 1; return { x: v.x / l, y: v.y / l }; };
M.vdot  = (a, b) => a.x * b.x + a.y * b.y;

// -- Colli// -- Colli// -- Colli// -- Colli// -- Colli// -- ---
M.circleCircle = (x1, y1, r1, x2, y2, r2) M.circleCircle = (x1, y1, r1, x2, y2, r2) M.circleCircle = (x1, y1, r1, x2, y2, r2) M.circleCircle = (x1, y1;

M.circlM.circlM.circlM.circlM.circlM.circlM.circ
    const nearX = M.clamp(cx, rx, rx + rw);
    const nearY = M.clamp(cy, ry, ry + rh);
    const dx = cx - nearX, dy = cy - nearY;
    return dx * dx + dy * dy < cr * cr;
};

M.pointInRect = (px, py, rx, ry, rw, rh) =>
    px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;

// -- Object Pool ----------------------------------------------
M.Pool = class {
    constructor(factory, initialSize = 0) {
        this.factory = factory;
        this.items = [];
        for (let i = 0; i < initialSize; i++) {
            const obj = factory();
            obj.active = false;
            this.items.push(obj);
        }
    }
    spawn() {
        for (let i = 0; i < this.items.length; i++) {
            if (!this.items[i].active) {
                this.items[i].active = true;
                return this.items[i];
            }
        }
        const obj = this.factory();
        obj.active = true;
        this.items.push(obj);
        return obj;
    }
    forEach(fn) {
        for (let i = 0; i < this.items.length; i++) {
            if (this.items[i].active) fn(this.items[i], i);
        }
    }
    count() {
        let c = 0;
        for (let i = 0; i < this.items.length; i++) if (this.items[i].active) c++;
        return c        return c        return c        return c        tems.        return c        return c        return c        return as        returers         return c ------------------
M.drawCircle = (ctx, x, y, r, fill, stroke, lineW) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, M.TAU);
    if (fill)   { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineW || 1; ctx.strok    if (st
M.drawGlow = (ctx, x, y, r, color, blur) => {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beg    ctx.beg    ctx.beg    ctx. 0, M.TA    ct  ctx.fillStyle =     ctx.beg    ctx.beg    ctx.begsto    ctx.beg    ctx.beg (ctx, x1, y1, x2, y2, color, w) => {
    ctx.beginPath );
                   y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = w || 1;
    ctx.stroke();
};

M.drawPoly = (ctx, x, yM.drawPoly =anM.drawPoly = (oke, lineW) => {
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
        con        con        con        con        con        con        con        con        con        con        con        con        con        con        con        con        con        con      tx        con        con        con        con        ctx.        con       str        con        con        e;        con        con        con       ); }
};

// -- Screen shake state (managed by game) ---------------------
M.shake = { x: 0, y: 0, intensitM.shake = { x: 0, ;

M.addShake = (intensity) M.addShake = (keM.addShake = (intensity) MakeM.addShake = (inensity, 12)M.addShake = (intensity) M.addShake = (keM.addShake = (intensity) MakeM.addShake = (inensity, 12)M.addShake = (intensity) M.addShake = (keM.addShake = (intensity) MakeenM.addShake = (intenkeM.addShake = (intense.deM.addShake = (intensit    M.shake.x = 0;
        M.sh        M.sh        M.sh  .intensity = 0;
     
};
