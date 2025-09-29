// js/modules/worldgen/WorldGenerator.js

// 必要なFeatureをインポート
import { Tree } from './features/Tree.js';
import { City } from './features/City.js';
import { Grass } from './features/Grass.js';
// --- 追加: 新しい Feature をインポート ---
import { JungleTree } from './features/JungleTree.js';
import { Vine } from './features/Vine.js';
import { Fern } from './features/Fern.js';
import { Cactus } from './features/Cactus.js';
import { DeciduousTree } from './features/DeciduousTree.js';
import { ConiferTree } from './features/ConiferTree.js';
// --- 追加 ここまで ---

export class WorldGenerator {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // Featureのインスタンスを生成 (パラメータを渡す)
        this.treeFeature = new Tree(this.world, this.biomeManager, this.physicsWorld);
        this.cityFeature = new City(this.world, this.biomeManager, this.physicsWorld);
        this.grassFeature = new Grass(this.world, this.biomeManager, this.physicsWorld);
        // --- 追加: 新しい Feature のインスタンスを生成 ---
        this.jungleTreeFeature = new JungleTree(this.world, this.biomeManager, this.physicsWorld);
        this.vineFeature = new Vine(this.world, this.biomeManager, this.physicsWorld);
        this.fernFeature = new Fern(this.world, this.biomeManager, this.physicsWorld);
        this.cactusFeature = new Cactus(this.world, this.biomeManager, this.physicsWorld);
        this.deciduousTreeFeature = new DeciduousTree(this.world, this.biomeManager, this.physicsWorld);
        this.coniferTreeFeature = new ConiferTree(this.world, this.biomeManager, this.physicsWorld);
        // ... (他のFeatureも同様にインスタンス化)
        // --- 追加 ここまて ---
    }

    // チャンク単位で生成される Feature
    generateFeaturesInChunk(chunkX, chunkY, chunkZ, chunkSize) {
        // 既存の Feature はチャンク単位で生成
        // this.treeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.grassFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);

        // --- 追加: 新しい Feature をチャンク単位で生成 ---
        // JungleTree, Vine, Fern は、自身の generateInChunk 内で
        // バイオームをチェックして、Af (熱帯雨林) でのみ生成されるように設計されています。
        this.jungleTreeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.vineFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.fernFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.cactusFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.deciduousTreeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.coniferTreeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        // ... (他のFeatureも生成)
        // --- 追加 ここまて ---

        // City はグリッド単位で生成するため、このタイミングでは呼び出さない
        // 代わりに、プレイヤーの位置に応じて定期的にチェックするメソッドを用意
    }

    // グリッド単位で生成される Feature (例: City)
    generateGridBasedFeatures(playerPosition) {
        // City は 32 チャンク (32 * 32 = 1024 ワールド単位) 毎に生成
        this.cityFeature.generateAtWorldPosition(playerPosition.x, playerPosition.z);
    }

    // --- 追加: バイオーム定義に基づいたオブジェクトをチャンクに生成する汎用メソッド ---
    /**
     * 指定されたチャンクに、そのバイオームで定義されたオブジェクトを生成します。
     * @param {number} chunkX - チャンクX座標
     * @param {number} chunkY - チャンクY座標 (通常 0)
     * @param {number} chunkZ - チャンクZ座標
     * @param {number} chunkSize - チャンクのサイズ
     */
    generateBiomeSpecificObjectsInChunk(chunkX, chunkY, chunkZ, chunkSize) {
        if (chunkY !== 0) return; // 通常、オブジェクトは Y=0 (地面) のチャンクにのみ生成

        const worldCenterX = chunkX * chunkSize + chunkSize / 2;
        const worldCenterZ = chunkZ * chunkSize + chunkSize / 2;

        // 1. チャンクの中心座標からバイオームを取得
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ); // Y=0でのバイオーム

        // 2. バイオームからオブジェクト定義を取得
        const objectDefinitions = biome.getObjects(); // [{ type: '...', density: ..., properties: {...} }, ...]

        // 3. 定義に従ってオブジェクトを生成
        for (const objDef of objectDefinitions) {
            const count = Math.floor(objDef.density * chunkSize * chunkSize);
            for (let i = 0; i < count; i++) {
                // チャンク内のランダムなローカル座標
                const localX = Math.random() * chunkSize;
                const localZ = Math.random() * chunkSize;
                const worldX = chunkX * chunkSize + localX;
                const worldZ = chunkZ * chunkSize + localZ;

                // 地形の高さを取得して、オブジェクトのY座標を決定
                const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

                let objectMesh = null;

                // 4. オブジェクトの種類に応じて、対応する Feature クラスのメソッドを呼び出す
                //    (ここでは、各 Feature に `createMesh` のような静的メソッドがあると仮定)
                switch(objDef.type) {
                    case 'jungle_tree':
                        objectMesh = this.jungleTreeFeature.createMesh(terrainHeight);
                        break;
                    case 'vine':
                        objectMesh = this.vineFeature.createMesh(terrainHeight);
                        break;
                    case 'fern':
                        objectMesh = this.fernFeature.createFernMesh(terrainHeight);
                        break;
                    case 'cactus':
                        objectMesh = this.cactusFeature.createMesh(terrainHeight);
                        break;
                    case 'deciduous_tree':
                        objectMesh = this.deciduousTreeFeature.createMesh(terrainHeight);
                        break;
                    case 'conifer_tree':
                        objectMesh = this.coniferTreeFeature.createMesh(terrainHeight);
                        break;
                    // ... (他のオブジェクトタイプも同様に処理)
                    default:
                        console.warn(`Unknown object type: ${objDef.type}`);
                        continue; // 次のオブジェクト定義へ
                }

                if (objectMesh) {
                    // --- 修正: ローカル座標系での X, Z 位置のみ設定 ---
                    // Y 座標は createMesh 内で terrainHeight を基準に設定済み ---
                    objectMesh.position.set(
                        localX - chunkSize / 2, // チャンクのローカルX座標
                        0, // <-- Y座標は 0 に設定 (createMesh で group.position.y が設定済み)
                        localZ - chunkSize / 2  // チャンクのローカルZ座標
                    );
                    objectMesh.castShadow = true;
                    objectMesh.receiveShadow = true;
    
                    this.world.addTreeToChunk(chunkX, chunkY, chunkZ, objectMesh);
                }
            }
        }
    }
    // --- 追加 ここまて ---
}