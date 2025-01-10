import { Button, Flex, Image, Layout, Menu, Splitter } from "antd"
import type { MenuProps, MenuTheme } from "antd"
import Icon from "data-base64:~assets/icon.png"
import CssText from "data-text:./options.less"
import antdResetCssText from "data-text:antd/dist/reset.css"
import { useEffect, useMemo, useState, type ReactNode } from "react"

import "~style.css"

import { ThemeProvider } from "~theme"

const { Header, Footer, Sider, Content } = Layout

const LanguageNode = () => {
  return (
    <div className="plasmo-h-full plasmo-bg-white plasmo-p-6">
      <Flex justify="start">
        <div className="header-title">{chrome.i18n.getMessage("Language")}</div>
      </Flex>
      <div className="plasmo-p-6 plasmo-flex plasmo-justify-between plasmo-items-center">
        <div className="header-sub-title ">修改语言</div>
        <Button>点击去修改</Button>
      </div>
    </div>
  )
}

const items = [
  {
    key: "Language",
    label: chrome.i18n.getMessage("Language"),
    node: <LanguageNode />
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
  const [current, setCurrent] = useState("Language")
  const [theme, setTheme] = useState<MenuTheme>("light")

  const menuContent = useMemo(() => {
    return items.find((item) => item.key === current)
      ?.node as unknown as ReactNode
  }, [current])

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `${antdResetCssText}\n${CssText}`
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

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
