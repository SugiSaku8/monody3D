// js/modules/worldgen/features/City.js
import * as THREE from 'three';

export class City {
    constructor(world, physicsWorld) {
        this.world = world;
        this.physicsWorld = physicsWorld;
    }

    generateAtWorldPosition(worldX, worldZ) {
        const cityChunkX = Math.floor(worldX / (32 * 32));
        const cityChunkZ = Math.floor(worldZ / (32 * 32));

        // cityChunkX, cityChunkZ が決まれば、その市の中心座標が計算可能
        const centerX = cityChunkX * 32 * 32 + (32 * 32) / 2;
        const centerZ = cityChunkZ * 32 * 32 + (32 * 32) / 2;

        // 市のレイアウトを生成 (例: グリッド状の道路 + 建物)
        // 建物の数、高さ、形状をランダムに決定
    }
}