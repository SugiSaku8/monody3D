// js/modules/worldgen/features/DeciduousTree.js
import * as THREE from 'three';

export class DeciduousTree {
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
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for DeciduousTree generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        // バイオームが西岸海洋性 (Cfb) または温帯 (C*) でのみ生成
        if (!biome.classification.startsWith('C')) {
             return;
        }

        // Cfb/Cfa などでは密度を中程度にする
        const numTrees = Math.floor(1 + Math.random() * 2); // 2~4本

        for (let i = 0; i < numTrees; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            const treeMesh = this.createDeciduousTreeMesh(terrainHeight);

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

    createDeciduousTreeMesh(groundY) {
        const group = new THREE.Group();

        // 胴体
        const trunkHeight = 3 + Math.random() * 4; // 6~10m
        const trunkRadiusTop = 0.3 + Math.random() * 0.2; // 0.3~0.5m
        const trunkRadiusBottom = trunkRadiusTop + 0.1 + Math.random() * 0.1; // 下部は太い

        const trunkGeometry = new THREE.CylinderGeometry(
            trunkRadiusTop,
            trunkRadiusBottom,
            trunkHeight,
            8
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

        // 葉 (球体のクラスター)
        const numLeafBalls = 3 + Math.floor(Math.random() * 3); // 3~5個の葉の塊
        for (let i = 0; i < numLeafBalls; i++) {
            const leafBallRadius = 1.5 + Math.random() * 1; // 1.5~2.5m
            const leafBallGeometry = new THREE.SphereGeometry(leafBallRadius, 5, 5);
            // Autumn-ish colors
            const leafBallMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.7, 0.4 + Math.random() * 0.2),
                roughness: 0.8,
                metalness: 0.0
            });
            const leafBall = new THREE.Mesh(leafBallGeometry, leafBallMaterial);

            // 葉の塊の位置 (幹の上部周囲)
            const angle = Math.random() * Math.PI * 2;
            const distance = 0.5 + Math.random() * 1.5; // 0.5~2m 離れた場所
            const heightOffset = 2 + Math.random() * 2; // 2~4m 高い位置

            leafBall.position.x = Math.cos(angle) * distance;
            leafBall.position.z = Math.sin(angle) * distance;
            leafBall.position.y = trunkHeight - heightOffset + groundY;

            // 少しランダムに回転
            leafBall.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            leafBall.castShadow = true;
            leafBall.receiveShadow = true;
            group.add(leafBall);
        }

        return group;
    }

    // --- 追加: WorldGenerator から直接呼び出される createMesh メソッド ---
    createMesh(groundY) {
        return this.createDeciduousTreeMesh(groundY);
    }
    // --- 追加 ここまて ---
}