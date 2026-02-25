export interface Attachment {
  id: string;
  url: string;
  fileName: string;
  loading: boolean;
}

export interface InspectedElement {
  id: string;
  type: 'div' | 'a' | 'ul' | 'ol' | 'h1' | 'img' | string;
  label: string;
}

export interface PromptSubmission {
  text: string;
  attachments: Attachment[];
  inspectedElements: InspectedElement[];
}
