import argparse
from data_sources.route_weights import import_route_basket

if __name__ == "__main__":
    p=argparse.ArgumentParser(description="Load a legitimately obtained DGCA route/passenger reference file.")
    p.add_argument("--input",required=True)
    args=p.parse_args()
    print(f"Imported {import_route_basket(args.input)} DGCA route rows.")
