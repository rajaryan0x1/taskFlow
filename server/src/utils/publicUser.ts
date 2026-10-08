import type { IUser } from "../models/User.js";

/** Explicit allowlist: never serialize an authentication document directly. */
export function publicUser(user: IUser) {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    appRole: user.appRole,
    authProvider: user.authProvider,
  };
}
