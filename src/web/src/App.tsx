import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAccount } from "./lib/account.js";
import { Layout } from "./layout/Layout.js";
import { WelcomePage } from "./pages/WelcomePage.js";
import { BrowsePage } from "./pages/BrowsePage.js";
import { SectionDetailPage } from "./pages/SectionDetailPage.js";
import { HouseholdPage } from "./pages/HouseholdPage.js";

function RequireAccount({ children }: { children: ReactNode }) {
  const { accountId } = useAccount();
  if (accountId === null) return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/welcome" element={<WelcomePage />} />
      <Route
        path="/"
        element={
          <RequireAccount>
            <Layout />
          </RequireAccount>
        }
      >
        <Route index element={<BrowsePage />} />
        <Route path="sections/:id" element={<SectionDetailPage />} />
        <Route path="household" element={<HouseholdPage />} />
      </Route>
    </Routes>
  );
}
