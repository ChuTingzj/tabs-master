import { useMount } from "ahooks"
import ConfigProvider from "antd/es/config-provider"
import type { ReactNode } from "react"

export const ThemeProvider = ({ children = null as ReactNode }) => {
  useMount(() => {
    //将根元素的字体大小设置为16px
    document.documentElement.style.fontSize = "16px"
  })
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "hotpink",
          colorLink: "hotpink"
        }
      }}>
      {children}
    </ConfigProvider>
  )
}
