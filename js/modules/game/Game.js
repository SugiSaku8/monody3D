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

        // --- 追加: FPS計算用の変数 ---
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now(); // 高精度タイマーを使用
        this.currentFps = 0;
        // --- 追加 ここまで ---

        // --- 追加: FPS表示用のDOM要素を取得 ---
        this.fpsElement = document.getElementById('fpsCounter'); // index.html に <div id="fpsCounter">FPS: 0</div> などを追加
        if (!this.fpsElement) {
             console.warn("FPS counter element (id='fpsCounter') not found in HTML. Please add it to display FPS.");
        }
        // --- 追加 ここまで ---

        // Start game loop
        this.animate();
    }

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

        // --- 追加: FPS計算と表示 ---
        this.frameCount++;
        const now = performance.now();
        const deltaMs = now - this.lastFpsUpdate;

        if (deltaMs >= 1000) { // 1秒経過したらFPSを計算
            this.currentFps = Math.round((this.frameCount * 1000) / deltaMs);
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // FPSをHTML要素に表示
            if (this.fpsElement) {
                this.fpsElement.textContent = `FPS: ${this.currentFps}`;
            }
        }
        // --- 追加 ここまで ---
    }
}