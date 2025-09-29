// js/modules/worldgen/features/ConiferTree.js
import * as THREE from 'three';

export class ConiferTree {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return;

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for ConiferTree generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        // バイオームが冷帯湿潤 (Dfb) またはツンドラ (ET) でのみ生成
        if (biome.classification !== 'Dfb' && biome.classification !== 'ET') {
             return;
        }

        // Dfb/ET では密度を中程度〜高めにする
        const numTrees = Math.floor(3 + Math.random() * 4); // 3~6本

        for (let i = 0; i < numTrees; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            const treeMesh = this.createConiferTreeMesh(terrainHeight);

            treeMesh.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );
            treeMesh.castShadow = true;
            treeMesh.receiveShadow = true;

            this.world.addTreeToChunk(cx, cy, cz, treeMesh);
        }
    }

    createConiferTreeMesh(groundY) {
        const group = new THREE.Group();

        // 胴体
        const trunkHeight = 8 + Math.random() * 5; // 8~13m
        const trunkRadiusTop = 0.2 + Math.random() * 0.1; // 0.2~0.3m
        const trunkRadiusBottom = trunkRadiusTop + 0.3 + Math.random() * 0.2; // 0.5~0.7m

        const trunkGeometry = new THREE.CylinderGeometry(
            trunkRadiusTop,
            trunkRadiusBottom,
            trunkHeight,
            6
        );
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // 茶色
            roughness: 0.9,
            metalness: 0.0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2 + groundY;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // 葉 (円錐形 - 複数の円錐を重ねて表現)
        const numLayers = 4 + Math.floor(Math.random() * 2); // 4~5層
        const baseRadius = 2 + Math.random() * 1.5; // 最下層の半径 2~3.5m
        const layerHeight = trunkHeight * 0.6 / numLayers; // 葉の層の高さ間隔

        for (let i = 0; i < numLayers; i++) {
            const layerY = trunkHeight * 0.4 + i * layerHeight + groundY; // 葉は幹の上部40%から始まる
            const currentRadius = baseRadius * (1.0 - i / (numLayers * 1.2)); // 上に行くほど細くなる

            const layerGeometry = new THREE.ConeGeometry(currentRadius, layerHeight * 2, 6); // 高さは少し伸ばす
            const layerMaterial = new THREE.MeshStandardMaterial({
                color: 0x228B22, // 濃い緑
                roughness: 0.8,
                metalness: 0.0
            });
            const layer = new THREE.Mesh(layerGeometry, layerMaterial);
            layer.position.y = layerY + layerHeight; // 円錐の中心を指定位置に
            layer.castShadow = true;
            layer.receiveShadow = true;
            group.add(layer);
        }

        return group;
    }

    // --- 追加: WorldGenerator から直接呼び出される createMesh メソッド ---
    createMesh(groundY) {
        return this.createConiferTreeMesh(groundY);
    }
    // --- 追加 ここまて ---
}