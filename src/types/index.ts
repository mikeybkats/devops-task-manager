export interface WorkItem {
  id: number;
  title: string;
  state: string;
  assignedTo: string;
  type: string;
  isNew?: boolean;
}

export enum ElectronCommands {
  WORK_ITEMS = "work-items",
  CREATE_WINDOW = "create-window",
  RENDER_CARDS = "render-cards",
  IS_WINDOW_OPEN = "is-window-open",
  CLOSE_APP = "close-app",
}

export type ElectronRenderData<T> = {
  type: ElectronCommands;
  data: T[];
};
