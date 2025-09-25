// js/modules/worldgen/features/CoralReef.js
import * as THREE from 'three';

export class CoralReef {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return;

        const biome = this.biomeManager.getBiomeAt(cx * chunkSize, cz * chunkSize);
        if (biome.name === 'Ocean' && biome.temperature >= 20) { // 温度プロパティをBiomeに追加想定
            // ランダムな位置に珊瑚オブジェクトを配置
            const numCorals = Math.floor(Math.random() * 10) + 5;
            for (let i = 0; i < numCorals; i++) {
                const localX = Math.random() * chunkSize;
                const localZ = Math.random() * chunkSize;
                // 高さは海底の高さに合わせる必要あり (getTerrainHeightAtで水位を考慮)
                const worldX = cx * chunkSize + localX;
                const worldZ = cz * chunkSize + localZ;
                const terrainHeight = this.world.getTerrainHeightAt(worldX, worldZ); // これは陸地の高さ、水位を別途考慮

                // 珊瑚のジオメトリとマテリアルを定義 (例: 球、トーラス、複雑な形状)
                const coralGeometry = new THREE.SphereGeometry(0.5, 8, 8);
                const coralMaterial = new THREE.MeshStandardMaterial({ color: 0xff6600 });
                const coralMesh = new THREE.Mesh(coralGeometry, coralMaterial);
                coralMesh.position.set(localX - chunkSize / 2, terrainHeight + 0.5, localZ - chunkSize / 2);

                // チャンクに追加
                // this.chunk.addObject(coralMesh); // Chunk インスタンスが必要
            }
        }
    }
}