export const WHATSAPP_CONTACTS_SYNC_CHANNEL = "whatsapp-contacts-sync";
export const WHATSAPP_CONTACTS_STORAGE_KEY = "whatsapp_contacts_last_updated";
export const WHATSAPP_CONTACTS_EVENT_NAME = "whatsapp-contacts-updated";

export interface WhatsappContactUpdatePayload {
  listId?: number | null;
  listName?: string;
  count?: number;
  timestamp: number;
}

export const broadcastWhatsappContactUpdate = (
  payload: Partial<WhatsappContactUpdatePayload> = {}
) => {
  if (typeof window === "undefined") return;

  const data: WhatsappContactUpdatePayload = {
    ...payload,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (cross-tab / cross-window instant messaging)
  if ("BroadcastChannel" in window) {
    try {
      const channel = new BroadcastChannel(WHATSAPP_CONTACTS_SYNC_CHANNEL);
      channel.postMessage(data);
      channel.close();
    } catch {
      // Fallback to storage and custom event
    }
  }

  // 2. localStorage storage event (universal cross-tab trigger)
  try {
    localStorage.setItem(WHATSAPP_CONTACTS_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota/permission issues
  }

  // 3. CustomEvent (in-memory / same-window notification)
  try {
    window.dispatchEvent(
      new CustomEvent(WHATSAPP_CONTACTS_EVENT_NAME, { detail: data })
    );
  } catch {
    // Ignore event dispatch issues
  }
};
