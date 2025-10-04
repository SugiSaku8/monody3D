// js/modules/worldgen/features/Grass.js
import * as THREE from 'three';

export class Grass {
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
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Grass generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        // 草の密度を取得 (Biome から)
        const grassDensity = biome.getGrassData().density || 0;

        if (grassDensity <= 0) return; // 草の密度が0以下なら生成しない

        // 草のインスタンス数を計算
        const numGrassInstances = Math.floor(grassDensity * chunkSize * chunkSize);

        if (numGrassInstances <= 0) return;

        // 草のジオメトリとマテリアルを定義
        const grassGeometry = new THREE.PlaneGeometry(0.1, 0.3); // 細長い平面
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: biome.getGrassData().color || new THREE.Color(0x228B22),
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9
        });

        // InstancedMesh を作成
        const grassInstancedMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, numGrassInstances);
        grassInstancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 更新頻度が低い場合は StaticDrawUsage でも可
        grassInstancedMesh.castShadow = true;
        grassInstancedMesh.receiveShadow = true;
        // --- 追加: Frustum Culling を有効化 ---
        grassInstancedMesh.frustumCulled = true;
        // --- 追加 ここまて ---

        // 各インスタンスの変換行列と色を設定
        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();
        for (let i = 0; i < numGrassInstances; i++) {
            // チャンク内のランダムなローカル座標
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            // 地形の高さを取得して、草のY座標を決定
            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // 草の位置と回転を設定
            const position = new THREE.Vector3(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );
            const rotation = new THREE.Euler(
                0,
                Math.random() * Math.PI * 2, // Y軸回転 (ランダム)
                0
            );
            const scale = new THREE.Vector3(
                1.0,
                1.0 + Math.random() * 0.5, // 高さにランダム性
                1.0
            );

            matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
            grassInstancedMesh.setMatrixAt(i, matrix);

            // 色にランダム性を加える
            color.copy(biome.getGrassData().color || new THREE.Color(0x228B22));
            color.offsetHSL((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1);
            grassInstancedMesh.setColorAt(i, color);
        }

        grassInstancedMesh.instanceMatrix.needsUpdate = true;
        if (grassInstancedMesh.instanceColor) {
             grassInstancedMesh.instanceColor.needsUpdate = true;
        }

        // World に追加 (World.js の addGrassToChunk メソッド経由)
        this.world.addGrassToChunk(cx, cy, cz, grassInstancedMesh);
    }
}