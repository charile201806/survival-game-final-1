
import { GoogleGenAI } from "@google/genai";
import { Player, PlayerStatus } from "../types";

export const generateBattleReport = async (players: Player[]): Promise<string> => {
  // 每次呼叫時才從環境變數讀取並建立實例
  const apiKey = process.env.GEMINI_API_KEY || '';
  
  if (!apiKey) {
    return "系統異常：[GEMINI_API_KEY] 未配置。";
  }

  const ai = new GoogleGenAI({ apiKey });

  const survivorCount = players.filter(p => p.status === PlayerStatus.SURVIVOR).length;
  const infectedCount = players.filter(p => p.status === PlayerStatus.INFECTED).length;
  const eliminatedCount = players.filter(p => p.status === PlayerStatus.ELIMINATED).length;
  
  const playerListString = players.map(p => 
    `- ${p.name}: ${p.status === PlayerStatus.SURVIVOR ? '倖存' : (p.status === PlayerStatus.INFECTED ? '已感染' : '已淘汰')}`
  ).join('\n');

  const prompt = `
    你是一個虛構的現實殭屍生存遊戲的廣播員。
    目前狀態：倖存者 ${survivorCount}, 感染者 ${infectedCount}, 淘汰 ${eliminatedCount}。
    名單：\n${playerListString}
    請生成一段 50 字內、充滿末日緊張感的繁體中文戰況廣播。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "通訊干擾中...";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "連線失敗：AI 衛星通訊無法建立。";
  }
};
