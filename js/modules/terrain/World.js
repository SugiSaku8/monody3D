// js/modules/terrain/World.js
import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
// --- 追加: WorldGenerator をインポート ---
import { WorldGenerator } from '../worldgen/WorldGenerator.js';
// --- 追加 ここまで ---

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

        // --- 追加: WorldGenerator を初期化 ---
        this.worldGenerator = new WorldGenerator(this, this.biomeManager, this.physicsWorld);
        // --- 追加 ここまで ---
    }

    // ... (他のメソッドは変更なし) ...

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(1, 1, 1).normalize();
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
    }

    getChunkKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    getChunkAt(x, y, z) {
        const key = this.getChunkKey(x, y, z);
        return this.chunks.get(key) || null;
    }

    loadChunk(x, y, z) {
        const key = this.getChunkKey(x, y, z);

        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }

        // biomeManager と physicsWorld を渡す (必要に応じて、Y=0以外のチャンクに物理コライダーがある場合)
        const chunk = new Chunk(x, y, z, this.CHUNK_SIZE, this.biomeManager, this.physicsWorld);
        this.chunks.set(key, chunk);
        this.scene.add(chunk.mesh);

        // --- 追加: チャンクロード時に WorldGenerator で Feature を生成 ---
        if (y === 0) { // 例として Y=0 のチャンクのみに限定
            this.worldGenerator.generateFeaturesInChunk(x, y, z, this.CHUNK_SIZE);
        }
        // --- 追加 ここまで ---

        return chunk;
    }

    unloadChunk(x, y, z) {
        const key = this.getChunkKey(x, y, z);
        const chunk = this.chunks.get(key);

        if (chunk) {
            this.scene.remove(chunk.mesh);
            chunk.dispose();
            this.chunks.delete(key);
        }
    }

    update(playerPosition) {
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

                    // --- 修正: Y=0 のチャンクのみロード ---
                    if (cy === 0) {
                        chunksToLoad.add(this.getChunkKey(cx, cy, cz));
                        this.loadChunk(cx, cy, cz);
                    }
                    // --- 修正 ここまで ---
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

        // --- 追加: グリッド単位の Feature (例: City) を生成 ---
        this.worldGenerator.generateGridBasedFeatures(playerPosition);
        // --- 追加 ここまで ---
    }

    getWorldTerrainHeightAt(x, z) {
        // biomeManager を使用して高さを取得
        // これは、Chunk.js の Heightfield が機能しない場合のフォールバック
        return this.biomeManager.getBiomeAt(x, z).getHeight(x, z);
    }

    // --- 追加: WorldGenerator から呼び出される、Chunk にオブジェクトを追加するメソッド ---
    addTreeToChunk(cx, cy, cz, treeMesh) {
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            chunk.addObject(treeMesh);
        } else {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found when adding tree.`);
        }
    }
    // --- 追加 ここまで ---

    // 物理ワールドを更新するメソッド
    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}