import io from "socket.io-client";

const socket = (token: string) =>
  io(process.env.NEXT_PUBLIC_BACKEND_URL ?? "", {
    withCredentials: true,
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ['websocket', 'polling'],
  });

export default socket;