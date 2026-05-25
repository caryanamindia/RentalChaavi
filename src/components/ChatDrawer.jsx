import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import api, { chatApi, propertyApi, userProfileApi } from "../services/api";
import { useChatSocket } from "../chat/useChatSocket";
import {
  buildRoomId,
  formatChatMessageTime,
  getUserFullNameFromChatItem,
  dedupeOwnerChatMembers,
  inferChatStatusFromHistory,
  normalizeHistory,
  pickDisplayName,
} from "../chat/chatModel";

const USER_CHAT_MEMBERS_KEY = "userChatMembers";
const OWNER_CHAT_USER_NAMES_KEY = "ownerChatUserNames";
const DEFAULT_FIRST_MESSAGE = "I am intersting your propery";

const safeParse = (value, fallback) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    // JWT uses base64url, but `atob` expects base64.
    const base64url = parts[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(base64 + padding);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getFullNameFromPayload = (payload) => {
  if (!payload) return null;
  return (
    payload.fullName ||
    payload.full_name ||
    payload.name ||
    payload.user?.fullName ||
    payload.user?.name ||
    payload.owner?.fullName ||
    payload.owner?.name ||
    null
  );
};

const getMyFullNameFromToken = (currentRole) => {
  // In this app: user auth token is `userToken`, owner auth token is `ownerToken`.
  const tokenKey =
    currentRole === "PROPERTY_OWNER" ? "ownerToken" : "userToken";
  const token = localStorage.getItem(tokenKey);
  return getFullNameFromPayload(decodeJwtPayload(token)) || "You";
};

const getInitials = (name) => {
  const s = (name || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] || "";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (a + b).toUpperCase();
};

const formatChatStatus = (status) => {
  const s = String(status || "");
  if (s === "PENDING") return "Pending";
  if (s === "ACCEPTED") return "Accepted";
  if (s === "REJECTED") return "Rejected";
  return s;
};

const readUserChats = () =>
  safeParse(localStorage.getItem(USER_CHAT_MEMBERS_KEY) || "[]", []);

const writeUserChats = (chats) =>
  localStorage.setItem(USER_CHAT_MEMBERS_KEY, JSON.stringify(chats));

const getOwnerIdFromProperty = (property) => {
  const candidates = [
    property?.ownerId,
    property?.ownerID,
    property?.owner_id,
    property?._raw?.ownerId,
    property?._raw?.ownerID,
    property?._raw?.owner_id,
    property?._raw?.userId,
    property?._raw?.propertyOwnerId,
    property?._raw?.propertyOwnerID,
    property?._raw?.property_owner_id,
    property?._raw?.owner?.id,
    property?._raw?.owner?.ownerId,
    property?._raw?.user?.id,
    property?._raw?.propertyOwner?.id,
  ];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return null;
};

const getOwnerNameFromProperty = (property, fallbackOwnerId) => {
  return (
    property?.ownerFullName ||
    property?.ownerName ||
    property?.propertyOwnerName ||
    property?.propertyOwnerFullName ||
    property?.owner?.fullName ||
    property?.owner?.name ||
    property?._raw?.ownerName ||
    property?._raw?.ownerFullName ||
    property?._raw?.propertyOwnerName ||
    property?._raw?.propertyOwnerFullName ||
    property?._raw?.owner?.name ||
    property?._raw?.owner?.fullName ||
    "Owner"
  );
};

const readOwnerUserNameCache = () =>
  safeParse(localStorage.getItem(OWNER_CHAT_USER_NAMES_KEY) || "{}", {});

const cacheOwnerUserName = (userId, name) => {
  const trimmed = String(name || "").trim();
  if (!userId || !trimmed) return;
  const cache = readOwnerUserNameCache();
  cache[String(userId)] = trimmed;
  localStorage.setItem(OWNER_CHAT_USER_NAMES_KEY, JSON.stringify(cache));
};

const getCachedOwnerUserName = (userId) => {
  const cache = readOwnerUserNameCache();
  return pickDisplayName(cache[String(userId)]);
};

const extractUserNameFromHistory = (history, userId) => {
  const list = Array.isArray(history) ? history : [];
  for (const msg of list) {
    if (String(msg?.senderRole || "").toUpperCase() !== "USER") continue;
    if (userId && Number(msg?.senderId) !== Number(userId)) continue;
    const name = pickDisplayName(msg?.senderName, msg?.senderFullName);
    if (name) return name;
  }
  return null;
};

const formatChatPreview = (text) => {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length > 48 ? `${s.slice(0, 48)}…` : s;
};

const fetchTenantNameFromMainApi = async (userId) => {
  const ownerToken = localStorage.getItem("ownerToken");
  if (!ownerToken || !userId) return null;

  const readers = [
    async () => {
      const res = await userProfileApi.getById(userId, ownerToken);
      return res?.data?.data ?? res?.data;
    },
    async () => {
      const res = await api.get(`/owner/getUserById/${userId}`);
      return res?.data?.data ?? res?.data;
    },
  ];

  for (const read of readers) {
    try {
      const data = await read();
      const name = getUserFullNameFromChatItem(data);
      if (name) {
        cacheOwnerUserName(userId, name);
        return name;
      }
    } catch {
      // Try next source
    }
  }
  return null;
};

const resolveOwnerChatUserName = async (item) => {
  const userId = Number(item?.userId);
  const fromItem = getUserFullNameFromChatItem(item);
  if (fromItem) {
    cacheOwnerUserName(userId, fromItem);
    return fromItem;
  }

  const cached = getCachedOwnerUserName(userId);
  if (cached) return cached;

  const fromProfile = await fetchTenantNameFromMainApi(userId);
  if (fromProfile) return fromProfile;

  const roomId = resolveRoomId(item);
  if (roomId) {
    try {
      const res = await chatApi.getHistory(roomId);
      const history = normalizeHistory(res);
      const fromHistory = extractUserNameFromHistory(history, userId);
      if (fromHistory) {
        cacheOwnerUserName(userId, fromHistory);
        return fromHistory;
      }
    } catch {
      // best-effort
    }
  }

  if (Number.isFinite(userId) && userId > 0) {
    return `User #${userId}`;
  }
  return "Unknown user";
};

const mapOwnerChatMember = (item, ownerId, status) => {
  const userId = Number(item?.userId);
  const roomId = item?.roomId || buildRoomId(userId, ownerId);
  const lastMessage = String(item?.lastMessage || "").trim();
  const name =
    getUserFullNameFromChatItem(item) ||
    getCachedOwnerUserName(userId) ||
    (Number.isFinite(userId) && userId > 0 ? `User #${userId}` : "Unknown user");

  return {
    roomId,
    userId,
    ownerId,
    name,
    lastMessage,
    propertyTitle:
      item?.propertyTitle ||
      item?.propertyName ||
      formatChatPreview(lastMessage) ||
      "Property inquiry",
    status,
    _raw: item,
  };
};

const enrichOwnerChatMembers = async (members) => {
  const deduped = dedupeOwnerChatMembers(members);
  return Promise.all(
    deduped.map(async (member) => {
      const name = await resolveOwnerChatUserName(member);
      return { ...member, name };
    })
  );
};

const normalizeList = (response) => {
  const payload = response?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const resolveRoomId = (item) => {
  const userId = Number(item?.userId);
  const ownerId = Number(item?.ownerId);
  return item?.roomId || buildRoomId(userId, ownerId);
};

const syncChatStatusFromServer = async (item) => {
  const roomId = resolveRoomId(item);
  if (!roomId) return item?.status || "PENDING";
  try {
    const res = await chatApi.getHistory(roomId);
    const history = normalizeHistory(res);
    const inferred = inferChatStatusFromHistory(history);
    if (inferred !== (item?.status || "PENDING")) {
      return { ...item, roomId, status: inferred };
    }
    return { ...item, roomId, status: item?.status || inferred };
  } catch {
    return { ...item, roomId, status: item?.status || "PENDING" };
  }
};

const ChatDrawer = ({
  isOpen,
  onClose,
  currentRole,
  currentUserId,
  selectedProperty,
  onCountChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [members, setMembers] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [shouldRender, setShouldRender] = useState(false);
  const typingTimeoutRef = useRef(null);
  const typingSentRef = useRef(false);
  const bottomRef = useRef(null);

  const isOwner = currentRole === "PROPERTY_OWNER";
  const myFullName = useMemo(
    () => getMyFullNameFromToken(currentRole),
    [currentRole]
  );

  const refreshMembers = useCallback(async () => {
    if (!currentUserId || !isOpen) return;
    setLoading(true);
    setError("");
    try {
      if (isOwner) {
        const [pendingRes, acceptedRes, rejectedRes] = await Promise.all([
          chatApi.getPendingChats(currentUserId),
          chatApi.getAcceptedChats(currentUserId),
          chatApi.getRejectedChats(currentUserId),
        ]);
        const pending = normalizeList(pendingRes).map((item) =>
          mapOwnerChatMember(item, currentUserId, "PENDING")
        );
        const accepted = normalizeList(acceptedRes).map((item) =>
          mapOwnerChatMember(item, currentUserId, "ACCEPTED")
        );
        const rejected = normalizeList(rejectedRes).map((item) =>
          mapOwnerChatMember(item, currentUserId, "REJECTED")
        );

        const combined = await enrichOwnerChatMembers([
          ...pending,
          ...accepted,
          ...rejected,
        ]);
        setMembers(combined);
        onCountChange?.(combined.length);

        setActiveRoom((prev) => {
          if (!prev?.roomId) return prev;
          const match = combined.find(
            (item) => String(resolveRoomId(item)) === String(prev.roomId)
          );
          return match ? { ...prev, ...match } : prev;
        });
      } else {
        const stored = readUserChats()
          .map((item) => {
            const normalizedUserId = Number(item?.userId);
            const normalizedOwnerId = Number(item?.ownerId);
            const normalizedRoomId = resolveRoomId({
              ...item,
              userId: normalizedUserId,
              ownerId: normalizedOwnerId,
            });

            return {
              ...item,
              userId: normalizedUserId,
              ownerId: normalizedOwnerId,
              roomId: normalizedRoomId,
              status: item?.status || "PENDING",
            };
          })
          .filter(
            (item) => Number(item?.userId) === Number(currentUserId)
          );

        const synced = await Promise.all(
          stored.map((item) => syncChatStatusFromServer(item))
        );
        writeUserChats(synced);
        setMembers(synced);
        onCountChange?.(synced.length);

        setActiveRoom((prev) => {
          if (!prev?.roomId) return prev;
          const match = synced.find(
            (item) => String(resolveRoomId(item)) === String(prev.roomId)
          );
          return match ? { ...prev, ...match } : prev;
        });
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isOpen, isOwner, onCountChange]);

  useEffect(() => {
    refreshMembers();
  }, [refreshMembers]);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      return;
    }
    const t = setTimeout(() => setShouldRender(false), 220);
    return () => clearTimeout(t);
  }, [isOpen]);

  useEffect(() => {
    const autoCreateRequest = async () => {
      if (!isOpen || !selectedProperty || isOwner || !currentUserId) return;
      setError("");
      setStartingChat(true);
      try {
        let resolvedProperty = selectedProperty;
        let ownerId = getOwnerIdFromProperty(selectedProperty);

        // When user clicks "Chat" from a property card (browse list), the mapped
        // property object might not include ownerId. Fetch full property details
        // to derive ownerId and open the conversation.
        if (!ownerId) {
          const propertyId =
            selectedProperty?.id ||
            selectedProperty?.propertyId ||
            selectedProperty?._raw?.id ||
            selectedProperty?._raw?.propertyId;

          if (propertyId) {
            try {
              const res = await propertyApi.getById(propertyId);
              const dto = res?.data?.data ?? res?.data ?? null;
              if (dto) {
                resolvedProperty = dto;
                ownerId = getOwnerIdFromProperty(dto);
              }
            } catch {
              // Ignore here; we handle final error below.
            }
          }
        }

        if (!ownerId) {
          setError("Owner id not found for this property");
          return;
        }

        const existing = readUserChats().find(
          (item) =>
            Number(item.userId) === Number(currentUserId) &&
            Number(item.ownerId) === Number(ownerId)
        );
        if (existing) {
          const synced = await syncChatStatusFromServer(existing);
          const nextStored = readUserChats().map((item) =>
            Number(item.userId) === Number(currentUserId) &&
            Number(item.ownerId) === Number(ownerId)
              ? synced
              : item
          );
          writeUserChats(nextStored);
          setMembers(nextStored.filter(
            (item) => Number(item?.userId) === Number(currentUserId)
          ));
          setActiveRoom(synced);
          return;
        }

        try {
          const res = await chatApi.sendMessage({
            userId: Number(currentUserId),
            ownerId: Number(ownerId),
            senderRole: "USER",
            message: DEFAULT_FIRST_MESSAGE,
          });
          const payload = res?.data?.data || {};
          const propertyId =
            resolvedProperty?.id ||
            resolvedProperty?.propertyId ||
            selectedProperty?.id ||
            selectedProperty?.propertyId ||
            null;
          const created = {
            roomId:
              payload?.roomId ||
              buildRoomId(Number(currentUserId), Number(ownerId)),
            userId: Number(currentUserId),
            ownerId: Number(ownerId),
            propertyId,
            name:
              getOwnerNameFromProperty(resolvedProperty, ownerId) || "Owner",
            propertyTitle:
              resolvedProperty?.title ||
              resolvedProperty?._raw?.title ||
              selectedProperty?.title ||
              "Property",
            status: payload?.status || "PENDING",
          };
          const next = [...readUserChats(), created];
          writeUserChats(next);
          setMembers(next);
          onCountChange?.(next.length);
          setActiveRoom(created);
        } catch (e) {
          setError(
            e?.response?.data?.message ||
              "Unable to start chat request"
          );
        }
      } finally {
        setStartingChat(false);
      }
    };
    autoCreateRequest();
  }, [currentUserId, isOpen, isOwner, onCountChange, selectedProperty]);

  const updateUserChatStatusInStorage = useCallback(
    (targetRoomId, nextStatus) => {
      try {
        const current = readUserChats();
        const next = current.map((item) => {
          const normalizedRoomId = resolveRoomId(item);
          if (!normalizedRoomId) return item;

          if (String(normalizedRoomId) !== String(targetRoomId)) return item;
          return {
            ...item,
            roomId: normalizedRoomId,
            status: nextStatus,
          };
        });
        writeUserChats(next);
      } catch {
        // best-effort (local storage only)
      }
    },
    []
  );

  const applyRoomStatus = useCallback(
    (rid, nextStatus) => {
      if (!rid) return;

      setMembers((prev) =>
        prev.map((item) =>
          String(resolveRoomId(item)) === String(rid)
            ? { ...item, status: nextStatus }
            : item
        )
      );

      setActiveRoom((prev) =>
        prev && String(resolveRoomId(prev)) === String(rid)
          ? { ...prev, status: nextStatus }
          : prev
      );

      if (!isOwner) updateUserChatStatusInStorage(rid, nextStatus);
    },
    [isOwner, updateUserChatStatusInStorage]
  );

  const handleAcceptedEvent = useCallback(
    (payload) => {
      const rid = payload?.roomId;
      if (!rid) return;
      applyRoomStatus(rid, "ACCEPTED");
      if (isOwner) refreshMembers();
    },
    [applyRoomStatus, isOwner, refreshMembers]
  );

  const handleRejectedEvent = useCallback(
    (payload) => {
      const rid = payload?.roomId;
      if (!rid) return;
      applyRoomStatus(rid, "REJECTED");
      if (isOwner) refreshMembers();
    },
    [applyRoomStatus, isOwner, refreshMembers]
  );

  const {
    socketConnected,
    messages,
    typingByUserId,
    presenceByUserId,
    sendMessage,
    sendTyping,
  } = useChatSocket({
    currentRole,
    currentUserId,
    roomId: activeRoom?.roomId,
    isOpen,
    onAccepted: handleAcceptedEvent,
    onRejected: handleRejectedEvent,
  });

  useEffect(() => {
    if (!isOwner || !activeRoom?.userId) return;
    const userId = Number(activeRoom.userId);
    for (const msg of messages) {
      if (String(msg?.senderRole || "").toUpperCase() !== "USER") continue;
      const name = pickDisplayName(msg?.senderName);
      if (!name) continue;
      cacheOwnerUserName(userId, name);
      setActiveRoom((prev) =>
        prev && Number(prev.userId) === userId ? { ...prev, name } : prev
      );
      setMembers((prev) =>
        prev.map((m) =>
          Number(m.userId) === userId ? { ...m, name } : m
        )
      );
      break;
    }
  }, [messages, isOwner, activeRoom?.userId]);

  useEffect(() => {
    if (isOwner || !activeRoom?.roomId || messages.length === 0) return;
    const inferred = inferChatStatusFromHistory(messages);
    if (!inferred || inferred === activeRoom.status) return;
    applyRoomStatus(resolveRoomId(activeRoom), inferred);
  }, [messages, isOwner, activeRoom, applyRoomStatus]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingSentRef.current) {
        sendTyping(false);
        typingSentRef.current = false;
      }
    };
  }, [sendTyping]);

  useEffect(() => {
    // Switching rooms should reset draft + typing indicators.
    setDraft("");
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (typingSentRef.current) {
      sendTyping(false);
      typingSentRef.current = false;
    }
  }, [activeRoom?.roomId, sendTyping]);

  useEffect(() => {
    // Keep the most recent message in view.
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, activeRoom?.roomId]);

  const pendingCount = useMemo(
    () => members.filter((m) => m.status === "PENDING").length,
    [members]
  );
  const acceptedCount = useMemo(
    () => members.filter((m) => m.status === "ACCEPTED").length,
    [members]
  );
  const rejectedCount = useMemo(
    () => members.filter((m) => m.status === "REJECTED").length,
    [members]
  );

  const handleDraftChange = useCallback(
    (e) => {
      const next = e.target.value;
      setDraft(next);

      // Typing indicator only makes sense while the chat is active.
      if (activeRoom?.status !== "ACCEPTED") return;

      if (!next.trim()) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        if (typingSentRef.current) {
          sendTyping(false);
          typingSentRef.current = false;
        }
        return;
      }

      if (!typingSentRef.current) {
        sendTyping(true);
        typingSentRef.current = true;
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(false);
        typingSentRef.current = false;
        typingTimeoutRef.current = null;
      }, 1200);
    },
    [activeRoom?.status, sendTyping]
  );

  const handleOwnerDecision = async (accept) => {
    if (!activeRoom?.roomId) return;
    try {
      const payload = {
        roomId: activeRoom.roomId,
        senderRole: "PROPERTY_OWNER",
      };
      if (accept) await chatApi.acceptChat(payload);
      else await chatApi.rejectChat(payload);
      await refreshMembers();
      setActiveRoom((prev) =>
        prev
          ? { ...prev, status: accept ? "ACCEPTED" : "REJECTED" }
          : prev
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Action failed");
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !activeRoom) return;
    if (activeRoom.status !== "ACCEPTED") return;
    try {
      await sendMessage(text);
      setDraft("");
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (typingSentRef.current) {
        sendTyping(false);
        typingSentRef.current = false;
      }
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to send message");
    }
  };

  const otherDisplayName = useMemo(() => {
    if (!activeRoom) return isOwner ? "Select a user" : "Owner";
    const fromRoom = pickDisplayName(activeRoom?.name);
    if (fromRoom) return fromRoom;
    if (isOwner) {
      const uid = Number(activeRoom?.userId);
      return (
        getCachedOwnerUserName(uid) ||
        (Number.isFinite(uid) && uid > 0 ? `User #${uid}` : "Unknown user")
      );
    }
    return "Owner";
  }, [activeRoom, isOwner]);

  const isRoomSelected = useCallback(
    (item) =>
      Boolean(
        activeRoom &&
          String(resolveRoomId(activeRoom)) === String(resolveRoomId(item))
      ),
    [activeRoom]
  );

  if (!shouldRender) return null;

  return (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      <div
        className={`absolute inset-0 pointer-events-auto transition-opacity duration-200 ${
          isOpen ? "bg-black/35 opacity-100" : "bg-black/0 opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 h-full w-full sm:w-[440px] bg-white shadow-2xl border-l border-slate-200 pointer-events-auto flex flex-col transition-transform duration-200 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="Chat drawer"
      >
        <div className="px-4 py-3 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-rose-500 to-amber-400 flex items-center justify-center shadow-sm">
                  <MessageCircle size={18} className="text-white" />
                </div>
                {members.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-slate-900 text-white text-[11px] rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white">
                    {members.length}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-extrabold tracking-tight text-slate-900 leading-none">
                  Messages
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isOwner ? "Owner inbox" : "Your chats"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-slate-100 active:bg-slate-200 flex items-center justify-center text-slate-600"
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {isOwner && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
              <div className="shrink-0 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-extrabold border border-amber-200">
                  {pendingCount}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Pending
                </span>
              </div>

              <div className="w-px h-6 bg-slate-200 shrink-0" />

              <div className="shrink-0 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-extrabold border border-emerald-200">
                  {acceptedCount}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Accepted
                </span>
              </div>

              <div className="w-px h-6 bg-slate-200 shrink-0" />

              <div className="shrink-0 flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center text-xs font-extrabold border border-rose-200">
                  {rejectedCount}
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Rejected
                </span>
              </div>
            </div>
          )}
        </div>

        {error && <p className="px-4 py-2 text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-5 min-h-0 flex-1">
          <div className="col-span-2 border-r border-slate-200 overflow-y-auto bg-slate-50/60">
            {loading || startingChat ? (
              <p className="p-3 text-sm text-slate-500">Loading chats...</p>
            ) : members.length === 0 ? (
              <p className="p-3 text-sm text-slate-500">No chats yet</p>
            ) : (
              members.map((item) => {
                const selected = isRoomSelected(item);
                return (
                <button
                  key={item.roomId}
                  type="button"
                  onClick={async () => {
                    const base = { ...item, roomId: resolveRoomId(item) };
                    if (isOwner) {
                      const name = await resolveOwnerChatUserName(base);
                      setActiveRoom({ ...base, name });
                      return;
                    }
                    const synced = await syncChatStatusFromServer(base);
                    const stored = readUserChats().map((row) =>
                      String(resolveRoomId(row)) === String(resolveRoomId(synced))
                        ? { ...row, ...synced }
                        : row
                    );
                    writeUserChats(stored);
                    setMembers(
                      stored.filter(
                        (row) => Number(row.userId) === Number(currentUserId)
                      )
                    );
                    setActiveRoom(synced);
                  }}
                  className={`w-full text-left px-3 py-3 border-b border-slate-200/70 transition ${
                    selected
                      ? "bg-slate-800 text-white shadow-inner"
                      : "hover:bg-white/90 text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-full border flex items-center justify-center font-extrabold text-[13px] shadow-sm ${
                          selected
                            ? "bg-slate-700 border-slate-500 text-white"
                            : "bg-white border-slate-200 text-slate-800"
                        }`}
                      >
                        {getInitials(item.name)}
                      </div>
                      <span
                        className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-50 ${
                          item.status === "ACCEPTED"
                            ? "bg-emerald-500"
                            : item.status === "REJECTED"
                            ? "bg-rose-500"
                            : "bg-amber-500"
                        }`}
                        title={formatChatStatus(item.status)}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-sm font-extrabold truncate ${
                            selected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {item.name}
                        </p>
                      </div>
                      <p
                        className={`text-[12px] truncate ${
                          selected ? "text-slate-300" : "text-slate-500"
                        }`}
                      >
                        {item.propertyTitle}
                      </p>
                      <p
                        className={`text-[11px] mt-1 font-semibold ${
                          selected
                            ? "text-slate-200"
                            : item.status === "ACCEPTED"
                            ? "text-emerald-700"
                            : item.status === "REJECTED"
                            ? "text-rose-700"
                            : "text-amber-700"
                        }`}
                      >
                        {formatChatStatus(item.status)}
                      </p>
                    </div>
                  </div>
                </button>
              );
              })
            )}
          </div>

          <div className="col-span-3 flex flex-col min-h-0">
            {!activeRoom ? (
              <div className="h-full flex items-center justify-center text-slate-600 text-sm px-4 text-center bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.10),_transparent_55%)]">
                Select a chat to start messaging
              </div>
            ) : (
              <>
                <div
                  className={`px-3 py-2.5 border-b ${
                    isOwner
                      ? "border-slate-700 bg-slate-800 text-white"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[13px] shadow-sm ${
                          isOwner
                            ? "bg-slate-700 border border-slate-500 text-white"
                            : "bg-slate-900 text-white"
                        }`}
                      >
                        {getInitials(otherDisplayName)}
                      </div>
                      <div className="min-w-0">
                        {isOwner && (
                          <p
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                              isOwner ? "text-slate-400" : "text-slate-500"
                            }`}
                          >
                            Chatting with
                          </p>
                        )}
                        <p
                          className={`font-extrabold text-sm truncate ${
                            isOwner ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {otherDisplayName}
                        </p>
                        <p
                          className={`text-[12px] truncate ${
                            isOwner ? "text-slate-300" : "text-slate-500"
                          }`}
                        >
                          {activeRoom.propertyTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-extrabold text-[12px] border border-slate-200">
                        {getInitials(myFullName)}
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const otherUserId = activeRoom
                      ? Number(isOwner ? activeRoom.userId : activeRoom.ownerId)
                      : null;
                    const otherOnline =
                      otherUserId && presenceByUserId[otherUserId] !== undefined
                        ? presenceByUserId[otherUserId]
                        : undefined;
                    const otherTyping = otherUserId
                      ? typingByUserId[otherUserId]
                      : false;

                    return (
                      <div
                        className={`text-[11px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 ${
                          isOwner ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {activeRoom.status === "ACCEPTED" && (
                          <p className="inline-flex items-center gap-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                socketConnected ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {socketConnected ? "Live" : "Connecting..."}
                          </p>
                        )}
                        {typeof otherOnline === "boolean" && (
                          <p>{otherOnline ? "Online" : "Offline"}</p>
                        )}
                        {otherTyping && <p>Typing...</p>}
                      </div>
                    );
                  })()}
                </div>

                {isOwner && activeRoom.status === "PENDING" && (
                  <div className="px-3 py-2 border-b border-slate-200 flex gap-2 bg-slate-50">
                    <button
                      onClick={() => handleOwnerDecision(true)}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-sm"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleOwnerDecision(false)}
                      className="px-3 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-sm"
                    >
                      Reject
                    </button>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[radial-gradient(circle_at_top,_rgba(236,72,153,0.10),_transparent_55%)]">
                  {messages.length === 0 ? (
                    <div className="text-xs text-slate-500">
                      <div className="inline-flex items-center gap-2 bg-white/80 border border-slate-200 rounded-2xl px-3 py-2 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-slate-300" />
                        <span>
                          {activeRoom.status === "PENDING"
                            ? "Waiting for owner acceptance"
                            : "No messages yet"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const mine =
                        String(message.senderRole).toUpperCase() ===
                        (isOwner ? "PROPERTY_OWNER" : "USER");
                      const role = String(message.senderRole || "").toUpperCase();
                      const senderName =
                        role === "PROPERTY_OWNER"
                          ? isOwner
                            ? myFullName
                            : otherDisplayName
                          : isOwner
                          ? pickDisplayName(message.senderName, otherDisplayName) ||
                            otherDisplayName
                          : myFullName;
                      return (
                        <div key={message.id} className="flex items-end gap-2">
                          {!mine && (
                            <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[11px] font-extrabold text-slate-800 shadow-sm">
                              {getInitials(otherDisplayName)}
                            </div>
                          )}

                          <div
                            className={`max-w-[88%] px-3 py-2.5 text-sm shadow-sm ${
                              mine
                                ? "ml-auto bg-gradient-to-br from-fuchsia-600 via-rose-600 to-amber-500 text-white rounded-3xl rounded-br-lg"
                                : "bg-white/95 border border-slate-200 text-slate-800 rounded-3xl rounded-bl-lg"
                            }`}
                          >
                            <div
                              className={`text-[10px] font-bold mb-1 ${
                                mine ? "text-white/90" : "text-slate-500"
                              }`}
                            >
                              {senderName}
                            </div>
                            <div className="leading-snug whitespace-pre-wrap break-words">
                              {message.text}
                            </div>
                            {message.createdAt && (
                              <div
                                className={`text-[10px] mt-1 ${
                                  mine ? "text-white/80" : "text-slate-500"
                                }`}
                              >
                                {formatChatMessageTime(message.createdAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="p-3 border-t border-slate-200 bg-white">
                  <div className="flex items-end gap-2">
                    <div
                      className={`flex-1 rounded-3xl border shadow-sm px-4 py-2 ${
                        activeRoom.status === "ACCEPTED"
                          ? "border-slate-200 bg-white"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <input
                        value={draft}
                        onChange={handleDraftChange}
                        placeholder={
                          activeRoom.status === "ACCEPTED"
                            ? "Message..."
                            : activeRoom.status === "REJECTED"
                            ? "Chat rejected"
                            : "Waiting for owner acceptance"
                        }
                        disabled={activeRoom.status !== "ACCEPTED"}
                        onBlur={() => {
                          if (typingTimeoutRef.current) {
                            clearTimeout(typingTimeoutRef.current);
                            typingTimeoutRef.current = null;
                          }
                          if (typingSentRef.current) {
                            sendTyping(false);
                            typingSentRef.current = false;
                          }
                        }}
                        className="w-full bg-transparent outline-none text-sm disabled:text-slate-500"
                      />
                    </div>

                    <button
                      onClick={handleSend}
                      disabled={activeRoom.status !== "ACCEPTED" || !draft.trim()}
                      className="w-11 h-11 rounded-full bg-slate-900 hover:bg-slate-800 text-white flex items-center justify-center shadow-sm disabled:bg-slate-300"
                      aria-label="Send message"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default ChatDrawer;
