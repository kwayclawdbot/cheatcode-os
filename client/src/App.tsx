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
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useEffect } from "react";
import { syncCreatorRegistry } from "./lib/creatorRegistry";
import { AuthProvider } from "./contexts/AuthContext";
import { AssetClassProvider } from "./contexts/AssetClassContext";
import { WatchlistProvider } from "./contexts/WatchlistContext";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthPage from "./pages/AuthPage";
import MagicClaimPage from "./pages/MagicClaimPage";
import { useAuth } from "@/hooks/useAuth";
import { fetchMyProfile } from "@/lib/api";
import { useApi } from "@/hooks/useApi";

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
import AdminIngestPage from "./pages/AdminIngestPage";
import CoachApplyPage from "./pages/CoachApplyPage";
import CoachDashboard from "./pages/CoachDashboard";
import CoachesCornerPage from "./pages/CoachesCornerPage";
import CoachProfilePage from "./pages/CoachProfilePage";
import DiscoverPage from "./pages/DiscoverPage";
import KaiAssistPage from "./pages/KaiAssistPage";
import KaiPage from "./pages/KaiPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import BeatKaiPage from "./pages/BeatKaiPage";
import YouTubeUniversityPage from "./pages/YouTubeUniversityPage";
import TickerPage from "./pages/TickerPage";
import TickerAnalyzePage from "./pages/TickerAnalyzePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SuccessPage from "./pages/SuccessPage";
/**
 * Redirect new authenticated users to onboarding if they haven't completed it.
 * Source of truth: profiles.onboarding_complete in Supabase (via /profile/me).
 * localStorage is used as a fast cache to avoid a network hit on every render —
 * but the server value always wins on first load after login.
 */
function NewUserRedirect() {
  const { isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();

  // Skip fetching on non-authenticated routes to avoid unnecessary API calls
  const skip = !isAuthenticated || loading || location.startsWith("/auth") || location === "/onboarding" || location.startsWith("/m/");
  const { data: profile, loading: profileLoading } = useApi<any>(
    () => (skip ? Promise.resolve(null) : fetchMyProfile()),
    null,
    [skip],
  );

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (location.startsWith("/auth") || location === "/onboarding" || location.startsWith("/m/")) return;
    if (profileLoading || skip) return;

    // Server is the source of truth — onboarding_complete from Supabase profiles table
    if (profile?.onboarding_complete === true) {
      // Cache in localStorage so subsequent navigations don't need a fetch
      localStorage.setItem("cc-onboarding-complete", "true");
      return;
    }

    // Fast path: already cached from a previous session on this device
    const cached = localStorage.getItem("cc-onboarding-complete");
    if (cached) return;

    // Profile loaded and onboarding_complete is false/null — send to onboarding
    if (profile !== null) {
      navigate("/onboarding");
    }
  }, [isAuthenticated, loading, location, navigate, profile, profileLoading, skip]);

  return null;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <>
      <NewUserRedirect />
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
      <Route path="/success" component={SuccessPage} />

      {/* ── Terminal ── */}
      <Route path="/terminal" component={TerminalPage} />

      {/* ── Content detail pages ── */}
      <Route path="/video/:id" component={VideoPage} />
      <Route path="/podcast/:id" component={VideoPage} />

      {/* ── Admin ── */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/ingest" component={AdminIngestPage} />

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
      {/* ── K.AI Module — /kai dashboard (Today, Ticker, History, Settings) ── */}
      {/* Sub-routes are matched inside KaiPage so the shell + entitlement gate
          render once and child routes only swap the main pane. */}
      <Route path="/kai" component={KaiPage} />
      <Route path="/kai/history" component={KaiPage} />
      <Route path="/kai/settings" component={KaiPage} />
      <Route path="/kai/t/:symbol" component={KaiPage} />
      {/* /kai/chat repurposes the existing KaiAssistPage chat UI. The legacy
          /assist URL stays alive for backwards compatibility. */}
      <Route path="/kai/chat" component={KaiAssistPage} />
      <Route path="/assist" component={KaiAssistPage} />
      <Route path="/leaderboard/beat-kai" component={BeatKaiPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/learn/university" component={YouTubeUniversityPage} />
      <Route path="/tickers/:symbol/analyze" component={TickerAnalyzePage} />
      <Route path="/tickers/:symbol" component={TickerPage} />

      {/* ── Auth ── */}
      <Route path="/auth" component={AuthPage} />
      <Route path="/auth/callback" component={AuthCallbackPage} />
      <Route path="/auth/reset-password" component={ResetPasswordPage} />
      <Route path="/m/:token" component={MagicClaimPage} />

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
    </>
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
          <AssetClassProvider>
            <WatchlistProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
            </WatchlistProvider>
          </AssetClassProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
