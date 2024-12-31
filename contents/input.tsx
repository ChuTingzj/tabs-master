import type { 
  PlasmoCSConfig,
  PlasmoCSUIProps,
  PlasmoGetShadowHostId,
} from "plasmo"
import { Sender, Suggestion } from '@ant-design/x';
import {SettingOutlined,SendOutlined,PlusOutlined} from '@ant-design/icons'
import {Button,Modal,List,Avatar,Tag,Form,Radio,Alert,Flex,Steps,Input,Transfer} from 'antd'
import type {GetProp,InputRef,TransferProps} from 'antd'
import {useState,useEffect,useMemo,useRef} from 'react'
import type {FC} from 'react'
import styleText from 'data-text:./input.less'
import { ThemeProvider } from "~theme"
import antdResetCssText from "data-text:antd/dist/reset.css"
import { StyleProvider } from "@ant-design/cssinjs"
import { sendToBackgroundViaRelay } from "@plasmohq/messaging"
import {cloneDeep} from 'lodash-es'
import { TweenOneGroup } from 'rc-tween-one'
import tailWindCssText from "data-text:~style.css"
import { useSet } from 'ahooks';

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
  const inputRef = useRef<InputRef>(null);
  const [selectedKeys, setSelectedKeys] = useState<TransferProps['targetKeys']>([]);
  const [transferedKeysSet, { add, remove, reset }] = useSet(['Hello']);
  const [form] = Form.useForm<FieldType>();

  const groupTypeAlertInfo = Form.useWatch((values)=>values.groupType==='quick_group'?ALERT_MESSAGE_QUICK_GROUP:ALERT_MESSAGE_CUSTOM_GROUP, form);
  const isCustomGroup = Form.useWatch((values)=>values.groupType==='custom_group', form);
  const transferDataSource = useMemo(()=>tabs.filter(tab=>!tab.groupId).map(tab=>({key:tab.tabId,title:tab.title,description:tab.title})),[tabs,transferedKeysSet])
  const transferTags = useMemo(()=>{
    return tags.map(tag=>{
      const targetKeys = {value:[]}
      const onChange: TransferProps['onChange'] = (nextTargetKeys, direction, moveKeys) => {
        console.log('targetKeys:', nextTargetKeys);
        console.log('direction:', direction);
        console.log('moveKeys:', moveKeys);
        nextTargetKeys.forEach(key=>add(key.toString()))
        targetKeys.value = nextTargetKeys
      };
      return {title:tag,targetKeys,onChange}
    })
  },[tags])

  
  const onSelectChange: TransferProps['onSelectChange'] = (
    sourceSelectedKeys,
    targetSelectedKeys,
  ) => {
    console.log('sourceSelectedKeys:', sourceSelectedKeys);
    console.log('targetSelectedKeys:', targetSelectedKeys);
    setSelectedKeys([...sourceSelectedKeys, ...targetSelectedKeys]);
  };

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
    console.log(newTags);
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
    setCurrent(current + 1);
  };
  const prev = () => {
    setCurrent(current - 1);
  };

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

  const onOpenTabGroupModal = () => {
    setListVisible(false)
    setModal2Open(true)
  }

  const getTabsAsync = async () => {
    const resp = await sendToBackgroundViaRelay({
      name: "tabs"
    })
    setTabs(resp.message)
  }

  const onNavigateToNewTab = (tabId:number) => {
    sendToBackgroundViaRelay({
      name:"tabs",
      body:{
        callbackName:'navigateToTabById',
        arguments:[tabId]
      }
    })
  }

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
      return <div className="plasmo-grid xl:plasmo-grid-cols-1 2xl:plasmo-grid-cols-2 plasmo-gap-6" style={{maxHeight:'27vh',overflowY:'auto',overflowX:'hidden'}}>
        {
          transferTags.map(tag=>{
            return <Transfer
                    key={tag.title}
                    dataSource={transferDataSource}
                    titles={['Tabs', `${tag.title}`]}
                    targetKeys={tag.targetKeys.value}
                    selectedKeys={selectedKeys}
                    onChange={tag.onChange}
                    onSelectChange={onSelectChange}
                    render={(item) => item.title}
                  />
          })
        }
      </div>
    }
    return null
  }

  useEffect(()=>{
    let inputElement:Element
    window.addEventListener('message',(event)=>{
      if(event.data.type === 'onCloseGroupComponent'){
        setListVisible(false)
      }
      if(event.data.type === 'openGroupComponent' || event.data.type === 'onCloseGroupComponent'){
        setModal2Open(false)
        setVisible(event.data.visible)
        setTimeout(()=>{
          inputElement = document.getElementById(HOST_ID).shadowRoot?.querySelector('.ant-sender-input')
          inputElement?.addEventListener('focus',()=>{
            setListVisible(true)
          })
        })
        
      }
    })
    return () => {
      window.removeEventListener('message',()=>{})
      inputElement?.removeEventListener('focus',()=>{})
    }
  },[])
  
  
  useEffect(()=>{
    document.addEventListener('visibilitychange',()=>getTabsAsync())
    getTabsAsync()
    return () => {
      document.removeEventListener('visibilitychange',()=>{})
    }
  },[])
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
            onOk={() => setModal2Open(false)}
            onCancel={() => setModal2Open(false)}
            getContainer={false}
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
                  <Alert message={groupTypeAlertInfo} type="info" showIcon />
                </Flex>
              </Form.Item>
              {isCustomGroup?<Form.Item label="自定义分组步骤">
                <Flex vertical gap='middle'>
                  <Steps current={current} items={items} />
                  {renderStepContent()}
                  <Flex>
                    {current < steps.length - 1 && (
                      <Button type="primary" onClick={() => next()}>下一步</Button>
                    )}
                    {current > 0 && (
                      <Button style={{ margin: '0 8px' }} onClick={() => prev()}>上一步</Button>
                    )}
                  </Flex> 
                </Flex>
              </Form.Item>:null}
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