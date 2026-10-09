import type { PublicUser } from "@taskflow/contracts";
import type { IUser } from "../models/User.js";

/** Explicit allowlist: never serialize an authentication document directly. */
export function publicUser(user: IUser): PublicUser {
  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    appRole: user.appRole,
    authProvider: user.authProvider,
    needsProfileCompletion: user.needsProfileCompletion ?? false,
  };
}
