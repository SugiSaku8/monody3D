// js/modules/terrain/Chunk.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
// import { BiomeManager } from '../biomes/BiomeManager.js'; // 不要 (World.js から渡される)
// import * as CANNON from 'cannon-es'; // Heightfield が不要になったため、Cannon-es のインポートも不要

export class Chunk {
    // --- 修正: コンストラクタの引数に biomeManager を追加 ---
    constructor(x, y, z, size, biomeManager, physicsWorld) {
    // --- 修正 ここまて ---
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = size;
        this.mesh = null;
        this.objects = [];
        this.isLoaded = false;
        // --- 修正: biomeManager をプロパティに保存 ---
        this.biomeManager = biomeManager;
        // --- 修正 ここまて ---
        this.physicsWorld = physicsWorld; // 必要に応じて削除 (Y=0のコライダーが不要なら)
        // this.physicsBody = null; // Heightfield用の物理ボディは不要

        // Create the chunk mesh
        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.BufferGeometry();

        // チャンクの中心座標を使用して、バイオームを決定
        const worldCenterX = this.x * this.size + this.size / 2;
        const worldCenterZ = this.z * this.size + this.size / 2;
        // --- 修正: biomeManager からバイオームと高さを取得 ---
        const biomeResult = this.biomeManager.getBiomeAndHeightAt(worldCenterX, 0, worldCenterZ); // Y=0での高さを基準
        const biome = biomeResult.biome;
        const baseHeight = biomeResult.height;
        // --- 修正 ここまて ---
        const material = biome.getMaterial(worldCenterX, worldCenterZ) || new THREE.MeshStandardMaterial({ color: 0x00aa00 });

        const segments = 32; // 32x32 のグリッド
        const halfSize = this.size / 2;
        const segmentSize = this.size / segments;

        const vertices = [];
        const indices = [];
        const uvs = [];

        // Generate terrain height using Perlin noise (for visual mesh)
        const heights = [];
        for (let z = 0; z <= segments; z++) {
            heights[z] = [];
            for (let x = 0; x <= segments; x++) {
                const worldX = this.x * this.size + x * segmentSize;
                const worldZ = this.z * this.size + z * segmentSize;

                // --- 修正: biome から高さを取得 ---
                let height = biome.getHeight(worldX, worldZ);
                // --- 修正 ここまて ---
                heights[z][x] = height;

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
        // --- 修正 ここまて ---

        // Mark as loaded
        this.isLoaded = true;
    }

    // Add objects to this chunk (trees, rocks, etc.)
    addObject(object) {
        if (this.mesh && object) {
            this.mesh.add(object);
            this.objects.push(object);
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

        this.objects = [];
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
        // --- 修正 ここまて ---

        this.isLoaded = false;
    }
}