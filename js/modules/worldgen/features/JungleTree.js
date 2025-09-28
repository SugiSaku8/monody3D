// js/modules/worldgen/features/JungleTree.js
import * as THREE from 'three';

export class JungleTree {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    // チャンク単位で生成
    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return; // 地面(Y=0)のチャンクのみ

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for JungleTree generation.`);
            return;
        }

        // バイオームから情報を取得
        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ); // Y=0でのバイオーム

        // バイオームがジャングルでない場合は生成しない
        if (biome.classification !== 'Af') {
             return;
        }

        // ジャングルでは木の密度を高くする
        const numTrees = Math.floor(5 + Math.random() * 10); // 5~14本

        for (let i = 0; i < numTrees; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            // 地形の高さを取得
            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // ジャングルの木のメッシュを生成
            const treeMesh = this.createJungleTreeMesh(terrainHeight);

            // チャンクのローカル座標に変換して追加
            treeMesh.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            // World に追加 (World.js の addTreeToChunk メソッド経由)
            this.world.addTreeToChunk(cx, cy, cz, treeMesh);
        }
    }

    // ジャングルの木のメッシュを生成するメソッド
    createJungleTreeMesh(groundY) {
        const group = new THREE.Group();

        // 胴体 (複数の幹をシミュレート)
        const numTrunks = 2 + Math.floor(Math.random() * 2); // 2~3本の幹
        for (let i = 0; i < numTrunks; i++) {
            const trunkHeight = 8 + Math.random() * 7; // 8~15m
            const trunkRadiusTop = 0.4 + Math.random() * 0.3; // 上部 0.4~0.7m
            const trunkRadiusBottom = trunkRadiusTop + 0.2 + Math.random() * 0.3; // 下部は太い

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
            // 幹の位置を少しずらす
            trunk.position.x += (Math.random() - 0.5) * 1.5;
            trunk.position.z += (Math.random() - 0.5) * 1.5;
            group.add(trunk);
        }

        // 葉 (巨大な球体 or 複数の球体)
        const leavesRadius = 4 + Math.random() * 3; // 4~7m
        const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 6, 6);
        const leavesMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22, // 濃い緑
            roughness: 0.8,
            metalness: 0.0
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 12 + groundY; // 葉は高い位置
        group.add(leaves);

        // 少し小さな葉を追加して、層状にする
        const smallLeavesGeometry = new THREE.SphereGeometry(leavesRadius * 0.7, 5, 5);
        const smallLeaves = new THREE.Mesh(smallLeavesGeometry, leavesMaterial);
        smallLeaves.position.y = 10 + groundY;
        smallLeaves.position.x += (Math.random() - 0.5) * 2;
        smallLeaves.position.z += (Math.random() - 0.5) * 2;
        group.add(smallLeaves);

        return group;
    }
}