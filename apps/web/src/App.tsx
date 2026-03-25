import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/theme";
import Home from "./pages/Home";
import Users from "./pages/Users";
import Requests from "./pages/Requests";
import Companies from "./pages/Companies";
import Integrations from "./pages/Integrations";
import DangerZone from "./pages/DangerZone";
import MissionControl from "./pages/MissionControl";
import Profile from "./pages/Profile";
import Permissions from "./pages/Permissions";
import SeedData from "./pages/SeedData";
import CoworkOverview from "./pages/CoworkOverview";
import CoworkStrategy from "./pages/CoworkStrategy";
import { CoworkPlaceholder } from "./pages/CoworkPlaceholder";
import CoworkUsers from "./pages/CoworkUsers";
import CoworkGroups from "./pages/CoworkGroups";
import CoworkMeetings from "./pages/CoworkMeetings";
import CoworkMeetingTypes from "./pages/CoworkMeetingTypes";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/workspace/users" element={<Users />} />
        <Route path="/workspace/requests" element={<Requests />} />
        <Route path="/workspace/companies" element={<Companies />} />
        <Route path="/workspace/setup" element={<Companies />} />
        <Route path="/workspace/permissions" element={<Permissions />} />
        <Route path="/workspace/integrations" element={<Integrations />} />
        <Route path="/workspace/seed-data" element={<SeedData />} />
        <Route path="/workspace/danger-zone" element={<DangerZone />} />
        <Route path="/workspace/functional/meeting-types" element={<CoworkMeetingTypes />} />
        <Route path="/mission-control" element={<MissionControl />} />
        <Route path="/cowork" element={<Navigate to="/cowork/overview" replace />} />
        <Route path="/cowork/overview" element={<CoworkOverview />} />
        <Route
          path="/cowork/metrics"
          element={
            <CoworkPlaceholder
              section="Metricas"
              title="Metricas"
              description="Esta area sera ligada no sprint seguinte ao modelo de metricas, series e tracking do tenant."
            />
          }
        />
        <Route
          path="/cowork/methods"
          element={
            <CoworkPlaceholder
              section="Metodos"
              title="Metodos"
              description="Esta area sera ligada no sprint seguinte ao modelo de metodos, sub-metodos e acoes da empresa."
            />
          }
        />
        <Route path="/cowork/support/strategy" element={<CoworkStrategy />} />
        <Route
          path="/cowork/support/groups"
          element={<CoworkGroups />}
        />
        <Route
          path="/cowork/support/users"
          element={<CoworkUsers />}
        />
        <Route
          path="/cowork/support/meetings"
          element={<CoworkMeetings />}
        />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </ThemeProvider>
  );
}
