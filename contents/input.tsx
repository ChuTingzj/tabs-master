import type { 
  PlasmoCSConfig,
  PlasmoCSUIProps,
  PlasmoGetShadowHostId,
} from "plasmo"
import { Sender, Suggestion } from '@ant-design/x';
import {SettingOutlined,SendOutlined,PlusOutlined} from '@ant-design/icons'
import {Button,Modal,List,Avatar,Tag,Form,Radio,Alert,Flex,Steps,Input,Tree,Spin,Result,Checkbox} from 'antd'
import type {GetProp,InputRef,TreeProps,TreeDataNode,CheckboxProps} from 'antd'
import {useState,useEffect,useMemo,useRef} from 'react'
import type {FC} from 'react'
import styleText from 'data-text:./input.less'
import { ThemeProvider } from "~theme"
import antdResetCssText from "data-text:antd/dist/reset.css"
import { StyleProvider } from "@ant-design/cssinjs"
import { sendToBackgroundViaRelay } from "@plasmohq/messaging"
import {cloneDeep,isEmpty} from 'lodash-es'
import { TweenOneGroup } from 'rc-tween-one'
import tailWindCssText from "data-text:~style.css"
import {useDocumentVisibility,useEventListener,useFocusWithin} from 'ahooks'

const HOST_ID = "engage-csui-input"
const ALERT_MESSAGE_QUICK_GROUP = '根据标签的title进行快速分组，分组名称将默认采用标签的title，已经分组的tab则不会进行重新分组'
const ALERT_MESSAGE_CUSTOM_GROUP = '对tab进行自定义分组，自定义分组名称，已经分组的tab则不会进行重新分组'

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = `${antdResetCssText}\n${styleText}\n${tailWindCssText}`
  return style
}

type SuggestionItems = Exclude<GetProp<typeof Suggestion, 'items'>, () => void>;

enum GROUP_TYPE{
  QUICK_GROUP = 'quick_group',
  CUSTOM_GROUP = 'custom_group'
}

type FieldType = {
  groupType?: GROUP_TYPE;
  value?:unknown
};

const suggestions: SuggestionItems = [
  { label: '快速分组', value: 'quick_group' },
  { label: '自定义分组', value: 'custom_group' }
];

const steps = [
  {
    title: '创建分组',
    description:'根据现有的标签页，创建你需要的分组',
    content: 'First-content',
  },
  {
    title: '对标签页进行归类',
    description:'根据创建的分组，对标签页进行归类',
    content: 'Second-content',
  }
];
const items = steps.map((item) => ({ key: item.title, title: item.title,description:item.description }));

const CheckboxGroup = Checkbox.Group;

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  world: "MAIN",
  run_at: 'document_start',
}

const PlasmoOverlay: FC<PlasmoCSUIProps> = () => {
  const [value, setValue] = useState('');
  const [visible, setVisible] = useState(false);
  const [listVisible, setListVisible] = useState(false);
  const [modal2Open, setModal2Open] = useState(false);
  const [tabs, setTabs] = useState([]);
  const [current, setCurrent] = useState(0);
  const [tags, setTags] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [loading,setLoading] = useState(false);
  const [success,setSuccess] = useState(false);
  const [checkedList, setCheckedList] = useState<number[]>([]);
  const inputRef = useRef<InputRef>(null);
  const [form] = Form.useForm<FieldType>();
  const visibility = useDocumentVisibility()

  //快速分组相关
  const tabsOptions = tabs.filter(tab=>!tab.groupId).map(tab=>({label:tab.title,value:tab.tabId}))
  const indeterminate = checkedList.length > 0 && checkedList.length < tabsOptions.length;
  const checkAll = tabsOptions.length === checkedList.length;
  const onChange = (list: number[]) => {
    setCheckedList(list);
  };
  const onCheckAllChange: CheckboxProps['onChange'] = (e) => {
    setCheckedList(e.target.checked ? tabsOptions.map(tab=>tab.value) : []);
  };

  //表单相关
  const groupTypeAlertInfo = Form.useWatch((values)=>values.groupType==='quick_group'?ALERT_MESSAGE_QUICK_GROUP:ALERT_MESSAGE_CUSTOM_GROUP, form);
  const isCustomGroup = Form.useWatch((values)=>values.groupType==='custom_group', form);

  //自定义分组Tree组件相关
  const [gData, setGData] = useState<TreeProps['treeData']>([]);
  const onDrop: TreeProps['onDrop'] = (info) => {
    console.log(info);
    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]); // the drop position relative to the drop node, inside 0, top -1, bottom 1

    const loop = (
      data: TreeDataNode[],
      key: React.Key,
      callback: (node: TreeDataNode, i: number, data: TreeDataNode[]) => void,
    ) => {
      for (let i = 0; i < data.length; i++) {
        if (data[i].key === key) {
          return callback(data[i], i, data);
        }
        if (data[i].children) {
          loop(data[i].children!, key, callback);
        }
      }
    };
    const data = [...gData];

    // Find dragObject
    let dragObj: TreeDataNode;
    loop(data, dragKey, (item, index, arr) => {
      arr.splice(index, 1);
      dragObj = item;
    });

    if (!info.dropToGap) {
      // Drop on the content
      loop(data, dropKey, (item) => {
        item.children = item.children || [];
        // where to insert. New item was inserted to the start of the array in this example, but can be anywhere
        item.children.unshift(dragObj);
      });
    } else {
      let ar: TreeDataNode[] = [];
      let i: number;
      loop(data, dropKey, (_item, index, arr) => {
        ar = arr;
        i = index;
      });
      if (dropPosition === -1) {
        // Drop on the top of the drop node
        ar.splice(i!, 0, dragObj!);
      } else {
        // Drop on the bottom of the drop node
        ar.splice(i! + 1, 0, dragObj!);
      }
    }
    setGData(data);
  };

  //自定义分组操作步骤一相关
  const showInput = () => {
    setInputVisible(true);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  const handleInputConfirm = () => {
    if (inputValue && tags.indexOf(inputValue) === -1) {
      setTags([...tags, inputValue]);
    }
    setInputValue('');
  };
  const handleClose = (removedTag: string) => {
    const newTags = tags.filter((tag) => tag !== removedTag);
    setTags(newTags);
  };
  const forMap = (tag: string) => (
    <span key={tag} style={{ display: 'inline-block' }}>
      <Tag
        closable
        onClose={(e) => {
          e.preventDefault();
          handleClose(tag);
        }}
      >
        {tag}
      </Tag>
    </span>
  );
  const tagChild = tags.map(forMap);
  const next = () => {
    setGData(()=>{
      return [
        {
          title: '分组',
          children:tags.map(tag=>({
            title:tag,
            key:`Group-${tag}`,
          })),
          key: 'Group',
          disabled:true
        }
      ].concat({
        title:'标签页',
        children:tabs.filter(tab=>!tab.groupId).map(tab=>({
          title:tab.title,
          key:`Tab-${tab.tabId}`
        })),
        key:'Tab',
        disabled:true
      })
    })
    setCurrent(current + 1);
  };
  const prev = () => {
    setCurrent(current - 1);
  };
  const onOpenTabGroupModal = () => {
    setListVisible(false)
    setModal2Open(true)
  }

  //根据value模糊匹配tabs中子项的title，并将匹配到的子项放到tabs中的第一个
  const filteredTabs = useMemo(()=>{
    if(!tabs.length || !value) return tabs
    const upperCaseValue = value.toUpperCase()
    //匹配tabs的title维度
    const matchedTabsByTitle = cloneDeep(tabs.filter((tab:any) => tab?.title?.toUpperCase().includes(upperCaseValue)))
    //匹配tabs的groupTitle维度
    const matchedTabsByGroupTitle = cloneDeep(tabs.filter((tab:any) => tab?.groupTitle?.toUpperCase()?.includes(upperCaseValue)))
    if(matchedTabsByTitle.length > 0){
      //为matchedTabsByTitle每一个元素添加一个属性backgroundColor
      matchedTabsByTitle.forEach((tab:any) => Reflect.set(tab,'backgroundColor','pink'))
      //使list-container滚动容器滚动到第一个匹配的子项
      document.getElementById(HOST_ID).shadowRoot?.querySelector('.list-container')?.scrollTo(0,0)
      return matchedTabsByTitle.concat(tabs.filter((tab:any) => !tab?.title?.toUpperCase()?.includes(upperCaseValue)))
    }
    if(matchedTabsByGroupTitle.length > 0){
      //为matchedTabsByGroupTitle每一个元素添加一个属性backgroundColor
      matchedTabsByGroupTitle.forEach((tab:any) => Reflect.set(tab,'backgroundColor','pink'))
      //使list-container滚动容器滚动到第一个匹配的子项
      document.getElementById(HOST_ID).shadowRoot?.querySelector('.list-container')?.scrollTo(0,0)
      return matchedTabsByGroupTitle.concat(tabs.filter((tab:any) => !tab?.groupTitle?.toUpperCase()?.includes(upperCaseValue)))
    }
    return tabs
  },[value,tabs])

  //自定义分类具体步骤内容相关
  const renderStepContent = () => {
    if(current === 0) {
      return <>
          <TweenOneGroup
            appear={false}
            enter={{ scale: 0.8, opacity: 0, type: 'from', duration: 100 }}
            leave={{ opacity: 0, width: 0, scale: 0, duration: 200 }}
            onEnd={(e) => {
              if (e.type === 'appear' || e.type === 'enter') {
                (e.target as any).style = 'display: inline-block';
              }
            }}
          >
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
              onBlur={()=>setInputVisible(false)}
              onPressEnter={handleInputConfirm}
            />
          ) : (
            <Button onClick={showInput} type="primary" icon={<PlusOutlined />}>创建分组</Button>
          )}
        </>
    }
    if(current === 1){
      return <Spin spinning={loading}>
                <div className="plasmo-grid plasmo-grid-cols-1 plasmo-gap-2" style={{maxHeight:'27vh',overflowY:'auto',overflowX:'hidden'}}>
                  <Alert message={'将标签页拖动到归属的分组之下，完成标签页的分组！'} type="info" showIcon closable />
                  <Tree
                    className="draggable-tree"
                    defaultExpandedKeys={['Group', 'Tab']}
                    draggable
                    blockNode
                    onDrop={onDrop}
                    treeData={gData}
                  />
                </div>
             </Spin>
    }
    return null
  }
  
  //获取tabs
  const getTabsAsync = async () => {
    const resp = await sendToBackgroundViaRelay({
      name: "tabs"
    })
    setTabs(resp.message)
  }

  //开始执行具体的分组策略
  const onRequestGroupStart = () => {
    form.validateFields().then(()=>{
      setLoading(true)
      if(isCustomGroup){
        const treeData = gData[0].children.filter(group=>!isEmpty(group.children)).map(group=>{
          return {
            title:group.title,
            children:group.children.map(tab=>{
              return {
                id:(tab.key as string).split('-')[1]
              }
            })
          }
        })
        sendToBackgroundViaRelay({
          name:"tabs",
          body:{
            callbackName:'groupTabsByTreeData',
            treeData
          }
        })
        .then(()=>setSuccess(true))
        .finally(()=>{
          getTabsAsync()
          setLoading(false)
          setTimeout(()=>{
            setModal2Open(false)
            setSuccess(false)
          },1000)
        })
      }else{
        console.log(checkedList,'front');
        
        sendToBackgroundViaRelay({
          name:"tabs",
          body:{
            callbackName:'createGroupQuick',
            checkedList
          }
        })
        .then(()=>setSuccess(true))
        .finally(()=>{
          getTabsAsync()
          setLoading(false)
          setTimeout(()=>{
            setModal2Open(false)
            setSuccess(false)
          },1000)
        })
      }

    })
  }
  
  //根据tab id使浏览器跳转到对应的tab
  const onNavigateToNewTab = (tabId:number) => {
    sendToBackgroundViaRelay({
      name:"tabs",
      body:{
        callbackName:'navigateToTabById',
        arguments:[tabId]
      }
    })
  }

  //组件打开、关闭相关的事件监听
  useEventListener('message',(event)=>{
    if(event.data.type === 'onCloseGroupComponent'){
      setListVisible(false)
    }
    if(event.data.type === 'openGroupComponent' || event.data.type === 'onCloseGroupComponent'){
      setModal2Open(false)
      setVisible(event.data.visible)
      setListVisible(event.data.visible)
      setTimeout(()=>{
        const inputElement = document.getElementById(HOST_ID).shadowRoot?.querySelector('.ant-sender-input')
        inputElement?.addEventListener('focus',()=>{
          setListVisible(true)
        })
      })
    }
  },{target:window})
  
  //tabs更新相关
  useEffect(()=>{
    if(visibility === 'hidden'){
      (document.getElementById(HOST_ID).shadowRoot?.querySelector('.ant-sender-input') as HTMLInputElement)?.blur()
      setListVisible(false)
      setModal2Open(false)
    }
    if(visibility === 'visible'){
      (document.getElementById(HOST_ID).shadowRoot?.querySelector('.ant-sender-input') as HTMLInputElement)?.focus()
    }
    getTabsAsync()
  },[visibility,listVisible])

  return (
    <ThemeProvider>
      <StyleProvider container={document.getElementById(HOST_ID).shadowRoot}>
        <div className="input-container">
          <Modal
            title="分组"
            width={'60%'}
            style={{ top: '24%' }}
            open={modal2Open}
            mask={false}
            okButtonProps={{disabled:isCustomGroup?current!==1:false,loading}}
            onOk={onRequestGroupStart}
            onCancel={() => setModal2Open(false)}
            getContainer={false}
            destroyOnClose
          >
            <Form
              form={form}
              name="tab_group"
              initialValues={{groupType:'quick_group'}}
              autoComplete="off"
            >
              <Form.Item label="分组方式">
                <Flex vertical gap='small'>
                  <Form.Item<FieldType>
                    name="groupType"
                    style={{marginBottom:0}}
                    rules={[{ required: true }]}

                  >
                    <Radio.Group options={suggestions} />
                  </Form.Item>
                  {isCustomGroup? <Alert message={groupTypeAlertInfo} type="info" showIcon /> :<Spin spinning={loading}>
                    <Alert message={groupTypeAlertInfo} type="info" showIcon />
                  </Spin>}
                </Flex>
              </Form.Item>
              {isCustomGroup?
                <Form.Item label="自定义分组步骤" name='value' rules={[{
                  validator(rule, value, callback) {
                    const canGroupedTabs = tabs.filter(tab=>!tab.groupId)
                    if(isEmpty(canGroupedTabs)){
                      return Promise.reject(new Error('当前没有可分组的标签页！'))
                    }
                    const treeData = gData[0].children.filter(group=>!isEmpty(group.children)).map(group=>{
                      return {
                        title:group.title,
                        children:group.children.map(tab=>{
                          return {
                            id:(tab.key as string).split('-')[1]
                          }
                        })
                      }
                    })
                    if(isEmpty(treeData)){
                      return Promise.reject(new Error('还未创建分组或者未对标签页进行分类！'))
                    }
                    const existEmptyGroup = treeData.some(group=>isEmpty(group.children))
                    if(existEmptyGroup){
                      return Promise.reject(new Error('存在未分配标签页的分组！'))
                    }
                    return Promise.resolve()
                  },
                }]}>
                  {!success ? <Flex vertical gap='middle'>
                    <Steps current={current} items={items} />
                    {renderStepContent()}
                    <Flex>
                      {current < steps.length - 1 && (
                        <Button type="primary" onClick={() => next()}>下一步</Button>
                      )}
                      {current > 0 && (
                        <Button style={{ margin: '0 .5rem' }} onClick={() => prev()}>上一步</Button>
                      )}
                    </Flex>
                  </Flex> : null}
                  {success? <Result status="success" title="分组完成!"/>:null} 
                </Form.Item>:
                <Form.Item label='执行快速分组的标签页' name='value' rules={[{
                  validator(rule, value, callback) {
                    const canGroupedTabs = tabs.filter(tab=>!tab.groupId)
                    if(isEmpty(canGroupedTabs)){
                      return Promise.reject(new Error('当前没有可分组的标签页！'))
                    }
                    if(isEmpty(checkedList)){
                      return Promise.reject(new Error('请选择需要分组的标签页！'))
                    }
                    return Promise.resolve()
                  },
                }]}>
                  {!success ? <Flex vertical>
                    <Checkbox indeterminate={indeterminate} onChange={onCheckAllChange} checked={checkAll}>全选</Checkbox>
                    <CheckboxGroup options={tabsOptions} value={checkedList} onChange={onChange} />
                  </Flex> : null}
                  {success? <Result status="success" title="分组完成!"/>:null} 
                </Form.Item>
              }
            </Form>
          </Modal>
          {visible &&  <Sender
            value={value}
            actions={<Button
              onClick={onOpenTabGroupModal}
              type="text"
              icon={<SettingOutlined style={{color:'pink'}} />}
            />}
            onChange={(nextVal) => {
              setValue(nextVal);
            }}
            placeholder="输入关键字搜索tab，支持分组名称和tab标题维度的搜索"
          />}
        </div>
        <div className="list-container">
          {listVisible && <List
            itemLayout="horizontal"
            size="small"
            dataSource={filteredTabs}
            renderItem={(item) => (
              <List.Item style={{backgroundColor:item.backgroundColor}} actions={[<Button onClick={()=>onNavigateToNewTab(item.tabId)} key='0' size="small" type="primary" shape="circle" icon={<SendOutlined style={{color:'pink'}} />} />]}>
                <List.Item.Meta
                  avatar={<Avatar src={`${item.favIconUrl}`} />}
                  title={<div onClick={()=>onNavigateToNewTab(item.tabId)} className="list-item-title">{item.title}</div>}
                  description={<Tag color={item.groupColor}>{item.groupTitle}</Tag>}
                />
              </List.Item>
          )}/>}
        </div>
      </StyleProvider>
  </ThemeProvider>
  )
}

export default PlasmoOverlay