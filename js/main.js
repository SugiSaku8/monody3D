// js/main.js
import { Game } from './modules/game/Game.js';
import { AudioManager } from './modules/audio/AudioManager.js';

// --- 追加: パフォーマンス収集サーバーのURL ---
const PERFORMANCE_SERVER_URL = 'http://localhost:3001/api/performance'; // --- 追加 ここまて ---

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // --- 修正: ロード時間計測開始 ---
        const loadStartTime = performance.now();
        console.log("Game load started at:", loadStartTime);
        // --- 修正 ここまて ---

        // Initialize audio manager
        const audioManager = new AudioManager();
        await audioManager.initialize();

        // --- 修正: Game インスタンス作成時に開始時刻を渡す ---
        const game = new Game(loadStartTime);
        // --- 修正 ここまて ---

        // --- 修正: ゲーム初期化完了後、ロード時間計測終了とデータ送信 ---
        await game.initializeAsync(); // ゲームの初期化が完了するのを待つ

        const loadEndTime = performance.now();
        const totalLoadTimeMs = loadEndTime - loadStartTime;
        console.log("Game load completed at:", loadEndTime);
        console.log("Total load time:", totalLoadTimeMs.toFixed(2), "ms");

        // パフォーマンスデータを収集サーバーに送信
        await sendPerformanceData(totalLoadTimeMs, game.progressAt31_25ms);
        // --- 修正 ここまて ---

        // Hide loading screen when everything is ready
        const loadingScreen = document.getElementById('loading');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }

        // Start background music
        audioManager.playBGM();

        // Handle window resize
        window.addEventListener('resize', () => {
            if (game && game.onWindowResize) {
                game.onWindowResize();
            }
        });

        // Handle fullscreen toggle
        document.addEventListener('keydown', (e) => {
            if (e.key === 'f' || e.key === 'F') {
                toggleFullscreen();
            } else if (e.key === 'm' || e.key === 'M') {
                audioManager.toggleMute();
            }
        });

        console.log('Game initialized successfully!');
    } catch (error) {
        console.error('Failed to initialize the game:', error);
        const loadingScreen = document.getElementById('loading');
        if (loadingScreen) {
            loadingScreen.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <h2>Error loading the game</h2>
                    <p>${error.message}</p>
                    <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; cursor: pointer;">
                        Reload Game
                    </button>
                </div>`;
            loadingScreen.style.cursor = 'default';
        }
    }
});

// --- 追加: パフォーマンスデータを送信する関数 ---
async function sendPerformanceData(totalLoadTimeMs, progressAt31_25ms) {
    if (!PERFORMANCE_SERVER_URL) {
        console.warn("Performance server URL is not set. Skipping data send.");
        return;
    }

    const data = {
        totalLoadTimeMs: totalLoadTimeMs,
        progressAt31_25ms: progressAt31_25ms,
        timestamp: new Date().toISOString(), // 送信時刻
        userAgent: navigator.userAgent, // ユーザーエージェント
        // 他のメタデータも追加可能 (例: ブラウザ情報、画面解像度など)
    };

    try {
        const response = await fetch(PERFORMANCE_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log("Performance data sent successfully.");
        } else {
            //console.error("Failed to send performance data. Status:", response.status);
        }
    } catch (error) {
        //console.error("Error sending performance data:", error);
    }
}
// --- 追加 ここまて ---

// Toggle fullscreen mode
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Handle window unload
window.addEventListener('beforeunload', () => {
    // Clean up resources if needed
    console.log('Game is being unloaded');
});