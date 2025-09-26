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

        // Set up event listeners
        this.setupEventListeners();

        // --- 追加: 時間管理 ---
        this.gameTimeSeconds = 0; // ゲーム内経過秒
        this.gameSpeedFactor = 82.5; // 現実秒 / ゲーム秒 (33 * 60 / 24 / 60)
        this.currentGameHour = 0;
        this.currentGameMinute = 0;
        // --- 追加 ここまで ---

        // FPS計算用の変数
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();
        this.currentFps = 0;
        this.fpsElement = document.getElementById('fpsCounter');
        if (!this.fpsElement) {
             console.warn("FPS counter element (id='fpsCounter') not found in HTML. Please add it to display FPS.");
        }

        // Start game loop
        this.animate();
    }

    setupRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        // --- 追加: レンダラーのクリア色を空色に近い色に設定 ---
        this.renderer.setClearColor( 0x87CEEB ); // スカイブルー
        // --- 追加 ここまで ---
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

        if (deltaMs >= 1000) { // 1秒経過したらFPSを計算
            this.currentFps = Math.round((this.frameCount * 1000) / deltaMs);
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            // FPSとゲーム内時刻をHTML要素に表示
            if (this.fpsElement) {
                this.fpsElement.textContent = `FPS: ${this.currentFps} | Time: ${String(this.currentGameHour).padStart(2, '0')}:${String(this.currentGameMinute).padStart(2, '0')}`;
            }
        }
        // --- 追加 ここまで ---
    }
}