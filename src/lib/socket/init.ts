import { getSession } from "next-auth/react";
import io from "socket.io-client";

const socket = (token: string) =>
  io(process.env.NEXT_PUBLIC_BACKEND_URL ?? "", {
    withCredentials: true,
    auth: { token },
  }); // Replace with your server URL

export default socket;
