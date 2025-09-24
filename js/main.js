import { Game } from './modules/game/Game.js';
import { AudioManager } from './modules/audio/AudioManager.js';

// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize audio manager
        const audioManager = new AudioManager();
        await audioManager.initialize();
        
        // Start the game
        const game = new Game();
        
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