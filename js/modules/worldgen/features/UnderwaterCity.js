// js/modules/worldgen/features/UnderwaterCity.js

export class UnderwaterCity {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return;

        const biome = this.biomeManager.getBiomeAt(cx * chunkSize, cz * chunkSize);
        if (biome.name === 'Ocean' && Math.random() < (1 / 64)) {
            // 海底都市の構造物を生成
        }
    }
}