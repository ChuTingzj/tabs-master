import type {PlasmoMessaging} from '@plasmohq/messaging'

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  //获取当前未分组的标签页
  const unGroupedTabs = await chrome.tabs.query({currentWindow:true,groupId:-1})
  //获取当前所有标签页
  const allTabs = await chrome.tabs.query({currentWindow:true})
  //根据tab title创建新标签组
  const createGroupQuick = () => Promise.all(unGroupedTabs.map(tab => {
    chrome.tabs.group({tabIds:tab.id}).then(group=>{
      chrome.tabGroups.update(group, {title: tab.title})
    })
  }))
  if(req.body && req.body.callbackName === 'createGroupQuick'){
    await createGroupQuick()
  }
  const message = allTabs.map(tab => {
    //根据tab id获取tab对应的group title
    if(tab.groupId >= 0){
      return chrome.tabGroups.get(tab.groupId).then(group=>{
        return {
          title: tab.title,
          url: tab.url,
          favIconUrl: tab.favIconUrl,
          tabId: tab.id,
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
    })
  })
  //根据tab id使浏览器跳转到对应的tab
  const navigateToTabById = async (...args:Array<number>) => {
    await chrome.tabs.update(args.shift(), {active:true})
  }
  if(req.body && req.body.callbackName === 'navigateToTabById'){
    await navigateToTabById(...req.body.arguments)
  }
  
  const result:Array<{
    title:string,
    url:string,
    favIconUrl:string,
    groupId?:number,
    groupTitle?:string
  }> = await Promise.all(message)
  //对result进行排序，将分组的标签页排在前面
  const unGroupedTabsResult = result.filter(tab=>tab.groupId === undefined)
  const groupedTabsResult = result.filter(tab=>tab.groupId !== undefined)
  res.send({
    message:groupedTabsResult.concat(unGroupedTabsResult)
  })
}
 
export default handler