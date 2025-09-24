// js/modules/terrain/World.js
import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';

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

        // Y=0 の静的平面は削除 (Player.js のロジックで代用)
        // this.addStaticGround(); // この行は削除またはコメントアウト
    }

    // ... (他のメソッドは変更なし) ...

    // --- 追加: ワールド座標から直接地形の高さを取得 ---
    getWorldTerrainHeightAt(x, z) {
        // biomeManager を使用して高さを取得
        // これは、Chunk.js の Heightfield が機能しない場合のフォールバック
        return this.biomeManager.getBiomeAt(x, z).getHeight(x, z);
    }
    // --- 追加 ここまで ---

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
    }

    // --- 修正: 古い getTerrainHeightAt を削除またはコメントアウト ---
    // getTerrainHeightAt(x, z) {
    //     const biome = this.biomeManager.getBiomeAt(x, z);
    //     return biome.getHeight(x, z);
    // }
    // --- 修正 ここまで ---

    // 物理ワールドを更新するメソッド
    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}