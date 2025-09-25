// js/modules/worldgen/features/River.js

export class River {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateFromOcean(oceanStartX, oceanStartZ) {
        // 海の位置から勾配をたどるアルゴリズム
        // または、2Dノイズで川の中心線を生成
        // 1~64チャンク毎に生成するための判定を組み込む
    }
}