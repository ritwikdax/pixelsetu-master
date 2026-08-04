import { AuthGuard } from '@/modules/auth/auth.guard';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { StudioService } from './studio.service';
import { ProjectSchema, type Project } from './schema';
import { ValidateSchema, ListQuerySchema } from '@/modules/common';
import type { ListQuery } from '@/modules/common';

@Controller('studio')
@UseGuards(AuthGuard)
export class StudioController {

    constructor(private readonly studioService: StudioService) { }

    @Get()
    getStudio() {
        return 'Studio';
    }
    @ValidateSchema({
        query: ListQuerySchema,
    })
    @Get('projects')
    async listProjects(@Query() query: ListQuery) {
        const result = await this.studioService.listProjects(query);
        return {
            success: true,
            data: result.data,
            next: result.next,
        };
    }

    @ValidateSchema({
        body: ProjectSchema,
    })
    @Post('projects')
    async createProject(@Body() project: Project) {
        return {
            success: true,
            data: await this.studioService.createProject(project),
            message: 'Project created successfully',
        };
    }
}