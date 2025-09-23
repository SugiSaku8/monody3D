// js/player/player.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export const playerInventory = {
    "青りんご": 0,
    "棒": 0
};

export let playerHP = 100;

export function updateInventoryUI() {
    document.getElementById('inv_apple').textContent = playerInventory["青りんご"];
    document.getElementById('inv_stick').textContent = playerInventory["棒"];
}

export function addItemToInventory(itemName, quantity = 1) {
    if (playerInventory.hasOwnProperty(itemName)) {
        playerInventory[itemName] += quantity;
        updateInventoryUI();
        return true;
    }
    return false;
}

export function craftItem(itemName) {
    switch (itemName) {
        case '棒':
            if (playerInventory["青りんご"] >= 2) {
                playerInventory["青りんご"] -= 2;
                playerInventory["棒"] += 1;
                updateInventoryUI();
                return true;
            }
            break;
        // Add more crafting recipes here
    }
    return false;
}

export function updatePlayerHP() {
    const hpElement = document.getElementById('playerHP');
    if (hpElement) {
        hpElement.textContent = playerHP;
        
        // Update UI based on HP
        const uiElement = document.getElementById('ui');
        if (playerHP < 30) {
            uiElement.classList.add('low-hp');
        } else {
            uiElement.classList.remove('low-hp');
        }
    }
}

export function damagePlayer(amount) {
    playerHP = Math.max(0, playerHP - amount);
    updatePlayerHP();
    
    if (playerHP <= 0) {
        // Game over logic
        const gameOverElement = document.getElementById('gameOver');
        if (gameOverElement) {
            gameOverElement.style.display = 'block';
        }
    }
    
    return playerHP > 0; // Return true if player is still alive
}


// js/player/player.js

// ... (既存の import, 定数, 変数, 関数は変更なし) ...

// --- 追加したコード: initPlayer 関数 ---
/**
 * プレイヤーの初期化を行う関数
 * @param {THREE.Scene} scene - Three.jsのシーン
 * @param {CANNON.World} physicsWorld - Cannon.jsの物理ワールド
 * @param {THREE.Vector3} initialPosition - プレイヤーの初期位置
 * @returns {Object} { playerMesh, playerBody } - 作成されたメッシュとボディ
 */
export function initPlayer(scene, physicsWorld, initialPosition) {
    console.log("プレイヤーシステムを初期化しています...");

    // 1. プレイヤーメッシュの作成
    const playerGeometry = new THREE.BoxGeometry(1, 2, 1);
    const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    playerMesh.position.copy(initialPosition);
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = false;
    scene.add(playerMesh);
    console.log("プレイヤーメッシュを追加しました。");

    // 2. プレイヤー物理ボディの作成
    const playerShape = new CANNON.Cylinder(0.5, 0.5, 2, 16);
    const playerBody = new CANNON.Body({ mass: 5 });
    playerBody.addShape(playerShape);
    playerBody.position.copy(initialPosition);
    playerBody.linearDamping = 0.1;
    playerBody.fixedRotation = true;
    playerBody.updateMassProperties();
    physicsWorld.addBody(playerBody);

    // 3. 着地判定用のイベントリスナーを追加
    let isOnGround = false; // initPlayer 内部で管理
    playerBody.addEventListener("collide", function (e) {
        const contact = e.contact;
        // 法線のY成分が一定以上なら地面と判定
        if (contact.ni.y > 0.5) {
            isOnGround = true;
            // main.js で isOnGround を参照できるように更新
            // (将来的にはイベントや状態管理でより良い方法を検討)
            if (window.GAME) {
                window.GAME.isOnGround = isOnGround;
            }
        }
    });

    // 4. カメラの追加 (プレイヤーの子要素として)
    //    (カメラ自体の設定やコントロールは main.js で行う想定)
    //    ここでは、プレイヤーメッシュにカメラを追加する準備だけ
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        10000
    );
    playerMesh.add(camera);
    // カメラの位置は main.js で設定 (例: playerMeshの目の高さ)
    camera.position.set(0, 0.6, 0); // プレイヤーの中心から+0.6m上 (目)
    camera.rotation.set(0, 0, 0);

    console.log("プレイヤーシステムの初期化が完了しました。");

    // 5. 作成したオブジェクトを返す
    return { playerMesh, playerBody, camera, setIsOnGround: (val) => { isOnGround = val; }, getIsOnGround: () => isOnGround };
}
// --- 追加したコード ここまで ---

// ... (既存のエクスポート関数は変更なし) ...