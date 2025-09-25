// js/modules/worldgen/features/Tree.js
import * as THREE from 'three';

export class Tree {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;
        // --- 追加: 葉っぱのインスタンシング用ジオメトリとマテリアルを事前生成 ---
        this.leafGeometry = new THREE.PlaneGeometry(0.15, 0.15); // 平面ジオメトリ (葉っぱの形状)
        this.leafMaterial = new THREE.MeshStandardMaterial({
            color: new THREE.Color().setHSL(0.3, 0.8, 0.4), // デフォルトの緑
            roughness: 0.9,
            metalness: 0.0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
            wireframe: false
        });
        // --- 追加 ここまで ---
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        const numTrees = Math.floor(Math.random() * 32) + 1;

        for (let i = 0; i < numTrees; i++) {
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;

            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // --- 修正: インスタンシング版の木構造を生成 ---
            const treeGroup = this.createOptimizedTree(terrainHeight);
            // --- 修正 ここまで ---

            treeGroup.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            this.world.addTreeToChunk(cx, cy, cz, treeGroup);
        }
    }

    // --- 修正: メソッド名を変更して、最適化版であることを示す ---
    createOptimizedTree(groundY) {
        const treeGroup = new THREE.Group();

        // 木の全体的なパラメータ
        const treeHeight = 4 + Math.random() * 3; // 4.0 から 7.0
        const trunkHeight = treeHeight * (0.4 + Math.random() * 0.2); // 幹の高さ: 全体の40~60%
        const trunkRadius = 0.15 + Math.random() * 0.1; // 幹の太さ
        const numBranches = 3 + Math.floor(Math.random() * 3); // 枝の数: 3~5

        // --- 幹の生成 ---
        const trunkGeometry = new THREE.CylinderGeometry(trunkRadius * 0.8, trunkRadius, trunkHeight, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({
            color: this.getTrunkColor(),
            roughness: 0.9,
            metalness: 0.1
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = trunkHeight / 2;
        treeGroup.add(trunk);

        // --- 枝の生成 ---
        for (let i = 0; i < numBranches; i++) {
            const branchStartHeightRatio = 0.2 + Math.random() * 0.6;
            const branchStartY = trunkHeight * branchStartHeightRatio;

            const branchAngleXZ = Math.random() * Math.PI * 2;
            const branchAngleY = Math.PI / 6 + Math.random() * Math.PI / 3; // 30-90度 (より水平寄り)
            const branchDirection = new THREE.Vector3(
                Math.sin(branchAngleY) * Math.cos(branchAngleXZ),
                Math.cos(branchAngleY),
                Math.sin(branchAngleY) * Math.sin(branchAngleXZ)
            ).normalize();

            const branchLength = 1.0 + Math.random() * 1.5;
            const branchRadius = trunkRadius * (0.3 + Math.random() * 0.2);

            const branchGeometry = new THREE.CylinderGeometry(branchRadius, branchRadius, branchLength, 6);
            const branchMaterial = trunkMaterial;
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);

            branch.position.set(0, branchStartY, 0);
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, branchDirection);
            branch.quaternion.copy(quaternion);
            branch.position.add(branchDirection.clone().multiplyScalar(branchLength / 2));

            treeGroup.add(branch);
        }

        // --- 葉っぱをインスタンシングで生成 ---
        // 葉っぱの配置情報を計算 (事前計算)
        const leafPositions = this.calculateLeafPositions(trunkHeight, trunkRadius, numBranches);
        const numLeaves = leafPositions.length;

        if (numLeaves > 0) {
            // --- 修正: InstancedMesh を作成 ---
            const instancedMesh = new THREE.InstancedMesh(this.leafGeometry, this.leafMaterial, numLeaves);

            // 各インスタンスの変換行列を設定
            const matrix = new THREE.Matrix4();
            const color = new THREE.Color();
            for (let i = 0; i < numLeaves; i++) {
                const pos = leafPositions[i].position;
                const rot = leafPositions[i].rotation;
                const scl = leafPositions[i].scale;
                const col = leafPositions[i].color;

                matrix.compose(pos, new THREE.Quaternion().setFromEuler(rot), scl);
                instancedMesh.setMatrixAt(i, matrix);
                instancedMesh.setColorAt(i, col);
            }

            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) {
                instancedMesh.instanceColor.needsUpdate = true;
            }

            treeGroup.add(instancedMesh);
            // --- 修正 ここまで ---
        }

        return treeGroup;
    }

    getTrunkColor() {
        const hue = 0.08 + Math.random() * 0.05;
        const saturation = 0.4 + Math.random() * 0.2;
        const lightness = 0.15 + Math.random() * 0.15;
        return new THREE.Color().setHSL(hue, saturation, lightness);
    }

    // --- 追加: 葉っぱの位置、回転、スケール、色を計算するメソッド ---
    calculateLeafPositions(trunkHeight, trunkRadius, numBranches) {
        const leafData = [];
        const totalLeafCount = 200 + Math.floor(Math.random() * 300); // 1本の木に200~500枚の葉っぱ

        // 木全体を覆う球状の空間を想定
        const canopyRadius = 1.5 + trunkHeight * 0.3; // 樹冠の半径
        const canopyCenterY = trunkHeight + canopyRadius * 0.3; // 樹冠の中心Y (やや上にずらす)

        for (let i = 0; i < totalLeafCount; i++) {
            // 球状に葉っぱのベース位置を生成
            const u = Math.random();
            const v = Math.random();
            const theta = u * 2.0 * Math.PI;
            const phi = Math.acos(2.0 * v - 1.0);
            const r = Math.cbrt(Math.random()) * canopyRadius * (0.7 + Math.random() * 0.3); // 半径にランダム性
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);

            let baseX = r * sinPhi * cosTheta;
            let baseY = r * sinPhi * sinTheta + canopyCenterY;
            let baseZ = r * cosPhi;

            // 幹や枝の近くは葉っぱを減らす (簡易的な回避)
            const distToTrunk = Math.sqrt(baseX * baseX + (baseY - trunkHeight/2) * (baseY - trunkHeight/2) + baseZ * baseZ);
            if (distToTrunk < trunkRadius * 2) continue; // 幹の近くを除外

            let foundValidPos = false;
            let attempts = 0;
            let finalX, finalY, finalZ;
            while (!foundValidPos && attempts < 10) { // 有効な位置が見つかるか、10回試行
                // ベース位置に少しだけランダム性を加える
                finalX = baseX + (Math.random() - 0.5) * 0.3;
                finalY = baseY + (Math.random() - 0.5) * 0.3;
                finalZ = baseZ + (Math.random() - 0.5) * 0.3;

                // 枝の位置とも比較 (簡易版: 枝の中心からの距離で判定)
                let tooCloseToBranch = false;
                for (let b = 0; b < numBranches; b++) {
                    // 枝の開始位置の計算 (createOptimizedTree と同様)
                    const branchStartHeightRatio = 0.2 + Math.random() * 0.6;
                    const branchStartY = trunkHeight * branchStartHeightRatio;
                    const branchAngleXZ = Math.random() * Math.PI * 2;
                    const branchAngleY = Math.PI / 6 + Math.random() * Math.PI / 3;
                    const branchDirection = new THREE.Vector3(
                        Math.sin(branchAngleY) * Math.cos(branchAngleXZ),
                        Math.cos(branchAngleY),
                        Math.sin(branchAngleY) * Math.sin(branchAngleXZ)
                    ).normalize();
                    const branchLength = 1.0 + Math.random() * 1.5;
                    // 枝の中点を計算
                    const branchMidpoint = new THREE.Vector3(0, branchStartY, 0)
                        .add(branchDirection.clone().multiplyScalar(branchLength / 2));

                    const distToBranch = new THREE.Vector3(finalX, finalY, finalZ).distanceTo(branchMidpoint);
                    if (distToBranch < 0.5) { // 枝の中心から0.5以内は除外
                         tooCloseToBranch = true;
                         break;
                    }
                }

                if (!tooCloseToBranch) {
                    foundValidPos = true;
                }
                attempts++;
            }

            if (foundValidPos) {
                // 回転、スケール、色を設定
                const rotation = new THREE.Euler(
                    Math.random() * Math.PI,
                    Math.random() * Math.PI,
                    Math.random() * Math.PI
                );
                const scale = new THREE.Vector3(
                    0.8 + Math.random() * 0.4,
                    0.8 + Math.random() * 0.4,
                    1.0 // Z軸方向は薄く保つ
                );
                const color = new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.2);

                leafData.push({
                    position: new THREE.Vector3(finalX, finalY, finalZ),
                    rotation: rotation,
                    scale: scale,
                    color: color
                });
            }
        }

        return leafData;
    }
}