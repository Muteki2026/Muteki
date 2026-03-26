# EnemyBasic — Flyer archetype
# Diamond-body aerial enemy with sinusoidal patrol and aimed shots.
# Ported from prototype flyer (archetype 2).
extends CharacterBody2D

# --- Config (from prototype ARCHETYPES.flyer) ---
const BASE_HP := 3
const MOVE_SPEED := 120.0
const RADIUS := 9.0
const SCORE_VALUE := 60
const FIRE_RATE := 1.5
const BULLET_SPEED := 200.0
const COLOR := Color(0.259, 0.647, 0.961)  # #42a5f5

var hp: int = BASE_HP
var max_hp: int = BASE_HP
var fire_timer: float = 0.0
var state_timer: float = 0.0
var patrol_dir: float = 1.0
var alive: bool = true
var target: Node2D = null  # Reference to player

func _ready() -> void:
	fire_timer = randf_range(0, FIRE_RATE)
	patrol_dir = [-1.0, 1.0].pick_random()
	_setup_placeholder_visual()
	add_to_group("enemies")

func _setup_placeholder_visual() -> void:
	# Diamond body with fins
	var img := Image.create(24, 24, false, Image.FORMAT_RGBA8)
	var body_color := Color(0.078, 0.078, 0.157)  # #141428
	var accent := COLOR

	for y in range(24):
		for x in range(24):
			var cx := float(x) - 12.0
			var cy := float(y) - 12.0
			# Diamond shape
			if absf(cx) / 9.0 + absf(cy) / 7.0 < 1.0:
				img.set_pixel(x, y, body_color)
			# Diamond outline
			if absf(absf(cx) / 9.0 + absf(cy) / 7.0 - 1.0) < 0.15:
				img.set_pixel(x, y, accent)
			# Fin accents
			if x >= 4 and x <= 8 and (y == 6 or y == 18):
				img.set_pixel(x, y, accent)

	var tex := ImageTexture.create_from_image(img)
	$Sprite2D.texture = tex

func _physics_process(delta: float) -> void:
	if not alive:
		return
	if GameManager.state != GameManager.GameState.PLAYING:
		return
	if not is_instance_valid(target):
		return

	state_timer += delta
	var to_player := global_position.direction_to(target.global_position)
	var dist_to_player := global_position.distance_to(target.global_position)

	# Sinusoidal patrol
	velocity.x = cos(state_timer * 1.5) * MOVE_SPEED * 0.5 * patrol_dir
	velocity.y = sin(state_timer * 2.0) * MOVE_SPEED * 0.3

	# Drift toward player slowly
	if dist_to_player > 150.0:
		velocity += to_player * 30.0

	# Face player
	rotation = to_player.angle()

	move_and_slide()

	# Firing
	fire_timer -= delta
	if fire_timer <= 0 and dist_to_player < 450.0:
		fire_timer = FIRE_RATE
		var angle_to_player := global_position.angle_to_point(target.global_position) + PI
		ProjectileManager.spawn({
			"type": "enemyBullet",
			"x": global_position.x,
			"y": global_position.y,
			"angle": angle_to_player + randf_range(-0.1, 0.1),
			"speed": BULLET_SPEED,
			"r": 3.0,
			"dmg": 1,
			"life": 2.5,
		})

func take_damage(dmg: int) -> bool:
	hp -= dmg
	ParticleManager.hit_spark(global_position.x, global_position.y, COLOR)

	# Flash white
	$Sprite2D.modulate = Color.WHITE
	var tween := create_tween()
	tween.tween_property($Sprite2D, "modulate", Color(1, 1, 1, 1), 0.1)

	if hp <= 0:
		die()
		return true
	return false

func die() -> void:
	alive = false
	ParticleManager.explosion(global_position.x, global_position.y, 15, COLOR, RADIUS * 2.0)
	CascadeManager.add_kill(global_position)
	GameManager.add_score(SCORE_VALUE)
	GameManager.enemy_killed.emit(global_position, SCORE_VALUE)
	queue_free()
