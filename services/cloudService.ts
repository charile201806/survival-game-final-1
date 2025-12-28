
import { Player } from "../types";

// npoint.io API - 修正路徑，必須包含 /bins
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
      const errorText = await response.text();
      console.error(`npoint Create Error (${response.status}):`, errorText);
      return null;
    }
    
    const result = await response.json();
    // npoint 回傳的通常是 { "binId": "..." }
    return result.binId || result.id || null;
  } catch (error) {
    console.error("Cloud Connection Failed (Create):", error);
    return null;
  }
};

export const updateRoom = async (roomId: string, players: Player[]): Promise<boolean> => {
  if (!roomId) return false;
  try {
    // 更新既有的 bin
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "PUT", // 更新通常使用 PUT
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
    console.error("Cloud Connection Failed (Update):", error);
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<Player[] | null> => {
  if (!roomId) return null;
  try {
    const response = await fetch(`${API_BASE}/${roomId}?t=${Date.now()}`, {
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const result = await response.json();
    // 判斷回傳結構，npoint 有時會把內容包在 result.data
    return result.data || result || null;
  } catch (error) {
    console.error("Cloud Connection Failed (Fetch):", error);
    return null;
  }
};
