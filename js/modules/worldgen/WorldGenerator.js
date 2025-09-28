// js/modules/worldgen/WorldGenerator.js

// 必要なFeatureをインポート
import { Tree } from './features/Tree.js';
import { City } from './features/City.js';
import { Grass } from './features/Grass.js';
// --- 追加: 新しいジャングル特有の Feature をインポート ---
import { JungleTree } from './features/JungleTree.js';
import { Vine } from './features/Vine.js';
import { Fern } from './features/Fern.js';
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
        // --- 追加 ここまで ---
    }

    // チャンク単位で生成される Feature (例: Tree, JungleTree, Grass など)
    generateFeaturesInChunk(chunkX, chunkY, chunkZ, chunkSize) {
        // 既存の Feature はチャンク単位で生成
        // this.treeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.grassFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);

        // --- 追加: 新しいジャングル特有の Feature をチャンク単位で生成 ---
        // JungleTree, Vine, Fern は、自身の generateInChunk 内で
        // バイオームをチェックして、Af (熱帯雨林) でのみ生成されるように設計されています。
        this.jungleTreeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.vineFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        this.fernFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);
        // --- 追加 ここまで ---

        // City はグリッド単位で生成するため、このタイミングでは呼び出さない
        // 代わりに、プレイヤーの位置に応じて定期的にチェックするメソッドを用意
    }

    // グリッド単位で生成される Feature (例: City)
    generateGridBasedFeatures(playerPosition) {
        // City は 32 チャンク (32 * 32 = 1024 ワールド単位) 毎に生成
        this.cityFeature.generateAtWorldPosition(playerPosition.x, playerPosition.z);
    }
}