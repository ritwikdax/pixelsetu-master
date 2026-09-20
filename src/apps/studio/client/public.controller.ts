import { AllowAnnonymous } from '@/modules/auth/auth.decorators';
import { ValidateSchema } from '@/modules/common';
import { COOKIE_NAME } from '@/modules/const.global';
import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ClientGuard } from './client.guard';
import type { Response } from 'express';
import z from 'zod';
import { ClientService } from './client.service';
import { DriveService } from './drive.service';
import {
  DriveIdSchema,
  FolderContentsQuerySchema,
  LoginPayloadSchema,
  SelectImageSchema,
  type FolderContentsQuery,
  type LoginPayload,
  type SelectImage,
} from './schema';

@Controller('studio/client')
@UseGuards(ClientGuard)
export class PublicStudioController {
  constructor(
    private readonly clientService: ClientService,
    private readonly driveService: DriveService,
  ) {}

  @AllowAnnonymous()
  @ValidateSchema({
    body: LoginPayloadSchema,
  })
  @Post('login')
  async login(
    @Body() body: LoginPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = await this.clientService.login(body);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 60 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return {
      success: true,
      message: 'Login successful',
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie(COOKIE_NAME, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 0,
      path: '/',
    });
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('ping')
  ping() {
    return {
      success: true,
      message: 'Authenticated',
    };
  }

  @Get('status')
  async getStatus() {
    return {
      success: true,
      data: await this.clientService.getStatus(),
      message: 'Status fetched successfully',
    };
  }

  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Content-Type', 'image/jpeg')
  @ValidateSchema({ params: DriveIdSchema })
  @Get('thumbnail/:imageId')
  async getThumbnail(@Param('imageId') imageId: string, @Res() res: Response) {
    const image = await this.driveService.getThumbnailImage(imageId);
    this.sendCachedImage(res, image.stream);
  }

  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('Content-Type', 'image/jpeg')
  @ValidateSchema({ params: DriveIdSchema })
  @Get('preview/:imageId')
  async getPreview(@Param('imageId') imageId: string, @Res() res: Response) {
    const image = await this.driveService.getPreviewImage(imageId);
    this.sendCachedImage(res, image.stream);
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Post('submit-selection/:albumId')
  async submitSelection(@Param('albumId') albumId: string) {
    await this.clientService.submitSelection(albumId);
    return {
      success: true,
      message: 'Selection submitted successfully',
    };
  }

  @ValidateSchema({
    params: z.uuidv7(),
  })
  @Get('selected-images/:albumId')
  async getSelectedImages(@Param('albumId') albumId: string) {
    return {
      success: true,
      data: await this.clientService.getSelectedImages(albumId),
      message: 'Selected images fetched successfully',
    };
  }

  @ValidateSchema({
    params: z.uuidv7(),
    body: SelectImageSchema,
  })
  @Post('select-image')
  async selectImage(@Body() body: SelectImage) {
    await this.clientService.selectImage(body);
    return {
      success: true,
      message: 'Image selected successfully',
    };
  }

  @ValidateSchema({
    params: z.string().min(1),
  })
  @Delete('unselect-image/:imageId/:albumId')
  async unselectImage(
    @Param('albumId') albumId: string,
    @Param('imageId') imageId: string,
  ) {
    await this.clientService.unselectImage(albumId, imageId);
    return {
      success: true,
      message: 'Image unselected successfully',
    };
  }

  @ValidateSchema({
    params: DriveIdSchema,
    query: FolderContentsQuerySchema,
  })
  @Get('folder/:folderId')
  async getFolderContents(
    @Param('folderId') folderId: string,
    @Query() query: FolderContentsQuery,
  ) {
    return {
      success: true,
      data: await this.driveService.getFolderContents(folderId, query),
    };
  }

  private sendCachedImage(res: Response, stream: NodeJS.ReadableStream) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).end();
        return;
      }
      res.end();
    });

    stream.pipe(res);
  }
}
