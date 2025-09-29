// js/modules/worldgen/Preloader.js
import * as THREE from 'three';
// --- 追加: Biome.js をインポートして、getMaterial メソッドを使用 ---
import { Biome } from '../biomes/Biome.js'; // 必要に応じて、具体的なバイオームクラスもインポート
// --- 追加 ここまで ---

export class Preloader {
    constructor(biomeManager, worldGenerator) {
        this.biomeManager = biomeManager;
        this.worldGenerator = worldGenerator;
        this.preloadedChunks = new Map(); // プリロードされたチャンクデータをキャッシュ
        this.biomeMap = new Map(); // 事前生成されたバイオームマップ
        this.PRELOAD_RADIUS_CHUNKS = 32; // 32チャンク = 1024ワールド単位 (例)
        this.PLAYER_START_X = 0; // プレイヤーの初期X座標
        this.PLAYER_START_Z = 0; // プレイヤーの初期Z座標
        this.CHUNK_SIZE = 32; // チャンクサイズ
    }

    /**
     * プリロード処理を開始します。
     * @returns {Promise<void>} プリロードが完了する Promise
     */
    async preload() {
        console.log("Starting preloading process...");
        const startTime = performance.now();

        // 1. バイオームマップを事前生成
        this.generateBiomeMap();

        // 2. プリロード対象のチャンクを特定し、事前生成
        const preloadPromises = [];
        for (let dx = -this.PRELOAD_RADIUS_CHUNKS; dx <= this.PRELOAD_RADIUS_CHUNKS; dx++) {
            for (let dz = -this.PRELOAD_RADIUS_CHUNKS; dz <= this.PRELOAD_RADIUS_CHUNKS; dz++) {
                const cx = Math.floor(this.PLAYER_START_X / this.CHUNK_SIZE) + dx;
                const cz = Math.floor(this.PLAYER_START_Z / this.CHUNK_SIZE) + dz;
                const key = `${cx},0,${cz}`; // Y=0 に限定

                // チャンクの中心座標
                const worldCenterX = cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
                const worldCenterZ = cz * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;

                // バイオームを取得 (事前生成されたマップから)
                const biomeResult = this.biomeManager.getBiomeAndHeightAt(worldCenterX, 0, worldCenterZ);
                const biome = biomeResult.biome;

                // プリロード対象のバイオームかチェック (Af, Cfb など)
                if (biome.classification === 'Af' || biome.classification === 'Cfb') {
                    // 非同期でチャンクデータを事前生成
                    // --- 修正: チャンクの高さデータも渡す ---
                    const heights = this.calculateHeightsForChunk(cx, cz);
                    // --- 修正 ここまて ---
                    const promise = this.preloadChunk(cx, 0, cz, heights).catch(err => {
                        console.error(`Failed to preload chunk (${cx}, 0, ${cz}):`, err);
                    });
                    preloadPromises.push(promise);
                }
            }
        }

        // すべてのプリロードタスクが完了するのを待つ
        await Promise.all(preloadPromises);

        const endTime = performance.now();
        console.log(`Preloading finished in ${(endTime - startTime).toFixed(2)} ms`);
        console.log(`Preloaded ${this.preloadedChunks.size} chunks.`);
    }

    // --- 追加: チャンクの高さデータを計算するメソッド ---
    calculateHeightsForChunk(cx, cz) {
        const CHUNK_SIZE = this.CHUNK_SIZE;
        const segments = 32;
        const segmentSize = CHUNK_SIZE / segments;
        const heights = [];

        for (let z_seg = 0; z_seg <= segments; z_seg++) {
            heights[z_seg] = [];
            for (let x_seg = 0; x_seg <= segments; x_seg++) {
                const worldX = cx * CHUNK_SIZE + x_seg * segmentSize;
                const worldZ = cz * CHUNK_SIZE + z_seg * segmentSize;
                const heightResult = this.biomeManager.getBiomeAndHeightAt(worldX, 0, worldZ); // Y=0での高さ
                heights[z_seg][x_seg] = heightResult.height;
            }
        }
        return heights;
    }
    // --- 追加 ここまて ---

    /**
     * 広範囲のバイオームマップを事前生成します。
     */
    generateBiomeMap() {
        console.log("Generating biome map...");
        const mapStartTime = performance.now();
        const radius = this.PRELOAD_RADIUS_CHUNKS;
        for (let dx = -radius; dx <= radius; dx++) {
            for (let dz = -radius; dz <= radius; dz++) {
                const cx = Math.floor(this.PLAYER_START_X / this.CHUNK_SIZE) + dx;
                const cz = Math.floor(this.PLAYER_START_Z / this.CHUNK_SIZE) + dz;
                const worldCenterX = cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;
                const worldCenterZ = cz * this.CHUNK_SIZE + this.CHUNK_SIZE / 2;

                // BiomeManager からバイオーム情報を取得 (高さも含む)
                const biomeResult = this.biomeManager.getBiomeAndHeightAt(worldCenterX, 0, worldCenterZ); // Y=0での高さ
                const key = `${cx},${cz}`;
                this.biomeMap.set(key, biomeResult); // biome と height を両方格納
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
     * @param {Array<Array<number>>} heights - チャンクの高さデータ
     * @returns {Promise<void>}
     */
    // --- 修正: heights パラメータを追加 ---
    async preloadChunk(cx, cy, cz, heights) {
    // --- 修正 ここまて ---
        const key = `${cx},${cy},${cz}`;
        if (this.preloadedChunks.has(key)) {
            // 既にプリロード済み
            return;
        }

        console.log(`Preloading chunk (${cx}, ${cy}, ${cz})...`);

        // 1. チャンクの高さデータは引数から取得 (calculateHeightsForChunk で事前計算済み)
        // const CHUNK_SIZE = this.CHUNK_SIZE;
        // const segments = 32;
        // const segmentSize = CHUNK_SIZE / segments;
        // const heights = [];
        // ... (以前の高さ計算ロジックは削除)

        // 2. バイオームを取得
        // const biomeResult = this.biomeManager.getBiomeAndHeightAt(cx * CHUNK_SIZE + CHUNK_SIZE / 2, 0, cz * CHUNK_SIZE + CHUNK_SIZE / 2); // Y=0での高さ
        // const biome = biomeResult.biome;
        const biomeResult = this.biomeMap.get(`${cx},${cz}`) || this.biomeManager.getBiomeAndHeightAt(cx * this.CHUNK_SIZE + this.CHUNK_SIZE / 2, 0, cz * this.CHUNK_SIZE + this.CHUNK_SIZE / 2);
        const biome = biomeResult.biome;

        // 3. チャンクメッシュデータを生成 (ジオメトリ、マテリアル)
        // --- 修正: createChunkMeshData メソッドを呼び出す ---
        const { geometry, material } = this.createChunkMeshData(cx, cy, cz, this.CHUNK_SIZE, biome, heights);
        // --- 修正 ここまて ---

        // 4. Feature (木、草など) のインスタンスデータを生成
        // --- 修正: generateFeatureDataForChunk メソッドを呼び出す ---
        const featureData = await this.generateFeatureDataForChunk(cx, cy, cz, this.CHUNK_SIZE, biome, heights);
        // --- 修正 ここまて ---

        // 5. 生成したデータをキャッシュに保存
        this.preloadedChunks.set(key, {
            geometry: geometry,
            material: material,
            featureData: featureData, // 木や草の InstancedMesh 用データ
            biome: biome,
            heights: heights // 高さデータも保存
        });

        console.log(`Chunk (${cx}, ${cy}, ${cz}) preloaded.`);
    }

    // --- 修正: createChunkMeshData メソッドの実装 ---
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

        // biome からマテリアルを取得
        const material = biome.getMaterial(cx * chunkSize, cz * chunkSize) || new THREE.MeshStandardMaterial({ color: 0x00aa00 });

        const segments = 32;
        const halfSize = chunkSize / 2;
        const segmentSize = chunkSize / segments;

        const vertices = [];
        const indices = [];
        const uvs = [];

        // 高さデータから頂点を生成
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
    // --- 修正 ここまて ---

    // --- 修正: generateFeatureDataForChunk メソッドの実装 ---
    /**
     * チャンクの Feature (木、草など) データを生成します。
     * @param {number} cx - チャンクX座標
     * @param {number} cy - チャンクY座標
     * @param {number} cz - チャンクZ座標
     * @param {number} chunkSize - チャンクサイズ
     * @param {Biome} biome - チャンクのバイオーム
     * @param {Array<Array<number>>} heights - 高さデータ配列
     * @returns {Promise<Object>} Featureデータ (例: { trees: [...], grass: [...] })
     */
    async generateFeatureDataForChunk(cx, cy, cz, chunkSize, biome, heights) {
        const featureData = {
            trees: [],
            grass: [],
            // ... (他のFeatureも追加可能)
        };

        // biome からオブジェクト定義を取得
        const objectDefinitions = biome.getObjects();

        // 各オブジェクト定義について処理
        for (const objDef of objectDefinitions) {
            const count = Math.floor(objDef.density * chunkSize * chunkSize);
            for (let i = 0; i < count; i++) {
                // チャンク内のランダムなローカル座標
                const localX = Math.random() * chunkSize;
                const localZ = Math.random() * chunkSize;
                const worldX = cx * chunkSize + localX;
                const worldZ = cz * chunkSize + localZ;

                // 高さデータから地形の高さを取得 (双一次補間なども可能だが、簡略化)
                const xIndex = Math.floor(localX / (chunkSize / 32));
                const zIndex = Math.floor(localZ / (chunkSize / 32));
                const terrainHeight = heights[zIndex][xIndex]; // 簡易取得

                // オブジェクトの種類に応じて、InstancedMesh 用のデータを生成
                // ここでは、WorldGenerator.js が Feature クラスを呼び出すロジックを模倣
                // 実際には、Feature クラスに "getData" メソッドを追加して、行列や色を返すようにするのが良い
                // ここでは簡略化のため、直接行列と色を計算

                let matrix = new THREE.Matrix4();
                let color = new THREE.Color();

                if (objDef.type === 'jungle_tree') {
                    // ジャングルの木の行列と色を計算
                    // 例: 位置を設定
                    matrix.setPosition(
                        localX - chunkSize / 2,
                        terrainHeight,
                        localZ - chunkSize / 2
                    );
                    // 例: 色を設定
                    color = objDef.properties?.color || new THREE.Color(0x228B22);
                    featureData.trees.push({ matrix, color });
                } else if (objDef.type === 'vine') {
                    // ツタの行列と色を計算
                    matrix.setPosition(
                        localX - chunkSize / 2,
                        terrainHeight,
                        localZ - chunkSize / 2
                    );
                    color = objDef.properties?.color || new THREE.Color(0x32CD32);
                    featureData.trees.push({ matrix, color }); // 例として trees に追加
                } else if (objDef.type === 'fern') {
                    // シダの行列と色を計算
                    matrix.setPosition(
                        localX - chunkSize / 2,
                        terrainHeight,
                        localZ - chunkSize / 2
                    );
                    color = objDef.properties?.color || new THREE.Color(0x2E8B57);
                    featureData.trees.push({ matrix, color }); // 例として trees に追加
                } else if (objDef.type === 'grass') {
                    // 草の行列と色を計算
                    matrix.setPosition(
                        localX - chunkSize / 2,
                        terrainHeight,
                        localZ - chunkSize / 2
                    );
                    color = objDef.properties?.color || new THREE.Color(0x7CFC00);
                    featureData.grass.push({ matrix, color });
                }
                // ... (他のオブジェクトタイプも同様に処理) ...
            }
        }

        return featureData;
    }
    // --- 修正 ここまて ---

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