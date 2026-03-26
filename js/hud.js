// ============================================================
// Muteki - HUD Renderer
// ============================================================
'use strict';

M.HUD = (() => {
    const PAD = 10;
    let overclockFlash = 0;

    function draw(ctx, gameTime, stageLabel) {
        const p = M.Player.state;
        ctx.save();

        // -- HP bar (10 angled blocks, top-left) --
        const hpX = PAD + 4;
        const hpY = PAD + 4;
        const segW = 16;
        const segH = 10;
        const segGap = 3;

        for (let i = 0; i < M.Player.MAX_HP; i++) {
            const x = hpX + i * (segW + segGap);
            ctx.save();
            ctx.translate(x, hpY);
            ctx.transform(1, 0, -0.2, 1, 0, 0); // slight skew for angled blocks
            if (i < p.hp) {
                const hpPct = p.hp / M.Player.MAX_HP;
                ctx.fillStyle = hpPct > 0.3 ? M.COL.hpFull : M.COL.hpLow;
                ctx.shadowColor = ctx.fillStyle;
                ctx.shadowBlur = 4;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
            }
            ctx.fillRect(0, 0, segW, segH);
            ctx.restore();
        }

        // HP label
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px Courier New';
        ctx.fillText('HP', hpX - 2, hpY + segH + 10);

        // -- Zatan portrait (small, next to HP label) --
        if (M.ZatanRenderer && M.ZatanRenderer.drawPortrait) {
            M.ZatanRenderer.drawPortrait(ctx, hpX + 22, hpY + segH + 8, 12);
        }

        // -- Player name tag --
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '8px Courier New';
        ctx.fillText(M.Player.NAME || 'ZATAN', hpX + 34, hpY + segH + 12);

        // -- Mode indicator (top-left, below HP) --
        const modeY = hpY + segH + 18;
        const modeTxt = p.mode === 'seeker' ? 'SEEK' : 'PRISM';
        const modeCol = p.mode === 'seeker' ? M.COL.seeker : M.COL.prism;
        ctx.fillStyle = modeCol;
        ctx.font = 'bold 12px Courier New';
        ctx.fillText(modeTxt, hpX, modeY);

        // Mode icon (small geometric indicator)
        if (p.mode === 'seeker') {
            // Small triangle
            ctx.beginPath();
            ctx.moveTo(hpX + 48, modeY - 8);
            ctx.lineTo(hpX + 44, modeY - 2);
            ctx.lineTo(hpX + 52, modeY - 2);
            ctx.closePath();
            ctx.fill();
        } else {
            // Small diamond
            ctx.beginPath();
            ctx.moveTo(hpX + 48, modeY - 9);
            ctx.lineTo(hpX + 44, modeY - 5);
            ctx.lineTo(hpX + 48, modeY - 1);
            ctx.lineTo(hpX + 52, modeY - 5);
            ctx.closePath();
            ctx.fill();
        }

        // -- Burst charges (5 cells, below mode) --
        const burstY = modeY + 14;
        for (let i = 0; i < M.Player.MAX_BURST; i++) {
            const bx = hpX + i * 14;
            if (i < p.burstCharges) {
                ctx.fillStyle = '#ffab00';
                ctx.shadowColor = '#ffab00';
                ctx.shadowBlur = 3;
            } else {
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                ctx.shadowBlur = 0;
            }
            ctx.fillRect(bx, burstY, 10, 6);
            ctx.shadowBlur = 0;
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '9px Courier New';
        ctx.fillText('BURST', hpX - 2, burstY + 16);

        // -- Cascade meter (horizontal ladder, bottom-left) --
        drawCascadeMeter(ctx);

        // -- Score (top-right) --
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(p.score.toLocaleString(), M.GAME_W - PAD, PAD + 14);
        ctx.font = '9px Courier New';
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText('SCORE', M.GAME_W - PAD, PAD + 4);

        // -- Timer (top-right, below score) --
        const timeStr = formatTime(gameTime);
        ctx.font = '12px Courier New';

        if (gameTime < 0) {
            // Overclock mode - drain
            overclockFlash = (overclockFlash + 0.05) % 1;
            ctx.fillStyle = overclockFlash > 0.5 ? '#ff1744' : '#ff174480';
            ctx.fillText('OVERCLOCK ' + timeStr, M.GAME_W - PAD, PAD + 32);
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.fillText(timeStr, M.GAME_W - PAD, PAD + 32);
        }

        // -- Stage label (top center) --
        if (stageLabel) {
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px Courier New';
            ctx.fillText(stageLabel, M.GAME_W / 2, PAD + 10);
        }

        // -- Boss HP bar (top center, only during boss) --
        if (M.Bosses.isActive()) {
            drawBossHP(ctx);
        }

        // -- Cascade tier flash overlay --
        if (M.Cascade.getTierFlash() > 0) {
            const flash = M.Cascade.getTierFlash();
            ctx.textAlign = 'center';
            ctx.fillStyle = M.Cascade.getTierFlashColor();
            ctx.globalAlpha = flash;
            ctx.font = 'bold 24px Courier New';
            ctx.fillText(M.Cascade.getTierFlashLabel(), M.GAME_W / 2, M.GAME_H / 2 - 40);
            ctx.globalAlpha = 1;
        }

        // -- Invincibility banner --
        if (M.Cascade.isInvincible()) {
            ctx.textAlign = 'center';
            ctx.fillStyle = '#ffd740';
            ctx.globalAlpha = 0.6 + Math.sin(Date.now() * 0.008) * 0.3;
            ctx.font = 'bold 14px Courier New';
            ctx.fillText('INVINCIBLE', M.GAME_W / 2, M.GAME_H - 40);
            ctx.globalAlpha = 1;
        }

        ctx.textAlign = 'left';
        ctx.restore();
    }

    function drawCascadeMeter(ctx) {
        const meterX = PAD + 4;
        const meterY = M.GAME_H - PAD - 16;
        const meterW = 200;
        const meterH = 8;
        const count = M.Cascade.getCount();
        const tiers = M.Cascade.getTiers();
        const maxDisplay = 500;

        // Background
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(meterX, meterY, meterW, meterH);

        // Fill
        const fillW = (Math.min(count, maxDisplay) / maxDisplay) * meterW;
        const tierIdx = M.Cascade.getTier();
        const fillColor = tierIdx >= 0 ? tiers[tierIdx].color : M.COL.cascade;
        ctx.fillStyle = fillColor;
        ctx.fillRect(meterX, meterY, fillW, meterH);

        // Tier notches
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        for (const t of tiers) {
            const nx = meterX + (t.threshold / maxDisplay) * meterW;
            ctx.beginPath();
            ctx.moveTo(nx, meterY - 2);
            ctx.lineTo(nx, meterY + meterH + 2);
            ctx.stroke();
        }

        // Count text
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '9px Courier New';
        ctx.fillText('CASCADE ' + count, meterX, meterY - 4);

        // Tier pop animation (expanding ring at notch)
        const popIdx = M.Cascade.getTierPopIdx();
        const popTimer = M.Cascade.getTierPopTimer();
        if (popIdx >= 0 && popTimer > 0 && popIdx < tiers.length) {
            const t = 1 - popTimer / 0.5; // 0→1
            const nx = meterX + (tiers[popIdx].threshold / maxDisplay) * meterW;
            const ny = meterY + meterH / 2;
            ctx.save();
            ctx.globalAlpha = 1 - t;
            ctx.strokeStyle = tiers[popIdx].color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(nx, ny, 6 + t * 14, 0, M.TAU);
            ctx.stroke();
            // Small diamond icon
            ctx.fillStyle = tiers[popIdx].color;
            const ds = 3 * (1 - t * 0.5);
            ctx.beginPath();
            ctx.moveTo(nx, ny - ds);
            ctx.lineTo(nx + ds, ny);
            ctx.lineTo(nx, ny + ds);
            ctx.lineTo(nx - ds, ny);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    function drawBossHP(ctx) {
        const boss = M.Bosses.getActiveBoss();
        if (!boss) return;

        const barW = 300;
        const barH = 8;
        const barX = (M.GAME_W - barW) / 2;
        const barY = PAD + 22;

        // Name
        ctx.textAlign = 'center';
        ctx.fillStyle = boss.color;
        ctx.font = 'bold 11px Courier New';
        ctx.fillText(boss.bossName, M.GAME_W / 2, barY - 4);

        // Background
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(barX, barY, barW, barH);

        // HP fill
        const pct = boss.hp / boss.maxHp;
        ctx.fillStyle = pct > 0.3 ? boss.color : '#ff1744';
        ctx.fillRect(barX, barY, barW * pct, barH);

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barW, barH);

        // Phase markers at 66% and 33%
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.moveTo(barX + barW * 0.66, barY);
        ctx.lineTo(barX + barW * 0.66, barY + barH);
        ctx.moveTo(barX + barW * 0.33, barY);
        ctx.lineTo(barX + barW * 0.33, barY + barH);
        ctx.stroke();

        ctx.textAlign = 'left';
    }

    function formatTime(t) {
        const abs = Math.abs(t);
        const m = Math.floor(abs / 60);
        const s = Math.floor(abs % 60);
        const prefix = t < 0 ? '-' : '';
        return prefix + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }

    return { draw };
})();
