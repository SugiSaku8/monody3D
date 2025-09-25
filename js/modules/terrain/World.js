// js/modules/terrain/World.js
import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { WorldGenerator } from '../worldgen/WorldGenerator.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.CHUNK_SIZE = 32;
        this.RENDER_DISTANCE = 2;

        // BiomeManager を初期化
        this.biomeManager = new BiomeManager();

        // PhysicsWorld を初期化して保持
        this.physicsWorld = new PhysicsWorld();

        // Set up lighting
        this.setupLighting();

        // WorldGenerator を初期化
        this.worldGenerator = new WorldGenerator(this, this.biomeManager, this.physicsWorld);

        // --- 追加: 太陽 (DirectionalLight) ---
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1); // 初期色と強度
        this.sunLight.position.set(100, 100, 100); // 初期位置
        this.sunLight.castShadow = true;

        // シャドウマップの設定 (影をリアルに)
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 0.5;
        this.sunLight.shadow.camera.far = 500;
        this.sunLight.shadow.camera.left = -100;
        this.sunLight.shadow.camera.right = 100;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        // ソフトシャドウ
        this.sunLight.shadow.radius = 4; // これもrendererの設定と合わせる

        this.scene.add(this.sunLight);
        // --- 追加 ここまで ---
    }

    // --- 修正: setupLighting で環境光のみに変更 (太陽がメイン照明) ---
    setupLighting() {
        // Ambient light (夜の暗さを調整)
        this.ambientLight = new THREE.AmbientLight(0x404040, 0.2); // 初期強度
        this.scene.add(this.ambientLight);

        // Directional light (太陽) はコンストラクタで追加
    }
    // --- 修正 ここまで ---

    // ... (他のメソッドは変更なし) ...

    update(playerPosition, gameTime) { // gameTime を引数に追加
        // Get player's chunk coordinates
        const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
        const playerChunkY = Math.floor(playerPosition.y / this.CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);

        // Determine which chunks should be loaded
        const chunksToLoad = new Set();

        for (let dx = -this.RENDER_DISTANCE; dx <= this.RENDER_DISTANCE; dx++) {
            for (let dy = -this.RENDER_DISTANCE; dy <= this.RENDER_DISTANCE; dy++) {
                for (let dz = -this.RENDER_DISTANCE; dz <= this.RENDER_DISTANCE; dz++) {
                    const cx = playerChunkX + dx;
                    const cy = playerChunkY + dy;
                    const cz = playerChunkZ + dz;

                    if (cy === 0) {
                        chunksToLoad.add(this.getChunkKey(cx, cy, cz));
                        this.loadChunk(cx, cy, cz);
                    }
                }
            }
        }

        // Unload chunks that are too far away
        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksToLoad.has(key)) {
                const [cx, cy, cz] = key.split(',').map(Number);
                this.unloadChunk(cx, cy, cz);
            }
        }

        // Grid-based features
        this.worldGenerator.generateGridBasedFeatures(playerPosition);

        // --- 追加: 太陽の位置と色を更新 ---
        this.updateSun(gameTime);
        // --- 追加 ここまで ---
    }

    // --- 追加: 太陽の位置と色をゲーム内時間に基づいて更新 ---
    updateSun(gameTime) {
        const gameHours = (gameTime / 3600) % 24; // 0-24のゲーム時刻
        const sunAngle = (gameHours / 24) * Math.PI * 2 - Math.PI / 2; // 0時が下、6時が真横、12時が上、18時が反対側

        // 太陽の位置を計算 (Y軸を中心に回転)
        const sunDistance = 200; // 太陽の距離 (遠くにすると平行光線に近くなる)
        const sunX = Math.cos(sunAngle) * sunDistance;
        const sunY = Math.sin(sunAngle) * sunDistance; // Yが高さ
        const sunZ = Math.sin(sunAngle) * sunDistance * 0.5; // Zも少し動かすと昼夜のメリハリがでる

        this.sunLight.position.set(sunX, sunY, sunZ);

        // 太陽の色と強度を計算 (簡易的な朝焼け・夕焼け、夜)
        let sunColor = new THREE.Color(0xffffff); // デフォルト (昼)
        let sunIntensity = 1.0;
        let ambientIntensity = 0.2;

        if (gameHours >= 5.5 && gameHours < 6.5) { // 朝焼け (5:30 - 6:30)
            // 色をオレンジに近づける
            sunColor = new THREE.Color().lerpColors(new THREE.Color(0x404080), new THREE.Color(0xffaa33), (gameHours - 5.5) / 1.0);
            sunIntensity = 0.5 + (gameHours - 5.5) * 0.5; // 徐々に明るく
            ambientIntensity = 0.1 + (gameHours - 5.5) * 0.1;
        } else if (gameHours >= 6.5 && gameHours < 17.5) { // 昼 (6:30 - 17:30)
            sunColor = new THREE.Color(0xffffff);
            sunIntensity = 1.0;
            ambientIntensity = 0.2;
        } else if (gameHours >= 17.5 && gameHours < 18.5) { // 夕焼け (17:30 - 18:30)
            // 色をオレンジに近づける
            sunColor = new THREE.Color().lerpColors(new THREE.Color(0xffaa33), new THREE.Color(0x404080), (gameHours - 17.5) / 1.0);
            sunIntensity = 1.0 - (gameHours - 17.5) * 0.5; // 徐々に暗く
            ambientIntensity = 0.2 - (gameHours - 17.5) * 0.1;
        } else { // 夜 (18:30 - 5:30)
            sunColor = new THREE.Color(0x404080); // 暗い青
            sunIntensity = 0.1; // 薄暗い光
            ambientIntensity = 0.05;
        }

        // 太陽の色と強度を適用
        this.sunLight.color.copy(sunColor);
        this.sunLight.intensity = sunIntensity;

        // 環境光の強度も調整 (夜を暗くする)
        this.ambientLight.intensity = ambientIntensity;
    }
    // --- 追加 ここまで ---

    // ... (他のメソッドは変更なし) ...

    getWorldTerrainHeightAt(x, z) {
        const biome = this.biomeManager.getBiomeAt(x, z);
        return biome.getHeight(x, z);
    }

    addTreeToChunk(cx, cy, cz, treeMesh) {
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            chunk.addObject(treeMesh);
        } else {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found when adding tree.`);
        }
    }

    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}