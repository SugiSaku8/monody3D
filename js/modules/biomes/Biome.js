// js/modules/biomes/Biome.js
import * as THREE from 'three';

// --- 修正: GLSL用のSimplexNoise関数 (定義順序と型を修正) ---
// すべての permute と mod289 のオーバーロードを、snoise より前に定義
const glslSimplexNoise = `
// --- 修正: 必要な mod289 と permute のオーバーロードを定義 ---
// 依存関係を考慮して、順序を正しく配置
vec2 mod289(vec2 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute(vec3 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}
// --- 修正 ここまで ---

// 3D simplex noise
//
float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

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
  i = mod289(i); // i は vec3, mod289(vec3) が定義されている
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

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

// --- 追加: FBM (Fractional Brownian Motion) ---
float fbm(vec3 x, int octaves, float lacunarity, float gain) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float maxValue = 0.0;

    for(int i = 0; i < octaves; i++) {
        value += amplitude * snoise(x * frequency);
        maxValue += amplitude;

        amplitude *= gain;
        frequency *= lacunarity;
    }

    return value / maxValue;
}

// --- 追加: より細かいノイズを生成する関数 ---
float detailedNoise(vec3 x, int detailOctaves, float detailLacunarity, float detailGain, float baseFbmValue) {
    float highFreqFbm = fbm(x * 10.0, detailOctaves, detailLacunarity, detailGain);
    return baseFbmValue + 0.1 * highFreqFbm;
}
`;
// --- 修正 ここまで ---

const vertexShader = `
    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    // SimplexNoise 関数をインクルード
    ${glslSimplexNoise}

    // テクスチャの uniform
    uniform sampler2D grassTexture;
    uniform sampler2D dirtTexture;
    uniform sampler2D rockTexture;
    uniform sampler2D sandTexture;

    // テクスチャスケール (tile)
    uniform float textureScale;

    // ノイズスケールとFBMパラメータ
    uniform float noiseScale;
    uniform int fbmOctaves;
    uniform float fbmLacunarity;
    uniform float fbmGain;
    // --- 追加: 詳細ノイズ用のパラメータ ---
    uniform int detailOctaves;
    uniform float detailLacunarity;
    uniform float detailGain;
    // --- 追加 ここまで ---

    // スロープパラメータ
    uniform float slopeThresholdGrassToRock;
    uniform float slopeThresholdRockToSand;

    varying vec3 vWorldPos;
    varying vec3 vNormal;

    void main() {
        // テクスチャ座標 (ワールド座標から計算)
        vec2 texCoord = vWorldPos.xz * textureScale;

        // SimplexNoise と FBM を使用して基本的な地形パターンを生成
        vec3 noiseInput = vec3(texCoord, 0.0) * noiseScale;
        float baseNoise = fbm(noiseInput, fbmOctaves, fbmLacunarity, fbmGain);

        // --- 修正: より細かいノイズを適用 ---
        float detailedBaseNoise = detailedNoise(noiseInput, detailOctaves, detailLacunarity, detailGain, baseNoise);
        // --- 修正 ここまで ---

        // ノイズ値から各テクスチャの「出現確率」的な重みを計算
        float grassWeight = smoothstep(-0.2, 0.3, detailedBaseNoise);
        float dirtWeight = smoothstep(-0.5, 0.0, detailedBaseNoise) * (1.0 - grassWeight);
        float rockWeight = smoothstep(0.1, 0.6, detailedBaseNoise);
        float sandWeight = smoothstep(0.4, 0.9, detailedBaseNoise);

        // スロープ（傾き）を計算 (法線のY成分から)
        float slope = 1.0 - abs(vNormal.y);

        // スロープに基づいて重みを調整
        float slopeFactorGrass = 1.0 - smoothstep(slopeThresholdGrassToRock, slopeThresholdGrassToRock + 0.1, slope);
        float slopeFactorRock = smoothstep(slopeThresholdGrassToRock, slopeThresholdGrassToRock + 0.1, slope);
        float slopeFactorSand = smoothstep(slopeThresholdRockToSand, slopeThresholdRockToSand + 0.1, slope);

        grassWeight *= slopeFactorGrass;
        dirtWeight *= slopeFactorGrass; // 土も平坦な場所に多い
        rockWeight *= slopeFactorRock;
        sandWeight *= slopeFactorSand;

        // 重みの合計を計算し、正規化
        float totalWeight = grassWeight + dirtWeight + rockWeight + sandWeight;
        if (totalWeight > 0.0) {
             grassWeight /= totalWeight;
             dirtWeight /= totalWeight;
             rockWeight /= totalWeight;
             sandWeight /= totalWeight;
        } else {
             grassWeight = 0.0;
             dirtWeight = 1.0; // デフォルトは土
             rockWeight = 0.0;
             sandWeight = 0.0;
        }

        // 各テクスチャをサンプリング
        vec3 grassTex = texture2D(grassTexture, texCoord).rgb;
        vec3 dirtTex = texture2D(dirtTexture, texCoord).rgb;
        vec3 rockTex = texture2D(rockTexture, texCoord).rgb;
        vec3 sandTex = texture2D(sandTexture, texCoord).rgb;

        // --- 修正: 土の質感をさらに荒っぽく、細かく ---
        float dirtNoise = snoise(noiseInput * 10.0);
        vec3 dirtTexRough = dirtTex * (0.9 + 0.1 * dirtNoise);

        // 重みに基づいてテクスチャをブレンド
        vec3 finalColor = grassWeight * grassTex +
                          dirtWeight * dirtTexRough +
                          rockWeight * rockTex +
                          sandWeight * sandTex;

        // 法線に基づくライティング (簡易版)
        float lighting = max(0.2, dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))));

        gl_FragColor = vec4(finalColor * lighting, 1.0);
    }
`;

export class Biome {
  constructor(name, config = {}, grassConfig = {}) {
    this.name = name;
    this.config = config;
    this.grassConfig = {
        density: grassConfig.density || 0,
        color: grassConfig.color || new THREE.Color(0x228B22),
    };
  }

  getHeight(x, z) {
    return 0;
  }

  getMaterial(x, z) {
    // テクスチャをロード (開発用の色テクスチャ)
    const generateColorTexture = (color) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = color.getStyle();
        context.fillRect(0, 0, 64, 64);
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    };

    const grassTexture = generateColorTexture(new THREE.Color(0x228B22));
    const dirtTexture = generateColorTexture(new THREE.Color(0x8B7355));
    const rockTexture = generateColorTexture(new THREE.Color(0x808080));
    const sandTexture = generateColorTexture(new THREE.Color(0xF4A460));

    const uniforms = {
        grassTexture: { value: grassTexture },
        dirtTexture: { value: dirtTexture },
        rockTexture: { value: rockTexture },
        sandTexture: { value: sandTexture },
        textureScale: { value: 0.05 },
        noiseScale: { value: 0.1 },
        fbmOctaves: { value: 6 },
        fbmLacunarity: { value: 2.1 },
        fbmGain: { value: 0.45 },
        // --- 追加: 詳細ノイズ用のuniform ---
        detailOctaves: { value: 4 },
        detailLacunarity: { value: 2.2 },
        detailGain: { value: 0.4 },
        // --- 追加 ここまで ---
        slopeThresholdGrassToRock: { value: 0.3 },
        slopeThresholdRockToSand: { value: 0.7 }
    };

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        // wireframe: true, // デバッグ用
    });

    return material;
  }

  getObjects() {
    return [];
  }

  getGrassData() {
      return this.grassConfig;
  }

  generateObjectsInChunk(cx, cz, chunkSize) {
    const objects = [];
    const biomeObjects = this.getObjects();
    const startX = cx * chunkSize;
    const startZ = cz * chunkSize;

    for (const objDef of biomeObjects) {
      const count = Math.floor(objDef.density * chunkSize * chunkSize);
      for (let i = 0; i < count; i++) {
        const localX = Math.random() * chunkSize;
        const localZ = Math.random() * chunkSize;
        const worldX = startX + localX;
        const worldZ = startZ + localZ;

        const worldY = this.getHeight(worldX, worldZ);

        objects.push({
          type: objDef.type,
          position: new THREE.Vector3(localX - chunkSize / 2, worldY, localZ - chunkSize / 2),
          ...objDef.properties
        });
      }
    }
    return objects;
  }
}