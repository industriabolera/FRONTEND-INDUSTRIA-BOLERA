-- Compatible con filas existentes: el teléfono es opcional y permanece NULL.
-- La comprobación en information_schema hace esta migración idempotente.
SET @contact_phone_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'contact_messages'
    AND COLUMN_NAME = 'telefono'
);

SET @contact_phone_sql = IF(
  @contact_phone_exists = 0,
  'ALTER TABLE contact_messages ADD COLUMN telefono VARCHAR(16) NULL AFTER email',
  'SELECT 1'
);

PREPARE contact_phone_stmt FROM @contact_phone_sql;
EXECUTE contact_phone_stmt;
DEALLOCATE PREPARE contact_phone_stmt;
