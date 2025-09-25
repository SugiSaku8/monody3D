// js/modules/worldgen/features/Shipwreck.js

export class Shipwreck {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return;

        const biome = this.biomeManager.getBiomeAt(cx * chunkSize, cz * chunkSize);
        if (biome.name === 'Ocean' && Math.random() < (1 / 32)) {
            // 難破船のメッシュを生成・配置
        }
    }
}