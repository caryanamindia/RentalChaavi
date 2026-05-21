import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import { chatApi } from "../services/api";
import {
  normalizeMessageResponseDTO,
  normalizeHistory,
  getSocketQuery,
} from "./chatModel";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:9092";

const parseRoomId = (roomId) => {
  if (!roomId || typeof roomId !== "string") return null;
  const match = /^USER_(\d+)_OWNER_(\d+)$/.exec(roomId.trim());
  if (!match) return null;
  return { userId: Number(match[1]), ownerId: Number(match[2]) };
};

let messageSeq = 0;

const mergeUniqueById = (prev, nextItem) => {
  const next = normalizeMessageResponseDTO(nextItem, messageSeq++);
  if (!next?.id) return prev;
  if (prev.some((m) => String(m.id) === String(next.id))) {
    next.id = `${next.id}-${prev.length}`;
  }
  return [...prev, next];
};

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

  const loadRoomHistory = useCallback(async (targetRoomId) => {
    if (!targetRoomId) return;
    try {
      const historyRes = await chatApi.getHistory(String(targetRoomId));
      const historyList = normalizeHistory(historyRes);
      setMessages(historyList);
    } catch {
      // History is best-effort; new messages will still stream via socket.
    }
  }, []);

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
        await loadRoomHistory(rid);
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
      setMessages(normalized);
    });

    socket.on("receive_message", (payload) => {
      if (!payload) return;
      const rid = activeRoomIdRef.current;
      if (!rid) return;
      if (payload?.roomId && String(payload.roomId) !== String(rid)) return;
      setMessages((prev) => mergeUniqueById(prev, payload));
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
        setMessages((prev) => mergeUniqueById(prev, payload));
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
  ]);

  // Join active room and load history when selection changes.
  useEffect(() => {
    if (!shouldConnect || !roomId || !parsedIds) {
      setMessages([]);
      setTypingByUserId({});
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

      const optimistic = normalizeMessageResponseDTO(
        {
          roomId: String(roomId),
          senderId: activeUserId,
          senderRole,
          message: msg,
          time: String(Date.now()),
        },
        messageSeq++
      );
      setMessages((prev) => mergeUniqueById(prev, optimistic));

      const sock = socketRef.current;
      if (sock?.connected) {
        sock.emit("send_message", outgoingPayload);
        return;
      }

      await chatApi.sendMessage(outgoingPayload);
    },
    [currentRole, parsedIds, roomId, activeUserId]
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
