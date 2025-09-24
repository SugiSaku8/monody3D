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

        // --- 修正: 物理ステップを *プレイヤーアップデートの前* に実行 ---
        this.world.updatePhysics(delta);
        // --- 修正 ここまで ---

        // Update player (物理計算後の状態を反映)
        this.player.update(delta);

        // Update world (chunk loading/unloading)
        this.world.update(this.player.position);

        // Update UI
        this.uiManager.update(this.player);

        // Render scene
        this.renderer.render(this.scene, this.player.camera);
    }
}