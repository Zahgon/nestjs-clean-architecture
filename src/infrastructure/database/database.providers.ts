import * as mongoose from 'mongoose';
import { MONGODB_URI } from '@constants';

export const connectDatabase = (): Promise<typeof mongoose> =>
  mongoose.connect(MONGODB_URI);
