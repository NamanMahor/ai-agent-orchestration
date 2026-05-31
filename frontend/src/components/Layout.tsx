import { Link } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function Layout({
  children,
}: Props) {

  return (

    <div className="flex h-screen">

      <aside className="w-64 border-r bg-gray-50 p-4">

        <h1 className="text-2xl font-bold mb-8">
          AI Platform
        </h1>

        <nav className="flex flex-col gap-3">

          <Link
            to="/"
            className="hover:text-blue-500"
          >
            Dashboard
          </Link>

          <Link
            to="/agents"
            className="hover:text-blue-500"
          >
            Agents
          </Link>

          <Link
            to="/workflows"
            className="hover:text-blue-500"
          >
            Workflows
          </Link>

        </nav>

      </aside>

      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>

    </div>
  );
}
