import json
from pathlib import Path
from pdf_to_json_tool import PDFToJSONTool

if __name__ == "__main__":
    pdf_path = Path("/Users/yash.honrao/Downloads/test.pdf")

    if not pdf_path.exists():
        raise FileNotFoundError(f"❌ PDF not found: {pdf_path}")

    print(f"📄 Reading PDF: {pdf_path}")
    tool = PDFToJSONTool()

    with open(pdf_path, "rb") as f:
        file_bytes = f.read()

    print("🧠 Running PDF → JSON extraction...")
    result_json = tool.run(file_bytes)

    parsed = json.loads(result_json)
    print("\n✅ Extracted JSON summary:")
    print(f"Total pages: {len(parsed)}")

    # show first page snippet
    first_page = parsed[0]
    print("\n--- First Page Preview ---")
    print(json.dumps(first_page, indent=2, ensure_ascii=False))
