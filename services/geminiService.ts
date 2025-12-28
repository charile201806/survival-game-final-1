
import { GoogleGenAI } from "@google/genai";
import { Player, PlayerStatus } from "../types";

// 改為讀取 GEMINI_API_KEY
const apiKey = (process.env.GEMINI_API_KEY) || '';
const ai = new GoogleGenAI({ apiKey });

export const generateBattleReport = async (players: Player[]): Promise<string> => {
  if (!apiKey || apiKey === '') {
    return "系統異常：[GEMINI_API_KEY] 未配置。請聯繫技術中心或檢查 Vercel 環境變數。";
  }

  const survivorCount = players.filter(p => p.status === PlayerStatus.SURVIVOR).length;
  const infectedCount = players.filter(p => p.status === PlayerStatus.INFECTED).length;
  const eliminatedCount = players.filter(p => p.status === PlayerStatus.ELIMINATED).length;
  
  const playerListString = players.map(p => 
    `- ${p.name}: ${p.status === PlayerStatus.SURVIVOR ? '倖存' : (p.status === PlayerStatus.INFECTED ? '已感染/屍變' : '已淘汰')}`
  ).join('\n');

  const prompt = `
    你是一個虛構的「現實大逃殺」或「殭屍生存遊戲」的戰地記者兼廣播員。
    目前的遊戲狀態如下：
    倖存者人數: ${survivorCount}
    感染者人數: ${infectedCount}
    已淘汰人數: ${eliminatedCount}
    
    玩家名單與狀態:
    ${playerListString}
    
    請根據以上資訊，生成一段簡短、緊張、充滿戲劇張力的戰況廣播（約 50-80 字）。
    風格要像電影裡的緊急廣播，帶有末日感。使用繁體中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "通訊干擾... 無法接收戰況報告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "連線失敗：衛星通訊中斷，請確認 API Key 是否有效。";
  }
};
