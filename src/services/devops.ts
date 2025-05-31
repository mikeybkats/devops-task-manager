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
  fields: {
    "System.Title": string;
    "System.State": string;
    "System.WorkItemType": string;
    "System.Parent": number | null;
    "System.AssignedTo": {
      displayName: string;
      url: string;
      _links: {
        avatar: {
          href: string;
        };
      };
      id: string;
      uniqueName: string;
      imageUrl: string;
      descriptor: string;
    };
  };
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

      const items = detailsDataValue.map((item: WorkItemSchema) => {
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
        };
      });

      allItems = allItems.concat(items);
    }
    return { data: allItems };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export async function createWorkItem(
  project: string,
  fields: { [key: string]: any },
): Promise<DevOpsResult<any>> {
  const { azureOrganization, azurePat } = getConfig();
  const type = fields["System.WorkItemType"];

  // Filter out null/undefined values
  const patchBody = Object.entries(fields)
    .filter(([_, value]) => value !== null && value !== undefined)
    .map(([key, value]) => ({
      op: "add",
      path: `/fields/${key}`,
      value,
    }));

  // Check for required fields
  const requiredFields = [
    "System.Title",
    "System.WorkItemType",
    "System.State",
  ];
  const missingFields = requiredFields.filter((f) => !fields[f]);
  if (missingFields.length > 0) {
    return {
      error: `Failed to create work item: Missing required fields: ${missingFields.join(", ")}`,
    };
  }

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
  fields: { [key: string]: any },
): Promise<DevOpsResult<any>> {
  const { azureOrganization, azurePat } = getConfig();
  // Fetch the current work item to check for existing fields
  let existingFields: any = {};
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
    }
  } catch (err) {
    console.warn("Could not fetch current work item for patch type detection.");
  }

  // Build patch body with correct op
  const patchBody = Object.entries(fields)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      op: key in existingFields ? "replace" : "add",
      path: `/fields/${key}`,
      value,
    }));

  if (fields["System.Parent"]) {
    patchBody.push({
      op: "add",
      path: "/relations/-",
      value: {
        rel: "System.LinkTypes.Hierarchy-Reverse",
        url: `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workItems/${fields["System.Parent"]}`,
      },
    });
    // Optionally, delete the System.Parent field from fields so it doesn't get sent as a field
    delete fields["System.Parent"];
  }

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
  updates: { id: number; fields: { [key: string]: any } }[],
): Promise<DevOpsResult<any>[]> {
  // You can use Promise.all to run updates in parallel
  return Promise.all(
    updates.map((update) => updateWorkItem(project, update.id, update.fields)),
  );
}

export async function batchCreateWorkItems(
  project: string,
  updates: { id: number; fields: { [key: string]: any } }[],
): Promise<DevOpsResult<any>[]> {
  return Promise.all(
    updates.map((update) => createWorkItem(project, update.fields)),
  );
}
