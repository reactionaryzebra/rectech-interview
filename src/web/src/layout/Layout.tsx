import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "../lib/account.js";
import { getAccount } from "../lib/api.js";

export function Layout() {
  const { accountId, clearAccountId } = useAccount();
  const { data: account } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => getAccount(accountId!),
    enabled: accountId !== null,
  });

  return (
    <div>
      <header>
        <nav>
          <NavLink to="/" end>
            Browse
          </NavLink>{" "}
          <NavLink to="/household">Household</NavLink>
        </nav>
        <div>
          {account && <span>{account.email}</span>}{" "}
          <button type="button" onClick={clearAccountId}>
            Switch household
          </button>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
