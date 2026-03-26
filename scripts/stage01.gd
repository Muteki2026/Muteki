# Stage01 — Scrap Yard arena
# Loads stage data from JSON, manages wave spawning, collision boundaries,
# background rendering, and end conditions.
extends Node2D

const EnemyBasicScene := preload("res://scenes/enemies/EnemyBasic.tscn")
const PlayerScene := preload("res://scenes/player/PlayerZatan.tscn")

var stage_data: Dictionary = {}
var bounds: Rect2 = Rect2(0, 0, 1200, 800)
var walls: Array = []
var waves: Array = []
var wave_idx: int = 0
var stage_time: float = 0.0
var time_limit: float = 90.0
var stage_complete: bool = false

var player: CharacterBody2D = null
var enemies_node: Node2D = null
var walls_node: Node2D = null
var bg_node: Node2D = null

# HUD reference
@onready var hud := $CanvasLayer/HUD
@onready var camera := $Camera2D

func _ready() -> void:
	_load_stage_data()
	_build_scene()
	_spawn_player()

	GameManager.state = GameManager.GameState.PLAYING
	CascadeManager.reset()
	ProjectileManager.clear_all()
	ParticleManager.clear()

func _load_stage_data() -> void:
	var file := FileAccess.open("res://data/stages/stage01.json", FileAccess.READ)
	if file:
		var json := JSON.new()
		var err := json.parse(file.get_as_text())
		if err == OK:
			stage_data = json.data

	var b: Dictionary = stage_data.get("bounds", {"x": 0, "y": 0, "w": 1200, "h": 800})
	bounds = Rect2(b["x"], b["y"], b["w"], b["h"])
	walls = stage_data.get("walls", [])
	waves = stage_data.get("waves", [])
	time_limit = stage_data.get("time_limit", 90)

func _build_scene() -> void:
	# Background
	bg_node = Node2D.new()
	bg_node.name = "Background"
	add_child(bg_node)
	bg_node.z_index = -10

	# Wall collision bodies
	walls_node = Node2D.new()
	walls_node.name = "Walls"
	add_child(walls_node)

	for w in walls:
		var body := StaticBody2D.new()
		body.collision_layer = 16  # layer 5 = walls
		body.collision_mask = 0
		var shape := CollisionShape2D.new()
		var rect := RectangleShape2D.new()
		rect.size = Vector2(w["w"], w["h"])
		shape.shape = rect
		shape.position = Vector2(w["x"] + w["w"] / 2.0, w["y"] + w["h"] / 2.0)
		body.add_child(shape)
		walls_node.add_child(body)

	# Stage boundary walls (invisible)
	_add_boundary_wall(Vector2(bounds.position.x - 20, bounds.position.y), Vector2(20, bounds.size.y))  # left
	_add_boundary_wall(Vector2(bounds.end.x, bounds.position.y), Vector2(20, bounds.size.y))  # right
	_add_boundary_wall(Vector2(bounds.position.x, bounds.position.y - 20), Vector2(bounds.size.x, 20))  # top
	_add_boundary_wall(Vector2(bounds.position.x, bounds.end.y), Vector2(bounds.size.x, 20))  # bottom

	# Enemy container
	enemies_node = Node2D.new()
	enemies_node.name = "Enemies"
	add_child(enemies_node)

func _add_boundary_wall(pos: Vector2, size: Vector2) -> void:
	var body := StaticBody2D.new()
	body.collision_layer = 16
	body.collision_mask = 0
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = size
	shape.shape = rect
	shape.position = pos + size / 2.0
	body.add_child(shape)
	walls_node.add_child(body)

func _spawn_player() -> void:
	player = PlayerScene.instantiate()
	add_child(player)
	var spawn_pos := Vector2(bounds.position.x + bounds.size.x / 2.0, bounds.position.y + bounds.size.y / 2.0)
	player.reset(spawn_pos)
	# Connect HUD
	if hud:
		hud.player = player

func _process(delta: float) -> void:
	if GameManager.state != GameManager.GameState.PLAYING:
		return

	stage_time += delta

	# Spawn waves
	while wave_idx < waves.size() and stage_time >= waves[wave_idx]["time"]:
		_spawn_wave(waves[wave_idx])
		wave_idx += 1

	# Overclock drain (damage player if past time limit)
	var time_remaining := time_limit - stage_time
	if time_remaining < 0:
		if int(time_remaining) != int(time_remaining + delta):
			if player and player.alive:
				player.take_damage(1)

	# Update projectiles
	var active_enemies := get_tree().get_nodes_in_group("enemies")
	ProjectileManager.update(delta, bounds, player.global_position if player else Vector2.ZERO, active_enemies)

	# Update particles
	ParticleManager.update_particles(delta)

	# Handle collisions
	_handle_collisions()

	# Update camera
	_update_camera(delta)

	# Check stage complete
	var all_waves_spawned := wave_idx >= waves.size()
	var no_enemies := get_tree().get_nodes_in_group("enemies").size() == 0
	if all_waves_spawned and no_enemies and not stage_complete:
		stage_complete = true
		GameManager.complete_stage()

	# Check player death
	if player and not player.alive and GameManager.state == GameManager.GameState.PLAYING:
		GameManager.trigger_game_over()

	# Force redraw for custom drawing
	queue_redraw()

func _spawn_wave(wave: Dictionary) -> void:
	var enemy_defs: Array = wave.get("enemies", [])
	for edef in enemy_defs:
		var enemy := EnemyBasicScene.instantiate()
		enemies_node.add_child(enemy)
		enemy.global_position = Vector2(edef["x"], edef["y"])
		enemy.target = player

func _handle_collisions() -> void:
	if not player or not player.alive:
		return

	# Player projectiles vs enemies
	var friendly := ProjectileManager.get_friendly()
	var enemy_nodes := get_tree().get_nodes_in_group("enemies")

	for proj in friendly:
		if not proj["active"]:
			continue
		var proj_pos := Vector2(proj["x"], proj["y"])
		for e in enemy_nodes:
			if not e.alive:
				continue
			if proj_pos.distance_to(e.global_position) < proj["r"] + e.RADIUS:
				e.take_damage(proj["dmg"])
				proj["active"] = false
				ParticleManager.hit_spark(proj["x"], proj["y"], GameManager.COL["player"])
				break

	# Enemy projectiles vs player
	var hostile := ProjectileManager.get_hostile()
	for proj in hostile:
		if not proj["active"]:
			continue
		var proj_pos := Vector2(proj["x"], proj["y"])
		if proj_pos.distance_to(player.global_position) < proj["r"] + player.RADIUS:
			if player.take_damage(proj["dmg"]):
				proj["active"] = false

	# Enemy body vs player (contact damage)
	for e in enemy_nodes:
		if not e.alive:
			continue
		if e.global_position.distance_to(player.global_position) < e.RADIUS + player.RADIUS:
			player.take_damage(1)

func _update_camera(delta: float) -> void:
	if not player:
		return

	# Smooth follow
	var target_pos := player.global_position
	camera.global_position = camera.global_position.lerp(target_pos, delta * 5.0)

	# Clamp to stage bounds
	var half_vp := Vector2(GameManager.GAME_W, GameManager.GAME_H) / 2.0
	camera.global_position.x = clampf(camera.global_position.x, bounds.position.x + half_vp.x, bounds.end.x - half_vp.x)
	camera.global_position.y = clampf(camera.global_position.y, bounds.position.y + half_vp.y, bounds.end.y - half_vp.y)

	# Screen shake
	camera.offset = GameManager.shake_offset

func get_time_remaining() -> float:
	return time_limit - stage_time

func get_stage_time() -> float:
	return stage_time

func get_stage_name() -> String:
	return stage_data.get("name", "SECTOR 01")

# --- Custom Drawing (background, walls, projectiles, particles) ---
func _draw() -> void:
	_draw_background()
	_draw_walls()
	_draw_projectiles()
	_draw_particles()

func _draw_background() -> void:
	# Dark void background
	draw_rect(Rect2(bounds.position, bounds.size), GameManager.COL["bg"])

	# Grid lines
	var grid_size := 80.0
	var grid_color := Color(1, 1, 1, 0.03)
	var x := bounds.position.x
	while x <= bounds.end.x:
		draw_line(Vector2(x, bounds.position.y), Vector2(x, bounds.end.y), grid_color, 1.0)
		x += grid_size
	var y := bounds.position.y
	while y <= bounds.end.y:
		draw_line(Vector2(bounds.position.x, y), Vector2(bounds.end.x, y), grid_color, 1.0)
		y += grid_size

	# Arena ambient — scattered dim rectangles for scrap yard feel
	var rng := RandomNumberGenerator.new()
	rng.seed = 42  # Deterministic
	for i in 12:
		var rx := rng.randf_range(bounds.position.x + 50, bounds.end.x - 50)
		var ry := rng.randf_range(bounds.position.y + 50, bounds.end.y - 50)
		var rw := rng.randf_range(10, 40)
		var rh := rng.randf_range(10, 40)
		draw_rect(Rect2(rx, ry, rw, rh), Color(1, 1, 1, 0.015))

func _draw_walls() -> void:
	for w in walls:
		var rect := Rect2(w["x"], w["y"], w["w"], w["h"])
		draw_rect(rect, Color(0.059, 0.059, 0.102))  # #0f0f1a
		draw_rect(rect, Color(1, 1, 1, 0.1), false, 1.0)
		# Corner accents
		var cs := 4.0
		draw_line(Vector2(rect.position.x, rect.position.y + cs), rect.position, Color(0.392, 0.784, 1.0, 0.08), 1.0)
		draw_line(rect.position, Vector2(rect.position.x + cs, rect.position.y), Color(0.392, 0.784, 1.0, 0.08), 1.0)

func _draw_projectiles() -> void:
	var projs := ProjectileManager.get_all_active()
	for p in projs:
		var pos := Vector2(p["x"], p["y"])
		match p["type"]:
			"seekerDart":
				# Cyan homing dart
				draw_circle(pos, p["r"], GameManager.COL["seeker"])
				# Trail
				var trail_end := pos - Vector2(cos(p["angle"]), sin(p["angle"])) * p["r"] * 3
				draw_line(pos, trail_end, Color(0, 0.898, 1.0, 0.4), 1.5)
			"prismBeam":
				# Magenta beam segment
				var dir := Vector2(cos(p["angle"]), sin(p["angle"]))
				var half := dir * p["r"] * 2
				draw_line(pos - half, pos + half, GameManager.COL["prism"], 3.0)
				draw_line(pos - half * 0.5, pos + half * 0.5, Color.WHITE, 1.0)
			"counterBurst":
				draw_circle(pos, p["r"], Color.WHITE)
				draw_circle(pos, p["r"] * 0.6, GameManager.COL["player"])
			"enemyBullet":
				# Amber diamond
				var r := p["r"]
				var pts := PackedVector2Array([
					pos + Vector2(0, -r), pos + Vector2(r, 0),
					pos + Vector2(0, r), pos + Vector2(-r, 0),
				])
				draw_colored_polygon(pts, GameManager.COL["enemy_bullet"])
			"enemyMissile":
				draw_circle(pos, p["r"], GameManager.COL["enemy_missile"])
			"enemyLaser":
				var dir := Vector2(cos(p["angle"]), sin(p["angle"]))
				draw_line(pos - dir * p["r"] * 3, pos + dir * p["r"] * 3, GameManager.COL["laser"], 3.0)
			"enemyFlame":
				var alpha := clampf(p["life"] / 0.5, 0, 1) * 0.7
				draw_circle(pos, p["r"] * 2, Color(1, 0.565, 0, alpha))

func _draw_particles() -> void:
	for p in ParticleManager.particles:
		var alpha := clampf(p["life"] / p["max_life"], 0, 1)
		var col: Color = p["color"]
		col.a = alpha
		draw_circle(Vector2(p["x"], p["y"]), p["size"], col)
