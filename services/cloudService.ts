
import { Player } from "../types";

// npoint.io API
const API_BASE = "https://api.npoint.io/bins";

export const createRoom = async (players: Player[]): Promise<string | null> => {
  console.log("Cloud: Attempting to create channel...");
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        players: players, 
        lastUpdate: Date.now()
      }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error(`Cloud Create Failed: ${response.status}`, err);
      return null;
    }
    
    const result = await response.json();
    // npoint.io 成功後會回傳 {"key":"xxxxx"}
    console.log("Cloud: Channel created with key:", result.key);
    return result.key || null;
  } catch (error) {
    console.error("Cloud Connection Error (Create):", error);
    return null;
  }
};

export const updateRoom = async (roomId: string, players: Player[]): Promise<boolean> => {
  if (!roomId || roomId === "undefined") return false;
  try {
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        players: players, 
        lastUpdate: Date.now() 
      }),
    });
    
    if (!response.ok) {
      console.error(`Cloud Update Failed: ${response.status}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Cloud Connection Error (Update):", error);
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<Player[] | null> => {
  if (!roomId || roomId === "undefined") return null;
  try {
    const response = await fetch(`${API_BASE}/${roomId}?nocache=${Date.now()}`);
    if (!response.ok) {
      console.error(`Cloud Fetch Failed: ${response.status}`);
      return null;
    }
    const result = await response.json();
    // 取得資料結構中的 players 陣列
    return result.players || null;
  } catch (error) {
    console.error("Cloud Connection Error (Fetch):", error);
    return null;
  }
};
