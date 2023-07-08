import { useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { SocketContextProvider } from "../../context/SocketContext"
import { ConversationContextProvider } from "../../context/ConversationContext"
import { MessagesContextProvider } from "../../context/MessagesContext"
import ChatDetailPage from "./details"

const ChatPage: React.FC = () => {
  const navigate = useNavigate()
  const { stationId } = useParams()

  useEffect(() => {
    if (!stationId) {
      navigate(`/chat/1`)
    }
  }, [navigate, stationId])
  if (!stationId) return null

  return (
    <SocketContextProvider>
      <ConversationContextProvider>
        <MessagesContextProvider>
          <ChatDetailPage />
        </MessagesContextProvider>
      </ConversationContextProvider>
    </SocketContextProvider>
  )
}

export default ChatPage
