import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOutboundCallDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  destinationNumber!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientRequestId?: string;
}
