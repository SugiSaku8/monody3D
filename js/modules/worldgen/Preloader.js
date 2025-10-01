// js/modules/worldgen/Preloader.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
import { WorldGenerator } from '../worldgen/WorldGenerator.js';

export class Preloader {
    constructor(biomeManager, worldGenerator) {
        this.biomeManager = biomeManager;
        this.worldGenerator = worldGenerator;
        this.preloadedChunks = new Map();
        this.biomeMap = new Map();
        this.PRELOAD_RADIUS_CHUNKS = 32;
        this.PLAYER_START_X = 0;
        this.PLAYER_START_Z = 0;
        this.CHUNK_SIZE = 32;
    }

    /**
     * プリロード処理を開始します。
     * @param {Function} onProgress - 進行状況を報告するコールバック関数 (引数: progress (0.0 ~ 1.0))
     * @returns {Promise<void>} プリロードが完了する Promise
     */
    // --- 修正: onProgress コールバックを引数に追加 ---
    async preload(onProgress = () => {}) {
    // --- 修正 ここまて ---
        console.log("Starting preloading process...");
        const startTime = performance.now();

        // 1. バイオームマップを事前生成 (10‰)
        this.generateBiomeMap();
        onProgress(0.010); // 10‰ 完了
        console.log("Biome map generated. Progress: 10‰");

        // 2. プリロード対象のチャンクを特定し、事前生成
        const totalChunks = (this.PRELOAD_RADIUS_CHUNKS * 2 + 1) ** 2; // 総チャンク数 (Y=0に限定)
        let processedChunks = 0;
        const preloadPromises = [];

        for (let dx = -this.PRELOAD_RADIUS_CHUNKS; dx <= this.PRELOAD_RADIUS_CHUNKS; dx++) {
            for (let dz = -this.PRELOAD_RADIUS_CHUNKS; dz <= this.PRELOAD_RADIUS_CHUNKS; dz++) {
                const cx = this.PLAYER_START_X / this.CHUNK_SIZE + dx;
                const cz = this.PLAYER_START_Z / this.CHUNK_SIZE + dz;
                const key = `${cx},0,${cz}`;

                const worldCenterX = cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
                const worldCenterZ = cz * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;

                const biomeResult = this.biomeManager.getBiomeAndHeightAt(worldCenterX, 0, worldCenterZ);
                const biome = biomeResult.biome;

                // プリロード対象のバイオームかチェック (Af, Cfb など)
                if (biome.classification === 'Af' || biome.classification === 'Cfb') {
                    // 非同期でチャンクデータを事前生成
                    const promise = this.preloadChunk(cx, 0, cz).then(() => {
                        processedChunks++;
                        // --- 修正: 進捗を‰で計算 ---
                        const progressPermillage = 10 + (processedChunks / totalChunks) * 890; // 10‰ ~ 900‰
                        // --- 修正 ここまて ---
                        onProgress(progressPermillage / 1000.0); // 0.0 ~ 1.0 に変換してコールバック
                        // --- 修正: 進捗を‰でログ出力 ---
                        console.log(`Chunk (${cx}, 0, ${cz}) preloaded. Progress: ${Math.round(progressPermillage)}‰`);
                        // --- 修正 ここまて ---
                    }).catch(err => {
                        console.error(`Failed to preload chunk (${cx}, 0, ${cz}):`, err);
                        processedChunks++;
                        const progressPermillage = 10 + (processedChunks / totalChunks) * 890; // 10‰ ~ 900‰
                        onProgress(progressPermillage / 1000.0); // 0.0 ~ 1.0 に変換してコールバック
                        console.log(`Chunk (${cx}, 0, ${cz}) failed. Progress: ${Math.round(progressPermillage)}‰`);
                    });
                    preloadPromises.push(promise);
                }
            }
        }

        // すべてのプリロードタスクが完了するのを待つ
        await Promise.all(preloadPromises);

        // --- 修正: 進捗を 900‰ に更新 ---
        onProgress(0.900); // 900‰ 完了
        console.log("All chunks preloaded. Progress: 900‰");
        // --- 修正 ここまて ---

        // 3. その他の初期化処理 (例: キャッシュの最適化など) (900‰ ~ 1000‰)
        // ... (ここにその他の処理を記述) ...
        await new Promise(resolve => setTimeout(resolve, 100)); // 仮の処理時間
        onProgress(1.0); // 1000‰ 完了
        console.log("Finalizing preloading. Progress: 1000‰");

        const endTime = performance.now();
        console.log(`Preloading finished in ${(endTime - startTime).toFixed(2)} ms`);
        console.log(`Preloaded ${this.preloadedChunks.size} chunks.`);
    }
    // --- 修正 ここまて ---

    /**
     * 広範囲のバイオームマップを事前生成します。
     */
    generateBiomeMap() {
        console.log("Generating biome map...");
        const mapStartTime = performance.now();
        const radius = this.PRELOAD_RADIUS_CHUNKS;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = this.PLAYER_START_X / this.CHUNK_SIZE + dx;
                const cz = this.PLAYER_START_Z / this.CHUNK_SIZE + dz;
                const key = `${cx},${cz}`;

                const worldCenterX = cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
                const worldCenterZ = cz * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;

                const biomeResult = this.biomeManager.getBiomeAndHeightAt(worldCenterX, 0, worldCenterZ);
                const biome = biomeResult.biome;

                this.biomeMap.set(key, biomeResult);
            }
        }
        const mapEndTime = performance.now();
        console.log(`Biome map generated in ${(mapEndTime - mapStartTime).toFixed(2)} ms`);
    }

    /**
     * 指定されたチャンクのデータを事前生成し、キャッシュします。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標 (通常 0)
     * @param {number} cz - チャンクZ座標
     * @returns {Promise<void>}
     */
    async preloadChunk(cx, cy, cz) {
        const key = `${cx},${cy},${cz}`;
        if (this.preloadedChunks.has(key)) {
            // 既にプリロード済み
            return;
        }

        console.log(`Preloading chunk (${cx}, ${cy}, ${cz})...`);

        // 1. チャンクの高さデータを事前計算
        const CHUNK_SIZE = this.CHUNK_SIZE;
        const segments = 32;
        const segmentSize = CHUNK_SIZE / segments;
        const heights = [];

        for (let z_seg = 0; z_seg <= segments; z_seg++) {
            heights[z_seg] = [];
            for (let x_seg = 0; x_seg <= segments; x_seg++) {
                const worldX = cx * CHUNK_SIZE + x_seg * segmentSize;
                const worldZ = cz * CHUNK_SIZE + z_seg * segmentSize;
                const heightResult = this.biomeManager.getBiomeAndHeightAt(worldX, 0, worldZ);
                heights[z_seg][x_seg] = heightResult.height;
            }
        }

        // 2. バイオームを取得
        const biomeResult = this.biomeManager.getBiomeAndHeightAt(cx * CHUNK_SIZE + CHUNK_SIZE / 2, 0, cz * CHUNK_SIZE + CHUNK_SIZE / 2);
        const biome = biomeResult.biome;

        // 3. チャンクメッシュデータを生成 (ジオメトリ、マテリアル)
        const { geometry, material } = this.createChunkMeshData(cx, cy, cz, CHUNK_SIZE, biome, heights);

        // 4. Feature (木、草など) のインスタンスデータを生成
        const featureData = await this.generateFeatureDataForChunk(cx, cy, cz, CHUNK_SIZE, biome);

        // 5. 生成したデータをキャッシュに保存
        this.preloadedChunks.set(key, {
            geometry: geometry,
            material: material,
            featureData: featureData,
            biome: biome,
            heights: heights
        });

        console.log(`Chunk (${cx}, ${cy}, ${cz}) preloaded.`);
    }

    /**
     * チャンクのメッシュデータ (ジオメトリ、マテリアル) を生成します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @param {number} chunkSize - チャンクサイズ
     * @param {Biome} biome - チャンクのバイオーム
     * @param {Array<Array<number>>} heights - 高さデータ配列
     * @returns {{geometry: THREE.BufferGeometry, material: THREE.Material}}
     */
    createChunkMeshData(cx, cy, cz, chunkSize, biome, heights) {
        const geometry = new THREE.BufferGeometry();

        const material = biome.getMaterial(cx * chunkSize, cz * chunkSize) || new THREE.MeshStandardMaterial({ color: 0x00aa00 });

        const segments = 32;
        const halfSize = chunkSize / 2;
        const segmentSize = chunkSize / segments;

        const vertices = [];
        const indices = [];
        const uvs = [];

        // Generate terrain height using Perlin noise (for visual mesh)
        for (let z = 0; z <= segments; z++) {
            for (let x = 0; x <= segments; x++) {
                const height = heights[z][x];

                // Add vertex
                vertices.push(
                    x * segmentSize - halfSize,
                    height,
                    z * segmentSize - halfSize
                );

                // Add UVs
                uvs.push(x / segments, 1 - z / segments);
            }
        }

        // Create faces
        for (let z = 0; z < segments; z++) {
            for (let x = 0; x < segments; x++) {
                const a = x + (segments + 1) * z;
                const b = x + (segments + 1) * (z + 1);
                const c = x + 1 + (segments + 1) * (z + 1);
                const d = x + 1 + (segments + 1) * z;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        // Set geometry attributes
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        // Compute normals for lighting
        geometry.computeVertexNormals();

        return { geometry, material };
    }

    /**
     * チャンクの Feature (木、草など) データを生成します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @param {number} chunkSize - チャンクサイズ
     * @param {Biome} biome - チャンクのバイオーム
     * @returns {Promise<Object>} Featureデータ (例: { trees: [...], grass: [...] })
     */
    async generateFeatureDataForChunk(cx, cy, cz, chunkSize, biome) {
        // Feature クラスの generateInChunk メソッドを呼び出す
        // ここでは、WorldGenerator が Feature を管理していると仮定
        // 実際には、Feature クラスに "getData" モードを追加するか、
        // WorldGenerator に Feature データを生成するメソッドを追加する必要がある
        // 例: this.worldGenerator.generateFeatureDataForChunk(cx, cy, cz, chunkSize, biome);
        // 今回は、空のオブジェクトを返す
        return { trees: [], grass: [] };
    }

    /**
     * 指定されたチャンクのプリロードデータを取得します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @returns {Object|null} プリロードされたチャンクデータ、または null
     */
    getPreloadedChunkData(cx, cy, cz) {
        const key = `${cx},${cy},${cz}`;
        return this.preloadedChunks.get(key) || null;
    }

    /**
     * 事前生成されたバイオーム情報を取得します。
     * @param {number} cx - チャンクX座標
     * @param {number} cz - チャンクZ座標
     * @returns {Object|null} バイオームと高さ情報、または null
     */
    getPrecomputedBiomeInfo(cx, cz) {
        const key = `${cx},${cz}`;
        return this.biomeMap.get(key) || null;
    }
}