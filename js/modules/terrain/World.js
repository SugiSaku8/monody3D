// js/modules/terrain/terrain/World.js
import * as THREE from 'three';
import { Chunk } from './Chunk.js';
import { PhysicsWorld } from '../physics/PhysicsWorld.js';
import { WorldGenerator } from '../worldgen/WorldGenerator.js';
import { TropicalRainforestBiome } from '../biomes/TropicalRainforestBiome.js';
import { ForestBiome } from '../biomes/ForestBiome.js'; // 必要に応じて追加
import { BiomeManager } from '../biomes/BiomeManager.js';
export class World {
    constructor(scene) {
        this.scene = scene;
        this.chunks = new Map();
        this.CHUNK_SIZE = 32;
        this.RENDER_DISTANCE = 2;

        // --- 修正: BiomeManager を初期化 ---
        this.biomeManager = new BiomeManager();
        // --- 修正 ここまて ---

        // --- 追加: バイオームを BiomeManager に登録 ---
        this.registerBiomes();
        // --- 追加 ここまて ---

        this.physicsWorld = new PhysicsWorld();
        this.setupLighting();
        this.worldGenerator = new WorldGenerator(this, this.biomeManager, this.physicsWorld);
    }

    // --- 追加: バイオームを登録するメソッド ---
    registerBiomes() {
        // 1. バイオームクラスのインスタンスを生成
        const tropicalRainforestBiome = new TropicalRainforestBiome();
        const forestBiome = new ForestBiome(); // フォールバック用
        // const savannaBiome = new SavannaBiome();
        // ... (他のバイオームも同様にインスタンス化)

        // 2. BiomeManager に登録
        this.biomeManager.registerBiome('Af', tropicalRainforestBiome);
        this.biomeManager.registerBiome('Forest', forestBiome); // フォールバック
        // this.biomeManager.registerBiome('Aw', savannaBiome);
        // ... (他のバイオームも登録)
        console.log("Biomes registered with BiomeManager.");
    }
    getWorldTerrainHeightAt(x, z) {
        // 1. バイオームを取得 (高度0として仮計算)
        const tempBiome = this.biomeManager.getBiomeAt(x, 0, z); // 一時的な取得
        // 2. そのバイオームのgetHeightで仮の高さを計算
        const tempHeight = tempBiome.getHeight(x, z);
        // 3. その高さを使って、正式なバイオームを取得
        const finalBiome = this.biomeManager.getBiomeAt(x, tempHeight, z);
        // 4. 正式なバイオームのgetHeightで最終高さを計算
        return finalBiome.getHeight(x, z);
        // 注: これは理想的ではない。最適化の余地あり。
        // 例えば、BiomeManagerが地形高さを直接計算するか、
        // 別の方法で高さとバイオームを同時計算する仕組みが必要。
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

        // スカイドームシェーダーのフラグメントシェーダー (大気散乱 + 雲)
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

        // --- 修正: 太陽の方向と位置の初期値を計算 ---
        // 初期 gameTime は 0.25 (日の出) とする
        this.gameTime = 0.25;
        const initialSunInfo = this.calculateSunPositionAndDirection(this.gameTime);
        const initialSunDirection = initialSunInfo.direction;
        const initialSunPosition = initialSunInfo.position;
        // --- 修正 ここまで ---

        const skyMaterial = new THREE.ShaderMaterial({
            uniforms: {
                sunDirection: { value: initialSunDirection },
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

        this.skyDome = new THREE.Mesh(skyDomeGeometry, skyMaterial); // this. で参照できるように
        this.scene.add(this.skyDome);

        // --- 修正: 太陽 (ポイントライト) ---
        const sunLightIntensity = 1.5;
        const sunLightColor = 0xffffff;
        // const sunLightPosition = initialSunPosition; // これは上で定義済み

        this.sunLight = new THREE.PointLight(sunLightColor, sunLightIntensity, 0, 2);
        this.sunLight.position.copy(initialSunPosition); // 定義済みの位置を使用
        this.scene.add(this.sunLight);
        // --- 修正 ここまで ---

        // --- 修正: 影用の方向光 ---
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.directionalLight.position.copy(initialSunPosition); // 定義済みの位置を使用
        this.directionalLight.position.normalize().multiplyScalar(10); // シーン内の適当な位置に
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1014;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.left = -50;
        this.directionalLight.shadow.camera.right = 50;
        this.directionalLight.shadow.camera.top = 50;
        this.directionalLight.shadow.camera.bottom = -50;
        this.directionalLight.shadow.camera.near = 0.25;
        this.directionalLight.shadow.camera.far = 250;
        this.scene.add(this.directionalLight);
        // --- 修正 ここまで ---

        // --- 修正: 視覚的な太陽オブジェクト (距離と半径を調整) ---
        const sunVisualRadius = 50; // 半径を大きく
        const sunVisualDistance = 1000; // 距離を短く
        const sunVisualGeometry = new THREE.SphereGeometry(sunVisualRadius, 16, 16);
        const sunVisualMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFF00, // 明るい黄色
            emissive: 0xFFFF00, // 自己発光色も黄色
            emissiveIntensity: 1.0 // 自己発光の強さ
        });
        this.sunVisual = new THREE.Mesh(sunVisualGeometry, sunVisualMaterial);
        // 初期位置は、初期の太陽方向 * 距離
        this.sunVisual.position.copy(initialSunDirection.clone().multiplyScalar(sunVisualDistance));
        this.scene.add(this.sunVisual);
        // --- 修正 ここまで ---

        // --- 修正: 環境光 ---
        const ambientLight = new THREE.AmbientLight(0x404040, 1.14);
        this.scene.add(ambientLight);
        // --- 修正 ここまで ---
    }

    // --- 追加: ゲーム内時間に基づいて太陽の方向と位置を計算するメソッド ---
    calculateSunPositionAndDirection(timeOfDay) {
        // timeOfDay: 0.0 (真夜中) から 1.0 (次の真夜中) まで
        // 0.25 = 日の出, 0.5 = 昼, 0.75 = 日没

        // 角度をラジアンに変換 (0 -> 0度, 1.0 -> 360度)
        const angle = timeOfDay * Math.PI * 2;

        // 太陽の方向を計算 (Y-Z平面で回転, Yが上)
        // 例: 0.25 (日の出) -> angle = PI/2 -> dir = (0, 1, 0)
        //     0.5 (昼) -> angle = PI -> dir = (0, 0, -1)
        //     0.75 (日没) -> angle = 3PI/2 -> dir = (0, -1, 0)
        const sunDirection = new THREE.Vector3(
            0, // X成分は固定 (南北方向に動かない)
            Math.sin(angle),
            -Math.cos(angle) // Z成分を -cos にして、北(+)から南(-)へ動くように
        ).normalize();

        // 視覚的な太陽の位置 (スカイドームの内側に配置)
        // 距離はスカイドームの半径より少し内側にする
        const sunVisualDistance = 4900;
        const sunPosition = sunDirection.clone().multiplyScalar(sunVisualDistance);

        return { direction: sunDirection, position: sunPosition };
    }
    // --- 追加 ここまで ---

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
    
        // --- 修正: チャンクの高さデータを事前に計算 ---
        const CHUNK_SIZE = this.CHUNK_SIZE;
        const segments = 32;
        const segmentSize = CHUNK_SIZE / segments;
        const heights = [];
    
        for (let z_seg = 0; z_seg <= segments; z_seg++) {
          heights[z_seg] = [];
          for (let x_seg = 0; x_seg <= segments; x_seg++) {
            const worldX = x * CHUNK_SIZE + x_seg * segmentSize;
            const worldZ = z * CHUNK_SIZE + z_seg * segmentSize;
    
            // BiomeManager から高さを取得 (Y=0 での高さを基準)
            const heightResult = this.biomeManager.getBiomeAndHeightAt(worldX, worldZ);
            heights[z_seg][x_seg] = heightResult.height;
          }
        }
    
        // biomeManager から biome インスタンスを取得
        const biomeResult = this.biomeManager.getBiomeAndHeightAt(x * CHUNK_SIZE + CHUNK_SIZE / 2, z * CHUNK_SIZE + CHUNK_SIZE / 2);
        const biome = biomeResult.biome;
    
        // biomeManager と physicsWorld を渡す (必要に応じて、Y=0以外のチャンクに物理コライダーがある場合)
        // biome と heights を Chunk コンストラクタに渡す
        const chunk = new Chunk(x, y, z, CHUNK_SIZE, biome, heights, this.physicsWorld);
        // --- 修正 ここまで ---
        this.chunks.set(key, chunk);
        this.scene.add(chunk.mesh);
    
        // チャンクロード時に WorldGenerator で Feature を生成
        if (y === 0) { // 例として Y=0 のチャンクのみに限定
          this.worldGenerator.generateFeaturesInChunk(x, y, z, CHUNK_SIZE);
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

    // --- 修正: update メソッドで gameTime を更新し、太陽を動かす ---
    update(playerPosition) {
        // --- 追加: ゲーム内時間を更新 (例: 1日 = 10分) ---
        this.gameTime += 0.0001; // 適宜調整
        if (this.gameTime >= 1.0) {
            this.gameTime = 0.0;
        }
        // --- 追加 ここまで ---

        // --- 追加: 太陽の位置と方向を計算 ---
        const sunInfo = this.calculateSunPositionAndDirection(this.gameTime);
        const sunDirection = sunInfo.direction;
        const sunPosition = sunInfo.position;
        // --- 追加 ここまで ---

        // --- 追加: 視覚的な太陽の位置を更新 ---
        // 視覚的な太陽は、スカイドームの内側に配置する (距離をスカイドーム半径より少し小さく)
        const sunVisualDistance = 4900;
        this.sunVisual.position.copy(sunDirection.clone().multiplyScalar(sunVisualDistance));
        // --- 追加 ここまで ---

        // --- 追加: ポイントライトと方向光の位置を更新 ---
        this.sunLight.position.copy(sunPosition);
        this.directionalLight.position.copy(sunPosition);
        this.directionalLight.position.normalize().multiplyScalar(10); // シーン内の適当な位置に
        // --- 追加 ここまで ---

        // --- 追加: スカイドームシェーダーの sunDirection uniform を更新 ---
        this.skyDome.material.uniforms.sunDirection.value.copy(sunDirection);
        // --- 追加 ここまで ---

        // --- 追加: 雲のオフセットを更新 (太陽の動きに連動) ---
        // this.skyDome.material.uniforms.cloudOffset.value.x += 0.01; // 適宜調整
        // this.skyDome.material.uniforms.cloudOffset.value.z += 0.005; // 適宜調整
        // --- 追加 ここまで ---


        // --- 修正: チャンクの更新ロジック ---
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
        // --- 修正 ここまで ---
    }
    // --- 修正 ここまで ---

    // WorldGenerator から呼び出される、Chunk にオブジェクトを追加するメソッド
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

    // ワールド座標から直接地形の高さを取得
    getWorldTerrainHeightAt(x, z) {
        return this.biomeManager.getBiomeAt(x, z).getHeight(x, z);
    }

    // 物理ワールドを更新するメソッド
    updatePhysics(deltaTime) {
        this.physicsWorld.update(deltaTime);
    }
}