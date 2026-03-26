// ============================================================
// Muteki - Pickup System (5 tiers, non-fruit)
// ============================================================
'use strict';

M.Pickups = (() => {
    // Tiers: 0=DataShard, 1=Alloy, 2=Core, 3=PrismCore, 4=HyperCore
    const TIERS = [
        { name: 'Data Shard',  score: 100,  color: '#76ff03', sides: 4, r: 5 },
        { name: 'Alloy',       score: 300,  color: '#00e5ff', sides: 5, r: 6 },
        { name: 'Core',        score: 700,  color: '#ffab00', sides: 6, r: 7 },
        { name: 'Prism Core',  score: 1500, color: '#ff4081', sides: 3, r: 8 },
        { name: 'Hyper Core',  score: 5000, color: '#e040fb', sides: 8, r: 10 },
    ];

    const pool = new M.Pool(() => ({
        active: false,
        x: 0, y: 0,
        vx: 0, vy: 0,
        tier: 0,
        life: 8,
        angle: 0,
        collected: false
    }), 50);

    function spawn(x, y, tier) {
        const p = pool.spawn();
        p.x = x;
        p.y = y;
        p.vx = M.rand(-40, 40);
        p.vy = M.rand(-80, -20);
        p.tier = M.clamp(tier, 0, 4);
        p.life = 8;
        p.angle = M.rand(0, M.TAU);
        p.collected = false;
        return p;
    }

    function update(dt, playerX, playerY, playerR) {
        let totalScore = 0;
        pool.forEach(p => {
            p.life -= dt;
            if (p.life <= 0) { p.active = false; return; }

            // Settle velocity
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.vy += 60 * dt; // light gravity
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.angle += 2 * dt;

            // Magnet pull if close
            const d = M.dist(p.x, p.y, playerX, playerY);
            const magnetR = 80;
            if (d < magnetR) {
                const pull = (1 - d / magnetR) * 600;
                const a = M.angle(p.x, p.y, playerX, playerY);
                p.vx += Math.cos(a) * pull * dt;
                p.vy += Math.sin(a) * pull * dt;
            }

            // Collect
            if (d < playerR + TIERS[p.tier].r + 4) {
                p.active = false;
                p.collected = true;
                totalScore += TIERS[p.tier].score;
                M.Particles.hitSpark(p.x, p.y, TIERS[p.tier].color);
            }
        });
        return totalScore;
    }

    function draw(ctx, camX, camY) {
        pool.forEach(p => {
            const td = TIERS[p.tier];
            const sx = p.x - camX;
            const sy = p.y - camY;
            if (sx < -20 || sx > M.GAME_W + 20 || sy < -20 || sy > M.GAME_H + 20) return;

            ctx.save();
            // Blink when about to expire
            if (p.life < 2 && Math.sin(p.life * 12) > 0) {
                ctx.restore();
                return;
            }

            // Orbiting particles
            ctx.globalCompositeOperation = 'lighter';
            const orbits = Math.min(p.tier + 1, 3);
            for (let i = 0; i < orbits; i++) {
                const oa = p.angle * (1.5 + i * 0.5) + (i * M.TAU / orbits);
                const od = td.r + 4;
                ctx.globalAlpha = 0.5;
                M.drawCircle(ctx, sx + Math.cos(oa) * od, sy + Math.sin(oa) * od, 1, td.color);
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Main shape
            M.drawPoly(ctx, sx, sy, td.r, td.sides, p.angle, td.color + '40', td.color, 1.5);

            // Inner glow
            ctx.globalCompositeOperation = 'lighter';
            M.drawPoly(ctx, sx, sy, td.r * 0.5, td.sides, -p.angle, td.color, null);

            ctx.restore();
        });
    }

    function clear() { pool.clear(); }

    return { TIERS, spawn, update, draw, clear };
})();
