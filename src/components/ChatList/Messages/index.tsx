import { memo } from 'react';

import { LOADING_FLAT } from '@/const/message';
import { Collapse, Divider, Typography } from 'antd';
import ReactMarkdown from 'react-markdown';
import BubblesLoading from '../Loading';
import { useStyles } from './style';

const MemoHr = memo((props) => (
  <Divider style={{ marginBottom: '1em', marginTop: 0 }} {...props} />
));
const MemoDetails = memo((props) => <Collapse style={{ marginBottom: '1em' }} {...props} />);
const MemoImage = memo((props) => <img {...props} />);
const MemoAlink = memo((props) => <Typography.Link {...props} />);

/**
 * 自定义组件
 * https://github.com/remarkjs/react-markdown
 */
const components: any = {
  details: MemoDetails,
  hr: MemoHr,
  a: MemoAlink,
  img: MemoImage,
  // pre: Code,
};

/**
 * 聊天内容组件
 * 等待时展示loading
 * 如果内部不是 string 类型，直接展示
 * 否则展示 markdown
 */
export const MessageComponent: React.FC<{
  content: string | React.ReactNode;
}> = memo(({ content }) => {
  const { styles } = useStyles();
  if (content === LOADING_FLAT) return <BubblesLoading />;
  if (typeof content !== 'string') return content;
  return (
    <Typography>
      <ReactMarkdown className={styles.markdown} components={components}>
        {content}
      </ReactMarkdown>
    </Typography>
  );
});
