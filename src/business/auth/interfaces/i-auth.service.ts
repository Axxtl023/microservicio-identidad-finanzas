import { LoginRequestDto } from '../dtos/login-request.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { RegisterRequestDto } from '../dtos/register-request.dto';

export interface IAuthService {
  loginAsync(request: LoginRequestDto): Promise<LoginResponseDto>;
  register(dto: RegisterRequestDto): Promise<LoginResponseDto>;
}

export const IAUTH_SERVICE = 'IAUTH_SERVICE';
