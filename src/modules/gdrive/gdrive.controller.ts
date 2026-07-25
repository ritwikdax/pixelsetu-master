import { Controller, Get, Param } from '@nestjs/common';
import { GDriveService } from './gdrive.service';

@Controller('gdrive')
export class GDriveController {
  constructor(private readonly gDriveService: GDriveService) {}

  @Get('/folder/:folderId')
  async getChildren(@Param('folderId') folderId: string) {
    // Logic to get children from Google Drive
    const folderDetails =
      await this.gDriveService.getFolderDetailsById(folderId);
    const subfolders = await this.gDriveService.getAllSubfolders(folderId);

    return {
      folderDetails,
      subfolders,
    };
  }
}
