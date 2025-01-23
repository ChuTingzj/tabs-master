import { StyleProvider } from "@ant-design/cssinjs"
import { SettingOutlined } from "@ant-design/icons"
import {
  useEventListener,
  useInterval,
  useMount,
  useReactive,
  useUnmount
} from "ahooks"
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
  const config = useReactive({
    cleanStrategy: null,
    cleanTimeout: "null",
    lastTriggerTime: null
  })

  const tabsOrdered = useMemo(() => {
    //根据lastAccessed升序排序
    return tabs.sort((a, b) => a.lastAccessed - b.lastAccessed)
  }, [tabs])

  const clear = useInterval(() => {
    sendToBackgroundViaRelay({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    }).then((res) => {
      const { message: originConfig } = res
      const { cleanStrategy, lastTriggerTime, cleanTimeout } = originConfig
      if (!Number.isNaN(Number(cleanTimeout)) && cleanStrategy) {
        const interval = Date.now() - lastTriggerTime
        if (interval > Number(cleanTimeout)) {
          onCleanByStrategy()
          sendToBackgroundViaRelay({
            name: "storage",
            body: {
              key: `config`,
              value: Object.assign({}, originConfig, {
                lastTriggerTime: Date.now()
              }),
              callbackName: "setStorage"
            }
          })
        }
      }
    })
  }, 10000)

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

  //跳转到options页面
  const onNavigateToOptions = () => {
    sendToBackgroundViaRelay({
      name: "tabs",
      body: {
        callbackName: "navigateToTabByUrl",
        arguments: [
          "chrome-extension://ofjefjnjipecobpbkehhebbfcfcpfabk/options.html?current=TabsClean"
        ]
      }
    })
  }

  //一键清理
  const onCleanByStrategy = () => {
    const tabsString = JSON.stringify(tabs)
    const result = new Function(`
      const tabs = JSON.parse('${tabsString}');
      ${config.cleanStrategy};
      const result = tabs.filter(tab => main(tab));
      return result;
    `)()
    const ids = result.map((tab) => tab.tabId)
    ids.forEach((id) => onCloseTab(id))
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

  useMount(() => {
    sendToBackgroundViaRelay({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    }).then((res) => {
      const { message } = res
      config.cleanStrategy = message?.cleanStrategy
      config.cleanTimeout = message?.cleanTimeout
      config.lastTriggerTime = message?.lastTriggerTime
    })
  })

  useUnmount(() => {
    clear()
  })

  return (
    <ThemeProvider>
      <StyleProvider container={document.getElementById(HOST_ID)?.shadowRoot}>
        {listVisible && (
          <div className="action-bar plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-4">
            <Button
              disabled={!config?.cleanStrategy}
              onClick={onCleanByStrategy}
              type="primary"
              icon={<CleanIcon />}>
              {!config?.cleanStrategy
                ? "请先配置清理策略，用于一键清理"
                : "一键清理"}
            </Button>
            <Button
              onClick={onNavigateToOptions}
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
