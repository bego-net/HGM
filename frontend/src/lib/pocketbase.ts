import PocketBase from 'pocketbase';

// Fallback to local default if the environment variable is not defined
const pbUrl = process.env.NEXT_PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pbUrl);

// Helper to get raw file URL from PocketBase
export function getFileUrl(collectionIdOrName: string, recordId: string, filename: string) {
  return `${pbUrl}/api/files/${collectionIdOrName}/${recordId}/${filename}`;
}
