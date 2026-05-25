// Frontend chat “model” helpers.
// Centralizing roomId and DTO normalization keeps ChatDrawer logic consistent
// with your backend contracts (ChatServiceImpl + SocketModule).

export const buildRoomId = (userId, ownerId) => {
  const u = Number(userId);
  const o = Number(ownerId);
  if (!Number.isFinite(u) || !Number.isFinite(o)) return null;
  return `USER_${u}_OWNER_${o}`;  
};

export const getSocketQuery = ({ currentRole, currentUserId }) => {
  const id = Number(currentUserId);
  if (!Number.isFinite(id) || id <= 0) return {};

  // SocketModule reads handshake params by these exact keys:
  // - userId
  // - ownerId
  if (currentRole === "PROPERTY_OWNER") return { ownerId: String(id) };
  return { userId: String(id) };
};

const toSafeString = (v) => (v === null || v === undefined ? "" : String(v));

/** Pune / India Standard Time */
export const CHAT_TIMEZONE = "Asia/Kolkata";

const ISO_LOCAL_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/;

const hasExplicitTimezone = (s) => /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);

/**
 * Parse backend message timestamps. Java chat service typically sends UTC
 * (epoch or ISO without offset); without conversion they appear ~5.5h behind IST.
 */
export const parseChatMessageTime = (value) => {
  if (value === null || value === undefined || value === "") return null;

  const num = Number(value);
  if (Number.isFinite(num) && num > 0) {
    const ms = num < 1e12 ? num * 1000 : num;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (hasExplicitTimezone(raw)) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const isoMatch = ISO_LOCAL_DATETIME.exec(raw);
  if (isoMatch) {
    const [, y, mo, d, h, mi, se = "0", frac = ""] = isoMatch;
    const ms = frac ? Number(frac.padEnd(3, "0").slice(0, 3)) : 0;
    const utc = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(se),
      ms
    );
    const parsed = new Date(utc);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

/** Format message time in Pune (IST). */
export const formatChatMessageTime = (
  value,
  { timeZone = CHAT_TIMEZONE, hour12 = true } = {}
) => {
  const d = parseChatMessageTime(value);
  if (!d) return "";
  return d.toLocaleTimeString("en-IN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12,
  });
};

export const pickDisplayName = (...candidates) => {
  for (const value of candidates) {
    const s = toSafeString(value).trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower === "user" || lower === "owner" || lower === "none" || lower === "null") {
      continue;
    }
    return s;
  }
  return null;
};

/** Resolve tenant/user full name from chat list API rows (owner inbox). */
export const getUserFullNameFromChatItem = (item) => {
  if (!item || typeof item !== "object") return null;

  const nested =
    item.user ||
    item.tenant ||
    item.requester ||
    item.sender ||
    item.member ||
    item.chatUser ||
    {};

  return pickDisplayName(
    item.fullName,
    item.full_name,
    item.userFullName,
    item.user_full_name,
    item.tenantFullName,
    item.tenantName,
    item.senderFullName,
    item.senderName,
    item.customerName,
    item.displayName,
    item.username,
    item.userName,
    nested.fullName,
    nested.full_name,
    nested.name,
    nested.userName,
    nested.username,
    item.name
  );
};

export const normalizeMessageResponseDTO = (dto, seq) => {
  // Backend: MessageResponseDTO = { roomId, senderId, senderRole, message, time }
  const roomId = dto?.roomId;
  const senderId = dto?.senderId ?? null;
  const senderRole = toSafeString(dto?.senderRole || "USER");
  const text = toSafeString(dto?.message || dto?.content || dto?.text || "");
  const createdAt = toSafeString(dto?.time || dto?.createdAt || "");
  const senderName = pickDisplayName(
    dto?.senderFullName,
    dto?.senderName,
    dto?.userFullName,
    dto?.fullName,
    dto?.name
  );
  const suffix =
    seq !== undefined && seq !== null ? `-${seq}` : "";

  return {
    id: `${roomId || "room"}-${senderId ?? "na"}-${createdAt || "t"}${suffix}`,
    roomId: roomId ?? null,
    senderId,
    senderRole,
    senderName,
    text,
    createdAt,
  };
};

/** Identity for dedupe (same sender + same text in one room). */
export const getMessageDedupeKey = (m) => {
  const room = String(m?.roomId || "");
  const role = String(m?.senderRole || "").toUpperCase();
  const text = String(m?.text || m?.message || "").trim();
  const senderId = m?.senderId ?? "";
  return `${room}|${role}|${senderId}|${text}`;
};

/** Optimistic + socket echo usually arrive within a few seconds. */
const DUPLICATE_WINDOW_MS = 5_000;

export const areChatMessagesDuplicate = (a, b) => {
  if (getMessageDedupeKey(a) !== getMessageDedupeKey(b)) return false;
  const ta = parseChatMessageTime(a?.createdAt)?.getTime() ?? 0;
  const tb = parseChatMessageTime(b?.createdAt)?.getTime() ?? 0;
  if (!ta || !tb) return true;
  return Math.abs(ta - tb) <= DUPLICATE_WINDOW_MS;
};

/** Remove duplicate rows (e.g. REST history + socket echo). */
export const dedupeChatMessageList = (messages) => {
  const list = Array.isArray(messages) ? messages : [];
  const out = [];
  for (const msg of list) {
    const dupIdx = out.findIndex((existing) =>
      areChatMessagesDuplicate(existing, msg)
    );
    if (dupIdx >= 0) {
      const existing = out[dupIdx];
      const prefer =
        parseChatMessageTime(msg?.createdAt) &&
        !parseChatMessageTime(existing?.createdAt)
          ? msg
          : existing;
      out[dupIdx] = prefer;
      continue;
    }
    out.push(msg);
  }
  return out;
};

/** Append or replace — avoids optimistic + socket double render. */
export const mergeChatMessages = (prev, rawDto, seq) => {
  const next = normalizeMessageResponseDTO(rawDto, seq);
  if (!next?.text) return prev;

  const dupIdx = prev.findIndex((m) => areChatMessagesDuplicate(m, next));
  if (dupIdx >= 0) {
    const copy = [...prev];
    copy[dupIdx] = next;
    return copy;
  }
  return [...prev, next];
};

const extractDataList = (response) => {
  // REST ResponseDto wrapper:
  // { status: 200, message: "...", data: [...] }
  const direct = response?.data;
  if (Array.isArray(direct)) return direct;
  if (Array.isArray(direct?.data)) return direct.data;
  if (Array.isArray(response)) return response;
  return [];
};

export const normalizeHistory = (responseOrList) => {
  // Used for both:
  // - REST: /chat/history/{roomId} (ResponseDto wrapper)
  // - Socket: chat_history (array of MessageResponseDTO directly)
  const list = extractDataList(responseOrList);
  return list.map((dto, i) => normalizeMessageResponseDTO(dto, i));
};

export const isOwnerSenderRole = (role) => {
  const r = String(role || "").toUpperCase();
  return (
    r === "PROPERTY_OWNER" ||
    r === "OWNER" ||
    r === "PROPERTYOWNER" ||
    r === "PO"
  );
};

/** Infer chat status from message history when local storage is stale. */
export const inferChatStatusFromHistory = (messages) => {
  const list = Array.isArray(messages) ? messages : [];
  const rejected = list.some((m) => {
    const text = String(m?.text || m?.message || "").toLowerCase();
    return isOwnerSenderRole(m?.senderRole) && text.includes("reject");
  });
  if (rejected) return "REJECTED";

  const hasOwnerMessage = list.some((m) => isOwnerSenderRole(m?.senderRole));
  if (hasOwnerMessage) return "ACCEPTED";

  return "PENDING";
};

const STATUS_RANK = { ACCEPTED: 3, PENDING: 2, REJECTED: 1 };

/** One row per room; accepted wins over pending if API returns both. */
export const dedupeOwnerChatMembers = (members) => {
  const list = Array.isArray(members) ? members : [];
  const byRoom = new Map();

  for (const member of list) {
    const key =
      String(member?.roomId || "") ||
      buildRoomId(member?.userId, member?.ownerId) ||
      String(member?.userId);
    const prev = byRoom.get(key);
    if (!prev) {
      byRoom.set(key, member);
      continue;
    }
    const keep =
      (STATUS_RANK[member?.status] || 0) >= (STATUS_RANK[prev?.status] || 0)
        ? member
        : prev;
    const drop = keep === member ? prev : member;
    byRoom.set(key, {
      ...keep,
      name: pickDisplayName(keep?.name, drop?.name) || keep?.name,
      propertyTitle:
        pickDisplayName(keep?.propertyTitle, drop?.propertyTitle) ||
        keep?.propertyTitle,
    });
  }

  return Array.from(byRoom.values());
};

export const isOwnMessage = ({ senderRole, currentRole }) => {
  return currentRole === "PROPERTY_OWNER"
    ? isOwnerSenderRole(senderRole)
    : String(senderRole || "").toUpperCase() === "USER";
};

