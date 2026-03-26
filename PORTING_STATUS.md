# Muteki — Godot 4 Porting Status

## Overview

The Muteki game is being ported from an HTML5 Canvas prototype to Godot 4.
This document tracks what has been ported, what remains, and next steps.

---

## ✅ Successfully Ported

### Project Scaffold
- [x] Godot 4 project structure (root level)
- [x] Input mapping (WASD move, arrows aim/fire, Space burst, Shift dash, E swap)
- [x] Autoload singletons (GameManager, ProjectileManager, CascadeManager, ParticleManager, InputManager)
- [x] Physics layers (player, enemies, projectiles, walls, pickups)
- [x] Main scene flow (Title → Stage → GameOver → restart)

### Player: Zatan
- [x] CharacterBody2D with correct collision
- [x] Data-driven config from `player_zatan.json` (all original tuned values preserved)
- [x] 8-way movement with ACCEL/FRICTION model (speed=280, accel=1600, friction=0.88)
- [x] Gravity (320 px/s²) + hover thrust (1.5x counter)
- [x] Dash (speed=800, duration=0.13s, cooldown=0.8s)
- [x] Seeker weapon (2x homing darts, fire_rate=0.09, speed=500, homing=4)
- [x] Prism weapon (1x bouncing beam, fire_rate=0.15, speed=600, 5 bounces)
- [x] Weapon swap (E key)
- [x] Danger-scaled Counterburst (40–420 projectiles, sample_radius=150, absorbs nearby bullets)
- [x] HP system (10 max, invincibility=1.5s)
- [x] Burst recharge timer (6s auto-regen)
- [x] Visual feedback (invincibility blink, hit flash, charge pulse, mode swap flash)
- [x] Procedural placeholder visual (correct silhouette/colors)

### Stage01: Scrap Yard
- [x] Arena bounds (1200×800)
- [x] Wall collision geometry (3 walls from prototype)
- [x] Stage boundary walls
- [x] Background with grid lines and scrap debris
- [x] 5-wave enemy spawn system (time-based)
- [x] Overclock drain (damage after time limit)
- [x] Stage completion condition (all waves + all enemies defeated)
- [x] Stage timer visible in HUD

### Enemy: Flyer (Basic)
- [x] Diamond-body aerial enemy
- [x] Sinusoidal patrol movement
- [x] Drift toward player behavior
- [x] Aimed single-shot firing (fire_rate=1.5, bullet_speed=200)
- [x] HP system (3 HP, score=60)
- [x] Death → cascade event + explosion particles + score award
- [x] Procedural placeholder visual

### HUD
- [x] HP bar (10 skewed segments, color transitions)
- [x] Mode indicator (SEEK/PRISM with color + icon)
- [x] Burst charges (5 cells)
- [x] Cascade meter (200px bar, tier notches, count label)
- [x] Score (right-aligned, comma-formatted)
- [x] Stage timer (with overclock flash when negative)
- [x] Stage label (top center)
- [x] Tier flash overlay (center screen)
- [x] Invincibility banner

### Systems
- [x] Projectile pooling (400 projectiles, expandable)
- [x] Homing projectile behavior
- [x] Prism beam bouncing off stage walls
- [x] Cascade system (5 tiers: 50/100/200/400/500, decay=20/sec, invuln at 500)
- [x] Particle system (explosions, sparks, trails, charge effects)
- [x] Camera follow with smooth lerp + boundary clamping
- [x] Screen shake system
- [x] Collision detection (projectile↔enemy, projectile↔player, body↔player)

### UI Flow
- [x] Title screen with controls hint
- [x] Game over screen with score display
- [x] Restart flow

---

## ❌ Remains Only in Old Prototype (Not Yet Ported)

### Enemies (7 of 8 archetypes)
- [ ] Turret (stationary, 3-bullet spread)
- [ ] Hopper (gravity-based jumper)
- [ ] Laser Emitter (wind-up telegraph beam)
- [ ] Flame Pivot (rotating fire stream)
- [ ] Spawner (spawns drone flyers)
- [ ] Sniper (long-range precision)
- [ ] Shield (frontal block, rear vulnerability)

### Bosses (3)
- [ ] B01 Helix Warden (60 HP, drill orbit + spray patterns)
- [ ] B02 Signal Marshal (50 HP, bullet stream + burst wave)
- [ ] B03 Twin Press (70 HP, crusher plates + missile fan)
- [ ] Boss HP bar in HUD

### Stages (2 of 3)
- [ ] Stage 2: Signal Corridor (narrow, prism-friendly)
- [ ] Stage 3: Core Factory (complex layout)
- [ ] Stage transitions (auto-advance to next stage)

### Rendering
- [ ] Zatan full procedural renderer (vein animation, sensor glow, mode visuals)
- [ ] Dash afterimage system
- [ ] Counterburst "breathe" aftermath overlay
- [ ] Enemy-specific draw routines (unique per archetype)
- [ ] Boss visual rendering
- [ ] Tileset-specific backgrounds (corridor, factory)

### Pickups
- [ ] Drop spawning (5 tiers: Data Shard → Hyper Core)
- [ ] Pickup physics (gravity, bounce, magnet radius)
- [ ] Score value per tier (100/500/1000/2000/4000)

### Polish
- [ ] Touch input (dual virtual joysticks)
- [ ] Gamepad support
- [ ] Victory condition / ending sequence
- [ ] Stage transition animation
- [ ] Sound effects
- [ ] Music

---

## 🎯 Recommended Next Porting Targets (Priority Order)

1. **Turret + Hopper enemies** — adds ground-based variety to Stage01
2. **Pickup system** — completes the cascade reward loop
3. **Remaining enemy archetypes** — fills out Stage01 encounters
4. **Boss01: Helix Warden** — adds climax to Stage01
5. **Stage02 + Stage03** — expands the game
6. **Full Zatan renderer** — replaces placeholder with animated visuals
