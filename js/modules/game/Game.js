import * as THREE from 'three';
import { World } from '../terrain/World.js';
import { Player } from '../entities/Player.js';
import { AudioManager } from '../audio/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';
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

        // Initialize world and player
        this.world = new World(this.scene);
        this.player = new Player(this.scene, this.world);

        // Set up renderer
        this.setupRenderer();

        // Set up event listeners (キー入力は Player が処理)
        this.setupEventListeners();

          // --- 修正: FPS計算用の変数を初期化 ---
          this.frameCount = 0;
          this.lastFpsUpdate = performance.now(); // 高精度タイマーを使用
          this.currentFps = 0;
          // --- 修正 ここまて ---
  
          // --- 修正: FPS表示用のDOM要素を取得 ---
          this.fpsElement = document.getElementById('fpsCounter');
          if (!this.fpsElement) {
               console.warn("FPS counter element (id='fpsCounter') not found in HTML. Please add it to display FPS.");
          }
          // --- 修正 ここまて ---

        // --- 修正: 非同期で初期化 ---
        this.initializeAsync();
        // --- 修正 ここまて ---
    }

    // --- 追加: 非同期初期化メソッド ---
    async initializeAsync() {
        try {
            // --- 修正: World の初期化 (プリロードを含む) ---
            await this.world.initialize(); // ここで Preloader が実行される
            // --- 修正 ここまて ---

            // --- 修正: プリロード後にゲームループを開始 ---
            // Start game loop
            this.animate();
            // --- 修正 ここまて ---
        } catch (error) {
            console.error("Failed to initialize the game:", error);
            // エラー処理 (例: エラーメッセージを画面に表示)
        }
    }
    // --- 追加 ここまて ---

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('canvasWrapper').appendChild(this.renderer.domElement);
    }

    setupEventListeners() {
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }

    onWindowResize() {
        this.player.camera.aspect = window.innerWidth / window.innerHeight;
        this.player.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const delta = this.clock.getDelta();

        // --- 追加: ゲーム時間経過計算 ---
        this.gameTimeSeconds += delta / this.gameSpeedFactor;
        // 24時間でループ (86400秒)
        this.gameTimeSeconds = this.gameTimeSeconds % (24 * 60 * 60);

        this.currentGameHour = Math.floor(this.gameTimeSeconds / 3600);
        this.currentGameMinute = Math.floor((this.gameTimeSeconds % 3600) / 60);
        // --- 追加 ここまで ---

        // Update physics
        this.world.updatePhysics(delta);

        // Update player
        this.player.update(delta);

        // Update world (chunk loading/unloading)
        // --- 修正: World にゲーム時間を渡す ---
        this.world.update(this.player.position, this.currentGameHour, this.currentGameMinute);
        // --- 修正 ここまで ---

        // Update UI
        this.uiManager.update(this.player);

        // Render scene
        this.renderer.render(this.scene, this.player.camera);

        // --- 追加: FPS計算と表示 ---
        this.frameCount++;
        const now = performance.now();
        const deltaMs = now - this.lastFpsUpdate;

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
        // --- 追加 ここまで ---
    }
}