import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { Layout } from "./components/Layout";
import { isContractConfigured } from "./lib/contract";
import { CreateElectionPage } from "./pages/CreateElectionPage";
import { ElectionPage } from "./pages/ElectionPage";
import { ElectionsPage } from "./pages/ElectionsPage";
import { MyVotesPage } from "./pages/MyVotesPage";
import { WalletProvider } from "./wallet/WalletProvider";
import "./styles.css";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 3_000 } } });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isContractConfigured ? (
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<ElectionsPage />} />
                <Route path="elections/:id" element={<ElectionPage />} />
                <Route path="admin/new" element={<CreateElectionPage />} />
                <Route path="me" element={<MyVotesPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </WalletProvider>
      </QueryClientProvider>
    ) : (
      <main className="app">
        <h1>🗳️ Voting DApp</h1>
        <p className="error">
          No contract address yet. Deploy the contract (<code>npm run deploy:sepolia</code>), run <code>npm run export</code>, then restart the frontend.
        </p>
      </main>
    )}
  </StrictMode>,
);
