import copy from 'copy-to-clipboard';
import { FC, ReactNode, useMemo, useState } from 'react';

import { LLMRoleType } from '@/types/llm';
import { ChatMessage } from '@/types/message';

import { useRefFunction } from '@/ProChat/hooks/useRefFunction';
import ChatItem, { ChatItemProps } from '@/components/ChatItem';

export type OnMessageChange = (id: string, content: string) => void;
export type OnActionClick = (action: any, message: ChatMessage) => void;
export type RenderRole = LLMRoleType | 'default' | string;
export type RenderItem = FC<{ key: string } & ChatMessage & ListItemProps>;
export type RenderMessage = FC<ChatMessage & { editableContent: ReactNode }>;
export type RenderMessageExtra = FC<ChatMessage>;
export type RenderErrorMessage = FC<ChatMessage>;
export type RenderAction = FC<ChatMessage>;

/**
 * 聊天列表项的属性。
 * @template T 聊天列表项的额外数据类型。
 */
export interface ListItemProps<T = Record<string, any>> {
  /**
   * 聊天项的导航组件。
   */
  groupNav?: ChatItemProps['avatarAddon'];
  /**
   * 是否正在加载。
   */
  loading?: boolean;
  /**
   * 点击操作按钮的回调函数。
   */
  onActionsClick?: OnActionClick;
  /**
   * 消息变化的回调函数。
   */
  onMessageChange?: OnMessageChange;
  /**
   * 渲染操作按钮的函数。
   */
  renderActions?: {
    [actionKey: string]: RenderAction;
  };
  /**
   * 渲染错误消息的函数。
   */
  renderErrorMessages?: {
    [errorType: 'default' | string]: RenderErrorMessage;
  };
  /**
   * 渲染列表项的函数。
   */
  renderItems?: {
    [role: RenderRole]: RenderItem;
  };
  /**
   * 渲染消息的函数。
   */
  renderMessages?: {
    [role: RenderRole]: RenderMessage;
  };
  /**
   * 渲染消息额外内容的函数。
   */
  renderMessagesExtra?: {
    [role: RenderRole]: RenderMessageExtra;
  };
  /**
   * 聊天列表的类型。
   * @default 'chat'
   */
  type?: 'docs' | 'chat';
  /**
   * 聊天项的类名。
   * @default ''
   */
  chatItemClassName?: string;
  /**
   * 聊天项的渲染函数。
   */
  chatItemRenderConfig?: ChatItemProps['chatItemRenderConfig'];
  /**
   * 原始数据。
   */
  originData?: ChatItemProps<T>['originData'];
}

/**
 * 聊天列表项的属性。
 * @template T 聊天列表项的额外数据类型。
 */
export type ChatListItemProps<T = Record<string, any>> = ChatMessage & ListItemProps<T>;

/**
 * 聊天列表项组件。
 * @param props 组件属性。
 * @returns 聊天列表项组件。
 */
const ChatListItem = (props: ChatListItemProps) => {
  const {
    renderMessagesExtra,
    onActionsClick,
    onMessageChange,
    originData,
    type,
    renderMessages,
    renderErrorMessages,
    renderActions,
    loading,
    groupNav,
    renderItems,
    chatItemRenderConfig,
    chatItemClassName,
    ...item
  } = props;

  const [editing, setEditing] = useState(false);

  /**
   * 渲染列表项的函数。
   * @returns 渲染列表项的函数。
   */
  const RenderItem = useMemo(() => {
    if (!renderItems || !item?.role) return;
    let renderFunction;
    if (renderItems?.[item.role]) renderFunction = renderItems[item.role];
    if (!renderFunction && renderItems?.['default']) renderFunction = renderItems['default'];
    if (!renderFunction) return;
    return renderFunction;
  }, [renderItems?.[item.role]]);

  /**
   * 渲染消息的函数。
   * @param editableContent 可编辑的内容。
   * @param data 聊天消息的数据。
   * @returns 渲染消息的组件。
   */
  const RenderMessage = useRefFunction(
    ({ editableContent, data }: { data: ChatMessage; editableContent: ReactNode }) => {
      if (!renderMessages || !item?.role) return;
      let RenderFunction;
      if (renderMessages?.[item.role]) RenderFunction = renderMessages[item.role];
      if (!RenderFunction && renderMessages?.['default'])
        RenderFunction = renderMessages['default'];
      if (!RenderFunction) return;
      return <RenderFunction {...data} editableContent={editableContent} />;
    },
  );

  /**
   * 渲染消息额外内容的函数。
   * @param data 聊天消息的数据。
   * @returns 渲染消息额外内容的组件。
   */
  const MessageExtra = useRefFunction(({ data }: { data: ChatMessage }) => {
    if (!renderMessagesExtra || !item?.role) return;
    let RenderFunction;
    if (renderMessagesExtra?.[item.role]) RenderFunction = renderMessagesExtra[item.role];
    if (renderMessagesExtra?.['default']) RenderFunction = renderMessagesExtra['default'];
    if (!RenderFunction && !RenderFunction) return;

    return <RenderFunction {...data} />;
  });

  /**
   * 渲染错误消息的函数。
   * @param data 聊天消息的数据。
   * @returns 渲染错误消息的组件。
   */
  const ErrorMessage = useRefFunction(({ data }: { data: ChatMessage }) => {
    if (!renderErrorMessages || !item?.error?.type) return;
    let RenderFunction;
    if (renderErrorMessages?.[item.error.type])
      RenderFunction = renderErrorMessages[item.error.type];
    if (!RenderFunction && renderErrorMessages?.['default'])
      RenderFunction = renderErrorMessages['default'];
    if (!RenderFunction) return;
    return <RenderFunction {...data} />;
  });

  /**
   * 渲染操作按钮的函数。
   * @param data 聊天消息的数据。
   * @returns 渲染操作按钮的组件。
   */
  const Actions = useRefFunction(({ data }: { data: ChatMessage }) => {
    if (!renderActions || !item?.role) return;
    let RenderFunction;
    if (renderActions?.[item.role]) RenderFunction = renderActions[item.role];
    if (renderActions?.['default']) RenderFunction = renderActions['default'];

    const handleActionClick: ListItemProps['onActionsClick'] = (action, data) => {
      switch (action.key) {
        case 'copy': {
          copy(data.content as string);
          break;
        }
        case 'edit': {
          setEditing(true);
        }
      }

      onActionsClick?.(action, data);
    };

    return (
      <RenderFunction
        {...data}
        onActionClick={(actionKey) => handleActionClick?.(actionKey, data)}
      />
    );
  });

  /**
   * 错误信息。
   * @returns 错误信息对象。
   */
  const error = useMemo(() => {
    if (!item.error) return;
    return {
      message: item.error?.message,
    };
  }, [item.error]);

  /**
   * @description memoize the chat item
   */
  const memoItem = useMemo(() => {
    const dom = (
      <ChatItem
        className={chatItemClassName}
        data-id={item.id}
        actions={<Actions data={item} />}
        avatar={(item as any).meta}
        avatarAddon={groupNav}
        editing={editing}
        originData={originData}
        error={error}
        errorMessage={<ErrorMessage data={item} />}
        loading={loading}
        message={item.content}
        messageExtra={<MessageExtra data={item} />}
        onChange={(value) => onMessageChange?.(item.id, value)}
        onDoubleClick={(e) => {
          if (item.id === 'default' || item.error) return;
          if (item.role && ['assistant', 'user'].includes(item.role) && e.altKey) {
            setEditing(true);
          }
        }}
        onEditingChange={setEditing}
        placement={type === 'chat' ? (item.role === 'user' ? 'right' : 'left') : 'left'}
        primary={item.role === 'user'}
        renderMessage={(editableContent) => (
          <RenderMessage data={item} editableContent={editableContent} />
        )}
        time={item.updateAt || item.createAt}
        type={type === 'chat' ? 'block' : 'pure'}
        chatItemRenderConfig={chatItemRenderConfig}
      />
    );
    return dom;
  }, [
    props.content,
    props.loading,
    props.id,
    (item as any).meta,
    item.updateAt || item.createAt,
    editing,
  ]);

  if (RenderItem) return <RenderItem key={item.id} {...props} />;

  return memoItem;
};

export default ChatListItem;
