import { WorkItem } from "../types";
import { getConfig } from "../config/env";

export type DevOpsResult<T> =
  | { data: T; error?: undefined }
  | { data?: undefined; error: string };

export interface DevOpsProject {
  id: string;
  name: string;
  [key: string]: unknown;
}

export interface WorkItemSchema {
  id: number;
  ref: number;
  fields: any;
}

export async function fetchProjects(): Promise<DevOpsResult<string[]>> {
  const { azureOrganization, azurePat } = getConfig();
  try {
    const response = await fetch(
      `https://dev.azure.com/${azureOrganization}/_apis/projects?api-version=6.0`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!response.ok) {
      return { error: `Failed to fetch projects: ${response.statusText}` };
    }
    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as any).value)
    ) {
      return {
        data: (data as { value: DevOpsProject[] }).value.map(
          (project) => project.name,
        ),
      };
    }
    return { error: "Unexpected response format from Azure DevOps API" };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function fetchWorkItems(
  project: string,
  type: string | null,
  user: string | null,
): Promise<DevOpsResult<WorkItem[]>> {
  const { azureOrganization, azurePat } = getConfig();
  try {
    let typeFilter =
      type && type !== "All" ? `AND [System.WorkItemType] = '${type}'` : "";
    let userFilter = user ? `AND [System.AssignedTo] = '${user}'` : "";
    const wiqlQuery = {
      query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ${typeFilter} ${userFilter} ORDER BY [System.ChangedDate] DESC`,
    };
    const wiqlResponse = await fetch(
      `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/wiql?api-version=6.0`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(wiqlQuery),
      },
    );
    if (!wiqlResponse.ok) {
      return {
        error: `Failed to fetch work items: ${wiqlResponse.statusText}`,
      };
    }
    const wiqlData: any = await wiqlResponse.json();
    const ids = wiqlData.workItems?.map((item: any) => item.id) || [];
    if (!ids.length) return { data: [] };
    const batchSize = 200;
    let allItems: WorkItem[] = [];
    for (let i = 0; i < ids.length; i += batchSize) {
      const batchIds = ids.slice(i, i + batchSize).join(",");
      const detailsResponse = await fetch(
        `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems?ids=${batchIds}&fields=System.Title,System.State,System.AssignedTo,System.WorkItemType,System.Parent&api-version=6.0`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (!detailsResponse.ok) continue;
      const detailsData: any = await detailsResponse.json();
      const detailsDataValue: WorkItemSchema[] = detailsData.value;

      const items: WorkItem[] = detailsDataValue.map((item: WorkItemSchema) => {
        let parentItemName = null;
        if (item.fields["System.Parent"]) {
          const parentItem = detailsDataValue.find(
            (innerItem: WorkItemSchema) =>
              innerItem.id == item.fields["System.Parent"],
          );
          if (parentItem) {
            parentItemName = parentItem.fields["System.Title"];
          }
        }

        return {
          id: item.id,
          title: item.fields["System.Title"] || "(No Title)",
          state: item.fields["System.State"] || "",
          assignedTo:
            item.fields["System.AssignedTo"]?.displayName || "Unassigned",
          type: item.fields["System.WorkItemType"] || "Other",
          parent: parentItemName,
          fields: item.fields,
          isNew: false,
        };
      });

      allItems = allItems.concat(items);
    }
    return { data: allItems };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

function createParentRelationPatch(
  project: string,
  parentId: number | null,
  existingRelations: any[] = [],
): { op: string; path: string; value: unknown }[] {
  const { azureOrganization } = getConfig();
  const patchOperations: { op: string; path: string; value: unknown }[] = [];

  // Remove any existing parent relationships
  const parentRelations = existingRelations.filter(
    (rel) => rel.rel === "System.LinkTypes.Hierarchy-Reverse",
  );

  parentRelations.forEach((rel) => {
    patchOperations.push({
      op: "remove",
      path: `/relations/${existingRelations.indexOf(rel)}`,
      value: null, // Required by the type but not used for remove operations
    });
  });

  // Add new parent relationship if parentId exists
  if (parentId) {
    patchOperations.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workItems/${parentId}`,
      },
    });
  }

  return patchOperations;
}

export async function createWorkItem(
  project: string,
  fields: WorkItem,
  allTasks?: WorkItem[],
): Promise<DevOpsResult<any>> {
  const { azureOrganization, azurePat } = getConfig();
  const type = fields.type || "Task"; // Default to "Task" if type is not specified

  // Use toWorkItemSchema to get the correct fields object
  const schema = toWorkItemSchema(fields, allTasks);
  const patchBody = Object.entries(schema.fields)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      op: "add",
      path: `/fields/${key}`,
      value,
    }));

  // Add parent relation if parent ID exists
  if (schema.fields["System.Parent"]) {
    patchBody.push(
      ...createParentRelationPatch(project, schema.fields["System.Parent"]),
    );
  }

  console.log("createWorkItem -- patchBody: ", patchBody);

  try {
    const response = await fetch(
      `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems/$${type}?api-version=6.0`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json-patch+json",
        },
        body: JSON.stringify(patchBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: `Failed to create work item: ${response.statusText} - ${errorText}`,
      };
    }

    return { data: await response.json() };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function updateWorkItem(
  project: string,
  id: number,
  workItem: WorkItem,
  allTasks?: WorkItem[],
): Promise<DevOpsResult<any>> {
  const { azureOrganization, azurePat } = getConfig();
  // Fetch the current work item to check for existing fields
  let existingFields: any = {};
  let existingRelations: any[] = [];
  try {
    const currentResponse = await fetch(
      `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems/${id}?api-version=6.0`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (currentResponse.ok) {
      const currentData = await currentResponse.json();
      existingFields = currentData.fields || {};
      existingRelations = currentData.relations || [];
    }
  } catch (err) {
    console.warn("Could not fetch current work item for patch type detection.");
  }

  // Use toWorkItemSchema to get the correct fields object
  const schema = toWorkItemSchema(workItem, allTasks);
  const patchBody = Object.entries(schema.fields)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      op: key in existingFields ? "replace" : "add",
      path: `/fields/${key}`,
      value,
    }));

  // Handle parent relationship
  if (workItem.parent !== undefined) {
    patchBody.push(
      ...createParentRelationPatch(
        project,
        schema.fields["System.Parent"],
        existingRelations,
      ),
    );
  }

  console.log("updateWorkItem -- patchBody: ", patchBody);

  try {
    const response = await fetch(
      `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems/${id}?api-version=6.0`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json-patch+json",
        },
        body: JSON.stringify(patchBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Update failed with status:", response.status);
      console.error("Error response:", errorText);
      return {
        error: `Failed to update work item: ${response.statusText} - ${errorText}`,
      };
    }

    const responseData = await response.json();
    return { data: responseData };
  } catch (err) {
    console.error("Update error:", err);
    return { error: (err as Error).message };
  }
}

export async function batchUpdateWorkItems(
  project: string,
  updates: WorkItem[],
): Promise<DevOpsResult<any>[]> {
  // You can use Promise.all to run updates in parallel
  return Promise.all(
    updates.map((update) => updateWorkItem(project, update.id, update)),
  );
}

export async function batchCreateWorkItems(
  project: string,
  updates: WorkItem[],
): Promise<DevOpsResult<WorkItem>[]> {
  return Promise.all(updates.map((update) => createWorkItem(project, update)));
}

export function toWorkItemSchema(
  item: WorkItem,
  allTasks?: WorkItem[],
): WorkItemSchema {
  console.log("toWorkItemSchema -- item: ", item);
  // Resolve parent ID if parent is a string (title)
  let parentId: number | null = null;
  if (item.parent) {
    if (typeof item.parent === "string") {
      // If parent is a string (title), look up the ID
      const parentTask = allTasks?.find((t) => t.title === item.parent);
      if (parentTask) parentId = parentTask.id;
    } else if (typeof item.parent === "number") {
      // If parent is already a number (ID), use it directly
      parentId = item.parent;
    }
  }

  // Use fields if present, but override System.Parent with the resolved ID
  if (item.fields) {
    const fields: Record<string, any> = {
      ...item.fields,
    };
    // Only add System.Parent if we have a valid parentId
    if (parentId !== null) {
      fields["System.Parent"] = parentId;
    }
    // Remove null/undefined fields
    Object.keys(fields).forEach((key) => {
      if (fields[key] === null || fields[key] === undefined) {
        delete fields[key];
      }
    });
    return {
      id: item.id,
      ref: 0,
      fields,
    };
  }

  // Otherwise, build fields from flat properties
  const fields: Record<string, any> = {
    "System.Title": item.title,
    "System.State": item.state,
    "System.WorkItemType": item.type,
    "System.AssignedTo": {
      displayName: item.assignedTo,
      url: "",
      _links: { avatar: { href: "" } },
      id: "",
      uniqueName: item.assignedTo,
      imageUrl: "",
      descriptor: "",
    },
  };
  // Only add System.Parent if we have a valid parentId
  if (parentId !== null) {
    fields["System.Parent"] = parentId;
  }
  // Remove null/undefined fields
  Object.keys(fields).forEach((key) => {
    if (fields[key] === null || fields[key] === undefined) {
      delete fields[key];
    }
  });
  return {
    id: item.id,
    ref: 0,
    fields,
  };
}
