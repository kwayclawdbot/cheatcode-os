// CheatCode OS — App Router
// All platform surfaces wired up with wouter routing

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";
import { syncCreatorRegistry } from "./lib/creatorRegistry";

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
import OnboardingPage from "./pages/OnboardingPage";
import FeedPage from "./pages/FeedPage";
import TraderProfilePage from "./pages/TraderProfilePage";
import JournalPage from "./pages/JournalPage";
import AdminDashboard from "./pages/AdminDashboard";
import CoachApplyPage from "./pages/CoachApplyPage";
import CoachDashboard from "./pages/CoachDashboard";
import CoachesCornerPage from "./pages/CoachesCornerPage";
import CoachProfilePage from "./pages/CoachProfilePage";

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

      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />

      {/* Coach */}
      <Route path="/coach/apply" component={CoachApplyPage} />
      <Route path="/coach/dashboard" component={CoachDashboard} />
      <Route path="/coaches-corner" component={CoachesCornerPage} />
      <Route path="/coaches-corner/:id" component={CoachProfilePage} />

      {/* Social + Journal */}
      <Route path="/feed" component={FeedPage} />
      <Route path="/journal" component={JournalPage} />
      <Route path="/traders/:handle" component={TraderProfilePage} />
      <Route path="/onboarding" component={OnboardingPage} />

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
  useEffect(() => {
    // Sync creator registry on mount — merges API creators with mock data
    // and auto-generates profiles for new creators from the curation pipeline
    syncCreatorRegistry().catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
