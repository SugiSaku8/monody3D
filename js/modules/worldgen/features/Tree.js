// js/modules/worldgen/features/Tree.js
import * as THREE from 'three';

// --- 追加: 簡易的なノイズ関数 (Math.random の代わりに使用可能) ---
// Perlin Noise や Simplex Noise は外部ライブラリが必要なので、ここでは簡易的な実装
// function pseudoRandomNoise(x, y, z, seed = 0) {
//     // 例: 乱数シードを含めたハッシュ関数 (完全なノイズではないが、一貫性のある疑似乱数)
//     // 実装は複雑になるため、ここでは Math.random に依存
//     // 代わりに、生成前にシードを固定する方法もある
// }
// --- 追加 ここまで ---

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
            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // --- 修正: より複雑な木構造を生成 ---
            const treeGroup = this.createComplexTree(terrainHeight);
            // --- 修正 ここまで ---

            // チャンクのローカル座標系に変換
            treeGroup.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            // チャンクに追加
            this.world.addTreeToChunk(cx, cy, cz, treeGroup);
        }
    }

    // --- 追加: 複雑な木構造を生成するメソッド ---
    createComplexTree(groundY) {
        const treeGroup = new THREE.Group();

        // 木全体のパラメータ (ランダム性を追加)
        const treeHeight = 3 + Math.random() * 4; // 3.0 から 7.0
        const trunkBaseRadius = 0.15 + Math.random() * 0.1; // 0.15 から 0.25
        const trunkSegments = 8;

        // --- 幹の生成 (曲がる可能性あり) ---
        const trunkCurvePoints = [];
        const trunkRadiusPoints = [];
        let currentY = groundY;
        let currentRadius = trunkBaseRadius;
        let currentDirection = new THREE.Vector3(0, 1, 0); // 初期方向: 上

        for (let y = 0; y < treeHeight; y += 0.5) { // 0.5 単位でポイントを打つ
            trunkCurvePoints.push(new THREE.Vector3(0, currentY, 0)); // XZは0から始める
            trunkRadiusPoints.push(currentRadius);

            // 次のポイントの方向をランダムに変える (曲がる)
            const angleVariation = (Math.random() - 0.5) * 0.2; // 小さな角度変化
            const twistVariation = (Math.random() - 0.5) * 0.1; // 扭れ
            const nextDirection = currentDirection.clone().applyAxisAngle(new THREE.Vector3(0,1,0), twistVariation).applyAxisAngle(new THREE.Vector3(1,0,0).cross(currentDirection), angleVariation).normalize();
            currentDirection.copy(nextDirection);

            // Yを進める
            currentY += currentDirection.y * 0.5;
            // 半径を減らす (上に行くほど細く)
            currentRadius = trunkBaseRadius * (1 - (y / treeHeight) * 0.7); // 最大で30%細く
        }

        // 幹のジオメトリを生成 (簡易的にPathとRadiusでTubeを生成)
        // Three.js には直接的な 'Variable Radius Curve' メッシュ生成機能がないため、
        // ここでは複数の円柱を連結して近似します。
        // より高度な方法として、`THREE.TubeGeometry` にカスタムパスを与える方法もある
        for (let j = 0; j < trunkCurvePoints.length - 1; j++) {
            const p1 = trunkCurvePoints[j];
            const p2 = trunkCurvePoints[j + 1];
            const r1 = trunkRadiusPoints[j];
            const r2 = trunkRadiusPoints[j + 1];

            const segmentGeometry = new THREE.CapsuleGeometry(Math.min(r1, r2), p1.distanceTo(p2), 4, 8);
            const segmentMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);

            // セグメントをp1からp2の方向に配置
            const direction = new THREE.Vector3().subVectors(p2, p1).normalize();
            const midpoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
            segment.position.copy(midpoint);

            // セグメントの回転を方向に合わせる
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
            segment.quaternion.copy(quaternion);

            treeGroup.add(segment);
        }

        // --- 枝の生成 ---
        const numBranches = Math.floor(Math.random() * 3) + 2; // 2~4本
        for (let b = 0; b < numBranches; b++) {
            // 幹の途中から枝を出す (上部ほど多い)
            const branchStartRatio = 0.4 + Math.random() * 0.5; // 40% ~ 90% の高さ
            const startIndex = Math.floor(branchStartRatio * (trunkCurvePoints.length - 1));
            const branchStartPoint = trunkCurvePoints[startIndex];
            const branchStartRadius = trunkRadiusPoints[startIndex];

            // 枝の方向 (上方向から外側にそれる)
            const branchDirection = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 0.5 + 0.5, // 上方向成分を保つ
                (Math.random() - 0.5) * 2
            ).normalize();

            // 枝の長さと太さ
            const branchLength = 0.5 + Math.random() * 1.5;
            const branchRadius = branchStartRadius * (0.3 + Math.random() * 0.3); // 30~60% の太さ

            // 枝のジオメトリ (Capsuleで近似)
            const branchGeometry = new THREE.CapsuleGeometry(branchRadius, branchLength, 4, 8);
            const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
            const branch = new THREE.Mesh(branchGeometry, branchMaterial);

            // 枝の位置と回転
            branch.position.copy(branchStartPoint);
            const up = new THREE.Vector3(0, 1, 0);
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, branchDirection);
            branch.quaternion.copy(quaternion);
            // 長さ分だけ先に移動
            branch.position.add(branchDirection.clone().multiplyScalar(branchLength / 2));

            treeGroup.add(branch);

            // 枝の先端に葉っぱの塊を追加
            this.addFoliageCluster(treeGroup, branch.position, 0.8 + Math.random() * 0.5); // 半径にランダム性
        }

        // 幹の上部にも葉っぱの塊を追加
        const topPoint = trunkCurvePoints[trunkCurvePoints.length - 1];
        this.addFoliageCluster(treeGroup, topPoint, 1.0 + Math.random() * 0.8);

        return treeGroup;
    }

    // --- 追加: 葉っぱの塊を追加するヘルパーメソッド ---
    addFoliageCluster(parentGroup, position, radius) {
        const numFoliage = Math.floor(radius * 10) + 5; // 半径に応じた量

        for (let f = 0; f < numFoliage; f++) {
            // 葉っぱの塊を構成する個々の葉
            const leafGeometry = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 6, 6); // サイズにランダム性
            const leafMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.2), // 色にランダム性 (緑系)
                transparent: true,
                opacity: 0.9
            });

            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);

            // 親の位置から半径内にランダム配置
            const offset = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize().multiplyScalar(Math.random() * radius);

            leaf.position.copy(position).add(offset);

            parentGroup.add(leaf);
        }
    }
    // --- 追加 ここまで ---
}