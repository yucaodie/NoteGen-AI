import Link from 'next/link';

const pillars = [
  ['多用户隔离', 'Supabase Auth + RLS 作为最终授权层'],
  ['浏览器编辑', '草稿缓存和知识树交互优先'],
  ['开放接口', '知识库共享与 RAG API 并行推进'],
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
              当前仓库已经进入基础工程阶段。前端、独立 API 服务、Supabase 权限底座和 UI 验证基线会从这里开始建立。
            </p>
            <div className="cta-row">
              <Link className="primary-button" href="/workspace">
                进入工作区壳层
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
                <span className="status-note">已纳入当前规格</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="panel-card">
          <h2 className="panel-title">验证要求</h2>
          <p className="panel-copy">
            当前实施会优先建设 UI 点击路径验证，确保首页关键按钮与后续工作区入口具备可执行的回归测试。
          </p>
        </article>
      </section>
    </main>
  );
}
