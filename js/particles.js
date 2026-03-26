// ============================================================
// Muteki - Particle System
// ============================================================
'use strict';

M.Particles = (() => {
    const pool = new M.Pool(() => ({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        r: 2,
        life: 0, maxLife: 1,
        color: '#fff',
        shape: 'circle', // circle, ring, shard, spark
        shrink: true,
        grav: 0,
        friction: 0.98,
        additive: false
    }), 500);

    function spawn(opts) {
        if (pool.count() >= M.MAX_PARTICLES) return null;
        const p = pool.spawn();
        p.x = opts.x || 0;
        p.y = opts.y || 0;
        p.vx = opts.vx || 0;
        p.vy = opts.vy || 0;
        p.r = opts.r || 2;
        p.life = opts.life || 0.5;
        p.maxLife = p.life;
        p.color = opts.color || '#fff';
        p.shape = opts.shape || 'circle';
        p.shrink = opts.shrink !== false;
        p.grav = opts.grav || 0;
        p.friction = opts.friction || 0.98;
        p.additive = opts.additive || false;
        return p;
    }

    function update(dt) {
        pool.forEach(p => {
            p.life -= dt;
            if (p.life <= 0) { p.active = false; return; }
            p.vx *= p.friction;
            p.vy *= p.friction;
            p.vy += p.grav * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
        });
    }

    function draw(ctx, camX, camY) {
        pool.forEach(p => {
            const t = p.life / p.maxLife;
            const alpha = t;
            const r = p.shrink ? p.r * t : p.r;
            const sx = p.x - camX;
            const sy = p.y - camY;

            if (sx < -20 || sx > M.GAME_W + 20 || sy < -20 || sy > M.GAME_H + 20) return;

            ctx.save();
            ctx.globalAlpha = alpha;
            if (p.additive) ctx.globalCompositeOperation = 'lighter';

            switch (p.shape) {
                case 'circle':
                    M.drawCircle(ctx, sx, sy, Math.max(0.5, r), p.color);
                    break;
                case 'ring':
                    M.drawCircle(ctx, sx, sy, Math.max(1, r), null, p.color, 1.5);
                    break;
                case 'shard':
                    ctx.save();
                    ctx.translate(sx, sy);
                    ctx.rotate(Math.atan2(p.vy, p.vx));
                    ctx.fillStyle = p.color;
                    ctx.fillRect(-r * 2, -r * 0.5, r * 4, r);
                    ctx.restore();
                    break;
                case 'spark':
                    ctx.beginPath();
                    ctx.moveTo(sx, sy);
                    ctx.lineTo(sx - p.vx * 0.03, sy - p.vy * 0.03);
                    ctx.strokeStyle = p.color;
                    ctx.lineWidth = Math.max(0.5, r);
                    ctx.stroke();
                    break;
                default:
                    M.drawCircle(ctx, sx, sy, Math.max(0.5, r), p.color);
            }
            ctx.restore();
        });
    }

    // -- Preset effects ----

    function explosion(x, y, count, color, radius, additive) {
        for (let i = 0; i < count; i++) {
            const a = M.rand(0, M.TAU);
            const spd = M.rand(40, 200);
            spawn({
                x, y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                r: M.rand(1, 3),
                life: M.rand(0.2, 0.5),
                color: color || '#ffab00',
                shape: i % 3 === 0 ? 'shard' : 'spark',
                grav: M.rand(0, 80),
                additive: additive || false
            });
        }
        // Ring
        spawn({
            x, y, vx: 0, vy: 0,
            r: radius || 20,
            life: 0.3,
            color: color || '#ffab00',
            shape: 'ring',
            shrink: false
        });
    }

    function explosionLarge(x, y, color) {
        explosion(x, y, 30, color || '#ff6e40', 40, true);
        M.addShake(4);
    }

    function thrust(x, y, angle, color) {
        const spread = 0.4;
        for (let i = 0; i < 2; i++) {
            const a = angle + Math.PI + M.rand(-spread, spread);
            spawn({
                x: x + M.rand(-2, 2), y: y + M.rand(-2, 2),
                vx: Math.cos(a) * M.rand(60, 120),
                vy: Math.sin(a) * M.rand(60, 120),
                r: M.rand(1, 2.5),
                life: M.rand(0.1, 0.2),
                color: color || '#00e5ff',
                shape: 'circle',
                additive: true
            });
        }
    }

    function dashTrail(x, y, color) {
        for (let i = 0; i < 4; i++) {
            spawn({
                x: x + M.rand(-6, 6), y: y + M.rand(-6, 6),
                vx: M.rand(-20, 20), vy: M.rand(-20, 20),
                r: M.rand(3, 6),
                life: M.rand(0.15, 0.3),
                color: color || 'rgba(0,229,255,0.5)',
                shape: 'circle',
                additive: true
            });
        }
    }

    function counterburstCharge(x, y, radius) {
        const a = M.rand(0, M.TAU);
        const d = M.rand(radius * 0.8, radius * 1.2);
        spawn({
            x: x + Math.cos(a) * d,
            y: y + Math.sin(a) * d,
            vx: -Math.cos(a) * d * 2,
            vy: -Math.sin(a) * d * 2,
            r: 1.5,
            life: 0.4,
            color: '#ffab00',
            shape: 'spark',
            additive: true
        });
    }

    function counterburstRelease(x, y, count) {
        for (let i = 0; i < Math.min(count, 60); i++) {
            const a = M.rand(0, M.TAU);
            const spd = M.rand(150, 400);
            spawn({
                x, y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                r: M.rand(2, 4),
                life: M.rand(0.3, 0.6),
                color: i % 2 === 0 ? '#00e5ff' : '#fff',
                shape: 'spark',
                additive: true
            });
        }
        spawn({ x, y, r: 60, life: 0.25, color: '#fff', shape: 'ring', additive: true, shrink: false });
        spawn({ x, y, r: 100, life: 0.35, color: '#00e5ff', shape: 'ring', additive: true, shrink: false });
        M.addShake(8);
    }

    function tierBurst(x, y, color) {
        for (let i = 0; i < 20; i++) {
            const a = M.rand(0, M.TAU);
            spawn({
                x, y,
                vx: Math.cos(a) * M.rand(80, 180),
                vy: Math.sin(a) * M.rand(80, 180),
                r: M.rand(2, 4),
                life: M.rand(0.3, 0.5),
                color,
                shape: 'shard',
                additive: true
            });
        }
    }

    function hitSpark(x, y, color) {
        for (let i = 0; i < 5; i++) {
            const a = M.rand(0, M.TAU);
            spawn({
                x, y,
                vx: Math.cos(a) * M.rand(40, 100),
                vy: Math.sin(a) * M.rand(40, 100),
                r: 1.5,
                life: 0.15,
                color: color || '#fff',
                shape: 'spark'
            });
        }
    }

    function clear() { pool.clear(); }

    return { spawn, update, draw, explosion, explosionLarge, thrust, dashTrail,
             counterburstCharge, counterburstRelease, tierBurst, hitSpark, clear };
})();
