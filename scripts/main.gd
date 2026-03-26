# Main Scene — Top-level scene flow controller
# Title → Stage01 → GameOver → restart loop
extends Node

const Stage01Scene := preload("res://scenes/stages/Stage01.tscn")

@onready var title_screen: Control = $UI/TitleScreen
@onready var game_over_screen: Control = $UI/GameOverScreen

var current_stage: Node2D = null

func _ready() -> void:
	title_screen.start_pressed.connect(_on_start)
	game_over_screen.restart_pressed.connect(_on_restart)
	_show_title()

func _show_title() -> void:
	GameManager.state = GameManager.GameState.TITLE
	title_screen.visible = true
	game_over_screen.visible = false
	if current_stage:
		current_stage.queue_free()
		current_stage = null

func _on_start() -> void:
	title_screen.visible = false
	game_over_screen.visible = false
	GameManager.start_game()
	_load_stage()

func _on_restart() -> void:
	game_over_screen.visible = false
	if current_stage:
		current_stage.queue_free()
		current_stage = null
	# Small delay to let queue_free process
	await get_tree().process_frame
	_show_title()

func _load_stage() -> void:
	current_stage = Stage01Scene.instantiate()
	add_child(current_stage)
	# Move stage behind UI
	move_child(current_stage, 0)
