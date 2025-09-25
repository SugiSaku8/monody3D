// js/modules/worldgen/WorldGenerator.js

// 必要なFeatureをインポート
import { Tree } from './features/Tree.js';
import { City } from './features/City.js';
// 今後、他のFeatureもインポート

export class WorldGenerator {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // Featureのインスタンスを生成 (パラメータを渡す)
        this.treeFeature = new Tree(this.world, this.biomeManager, this.physicsWorld);
        this.cityFeature = new City(this.world, this.biomeManager, this.physicsWorld);
        // 今後、他のFeatureのインスタンスも追加
    }

    // チャンクがロードされたときに呼び出す
    generateFeaturesInChunk(chunkX, chunkY, chunkZ, chunkSize) {
        // Tree はチャンク単位で生成
        this.treeFeature.generateInChunk(chunkX, chunkY, chunkZ, chunkSize);

        // City はグリッド単位で生成するため、このタイミングでは呼び出さない
        // 代わりに、プレイヤーの位置に応じて定期的にチェックするメソッドを用意
    }

    // プレイヤーの位置に応じて、グリッド単位のFeatureを生成 (例: City)
    generateGridBasedFeatures(playerPosition) {
        // City は 32 チャンク (32 * 32 = 1024 ワールド単位) 毎に生成
        this.cityFeature.generateAtWorldPosition(playerPosition.x, playerPosition.z);
    }
}