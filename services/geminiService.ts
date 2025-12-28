import { GoogleGenAI } from "@google/genai";
import { Player, PlayerStatus } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateBattleReport = async (players: Player[]): Promise<string> => {
  if (!apiKey) {
    return "API Key missing. Cannot generate tactical report.";
  }

  const survivorCount = players.filter(p => p.status === PlayerStatus.SURVIVOR).length;
  const infectedCount = players.filter(p => p.status === PlayerStatus.INFECTED).length;
  
  // Format player list for the AI
  const playerListString = players.map(p => 
    `- ${p.name}: ${p.status === PlayerStatus.SURVIVOR ? '倖存' : (p.status === PlayerStatus.INFECTED ? '已感染/屍變' : '已淘汰')}`
  ).join('\n');

  const prompt = `
    你是一個虛構的「現實大逃殺」或「殭屍生存遊戲」的戰地記者兼廣播員。
    目前的遊戲狀態如下：
    倖存者人數: ${survivorCount}
    感染者人數: ${infectedCount}
    
    玩家名單與狀態:
    ${playerListString}
    
    請根據以上資訊，生成一段簡短、緊張、充滿戲劇張力的戰況廣播（約 50-80 字）。
    風格要像電影裡的緊急廣播，帶有末日感。如果感染者多，請強調絕望；如果倖存者多，請強調希望。
    使用繁體中文。
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "通訊干擾... 無法接收戰況報告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "通訊中斷。";
  }
};