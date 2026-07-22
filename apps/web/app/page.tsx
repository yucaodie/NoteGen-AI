import Link from 'next/link';

const pillars = [
  ['用户管理', '邮箱注册登录、会话恢复和默认工作区初始化'],
  ['云端知识库', '知识库、目录和 Markdown 笔记通过 API 持久化'],
  ['同步与 RAG', '增量同步、权限过滤检索和开发者 API Key'],
];

const stack = ['Next.js Frontend', 'Node.js API Service', 'Supabase', 'pgvector'];

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="workspace-layout hero-card">
        <div className="hero-grid">
          <div>
            <p className="eyebrow">SupaNoteGen Web Platform</p>
            <h1 className="hero-title">把 NoteGen 的内容体验升级为云端知识产品</h1>
            <p className="hero-copy">
              浏览器端承载 NoteGen 风格的知识工作区，Node.js API 负责业务编排，Supabase 提供认证、RLS 数据隔离和 pgvector 检索底座。
            </p>
            <div className="cta-row">
              <Link className="primary-button" href="/auth">
                登录云端工作区
              </Link>
              <Link className="primary-button" href="/core/main">
                进入工作区
              </Link>
              <Link className="secondary-button" href="/developers">
                查看开放接口方向
              </Link>
            </div>
          </div>
          <div className="panel-card">
            <h2 className="panel-title">阶段焦点</h2>
            <ul className="metric-list">
              {pillars.map(([label, detail]) => (
                <li className="metric-item" key={label}>
                  <strong>{label}</strong>
                  <span className="status-note">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <section className="workspace-layout panel-grid" aria-label="技术栈和交付方向">
        <article className="panel-card">
          <h2 className="panel-title">推荐技术栈</h2>
          <ul className="stack-list">
            {stack.map((item) => (
              <li className="stack-item" key={item}>
                <span>{item}</span>
                <span className="status-note">已接入当前应用</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="panel-card">
          <h2 className="panel-title">真实链路</h2>
          <p className="panel-copy">
            登录后进入云端工作区，所有知识库、文件夹、笔记、同步事件、共享关系和 RAG 访问都通过后端 API 与 Supabase 权限策略处理。
          </p>
        </article>
      </section>
    </main>
  );
}
