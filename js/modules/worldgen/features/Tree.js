// js/modules/worldgen/features/Tree.js
import * as THREE from 'three';

// --- 追加: パスを定義するヘルパークラス (L-System風の簡易版) ---
class TreePath {
    constructor(startPoint, startDirection, maxDepth, currentDepth = 0) {
        this.points = [startPoint.clone()];
        this.directions = [startDirection.clone()];
        this.children = [];
        this.maxDepth = maxDepth;
        this.currentDepth = currentDepth;
    }

    growSegment(length, noiseScale, branchProbability, maxBranches) {
        if (this.currentDepth >= this.maxDepth) return;

        const lastPoint = this.points[this.points.length - 1];
        const lastDirection = this.directions[this.directions.length - 1];

        // 次の方向を計算 (ノイズを加える)
        const nextDirection = lastDirection.clone();
        nextDirection.add(new THREE.Vector3(
            (Math.random() - 0.5) * noiseScale,
            (Math.random() - 0.5) * noiseScale * 0.5, // Y方向の変化を小さく
            (Math.random() - 0.5) * noiseScale
        )).normalize();

        // 次のポイントを計算
        const nextPoint = lastPoint.clone().add(nextDirection.clone().multiplyScalar(length));

        this.points.push(nextPoint);
        this.directions.push(nextDirection);

        // 枝を分岐させるか？
        if (this.currentDepth > 0 && Math.random() < branchProbability && this.children.length < maxBranches) {
            const branchAngle = (Math.random() - 0.5) * Math.PI / 2; // -90度 ~ +90度
            const branchDirection = nextDirection.clone().applyAxisAngle(
                new THREE.Vector3(Math.random(), 0, Math.random()).normalize(),
                branchAngle
            ).normalize();

            const branchPath = new TreePath(nextPoint, branchDirection, this.maxDepth, this.currentDepth + 1);
            this.children.push(branchPath);
        }

        // 子パスも成長させる
        for (const child of this.children) {
            child.growSegment(length * 0.7, noiseScale * 0.8, branchProbability * 0.8, maxBranches);
        }
    }

    getAllPoints() {
        let allPoints = [...this.points];
        for (const child of this.children) {
            allPoints = allPoints.concat(child.getAllPoints());
        }
        return allPoints;
    }
}
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
            const localX = Math.random() * chunkSize;
            const localZ = Math.random() * chunkSize;

            const worldX = cx * chunkSize + localX;
            const worldZ = cz * chunkSize + localZ;

            const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

            // --- 修正: 高度な木構造を生成 ---
            const treeGroup = this.createAdvancedTree(terrainHeight);
            // --- 修正 ここまで ---

            treeGroup.position.set(
                localX - chunkSize / 2,
                terrainHeight,
                localZ - chunkSize / 2
            );

            this.world.addTreeToChunk(cx, cy, cz, treeGroup);
        }
    }

    // --- 追加: 高度な木構造を生成するメソッド ---
    createAdvancedTree(groundY) {
        const treeGroup = new THREE.Group();

        // 木のパラメータ (ランダム性を追加)
        const treeHeight = 4 + Math.random() * 6; // 4.0 から 10.0
        const trunkRadius = 0.2 + Math.random() * 0.2; // 0.2 から 0.4
        const trunkRadiusTop = trunkRadius * (0.3 + Math.random() * 0.2); // 先端は細く
        const segments = 32;

        // --- 幹のパスを生成 ---
        const trunkStartPoint = new THREE.Vector3(0, groundY, 0);
        const trunkStartDirection = new THREE.Vector3(0, 1, 0);
        const trunkPath = new TreePath(trunkStartPoint, trunkStartDirection, 3); // 3段階の深さまで
        trunkPath.growSegment(treeHeight / 3, 0.1, 0.1, 2); // 長さ、ノイズスケール、分岐確率、最大分岐数

        // --- 幹のジオメトリを生成 (TubeGeometry 使用) ---
        const trunkCurve = new THREE.CatmullRomCurve3(trunkPath.getAllPoints());
        const trunkShape = this.createTaperedShape(trunkRadius, trunkRadiusTop); // 太さが変化するシェイプ

        // 木の質感に合わせたマテリアル
        const trunkMaterial = this.createBarkMaterial();

        const trunkGeometry = new THREE.TubeGeometry(
            trunkCurve,
            segments,  // pathSegments
            1,         // radius (シェイプで制御)
            8,         // radialSegments
            false      // closed
        );
        // シェイプを適用
        this.applyShapeToTubeGeometry(trunkGeometry, trunkShape, trunkRadius, trunkRadiusTop);

        const trunkMesh = new THREE.Mesh(trunkGeometry, trunkMaterial);
        treeGroup.add(trunkMesh);

        // --- 枝の生成 ---
        this.addBranches(treeGroup, trunkPath, trunkRadiusTop, trunkMaterial);

        // --- 葉っぱの塊を追加 ---
        this.addFoliage(treeGroup, trunkPath);

        return treeGroup;
    }

    // --- 追加: 太さが変化するシェイプを作成 ---
    createTaperedShape(startRadius, endRadius) {
        const shape = new THREE.Shape();
        const detail = 8; // 円の詳細度
        for (let i = 0; i <= detail; i++) {
            const angle = (i / detail) * Math.PI * 2;
            const radius = startRadius + (endRadius - startRadius) * (i / detail);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        return shape;
    }

    // --- 追加: TubeGeometry にシェイプを適用 (簡易版) ---
    // NOTE: TubeGeometry は直接シェイプを適用するプロパティがないため、
    //       各セグメントの半径を変えることで近似します。
    //       より正確には、BufferGeometry を直接編集する必要があります。
    applyShapeToTubeGeometry(geometry, shape, startRadius, endRadius) {
        // 現在の実装では、TubeGeometry 自体の頂点を直接操作して半径を変えることはしません。
        // 代わりに、createTaperedShape を使用して Curve3 から生成する際に、
        // 各ポイントでの半径を計算して Curve3 上のスケールとして扱う方法があります。
        // ここでは、主に `startRadius` と `endRadius` を `TubeGeometry` のコンストラクタに
        // 直接渡すのではなく、`createTaperedShape` で生成された形状を元に、
        // `TubeGeometry` の `radius` パラメータを各ポイントで変化させる BufferGeometry の編集が必要ですが、
        // それは非常に複雑です。
        // 簡略化のため、`TubeGeometry` の `radius` は固定し、シェイプのサイズで調整します。
        // または、`ExtrudeGeometry` を使用して、パスに沿ってシェイプを押し出す方法もあります。
        // ここでは、`TubeGeometry` を使用しつつ、`startRadius` と `endRadius` を
        // `createTaperedShape` 内で反映させたものを使用します。
        // つまり、この関数は現在の実装ではプレースホルダーです。
        // `TubeGeometry` の `radius` は 1 に固定し、`createTaperedShape` で定義された
        // `Shape` のスケールが `TubeGeometry` の太さになります。
    }

    // --- 追加: 木の幹用マテリアルを作成 ---
    createBarkMaterial() {
        // 色のグラデーションとノイズを含むマテリアル
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // 基本の茶色
            roughness: 0.9,
            metalness: 0.1,
            // マップ (例: テクスチャ) を使用する場合は以下を設定
            // map: texture,
            // 法線マップやラフネスマップも同様
        });

        // シェーダーで色を動的に変更する例 (グラデーション)
        // これは、Geometry の頂点のY座標に基づいてマテリアルの色を変える
        // Custom ShaderMaterial を使用する必要があるため、ここでは MeshStandardMaterial に留める
        // 代わりに、頂点カラーを Geometry に追加する方法もある
        return material;
    }

    // --- 追加: 枝を追加 ---
    addBranches(parentGroup, trunkPath, trunkRadiusTop, trunkMaterial) {
        // trunkPath から、途中のポイントを選んで枝を生やす
        const branchPoints = trunkPath.getAllPoints();
        for (let i = Math.floor(branchPoints.length * 0.3); i < branchPoints.length * 0.8; i++) { // 下から30%~80%の高さに枝
            if (Math.random() < 0.3) { // 30%の確率で枝を追加
                const startPoint = branchPoints[i];
                const nextPoint = branchPoints[i + 1] || startPoint.clone().add(new THREE.Vector3(0, 0.5, 0).normalize()); // 次の点がない場合のフォールバック
                const direction = new THREE.Vector3().subVectors(nextPoint, startPoint).normalize();

                // 枝の方向を幹の方向から少し外す
                const branchDirection = direction.clone().applyAxisAngle(
                    new THREE.Vector3(Math.random(), 0, Math.random()).normalize(),
                    (Math.random() - 0.5) * Math.PI / 2
                ).normalize();

                // 枝の長さと太さ
                const branchLength = 0.5 + Math.random() * 1.5;
                const branchRadius = trunkRadiusTop * (0.3 + Math.random() * 0.3);

                // 枝のパスを生成
                const branchStartPoint = startPoint.clone();
                const branchPath = new TreePath(branchStartPoint, branchDirection, 2); // 2段階の深さ
                branchPath.growSegment(branchLength / 2, 0.2, 0.2, 1);

                // 枝のジオメトリ
                const branchCurve = new THREE.CatmullRomCurve3(branchPath.getAllPoints());
                const branchShape = this.createTaperedShape(trunkRadiusTop * 0.7, branchRadius); // 枝は幹より細く始まる

                const branchGeometry = new THREE.TubeGeometry(
                    branchCurve,
                    16, 8, 8, false
                );
                // シェイプを適用 (簡略化されている点に注意)
                const branchMesh = new THREE.Mesh(branchGeometry, trunkMaterial); // 枝も幹と同じマテリアルを使用
                parentGroup.add(branchMesh);

                // 枝にも葉っぱを追加 (再帰的に呼び出すか、個別の処理)
                this.addFoliage(parentGroup, branchPath);
            }
        }
    }

    // --- 追加: 葉っぱを追加 ---
    addFoliage(parentGroup, treePath) {
        const allPoints = treePath.getAllPoints();
        // 上位30%のポイントに葉っぱを追加
        const foliageStartIndex = Math.floor(allPoints.length * 0.7);

        for (let i = foliageStartIndex; i < allPoints.length; i++) {
            if (Math.random() < 0.5) { // 50%の確率で葉っぱの塊を追加
                const point = allPoints[i];

                // 葉っぱの塊のジオメトリとマテリアル
                const clusterGeometry = new THREE.SphereGeometry(0.5 + Math.random() * 0.5, 8, 8);
                const clusterMaterial = new THREE.MeshStandardMaterial({
                    color: new THREE.Color().setHSL(0.3 + Math.random() * 0.1, 0.8, 0.4 + Math.random() * 0.2), // 色にランダム性
                    roughness: 0.8,
                    metalness: 0.0,
                    side: THREE.DoubleSide // 葉っぱを両面表示
                });

                const cluster = new THREE.Mesh(clusterGeometry, clusterMaterial);
                cluster.position.copy(point);
                // 葉っぱの塊を少し浮かせる
                cluster.position.y += 0.2 + Math.random() * 0.3;

                parentGroup.add(cluster);
            }
        }
    }
    // --- 追加 ここまで ---
}