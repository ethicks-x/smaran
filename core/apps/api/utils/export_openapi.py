import json
import sys
from pathlib import Path


# Add 'apps/api' to sys.path if running as a standalone script
API_ROOT = Path(__file__).resolve().parent.parent
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

# Adjust this import to point to your FastAPI 'app' instance
from src.main import app


def main():
    schema = app.openapi()

    # Save openapi.json to the api root directory
    output_path = Path(__file__).parent.parent / "openapi.json"

    with open(output_path, "w") as f:
        json.dump(schema, f, indent=2)

    print(f"✅ OpenAPI schema exported to {output_path.resolve()}")


if __name__ == "__main__":
    main()
