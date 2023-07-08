import React from "react"
import * as SocketIOClient from "socket.io-client"

const API_SERVER_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"

interface SocketContext {
  socket: SocketIOClient.Socket | null
}

const SocketContext = React.createContext<SocketContext | null>(null)

export function useSocketContext() {
  const context = React.useContext(SocketContext)
  if (!context) {
    throw new Error(
      "use SocketContext provider must be used within the SocketContext.Provider"
    )
  }

  return context
}

export const SocketContextProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [socket, setSocket] = React.useState<SocketIOClient.Socket | null>(null)

  React.useEffect(() => {
    setSocket(SocketIOClient.io(API_SERVER_URL, { withCredentials: true }))

    return () => {
      socket?.disconnect()
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  )
}
