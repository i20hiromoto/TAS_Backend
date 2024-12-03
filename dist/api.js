"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const bodyParser = __importStar(require("body-parser"));
const fs = __importStar(require("fs"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const xlsx_1 = __importDefault(require("xlsx"));
const path_1 = __importDefault(require("path"));
const exceljs_1 = __importDefault(require("exceljs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const dotenv_1 = __importDefault(require("dotenv"));
const uuid_1 = require("uuid");
const app = (0, express_1.default)();
const jsonFilePath = "data/Players_data/sample_player.json";
const ProjectsPath = "data/Projects/projects.json";
const usersdataPath = path_1.default.join(__dirname, "../data", "Users_data", "users_data.json");
dotenv_1.default.config();
app.use(bodyParser.json());
app.use((0, cors_1.default)());
app.use("/files", express_1.default.static(path_1.default.join(__dirname, "../data/Inputdata")));
// playerdata.json ファイルからデータを読み取る関数
function getDataFromFile(filePath) {
    const rawData = fs.readFileSync(filePath, "utf-8");
    const playerData = JSON.parse(rawData);
    return playerData;
}
// playerdata.json ファイルにデータを書き込む関数
const saveDataToFile = (data, jsonFilePath) => {
    fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 4), "utf-8");
};
const copyExcelFile = (sourceFilePath, destinationFilePath) => {
    fs.copyFile(sourceFilePath, destinationFilePath, (err) => {
        if (err) {
            console.error("ファイルのコピー中にエラーが発生しました:", err);
            return;
        }
        console.log(`ファイルがコピーされました: ${destinationFilePath}`);
    });
};
const deleteFile = (filePath) => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                reject("ファイルの削除中にエラーが発生しました: " + err);
            }
            else {
                console.log(`ファイルが削除されました: ${filePath}`);
                resolve();
            }
        });
    });
};
const writeDataToExcel = (filePath, data, tournPath, sourcePath) => __awaiter(void 0, void 0, void 0, function* () {
    // ファイルが存在するか確認
    if (!fs.existsSync(filePath)) {
        console.error("ファイルが存在しません:", filePath);
        return;
    }
    if (!fs.existsSync(tournPath)) {
        console.error("ファイルが存在しません:", tournPath);
        return;
    }
    const startCell = "C3";
    const sheetName = ["singles_players", "doubles_players", "team_players"];
    const key = ["singles", "doubles", "team"];
    // Excelファイルを読み込む
    const workbook = new exceljs_1.default.Workbook();
    yield workbook.xlsx.readFile(filePath);
    // セル参照を行列インデックスに変換
    const startCellRef = decodeCell(startCell);
    // データを書き込む
    for (let i = 0; i < key.length; i++) {
        const sheet = workbook.getWorksheet(sheetName[i]);
        if (!sheet) {
            console.error("指定されたシートが存在しません:", sheetName[i]);
            continue;
        }
        if (!data[key[i]]["base_tournament"]) {
            console.error("トーナメントデータが存在しません:", key[i]);
            continue;
        }
        const tournamentData = data[key[i]]["base_tournament"]["1"];
        console.log(tournamentData);
        let rowIndex = startCellRef.row;
        tournamentData.forEach((match) => {
            // Player 1
            const cellAddress1 = sheet.getCell(rowIndex, startCellRef.column);
            cellAddress1.value = match.player1;
            // Player 2
            rowIndex++;
            const cellAddress2 = sheet.getCell(rowIndex, startCellRef.column);
            cellAddress2.value = match.player2;
            rowIndex++;
        });
        const sourceWorkbook = xlsx_1.default.readFile(tournPath);
        const tourn_size = tournamentData.length * 2;
        const sheet2Name = `Top${tourn_size}`;
        const sourceSheet = sourceWorkbook.Sheets[sheet2Name];
        if (!sourceSheet) {
            throw new Error(`シート ${sheetName} が見つかりません。`);
        }
        if (!fs.existsSync(filePath)) {
            copyExcelFile(sourcePath, filePath);
        }
        // sheet2をコピーしてfilePathに追加
    }
    // ファイルを書き込む
    yield workbook.xlsx.writeFile(filePath);
    console.log(`データが書き込まれました: ${filePath}`);
});
// セル参照を行列インデックスに変換する関数
const decodeCell = (cellRef) => {
    const regex = /^([A-Z]+)(\d+)$/; // セルの参照形式にマッチする正規表現（例: "C3"）
    const match = regex.exec(cellRef);
    if (!match) {
        throw new Error(`無効なセル参照: ${cellRef}`);
    }
    const column = match[1]; // 列名（例: "C"）
    const row = parseInt(match[2], 10); // 行番号（例: 3）
    // 列名（アルファベット）を数字に変換（例: "C" -> 3）
    let columnIndex = 0;
    for (let i = 0; i < column.length; i++) {
        columnIndex = columnIndex * 26 + (column.charCodeAt(i) - 65 + 1);
    }
    return { row, column: columnIndex };
};
//ユーザ登録エンドポイント
app.post("/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, email, password } = req.body.data;
    console.log("req.body", req.body);
    // バリデーション
    if (!name || !email || !password) {
        console.log("Name, email, and password are required");
        return res.status(400).send("Name, email, and password are required");
    }
    // パスワードのハッシュ化
    const hashedPassword = yield bcrypt_1.default.hash(password, 10);
    // 新しいユーザーオブジェクトの作成
    const newUser = {
        id: (0, uuid_1.v4)(),
        name,
        email,
        password: hashedPassword,
    };
    // ユーザーデータを読み込み、新しいユーザーを追加
    const users = getDataFromFile(usersdataPath);
    users.push(newUser);
    // ユーザーデータを書き込み
    saveDataToFile(users, usersdataPath);
    // レスポンスを返す
    console.log("newUser", newUser);
    res.status(201).send("User registered" + newUser);
}));
// ログインエンドポイント
app.post("/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body.data;
    const users = getDataFromFile(usersdataPath);
    const user = users.find((u) => u.email === email);
    if (!user || !(yield bcrypt_1.default.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jsonwebtoken_1.default.sign({ user }, process.env.JWT_SECRET, {
        expiresIn: "1h",
    });
    res.json({ token });
}));
//大会情報取得エンドポイント
app.get("/get-tourn-file", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = req.query.id;
        const tourInfo = getDataFromFile(ProjectsPath);
        const tour = tourInfo.find((info) => info.id === parseInt(id));
        if (!tour) {
            return res
                .status(404)
                .json({ error: "Tournament information not found" });
        }
        const players = getDataFromFile(tour.players);
        const matches = getDataFromFile(tour.results);
        const formattedDate = tour.date.replace(/\//g, "");
        const sourceFilePath = path_1.default.join(__dirname, "../data/Inputdata/output.xlsx");
        const tournFilePath = path_1.default.join(__dirname, "../data/Inputdata/tournament.xlsx");
        const destinationFilePath = path_1.default.join(__dirname, `../data/Inputdata/${tour.name}${formattedDate}.xlsx`);
        writeDataToExcel(destinationFilePath, matches, tournFilePath, sourceFilePath);
        res.download(destinationFilePath, `${tour.name}${tour.date}.xlsx`, (err) => __awaiter(void 0, void 0, void 0, function* () {
            if (err) {
                console.error("File download error:", err);
            }
            console.log(`ファイルがダウンロードされました: ${destinationFilePath}`);
            yield deleteFile(destinationFilePath);
        }));
    }
    catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
//プレイヤーデータを追加するエンドポイント
app.post("/add-player", (req, res) => {
    const playerData = getDataFromFile(jsonFilePath);
    // 新しいIDは、既存のデータの数として設定
    const newId = playerData.length + 1;
    // デフォルト値を設定
    const newPlayer = {
        id: newId,
        Regist_number: req.body.Regist_number || 0,
        seed: req.body.seed || 0,
        team_rank: req.body.team_rank || 1,
        team: req.body.team,
        name: req.body.name,
    };
    // 新しいデータを追加
    playerData.push(newPlayer);
    // 更新されたデータをファイルに保存
    saveDataToFile(playerData, jsonFilePath);
    res
        .status(201)
        .json({ message: "Player added successfully", player: newPlayer });
});
// プレイヤーデータを削除するエンドポイント
app.delete("/delete-player", (req, res) => {
    const { team, name } = req.body;
    let playerData = getDataFromFile(jsonFilePath);
    // 指定された team と name に一致するデータを探す
    const playerIndex = playerData.findIndex((player) => player.team === team && player.name === name);
    if (playerIndex === -1) {
        return res.status(404).json({ message: "Player not found" });
    }
    // データを削除
    playerData.splice(playerIndex, 1);
    // IDを再割り当て
    playerData = playerData.map((player, index) => (Object.assign(Object.assign({}, player), { id: index })));
    // 更新されたデータをファイルに保存
    saveDataToFile(playerData, jsonFilePath);
    res.status(200).json({ message: "Player deleted successfully" });
});
//割り当てエンドポイント
app.get("/locate-players", (req, res) => {
    const playerData = getDataFromFile("data/Players_data/pleyerdata_20240919T004302860Z_76249.json");
    playerData.sort((a, b) => a.seed - b.seed);
    const filledPlayerData = fillnull(playerData);
    const result = locatePlayers(filledPlayerData);
    console.log(result.tournament);
    res.json(result.tournament);
});
//トーナメントデータ取得エンドポイント
app.get("/get-tournament", (req, res) => {
    const tournamentData = getDataFromFile("data/Results_data/result_20240925T095311426Z_92407.json");
    res.json(tournamentData);
});
//管理者用データ取得エンドポイント
app.get("/get-admin-data", (req, res) => {
    const id = parseInt(req.query.id);
    const Tour_Info = getDataFromFile(ProjectsPath);
    const tour = Tour_Info.filter((info) => info.id === id).flat()[0];
    if (!tour) {
        return res.status(404).json({ error: "Tournament information not found" });
    }
    const players = getDataFromFile(tour.players);
    const matches = getDataFromFile(tour.results);
    const data = { players, matches };
    res.json(data);
});
// ファイルを削除する関数
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "data/Inputdata/"); // 保存先ディレクトリ
    },
    filename: (req, file, cb) => {
        cb(null, generateInputFileName(file.originalname)); //
    },
});
// ファイルアップロードの設定
const upload = (0, multer_1.default)({ storage: storage });
app.post("/entry", upload.single("file"), (req, res) => {
    const id = req.body.id;
    const file = req.file;
    if (!file) {
        console.error("No file uploaded");
        return res.status(400).send("No file uploaded");
    }
    const tourinfo = getDataFromFile(ProjectsPath);
    const date = new Date();
    const tour = tourinfo.find((info) => info.id === id);
    if (date > new Date(tour.deadline)) {
        return res.status(400).send("The deadline has passed");
    }
    const data = getDatafromExcel(tour, file);
    const players = getDataFromFile(tour.players);
    if (!players) {
        return res.status(404).json({ error: "Player information not found" });
    }
    console.log("data", data);
    if (tour.competition[0] === true)
        players["singles"].push(data.Players_Data["singles"]);
    if (tour.competition[1] === true)
        players["doubles"].push(data.Players_Data["doubles"]);
    if (tour.competition[2] === true)
        players.Players_Data["team"].push(data["team"]);
    console.log("players", players);
    saveDataToFile(players, tour.players);
    res.json({ message: "Data uploaded successfully" });
});
const Singles_Mapping = {
    B: "name",
    C: "team",
    D: "team_rank",
};
const Doubles_Mapping = {
    B: "name1",
    C: "name2",
    D: "team",
    E: "team_rank",
};
const Singles_keyTransform = Object.keys(Singles_Mapping);
const Doubles_keyTransform = Object.keys(Doubles_Mapping);
const transformData = (data, competition) => {
    let transformedData = {};
    if (competition["singles"] === true) {
        transformedData = Object.assign(Object.assign({}, transformedData), { singles: data.singles.map((item) => {
                const transformedItem = {};
                Singles_keyTransform.forEach((key) => {
                    transformedItem[Singles_Mapping[key]] = item[key];
                });
                return transformedItem;
            }) });
    }
    if (competition["doubles"] === true) {
        transformedData = Object.assign(Object.assign({}, transformedData), { doubles: data.doubles.map((item) => {
                const transformedItem = {};
                Doubles_keyTransform.forEach((key) => {
                    transformedItem[Doubles_Mapping[key]] = item[key];
                });
                return transformedItem;
            }) });
    }
    if (competition["team"] === true) {
        transformedData = {
            team: data.team.map((item) => {
                const transformedItem = {};
                Singles_keyTransform.forEach((key) => {
                    transformedItem[Singles_Mapping[key]] = item[key];
                });
                return transformedItem;
            }),
        };
    }
    return transformedData;
};
// エクセルの日付をJSの日付に変換
const excelDateToJSDate = (serial) => {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const fractional_day = serial - Math.floor(serial) + 0.0000001;
    let total_seconds = Math.floor(86400 * fractional_day);
    const seconds = total_seconds % 60;
    total_seconds -= seconds;
    const hours = Math.floor(total_seconds / (60 * 60));
    const minutes = Math.floor(total_seconds / 60) % 60;
    return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate(), hours, minutes, seconds);
};
// ファイル名を生成する関数
const generateFileName = (FileKindName) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
    const randomNum = Math.floor(Math.random() * 100000);
    return `${FileKindName}_${timestamp}_${randomNum}.json`;
};
// 入力ファイル名を生成する関数
const generateInputFileName = (originalname) => {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
    const randomNum = Math.floor(Math.random() * 100000);
    const ext = path_1.default.extname(originalname);
    return `${timestamp}_${randomNum}${ext}`;
};
// アップロードされたExcelファイルからデータを取得する関数
function getDatafromExcel(tour, file) {
    const workbook = xlsx_1.default.readFile(file.path);
    const startRow = 4;
    const data = {};
    // 1枚目のシートのデータを取得
    if (tour.competition["singles"] === true) {
        const firstSheetName = workbook.SheetNames[0];
        const firstSheet = workbook.Sheets[firstSheetName];
        const sheet1_columns = ["B", "C", "D"];
        const singles = [];
        const range1 = firstSheet["!ref"];
        if (!range1)
            throw new Error("シートの範囲が取得できませんでした");
        const endRow1 = xlsx_1.default.utils.decode_range(range1).e.r + 1;
        for (let row = startRow; row <= endRow1; row++) {
            const rowData = {};
            sheet1_columns.forEach((col) => {
                const cellAddress = `${col}${row}`;
                const cell = firstSheet[cellAddress];
                rowData[col] = cell ? cell.v : null;
            });
            if (rowData["B"] !== null &&
                rowData["C"] !== null &&
                rowData["D"] !== null)
                singles.push(rowData);
        }
        data["singles"] = singles;
    }
    if (tour.competition["doubles"] === true) {
        //2枚目のシートのデータを取得
        const secondsheetName = workbook.SheetNames[1];
        const secondsheet = workbook.Sheets[secondsheetName];
        const sheet2_columns = ["B", "C", "D", "E"];
        const doubles = [];
        // シートの範囲を取得
        const range = secondsheet["!ref"];
        if (!range)
            throw new Error("シートの範囲が取得できませんでした");
        // 範囲を解析して、最終行を取得
        const endRow = xlsx_1.default.utils.decode_range(range).e.r + 1;
        for (let row = startRow; row <= endRow; row++) {
            const rowData = {};
            sheet2_columns.forEach((col) => {
                const cellAddress = `${col}${row}`;
                const cell = secondsheet[cellAddress];
                rowData[col] = cell ? cell.v : null;
            });
            if (rowData["B"] !== null &&
                rowData["C"] !== null &&
                rowData["D"] !== null &&
                rowData["E"] !== null) {
                doubles.push(rowData);
            }
        }
        data["doubles"] = doubles;
    }
    if (tour.competition["team"] === true) {
        //3枚目のシートのデータを取得
        const thirdsheetName = workbook.SheetNames[2];
        const thirdsheet = workbook.Sheets[thirdsheetName];
        const sheet3_columns = ["C"];
        const team = [];
        // シートの範囲を取得
        const range3 = thirdsheet["!ref"];
        if (!range3)
            throw new Error("シートの範囲が取得できませんでした");
        // 範囲を解析して、最終行を取得
        const endRow3 = xlsx_1.default.utils.decode_range(range3).e.r + 1;
        for (let row = startRow; row <= endRow3; row++) {
            const rowData = {};
            sheet3_columns.forEach((col) => {
                const cellAddress = `${col}${row}`;
                const cell = thirdsheet[cellAddress];
                rowData[col] = cell ? cell.v : null;
            });
            team.push(rowData);
        }
        if (team[0]["C"] !== null)
            data["team"] = team;
    }
    const transformedData = transformData(data, tour.competition);
    console.log("transformedData", transformedData);
    fs.unlink(file.path, (err) => {
        if (err) {
            console.error("Failed to delete uploaded file:", err);
        }
    });
    return { Players_Data: transformedData };
}
// トーナメントにデータを割り当てる関数
const locateRound = (players) => {
    const tournament = {}; // tournamentをオブジェクトとして初期化
    const roundSize = Math.log2(players.length);
    let border = players.length / 2; // 最初のボーダーサイズを設定
    let id = 0; // IDの初期化
    let idx = 0; // インデックスの初期化
    // 各ラウンドを処理
    for (let round = 1; round <= roundSize; round++) {
        tournament[round] = []; // ラウンドの配列を初期化
        let roundData = []; // ラウンドデータの一時格納用配列
        // 各対戦のデータを生成
        for (let i = 0; i < border; i++) {
            if (round === 1) {
                roundData.push({
                    id: i + 1,
                    player1: players[idx].name,
                    team1: players[idx].team,
                    player2: players[idx + 1].name,
                    team2: players[idx + 1].team,
                    winner: "",
                    loser: "",
                    result: {
                        count: { c1: 0, c2: 0 },
                        game: [],
                    },
                });
            }
            else {
                roundData.push({
                    id: i + 1,
                    player1: "",
                    team1: "",
                    player2: "",
                    team2: "",
                    winner: "",
                    loser: "",
                    result: {
                        count: { c1: 0, c2: 0 },
                        game: [],
                    },
                });
            }
            id++; // 次の対戦のIDを進めるために1を加算
            idx += 2; // 次の対戦のIDを進めるために2を加算
        }
        idx = 1; // 次のラウンドのインデックスをリセット
        // 各ラウンドのデータをトーナメントに追加
        tournament[round].push(...roundData);
        border /= 2; // 次のラウンドのボーダーサイズを半分に
    }
    for (let i = 0; i < tournament["1"].length; i++) {
        const id = i + 1;
        const next_idx = Math.floor(i / 2);
        if (tournament["1"][i].player1 === "bye") {
            tournament["1"][i].winner = tournament["1"][i].player2;
        }
        else if (tournament["1"][i].player2 === "bye") {
            tournament["1"][i].winner = tournament["1"][i].player1;
        }
        if (tournament["1"][i].id % 2 === 1) {
            tournament["2"][next_idx].player1 = tournament["1"][i].winner;
        }
        else if (tournament["1"][i].id % 2 === 0) {
            tournament["2"][next_idx].player2 = tournament["1"][i].winner;
        }
    }
    const tournament_data = {};
    tournament_data["base_tournament"] = tournament;
    return tournament_data;
};
//順位決定戦のトーナメント生成
const Rankinglocate = (tournament_data, ranking) => {
    const tourn_num = Math.log2(ranking) - 1; //生成するトーナメント数
    let round_size = Math.log2(ranking) - 1; //つぎのトーナメントのラウンド数
    const ranking_tournament = {};
    let rank_num = "";
    for (let i = 1; i <= tourn_num; i++) {
        rank_num = Math.pow(2, round_size + 1).toString();
        ranking_tournament[rank_num] = {};
        for (let j = 1; j <= round_size; j++) {
            ranking_tournament[rank_num][j.toString()] = {};
            for (let k = 0; k < Math.pow(2, round_size - j); k++) {
                ranking_tournament[rank_num][j.toString()][k + 1] = Object.assign(Object.assign({}, ranking_tournament[rank_num][k]), { player1: "", player2: "", winner: "", loser: "", result: {
                        count: { c1: 0, c2: 0 },
                        game: [],
                    } });
            }
        }
        round_size--;
    }
    // console.log(ranking_tournament["4"]);
    // console.log(ranking_tournament["8"]);
    // console.log(ranking_tournament);
    tournament_data["ranking_tournament"] = ranking_tournament;
    return tournament_data;
};
// 簡易版ファイルアップロードエンドポイント
app.post("/generate-tourn", upload.single("file"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("req.body", req.body);
    const name = req.body.name;
    const date = req.body.date;
    const venue = req.body.venue;
    const deadline = req.body.deadline;
    const ranking = req.body.ranking;
    const sport = req.body.sport;
    const competition = JSON.parse(req.body.competition);
    try {
        // 選手情報、結果情報の格納先ファイル名を生成
        const newPlayersFileName = generateFileName("players");
        const newPlayersFilePath = path_1.default.join("data/Players_data", newPlayersFileName);
        const newResultFileName = generateFileName("result");
        const newResultFilePath = path_1.default.join("data/Results_data", newResultFileName);
        let point_name = "";
        if (sport === "badminton" ||
            sport === "softtennis" ||
            sport === "tabletennis") {
            point_name = "game";
        }
        else if (sport === "tennis") {
            point_name = "set";
        }
        // 大会情報を格納した配列に選手情報、結果情報のパスを追加する処理
        let tourInfoData = yield getDataFromFile(ProjectsPath);
        const addInfoData = {
            id: (0, uuid_1.v4)(),
            name: name,
            date: date,
            venue: venue,
            deadline: deadline,
            players: newPlayersFilePath,
            results: newResultFilePath,
            sport: sport,
            point_name: point_name,
            ranking: ranking,
            competition: competition,
            generate_tourn: false,
        };
        // 各トーナメント情報を格納したファイルにデータを追加する処理
        tourInfoData = tourInfoData.flat();
        let tour_array = {
            singles: [],
            doubles: [],
            team: [],
        };
        let players_array = {
            singles: [],
            doubles: [],
            team: [],
        };
        tourInfoData.push(addInfoData);
        // 必要なファイルにデータを保存
        yield saveDataToFile(tourInfoData, ProjectsPath);
        yield saveDataToFile(players_array, newPlayersFilePath);
        yield saveDataToFile(tour_array, newResultFilePath);
        res.json({
            message: "Data uploaded successfully",
            data: addInfoData,
        });
    }
    catch (error) {
        console.error("Error processing file:", error);
        res.status(500).json({ message: "Error processing file" });
    }
}));
//大会情報取得エンドポイント
app.get("/get-all-tour-info", (req, res) => {
    const tournamentInfo = getDataFromFile(ProjectsPath);
    res.json(tournamentInfo);
});
app.get("/get-tour-info", (req, res) => {
    const id = parseInt(req.query.id);
    const tournamentInfo = getDataFromFile(ProjectsPath);
    const tour = tournamentInfo.filter((info) => info.id === id).flat()[0];
    if (!tour) {
        return res.status(404).json({ error: "Tournament information not found" });
    }
    res.json(tour);
});
//大会削除エンドポイント
app.delete("/delete-tour-info", (req, res) => {
    const { id } = req.query;
    const tourid = id;
    const tournamentInfo = getDataFromFile(ProjectsPath);
    const getInfo = tournamentInfo.filter((info) => info.id == tourid);
    let newInfo = tournamentInfo.filter((info) => info.id != tourid);
    const playersPath = getInfo.map((info) => info.players);
    const resultsPath = getInfo.map((info) => info.results);
    fs.unlink(playersPath[0], (err) => {
        if (err) {
            console.error(`Error removing uploaded file: ${err}`);
        }
    });
    fs.unlink(resultsPath[0], (err) => {
        if (err) {
            console.error(`Error removing uploaded file: ${err}`);
        }
    });
    saveDataToFile(newInfo, ProjectsPath);
    res.json({ message: "Tournament information deleted successfully" });
});
//選手情報編集エンドポイント
app.put("/edit-players", (req, res) => {
    const id = req.query.id;
    const competition = req.query.competition;
    if (typeof id !== "string" && typeof competition !== "string") {
        return res.status(400).send("Invalid id or competition");
    }
    const tourInfo = getDataFromFile(ProjectsPath);
    const tour = tourInfo.find((info) => info.id === parseInt(id));
    if (!tour) {
        return res.status(404).json({ error: "Tournament information not found" });
    }
    const playersParam = req.query.players;
    if (typeof playersParam !== "string") {
        return res.status(400).send("Invalid players");
    }
    const parseReq = JSON.parse(decodeURIComponent(playersParam));
    if (!parseReq.name) {
        return res.status(400).send("Invalid players2");
    }
    const playerData = getDataFromFile(tour.players);
    const playerIndex = playerData[competition].findIndex((player) => player.id === parseReq.id);
    const copyData = playerData[competition][playerIndex];
    console.log(copyData);
    playerData[competition][playerIndex] = parseReq;
    const matchData = getDataFromFile(tour.results);
    // const matchIndex = matchData[competition]["base_tournament"].findIndex(
    //   (match: any) =>
    //     match.player1 === copyData.name || match.player2 === copyData.name
    // );
    Object.keys(matchData[competition]["base_tournament"]).forEach((key) => {
        const matchIndex = matchData[competition]["base_tournament"][key].findIndex((match) => match.player1 === copyData.name || match.player2 === copyData.name);
        if (matchIndex !== -1) {
            if (matchData[competition]["base_tournament"][key][matchIndex].player1 ===
                copyData.name)
                matchData[competition]["base_tournament"][key][matchIndex].player1 =
                    parseReq.name;
            if (matchData[competition]["base_tournament"][key][matchIndex].winner ===
                copyData.name)
                matchData[competition]["base_tournament"][key][matchIndex].winner =
                    parseReq.name;
            else if (matchData[competition]["base_tournament"][key][matchIndex].player2 ===
                copyData.name)
                matchData[competition]["base_tournament"][key][matchIndex].player2 =
                    parseReq.name;
            if (matchData[competition]["base_tournament"][key][matchIndex].winner ===
                copyData.name)
                matchData[competition]["base_tournament"][key][matchIndex].winner =
                    parseReq.name;
        }
    });
    saveDataToFile(playerData, tour.players);
    saveDataToFile(matchData, tour.results);
});
//試合結果編集エンドポイント
app.put("/edit-results", (req, res) => {
    var _a;
    const id = req.query.id;
    const competition = req.query.competition;
    if (typeof id !== "string" && typeof competition !== "string") {
        return res.status(400).send("Invalid id or competition");
    }
    const resultsParam = req.query.match;
    if (typeof resultsParam !== "string") {
        return res.status(400).send("Invalid results");
    }
    const parseReq = JSON.parse(decodeURIComponent(resultsParam));
    if (!parseReq.result) {
        return res.status(400).send("Invalid results2");
    }
    console.log(parseReq);
    const tourInfo = getDataFromFile(ProjectsPath);
    const tour = tourInfo.find((info) => info.id === parseInt(id));
    if (!tour) {
        return res.status(404).json({ error: "Tournament information not found" });
    }
    const getResults = getDataFromFile(tour.results);
    if (!getResults[competition]) {
        return res.status(404).json({ error: "Competition not found" });
    }
    const tourn = getResults[competition]["base_tournament"];
    console.log(tourn);
    let next_key = "";
    const next_idx = Math.ceil(parseReq.id / 2 - 1);
    console.log(Math.ceil(parseReq.id / 2) - 1);
    for (let i = 1; i <= Object.keys(tourn).length; i++) {
        const key = i.toString();
        const idx = (_a = tourn[key]) === null || _a === void 0 ? void 0 : _a.findIndex((result) => result.player1 === parseReq.player1 &&
            result.player2 === parseReq.player2);
        if (idx) {
            next_key = (parseInt(key) + 1).toString();
            tourn[key][idx] = parseReq;
            console.log(tourn[key][idx]);
            break;
        }
    }
    if (next_key === "") {
        return res.status(404).json({ error: "Match not found" });
    }
    if (!tourn[next_key][next_idx]) {
        return res.status(404).json({ error: "Match not found" });
    }
    if (parseReq.id % 2 === 1) {
        tourn[next_key][next_idx].player1 = parseReq.winner;
    }
    else {
        tourn[next_key][next_idx].player2 = parseReq.winner;
    }
    console.log(tourn[next_key][next_idx]);
    saveDataToFile(getResults, tour.results); // 変更内容をファイルに保存
    res.json({ message: "Results updated successfully" });
});
// データ数以上の最小の2^n - データ数 個の要素分の {"m_id": 配列の長さ, "name1": "bye"} をデータ配列に追加する関数
const fillnull = (dataArray) => {
    const dataLength = dataArray.length;
    const nearestPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(dataLength)));
    const numberOfByeDataToAdd = nearestPowerOfTwo - dataLength;
    for (let i = 0; i < numberOfByeDataToAdd; i++) {
        //const m_id = dataLength + i + 1;
        const byeData = {
            //id: m_id,
            group: "",
            name: "bye",
            seed: -1,
            //Regist_number: 0,
            //team_rank: 0,
        }; // "none" group for bye players
        dataArray.push(byeData);
    }
    return dataArray;
};
// 距離スコアを計算する関数
function calculateDistanceScore(tournament) {
    let score = 0;
    const groupPositions = {};
    // グループごとに位置を収集
    tournament.forEach((player, index) => {
        if (!groupPositions[player.team]) {
            groupPositions[player.team] = [];
        }
        groupPositions[player.team].push(index);
    });
    // グループごとに距離のスコアを計算
    Object.values(groupPositions).forEach((positions) => {
        const n = positions.length;
        for (let i = 0; i < n - 1; i++) {
            for (let j = i + 1; j < n; j++) {
                score += Math.abs(positions[i] - positions[j]);
            }
        }
    });
    // 同グループの一回戦対戦があるたびにペナルティを与える
    for (let i = 0; i < tournament.length - 1;) {
        if (tournament[i].team === tournament[i + 1].team) {
            score -= tournament.length * 5; // ペナルティ値（適宜調整）
        }
        i + 2;
    }
    return score;
}
// 深いコピーを作成する関数
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}
//山登り法
function hillClimbing(tournament, topPosi, iterations = 100) {
    let bestTournament = deepCopy(tournament);
    let bestScore = calculateDistanceScore(bestTournament);
    for (let i = 0; i < iterations; i++) {
        let newTournament = deepCopy(bestTournament);
        // ランダムに非シード位置から2つのチームの位置を入れ替える
        let idx1 = 0;
        let idx2 = 0;
        let index = 0;
        while (true) {
            idx1 = Math.floor(Math.random() * (tournament.length - 1 - 0 + 1)) + 0;
            index = topPosi.findIndex((element) => element.includes(idx1));
            idx2 =
                Math.floor(Math.random() * (topPosi[index].length - 1 - 0 + 1)) + 0;
            idx2 = topPosi[index][idx2];
            if (tournament[idx1].seed != -1 && tournament[idx2].seed != -1)
                break;
        }
        [newTournament[idx1], newTournament[idx2]] = [
            newTournament[idx2],
            newTournament[idx1],
        ];
        const newScore = calculateDistanceScore(newTournament);
        //console.log(idx1, idx2, index, newScore, bestScore);
        if (newScore > bestScore) {
            bestScore = newScore;
            bestTournament = newTournament;
        }
        console.log("入れ替え要素1", idx1, "入れ替え要素2", idx2, "今回のスコア", newScore, "最高スコア", bestScore);
    }
    return { solution: bestTournament, score: bestScore };
}
// 選手割り当て
function locatePlayers(players) {
    let located = []; // 第1シードから順に選手の位置を格納
    let top_posi = [[], [], [], [], [], [], [], [], []]; // 入れ替え範囲の指定のため、割り当てられる順位ごとに別々の配列に格納
    let tournament = [];
    tournament[0] = players[0]; // 第1シードをトーナメントの先頭に割り当て
    tournament[players.length - 1] = players[1]; // 第2シードをトーナメントの最後に割り当て
    located.push(0); // 第1シードの位置を格納
    located.push(players.length - 1); // 第2シードの位置を格納
    top_posi[0].push(0); // 第1シードの位置を先頭の配列に格納
    top_posi[0].push(players.length - 1); // 第2シードの位置先頭の配列に格納
    let n = 2;
    let taisyou = 0; // 比較対象のインデックス
    let taisyou_posi = 0; // 比較対象のインデックスの位置
    let locate_size = tournament.length / n; // 割り当て位置を決める際に使用
    let l = 0; // 割り当て位置を決める際に使用
    let t = 0; // 入れ替え範囲配列のインデックスの指定に使用
    // トーナメント割り当て
    for (let i = 2; i < players.length; i++) {
        if (i + 1 > n * 2) {
            n = n * 2;
            locate_size = locate_size / 2;
            t++;
        }
        l = locate_size - 1;
        taisyou = n * 2 - i; // 比較対象のインデックス
        taisyou_posi = located[taisyou - 1]; // 比較対象のインデックスの位置
        if (taisyou_posi % 2 == 0) {
            // 比較対象のインデックスが偶数なら、locate_size分右にずらして割り当て
            tournament[taisyou_posi + l] = players[i];
            located[i] = taisyou_posi + l;
            top_posi[t].push(taisyou_posi + l);
        }
        else {
            // 比較対象のインデックスが奇数なら、locate_size分左にずらして割り当て
            tournament[taisyou_posi - l] = players[i];
            located[i] = taisyou_posi - l;
            top_posi[t].push(taisyou_posi - l);
        }
    }
    return { tournament, top_posi };
}
// トーナメントの組み合わせを生成する関数
function generateTournament(playerData) {
    const Noseed = playerData.filter((player) => player.seed === 0); //ノーシードの選手を抽出
    const Seed = playerData.filter((player) => player.seed > 0); //シード選手とnull要素を抽出
    const Nodata = playerData.filter((player) => player.seed === -1); //null要素を抽出
    Seed.sort((a, b) => {
        // シード選手をseedの昇順にソート
        if (a.seed === -1)
            return 1; // aのseedが-1ならaを後ろに移動
        if (b.seed === -1)
            return -1; // bのseedが-1ならbを後ろに移動
        return a.seed - b.seed; // seedに基づいて昇順にソート
    });
    Noseed.sort((a, b) => a.team_rank - b.team_rank); // ノーシードの選手をteam_rankの昇順にソート
    const players = Seed.concat(Noseed, Nodata); //ノーシードの選手とnull要素を結合
    const locateresult = locatePlayers(players);
    const result = hillClimbing(locateresult.tournament, locateresult.top_posi);
    return result.solution;
    //return tournament;
}
// トーナメント生成エンドポイント
app.get("/gentour", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const tournamentData = getDataFromFile(jsonFilePath);
        const filledPlayerData = fillnull(tournamentData);
        const tournament = generateTournament(filledPlayerData);
        //writecsv(tournament);
        //callPythonScript("python/app.py");
        res.json(tournament);
    }
    catch (error) {
        res.status(500).json({ error: "Error generating tournament" });
    }
}));
const authenticateToken = (req, res, next) => {
    var _a;
    const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token required" });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Invalid token" });
        }
        req.user = user;
        next();
    });
};
const authorizeRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden" });
        }
        next();
    };
};
app.get("/protected", authenticateToken, (req, res) => {
    if (!req.user) {
        return res.status(403).json({ message: "User not authenticated" });
    }
    res.json({ message: "This is a protected route", user: req.user });
});
app.get("/admin", authenticateToken, authorizeRole(["admin"]), (req, res) => {
    res.json({ message: "Welcome to the admin panel" });
});
// 編集者以上がアクセス可能なルート
app.get("/editor", authenticateToken, authorizeRole(["admin", "editor"]), (req, res) => {
    res.json({ message: "Welcome to the editor panel" });
});
// 閲覧者以上がアクセス可能なルート
app.get("/viewer", authenticateToken, authorizeRole(["admin", "editor", "viewer"]), (req, res) => {
    res.json({ message: "Welcome to the viewer panel" });
});
const port = process.env.PORT || 3001;
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
