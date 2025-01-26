import { StyleProvider } from "@ant-design/cssinjs"
import { PlusOutlined, UserOutlined } from "@ant-design/icons"
import {
  Bubble,
  Conversations,
  Sender,
  useXAgent,
  useXChat
} from "@ant-design/x"
import type {
  BubbleProps,
  ConversationsProps,
  SenderProps
} from "@ant-design/x"
import { useEventListener } from "ahooks"
import { Button, Typography } from "antd"
import type { GetProp } from "antd"
import styleText from "data-text:./deepseek.less"
import tailWindCssText from "data-text:~style.css"
import antdResetCssText from "data-text:antd/dist/reset.css"
import { isEmpty } from "lodash-es"
import markdownit from "markdown-it"
import type {
  PlasmoCSConfig,
  PlasmoCSUIProps,
  PlasmoGetShadowHostId
} from "plasmo"
import type { FC } from "react"
import { useEffect, useMemo, useState } from "react"

import { ThemeProvider } from "~theme"

import { DeepSeekIcon } from "../icon/deepseek"

const HOST_ID = "engage-csui-deepseek"

const md = markdownit({ html: true, breaks: true })

const renderMarkdown: BubbleProps["messageRender"] = (content) => (
  <Typography>
    {/* biome-ignore lint/security/noDangerouslySetInnerHtml: used in demo */}
    <div dangerouslySetInnerHTML={{ __html: md.render(content) }} />
  </Typography>
)

/**
 * 🔔 Please replace the BASE_URL, PATH, MODEL, API_KEY with your own values.
 */
const BASE_URL = "https://api.deepseek.com"
const PATH = "/chat/completions"
const MODEL = "deepseek-chat"
/** 🔥🔥 Its dangerously! */
const API_KEY = "Bearer sk-59c20df92a9e46e99c649db5d61e0037"

interface Response {
  choices: Choice[]
  created: number
  id: string
  model: string
  object: string
  system_fingerprint: string
  usage: Usage
  [property: string]: any
}

interface Choice {
  finish_reason?: string
  index?: number
  logprobs?: null
  message?: Message
  [property: string]: any
}

interface Message {
  content: string
  role: string
  [property: string]: any
}

interface Usage {
  completion_tokens: number
  prompt_cache_hit_tokens: number
  prompt_cache_miss_tokens: number
  prompt_tokens: number
  prompt_tokens_details: PromptTokensDetails
  total_tokens: number
  [property: string]: any
}

interface PromptTokensDetails {
  cached_tokens: number
  [property: string]: any
}

const roles: GetProp<typeof Bubble.List, "roles"> = {
  assistant: {
    placement: "start",
    avatar: { icon: <UserOutlined />, style: { background: "#fde3cf" } },
    typing: { step: 5, interval: 20 },
    style: {
      maxWidth: 600
    }
  },
  local: {
    placement: "end",
    avatar: { icon: <UserOutlined />, style: { background: "#87d068" } }
  }
}

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `${antdResetCssText}\n${styleText}\n${tailWindCssText}`
  return style
}

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start"
}

const PlasmoOverlay: FC<PlasmoCSUIProps> = () => {
  const [value, setValue] = useState("")
  const [visible, setVisible] = useState(false)
  const [items, setItems] = useState<ConversationsProps["items"]>([
    {
      key: "chart1",
      label: "chart1"
    }
  ])

  const [agent] = useXAgent<Message>({
    baseURL: BASE_URL + PATH,
    model: MODEL,
    dangerouslyApiKey: API_KEY
  })

  // Chat messages
  const { onRequest, parsedMessages, setMessages } = useXChat({
    agent,
    parser(message) {
      if (Array.isArray(message)) {
        return message?.[0]?.choices?.[0]?.["message"]
      }
      return message
    }
  })

  const formattedMessage = useMemo(() => {
    const result = parsedMessages.map(({ id, message, status }) => {
      return {
        key: id,
        loading: status === "loading",
        role: status === "local" ? "local" : "assistant",
        content: message.content,
        messageRender: renderMarkdown
      }
    })
    return result
  }, [parsedMessages])

  const onSubmit: SenderProps["onSubmit"] = (nextContent) => {
    setMessages(parsedMessages)
    onRequest({ content: nextContent, role: "user" })
    setValue("")
  }

  //组件打开、关闭相关的事件监听
  useEventListener(
    "message",
    (event) => {
      if (
        event.data.type === "openDeepSeekComponent" ||
        event.data.type === "onCloseDeepSeekComponent"
      ) {
        setVisible(event.data.visible)
      }
    },
    { target: window }
  )
  return (
    <ThemeProvider>
      <StyleProvider container={document.getElementById(HOST_ID).shadowRoot}>
        {visible && (
          <div className="conversion-container">
            <div className="sidebar">
              <Conversations items={items} defaultActiveKey="chart1" />
              <Button type="dashed" icon={<PlusOutlined />}>
                new chat
              </Button>
            </div>
            <div
              className={`chat-container ${isEmpty(parsedMessages) ? "plasmo-justify-center" : "plasmo-justify-start"}`}>
              {isEmpty(parsedMessages) ? (
                <DeepSeekIcon />
              ) : (
                <Bubble.List
                  roles={roles}
                  style={{
                    maxHeight: "64vh",
                    width: "100%",
                    scrollbarColor: "pink transparent"
                  }}
                  items={formattedMessage}
                />
              )}
            </div>
          </div>
        )}
        <div className="input-container">
          {visible && (
            <Sender
              loading={agent.isRequesting()}
              value={value}
              placeholder="给DeepSeek发送消息"
              actions={(_, info) => {
                const { SendButton } = info.components
                return (
                  <SendButton loading={agent.isRequesting()} type="default" />
                )
              }}
              onChange={setValue}
              onSubmit={onSubmit}
            />
          )}
        </div>
      </StyleProvider>
    </ThemeProvider>
  )
}

export default PlasmoOverlay
