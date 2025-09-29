// js/modules/terrain/Chunk.js
import * as THREE from 'three';
// import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'; // 不要に
import { BiomeManager } from '../biomes/BiomeManager.js'; // 不要に
// import * as CANNON from 'cannon-es'; // Heightfield が不要になったため、Cannon-es のインポートも不要

export class Chunk {
    constructor(x, y, z, size, biome, heights, physicsWorld, preloadedData = null) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = size;
        this.mesh = null;
        this.objects = [];
        this.isLoaded = false;
        this.biome = biome;
        this.physicsWorld = physicsWorld;
        this.heights = heights; // 以前追加した heights 配列

        if (preloadedData) {
            // --- 修正: プリロードされたデータからメッシュとオブジェクトを生成 ---
            console.log(`Chunk (${x}, ${y}, ${z}) using preloaded data.`);
            this.mesh = new THREE.Mesh(preloadedData.geometry, preloadedData.material);
            this.mesh.position.set(
                this.x * this.size + this.size / 2,
                this.y * this.size,
                this.z * this.size + this.size / 2
            );
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;

            // プリロードされた Feature データから InstancedMesh を作成
            if (preloadedData.featureData) {
                this.createInstancedMeshesFromPreloadedData(preloadedData.featureData);
            }
            // --- 修正 ここまて ---
        } else {
            // --- 修正: プリロードデータがない場合は通常通り生成 ---
            console.log(`Chunk (${x}, ${y}, ${z}) generating mesh on-demand.`);
            this.createMesh(); // 以前の createMesh メソッドを呼び出す
            // --- 修正 ここまて ---
        }

        this.isLoaded = true;
    }


    // --- 修正 ここまで ---

    createInstancedMeshesFromPreloadedData(featureData) {
        // featureData.trees から木の InstancedMesh を作成
        if (featureData.trees && featureData.trees.length > 0) {
            // 木用のジオメトリとマテリアル (例: ジャングルの木)
            // 実際には、objDef.type に応じて異なるジオメトリ/マテリアルを選択する必要がある
            // ここでは、簡略化のため、共通の木のジオメトリを使用
            const treeGeometry = new THREE.CylinderGeometry(0.1, 0.15, 2, 8); // 仮の幹
            const treeMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });

            const treeInstancedMesh = new THREE.InstancedMesh(treeGeometry, treeMaterial, featureData.trees.length);

            featureData.trees.forEach((data, index) => {
                treeInstancedMesh.setMatrixAt(index, data.matrix);
                if (data.color) {
                    treeInstancedMesh.setColorAt(index, data.color);
                }
            });
            treeInstancedMesh.instanceMatrix.needsUpdate = true;
            if (treeInstancedMesh.instanceColor) {
                 treeInstancedMesh.instanceColor.needsUpdate = true;
            }
            treeInstancedMesh.castShadow = true;
            treeInstancedMesh.receiveShadow = true;
            this.addObject(treeInstancedMesh); // addObject メソッドでチャンクに追加
            console.log(`Added preloaded tree InstancedMesh with ${featureData.trees.length} instances.`);
        }

        // featureData.grass から草の InstancedMesh を作成
        if (featureData.grass && featureData.grass.length > 0) {
            // 草用のジオメトリとマテリアル (例: 平面)
            const grassGeometry = new THREE.PlaneGeometry(0.1, 0.3); // 仮の草
            const grassMaterial = new THREE.MeshStandardMaterial({
                color: 0x7CFC00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.9
            });

            const grassInstancedMesh = new THREE.InstancedMesh(grassGeometry, grassMaterial, featureData.grass.length);

            featureData.grass.forEach((data, index) => {
                grassInstancedMesh.setMatrixAt(index, data.matrix);
                if (data.color) {
                    grassInstancedMesh.setColorAt(index, data.color);
                }
            });
            grassInstancedMesh.instanceMatrix.needsUpdate = true;
            if (grassInstancedMesh.instanceColor) {
                 grassInstancedMesh.instanceColor.needsUpdate = true;
            }
            grassInstancedMesh.castShadow = false; // 草は影を落とさないことが多い
            grassInstancedMesh.receiveShadow = true;
            this.addObject(grassInstancedMesh); // addObject メソッドでチャンクに追加
            console.log(`Added preloaded grass InstancedMesh with ${featureData.grass.length} instances.`);
        }

        // ... (他の Feature も同様に処理) ...
    }


    
    createMesh() {
        const geometry = new THREE.BufferGeometry();

        // チャンクの中心座標を使用して、バイオームを決定 (すでにコンストラクタで渡されている)
        // const worldCenterX = this.x * this.size + this.size / 2;
        // const worldCenterZ = this.z * this.size + this.size / 2;
        // const biome = this.biomeManager.getBiomeAt(worldCenterX, worldCenterZ);
        const biome = this.biome; // すでに保持している biome を使用
        console.log("Chunk Biome:", biome?.name, biome?.classification); // チャンクのバイオームをログ出力
        if (!biome) {
             console.error(`Biome is null/undefined for chunk (${this.x}, ${this.z})`);
             // ここで処理を中断するか、エラーマテリアルを設定
        }
        const material = biome.getMaterial(this.x * this.size, this.z * this.size) || new THREE.MeshStandardMaterial({ color: 0x00aa00 });

        const segments = 32; // 32x32 のグリッド
        const halfSize = this.size / 2;
        const segmentSize = this.size / segments;

        const vertices = [];
        const indices = [];
        const uvs = [];

        // --- 修正: 外部から渡された heights 配列を使用 ---
        // Generate terrain height using Perlin noise (for visual mesh)
        // const heights = [];
        // for (let z = 0; z <= segments; z++) {
        //     heights[z] = [];
        //     for (let x = 0; x <= segments; x++) {
        //         const worldX = this.x * this.size + x * segmentSize;
        //         const worldZ = this.z * this.size + z * segmentSize;
        //
        //         let height = biome.getHeight(worldX, worldZ);
        //         heights[z][x] = height;
        //
        //         // Add vertex
        //         vertices.push(
        //             x * segmentSize - halfSize,
        //             height,
        //             z * segmentSize - halfSize
        //         );
        //
        //         // Add UVs
        //         uvs.push(x / segments, 1 - z / segments);
        //     }
        // }
        // --- 修正 ここまて ---
        // --- 修正: 代わりに this.heights 配列を使用 ---
        for (let z = 0; z <= segments; z++) {
            for (let x = 0; x <= segments; x++) {
                const height = this.heights[z][x];

                // Add vertex
                vertices.push(
                    x * segmentSize - halfSize,
                    height,
                    z * segmentSize - halfSize
                );

                // Add UVs
                uvs.push(x / segments, 1 - z / segments);
            }
        }
        // --- 修正 ここまで ---


        // Create faces
        for (let z = 0; z < segments; z++) {
            for (let x = 0; x < segments; x++) {
                const a = x + (segments + 1) * z;
                const b = x + (segments + 1) * (z + 1);
                const c = x + 1 + (segments + 1) * (z + 1);
                const d = x + 1 + (segments + 1) * z;

                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        // Set geometry attributes
        geometry.setIndex(indices);
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

        // Compute normals for lighting
        geometry.computeVertexNormals();

        // Create the mesh
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(
            this.x * this.size + halfSize,
            this.y * this.size,
            this.z * this.size + halfSize
        );

        // Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // --- 修正: Y=0 のチャンクのみにオブジェクトを配置 ---
        // 物理コライダーは Player.js のロジックで処理するため、ここでは生成しない
        if (this.y === 0) {
            // biome.generateObjectsInChunk は、Chunk が持つ heights を参照できるようにするか、
            // World から渡されたオブジェクトリストを使用するか。
            // ここでは、World が生成したオブジェクトを addObject で追加する想定
            // (このロジックは World.js で処理される)
        }
        // --- 修正 ここまで ---

        // Mark as loaded
        this.isLoaded = true;
    }

    // Add objects to this chunk (trees, rocks, etc.)
    addObject(object) {
        if (this.mesh && object) {
            this.mesh.add(object);
            this.objects.push(object); // 追加したオブジェクトを配列に保持
        }
    }

    // Remove all objects from this chunk
    clearObjects() {
        this.objects.forEach(object => {
            if (object.parent === this.mesh) {
                this.mesh.remove(object);
            }

            // Dispose of geometry and material if needed
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        this.objects = []; // 配列をクリア
    }

    // Clean up resources
    dispose() {
        if (this.mesh) {
            // Remove all objects first
            this.clearObjects();

            // Dispose of the mesh
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose();
            }

            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose();
                }
            }

            // Remove from parent if attached
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
        }

        // --- 修正: Heightfield用の物理ボディが存在しないため、削除処理も不要 ---
        // if (this.physicsBody && this.physicsWorld) {
        //     this.physicsWorld.removeBody(this.physicsBody);
        // }
        // --- 修正 ここまで ---

        this.isLoaded = false;
    }
}