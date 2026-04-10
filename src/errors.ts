/** A single validation issue found during parsing */
export interface ValidationIssue {
  path: (string | number)[];
  message: string;
  code: string;
  expected?: string;
  received?: string;
}

/** Error thrown when schema validation fails */
export class DatapackError extends Error {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const message = issues
      .map((i) => {
        const path = i.path.length ? `${i.path.join('.')}: ` : '';
        return `${path}${i.message}`;
      })
      .join('\n');
    super(message);
    this.name = 'DatapackError';
    this.issues = issues;
  }

  /** Flat map of field paths to error messages */
  flatten(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const issue of this.issues) {
      const key = issue.path.join('.') || '_root';
      (result[key] ??= []).push(issue.message);
    }
    return result;
  }
}

export function issue(
  path: (string | number)[],
  message: string,
  code: string,
  extra?: { expected?: string; received?: string },
): ValidationIssue {
  return { path, message, code, ...extra };
}
