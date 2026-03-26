# PlayerZatan — Full gameplay port from prototype
# CharacterBody2D with 8-way movement, gravity, hover, dash,
# seeker/prism weapon swap, danger-scaled counterburst, cascade hooks
extends CharacterBody2D

# --- Data-driven config (loaded from JSON) ---
var config: Dictionary = {}

# Movement
var SPEED := 280.0
var ACCEL := 1600.0
var FRICTION := 0.88
var HOVER_COUNTER := 1.5

# Dash
var DASH_SPEED := 800.0
var DASH_DUR := 0.13
var DASH_CD := 0.8

# Weapons
var FIRE_RATE_SEEKER := 0.09
var FIRE_RATE_PRISM := 0.15

# Stats
var MAX_HP := 10
var RADIUS := 10.0
var INV_TIME := 1.5

# Counterburst
var MAX_BURST := 5
var BURST_SAMPLE_R := 150.0
var BURST_BASE := 40
var BURST_MAX := 420
var BURST_CHARGE_RATE := 0.8

# --- Runtime state ---
var hp: int = 10
var mode: String = "seeker"  # "seeker" or "prism"
var burst_charges: int = 5
var burst_charging: bool = false
var burst_charge_time: float = 0.0
var burst_danger_count: int = 0
var burst_predicted: int = 0
var fire_timer: float = 0.0
var dash_timer: float = 0.0
var dash_cooldown: float = 0.0
var dash_angle: float = 0.0
var inv_timer: float = 0.0
var alive: bool = true
var aim_angle: float = 0.0
var is_thrusting: bool = false
var mode_swap_flash: float = 0.0

# Visual state for renderer
var hit_flash_active: bool = false

# Node references
@onready var sprite: Sprite2D = $Sprite2D
@onready var muzzle_point: Marker2D = $MuzzlePoint
@onready var burst_origin: Marker2D = $BurstOrigin

func _ready() -> void:
	_load_config()
	_setup_placeholder_visual()

func _load_config() -> void:
	var file := FileAccess.open("res://data/entities/player_zatan.json", FileAccess.READ)
	if file:
		var json := JSON.new()
		var err := json.parse(file.get_as_text())
		if err == OK:
			config = json.data
			_apply_config()

func _apply_config() -> void:
	if config.is_empty():
		return
	var mov: Dictionary = config.get("movement", {})
	SPEED = mov.get("speed", SPEED)
	ACCEL = mov.get("accel", ACCEL)
	FRICTION = mov.get("friction", FRICTION)
	HOVER_COUNTER = mov.get("hover_counter_gravity", HOVER_COUNTER)

	var dash_cfg: Dictionary = config.get("dash", {})
	DASH_SPEED = dash_cfg.get("speed", DASH_SPEED)
	DASH_DUR = dash_cfg.get("duration", DASH_DUR)
	DASH_CD = dash_cfg.get("cooldown", DASH_CD)

	var wep: Dictionary = config.get("weapons", {})
	var seeker_cfg: Dictionary = wep.get("seeker", {})
	FIRE_RATE_SEEKER = seeker_cfg.get("fire_rate", FIRE_RATE_SEEKER)
	var prism_cfg: Dictionary = wep.get("prism", {})
	FIRE_RATE_PRISM = prism_cfg.get("fire_rate", FIRE_RATE_PRISM)

	var stats: Dictionary = config.get("stats", {})
	MAX_HP = stats.get("max_hp", MAX_HP)
	RADIUS = stats.get("collision_radius", RADIUS)
	INV_TIME = stats.get("invincibility_time", INV_TIME)

	var cb: Dictionary = config.get("counterburst", {})
	MAX_BURST = cb.get("max_charges", MAX_BURST)
	BURST_SAMPLE_R = cb.get("sample_radius", BURST_SAMPLE_R)
	BURST_BASE = cb.get("base_projectiles", BURST_BASE)
	BURST_MAX = cb.get("max_projectiles", BURST_MAX)

func _setup_placeholder_visual() -> void:
	# Procedural Zatan placeholder — dark mech silhouette with red veins
	var img := Image.create(32, 32, false, Image.FORMAT_RGBA8)
	var armor := Color(0.165, 0.165, 0.208)    # #2a2a35
	var vein := Color(0.8, 0.133, 0.2)          # #cc2233
	var sensor := Color(0.0, 0.898, 1.0)        # #00e5ff
	var overload := Color(0.6, 0.2, 1.0)        # #9933ff

	# Body shape — aggressive asymmetric mech
	for y in range(32):
		for x in range(32):
			var cx := x - 16.0
			var cy := y - 16.0
			var dist := sqrt(cx * cx + cy * cy)

			# Main body ellipse (wider than tall)
			var body_x := cx / 11.0
			var body_y := cy / 8.0
			if body_x * body_x + body_y * body_y < 1.0:
				img.set_pixel(x, y, armor)

				# Red vein channels (horizontal lines)
				if (y == 14 or y == 18) and abs(cx) < 9:
					img.set_pixel(x, y, vein)
				# Center core
				if dist < 3.0:
					img.set_pixel(x, y, sensor)
				# Purple accents on shoulders
				if (y >= 10 and y <= 12) and (abs(cx) >= 7 and abs(cx) <= 10):
					img.set_pixel(x, y, overload)

			# Shoulder pylons (asymmetric)
			if x >= 3 and x <= 7 and y >= 8 and y <= 14:
				img.set_pixel(x, y, Color(0.1, 0.1, 0.13))
			if x >= 25 and x <= 28 and y >= 10 and y <= 18:
				img.set_pixel(x, y, Color(0.1, 0.1, 0.13))

			# Sensor nodes (small cyan dots)
			if (x == 8 and y == 11) or (x == 24 and y == 13):
				img.set_pixel(x, y, sensor)

	var tex := ImageTexture.create_from_image(img)
	sprite.texture = tex
	sprite.offset = Vector2.ZERO

func reset(spawn_pos: Vector2) -> void:
	global_position = spawn_pos
	velocity = Vector2.ZERO
	hp = MAX_HP
	mode = "seeker"
	burst_charges = MAX_BURST
	burst_charging = false
	burst_charge_time = 0.0
	fire_timer = 0.0
	dash_timer = 0.0
	dash_cooldown = 0.0
	inv_timer = 0.0
	alive = true
	mode_swap_flash = 0.0
	visible = true

func _physics_process(delta: float) -> void:
	if not alive:
		return
	if GameManager.state != GameManager.GameState.PLAYING:
		return

	_handle_mode_swap()
	_handle_movement(delta)
	_handle_aim()
	_handle_dash(delta)
	_handle_counterburst(delta)
	_handle_firing(delta)
	_handle_invincibility(delta)
	_handle_visuals(delta)

	move_and_slide()

# --- Mode Swap ---
func _handle_mode_swap() -> void:
	if InputManager.consume_swap():
		mode = "prism" if mode == "seeker" else "seeker"
		mode_swap_flash = 0.12

# --- Movement (8-way with gravity and hover) ---
func _handle_movement(delta: float) -> void:
	var mx := InputManager.move_dir.x
	var my := InputManager.move_dir.y
	is_thrusting = mx != 0 or my != 0

	if dash_timer > 0:
		# Dashing — fixed velocity
		dash_timer -= delta
		velocity = Vector2(cos(dash_angle), sin(dash_angle)) * DASH_SPEED
		var col := GameManager.COL["seeker"] if mode == "seeker" else GameManager.COL["prism"]
		ParticleManager.dash_trail(global_position.x, global_position.y, col)
	elif burst_charging:
		# Slowed during charge
		velocity *= 0.85
		velocity.y += GameManager.GRAVITY * 0.3 * delta
	else:
		# Normal movement
		if mx != 0:
			velocity.x += mx * ACCEL * delta
		if my != 0:
			velocity.y += my * ACCEL * delta

		# Gravity
		velocity.y += GameManager.GRAVITY * delta

		# Hover thrust counters gravity when moving up
		if my < 0:
			velocity.y -= GameManager.GRAVITY * HOVER_COUNTER * delta

		velocity *= FRICTION

		# Speed cap
		var spd := velocity.length()
		if spd > SPEED:
			velocity = velocity.normalized() * SPEED

	# Thrust particles
	if is_thrusting and dash_timer <= 0 and not burst_charging:
		var ta := velocity.angle()
		var col := GameManager.COL["seeker"] if mode == "seeker" else GameManager.COL["prism"]
		ParticleManager.thrust(global_position.x, global_position.y, ta, col)

# --- Aim ---
func _handle_aim() -> void:
	if InputManager.is_firing:
		aim_angle = InputManager.aim_angle
	# Update muzzle point rotation
	muzzle_point.position = Vector2(cos(aim_angle), sin(aim_angle)) * 12.0

# --- Dash ---
func _handle_dash(delta: float) -> void:
	dash_cooldown -= delta
	if InputManager.consume_dash() and dash_timer <= 0 and dash_cooldown <= 0 and not burst_charging:
		dash_timer = DASH_DUR
		dash_cooldown = DASH_CD
		var mx := InputManager.move_dir.x
		var my := InputManager.move_dir.y
		var dash_mx := mx if mx != 0 else cos(aim_angle)
		var dash_my := my if my != 0 else sin(aim_angle)
		dash_angle = atan2(dash_my, dash_mx)

# --- Counterburst ---
func _handle_counterburst(delta: float) -> void:
	if InputManager.is_burst_held() and burst_charges > 0 and not burst_charging and dash_timer <= 0:
		burst_charging = true
		burst_charge_time = 0.0

	if burst_charging:
		burst_charge_time += delta
		var proj_count := ProjectileManager.count_hostile_near(global_position.x, global_position.y, BURST_SAMPLE_R)
		burst_danger_count = proj_count
		var danger_scale := minf(float(burst_danger_count) / 30.0, 1.0)
		burst_predicted = int(BURST_BASE + (BURST_MAX - BURST_BASE) * danger_scale)

		ParticleManager.counterburst_charge(global_position.x, global_position.y, BURST_SAMPLE_R * 0.6)

		if not InputManager.is_burst_held():
			_release_counterburst()

func _release_counterburst() -> void:
	burst_charging = false
	burst_charges -= 1

	var absorbed := ProjectileManager.absorb_hostile_near(global_position.x, global_position.y, BURST_SAMPLE_R)
	var danger_scale := minf(float(burst_danger_count + absorbed) / 30.0, 1.0)
	var burst_count := int(BURST_BASE + (BURST_MAX - BURST_BASE) * danger_scale)

	for i in burst_count:
		var a := (float(i) / burst_count) * TAU + randf_range(-0.02, 0.02)
		ProjectileManager.spawn({
			"type": "counterBurst",
			"x": global_position.x,
			"y": global_position.y,
			"angle": a,
			"speed": randf_range(350, 500),
			"r": 3.0,
			"dmg": 3,
			"life": 1.2,
		})

	ParticleManager.counterburst_release(global_position.x, global_position.y, burst_count)
	GameManager.counterburst_released.emit(global_position, burst_count)
	GameManager.add_shake(8.0)

	burst_charge_time = 0.0
	burst_danger_count = 0
	burst_predicted = 0

# --- Firing ---
func _handle_firing(delta: float) -> void:
	fire_timer -= delta
	if InputManager.is_firing and fire_timer <= 0 and not burst_charging and dash_timer <= 0:
		_fire()

func _fire() -> void:
	var rate := FIRE_RATE_SEEKER if mode == "seeker" else FIRE_RATE_PRISM
	fire_timer = rate
	var spread := 0.08

	if mode == "seeker":
		# Fire 2 homing darts
		for i in [-1, 1]:
			var offset_angle := aim_angle + PI / 2.0 * i
			ProjectileManager.spawn({
				"type": "seekerDart",
				"x": global_position.x + cos(offset_angle) * 6.0,
				"y": global_position.y + sin(offset_angle) * 6.0,
				"angle": aim_angle + randf_range(-spread, spread),
				"speed": 500.0,
				"r": 4.0,
				"dmg": 1,
				"life": 2.0,
				"homing": 4.0,
			})
	else:
		# Prism: single bouncing beam
		ProjectileManager.spawn({
			"type": "prismBeam",
			"x": global_position.x + cos(aim_angle) * 12.0,
			"y": global_position.y + sin(aim_angle) * 12.0,
			"angle": aim_angle + randf_range(-spread * 0.5, spread * 0.5),
			"speed": 600.0,
			"r": 3.0,
			"dmg": 2,
			"life": 3.0,
			"max_bounces": 5,
		})

# --- Damage ---
func take_damage(dmg: int) -> bool:
	if inv_timer > 0 or CascadeManager.is_invincible() or dash_timer > 0:
		return false
	hp -= dmg
	inv_timer = INV_TIME
	hit_flash_active = true
	GameManager.add_shake(6.0)
	ParticleManager.explosion(global_position.x, global_position.y, 10, Color(1, 0.09, 0.267), 15.0)
	GameManager.player_damaged.emit(hp)

	if hp <= 0:
		hp = 0
		alive = false
		visible = false
		ParticleManager.explosion(global_position.x, global_position.y, 30, Color(1, 0.09, 0.267), 30.0)
		GameManager.player_died.emit()
	return true

func recharge_burst() -> void:
	if burst_charges < MAX_BURST:
		burst_charges += 1

# --- Invincibility ---
func _handle_invincibility(delta: float) -> void:
	if inv_timer > 0:
		inv_timer -= delta
	if mode_swap_flash > 0:
		mode_swap_flash -= delta

# --- Visuals ---
func _handle_visuals(_delta: float) -> void:
	# Invincibility blink
	if inv_timer > 0:
		sprite.visible = sin(inv_timer * 30.0) > 0
	else:
		sprite.visible = true

	# Hit flash
	if hit_flash_active and inv_timer < INV_TIME - 0.08:
		hit_flash_active = false
		sprite.modulate = Color.WHITE

	if hit_flash_active:
		sprite.modulate = Color(1.0, 0.267, 0.267)
	elif burst_charging:
		var pulse := 0.7 + sin(burst_charge_time * 10.0) * 0.3
		sprite.modulate = Color(pulse, pulse, 1.0)
	elif mode_swap_flash > 0:
		sprite.modulate = GameManager.COL["seeker"] if mode == "seeker" else GameManager.COL["prism"]
	elif CascadeManager.is_invincible():
		sprite.modulate = Color(1.0, 0.843, 0.251)
	else:
		sprite.modulate = Color.WHITE
