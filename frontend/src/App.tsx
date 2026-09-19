import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import RouteExplorer from './pages/RouteExplorer';
import DataQuality from './pages/DataQuality';
import Pipeline from './pages/Pipeline';
import Methodology from './pages/Methodology';
import SystemStatus from './pages/SystemStatus';
import LandingPage from './pages/LandingPage';
import Backtesting from './pages/Backtesting';
import Analytics from './pages/Analytics';

export default function App() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="routes" element={<RouteExplorer />} />
        <Route path="quality" element={<DataQuality />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="backtesting" element={<Backtesting />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="methodology" element={<Methodology />} />
        <Route path="system" element={<SystemStatus />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  </BrowserRouter>;
}
