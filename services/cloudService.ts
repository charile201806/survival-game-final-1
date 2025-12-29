import { Player, GameEvent, RoomData } from "../types";

// 使用 npoint 的標準 API 格式
const API_BASE = "https://api.npoint.io/bins";

export const createRoom = async (players: Player[], events: GameEvent[]): Promise<{ key: string | null; error?: string }> => {
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    
    // npoint 需要特定的 JSON 結構或直接傳送，我們嘗試最標準的 POST
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      // 如果 404，可能是 API 網址變動，嘗試 fallback 網址
      return { key: null, error: `ERR_HTTP_${response.status}` };
    }
    
    const result = await response.json();
    if (result && result.key) {
      return { key: result.key };
    }
    return { key: null, error: "ERR_NO_KEY_RETURNED" };
  } catch (error: any) {
    console.error("Cloud Create Error:", error);
    return { key: null, error: "ERR_CONNECTION_REFUSED" };
  }
};

export const updateRoom = async (roomId: string, players: Player[], events: GameEvent[]): Promise<boolean> => {
  if (!roomId || roomId === "undefined" || roomId === "null") return false;
  
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    return response.ok;
  } catch (error) {
    console.error("Cloud Update Error:", error);
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<RoomData | null> => {
  if (!roomId || roomId === "undefined" || roomId === "null") return null;
  try {
    const response = await fetch(`${API_BASE}/${roomId}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result as RoomData;
  } catch (error) {
    return null;
  }
};
