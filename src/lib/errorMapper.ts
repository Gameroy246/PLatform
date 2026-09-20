export function mapDuckDBError(error: unknown): { message: string, raw: string, code: string } {
  const rawError = error instanceof Error ? error.message : String(error);
  let friendlyMessage = "An unexpected error occurred while processing your data.";
  let code = "UNKNOWN_ERROR";

  if (rawError.includes('Attempted to dereference unique_ptr that is NULL') || rawError.includes('Serialization Error') || rawError.includes('Invalid Error')) {
    friendlyMessage = "An internal data processing error occurred. This usually happens when an uploaded file is structurally corrupted, completely empty, or contains badly mixed data types.";
    code = "FATAL_DATA_CORRUPTION";
  } else if (rawError.includes('Connection was never established') || rawError.includes('Connection Error')) {
    friendlyMessage = "The database connection was temporarily lost. We are restarting it in the background. Please try running the pipeline again.";
    code = "CONNECTION_LOST";
  } else if (rawError.includes('Catalog Error: Table with name')) {
    friendlyMessage = "The data required for this step is missing. Please make sure the previous steps in the pipeline are correctly connected and have executed successfully.";
    code = "MISSING_DEPENDENCY";
  } else if (rawError.includes('Invalid Input Error') || rawError.includes('Parser Error') || rawError.includes('Binder Error') || rawError.includes('Syntax Error')) {
    friendlyMessage = "The configuration or logic for this step is invalid. Please double-check your node settings, formulas, and column names.";
    code = "INVALID_CONFIGURATION";
  } else if (rawError.includes('IO Error')) {
    friendlyMessage = "Could not read the required file. The file may have been moved, deleted, or you might lack permission to read it.";
    code = "FILE_READ_ERROR";
  }

  return {
    message: friendlyMessage,
    raw: rawError,
    code
  };
}
