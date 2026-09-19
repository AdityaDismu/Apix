from datetime import datetime
from index_engine.basket import build_snapshot_indices

def row(fid,ts,fare): return ('00000000-0000-0000-0000-00000000000'+fid,datetime.fromisoformat(ts),'DEL','BOM',datetime(2026,10,1).date(),21,'Airline',None,'10:00','12:00',120,fare,'INR',fid)
def test_base_and_change():
    rows=[row(str(i),'2026-09-16T01:00:00+05:30',1000+i*10) for i in range(3)]+[row(str(i),'2026-09-16T02:00:00+05:30',1100+i*10) for i in range(3)]
    out=build_snapshot_indices(rows); assert len(out)==2; assert out[0]['index']==100; assert out[1]['index']>100; assert out[1]['matched_observations']==3
