import logging
from app.data.data_merger import DataMerger
from app.services.trainer import train_stiga_model

logger = logging.getLogger("stiga.training_manager")


class TrainingManager:

    def run_data_pipeline(self):
        """Merges datasets and persists them to SQLite."""
        logger.info("Starting data pipeline...")
        DataMerger().merge_all()
        logger.info("Data pipeline completed")

    def run_training(self):
        """Trains the Random Forest model."""
        logger.info("Starting model training...")
        train_stiga_model()
        logger.info("Training completed")

    def run_full_pipeline(self):
        """Runs the full pipeline: data merge + model training."""
        logger.info("=== Starting full STIGA pipeline ===")
        self.run_data_pipeline()
        self.run_training()
        logger.info("=== Full pipeline completed ===")
