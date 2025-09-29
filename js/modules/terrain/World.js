// js/modules/terrain/World.js
import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { BiomeManager } from '../biomes/BiomeManager.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { WorldGenerator } from '../worldgen/WorldGenerator.js';
import { Preloader } from '../worldgen/Preloader.js';
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

        // Set up lighting
        this.setupLighting();

        // --- 修正: Preloader を初期化 ---
        this.preloader = new Preloader(this.biomeManager, new WorldGenerator(this, this.biomeManager, this.physicsWorld)); // WorldGenerator は一時的にインスタンス化
        // --- 修正 ここまて ---

        // --- 修正: WorldGenerator は Preloader の WorldGenerator を使う ---
        // this.worldGenerator = new WorldGenerator(this, this.biomeManager, this.physicsWorld);
        this.worldGenerator = this.preloader.worldGenerator; // Preloader が持つ WorldGenerator を再利用
        // --- 修正 ここまて ---
    }

    async initialize() {
        await this.preloader.preload();
        console.log("World initialization complete.");
    }

    setupLighting() {
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

            // 雲用のuniform
            uniform float cloudDensity; // 雲の基本密度
            uniform float cloudScale;   // 雲のスケール (大きさ)
            uniform vec3 cloudOffset;   // 雲のオフセット (動きや位置)

            // GLSL用のSimplexNoise関数 (ClassicNoise3D.glsl.js から正確に引用)
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; } // vec4 用も追加

            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }

            float snoise(vec3 v)
            {
                const vec2 C = vec2(1.0/6.0, 1.0/3.0) ;
                const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

                // First corner
                vec3 i  = floor(v + dot(v, C.yyy) );
                vec3 x0 =   v - i + dot(i, C.xxx) ;

                // Other corners
                vec3 g = step(x0.yzx, x0.xyz);
                vec3 l = 1.0 - g;
                vec3 i1 = min( g.xyz, l.zxy );
                vec3 i2 = max( g.xyz, l.zxy );

                vec3 x1 = x0 - i1 + C.xxx;
                vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
                vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

                // Permutations
                i = mod289(i);
                vec4 p = permute( permute( permute(
                           i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                         + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                         + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

                // Gradients: 7x7 points over a square, mapped onto an octahedron.
                // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
                float n_ = 0.142857142857; // 1.0/7.0
                vec3  ns = n_ * D.wyz - D.xzx; // 修正: C.yzx -> D.wyz, C.xxx -> D.xzx

                vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

                vec4 x_ = floor(j * ns.z);
                vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

                vec4 x = x_ *ns.x + ns.yyyy;
                vec4 y = y_ *ns.x + ns.yyyy;
                vec4 h = 1.0 - abs(x) - abs(y);

                vec4 b0 = vec4( x.xy, y.xy );
                vec4 b1 = vec4( x.zw, y.zw );

                //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
                //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
                vec4 s0 = floor(b0)*2.0 + 1.0;
                vec4 s1 = floor(b1)*2.0 + 1.0;
                vec4 sh = -step(h, vec4(0.0));

                vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
                vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

                vec3 p0 = vec3(a0.xy,h.x);
                vec3 p1 = vec3(a0.zw,h.y);
                vec3 p2 = vec3(a1.xy,h.z);
                vec3 p3 = vec3(a1.zw,h.w);

                //Normalise gradients
                vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
                p0 *= norm.x;
                p1 *= norm.y;
                p2 *= norm.z;
                p3 *= norm.w;

                // Mix final noise value
                vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
                m = m * m;
                return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                              dot(p2,x2), dot(p3,x3) ) );
            }

            void main() {
                vec3 direction = normalize(vNormal); // 視線方向

                // 太陽との角度 (cosine)
                float cosAngle = dot(direction, sunDirection);

                // Rayleigh Scattering (簡略化)
                float rayleighFactor = (1.0 + cosAngle * cosAngle);

                // 地平線付近を明るくする
                float horizonFactor = 1.0 - abs(direction.y);
                horizonFactor = pow(horizonFactor, 0.5);

                // 大気密度による影響
                float densityEffect = 1.0 + atmosphereDensity;

                // 基本の空の色に、Rayleigh散乱と地平線効果を適用
                vec3 skyColor = baseSkyColor * rayleighFactor * densityEffect;
                skyColor = mix(skyColor, vec3(1.0, 0.9, 0.7), horizonFactor * 0.3);

                // 雲の描画
                // フラグメントのワールド座標を使用してノイズを計算
                // Y成分を少し変化させることで、雲の高さ方向の変化を表現 (簡易版)
                vec3 cloudPos = (vWorldPos + cloudOffset) * cloudScale;
                cloudPos.y *= 0.5; // Y方向のスケールを調整して、雲が水平方向に広がるように

                float cloudNoise = snoise(cloudPos);

                // ノイズ値から雲のカバレッジを計算
                float cloudCoverage = smoothstep(cloudDensity - 0.1, cloudDensity + 0.1, cloudNoise);

                // 雲の色 (白っぽく、太陽光を考慮)
                vec3 cloudColor = vec3(1.0, 1.0, 1.0);
                // 太陽光で雲の一部を明るく
                float cloudSunEffect = 0.5 + 0.5 * cosAngle;
                cloudColor *= cloudSunEffect;

                // 雲と空の色を合成 (単純なブレンド)
                vec3 finalColor = mix(skyColor, cloudColor, cloudCoverage);

                // 太陽の位置に非常に明るい光を追加 (太陽そのもの)
                float sun = max(0.0, cosAngle);
                sun = pow(sun, 1000.0);
                vec3 sunColor = vec3(1.0, 0.9, 0.7);
                vec3 sunGlow = sunColor * sun * 5.0;

                gl_FragColor = vec4(finalColor + sunGlow, 1.0);
            }
        `;

        // 太陽の方向 (地面のシェーダーと一致させる)
        const sunDirection = new THREE.Vector3(0.2, 1.0, 0.0).normalize();
        // 太陽の位置 (非常に遠くに配置)
        const sunPosition = sunDirection.clone().multiplyScalar(10000);

        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: sunDirection },
                baseSkyColor: { value: new THREE.Color(0.5, 0.7, 1.0) }, // 基本の青空色
                atmosphereDensity: { value: 0.2 }, // 水蒸気量などの影響
                // 雲用のuniform
                cloudDensity: { value: 0.3 }, // 雲の基本密度 (0.0 ~ 1.0)
                cloudScale: { value: 0.001 }, // 雲のスケール (小さくするほど大きな雲に)
                cloudOffset: { value: new THREE.Vector3(0.0, 0.0, 0.0) } // 雲のオフセット (アニメーション用に使用可能)
            },
            vertexShader: skyVertexShader,
            fragmentShader: skyFragmentShader,
            side: THREE.BackSide,
            depthWrite: false,
            depthTest: false
        });

        const skyDome = new THREE.Mesh(skyDomeGeometry, skyMaterial);
        this.scene.add(skyDome);

        // --- 修正: 太陽 (ポイントライト) ---
        const sunLightIntensity = 1.5;
        const sunLightColor = 0xffffff;
        // const sunLightPosition = sunDirection.clone().multiplyScalar(10000); // これは上で定義済み

        const sunLight = new THREE.PointLight(sunLightColor, sunLightIntensity, 0, 2);
        sunLight.position.copy(sunPosition); // 定義済みの位置を使用
        this.scene.add(sunLight);

        // --- 修正: 影用の方向光 ---
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.copy(sunPosition); // 定義済みの位置を使用
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
        const ambientLight = new THREE.AmbientLight(0x404040, 1.0); // 強度を上げて影を明るく
        this.scene.add(ambientLight);
        // --- 修正 ここまで ---
    }


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

        // --- 修正: プリロードされたデータが存在するかチェック ---
        const preloadedData = this.preloader.getPreloadedChunkData(x, y, z);
        // --- 修正 ここまて ---

        let chunk;
        if (preloadedData) {
            // --- 修正: プリロードされたデータからチャンクを生成 ---
            console.log(`Using preloaded data for chunk (${x}, ${y}, ${z})`);
            chunk = new Chunk(x, y, z, this.CHUNK_SIZE, preloadedData.biome, preloadedData.heights, this.physicsWorld, preloadedData); // preloadedData を渡す
            // --- 修正 ここまて ---
        } else {
            // --- 修正: プリロードデータがない場合は通常通り生成 ---
            console.log(`Generating chunk (${x}, ${y}, ${z}) on-demand`);
            const CHUNK_SIZE = this.CHUNK_SIZE;
            const segments = 32;
            const segmentSize = this.CHUNK_SIZE / segments;
            const heights = [];

            for (let z_seg = 0; z_seg <= segments; z_seg++) {
                heights[z_seg] = [];
                for (let x_seg = 0; x_seg <= segments; x_seg++) {
                    const worldX = x * this.CHUNK_SIZE + x_seg * segmentSize;
                    const worldZ = z * this.CHUNK_SIZE + z_seg * segmentSize;
                    const heightResult = this.biomeManager.getBiomeAndHeightAt(worldX, 0, worldZ); // Y=0での高さ
                    heights[z_seg][x_seg] = heightResult.height;
                }
            }

            const biomeResult = this.biomeManager.getBiomeAndHeightAt(x * this.CHUNK_SIZE + this.CHUNK_SIZE / 2, 0, z * this.CHUNK_SIZE + this.CHUNK_SIZE / 2); // Y=0での高さ
            const biome = biomeResult.biome;

            chunk = new Chunk(x, y, z, this.CHUNK_SIZE, biome, heights, this.physicsWorld);
            // --- 修正 ここまて ---
        }

        this.chunks.set(key, chunk);
        this.scene.add(chunk.mesh);

        if (y === 0) {
            // Y=0 のチャンクのみに Feature を生成
            // プリロードデータがある場合は、すでに Feature も含まれているため、
            // ここでは WorldGenerator による追加生成はスキップするか、
            // preloadedData.featureData をチャンクに適用するロジックが必要
            if (!preloadedData) {
                 this.worldGenerator.generateFeaturesInChunk(x, y, z, this.CHUNK_SIZE);
                 this.worldGenerator.generateBiomeSpecificObjectsInChunk(x, y, z, this.CHUNK_SIZE);
            } else {
                // preloadedData.featureData をチャンクに適用
                // 例: chunk.applyPreloadedFeatureData(preloadedData.featureData);
                console.log(`Applied preloaded feature data to chunk (${x}, ${y}, ${z})`);
            }
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
        // Get player's chunk coordinates
        const playerChunkX = Math.floor(playerPosition.x / this.CHUNK_SIZE);
        const playerChunkY = Math.floor(playerPosition.y / this.CHUNK_SIZE);
        const playerChunkZ = Math.floor(playerPosition.z / this.CHUNK_SIZE);

        // Determine which chunks should be loaded
        const chunksToLoad = new Set();

        for (let dx = -this.RENDER_DISTANCE; dx <= this.RENDER_DISTANCE; dx++) {
            for (let dy = -this.RENDER_DISTANCE; dy <= this.RENDER_DISTANCE; dy++) {
                for (let dz = -this.RENDER_DISTANCE; dz <= this.RENDER_DISTANCE; dz++) {
                    const cx = playerChunkX + dx;
                    const cy = playerChunkY + dy;
                    const cz = playerChunkZ + dz;

                    // --- 修正: Y=0 のチャンクのみロード ---
                    if (cy === 0) {
                        chunksToLoad.add(this.getChunkKey(cx, cy, cz));
                        this.loadChunk(cx, cy, cz);
                    }
                    // --- 修正 ここまで ---
                }
            }
        }

        // Unload chunks that are too far away
        for (const [key, chunk] of this.chunks.entries()) {
            if (!chunksToLoad.has(key)) {
                const [cx, cy, cz] = key.split(',').map(Number);
                this.unloadChunk(cx, cy, cz);
            }
        }

        // --- 追加: グリッド単位の Feature (例: City) を生成 ---
        this.worldGenerator.generateGridBasedFeatures(playerPosition);
        // --- 追加 ここまで ---
    }

    // --- 修正: 古い getTerrainHeightAt を削除またはコメントアウト ---
    // getTerrainHeightAt(x, z) {
    //     const biome = this.biomeManager.getBiomeAt(x, z);
    //     return biome.getHeight(x, z);
    // }
    // --- 修正 ここまで ---

    // --- 追加: WorldGenerator から呼び出される、Chunk にオブジェクトを追加するメソッド ---
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
    // --- 追加 ここまて ---

    // --- 追加: ワールド座標から直接地形の高さを取得 ---
    getWorldTerrainHeightAt(x, z) {
        // biomeManager を使用して高さを取得
        // これは、Chunk.js の Heightfield が機能しない場合のフォールバック
        const result = this.biomeManager.getBiomeAndHeightAt(x, z);
        return result.height;
    }
    // --- 追加 ここまて ---

    // 物理ワールドを更新するメソッド
    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}