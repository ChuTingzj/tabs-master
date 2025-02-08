import ConfigProvider from "antd/es/config-provider"
import type { ReactNode } from "react"

export const ThemeProvider = ({ children = null as ReactNode }) => {
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
