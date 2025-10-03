// js/modules/terrain/World.js
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
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

        // Set up lighting & sky
        this.setupLighting();

        // WorldGenerator を初期化
        this.worldGenerator = new WorldGenerator(this, this.biomeManager, this.physicsWorld);
    }

    setupLighting() {
        // --- 修正: Sky.js を使用してリアルな空を生成 ---
        const sky = new Sky();
        sky.scale.setScalar(450000); // 非常に大きなスケール
        this.scene.add(sky);

        const sun = new THREE.Vector3();
        const phi = THREE.MathUtils.degToRad(90 - 20); // 太陽の仰角 (例: 20度)
        const theta = THREE.MathUtils.degToRad(180); // 太陽の方位角 (例: 南)

        sun.setFromSphericalCoords(1, phi, theta);

        // Sky シェーダーの uniforms を設定
        sky.material.uniforms['sunPosition'].value.copy(sun);
        // --- 修正 ここまて ---

        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 1.0); // 強度を上げた
        this.scene.add(ambientLight);

        // Directional light (sun)
        const sunLightIntensity = 1.5;
        const sunLightColor = 0xffffff;
        // const sunLightPosition = sun.clone().multiplyScalar(10000); // Sky.js の太陽位置と一致

        const sunLight = new THREE.DirectionalLight(sunLightColor, sunLightIntensity);
        sunLight.position.copy(sun.clone().multiplyScalar(10000)); // Sky.js の太陽位置と一致
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 500;
        this.scene.add(sunLight);

        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.copy(sun.clone().multiplyScalar(10000)); // Sky.js の太陽位置と一致
        directionalLight.position.normalize().multiplyScalar(10); // シーン内の適当な位置に
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
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

        // biomeManager と physicsWorld を渡す
        const chunk = new Chunk(x, y, z, this.CHUNK_SIZE, this.biomeManager, this.physicsWorld);
        this.chunks.set(key, chunk);
        this.scene.add(chunk.mesh);

        if (y === 0) {
            this.worldGenerator.generateFeaturesInChunk(x, y, z, this.CHUNK_SIZE);
        }

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

                    // Y=0 のチャンクのみロード
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

        // グリッド単位の Feature (例: City) を生成
        this.worldGenerator.generateGridBasedFeatures(playerPosition);
    }

    getWorldTerrainHeightAt(x, z) {
        // biomeManager を使用して高さを取得
        // これは、Chunk.js の Heightfield が機能しない場合のフォールバック
        // または、Player.js のような場所で、直接高さを取得したい場合に使用
        const result = this.biomeManager.getBiomeAndHeightAt(x, 0, z); // Y=0での高さを基準
        return result.height;
    }

    // --- 追加: addObjectToChunk メソッド (汎用) ---
    /**
     * 指定されたチャンクにオブジェクトを追加します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @param {THREE.Object3D} object - 追加する Three.js オブジェクト
     */
    addObjectToChunk(cx, cy, cz, object) {
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            chunk.addObject(object);
        } else {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found when adding object.`);
        }
    }
    // --- 追加 ここまて ---

    // --- 追加: addGrassToChunk メソッド (Grass.js 用) ---
    /**
     * 指定されたチャンクに草を追加します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @param {THREE.Object3D} grassInstancedMesh - 草の InstancedMesh
     */
    addGrassToChunk(cx, cy, cz, grassInstancedMesh) {
        this.addObjectToChunk(cx, cy, cz, grassInstancedMesh);
    }
    // --- 追加 ここまて ---

    // --- 追加: addTreeToChunk メソッド (Tree.js 用) ---
    /**
     * 指定されたチャンクに木を追加します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @param {THREE.Object3D} treeMesh - 木の Three.js メッシュ
     */
    addTreeToChunk(cx, cy, cz, treeMesh) {
        this.addObjectToChunk(cx, cy, cz, treeMesh);
    }
    // --- 追加 ここまて ---

    // 物理ワールドを更新するメソッド
    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}