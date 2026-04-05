// CheatCode OS — App Router
// All platform surfaces wired up with wouter routing

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

// Pages
import Home from "./pages/Home";
import VideoPage from "./pages/VideoPage";
import IntelligencePage from "./pages/IntelligencePage";
import TopicsPage from "./pages/TopicsPage";
import LearnPage from "./pages/LearnPage";
import NewsletterPage from "./pages/NewsletterPage";
import PricingPage from "./pages/PricingPage";
import CreatorPage from "./pages/CreatorPage";
import TerminalPage from "./pages/TerminalPage";

function Router() {
  return (
    <Switch>
      {/* Core pages */}
      <Route path="/" component={Home} />
      <Route path="/intelligence" component={IntelligencePage} />
      <Route path="/topics" component={TopicsPage} />
      <Route path="/learn" component={LearnPage} />
      <Route path="/newsletter" component={NewsletterPage} />
      <Route path="/pricing" component={PricingPage} />

      {/* Terminal */}
      <Route path="/terminal" component={TerminalPage} />

      {/* Content detail pages */}
      <Route path="/video/:id" component={VideoPage} />
      <Route path="/podcast/:id" component={VideoPage} />

      {/* Placeholder routes — show toast on nav */}
      <Route path="/topics/:id" component={TopicsPage} />
      <Route path="/creators" component={TopicsPage} />
      <Route path="/creators/:id" component={CreatorPage} />
      <Route path="/themes/:id" component={TopicsPage} />
      <Route path="/podcasts" component={Home} />

      {/* Fallback */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
