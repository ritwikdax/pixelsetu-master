export interface DriveUser {
  kind: string;
  displayName: string;
  photoLink: string;
  me: boolean;
  permissionId: string;
  emailAddress: string;
}

export interface FolderDetails {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
  owners: DriveUser[];
}
