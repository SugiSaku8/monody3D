// js/modules/game/Game.js
import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { World } from '../terrain/World.js';
import { AudioManager } from '../audio/AudioManager.js';
import { UIManager } from '../ui/UIManager.js';

export class Game {
    // --- 修正: コンストラクタに loadStartTime を追加 ---
    constructor(loadStartTime) {
        this.scene = new THREE.Scene();
        this.clock = new THREE.Clock();
        this.loadedChunks = new Map();
        this.loadedChests = [];
        this.loadedTrolls = [];

        // --- 追加: ロード時間計測用の変数 ---
        this.loadStartTime = loadStartTime;
        this.progressAt31_25ms = 0; // 1/32秒経過時の進捗を格納
        // --- 追加 ここまて ---

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

        // Set up lighting & sky
        this.setupLighting();

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
    }
    // --- 修正 ここまて ---

    // ... (setupRenderer, setupEventListeners, onWindowResize は変更なし) ...

    // --- 修正: setupLighting メソッドを追加 ---
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.0); // 強度を 0.4 から 1.0 に上げる
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }
    // --- 修正 ここまて ---

    // --- 修正: 非同期初期化メソッド ---
    async initializeAsync() {
        try {
            // --- 修正: 1/32秒 (31.25ms) 経過チェックをセットアップ ---
            const checkProgressAfter31_25ms = () => {
                setTimeout(async () => {
                    const currentTime = performance.now();
                    const elapsedTime = currentTime - this.loadStartTime;
                    if (elapsedTime >= 31.25) {
                        // 1/32秒経過後に進捗を確認
                        // World の初期化状況を確認 (例: Preloader の進行状況)
                        // ここでは、World が初期化されているかを確認
                        if (this.world && typeof this.world.getInitializationProgress === 'function') {
                             this.progressAt31_25ms = await this.world.getInitializationProgress();
                             console.log("Progress at 31.25ms:", this.progressAt31_25ms, "%");
                        } else {
                             // World が初期化されていない、または getInitializationProgress がない場合
                             // チャンクロードの状況などから推定するか、0% とする
                             this.progressAt31_25ms = 0;
                             console.warn("World initialization progress check failed: getInitializationProgress not available.");
                        }
                    } else {
                        // 31.25ms 未満なら、再スケジュール
                        checkProgressAfter31_25ms();
                    }
                }, 1); // 1ms後に再チェック (実際にはブラウザの描画タイミングに依存)
            };
            checkProgressAfter31_25ms(); // 1/32秒チェックを開始
            // --- 修正 ここまて ---

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
            throw error; // main.js にエラーを再スロー
        }
    }
    // --- 修正 ここまて ---

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

    // ... (他のメソッドは変更なし) ...
}