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

        // --- 追加: ゲーム内時間関連 ---
        this.gameTime = 0; // ゲーム内時間 (秒)
        this.gameTimeSpeed = (24 * 60 * 60) / (33 * 60); // 33分(real) = 24時間(game) -> 1秒(real) = 24*3600/33*60 秒(game)
        // --- 追加 ここまで ---

        // FPS計算用変数など
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
        this.renderer.shadowMap.enabled = true; // シャドウマップ有効化
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // ソフトシャドウ
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

        // --- 追加: ゲーム内時間を更新 ---
        this.gameTime += delta * this.gameTimeSpeed;
        // --- 追加 ここまで ---

        // Update physics
        this.world.updatePhysics(delta);

        // Update player
        this.player.update(delta);

        // Update world (chunk loading/unloading, 太陽更新)
        this.world.update(this.player.position, this.gameTime); // gameTime を渡す

        // Update UI
        this.uiManager.update(this.player);

        // Render scene
        this.renderer.render(this.scene, this.player.camera);

        // FPS計算と表示
        this.frameCount++;
        const now = performance.now();
        const deltaMs = now - this.lastFpsUpdate;

        if (deltaMs >= 1000) {
            this.currentFps = Math.round((this.frameCount * 1000) / deltaMs);
            this.frameCount = 0;
            this.lastFpsUpdate = now;

            if (this.fpsElement) {
                this.fpsElement.textContent = `FPS: ${this.currentFps}`;
            }
        }
    }
}