import Icon from "@ant-design/icons"
import type { GetProps } from "antd"

type CustomIconComponentProps = GetProps<typeof Icon>
const CleanSvg = () => {
  return (
    <svg
      t="1737360175518"
      class="icon"
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="4404"
      width="16"
      height="16">
      <path
        d="M358.869333 685.312a42.666667 42.666667 0 0 1 25.258667 54.784l-39.68 107.648A67.541333 67.541333 0 0 0 407.893333 938.666667v85.333333c-106.410667 0-180.266667-105.984-143.445333-205.781333l39.68-107.648a42.666667 42.666667 0 0 1 54.784-25.258667z m211.584 0a42.666667 42.666667 0 0 1 25.258667 54.784l-39.936 108.373333A67.029333 67.029333 0 0 0 618.666667 938.666667v85.333333c-106.026667 0-179.626667-105.6-142.933334-205.056l39.936-108.373333a42.666667 42.666667 0 0 1 54.784-25.258667z"
        fill="#FFC0CB"
        p-id="4405"></path>
      <path
        d="M546.986667 55.381333A85.333333 85.333333 0 0 1 626.901333 0h100.864a85.333333 85.333333 0 0 1 79.914667 115.285333L722.901333 341.333333h41.728a42.666667 42.666667 0 0 1 0 85.333334H391.509333l-17.152 42.666666H938.666667a42.666667 42.666667 0 1 1 0 85.333334h-27.605334l-107.477333 298.965333a42.666667 42.666667 0 0 0 7.765333 42.197333l49.450667 57.770667a42.666667 42.666667 0 0 1-32.426667 70.4H226.133333c-118.698667 0-201.173333-118.186667-160.128-229.632L154.282667 554.666667H100.266667a42.666667 42.666667 0 1 1 0-85.333334h182.101333l29.952-74.496A85.333333 85.333333 0 0 1 391.509333 341.333333h48.256l107.221334-285.952zM530.901333 341.333333h100.864l96-256h-100.864l-96 256z m-285.696 213.333334l-99.072 269.184A85.333333 85.333333 0 0 0 226.133333 938.666667h510.805334a128 128 0 0 1-13.653334-113.92L820.352 554.666667H245.248z"
        fill="#FFC0CB"
        p-id="4406"></path>
    </svg>
  )
}
export const CleanIcon = (props: Partial<CustomIconComponentProps>) => (
  <Icon component={CleanSvg} {...props} />
)
