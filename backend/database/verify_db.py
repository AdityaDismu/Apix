from database.db import get_connection, test_connection


def main():
    print("=" * 70)
    print("APIx DATABASE VERIFICATION")
    print("=" * 70)

    # ----------------------------------------------------------
    # Test database connection
    # ----------------------------------------------------------
    try:
        database_time = test_connection()
        print(f"Database time       : {database_time}")
    except Exception as error:
        print(f"Database connection failed: {error}")
        return

    with get_connection() as connection:
        with connection.cursor() as cursor:

            # ------------------------------------------------------
            # Overall counts
            # ------------------------------------------------------
            cursor.execute("SELECT COUNT(*) FROM collection_runs;")
            collection_runs = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM airfare_observations;")
            observations = cursor.fetchone()[0]

            print(f"Collection runs     : {collection_runs}")
            print(f"Observations        : {observations}")

            # ------------------------------------------------------
            # Quality status
            # ------------------------------------------------------
            print()
            print("Quality")
            print("-------")

            cursor.execute("""
                SELECT quality_status, COUNT(*)
                FROM airfare_observations
                GROUP BY quality_status
                ORDER BY quality_status;
            """)

            quality_rows = cursor.fetchall()

            if quality_rows:
                for status, count in quality_rows:
                    print(f"{status:<15}: {count}")
            else:
                print("No observations yet.")

            # ------------------------------------------------------
            # Route / Advance Windows
            # ------------------------------------------------------
            print()
            print("Route / Advance Windows")
            print("-----------------------")

            cursor.execute("""
                SELECT
                    origin,
                    destination,
                    advance_days,
                    COUNT(*)
                FROM airfare_observations
                GROUP BY origin, destination, advance_days
                ORDER BY origin, destination, advance_days;
            """)

            route_rows = cursor.fetchall()

            if route_rows:
                for origin, destination, advance_days, count in route_rows:
                    print(
                        f"{origin}-{destination} "
                        f"T+{advance_days:<2} : {count}"
                    )
            else:
                print("No observations yet.")

            # ------------------------------------------------------
            # Fare Statistics
            # ------------------------------------------------------
            print()
            print("Fare Statistics")
            print("---------------")

            cursor.execute("""
                SELECT
                    MIN(total_fare),
                    MAX(total_fare),
                    AVG(total_fare)
                FROM airfare_observations;
            """)

            fare_stats = cursor.fetchone()
            minimum, maximum, average = fare_stats

            if minimum is None:
                print("No airfare observations in database yet.")
            else:
                print(f"Minimum : ₹{minimum:.2f}")
                print(f"Maximum : ₹{maximum:.2f}")
                print(f"Average : ₹{average:.2f}")

    print()
    print("Status: SUCCESS")


if __name__ == "__main__":
    main()