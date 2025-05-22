import { DevOpsElementType } from "./devopsElements";

// Operation Categories
export const enum OperationCategory {
  View = "view",
  Modification = "modification",
  Relationship = "relationship",
  Organization = "organization",
}

// Specific Operations
export const enum OperationType {
  // View operations
  List = "list",
  Get = "get",
  Summarize = "summarize",
  Analyze = "analyze",

  // Modification operations
  Update = "update",
  Create = "create",
  Delete = "delete",
  Transition = "transition",

  // Relationship operations
  Link = "link",
  Unlink = "unlink",
  Trace = "trace",

  // Organization operations
  Prioritize = "prioritize",
  Assign = "assign",
  Categorize = "categorize",
  Move = "move",
}

// Filter Types
export const enum FilterType {
  // People filters
  AssignedTo = "assignedTo",
  CreatedBy = "createdBy",
  SubscribedBy = "subscribedBy",

  // Status filters
  State = "state",
  Blocked = "blocked",
  Active = "active",
  Completed = "completed",

  // Timing filters
  CreatedAfter = "createdAfter",
  CreatedBefore = "createdBefore",
  UpdatedAfter = "updatedAfter",
  UpdatedBefore = "updatedBefore",
  InSprint = "inSprint",
  Overdue = "overdue",

  // Priority filters
  Priority = "priority",
  Severity = "severity",
  Importance = "importance",

  // Activity filters
  Stale = "stale",
  Recent = "recent",

  // Relationship filters
  ParentIs = "parentIs",
  ChildOf = "childOf",
  LinkedTo = "linkedTo",
  Blocking = "blocking",

  // Content filters
  ContainsText = "containsText",
  HasTag = "hasTag",
  HasAttachment = "hasAttachment",
}

// Filter Value
export type FilterValue = string | number | boolean | Date | string[];

// Filter Definition
export interface Filter {
  type: FilterType;
  value: FilterValue;
  negated?: boolean;
}

// Intent object - the result of classifying user input
export interface Intent {
  operationType: OperationType;
  elementType?: DevOpsElementType | DevOpsElementType[];
  elementId?: string | string[];
  filters: Filter[];
  parameters: Record<string, any>;
  rawInput: string;
  confidence: number;
}

// Intent Pattern - for matching common phrases
export interface IntentPattern {
  pattern: RegExp | string;
  operationType: OperationType;
  elementType?: DevOpsElementType;
  extractParams?: (matches: RegExpMatchArray) => Record<string, any>;
}
