import { GithubOutlined, SettingOutlined } from "@ant-design/icons"
import { useMount } from "ahooks"
import { Button, Flex, Layout } from "antd"
import CssText from "data-text:./popup.less"
import antdResetCssText from "data-text:antd/dist/reset.css"

import { ThemeProvider } from "~theme"

const { Header, Footer, Content } = Layout

const headerStyle = {
  textAlign: "center",
  color: "#fff",
  height: 64,
  paddingInline: 48,
  lineHeight: "64px",
  background: "initial"
} satisfies React.CSSProperties

const contentStyle = {
  textAlign: "center",
  minHeight: 120,
  lineHeight: "120px",
  color: "#fff"
} satisfies React.CSSProperties

const footerStyle = {
  textAlign: "center",
  color: "#fff",
  background: "initial"
} satisfies React.CSSProperties

const layoutStyle = {
  overflow: "hidden",
  width: "316px",
  background: "#fff"
} satisfies React.CSSProperties

function IndexPopup() {
  useMount(() => {
    const style = document.createElement("style")
    style.textContent = `${antdResetCssText}\n${CssText}`
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  })
  const openOptionsPage = () => {
    chrome.runtime.openOptionsPage()
  }
  const navigateToGithub = () => {
    window.open("https://github.com/ChuTingzj/tabs-master")
  }
  return (
    <ThemeProvider>
      <Layout style={layoutStyle}>
        <Header style={headerStyle}>
          <p className="header-title">{chrome.i18n.getMessage("Welcome")}</p>
        </Header>
        <Content style={contentStyle}>Content</Content>
        <Footer style={footerStyle}>
          <Flex justify="space-between">
            <Button
              onClick={openOptionsPage}
              icon={<SettingOutlined />}
              type="link"
              color="primary"
              size={"small"}>
              {chrome.i18n.getMessage("Configuration")}
            </Button>
            <Button
              onClick={navigateToGithub}
              icon={<GithubOutlined />}
              type="link"
              color="primary"
              size={"small"}>
              GitHub
            </Button>
          </Flex>
        </Footer>
      </Layout>
    </ThemeProvider>
  )
}

export default IndexPopup
