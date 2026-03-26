// ============================================================
// Muteki - Projectile System
// ============================================================
'use strict';

M.Projectiles = (() => {
    // Types: 'seekerDart', 'prismBeam', 'counterBurst',
    //        'enemyBullet', 'enemyMissile', 'enemyLaser', 'enemyFlame'
    const FRIENDLY = new Set(['seekerDart', 'prismBeam', 'counterBurst']);
    const HOSTILE  = new Set(['enemyBullet', 'enemyMissile', 'enemyLaser', 'enemyFlame']);

    const pool = new M.Pool(() => ({
        active: false,
        type: 'enemyBullet',
        x: 0, y: 0,
        vx: 0, vy: 0,
        r: 3,
        dmg: 1,
        life: 3,
        angle: 0,
        homing: 0,       // turning rate for seekers/missiles
        bounces: 0,       // for prism beams
        maxBounces: 0,
        speed: 300,
        owner: 'player'   // 'player' or 'enemy'
    }), 200);

    function spawn(opts) {
        const p = pool.spawn();
        p.type = opts.type || 'enemyBullet';
        p.x = opts.x || 0;
        p.y = opts.y || 0;
        p.angle = opts.angle || 0;
        p.speed = opts.speed || 300;
        p.vx = Math.cos(p.angle) * p.speed;
        p.vy = Math.sin(p.angle) * p.speed;
        p.r = opts.r || 3;
        p.dmg = opts.dmg || 1;
        p.life = opts.life || 3;
        p.homing = opts.homing || 0;
        p.bounces = 0;
        p.maxBounces = opts.maxBounces || 0;
        p.owner = opts.owner || (FRIENDLY.has(p.type) ? 'player' : 'enemy');
        return p;
    }

    function update(dt, stage, playerX, playerY, enemies) {
        pool.forEach(p => {
            p.life -= dt;
            if (p.life <= 0) { p.active = false; return; }

            // Homing behavior
            if (p.homing > 0) {
                let target = null;
                let bestDist = Infinity;

                if (p.owner === 'player' && enemies) {
                    // Seek nearest enemy
                    enemies.forEach(e => {
                        const d = M.dist(p.x, p.y, e.x, e.y);
                        if (d < bestDist) { bestDist = d; target = e; }
                    });
                } else if (p.owner === 'enemy') {
                    // Seek player
                    target = { x: playerX, y: playerY };
                    bestDist = M.dist(p.x, p.y, playerX, playerY);
                }

                if (target && bestDist < 400) {
                    const desired = Math.atan2(target.y - p.y, target.x - p.x);
                    const diff = M.angleDiff(p.angle, desired);
                    p.angle += M.clamp(diff, -p.homing * dt, p.homing * dt);
                    p.vx = Math.cos(p.angle) * p.speed;
                    p.vy = Math.sin(p.angle) * p.speed;
                }
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Prism beam bouncing off stage walls
            if (p.maxBounces > 0 && stage) {
                const bounds = stage.bounds;
                let bounced = false;
                if (p.x - p.r < bounds.x) { p.x = bounds.x + p.r; p.vx = Math.abs(p.vx); bounced = true; }
                if (p.x + p.r > bounds.x + bounds.w) { p.x = bounds.x + bounds.w - p.r; p.vx = -Math.abs(p.vx); bounced = true; }
                if (p.y - p.r < bounds.y) { p.y = bounds.y + p.r; p.vy = Math.abs(p.vy); bounced = true; }
                if (p.y + p.r > bounds.y + bounds.h) { p.y = bounds.y + bounds.h - p.r; p.vy = -Math.abs(p.vy); bounced = true; }

                // Also bounce off stage walls (solid tiles)
                if (stage.walls) {
                    for (const w of stage.walls) {
                        if (M.circleRect(p.x, p.y, p.r, w.x, w.y, w.w, w.h)) {
                            // Simple reflect: determine side
                            const cx = p.x - (w.x + w.w / 2);
                            const cy = p.y - (w.y + w.h / 2);
                            if (Math.abs(cx / w.w) > Math.abs(cy / w.h)) {
                                p.vx = -p.vx;
                                p.x += p.vx * dt * 2;
                            } else {
                                p.vy = -p.vy;
                                p.y += p.vy * dt * 2;
                            }
                            bounced = true;
                            break;
                        }
                    }
                }

                if (bounced) {
                    p.bounces++;
                    p.angle = Math.atan2(p.vy, p.vx);
                    M.Particles.hitSpark(p.x, p.y, M.COL.prism);
                    if (p.bounces >= p.maxBounces) { p.active = false; return; }
                }
            }

            // Out-of-bounds kill (with margin)
            if (stage) {
                const margin = 100;
                const b = stage.bounds;
                if (p.x < b.x - margin || p.x > b.x + b.w + margin ||
                    p.y < b.y - margin || p.y > b.y + b.h + margin) {
                    p.active = false;
                }
            }
        });
    }

    function draw(ctx, camX, camY) {
        pool.forEach(p => {
            const sx = p.x - camX;
            const sy = p.y - camY;
            if (sx < -20 || sx > M.GAME_W + 20 || sy < -20 || sy > M.GAME_H + 20) return;

            ctx.save();
            switch (p.type) {
                case 'seekerDart':
                    drawSeeker(ctx, sx, sy, p);
                    break;
                case 'prismBeam':
                    drawPrism(ctx, sx, sy, p);
                    break;
                case 'counterBurst':
                    drawCounterBurst(ctx, sx, sy, p);
                    break;
                case 'enemyBullet':
                    drawEnemyBullet(ctx, sx, sy, p);
                    break;
                case 'enemyMissile':
                    drawEnemyMissile(ctx, sx, sy, p);
                    break;
                case 'enemyLaser':
                    drawEnemyLaser(ctx, sx, sy, p);
                    break;
                case 'enemyFlame':
                    drawEnemyFlame(ctx, sx, sy, p);
                    break;
            }
            ctx.restore();
        });
    }

    function drawSeeker(ctx, x, y, p) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        ctx.globalCompositeOperation = 'lighter';
        // Cyan homing dart (capsule shape)
        ctx.fillStyle = M.COL.seeker;
        ctx.beginPath();
        ctx.moveTo(p.r * 2, 0);
        ctx.lineTo(-p.r, -p.r);
        ctx.lineTo(-p.r * 0.5, 0);
        ctx.lineTo(-p.r, p.r);
        ctx.closePath();
        ctx.fill();
        ctx.shadowColor = M.COL.seeker;
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.restore();
    }

    function drawPrism(ctx, x, y, p) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        ctx.globalCompositeOperation = 'lighter';
        // Magenta segmented prism beam
        ctx.fillStyle = M.COL.prism;
        ctx.fillRect(-p.r * 2, -p.r * 0.6, p.r * 4, p.r * 1.2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-p.r, -p.r * 0.3, p.r * 2, p.r * 0.6);
        ctx.shadowColor = M.COL.prism;
        ctx.shadowBlur = 8;
        ctx.fillRect(-p.r, -p.r * 0.3, p.r * 2, p.r * 0.6);
        ctx.restore();
    }

    function drawCounterBurst(ctx, x, y, p) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 6;
        M.drawCircle(ctx, x, y, p.r, '#fff');
        M.drawCircle(ctx, x, y, p.r * 0.6, M.COL.player);
    }

    function drawEnemyBullet(ctx, x, y, p) {
        // Amber diamond shape (distinguishable from friendly circles)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = M.COL.enemyBullet;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = M.COL.enemyBullet;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-p.r * 1.3, -p.r * 1.3, p.r * 2.6, p.r * 2.6);
        ctx.restore();
    }

    function drawEnemyMissile(ctx, x, y, p) {
        // Orange-red triangle with turning tail
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        ctx.fillStyle = M.COL.enemyMissile;
        ctx.beginPath();
        ctx.moveTo(p.r * 2, 0);
        ctx.lineTo(-p.r, -p.r * 1.2);
        ctx.lineTo(-p.r * 0.3, 0);
        ctx.lineTo(-p.r, p.r * 1.2);
        ctx.closePath();
        ctx.fill();
        // Trail
        ctx.strokeStyle = 'rgba(255,110,64,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-p.r * 0.3, 0);
        ctx.lineTo(-p.r * 3, M.rand(-2, 2));
        ctx.stroke();
        ctx.restore();
    }

    function drawEnemyLaser(ctx, x, y, p) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(p.angle);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = M.COL.laser;
        ctx.fillRect(-p.r * 3, -1.5, p.r * 6, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(-p.r * 2, -0.5, p.r * 4, 1);
        ctx.restore();
    }

    function drawEnemyFlame(ctx, x, y, p) {
        const alpha = M.clamp(p.life / 0.5, 0, 1);
        ctx.globalAlpha = alpha * 0.7;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, p.r * 2);
        grad.addColorStop(0, '#ffeb3b');
        grad.addColorStop(0.5, M.COL.flame);
        grad.addColorStop(1, 'rgba(255,23,68,0)');
        M.drawCircle(ctx, x, y, p.r * 2, grad);
    }

    // -- Query helpers ---
    function isFriendly(p) { return FRIENDLY.has(p.type); }
    function isHostile(p)  { return HOSTILE.has(p.type); }

    function forEachFriendly(fn) { pool.forEach(p => { if (FRIENDLY.has(p.type)) fn(p); }); }
    function forEachHostile(fn)  { pool.forEach(p => { if (HOSTILE.has(p.type)) fn(p); }); }
    function forEachAll(fn) { pool.forEach(fn); }

    // Count hostile near point
    function countHostileNear(x, y, radius) {
        let c = 0;
        pool.forEach(p => {
            if (HOSTILE.has(p.type) && M.dist(p.x, p.y, x, y) < radius) c++;
        });
        return c;
    }

    // Kill hostile near point (for counterburst suction)
    function absorbHostileNear(x, y, radius) {
        let c = 0;
        pool.forEach(p => {
            if (HOSTILE.has(p.type) && M.dist(p.x, p.y, x, y) < radius) {
                p.active = false;
                M.Particles.hitSpark(p.x, p.y, '#ffab00');
                c++;
            }
        });
        return c;
    }

    function clear() { pool.clear(); }

    return {
        spawn, update, draw,
        isFriendly, isHostile,
        forEachFriendly, forEachHostile, forEachAll,
        countHostileNear, absorbHostileNear, clear
    };
})();
