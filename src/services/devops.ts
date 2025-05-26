import { WorkItem } from "../types";
import { getConfig } from "../config/env";

export interface DevOpsProject {
  id: string;
  name: string;
  [key: string]: unknown;
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
      `https://dev.azure.com/${azureOrganization}/${project}/_apis/wit/workitems?ids=${batchIds}&fields=System.Title,System.State,System.AssignedTo,System.WorkItemType&api-version=6.0`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`:${azurePat}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
      },
    );
    if (!detailsResponse.ok) continue;
    const detailsData: any = await detailsResponse.json();
    const items = detailsData.value.map((item: any) => ({
      title: item.fields["System.Title"] || "(No Title)",
      state: item.fields["System.State"] || "",
      assignedTo: item.fields["System.AssignedTo"]?.displayName || "Unassigned",
      type: item.fields["System.WorkItemType"] || "Other",
    }));
    allItems = allItems.concat(items);
  }
  return allItems;
}
