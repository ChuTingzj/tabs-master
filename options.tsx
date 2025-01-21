import { QuestionCircleOutlined } from "@ant-design/icons"
import Editor, { loader } from "@monaco-editor/react"
import { useAsyncEffect, useMount, useReactive } from "ahooks"
import {
  Button,
  Flex,
  Image,
  Layout,
  Menu,
  message,
  Select,
  Splitter,
  Switch,
  Tooltip
} from "antd"
import type { MenuProps, MenuTheme, SwitchProps } from "antd"
import Icon from "data-base64:~assets/icon.png"
import CssText from "data-text:./options.less"
import antdResetCssText from "data-text:antd/dist/reset.css"
import { isEmpty } from "lodash-es"
import * as monaco from "monaco-editor"
import { useMemo, useState, type ReactNode } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import "~style.css"

import { ThemeProvider } from "~theme"

loader.config({ monaco })

const { Header, Footer, Sider, Content } = Layout

const defaultStrategy = `
  /**
   * 判断当前标签页是否需要清理
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
    if (isEmpty(message)) {
      await sendToBackground({
        name: "storage",
        body: {
          key: `config`,
          value: {
            enableInputShortcut: true,
            enableSwitchTabShortcut: true
          },
          callbackName: "setStorage"
        }
      })
    } else {
      config.enableInputShortcut = message.enableInputShortcut
      config.enableSwitchTabShortcut = message.enableSwitchTabShortcut
    }
  }
  useAsyncEffect(async () => {
    await syncLatestConfig()
  }, [])

  const onEnableInputShortcutChange: SwitchProps["onChange"] = (checked) => {
    config.enableInputShortcut = checked
    if (checked) {
      message.success(
        "打开Tabs搜索框的快捷键启用成功，返回标签页重新刷新页面即可生效"
      )
    } else {
      message.success(
        "打开Tabs搜索框的快捷键禁用成功，返回标签页重新刷新页面即可生效"
      )
    }
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        value: Object.assign({}, config, {
          enableInputShortcut: checked
        }),
        callbackName: "setStorage"
      }
    })
  }

  const onEnableSwitchTabShortcutChange: SwitchProps["onChange"] = (
    checked
  ) => {
    config.enableSwitchTabShortcut = checked
    if (checked) {
      message.success(
        "快速切换Tabs的快捷键启用成功，返回标签页重新刷新页面即可生效"
      )
    } else {
      message.success(
        "快速切换Tabs的快捷键禁用成功，返回标签页重新刷新页面即可生效"
      )
    }
    sendToBackground({
      name: "storage",
      body: {
        key: `config`,
        value: Object.assign({}, config, {
          enableSwitchTabShortcut: checked
        }),
        callbackName: "setStorage"
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

const TabsCleanNode = () => {
  const [value, setValue] = useState(defaultStrategy)

  const onSaveStrategy = () => {
    // 保存策略
    sendToBackground({
      name: "storage",
      body: {
        key: `clean_strategy`,
        value: value,
        callbackName: "setStorage"
      }
    })
    message.success("保存策略成功")
  }
  return (
    <div className="plasmo-h-full plasmo-bg-white plasmo-p-6">
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
          theme="vs-dark"
          height="50vh"
          defaultLanguage="javascript"
          onChange={(value) => setValue(value)}
          value={value}
        />
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
          options={[
            { value: "null", label: "不开启" },
            { value: "week", label: "每周" },
            { value: "month", label: "每月" },
            { value: "year", label: "每年" }
          ]}
        />
      </div>
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

  const changeTheme = (value: boolean) => {
    setTheme(value ? "dark" : "light")
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
      </Layout>
    </ThemeProvider>
  )
}

export default OptionsIndex
