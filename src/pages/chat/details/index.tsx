import { useEffect, useMemo, useRef, useState } from "react"
import { useMessagesContext } from "../../../context/MessagesContext"

type ChatMessage = {
  from: "user" | "client"
  text: string
}

const ChatDetailPage: React.FC = () => {
  const { sendMessage, messages } = useMessagesContext()

  const messageInputElRef = useRef<HTMLInputElement>(null)
  const messagesElRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messageInputElRef?.current?.focus()

    if (messagesElRef.current) {
      messagesElRef.current.scrollTop = messagesElRef.current?.scrollHeight
    }
  }, [messageInputElRef, messagesElRef])

  const [messageToSend, setMessageToSend] = useState<string>("")
  console.log("all messages", messages)

  return (
    <div className="flex flex-col h-full px-4 pt-8 pb-20 max-w-960px mx-auto">
      {/* header */}
      <div className="flex justify-between items-center py-3 mb-4 border-b-2 border-gray-200">
        <span className="text-2xl text-gray-700">Chat Session</span>

        <button type="button" className="w-8 focus:outline-none">
          <svg version="1.1" x="0px" y="0px" viewBox="0 0 15.767 15.767">
            <g>
              <path
                style={{ fill: "#b71c1c" }}
                d="M7.884,0.935C3.537,0.935,0,3.45,0,6.541c0,2.103,1.621,3.998,4.239,4.969 c0.055,0.522-0.143,1.528-1.737,2.977c-0.067,0.062-0.084,0.162-0.04,0.242c0.035,0.064,0.103,0.103,0.173,0.103 c0.018,0,0.035-0.002,0.052-0.007c0.15-0.041,3.67-1.012,5.796-2.698c4.09-0.22,7.284-2.664,7.284-5.585 C15.768,3.45,12.232,0.935,7.884,0.935z M10.495,9.295c-0.201,0.201-0.464,0.303-0.728,0.304c-0.265,0-0.528-0.1-0.729-0.301 l-1.15-1.146l-1.146,1.15C6.541,9.504,6.277,9.606,6.014,9.606c-0.264,0-0.528-0.1-0.729-0.3C4.883,8.904,4.881,8.251,5.283,7.848 l1.145-1.15l-1.15-1.146C4.874,5.149,4.873,4.498,5.275,4.094C5.677,3.69,6.33,3.69,6.733,4.092l1.15,1.146l1.146-1.151 c0.4-0.403,1.052-0.404,1.456-0.003c0.402,0.402,0.404,1.055,0.002,1.458l-1.146,1.15l1.15,1.146 C10.895,8.24,10.896,8.892,10.495,9.295z"
              />
            </g>
          </svg>
        </button>
      </div>

      {/* messages */}
      <div
        className="flex-grow overflow-y-auto h-0 flex flex-col-reverse pb-4"
        style={{ backgroundColor: "#fff" }}
        ref={messagesElRef}
      >
        {messages.map((msg) => {
          const us = msg.role === "User"
          console.log("msgRole", us, msg.role)

          return (
            <div className={`flex items-end ${us ? "justify-end" : ""}`}>
              <span
                className={`px-4 py-3 mt-3 rounded-xl text-lg ${
                  us ? "bg-primary" : "bg-gray-200"
                } ${us ? "text-gray-100" : "text-gray-900"} ${
                  us ? "rounded-br-none" : "rounded-bl-none"
                } ${us ? "mr-4" : "ml-4"}`}
                style={{ maxWidth: "65%", wordBreak: "break-word" }}
              >
                {msg.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* footer */}
      <div className="mt-4 pt-4 flex border-t-2 border-gray-200">
        <input
          type="text"
          className="flex-grow pl-4 text-lg rounded"
          placeholder="Type a message"
          onInput={(e) => setMessageToSend(e.currentTarget.value)}
          value={messageToSend}
          onKeyUp={(e) => {
            if (e.key === "Enter") {
              sendMessage({ text: messageToSend })
              setMessageToSend("")
            }
          }}
          ref={messageInputElRef}
        />

        <button
          className="bg-primary text-white py-4 px-12 rounded min-w-87px ml-4 disabled:cursor-not-allowed"
          onClick={() => {
            sendMessage({ text: messageToSend })
            setMessageToSend("")
          }}
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default ChatDetailPage
