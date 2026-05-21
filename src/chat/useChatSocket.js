import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { chatApi } from "../services/api";
import {
  normalizeMessageResponseDTO,
  normalizeHistory,
  getSocketQuery,
  mergeChatMessages,
  dedupeChatMessageList,
} from "./chatModel";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:9092";

const parseRoomId = (roomId) => {
  if (!roomId || typeof roomId !== "string") return null;
  const match = /^USER_(\d+)_OWNER_(\d+)$/.exec(roomId.trim());
  if (!match) return null;
  return { userId: Number(match[1]), ownerId: Number(match[2]) };
};

let messageSeq = 0;

export const useChatSocket = ({
  currentRole,
  currentUserId,
  roomId,
  isOpen,
  onAccepted,
  onRejected,
  socketUrl = SOCKET_URL,
}) => {
  const socketRef = useRef(null);
  const activeRoomIdRef = useRef(roomId);
  const historyLoadRef = useRef({ roomId: null, at: 0 });
  activeRoomIdRef.current = roomId;

  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [typingByUserId, setTypingByUserId] = useState({});
  const [presenceByUserId, setPresenceByUserId] = useState({});

  const activeUserId = Number(currentUserId);
  const parsedIds = useMemo(() => parseRoomId(roomId), [roomId]);

  const shouldConnect =
    Boolean(isOpen) &&
    Number.isFinite(activeUserId) &&
    activeUserId > 0;

  const setOnline = useCallback(
    async (online) => {
      if (!Number.isFinite(activeUserId) || activeUserId <= 0) return;
      try {
        await chatApi.updateStatus({ userId: activeUserId, online: !!online });
      } catch {
        // Presence is best-effort; don't break chat.
      }
    },
    [activeUserId]
  );

  const applyHistory = useCallback((list) => {
    setMessages(dedupeChatMessageList(list));
  }, []);

  const loadRoomHistory = useCallback(
    async (targetRoomId, { force = false } = {}) => {
      if (!targetRoomId) return;

      const now = Date.now();
      const last = historyLoadRef.current;
      if (
        !force &&
        last.roomId === targetRoomId &&
        now - last.at < 800
      ) {
        return;
      }
      historyLoadRef.current = { roomId: targetRoomId, at: now };

      try {
        const historyRes = await chatApi.getHistory(String(targetRoomId));
        const historyList = normalizeHistory(historyRes);
        applyHistory(historyList);
      } catch {
        // History is best-effort; new messages will still stream via socket.
      }
    },
    [applyHistory]
  );

  // Inbox socket: connect while drawer is open (receive accept/reject even before a room is selected).
  useEffect(() => {
    if (!shouldConnect) {
      if (socketRef.current) {
        try {
          socketRef.current.disconnect();
        } catch {
          // ignore
        }
        socketRef.current = null;
      }
      setSocketConnected(false);
      historyLoadRef.current = { roomId: null, at: 0 };
      return;
    }

    const socket = io(socketUrl, {
      transports: ["websocket"],
      reconnection: true,
      query: getSocketQuery({ currentRole, currentUserId: activeUserId }),
    });

    socketRef.current = socket;

    socket.on("connect", async () => {
      setSocketConnected(true);
      await setOnline(true);

      const rid = activeRoomIdRef.current;
      if (rid) {
        socket.emit("join_room", String(rid));
        await loadRoomHistory(rid, { force: true });
      }
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setOnline(false);
    });

    socket.on("chat_history", (payload) => {
      const rid = activeRoomIdRef.current;
      if (!rid) return;
      const list = Array.isArray(payload) ? payload : [];
      const normalized = list.map((dto, i) =>
        normalizeMessageResponseDTO(dto, i)
      );
      applyHistory(normalized);
    });

    socket.on("receive_message", (payload) => {
      if (!payload) return;
      const rid = activeRoomIdRef.current;
      if (!rid) return;
      if (payload?.roomId && String(payload.roomId) !== String(rid)) return;
      setMessages((prev) => mergeChatMessages(prev, payload, messageSeq++));
    });

    socket.on("chat_accepted", (payload) => {
      if (!payload) return;
      onAccepted?.(payload);
    });

    socket.on("chat_rejected", (payload) => {
      if (!payload) return;
      onRejected?.(payload);
      const rid = activeRoomIdRef.current;
      if (
        rid &&
        (!payload?.roomId || String(payload.roomId) === String(rid))
      ) {
        setMessages((prev) => mergeChatMessages(prev, payload, messageSeq++));
      }
    });

    socket.on("typing", (dto) => {
      if (!dto) return;
      const rid = activeRoomIdRef.current;
      if (!rid) return;
      if (dto?.roomId && String(dto.roomId) !== String(rid)) return;
      const uid = Number(dto?.userId);
      if (!Number.isFinite(uid)) return;
      setTypingByUserId((prev) => ({ ...prev, [uid]: !!dto.typing }));
    });

    socket.on("user_status", (status) => {
      if (!status) return;
      const uid = Number(status?.userId);
      if (!Number.isFinite(uid)) return;
      setPresenceByUserId((prev) => ({
        ...prev,
        [uid]: !!status?.online,
      }));
    });

    return () => {
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
      setSocketConnected(false);
      setTypingByUserId({});
      setPresenceByUserId({});
      setOnline(false);
      historyLoadRef.current = { roomId: null, at: 0 };
    };
  }, [
    shouldConnect,
    currentRole,
    activeUserId,
    setOnline,
    onAccepted,
    onRejected,
    socketUrl,
    loadRoomHistory,
    applyHistory,
  ]);

  // Join active room when selection changes.
  useEffect(() => {
    if (!shouldConnect || !roomId || !parsedIds) {
      setMessages([]);
      setTypingByUserId({});
      historyLoadRef.current = { roomId: null, at: 0 };
      return;
    }

    const sock = socketRef.current;
    if (sock?.connected) {
      sock.emit("join_room", String(roomId));
      loadRoomHistory(roomId);
      return;
    }

    setMessages([]);
  }, [shouldConnect, roomId, parsedIds, loadRoomHistory]);

  const sendMessage = useCallback(
    async (text) => {
      if (!text || !parsedIds || !roomId) return;
      const msg = String(text).trim();
      if (!msg) return;

      const senderRole =
        currentRole === "PROPERTY_OWNER" ? "PROPERTY_OWNER" : "USER";

      const outgoingPayload = {
        userId: parsedIds.userId,
        ownerId: parsedIds.ownerId,
        senderRole,
        message: msg,
        roomId: String(roomId),
      };

      const sock = socketRef.current;
      if (sock?.connected) {
        sock.emit("send_message", outgoingPayload);
        return;
      }

      const res = await chatApi.sendMessage(outgoingPayload);
      const saved = res?.data?.data ?? res?.data ?? outgoingPayload;
      setMessages((prev) =>
        mergeChatMessages(
          prev,
          { ...saved, roomId: String(roomId), message: msg, senderRole },
          messageSeq++
        )
      );
    },
    [currentRole, parsedIds, roomId]
  );

  const sendTyping = useCallback(
    (typing) => {
      if (!parsedIds || !roomId) return;
      const sock = socketRef.current;
      if (!sock?.connected) return;

      const dto = {
        roomId: String(roomId),
        userId: activeUserId,
        typing: !!typing,
      };
      sock.emit("typing", dto);
    },
    [parsedIds, roomId, activeUserId]
  );

  return {
    socketConnected,
    messages,
    typingByUserId,
    presenceByUserId,
    sendMessage,
    sendTyping,
  };
};
