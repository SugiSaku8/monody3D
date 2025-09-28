// js/modules/biomes/BiomeManager.js
import { ImprovedNoise } from 'three/addons/math/ImprovedNoise.js';
// --- 修正: バイオームクラスのインポートを削除 ---
// import { TropicalRainforestBiome } from './TropicalRainforestBiome.js';
// import { ForestBiome } from './ForestBiome.js'; // 削除
// --- 修正 ここまで ---

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
  }

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

    let provisionalClassificationCode = 'BWh';
    if (temperature >= 18 && precipitation >= 600) {
      provisionalClassificationCode = 'Af';
    } else if (temperature >= 18 && precipitation >= 250 && precipitation < 600) {
      provisionalClassificationCode = 'Aw';
    } else if (temperature >= 18) {
      provisionalClassificationCode = 'Am';
    } else if (temperature >= 10 && temperature < 18 && precipitation >= 500) {
        provisionalClassificationCode = 'Cfb';
    } else if (temperature >= 10 && temperature < 18) {
        provisionalClassificationCode = 'Csa';
    } else if (temperature >= 0 && temperature < 10 && precipitation >= 300) {
        provisionalClassificationCode = 'Dfb';
    } else if (temperature >= 0 && temperature < 10) {
        provisionalClassificationCode = 'Dwb';
    } else if (temperature < 0 && precipitation >= 200) {
        provisionalClassificationCode = 'ET';
    } else if (temperature < 0) {
        provisionalClassificationCode = 'EF';
    } else {
      provisionalClassificationCode = 'BWh';
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
    if (altitudeAdjustedTemp >= 18 && precipitation >= 600) {
      finalClassificationCode = 'Af';
    } else if (altitudeAdjustedTemp >= 18 && precipitation >= 250 && precipitation < 600) {
      finalClassificationCode = 'Aw';
    } else if (altitudeAdjustedTemp >= 18) {
      finalClassificationCode = 'Am';
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18 && precipitation >= 500) {
        finalClassificationCode = 'Cfb';
    } else if (altitudeAdjustedTemp >= 10 && altitudeAdjustedTemp < 18) {
        finalClassificationCode = 'Csa';
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10 && precipitation >= 300) {
        finalClassificationCode = 'Dfb';
    } else if (altitudeAdjustedTemp >= 0 && altitudeAdjustedTemp < 10) {
        finalClassificationCode = 'Dwb';
    } else if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        finalClassificationCode = 'ET';
    } else if (altitudeAdjustedTemp < 0) {
        finalClassificationCode = 'EF';
    } else {
      finalClassificationCode = 'BWh';
    }

    if (provisionalHeight > 2000) {
        finalClassificationCode = 'H';
    }

    const finalBiome = this.biomes.get(finalClassificationCode) || provisionalBiome;
    const finalHeight = finalBiome.getHeight(x, z);

    return { biome: finalBiome, height: finalHeight };
  }
  // --- 修正 ここまで ---

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
    if (altitudeAdjustedTemp < 0 && precipitation >= 200) {
        adjustedClassificationCode = 'ET';
    } else if (altitudeAdjustedTemp < 0) {
        adjustedClassificationCode = 'EF';
    }
    if (y > 2000) {
        adjustedClassificationCode = 'H';
    }

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