// js/modules/ui/UIManager.js
import * as THREE from 'three';

export class UIManager {
    constructor() {
        this.playerPosElement = document.getElementById('playerPos');
        this.playerChunkElement = document.getElementById('playerChunk');
        this.onGroundElement = document.getElementById('onGround');
        this.messageElement = document.getElementById('message');
        this.biomeElement = document.getElementById('biomeInfo');
        this.fpsElement = document.getElementById('fpsCounter'); // FPS表示要素
        // --- 追加: コマンド入力欄の要素を取得 ---
        this.commandInputElement = document.getElementById('commandInput');
        // --- 追加 ここまて ---
        this.messageTimeout = null;
        this.commandConsole = document.getElementById('commandConsole');
        this.commandResultElement = document.getElementById('commandResult');
        this.commandInputElement = document.getElementById('commandInput');
        this.commandInputWrapper = document.getElementById('commandInputWrapper');
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
        if (this.biomeElement) {
            // player.world から BiomeManager にアクセス
            const biomeManager = player.world.biomeManager;
            if (biomeManager) {
                const biomeResult = biomeManager.getBiomeAndHeightAt(player.position.x, player.position.y, player.position.z);
                const currentBiome = biomeResult.biome;
                this.biomeElement.textContent = `${currentBiome.name} (${currentBiome.classification})`;
            } else {
                this.biomeElement.textContent = "BiomeManager not found";
            }
        }
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

    // --- 追加: コマンド入力欄を表示するメソッド ---
    showCommandInput() {
        if (this.commandConsole && this.commandInputWrapper) {
            this.commandConsole.style.display = 'block'; // 親要素を表示
            this.commandInputWrapper.style.display = 'block'; // 入力欄を表示
            this.commandInputElement.focus(); // 入力欄にフォーカスを当てる
            console.log("Command input shown and focused.");
        } else {
            console.warn("Command console or input wrapper element not found.");
        }
    }
    // --- 追加 ここまて ---

    // --- 追加: コマンド入力欄を非表示にするメソッド ---
    hideCommandInput() {
        if (this.commandConsole && this.commandInputWrapper) {
            this.commandInputWrapper.style.display = 'none'; // 入力欄を非表示
            // 親要素 #commandConsole は、結果表示のために残す場合があるため、
            // 必要に応じて this.commandConsole.style.display = 'none'; とする
            // ここでは、結果表示が終わったら親も非表示にする
            if (this.commandResultElement.style.display === 'none') {
                 this.commandConsole.style.display = 'none'; // 結果も非表示なら親も非表示
            }
            this.commandInputElement.value = ''; // 入力欄をクリア
            console.log("Command input hidden.");
        } else {
            console.warn("Command console or input wrapper element not found.");
        }
    }
    // --- 追加 ここまて ---

    // --- 追加: コマンド実行結果を表示するメソッド ---
    displayCommandResult(text) {
        if (this.commandResultElement) {
            this.commandResultElement.textContent = text;
            this.commandResultElement.style.display = 'block'; // 結果表示欄を表示

            // 親要素も表示
            if (this.commandConsole) {
                this.commandConsole.style.display = 'block';
            }

            // 以前のタイムアウトをクリア
            if (this.commandResultTimeout) {
                clearTimeout(this.commandResultTimeout);
            }

            // 一定時間後に結果を非表示にする
            this.commandResultTimeout = setTimeout(() => {
                this.commandResultElement.style.display = 'none';
                // 結果が非表示になったら、入力欄も非表示 (親要素も非表示)
                this.hideCommandInput();
                this.commandResultTimeout = null;
            }, 5000); // 5秒間表示
        } else {
            console.warn("Command result element not found.");
        }
    }
    // --- 追加 ここまて ---

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
                        this.displayMessage(`You: ${inputValue}`); // 汎用メッセージ欄に表示
                    }
                    this.commandInputElement.value = ''; // 入力欄をクリア
                    this.hideCommandInput(); // 入力欄を非表示
                }
                // --- 追加: Escapeキーで入力欄を閉じる ---
                else if (event.key === 'Escape') {
                    this.commandInputElement.value = ''; // 入力欄をクリア
                    this.hideCommandInput(); // 入力欄を非表示
                }
                // --- 追加 ここまて ---
            });
        } else {
            console.warn("Command input element or CommandManager not found. Skipping command input listener setup.");
        }
    }
}