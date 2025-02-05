import { DoubleRightOutlined, QuestionCircleOutlined } from "@ant-design/icons"
import Editor, { loader } from "@monaco-editor/react"
import { useAsyncEffect, useEventListener, useMount, useReactive } from "ahooks"
import {
  Avatar,
  Button,
  Flex,
  Image,
  Layout,
  List,
  Menu,
  message,
  Select,
  Splitter,
  Switch,
  Tag,
  Tooltip
} from "antd"
import type { MenuProps, MenuTheme, SelectProps, SwitchProps } from "antd"
import Icon from "data-base64:~assets/icon.png"
import CssText from "data-text:./options.less"
import antdResetCssText from "data-text:antd/dist/reset.css"
import dayjs from "dayjs"
import { isEmpty } from "lodash-es"
import * as monaco from "monaco-editor"
import { useMemo, useRef, useState, type ReactNode } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import "~style.css"

import { ThemeProvider } from "~theme"

loader.config({ monaco })

const { Header, Footer, Sider, Content } = Layout

enum StrategyInterval {
  WEEK = "604800000",
  MONTH = "2629744000",
  YEAR = "31557600000"
}

const defaultStrategy = `
  /**
   * 对当前窗口所有标签页进行遍历，对每一个标签页调用下方的函数判断标签页是否需要清理
   * 下方为一个示例函数，判断标签页是否超过一周未使用
   * @param {chrome.tabs.Tab} tab 当前标签页 https://developer.chrome.com/docs/extensions/reference/api/tabs?hl=zh-cn#type-Tab
   * @return {boolean} 是否需要清理
  */
  function main(tab) {
    const currentTime = Date.now(); // 当前时间戳（毫秒）
    const oneWeekInMilliseconds = 7 * 24 * 60 * 60 * 1000; // 一周的毫秒数
    // 计算时间差
    const timeDifference = currentTime - tab;
    // 判断是否超过一周
    return timeDifference >= oneWeekInMilliseconds;
  }
  `

// 快捷键设置
const ShortcutNode = () => {
  const config = useReactive({
    enableInputShortcut: false,
    enableSwitchTabShortcut: false
  })
  const syncLatestConfig = async () => {
    const { message } = await sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    })
    if (!isEmpty(message)) {
      config.enableInputShortcut = message.enableInputShortcut
      config.enableSwitchTabShortcut = message.enableSwitchTabShortcut
    }
  }
  useAsyncEffect(async () => {
    await syncLatestConfig()
  }, [])

  const onEnableInputShortcutChange: SwitchProps["onChange"] = (checked) => {
    config.enableInputShortcut = checked
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        value: Object.assign({}, config, {
          enableInputShortcut: checked
        }),
        callbackName: "setStorage"
      }
    }).then(() => {
      if (checked) {
        message.success(
          "打开Tabs搜索框的快捷键启用成功，返回标签页重新刷新页面即可生效"
        )
      } else {
        message.success(
          "打开Tabs搜索框的快捷键禁用成功，返回标签页重新刷新页面即可生效"
        )
      }
    })
  }

  const onEnableSwitchTabShortcutChange: SwitchProps["onChange"] = (
    checked
  ) => {
    config.enableSwitchTabShortcut = checked
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        value: Object.assign({}, config, {
          enableSwitchTabShortcut: checked
        }),
        callbackName: "setStorage"
      }
    }).then(() => {
      if (checked) {
        message.success(
          "快速切换Tabs的快捷键启用成功，返回标签页重新刷新页面即可生效"
        )
      } else {
        message.success(
          "快速切换Tabs的快捷键禁用成功，返回标签页重新刷新页面即可生效"
        )
      }
    })
  }
  return (
    <div className="plasmo-h-full plasmo-bg-white plasmo-p-6">
      <Flex justify="start">
        <div className="header-title">{chrome.i18n.getMessage("Shortcut")}</div>
      </Flex>
      <div className="plasmo-p-6 plasmo-flex plasmo-justify-between plasmo-items-center">
        <div className="plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-2">
          <div className="header-sub-title ">启用打开Tabs搜索框的快捷键</div>
          <Tooltip className="plasmo-cursor-pointer" title="Ctrl + Command + Z">
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <Switch
          value={config.enableInputShortcut}
          onChange={onEnableInputShortcutChange}
        />
      </div>
      <div className="plasmo-px-6 plasmo-flex plasmo-justify-between plasmo-items-center">
        <div className="plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-2">
          <div className="header-sub-title ">启用快速切换Tabs的快捷键</div>
          <Tooltip className="plasmo-cursor-pointer" title="Alt + Backquote">
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <Switch
          onChange={onEnableSwitchTabShortcutChange}
          value={config.enableSwitchTabShortcut}
        />
      </div>
    </div>
  )
}

// 标签页清理设置
const TabsCleanNode = () => {
  const config = useReactive({
    cleanTimeout: "null",
    cleanStrategy: null,
    lastTriggerTime: null
  })
  const [tabs, setTabs] = useState([])
  const [appliedTabs, setAppliedTabs] = useState([])
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const tabsOrdered = useMemo(() => {
    //根据lastAccessed升序排序
    return tabs.sort((a, b) => a.lastAccessed - b.lastAccessed)
  }, [tabs])
  const appliedTabsOrdered = useMemo(() => {
    //根据lastAccessed升序排序
    return appliedTabs.sort((a, b) => a.lastAccessed - b.lastAccessed)
  }, [appliedTabs])

  //获取tabs
  const getTabsAsync = async () => {
    const resp = await sendToBackground({
      name: "tabs"
    })
    setTabs(resp.message)
  }

  // 保存清理策略
  const onSaveStrategy = () => {
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    }).then((res) => {
      const { message: originConfig } = res
      config.lastTriggerTime = Date.now()
      sendToBackground({
        name: "storage",
        body: {
          key: `config`,
          value: Object.assign({}, originConfig, config),
          callbackName: "setStorage"
        }
      }).then(() => message.success("保存策略成功"))
    })
  }

  //运行清理策略
  const onRunStrategy = () => {
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    }).then((res) => {
      const { message: originConfig } = res
      if (!originConfig.cleanStrategy) {
        return message.error("请先保存策略")
      }
      const tabsString = JSON.stringify(tabs)
      iframeRef.current.contentWindow.postMessage(
        `
        (function(){
          const tabs = JSON.parse('${tabsString}');
          ${config.cleanStrategy};
          const result = tabs.filter(tab => !main(tab));
          return result;
        })()
        `,
        "*"
      )
    })
  }

  // 保存定时任务策略
  const onCleanTimeoutChange: SelectProps["onChange"] = (value) => {
    config.cleanTimeout = value
    config.lastTriggerTime = Date.now()
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    }).then((res) => {
      const { message: originConfig } = res
      sendToBackground({
        name: "storage",
        body: {
          key: `config`,
          value: Object.assign({}, originConfig, config),
          callbackName: "setStorage"
        }
      }).then(() => {
        if (config.cleanTimeout === StrategyInterval.WEEK) {
          message.success(
            "保存定时任务成功，每周清理任务已开启，将在一周之后自动运行"
          )
        } else if (config.cleanTimeout === StrategyInterval.MONTH) {
          message.success(
            "保存定时任务成功，每月清理任务已开启，将在一个月之后自动运行"
          )
        } else if (config.cleanTimeout === StrategyInterval.YEAR) {
          message.success(
            "保存定时任务成功，每年清理任务已开启，将在一年之后自动运行"
          )
        } else {
          message.success("关闭定时任务成功")
        }
      })
    })
  }

  useMount(() => getTabsAsync())

  useMount(() => {
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    }).then((res) => {
      const { message: originConfig } = res
      if (!isEmpty(originConfig)) {
        config.cleanStrategy = originConfig.cleanStrategy
        if (!Number.isNaN(Number(originConfig.cleanTimeout))) {
          config.cleanTimeout = originConfig.cleanTimeout
        }
      }
    })
  })

  useEventListener("message", (ev) => {
    setAppliedTabs(JSON.parse(ev.data))
  })
  return (
    <div className="plasmo-h-auto plasmo-bg-white plasmo-p-6">
      <Flex justify="start">
        <div className="header-title">
          {chrome.i18n.getMessage("TabsClean")}
        </div>
      </Flex>
      <div className="plasmo-p-6 plasmo-flex plasmo-flex-col plasmo-gap-3">
        <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
          <div className="plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-2">
            <div className="header-sub-title ">编写你的清理策略</div>
            <Tooltip
              className="plasmo-cursor-pointer"
              title="下方编写的策略将作为一键清理时的判断条件">
              <QuestionCircleOutlined />
            </Tooltip>
          </div>
          <Button type="primary" onClick={onSaveStrategy}>
            保存策略
          </Button>
        </div>
        <Editor
          defaultValue={defaultStrategy}
          theme="vs-dark"
          height="50vh"
          defaultLanguage="javascript"
          onChange={(value) => (config.cleanStrategy = value)}
          value={config.cleanStrategy}
        />
      </div>
      <div className="plasmo-p-6 plasmo-flex plasmo-flex-col plasmo-gap-3">
        <div className="plasmo-flex plasmo-justify-between plasmo-items-center">
          <div className="plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-2">
            <div className="header-sub-title ">测试你的清理策略</div>
            <Tooltip
              className="plasmo-cursor-pointer"
              title="左侧为当前窗口所有标签页，右侧为运行您保存的策略之后的结果">
              <QuestionCircleOutlined />
            </Tooltip>
          </div>
          <Button type="primary" onClick={onRunStrategy}>
            运行策略
          </Button>
        </div>
        <div className="plasmo-flex plasmo-gap-3 plasmo-justify-between plasmo-items-center">
          <div className="list-container">
            <List
              itemLayout="horizontal"
              size="small"
              dataSource={tabsOrdered}
              renderItem={(item, index) => (
                <List.Item style={{ backgroundColor: item.backgroundColor }}>
                  <List.Item.Meta
                    avatar={<Avatar src={`${item.favIconUrl}`} />}
                    title={<div className="list-item-title">{item.title}</div>}
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
          </div>
          <DoubleRightOutlined style={{ fontSize: 40, color: "pink" }} />
          <div className="list-container">
            <List
              itemLayout="horizontal"
              size="small"
              dataSource={appliedTabsOrdered}
              renderItem={(item, index) => (
                <List.Item style={{ backgroundColor: item.backgroundColor }}>
                  <List.Item.Meta
                    avatar={<Avatar src={`${item.favIconUrl}`} />}
                    title={<div className="list-item-title">{item.title}</div>}
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
          </div>
        </div>
      </div>
      <div className="plasmo-px-6 plasmo-flex plasmo-justify-between plasmo-items-center">
        <div className="plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-2">
          <div className="header-sub-title ">是否开启定时清理</div>
          <Tooltip
            className="plasmo-cursor-pointer"
            title="开启定时清理后将按您指定的时间自动根据策略清理标签页">
            <QuestionCircleOutlined />
          </Tooltip>
        </div>
        <Select
          defaultValue="null"
          style={{ width: 120 }}
          value={config.cleanTimeout}
          options={[
            { value: "null", label: "不开启" },
            { value: "604800000", label: "每周" },
            { value: "2629744000", label: "每月" },
            { value: "31557600000", label: "每年" }
          ]}
          onChange={onCleanTimeoutChange}
        />
      </div>
      <iframe className="plasmo-hidden" src="sandbox.html" ref={iframeRef} />
    </div>
  )
}

const items = [
  {
    key: "Shortcut",
    label: chrome.i18n.getMessage("Shortcut"),
    node: <ShortcutNode />
  },
  {
    key: "TabsClean",
    label: chrome.i18n.getMessage("TabsClean"),
    node: <TabsCleanNode />
  }
]

const layoutStyle = {
  overflow: "hidden",
  height: "100vh"
}

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  color: "#fff",
  height: 64,
  paddingInline: 48,
  lineHeight: "64px"
}

const contentStyle: React.CSSProperties = {
  textAlign: "center",
  height: "100%",
  lineHeight: "120px",
  color: "#fff"
}

function OptionsIndex() {
  const [current, setCurrent] = useState("Shortcut")
  const [theme, setTheme] = useState<MenuTheme>("light")
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const menuContent = useMemo(() => {
    return items.find((item) => item.key === current)
      ?.node as unknown as ReactNode
  }, [current])

  useMount(() => {
    const style = document.createElement("style")
    style.textContent = `${antdResetCssText}\n${CssText}`
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  })

  useMount(() => {
    const search = location.search
    if (search.includes("current")) {
      const current = search.split("=")[1]
      setCurrent(current)
    }
  })

  const onClick: MenuProps["onClick"] = (e) => {
    console.log("click ", e)
    setCurrent(e.key)
  }

  return (
    <ThemeProvider>
      <Layout style={layoutStyle}>
        <Header style={headerStyle}>
          <Flex justify="space-between">
            <Flex justify="start" align="center" gap={5}>
              <Image width={50} src={Icon} preview={false} />
              <div className="header-title">Tabs Master</div>
            </Flex>
          </Flex>
        </Header>
        <Content style={contentStyle}>
          <Splitter
            style={{
              height: "100%",
              boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)"
            }}>
            <Splitter.Panel style={{ padding: 0 }} defaultSize="15%" max="70%">
              <Menu
                theme={theme}
                onClick={onClick}
                style={{ width: "100%", height: "100%" }}
                selectedKeys={[current]}
                mode="inline"
                items={items}
              />
            </Splitter.Panel>
            <Splitter.Panel>{menuContent}</Splitter.Panel>
          </Splitter>
        </Content>
        <iframe className="plasmo-hidden" src="sandbox.html" ref={iframeRef} />
      </Layout>
    </ThemeProvider>
  )
}

export default OptionsIndex
