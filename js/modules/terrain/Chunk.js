// js/modules/terrain/Chunk.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
// import * as CANNON from 'cannon-es'; // Heightfield が不要になったため、Cannon-es のインポートも不要

export class Chunk {
    constructor(x, y, z, size, biomeManager, physicsWorld) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.size = size;
        this.mesh = null;
        this.objects = [];
        this.isLoaded = false;
        this.biomeManager = biomeManager;
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
        const biome = this.biomeManager.getBiomeAt(worldCenterX, worldCenterZ);
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

                let height = biome.getHeight(worldX, worldZ);
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
            // バイオームからオブジェクトを生成して追加
            const objectsToPlace = biome.generateObjectsInChunk(this.x, this.z, this.size);
            objectsToPlace.forEach(objData => {
                let objectMesh;
                if (objData.type === 'tree') {
                    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.2, 1, 8);
                    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
                    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);

                    const leavesGeometry = new THREE.SphereGeometry(0.8, 8, 8);
                    const objColor = objData.properties && objData.properties.color ? objData.properties.color : 0x228B22; // デフォルト色
                    const leavesMaterial = new THREE.MeshStandardMaterial({ color: objColor });
                    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
                    leaves.position.y = 1.5; // 木の幹の上に乗せる

                    objectMesh = new THREE.Group();
                    objectMesh.add(trunk);
                    objectMesh.add(leaves);
                } else if (objData.type === 'cactus') {
                    // カクタスの例
                    const cactusGeometry = new THREE.BoxGeometry(0.3, 1.5, 0.3);
                    const objColor = objData.properties && objData.properties.color ? objData.properties.color : 0x32CD32; // デフォルト色
                    const cactusMaterial = new THREE.MeshStandardMaterial({ color: objColor });
                    objectMesh = new THREE.Mesh(cactusGeometry, cactusMaterial);
                } else if (objData.type === 'rock') {
                    const rockGeometry = new THREE.DodecahedronGeometry(0.4, 0);
                    const objColor = objData.properties && objData.properties.color ? objData.properties.color : 0x808080; // デフォルト色
                    const rockMaterial = new THREE.MeshStandardMaterial({ color: objColor });
                    objectMesh = new THREE.Mesh(rockGeometry, rockMaterial);
                } else {
                    // その他の基本的なオブジェクト
                    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
                    const objColor = objData.properties && objData.properties.color ? objData.properties.color : 0xCCCCCC; // デフォルト色
                    const material = new THREE.MeshStandardMaterial({ color: objColor });
                    objectMesh = new THREE.Mesh(geometry, material);
                }
                objectMesh.position.copy(objData.position);
                this.addObject(objectMesh);
            });

            // Heightfield の生成は削除
            // this.createPhysicsColliderWithHeightfield(segments, segmentSize);
        }
        // --- 修正 ここまで ---

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
        // --- 修正 ここまで ---

        this.isLoaded = false;
    }
}