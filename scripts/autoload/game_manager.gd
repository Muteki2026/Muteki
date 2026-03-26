# Game Manager Autoload
# Central game state, constants, and coordination
extends Node

# --- Game Constants (from prototype) ---
const GAME_W := 800
const GAME_H := 600
const GRAVITY := 320.0  # px/s²
const MAX_PROJECTILES := 1200
const MAX_PARTICLES := 2000
const TAU := PI * 2.0

# Colors (Neon Salvage palette)
const COL := {
	"bg": Color(0.04, 0.04, 0.07),
	"player": Color(0.0, 0.898, 1.0),         # #00e5ff
	"seeker": Color(0.0, 0.898, 1.0),         # #00e5ff
	"prism": Color(1.0, 0.251, 0.506),        # #ff4081
	"enemy_bullet": Color(1.0, 0.671, 0.0),   # #ffab00
	"enemy_missile": Color(1.0, 0.431, 0.251),# #ff6e40
	"laser": Color(1.0, 0.09, 0.267),         # #ff1744
	"flame": Color(1.0, 0.569, 0.0),          # #ff9100
	"boss_atk": Color(1.0, 0.843, 0.251),     # #ffd740
	"pickup": Color(0.463, 1.0, 0.012),       # #76ff03
	"hp_full": Color(0.0, 0.898, 1.0),        # #00e5ff
	"hp_low": Color(1.0, 0.09, 0.267),        # #ff1744
	"cascade": Color(1.0, 0.671, 0.0),        # #ffab00
}

# --- Game State ---
enum GameState { TITLE, PLAYING, PAUSED, GAME_OVER, STAGE_COMPLETE, VICTORY }
var state: GameState = GameState.TITLE
var score: int = 0
var current_stage_idx: int = 0

# --- Screen shake ---
var shake_amount: float = 0.0
var shake_offset: Vector2 = Vector2.ZERO
const SHAKE_DECAY := 0.88

# --- Signals ---
signal game_started
signal game_over
signal stage_completed
signal score_changed(new_score: int)
signal shake_requested(amount: float)
signal enemy_killed(pos: Vector2, score_value: int)
signal counterburst_released(pos: Vector2, count: int)
signal player_damaged(hp: int)
signal player_died

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(delta: float) -> void:
	# Update shake
	if shake_amount > 0.1:
		shake_offset = Vector2(
			randf_range(-shake_amount, shake_amount),
			randf_range(-shake_amount, shake_amount)
		)
		shake_amount *= SHAKE_DECAY
	else:
		shake_amount = 0.0
		shake_offset = Vector2.ZERO

func add_shake(amount: float) -> void:
	shake_amount = max(shake_amount, amount)

func add_score(points: int) -> void:
	score += points
	score_changed.emit(score)

func start_game() -> void:
	state = GameState.PLAYING
	score = 0
	current_stage_idx = 0
	game_started.emit()

func trigger_game_over() -> void:
	state = GameState.GAME_OVER
	game_over.emit()

func complete_stage() -> void:
	state = GameState.STAGE_COMPLETE
	stage_completed.emit()

# --- Utility Functions ---
static func angle_diff(from_angle: float, to_angle: float) -> float:
	var d := fmod(to_angle - from_angle + PI, TAU)
	if d < 0:
		d += TAU
	return d - PI
