import { StyleProvider } from "@ant-design/cssinjs"
import { SettingOutlined } from "@ant-design/icons"
import { useEventListener } from "ahooks"
import { Avatar, Button, Flex, List, Tag } from "antd"
import styleText from "data-text:./clean.less"
import tailWindCssText from "data-text:~style.css"
import antdResetCssText from "data-text:antd/dist/reset.css"
import dayjs from "dayjs"
import type {
  PlasmoCSConfig,
  PlasmoCSUIProps,
  PlasmoGetShadowHostId
} from "plasmo"
import type { FC } from "react"
import { useEffect, useMemo, useState } from "react"

import { sendToBackgroundViaRelay } from "@plasmohq/messaging"

import { ThemeProvider } from "~theme"

import { CleanIcon } from "../icon/clean"

const HOST_ID = "engage-csui-clean"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start"
}

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `${antdResetCssText}\n${styleText}\n${tailWindCssText}`
  return style
}

const PlasmoOverlay: FC<PlasmoCSUIProps> = () => {
  const [listVisible, setListVisible] = useState(false)
  const [tabs, setTabs] = useState([])

  const tabsOrdered = useMemo(() => {
    //根据lastAccessed升序排序
    return tabs.sort((a, b) => a.lastAccessed - b.lastAccessed)
  }, [tabs])

  //获取tabs
  const getTabsAsync = async () => {
    const resp = await sendToBackgroundViaRelay({
      name: "tabs"
    })
    setTabs(resp.message)
  }

  //根据tab id使浏览器跳转到对应的tab
  const onNavigateToNewTab = (tabId: number) => {
    sendToBackgroundViaRelay({
      name: "tabs",
      body: {
        callbackName: "navigateToTabById",
        arguments: [tabId]
      }
    })
  }

  //根据tab id关闭对应的tab
  const onCloseTab = (tabId: number) => {
    sendToBackgroundViaRelay({
      name: "tabs",
      body: {
        callbackName: "closeTab",
        arguments: [tabId]
      }
    }).finally(() => getTabsAsync())
  }

  //组件打开、关闭相关的事件监听
  useEventListener(
    "message",
    (event) => {
      if (
        event.data.type === "openCleanComponent" ||
        event.data.type === "onCloseCleanComponent"
      ) {
        setListVisible(event.data.visible)
      }
    },
    { target: window }
  )

  useEffect(() => {
    getTabsAsync()
  }, [listVisible])

  return (
    <ThemeProvider>
      <StyleProvider container={document.getElementById(HOST_ID)?.shadowRoot}>
        {listVisible && (
          <div className="action-bar plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-4">
            <Button type="primary" icon={<CleanIcon />}>
              一键清理
            </Button>
            <Button
              type="primary"
              icon={<SettingOutlined style={{ color: "pink" }} />}>
              配置清理策略
            </Button>
          </div>
        )}
        <div className="list-container">
          {listVisible && (
            <List
              itemLayout="horizontal"
              size="small"
              dataSource={tabsOrdered}
              renderItem={(item, index) => (
                <List.Item
                  style={{ backgroundColor: item.backgroundColor }}
                  actions={[
                    <Button
                      onClick={() => onCloseTab(item.tabId)}
                      key="0"
                      size="small"
                      type="primary"
                      shape="circle"
                      icon={<CleanIcon />}
                    />
                  ]}>
                  <List.Item.Meta
                    avatar={<Avatar src={`${item.favIconUrl}`} />}
                    title={
                      <div
                        onClick={() => onNavigateToNewTab(item.tabId)}
                        className="list-item-title">
                        {item.title}
                      </div>
                    }
                    description={
                      <Flex>
                        {item.groupTitle ? (
                          <Tag color={item.groupColor}>{item.groupTitle}</Tag>
                        ) : null}
                        <div>
                          上次使用时间
                          {dayjs(item.lastAccessed).format(
                            "YYYY-MM-DD HH:mm:ss"
                          )}
                        </div>
                      </Flex>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </StyleProvider>
    </ThemeProvider>
  )
}

export default PlasmoOverlay
