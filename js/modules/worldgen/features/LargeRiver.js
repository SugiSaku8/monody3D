// js/modules/worldgen/features/LargeRiver.js
import { River } from './River.js';

export class LargeRiver extends River {
    generateFromOcean(oceanStartX, oceanStartZ) {
        if (Math.random() < (1 / 128)) {
            // 大河のパラメータで生成 (例: 幅を2倍、深さを1.5倍など)
        }
    }
}