// js/modules/ui/CommandManager.js
import * as THREE from 'three';

export class CommandManager {
    constructor(game, world, player, uiManager) {
        this.game = game;
        this.world = world;
        this.player = player;
        this.uiManager = uiManager; // UIManager インスタンスを保持

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
                // --- 修正: エラー結果を displayCommandResult で表示 ---
                this.uiManager.displayCommandResult(`Error: Invalid arguments format for /${commandName}`);
                // --- 修正 ここまて ---
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
                // --- 修正: エラー結果を displayCommandResult で表示 ---
                this.uiManager.displayCommandResult(`Error: Failed to execute /${commandName}`);
                // --- 修正 ここまて ---
            }
        } else {
            console.warn(`Unknown command: /${commandName}`);
            // --- 修正: 未知のコマンドを displayCommandResult で表示 ---
            this.uiManager.displayCommandResult(`Unknown command: /${commandName}`);
            // --- 修正 ここまて ---
        }
    }

    // --- 修正: ver コマンドのハンドラー (結果表示を displayCommandResult に変更) ---
    handleVerCommand(args) {
        // 現在のゲームバージョンを表示 (例: package.json から取得)
        const version = 'Monody 25w10c3-developer-to-1.3.0'; // 仮のバージョン
        // --- 修正: 結果表示を displayCommandResult に変更 ---
        this.uiManager.displayCommandResult(`Game Version: ${version}`);
        // --- 修正 ここまて ---
    }
    // --- 修正 ここまて ---

    // --- 修正: biome コマンドのハンドラー (結果表示を displayCommandResult に変更) ---
    handleBiomeCommand(args) {
        const playerPos = this.player.position;

        if (args[0] === 'now') {
            // 現在のバイオームを表示
            const biomeResult = this.world.biomeManager.getBiomeAndHeightAt(playerPos.x, playerPos.y, playerPos.z);
            const currentBiome = biomeResult.biome;
            // --- 修正: 結果表示を displayCommandResult に変更 ---
            this.uiManager.displayCommandResult(`Current Biome: ${currentBiome.name} (${currentBiome.classification})`);
            // --- 修正 ここまて ---
        } else if (args[0] === 'closer' && args[1]) {
            // 指定されたバイオームまでの距離を表示 (チート)
            const targetBiomeCode = args[1].toUpperCase(); // 大文字に変換
            const targetBiome = this.world.biomeManager.biomes.get(targetBiomeCode);

            if (!targetBiome) {
                // --- 修正: エラー結果を displayCommandResult で表示 ---
                this.uiManager.displayCommandResult(`Error: Biome '${targetBiomeCode}' not found.`);
                // --- 修正 ここまて ---
                return;
            }

            // 現在のバイオーム
            const currentBiomeResult = this.world.biomeManager.getBiomeAndHeightAt(playerPos.x, playerPos.y, playerPos.z);
            const currentBiome = currentBiomeResult.biome;

            if (currentBiome.classification === targetBiomeCode) {
                // --- 修正: 結果表示を displayCommandResult に変更 ---
                this.uiManager.displayCommandResult(`You are already in ${targetBiome.name} (${targetBiomeCode}).`);
                // --- 修正 ここまて ---
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
                // --- 修正: 結果表示を displayCommandResult に変更 ---
                this.uiManager.displayCommandResult(`Distance to ${targetBiome.name} (${targetBiomeCode}): ~${Math.round(distance)} blocks.`);
                // --- 修正 ここまて ---
            } else {
                // --- 修正: 結果表示を displayCommandResult に変更 ---
                this.uiManager.displayCommandResult(`Could not find ${targetBiome.name} (${targetBiomeCode}) within ${maxSteps * step} blocks.`);
                // --- 修正 ここまて ---
            }
        } else {
            // --- 修正: 使用方法を displayCommandResult で表示 ---
            this.uiManager.displayCommandResult("Usage: /biome {\"now\"} or /biome {\"closer\", \"<biome_code>\"}");
            // --- 修正 ここまて ---
        }
    }
    // --- 修正 ここまて ---

    // --- 修正: time コマンドのハンドラー (結果表示を displayCommandResult に変更) ---
    handleTimeCommand(args) {
        if (args.length === 0) {
            // 現在の時間を表示
            const currentTime = this.world.gameTime || 0; // World.js に gameTime プロパティがあると仮定
            const hours = Math.floor(currentTime * 24);
            const minutes = Math.floor((currentTime * 24 - hours) * 60);
            // --- 修正: 結果表示を displayCommandResult に変更 ---
            this.uiManager.displayCommandResult(`Current Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`);
            // --- 修正 ここまて ---
        } else if (args[0] === 'set' && args[1]) {
            // 時間を設定 (チート)
            const newTime = parseFloat(args[1]);
            if (isNaN(newTime) || newTime < 0 || newTime >= 24) {
                // --- 修正: エラー結果を displayCommandResult で表示 ---
                this.uiManager.displayCommandResult("Error: Invalid time. Please specify a number between 0 and 23.99.");
                // --- 修正 ここまて ---
                return;
            }

            // World.js の gameTime を更新 (0.0 ~ 1.0 の範囲に変換)
            const normalizedTime = newTime / 24.0;
            if (this.world && typeof this.world.setGameTime === 'function') {
                this.world.setGameTime(normalizedTime); // World.js に setGameTime メソッドを追加する必要あり
                // --- 修正: 結果表示を displayCommandResult に変更 ---
                this.uiManager.displayCommandResult(`Time set to ${newTime.toFixed(2)}.`);
                // --- 修正 ここまて ---
            } else {
                console.error("World.setGameTime is not a function. Please implement it in World.js.");
                // --- 修正: エラー結果を displayCommandResult で表示 ---
                this.uiManager.displayCommandResult("Error: Time setting is not supported.");
                // --- 修正 ここまて ---
            }
        } else {
            // --- 修正: 使用方法を displayCommandResult で表示 ---
            this.uiManager.displayCommandResult("Usage: /time or /time {\"set\", \"<hour>\"}");
            // --- 修正 ここまて ---
        }
    }
    // --- 修正 ここまて ---
}