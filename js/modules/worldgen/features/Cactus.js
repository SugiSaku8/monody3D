// js/modules/worldgen/features/Cactus.js
import * as THREE from 'three';

export class Cactus {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return; // 地面(Y=0)のチャンクのみ

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Cactus generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        // バイオームが砂漠 (BWh) でのみ生成
        if (biome.classification !== 'BWh') {
             return;
        }

        // 砂漠ではサボテンの密度を中程度にする
        const numCacti = Math.floor(1 + Math.random() * 3); // 1~3本

        for (let i = 0; i < numCacti; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            const cactusMesh = this.createCactusMesh(terrainHeight);

            cactusMesh.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );
            cactusMesh.castShadow = true;
            cactusMesh.receiveShadow = true;

            this.world.addTreeToChunk(cx, cy, cz, cactusMesh); // addTreeToChunk を再利用
        }
    }

    createCactusMesh(groundY) {
        const group = new THREE.Group();

        // メインの胴体
        const trunkHeight = 3 + Math.random() * 2; // 3~5m
        const trunkRadius = 0.3 + Math.random() * 0.2; // 0.3~0.5m

        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: 0x2F4F2F, // ダークグリーン
            roughness: 0.9,
            metalness: 0.0
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2 + groundY;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        group.add(trunk);

        // 腕 (横向きのシリンダー)
        const numArms = 1 + Math.floor(Math.random() * 2); // 1~2本の腕
        for (let i = 0; i < numArms; i++) {
            const armLength = 1 + Math.random() * 1; // 1~2m
            const armRadius = trunkRadius * 0.6;

            const armGeometry = new THREE.CylinderGeometry(armRadius, armRadius, armLength, 6);
            const armMaterial = trunkMaterial; // 同じマテリアル
            const arm = new THREE.Mesh(armGeometry, armMaterial);

            // 腕の位置 (胴体の上部〜中部)
            const armHeightRatio = 0.3 + Math.random() * 0.5; // 30%~80%の高さ
            arm.position.y = trunkHeight * armHeightRatio + groundY;

            // 腕の方向 (X or Z 方向)
            const isXAxis = Math.random() > 0.5;
            if (isXAxis) {
                arm.position.x = trunkRadius + armLength / 2;
                arm.rotation.z = Math.PI / 2;
            } else {
                arm.position.z = trunkRadius + armLength / 2;
                arm.rotation.x = -Math.PI / 2; // -PI/2 で Z軸方向に
            }
            arm.castShadow = true;
            arm.receiveShadow = true;
            group.add(arm);
        }

        // トゲ (小さな球体)
        const numSpines = 20 + Math.floor(Math.random() * 30); // 20~49個
        for (let i = 0; i < numSpines; i++) {
            const spineRadius = 0.02;
            const spineGeometry = new THREE.SphereGeometry(spineRadius, 4, 4);
            const spineMaterial = new THREE.MeshStandardMaterial({ color: 0xDC143C }); // クリムゾンレッド
            const spine = new THREE.Mesh(spineGeometry, spineMaterial);

            // トゲの位置 (胴体や腕の表面にランダムに配置)
            // 簡略化: 胴体の表面に配置
            const angle = Math.random() * Math.PI * 2;
            const heightRatio = Math.random();
            const spineHeight = trunkHeight * heightRatio;
            const spineRadiusAtHeight = trunkRadius * (1.0 - Math.abs(heightRatio - 0.5) * 0.5); // 中央太め

            spine.position.x = Math.cos(angle) * spineRadiusAtHeight;
            spine.position.z = Math.sin(angle) * spineRadiusAtHeight;
            spine.position.y = spineHeight + groundY;

            spine.castShadow = false; // トゲは影を落とさない
            spine.receiveShadow = false;
            group.add(spine);
        }

        return group;
    }

    // --- 追加: WorldGenerator から直接呼び出される createMesh メソッド ---
    createMesh(groundY) {
        return this.createCactusMesh(groundY);
    }
    // --- 追加 ここまて ---
}