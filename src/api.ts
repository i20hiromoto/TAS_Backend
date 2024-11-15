// src/app.ts
import express from "express";
import { Request, Response } from "express";
import * as bodyParser from "body-parser";
import * as fs from "fs";
import cors from "cors";
import multer from "multer";
import xlsx from "xlsx";
import path, { parse } from "path";
import { add, format } from "date-fns";
import { match } from "assert";

const app = express();
const jsonFilePath = "data/Players_data/sample_player.json";
const tournamentInfoFilePath =
  "data/TournamentInfo_data/TournamentInformation.json";

app.use(bodyParser.json());
app.use(cors());
app.use("/files", express.static(path.join(__dirname, "../data/Inputdata")));

interface PlayerData {
  id: number;
  name: string;
  seed: number;
  Regist_number: number;
  team_rank: number;
  team: string;
}

interface FirstSheetData {
  id: number;
  name: string | null;
  venue: string | null;
  date: string | null;
}

interface ResultData {
  id: number;
  player1: string;
  player2: string;
  winner: string;
  loser: string;
  result: {
    count: {
      c1: number;
      c2: number;
    };
    game: [];
  };
}

interface TourInfo {
  id: number;
  name: string;
  venue: string;
  date: string;
  gendate: string;
  players: string;
  results: string;
  sport: string;
  point_name: string;
  ranking: string;
  competition: [singles: false, doubles: false, group: false];
}

// playerdata.json ファイルからデータを読み取る関数
function getDataFromFile(filePath: string): any[] {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const playerData: PlayerData[] = JSON.parse(rawData);
  return playerData;
}

// playerdata.json ファイルにデータを書き込む関数
const saveDataToFile = (data: any[], jsonFilePath: any) => {
  fs.writeFileSync(jsonFilePath, JSON.stringify(data, null, 4), "utf-8");
};

//プレイヤーデータを追加するエンドポイント
app.post("/add-player", (req, res) => {
  const playerData = getDataFromFile(jsonFilePath);

  // 新しいIDは、既存のデータの数として設定
  const newId = playerData.length + 1;

  // デフォルト値を設定
  const newPlayer: PlayerData = {
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
  const playerIndex = playerData.findIndex(
    (player) => player.team === team && player.name === name
  );

  if (playerIndex === -1) {
    return res.status(404).json({ message: "Player not found" });
  }

  // データを削除
  playerData.splice(playerIndex, 1);

  // IDを再割り当て
  playerData = playerData.map((player, index) => ({
    ...player,
    id: index, // 先頭から1, 2, ... とidを設定
  }));

  // 更新されたデータをファイルに保存
  saveDataToFile(playerData, jsonFilePath);

  res.status(200).json({ message: "Player deleted successfully" });
});

//割り当てエンドポイント
app.get("/locate-players", (req, res) => {
  const playerData = getDataFromFile(
    "data/Players_data/pleyerdata_20240919T004302860Z_76249.json"
  );
  playerData.sort((a, b) => a.seed - b.seed);
  const filledPlayerData = fillnull(playerData);
  const result = locatePlayers(filledPlayerData);
  console.log(result.tournament);
  res.json(result.tournament);
});

app.get("/get-tournament", (req, res) => {
  const tournamentData = getDataFromFile(
    "data/Results_data/result_20240925T095311426Z_92407.json"
  );
  res.json(tournamentData);
});

app.get("/get-admin-data", (req, res) => {
  const id: number = parseInt(req.query.id as string);
  const Tour_Info = getDataFromFile(tournamentInfoFilePath);
  const tour = Tour_Info.filter((info) => info.id === id).flat()[0];
  if (!tour) {
    return res.status(404).json({ error: "Tournament information not found" });
  }
  const players = getDataFromFile(tour.players);
  const matches = getDataFromFile(tour.results);
  const data = { Tour_Info, players, matches };
  res.json(data);
});

const keyMapping: { [key: string]: string } = {
  B: "group",
  C: "name",
  D: "seed",
};

const keysToTransform = Object.keys(keyMapping);

const transformData = (data: any[]) => {
  return data.map((item) => {
    const transformed: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(item)) {
      if (keysToTransform.includes(key)) {
        const newKey = keyMapping[key];
        transformed[newKey] = value;
      } else {
        transformed[key] = value;
      }
    }
    return transformed;
  });
};

// エクセルの日付をJSの日付に変換
const excelDateToJSDate = (serial: any) => {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);

  const fractional_day = serial - Math.floor(serial) + 0.0000001;
  let total_seconds = Math.floor(86400 * fractional_day);

  const seconds = total_seconds % 60;
  total_seconds -= seconds;

  const hours = Math.floor(total_seconds / (60 * 60));
  const minutes = Math.floor(total_seconds / 60) % 60;

  return new Date(
    date_info.getFullYear(),
    date_info.getMonth(),
    date_info.getDate(),
    hours,
    minutes,
    seconds
  );
};

// ファイルを作成する関数
function createDirectory(filePath: any) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// ファイル名を生成する関数
const generateFileName = (FileKindName: any) => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const randomNum = Math.floor(Math.random() * 100000);
  return `${FileKindName}_${timestamp}_${randomNum}.json`;
};

// 入力ファイル名を生成する関数
const generateInputFileName = (originalname: any) => {
  const timestamp = new Date().toISOString().replace(/[-:.]/g, "");
  const randomNum = Math.floor(Math.random() * 100000);
  const ext = path.extname(originalname);
  return `${timestamp}_${randomNum}${ext}`;
};

// ファイルを削除する関数
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "data/Inputdata/"); // 保存先ディレクトリ
  },
  filename: (req, file, cb) => {
    cb(null, generateInputFileName(file.originalname)); //
  },
});

// ファイルアップロードの設定
const upload = multer({ storage: storage });

// アップロードされたExcelファイルからデータを取得する関数
function getDatafromExcel(file: any): {
  Tour_Info: FirstSheetData;
  Players_Data: any[];
} {
  const workbook = xlsx.readFile(file.path);

  // 1枚目のシートのデータを取得
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];
  const Tour_Info: FirstSheetData = {
    id: 0,
    name: firstSheet["B4"] ? firstSheet["B4"].v : null,
    venue: firstSheet["C4"] ? firstSheet["C4"].v : null,
    date: firstSheet["D4"]
      ? typeof firstSheet["D4"].v === "number"
        ? excelDateToJSDate(firstSheet["D4"].v).toLocaleDateString()
        : firstSheet["D4"].v
      : null,
  };

  //2枚目のシートのデータを取得
  const secondsheetName = workbook.SheetNames[1];
  const secondsheet = workbook.Sheets[secondsheetName];
  const startRow = 4;
  //const endRow = parseInt(size) + 3;
  const columns = ["B", "C", "D"];
  const data = [];
  // シートの範囲を取得
  const range = secondsheet["!ref"];
  if (!range) throw new Error("シートの範囲が取得できませんでした");

  // 範囲を解析して、最終行を取得
  const endRow = xlsx.utils.decode_range(range).e.r + 1;
  for (let row = startRow; row <= endRow; row++) {
    const rowData: any = {};
    columns.forEach((col) => {
      const cellAddress = `${col}${row}`;
      const cell = secondsheet[cellAddress];
      rowData[col] = cell ? cell.v : null;
    });
    data.push(rowData);
  }
  const transformedData = transformData(data);
  // const playerIndex = transformedData.findIndex(
  //   (player) =>
  //     player.group === null && player.name === null && player.seed === null
  // );
  // transformedData.splice(playerIndex, 1);
  fs.unlink(file.path, (err) => {
    if (err) {
      console.error("Failed to delete uploaded file:", err);
    }
  });
  return { Tour_Info, Players_Data: transformedData };
}

// トーナメントにデータを割り当てる関数
const locateRound = (players: any[]) => {
  const tournament: { [key: string]: any[] } = {}; // tournamentをオブジェクトとして初期化
  const roundSize = Math.log2(players.length);
  let border = players.length / 2; // 最初のボーダーサイズを設定
  let id = 0; // IDの初期化
  let idx = 0; // インデックスの初期化

  // 各ラウンドを処理
  for (let round = 1; round <= roundSize; round++) {
    tournament[round] = []; // ラウンドの配列を初期化
    let roundData: ResultData[] = []; // ラウンドデータの一時格納用配列
    // 各対戦のデータを生成
    for (let i = 0; i < border; i++) {
      if (round === 1) {
        roundData.push({
          id: i + 1,
          player1: players[idx].name,
          player2: players[idx + 1].name,
          winner: "",
          loser: "",
          result: {
            count: { c1: 0, c2: 0 },
            game: [],
          },
        });
      } else {
        roundData.push({
          id: i + 1,
          player1: "",
          player2: "",
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
    } else if (tournament["1"][i].player2 === "bye") {
      tournament["1"][i].winner = tournament["1"][i].player1;
    }
    if (tournament["1"][i].id % 2 === 1) {
      tournament["2"][next_idx].player1 = tournament["1"][i].winner;
    } else if (tournament["1"][i].id % 2 === 0) {
      tournament["2"][next_idx].player2 = tournament["1"][i].winner;
    }
  }
  const tournament_data: {
    [key: string]: { [key: string]: any[] };
  } = {};
  tournament_data["base_tournament"] = tournament;
  return tournament_data;
};

//順位決定戦のトーナメント生成
const Rankinglocate = (
  tournament_data: { [key: string]: { [key: string]: any } },
  ranking: any
) => {
  const tourn_num = Math.log2(ranking) - 1; //生成するトーナメント数
  let round_size = Math.log2(ranking) - 1; //つぎのトーナメントのラウンド数
  const ranking_tournament: { [key: string]: { [key: string]: any } } = {};
  let rank_num = "";

  for (let i = 1; i <= tourn_num; i++) {
    rank_num = Math.pow(2, round_size + 1).toString();
    ranking_tournament[rank_num] = {};
    for (let j = 1; j <= round_size; j++) {
      ranking_tournament[rank_num][j.toString()] = {};
      for (let k = 0; k < Math.pow(2, round_size - j); k++) {
        ranking_tournament[rank_num][j.toString()][k + 1] = {
          ...ranking_tournament[rank_num][k],
          player1: "",
          player2: "",
          winner: "",
          loser: "",
          result: {
            count: { c1: 0, c2: 0 },
            game: [],
          },
        };
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
app.post("/upload_simple", upload.single("file"), async (req, res) => {
  const file = req.file;
  const sport = req.body.selectValue;
  const ranking = req.body.selectValue2;
  const competition = req.body.selectValue3;
  const cmp_array = [false, false, false];
  console.log(competition);
  if (competition === "singles") {
    cmp_array[0] = true;
  }
  if (competition === "doubles") {
    cmp_array[1] = true;
  }
  if (competition === "group") {
    cmp_array[2] = true;
  }
  console.log(cmp_array);

  if (!file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const data: any = await getDatafromExcel(file);

    // 選手情報、結果情報の格納先ファイル名を生成
    const newPlayersFileName = generateFileName("players");
    const newPlayersFilePath = path.join(
      "data/Players_data",
      newPlayersFileName
    );
    const newResultFileName = generateFileName("result");
    const newResultFilePath = path.join("data/Results_data", newResultFileName);
    const formattedDate = format(new Date(), "yyyy/MM/dd");

    let point_name = "";

    if (
      sport === "badminton" ||
      sport === "softtennis" ||
      sport === "tabletennis"
    ) {
      point_name = "game";
    } else if (sport === "tennis") {
      point_name = "set";
    }

    // 大会情報を格納した配列に選手情報、結果情報のパスを追加する処理
    const addInfoData = {
      ...data.Tour_Info,
      gendate: formattedDate,
      players: newPlayersFilePath,
      results: newResultFilePath,
      sport: sport,
      point_name: point_name,
      ranking: ranking,
      competition: cmp_array,
    };

    // 各トーナメント情報を格納したファイルにデータを追加する処理
    let tourInfoData: any[] = await getDataFromFile(tournamentInfoFilePath);
    addInfoData.id = tourInfoData.length + 1;
    tourInfoData = tourInfoData.flat();

    let tour_array: { [key: string]: any[] } = {
      singles: [],
      doubles: [],
      team: [],
    };
    let players_array: { [key: string]: any[] } = {
      singles: [],
      doubles: [],
      team: [],
    };

    tourInfoData.push(addInfoData);

    const sortedSeed = data.Players_Data.sort(
      (a: any, b: any) => a.seed - b.seed
    );

    const adjustedPlayers = fillnull(sortedSeed);
    for (let i = 1; i < adjustedPlayers.length; i++) {
      adjustedPlayers[i - 1].id = i;
    }
    if (cmp_array[0] == true) {
      players_array["singles"] = adjustedPlayers;
    }
    if (cmp_array[1] == true) {
      players_array["doubles"] = adjustedPlayers;
    }
    if (cmp_array[2] == true) {
      players_array["group"] = adjustedPlayers;
    }
    const result = locatePlayers(adjustedPlayers);
    let tournament: any = locateRound(result.tournament);
    if (ranking !== "none") {
      tournament = Rankinglocate(tournament, ranking);
    }
    if (cmp_array[0] === true) {
      tour_array["singles"] = [];
      tour_array["singles"] = tournament;
    } else if (cmp_array[1] === true) {
      tour_array["doubles"] = [];
      tour_array["doubles"] = tournament;
    } else if (cmp_array[2] === true) {
      tour_array["group"] = [];
      tour_array["group"] = tournament;
    }

    // 必要なファイルにデータを保存
    await saveDataToFile(tourInfoData, tournamentInfoFilePath);
    await saveDataToFile(players_array as any, newPlayersFilePath);
    await saveDataToFile(tour_array as any, newResultFilePath);

    res.json({
      message: "Data uploaded successfully",
      data: addInfoData,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ message: "Error processing file" });
  }
});

// ファイルアップロードエンドポイント
app.post("/upload", upload.single("file"), async (req, res) => {});

//大会情報取得エンドポイント
app.get("/get-tour-info", (req, res) => {
  const tournamentInfo = getDataFromFile(tournamentInfoFilePath);
  res.json(tournamentInfo);
});

//大会削除エンドポイント
app.delete("/delete-tour-info", (req, res) => {
  const { id }: any = req.query;
  const tourid: number = id;
  const tournamentInfo: TourInfo[] = getDataFromFile(
    "data/TournamentInfo_data/TournamentInformation.json"
  );
  const getInfo: TourInfo[] = tournamentInfo.filter(
    (info) => info.id == tourid
  );
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
  for (let i = 0; i < newInfo.length; i++) {
    newInfo[i].id = newInfo[i].id - 1;
  }
  saveDataToFile(
    newInfo,
    "data/TournamentInfo_data/TournamentInformation.json"
  );
  res.json({ message: "Tournament information deleted successfully" });
});

//選手情報編集エンドポイント
app.put("/edit-players", (req, res) => {
  const id = req.query.id;
  const competition = req.query.competition as string;
  if (typeof id !== "string" && typeof competition !== "string") {
    return res.status(400).send("Invalid id or competition");
  }
  const tourInfo: TourInfo[] = getDataFromFile(tournamentInfoFilePath);
  const tour = tourInfo.find((info) => info.id === parseInt(id as string));
  if (!tour) {
    return res.status(404).json({ error: "Tournament information not found" });
  }
  const playersParam = req.query.players as string;
  if (typeof playersParam !== "string") {
    return res.status(400).send("Invalid players");
  }
  const parseReq = JSON.parse(decodeURIComponent(playersParam));
  if (!parseReq.name) {
    return res.status(400).send("Invalid players2");
  }

  const playerData: any = getDataFromFile(tour.players);
  const playerIndex = playerData[competition].findIndex(
    (player: any) => player.id === parseReq.id
  );
  const copyData = playerData[competition][playerIndex];
  console.log(copyData);
  playerData[competition][playerIndex] = parseReq;

  const matchData: any = getDataFromFile(tour.results);
  // const matchIndex = matchData[competition]["base_tournament"].findIndex(
  //   (match: any) =>
  //     match.player1 === copyData.name || match.player2 === copyData.name
  // );
  Object.keys(matchData[competition]["base_tournament"]).forEach((key) => {
    const matchIndex = matchData[competition]["base_tournament"][key].findIndex(
      (match: any) =>
        match.player1 === copyData.name || match.player2 === copyData.name
    );
    if (matchIndex !== -1) {
      if (
        matchData[competition]["base_tournament"][key][matchIndex].player1 ===
        copyData.name
      )
        matchData[competition]["base_tournament"][key][matchIndex].player1 =
          parseReq.name;
      if (
        matchData[competition]["base_tournament"][key][matchIndex].winner ===
        copyData.name
      )
        matchData[competition]["base_tournament"][key][matchIndex].winner =
          parseReq.name;
      else if (
        matchData[competition]["base_tournament"][key][matchIndex].player2 ===
        copyData.name
      )
        matchData[competition]["base_tournament"][key][matchIndex].player2 =
          parseReq.name;
      if (
        matchData[competition]["base_tournament"][key][matchIndex].winner ===
        copyData.name
      )
        matchData[competition]["base_tournament"][key][matchIndex].winner =
          parseReq.name;
    }
  });
  saveDataToFile(playerData as any, tour.players);
  saveDataToFile(matchData as any, tour.results);
});

//試合結果編集エンドポイント
app.put("/edit-results", (req, res) => {
  const id = req.query.id;
  const competition = req.query.competition;
  if (typeof id !== "string" && typeof competition !== "string") {
    return res.status(400).send("Invalid id or competition");
  }

  type Results = {
    [key: string]: { [key: string]: { [key: string]: ResultData[] } };
  };

  const resultsParam = req.query.match as string;
  if (typeof resultsParam !== "string") {
    return res.status(400).send("Invalid results");
  }

  const parseReq = JSON.parse(decodeURIComponent(resultsParam));
  if (!parseReq.result) {
    return res.status(400).send("Invalid results2");
  }
  console.log(parseReq);

  const tourInfo: TourInfo[] = getDataFromFile(tournamentInfoFilePath);
  const tour = tourInfo.find((info) => info.id === parseInt(id as string));
  if (!tour) {
    return res.status(404).json({ error: "Tournament information not found" });
  }

  const getResults: Results = getDataFromFile(
    tour.results
  ) as unknown as Results;
  if (!getResults[competition as string]) {
    return res.status(404).json({ error: "Competition not found" });
  }
  const tourn = getResults[competition as string]["base_tournament"];
  console.log(tourn);
  let next_key = "";
  const next_idx = Math.ceil(parseReq.id / 2 - 1);
  console.log(Math.ceil(parseReq.id / 2) - 1);
  for (let i = 1; i <= Object.keys(tourn).length; i++) {
    const key = i.toString();
    const idx = tourn[key]?.findIndex(
      (result: any) =>
        result.player1 === parseReq.player1 &&
        result.player2 === parseReq.player2
    );
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
  } else {
    tourn[next_key][next_idx].player2 = parseReq.winner;
  }
  console.log(tourn[next_key][next_idx]);
  saveDataToFile(getResults as unknown as any[], tour.results); // 変更内容をファイルに保存
  res.json({ message: "Results updated successfully" });
});

// データ数以上の最小の2^n - データ数 個の要素分の {"m_id": 配列の長さ, "name1": "bye"} をデータ配列に追加する関数
const fillnull = (dataArray: any[]) => {
  const dataLength = dataArray.length;
  const nearestPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(dataLength)));
  const numberOfByeDataToAdd = nearestPowerOfTwo - dataLength;

  for (let i = 0; i < numberOfByeDataToAdd; i++) {
    //const m_id = dataLength + i + 1;
    const byeData: any = {
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
function calculateDistanceScore(tournament: any[]): number {
  let score = 0;
  const groupPositions: { [group: string]: number[] } = {};

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
  for (let i = 0; i < tournament.length - 1; ) {
    if (tournament[i].team === tournament[i + 1].team) {
      score -= tournament.length * 5; // ペナルティ値（適宜調整）
    }
    i + 2;
  }

  return score;
}

// 深いコピーを作成する関数
function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

//山登り法
function hillClimbing(
  tournament: PlayerData[],
  topPosi: number[][],
  iterations: number = 100
): { solution: PlayerData[]; score: number } {
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
      if (tournament[idx1].seed != -1 && tournament[idx2].seed != -1) break;
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
    console.log(
      "入れ替え要素1",
      idx1,
      "入れ替え要素2",
      idx2,
      "今回のスコア",
      newScore,
      "最高スコア",
      bestScore
    );
  }

  return { solution: bestTournament, score: bestScore };
}

// 選手割り当て
function locatePlayers(players: any[]): {
  tournament: PlayerData[];
  top_posi: number[][];
} {
  let located: number[] = []; // 第1シードから順に選手の位置を格納
  let top_posi: number[][] = [[], [], [], [], [], [], [], [], []]; // 入れ替え範囲の指定のため、割り当てられる順位ごとに別々の配列に格納
  let tournament: PlayerData[] = [];
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
    } else {
      // 比較対象のインデックスが奇数なら、locate_size分左にずらして割り当て
      tournament[taisyou_posi - l] = players[i];
      located[i] = taisyou_posi - l;
      top_posi[t].push(taisyou_posi - l);
    }
  }

  return { tournament, top_posi };
}

// トーナメントの組み合わせを生成する関数
function generateTournament(playerData: any[]) {
  const Noseed: PlayerData[] = playerData.filter((player) => player.seed === 0); //ノーシードの選手を抽出
  const Seed: PlayerData[] = playerData.filter((player) => player.seed > 0); //シード選手とnull要素を抽出
  const Nodata = playerData.filter((player) => player.seed === -1); //null要素を抽出
  Seed.sort((a, b) => {
    // シード選手をseedの昇順にソート
    if (a.seed === -1) return 1; // aのseedが-1ならaを後ろに移動
    if (b.seed === -1) return -1; // bのseedが-1ならbを後ろに移動
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
app.get("/gentour", async (req: Request, res: Response) => {
  try {
    const tournamentData = getDataFromFile(jsonFilePath);
    const filledPlayerData = fillnull(tournamentData);
    const tournament = generateTournament(filledPlayerData);

    //writecsv(tournament);
    //callPythonScript("python/app.py");
    res.json(tournament);
  } catch (error) {
    res.status(500).json({ error: "Error generating tournament" });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
