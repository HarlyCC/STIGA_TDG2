import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))         
sys.path.insert(0, str(ROOT / "src")) 

from dotenv import load_dotenv
load_dotenv()

import uvicorn
from config.logger_config import setup_logger
from src.app.controllers.process_manager import ProcessManager

if __name__ == "__main__":
    setup_logger()

    if "--train" in sys.argv:
        ProcessManager().run_full_pipeline()
    else:
        uvicorn.run(
            "app.controllers.triage_controller:app",
            host="0.0.0.0",
            port=8000,
            reload=True
        )