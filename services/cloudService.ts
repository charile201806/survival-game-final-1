import { Player, GameEvent, RoomData } from "../types";

const API_BASE = "https://api.npoint.io/bins";

// 簡單的延遲函數
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createRoom = async (players: Player[], events: GameEvent[]): Promise<string | null> => {
  console.log("Cloud: Initializing channel...");
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    return result.key || null;
  } catch (error) {
    console.error("Cloud Create Error:", error);
    return null;
  }
};

export const updateRoom = async (roomId: string, players: Player[], events: GameEvent[], retries = 2): Promise<boolean> => {
  if (!roomId || roomId === "undefined") return false;
  
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      if (retries > 0) {
        await delay(1000);
        return updateRoom(roomId, players, events, retries - 1);
      }
      return false;
    }
    return true;
  } catch (error) {
    if (retries > 0) {
      await delay(1000);
      return updateRoom(roomId, players, events, retries - 1);
    }
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<RoomData | null> => {
  if (!roomId || roomId === "undefined") return null;
  try {
    const response = await fetch(`${API_BASE}/${roomId}?nocache=${Date.now()}`);
    if (!response.ok) return null;
    const result = await response.json();
    return result as RoomData;
  } catch (error) {
    console.error("Cloud Fetch Error:", error);
    return null;
  }
};
