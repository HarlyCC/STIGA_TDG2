# main.py
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import uvicorn
from config.logger_config import setup_logger
from src.app.controllers.process_manager                                                                                                                                 import ProcessManager

if __name__ == "__main__":
    import sys
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