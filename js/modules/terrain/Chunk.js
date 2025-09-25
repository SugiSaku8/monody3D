// js/modules/terrain/Chunk.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
import { BiomeManager } from '../biomes/BiomeManager.js';

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
        this.physicsWorld = physicsWorld;

        // Create the chunk mesh
        this.createMesh();
    }

    createMesh() {
        const geometry = new THREE.BufferGeometry();

        // チャンクの中心座標を使用して、バイオームを決定 (シェーダー用のパラメータに使用可能)
        const worldCenterX = this.x * this.size + this.size / 2;
        const worldCenterZ = this.z * this.size + this.size / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, worldCenterZ);
        // biome.getMaterial(worldCenterX, worldCenterZ) は使わない

        const segments = 32;
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

                // Add UVs (テクスチャやシェーダーで使用)
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

        // --- 修正: ShaderMaterial を使用 ---
        const material = this.createGradientMaterial(biome, worldCenterX, worldCenterZ);

        // Create the mesh
        this.mesh = new THREE.Mesh(geometry, material);
        // --- 修正 ここまで ---

        this.mesh.position.set(
            this.x * this.size + halfSize,
            this.y * this.size,
            this.z * this.size + halfSize
        );

        // Enable shadows
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        // Y=0 のチャンクのみにオブジェクトを配置 (Tree.js などによる)
        if (this.y === 0) {
            // WorldGenerator が処理するため、ここでは何もしない
        }

        // Mark as loaded
        this.isLoaded = true;
    }

    // --- 追加: グラデーション用の ShaderMaterial を作成するメソッド ---
    createGradientMaterial(biome, worldCenterX, worldCenterZ) {
        // フラグメントシェーダー (ピクセル単位の色計算)
        const fragmentShader = `
            // varying は頂点シェーダーから受け取る変数
            varying vec3 vWorldPosition; // 頂点のワールド座標
            varying vec2 vUv;           // UV座標

            // uniforms はJavaScriptからシェーダーに渡す定数
            uniform float uTerrainHeightScale; // 高さスケール (必要に応じて)
            uniform vec3 uColorLow;    // 低い位置の色 (例: 土)
            uniform vec3 uColorHigh;   // 高い位置の色 (例: 草)

            void main() {
                // 頂点のY座標 (ワールド座標) を元に色を決定
                // Y座標を正規化して 0.0 から 1.0 の範囲にする
                // 例: Y座標が -10 から 10 まで変化する場合、(-10 + 10) / 20 = 0, (10 + 10) / 20 = 1
                // ここでは、適当な範囲 (例: -5 から 15) を想定
                float minHeight = -5.0;
                float maxHeight = 15.0;
                float normalizedY = (vWorldPosition.y - minHeight) / (maxHeight - minHeight);
                normalizedY = clamp(normalizedY, 0.0, 1.0); // 0.0-1.0にクランプ

                // 色を補間
                vec3 color = mix(uColorLow, uColorHigh, normalizedY);

                // もしくは、より複雑なグラデーション (例: より多くの色)
                // vec3 color = mix(uColorLow, vec3(0.5, 0.3, 0.1), normalizedY * 0.5);
                // color = mix(color, uColorHigh, normalizedY * 0.5 + 0.5);

                // マテリアルの出力色を設定
                gl_FragColor = vec4(color, 1.0);
            }
        `;

        // 頂点シェーダー (頂点座標の変換と、フラグメントシェーダーへのデータ受け渡し)
        const vertexShader = `
            // attribute はBufferGeometryから受け取る変数
            attribute vec3 position;
            attribute vec2 uv;

            // varying はフラグメントシェーダーに渡す変数
            varying vec3 vWorldPosition;
            varying vec2 vUv;

            // uniforms
            uniform mat4 modelMatrix; // チャンクの位置など

            void main() {
                // モデル行列を掛けてワールド座標を計算
                vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
                vUv = uv;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        // シェーダーに渡す uniforms
        const uniforms = {
            uTerrainHeightScale: { value: 1.0 }, // 必要に応じて
            uColorLow: { value: new THREE.Color(0.54, 0.27, 0.07) }, // 茶色 (土)
            uColorHigh: { value: new THREE.Color(0.13, 0.55, 0.13) }  // 緑 (草)
        };

        // シェーダーマテリアルを作成
        const material = new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            // wireframe: true, // デバッグ用
            // side: THREE.DoubleSide, // 表裏両面表示 (必要に応じて)
        });

        return material;
    }
    // --- 追加 ここまで ---

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

            // --- 修正: ShaderMaterial も破棄 ---
            if (this.mesh.material) {
                if (Array.isArray(this.mesh.material)) {
                    this.mesh.material.forEach(material => material.dispose());
                } else {
                    this.mesh.material.dispose(); // ShaderMaterial の破棄
                }
            }
            // --- 修正 ここまで ---

            // Remove from parent if attached
            if (this.mesh.parent) {
                this.mesh.parent.remove(this.mesh);
            }
        }

        this.isLoaded = false;
    }
}