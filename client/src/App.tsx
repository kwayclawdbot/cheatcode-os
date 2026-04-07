// CheatCode OS — App Router
// All platform surfaces wired up with wouter routing
// Route structure:
//   /           → Landing page (public, unauthenticated)
//   /home       → Logged-in home (long-form content dashboard)
//   /feed       → Swipe Feed (TikTok/Tinder-style)
//   /community  → Community (threaded posts, reactions)
//   /intelligence → Kai ticker signals
//   /topics     → Browse content
//   /learn      → Learning + Coaches Corner
//   /coaches-corner → Coach directory
//   /admin      → Admin dashboard

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";
import { syncCreatorRegistry } from "./lib/creatorRegistry";
import { AuthProvider } from "./contexts/AuthContext";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthPage from "./pages/AuthPage";

// Pages
import LandingPage from "./pages/LandingPage";
import Home from "./pages/Home";
import SwipeFeedPage from "./pages/SwipeFeedPage";
import CommunityPage from "./pages/CommunityPage";
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
import DiscoverPage from "./pages/DiscoverPage";
import KaiAssistPage from "./pages/KaiAssistPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import YouTubeUniversityPage from "./pages/YouTubeUniversityPage";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      {/* ── Public landing page ── */}
      <Route path="/1" component={LandingPage} />

      {/* ── Core app pages ── */}
      <Route path="/" component={Home} />
      <Route path="/home" component={Home} />
      <Route path="/feed" component={SwipeFeedPage} />
      <Route path="/community" component={CommunityPage} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/intelligence" component={IntelligencePage} />
      <Route path="/topics" component={TopicsPage} />
      <Route path="/learn" component={LearnPage} />
      <Route path="/newsletter" component={NewsletterPage} />
      <Route path="/pricing" component={PricingPage} />

      {/* ── Terminal ── */}
      <Route path="/terminal" component={TerminalPage} />

      {/* ── Content detail pages ── */}
      <Route path="/video/:id" component={VideoPage} />
      <Route path="/podcast/:id" component={VideoPage} />

      {/* ── Admin ── */}
      <Route path="/admin" component={AdminDashboard} />

      {/* ── Coach system ── */}
      <Route path="/coach/apply" component={CoachApplyPage} />
      <Route path="/coach/dashboard" component={CoachDashboard} />
      <Route path="/coaches-corner" component={CoachesCornerPage} />
      <Route path="/coaches-corner/:id" component={CoachProfilePage} />

      {/* ── Social + Journal ── */}
      <Route path="/journal" component={JournalPage} />
      <Route path="/traders/:handle" component={TraderProfilePage} />
      <Route path="/onboarding" component={OnboardingPage} />

      {/* ── Legacy feed route → redirect to swipe feed ── */}
      <Route path="/social-feed" component={FeedPage} />
      <Route path="/assist" component={KaiAssistPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/learn/university" component={YouTubeUniversityPage} />

      {/* ── Auth ── */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />

      {/* ── Creator / topic routes ── */}
      <Route path="/topics/:id" component={TopicsPage} />
      <Route path="/creators" component={TopicsPage} />
      <Route path="/creators/:id" component={CreatorPage} />
      <Route path="/themes/:id" component={TopicsPage} />
      <Route path="/podcasts" component={Home} />

      {/* ── Fallback ── */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    syncCreatorRegistry().catch(() => {});
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
