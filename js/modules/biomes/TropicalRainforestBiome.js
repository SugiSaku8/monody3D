// js/modules/biomes/TropicalRainforestBiome.js
import * as THREE from 'three';
// import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js'; // getHeight で使用する場合
import { Biome } from './Biome.js'; // 親クラスをインポート

/**
 * 熱帯雨林気候 (Af) バイオーム
 * 常に高温多雨。ジャングルが広がる。
 * 木の間隔が非常に狭く、雨が多い。背の高い木が多く、ジャングル特有の生態系が見られる。
 */
export class TropicalRainforestBiome extends Biome {
  constructor() {
    super(
      'Tropical Rainforest',
      'Af',
      25,
      2000,
      90,
      {
        heightScale: 1.5,
        noiseFrequency: 0.01,
        noiseOctaves: 4,
        treeTypes: [
            { type: 'jungle_tree', density: 1.0, properties: { color: 0x228B22 } },
            { type: 'vine', density: 0.8, properties: { color: 0x32CD32 } },
            { type: 'fern', density: 0.5, properties: { color: 0x2E8B57 } }
        ]
      },
      {
        density: 0.9,
        color: new THREE.Color(0x228B22)
      }
    );
  }

  getHeight(x, z) {
    const perlin = new ImprovedNoise(); // getHeight 内でノイズインスタンスを生成
    let height = 0;
    let amplitude = 1;
    let frequency = this.config.noiseFrequency || 0.01;

    for (let i = 0; i < (this.config.noiseOctaves || 4); i++) {
      height += perlin.noise(x * frequency, 0, z * frequency) * amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return height * (this.config.heightScale || 1.0) * 15;
  }

  // --- 修正: getMaterial メソッドを強化 ---
  getMaterial(x, z) {
    // 1. 親クラスのシェーダーマテリアルを取得 (Biome.js で定義されている)
    const material = super.getMaterial(x, z);

    // 2. このバイオーム特有の uniform を設定
    if (material && material.uniforms) {
      // a. ジャングル特有のベースカラー (より濃い緑)
      //    親クラスの baseSkyColor とは別に、地形の色を調整する uniform が必要
      //    例: baseTerrainColor を追加 (Biome.js のシェーダーも修正が必要)
      //    ここでは、暫定的に baseSkyColor を流用して調整してみる
      // material.uniforms.baseSkyColor.value = new THREE.Color(0x1a5d1a); // より濃い緑

      // b. 将来的なテクスチャ対応の準備
      //    例: grassTexture, dirtTexture, rockTexture を this.config から取得
      //    そして、material.uniforms に設定
      //    これには、Biome.js のシェーダーに uniform sampler2D を追加する必要がある
      //    今のところは色調整に留める

      // c. 色の調整: uniform が直接 terrain color に関係しない場合、
      //    material.color を直接変更することも可能 (ただし ShaderMaterial では効果がないことが多い)
      //    material.color = new THREE.Color(0x1a5d1a);

      // d. シェーダー内での色調整: 最も効果的な方法は、シェーダー自体を変更すること
      //    例えば、Biome.js のシェーダーに #define BIOME_JUNGLE のようなディレクティブを追加し、
      //    フラグメントシェーダー内で色を変える
      //    または、uniform として biomeType や colorMultiplier を渡す

      // 簡単な方法: material.uniforms に新しい uniform を追加して、シェーダーで使う
      // ただし、Biome.js のシェーダーが対応している必要がある
      // material.uniforms.jungleColorMultiplier = { value: new THREE.Vector3(0.8, 1.2, 0.8) }; // 緑を強調

      // 今回は、シェーダーの変更を最小限に抑え、ベースカラーを濃くすることで対応
      // Biome.js のシェーダーが baseSkyColor を地形色としても使っている場合に効果的
      // (実際には baseTerrainColor のような uniform が望ましい)
      material.uniforms.baseSkyColor.value = new THREE.Color(0x1a5d1a); // より濃いジャングルグリーン
    }

    return material;
  }
  // --- 修正 ここまで ---

  getObjects() {
    return this.config.treeTypes || [];
  }

  getTraits() {
      return ['High Humidity', 'Frequent Rain', 'Dense Vegetation'];
  }

  getDescription() {
      return "A hot, humid jungle biome with dense vegetation and tall trees.";
  }
}