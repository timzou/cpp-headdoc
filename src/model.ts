export type ParameterDirection = 'in' | 'out' | 'in,out';

export interface DocumentationParameter {
  name: string;
  direction?: ParameterDirection;
  description: string;
}

export interface DocumentationReturnValue {
  value: string;
  description: string;
}

export interface DocumentationException {
  type: string;
  description: string;
}

export interface ParsedDocumentation {
  rawText: string;
  brief: string;
  details: string[];
  parameters: DocumentationParameter[];
  templateParameters: DocumentationParameter[];
  returns?: string;
  returnValues: DocumentationReturnValue[];
  throws: DocumentationException[];
  notes: string[];
  warnings: string[];
  deprecated?: string;
  seeAlso: string[];
}

export type SummaryStyle = 'brief' | 'briefAndParams' | 'briefAndTags';

export interface SummaryOptions {
  style: SummaryStyle;
  maxLength: number;
  showParameters: boolean;
  showReturnValue: boolean;
}

export interface MarkdownDocumentInput {
  qualifiedName: string;
  signature: string;
  declarationLabel: string;
  documentation: ParsedDocumentation;
}

export interface ExtractedComment {
  raw: string;
  startLine: number;
  endLine: number;
}
