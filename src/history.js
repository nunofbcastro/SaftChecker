const { all, run } = require("./db");

const getHistory = async () => {
  const validations = await all(
    `
      SELECT
        id,
        file_name AS fileName,
        saved_file_name AS savedFileName,
        started_at AS startedAt,
        finished_at AS finishedAt,
        status,
        used_fallback AS usedFallback,
        errors_count AS errorsCount,
        warnings_count AS warningsCount
      FROM validations
      ORDER BY started_at DESC
      LIMIT 100
    `
  );

  return {
    validations: validations.map((item) => ({
      ...item,
      usedFallback: Boolean(item.usedFallback)
    }))
  };
};

const addValidationRecord = async (record) => {
  await run(
    `
      INSERT INTO validations (
        id,
        file_name,
        saved_file_name,
        started_at,
        finished_at,
        status,
        used_fallback,
        errors_count,
        warnings_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      record.id,
      record.fileName,
      record.savedFileName,
      record.startedAt,
      record.finishedAt,
      record.status,
      record.usedFallback ? 1 : 0,
      record.errorsCount,
      record.warningsCount
    ]
  );

  await run(
    `
      DELETE FROM validations
      WHERE id NOT IN (
        SELECT id FROM validations
        ORDER BY started_at DESC
        LIMIT 100
      )
    `
  );
};

module.exports = {
  getHistory,
  addValidationRecord
};
