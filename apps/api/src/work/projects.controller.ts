import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthenticatedRequest, SessionGuard } from '../auth/session.guard';
import {
  AddProjectMemberDto,
  AddTaskDependencyDto,
  CreateDecisionDto,
  CreateProjectDto,
  CreateTaskDto,
  UpdateProjectDto,
  UpdateTaskDto,
} from './projects.dto';
import { ProjectsService } from './projects.service';

@Controller('workspaces/:workspaceId')
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get('projects')
  listProjects(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.projects.listProjects(request.user!.id, workspaceId);
  }

  @Post('projects')
  createProject(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateProjectDto,
  ) {
    return this.projects.createProject(request.user!.id, workspaceId, input);
  }

  @Get('projects/:projectId')
  getProject(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projects.getProject(request.user!.id, workspaceId, projectId);
  }

  @Patch('projects/:projectId')
  updateProject(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() input: UpdateProjectDto,
  ) {
    return this.projects.updateProject(
      request.user!.id,
      workspaceId,
      projectId,
      input,
    );
  }

  @Post('projects/:projectId/members')
  addProjectMember(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() input: AddProjectMemberDto,
  ) {
    return this.projects.addProjectMember(
      request.user!.id,
      workspaceId,
      projectId,
      input,
    );
  }

  @Get('projects/:projectId/tasks')
  listTasks(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projects.listTasks(request.user!.id, workspaceId, projectId);
  }

  @Post('projects/:projectId/tasks')
  createTask(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() input: CreateTaskDto,
  ) {
    return this.projects.createTask(
      request.user!.id,
      workspaceId,
      projectId,
      input,
    );
  }

  @Patch('tasks/:taskId')
  updateTask(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() input: UpdateTaskDto,
  ) {
    return this.projects.updateTask(
      request.user!.id,
      workspaceId,
      taskId,
      input,
    );
  }

  @Post('tasks/:taskId/dependencies')
  addDependency(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() input: AddTaskDependencyDto,
  ) {
    return this.projects.addDependency(
      request.user!.id,
      workspaceId,
      taskId,
      input,
    );
  }

  @Post('decisions')
  createDecision(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Body() input: CreateDecisionDto,
  ) {
    return this.projects.createDecision(request.user!.id, workspaceId, input);
  }

  @Get('decisions')
  listDecisions(
    @Req() request: AuthenticatedRequest,
    @Param('workspaceId') workspaceId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.projects.listDecisions(
      request.user!.id,
      workspaceId,
      projectId,
    );
  }
}
