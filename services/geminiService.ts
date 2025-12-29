
import { GoogleGenAI } from "@google/genai";
import { Player, PlayerStatus } from "../types";

export const generateBattleReport = async (players: Player[]): Promise<string> => {
  // 必須使用 process.env.API_KEY
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "錯誤：[API_KEY] 尚未配置。請檢查環境設定。";
  }

  const ai = new GoogleGenAI({ apiKey });

  const survivorCount = players.filter(p => p.status === PlayerStatus.SURVIVOR).length;
  const infectedCount = players.filter(p => p.status === PlayerStatus.INFECTED).length;
  const eliminatedCount = players.filter(p => p.status === PlayerStatus.ELIMINATED).length;
  
  const playerListString = players.map(p => 
    `- ${p.name}: [${p.status === PlayerStatus.SURVIVOR ? '活耀' : (p.status === PlayerStatus.INFECTED ? '生物標記異常/已感染' : '信號消失/已淘汰')}]`
  ).join('\n');

  const prompt = `
    你是一位負責監控「Z-ZONE」大逃殺戰區的軍事人工智慧指揮官。
    當前戰區概況：
    - 倖存作戰單位：${survivorCount}
    - 感染生物特徵：${infectedCount}
    - 確認終止單位：${eliminatedCount}
    
    詳細名單：
    ${playerListString}
    
    指令：
    請生成一段 60 字內、冷酷且具有軍事質感的繁體中文戰訊。
    請使用「警告」、「注意」、「通告」等詞彙。禁止使用可愛或輕鬆的語氣。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "衛星通訊鏈路中斷，無法取得具體情報。";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `通訊攔截失敗：${error?.message || "未知伺服器異常"}。`;
  }
};
