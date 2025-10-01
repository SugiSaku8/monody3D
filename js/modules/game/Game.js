// js/modules/game/Game.js
import * as THREE from 'three';
import { Player } from '../entities/Player.js';
import { World } from '../terrain/World.js';
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

        // --- 修正: 非同期で初期化 ---
        this.initializeAsync();
        // --- 修正 ここまて ---
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

    // --- 修正: 非同期初期化メソッド ---
    async initializeAsync() {
        try {
            // --- 修正: World の初期化 (プリロードを含む) を削除 ---
            // await this.world.initialize(); // これは不要になったため削除
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
    // --- 修正 ここまて ---

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
    }

    // ... (他のメソッドは変更なし) ...
}