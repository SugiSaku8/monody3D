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

        const numVines = Math.floor(3 + Math.random() * 5);

        for (let i = 0; i < numVines; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            const vineMesh = this.createMesh(terrainHeight); // <-- ここも変更

            vineMesh.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            this.world.addTreeToChunk(cx, cy, cz, vineMesh);
        }
    }

    // --- 修正: createVineMesh メソッドの名前を createMesh に変更 ---
    // または、createMesh メソッドを新規追加し、内部で createVineMesh を呼び出す
    // ここでは、createVineMesh のロジックを createMesh に移動する方法を採用
    /**
     * ツタのメッシュを生成します。
     * @param {number} groundY - 地面のY座標
     * @returns {THREE.Group} 生成されたツタのメッシュ
     */
    createMesh(groundY) { // <-- メソッド名を createMesh に変更
        // ツタは細長い平面や、細いシリンダーチェーンで表現
        const group = new THREE.Group();

        const vineLength = 3 + Math.random() * 4; // 3~7m
        const segmentLength = 0.5;
        const numSegments = Math.floor(vineLength / segmentLength);
        const vineRadius = 0.05; // 5cm

        let currentY = groundY;
        let parentSegment = null;

        for (let i = 0; i < numSegments; i++) {
            // CapsuleGeometry は、Three.js r120 以降で利用可能
            // 古いバージョンの場合は、SphereBufferGeometry 2つと CylinderBufferGeometry 1つで構成する必要あり
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
    // --- 修正 ここまて ---

    // --- 削除: 古い createVineMesh メソッド ---
    // createVineMesh(groundY) { ... } // このメソッドは削除するか、createMesh 内にロジックを移動
    // --- 削除 ここまて ---
}