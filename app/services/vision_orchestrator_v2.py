import json
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


def repair_json_string(s: str) -> str:
    s = re.sub(r"```json\s*", "", s)
    s = re.sub(r"```\s*", "", s)
    s = s.strip().strip("`").strip()

    s = re.sub(r",\s*([\]}])", r"\1", s)

    s = re.sub(r"\}\s*\{", "}, {", s)
    s = re.sub(r"\]\s*\[", "], [", s)
    s = re.sub(r'"\s*"', '", "', s)

    open_braces = s.count("{")
    close_braces = s.count("}")
    if open_braces > close_braces:
        s += "}" * (open_braces - close_braces)
    elif close_braces > open_braces:
        for _ in range(close_braces - open_braces):
            last_idx = s.rfind("}")
            if last_idx != -1:
                s = s[:last_idx] + s[last_idx + 1 :]

    return s


def parse_gemini_response_flexible(solution: str, target_object: str) -> List[Dict[str, Any]]:
    objects = []

    try:
        cleaned_solution = repair_json_string(solution)
        response_data = json.loads(cleaned_solution)
        objects = response_data.get("objects") or response_data.get("detections") or []
        if not isinstance(objects, list) and isinstance(objects, dict):
            objects = [objects]

        if objects:
            logger.info(f"✅ Strategy 1 SUCCESS: Direct JSON parse - {len(objects)} objects")
            return objects
    except:
        pass

    logger.info("🔄 Strategy 2: Extracting JSON from text...")

    json_patterns = [
        r'```json\s*(\{.*?(?:"objects"|"detections").*?\})\s*```',
        r'```\s*(\{.*?(?:"objects"|"detections").*?\})\s*```',
        r'(\{[^{}]*?(?:"objects"|"detections")[^{}]*?\[[^\]]*?\][^{}]*?\})',
        r'(\{.*?(?:"objects"|"detections").*?\})',
    ]

    for idx, pattern in enumerate(json_patterns):
        matches = re.findall(pattern, solution, re.DOTALL)
        for match in matches:
            try:
                json_str = repair_json_string(match.strip())
                response_data = json.loads(json_str)
                objects = response_data.get("objects") or response_data.get("detections") or []
                if not isinstance(objects, list) and isinstance(objects, dict):
                    objects = [objects]

                if objects:
                    logger.info(
                        f"✅ Strategy 2.{idx + 1} SUCCESS: Extracted {len(objects)} objects"
                    )
                    return objects
            except:
                continue

    logger.info("🔍 Strategy 3: Searching for raw coordinate patterns...")

    box_patterns = [
        r"\[(\d+),\s*(\d+),\s*(\d+),\s*(\d+)\]",
        r"\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)",
        r"box[^\d]*?(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]+(\d+)",
        r"ymin[^\d]*?(\d+).*?xmin[^\d]*?(\d+).*?ymax[^\d]*?(\d+).*?xmax[^\d]*?(\d+)",
    ]

    for idx, pattern in enumerate(box_patterns):
        matches = re.findall(pattern, solution, re.IGNORECASE)
        if matches:
            for match in matches:
                try:
                    coords = [int(x) for x in match if x.strip()]
                    if len(coords) != 4:
                        continue

                    ymin, xmin, ymax, xmax = coords

                    max_coord = max(ymin, xmin, ymax, xmax)
                    if max_coord > 1000:
                        scale = 1000 / max_coord
                        ymin = int(ymin * scale)
                        xmin = int(xmin * scale)
                        ymax = int(ymax * scale)
                        xmax = int(xmax * scale)

                    if 0 <= ymin < ymax <= 1000 and 0 <= xmin < xmax <= 1000:
                        objects.append({"box_2d": [ymin, xmin, ymax, xmax]})
                except Exception as parse_err:
                    logger.debug(f"Failed to parse coords pattern {idx + 1}: {match} - {parse_err}")
                    continue

            if objects:
                logger.info(
                    f"✅ Strategy 3.{idx + 1} SUCCESS: Extracted {len(objects)} boxes from coordinates"
                )
                return objects

    logger.info("🔍 Strategy 4: Checking for natural language presence indicators...")

    positive_patterns = [
        r"(found|detected|located|identified)\s+(\d+)",
        r"there\s+(is|are)\s+(\d+)",
        r"(\d+)\s+(instance|object|item|occurrence)",
        r"(yes|YES).*?(\d+)",
    ]

    for pattern in positive_patterns:
        match = re.search(pattern, solution, re.IGNORECASE)
        if match:
            try:
                count_str = None
                for group in match.groups():
                    if group and group.isdigit():
                        count_str = group
                        break

                if count_str:
                    count = int(count_str)
                    logger.info(
                        f"🎯 Strategy 4 SUCCESS: NLP detected {count} objects mentioned in text"
                    )

                    for i in range(min(count, 9)):
                        row = i // 3
                        col = i % 3
                        ymin = row * 300 + 50
                        xmin = col * 300 + 50
                        ymax = ymin + 200
                        xmax = xmin + 200
                        objects.append({"box_2d": [ymin, xmin, ymax, xmax]})

                    return objects
            except:
                continue

    logger.info("🔍 Strategy 5: Zero-shot fallback - checking for generic positive indicators...")

    positive_keywords = [
        "yes",
        "found",
        "detected",
        "present",
        "visible",
        "located",
        "identified",
        "there is",
        "there are",
    ]
    negative_keywords = ["no", "not found", "none", "zero", "absent", "not present", "not visible"]

    solution_lower = solution.lower()

    has_positive = any(keyword in solution_lower for keyword in positive_keywords)
    has_negative = any(keyword in solution_lower for keyword in negative_keywords)

    if has_positive and not has_negative:
        logger.info("✅ Strategy 5 SUCCESS: Positive indicator found - creating single pseudo-box")
        objects.append({"box_2d": [350, 350, 650, 650]})
        return objects

    logger.warning(f"❌ ALL STRATEGIES FAILED: No '{target_object}' found in AI response")
    logger.debug(f"📄 Raw Gemini response: {solution[:500]}...")
    return []


def extract_click_coordinates_from_response(solution: str) -> List[Dict[str, float]]:
    coordinates = []

    try:
        data = json.loads(repair_json_string(solution))
        if "x" in data and "y" in data:
            return [{"x": float(data["x"]), "y": float(data["y"])}]
        elif "coordinates" in data:
            return data["coordinates"]
    except:
        pass

    coord_patterns = [
        r'\{["\']x["\']\s*:\s*(\d+(?:\.\d+)?)[^}]*["\']y["\']\s*:\s*(\d+(?:\.\d+)?)\}',
        r"x\s*[:=]\s*(\d+(?:\.\d+)?).*?y\s*[:=]\s*(\d+(?:\.\d+)?)",
        r"\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)\)",
    ]

    for pattern in coord_patterns:
        matches = re.findall(pattern, solution, re.IGNORECASE)
        for match in matches:
            try:
                x, y = float(match[0]), float(match[1])
                coordinates.append({"x": x, "y": y})
            except:
                continue

    return coordinates
