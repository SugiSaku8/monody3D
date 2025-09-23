// js/ui/ui.js

// --- 音声関連 ---
const SOUNDS = {
    bgmForest: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_5a2e645f41.mp3?filename=forest-ambience-47463.mp3',
    sfxJump: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_e07803474d.mp3?filename=cartoon-jump-6462.mp3',
    sfxLand: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_9d4d2a1c1e.mp3?filename=hit-6463.mp3',
    sfxChestOpen: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_3d1a4f4d4f.mp3?filename=open-6470.mp3',
    sfxTrollTalk: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1a2b3c4d5e.mp3?filename=notification-sound-7061.mp3'
};
let audioBGM = null;
let audioSFX = {};

export function initSounds() {
    audioBGM = new Audio(SOUNDS.bgmForest);
    audioBGM.loop = true;
    audioBGM.volume = 0.3;
    audioSFX.jump = new Audio(SOUNDS.sfxJump);
    audioSFX.land = new Audio(SOUNDS.sfxLand);
    audioSFX.chest = new Audio(SOUNDS.sfxChestOpen);
    audioSFX.troll = new Audio(SOUNDS.sfxTrollTalk);
    console.log("サウンドシステムを初期化しました。");
}

export function playSound(soundType) {
    if (audioSFX[soundType]) {
        const sound = new Audio(audioSFX[soundType].src);
        sound.volume = audioSFX[soundType].volume || 1.0;
        sound.play().catch(e => console.error("効果音再生エラー:", e));
    }
}

export function toggleBGM() {
    if (audioBGM) {
        if (audioBGM.paused) {
            audioBGM.play().catch(e => console.error("BGM再生エラー:", e));
            console.log("BGMを再生開始");
        } else {
            audioBGM.pause();
            console.log("BGMを一時停止");
        }
    }
}
// --- 音声関連 ここまで ---

export function showMessage(text) {
    const messageElement = document.getElementById("message");
    let messageTimeout = null; // ローカル変数として管理する方が良いが、簡略化
    if (messageElement) {
        messageElement.textContent = text;
        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }
        messageTimeout = setTimeout(() => {
            messageElement.textContent = '';
            messageTimeout = null;
        }, 3000);
    }
}
// js/ui/ui.js

// ... (既存の import 文, 音声関連コード, showMessage などはそのまま) ...

// --- 追加したコード: initUI 関数 ---
/**
 * UI要素の初期化を行う関数
 * ゲーム開始時やリスタート時に呼び出される
 */
export function initUI() {
    console.log("UIシステムを初期化しています...");

    // 1. プレイヤーの初期HPをUIに反映
    //    (playerHP は player.js で管理されていると仮定)
    //    ここでは、player.js から直接 import するか、
    //    main.js 経由でアクセスする必要があります。
    //    簡易的に、player.js に updatePlayerHP 関数があると仮定し、それを呼び出します。
    //    より良い方法は、UI モジュールが player モジュールに依存することを明示することです。
    //    ただし、循環依存を避けるため、main.js で初期化を調整するか、
    //    イベント駆動にするのが望ましいです。
    //    ここでは、player.js の updatePlayerHP を呼び出す想定で記述しますが、
    //    実際には main.js で player.updatePlayerHP() を呼び出すのが一般的です。
    //
    //    しかし、エラー「initUI is not defined」が出ているので、
    //    おそらく main.js のどこかで `initUI()` を呼び出そうとしています。
    //    その `initUI` がこの関数であることを前提とします。
    //
    //    仮に player.js に updatePlayerHP があるとします。
    //    import { updatePlayerHP } from '../player/player.js'; // 循環依存の恐れあり
    //    updatePlayerHP(); // playerHP の初期値をUIに反映

    try {
        // main.js で定義されたグローバル関数や変数にアクセスする例
        // (これは一時的な回避策です。長期的にはモジュール設計を見直すべきです)
        if (typeof window.updatePlayerHPFromMain === 'function') {
             window.updatePlayerHPFromMain(); // main.js で定義された関数を呼び出し
        } else if (window.GAME && typeof window.GAME.updatePlayerHP === 'function') {
             window.GAME.updatePlayerHP(); // GAME オブジェクト経由で呼び出し
        } else {
             // フォールバック: 直接DOMを操作して初期値を設定
             const playerHPElement = document.getElementById("playerHP");
             if (playerHPElement) {
                 // playerHP の初期値は player.js で定義されていると仮定 (例: 100)
                 playerHPElement.textContent = "100"; // player.js の playerHP 初期値
             }
             const uiElement = playerHPElement?.parentElement;
             if (uiElement) {
                 uiElement.classList.remove("low-hp"); // 初期状態では low-hp クラスを削除
             }
        }
    } catch (e) {
        console.warn("UI初期化中にプレイヤーHP更新でエラー:", e);
    }

    // 2. インベントリの初期表示を更新
    try {
        if (typeof window.updateInventoryUIFromMain === 'function') {
             window.updateInventoryUIFromMain();
        } else if (window.GAME && typeof window.GAME.updateInventoryUI === 'function') {
             window.GAME.updateInventoryUI();
        } else {
             // フォールバック: 直接DOMを操作して初期値を設定
             const invAppleElement = document.getElementById("inv_apple");
             const invStickElement = document.getElementById("inv_stick");
             if (invAppleElement) invAppleElement.textContent = "0";
             if (invStickElement) invStickElement.textContent = "0";
        }
    } catch (e) {
        console.warn("UI初期化中にインベントリ更新でエラー:", e);
    }

    // 3. ゲームオーバー画面を非表示にする
    try {
        const gameOverElement = document.getElementById("gameOver");
        if (gameOverElement) {
            gameOverElement.style.display = "none";
        }
    } catch (e) {
        console.warn("UI初期化中にゲームオーバーUI非表示でエラー:", e);
    }

    // 4. メッセージ欄をクリア
    try {
        const messageElement = document.getElementById("message");
        if (messageElement) {
            messageElement.textContent = "";
        }
    } catch (e) {
        console.warn("UI初期化中にメッセージ欄クリアでエラー:", e);
    }

    console.log("UIシステムの初期化が完了しました。");
}
// --- 追加したコード ここまで ---

// ... (既存の export 文, 関数などはそのまま) ...
// --- TODO: 他のUI更新関数 (例: プレイヤー位置表示更新) をここに実装 ---