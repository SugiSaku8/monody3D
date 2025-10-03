// js/modules/worldgen/features/JungleTree.js
import * as THREE from 'three';
import { Tree } from './Tree.js'; // 親クラスをインポート

/**
 * 熱帯雨林気候 (Af) 特有のジャングルの木
 * 背が高くて、幹が太く、枝が複数に分かれ、葉っぱが非常に多い。
 */
export class JungleTree extends Tree { // Tree クラスを継承
    constructor(world, biomeManager, physicsWorld) {
        super(world, biomeManager, physicsWorld); // 親クラスのコンストラクタを呼び出す
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return; // 地面(Y=0)のチャンクのみ

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for JungleTree generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ);

        // バイオームがジャングル (Af) でのみ生成
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

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // --- 修正: createRealisticTree メソッドを呼び出す ---
            const treeGroup = this.createRealisticTree(terrainHeight);
            // --- 修正 ここまて ---

            treeGroup.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            // --- 修正: World.js 経由でチャンクに追加 ---
            this.world.addTreeToChunk(cx, cy, cz, treeGroup);
            // --- 修正 ここまて ---
        }
    }

    // --- 修正: createRealisticTree メソッド (Tree.js からコピー・修正) ---
    createRealisticTree(groundY) {
        const treeGroup = new THREE.Group();

        // ジャングルの木の全体的なパラメータ (Tree.js よりもさらに大きく・複雑に)
        const treeHeight = 8 + Math.random() * 8; // 8.0 から 16.0
        const trunkHeight = treeHeight * (0.5 + Math.random() * 0.2); // 幹の高さ: 全体の50~70%
        const trunkRadiusBottom = 0.3 + Math.random() * 0.2; // 幹の下部の太さ (0.3~0.5)
        const trunkRadiusTop = trunkRadiusBottom * (0.7 + Math.random() * 0.2); // 幹の上部の太さ (70~90%)
        const numBranches = 4 + Math.floor(Math.random() * 4); // 枝の数: 4~7本

        // --- 修正: 幹の生成 (Tree.js と同様) ---
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadiusTop, trunkRadiusBottom, trunkHeight, 8);
        trunkGeometry.computeVertexNormals(); // 法線を計算 (ライティングのために必須)
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

        // --- 修正: 枝の生成と葉っぱの配置 (Tree.js と同様) ---
        const branchLeafGroups = []; // 枝ごとの葉っぱグループを保持
        for (let i = 0; i < numBranches; i++) {
            // 幹の途中 (20%~80%) から枝を生やす
            const branchStartHeightRatio = 0.2 + Math.random() * 0.6;
            const branchStartY = trunkHeight * branchStartHeightRatio + groundY;

            // 枝の方向 (水平に近いがランダム)
            const branchAngleXZ = Math.random() * Math.PI * 2;
            const branchAngleY = Math.PI / 6 + Math.random() * Math.PI / 3; // 30-90度 (より水平寄り)
            const branchDirection = new THREE.Vector3(
                Math.sin(branchAngleY) * Math.cos(branchAngleXZ),
                Math.cos(branchAngleY),
                Math.sin(branchAngleY) * Math.sin(branchAngleXZ)
            ).normalize();

            // 枝の長さと太さ (Tree.js よりもさらに長く・太く)
            const branchLength = 2.0 + Math.random() * 3.0; // 2.0 から 5.0
            const branchRadius = trunkRadiusBottom * (0.4 + Math.random() * 0.3); // 幹の太さの40~70%

            // 枝のジオメトリ (円柱)
            const branchGeometry = new THREE.CylinderGeometry(branchRadius, branchRadius, branchLength, 6);
            branchGeometry.computeVertexNormals(); // 法線を計算 (ライティングのために必須)
            const branchMaterial = trunkMaterial; // 枝も幹と同じマテリアル
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);

            // 枝の位置と回転
            branch.position.set(0, branchStartY, 0);
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, branchDirection);
            branch.quaternion.copy(quaternion);
            // 長さ分だけ先に移動
            branch.position.add(branchDirection.clone().multiplyScalar(branchLength / 2));

            branch.castShadow = true;
            branch.receiveShadow = true;
            treeGroup.add(branch);

            // --- 修正: 枝ごとの葉っぱの塊を生成・配置 (Tree.js からコピー) ---
            const branchLeafGroup = this.createLeafGroupForBranch(branch, branchLength, branchDirection, groundY);
            if (branchLeafGroup) {
                treeGroup.add(branchLeafGroup);
                branchLeafGroups.push(branchLeafGroup);
            }
            // --- 修正 ここまて ---
        }
        // --- 修正 ここまて ---

        // --- 修正: 幹の上部にも葉っぱの塊を生成・配置 (Tree.js からコピー) ---
        const topLeafGroup = this.createLeafGroupForTop(trunk, trunkHeight, groundY);
        if (topLeafGroup) {
            treeGroup.add(topLeafGroup);
            branchLeafGroups.push(topLeafGroup); // 一括管理のため
        }
        // --- 修正 ここまて ---

        return treeGroup;
    }
    // --- 修正 ここまて ---

    // --- 追加: 茶色系の幹の色を取得 (Tree.js からコピー) ---
    getTrunkColor() {
        const hue = 0.08 + Math.random() * 0.05; // 茶色付近 (0.0 = 赤, 0.33 = 緑, 0.66 = 青)
        const saturation = 0.4 + Math.random() * 0.2; // 彩度
        const lightness = 0.15 + Math.random() * 0.15; // 明るさ
        return new THREE.Color().setHSL(hue, saturation, lightness);
    }
    // --- 追加 ここまて ---

    // --- 追加: 枝ごとの葉っぱグループを生成 (Tree.js からコピー) ---
    createLeafGroupForBranch(branch, branchLength, branchDirection, groundY) {
        const leafGroup = new THREE.Group();

        // 枝の先端に葉っぱの塊を配置
        const numLeavesAtTip = 20 + Math.floor(Math.random() * 15); // 20~34枚 (Tree.js より多い)
        const tipPosition = branch.position.clone().add(branchDirection.clone().multiplyScalar(branchLength / 2));

        for (let i = 0; i < numLeavesAtTip; i++) {
            // 葉っぱの位置 (枝の先端付近にランダム配置)
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1.2, // X方向に ±0.6 (Tree.js より広め)
                (Math.random() - 0.5) * 1.2, // Y方向に ±0.6 (Tree.js より広め)
                (Math.random() - 0.5) * 1.2  // Z方向に ±0.6 (Tree.js より広め)
            );
            const leafPosition = tipPosition.clone().add(offset);

            // 葉っぱのメッシュ (InstancedMesh を使用)
            const leafMesh = new THREE.Mesh(this.leafGeometry, this.leafMaterial); // Tree.js で定義済み
            leafMesh.position.copy(leafPosition);
            // 葉っぱの回転 (枝の方向に合わせる + ランダム性)
            const leafRotation = branchDirection.clone().applyAxisAngle(
                new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                (Math.random() - 0.5) * Math.PI
            );
            leafMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), leafRotation); // 平面の法線を枝の方向に
            // 葉っぱのスケール (サイズにランダム性)
            const leafScale = 1.0 + Math.random() * 0.5; // Tree.js より少し大きい (1.0~1.5)
            leafMesh.scale.set(leafScale, leafScale, leafScale);

            leafMesh.castShadow = true; // 葉っぱも影を落とす
            leafMesh.receiveShadow = true;
            leafGroup.add(leafMesh);
        }

        return leafGroup;
    }
    // --- 追加 ここまて ---

    // --- 追加: 幹の上部の葉っぱグループを生成 (Tree.js からコピー) ---
    createLeafGroupForTop(trunk, trunkHeight, groundY) {
        const leafGroup = new THREE.Group();

        // 幹の上部に葉っぱの塊を配置
        const numLeavesAtTop = 30 + Math.floor(Math.random() * 20); // 30~49枚 (Tree.js より多い)
        const topPosition = new THREE.Vector3(0, trunkHeight + groundY, 0);

        for (let i = 0; i < numLeavesAtTop; i++) {
            // 葉っぱの位置 (幹の上部付近にランダム配置)
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2.0, // X方向に ±1.0 (Tree.js より広め)
                (Math.random() - 0.5) * 1.2, // Y方向に ±0.6 (Tree.js より広め)
                (Math.random() - 0.5) * 2.0  // Z方向に ±1.0 (Tree.js より広め)
            );
            const leafPosition = topPosition.clone().add(offset);

            // 葉っぱのメッシュ (InstancedMesh を使用)
            const leafMesh = new THREE.Mesh(this.leafGeometry, this.leafMaterial); // Tree.js で定義済み
            leafMesh.position.copy(leafPosition);
            // 葉っぱの回転 (上方向に + ランダム性)
            const leafRotation = new THREE.Vector3(0, 1, 0).applyAxisAngle(
                new THREE.Vector3(Math.random(), 0, Math.random()).normalize(),
                (Math.random() - 0.5) * Math.PI
            );
            leafMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), leafRotation); // 平面の法線を上方向に
            // 葉っぱのスケール (サイズにランダム性)
            const leafScale = 1.2 + Math.random() * 0.6; // Tree.js より少し大きい (1.2~1.8)
            leafMesh.scale.set(leafScale, leafScale, leafScale);

            leafMesh.castShadow = true; // 葉っぱも影を落とす
            leafMesh.receiveShadow = true;
            leafGroup.add(leafMesh);
        }

        return leafGroup;
    }
    // --- 追加 ここまて ---
}