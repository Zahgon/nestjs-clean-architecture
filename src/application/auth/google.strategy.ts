import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} from '@constants';

/**
 * Holds the Google OAuth credentials the auth service signs its redirect and
 * token exchange with.
 *
 * The constructor rejects a missing client id, and the composition root builds
 * this eagerly, so a deployment without GOOGLE_CLIENT_ID dies at boot instead
 * of at the first /api/v1/auth/google request. That is the behaviour of the
 * strategy this replaced and it is kept deliberately.
 */
export class GoogleStrategy {
  readonly clientID: string;

  readonly clientSecret: string;

  readonly callbackURL: string;

  readonly scope = ['openid', 'email', 'profile'];

  constructor() {
    if (!GOOGLE_CLIENT_ID) {
      throw new TypeError('OAuth2Strategy requires a clientID option');
    }

    this.clientID = GOOGLE_CLIENT_ID;
    this.clientSecret = GOOGLE_CLIENT_SECRET;
    this.callbackURL = GOOGLE_CALLBACK_URL;
  }
}
