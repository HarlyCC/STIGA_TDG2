import logging

from app.data.data_merger import DataMerger
from app.services.trainer import train_stiga_model

logger = logging.getLogger("stiga.process_manager")


class ProcessManager:
    """
    Orquestador del pipeline de datos de STIGA.
    Responsabilidad: coordinar la secuencia de procesos,
                     no implementarlos.
    """

    def run_data_pipeline(self):
        """Fusión de datasets y persistencia en SQLite."""
        logger.info("Iniciando pipeline de datos...")
        DataMerger().merge_all()
        logger.info("Pipeline de datos completado")

    def run_training(self):
        """Entrenamiento del modelo Random Forest."""
        logger.info("Iniciando entrenamiento del modelo...")
        train_stiga_model()
        logger.info("Entrenamiento completado")

    def run_full_pipeline(self):
        """Ejecuta el pipeline completo: datos + entrenamiento."""
        logger.info("=== Iniciando pipeline completo STIGA ===")
        self.run_data_pipeline()
        self.run_training()
        logger.info("=== Pipeline completo finalizado ===")