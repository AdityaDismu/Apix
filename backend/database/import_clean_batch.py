import json
from pathlib import Path

from database.import_clean import import_clean_file


CLEAN_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "clean"


def main():
    files = sorted(CLEAN_DIR.glob("*_clean.json"))

    successful_files = []

    for file_path in files:
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))

            if data.get("status") == "success":
                successful_files.append(file_path)

        except Exception as exc:
            print(f"SKIP INVALID JSON: {file_path.name} | {exc}")

    print(f"Successful clean files found: {len(successful_files)}")
    print()

    imported_files = 0
    total_observations = 0
    failed_files = 0

    for index, file_path in enumerate(successful_files, start=1):
        try:
            result = import_clean_file(file_path)

            imported_files += 1
            total_observations += result["observations_in_file"]

            print(
                f"[{index}/{len(successful_files)}] "
                f"{file_path.name} → "
                f"{result['observations_in_file']} observations"
            )

        except Exception as exc:
            failed_files += 1
            print(f"FAILED: {file_path.name}")
            print(f"ERROR: {exc}")
            break

    print()
    print("=" * 60)
    print("BATCH IMPORT SUMMARY")
    print("=" * 60)
    print(f"Files found       : {len(successful_files)}")
    print(f"Files imported    : {imported_files}")
    print(f"Observations      : {total_observations}")
    print(f"Failed files      : {failed_files}")

    if failed_files == 0:
        print("STATUS            : SUCCESS")
    else:
        print("STATUS            : FAILED")


if __name__ == "__main__":
    main()