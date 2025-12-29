
import { Player, GameEvent, RoomData } from "../types";

// 修正：直接指向根目錄，移除 /bins
const API_BASE = "https://api.npoint.io";

export const createRoom = async (players: Player[], events: GameEvent[]): Promise<{ key: string | null; error?: string }> => {
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      return { key: null, error: `ERR_UPLINK_${response.status}` };
    }
    
    const result = await response.json();
    if (result && result.key) {
      return { key: result.key };
    }
    return { key: null, error: "ERR_MALFORMED_RESPONSE" };
  } catch (error: any) {
    console.error("Cloud Create Error:", error);
    return { key: null, error: "ERR_NETWORK_BLOCKED" };
  }
};

export const updateRoom = async (roomId: string, players: Player[], events: GameEvent[]): Promise<boolean> => {
  if (!roomId || roomId.length < 5) return false;
  
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    // 修正：npoint 更新資料通常使用 POST
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "POST",
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
  if (!roomId || roomId.length < 5) return null;
  try {
    // 加上時間戳防止快取導致資料不更新
    const response = await fetch(`${API_BASE}/${roomId}?nocache=${Date.now()}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result as RoomData;
  } catch (error) {
    return null;
  }
};
