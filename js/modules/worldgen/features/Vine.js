// js/modules/worldgen/features/Vine.js
import * as THREE from 'three';

export class Vine {
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
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Vine generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        if (biome.classification !== 'Af') {
             return;
        }

        // ツタの密度 (木に付随)
        const numVines = Math.floor(3 + Math.random() * 5); // 3~7個

        for (let i = 0; i < numVines; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // ツタのメッシュを生成
            const vineMesh = this.createVineMesh(terrainHeight);

            vineMesh.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            this.world.addTreeToChunk(cx, cy, cz, vineMesh); // Tree用のメソッドに一時的に追加
            // 将来的には、addVineToChunk などの専用メソッドを作成するのが望ましい
        }
    }

    createVineMesh(groundY) {
        // ツタは細長い平面や、細いシリンダーチェーンで表現
        const group = new THREE.Group();

        const vineLength = 3 + Math.random() * 4; // 3~7m
        const segmentLength = 0.5;
        const numSegments = Math.floor(vineLength / segmentLength);
        const vineRadius = 0.05; // 5cm

        let currentY = groundY;
        let parentSegment = null;

        for (let i = 0; i < numSegments; i++) {
            const segmentGeometry = new THREE.CapsuleGeometry(vineRadius, segmentLength, 4, 8);
            const segmentMaterial = new THREE.MeshStandardMaterial({
                color: 0x32CD32, // ライムグリーン
                roughness: 0.9,
                metalness: 0.0
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            // 位置と回転を設定 (少しずつ下に垂れ下がり、ランダムに揺れる)
            segment.position.y = currentY + segmentLength / 2;
            if (parentSegment) {
                // 親セグメントに追加し、位置を調整
                parentSegment.add(segment);
                segment.position.y = segmentLength; // 親の上端に接続
                // ランダムな角度で曲げる
                segment.rotation.z = (Math.random() - 0.5) * 0.5; // Z軸回転
                segment.rotation.x = (Math.random() - 0.5) * 0.3; // X軸回転 (垂れ下がり)
            } else {
                // 最初のセグメントはグループ直下
                group.add(segment);
            }

            currentY += segmentLength;
            parentSegment = segment;
        }

        return group;
    }
}