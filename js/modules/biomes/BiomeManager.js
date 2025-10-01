// js/modules/biomes/BiomeManager.js
import * as THREE from 'three';
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
// --- 追加: 新しいバイオームクラスをインポート ---
import { TropicalRainforestBiome } from './TropicalRainforestBiome.js'; // Af
import { HotDesertBiome } from './HotDesertBiome.js'; // BWh
import { TemperateHumidBiome } from './TemperateHumidBiome.js'; // Cfb
import { ColdHumidBiome } from './ColdHumidBiome.js'; // Dfb
import { TundraBiome } from './TundraBiome.js'; // ET
import { HighlandBiome } from './HighlandBiome.js'; // H
// フォールバック用 (必要に応じて ForestBiome などからインポート)
// import { ForestBiome } from './ForestBiome.js';
import { Biome } from './Biome.js'; // 基本のBiomeクラスをフォールバックに使用
// --- 追加 ここまで ---

export class BiomeManager {
  constructor() {
    // --- 修正: バイオームを保持するマップを初期化 ---
    this.biomes = new Map();
    // --- 修正 ここまて ---

    this.noiseScale = 0.001;
    this.elevationScale = 0.0005;
    this.temperatureNoise = new ImprovedNoise();
    this.precipitationNoise = new ImprovedNoise();
    this.elevationNoise = new ImprovedNoise();

    // --- 追加: バイオームを登録 ---
    this.registerDefaultBiomes();
    // --- 追加 ここまで ---
  }

  // --- 追加: デフォルトのバイオームを登録するメソッド ---
  registerDefaultBiomes() {
    // 1. 各バイオームクラスのインスタンスを生成
    const tropicalRainforestBiome = new TropicalRainforestBiome(); // Af
    const hotDesertBiome = new HotDesertBiome(); // BWh
    const temperateHumidBiome = new TemperateHumidBiome(); // Cfb
    const coldHumidBiome = new ColdHumidBiome(); // Dfb
    const tundraBiome = new TundraBiome(); // ET
    const highlandBiome = new HighlandBiome(); // H

    // フォールバック用の汎用バイオーム (例: 緑の草地)
    // const fallbackBiome = new ForestBiome(); // ForestBiome をフォールバックに使う場合
    const fallbackBiome = new Biome(
      'Generic Grassland',
      'Unknown',
      15,
      500,
      50,
      {},
      { density: 0.3, color: new THREE.Color(0x7CFC00) }
    );

    // 2. BiomeManager に登録
    this.registerBiome('Af', tropicalRainforestBiome);
    this.registerBiome('BWh', hotDesertBiome);
    this.registerBiome('Cfb', temperateHumidBiome);
    this.registerBiome('Dfb', coldHumidBiome);
    this.registerBiome('ET', tundraBiome);
    this.registerBiome('H', highlandBiome);

    // フォールバックを登録 (キーは任意、ここでは 'Unknown' とする)
    this.registerBiome('Unknown', fallbackBiome);
    console.log("Default biomes registered with BiomeManager.");
  }
  // --- 追加 ここまて ---

  // --- 追加: バイオームを登録するメソッド ---
  registerBiome(code, biomeInstance) {
      if (typeof code !== 'string' || !biomeInstance) {
          console.error("Invalid arguments for registerBiome. Code must be a string and biomeInstance must be an object.");
          return;
      }
      this.biomes.set(code, biomeInstance);
      console.log(`Biome '${code}' registered.`);
  }
  // --- 追加 ここまで ---

  // --- 修正: getBiomeAndHeightAt メソッドが存在することを確認・追加 ---
  /**
   * 指定されたワールド座標 (x, z) におけるバイオームと地形の高さを取得します。
   * @param {number} x - ワールドX座標
   * @param {number} y - ワールドY座標 (高度補正に使用)
   * @param {number} z - ワールドZ座標
   * @returns {{ biome: Biome, height: number }} バイオームインスタンスと高さ
   */
  getBiomeAndHeightAt(x, y, z) {
    // 1. 基準高度マップからその地点の「基準高度」を取得
    const baseElevation = this.elevationNoise.noise(x * this.elevationScale, z * this.elevationScale, 0) * 5000;

    // 2. 温度マップと降水量マップを生成
    const tempNoiseValue = this.temperatureNoise.noise(x * this.noiseScale, 0, z * this.noiseScale);
    const precipNoiseValue = this.precipitationNoise.noise(0, x * this.noiseScale, z * this.noiseScale);

    // 3. ノイズ値を実際の気温や降水量に変換
    const temperature = tempNoiseValue * 30 + 15; // -15°C ~ +45°C
    const precipitation = Math.max(0, precipNoiseValue * 1000 + 500); // 0mm ~ 1500mm

    // 4. 実際の高度 (y) と基準高度 (baseElevation) の差を計算
    const heightDifference = y - baseElevation;

    // 5. 高度補正 (Lapse Rate: 高度が上がると気温が下がる)
    const lapseRate = 0.0065; // 6.5°C/100m
    const altitudeAdjustedTemp = temperature - (heightDifference * lapseRate);

    // 6. 気候分類コード (Köppenなど) を決定
    let classificationCode = 'Unknown';
    if (altitudeAdjustedTemp >= 18 && precipitation >= 600) {
      classificationCode = 'Af'; // 熱帯雨林
    } else if (altitudeAdjustedTemp >= 18 && precipitation >= 250 && precipitation < 600) {
      classificationCode = 'Aw'; // サバナ
    } else if (altitudeAdjustedTemp >= 18) {
      classificationCode = 'Am'; // 熱帯モンスーン
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18 && precipitation >= 500) {
        classificationCode = 'Cfb'; // 西岸海洋性
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18) {
        classificationCode = 'Csa'; // 地中海性
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10 && precipitation >= 300) {
        classificationCode = 'Dfb'; // 冷帯湿潤
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10) {
        classificationCode = 'Dwb'; // 冷帯冬季少雨
    } else if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        classificationCode = 'ET'; // ツンドラ
    } else if (altitudeAdjustedTemp < 0) {
        classificationCode = 'EF'; // 氷雪
    } else {
      classificationCode = 'BWh'; // 砂漠
    }

    // 7. 高度が極端に高い場合、高山気候(H)に上書き
    if (y > 2000) { // 例: 2000m以上
        classificationCode = 'H';
    }

    // 8. 最終的なバイオームを取得
    const finalBiome = this.biomes.get(classificationCode) || this.biomes.get('Forest') || Array.from(this.biomes.values())[0] || null;

    if (!finalBiome) {
         console.error("No biomes registered in BiomeManager!");
         // フォールバックとして、空のダミーバイオームを返す
         return { biome: { getHeight: () => 0, classification: 'Unknown' }, height: 0 };
    }

    // 9. バイオームから高さを取得
    const finalHeight = finalBiome.getHeight(x, z);

    return { biome: finalBiome, height: finalHeight };
  }
  // --- 修正 ここまて ---
  // --- 修正 ここまて ---

  getBiomeAt(x, y, z) {
    const result = this.getBiomeAndHeightAt(x, z);
    const baseBiome = result.biome;
    const baseHeight = result.height;

    const baseElevation = this.elevationNoise.noise(x * this.elevationScale, z * this.elevationScale, 0) * 5000;
    const heightDifference = y - baseElevation;
    const lapseRate = 0.0065;
    const tempNoiseValue = this.temperatureNoise.noise(x * this.noiseScale, 0, z * this.noiseScale);
    const temperature = tempNoiseValue * 30 + 15;
    const altitudeAdjustedTemp = temperature - (heightDifference * lapseRate);

    const precipNoiseValue = this.precipitationNoise.noise(0, x * this.noiseScale, z * this.noiseScale);
    const precipitation = Math.max(0, precipNoiseValue * 1000 + 500);

    let adjustedClassificationCode = baseBiome.classification;
    // --- 修正: getBiomeAt 内の微調整ロジックも更新 ---
    if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        adjustedClassificationCode = 'ET'; // 高山でも非常に寒ければツンドラ
    } else if (altitudeAdjustedTemp < 0) {
        adjustedClassificationCode = 'EF'; // 高山でも非常に寒ければ氷雪 (未実装)
    }
    // 高度が極端に高い場合、高山気候(H)に上書き (getBiomeAndHeightAt で既に処理されているが念のため)
    if (y > 2000) {
        adjustedClassificationCode = 'H';
    }
    // --- 修正 ここまて ---

    return this.biomes.get(adjustedClassificationCode) || baseBiome;
  }

  getAllBiomes() {
    // Map からオブジェクトに変換して返す (必要に応じて)
    const biomesObj = {};
    for (const [key, value] of this.biomes) {
        biomesObj[key] = value;
    }
    return biomesObj;
  }
}