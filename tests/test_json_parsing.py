import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.vision_orchestrator import parse_gemini_response_flexible


def test_parsing():
    test_cases = [
        {
            "name": "Valid JSON",
            "input": '{"objects": [{"box_2d": [100, 100, 200, 200]}]}',
            "expected_count": 1,
        },
        {
            "name": "Trailing Comma",
            "input": '{"objects": [{"box_2d": [100, 100, 200, 200]},]}',
            "expected_count": 1,
        },
        {
            "name": "Missing Comma between objects",
            "input": '{"objects": [{"box_2d": [100, 100, 200, 200]} {"box_2d": [300, 300, 400, 400]}]}',
            "expected_count": 2,
        },
        {
            "name": "Unclosed Braces",
            "input": '{"objects": [{"box_2d": [100, 100, 200, 200]}',
            "expected_count": 1,
        },
        {
            "name": "Conversational Text",
            "input": 'I found the following: {"objects": [{"box_2d": [100, 100, 200, 200]}]} hope that helps!',
            "expected_count": 1,
        },
        {
            "name": "Markdown Block",
            "input": '```json\n{"objects": [{"box_2d": [100, 100, 200, 200]}]}\n```',
            "expected_count": 1,
        },
        {
            "name": "Raw Coordinates",
            "input": "The object is at [100, 100, 200, 200]",
            "expected_count": 1,
        },
        {
            "name": "NLP Detection",
            "input": "I detected 3 instances of the object.",
            "expected_count": 3,
        },
    ]

    passed = 0
    for case in test_cases:
        print(f"Testing: {case['name']}...")
        result = parse_gemini_response_flexible(case["input"], "test_object")
        if len(result) == case["expected_count"]:
            print(f"✅ SUCCESS: Found {len(result)} objects")
            passed += 1
        else:
            print(f"❌ FAILED: Expected {case['expected_count']}, found {len(result)}")
            print(f"   Input: {case['input']}")
            print(f"   Result: {result}")

    print(f"\nSummary: {passed}/{len(test_cases)} passed")
    return passed == len(test_cases)


if __name__ == "__main__":
    if test_parsing():
        sys.exit(0)
    else:
        sys.exit(1)
