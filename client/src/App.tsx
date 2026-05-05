import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MonteCarloChart from "@/components/MonteCarloChart";
import NotFound from "@/pages/not-found";
import IntakePage from "@/pages/intake";
import ReportPage from "@/pages/report";
import AdminPage from "@/pages/admin";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={IntakePage} />
      <Route path="/report/:runId" component={ReportPage} />
      <Route path="/admin" component={AdminPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <MonteCarloChart />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
