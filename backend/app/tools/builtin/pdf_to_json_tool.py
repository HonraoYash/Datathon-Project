import io, json, logging
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
        """Extracts text and images → JSON."""
        pages_data = []
        pdf_stream = io.BytesIO(file_bytes)

        with pdfplumber.open(pdf_stream) as pdf:
            total_pages = len(pdf.pages)
            logging.info(f"📄 Starting PDF parsing: {total_pages} pages detected")

            for i, page in enumerate(pdf.pages, start=1):
                page_text = (page.extract_text() or "").strip()
                image_captions = []

                # Extract images safely
                for img_index, img_obj in enumerate(page.images):
                    try:
                        # Attempt to crop — but relax bbox constraints
                        x0, top, x1, bottom = img_obj["x0"], img_obj["top"], img_obj["x1"], img_obj["bottom"]

                        # Clamp coordinates within page bounds to avoid exceptions
                        x0 = max(x0, 0)
                        top = max(top, 0)
                        x1 = min(x1, page.width)
                        bottom = min(bottom, page.height)

                        if x1 <= x0 or bottom <= top:
                            raise ValueError("Invalid image coordinates after clamping.")

                        cropped = page.crop((x0, top, x1, bottom)).to_image(resolution=150)
                        img_bytes = io.BytesIO()
                        cropped.original.save(img_bytes, format="PNG")

                        image = Image.open(io.BytesIO(img_bytes.getvalue())).convert("RGB")
                        inputs = self.processor(images=image, return_tensors="pt")
                        output = self.model.generate(**inputs)
                        caption = self.processor.decode(output[0], skip_special_tokens=True)
                        image_captions.append(caption)

                    except Exception as e:
                        logging.warning(f"[WARN] Could not process image {img_index+1} on page {i}: {e}")
                        continue

                # Store structured data
                pages_data.append({
                    "page_number": i,
                    "text": page_text,
                    "image_captions": image_captions
                })

        result_json = json.dumps(pages_data, indent=2, ensure_ascii=False)
        logging.info(f"✅ PDF to JSON completed — {len(pages_data)} pages extracted, total output size: {len(result_json)} chars")
        return result_json