
import { GoogleGenAI } from "@google/genai";
import { Player, PlayerStatus } from "../types";

export const generateBattleReport = async (players: Player[]): Promise<string> => {
  // 強制每次調用都從環境變量讀取最新的 API_KEY
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return "系統衝突：[API_KEY] 丟失。請檢查主機通訊模組。";
  }

  const ai = new GoogleGenAI({ apiKey });

  const survivors = players.filter(p => p.status === PlayerStatus.SURVIVOR);
  const infected = players.filter(p => p.status === PlayerStatus.INFECTED);
  const eliminated = players.filter(p => p.status === PlayerStatus.ELIMINATED);
  
  const prompt = `
    你現在是 Z-ZONE 戰術人工智慧『奧丁』。
    戰區報告摘要：
    - 存活單位：${survivors.length} 名 (${survivors.map(p => p.name).join(', ')})
    - 感染標記：${infected.length} 名 (${infected.map(p => p.name).join(', ')})
    - 離線單位：${eliminated.length} 名
    
    任務：
    請根據以上數據，生成一段約 50 字的戰術評估。
    語氣要求：極度冷靜、專業、軍事化。
    範例：『警告。存活率跌至 40%。建議剩餘單位向 B 點集結，清除感染標記。』
    請勿使用廢話，直接輸出報告。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text?.trim() || "通訊干擾中，無法取得明文內容。";
  } catch (error: any) {
    console.error("Gemini Critical Failure:", error);
    if (error?.message?.includes('API key not valid')) {
      return "認證錯誤：無效的衛星存取金鑰。";
    }
    return `通訊攔截異常：${error?.message?.slice(0, 30)}... [代碼: ERR_COMMS_FAIL]`;
  }
};
