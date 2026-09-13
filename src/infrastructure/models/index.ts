import { Model } from 'mongoose';
import * as mongoose from 'mongoose';
import { ProfileSchema, Profile } from './profile.model';
import { AuthSchema, Auth } from './auth.model';

export interface Models {
  profileModel: Model<Profile>;
  authModel: Model<Auth>;
}

export const createModels = (connection: typeof mongoose): Models => ({
  profileModel: connection.model<Profile>('Profile', ProfileSchema),
  authModel: connection.model<Auth>('Auth', AuthSchema),
});
