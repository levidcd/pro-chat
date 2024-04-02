import { LOADING_FLAT } from '@/const/message';
import { DEFAULT_AVATAR, DEFAULT_USER_AVATAR } from '@/const/meta';
import { ChatMessage } from '@/types';
import { ModelConfig } from '@/types/config';
import { processSSE } from '@/utils/fetch';
import { useMergedState } from 'rc-util';
import React, { useEffect, useRef } from 'react';
import { useRefFunction } from './useRefFunction';

export const initialModelConfig: ModelConfig = {
  historyCount: 1,
  model: 'gpt-3.5-turbo',
  params: {
    frequency_penalty: 0,
    presence_penalty: 0,
    temperature: 0.6,
    top_p: 1,
  },
  systemRole: '',
};

export interface ProChatMetaData {
  /**
   * 角色头像
   * @description 可选参数，如果不传则使用默认头像
   */
  avatar?: string;
  /**
   *  背景色
   * @description 可选参数，如果不传则使用默认背景色
   */
  backgroundColor?: string;
  /**
   * 名称
   * @description 可选参数，如果不传则使用默认名称
   */
  title?: string;

  /**
   * 附加数据
   * @description 可选参数，如果不传则使用默认名称
   */
  [key: string]: any;
}

export type ProChatUserProfile = {
  user: ProChatMetaData;
  assistant: ProChatMetaData;
};

export const initialState = {
  userProfile: {
    user: {
      avatar: DEFAULT_USER_AVATAR,
    },
    assistant: {
      avatar: DEFAULT_AVATAR,
    },
  },
  config: initialModelConfig,
};

export const useChatList = (props: {
  initialChatList: ChatMessage<any>[];
  chatList: ChatMessage<any>[];
  loading: boolean;
  helloMessage?: React.ReactNode;
  userProfile: ProChatUserProfile;
  onChatsChange?: (chatList: ChatMessage<any>[]) => void;
  request?: () => Promise<ChatMessage<any>[]>;
  sendMessageRequest?: () => Promise<Response | ChatMessage<any>>;
  transformToChatMessage?: (
    preChatMessage: ChatMessage,
    currentContent: { preContent: React.ReactNode; currentContent: string },
  ) => Promise<ChatMessage<any>>;
}) => {
  /**
   * 取消请求控制器缓存
   */
  let controller = useRef<AbortController | null>(null);

  /**
   *  默认loading提示语
   */
  const [loadingMessage, setLoadingMessage] = useMergedState<ChatMessage<any> | undefined>(
    undefined,
  );

  /**
   * 获取loading提示语
   *
   */
  const getLoadingMessage = useRefFunction(() => {
    return loadingMessage;
  });

  /**
   * chatList状态保存
   */
  const [chatList, setChatList] = useMergedState<ChatMessage<any>[]>(
    [
      {
        id: crypto.randomUUID(),
        content: props.helloMessage,
        role: 'bot',
        createAt: Date.now(),
        updateAt: Date.now(),
        meta: props.userProfile?.assistant || initialState.userProfile.assistant,
      },
    ],
    {
      value: props.chatList,
      defaultValue: props.initialChatList,
      onChange: async (value) => {
        if (props?.onChatsChange) {
          await props?.onChatsChange(value);
        }
      },
    },
  );

  /**
   *  设置消息条目
   *
   */
  const setMessageItem = useRefFunction((id: string, content: ChatMessage<any>) => {
    const newChatList = chatList.map((item) => {
      /**
       *  TODO: 代码释义
       */
      if (item.id === id) {
        return {
          ...item,
          ...content,
        };
      }
      return item;
    });
    setChatList(newChatList);
  });

  /**
   *   loading状态
   *
   */
  const [loading, setLoading] = useMergedState<boolean>(true, {
    value: props.loading,
  });

  /**
   *  请求聊天列表
   */
  const fetchChatList = useRefFunction(async () => {
    if (!props.request) {
      setLoading(false);
      return;
    }
    controller.current = new AbortController();

    setLoading(true);
    try {
      const response = await props.request();
      setChatList(response);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  });

  /**
   *  清空聊天列表
   *
   */
  const clearMessage = useRefFunction(() => {
    setChatList([]);
  });

  /**
   *  发送消息
   *
   *
   */
  const sendMessage = useRefFunction(async (message: string) => {
    controller.current = new AbortController();
    setChatList((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        content: message,
        role: 'user',
        meta: props.userProfile?.user || initialState.userProfile.user,
        createAt: Date.now(),
        updateAt: Date.now(),
      },
    ]);

    if (!props?.sendMessageRequest) return;

    /**
     * 请求前，设置loading
     */
    setLoadingMessage({
      id: crypto.randomUUID(),
      role: 'bot',
      meta: props.userProfile?.assistant || initialState.userProfile.assistant,
      createAt: Date.now(),
      updateAt: Date.now(),
      content: LOADING_FLAT,
    } as ChatMessage<any>);

    /**
     * 自执行，以及取消请求
     */
    const res = (await Promise.race([
      props.sendMessageRequest?.(),
      new Promise((_, reject) => {
        controller.current.signal.addEventListener('abort', () => {
          reject();
        });
      }),
    ])) as Response | ChatMessage<any>;

    /**
     * 如果是请求回来的数据，开始解析数据
     */
    if (res instanceof Response) {
      processSSE(res, {
        signal: controller.current.signal,
        onFinish: async () => {
          setLoadingMessage(undefined);
        },
        onMessageHandle: async (text, res, type) => {
          /** 如果请求结束或者取消
           *  获取是否在loading,
           *  展示最新内容并且移除loading
           */
          if (type === 'done' || controller.current.signal.aborted) {
            const message = getLoadingMessage();
            if (!message) return;
            setChatList((prev) => {
              return [...prev, message];
            });
            setLoadingMessage(undefined);
            return;
          }
          /**
           * 如果还在loading，内容是loading_flat, 不展示，否则拼接展示
           */
          const content =
            getLoadingMessage()?.content === LOADING_FLAT
              ? ''
              : getLoadingMessage()?.content + text;
          const message = {
            ...getLoadingMessage(),
            updateAt: Date.now(),
            originContent: text,
            content: content,
          };
          /**
           * 转换消息loading状态
           */
          const transformMessage = await props.transformToChatMessage?.(message, {
            preContent:
              getLoadingMessage()?.content === LOADING_FLAT ? '' : getLoadingMessage()?.content,
            currentContent: text,
          });
          /**
           * 更新至loading状态
           */
          setLoadingMessage(transformMessage || message);
        },
        onErrorHandle: async (error) => {
          /**
           *  获取错误信息
           */
          const content = error.message;
          const message = await props.transformToChatMessage?.(
            {
              ...getLoadingMessage(),
              updateAt: Date.now(),
              content: content,
              originContent: content,
            },
            {
              preContent: getLoadingMessage()?.content,
              currentContent: content,
            },
          );
          setLoadingMessage(undefined);
          /**
           * 把出错的消息塞进去
           */
          setChatList((prev) => [...prev, message]);
        },
      });
    } else {
      /**
       * 被取消的消息。
       * 生成消息
       */
      const message = {
        ...getLoadingMessage(),
        updateAt: Date.now(),
        ...res,
      };

      const transformChatMessage = await props.transformToChatMessage?.(message, {
        preContent: getLoadingMessage()?.content,
        currentContent: message.originContent,
      });

      setLoadingMessage(undefined);
      setChatList((prev) => [...prev, transformChatMessage || message]);
    }
  });

  /**
   * 取消请求
   */
  const stopGenerateMessage = useRefFunction(() => {
    controller.current.abort?.();
  });

  useEffect(() => {
    /**
     * 获取消息列表
     */
    fetchChatList();
  }, []);

  return {
    chatList,
    loading,
    loadingMessage,
    stopGenerateMessage,
    setMessageItem,
    clearMessage,
    sendMessage,
  };
};
