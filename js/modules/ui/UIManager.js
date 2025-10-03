// js/modules/ui/UIManager.js
import * as THREE from 'three';

export class UIManager {
    constructor() {
        this.playerPosElement = document.getElementById('playerPos');
        this.playerChunkElement = document.getElementById('playerChunk');
        this.onGroundElement = document.getElementById('onGround');
        this.messageElement = document.getElementById('message');
        this.fpsElement = document.getElementById('fpsCounter'); // FPS表示要素
        // --- 追加: コマンド入力欄の要素を取得 ---
        this.commandInputElement = document.getElementById('commandInput');
        // --- 追加 ここまて ---
        this.messageTimeout = null;
    }

    update(player) {
        // Update UI elements
        if (this.playerPosElement) {
            this.playerPosElement.textContent = `${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)}`;
        }

        if (this.playerChunkElement) {
            const chunkX = Math.floor(player.position.x / 32);
            const chunkY = Math.floor(player.position.y / 32);
            const chunkZ = Math.floor(player.position.z / 32);
            this.playerChunkElement.textContent = `${chunkX}, ${chunkY}, ${chunkZ}`;
        }

        if (this.onGroundElement) {
            this.onGroundElement.textContent = player.isOnGround ? 'true' : 'false';
        }

        // FPSはGame.jsで更新されるため、ここでは更新しない
    }

    // --- 修正: displayMessage メソッド ---
    displayMessage(text) {
        if (this.messageElement) {
            this.messageElement.textContent = text;
            if (this.messageTimeout) {
                clearTimeout(this.messageTimeout);
            }
            this.messageTimeout = setTimeout(() => {
                this.messageElement.textContent = "";
                this.messageTimeout = null;
            }, 3000); // 3秒間表示
        }
    }
    // --- 修正 ここまて ---

    // --- 追加: コマンド入力欄のイベントリスナーを設定するメソッド ---
    setupCommandInputListener(commandManager) {
        if (this.commandInputElement && commandManager) {
            this.commandInputElement.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    const inputValue = this.commandInputElement.value.trim();
                    if (inputValue.startsWith('/')) {
                        commandManager.parseAndExecute(inputValue);
                    } else if (inputValue !== '') {
                        // 通常のチャットメッセージ (例: 他のプレイヤーに送信)
                        console.log("Chat message:", inputValue);
                        this.displayMessage(`You: ${inputValue}`);
                    }
                    this.commandInputElement.value = ''; // 入力欄をクリア
                }
            });
        } else {
            console.warn("Command input element or CommandManager not found. Skipping command input listener setup.");
        }
    }
    // --- 追加 ここまて ---
}