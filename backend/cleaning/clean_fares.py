import argparse
from pathlib import Path
import sys


# Allows this file to be executed directly from backend/cleaning/
BACKEND_DIR = Path(__file__).resolve().parent.parent

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from cleaning.cleaner import clean_file


def main():
    parser = argparse.ArgumentParser(
        description="Clean and normalize APIx airfare data."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="Path to raw JSON file.",
    )

    parser.add_argument(
        "--output",
        required=False,
        help="Path for cleaned JSON file.",
    )

    args = parser.parse_args()

    input_path = Path(args.input)

    if not input_path.exists():
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    if args.output:
        output_path = Path(args.output)
    else:
        output_path = (
            input_path.parent.parent
            / "clean"
            / f"{input_path.stem}_clean.json"
        )

    try:
        result = clean_file(
            input_path=input_path,
            output_path=output_path,
        )

    except Exception as error:
        print(f"ERROR: Cleaning failed: {error}")
        sys.exit(1)

    stats = result["statistics"]

    print()
    print("=" * 70)
    print("APIx FARE CLEANING")
    print("=" * 70)

    print(f"Input      : {input_path.resolve()}")
    print(f"Output     : {output_path.resolve()}")
    print()

    print(f"Raw        : {stats['raw_records']}")
    print(f"Valid      : {stats['valid_before_dedup']}")
    print(f"Duplicates : {stats['duplicates']}")
    print(f"Rejected   : {stats['rejected']}")
    print(f"Clean      : {stats['clean_records']}")
    print(f"Outliers   : {stats['outliers_flagged']}")
    print()

    print("Standard Product")
    print("----------------")
    print("Passenger  : Adult")
    print("Trip       : One-way")
    print("Class      : Economy")
    print("Stops      : Non-stop")
    print("Currency   : INR")
    print()

    print("Quality")
    print("-------")

    status_counts = {}

    for observation in result["observations"]:
        status = observation["quality_status"]
        status_counts[status] = status_counts.get(status, 0) + 1

    for status, count in sorted(status_counts.items()):
        print(f"{status:10}: {count}")

    print()

    print(f"Status     : {result['status']}")
    print()

    print(f"Saved: {output_path.resolve()}")
    print("=" * 70)


if __name__ == "__main__":
    main()