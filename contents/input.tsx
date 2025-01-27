import { StyleProvider } from "@ant-design/cssinjs"
import {
  PlusOutlined,
  QuestionCircleOutlined,
  SendOutlined,
  SettingOutlined
} from "@ant-design/icons"
import { Sender, Suggestion } from "@ant-design/x"
import {
  useAsyncEffect,
  useDocumentVisibility,
  useEventListener,
  useFocusWithin,
  useReactive
} from "ahooks"
import {
  Alert,
  Avatar,
  Button,
  Checkbox,
  Flex,
  Form,
  Image,
  Input,
  List,
  Modal,
  Radio,
  Result,
  Spin,
  Steps,
  Tag,
  Tooltip,
  Tree
} from "antd"
import type {
  CheckboxProps,
  GetProp,
  InputRef,
  TreeDataNode,
  TreeProps
} from "antd"
import styleText from "data-text:./input.less"
import tailWindCssText from "data-text:~style.css"
import antdResetCssText from "data-text:antd/dist/reset.css"
import { cloneDeep, isEmpty, nth } from "lodash-es"
import type {
  PlasmoCSConfig,
  PlasmoCSUIProps,
  PlasmoGetShadowHostId
} from "plasmo"
import { TweenOneGroup } from "rc-tween-one"
import { useEffect, useMemo, useRef, useState } from "react"
import type { FC } from "react"

import { sendToBackgroundViaRelay } from "@plasmohq/messaging"

import { ThemeProvider } from "~theme"

const HOST_ID = "engage-csui-input"
const ALERT_MESSAGE_QUICK_GROUP =
  "根据标签的title进行快速分组，分组名称将默认采用标签的title，已经分组的tab则不会进行重新分组"
const ALERT_MESSAGE_QUICK_GROUP_BY_URL =
  "根据标签的url进行快速分组，分组名称将默认采用标签的一级域名，已经分组的tab则不会进行重新分组"
const ALERT_MESSAGE_CUSTOM_GROUP =
  "对tab进行自定义分组，自定义分组名称，已经分组的tab则不会进行重新分组"

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `${antdResetCssText}\n${styleText}\n${tailWindCssText}`
  return style
}

type SuggestionItems = Exclude<GetProp<typeof Suggestion, "items">, () => void>

enum GROUP_TYPE {
  QUICK_GROUP = "quick_group",
  CUSTOM_GROUP = "custom_group"
}

enum QUICK_GROUP_STRATEGY {
  TITLE = "title",
  URL = "url"
}

type FieldType = {
  groupType?: GROUP_TYPE
  value?: unknown
  quickGroupStrategy?: QUICK_GROUP_STRATEGY
}

const suggestions: SuggestionItems = [
  { label: "快速分组", value: "quick_group" },
  { label: "自定义分组", value: "custom_group" }
]

const quickGroupSuggestions: SuggestionItems = [
  { label: "Title维度", value: "title" },
  { label: "URL维度", value: "url" }
]

const steps = [
  {
    title: "创建分组",
    description: "根据现有的标签页，创建你需要的分组",
    content: "First-content"
  },
  {
    title: "对标签页进行归类",
    description: "根据创建的分组，对标签页进行归类",
    content: "Second-content"
  }
]
const items = steps.map((item) => ({
  key: item.title,
  title: item.title,
  description: item.description
}))

const CheckboxGroup = Checkbox.Group

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: "document_start"
}

const PlasmoOverlay: FC<PlasmoCSUIProps> = () => {
  const [value, setValue] = useState("")
  const [visible, setVisible] = useState(false)
  const [switchContainerVisible, setSwitchContainerVisible] = useState(false)
  const [listVisible, setListVisible] = useState(false)
  const [modal2Open, setModal2Open] = useState(false)
  const [tabs, setTabs] = useState([])
  const [current, setCurrent] = useState(0)
  const [tags, setTags] = useState([])
  const [inputValue, setInputValue] = useState("")
  const [inputVisible, setInputVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<InputRef>(null)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [currentRecentlySwitchedTabIndex, setCurrentRecentlySwitchedTabIndex] =
    useState(-1)
  const [recentlySwitchedTab, setRecentlySwitchedTab] = useState<Array<number>>(
    []
  )
  const config = useReactive({
    enableSwitchTabShortcut: false
  })
  const [form] = Form.useForm<FieldType>()
  const visibility = useDocumentVisibility()

  useAsyncEffect(async () => {
    const { message } = await sendToBackgroundViaRelay({
      name: "storage",
      body: {
        key: `config`,
        callbackName: "getStorage"
      }
    })
    config.enableSwitchTabShortcut = message?.enableSwitchTabShortcut
  }, [])

  const recentlySwitchedTabList = useMemo(() => {
    const recentlySwitchedTabClone = cloneDeep(
      [...new Set(recentlySwitchedTab)].slice(0, 6)
    )
    return recentlySwitchedTabClone
      .map((tabId, index) => {
        const target = tabs.filter((tab) => tab.tabId === tabId).shift()
        if (index === currentRecentlySwitchedTabIndex) {
          return { ...target, backgroundColor: "pink" }
        }
        return target
      })
      .filter(Boolean)
  }, [recentlySwitchedTab, currentRecentlySwitchedTabIndex])

  //列表光标快速选择方法
  const updateListCursor = (tabs: Array<any>) => {
    const tabs_clone = cloneDeep(tabs) as Array<any>
    if (currentIndex >= 0) {
      const currentTab = nth(tabs_clone, currentIndex)
      if (currentTab) {
        tabs_clone.forEach((tab: any) => {
          Reflect.set(tab, "backgroundColor", "")
        })
        Reflect.set(currentTab, "backgroundColor", "pink")
        const target = document
          .getElementById(HOST_ID)
          ?.shadowRoot?.querySelectorAll(".ant-list-item")[currentIndex]
        target?.scrollIntoView({ behavior: "instant", block: "center" })
      }
    }
    return tabs_clone
  }

  //根据value模糊匹配tabs中子项的title，并将匹配到的子项放到tabs中的第一个
  const filteredTabs = useMemo(() => {
    if (!tabs.length || !value) return updateListCursor(tabs)
    const upperCaseValue = value.toUpperCase()
    //匹配tabs的title维度
    const matchedTabsByTitle = cloneDeep(
      tabs.filter((tab: any) =>
        tab?.title?.toUpperCase().includes(upperCaseValue)
      )
    )
    //匹配tabs的groupTitle维度
    const matchedTabsByGroupTitle = cloneDeep(
      tabs.filter((tab: any) =>
        tab?.groupTitle?.toUpperCase()?.includes(upperCaseValue)
      )
    )
    if (matchedTabsByTitle.length > 0) {
      //使list-container滚动容器滚动到第一个匹配的子项
      document
        .getElementById(HOST_ID)
        ?.shadowRoot?.querySelector(".list-container")
        ?.scrollTo(0, 0)
      return updateListCursor(matchedTabsByTitle)
    }
    if (matchedTabsByGroupTitle.length > 0) {
      //使list-container滚动容器滚动到第一个匹配的子项
      document
        .getElementById(HOST_ID)
        ?.shadowRoot?.querySelector(".list-container")
        ?.scrollTo(0, 0)
      return updateListCursor(matchedTabsByGroupTitle)
    }
    return updateListCursor(tabs)
  }, [value, tabs, currentIndex])

  useEffect(() => {
    setCurrentIndex(-1)
  }, [value])

  const isFocusWithin = useFocusWithin(() =>
    document
      .getElementById(HOST_ID)
      ?.shadowRoot?.querySelector(".ant-sender-input")
  )

  //监听用户按下指定的快捷键
  useEventListener(
    ["keydown", "keyup"],
    (event: KeyboardEvent) => {
      const isKeyDown = event.type === "keydown"
      const isKeyUp = event.type === "keyup"
      if (isKeyDown && event.key === "ArrowDown" && isFocusWithin) {
        setCurrentIndex((preState) => {
          const currentTab = nth(filteredTabs, preState + 1)
          if (!currentTab) return preState
          return preState + 1
        })
      }
      if (isKeyDown && event.key === "ArrowUp" && isFocusWithin) {
        setCurrentIndex((preState) => {
          const currentTab = nth(filteredTabs, preState - 1)
          if (!currentTab || preState - 1 < 0) return preState
          return preState - 1
        })
      }
      //监听用户按下回车键
      if (isKeyDown && event.key === "Enter" && isFocusWithin) {
        const currentTab = nth(filteredTabs, currentIndex)
        if (currentTab && currentIndex >= 0) {
          onNavigateToNewTab(currentTab.tabId)
        }
      }
      //监听用户按下Alt+Backquote键
      if (isKeyDown && event.altKey && config.enableSwitchTabShortcut) {
        setModal2Open(false)
        setVisible(false)
        setListVisible(false)
        setSwitchContainerVisible(true)
        if (event.code === "Backquote") {
          setCurrentRecentlySwitchedTabIndex((preState) => {
            const currentTab = nth(recentlySwitchedTabList, preState + 1)
            const index = !currentTab ? 0 : preState + 1
            return index
          })
        }
      }
      if (isKeyUp && event.code === "AltLeft") {
        setSwitchContainerVisible(false)
        setCurrentRecentlySwitchedTabIndex(-1)
        const currentTab = nth(
          recentlySwitchedTabList,
          currentRecentlySwitchedTabIndex
        )
        const tabId = currentTab?.tabId
        if (tabId && currentRecentlySwitchedTabIndex >= 0) {
          onNavigateToNewTab(tabId)
        }
      }
    },
    { target: window }
  )

  //快速分组相关
  const tabsOptions = tabs
    .filter((tab) => !tab.groupId)
    .map((tab) => ({ label: tab.title, value: tab.tabId }))
  const values = Form.useWatch((values) => values.value, form) as
    | string[]
    | undefined
  const indeterminate =
    values?.length > 0 && values?.length < tabsOptions.length
  const checkAll = values?.length === tabsOptions.length
  const onCheckAllChange: CheckboxProps["onChange"] = (e) => {
    form.setFieldValue(
      "value",
      e.target.checked ? tabsOptions.map((tab) => tab.value) : []
    )
  }

  //表单相关
  const groupTypeAlertInfo = Form.useWatch((values) => {
    if (values.groupType === "quick_group") {
      if (values.quickGroupStrategy === "title") {
        return ALERT_MESSAGE_QUICK_GROUP
      }
      return ALERT_MESSAGE_QUICK_GROUP_BY_URL
    }
    return ALERT_MESSAGE_CUSTOM_GROUP
  }, form)
  const isCustomGroup = Form.useWatch(
    (values) => values.groupType === "custom_group",
    form
  )
  const isQuickGroupByTitle = Form.useWatch(
    (values) => values.quickGroupStrategy === "title",
    form
  )

  //自定义分组Tree组件相关
  const [gData, setGData] = useState<TreeProps["treeData"]>([])
  const onDrop: TreeProps["onDrop"] = (info) => {
    console.log(info)
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos.split("-")
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]) // the drop position relative to the drop node, inside 0, top -1, bottom 1

    const loop = (
      data: TreeDataNode[],
      key: React.Key,
      callback: (node: TreeDataNode, i: number, data: TreeDataNode[]) => void
    ) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data)
        }
        if (data[i].children) {
          loop(data[i].children!, key, callback)
        }
      }
    }
    const data = [...gData]

    // Find dragObject
    let dragObj: TreeDataNode
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1)
      dragObj = item
    })

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item) => {
        item.children = item.children || []
        // where to insert. New item was inserted to the start of the array in this example, but can be anywhere
        item.children.unshift(dragObj)
      })
    } else {
      let ar: TreeDataNode[] = []
      let i: number
      loop(data, dropKey, (_item, index, arr) => {
        ar = arr
        i = index
      })
      if (dropPosition === -1) {
        // Drop on the top of the drop node
        ar.splice(i!, 0, dragObj!)
      } else {
        // Drop on the bottom of the drop node
        ar.splice(i! + 1, 0, dragObj!)
      }
    }
    setGData(data)
    form.validateFields()
  }

  //自定义分组操作步骤一相关
  const showInput = () => {
    setInputVisible(true)
  }
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }
  const handleInputConfirm = () => {
    if (inputValue && tags.indexOf(inputValue) === -1) {
      setTags([...tags, inputValue])
    }
    setInputValue("")
  }
  const handleClose = (removedTag: string) => {
    const newTags = tags.filter((tag) => tag !== removedTag)
    setTags(newTags)
  }
  const forMap = (tag: string) => (
    <span key={tag} style={{ display: "inline-block" }}>
      <Tag
        closable
        onClose={(e) => {
          e.preventDefault()
          handleClose(tag)
        }}>
        {tag}
      </Tag>
    </span>
  )
  const tagChild = tags.map(forMap)
  const resetTree = () => {
    setGData(() => {
      return [
        {
          title: "分组",
          children: tags.map((tag) => ({
            title: tag,
            key: `Group-${tag}`
          })),
          key: "Group",
          disabled: true
        }
      ].concat({
        title: "标签页",
        children: tabs
          .filter((tab) => !tab.groupId)
          .map((tab) => ({
            title: tab.title,
            key: `Tab-${tab.tabId}`
          })),
        key: "Tab",
        disabled: true
      })
    })
  }
  const next = () => {
    resetTree()
    setCurrent(current + 1)
  }
  const prev = () => {
    setCurrent(current - 1)
  }
  const onOpenTabGroupModal = () => {
    setListVisible(false)
    setModal2Open(true)
  }

  //自定义分类具体步骤内容相关
  const renderStepContent = () => {
    if (current === 0) {
      return (
        <>
          <TweenOneGroup
            appear={false}
            enter={{ scale: 0.8, opacity: 0, type: "from", duration: 100 }}
            leave={{ opacity: 0, width: 0, scale: 0, duration: 200 }}
            onEnd={(e) => {
              if (e.type === "appear" || e.type === "enter") {
                ;(e.target as any).style = "display: inline-block"
              }
            }}>
            {tagChild}
          </TweenOneGroup>
          {inputVisible ? (
            <Input
              ref={inputRef}
              type="text"
              size="middle"
              placeholder="输入分组名称，按下Enter键完成创建"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={() => setInputVisible(false)}
              onPressEnter={handleInputConfirm}
            />
          ) : (
            <Button onClick={showInput} type="primary" icon={<PlusOutlined />}>
              创建分组
            </Button>
          )}
        </>
      )
    }
    if (current === 1) {
      return (
        <Spin spinning={loading}>
          <div
            className="plasmo-grid plasmo-grid-cols-1 plasmo-gap-2"
            style={{
              maxHeight: "27vh",
              overflowY: "auto",
              overflowX: "hidden"
            }}>
            <Alert
              message={"将标签页拖动到归属的分组之下，完成标签页的分组！"}
              type="info"
              showIcon
              closable
            />
            <Tree
              className="draggable-tree"
              defaultExpandedKeys={["Group", "Tab"]}
              draggable
              blockNode
              onDrop={onDrop}
              treeData={gData}
            />
          </div>
        </Spin>
      )
    }
    return null
  }

  //获取tabs
  const getTabsAsync = async () => {
    const resp = await sendToBackgroundViaRelay({
      name: "tabs"
    })
    const { message: recentlySwitchedTabs } = await sendToBackgroundViaRelay({
      name: "storage",
      body: {
        key: `window-${resp.currentWindowId}-recently-usedTabs`,
        callbackName: "getStorage"
      }
    })
    const latestTabIds = resp.message.map((tab) => tab.tabId)
    setRecentlySwitchedTab(
      recentlySwitchedTabs?.filter((id) => latestTabIds.includes(id)) ?? []
    )
    setTabs(resp.message)
  }

  //开始执行具体的分组策略
  const onRequestGroupStart = () => {
    form.validateFields().then((values) => {
      setLoading(true)
      if (isCustomGroup) {
        const treeData = gData[0].children
          .filter((group) => !isEmpty(group.children))
          .map((group) => {
            return {
              title: group.title,
              children: group.children.map((tab) => {
                return {
                  id: (tab.key as string).split("-")[1]
                }
              })
            }
          })
        sendToBackgroundViaRelay({
          name: "tabs",
          body: {
            callbackName: "groupTabsByTreeData",
            treeData
          }
        })
          .then(() => setSuccess(true))
          .finally(() => {
            getTabsAsync()
            setLoading(false)
            resetTree()
            form.resetFields()
            setCurrent(0)
            setTimeout(() => {
              setModal2Open(false)
              setSuccess(false)
            }, 1000)
          })
      } else {
        sendToBackgroundViaRelay({
          name: "tabs",
          body: {
            callbackName: isQuickGroupByTitle
              ? "createGroupQuick"
              : "createGroupQuickByUrl",
            checkedList: values["value"]
          }
        })
          .then(() => setSuccess(true))
          .finally(() => {
            getTabsAsync()
            setLoading(false)
            form.resetFields()
            setTimeout(() => {
              setModal2Open(false)
              setSuccess(false)
            }, 1000)
          })
      }
    })
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

  //组件打开、关闭相关的事件监听
  useEventListener(
    "message",
    (event) => {
      if (event.data.type === "onCloseGroupComponent") {
        setListVisible(false)
      }
      if (
        event.data.type === "openGroupComponent" ||
        event.data.type === "onCloseGroupComponent"
      ) {
        setModal2Open(false)
        setVisible(event.data.visible)
        setListVisible(event.data.visible)
        setTimeout(() => {
          const inputElement = document
            .getElementById(HOST_ID)
            ?.shadowRoot?.querySelector(".ant-sender-input")
          inputElement?.addEventListener("focus", () => {
            setListVisible(true)
          })
        })
      }
    },
    { target: window }
  )

  //tabs更新相关
  useEffect(() => {
    if (visibility === "hidden") {
      ;(
        document
          .getElementById(HOST_ID)
          ?.shadowRoot?.querySelector(".ant-sender-input") as HTMLInputElement
      )?.blur()
      setListVisible(false)
      setModal2Open(false)
    }
    if (visibility === "visible") {
      ;(
        document
          .getElementById(HOST_ID)
          ?.shadowRoot?.querySelector(".ant-sender-input") as HTMLInputElement
      )?.focus()
    }
    getTabsAsync()
  }, [visibility, listVisible])

  return (
    <ThemeProvider>
      <StyleProvider container={document.getElementById(HOST_ID)?.shadowRoot}>
        <div className="input-container">
          <Modal
            title={
              <div className="plasmo-flex plasmo-items-center">
                <div className="plasmo-text-lg">分组</div>
                <div className="plasmo-flex plasmo-items-center plasmo-self-end">
                  <Button type="link" onClick={getTabsAsync}>
                    更新数据
                  </Button>
                  <Tooltip
                    getPopupContainer={() =>
                      document
                        .getElementById(HOST_ID)
                        ?.shadowRoot?.querySelector(".ant-modal-title")
                    }
                    className="plasmo-cursor-pointer"
                    title="如果在下方没有找到你需要分组的标签页，请点击“更新数据”按钮，获取最新的标签页数据">
                    <QuestionCircleOutlined />
                  </Tooltip>
                </div>
              </div>
            }
            width={"60%"}
            style={{ top: "24%" }}
            open={modal2Open}
            mask={false}
            okButtonProps={{
              disabled: isCustomGroup ? current !== 1 : false,
              loading
            }}
            onOk={onRequestGroupStart}
            onCancel={() => setModal2Open(false)}
            getContainer={false}
            destroyOnClose>
            <Form
              form={form}
              name="tab_group"
              initialValues={{
                groupType: "quick_group",
                quickGroupStrategy: "title"
              }}
              autoComplete="off">
              <Form.Item label="分组方式">
                <Flex vertical gap="small">
                  <Form.Item<FieldType>
                    name="groupType"
                    style={{ marginBottom: 0 }}
                    rules={[{ required: true }]}>
                    <Radio.Group options={suggestions} />
                  </Form.Item>
                  {isCustomGroup ? (
                    <Alert message={groupTypeAlertInfo} type="info" showIcon />
                  ) : (
                    <Spin spinning={loading}>
                      <Alert
                        message={groupTypeAlertInfo}
                        type="info"
                        showIcon
                      />
                    </Spin>
                  )}
                </Flex>
              </Form.Item>
              {isCustomGroup ? (
                <Form.Item
                  label="自定义分组步骤"
                  name="value"
                  rules={[
                    {
                      validator(rule, value, callback) {
                        if (current === 1) {
                          const canGroupedTabs = tabs.filter(
                            (tab) => !tab.groupId
                          )
                          if (isEmpty(canGroupedTabs)) {
                            return Promise.reject(
                              new Error("当前没有可分组的标签页！")
                            )
                          }
                          const treeData = gData[0]?.children
                            .filter((group) => !isEmpty(group?.children))
                            .map((group) => {
                              return {
                                title: group.title,
                                children: group?.children.map((tab) => {
                                  return {
                                    id: (tab.key as string).split("-")[1]
                                  }
                                })
                              }
                            })
                          if (isEmpty(treeData)) {
                            return Promise.reject(
                              new Error("还未创建分组或者未对标签页进行分类！")
                            )
                          }
                          const existEmptyGroup = treeData.some((group) =>
                            isEmpty(group?.children)
                          )
                          if (existEmptyGroup) {
                            return Promise.reject(
                              new Error("存在未分配标签页的分组！")
                            )
                          }
                          return Promise.resolve()
                        }
                        return Promise.resolve()
                      }
                    }
                  ]}>
                  {!success ? (
                    <Flex vertical gap="middle">
                      <Steps current={current} items={items} />
                      {renderStepContent()}
                      <Flex>
                        {current < steps.length - 1 && (
                          <Button type="primary" onClick={() => next()}>
                            下一步
                          </Button>
                        )}
                        {current > 0 && (
                          <Button
                            style={{ margin: "0 .5rem" }}
                            onClick={() => prev()}>
                            上一步
                          </Button>
                        )}
                      </Flex>
                    </Flex>
                  ) : null}
                  {success ? (
                    <Result status="success" title="分组完成!" />
                  ) : null}
                </Form.Item>
              ) : (
                <>
                  <Form.Item label="快速分组策略" name={"quickGroupStrategy"}>
                    <Radio.Group options={quickGroupSuggestions} />
                  </Form.Item>
                  <Form.Item label="执行快速分组的标签页">
                    {!success ? (
                      <Flex vertical>
                        <Checkbox
                          indeterminate={indeterminate}
                          onChange={onCheckAllChange}
                          checked={checkAll}>
                          全选
                        </Checkbox>
                        <Form.Item<FieldType>
                          name="value"
                          rules={[
                            {
                              validator(rule, value) {
                                const canGroupedTabs = tabs.filter(
                                  (tab) => !tab.groupId
                                )
                                if (isEmpty(canGroupedTabs)) {
                                  return Promise.reject(
                                    new Error("当前没有可分组的标签页！")
                                  )
                                }
                                if (isEmpty(value)) {
                                  return Promise.reject(
                                    new Error("请选择需要分组的标签页！")
                                  )
                                }
                                return Promise.resolve()
                              }
                            }
                          ]}>
                          <CheckboxGroup options={tabsOptions} />
                        </Form.Item>
                      </Flex>
                    ) : null}
                    {success ? (
                      <Result status="success" title="分组完成!" />
                    ) : null}
                  </Form.Item>
                </>
              )}
            </Form>
          </Modal>
          {visible && (
            <Sender
              value={value}
              actions={
                <Tooltip
                  title="分组设置"
                  color="pink"
                  getPopupContainer={() =>
                    document
                      .getElementById(HOST_ID)
                      ?.shadowRoot?.querySelector(".input-container")
                  }>
                  <Button
                    onClick={onOpenTabGroupModal}
                    type="text"
                    icon={<SettingOutlined style={{ color: "pink" }} />}
                  />
                </Tooltip>
              }
              onChange={(nextVal) => {
                setValue(nextVal)
              }}
              placeholder="输入关键字搜索tab，支持分组名称和tab标题维度的搜索"
            />
          )}
          {switchContainerVisible && (
            <div className="switch-container">
              {recentlySwitchedTabList.map((tab) => {
                return (
                  <div
                    key={tab.tabId}
                    className="plasmo-flex plasmo-justify-start plasmo-items-center plasmo-gap-5 plasmo-p-2 plasmo-rounded-2xl"
                    style={{
                      backgroundColor: tab.backgroundColor
                    }}>
                    <Image src={tab.favIconUrl} width={32} height={32} />
                    <div className="plasmo-flex plasmo-flex-col plasmo-items-start plasmo-justify-center">
                      <div className="plasmo-text-base">{tab.title}</div>
                      <Tag color={tab.groupColor}>{tab.groupTitle}</Tag>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="list-container">
          {listVisible && (
            <List
              itemLayout="horizontal"
              size="small"
              dataSource={filteredTabs}
              renderItem={(item, index) => (
                <List.Item
                  style={{ backgroundColor: item.backgroundColor }}
                  actions={[
                    <Button
                      onClick={() => onNavigateToNewTab(item.tabId)}
                      key="0"
                      size="small"
                      type="primary"
                      shape="circle"
                      icon={<SendOutlined style={{ color: "pink" }} />}
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
                      <Tag color={item.groupColor}>{item.groupTitle}</Tag>
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
