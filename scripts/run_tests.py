"""
CryoNav Test Runner.
Executes all unit and contract tests in tests/ without requiring pytest installation.

Usage:
    PYTHONPATH=. python scripts/run_tests.py
"""
import unittest
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def run():
    loader = unittest.TestLoader()
    suite = loader.discover(start_dir=str(PROJECT_ROOT / "tests"), pattern="test_*.py")
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    print("\n" + "=" * 60)
    print(f"Tests Run:     {result.testsRun}")
    print(f"Failures:      {len(result.failures)}")
    print(f"Errors:        {len(result.errors)}")
    print(f"Skipped:       {len(result.skipped)}")
    print("=" * 60)
    
    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    sys.exit(run())
