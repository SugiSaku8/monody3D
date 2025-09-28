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

  // --- 修正: getBiomeAndHeightAt メソッド (以前のロジックは変更なし、ただしフォールバックを調整) ---
  getBiomeAndHeightAt(x, z) {
    const baseElevation = this.elevationNoise.noise(x * this.elevationScale, z * this.elevationScale, 0) * 5000;
    const tempNoiseValue = this.temperatureNoise.noise(x * this.noiseScale, 0, z * this.noiseScale);
    const precipNoiseValue = this.precipitationNoise.noise(0, x * this.noiseScale, z * this.noiseScale);

    const temperature = tempNoiseValue * 30 + 15;
    const precipitation = Math.max(0, precipNoiseValue * 1000 + 500);

    let provisionalClassificationCode = 'BWh'; // デフォルトは乾燥
    if (temperature >= 18 && precipitation >= 600) {
      provisionalClassificationCode = 'Af'; // 熱帯雨林
    } else if (temperature >= 18 && precipitation >= 250 && precipitation < 600) {
      provisionalClassificationCode = 'Aw'; // サバナ (未実装)
    } else if (temperature >= 18) {
      provisionalClassificationCode = 'Am'; // 熱帯モンスーン (未実装)
    } else if (temperature >= 10 && temperature < 18 && precipitation >= 500) {
        provisionalClassificationCode = 'Cfb'; // 西岸海洋性
    } else if (temperature >= 10 && temperature < 18) {
        provisionalClassificationCode = 'Csa'; // 地中海性 (未実装)
    } else if (temperature >= 0 && temperature < 10 && precipitation >= 300) {
        provisionalClassificationCode = 'Dfb'; // 冷帯湿潤
    } else if (temperature >= 0 && temperature < 10) {
        provisionalClassificationCode = 'Dwb'; // 冷帯冬季少雨 (未実装)
    } else if (temperature < 0 && precipitation >= 200) {
        provisionalClassificationCode = 'ET'; // ツンドラ
    } else if (temperature < 0) {
        provisionalClassificationCode = 'EF'; // 氷雪 (未実装)
    } else {
      provisionalClassificationCode = 'BWh'; // 砂漠
    }

    const provisionalBiome = this.biomes.get(provisionalClassificationCode) || this.biomes.get('Unknown') || Array.from(this.biomes.values())[0] || null;

    if (!provisionalBiome) {
         console.error("No biomes registered in BiomeManager!");
         // フォールバックとして、空のダミーバイオームを返すか、エラーを投げる
         return { biome: { getHeight: () => 0, classification: 'Unknown' }, height: 0 };
    }

    const provisionalHeight = provisionalBiome.getHeight(x, z);
    const heightDifference = provisionalHeight - baseElevation;
    const lapseRate = 0.0065;
    const altitudeAdjustedTemp = temperature - (heightDifference * lapseRate);

    let finalClassificationCode = provisionalClassificationCode;
    // --- 修正例: classify ロジックを新しいバイオームに対応させる ---
    if (altitudeAdjustedTemp >= 18 && precipitation >= 600) {
      finalClassificationCode = 'Af'; // 熱帯雨林
    } else if (altitudeAdjustedTemp >= 18 && precipitation >= 250 && precipitation < 600) {
      finalClassificationCode = 'Aw'; // サバナ (未実装)
    } else if (altitudeAdjustedTemp >= 18) {
      finalClassificationCode = 'Am'; // 熱帯モンスーン (未実装)
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18 && precipitation >= 500) {
        finalClassificationCode = 'Cfb'; // 西岸海洋性
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18) {
        finalClassificationCode = 'Csa'; // 地中海性 (未実装)
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10 && precipitation >= 300) {
        finalClassificationCode = 'Dfb'; // 冷帯湿潤
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10) {
        finalClassificationCode = 'Dwb'; // 冷帯冬季少雨 (未実装)
    } else if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        finalClassificationCode = 'ET'; // ツンドラ
    } else if (altitudeAdjustedTemp < 0) {
        finalClassificationCode = 'EF'; // 氷雪 (未実装)
    } else {
      finalClassificationCode = 'BWh'; // 砂漠
    }
    // --- 修正例 ここまで ---

    if (provisionalHeight > 2000) { // 例: 2000m以上
        finalClassificationCode = 'H'; // 高山気候
    }

    const finalBiome = this.biomes.get(finalClassificationCode) || provisionalBiome;
    const finalHeight = finalBiome.getHeight(x, z);

    return { biome: finalBiome, height: finalHeight };
  }
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