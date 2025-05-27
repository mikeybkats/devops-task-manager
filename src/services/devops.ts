import { WorkItem } from "../types";
import { getConfig } from "../config/env";

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

export async function fetchProjects(): Promise<string[]> {
  const { azureOrganization, azurePat } = getConfig();
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
    throw new Error(`Failed to fetch projects: ${response.statusText}`);
  }
  const data: unknown = await response.json();
  if (
    typeof data === "object" &&
    data !== null &&
    Array.isArray((data as any).value)
  ) {
    return (data as { value: DevOpsProject[] }).value.map(
      (project) => project.name,
    );
  }
  throw new Error("Unexpected response format from Azure DevOps API");
}

export async function fetchWorkItems(
  project: string,
  type: string | null,
): Promise<WorkItem[]> {
  const { azureOrganization, azurePat } = getConfig();
  let typeFilter =
    type && type !== "All" ? `AND [System.WorkItemType] = '${type}'` : "";
  const wiqlQuery = {
    query: `SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = '${project}' ${typeFilter} ORDER BY [System.ChangedDate] DESC`,
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
    throw new Error(`Failed to fetch work items: ${wiqlResponse.statusText}`);
  }
  const wiqlData: any = await wiqlResponse.json();
  const ids = wiqlData.workItems?.map((item: any) => item.id) || [];
  if (!ids.length) return [];
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
  return allItems;
}

export async function createWorkItem(
  project: string,
  type: string,
  fields: { [key: string]: any },
): Promise<any> {
  const { azureOrganization, azurePat } = getConfig();
  // Convert fields object to JSON Patch format
  const patchBody = Object.entries(fields).map(([key, value]) => ({
    op: "add",
    path: `/fields/${key}`,
    value,
  }));

  const response = await fetch(
    `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems/$${type}?api-version=6.0`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
        "Content-Type": "application/json-patch+json",
      },
      body: JSON.stringify(patchBody),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create work item: ${response.statusText} - ${errorText}`,
    );
  }

  return response.json();
}
