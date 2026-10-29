import path from 'node:path'

// The native session serializes its collision-body selection as avatar_path.
// A successful save must refer to the exact body currently running the solver.
export function assertNativeAvatarPersistence(project, expectedAvatarPath) {
  if (!project || typeof project !== 'object' || Array.isArray(project) ||
      typeof project.avatar_path !== 'string' || !project.avatar_path.trim() ||
      typeof expectedAvatarPath !== 'string' || !expectedAvatarPath.trim() ||
      !path.isAbsolute(project.avatar_path) || !path.isAbsolute(expectedAvatarPath) ||
      path.resolve(project.avatar_path) !== path.resolve(expectedAvatarPath)) {
    throw new Error('Native avatar save has a collision body mismatch')
  }
  return project
}
