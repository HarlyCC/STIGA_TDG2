import logging
from config.paths import LOGS_DIR 
from datetime import datetime, timedelta

def _cleanup_old_logs(log_dir, keep_days: int = 3) -> None:
    keep_dates = {
        (datetime.today() - timedelta(days=i)).strftime('%Y-%m-%d')
        for i in range(keep_days)
    }
    for file in log_dir.glob("app_*.log"):  
        date_str = file.stem.replace("app_", "")
        if date_str not in keep_dates:
            try:
                file.unlink()
            except OSError as e:
                logging.getLogger("stiga").warning(
                    f"No se pudo eliminar log antiguo {file.name}: {e}"
                )

def setup_logger(level: int = logging.INFO) -> logging.Logger:
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_old_logs(LOGS_DIR)

    log_path = LOGS_DIR / f"app_{datetime.today().strftime('%Y-%m-%d')}.log"

    logger = logging.getLogger("stiga")  

    if logger.handlers: 
        return logger

    logger.setLevel(level)

    file_handler = logging.FileHandler(log_path, mode='a', encoding='utf-8')  
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s | %(levelname)s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    ))

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter('%(levelname)s | %(message)s'))

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    for lib in ("urllib3", "selenium", "requests", "websockets"):
        logging.getLogger(lib).setLevel(logging.ERROR)

    return logger 