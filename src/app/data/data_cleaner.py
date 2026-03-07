class DataCleaner:
    @staticmethod
    def clean_gender(val):
        """Mapeo: 0: Female, 1: Male, 2: Other/Unknown"""
        raw = str(val).strip().lower()
        if raw in ['male', '1.0', '1', 'm', 'man']: return 1
        if raw in ['female', '0.0', '0', 'f', 'woman']: return 0
        return 2

    @staticmethod
    def clean_triage_label(val):
        """Unifica etiquetas. Devuelve None si el valor es inválido."""
        raw = str(val).lower().strip()
        mapping = {
            'green':    0, '0': 0, '0.0': 0,
            'yellow':   1, '1': 1, '1.0': 1,
            'orange':   2, '2': 2, '2.0': 2,
            'red':      3, 'critical': 3, '3': 3, '3.0': 3,
        }
        return mapping.get(raw, None)

    @staticmethod
    def clean_numeric(val):
        """Convierte a float. Devuelve None (NaN) en lugar de 0.0 si falla."""
        try:
            if val is None: return None
            clean_val = str(val).replace(';', '').replace(',', '.').strip()
            return float(clean_val)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def validate_vitals(val, min_val, max_val):
        """Valida si un signo vital está en un rango humano posible."""
        num = DataCleaner.clean_numeric(val)
        if num is None: return None
        if min_val <= num <= max_val:
            return num
        return None