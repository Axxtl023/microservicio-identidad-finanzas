import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  userId!: string;

  @ApiProperty({ example: 'admin@booking.com' })
  email!: string;

  @ApiProperty({ example: 'admin', nullable: true })
  rol!: string | null;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  token!: string;
}
