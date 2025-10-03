// js/modules/game/Game.js
import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { World } from '../terrain/World.js';
import { AudioManager } from '../audio/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';
import { CommandManager } from '../ui/CommandManager.js';

export class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.loadedChunks = new Map();
        this.loadedChests = [];
        this.loadedTrolls = [];

        // Initialize managers
        this.audioManager = new AudioManager();
        this.uiManager = new UIManager();

        // Set up renderer first
        this.setupRenderer();

        // Initialize world and player (pass renderer to player)
        this.world = new World(this.scene);
        this.player = new Player(this.scene, this.world, this.renderer);

        // Set up event listeners (キー入力は Player が処理)
        this.setupEventListeners();

        // --- 追加: FPS計算用の変数 ---
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now(); // 高精度タイマーを使用
        this.currentFps = 0;
        // --- 追加 ここまて ---

        // --- 追加: FPS表示用のDOM要素を取得 ---
        this.fpsElement = document.getElementById('fpsCounter');
        if (!this.fpsElement) {
             console.warn("FPS counter element (id='fpsCounter') not found in HTML. Please add it to display FPS.");
        }
        // --- 追加 ここまて ---
     // --- 追加: CommandManager を初期化 ---
     this.commandManager = new CommandManager(this, this.world, this.player, this.uiManager);
     // --- 追加 ここまて ---

     // --- 修正: UIManager に CommandManager を渡してイベントリスナーを設定 ---
     this.uiManager.setupCommandInputListener(this.commandManager);
        // Start game loop
        this.initializeAsync();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('canvasWrapper').appendChild(this.renderer.domElement);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    handleKeyDown(event) {
        if (event.key === 't' || event.key === 'T') {
            // UIManager にコマンド入力欄を表示するように指示
            this.uiManager.showCommandInput();
            console.log("T key pressed. Showing command input.");
        }
    }
    
    onWindowResize() {
        this.player.camera.aspect = window.innerWidth / window.innerHeight;
        this.player.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    async initializeAsync() {
        try {
            // Start game loop
            this.animate();
        } catch (error) {
            console.error("Failed to initialize the game:", error);
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // Update physics
        this.world.updatePhysics(delta);

        // Update player
        this.player.update(delta);

        // Update world (chunk loading/unloading)
        this.world.update(this.player.position);

        // Update UI
        this.uiManager.update(this.player);

        // Render scene
        this.renderer.render(this.scene, this.player.camera);

        // --- 修正: FPS計算と表示 (ロジックを修正・整理) ---
        this.frameCount++; // 1. フレームカウントをインクリメント

        const now = performance.now(); // 2. 現在時刻を取得
        const deltaMs = now - this.lastFpsUpdate; // 3. 前回更新からの経過時間(ms)

        // 4. 1秒 (1000ms) 経過したかチェック
        if (deltaMs >= 1000) {
            // 5. FPSを計算: (フレーム数 * 1000) / 経過時間(ms)
            this.currentFps = Math.round((this.frameCount * 1000) / deltaMs);

            // 6. 次の計算のためにカウンターと時刻をリセット
            this.frameCount = 0;
            this.lastFpsUpdate = now; // 7. 最終更新時刻を現在時刻に更新

            // 8. FPSをHTML要素に表示
            if (this.fpsElement) {
                this.fpsElement.textContent = `FPS: ${this.currentFps}`;
            }
            // console.log(`FPS: ${this.currentFps}`); // デバッグ用
        }
        // --- 修正 ここまて ---
    }
}