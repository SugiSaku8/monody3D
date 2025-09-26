// js/modules/worldgen/features/Grass.js
import * as THREE from 'three';

export class Grass {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // 草の形状 (平面)
        this.grassGeometry = new THREE.PlaneGeometry(0.08, 0.2);

        // 草のマテリアル
        this.grassMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x228B22), // デフォルト色 (getGrassDataで上書きされる)
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return;

        const biome = this.biomeManager.getBiomeAt(
            cx * chunkSize + chunkSize / 2,
            cz * chunkSize + chunkSize / 2
        );

        const grassData = biome.getGrassData();

        if (grassData.density <= 0) return;

        // --- 修正: InstancedMesh を使用して草を生成 ---
        const grassPositions = this.calculateGrassPositionsNatural(cx, cz, chunkSize, grassData); // メソッド名を変更
        const numGrass = grassPositions.length;

        if (numGrass > 0) {
            const instancedMesh = new THREE.InstancedMesh(this.grassGeometry, this.grassMaterial, numGrass);

            const matrix = new THREE.Matrix4();
            for (let i = 0; i < numGrass; i++) {
                const pos = grassPositions[i].position;
                const rot = grassPositions[i].rotation;
                const scl = grassPositions[i].scale;
                const col = grassPositions[i].color;

                matrix.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
                instancedMesh.setMatrixAt(i, matrix);
                instancedMesh.setColorAt(i, col);
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) {
                instancedMesh.instanceColor.needsUpdate = true;
            }

            this.world.addGrassToChunk(cx, cy, cz, instancedMesh);
        }
        // --- 修正 ここまで ---
    }

    // --- 修正: より自然な草の配置を計算するメソッド ---
    calculateGrassPositionsNatural(cx, cz, chunkSize, grassData) {
        const grassDataList = [];
        // チャンク内の草の総数を密度から計算
        const totalArea = chunkSize * chunkSize;
        const targetNumGrass = Math.floor(grassData.density * totalArea);

        // 傾きの計算に使用するセグメント数 (以前のコードと同様)
        const segments = 32;
        const segmentSize = chunkSize / segments;

        for (let i = 0; i < targetNumGrass; i++) {
            // チャンク内のランダムな位置を生成
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            // 地形の高さを取得
            const worldY = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // 傾きを計算 (この部分は以前のコードとほぼ同じ)
            const nx = this.world.getWorldTerrainHeightAt(worldX + segmentSize, worldZ);
            const nz = this.world.getWorldTerrainHeightAt(worldX, worldZ + segmentSize);
            const currentHeight = worldY;
            const slopeX = (nx - currentHeight) / segmentSize;
            const slopeZ = (nz - currentHeight) / segmentSize;
            const slopeMagnitude = Math.sqrt(slopeX * slopeX + slopeZ * slopeZ);
            const maxSlopeForGrass = 0.5;

            // 傾きが緩やかであれば草を配置
            if (slopeMagnitude < maxSlopeForGrass) {
                const position = new THREE.Vector3(
                    localX - chunkSize / 2,
                    worldY,
                    localZ - chunkSize / 2
                );

                // 回転 (Y軸を中心にランダム)
                const rotation = new THREE.Euler(
                    0,
                    Math.random() * Math.PI * 2,
                    0
                );

                // スケール (高さにランダム性)
                const scale = new THREE.Vector3(
                    1.0,
                    0.8 + Math.random() * 0.4,
                    1.0
                );

                // 色 (grassData.color にランダム性を加える)
                const color = new THREE.Color().copy(grassData.color).offsetHSL(
                    (Math.random() - 0.5) * 0.1,
                    0,
                    (Math.random() - 0.5) * 0.1
                );

                grassDataList.push({
                    position: position,
                    rotation: rotation,
                    scale: scale,
                    color: color
                });
            }
            // 傾きが急な場合は、このループでの草の配置を諦めて、次のループで新しいランダム位置を試す
        }

        return grassDataList;
    }
    // --- 修正 ここまで ---
}