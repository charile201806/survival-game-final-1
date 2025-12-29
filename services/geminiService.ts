import { GoogleGenAI } from "@google/genai";
import { Player, PlayerStatus } from "../types";

export const generateBattleReport = async (players: Player[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "系統衝突：[API_KEY] 丟失。請檢查主機通訊模組。";

  const ai = new GoogleGenAI({ apiKey });

  const survivors = players.filter(p => p.status === PlayerStatus.SURVIVOR);
  const infected = players.filter(p => p.status === PlayerStatus.INFECTED);
  const eliminated = players.filter(p => p.status === PlayerStatus.ELIMINATED);
  
  const prompt = `
    你現在是 Z-ZONE 戰術人工智慧核心『奧丁』。
    目前戰區數據：
    - 倖存單位: ${survivors.length} 名 (${survivors.map(p => p.name).join(', ')})
    - 已感染單位: ${infected.length} 名 (${infected.map(p => p.name).join(', ')})
    - 永久損耗單位: ${eliminated.length} 名
    
    指令：
    1. 生成一段 60 字內的戰術評估。
    2. 語氣：極度冷酷、軍事化、充滿科幻感。
    3. 內容必須包含：目前最危險的情況，以及給剩餘倖存者的一條簡短建議（例如：移動到掩體、分組行動等）。
    4. 結尾必須標註 [計算勝率: XX%]。
    
    請直接輸出報告內容。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || "通訊干擾中，無法取得明文內容。";
  } catch (error: any) {
    console.error("AI Failure:", error);
    return "通訊攔截異常：無法執行戰術演算。建議重啟加密終端。";
  }
};
