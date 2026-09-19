import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { getHealth } from '../../api/api';
import ApixAssistant from '../assistant/ApixAssistant';

export default function Layout() {
  const [open,setOpen]=useState(false);
  const [online,setOnline]=useState(false);
  const [updated,setUpdated]=useState<string>();

  useEffect(()=>{
    const check=()=>getHealth()
      .then(h=>{
        setOnline(h.status==='ok'&&h.database==='ok');
        setUpdated(h.database_time);
      })
      .catch(()=>setOnline(false));

    check();
    const id=window.setInterval(check,30000);
    return ()=>window.clearInterval(id);
  },[]);

  return <div className="flex h-screen overflow-hidden bg-[#F5F7F8]">
    <Sidebar open={open} onClose={()=>setOpen(false)}/>
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      <TopBar onMenuClick={()=>setOpen(true)} lastUpdated={updated} pipelineOnline={online}/>
      <main className="flex-1 overflow-y-auto"><Outlet/></main>
      <ApixAssistant />
    </div>
  </div>;
}
