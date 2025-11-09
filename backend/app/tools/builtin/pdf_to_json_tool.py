import io, json
from PIL import Image
import pdfplumber
from transformers import BlipProcessor, BlipForConditionalGeneration

class PDFToJSONTool:
    """Extracts text and image captions from PDFs using pdfplumber + BLIP."""

    def __init__(self):
        print("🔹 Loading BLIP image captioning model...")
        self.processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
        self.model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
        print("✅ BLIP model loaded successfully.")

    def run(self, file_bytes: bytes):
        """Extract text and images → JSON."""
        pages_data = []

        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                images = []

                for img_obj in page.images:
                    try:
                        # Extract raw image bytes
                        x0, top, x1, bottom = img_obj["x0"], img_obj["top"], img_obj["x1"], img_obj["bottom"]
                        cropped = page.crop((x0, top, x1, bottom)).to_image(resolution=150)
                        img_bytes = io.BytesIO()
                        cropped.original.save(img_bytes, format="PNG")
                        image = Image.open(io.BytesIO(img_bytes.getvalue())).convert("RGB")

                        inputs = self.processor(images=image, return_tensors="pt")
                        output = self.model.generate(**inputs)
                        caption = self.processor.decode(output[0], skip_special_tokens=True)
                        images.append(caption)
                    except Exception as e:
                        print(f"[WARN] Skipping image on page {i}: {e}")

                pages_data.append({
                    "page_number": i,
                    "text": text.strip(),
                    "images": images,
                })

        return json.dumps(pages_data, indent=2, ensure_ascii=False)