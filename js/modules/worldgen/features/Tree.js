// js/modules/worldgen/features/Tree.js
import * as THREE from 'three';

export class Tree {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // --- 追加: 葉っぱのジオメトリとマテリアルを事前生成 ---
        // 葉っぱのジオメトリ (平面)
        this.leafGeometry = new THREE.PlaneGeometry(0.15, 0.15); // サイズを少し大きく

        // 葉っぱのマテリアル (MeshStandardMaterial でライティング対応)
        this.leafMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.3, 0.8, 0.4), // デフォルトの緑
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide, // 葉っぱを両面表示
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });
        // --- 追加 ここまて ---
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return; // 地面(Y=0)のチャンクのみ

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Tree generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        // 木の密度をバイオームに応じて調整 (例: 熱帯雨林は高密度)
        let treeDensity = 0;
        if (biome.classification === 'Af') {
            treeDensity = 0.8; // 高密度
        } else if (biome.classification === 'Cfb') {
            treeDensity = 0.5; // 中密度
        } else if (biome.classification === 'Aw') {
            treeDensity = 0.3; // 低密度
        } else {
            treeDensity = 0.2; // デフォルト低密度
        }

        const numTrees = Math.floor(treeDensity * chunkSize * chunkSize); // 密度に応じた数

        for (let i = 0; i < numTrees; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;
            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // --- 修正: createRealisticTree メソッドを呼び出す ---
            const treeGroup = this.createRealisticTree(terrainHeight);
            // --- 修正 ここまて ---

            treeGroup.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            // --- 修正: World に追加 ---
            this.world.addTreeToChunk(cx, cy, cz, treeGroup);
            // --- 修正 ここまて ---
        }
    }

    // --- 修正: リアルな木を生成するメソッド ---
    createRealisticTree(groundY) {
        const treeGroup = new THREE.Group();

        // 木の全体的なパラメータ (ランダム性を追加)
        const treeHeight = 4 + Math.random() * 4; // 4.0 から 8.0
        const trunkHeight = treeHeight * (0.4 + Math.random() * 0.3); // 幹の高さ: 全体の40~70%
        const trunkRadiusBottom = 0.2 + Math.random() * 0.15; // 幹の下部の太さ
        const trunkRadiusTop = trunkRadiusBottom * (0.6 + Math.random() * 0.2); // 幹の上部の太さ (60~80%)
        const numBranches = 3 + Math.floor(Math.random() * 4); // 枝の数: 3~6本

        // --- 修正: 幹の生成 (ライティング対応) ---
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8);
        // 法線を計算 (ライティングのために必須)
        trunkGeometry.computeVertexNormals();
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: this.getTrunkColor(), // 茶色系
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2 + groundY; // 地面の高さに合わせる
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);
        // --- 修正 ここまて ---

        // --- 修正: 枝の生成と葉っぱの配置 ---
        const branchLeafGroups = []; // 枝ごとの葉っぱグループを保持
        for (let i = 0; i < numBranches; i++) {
            // 幹の途中 (30%~80%) から枝を生やす
            const branchStartHeightRatio = 0.3 + Math.random() * 0.5;
            const branchStartY = trunkHeight * branchStartHeightRatio + groundY;

            // 枝の方向 (水平に近いがランダム)
            const branchAngleXZ = Math.random() * Math.PI * 2;
            const branchAngleY = Math.PI / 4 + Math.random() * Math.PI / 4; // 45-90度
            const branchDirection = new THREE.Vector3(
                Math.sin(branchAngleY) * Math.cos(branchAngleXZ),
                Math.cos(branchAngleY),
                Math.sin(branchAngleY) * Math.sin(branchAngleXZ)
            ).normalize();

            // 枝の長さと太さ
            const branchLength = 1.0 + Math.random() * 2.0; // 1.0 から 3.0
            const branchRadius = trunkRadiusBottom * (0.2 + Math.random() * 0.2); // 幹の太さの20~40%

            // 枝のジオメトリ (円柱)
            const branchGeometry = new THREE.CylinderGeometry(branchRadius, branchRadius, branchLength, 6);
            // 法線を計算 (ライティングのために必須)
            branchGeometry.computeVertexNormals();
            const branchMaterial = trunkMaterial; // 枝も幹と同じマテリアル
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);

            // 枝の位置と回転
            // 開始位置は幹の中心線上
            branch.position.set(0, branchStartY, 0);
            // 枝の方向に回転
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, branchDirection);
            branch.quaternion.copy(quaternion);
            // 長さ分だけ先に移動
            branch.position.add(branchDirection.clone().multiplyScalar(branchLength / 2));

            branch.castShadow = true;
            branch.receiveShadow = true;
            treeGroup.add(branch);

            // --- 追加: 枝ごとの葉っぱグループを生成 ---
            const branchLeafGroup = this.createLeafGroupForBranch(branch, branchLength, branchDirection, groundY);
            if (branchLeafGroup) {
                treeGroup.add(branchLeafGroup);
                branchLeafGroups.push(branchLeafGroup);
            }
            // --- 追加 ここまて ---
        }
        // --- 修正 ここまて ---

        // --- 追加: 幹の上部にも葉っぱのグループを生成 ---
        const topLeafGroup = this.createLeafGroupForTop(trunk, trunkHeight, groundY);
        if (topLeafGroup) {
            treeGroup.add(topLeafGroup);
            branchLeafGroups.push(topLeafGroup); // 一括管理のため
        }
        // --- 追加 ここまて ---

        return treeGroup;
    }
    // --- 修正 ここまて ---

    // --- 追加: 茶色系の幹の色を取得 ---
    getTrunkColor() {
        const hue = 0.08 + Math.random() * 0.05; // 茶色付近 (0.0 = 赤, 0.33 = 緑, 0.66 = 青)
        const saturation = 0.4 + Math.random() * 0.2; // 彩度
        const lightness = 0.15 + Math.random() * 0.15; // 明るさ
        return new THREE.Color().setHSL(hue, saturation, lightness);
    }
    // --- 追加 ここまて ---

    // --- 追加: 枝ごとの葉っぱグループを生成 ---
    createLeafGroupForBranch(branch, branchLength, branchDirection, groundY) {
        const leafGroup = new THREE.Group();

        // 枝の先端に葉っぱの塊を配置
        const numLeavesAtTip = 15 + Math.floor(Math.random() * 10); // 15~24枚
        const tipPosition = branch.position.clone().add(branchDirection.clone().multiplyScalar(branchLength / 2));

        for (let i = 0; i < numLeavesAtTip; i++) {
            // 葉っぱの位置 (枝の先端付近にランダム配置)
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1.0, // X方向に ±0.5
                (Math.random() - 0.5) * 1.0, // Y方向に ±0.5
                (Math.random() - 0.5) * 1.0  // Z方向に ±0.5
            );
            const leafPosition = tipPosition.clone().add(offset);

            // 葉っぱのメッシュ (InstancedMesh を使用)
            const leafMesh = new THREE.Mesh(this.leafGeometry, this.leafMaterial);
            leafMesh.position.copy(leafPosition);
            // 葉っぱの回転 (枝の方向に合わせる + ランダム性)
            const leafRotation = branchDirection.clone().applyAxisAngle(
                new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                (Math.random() - 0.5) * Math.PI
            );
            leafMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), leafRotation); // 平面の法線を枝の方向に
            // 葉っぱのスケール (サイズにランダム性)
            const leafScale = 0.8 + Math.random() * 0.4;
            leafMesh.scale.set(leafScale, leafScale, leafScale);

            leafMesh.castShadow = true; // 葉っぱも影を落とす
            leafMesh.receiveShadow = true;
            leafGroup.add(leafMesh);
        }

        return leafGroup;
    }
    // --- 追加 ここまて ---

    // --- 追加: 幹の上部の葉っぱグループを生成 ---
    createLeafGroupForTop(trunk, trunkHeight, groundY) {
        const leafGroup = new THREE.Group();

        // 幹の上部に葉っぱの塊を配置
        const numLeavesAtTop = 20 + Math.floor(Math.random() * 15); // 20~34枚
        const topPosition = new THREE.Vector3(0, trunkHeight + groundY, 0);

        for (let i = 0; i < numLeavesAtTop; i++) {
            // 葉っぱの位置 (幹の上部付近にランダム配置)
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1.5, // X方向に ±0.75
                (Math.random() - 0.5) * 1.0, // Y方向に ±0.5 (少し上に)
                (Math.random() - 0.5) * 1.5  // Z方向に ±0.75
            );
            const leafPosition = topPosition.clone().add(offset);

            // 葉っぱのメッシュ (InstancedMesh を使用)
            const leafMesh = new THREE.Mesh(this.leafGeometry, this.leafMaterial);
            leafMesh.position.copy(leafPosition);
            // 葉っぱの回転 (上方向に + ランダム性)
            const leafRotation = new THREE.Vector3(0, 1, 0).applyAxisAngle(
                new THREE.Vector3(Math.random(), 0, Math.random()).normalize(),
                (Math.random() - 0.5) * Math.PI
            );
            leafMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), leafRotation); // 平面の法線を上方向に
            // 葉っぱのスケール (サイズにランダム性)
            const leafScale = 0.9 + Math.random() * 0.3;
            leafMesh.scale.set(leafScale, leafScale, leafScale);

            leafMesh.castShadow = true; // 葉っぱも影を落とす
            leafMesh.receiveShadow = true;
            leafGroup.add(leafMesh);
        }

        return leafGroup;
    }
    // --- 追加 ここまて ---
}