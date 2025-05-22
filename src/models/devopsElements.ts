// DevOps Element Types
export const enum DevOpsElementType {
  Epic = "epic",
  Feature = "feature",
  UserStory = "userStory",
  Task = "task",
  Bug = "bug",
  Impediment = "impediment",
  TestCase = "testCase",
  Sprint = "sprint",
}

// Common fields across all DevOps elements
export interface DevOpsElementBase {
  id: string;
  type: DevOpsElementType;
  title: string;
  description?: string;
  state: string;
  assignedTo?: string;
  createdBy: string;
  createdDate: Date;
  updatedDate: Date;
  priority?: number;
  tags?: string[];
}

// Epic specific fields
export interface Epic extends DevOpsElementBase {
  type: DevOpsElementType.Epic;
  startDate?: Date;
  targetDate?: Date;
  businessValue?: number;
  features?: string[]; // IDs of child features
}

// Feature specific fields
export interface Feature extends DevOpsElementBase {
  type: DevOpsElementType.Feature;
  epicId?: string;
  userStories?: string[]; // IDs of child user stories
  targetRelease?: string;
}

// User Story specific fields
export interface UserStory extends DevOpsElementBase {
  type: DevOpsElementType.UserStory;
  featureId?: string;
  acceptanceCriteria?: string;
  storyPoints?: number;
  tasks?: string[]; // IDs of child tasks
}

// Task specific fields
export interface Task extends DevOpsElementBase {
  type: DevOpsElementType.Task;
  userStoryId?: string;
  remainingWork?: number;
  originalEstimate?: number;
  completedWork?: number;
  activity?: string;
}

// Bug specific fields
export interface Bug extends DevOpsElementBase {
  type: DevOpsElementType.Bug;
  severity: string;
  reproSteps?: string;
  systemInfo?: string;
  foundInBuild?: string;
  integratedInBuild?: string;
}

// Union type for all DevOps elements
export type DevOpsElement = Epic | Feature | UserStory | Task | Bug;

// Operation result types
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}
