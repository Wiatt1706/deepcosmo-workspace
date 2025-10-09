import { type SystemMenu } from "@/db/schema"

/**
 * Returns the appropriate status icon based on the provided status.
 * @param status - The status of the task.
 * @returns A React component representing the status icon.
 */
export function getMenuTypeContent(type: SystemMenu["menuType"]) {
  const TEXT_MAPPING = [
    { key: "0", label: "Platform" },
    { key: "1", label: "Projects" },
  ];
  return {
    text: TEXT_MAPPING[type].label,
  }
}