import logging
from apscheduler.schedulers.blocking import BlockingScheduler
from index_engine.config import COLLECTION_INTERVAL_MINUTES
from index_engine.realtime_pipeline import run_pipeline
logging.basicConfig(level=logging.INFO,format='%(asctime)s | %(levelname)s | %(message)s')
log=logging.getLogger('apix.scheduler')
def job():
    try:
        result=run_pipeline(); log.info('Pipeline %s completed: %s',result['pipeline_run_id'],result['status'])
    except Exception: log.exception('Pipeline failed')
def main():
    scheduler=BlockingScheduler(); job(); scheduler.add_job(job,'interval',minutes=COLLECTION_INTERVAL_MINUTES,id='airfare_collection',max_instances=1,coalesce=True,misfire_grace_time=300); log.info('APIx scheduler running every %s minutes',COLLECTION_INTERVAL_MINUTES)
    try: scheduler.start()
    except KeyboardInterrupt: scheduler.shutdown(wait=False); log.info('Scheduler stopped')
if __name__=='__main__': main()
