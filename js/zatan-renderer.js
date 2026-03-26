// ============================================================
// Muteki - Zatan Mech Renderer (Procedural Canvas)
// ============================================================
// Draws the canonical Zatan mech at gameplay scale.
// Visual traits from concept art:
//   - dark graphite/gunmetal armor
//   - red energy vein channels (primary emissive)
//   - purple overload accents (high-energy / burst states)
//   - cyan sensor/node lights
//   - aggressive asymmetrical silhouette:
//     head crest + horns, broad shoulders (left heavier),
//     back fins/wings, weapon-arm (right) asymmetry
// ============================================================
'use strict';

M.ZatanRenderer = (() => {
    // --- Color palette (from zatan.json visual spec) ---
    const COL = {
        armor:       '#2a2a35',
        armorDark:   '#1a1a22',
        armorHi:     '#3a3a48',
        vein:        '#cc2233',
        veinGlow:    '#ff3344',
        overload:    '#9933ff',
        overloadGlow:'#cc66ff',
        sensor:      '#00e5ff',
        sensorGlow:  '#66ffff',
        white:       '#ffffff',
    };

    // --- Afterimage buffer for dash ---
    const afterimages = [];
    const MAX_AFTERIMAGES = 6;

    // --- Pre-rendered offscreen canvas (reserved for future optimization) ---
    let baseCanvas = null;
    let baseCtx = null;
    const BASE_SIZE = 64;

    function initBaseCanvas() {
        if (baseCanvas) return;
        baseCanvas = document.createElement('canvas');
        baseCanvas.width = BASE_SIZE;
        baseCanvas.height = BASE_SIZE;
        baseCtx = baseCanvas.getContext('2d');
    }

    // ============================================================
    // MAIN DRAW — called from player.js draw()
    // ============================================================
    function draw(ctx, sx, sy, state, config) {
        initBaseCanvas();

        const t = Date.now() * 0.001;
        const cascadeTier = M.Cascade.getTier();
        const isInvincible = M.Cascade.isInvincible();

        // Compute emissive intensity
        let emissive = 0.4; // base
        if (state.burstCharging) {
            const chargeT = Math.min(state.burstChargeTime / 0.8, 1);
            emissive = 0.4 + chargeT * 0.6;
        }
        if (cascadeTier >= 2) emissive = Math.min(emissive + 0.3, 1.0);
        if (isInvincible) emissive = 1.0;

        // --- Dash afterimages ---
        if (state.dashTimer > 0) {
            afterimages.push({
                x: sx, y: sy,
                angle: state.aimAngle,
                life: 0.25,
                maxLife: 0.25,
                mode: state.mode
            });
            if (afterimages.length > MAX_AFTERIMAGES) afterimages.shift();
        }

        // Draw + decay afterimages
        for (let i = afterimages.length - 1; i >= 0; i--) {
            const ai = afterimages[i];
            ai.life -= 0.016; // approx 1 frame at 60fps
            if (ai.life <= 0) { afterimages.splice(i, 1); continue; }
            const alpha = (ai.life / ai.maxLife) * 0.35;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(ai.x, ai.y);
            ctx.rotate(ai.angle);
            // Simplified silhouette for afterimage
            drawSilhouette(ctx, ai.mode === 'seeker' ? COL.sensor : '#ff4081');
            ctx.restore();
        }

        // --- Mode swap flash ---
        if (state.modeSwapFlash > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const flashCol = state.mode === 'seeker' ? COL.sensor : '#ff4081';
            const flashAlpha = state.modeSwapFlash / 0.12;
            ctx.globalAlpha = flashAlpha * 0.4;
            M.drawCircle(ctx, sx, sy, 20 * flashAlpha, flashCol);
            ctx.restore();
        }

        // --- Cascade invincibility aura ---
        if (isInvincible) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.25 + Math.sin(t * 8) * 0.12;
            M.drawCircle(ctx, sx, sy, 24, '#ffd740');
            ctx.globalAlpha = 0.15;
            M.drawCircle(ctx, sx, sy, 30, '#ffd740');
            ctx.restore();
        }

        // --- Counterburst charging visuals ---
        if (state.burstCharging) {
            drawBurstCharge(ctx, sx, sy, state, t);
        }

        // --- Main mech body ---
        ctx.save();
        ctx.translate(sx, sy);

        // Idle hover bob
        const hoverOffset = Math.sin(t * 2.0) * 1.5;
        ctx.translate(0, hoverOffset);

        // Movement tilt
        if (state.isThrusting && state.dashTimer <= 0 && !state.burstCharging) {
            const tiltAngle = Math.atan2(state.vy, state.vx);
            const speed = Math.hypot(state.vx, state.vy);
            const tiltAmount = Math.min(speed / 280, 1) * 0.15;
            // Apply subtle lean in movement direction (only affects body, not aim)
            ctx.rotate(tiltAmount * Math.cos(tiltAngle - state.aimAngle));
        }

        ctx.rotate(state.aimAngle);

        // --- Rim light / outline for readability ---
        ctx.save();
        ctx.shadowColor = isInvincible ? '#ffd740' : COL.veinGlow;
        ctx.shadowBlur = isInvincible ? 16 : (6 + emissive * 8);
        drawMechBody(ctx, emissive, state, t, cascadeTier, isInvincible);
        ctx.restore();

        // --- Mode-specific overlays ---
        if (state.mode === 'seeker') {
            drawSeekerDrones(ctx, t);
        } else {
            drawPrismFins(ctx, t);
        }

        // --- Fire recoil muzzle flash ---
        if (state.fireTimer > (state.mode === 'seeker' ? 0.09 : 0.15) - 0.04) {
            drawMuzzleFlash(ctx, state.mode);
        }

        // --- Core sensor eye ---
        const sensorPulse = 0.7 + Math.sin(t * 3) * 0.3;
        ctx.save();
        ctx.shadowColor = COL.sensorGlow;
        ctx.shadowBlur = 4 + emissive * 4;
        M.drawCircle(ctx, 2, -1, 2, COL.sensor);
        ctx.globalAlpha = sensorPulse * 0.6;
        M.drawCircle(ctx, 2, -1, 3.5, COL.sensorGlow + '40');
        ctx.restore();

        ctx.restore(); // translate + rotate

        // --- Gravity drift ribbon (idle, no thrust) ---
        if (!state.isThrusting && !state.burstCharging && state.dashTimer <= 0) {
            ctx.save();
            ctx.globalAlpha = 0.12;
            ctx.strokeStyle = COL.vein;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([2, 4]);
            ctx.beginPath();
            ctx.moveTo(sx, sy + 10 + hoverOffset);
            ctx.lineTo(sx + M.rand(-2, 2), sy + 10 + hoverOffset + 14);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        }

        // --- Lift ring (thrust active) ---
        if (state.isThrusting && state.dashTimer <= 0 && !state.burstCharging) {
            ctx.save();
            ctx.globalAlpha = 0.2 + emissive * 0.1;
            ctx.strokeStyle = COL.vein;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(sx, sy + 12 + hoverOffset, 11, 3.5, 0, 0, M.TAU);
            ctx.stroke();
            // Secondary purple ring during high cascade
            if (cascadeTier >= 1) {
                ctx.globalAlpha = 0.12;
                ctx.strokeStyle = COL.overload;
                ctx.beginPath();
                ctx.ellipse(sx, sy + 13 + hoverOffset, 14, 4.5, 0, 0, M.TAU);
                ctx.stroke();
            }
            ctx.restore();
        }

        // --- Hit flash overlay ---
        if (state.invTimer > 0 && state.invTimer > 1.3) {
            // Brief flash on first frames of damage
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.4;
            M.drawCircle(ctx, sx, sy, 14, '#ff4444');
            ctx.restore();
        }
    }

    // ============================================================
    // MECH BODY — layered asymmetric silhouette
    // ============================================================
    function drawMechBody(ctx, emissive, state, t, cascadeTier, isInvincible) {
        // --- Back fins (wings) — drawn first, behind body ---
        ctx.save();
        ctx.fillStyle = COL.armorDark;
        ctx.strokeStyle = COL.armorHi;
        ctx.lineWidth = 1;

        // Upper back fin (larger, angular)
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(-14, -12);
        ctx.lineTo(-16, -9);
        ctx.lineTo(-10, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lower back fin (shorter)
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(-13, 10);
        ctx.lineTo(-15, 7);
        ctx.lineTo(-9, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Middle back fin
        ctx.beginPath();
        ctx.moveTo(-8, -1);
        ctx.lineTo(-17, -2);
        ctx.lineTo(-16, 1);
        ctx.lineTo(-8, 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // --- Main body (torso) ---
        ctx.fillStyle = COL.armor;
        ctx.strokeStyle = COL.armorHi;
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(10, 0);        // nose/face
        ctx.lineTo(6, -6);        // upper face
        ctx.lineTo(2, -8);        // forehead
        // Left shoulder (heavier mass)
        ctx.lineTo(-3, -10);
        ctx.lineTo(-7, -8);
        ctx.lineTo(-9, -5);
        // Back
        ctx.lineTo(-10, -2);
        ctx.lineTo(-10, 2);
        // Lower body
        ctx.lineTo(-8, 5);
        // Right side (weapon arm, trimmer)
        ctx.lineTo(-4, 8);
        ctx.lineTo(0, 7);
        ctx.lineTo(4, 5);
        ctx.lineTo(7, 3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- Head crest + horns ---
        ctx.fillStyle = COL.armorDark;
        ctx.strokeStyle = COL.armorHi;
        ctx.lineWidth = 1;

        // Central crest (V-shaped)
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(12, -5);    // horn tip (upper)
        ctx.lineTo(9, -3);
        ctx.lineTo(7, -1);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(8, 1);
        ctx.lineTo(11, 3);     // horn tip (lower)
        ctx.lineTo(9, 2);
        ctx.closePath();
        ctx.fill();

        // --- Shoulder pod (left, heavier) ---
        ctx.fillStyle = COL.armorDark;
        ctx.beginPath();
        ctx.moveTo(-3, -10);
        ctx.lineTo(-1, -13);   // upper shoulder spike
        ctx.lineTo(-5, -11);
        ctx.lineTo(-7, -8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- Weapon arm (right / lower side) ---
        ctx.fillStyle = COL.armorDark;
        ctx.lineWidth = 1;
        // Gun barrel
        ctx.beginPath();
        ctx.moveTo(7, 3);
        ctx.lineTo(14, 2);     // barrel tip
        ctx.lineTo(14, 4);
        ctx.lineTo(7, 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COL.armorHi;
        ctx.stroke();

        // --- RED ENERGY VEINS ---
        drawVeins(ctx, emissive, t, cascadeTier, isInvincible);

        // --- PURPLE OVERLOAD ACCENTS (charge / high cascade) ---
        if (state.burstCharging || cascadeTier >= 3 || isInvincible) {
            drawOverloadAccents(ctx, emissive, t, state.burstCharging);
        }

        // --- CYAN SENSOR NODES ---
        drawSensorNodes(ctx, t, emissive);
    }

    // ============================================================
    // RED ENERGY VEINS
    // ============================================================
    function drawVeins(ctx, emissive, t, cascadeTier, isInvincible) {
        const pulse = 0.6 + Math.sin(t * 1.5) * 0.4;
        const intensity = emissive * pulse;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = intensity * 0.8;
        ctx.strokeStyle = COL.veinGlow;
        ctx.lineWidth = 1;
        ctx.shadowColor = COL.veinGlow;
        ctx.shadowBlur = 3 + emissive * 5;

        // Torso central vein
        ctx.beginPath();
        ctx.moveTo(6, -1);
        ctx.lineTo(2, -3);
        ctx.lineTo(-3, -2);
        ctx.lineTo(-6, 0);
        ctx.stroke();

        // Torso lower vein
        ctx.beginPath();
        ctx.moveTo(5, 2);
        ctx.lineTo(1, 3);
        ctx.lineTo(-3, 2);
        ctx.lineTo(-7, 3);
        ctx.stroke();

        // Shoulder vein
        ctx.beginPath();
        ctx.moveTo(-1, -8);
        ctx.lineTo(-4, -7);
        ctx.lineTo(-6, -5);
        ctx.stroke();

        // Weapon arm vein
        ctx.beginPath();
        ctx.moveTo(7, 3.5);
        ctx.lineTo(10, 3);
        ctx.lineTo(13, 3);
        ctx.stroke();

        // Back fin veins
        ctx.globalAlpha = intensity * 0.5;
        ctx.beginPath();
        ctx.moveTo(-8, -3);
        ctx.lineTo(-12, -8);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-8, 2);
        ctx.lineTo(-11, 6);
        ctx.stroke();

        ctx.restore();
    }

    // ============================================================
    // PURPLE OVERLOAD ACCENTS
    // ============================================================
    function drawOverloadAccents(ctx, emissive, t, isCharging) {
        const pulse = isCharging ? (0.5 + Math.sin(t * 6) * 0.5) : (0.3 + Math.sin(t * 3) * 0.3);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = pulse * emissive * 0.7;
        ctx.strokeStyle = COL.overloadGlow;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = COL.overloadGlow;
        ctx.shadowBlur = 4 + emissive * 6;

        // Shoulder overload
        ctx.beginPath();
        ctx.moveTo(-2, -11);
        ctx.lineTo(-4, -9);
        ctx.stroke();

        // Back fin overload traces
        ctx.beginPath();
        ctx.moveTo(-13, -10);
        ctx.lineTo(-15, -8);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(-14, 6);
        ctx.stroke();

        // Core overload ring (during charge)
        if (isCharging) {
            ctx.globalAlpha = pulse * 0.4;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, M.TAU);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ============================================================
    // CYAN SENSOR NODES
    // ============================================================
    function drawSensorNodes(ctx, t, emissive) {
        const blink = Math.sin(t * 3) > 0 ? 1 : 0.4;

        ctx.save();
        ctx.shadowColor = COL.sensorGlow;
        ctx.shadowBlur = 3;

        // Head sensors (two small dots on "forehead" — like concept art)
        ctx.fillStyle = COL.sensor;
        ctx.globalAlpha = blink;
        M.drawCircle(ctx, 5, -4, 1, COL.sensor);   // upper sensor
        M.drawCircle(ctx, 5, 3, 1, COL.sensor);    // lower sensor

        // Shoulder sensor
        ctx.globalAlpha = 0.6;
        M.drawCircle(ctx, -5, -9, 1.2, COL.sensor);

        // Ankle/foot sensor
        M.drawCircle(ctx, -2, 7, 0.8, COL.sensor);

        ctx.restore();
    }

    // ============================================================
    // SEEKER DRONES (orbiting triangles)
    // ============================================================
    function drawSeekerDrones(ctx, t) {
        ctx.fillStyle = COL.sensor;
        for (let i = 0; i < 4; i++) {
            const a = t * 3 + (i / 4) * M.TAU;
            const d = 15;
            const dx = Math.cos(a) * d;
            const dy = Math.sin(a) * d;
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(a + Math.PI / 2);
            ctx.beginPath();
            ctx.moveTo(0, -2);
            ctx.lineTo(-1.5, 2);
            ctx.lineTo(1.5, 2);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }
    }

    // ============================================================
    // PRISM FINS (angular lens fins)
    // ============================================================
    function drawPrismFins(ctx, t) {
        ctx.strokeStyle = '#ff4081';
        ctx.lineWidth = 1.5;
        // Top fin
        ctx.beginPath();
        ctx.moveTo(-2, -9);
        ctx.lineTo(2, -13);
        ctx.lineTo(6, -9);
        ctx.stroke();
        // Bottom fin
        ctx.beginPath();
        ctx.moveTo(-2, 7);
        ctx.lineTo(2, 11);
        ctx.lineTo(6, 7);
        ctx.stroke();
    }

    // ============================================================
    // MUZZLE FLASH (fire state)
    // ============================================================
    function drawMuzzleFlash(ctx, mode) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.6;
        const col = mode === 'seeker' ? COL.sensor : '#ff4081';
        // Flash at barrel tip
        M.drawCircle(ctx, 15, 3, 4, col);
        ctx.globalAlpha = 0.3;
        M.drawCircle(ctx, 15, 3, 7, col + '60');
        ctx.restore();
    }

    // ============================================================
    // SILHOUETTE (simplified for afterimages)
    // ============================================================
    function drawSilhouette(ctx, color) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(6, -6);
        ctx.lineTo(-3, -10);
        ctx.lineTo(-10, -2);
        ctx.lineTo(-10, 2);
        ctx.lineTo(-4, 8);
        ctx.lineTo(7, 3);
        ctx.closePath();
        ctx.fill();
        // Fins
        ctx.beginPath();
        ctx.moveTo(-6, -5);
        ctx.lineTo(-14, -12);
        ctx.lineTo(-10, -4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-6, 4);
        ctx.lineTo(-13, 10);
        ctx.lineTo(-9, 3);
        ctx.closePath();
        ctx.fill();
    }

    // ============================================================
    // COUNTERBURST CHARGE VISUALS
    // ============================================================
    function drawBurstCharge(ctx, sx, sy, state, t) {
        const chargeT = state.burstChargeTime / 0.8;
        const sampleR = 150;
        const ringR = sampleR * (1 - M.clamp(chargeT, 0, 0.8));

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // Danger sampling ring
        ctx.globalAlpha = 0.3 + chargeT * 0.3;
        ctx.strokeStyle = COL.veinGlow;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(sx, sy, ringR, 0, M.TAU);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tightening halo
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = COL.white;
        ctx.lineWidth = 1;
        const haloR = 20 * (1 - M.clamp(chargeT, 0, 1)) + 8;
        ctx.beginPath();
        ctx.arc(sx, sy, haloR, 0, M.TAU);
        ctx.stroke();

        // Purple overload buildup ring
        if (chargeT > 0.3) {
            ctx.globalAlpha = (chargeT - 0.3) * 0.5;
            ctx.strokeStyle = COL.overloadGlow;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, haloR * 0.7, 0, M.TAU);
            ctx.stroke();
        }

        // Predicted burst count
        if (state.burstPredicted > 0) {
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = COL.veinGlow;
            ctx.font = 'bold 11px Courier New';
            ctx.textAlign = 'center';
            ctx.fillText(state.burstPredicted, sx, sy - 22);
        }

        // Danger count tick marks
        const ticks = Math.min(state.burstDangerCount, 30);
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = COL.vein;
        ctx.lineWidth = 2;
        for (let i = 0; i < ticks; i++) {
            const a = (i / 30) * M.TAU - Math.PI / 2;
            const ir = ringR - 4;
            const or = ringR + 4;
            ctx.beginPath();
            ctx.moveTo(sx + Math.cos(a) * ir, sy + Math.sin(a) * ir);
            ctx.lineTo(sx + Math.cos(a) * or, sy + Math.sin(a) * or);
            ctx.stroke();
        }

        ctx.restore();
    }

    // ============================================================
    // HUD PORTRAIT — small Zatan portrait for pause/status
    // ============================================================
    function drawPortrait(ctx, x, y, size) {
        const s = size / 40; // scale factor
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(s, s);

        // Body silhouette
        ctx.fillStyle = COL.armor;
        ctx.strokeStyle = COL.armorHi;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(12, 0);
        ctx.lineTo(8, -8);
        ctx.lineTo(2, -12);
        ctx.lineTo(-5, -14);
        ctx.lineTo(-10, -10);
        ctx.lineTo(-14, -4);
        ctx.lineTo(-14, 4);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-2, 12);
        ctx.lineTo(6, 8);
        ctx.lineTo(10, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Head crest
        ctx.fillStyle = COL.armorDark;
        ctx.beginPath();
        ctx.moveTo(10, -3);
        ctx.lineTo(17, -7);
        ctx.lineTo(12, -5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, 2);
        ctx.lineTo(16, 5);
        ctx.lineTo(12, 3);
        ctx.closePath();
        ctx.fill();

        // Red veins
        ctx.strokeStyle = COL.veinGlow;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = COL.veinGlow;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(2, -4);
        ctx.lineTo(-4, -2);
        ctx.lineTo(-8, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(6, 3);
        ctx.lineTo(0, 5);
        ctx.lineTo(-6, 3);
        ctx.stroke();

        // Sensor eye
        ctx.shadowColor = COL.sensorGlow;
        ctx.shadowBlur = 5;
        M.drawCircle(ctx, 6, -1, 2.5, COL.sensor);

        ctx.restore();
    }

    // ============================================================
    // Cleanup
    // ============================================================
    function clearAfterimages() {
        afterimages.length = 0;
    }

    return { draw, drawPortrait, clearAfterimages, COL };
})();
