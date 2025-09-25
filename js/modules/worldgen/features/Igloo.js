// js/modules/worldgen/features/Igloo.js

export class Igloo {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return;

        const biome = this.biomeManager.getBiomeAt(cx * chunkSize, cz * chunkSize);
        if ((biome.name === 'Tundra' || biome.name === 'Taiga') && cx % 8 === 0 && cz % 8 === 0) {
            const numIgloos = Math.floor(Math.random() * 2) + 1; // 1~2個
            for (let i = 0; i < numIgloos; i++) {
                // イグルーのメッシュを生成・配置
            }
        }
    }
}