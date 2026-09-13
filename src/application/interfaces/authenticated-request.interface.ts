import { Role } from '@domain/entities/enums/role.enum';

export interface JwtPayload {
  id: string;         // User ID (transformed from 'sub' by the jwt middleware)
  email: string;      // User email
  roles: Role[];      // User roles
  iat?: number;       // Issued at
  exp?: number;       // Expires at
}
