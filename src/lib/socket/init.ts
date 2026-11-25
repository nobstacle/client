import io from "socket.io-client";

const socket = (token: string) =>
  io(process.env.NEXT_PUBLIC_BACKEND_URL ?? "", {
    withCredentials: true,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 15000,
    transports: ['websocket', 'polling'],
  });

export default socket;