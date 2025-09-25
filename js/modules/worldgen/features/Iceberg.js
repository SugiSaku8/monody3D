// js/modules/worldgen/features/Iceberg.js
import * as THREE from 'three';

export class Iceberg {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0 || cx % 8 !== 0 || cz % 8 !== 0) return;

        const biome = this.biomeManager.getBiomeAt(cx * chunkSize, cz * chunkSize);
        if (biome.name === 'Ocean' && biome.temperature <= 5) { // 温度プロパティをBiomeに追加想定
            // 氷山のジオメトリとマテリアルを定義 (例: 複数の球や円柱を組み合わせたGroup)
            const icebergGroup = new THREE.Group();

            // 単純な例: 大きな球
            const icebergGeometry = new THREE.SphereGeometry(2 + Math.random() * 3, 16, 16); // サイズにランダム性
            const icebergMaterial = new THREE.MeshStandardMaterial({ color: 0xddffff, transparent: true, opacity: 0.9 });
            const icebergMesh = new THREE.Mesh(icebergGeometry, icebergMaterial);
            // 高さは海面（例: Y=0）に合わせるか、少し沈める
            icebergMesh.position.y = 0; // 海面に合わせる

            icebergGroup.add(icebergMesh);

            // チャンクに追加 (Chunk インスタンスが必要)
            // this.chunk.addObject(icebergGroup);
        }
    }
}