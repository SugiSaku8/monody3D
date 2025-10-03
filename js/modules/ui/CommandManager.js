// js/modules/ui/CommandManager.js
import * as THREE from 'three';

export class CommandManager {
    constructor(game, world, player, uiManager) {
        this.game = game;
        this.world = world;
        this.player = player;
        this.uiManager = uiManager;

        // 登録可能なコマンドのリスト
        this.commands = {
            'ver': this.handleVerCommand.bind(this),
            'biome': this.handleBiomeCommand.bind(this),
            'time': this.handleTimeCommand.bind(this),
            // 今後、他のコマンドも追加可能
            // 'tp': this.handleTpCommand.bind(this),
            // 'give': this.handleGiveCommand.bind(this),
            // ...
        };
    }

    /**
     * コマンド文字列を解析して実行します。
     * @param {string} inputString - 入力されたコマンド文字列 (例: "/ver", "/biome{\"now\"}")
     */
    parseAndExecute(inputString) {
        // 先頭の '/' を削除
        const commandLine = inputString.startsWith('/') ? inputString.substring(1) : inputString;

        // 最初のスペースまたは '{' でコマンド名と引数部分を分割
        const firstSpaceIndex = commandLine.indexOf(' ');
        const firstBraceIndex = commandLine.indexOf('{');
        const splitIndex = firstSpaceIndex !== -1 ? firstSpaceIndex : firstBraceIndex;

        let commandName = '';
        let argsString = '';

        if (splitIndex !== -1) {
            commandName = commandLine.substring(0, splitIndex);
            argsString = commandLine.substring(splitIndex);
        } else {
            commandName = commandLine;
        }

        // コマンド名を小文字に変換 (大文字小文字を区別しない)
        commandName = commandName.toLowerCase();

        // 引数を解析
        let args = [];
        if (argsString.startsWith('{') && argsString.endsWith('}')) {
            try {
                // JSON.parse で引数を解析 (例: {"now"} -> ["now"])
                args = JSON.parse(`[${argsString.substring(1, argsString.length - 1)}]`);
            } catch (e) {
                console.error("Invalid command arguments format:", argsString);
                this.uiManager.displayMessage(`Error: Invalid arguments format for /${commandName}`);
                return;
            }
        } else if (argsString.trim() !== '') {
            // スペース区切りの引数 (例: "arg1 arg2") も受け付ける
            args = argsString.trim().split(/\s+/);
        }

        // コマンドを実行
        this.executeCommand(commandName, args);
    }

    /**
     * コマンド名と引数に基づいて、対応する処理を実行します。
     * @param {string} commandName - コマンド名
     * @param {Array} args - 引数の配列
     */
    executeCommand(commandName, args) {
        const commandHandler = this.commands[commandName];

        if (commandHandler) {
            try {
                commandHandler(args);
            } catch (error) {
                console.error(`Error executing command /${commandName}:`, error);
                this.uiManager.displayMessage(`Error: Failed to execute /${commandName}`);
            }
        } else {
            console.warn(`Unknown command: /${commandName}`);
            this.uiManager.displayMessage(`Unknown command: /${commandName}`);
        }
    }

    // --- 追加: ver コマンドのハンドラー ---
    handleVerCommand(args) {
        // 現在のゲームバージョンを表示 (例: package.json から取得)
        const version = '1.0.0-alpha'; // 仮のバージョン
        this.uiManager.displayMessage(`Game Version: ${version}`);
    }
    // --- 追加 ここまて ---

    // --- 追加: biome コマンドのハンドラー ---
    handleBiomeCommand(args) {
        const playerPos = this.player.position;

        if (args[0] === 'now') {
            // 現在のバイオームを表示
            const biomeResult = this.world.biomeManager.getBiomeAndHeightAt(playerPos.x, playerPos.y, playerPos.z);
            const currentBiome = biomeResult.biome;
            this.uiManager.displayMessage(`Current Biome: ${currentBiome.name} (${currentBiome.classification})`);
        } else if (args[0] === 'closer' && args[1]) {
            // 指定されたバイオームまでの距離を表示 (チート)
            const targetBiomeCode = args[1].toUpperCase(); // 大文字に変換
            const targetBiome = this.world.biomeManager.biomes.get(targetBiomeCode);

            if (!targetBiome) {
                this.uiManager.displayMessage(`Error: Biome '${targetBiomeCode}' not found.`);
                return;
            }

            // 現在のバイオーム
            const currentBiomeResult = this.world.biomeManager.getBiomeAndHeightAt(playerPos.x, playerPos.y, playerPos.z);
            const currentBiome = currentBiomeResult.biome;

            if (currentBiome.classification === targetBiomeCode) {
                this.uiManager.displayMessage(`You are already in ${targetBiome.name} (${targetBiomeCode}).`);
                return;
            }

            // 指定されたバイオームまでの距離を計算 (簡易版: ノイズマップから)
            // これは正確な距離ではないが、方向性のヒントになる
            let distance = Infinity;
            let step = 32; // 32ワールド単位ずつチェック
            let maxSteps = 100; // 最大100ステップ
            let found = false;

            for (let i = 0; i < maxSteps; i++) {
                // プレイヤーの方向に少しずつ進む
                const checkX = playerPos.x + Math.cos(this.player.yaw) * step * i;
                const checkZ = playerPos.z + Math.sin(this.player.yaw) * step * i;

                const checkBiomeResult = this.world.biomeManager.getBiomeAndHeightAt(checkX, playerPos.y, checkZ);
                const checkBiome = checkBiomeResult.biome;

                if (checkBiome.classification === targetBiomeCode) {
                    distance = step * i;
                    found = true;
                    break;
                }
            }

            if (found) {
                this.uiManager.displayMessage(`Distance to ${targetBiome.name} (${targetBiomeCode}): ~${Math.round(distance)} blocks.`);
            } else {
                this.uiManager.displayMessage(`Could not find ${targetBiome.name} (${targetBiomeCode}) within ${maxSteps * step} blocks.`);
            }
        } else {
            this.uiManager.displayMessage("Usage: /biome {\"now\"} or /biome {\"closer\", \"<biome_code>\"}");
        }
    }
    // --- 追加 ここまて ---

    // --- 追加: time コマンドのハンドラー ---
    handleTimeCommand(args) {
        if (args.length === 0) {
            // 現在の時間を表示
            const currentTime = this.world.gameTime || 0; // World.js に gameTime プロパティがあると仮定
            const hours = Math.floor(currentTime * 24);
            const minutes = Math.floor((currentTime * 24 - hours) * 60);
            this.uiManager.displayMessage(`Current Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
        } else if (args[0] === 'set' && args[1]) {
            // 時間を設定 (チート)
            const newTime = parseFloat(args[1]);
            if (isNaN(newTime) || newTime < 0 || newTime >= 24) {
                this.uiManager.displayMessage("Error: Invalid time. Please specify a number between 0 and 23.99.");
                return;
            }

            // World.js の gameTime を更新 (0.0 ~ 1.0 の範囲に変換)
            const normalizedTime = newTime / 24.0;
            if (this.world && typeof this.world.setGameTime === 'function') {
                this.world.setGameTime(normalizedTime); // World.js に setGameTime メソッドを追加する必要あり
                this.uiManager.displayMessage(`Time set to ${newTime.toFixed(2)}.`);
            } else {
                console.error("World.setGameTime is not a function. Please implement it in World.js.");
                this.uiManager.displayMessage("Error: Time setting is not supported.");
            }
        } else {
            this.uiManager.displayMessage("Usage: /time or /time {\"set\", \"<hour>\"}");
        }
    }
    // --- 追加 ここまて ---
}