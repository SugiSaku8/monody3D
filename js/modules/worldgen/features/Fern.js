// js/modules/worldgen/features/Fern.js
import * as THREE from 'three';

export class Fern {
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
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Fern generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        if (biome.classification !== 'Af') {
             return;
        }

        // シダの密度
        const numFerns = Math.floor(2 + Math.random() * 5); // 2~6個

        for (let i = 0; i < numFerns; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            const fernMesh = this.createFernMesh(terrainHeight);

            fernMesh.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            this.world.addGrassToChunk(cx, cy, cz, fernMesh); // Grass用のメソッドに一時的に追加
            // 将来的には、addPlantToChunk などの汎用メソッドか、専用メソッド
        }
    }

    createFernMesh(groundY) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.5 + Math.random() * 0.5; // 0.5~1m
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2;
        group.add(stem);

        // 葉 (羽状複葉を簡略化)
        const numLeaves = 3 + Math.floor(Math.random() * 3); // 3~5枚の羽
        for (let i = 0; i < numLeaves; i++) {
            const leafWidth = 0.3 + Math.random() * 0.2; // 0.3~0.5m
            const leafHeight = 0.1 + Math.random() * 0.1; // 0.1~0.2m
            const leafGeometry = new THREE.PlaneGeometry(leafWidth, leafHeight);
            const leafMaterial = new THREE.MeshStandardMaterial({
                color: 0x32CD32, // 明るい緑
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.position.y = stemHeight - (i * 0.15); // 茎に沿って配置
            leaf.position.x = leafWidth / 2 + 0.05; // 右側に
            leaf.rotation.z = Math.PI / 2 - (Math.random() * 0.5); // 少し垂れ下がり

            const leaf2 = leaf.clone(); // 左側に同じ葉を配置
            leaf2.position.x = -leafWidth / 2 - 0.05;
            leaf2.rotation.z = -Math.PI / 2 + (Math.random() * 0.5);

            group.add(leaf);
            group.add(leaf2);
        }

        return group;
    }
}