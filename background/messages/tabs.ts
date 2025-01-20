import { groupBy, isEmpty } from "lodash-es"

import type { PlasmoMessaging } from "@plasmohq/messaging"

import { storage } from "./storage"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const currentWindow = await chrome.windows.getCurrent()
  const currentWindowId = currentWindow.id

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const currentWindowRecentlyUsedTabs = await storage.get(
      `window-${currentWindowId}-recently-usedTabs`
    )
    const { tabId, windowId } = activeInfo
    if (isEmpty(currentWindowRecentlyUsedTabs)) {
      storage.set(`window-${windowId}-recently-usedTabs`, [tabId])
    } else {
      const newRecentlyUsedTabs = [tabId, ...currentWindowRecentlyUsedTabs]
      storage.set(`window-${windowId}-recently-usedTabs`, newRecentlyUsedTabs)
    }
  })
  //获取当前未分组的标签页
  const unGroupedTabs = await chrome.tabs.query({
    currentWindow: true,
    groupId: -1
  })
  //获取当前所有标签页
  const allTabs = await chrome.tabs.query({ currentWindow: true })
  //获取当前激活的标签页
  const activeTab = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })
  //快速分组：根据tab title快速创建新标签组
  const createGroupQuick = (checkedList?: Array<number>) => {
    return Promise.all(
      unGroupedTabs
        .filter((tab) => checkedList.includes(tab.id))
        .map((tab) => {
          //当前激活的tab页归属的分组默认不收起
          const isCurrentTab = activeTab[0].id === tab.id
          return chrome.tabs.group({ tabIds: tab.id }).then((group) => {
            return chrome.tabGroups.update(group, {
              title: tab.title,
              collapsed: !isCurrentTab
            })
          })
        })
    )
  }
  //快速分组：根据tab url快速创建新标签组
  const createGroupQuickByUrl = (checkedList?: Array<number>) => {
    const values = unGroupedTabs.filter((tab) => checkedList.includes(tab.id))
    const valuesWithHostName = values.map((tab) => ({
      ...tab,
      hostname: new URL(tab.url).hostname
    }))
    const groupedValues = groupBy(valuesWithHostName, "hostname")
    return Promise.all(
      Object.keys(groupedValues).map((key) => {
        const tabIds = groupedValues[key].map((tab) => tab.id)
        const isCurrentTab = tabIds.includes(activeTab[0].id)
        return chrome.tabs.group({ tabIds }).then((group) => {
          return chrome.tabGroups.update(group, {
            title: key,
            collapsed: !isCurrentTab
          })
        })
      })
    )
  }
  //自定义分组：根据提供的树形结构对未分组的标签页进行分组
  const groupTabsByTreeData = (
    treeData: Array<{
      title: string
      children: Array<{ title: string; id: string }>
    }>
  ) => {
    return Promise.all(
      treeData.map((group) => {
        return chrome.tabs
          .group({ tabIds: group.children.map((tab) => parseInt(tab.id)) })
          .then((g) => {
            //获取分组后激活的tab页，当前激活的tab页归属的分组默认不收起
            return chrome.tabs
              .query({ active: true, currentWindow: true })
              .then((activeTab) => {
                const activeTabGroupId = activeTab[0].groupId
                return chrome.tabGroups.update(g, {
                  title: group.title,
                  collapsed: activeTabGroupId !== g
                })
              })
          })
      })
    )
  }
  if (req.body && req.body.callbackName === "createGroupQuick") {
    const result = await createGroupQuick(req.body.checkedList)
    res.send({
      message: result
    })
  }
  if (req.body && req.body.callbackName === "createGroupQuickByUrl") {
    const result = await createGroupQuickByUrl(req.body.checkedList)
    res.send({
      message: result
    })
  }
  if (req.body && req.body.callbackName === "groupTabsByTreeData") {
    const result = await groupTabsByTreeData(req.body.treeData)
    res.send({
      message: result
    })
  }
  const message = allTabs.map((tab) => {
    //根据tab id获取tab对应的group title
    if (tab.groupId >= 0) {
      return chrome.tabGroups.get(tab.groupId).then((group) => {
        return {
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          tabId: tab.id,
          lastAccessed: tab.lastAccessed,
          groupId: tab.groupId,
          groupTitle: group.title,
          groupColor: group.color
        }
      })
    }
    return Promise.resolve({
      title: tab.title,
      tabId: tab.id,
      url: tab.url,
      favIconUrl: tab.favIconUrl,
      lastAccessed: tab.lastAccessed
    })
  })
  //根据tab id使浏览器跳转到对应的tab
  const navigateToTabById = async (...args: Array<number>) => {
    const tab = await chrome.tabs.update(args.shift(), { active: true })
    return tab
  }
  //根据tab url使浏览器跳转到对应的tab
  const navigateToTabByUrl = async (...args: Array<string>) => {
    const tab = await chrome.tabs.create({ url: args.shift() })
    return tab
  }
  //根据tab id关闭标签页
  const closeTab = async (...args: Array<number>) => {
    await chrome.tabs.remove(args.shift())
  }
  if (req.body && req.body.callbackName === "navigateToTabById") {
    await navigateToTabById(...req.body.arguments)
  }
  if (req.body && req.body.callbackName === "closeTab") {
    await closeTab(...req.body.arguments)
  }
  if (req.body && req.body.callbackName === "navigateToTabByUrl") {
    await navigateToTabByUrl(...req.body.arguments)
  }

  const result: Array<{
    title: string
    url: string
    favIconUrl: string
    groupId?: number
    groupTitle?: string
  }> = await Promise.all(message)
  //对result进行排序，将分组的标签页排在前面
  const unGroupedTabsResult = result.filter((tab) => tab.groupId === undefined)
  const groupedTabsResult = result.filter((tab) => tab.groupId !== undefined)
  res.send({
    currentWindowId,
    message: groupedTabsResult.concat(unGroupedTabsResult)
  })
}

export default handler
