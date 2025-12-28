import { Player } from "../types";

// 使用 npoint.io 官方建議的 bins 接口
const API_BASE = "https://api.npoint.io/bins";

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
      console.error(`API Error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const result = await response.json();
    // npoint 返回的可能是 { "binId": "..." } 或 { "id": "..." }
    return result.binId || result.id || null;
  } catch (error) {
    console.error("Cloud Error (Create):", error);
    return null;
  }
};

export const updateRoom = async (roomId: string, players: Player[]): Promise<boolean> => {
  try {
    // 更新資料
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "PUT", // 更新通常建議使用 PUT
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        data: players, 
        lastUpdate: Date.now() 
      }),
    });
    
    // 如果 PUT 不行，嘗試 POST (npoint 有時兩者都支援)
    if (!response.ok) {
       const retry = await fetch(`${API_BASE}/${roomId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: players, lastUpdate: Date.now() }),
      });
      return retry.ok;
    }
    
    return response.ok;
  } catch (error) {
    console.error("Cloud Error (Update):", error);
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<Player[] | null> => {
  try {
    const response = await fetch(`${API_BASE}/${roomId}?t=${Date.now()}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("Cloud Error (Fetch):", error);
    return null;
  }
};