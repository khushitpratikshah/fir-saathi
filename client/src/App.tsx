import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CitizenIntake from "./pages/CitizenIntake";
import CitizenConfirmation from "./pages/CitizenConfirmation";
import ComplaintReview from "./pages/ComplaintReview";
import Home from "./pages/Home";
import ImpactDemo from "./pages/ImpactDemo";
import NotFound from "./pages/NotFound";
import OfficerQueue from "./pages/OfficerQueue";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/impact-demo" component={ImpactDemo} /><Route path="/intake" component={CitizenIntake} /><Route path="/confirm/:publicId" component={CitizenConfirmation} /><Route path="/officer" component={OfficerQueue} /><Route path="/officer/:publicId" component={ComplaintReview} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster position="top-right" richColors /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
