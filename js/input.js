// ============================================================
// Muteki - Input Module (Keyboard + Mouse + Touch)
// ============================================================
'use strict';

M.Input = (() => {
    const keys = {};
    const prev = {};
    const mouse = { x: 0, y: 0, down: false, clicked: false };
    const touch = {
        move: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
        aim: { active: false, dx: 0, dy: 0 },
        fire: false, burst: false, dash: false, switchMode: false
    };
    let isMobile = false;
    let joystickCenter = null;
    let joystickTouch = null;
    let aimCenter = null;
    let aimTouch = null;

    function init(canvas) {
        isMobile = 'ontouchstart' in window && window.matchMedia('(hover: none)').matches;

        // Keyboard
        window.addEventListener('keydown', e => {
            if (e.code === 'Tab') e.preventDefault();
            keys[e.code] = true;
        });
        window.addEventListener('keyup', e => {
            keys[e.code] = false;
        });

        // Mouse
        canvas.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = M.GAME_W / rect.width;
            const scaleY = M.GAME_H / rect.height;
            mouse.x = (e.clientX - rect.left) * scaleX;
            mouse.y = (e.clientY - rect.top) * scaleY;
        });
        canvas.addEventListener('mousedown', e => { if (e.button === 0) { mouse.down = true; mouse.clicked = true; } });
        canvas.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });

        // Touch — joystick on left half, buttons on right
        if (isMobile) {
            const joystickArea = document.getElementById('joystickArea');

            canvas.addEventListener('touchstart', handleTouch, { passive: false });
            canvas.addEventListener('touchmove', handleTouch, { passive: false });
            canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
            canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

            // Button bindings
            bindBtn('btnFire',   () => touch.fire = true,   () => touch.fire = false);
            bindBtn('btnBurst',  () => touch.burst = true,  () => touch.burst = false);
            bindBtn('btnDash',   () => touch.dash = true,   () => touch.dash = false);
            bindBtn('btnSwitch', () => touch.switchMode = true, () => touch.switchMode = false);
        }
    }

    function bindBtn(id, onDown, onUp) {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); onDown(); }, { passive: false });
        el.addEventListener('touchend',   e => { e.preventDefault(); e.stopPropagation(); onUp(); }, { passive: false });
        el.addEventListener('touchcancel',e => { onUp(); }, { passive: false });
    }

    function handleTouch(e) {
        e.preventDefault();
        for (let i = 0; i < e.touches.length; i++) {
            const t = e.touches[i];
            // Left half = virtual joystick for movement
            if (t.clientX < window.innerWidth * 0.5) {
                if (!joystickCenter) {
                    joystickCenter = { x: t.clientX, y: t.clientY };
                    joystickTouch = t.identifier;
                }
                if (t.identifier === joystickTouch) {
                    const dx = t.clientX - joystickCenter.x;
                    const dy = t.clientY - joystickCenter.y;
                    const maxR = 50;
                    touch.move.active = true;
                    touch.move.dx = M.clamp(dx / maxR, -1, 1);
                    touch.move.dy = M.clamp(dy / maxR, -1, 1);
                }
            }
            // Right half (lower region) = aim joystick
            else if (t.clientY > window.innerHeight * 0.45) {
                if (!aimCenter) {
                    aimCenter = { x: t.clientX, y: t.clientY };
                    aimTouch = t.identifier;
                }
                if (t.identifier === aimTouch) {
                    const dx = t.clientX - aimCenter.x;
                    const dy = t.clientY - aimCenter.y;
                    const maxR = 40;
                    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                        touch.aim.active = true;
                        touch.aim.dx = M.clamp(dx / maxR, -1, 1);
                        touch.aim.dy = M.clamp(dy / maxR, -1, 1);
                        touch.fire = true; // auto-fire while aiming
                    }
                }
            }
        }
    }

    function handleTouchEnd(e) {
        e.preventDefault();
        let joyStillActive = false;
        let aimStillActive = false;
        for (let i = 0; i < e.touches.length; i++) {
            if (e.touches[i].identifier === joystickTouch) joyStillActive = true;
            if (e.touches[i].identifier === aimTouch) aimStillActive = true;
        }
        if (!joyStillActive) {
            touch.move.active = false;
            touch.move.dx = 0;
            touch.move.dy = 0;
            joystickCenter = null;
            joystickTouch = null;
        }
        if (!aimStillActive) {
            touch.aim.active = false;
            touch.aim.dx = 0;
            touch.aim.dy = 0;
            aimCenter = null;
            aimTouch = null;
        }
    }

    // Unified API
    function moveX() {
        if (isMobile && touch.move.active) return touch.move.dx;
        let v = 0;
        if (keys['KeyA'] || keys['ArrowLeft'])  v -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) v += 1;
        return v;
    }

    function moveY() {
        if (isMobile && touch.move.active) return touch.move.dy;
        let v = 0;
        if (keys['KeyW'] || keys['ArrowUp'])   v -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) v += 1;
        return v;
    }

    function firing() {
        return mouse.down || touch.fire;
    }

    function burst() {
        return keys['Space'] || touch.burst;
    }

    function dash() {
        return keys['ShiftLeft'] || keys['ShiftRight'] || touch.dash;
    }

    function switchMode() {
        const pressed = keys['Tab'] || touch.switchMode;
        const wasPrev = prev['switchMode'];
        prev['switchMode'] = pressed;
        return pressed && !wasPrev;
    }

    function aimAngle(playerScreenX, playerScreenY) {
        if (isMobile) {
            // Prefer dedicated aim stick
            if (touch.aim.active && (Math.abs(touch.aim.dx) > 0.1 || Math.abs(touch.aim.dy) > 0.1)) {
                return Math.atan2(touch.aim.dy, touch.aim.dx);
            }
            // Fallback to movement direction
            if (touch.move.active && (Math.abs(touch.move.dx) > 0.1 || Math.abs(touch.move.dy) > 0.1)) {
                return Math.atan2(touch.move.dy, touch.move.dx);
            }
            return 0;
        }
        return Math.atan2(mouse.y - playerScreenY, mouse.x - playerScreenX);
    }

    function endFrame() {
        mouse.clicked = false;
    }

    return { init, moveX, moveY, firing, burst, dash, switchMode, aimAngle, endFrame, mouse, isMobile: () => isMobile };
})();
