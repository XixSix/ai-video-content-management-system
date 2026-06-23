export function getEditorHref(
  workspaceId: string,
  projectId: string
): string {
  return `/workspaces/${workspaceId}/editor/${projectId}`
}
