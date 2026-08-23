import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import CitizenIntake from "./pages/CitizenIntake";
import CitizenConfirmation from "./pages/CitizenConfirmation";
import ComplaintReview from "./pages/ComplaintReview";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";
import OfficerQueue from "./pages/OfficerQueue";
import AdminDashboard from "./pages/AdminDashboard";
import ResetPassword from "./pages/ResetPassword";

function Router() {
  return <Switch><Route path="/" component={Home} /><Route path="/intake" component={CitizenIntake} /><Route path="/confirm/:publicId" component={CitizenConfirmation} /><Route path="/officer" component={OfficerQueue} /><Route path="/officer/:publicId" component={ComplaintReview} /><Route path="/admin" component={AdminDashboard} /><Route path="/reset-password" component={ResetPassword} /><Route path="/404" component={NotFound} /><Route component={NotFound} /></Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster position="top-right" richColors /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
