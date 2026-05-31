import {
  Routes,
  Route,
} from "react-router-dom";

import Layout from "./components/Layout";

import DashboardPage from "./pages/DashboardPage";
import AgentsPage from "./pages/AgentsPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import WorkflowRunPage from "./pages/WorkflowRunPage";

export default function App() {

  return (

    <Layout>

      <Routes>

        <Route
          path="/"
          element={<DashboardPage />}
        />

        <Route
          path="/agents"
          element={<AgentsPage />}
        />

        <Route
          path="/workflows"
          element={<WorkflowsPage />}
        />

        <Route
          path="/runs/:runId"
          element={<WorkflowRunPage />}
        />

      </Routes>

    </Layout>
  );
}

