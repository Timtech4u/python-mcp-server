import sys
import platform
import datetime

print("Python MCP Server Test Script")
print("============================")
print(f"Python version: {sys.version}")
print(f"Platform: {platform.platform()}")
print(f"Current time: {datetime.datetime.now()}")

# Test command-line arguments
if len(sys.argv) > 1:
    print("\nCommand-line arguments:")
    for i, arg in enumerate(sys.argv[1:], 1):
        print(f"  Argument {i}: {arg}")
else:
    print("\nNo command-line arguments provided.")

# Test basic functionality
print("\nTesting basic functionality:")
numbers = [1, 2, 3, 4, 5]
print(f"  Sum of {numbers}: {sum(numbers)}")
print(f"  Average of {numbers}: {sum(numbers)/len(numbers)}")

# Test exception handling
print("\nTesting exception handling:")
try:
    result = 10 / 0
    print("  This line should not be executed")
except Exception as e:
    print(f"  Caught exception: {type(e).__name__}: {e}")

print("\nTest completed successfully!")
