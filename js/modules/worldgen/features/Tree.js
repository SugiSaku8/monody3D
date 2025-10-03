// js/modules/worldgen/features/Tree.js
import * as THREE from 'three';

export class Tree {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // --- 追加: 葉っぱのジオメトリを事前生成 ---
        this.leafGeometry = new THREE.PlaneGeometry(0.15, 0.15); // 一枚の板状の葉っぱ
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

        // --- 修正: チャンク内の木の数を制限 (パフォーマンス対策) ---
        const maxTreesPerChunk = 32; // チャンクあたりの最大木の数
        const numTrees = Math.min(maxTreesPerChunk, Math.floor(treeDensity * chunkSize * chunkSize));
        // --- 修正 ここまて ---

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

    // --- 修正: リアルな木を生成するメソッド (InstancedMesh と自然な配置) ---
    createRealisticTree(groundY) {
        const treeGroup = new THREE.Group();

        // 木の全体的なパラメータ (ランダム性を追加)
        const treeHeight = 4 + Math.random() * 3; // 4.0 から 7.0
        const trunkHeight = treeHeight * (0.4 + Math.random() * 0.3); // 幹の高さ: 全体の40~70%
        const trunkRadiusBottom = 0.15 + Math.random() * 0.1; // 幹の太さ
        const trunkRadiusTop = trunkRadiusBottom * (0.6 + Math.random() * 0.2); // 幹の上部は細く (60~80%)
        const numBranches = 3 + Math.floor(Math.random() * 3); // 枝の数: 3~5本

        // --- 修正: 幹の生成 (ライティング対応) ---
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

        // --- 修正: 枝の生成と葉っぱの配置 ---
        const branchLeafGroups = []; // 枝ごとの葉っぱグループを保持
        for (let i = 0; i < numBranches; i++) {
            // 幹の上部 30-70% の高さに枝を生やす
            const branchStartHeightRatio = 0.3 + Math.random() * 0.4;
            const branchStartY = trunkHeight * branchStartHeightRatio + groundY;

            // 枝の方向 (水平に近いがランダム)
            const branchAngleXZ = Math.random() * Math.PI * 2;
            const branchAngleY = Math.PI / 6 + Math.random() * Math.PI / 3; // 30-90度 (より水平寄り)
            const branchDirection = new THREE.Vector3(
                Math.sin(branchAngleY) * Math.cos(branchAngleXZ),
                Math.cos(branchAngleY),
                Math.sin(branchAngleY) * Math.sin(branchAngleXZ)
            ).normalize();

            // 枝の長さと太さ
            const branchLength = 1.0 + Math.random() * 1.5; // 1.0 から 2.5
            const branchRadius = trunkRadiusBottom * (0.3 + Math.random() * 0.2); // 幹の太さの30~50%

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

            // --- 修正: 枝ごとの葉っぱグループを生成・配置 (InstancedMesh を使用) ---
            const branchLeafGroup = this.createLeafGroupForBranch(branch, branchLength, branchDirection, groundY);
            if (branchLeafGroup) {
                treeGroup.add(branchLeafGroup);
                branchLeafGroups.push(branchLeafGroup);
            }
            // --- 修正 ここまて ---
        }
        // --- 修正 ここまて ---

        // --- 修正: 幹の上部にも葉っぱの塊を生成・配置 (InstancedMesh を使用) ---
        const topLeafGroup = this.createLeafGroupForTop(trunk, trunkHeight, groundY);
        if (topLeafGroup) {
            treeGroup.add(topLeafGroup);
            branchLeafGroups.push(topLeafGroup); // 一括管理のため
        }
        // --- 修正 ここまて ---

        return treeGroup;
    }
    // --- 修正 ここまて ---

    getTrunkColor() {
        const hue = 0.08 + Math.random() * 0.05; // 茶色付近 (0.0 = 赤, 0.33 = 緑, 0.66 = 青)
        const saturation = 0.4 + Math.random() * 0.2; // 彩度
        const lightness = 0.15 + Math.random() * 0.15; // 明るさ
        return new THREE.Color().setHSL(hue, saturation, lightness);
    }

    // --- 修正: 枝ごとの葉っぱグループを生成 (InstancedMesh を使用) ---
    createLeafGroupForBranch(branch, branchLength, branchDirection, groundY) {
        // --- 修正: 葉っぱの数を減らす (InstancedMesh のパフォーマンス対策) ---
        const numLeavesAtTip = 20 + Math.floor(Math.random() * 15); // 20~34枚 (以前: 40~69枚)
        // --- 修正 ここまて ---
        const tipPosition = branch.position.clone().add(branchDirection.clone().multiplyScalar(branchLength / 2));

        // --- 修正: InstancedMesh を使用して葉っぱを生成 ---
        const leafInstancedMesh = new THREE.InstancedMesh(this.leafGeometry, this.getLeafMaterial(), numLeavesAtTip);
        leafInstancedMesh.instanceMatrix.needsUpdate = true;
        if (leafInstancedMesh.instanceColor) {
             leafInstancedMesh.instanceColor.needsUpdate = true;
        }
        leafInstancedMesh.castShadow = true; // 葉っぱも影を落とす
        leafInstancedMesh.receiveShadow = true;
        // --- 修正 ここまて ---

        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        for (let i = 0; i < numLeavesAtTip; i++) {
            // 葉っぱの位置 (枝の先端付近にランダム配置)
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 1.0, // X方向に ±0.5
                (Math.random() - 0.5) * 1.0, // Y方向に ±0.5
                (Math.random() - 0.5) * 1.0  // Z方向に ±0.5
            );
            const leafPosition = tipPosition.clone().add(offset);

            // 葉っぱの回転 (枝の方向に合わせる + ランダム性)
            const leafRotation = branchDirection.clone().applyAxisAngle(
                new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
                (Math.random() - 0.5) * Math.PI
            );
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), leafRotation); // 平面の法線を枝の方向に

            // 葉っぱのスケール (サイズにランダム性)
            const leafScale = 0.8 + Math.random() * 0.4; // 0.8~1.2

            // 変換行列を設定
            matrix.compose(leafPosition, quaternion, new THREE.Vector3(leafScale, leafScale, leafScale));
            leafInstancedMesh.setMatrixAt(i, matrix);

            // 葉っぱの色 (緑系にランダム性)
            color.setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.2);
            leafInstancedMesh.setColorAt(i, color);
        }

        return leafInstancedMesh;
    }
    // --- 修正 ここまて ---

    // --- 追加: 葉っぱのマテリアルを取得するメソッド ---
    getLeafMaterial() {
        // 葉っぱのマテリアル (MeshStandardMaterial でライティング対応)
        const leafMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.3, 0.8, 0.4), // デフォルトの緑
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide, // 葉っぱを両面表示
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });
        return leafMaterial;
    }
    // --- 追加 ここまて ---

    // --- 修正: 幹の上部の葉っぱグループを生成 (InstancedMesh を使用) ---
    createLeafGroupForTop(trunk, trunkHeight, groundY) {
        // --- 修正: 葉っぱの数を減らす (InstancedMesh のパフォーマンス対策) ---
        const numLeavesAtTop = 30 + Math.floor(Math.random() * 20); // 30~49枚 (以前: 60~99枚)
        // --- 修正 ここまて ---
        const topPosition = new THREE.Vector3(0, trunkHeight + groundY, 0);

        // --- 修正: InstancedMesh を使用して葉っぱを生成 ---
        const leafInstancedMesh = new THREE.InstancedMesh(this.leafGeometry, this.getLeafMaterial(), numLeavesAtTop);
        leafInstancedMesh.instanceMatrix.needsUpdate = true;
        if (leafInstancedMesh.instanceColor) {
             leafInstancedMesh.instanceColor.needsUpdate = true;
        }
        leafInstancedMesh.castShadow = true; // 葉っぱも影を落とす
        leafInstancedMesh.receiveShadow = true;
        // --- 修正 ここまて ---

        const matrix = new THREE.Matrix4();
        const color = new THREE.Color();

        // --- 修正: 木全体を包む球状の空間に葉っぱを配置 ---
        const canopyRadius = 1.5 + trunkHeight * 0.3; // 樹冠の半径 (木の高さに応じて変化)
        const canopyCenterY = trunkHeight + groundY + canopyRadius * 0.2; // 樹冠の中心Y (やや上にずらす)
        // --- 修正 ここまて ---

        for (let i = 0; i < numLeavesAtTop; i++) {
            // --- 修正: 球状の分布に変更 ---
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * canopyRadius; // 半径を樹冠の半径に制限
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            const leafPosition = new THREE.Vector3(
                r * sinPhi * cosTheta,
                r * sinPhi * sinTheta + canopyCenterY, // 樹冠の中心Yにずらす
                r * cosPhi
            );
            // --- 修正 ここまて ---

            // 葉っぱの回転 (上方向に + ランダム性)
            const leafRotation = new THREE.Vector3(0, 1, 0).applyAxisAngle(
                new THREE.Vector3(Math.random(), 0, Math.random()).normalize(),
                (Math.random() - 0.5) * Math.PI
            );
            const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), leafRotation); // 平面の法線を上方向に

            // 葉っぱのスケール (サイズにランダム性)
            const leafScale = 1.0 + Math.random() * 0.5; // 1.0~1.5

            // 変換行列を設定
            matrix.compose(leafPosition, quaternion, new THREE.Vector3(leafScale, leafScale, leafScale));
            leafInstancedMesh.setMatrixAt(i, matrix);

            // 葉っぱの色 (緑系にランダム性)
            color.setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.2);
            leafInstancedMesh.setColorAt(i, color);
        }

        return leafInstancedMesh;
    }
    // --- 修正 ここまて ---
}