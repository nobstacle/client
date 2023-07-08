import { useQuery } from "@tanstack/react-query"
import React, { useCallback } from "react"
import { useConversationContext } from "./ConversationContext"
import { useSocketContext } from "./SocketContext"
import { MessageV1Dto } from "../lib/nobstacle-api-client/react-query/types/messageV1Dto"
import { messageControllerV1GetMessages } from "../lib/nobstacle-api-client/react-query/chat/chat"
import { GetUserRes } from "../lib/nobstacle-api-client/react-query/types"
import { userControllerGetUser } from "../lib/nobstacle-api-client/react-query/users/users"
import {
  usePersistedAuthStore,
  usePersistedCompanyStore
} from "../lib/nobstacle-api-client/zustand"
import { useParams } from "react-router"

interface MessagesContext {
  messages: MessageType[]
  sendMessage(data: { text: string }): Promise<void>
  sendMessageTyping: () => void
  removeMessageTyping: () => void
  typers: (GetUserRes | undefined)[]
  updateMessageEmit: (messageId: number, data: string) => void
  deleteMessageEmit: (messageId: number) => void
}

const MessagesContext = React.createContext<MessagesContext | null>(null)

export function useMessagesContext() {
  const context = React.useContext(MessagesContext)
  if (!context) {
    throw new Error(
      "use MessagesContextProvider must be used within the MessagesContext.Provider"
    )
  }

  return context
}

export type MessageType = Omit<MessageV1Dto, "reactions"> & {
  username?: string
  role?: GetUserRes["Role"]
}

interface IOHandleMessageReactionSentEventPayload {
  messageId: number
}

type MessageReaction = {
  id: number
  createdAt: Date
  updatedAt: Date
  userId: number
  messageId: number
}

interface IOHandleMessageSentEventPayload {
  text: string
  userId: number
  companyId: number
  stationId: string
  Role: GetUserRes["Role"]
}

export const MessagesContextProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const { socket } = useSocketContext()
  const { company } = usePersistedCompanyStore()
  const { stationId } = useParams()
  const { member } = usePersistedAuthStore()
  const [take] = React.useState(20)
  const [skip, setSkip] = React.useState(0)
  const [cursorId, setCursorId] = React.useState<number>()
  const [typers, setTypers] = React.useState<Partial<GetUserRes[]>>([])
  const [messages, setMessages] = React.useState<MessageType[]>([])

  const matchMessage = useCallback(
    async (message: IOHandleMessageSentEventPayload) => {
      console.log("message", message)
      const activeMember = await getGroupMember(message.userId)
      const matchedMember = activeMember

      const matchedMessage = {
        text: message.text,
        username: matchedMember?.firstName ?? matchedMember?.username,
        role: matchedMember?.Role
      } as MessageType

      return matchedMessage
    },
    []
  )

  /**
   * Connect to the socket server
   * Disconnect from the socket server
   */
  React.useEffect(() => {
    if (socket) {
      socket.on(
        `new-chat-message-${company?.id}-${stationId}`,
        async (data: string) => {
          const parsedMessage = JSON.parse(
            data
          ) as IOHandleMessageSentEventPayload

          const matchMessageUser = await matchMessage(parsedMessage)
          setMessages((prev) => [matchMessageUser, ...prev])

          return true
        }
      )
    }
    return () => {
      socket?.off(`new-chat-message-${company?.id}-${stationId}`)
    }
  }, [company?.id, socket, stationId])

  React.useEffect(() => {
    if (socket) {
      socket.on("new-chat-message-reaction", async (data: string) => {
        const parsedReaction = JSON.parse(data) as MessageReaction
        const shallowMessages = [...messages]
        const message = shallowMessages.find(
          ({ id }) => id === parsedReaction.messageId
        )
        const activeMember = await getGroupMember(parsedReaction.userId)

        console.log("shallow messages")

        setMessages(shallowMessages)

        return true
      })
    }

    return () => {
      socket?.off("new-chat-message-reaction")
    }
  }, [messages, socket])

  React.useEffect(() => {
    if (socket) {
      socket.on("remove-message-reaction", async (data: string) => {
        const parsedReaction = JSON.parse(
          data
        ) as IOHandleMessageReactionSentEventPayload & {
          userId: string
          id: number
        }
        const shallowMessages = [...messages]
        const message = shallowMessages.find(
          ({ id }) => id === parsedReaction.messageId
        )

        const activeMember = await getGroupMember(Number(parsedReaction.userId))

        setMessages(shallowMessages)

        return true
      })
    }

    return () => {
      socket?.off("remove-message-reaction")
    }
  }, [messages, socket])

  React.useEffect(() => {
    if (socket) {
      socket.on("user-typing", async (data: string) => {
        const parsedData = JSON.parse(data) as { userId: number }
        addTypers(parsedData.userId)
      })
    }

    return () => {
      socket?.off("user-typing")
    }
  }, [messages, socket])

  React.useEffect(() => {
    if (socket) {
      socket.on("user-stopped-typing", async (data: string) => {
        const parsedData = JSON.parse(data) as { userId: number }

        removeTypers(parsedData.userId)
      })
    }

    return () => {
      socket?.off("user-stopped-typing")
    }
  }, [socket])

  React.useEffect(() => {
    if (socket) {
      socket.on("message-edited", async (data: string) => {
        const parsedData = JSON.parse(data) as MessageType
        updateMessageLocally(parsedData.id, parsedData.text)
      })
    }

    return () => {
      socket?.off("message-edited")
    }
  }, [socket])

  React.useEffect(() => {
    if (socket) {
      socket.on("message-deleted", async (data: string) => {
        const parsedData = JSON.parse(data) as { msgId: number }
        deleteMessageLocally(parsedData.msgId)
      })
    }

    return () => {
      socket?.off("message-deleted")
    }
  }, [socket])

  async function sendMessage(data: { text: string }) {
    socket?.emit("new-message", {
      text: data.text,
      userId: member?.id,
      companyId: company?.id,
      stationId
    })
  }

  const sendMessageTyping = () => {
    socket?.emit("user-typing", { companyId: company?.id })
  }

  const removeMessageTyping = () => {
    socket?.emit("user-stopped-typing", { companyId: company?.id })
  }

  const addTypers = async (userId: number) => {
    const getMember = await getGroupMember(userId)
    if (getMember) {
      setTypers((prev) => {
        const isTyperAlready = prev.find((user) => user?.id === getMember.id)
        if (isTyperAlready) return prev

        return [getMember, ...prev]
      })
    }
  }

  const removeTypers = async (userId: number) => {
    const getMember = await getGroupMember(userId)
    if (getMember) {
      setTypers((prev) => prev.filter((user) => user?.id !== getMember.id))
    }
  }

  const getGroupMember = async (userId: number) => {
    try {
      const user = await userControllerGetUser(userId)

      return user
    } catch (e) {
      return null
    }
  }

  const updateMessageEmit = (messageId: number, data: string) => {
    socket?.emit("message-edited", { company: company?.id, messageId, data })
  }

  const updateMessageLocally = (messageId: number, newText: string) => {
    const shallowMessages = [...messages]
    const activeMessage = shallowMessages.find((msg) => msg.id === messageId)
    if (!activeMessage) return
    activeMessage.text = newText
    activeMessage.updatedAt = new Date().toString()
    setMessages(shallowMessages)
  }

  const deleteMessageEmit = (messageId: number) => {
    socket?.emit("message-deleted", { company: company?.id, messageId })
  }

  const deleteMessageLocally = (messageId: number) => {
    const shallowMessages = [...messages]
    const distractedMessages = shallowMessages.filter(
      (msg) => msg.id !== messageId
    )
    setMessages(distractedMessages)
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        sendMessage,
        sendMessageTyping,
        removeMessageTyping,
        typers,
        updateMessageEmit,
        deleteMessageEmit
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
