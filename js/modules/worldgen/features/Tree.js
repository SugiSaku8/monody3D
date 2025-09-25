// js/modules/worldgen/features/Tree.js
import * as THREE from 'three';

export class Tree {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        // 1チャンクにランダム1~32個生成
        const numTrees = Math.floor(Math.random() * 32) + 1;

        for (let i = 0; i < numTrees; i++) {
            // チャンク内のランダムな位置を計算
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;

            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            // 地形の高さを取得
            const terrainHeight = this.world.getTerrainHeightAt(worldX, worldZ);

            // 簡易的な木のグループを作成
            const treeGroup = new THREE.Group();

            // 幹
            const trunkHeight = 1 + Math.random() * 2; // 高さにランダム性
            const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, trunkHeight, 8);
            const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
            trunk.position.y = trunkHeight / 2; // 中心を原点に
            treeGroup.add(trunk);

            // 葉
            const leavesRadius = 0.8 + Math.random() * 0.5; // 半径にランダム性
            const leavesGeometry = new THREE.SphereGeometry(leavesRadius, 8, 8);
            const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
            const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
            leaves.position.y = trunkHeight + leavesRadius * 0.7; // 幹の上に乗せる
            treeGroup.add(leaves);

            // チャンクのローカル座標系に変換
            treeGroup.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            // チャンクに追加 (Chunk インスタンスを引数で渡すか、World に追加するメソッドを用意する)
            // 今回は World に追加するメソッドを仮定
            this.world.addTreeToChunk(cx, cy, cz, treeGroup);
        }
    }
}