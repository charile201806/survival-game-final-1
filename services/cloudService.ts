import { Player, GameEvent, RoomData } from "../types";

const API_BASE = "https://api.npoint.io/bins";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const createRoom = async (players: Player[], events: GameEvent[]): Promise<{ key: string | null; error?: string }> => {
  console.log("Cloud: Attempting to establish uplink...");
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      return { key: null, error: `ERR_HTTP_${response.status}` };
    }
    
    const result = await response.json();
    // npoint.io returns { key: "..." }
    if (result && result.key) {
      return { key: result.key };
    }
    return { key: null, error: "ERR_INVALID_UPLINK_RESPONSE" };
  } catch (error: any) {
    console.error("Cloud Create Error:", error);
    return { key: null, error: error.message || "ERR_NETWORK_TIMEOUT" };
  }
};

export const updateRoom = async (roomId: string, players: Player[], events: GameEvent[], retries = 2): Promise<boolean> => {
  if (!roomId || roomId === "undefined" || roomId === "null") return false;
  
  try {
    const payload: RoomData = { players, events, lastUpdate: Date.now() };
    const response = await fetch(`${API_BASE}/${roomId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      if (retries > 0) {
        await delay(1500);
        return updateRoom(roomId, players, events, retries - 1);
      }
      return false;
    }
    return true;
  } catch (error) {
    if (retries > 0) {
      await delay(1500);
      return updateRoom(roomId, players, events, retries - 1);
    }
    return false;
  }
};

export const getRoomData = async (roomId: string): Promise<RoomData | null> => {
  if (!roomId || roomId === "undefined" || roomId === "null") return null;
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
