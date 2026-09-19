import argparse, json
from backtesting.runner import run_backtest

if __name__ == "__main__":
    p=argparse.ArgumentParser(description="Run APIx against an independent DGCA reference fare file.")
    p.add_argument("--input",required=True)
    args=p.parse_args()
    print(json.dumps(run_backtest(args.input),indent=2,default=str))
