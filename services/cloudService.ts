import { Player } from "../types";

// 使用 npoint.io 提供的標準 JSON API
// 注意：npoint 的路徑通常為 / 建立，/[ID] 更新
const API_BASE = "https://api.npoint.io";

export const createRoom = async (players: Player[]): Promise<string | null> => {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        data: players, 
        lastUpdate: Date.now()
      }),
    });
    
    if (!response.ok) {
      console.error("API Error Response:", response.status);
      return null;
    }
    
    const result = await response.json();
    return result.id || null;
  } catch (error) {
    console.error("Cloud Error (Create):", error);
    return null;
  }
};

export const updateRoom = async (roomId: string, players: Player[]): Promise<boolean> => {
  try {
    // npoint 更新資料使用 POST 到特定的 ID 路徑
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "POST", 
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        data: players, 
        lastUpdate: Date.now() 
      }),
    });
    
    return response.ok;
  } catch (error) {
    console.error("Cloud Error (Update):", error);
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<Player[] | null> => {
  try {
    // 加上時間戳防止快取 (Cache)
    const response = await fetch(`${API_BASE}/${roomId}?t=${Date.now()}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Cloud Error (Fetch):", error);
    return null;
  }
};