// js/modules/worldgen/features/Flower.js
import * as THREE from 'three';

export class Flower {
    constructor(world, biomeManager, physicsWorld) {
        this.world = world;
        this.biomeManager = biomeManager;
        this.physicsWorld = physicsWorld;

        // --- 修正: 花の種類とそのジオメトリ・マテリアルの定義 ---
        this.flowerTypes = {
            // デフォルト: Violet (以前の実装)
            'Violet': {
                createMesh: this.createVioletMesh.bind(this),
                density: 0.1,
                properties: { color: 0x8A2BE2 } // ブルーバイオレット
            },
            // --- 追加: 新しい花の種類 ---
            'Rose': {
                createMesh: this.createRoseMesh.bind(this),
                density: 0.08,
                properties: { color: 0xFF0000 } // 赤
            },
            'Daisy': {
                createMesh: this.createDaisyMesh.bind(this),
                density: 0.12,
                properties: { color: 0xFFFFFF } // 白
            },
            'Sunflower': {
                createMesh: this.createSunflowerMesh.bind(this),
                density: 0.05,
                properties: { color: 0xFFFF00 } // 黄
            },
            'Tulip': {
                createMesh: this.createTulipMesh.bind(this),
                density: 0.1,
                properties: { color: 0xFF69B4 } // ホットピンク
            },
            'Lily': {
                createMesh: this.createLilyMesh.bind(this),
                density: 0.07,
                properties: { color: 0xFFA500 } // オレンジ
            },
            'Orchid': {
                createMesh: this.createOrchidMesh.bind(this),
                density: 0.06,
                properties: { color: 0xDA70D6 } // オーキッド
            },
            'Poppy': {
                createMesh: this.createPoppyMesh.bind(this),
                density: 0.09,
                properties: { color: 0xFF4500 } // オレンジレッド
            },
            'CherryBlossom': {
                createMesh: this.createCherryBlossomMesh.bind(this),
                density: 0.04,
                properties: { color: 0xFFB6C1 } // ライトピンク
            },
            'Hydrangea': {
                createMesh: this.createHydrangeaMesh.bind(this),
                density: 0.08,
                properties: { color: 0x4169E1 } // ロイヤルブルー
            }
            // --- 追加 ここまて ---
        };
        // --- 修正 ここまて ---
    }

    generateInChunk(cx, cy, cz, chunkSize) {
        if (cy !== 0) return; // 地面(Y=0)のチャンクのみ

        const chunkKey = `${cx},${cy},${cz}`;
        const chunk = this.world.getChunkAt(cx, cy, cz);

        if (!chunk) {
            console.warn(`Chunk (${cx}, ${cy}, ${cz}) not found for Flower generation.`);
            return;
        }

        const worldCenterX = cx * chunkSize + chunkSize / 2;
        const worldCenterZ = cz * chunkSize + chunkSize / 2;
        const biome = this.biomeManager.getBiomeAt(worldCenterX, 0, worldCenterZ); // Y=0でのバイオーム

        if (!biome) {
             console.warn(`Biome not found for chunk (${cx}, ${cy}, ${cz}). Skipping flower generation.`);
             return;
        }

        if (typeof biome.getFlowers !== 'function') {
             console.error(`Biome '${biome.name}' does not have a getFlowers method.`);
             return;
        }

        const flowerDefinitions = biome.getFlowers(); // [{ type: '...', density: ..., properties: {...} }, ...]

        for (const flowerDef of flowerDefinitions) {
            const flowerType = flowerDef.type;
            const density = flowerDef.density || 0;
            const properties = flowerDef.properties || {};

            // 花の種類が定義されているか確認
            if (!this.flowerTypes[flowerType]) {
                console.warn(`Unknown flower type: ${flowerType}`);
                continue;
            }

            // 花の密度から、チャンク内に生成する数を計算
            const count = Math.floor(density * chunkSize * chunkSize);
            if (count <= 0) continue;

            // 花の種類に応じたメッシュ生成関数を取得
            const createMeshFunc = this.flowerTypes[flowerType].createMesh;

            for (let i = 0; i < count; i++) {
                const localX = Math.random() * chunkSize;
                const localZ = Math.random() * chunkSize;
                const worldX = cx * chunkSize + localX;
                const worldZ = cz * chunkSize + localZ;

                const terrainHeight = this.world.getWorldTerrainHeightAt(worldX, worldZ);

                // 花のメッシュを生成
                const flowerMesh = createMeshFunc(terrainHeight, properties);

                flowerMesh.position.set(
                    localX - chunkSize / 2,
                    terrainHeight,
                    localZ - chunkSize / 2
                );

                // 花のメッシュをチャンクに追加
                this.world.addFlowerToChunk(cx, cy, cz, flowerMesh);
            }
        }
    }

    // --- 追加: 各種花のメッシュ生成メソッド ---

    // Violet (以前の実装)
    createVioletMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.1 + Math.random() * 0.1;
        const stemGeometry = new THREE.CylinderGeometry(0.01, 0.015, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22, // 緑
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花 (球体)
        const flowerRadius = 0.05 + Math.random() * 0.03;
        const flowerGeometry = new THREE.SphereGeometry(flowerRadius, 6, 6);
        const flowerMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0x8A2BE2, // ブルーバイオレット
            roughness: 0.8,
            metalness: 0.0
        });
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.y = stemHeight + flowerRadius + groundY;
        group.add(flower);

        return group;
    }

    // Rose (薔薇)
    createRoseMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.3 + Math.random() * 0.2;
        const stemGeometry = new THREE.CylinderGeometry(0.01, 0.015, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花びら (複数の平面)
        const numPetals = 5 + Math.floor(Math.random() * 3); // 5~7枚
        const petalRadius = 0.08 + Math.random() * 0.04; // 花びらの半径
        const petalLength = petalRadius * 1.5; // 花びらの長さ
        const petalGeometry = new THREE.PlaneGeometry(petalRadius, petalLength);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFF0000, // 赤
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < numPetals; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);

            // 花びらの角度 (放射状に配置)
            const angle = (i / numPetals) * Math.PI * 2;
            const petalX = Math.cos(angle) * petalRadius * 0.8;
            const petalZ = Math.sin(angle) * petalRadius * 0.8;

            // 花びらの位置 (茎の上部に配置)
            petal.position.set(
                petalX,
                stemHeight + petalLength * 0.7 + groundY, // 茎の上部に配置
                petalZ
            );

            // 花びらの回転 (茎から花びらに向かって開くように)
            petal.rotation.y = angle;
            petal.rotation.x = Math.PI / 2 - Math.random() * 0.3; // 少し垂れ下がり

            // 花びらのスケールにランダム性を加える
            const petalScale = 0.8 + Math.random() * 0.4;
            petal.scale.set(petalScale, petalScale, petalScale);

            group.add(petal);
        }

        // 花の中心 ( stigma )
        const centerGeometry = new THREE.SphereGeometry(0.03, 6, 6);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // 黄色
            roughness: 0.9,
            metalness: 0.0
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = stemHeight + petalLength * 0.7 + 0.03 + groundY;
        group.add(center);

        return group;
    }

    // Daisy (ヒナギク)
    createDaisyMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.2 + Math.random() * 0.1;
        const stemGeometry = new THREE.CylinderGeometry(0.008, 0.012, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花びら (白)
        const numPetals = 8 + Math.floor(Math.random() * 4); // 8~11枚
        const petalRadius = 0.06 + Math.random() * 0.03;
        const petalLength = petalRadius * 1.2;
        const petalGeometry = new THREE.PlaneGeometry(petalRadius, petalLength);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFFFFFF, // 白
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < numPetals; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);

            const angle = (i / numPetals) * Math.PI * 2;
            const petalX = Math.cos(angle) * petalRadius * 0.9;
            const petalZ = Math.sin(angle) * petalRadius * 0.9;

            petal.position.set(
                petalX,
                stemHeight + petalLength * 0.6 + groundY,
                petalZ
            );

            petal.rotation.y = angle;
            petal.rotation.x = Math.PI / 2 - Math.random() * 0.2;

            const petalScale = 0.9 + Math.random() * 0.2;
            petal.scale.set(petalScale, petalScale, petalScale);

            group.add(petal);
        }

        // 花の中心 (黄色)
        const centerGeometry = new THREE.SphereGeometry(0.04, 6, 6);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // 黄色
            roughness: 0.9,
            metalness: 0.0
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = stemHeight + petalLength * 0.6 + 0.04 + groundY;
        group.add(center);

        return group;
    }

    // Sunflower (ヒマワリ)
    createSunflowerMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.8 + Math.random() * 0.4;
        const stemGeometry = new THREE.CylinderGeometry(0.02, 0.03, stemHeight, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花びら (黄色)
        const numPetals = 12 + Math.floor(Math.random() * 6); // 12~17枚
        const petalRadius = 0.15 + Math.random() * 0.05;
        const petalLength = petalRadius * 1.8;
        const petalGeometry = new THREE.PlaneGeometry(petalRadius, petalLength);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFFFF00, // 黄色
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < numPetals; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);

            const angle = (i / numPetals) * Math.PI * 2;
            const petalX = Math.cos(angle) * petalRadius * 1.1;
            const petalZ = Math.sin(angle) * petalRadius * 1.1;

            petal.position.set(
                petalX,
                stemHeight + petalLength * 0.8 + groundY,
                petalZ
            );

            petal.rotation.y = angle;
            petal.rotation.x = Math.PI / 2 - Math.random() * 0.1;

            const petalScale = 0.95 + Math.random() * 0.1;
            petal.scale.set(petalScale, petalScale, petalScale);

            group.add(petal);
        }

        // 花の中心 (褐色の種)
        const centerRadius = 0.1 + Math.random() * 0.03;
        const centerGeometry = new THREE.SphereGeometry(centerRadius, 8, 8);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513, // 茶色
            roughness: 0.9,
            metalness: 0.0
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = stemHeight + petalLength * 0.8 + centerRadius + groundY;
        group.add(center);

        return group;
    }

    // Tulip (チューリップ)
    createTulipMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.4 + Math.random() * 0.2;
        const stemGeometry = new THREE.CylinderGeometry(0.01, 0.015, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花 (カップ状)
        const cupRadius = 0.08 + Math.random() * 0.03;
        const cupHeight = cupRadius * 1.2;
        const cupGeometry = new THREE.ConeGeometry(cupRadius, cupHeight, 8, 1, true); // openEnded=true
        const cupMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFF69B4, // ホットピンク
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });
        const cup = new THREE.Mesh(cupGeometry, cupMaterial);
        cup.position.y = stemHeight + cupHeight / 2 + groundY;
        cup.rotation.x = Math.PI; // 底面を上に向ける
        group.add(cup);

        // 花びらの先端を少し外側に曲げる (簡略化: スケールで調整)
        cup.scale.y = 0.8 + Math.random() * 0.2; // Y方向を少し潰す

        return group;
    }

    // Lily (ユリ)
    createLilyMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.6 + Math.random() * 0.3;
        const stemGeometry = new THREE.CylinderGeometry(0.012, 0.018, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花びら (6枚、反り返った形)
        const numPetals = 6;
        const petalWidth = 0.08 + Math.random() * 0.03;
        const petalLength = 0.15 + Math.random() * 0.05;
        // 簡略化: 平面で反り返りをシミュレート
        const petalGeometry = new THREE.PlaneGeometry(petalWidth, petalLength);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFFA500, // オレンジ
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < numPetals; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);

            const angle = (i / numPetals) * Math.PI * 2;
            const petalX = Math.cos(angle) * (petalWidth * 0.8);
            const petalZ = Math.sin(angle) * (petalWidth * 0.8);

            petal.position.set(
                petalX,
                stemHeight + petalLength * 0.6 + groundY,
                petalZ
            );

            // 花びらを茎から離れる方向に傾ける
            petal.rotation.y = angle + Math.PI / 2;
            petal.rotation.x = Math.PI / 2 + Math.random() * 0.2; // 少し下向きに反り返る
            petal.rotation.z = (Math.random() - 0.5) * 0.2; // 少しねじれる

            const petalScale = 0.9 + Math.random() * 0.2;
            petal.scale.set(petalScale, petalScale, petalScale);

            group.add(petal);
        }

        // 花の中心 ( stigma )
        const centerGeometry = new THREE.SphereGeometry(0.02, 6, 6);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // 黄色
            roughness: 0.9,
            metalness: 0.0
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = stemHeight + petalLength * 0.6 + 0.02 + groundY;
        group.add(center);

        return group;
    }

    // Orchid (蘭)
    createOrchidMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.3 + Math.random() * 0.2;
        const stemGeometry = new THREE.CylinderGeometry(0.008, 0.012, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花 (3枚の平面で構成)
        const petalSize = 0.06 + Math.random() * 0.02;
        const petalGeometry = new THREE.PlaneGeometry(petalSize, petalSize);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xDA70D6, // オーキッド
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        // 中央の唇弁 (labellum)
        const labellum = new THREE.Mesh(petalGeometry, petalMaterial);
        labellum.position.y = stemHeight + petalSize * 0.8 + groundY;
        labellum.rotation.x = Math.PI / 2;
        labellum.scale.y = 1.2 + Math.random() * 0.3; // 縦長に
        group.add(labellum);

        // 上の花びら (dorsal sepal)
        const dorsalSepal = new THREE.Mesh(petalGeometry, petalMaterial);
        dorsalSepal.position.y = stemHeight + petalSize * 1.2 + groundY;
        dorsalSepal.position.z = -petalSize * 0.3; // 少し後ろに
        dorsalSepal.rotation.x = Math.PI / 2 + Math.random() * 0.1; // 少し下向き
        group.add(dorsalSepal);

        // 側の花びら (lateral sepals)
        const lateralSepal1 = new THREE.Mesh(petalGeometry, petalMaterial);
        lateralSepal1.position.set(
            -petalSize * 0.4,
            stemHeight + petalSize * 1.0 + groundY,
            petalSize * 0.2
        );
        lateralSepal1.rotation.x = Math.PI / 2;
        lateralSepal1.rotation.z = Math.random() * 0.2; // 少しねじれる
        group.add(lateralSepal1);

        const lateralSepal2 = lateralSepal1.clone(); // クローンして位置だけ変更
        lateralSepal2.position.x = petalSize * 0.4;
        lateralSepal2.rotation.z = -Math.random() * 0.2; // 反対方向にねじれる
        group.add(lateralSepal2);

        return group;
    }

    // Poppy (ポピー)
    createPoppyMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.4 + Math.random() * 0.2;
        const stemGeometry = new THREE.CylinderGeometry(0.01, 0.015, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花 (4枚の平面、十字形)
        const petalSize = 0.08 + Math.random() * 0.03;
        const petalGeometry = new THREE.PlaneGeometry(petalSize, petalSize);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFF4500, // オレンジレッド
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < 4; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);

            const angle = (i / 4) * Math.PI * 2;
            const petalX = Math.cos(angle) * petalSize * 0.7;
            const petalZ = Math.sin(angle) * petalSize * 0.7;

            petal.position.set(
                petalX,
                stemHeight + petalSize * 0.8 + groundY,
                petalZ
            );

            petal.rotation.y = angle;
            petal.rotation.x = Math.PI / 2;

            const petalScale = 0.9 + Math.random() * 0.2;
            petal.scale.set(petalScale, petalScale, petalScale);

            group.add(petal);
        }

        // 花の中心 ( stigma )
        const centerGeometry = new THREE.SphereGeometry(0.03, 6, 6);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000, // 黒
            roughness: 0.9,
            metalness: 0.0
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = stemHeight + petalSize * 0.8 + 0.03 + groundY;
        group.add(center);

        return group;
    }

    // Cherry Blossom (桜の花)
    createCherryBlossomMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.2 + Math.random() * 0.1;
        const stemGeometry = new THREE.CylinderGeometry(0.008, 0.012, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花びら (5枚、楕円形、少し尖っている)
        const numPetals = 5;
        const petalWidth = 0.04 + Math.random() * 0.02;
        const petalHeight = petalWidth * 1.2;
        const petalGeometry = new THREE.PlaneGeometry(petalWidth, petalHeight);
        const petalMaterial = new THREE.MeshStandardMaterial({
            color: properties.color || 0xFFB6C1, // ライトピンク
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide
        });

        for (let i = 0; i < numPetals; i++) {
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);

            const angle = (i / numPetals) * Math.PI * 2;
            const petalX = Math.cos(angle) * petalWidth * 0.6;
            const petalZ = Math.sin(angle) * petalWidth * 0.6;

            petal.position.set(
                petalX,
                stemHeight + petalHeight * 0.7 + groundY,
                petalZ
            );

            petal.rotation.y = angle;
            petal.rotation.x = Math.PI / 2 - Math.random() * 0.1; // 少し垂れ下がり

            const petalScale = 0.9 + Math.random() * 0.2;
            petal.scale.set(petalScale, petalScale, petalScale);

            group.add(petal);
        }

        // 花の中心 ( stigma )
        const centerGeometry = new THREE.SphereGeometry(0.015, 6, 6);
        const centerMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00, // 黄色
            roughness: 0.9,
            metalness: 0.0
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        center.position.y = stemHeight + petalHeight * 0.7 + 0.015 + groundY;
        group.add(center);

        return group;
    }

    // Hydrangea (アジサイ)
    createHydrangeaMesh(groundY, properties) {
        const group = new THREE.Group();

        // 茎
        const stemHeight = 0.3 + Math.random() * 0.2;
        const stemGeometry = new THREE.CylinderGeometry(0.01, 0.015, stemHeight, 6);
        const stemMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,
            roughness: 0.9,
            metalness: 0.0
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = stemHeight / 2 + groundY;
        group.add(stem);

        // 花の塊 (複数の小さな花の集合体)
        const clusterRadius = 0.1 + Math.random() * 0.05;
        const numSmallFlowers = 15 + Math.floor(Math.random() * 10); // 15~24個
        const smallFlowerRadius = 0.02 + Math.random() * 0.01;

        for (let i = 0; i < numSmallFlowers; i++) {
            const smallFlowerGeometry = new THREE.SphereGeometry(smallFlowerRadius, 6, 6);
            const smallFlowerMaterial = new THREE.MeshStandardMaterial({
                color: properties.color || 0x4169E1, // ロイヤルブルー
                roughness: 0.8,
                metalness: 0.0
            });
            const smallFlower = new THREE.Mesh(smallFlowerGeometry, smallFlowerMaterial);

            // 花の塊の中心からランダムな方向に配置
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * clusterRadius;
            const heightOffset = (Math.random() - 0.5) * clusterRadius * 0.5;

            const flowerX = Math.cos(angle) * radius;
            const flowerZ = Math.sin(angle) * radius;

            smallFlower.position.set(
                flowerX,
                stemHeight + clusterRadius + heightOffset + groundY,
                flowerZ
            );

            // 花の回転にランダム性を加える
            smallFlower.rotation.set(
                Math.random() * Math.PI,
                Math.random() * Math.PI,
                Math.random() * Math.PI
            );

            group.add(smallFlower);
        }

        return group;
    }

    // --- 追加 ここまて ---
}