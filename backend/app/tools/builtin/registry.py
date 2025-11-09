"""Registry for builtin tools."""
from typing import Dict, Type, Any
from app.tools.builtin.pdf_to_json_tool import PDFToJSONTool

# Registry mapping tool names to their classes
BUILTIN_TOOL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "pdf_to_json": {
        "name": "PDF to JSON",
        "description": "Extracts text and image captions from PDF files and converts them to JSON format. Use this tool when the user asks about PDF content, wants to extract information from a PDF, or needs to process a document. The tool can accept file_id (reference ID from uploaded PDF), file_bytes (the PDF file content as bytes), or file_path (path to the PDF file). When a user uploads a PDF through the chat interface, use the file_id returned from the upload. Format: Use tool: pdf_to_json with file_id: <file_id> or file_bytes: <pdf_file_bytes> or file_path: <path_to_pdf_file>",
        "tool_type": "builtin",
        "class": PDFToJSONTool,
        "parameters": {
            "type": "object",
            "properties": {
                "file_id": {
                    "type": "string",
                    "description": "File ID from uploaded PDF (returned when user uploads a PDF). Use this when processing an uploaded PDF."
                },
                "file_bytes": {
                    "type": "string",
                    "description": "PDF file content as bytes (base64 encoded string) or raw bytes. Use this when PDF is uploaded directly."
                },
                "file_path": {
                    "type": "string",
                    "description": "Full path to the PDF file to process (e.g., /path/to/file.pdf). Use this when PDF is stored on the file system."
                }
            },
            "required": []  # At least one of file_id, file_bytes, or file_path is required
        }
    }
}

def get_builtin_tool_definitions():
    """Get all builtin tool definitions."""
    return BUILTIN_TOOL_REGISTRY

def get_builtin_tool_class(tool_name: str):
    """Get the class for a builtin tool by name."""
    tool_def = BUILTIN_TOOL_REGISTRY.get(tool_name)
    if tool_def:
        return tool_def["class"]
    return None

def create_builtin_tool_instance(tool_name: str):
    """Create an instance of a builtin tool."""
    tool_class = get_builtin_tool_class(tool_name)
    if tool_class:
        return tool_class()
    return None

