import { Player } from "../types";

// npoint.io API
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
      const errorText = await response.text();
      console.error(`npoint Create Error (${response.status}):`, errorText);
      return null;
    }
    
    const result = await response.json();
    return result.binId || result.id || null;
  } catch (error) {
    console.error("Cloud Connection Failed (Create):", error);
    return null;
  }
};

export const updateRoom = async (roomId: string, players: Player[]): Promise<boolean> => {
  if (!roomId) return false;
  try {
    // npoint 支援直接 POST 到 ID 來更新內容
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
    
    if (!response.ok) {
      console.warn(`Update failed with status ${response.status}, retrying with PUT...`);
      // 某些情況下需要使用 PUT
      const retry = await fetch(`${API_BASE}/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: players, lastUpdate: Date.now() }),
      });
      return retry.ok;
    }
    
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
    return result.data || null;
  } catch (error) {
    console.error("Cloud Connection Failed (Fetch):", error);
    return null;
  }
};