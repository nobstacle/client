import React, { useCallback } from "react"
import { useSocketContext } from "./SocketContext"
import { useCompanyControllerGetCompanyOne } from "../lib/nobstacle-api-client/react-query/company/company"
import { usePersistedCompanyStore } from "../lib/nobstacle-api-client/zustand"

interface ConversationContext {
  conversationId: number | null
}

const ConversationContext = React.createContext<ConversationContext | null>(
  null
)

export function useConversationContext() {
  const context = React.useContext(ConversationContext)
  if (!context) {
    throw new Error(
      "use ConversationContext provider must be used within the ConversationContext.Provider"
    )
  }

  return context
}

type JoinConversationType = {
  status: number
  message: string
  data: {
    conversationId: string
    statuses: [{ userId: number; status: "Online" | "Offline"; lastSeen: Date }]
  }
}

export const ConversationContextProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { socket } = useSocketContext()
  const { company } = usePersistedCompanyStore()

  const joinTheConversation = useCallback(() => {
    if (company?.id && socket) {
      console.log("runned join", company?.id, socket)
      socket.emit("join-conversation", String(company?.id))
    }
  }, [company?.id, socket])

  // Join the conversation socket by conversation id of the group
  React.useEffect(() => {
    joinTheConversation()
  }, [company?.id, joinTheConversation, socket])

  // Once someone join the conversation except socket itself fire
  React.useEffect(() => {
    socket?.on("user-connected", (data) => console.log("user connected", data))

    return () => {
      socket?.off("user-connected", () => null)
    }
  }, [socket])

  // Once join the conversation everyone get this run only init
  React.useEffect(() => {
    socket?.once("join-conversation-success", (data) =>
      console.log("conversation success", data)
    )

    return () => {
      socket?.off("join-conversation-success", () => null)
    }
  }, [socket])

  // Once someone left the conversation everyone get this

  React.useEffect(() => {
    socket?.on("user-disconnected", (data) =>
      console.log("user disconnected", data)
    )

    return () => {
      socket?.off("user-disconnected")
    }
  }, [socket])

  return (
    <ConversationContext.Provider
      value={{
        conversationId: company?.id ?? -1
      }}
    >
      {children}
    </ConversationContext.Provider>
  )
}
