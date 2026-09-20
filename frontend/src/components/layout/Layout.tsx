import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { getHealth } from '../../api/api';
import ApixAssistant from '../assistant/ApixAssistant';

export default function Layout() {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(false);
  const [updated, setUpdated] = useState<string>();
  const location = useLocation();

  useEffect(() => {
    const check = () => getHealth()
      .then((h) => {
        setOnline(h.status === 'ok' && h.database === 'ok');
        setUpdated(h.database_time);
      })
      .catch(() => setOnline(false));

    check();
    const id = window.setInterval(check, 30000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell flex min-h-screen overflow-hidden bg-[#EEEAE3] text-[#30313A]">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setOpen(true)} lastUpdated={updated} pipelineOnline={online} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
        <ApixAssistant />
      </div>
    </div>
  );
}
