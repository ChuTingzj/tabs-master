import { StyleProvider } from "@ant-design/cssinjs"
import { useAsyncEffect, useEventListener, useReactive } from "ahooks"
import { FloatButton, Tooltip } from "antd"
import antdResetCssText from "data-text:antd/dist/reset.css"
import type {
  PlasmoCSConfig,
  PlasmoCSUIProps,
  PlasmoGetShadowHostId
} from "plasmo"
import type { FC } from "react"

import { sendToBackgroundViaRelay } from "@plasmohq/messaging"

import { ThemeProvider } from "~theme"

import { LoveIcon } from "../icon/heart"
import { TabIcon } from "../icon/tab"

const HOST_ID = "engage-csui-entry"

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = antdResetCssText
  return style
}

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start"
}

const PlasmoOverlay: FC<PlasmoCSUIProps> = () => {
  const config = useReactive({
    enableInputShortcut: false
  })
  useAsyncEffect(async () => {
    const { message } = await sendToBackgroundViaRelay({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    })
    config.enableInputShortcut = message.enableInputShortcut
  }, [])
  useEventListener(
    "keydown",
    (e) => {
      //监听用户按下ESC键，然后关闭组件
      if (e.key === "Escape") {
        onCloseGroupComponent()
      }
      //监听用户按下command + ctrl + z键，然后打开组件
      if (e.key === "z" && e.metaKey && e.ctrlKey) {
        if (config.enableInputShortcut) {
          e.preventDefault()
          onOpenGroupComponent()
        }
      }
    },
    { target: window }
  )
  const onOpenGroupComponent = async () => {
    window.postMessage({ type: "openGroupComponent", visible: true }, "*")
  }
  const onCloseGroupComponent = async () => {
    window.postMessage({ type: "onCloseGroupComponent", visible: false }, "*")
  }

  return (
    <ThemeProvider>
      <StyleProvider container={document.getElementById(HOST_ID).shadowRoot}>
        <FloatButton.Group
          trigger="hover"
          type="default"
          style={{ insetInlineEnd: 94 }}
          icon={<LoveIcon />}>
          <Tooltip
            title="标签页分组管理"
            color={"hotpink"}
            key={"hotpink"}
            placement="left"
            getPopupContainer={() =>
              document
                .getElementById(HOST_ID)
                .shadowRoot.querySelector("#plasmo-shadow-container")
            }>
            <FloatButton onClick={onOpenGroupComponent} icon={<TabIcon />} />
          </Tooltip>
        </FloatButton.Group>
      </StyleProvider>
    </ThemeProvider>
  )
}

export default PlasmoOverlay
