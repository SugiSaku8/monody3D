// js/modules/worldgen/WorldGenerator.js

// 必要なFeatureをインポート
import { Tree } from './features/Tree.js';
import { City } from './features/City.js';
// --- 追加: Grass をインポート ---
import { Grass } from './features/Grass.js';
// --- 追加 ここまで ---

export class WorldGenerator {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // Featureのインスタンスを生成 (パラメータを渡す)
        this.treeFeature = new Tree(this.world, this.biomeManager, this.physicsWorld);
        this.cityFeature = new City(this.world, this.biomeManager, this.physicsWorld);
        // --- 追加: GrassFeature のインスタンスを生成 ---
        this.grassFeature = new Grass(this.world, this.biomeManager, this.physicsWorld);
        // --- 追加 ここまで ---
    }

    generateFeaturesInChunk(chunkX, chunkY, chunkZ, chunkSize) {
        // Tree はチャンク単位で生成
        this.treeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);

        // --- 追加: Grass もチャンク単位で生成 ---
        this.grassFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        // --- 追加 ここまで ---

        // City はグリッド単位で生成するため、このタイミングでは呼び出さない
        // 代わりに、プレイヤーの位置に応じて定期的にチェックするメソッドを用意
    }

    generateGridBasedFeatures(playerPosition) {
        // City は 32 チャンク (32 * 32 = 1024 ワールド単位) 毎に生成
        this.cityFeature.generateAtWorldPosition(playerPosition.x, playerPosition.z);
    }
}