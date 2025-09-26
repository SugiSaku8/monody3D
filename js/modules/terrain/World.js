// js/modules/terrain/World.js
import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { WorldGenerator } from '../worldgen/WorldGenerator.js';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.CHUNK_SIZE = 32;
        this.RENDER_DISTANCE = 2;

        // BiomeManager を初期化
        this.biomeManager = new BiomeManager();

        // PhysicsWorld を初期化して保持
        this.physicsWorld = new PhysicsWorld();

        // Set up lighting & sky
        this.setupLighting();

        // WorldGenerator を初期化
        this.worldGenerator = new WorldGenerator(this, this.biomeManager, this.physicsWorld);
    }

    setupLighting() {
        // --- 修正: 大気散乱風のスカイドーム ---
        const skyDomeGeometry = new THREE.SphereGeometry(5000, 32, 32); // 非常に大きな球

        // スカイドームシェーダーの頂点シェーダー
        const skyVertexShader = `
            varying vec3 vWorldPos;
            varying vec3 vNormal;

            void main() {
                vWorldPos = position;
                vNormal = normalize(position); // 球の場合は頂点がそのまま法線
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

        // スカイドームシェーダーのフラグメントシェーダー (大気散乱風)
        const skyFragmentShader = `
            varying vec3 vWorldPos;
            varying vec3 vNormal; // 視線方向 (正規化済み)
            uniform vec3 sunDirection; // 太陽の方向 (正規化済み)
            uniform vec3 baseSkyColor; // 基本の空の色
            uniform float atmosphereDensity; // 大気密度 (水蒸気量の影響を擬似的に表現)

            void main() {
                vec3 direction = normalize(vNormal); // 視線方向

                // 太陽との角度 (cosine)
                float cosAngle = dot(direction, sunDirection);

                // Rayleigh Scattering (簡略化)
                // 青い光 (短波長) がより強く散乱
                float rayleighFactor = (1.0 + cosAngle * cosAngle); // cos^2(theta) に比例

                // 地平線付近を明るくする (視線方向と地面が平行になるほど)
                float horizonFactor = 1.0 - abs(direction.y); // Yが0 (水平) で1.0, 1or-1 (垂直) で0
                horizonFactor = pow(horizonFactor, 0.5); // なめらかに変化

                // 大気密度による影響 (密度が高いと散乱が強くなる)
                float densityEffect = 1.0 + atmosphereDensity;

                // 基本の空の色に、Rayleigh散乱と地平線効果を適用
                vec3 skyColor = baseSkyColor * rayleighFactor * densityEffect;
                skyColor = mix(skyColor, vec3(1.0, 0.9, 0.7), horizonFactor * 0.3); // 地平線に少し暖色を混ぜる

                // 太陽の位置に非常に明るい光を追加 (太陽そのもの)
                float sun = max(0.0, cosAngle);
                sun = pow(sun, 1000.0); // 光の鋭さ (値を大きくするほど鋭くなる)
                vec3 sunColor = vec3(1.0, 0.9, 0.7); // 太陽の色
                vec3 sunGlow = sunColor * sun * 5.0; // 太陽の強さ

                gl_FragColor = vec4(skyColor + sunGlow, 1.0);
            }
        `;

        // 太陽の方向 (地面のシェーダーと一致させる)
        const sunDirection = new THREE.Vector3(0.2, 1.0, 0.0).normalize();

        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: sunDirection },
                baseSkyColor: { value: new THREE.Color(0.5, 0.7, 1.0) }, // 基本の青空色
                atmosphereDensity: { value: 0.5 } // 水蒸気量などの影響 (0.0 ~ 1.0 などで調整)
            },
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            side: THREE.BackSide // 球の内側から見えるように
        });

        const skyDome = new THREE.Mesh(skyDomeGeometry, skyMaterial);
        this.scene.add(skyDome);
        // --- 修正 ここまで ---

        // --- 修正: 太陽 (ポイントライト) ---
        const sunLightIntensity = 1.5;
        const sunLightColor = 0xffffff;
        const sunLightPosition = sunDirection.clone().multiplyScalar(10000);

        const sunLight = new THREE.PointLight(sunLightColor, sunLightIntensity, 0, 2);
        sunLight.position.copy(sunLightPosition);
        this.scene.add(sunLight);

        // --- 修正: 影用の方向光 ---
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.copy(sunLightPosition);
        directionalLight.position.normalize().multiplyScalar(10); // シーン内の適当な位置に
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        this.scene.add(directionalLight);

        // --- 修正: 環境光 ---
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        // --- 修正 ここまで ---
    }

    // ... (他のメソッドは変更なし) ...

    getChunkKey(x, y, z) {
        return `${x},${y},${z}`;
    }

    getChunkAt(x, y, z) {
        const key = this.getChunkKey(x, y, z);
        return this.chunks.get(key) || null;
    }

    loadChunk(x, y, z) {
        const key = this.getChunkKey(x, y, z);

        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }

        const chunk = new Chunk(x, y, z, this.CHUNK_SIZE, this.biomeManager, this.physicsWorld);
        this.chunks.set(key, chunk);
        this.scene.add(chunk.mesh);

        if (y === 0) {
            this.worldGenerator.generateFeaturesInChunk(x, y, z, this.CHUNK_SIZE);
        }

        return chunk;
    }

    unloadChunk(x, y, z) {
        const key = this.getChunkKey(x, y, z);
        const chunk = this.chunks.get(key);

        if (chunk) {
            this.scene.remove(chunk.mesh);
            chunk.dispose();
            this.chunks.delete(key);
        }
    }

    update(playerPosition) {
        const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
        const playerChunkY = Math.floor(playerPosition.y / this.CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);

        const chunksToLoad = new Set();

        for (let dx = -this.RENDER_DISTANCE; dx <= this.RENDER_DISTANCE; dx++) {
            for (let dy = -this.RENDER_DISTANCE; dy <= this.RENDER_DISTANCE; dy++) {
                for (let dz = -this.RENDER_DISTANCE; dz <= this.RENDER_DISTANCE; dz++) {
                    const cx = playerChunkX + dx;
                    const cy = playerChunkY + dy;
                    const cz = playerChunkZ + dz;

                    if (cy === 0) {
                        chunksToLoad.add(this.getChunkKey(cx, cy, cz));
                        this.loadChunk(cx, cy, cz);
                    }
                }
            }
        }

        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksToLoad.has(key)) {
                const [cx, cy, cz] = key.split(',').map(Number);
                this.unloadChunk(cx, cy, cz);
            }
        }

        this.worldGenerator.generateGridBasedFeatures(playerPosition);
    }

    addTreeToChunk(cx, cy, cz, treeMesh) {
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            chunk.addObject(treeMesh);
        } else {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found when adding tree.`);
        }
    }

    addGrassToChunk(cx, cy, cz, grassInstancedMesh) {
        const chunkKey = this.getChunkKey(cx, cy, cz);
        const chunk = this.chunks.get(chunkKey);
        if (chunk) {
            chunk.addObject(grassInstancedMesh);
        } else {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found when adding grass.`);
        }
    }

    getWorldTerrainHeightAt(x, z) {
        return this.biomeManager.getBiomeAt(x, z).getHeight(x, z);
    }

    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}