import { IsInt, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateAgentMessageDto {
  @IsUUID('4')
  targetAgentId!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  depth = 0;

  @IsInt()
  @Min(1)
  @Max(2_048)
  tokenBudget = 2_048;
}
